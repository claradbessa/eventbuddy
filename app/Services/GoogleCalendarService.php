<?php

namespace App\Services;

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
