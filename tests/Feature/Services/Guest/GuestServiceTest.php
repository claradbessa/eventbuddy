<?php

use App\Models\Guest;
use App\Models\TenantEvent;
use App\Models\User;
use App\Services\Guest\GuestService;

describe('GuestService::create', function () {
    beforeEach(function () {
        $this->service = new GuestService();

        $user = User::factory()->create();

        $this->evento = TenantEvent::create([
            'owner_id'   => $user->id,
            'name'       => 'Casamento Teste',
            'slug'       => 'casamento-teste-guest',
            'data_inicio' => now()->addMonths(6)->toDateString(),
            'status'     => 'ativo',
        ]);
    });

    it('creates a guest with the correct event_id', function () {
        $guest = $this->service->create($this->evento, [
            'name' => 'Maria Silva',
            'tier' => 'A',
        ]);

        expect($guest->event_id)->toBe($this->evento->id);
    });

    it('defaults status to pending when not provided', function () {
        $guest = $this->service->create($this->evento, [
            'name' => 'João Lima',
            'tier' => 'B',
        ]);

        expect($guest->status)->toBe('pending');
    });

    it('defaults accompanists_count to 0 when not provided', function () {
        $guest = $this->service->create($this->evento, [
            'name' => 'Ana Souza',
            'tier' => 'C',
        ]);

        expect($guest->accompanists_count)->toBe(0);
    });

    it('saves the tier correctly for all valid values', function () {
        foreach (['A', 'B', 'C'] as $tier) {
            $guest = $this->service->create($this->evento, [
                'name' => "Convidado {$tier}",
                'tier' => $tier,
            ]);

            expect($guest->tier)->toBe($tier);
        }
    });

    it('saves group and accompanists_count when provided', function () {
        $guest = $this->service->create($this->evento, [
            'name'               => 'Pedro Nunes',
            'tier'               => 'A',
            'group'              => 'Família da Noiva',
            'accompanists_count' => 3,
        ]);

        expect($guest->group)->toBe('Família da Noiva')
            ->and($guest->accompanists_count)->toBe(3);
    });

    it('persists the guest to the database', function () {
        $this->service->create($this->evento, [
            'name' => 'Carla Mello',
            'tier' => 'B',
        ]);

        expect(Guest::where('event_id', $this->evento->id)->count())->toBe(1);
    });
});

describe('GuestService::summary', function () {
    beforeEach(function () {
        $this->service = new GuestService();

        $user = User::factory()->create();

        $this->evento = TenantEvent::create([
            'owner_id'   => $user->id,
            'name'       => 'Formatura Teste',
            'slug'       => 'formatura-teste-summary',
            'data_inicio' => now()->addMonths(4)->toDateString(),
            'status'     => 'ativo',
        ]);
    });

    it('returns zero counts for an event with no guests', function () {
        $summary = $this->service->summary($this->evento);

        expect($summary['A']['guests'])->toBe(0)
            ->and($summary['A']['total'])->toBe(0)
            ->and($summary['overall']['guests'])->toBe(0)
            ->and($summary['overall']['total'])->toBe(0);
    });

    it('counts accompanists in the total for each tier', function () {
        Guest::create(['event_id' => $this->evento->id, 'name' => 'G1', 'tier' => 'A', 'accompanists_count' => 2]);
        Guest::create(['event_id' => $this->evento->id, 'name' => 'G2', 'tier' => 'A', 'accompanists_count' => 0]);

        $summary = $this->service->summary($this->evento);

        expect($summary['A']['guests'])->toBe(2)
            ->and($summary['A']['total'])->toBe(4); // 3 + 1
    });

    it('sums totals correctly across all tiers in overall', function () {
        Guest::create(['event_id' => $this->evento->id, 'name' => 'A1', 'tier' => 'A', 'accompanists_count' => 1]);
        Guest::create(['event_id' => $this->evento->id, 'name' => 'B1', 'tier' => 'B', 'accompanists_count' => 0]);
        Guest::create(['event_id' => $this->evento->id, 'name' => 'C1', 'tier' => 'C', 'accompanists_count' => 3]);

        $summary = $this->service->summary($this->evento);

        expect($summary['overall']['guests'])->toBe(3)
            ->and($summary['overall']['total'])->toBe(7); // (1+1) + (1+0) + (1+3)
    });

    it('does not leak guests from other events', function () {
        $otherUser  = User::factory()->create();
        $otherEvento = TenantEvent::create([
            'owner_id'   => $otherUser->id,
            'name'       => 'Outro Evento',
            'slug'       => 'outro-evento-summary',
            'data_inicio' => now()->addMonths(2)->toDateString(),
            'status'     => 'ativo',
        ]);

        Guest::create(['event_id' => $otherEvento->id, 'name' => 'Intruso', 'tier' => 'A', 'accompanists_count' => 0]);

        $summary = $this->service->summary($this->evento);

        expect($summary['overall']['guests'])->toBe(0);
    });
});

