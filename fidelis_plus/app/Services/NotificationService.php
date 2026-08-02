<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;
use App\Events\NotificationCreated;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    public function notifyUser(
        User $user,
        string $title,
        string $body,
        ?string $type = null,
        array $data = [],
        ?string $action = null,
        string $priority = 'normal',
        string $channel = 'both',
    ): Notification {
        if (!$this->isEnabledForUser($user, $type, $channel)) {
            // Still persist in-app if user disabled push only? For now: skip entirely when disabled.
            return Notification::create([
                'user_id' => $user->id,
                'title' => $title,
                'body' => $body,
                'type' => $type,
                'data' => $data ?: null,
                'action' => $action,
                'priority' => $priority,
                'channel' => 'in_app',
            ]);
        }

        $notification = Notification::create([
            'user_id' => $user->id,
            'title' => $title,
            'body' => $body,
            'type' => $type,
            'data' => $data ?: null,
            'action' => $action,
            'priority' => $priority,
            'channel' => $channel,
        ]);

        if (in_array($channel, ['push', 'both'], true)) {
            $this->sendPushIfPossible($user, $notification);
        }

        // Le broadcast temps réel ne doit jamais faire échouer la requête HTTP
        // (ex: serveur Pusher/Soketi indisponible en local).
        try {
            event(new NotificationCreated($notification));
        } catch (\Throwable $e) {
            Log::warning('Broadcast temps réel indisponible pour la notification', [
                'notification_id' => $notification->id,
                'error' => $e->getMessage(),
            ]);
        }

        return $notification;
    }

    private function isEnabledForUser(User $user, ?string $type, string $channel): bool
    {
        $prefs = (array) ($user->notification_preferences ?? []);
        if (($prefs['push_enabled'] ?? true) === false && in_array($channel, ['push', 'both'], true)) {
            return false;
        }
        $key = match ($type) {
            'fleet_ct' => 'fleet_ct',
            'quote_status' => 'quotes',
            'support_reply' => 'support',
            'generic' => 'generic',
            default => null,
        };
        if ($key === null) return true;
        return ($prefs[$key] ?? true) === true;
    }

    private function sendPushIfPossible(User $user, Notification $notification): void
    {
        $token = $user->fcm_token;
        if (!$token) return;

        $serverKey = env('FCM_SERVER_KEY');
        if (!$serverKey) {
            Log::info('FCM push skipped (missing FCM_SERVER_KEY)', ['notification_id' => $notification->id]);
            return;
        }

        try {
            $payload = [
                'to' => $token,
                'priority' => $notification->priority === 'high' ? 'high' : 'normal',
                'notification' => [
                    'title' => $notification->title,
                    'body' => $notification->body,
                ],
                'data' => array_filter([
                    'type' => $notification->type,
                    'action' => $notification->action,
                    'notification_id' => (string) $notification->id,
                ]) + ($notification->data ?? []),
            ];

            $resp = Http::withHeaders([
                'Authorization' => 'key='.$serverKey,
                'Content-Type' => 'application/json',
            ])->post('https://fcm.googleapis.com/fcm/send', $payload);

            if (!$resp->successful()) {
                Log::warning('FCM push failed', [
                    'notification_id' => $notification->id,
                    'status' => $resp->status(),
                    'body' => $resp->body(),
                ]);
            }
        } catch (\Throwable $e) {
            Log::warning('FCM push exception', [
                'notification_id' => $notification->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}

