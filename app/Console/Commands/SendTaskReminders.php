<?php

namespace App\Console\Commands;

use App\Models\EventChecklistTask;
use App\Models\User;
use App\Notifications\TaskDeadlineReminder;
use Illuminate\Console\Command;

class SendTaskReminders extends Command
{
    protected $signature = 'checklist:send-reminders
                            {--test : Ignora o filtro de data e dispara para a primeira tarefa pendente encontrada}';

    protected $description = 'Envia lembretes de prazo para tarefas de checklist que vencem em 3 ou 5 dias.';

    private const REMIND_DAYS = [3, 5];

    public function handle(): int
    {
        if ($this->option('test')) {
            return $this->handleTest();
        }

        $sent = 0;

        foreach (self::REMIND_DAYS as $days) {
            $targetDate = now()->addDays($days)->toDateString();

            $tasks = EventChecklistTask::query()
                ->with(['evento.owner'])
                ->where('status', 'pendente')
                ->whereDate('due_date', $targetDate)
                ->get();

            foreach ($tasks as $task) {
                $owner = $task->evento?->owner;

                if (! $owner instanceof User) {
                    continue;
                }

                // Evita duplicata: não re-notifica se já existe notificação não lida para esta tarefa
                $alreadyNotified = $owner->unreadNotifications()
                    ->where('type', TaskDeadlineReminder::class)
                    ->whereJsonContains('data->meta->task_id', $task->id)
                    ->exists();

                if ($alreadyNotified) {
                    continue;
                }

                $owner->notify(new TaskDeadlineReminder($task, $days));

                $sent++;
                $this->line("  → [{$owner->email}] {$task->title} (em {$days}d)");
            }
        }

        $this->info("Lembretes de checklist enviados: {$sent}");

        return Command::SUCCESS;
    }

    private function handleTest(): int
    {
        $this->warn('Modo --test ativado: ignorando filtro de data e deduplicação.');

        $task = EventChecklistTask::query()
            ->with(['evento.owner'])
            ->where('status', 'pendente')
            ->whereNotNull('due_date')
            ->first();

        if (! $task) {
            $this->error('Nenhuma tarefa pendente com due_date encontrada no banco.');
            return Command::FAILURE;
        }

        $owner = $task->evento?->owner;

        if (! $owner instanceof User) {
            $this->error('Tarefa encontrada, mas sem usuário dono associado ao evento.');
            return Command::FAILURE;
        }

        $owner->notify(new TaskDeadlineReminder($task, 3));

        $this->info('Notificação de teste disparada com sucesso!');
        $this->line("  Destinatário : {$owner->name} <{$owner->email}>");
        $this->line("  Tarefa       : {$task->title}");
        $this->line("  Evento       : {$task->evento?->name}");
        $this->line("  Vencimento   : {$task->due_date->format('d/m/Y')}");

        return Command::SUCCESS;
    }
}
