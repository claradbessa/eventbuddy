<?php

namespace App\Services;

use App\Models\FornecedorDespesa;
use App\Models\TenantEvent;
use App\Models\User;
use Google\Client as GoogleClient;
use Google\Service\Calendar;
use Google\Service\Calendar\Event as CalendarEvent;
use Google\Service\Calendar\EventAttendee;
use Google\Service\Calendar\EventDateTime;

class GoogleCalendarService
{
    private GoogleClient $client;
    private bool $prepared = false;

    public function __construct()
    {
        $this->client = new GoogleClient();
        $this->client->setApplicationName(config('app.name'));
        $this->client->setClientId(config('services.google.client_id'));
        $this->client->setClientSecret(config('services.google.client_secret'));
        $this->client->setRedirectUri(config('services.google.redirect'));
        $this->client->setAccessType('offline');
    }

    /**
     * Cria ou atualiza um evento all-day na agenda primária do utilizador.
     *
     * @param  User        $user
     * @param  string|null $existingEventId  ID do evento no Google Calendar (null = criar novo)
     * @param  array       $dados            {title, description, date (Y-m-d), attendees: string[]}
     * @return string  ID do evento no Google Calendar
     */
    public function upsertEvent(User $user, ?string $existingEventId, array $dados): string
    {
        $this->prepareClient($user);

        $calendar = new Calendar($this->client);
        $event    = $this->buildCalendarEvent($dados);

        if ($existingEventId) {
            $result = $calendar->events->update('primary', $existingEventId, $event, [
                'sendUpdates' => 'none',
            ]);
        } else {
            $result = $calendar->events->insert('primary', $event, [
                'sendUpdates' => 'none',
            ]);
        }

        return $result->getId();
    }

    /**
     * Remove um evento da agenda primária do utilizador.
     * Ignora silenciosamente erros 404 (evento já excluído).
     */
    public function deleteEvent(User $user, string $calendarEventId): void
    {
        $this->prepareClient($user);

        $calendar = new Calendar($this->client);

        try {
            $calendar->events->delete('primary', $calendarEventId);
        } catch (\Google\Service\Exception $e) {
            if ($e->getCode() !== 404) {
                throw $e;
            }
        }
    }

    // ── High-level despesa sync ────────────────────────────────────────────────

    /**
     * Sincroniza as parcelas pendentes de uma despesa com o Google Calendar.
     * Retorna mensagem de aviso em caso de falha, null em caso de sucesso.
     */
    public function syncDespesaParcelas(User $user, TenantEvent $evento, ?FornecedorDespesa $despesa): ?string
    {
        if (! $user->google_refresh_token || ! $despesa) {
            return null;
        }

        try {
            $despesa->load('pagadores');
            $pagadores = $despesa->pagadores;

            $attendees = $pagadores
                ->filter(fn($p) => filter_var($p->email ?? '', FILTER_VALIDATE_EMAIL) && $p->email !== $user->email)
                ->pluck('email')
                ->values()
                ->toArray();

            $todasParcelas    = $despesa->parcelas;
            $totalAllParcelas = $todasParcelas->count();
            $parcelas         = $todasParcelas->filter(fn($p) => $p->status !== 'pago')->values();

            $isSinglePayer = $pagadores->count() === 1;
            $createdIds    = [];

            foreach ($parcelas as $parcela) {
                $valorParcela = (float) $parcela->valor_parcela;

                $baseTitle = $totalAllParcelas > 1
                    ? "{$despesa->fornecedor_nome} — Parcela {$parcela->numero_parcela}/{$totalAllParcelas}"
                    : $despesa->fornecedor_nome;

                $titulo = $isSinglePayer
                    ? '💰 [' . $pagadores->first()->nome . '] ' . $baseTitle
                    : '🤝 [Dividido] ' . $baseTitle;

                $linhasPagadores = $pagadores->map(function ($pag) use ($valorParcela, $totalAllParcelas) {
                    $percentual = $pag->pivot->percentual;
                    $valorFixo  = $pag->pivot->valor;

                    if ($percentual !== null) {
                        $perc    = (float) $percentual;
                        $share   = $valorParcela * $perc / 100;
                        $percStr = rtrim(rtrim(number_format($perc, 2, ',', ''), '0'), ',');
                        return "  • {$pag->nome}: R\$ " . number_format($share, 2, ',', '.') . " ({$percStr}%)";
                    }

                    if ($valorFixo !== null) {
                        $share = (float) $valorFixo / max($totalAllParcelas, 1);
                        return "  • {$pag->nome}: R\$ " . number_format($share, 2, ',', '.');
                    }

                    return "  • {$pag->nome}: —";
                })->implode("\n");

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

                $vencimento      = $parcela->data_vencimento->toDateString();
                $existingEventId = $parcela->google_event_id;

                $calendarEventId = $this->upsertEvent($user, $existingEventId, [
                    'title'       => $titulo,
                    'description' => $descricao,
                    'date'        => $vencimento,
                    'attendees'   => $attendees,
                ]);

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
                'despesa_id' => $despesa->id,
                'error'      => $e->getMessage(),
            ]);

            return 'Fornecedor salvo! Não foi possível criar os eventos na agenda do Google: ' . $e->getMessage();
        }
    }

    /**
     * Remove todos os eventos do Google Calendar associados às parcelas de uma despesa.
     * Falha silenciosamente — a exclusão da despesa não depende da agenda.
     */
    public function deleteDespesaEvents(User $user, FornecedorDespesa $despesa): void
    {
        if (! $user->google_refresh_token) {
            return;
        }

        $parcelas = $despesa->parcelas()->whereNotNull('google_event_id')->get();

        if ($parcelas->isEmpty()) {
            return;
        }

        try {
            foreach ($parcelas as $parcela) {
                if ($parcela->google_event_id === null) {
                    continue;
                }
                $this->deleteEvent($user, $parcela->google_event_id);
            }
        } catch (\Throwable) {
            // Falha silenciosa — a despesa é removida independentemente
        }
    }

    // ── Internals ──────────────────────────────────────────────────────────────

    private function buildCalendarEvent(array $dados): CalendarEvent
    {
        $eventDate = new EventDateTime();
        $eventDate->setDate($dados['date']);

        $event = new CalendarEvent();
        $event->setSummary($dados['title']);
        $event->setDescription($dados['description'] ?? '');
        $event->setStart($eventDate);
        $event->setEnd($eventDate);

        $attendees = array_values(array_filter(
            array_map(fn(string $email) => $this->makeAttendee($email), $dados['attendees'] ?? [])
        ));

        if (! empty($attendees)) {
            $event->setAttendees($attendees);
        }

        return $event;
    }

    private function prepareClient(User $user): void
    {
        if ($this->prepared) {
            return; // token já renovado nesta instância — evita refresh por evento
        }

        if (! $user->google_refresh_token) {
            throw new \RuntimeException(
                'Acesso à agenda não encontrado. Faça login novamente com o Google.'
            );
        }

        $newToken = $this->client->fetchAccessTokenWithRefreshToken($user->google_refresh_token);

        if (isset($newToken['error'])) {
            $detail = $newToken['error_description'] ?? $newToken['error'];
            throw new \RuntimeException("Não foi possível renovar o token da agenda: {$detail}");
        }

        $user->updateQuietly(['google_token' => $newToken['access_token']]);
        $this->client->setAccessToken($newToken);
        $this->prepared = true;
    }

    private function makeAttendee(string $email): ?EventAttendee
    {
        $email = trim($email);
        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return null;
        }
        $attendee = new EventAttendee();
        $attendee->setEmail($email);
        return $attendee;
    }
}
