<?php

namespace App\Http\Controllers;

use App\Models\Guest;
use App\Models\TenantEvent;
use App\Services\Guest\GuestService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class GuestController extends Controller
{
    public function __construct(private readonly GuestService $guestService) {}

    public function index(Request $request, TenantEvent $evento): Response
    {
        if ($evento->owner_id !== $request->user()->id) {
            abort(403);
        }

        $guests = $evento->guests()
            ->orderByRaw("FIELD(tier, 'A', 'B', 'C')")
            ->orderBy('name')
            ->get()
            ->map(fn (Guest $g) => [
                'id'                 => $g->id,
                'name'               => $g->name,
                'tier'               => $g->tier,
                'status'             => $g->status,
                'group'              => $g->group,
                'special_role'       => $g->special_role,
                'table_number'       => $g->table_number,
                'invited_by'         => $g->invited_by,
                'companion_names'    => $g->companion_names,
                'accompanists_count' => $g->accompanists_count,
            ]);

        $eventDate = $evento->data_inicio instanceof Carbon
            ? $evento->data_inicio->format('Y-m-d')
            : null;

        return Inertia::render('Guests/Index', [
            'evento'  => [
                'id'         => $evento->id,
                'name'       => $evento->name,
                'slug'       => $evento->slug,
                'max_guests' => $evento->max_guests,
                'event_type' => $evento->event_type,
                'event_date' => $eventDate,
            ],
            'guests'  => $guests->values(),
            'summary' => $this->guestService->summary($evento),
        ]);
    }

    public function store(Request $request, TenantEvent $evento): RedirectResponse
    {
        if ($evento->owner_id !== $request->user()->id) {
            abort(403);
        }

        $data = $request->validate([
            'name'               => ['required', 'string', 'max:255'],
            'tier'               => ['required', 'string', 'in:A,B,C'],
            'group'              => ['nullable', 'string', 'max:100'],
            'special_role'       => ['nullable', 'string', 'max:50'],
            'table_number'       => ['nullable', 'string', 'max:50'],
            'invited_by'         => ['nullable', 'string', 'max:100'],
            'companion_names'    => ['nullable', 'array', 'max:20'],
            'companion_names.*'  => ['nullable', 'string', 'max:255'],
            'accompanists_count' => ['nullable', 'integer', 'min:0', 'max:20'],
        ]);

        $this->guestService->create($evento, $data);

        session()->flash('toast', ['type' => 'success', 'message' => 'Convidado adicionado!']);

        return back();
    }

    public function update(Request $request, TenantEvent $evento, Guest $guest): RedirectResponse
    {
        if ($evento->owner_id !== $request->user()->id || $guest->event_id !== $evento->id) {
            abort(403);
        }

        $data = $request->validate([
            'name'               => ['required', 'string', 'max:255'],
            'tier'               => ['required', 'string', 'in:A,B,C'],
            'status'             => ['nullable', 'string', 'in:pending,confirmed,declined'],
            'group'              => ['nullable', 'string', 'max:100'],
            'special_role'       => ['nullable', 'string', 'max:50'],
            'table_number'       => ['nullable', 'string', 'max:50'],
            'invited_by'         => ['nullable', 'string', 'max:100'],
            'companion_names'    => ['nullable', 'array', 'max:20'],
            'companion_names.*'  => ['nullable', 'string', 'max:255'],
            'accompanists_count' => ['nullable', 'integer', 'min:0', 'max:20'],
        ]);

        $this->guestService->update($guest, $data);

        return back();
    }

    public function updateStatus(Request $request, TenantEvent $evento, Guest $guest): RedirectResponse
    {
        if ($evento->owner_id !== $request->user()->id || $guest->event_id !== $evento->id) {
            abort(403);
        }

        $data = $request->validate([
            'status' => ['required', 'string', 'in:pending,confirmed,declined'],
        ]);

        $this->guestService->updateStatus($guest, $data['status']);

        return back();
    }

    public function updateMaxGuests(Request $request, TenantEvent $evento): RedirectResponse
    {
        if ($evento->owner_id !== $request->user()->id) {
            abort(403);
        }

        $data = $request->validate([
            'max_guests' => ['nullable', 'integer', 'min:1', 'max:10000'],
        ]);

        $evento->update(['max_guests' => $data['max_guests']]);

        return back();
    }

    public function destroy(Request $request, TenantEvent $evento, Guest $guest): RedirectResponse
    {
        if ($evento->owner_id !== $request->user()->id || $guest->event_id !== $evento->id) {
            abort(403);
        }

        $this->guestService->delete($guest);

        session()->flash('toast', ['type' => 'success', 'message' => 'Convidado removido.']);

        return back();
    }
}
