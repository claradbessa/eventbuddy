<?php

namespace App\Http\Controllers;

use App\Models\EventChecklistTask;
use App\Models\TenantEvent;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ChecklistController extends Controller
{
    public function index(Request $request, TenantEvent $evento): Response
    {
        if ($evento->owner_id !== $request->user()->id) {
            abort(403);
        }

        $today = now()->startOfDay();

        $tasks = $evento->checklistTasks()
            ->reorder()
            ->orderByRaw("FIELD(priority, 'alta', 'media', 'baixa')")
            ->orderByRaw('(due_date IS NULL) ASC, due_date ASC')
            ->orderBy('order', 'asc')
            ->get()
            ->map(function (EventChecklistTask $task) use ($today) {
                /** @var \Carbon\Carbon|null $dueDate */
                $dueDate = $task->due_date;
                /** @var \Carbon\Carbon|null $completedAt */
                $completedAt = $task->completed_at;

                return [
                    'id'           => $task->id,
                    'title'        => $task->title,
                    'status'       => $task->status,
                    'priority'     => $task->priority,
                    'due_date'     => $dueDate?->toDateString(),
                    'completed_at' => $completedAt?->toDateTimeString(),
                    'order'        => $task->order,
                    'is_late'      => $dueDate !== null
                        && $task->status !== 'concluido'
                        && $dueDate->lt($today),
                    'days_until'   => $dueDate !== null
                        ? (int) $today->diffInDays($dueDate, false)
                        : null,
                ];
            });

        $done    = $tasks->where('status', 'concluido')->count();
        $total   = $tasks->count();

        return Inertia::render('Checklist/Index', [
            'evento' => [
                'id'         => $evento->id,
                'name'       => $evento->name,
                'slug'       => $evento->slug,
                'event_type' => $evento->event_type,
                'data_inicio' => $evento->data_inicio?->format('d/m/Y'),
            ],
            'tasks' => $tasks->values(),
            'stats' => [
                'total'   => $total,
                'done'    => $done,
                'pending' => $tasks->where('status', 'pendente')->count(),
                'late'    => $tasks->where('is_late', true)->count(),
                'percent' => $total > 0 ? (int) round(($done / $total) * 100) : 0,
            ],
        ]);
    }

    public function store(Request $request, TenantEvent $evento): RedirectResponse
    {
        if ($evento->owner_id !== $request->user()->id) {
            abort(403);
        }

        $validated = $request->validate([
            'title'    => ['required', 'string', 'max:255'],
            'priority' => ['nullable', 'string', 'in:alta,media,baixa'],
            'due_date' => ['nullable', 'date'],
        ]);

        $maxOrder = $evento->checklistTasks()->max('order') ?? 0;

        $evento->checklistTasks()->create([
            'title'    => $validated['title'],
            'priority' => $validated['priority'] ?? 'baixa',
            'due_date' => $validated['due_date'] ?? null,
            'status'   => 'pendente',
            'order'    => $maxOrder + 1,
        ]);

        return back();
    }

    public function toggle(Request $request, TenantEvent $evento, EventChecklistTask $task): RedirectResponse
    {
        if ($evento->owner_id !== $request->user()->id || $task->event_id !== $evento->id) {
            abort(403);
        }

        if ($task->status === 'concluido') {
            $task->update(['status' => 'pendente', 'completed_at' => null]);
        } else {
            $task->update(['status' => 'concluido', 'completed_at' => now()]);
        }

        return back();
    }

    public function destroy(Request $request, TenantEvent $evento, EventChecklistTask $task): RedirectResponse
    {
        if ($evento->owner_id !== $request->user()->id || $task->event_id !== $evento->id) {
            abort(403);
        }

        $task->delete();

        return back();
    }
}
