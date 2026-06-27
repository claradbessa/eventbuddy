<?php

namespace App\Http\Middleware;

use App\Models\TenantEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user'       => $request->user(),
                'event_slug' => $this->resolveEventSlug($request),
            ],
            'flash' => [
                'warning' => fn() => $request->session()->get('calendar_warning'),
            ],
        ];
    }

    private function resolveEventSlug(Request $request): ?string
    {
        $user = $request->user();
        if (! $user) {
            return null;
        }

        $slug = TenantEvent::where('owner_id', $user->id)->orderBy('id')->value('slug');

        if ($slug) {
            return $slug;
        }

        // Utilizador autenticado sem evento (ex: primeiro login via Google antes
        // de o callback criar o evento). Cria um evento padrão agora.
        $evento = TenantEvent::firstOrCreate(
            ['owner_id' => $user->id],
            [
                'name'        => 'Meu Evento',
                'slug'        => Str::slug($user->name . '-' . $user->id),
                'data_inicio' => now()->toDateString(),
                'status'      => 'ativo',
            ]
        );

        return $evento->slug;
    }
}
