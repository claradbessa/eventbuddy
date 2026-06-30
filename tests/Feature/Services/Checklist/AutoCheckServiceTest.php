<?php

use App\Models\EventChecklistTask;
use App\Models\TenantEvent;
use App\Models\User;
use App\Services\Checklist\AutoCheckService;

describe('AutoCheckService::checkByCategory', function () {
    beforeEach(function () {
        $this->service = new AutoCheckService();

        $this->user = User::factory()->create();

        $this->evento = TenantEvent::create([
            'owner_id'   => $this->user->id,
            'name'       => 'Casamento Teste',
            'slug'       => 'casamento-teste',
            'data_inicio' => now()->addMonths(6)->toDateString(),
            'status'     => 'ativo',
        ]);
    });

    it('marks a matching pending task as concluido', function () {
        $task = EventChecklistTask::create([
            'event_id'            => $this->evento->id,
            'title'               => 'Contratar Fotógrafo',
            'status'              => 'pendente',
            'priority'            => 'alta',
            'order'               => 1,
            'auto_check_category' => 'fotografia',
        ]);

        $this->service->checkByCategory($this->evento, 'Fotografia e Vídeo');

        expect($task->fresh()->status)->toBe('concluido')
            ->and($task->fresh()->completed_at)->not->toBeNull();
    });

    it('marks multiple matching tasks as concluido', function () {
        EventChecklistTask::create([
            'event_id'            => $this->evento->id,
            'title'               => 'Contratar Fotógrafo',
            'status'              => 'pendente',
            'priority'            => 'alta',
            'order'               => 1,
            'auto_check_category' => 'fotografia',
        ]);

        EventChecklistTask::create([
            'event_id'            => $this->evento->id,
            'title'               => 'Confirmar álbum de fotos',
            'status'              => 'pendente',
            'priority'            => 'media',
            'order'               => 2,
            'auto_check_category' => 'fotografia',
        ]);

        $this->service->checkByCategory($this->evento, 'Fotógrafo');

        expect(
            EventChecklistTask::where('event_id', $this->evento->id)
                ->where('status', 'concluido')
                ->count()
        )->toBe(2);
    });

    it('does not touch tasks from other events', function () {
        $outroEvento = TenantEvent::create([
            'owner_id'   => $this->user->id,
            'name'       => 'Outro Evento',
            'slug'       => 'outro-evento',
            'data_inicio' => now()->addMonths(3)->toDateString(),
            'status'     => 'ativo',
        ]);

        $outraTask = EventChecklistTask::create([
            'event_id'            => $outroEvento->id,
            'title'               => 'Fotógrafo do outro evento',
            'status'              => 'pendente',
            'priority'            => 'alta',
            'order'               => 1,
            'auto_check_category' => 'fotografia',
        ]);

        $this->service->checkByCategory($this->evento, 'Fotografia');

        expect($outraTask->fresh()->status)->toBe('pendente');
    });

    it('does not re-check tasks already concluido', function () {
        $task = EventChecklistTask::create([
            'event_id'            => $this->evento->id,
            'title'               => 'Tarefa já concluída',
            'status'              => 'concluido',
            'priority'            => 'alta',
            'order'               => 1,
            'auto_check_category' => 'fotografia',
            'completed_at'        => now()->subDay(),
        ]);

        $originalCompletedAt = $task->completed_at;

        $this->service->checkByCategory($this->evento, 'Fotografia');

        // Should not update completed_at since it wasn't pending
        expect($task->fresh()->completed_at->toDateString())
            ->toBe($originalCompletedAt->toDateString());
    });

    it('does nothing when categoria is null', function () {
        EventChecklistTask::create([
            'event_id'            => $this->evento->id,
            'title'               => 'Contratar Fotógrafo',
            'status'              => 'pendente',
            'priority'            => 'alta',
            'order'               => 1,
            'auto_check_category' => 'fotografia',
        ]);

        $this->service->checkByCategory($this->evento, null);

        expect(
            EventChecklistTask::where('event_id', $this->evento->id)
                ->where('status', 'pendente')
                ->count()
        )->toBe(1);
    });

    it('does nothing when categoria has no matching slug', function () {
        EventChecklistTask::create([
            'event_id'            => $this->evento->id,
            'title'               => 'Contratar Fotógrafo',
            'status'              => 'pendente',
            'priority'            => 'alta',
            'order'               => 1,
            'auto_check_category' => 'fotografia',
        ]);

        $this->service->checkByCategory($this->evento, 'Aluguel de Cadeiras');

        expect(
            EventChecklistTask::where('event_id', $this->evento->id)
                ->where('status', 'pendente')
                ->count()
        )->toBe(1);
    });

    it('does nothing when no task has a matching auto_check_category', function () {
        EventChecklistTask::create([
            'event_id'            => $this->evento->id,
            'title'               => 'Tarefa sem categoria automática',
            'status'              => 'pendente',
            'priority'            => 'baixa',
            'order'               => 1,
            'auto_check_category' => null,
        ]);

        $this->service->checkByCategory($this->evento, 'Fotografia');

        expect(
            EventChecklistTask::where('event_id', $this->evento->id)
                ->where('status', 'pendente')
                ->count()
        )->toBe(1);
    });
});
