<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreDespesaRequest;
use App\Models\FornecedorDespesa;
use App\Models\TenantEvent;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class FornecedorDespesaController extends Controller
{
    public function index(TenantEvent $event): JsonResponse
    {
        // Eager loading de pagadores e parcelas — evita N+1
        $despesas = $event->despesas()
            ->with([
                'pagadores:id,nome,email,tipo',
                'parcelas' => fn($q) => $q->orderBy('numero_parcela'),
            ])
            ->orderByDesc('created_at')
            ->get()
            ->append('status_pagamento');

        return response()->json($despesas);
    }

    public function store(StoreDespesaRequest $request, TenantEvent $event): JsonResponse
    {
        $data = $request->validated();

        $despesa = DB::transaction(function () use ($data, $event) {
            // 1. Cria a despesa
            $despesa = $event->despesas()->create([
                'fornecedor_nome' => $data['fornecedor_nome'],
                'categoria'       => $data['categoria'],
                'descricao'       => $data['descricao'] ?? null,
                'valor_total'     => $data['valor_total'],
                'comprovante_url' => $data['comprovante_url'] ?? null,
                'observacoes'     => $data['observacoes'] ?? null,
            ]);

            // 2. Anexa pagadores na pivot com percentual/valor de cada um
            $pivotData = [];
            foreach ($data['pagadores'] as $p) {
                $pivotData[$p['pagador_id']] = [
                    'event_id'   => $event->id,
                    'percentual' => $p['percentual'] ?? null,
                    'valor'      => $p['valor'] ?? null,
                ];
            }
            $despesa->pagadores()->attach($pivotData);

            // 3. Gera as parcelas com vencimentos mensais
            $despesa->gerarParcelas(
                $data['parcelas_quantidade'],
                Carbon::parse($data['primeiro_vencimento'])
            );

            return $despesa->load([
                'pagadores:id,nome,email,tipo',
                'parcelas',
            ])->append('status_pagamento');
        });

        return response()->json($despesa, 201);
    }

    public function destroy(TenantEvent $event, FornecedorDespesa $expense): JsonResponse
    {
        if ($expense->event_id !== $event->id) {
            abort(404);
        }

        $expense->delete();

        return response()->json(null, 204);
    }
}
