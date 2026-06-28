<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreDespesaRequest;
use App\Models\EventChecklistTask;
use App\Models\FornecedorDespesa;
use App\Models\ParcelaDespesa;
use App\Models\TenantEvent;
use App\Models\User;
use App\Services\GoogleCalendarService;
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
            $contratoPath = $request->file('contrato')->store('contratos', 'public');
        }

        $despesa = null;

        DB::transaction(function () use ($data, $evento, $contratoPath, &$despesa) {
            $despesa = $evento->despesas()->create([
                'fornecedor_nome'  => $data['fornecedor_nome'],
                'categoria'        => $data['categoria'],
                'descricao'        => $data['descricao'] ?? null,
                'valor_total'      => $data['valor_total'],
                'observacoes'      => $data['observacoes'] ?? null,
                'contrato_path'    => $contratoPath,
                'pix_key'          => $data['pix_key'] ?? null,
                'pix_copia_e_cola' => $data['pix_copia_e_cola'] ?? null,
            ]);

            $pivotData = [];
            foreach ($data['pagadores'] as $p) {
                $pivotData[$p['pagador_id']] = [
                    'event_id'   => $evento->id,
                    'percentual' => isset($p['percentual']) && $p['percentual'] !== '' ? $p['percentual'] : null,
                    'valor'      => isset($p['valor']) && $p['valor'] !== '' ? $p['valor'] : null,
                ];
            }
            $despesa->pagadores()->attach($pivotData);

            foreach ($data['parcelas'] as $i => $p) {
                $despesa->parcelas()->create([
                    'event_id'        => $evento->id,
                    'numero_parcela'  => $i + 1,
                    'valor_parcela'   => $p['valor'],
                    'data_vencimento' => Carbon::parse($p['vencimento']),
                ]);
            }
        });

        $this->autoCheckTasksByCategory($evento, $data['categoria'] ?? null);
        $warning = $this->tryCalendarSync($request->user(), $evento, $despesa);

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
            $contratoPath = $request->file('contrato')->store('contratos', 'public');
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

            $pivotData = [];
            foreach ($data['pagadores'] as $p) {
                $pivotData[$p['pagador_id']] = [
                    'event_id'   => $evento->id,
                    'percentual' => isset($p['percentual']) && $p['percentual'] !== '' ? $p['percentual'] : null,
                    'valor'      => isset($p['valor']) && $p['valor'] !== '' ? $p['valor'] : null,
                ];
            }
            $fornecedor->pagadores()->sync($pivotData);

            $paidCount = $fornecedor->parcelas()->where('status', 'pago')->count();
            $fornecedor->parcelas()->where('status', '!=', 'pago')->delete();

            foreach ($data['parcelas'] as $i => $p) {
                $fornecedor->parcelas()->create([
                    'event_id'        => $evento->id,
                    'numero_parcela'  => $paidCount + $i + 1,
                    'valor_parcela'   => $p['valor'],
                    'data_vencimento' => Carbon::parse($p['vencimento']),
                ]);
            }
        });

        $this->autoCheckTasksByCategory($evento, $data['categoria'] ?? null);

        // Sincroniza apenas as parcelas pendentes recém-recriadas
        $warning = $this->tryCalendarSync($request->user(), $evento, $fornecedor->fresh());

        return $this->redirectWithFlash('fornecedores.index', $evento, $warning);
    }

    public function destroy(Request $request, TenantEvent $evento, FornecedorDespesa $fornecedor): RedirectResponse
    {
        if ($evento->owner_id !== $request->user()->id) abort(403);
        if ($fornecedor->event_id !== $evento->id) abort(404);

        if ($fornecedor->contrato_path) {
            Storage::disk('public')->delete($fornecedor->getRawOriginal('contrato_path'));
        }

        $this->tryDeleteCalendarEvents($request->user(), $fornecedor);

        $fornecedor->delete();

        return redirect()->route('fornecedores.index', $evento);
    }

    private function tryDeleteCalendarEvents(User $user, FornecedorDespesa $fornecedor): void
    {
        if (! $user->google_refresh_token) {
            return;
        }

        $parcelas = $fornecedor->parcelas()->whereNotNull('google_event_id')->get();
        if ($parcelas->isEmpty()) {
            return;
        }

        try {
            $service = new GoogleCalendarService();
            foreach ($parcelas as $parcela) {
                $service->deleteEvent($user, $parcela->google_event_id);
            }
        } catch (\Throwable) {
            // Falha silenciosa — a despesa é removida independentemente
        }
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

    // ── Google Calendar ────────────────────────────────────────────────────────

    /**
     * Tenta sincronizar as parcelas pendentes de uma despesa com o Google Calendar.
     * Retorna uma mensagem de aviso se falhar, ou null em caso de sucesso.
     * O fornecedor já está salvo no banco independentemente do resultado.
     */
    private function tryCalendarSync(User $user, TenantEvent $evento, ?FornecedorDespesa $despesa): ?string
    {
        if (! $user->google_refresh_token || ! $despesa) {
            return null;
        }

        try {
            $service = new GoogleCalendarService();

            // Pagadores desta despesa com dados de split (pivot já declara withPivot no modelo)
            $despesa->load('pagadores');
            $pagadores = $despesa->pagadores;

            // Attendees = pagadores desta despesa com e-mail válido, excluindo o dono
            $attendees = $pagadores
                ->filter(fn($p) => filter_var($p->email ?? '', FILTER_VALIDATE_EMAIL) && $p->email !== $user->email)
                ->pluck('email')
                ->values()
                ->toArray();

            // Carrega todas as parcelas para calcular o denominador X/N correto
            $todasParcelas    = $despesa->parcelas;           // HasMany com orderBy já definido
            $totalAllParcelas = $todasParcelas->count();
            $parcelas         = $todasParcelas->filter(fn($p) => $p->status !== 'pago')->values();

            $isSinglePayer = $pagadores->count() === 1;
            $createdIds    = [];

            foreach ($parcelas as $parcela) {
                $valorParcela = (float) $parcela->valor_parcela;

                // ── Título dinâmico ──────────────────────────────────────
                $baseTitle = $totalAllParcelas > 1
                    ? "{$despesa->fornecedor_nome} — Parcela {$parcela->numero_parcela}/{$totalAllParcelas}"
                    : $despesa->fornecedor_nome;

                $titulo = $isSinglePayer
                    ? '💰 [' . $pagadores->first()->nome . '] ' . $baseTitle
                    : '🤝 [Dividido] ' . $baseTitle;

                // ── Breakdown financeiro por pagador ─────────────────────
                $linhasPagadores = $pagadores->map(function ($pag) use ($valorParcela, $totalAllParcelas) {
                    $percentual = $pag->pivot->percentual;
                    $valorFixo  = $pag->pivot->valor;

                    if ($percentual !== null && $percentual !== '') {
                        $perc    = (float) $percentual;
                        $share   = $valorParcela * $perc / 100;
                        $percStr = rtrim(rtrim(number_format($perc, 2, ',', ''), '0'), ',');
                        return "  • {$pag->nome}: R\$ " . number_format($share, 2, ',', '.') . " ({$percStr}%)";
                    }

                    if ($valorFixo !== null && $valorFixo !== '') {
                        // valor fixo é relativo ao total da despesa; distribuído pelas parcelas
                        $share = (float) $valorFixo / max($totalAllParcelas, 1);
                        return "  • {$pag->nome}: R\$ " . number_format($share, 2, ',', '.');
                    }

                    return "  • {$pag->nome}: —";
                })->implode("\n");

                // ── Descrição completa ───────────────────────────────────
                $valorFormatado = 'R$ ' . number_format($valorParcela, 2, ',', '.');

                $descricao = implode("\n", array_filter([
                    "💳 Valor desta parcela: {$valorFormatado}",
                    "",
                    "👥 Responsabilidade:",
                    $linhasPagadores,
                    "",
                    "Categoria: {$despesa->categoria}",
                    $despesa->descricao ? "Obs: {$despesa->descricao}" : null,
                    "Evento: {$evento->name}",
                ]));

                $vencimento      = $parcela->data_vencimento->toDateString(); // Y-m-d dinâmico de cada parcela
                $existingEventId = $parcela->google_event_id;

                $calendarEventId = $service->upsertEvent($user, $existingEventId, [
                    'title'       => $titulo,
                    'description' => $descricao,
                    'date'        => $vencimento,
                    'attendees'   => $attendees,
                ]);

                // Persiste o ID retornado pelo Google apenas quando é um evento novo
                if (! $existingEventId) {
                    $parcela->updateQuietly(['google_event_id' => $calendarEventId]);
                }

                $createdIds[] = [
                    'parcela_id'     => $parcela->id,
                    'vencimento'     => $vencimento,
                    'action'         => $existingEventId ? 'updated' : 'created',
                    'calendar_event' => $calendarEventId,
                ];
            }

            \Log::info('Google Calendar sync OK', [
                'user_id'       => $user->id,
                'user_email'    => $user->email,
                'despesa_id'    => $despesa->id,
                'fornecedor'    => $despesa->fornecedor_nome,
                'parcelas_sync' => $createdIds,
            ]);

            return null;

        } catch (\Throwable $e) {
            \Log::error('Google Calendar sync FAILED', [
                'user_id'    => $user->id,
                'user_email' => $user->email,
                'despesa_id' => $despesa?->id,
                'error'      => $e->getMessage(),
            ]);

            return 'Fornecedor salvo! Não foi possível criar os eventos na agenda do Google: ' . $e->getMessage();
        }
    }

    // ── Auto-check checklist ───────────────────────────────────────────────────

    /**
     * Marca como concluídas as tarefas do checklist cujo auto_check_category
     * corresponda à categoria do fornecedor recém-cadastrado.
     */
    private function autoCheckTasksByCategory(TenantEvent $evento, ?string $rawCategoria): void
    {
        if (! $rawCategoria) {
            return;
        }

        $slugs = self::normalizeCategoriaToSlugs($rawCategoria);

        if (empty($slugs)) {
            return;
        }

        // Fetch titles first so we can build a meaningful flash message
        $tasks = EventChecklistTask::where('event_id', $evento->id)
            ->where('status', 'pendente')
            ->whereIn('auto_check_category', $slugs)
            ->get(['id', 'title']);

        if ($tasks->isEmpty()) {
            return;
        }

        EventChecklistTask::whereIn('id', $tasks->pluck('id'))
            ->update([
                'status'       => 'concluido',
                'completed_at' => now(),
                'updated_at'   => now(),
            ]);

        $count   = $tasks->count();
        $message = $count === 1
            ? "'{$tasks->first()->title}' foi marcado automaticamente no checklist!"
            : "{$count} itens do checklist foram marcados automaticamente!";

        session()->flash('toast', ['type' => 'success', 'message' => $message]);
    }

    /**
     * Normaliza o texto livre da categoria do fornecedor para um ou mais slugs
     * de auto_check_category reconhecidos pelo sistema de checklist.
     *
     * @return string[]
     */
    private static function normalizeCategoriaToSlugs(string $categoria): array
    {
        $accents = ['á','à','â','ã','é','è','ê','í','ì','î','ó','ò','ô','õ','ú','ù','û','ü','ç'];
        $plain   = ['a','a','a','a','e','e','e','i','i','i','o','o','o','o','u','u','u','u','c'];
        $text    = mb_strtolower(str_replace($accents, $plain, $categoria));

        $map = [
            'fotografia'  => ['foto', 'fotograf', 'cinegraf', 'filmagem', 'video', 'drone', 'album'],
            'buffet'      => ['buffet', 'catering', 'coffee', 'alimentac', 'refeic', 'gastronomia', 'jantar', 'almoco', 'cardapio'],
            'espaco'      => ['espaco', 'local', 'cerimoni', 'salao', 'auditorio', 'venue', 'recanto', 'chacara', 'sitio', 'fazenda', 'clube', 'hotel', 'pousada', 'casa de festa'],
            'musica'      => ['dj', 'banda', 'musica', 'som', 'iluminac', 'luz cenica', 'led', 'trio', 'quarteto', 'violinis', 'sanfonei'],
            'decoracao'   => ['decorac', 'decor', 'floral', 'flores', 'cenograf', 'balao', 'arranjo', 'instala'],
            'maquiagem'   => ['maquiagem', 'maquiac', 'make', 'cabelo', 'beleza', 'hair', 'noiva', 'penteado', 'dia da noiva'],
            'bolo'        => ['bolo', 'confeit', 'doceria', 'doces', 'sobremesa', 'candy', 'mesinha'],
            'bar'         => ['open bar', 'bar', 'drinks', 'bebidas', 'coquetel', 'churrasco', 'sommelier', 'cerveja', 'destilado'],
            'audiovisual' => ['audiovisual', 'audio visual', 'av ', 'projetor', 'microfone', 'sonorizac', 'telao', 'streaming', 'transmissao', 'internet', 'palco', 'estrutura'],
            'transporte'  => ['transport', 'limusin', 'onibus', 'van', 'transfer', 'taxi', 'motorista', 'veiculo'],
            'seguranca'   => ['seguran', 'recepcao', 'portaria', 'credenciamento', 'brigadista'],
            'recreacao'   => ['recreac', 'animac', 'brinquedo', 'kids', 'pula pula', 'circo', 'malabarista', 'palha'],
            'assessoria'  => ['assessoria', 'cerimonial', 'organizac', 'empresa de event', 'producao', 'coord'],
        ];

        $found = [];
        foreach ($map as $slug => $keywords) {
            foreach ($keywords as $kw) {
                if (str_contains($text, $kw)) {
                    $found[] = $slug;
                    break;
                }
            }
        }

        return $found;
    }

    private function redirectWithFlash(string $routeName, TenantEvent $evento, ?string $warning): RedirectResponse
    {
        $redirect = redirect()->route($routeName, $evento);
        return $warning ? $redirect->with('calendar_warning', $warning) : $redirect;
    }
}
