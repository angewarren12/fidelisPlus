<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\Company;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('notifications:ct-reminders', function (NotificationService $notifs) {
    $today = Carbon::today();

    $sent = 0;

    $vehicles = Vehicle::query()
        ->whereNotNull('next_ct_date')
        ->get(['id', 'company_id', 'license_plate', 'next_ct_date']);

    foreach ($vehicles as $v) {
        $due = Carbon::parse($v->next_ct_date)->startOfDay();

        // Déclencheurs: J-14, J-0, J+7 (si dépassé)
        $reminder = null; // 'J-14'|'J-0'|'J+7'
        if ($today->equalTo($due->copy()->subDays(14))) {
            $reminder = 'J-14';
        } elseif ($today->equalTo($due)) {
            $reminder = 'J-0';
        } elseif ($today->equalTo($due->copy()->addDays(7)) && $due->lt($today)) {
            $reminder = 'J+7';
        }
        if ($reminder === null) continue;

        $company = Company::find($v->company_id);
        if (!$company) continue;

        $recipients = [];

        // 1) Commercial assigné
        if (!empty($company->commercial_id)) {
            $commercial = User::query()->find($company->commercial_id);
            if ($commercial) $recipients[] = $commercial;
        }

        // 2) Correspondant principal
        $main = User::query()
            ->where('company_id', $company->id)
            ->where('is_main_contact', true)
            ->first();
        if ($main) $recipients[] = $main;

        // Unique par user_id
        $uniqueRecipients = collect($recipients)->unique('id')->values();
        if ($uniqueRecipients->isEmpty()) continue;

        $title = 'Contrôle technique';
        $body = match ($reminder) {
            'J-14' => "Rappel: CT à faire dans 14 jours ({$v->license_plate}).",
            'J-0' => "Rappel: CT à faire aujourd'hui ({$v->license_plate}).",
            default => "Urgent: CT en retard depuis 7 jours ({$v->license_plate}).",
        };
        $priority = in_array($reminder, ['J-0', 'J+7'], true) ? 'high' : 'normal';

        foreach ($uniqueRecipients as $user) {
            // Anti-doublon: une notif par véhicule + rappel + jour
            $exists = \App\Models\Notification::query()
                ->where('user_id', $user->id)
                ->where('type', 'fleet_ct')
                ->where('data->vehicle_id', $v->id)
                ->where('data->reminder', $reminder)
                ->whereDate('created_at', $today)
                ->exists();
            if ($exists) continue;

            $notifs->notifyUser(
                $user,
                $title,
                $body,
                type: 'fleet_ct',
                data: [
                    'vehicle_id' => $v->id,
                    'company_id' => $company->id,
                    'license_plate' => $v->license_plate,
                    'reminder' => $reminder,
                    'due_date' => $due->toDateString(),
                ],
                action: 'vehicle_detail',
                priority: $priority,
                channel: 'both',
            );
            $sent++;
        }
    }

    $this->info("CT reminders sent: {$sent}");
})->purpose('Send CT reminder notifications (J-14/J-0/J+7)');

// Scheduler: exécute quotidiennement à 08:00.
Schedule::command('notifications:ct-reminders')->dailyAt('08:00');
Schedule::command('quotes:check-expired')->dailyAt('08:00');

// Cron de pull Odoo -> FidelisPlus (prospects/clients/flottes/devis créés ou modifiés
// côté Odoo). Fréquence provisoire, ajustable. withoutOverlapping() évite un second
// passage si Odoo répond lentement.
Schedule::command('odoo:sync')->everyMinute()->withoutOverlapping();

// Traitement de la file d'attente (jobs Sync*ToOdoo, ProvisionSiraAccountForMember,
// etc. — QUEUE_CONNECTION=database). Sur un hébergement mutualisé, aucun worker
// permanent (`queue:work` en démon) n'est possible : on lance donc un worker
// "jetable" à chaque minute du scheduler, qui traite ce qui est en attente puis
// s'arrête. --max-time=50 garantit qu'il rend la main avant la minute suivante ;
// --tries=1 évite qu'un job qui échoue reste bloqué à retenter indéfiniment.
// Conséquence pratique : une seule tâche cron à configurer côté hébergeur
// (`php artisan schedule:run` chaque minute) suffit à faire tourner à la fois le
// scheduler ET la queue — voir docs/ops/production-cron-queue-setup.md.
Schedule::command('queue:work --stop-when-empty --max-time=50 --tries=1')
    ->everyMinute()
    ->withoutOverlapping();
