<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePagadorRequest;
use App\Models\EventPagador;
use App\Models\TenantEvent;
use Illuminate\Http\JsonResponse;

class EventPagadorController extends Controller
{
    public function store(StorePagadorRequest $request, TenantEvent $evento): JsonResponse
    {
        if ($evento->owner_id !== $request->user()->id) {
            abort(403);
        }

        $pagador = $evento->pagadores()->create($request->validated());

        return response()->json($pagador, 201);
    }

    public function destroy(TenantEvent $evento, EventPagador $pagador): JsonResponse
    {
        if ($pagador->event_id !== $evento->id) {
            abort(404);
        }

        if ($pagador->despesas()->exists()) {
            return response()->json([
                'message' => 'Pagador vinculado a despesas e não pode ser removido.',
            ], 422);
        }

        $pagador->delete();

        return response()->json(null, 204);
    }
}
