<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreDespesaRequest;
use App\Models\FornecedorDespesa;
use App\Models\ParcelaDespesa;
use App\Models\TenantEvent;
use App\Services\Checklist\AutoCheckService;
use App\Services\Finance\DespesaService;
use App\Services\GoogleCalendarService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class EventExpensesController extends Controller
{
    public function __construct(
        private readonly AutoCheckService $autoCheckService,
        private readonly DespesaService $despesaService,
        private readonly GoogleCalendarService $calendarService,
    ) {}

    public function index(Request $request, TenantEvent $evento): Response
    {
        if ($evento->owner_id !== $request->user()->id) {
            abort(403);
        }

        $expenses = $evento->despesas()
            ->with([
                'pagadores:id,nome,email,tipo',
                'parcelas' => fn($q) => $q->orderBy('numero_parcela'),
            ])
            ->orderByDesc('created_at')
            ->get()
            ->append('status_pagamento');

        $payers = $evento->pagadores()
            ->where('status', 'ativo')
            ->get(['id', 'nome', 'email', 'tipo']);

        return Inertia::render('Expenses/Index', [
            'event'    => $evento->only(['id', 'name', 'slug', 'status', 'data_inicio', 'data_fim']),
            'expenses' => $expenses,
            'payers'   => $payers,
        ]);
    }

    public function store(StoreDespesaRequest $request, TenantEvent $evento): RedirectResponse
    {
        if ($evento->owner_id !== $request->user()->id) {
            abort(403);
        }

        $data = $request->validated();

        $contratoPath = null;
        if ($request->hasFile('contrato')) {
            $file = $request->file('contrato');
            $filename = 'contratos/' . $file->hashName();
            // On Windows, UploadedFile::getRealPath() can return false (realpath() ACL limitation
            // in C:\Windows\Temp). Use getPathname() which returns the raw $_FILES tmp_name path.
            $stream = fopen($file->getPathname(), 'rb');
            Storage::disk('public')->put($filename, $stream);
            if (is_resource($stream)) fclose($stream);
            $contratoPath = $filename;
        }

        /** @var FornecedorDespesa|null $despesa */
        $despesa = null;

        DB::transaction(function () use ($data, $evento, $contratoPath, &$despesa) {
            /** @var FornecedorDespesa $created */
            $created = $evento->despesas()->create([
                'fornecedor_nome'  => $data['fornecedor_nome'],
                'categoria'        => $data['categoria'],
                'descricao'        => $data['descricao'] ?? null,
                'valor_total'      => $data['valor_total'],
                'observacoes'      => $data['observacoes'] ?? null,
                'contrato_path'    => $contratoPath,
                'pix_key'          => $data['pix_key'] ?? null,
                'pix_copia_e_cola' => $data['pix_copia_e_cola'] ?? null,
            ]);
            $despesa = $created;

            $despesa->pagadores()->attach(
                $this->despesaService->buildPivotData($evento, $data['pagadores'])
            );

            $this->despesaService->createParcelas($despesa, $evento, $data['parcelas']);
        });

        $this->autoCheckService->checkByCategory($evento, $data['categoria'] ?? null);
        $warning = $this->calendarService->syncDespesaParcelas($request->user(), $evento, $despesa);

        return $this->redirectWithFlash('fornecedores.index', $evento, $warning);
    }

    public function update(StoreDespesaRequest $request, TenantEvent $evento, FornecedorDespesa $fornecedor): RedirectResponse
    {
        if ($evento->owner_id !== $request->user()->id) abort(403);
        if ($fornecedor->event_id !== $evento->id) abort(404);

        $data = $request->validated();

        $contratoPath = $fornecedor->getRawOriginal('contrato_path');
        if ($request->hasFile('contrato')) {
            if ($contratoPath) {
                Storage::disk('public')->delete($contratoPath);
            }
            $file = $request->file('contrato');
            $filename = 'contratos/' . $file->hashName();
            $stream = fopen($file->getPathname(), 'rb');
            Storage::disk('public')->put($filename, $stream);
            if (is_resource($stream)) fclose($stream);
            $contratoPath = $filename;
        }

        DB::transaction(function () use ($data, $evento, $fornecedor, $contratoPath) {
            $fornecedor->update([
                'fornecedor_nome'  => $data['fornecedor_nome'],
                'categoria'        => $data['categoria'],
                'descricao'        => $data['descricao'] ?? null,
                'valor_total'      => $data['valor_total'],
                'observacoes'      => $data['observacoes'] ?? null,
                'contrato_path'    => $contratoPath,
                'pix_key'          => $data['pix_key'] ?? null,
                'pix_copia_e_cola' => $data['pix_copia_e_cola'] ?? null,
            ]);

            $fornecedor->pagadores()->sync(
                $this->despesaService->buildPivotData($evento, $data['pagadores'])
            );

            $this->despesaService->replaceUnpaidParcelas($fornecedor, $evento, $data['parcelas']);
        });

        $this->autoCheckService->checkByCategory($evento, $data['categoria'] ?? null);
        $warning = $this->calendarService->syncDespesaParcelas($request->user(), $evento, $fornecedor->fresh());

        return $this->redirectWithFlash('fornecedores.index', $evento, $warning);
    }

    public function destroy(Request $request, TenantEvent $evento, FornecedorDespesa $fornecedor): RedirectResponse
    {
        if ($evento->owner_id !== $request->user()->id) abort(403);
        if ($fornecedor->event_id !== $evento->id) abort(404);

        if ($fornecedor->contrato_path) {
            Storage::disk('public')->delete($fornecedor->getRawOriginal('contrato_path'));
        }

        $this->calendarService->deleteDespesaEvents($request->user(), $fornecedor);

        $fornecedor->delete();

        return redirect()->route('fornecedores.index', $evento);
    }

    public function payParcela(Request $request, TenantEvent $evento, FornecedorDespesa $fornecedor, ParcelaDespesa $parcela): JsonResponse
    {
        if ($evento->owner_id !== $request->user()->id) abort(403);
        if ($fornecedor->event_id !== $evento->id) abort(404);
        if ($parcela->despesa_id !== $fornecedor->id) abort(404);

        if ($parcela->status === 'pago') {
            return response()->json(['message' => 'Parcela já está paga.'], 422);
        }

        $parcela->update([
            'status'         => 'pago',
            'data_pagamento' => now()->toDateString(),
        ]);

        return response()->json($parcela->fresh());
    }

    public function toggleParcela(Request $request, TenantEvent $evento, FornecedorDespesa $fornecedor, ParcelaDespesa $parcela): JsonResponse
    {
        if ($evento->owner_id !== $request->user()->id) abort(403);
        if ($fornecedor->event_id !== $evento->id) abort(404);
        if ($parcela->despesa_id !== $fornecedor->id) abort(404);

        $newStatus = $parcela->status === 'pago' ? 'pendente' : 'pago';

        $parcela->update([
            'status'         => $newStatus,
            'data_pagamento' => $newStatus === 'pago' ? now()->toDateString() : null,
        ]);

        return response()->json(['id' => $parcela->id, 'status' => $newStatus]);
    }

    private function redirectWithFlash(string $routeName, TenantEvent $evento, ?string $warning): RedirectResponse
    {
        $redirect = redirect()->route($routeName, $evento);
        return $warning ? $redirect->with('calendar_warning', $warning) : $redirect;
    }
}
