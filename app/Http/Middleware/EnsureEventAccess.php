<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureEventAccess
{
    /**
     * Garante que o evento da rota pertence ao usuário autenticado.
     * Roda após SubstituteBindings, então {event} já está resolvido como TenantEvent.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $event = $request->route('event');

        if (!$event || $event->owner_id !== $request->user()?->id) {
            abort(403, 'Acesso negado a este evento.');
        }

        return $next($request);
    }
}
