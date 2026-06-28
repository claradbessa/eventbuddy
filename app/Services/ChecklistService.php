<?php

namespace App\Services;

use App\Models\EventChecklistTask;
use App\Models\TenantEvent;
use Illuminate\Support\Carbon;

class ChecklistService
{
    // Mapeamento tipo de evento → chave do template em config/event_templates.php
    private const TEMPLATES = [
        'Casamento'   => 'wedding',
        'Aniversário' => 'birthday',
        '15 Anos'     => 'debutante',
        'Chá de Bebê' => 'baby_shower',
        'Formatura'   => 'graduation',
        'Corporativo' => 'corporate',
    ];

    /**
     * Retorna se o evento qualifica para injeção de checklist automático.
     * Regra: event_type preenchido e diferente de "Outros".
     */
    public function shouldInjectChecklist(TenantEvent $evento): bool
    {
        return filled($evento->event_type)
            && isset(self::TEMPLATES[$evento->event_type]);
    }

    /**
     * Retorna o slug do template para o tipo de evento, ou null se não houver.
     */
    public function resolveTemplate(TenantEvent $evento): ?string
    {
        return self::TEMPLATES[$evento->event_type] ?? null;
    }

    /**
     * Injeta o checklist padrão no evento caso ainda não existam tarefas.
     *
     * Comportamento:
     *  - Silencioso se o tipo não qualificar (Outros / null).
     *  - Idempotente: não duplica se já existirem tarefas.
     *  - Se event_date estiver preenchida, calcula due_date = event_date - months_before.
     *    Se a data calculada for anterior a hoje, mantém null para não assustar o usuário.
     */
    public function injectIfEligible(TenantEvent $evento): void
    {
        if (! $this->shouldInjectChecklist($evento)) {
            return;
        }

        // Idempotência: não injeta se já houver tarefas cadastradas
        if ($evento->checklistTasks()->exists()) {
            return;
        }

        $template = $this->resolveTemplate($evento);
        $tasks    = config("event_templates.{$template}", []);

        if (empty($tasks)) {
            return;
        }

        /** @var Carbon|null $eventDate */
        $eventDate = $evento->data_inicio;
        $today     = Carbon::today();
        $now       = now();

        $rows = collect($tasks)
            ->map(function (array $task, int $index) use ($evento, $eventDate, $today, $now): array {
                $dueDate = null;

                if ($eventDate && array_key_exists('months_before', $task)) {
                    $calculated = $eventDate->copy()->subMonths($task['months_before']);

                    // Só define prazo se a data calculada ainda estiver no futuro
                    if ($calculated->greaterThan($today)) {
                        $dueDate = $calculated->toDateString();
                    }
                }

                return [
                    'event_id'            => $evento->id,
                    'title'               => $task['title'],
                    'priority'            => $task['priority'],
                    'due_date'            => $dueDate,
                    'status'              => 'pendente',
                    'order'               => $index + 1,
                    'auto_check_category' => $task['auto_check_category'] ?? null,
                    'created_at'          => $now,
                    'updated_at'          => $now,
                ];
            })
            ->all();

        EventChecklistTask::insert($rows);
    }
}
