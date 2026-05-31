<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SupportRequest;
use App\Services\NotificationService;
use App\Events\SupportReplyCreated;
use Illuminate\Http\Request;

class SupportController extends Controller
{
    public function __construct(private readonly NotificationService $notifs)
    {
    }

    /**
     * Liste des demandes de support (client : ses tickets ; admin/commercial : file globale paginée).
     */
    public function index(Request $request)
    {
        $user = $request->user();

        if (in_array($user->role, ['admin', 'commercial'], true)) {
            $query = SupportRequest::query()
                ->with(['user:id,first_name,last_name,email,company_id']);

            if ($user->role === 'commercial') {
                $query->whereHas('user.company', function ($q) use ($user) {
                    $q->where('commercial_id', $user->id);
                });
            }

            $paginator = $query
                ->orderByDesc('created_at')
                ->paginate($request->integer('per_page', 15));

            return response()->json([
                'status' => 'success',
                'data' => $paginator->items(),
                'meta' => [
                    'current_page' => $paginator->currentPage(),
                    'last_page' => $paginator->lastPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                ],
            ]);
        }

        $requests = SupportRequest::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $requests,
        ]);
    }

    /**
     * Envoyer une demande de support.
     */
    public function store(Request $request)
    {
        $request->validate([
            'subject' => 'required|string|max:255',
            'message' => 'required|string',
            'priority' => 'nullable|in:low,medium,high'
        ]);

        $support = SupportRequest::create([
            'user_id' => $request->user()->id,
            'subject' => $request->subject,
            'message' => $request->message,
            'priority' => $request->priority ?? 'medium',
            'status' => 'open'
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Demande de support envoyée.',
            'data' => $support
        ], 201);
    }

    /**
     * Réponse staff (admin / commercial) sur une demande.
     */
    public function reply(Request $request, $id)
    {
        $request->validate([
            'message' => 'required|string',
        ]);

        $support = SupportRequest::with('user')->findOrFail($id);

        $support->update([
            'staff_reply' => $request->message,
            'status' => 'in_progress',
        ]);

        if ($support->user) {
            $this->notifs->notifyUser(
                $support->user,
                'Support',
                'Vous avez reçu une réponse à votre demande de support.',
                type: 'support_reply',
                data: ['support_request_id' => $support->id],
                action: 'notifications',
                priority: 'normal',
                channel: 'both',
            );

            event(new SupportReplyCreated(
                supportRequestId: (int) $support->id,
                userId: (int) $support->user->id,
                status: (string) $support->status,
            ));
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Réponse enregistrée.',
            'data' => $support->fresh(),
        ]);
    }
}
