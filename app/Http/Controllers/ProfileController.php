<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use App\Models\TenantEvent;
use App\Services\ChecklistService;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function edit(Request $request): Response
    {
        $evento = TenantEvent::where('owner_id', $request->user()->id)
            ->orderBy('id')
            ->first(['id', 'name', 'event_type', 'data_inicio', 'max_guests']);

        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail'  => $request->user() instanceof MustVerifyEmail,
            'status'           => session('status'),
            'evento'           => $evento ? [
                'name'       => $evento->name,
                'event_type' => $evento->event_type,
                'event_date' => $evento->data_inicio?->toDateString(),
                'max_guests' => $evento->max_guests,
            ] : null,
            'googleConnected' => filled($request->user()->google_token),
            'hasPassword'     => ! is_null($request->user()->password),
        ]);
    }

    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        // ── Atualiza User ─────────────────────────────────────────────────────
        $request->user()->fill([
            'name'  => $validated['name'],
            'email' => $validated['email'],
        ]);

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        // ── Atualiza TenantEvent (se existir e algum campo de evento vier) ───
        $hasEventData = filled($validated['event_name'] ?? null)
                     || filled($validated['event_type'] ?? null)
                     || filled($validated['event_date'] ?? null)
                     || array_key_exists('max_guests', $validated); // nullable — presença já conta

        if ($hasEventData) {
            $evento = TenantEvent::where('owner_id', $request->user()->id)
                ->orderBy('id')
                ->first();

            if ($evento) {
                $previousType = $evento->event_type;

                // Campos não-nullable: filtra nulls para não sobrescrever com null
                $updates = array_filter([
                    'name'        => $validated['event_name'] ?: $evento->name,
                    'event_type'  => $validated['event_type'] ?? $evento->event_type,
                    'data_inicio' => $validated['event_date'] ?? $evento->data_inicio,
                ], fn ($v) => $v !== null);

                // max_guests pode ser null intencionalmente (limpar o limite)
                if (array_key_exists('max_guests', $validated)) {
                    $updates['max_guests'] = $validated['max_guests'];
                }

                $evento->fill($updates)->save();

                // Injeta checklist apenas na primeira definição do tipo de evento
                if (! filled($previousType) && filled($evento->event_type)) {
                    app(ChecklistService::class)->injectIfEligible($evento);
                }
            }
        }

        return Redirect::route('profile.edit')->with('status', 'profile-updated');
    }

    public function resetEvent(Request $request): RedirectResponse
    {
        $evento = TenantEvent::where('owner_id', $request->user()->id)
            ->orderBy('id')
            ->first();

        if ($evento) {
            $evento->checklistTasks()->delete();
            $evento->parcelas()->delete();
            $evento->despesas()->delete();
            $evento->update([
                'event_type'  => null,
                'data_inicio' => null,
            ]);
        }

        return Redirect::route('profile.edit')->with('status', 'event-reset');
    }

    public function destroy(Request $request): RedirectResponse
    {
        $isGoogleUser = is_null($request->user()->password);

        if ($isGoogleUser) {
            $userEmail = $request->user()->email;
            $request->validate([
                'email_confirmation' => [
                    'required',
                    'string',
                    function (string $attribute, mixed $value, \Closure $fail) use ($userEmail) {
                        if (strtolower(trim($value)) !== strtolower($userEmail)) {
                            $fail('O e-mail digitado não corresponde à sua conta.');
                        }
                    },
                ],
            ]);
        } else {
            $request->validate([
                'password' => ['required', 'current_password'],
            ]);
        }

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}
