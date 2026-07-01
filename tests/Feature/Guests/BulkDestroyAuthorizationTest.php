<?php

use App\Models\Guest;
use App\Models\TenantEvent;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeEvent(User $owner, string $slug): TenantEvent
{
    return TenantEvent::create([
        'owner_id'    => $owner->id,
        'name'        => "Evento {$slug}",
        'slug'        => $slug,
        'data_inicio' => now()->addMonths(3)->toDateString(),
        'status'      => 'ativo',
    ]);
}

function makeGuest(TenantEvent $evento, string $name = 'Convidado'): Guest
{
    return Guest::create([
        'event_id'           => $evento->id,
        'name'               => $name,
        'tier'               => 'B',
        'accompanists_count' => 0,
    ]);
}

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('guests.bulk-destroy — autorização', function () {

    /**
     * ATAQUE 1: Usuário A autenticado tenta deletar via rota do Evento B (pertence ao Usuário B).
     * O Controller deve barrar com 403 antes de qualquer operação no banco.
     */
    it('retorna 403 quando usuário autenticado tenta operar na rota de evento alheio', function () {
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        $eventoA = makeEvent($userA, 'bulk-auth-evento-a');
        $eventoB = makeEvent($userB, 'bulk-auth-evento-b');

        $guestB1 = makeGuest($eventoB, 'Convidado B1');
        $guestB2 = makeGuest($eventoB, 'Convidado B2');

        $response = $this
            ->withoutMiddleware(VerifyCsrfToken::class)
            ->actingAs($userA)
            ->delete(
                route('guests.bulk-destroy', ['evento' => $eventoB->slug]),
                ['ids' => [$guestB1->id, $guestB2->id]],
            );

        $response->assertForbidden();

        // Nenhum convidado do Usuário B foi removido
        expect(Guest::find($guestB1->id))->not->toBeNull()
            ->and(Guest::find($guestB2->id))->not->toBeNull();
    });

    /**
     * ATAQUE 2: Request sem autenticação é redirecionada para login — nunca chega ao Controller.
     */
    it('redireciona para login quando não há sessão autenticada', function () {
        $owner = User::factory()->create();
        $evento = makeEvent($owner, 'bulk-auth-noauth');
        $guest  = makeGuest($evento);

        $response = $this
            ->withoutMiddleware(VerifyCsrfToken::class)
            ->delete(
                route('guests.bulk-destroy', ['evento' => $evento->slug]),
                ['ids' => [$guest->id]],
            );

        $response->assertRedirect(); // 302 → /login
        expect(Guest::find($guest->id))->not->toBeNull();
    });

    /**
     * ATAQUE 3: Usuário A, autenticado no SEU próprio evento, injeta IDs de convidados
     * pertencentes ao Evento B no payload. A request chega ao Controller (próprio evento → 200),
     * mas o Service filtra por event_id: os convidados alheios sobrevivem.
     */
    it('não deleta convidados alheios mesmo que seus IDs estejam no payload da própria request', function () {
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        $eventoA = makeEvent($userA, 'bulk-auth-mix-a');
        $eventoB = makeEvent($userB, 'bulk-auth-mix-b');

        $guestA = makeGuest($eventoA, 'Próprio de A');
        $guestB = makeGuest($eventoB, 'Intruso de B');

        // Usuário A envia AMBOS os IDs para o seu próprio evento
        $response = $this
            ->withoutMiddleware(VerifyCsrfToken::class)
            ->actingAs($userA)
            ->delete(
                route('guests.bulk-destroy', ['evento' => $eventoA->slug]),
                ['ids' => [$guestA->id, $guestB->id]],
            );

        // Request aceita (rota do próprio evento)
        $response->assertRedirect();

        // Convidado próprio deletado; convidado alheio intacto
        expect(Guest::find($guestA->id))->toBeNull()
            ->and(Guest::find($guestB->id))->not->toBeNull();
    });

    /**
     * CAMINHO FELIZ: Usuário deleta os próprios convidados normalmente.
     */
    it('deleta convidados do próprio evento e retorna redirect de sucesso', function () {
        $user   = User::factory()->create();
        $evento = makeEvent($user, 'bulk-auth-happy');

        $g1 = makeGuest($evento, 'Alice');
        $g2 = makeGuest($evento, 'Bob');

        $response = $this
            ->withoutMiddleware(VerifyCsrfToken::class)
            ->actingAs($user)
            ->delete(
                route('guests.bulk-destroy', ['evento' => $evento->slug]),
                ['ids' => [$g1->id, $g2->id]],
            );

        $response->assertRedirect();

        expect(Guest::find($g1->id))->toBeNull()
            ->and(Guest::find($g2->id))->toBeNull();
    });
});
