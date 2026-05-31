<?php

namespace Tests\Feature\Api;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_cannot_mark_another_users_notification_as_read(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        $notification = Notification::create([
            'user_id' => $userB->id,
            'title' => 'Test',
            'body' => 'Corps',
            'type' => 'alert',
        ]);

        $response = $this->actingAs($userA, 'sanctum')
            ->patchJson("/api/v1/notifications/{$notification->id}/read");

        $response->assertStatus(404);
        $this->assertNull($notification->fresh()->read_at);
    }
}
