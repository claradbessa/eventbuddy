<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\TenantEvent;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class GoogleController extends Controller
{
    // ── Login / Cadastro via Google ───────────────────────────────────────────

    public function redirect()
    {
        /** @var \Laravel\Socialite\Two\GoogleProvider $driver */
        $driver = Socialite::driver('google');

        return $driver
            ->scopes(config('services.google.scopes'))
            ->with(config('services.google.with'))
            ->redirect();
    }

    public function callback(Request $request)
    {
        if ($request->has('error')) {
            return redirect()->route('login')
                ->withErrors(['email' => 'O acesso via Google foi cancelado. Tente novamente.']);
        }

        /** @var \Laravel\Socialite\Two\User $googleUser */
        $googleUser = Socialite::driver('google')->user();

        $user = User::updateOrCreate(
            ['google_id' => $googleUser->getId()],
            [
                'name'                    => $googleUser->getName(),
                'email'                   => $googleUser->getEmail(),
                'avatar'                  => $googleUser->getAvatar(),
                'google_token'            => $googleUser->token,
                'google_refresh_token'    => $googleUser->refreshToken,
                'google_token_expires_at' => $googleUser->expiresIn
                    ? now()->addSeconds($googleUser->expiresIn)
                    : null,
                'email_verified_at'       => now(),
            ]
        );

        $event = TenantEvent::firstOrCreate(
            ['owner_id' => $user->id],
            [
                'name'   => 'Meu Evento',
                'slug'   => Str::slug($user->name . '-' . $user->id),
                'status' => 'ativo',
            ]
        );

        Auth::login($user, remember: true);

        return redirect()->route('evento.dashboard', $event);
    }

    // ── Conexão do Google Calendar para utilizadores já autenticados ──────────

    public function calendarRedirect()
    {
        /** @var \Laravel\Socialite\Two\GoogleProvider $driver */
        $driver = Socialite::driver('google');

        return $driver
            ->scopes(config('services.google.scopes'))
            ->with(config('services.google.with'))
            ->redirect();
    }

    public function calendarCallback(Request $request)
    {
        if ($request->has('error')) {
            return redirect()->route('profile.edit')
                ->withErrors(['google' => 'Conexão com o Google Calendar cancelada.']);
        }

        /** @var \Laravel\Socialite\Two\User $googleUser */
        $googleUser = Socialite::driver('google')->user();

        $user = Auth::user();
        $user->update([
            'google_token'            => $googleUser->token,
            'google_token_expires_at' => $googleUser->expiresIn
                ? now()->addSeconds($googleUser->expiresIn)
                : null,
            // Só sobrescreve o refresh_token se vier um novo (Google só envia com prompt=consent)
            'google_refresh_token' => $googleUser->refreshToken
                ? $googleUser->refreshToken
                : $user->google_refresh_token,
        ]);

        return redirect()->route('profile.edit')->with('status', 'google-connected');
    }

    public function calendarDisconnect()
    {
        Auth::user()->update([
            'google_token'            => null,
            'google_refresh_token'    => null,
            'google_token_expires_at' => null,
        ]);

        return redirect()->route('profile.edit')->with('status', 'google-disconnected');
    }
}
