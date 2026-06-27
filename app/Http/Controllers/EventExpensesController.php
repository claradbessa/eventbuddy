<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreDespesaRequest;
use App\Models\FornecedorDespesa;
use App\Models\ParcelaDespesa;
use App\Models\TenantEvent;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class EventExpensesController extends Controller
{
    public function index(Request $request, TenantEvent $event): Response
    {
        if ($event->owner_id !== $request->user()->id) {
            abort(403);
        }

        $expenses = $event->despesas()
            ->with([
                'pagadores:id,nome,email,tipo',
                'parcelas' => fn($q) => $q->orderBy('numero_parcela'),
            ])
            ->orderByDesc('created_at')
            ->get()
            ->append('status_pagamento');

        $payers = $event->pagadores()
            ->where('status', 'ativo')
            ->get(['id', 'nome', 'email', 'tipo']);

        return Inertia::render('Expenses/Index', [
            'event'    => $event->only(['id', 'name', 'slug', 'status', 'data_inicio', 'data_fim']),
            'expenses' => $expenses,
            'payers'   => $payers,
        ]);
    }

    public function store(StoreDespesaRequest $request, TenantEvent $event): RedirectResponse
    {
        if ($event->owner_id !== $request->user()->id) {
            abort(403);
        }

        $data = $request->validated();

        $contratoPath = null;
        if ($request->hasFile('contrato')) {
            $contratoPath = $request->file('contrato')->store('contratos', 'public');
        }

        DB::transaction(function () use ($data, $event, $contratoPath) {
            $despesa = $event->despesas()->create([
                'fornecedor_nome' => $data['fornecedor_nome'],
                'categoria'       => $data['categoria'],
                'descricao'       => $data['descricao'] ?? null,
                'valor_total'     => $data['valor_total'],
                'observacoes'     => $data['observacoes'] ?? null,
                'contrato_path'   => $contratoPath,
            ]);

            $pivotData = [];
            foreach ($data['pagadores'] as $p) {
                $pivotData[$p['pagador_id']] = [
                    'event_id'   => $event->id,
                    'percentual' => isset($p['percentual']) && $p['percentual'] !== '' ? $p['percentual'] : null,
                    'valor'      => isset($p['valor']) && $p['valor'] !== '' ? $p['valor'] : null,
                ];
            }
            $despesa->pagadores()->attach($pivotData);

            foreach ($data['parcelas'] as $i => $p) {
                $despesa->parcelas()->create([
                    'event_id'        => $event->id,
                    'numero_parcela'  => $i + 1,
                    'valor_parcela'   => $p['valor'],
                    'data_vencimento' => Carbon::parse($p['vencimento']),
                ]);
            }
        });

        return redirect()->route('expenses.index', $event);
    }

    public function update(StoreDespesaRequest $request, TenantEvent $event, FornecedorDespesa $expense): RedirectResponse
    {
        if ($event->owner_id !== $request->user()->id) abort(403);
        if ($expense->event_id !== $event->id) abort(404);

        $data = $request->validated();

        $contratoPath = $expense->getRawOriginal('contrato_path');
        if ($request->hasFile('contrato')) {
            if ($contratoPath) {
                Storage::disk('public')->delete($contratoPath);
            }
            $contratoPath = $request->file('contrato')->store('contratos', 'public');
        }

        DB::transaction(function () use ($data, $event, $expense, $contratoPath) {
            $expense->update([
                'fornecedor_nome' => $data['fornecedor_nome'],
                'categoria'       => $data['categoria'],
                'descricao'       => $data['descricao'] ?? null,
                'valor_total'     => $data['valor_total'],
                'observacoes'     => $data['observacoes'] ?? null,
                'contrato_path'   => $contratoPath,
            ]);

            // Sincroniza pagadores (mantém histórico via sync)
            $pivotData = [];
            foreach ($data['pagadores'] as $p) {
                $pivotData[$p['pagador_id']] = [
                    'event_id'   => $event->id,
                    'percentual' => isset($p['percentual']) && $p['percentual'] !== '' ? $p['percentual'] : null,
                    'valor'      => isset($p['valor']) && $p['valor'] !== '' ? $p['valor'] : null,
                ];
            }
            $expense->pagadores()->sync($pivotData);

            // Preserva parcelas pagas; substitui pendentes pelas enviadas no formulário
            $paidCount = $expense->parcelas()->where('status', 'pago')->count();
            $expense->parcelas()->where('status', '!=', 'pago')->delete();

            foreach ($data['parcelas'] as $i => $p) {
                $expense->parcelas()->create([
                    'event_id'        => $event->id,
                    'numero_parcela'  => $paidCount + $i + 1,
                    'valor_parcela'   => $p['valor'],
                    'data_vencimento' => Carbon::parse($p['vencimento']),
                ]);
            }
        });

        return redirect()->route('expenses.index', $event);
    }

    public function destroy(Request $request, TenantEvent $event, FornecedorDespesa $expense): RedirectResponse
    {
        if ($event->owner_id !== $request->user()->id) abort(403);
        if ($expense->event_id !== $event->id) abort(404);

        if ($expense->contrato_path) {
            Storage::disk('public')->delete($expense->getRawOriginal('contrato_path'));
        }

        $expense->delete();

        return redirect()->route('expenses.index', $event);
    }

    public function payParcela(Request $request, TenantEvent $event, FornecedorDespesa $expense, ParcelaDespesa $parcela): JsonResponse
    {
        if ($event->owner_id !== $request->user()->id) abort(403);
        if ($expense->event_id !== $event->id) abort(404);
        if ($parcela->despesa_id !== $expense->id) abort(404);

        if ($parcela->status === 'pago') {
            return response()->json(['message' => 'Parcela já está paga.'], 422);
        }

        $parcela->update([
            'status'         => 'pago',
            'data_pagamento' => now()->toDateString(),
        ]);

        return response()->json($parcela->fresh());
    }
}
