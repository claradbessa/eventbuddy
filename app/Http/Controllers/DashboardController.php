<?php

namespace App\Http\Controllers;

use App\Models\FornecedorDespesa;
use App\Models\ParcelaDespesa;
use App\Models\TenantEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    // ── Dismiss onboarding (persiste no JSON do evento) ──────────────────────
    public function skipOnboarding(Request $request, TenantEvent $evento): \Illuminate\Http\RedirectResponse
    {
        if ($evento->owner_id !== $request->user()->id) abort(403);

        $evento->configuracoes = array_merge((array) ($evento->configuracoes ?? []), [
            'onboarding_skipped' => true,
        ]);
        $evento->save();

        return back();
    }

    public function __invoke(Request $request, TenantEvent $evento): Response
    {
        if ($evento->owner_id !== $request->user()->id) {
            abort(403);
        }

        $today = Carbon::today();

        // ── KPI 1: Total Contratado ──────────────────────────────────────────
        $totalContratado = (float) $evento->despesas()->sum('valor_total');
        $numFornecedores = $evento->despesas()->count();

        // ── KPI 2: Total Quitado ─────────────────────────────────────────────
        $totalPago      = (float) $evento->parcelas()->where('status', 'pago')->sum('valor_parcela');
        $totalRestante  = max(0, $totalContratado - $totalPago);
        $percentPago    = $totalContratado > 0
            ? (int) round(($totalPago / $totalContratado) * 100)
            : 0;

        // ── KPI 3: Próximo Vencimento ────────────────────────────────────────
        $proximaParcela = $evento->parcelas()
            ->with('despesa:id,fornecedor_nome')
            ->where('status', 'pendente')
            ->orderBy('data_vencimento')
            ->first(['id', 'despesa_id', 'valor_parcela', 'data_vencimento', 'numero_parcela']);

        $proximoVencimento = null;
        if ($proximaParcela) {
            /** @var \Carbon\Carbon $dataVenc */
            $dataVenc = $proximaParcela->data_vencimento;
            $venc     = $dataVenc instanceof Carbon ? $dataVenc : Carbon::parse($dataVenc);
            $dias     = $today->diffInDays($venc, false); // negative = overdue
            $proximoVencimento = [
                'label'  => $proximaParcela->despesa->fornecedor_nome ?? '—',
                'amount' => (float) $proximaParcela->valor_parcela,
                'days'   => (int) $dias,
                'date'   => $venc->format('d/m/Y'),
                'late'   => $dias < 0,
            ];
        }

        // ── Últimas Movimentações (5 fornecedores mais recentes) ─────────────
        $movimentacoes = $evento->despesas()
            ->orderByDesc('updated_at')
            ->limit(5)
            ->get(['id', 'fornecedor_nome', 'categoria', 'valor_total', 'updated_at'])
            ->map(function (FornecedorDespesa $f) {
                // Derive status from parcelas without loading the full collection
                $parcelas = $f->parcelas()->select('status', 'data_vencimento')->get();
                if ($parcelas->isEmpty()) {
                    $status = 'pendente';
                } elseif ($parcelas->every(fn(ParcelaDespesa $p) => $p->status === 'pago')) {
                    $status = 'pago';
                } elseif ($parcelas->contains(fn(ParcelaDespesa $p) => $p->isAtrasado())) {
                    $status = 'atrasado';
                } else {
                    $status = 'pendente';
                }

                /** @var \Carbon\Carbon $updatedAt */
                $updatedAt = $f->updated_at;

                return [
                    'id'     => $f->id,
                    'name'   => $f->fornecedor_nome,
                    'cat'    => $f->categoria ?? '—',
                    'amount' => (float) $f->valor_total,
                    'status' => $status,
                    'date'   => $updatedAt->format('d/m'),
                ];
            })
            ->values();

        // ── Prazos Críticos (próximas 5 parcelas pendentes) ──────────────────
        $prazos = $evento->parcelas()
            ->with('despesa:id,fornecedor_nome')
            ->where('status', 'pendente')
            ->orderBy('data_vencimento')
            ->limit(5)
            ->get(['id', 'despesa_id', 'valor_parcela', 'data_vencimento', 'numero_parcela'])
            ->map(function (ParcelaDespesa $p) use ($today) {
                /** @var \Carbon\Carbon $dataVenc */
                $dataVenc = $p->data_vencimento;
                $venc     = $dataVenc instanceof Carbon ? $dataVenc : Carbon::parse($dataVenc);
                $dias     = $today->diffInDays($venc, false);

                return [
                    'id'     => $p->id,
                    'label'  => ($p->despesa->fornecedor_nome ?? '—') . ' · Parcela ' . $p->numero_parcela,
                    'date'   => $venc->format('d/m/Y'),
                    'amount' => (float) $p->valor_parcela,
                    'days'   => (int) $dias,
                    'urgent' => $dias <= 7,
                    'late'   => $dias < 0,
                ];
            })
            ->values();

        // ── Onboarding ───────────────────────────────────────────────────────
        $config         = is_array($evento->configuracoes) ? $evento->configuracoes : [];
        $skipped        = (bool) ($config['onboarding_skipped'] ?? false);
        $eventTypeFilled = filled($evento->event_type); // false para null e ''
        $showOnboarding = !$eventTypeFilled && !$skipped;

        return Inertia::render('Dashboard', [
            'event'          => $evento->only(['id', 'name', 'slug', 'status', 'data_inicio', 'data_fim']),
            'showOnboarding' => $showOnboarding,
            'onboardingData' => [
                'event_name' => ($evento->name !== 'Meu Evento') ? $evento->name : '',
                'event_type' => $evento->event_type ?? '',
                'event_date' => $evento->data_inicio?->format('Y-m-d') ?? '',
            ],
            'kpi'   => [
                'total_contratado'  => $totalContratado,
                'num_fornecedores'  => $numFornecedores,
                'total_pago'        => $totalPago,
                'total_restante'    => $totalRestante,
                'percent_pago'      => $percentPago,
                'proximo_vencimento' => $proximoVencimento,
            ],
            'movimentacoes' => $movimentacoes,
            'prazos'        => $prazos,
        ]);
    }
}
