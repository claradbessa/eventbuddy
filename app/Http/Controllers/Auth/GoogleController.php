<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\TenantEvent;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class GoogleController extends Controller
{
    public function redirect()
    {
        return Socialite::driver('google')
            ->scopes(config('services.google.scopes'))
            ->with(config('services.google.with'))
            ->redirect();
    }

    public function callback()
    {
        $googleUser = Socialite::driver('google')->user();

        $user = User::updateOrCreate(
            ['google_id' => $googleUser->getId()],
            [
                'name'                 => $googleUser->getName(),
                'email'                => $googleUser->getEmail(),
                'avatar'               => $googleUser->getAvatar(),
                'google_token'         => $googleUser->token,
                'google_refresh_token' => $googleUser->refreshToken ?? null,
                'email_verified_at'    => now(),
            ]
        );

        // Garante que o utilizador tem pelo menos um evento associado
        $event = TenantEvent::firstOrCreate(
            ['owner_id' => $user->id],
            [
                'name'        => 'Meu Evento',
                'slug'        => Str::slug($user->name . '-' . $user->id),
                'data_inicio' => now()->toDateString(),
                'status'      => 'ativo',
            ]
        );

        Auth::login($user, remember: true);

        return redirect()->route('fornecedores.index', $event);
    }
}
