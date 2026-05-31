<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\Request;

class AdminNotificationController extends Controller
{
    public function __construct(private readonly NotificationService $notifs)
    {
    }

    /**
     * Broadcast d'une annonce (admin).
     * Body: { title, body, role?, company_id? }
     */
    public function broadcast(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'body' => 'required|string',
            'role' => 'nullable|string',
            'company_id' => 'nullable|integer',
        ]);

        $q = User::query();
        if ($request->filled('role')) $q->where('role', $request->role);
        if ($request->filled('company_id')) $q->where('company_id', $request->company_id);

        $users = $q->get();
        $count = 0;
        foreach ($users as $u) {
            $this->notifs->notifyUser(
                $u,
                $request->title,
                $request->body,
                type: 'generic',
                data: [],
                action: 'notifications',
                priority: 'normal',
                channel: 'both',
            );
            $count++;
        }

        return response()->json([
            'status' => 'success',
            'data' => ['sent' => $count],
        ]);
    }
}