describe('GuestService::bulkDelete', function () {
    beforeEach(function () {
        $this->service = new GuestService();

        $user = User::factory()->create();

        $this->evento = TenantEvent::create([
            'owner_id'   => $user->id,
            'name'       => 'Aniversário Bulk',
            'slug'       => 'aniversario-bulk-delete',
            'data_inicio' => now()->addMonths(3)->toDateString(),
            'status'     => 'ativo',
        ]);
    });

    it('deletes all given IDs that belong to the event and returns the count', function () {
        $g1 = Guest::create(['event_id' => $this->evento->id, 'name' => 'A', 'tier' => 'B', 'accompanists_count' => 0]);
        $g2 = Guest::create(['event_id' => $this->evento->id, 'name' => 'B', 'tier' => 'B', 'accompanists_count' => 0]);

        $deleted = $this->service->bulkDelete([$g1->id, $g2->id], $this->evento);

        expect($deleted)->toBe(2)
            ->and(Guest::find($g1->id))->toBeNull()
            ->and(Guest::find($g2->id))->toBeNull();
    });

    it('returns 0 and removes nothing when ids is empty', function () {
        Guest::create(['event_id' => $this->evento->id, 'name' => 'C', 'tier' => 'A', 'accompanists_count' => 0]);

        $deleted = $this->service->bulkDelete([], $this->evento);

        expect($deleted)->toBe(0)
            ->and(Guest::where('event_id', $this->evento->id)->count())->toBe(1);
    });

    it('does not delete guests that belong to another event', function () {
        $otherUser  = User::factory()->create();
        $otherEvento = TenantEvent::create([
            'owner_id'   => $otherUser->id,
            'name'       => 'Outro Evento Bulk',
            'slug'       => 'outro-evento-bulk',
            'data_inicio' => now()->addMonths(1)->toDateString(),
            'status'     => 'ativo',
        ]);

        $foreignGuest = Guest::create(['event_id' => $otherEvento->id, 'name' => 'Intruso', 'tier' => 'A', 'accompanists_count' => 0]);

        $deleted = $this->service->bulkDelete([$foreignGuest->id], $this->evento);

        expect($deleted)->toBe(0)
            ->and(Guest::find($foreignGuest->id))->not->toBeNull();
    });

    it('only deletes owned IDs when the list is a mix of own and foreign', function () {
        $otherUser  = User::factory()->create();
        $otherEvento = TenantEvent::create([
            'owner_id'   => $otherUser->id,
            'name'       => 'Evento Alheio',
            'slug'       => 'evento-alheio-mix',
            'data_inicio' => now()->addMonths(2)->toDateString(),
            'status'     => 'ativo',
        ]);

        $ownGuest     = Guest::create(['event_id' => $this->evento->id,  'name' => 'Próprio', 'tier' => 'B', 'accompanists_count' => 0]);
        $foreignGuest = Guest::create(['event_id' => $otherEvento->id, 'name' => 'Alheio',  'tier' => 'A', 'accompanists_count' => 0]);

        $deleted = $this->service->bulkDelete([$ownGuest->id, $foreignGuest->id], $this->evento);

        expect($deleted)->toBe(1)
            ->and(Guest::find($ownGuest->id))->toBeNull()
            ->and(Guest::find($foreignGuest->id))->not->toBeNull();
    });
});

describe('GuestService::updateStatus', function () {
    beforeEach(function () {
        $this->service = new GuestService();

        $user = User::factory()->create();

        $evento = TenantEvent::create([
            'owner_id'   => $user->id,
            'name'       => 'Chá Bebe Teste',
            'slug'       => 'cha-bebe-status',
            'data_inicio' => now()->addMonths(2)->toDateString(),
            'status'     => 'ativo',
        ]);

        $this->guest = Guest::create([
            'event_id'           => $evento->id,
            'name'               => 'Fernanda Costa',
            'tier'               => 'B',
            'accompanists_count' => 0,
        ]);
    });

    it('updates status to confirmed', function () {
        $this->service->updateStatus($this->guest, 'confirmed');

        expect($this->guest->fresh()->status)->toBe('confirmed');
    });

    it('updates status to declined', function () {
        $this->service->updateStatus($this->guest, 'declined');

        expect($this->guest->fresh()->status)->toBe('declined');
    });

    it('reverts status back to pending', function () {
        $this->service->updateStatus($this->guest, 'confirmed');
        $this->service->updateStatus($this->guest, 'pending');

        expect($this->guest->fresh()->status)->toBe('pending');
    });
});
