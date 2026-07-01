<?php

namespace App\Http\Controllers;

use App\Models\Guest;
use App\Models\TenantEvent;
use App\Services\Guest\GuestReportService;
use App\Services\Guest\GuestService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as BaseResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class GuestController extends Controller
{
    public function __construct(
        private readonly GuestService       $guestService,
        private readonly GuestReportService $guestReportService,
    ) {}

    public function index(Request $request, TenantEvent $evento): Response
    {
        if ($evento->owner_id !== $request->user()->id) {
            abort(403);
        }

        $invitedByRaw = $request->query('invited_by');
        $groupRaw     = $request->query('group');
        $tableRaw     = $request->query('table');

        $invitedByFilter = is_string($invitedByRaw) && $invitedByRaw !== '' ? $invitedByRaw : null;
        $groupFilter     = is_string($groupRaw)     && $groupRaw     !== '' ? $groupRaw     : null;
        $tableFilter     = is_string($tableRaw)     && $tableRaw     !== '' ? $tableRaw     : null;

        $guests = $evento->guests()
            ->orderByRaw("FIELD(tier, 'A', 'B', 'C')")
            ->orderBy('name')
            ->byInvitedBy($invitedByFilter)
            ->byGroup($groupFilter)
            ->byTable($tableFilter)
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
                'phone'              => $g->phone,
            ]);

        // Unfiltered — for populating the filter dropdown options
        $allGuests = $evento->guests()->get(['invited_by', 'group', 'table_number']);

        $filterOptions = [
            'invited_by' => $allGuests->pluck('invited_by')->filter()->unique()->sort()->values()->toArray(),
            'groups'     => $allGuests->pluck('group')->filter()->unique()->sort()->values()->toArray(),
            'tables'     => $allGuests->pluck('table_number')->filter()->unique()->sort()->values()->toArray(),
        ];

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
            'guests'        => $guests->values(),
            'summary'       => $this->guestService->summary($evento),
            'filters'       => [
                'invited_by' => $invitedByFilter,
                'group'      => $groupFilter,
                'table'      => $tableFilter,
            ],
            'filterOptions' => $filterOptions,
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
            'companion_names'             => ['nullable', 'array', 'max:20'],
            'companion_names.*.name'      => ['nullable', 'string', 'max:255'],
            'companion_names.*.age_group' => ['nullable', 'string', 'in:adult,child,baby'],
            'accompanists_count'          => ['nullable', 'integer', 'min:0', 'max:20'],
            'phone'                       => ['nullable', 'string', 'max:20'],
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
            'companion_names'             => ['nullable', 'array', 'max:20'],
            'companion_names.*.name'      => ['nullable', 'string', 'max:255'],
            'companion_names.*.age_group' => ['nullable', 'string', 'in:adult,child,baby'],
            'accompanists_count'          => ['nullable', 'integer', 'min:0', 'max:20'],
            'phone'                       => ['nullable', 'string', 'max:20'],
            'update_family_tables'        => ['nullable', 'boolean'],
        ]);

        $updateFamilyTables = (bool) ($data['update_family_tables'] ?? false);
        unset($data['update_family_tables']);

        $this->guestService->update($guest, $data, $updateFamilyTables);

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

    public function exportCsv(Request $request, TenantEvent $evento): StreamedResponse
    {
        if ($evento->owner_id !== $request->user()->id) {
            abort(403);
        }

        $invitedByRaw = $request->query('invited_by');
        $groupRaw     = $request->query('group');
        $tableRaw     = $request->query('table');

        $filters = [
            'invited_by' => is_string($invitedByRaw) && $invitedByRaw !== '' ? $invitedByRaw : null,
            'group'      => is_string($groupRaw)     && $groupRaw     !== '' ? $groupRaw     : null,
            'table'      => is_string($tableRaw)     && $tableRaw     !== '' ? $tableRaw     : null,
        ];

        return $this->guestReportService->exportToCsv($evento, $filters);
    }

    public function exportReceptionPdf(Request $request, TenantEvent $evento): BaseResponse
    {
        if ($evento->owner_id !== $request->user()->id) {
            abort(403);
        }

        return $this->guestReportService->generateReceptionPdf($evento);
    }

    public function exportSeatingPdf(Request $request, TenantEvent $evento): BaseResponse
    {
        if ($evento->owner_id !== $request->user()->id) {
            abort(403);
        }

        return $this->guestReportService->generateSeatingPdf($evento);
    }

    public function bulkDestroy(Request $request, TenantEvent $evento): RedirectResponse
    {
        if ($evento->owner_id !== $request->user()->id) {
            abort(403);
        }

        $data = $request->validate([
            'ids'   => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'integer', 'min:1'],
        ]);

        /** @var list<int> $ids */
        $ids     = array_values(array_map('intval', $data['ids']));
        $deleted = $this->guestService->bulkDelete($ids, $evento);

        $noun = $deleted === 1 ? 'convidado removido' : 'convidados removidos';
        session()->flash('toast', ['type' => 'success', 'message' => "{$deleted} {$noun}."]);

        return back();
    }
}
