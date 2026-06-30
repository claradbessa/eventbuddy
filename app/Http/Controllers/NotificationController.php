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
                $data = $n->data;

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
