<?php

namespace App\Notifications;

use App\Models\EventChecklistTask;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TaskDeadlineReminder extends Notification
{
    use Queueable;

    public function __construct(
        private readonly EventChecklistTask $task,
        private readonly int $daysUntil,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $due       = $this->task->due_date->format('d/m/Y');
        $eventName = $this->task->evento?->name ?? 'seu evento';
        $slug      = $this->task->evento?->slug;
        $url       = $slug ? url("/{$slug}/checklist") : url('/dashboard');

        $subject = "⚠️ Lembrete: "{$this->task->title}" está chegando ao prazo!";

        return (new MailMessage)
            ->subject($subject)
            ->view('emails.task-deadline-reminder', [
            'userName'  => $notifiable->name,
            'task'      => $this->task,
            'due'       => $due,
            'daysUntil' => $this->daysUntil,
            'eventName' => $eventName,
            'url'       => $url,
        ]);
    }

    public function toArray(object $notifiable): array
    {
        $due   = $this->task->due_date->format('d/m/Y');
        $title = $this->task->title;
        $plural = $this->daysUntil > 1 ? 's' : '';

        return [
            'title'    => 'Tarefa próxima do vencimento',
            'message'  => "A tarefa \"{$title}\" vence em {$this->daysUntil} dia{$plural} ({$due}).",
            'category' => 'checklist',
            'meta'     => [
                'task_id'    => $this->task->id,
                'task_title' => $title,
                'due_date'   => $this->task->due_date->toDateString(),
                'priority'   => $this->task->priority,
                'event_id'   => $this->task->event_id,
                'days_until' => $this->daysUntil,
            ],
        ];
    }
}
