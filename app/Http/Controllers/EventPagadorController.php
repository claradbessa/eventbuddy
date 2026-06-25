<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePagadorRequest;
use App\Models\EventPagador;
use App\Models\TenantEvent;
use Illuminate\Http\JsonResponse;

class EventPagadorController extends Controller
{
    public function index(TenantEvent $event): JsonResponse
    {
        $pagadores = $event->pagadores()
            ->withCount('despesas')
            ->orderBy('nome')
            ->get();

        return response()->json($pagadores);
    }

    public function store(StorePagadorRequest $request, TenantEvent $event): JsonResponse
    {
        $pagador = $event->pagadores()->create($request->validated());

        return response()->json($pagador, 201);
    }

    public function destroy(TenantEvent $event, EventPagador $payer): JsonResponse
    {
        if ($payer->event_id !== $event->id) {
            abort(404);
        }

        if ($payer->despesas()->exists()) {
            return response()->json([
                'message' => 'Pagador vinculado a despesas e não pode ser removido.',
            ], 422);
        }

        $payer->delete();

        return response()->json(null, 204);
    }
}
