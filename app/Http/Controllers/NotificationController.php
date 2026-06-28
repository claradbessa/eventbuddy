<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['notifications' => [], 'unread_count' => 0]);
        }

        $notifications = $user->unreadNotifications()->latest()->take(50)->get()
            ->map(function ($n) {
                // Normaliza data: o cast 'array' do DatabaseNotification decodifica
                // uma vez, mas inserts diretos no BD podem gerar string duplamente
                // codificada. Garantimos que sempre retornamos um objeto/array.
                $data = $n->data;
                if (is_string($data)) {
                    $data = json_decode($data, true) ?? [];
                }

                return [
                    'id'         => $n->id,
                    'data'       => $data,
                    'created_at' => $n->created_at->toISOString(),
                ];
            })
            ->values();

        return response()->json([
            'notifications' => $notifications,
            'unread_count'  => $notifications->count(),
        ]);
    }

    public function markRead(Request $request, string $id): JsonResponse
    {
        $notification = $request->user()
            ->notifications()
            ->findOrFail($id);

        $notification->markAsRead();

        return response()->json(['ok' => true]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return response()->json(['ok' => true]);
    }
}
