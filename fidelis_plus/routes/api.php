<?php

use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\LoyaltyActivityController;
use App\Http\Controllers\Api\LoyaltySettingController;
use App\Http\Controllers\Api\LoyaltyPosScanController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\QuoteController;
use App\Http\Controllers\Api\StationController;
use App\Http\Controllers\Api\StatsController;
use App\Http\Controllers\Api\ProspectController;
use App\Http\Controllers\Api\SupportController;
use App\Http\Controllers\Api\VehicleController;
use App\Http\Controllers\Api\CommercialKpiTargetController;
use App\Http\Controllers\Api\LoyaltyAccountController;
use App\Http\Controllers\Api\LoyaltyMarketingLookupController;
use App\Http\Controllers\Api\LoyaltyRewardController;
use App\Http\Controllers\Api\LoyaltyStationScanReportController;
use App\Http\Controllers\Api\AdminNotificationController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — Fidelis Plus
|--------------------------------------------------------------------------
| Préfixe global : /api (voir bootstrap/app.php)
| Nommage : api.v1.* — php artisan route:list --name=api.v1
| Référence : config/fidelis_api.php + docs/openapi/fidelis-plus-v1.yaml
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->name('api.v1.')->middleware('throttle:180,1')->group(function () {

    // --- Auth publique ---
    Route::post('/auth/login', [AuthController::class, 'login'])
        ->middleware('throttle:60,1')
        ->name('auth.login');
    Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword'])
        ->middleware('throttle:5,1')
        ->name('auth.forgot-password');
    Route::post('/auth/reset-password', [AuthController::class, 'resetPassword'])
        ->middleware('throttle:10,1')
        ->name('auth.reset-password');

    // --- Formulaire public "Fidelis Plus" (QR station, relance visite technique) ---
    Route::post('/technical-visit-reminders', [\App\Http\Controllers\Api\TechnicalVisitReminderController::class, 'store'])
        ->middleware('throttle:20,1')
        ->name('public.technical-visit-reminders.store');

    // --- Déclencheur manuel de synchro Odoo (utilitaire de préproduction) ---
    Route::get('/sync-odoo', function () {
        try {
            \Illuminate\Support\Facades\Artisan::call('queue:work', ['--stop-when-empty' => true, '--tries' => 1]);
        } catch (\Throwable $e) {
            // Ignorer si déjà en cours
        }
        \Illuminate\Support\Facades\Artisan::call('odoo:sync', ['--full' => true]);
        $logs = \App\Models\OdooSyncLog::latest('id')->take(6)->get();
        return response()->json([
            'success' => true,
            'message' => 'Synchronisation Odoo exécutée avec succès.',
            'recent_logs' => $logs,
        ]);
    })->name('public.sync-odoo');

    Route::get('/public/odoo-sync-trigger', function () {
        return redirect('/api/v1/sync-odoo');
    });

    // --- Intégration app mobile client SIRA (jeton de service, pas de session utilisateur) ---
    Route::prefix('integrations/sira')->middleware(['sira.token', 'throttle:120,1'])->name('integrations.sira.')->group(function () {
        Route::post('/loyalty/register', [\App\Http\Controllers\Api\LoyaltySiraIntegrationController::class, 'register'])->name('loyalty.register');
        Route::get('/loyalty/{siraClientId}', [\App\Http\Controllers\Api\LoyaltySiraIntegrationController::class, 'show'])->name('loyalty.show');
        Route::get('/loyalty/{siraClientId}/history', [\App\Http\Controllers\Api\LoyaltySiraIntegrationController::class, 'history'])->name('loyalty.history');
        Route::put('/loyalty/{siraClientId}/vehicles', [\App\Http\Controllers\Api\LoyaltySiraIntegrationController::class, 'syncVehicles'])->name('loyalty.vehicles.sync');
    });

    // Intégration entrante Odoo : remplacée par un cron de pull côté FidelisPlus
    // (voir app/Console/Commands/SyncFromOdoo.php) suite au compte-rendu de la séance
    // de travail avec leur équipe — Odoo n'appelle plus FidelisPlus directement.

    Route::middleware('auth:sanctum')->group(function () {

        Route::get('/auth/me', [AuthController::class, 'me'])->name('auth.me');
        Route::post('/auth/logout', [AuthController::class, 'logout'])->name('auth.logout');
        Route::patch('/auth/fcm-token', [AuthController::class, 'updateFcmToken'])->name('auth.fcm-token');
        Route::patch('/me/notification-preferences', [AuthController::class, 'updateNotificationPreferences'])
            ->name('me.notification-preferences');
        Route::patch('/me', [AuthController::class, 'updateProfile'])
            ->middleware('throttle:20,1')
            ->name('me.update');
        Route::post('/me/avatar', [AuthController::class, 'updateAvatar'])
            ->middleware('throttle:20,1')
            ->name('me.avatar');
        Route::patch('/auth/change-password', [AuthController::class, 'changePassword'])
            ->middleware('throttle:10,1')
            ->name('auth.change-password');

        Route::apiResource('team', \App\Http\Controllers\Api\TeamController::class)
            ->middleware('role:admin_commercial,admin_marketing,super_admin,commercial');
        Route::post('team/{id}/reassign', [\App\Http\Controllers\Api\TeamController::class, 'reassignClients'])
            ->middleware('role:admin_commercial,super_admin')
            ->name('team.reassign');

        Route::apiResource('stations', StationController::class)->only(['index', 'show']);
        Route::apiResource('stations', StationController::class)->except(['index', 'show'])->middleware('role:admin_commercial,admin_marketing,super_admin');

        Route::prefix('payment-terms')->name('payment-terms.')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\PaymentTermController::class, 'index'])->name('index');
            Route::post('/', [\App\Http\Controllers\Api\PaymentTermController::class, 'store'])->name('store');
            Route::put('/{id}', [\App\Http\Controllers\Api\PaymentTermController::class, 'update'])->name('update');
            Route::delete('/{id}', [\App\Http\Controllers\Api\PaymentTermController::class, 'destroy'])->name('destroy');
        });

        Route::get('/settings', [\App\Http\Controllers\Api\SettingController::class, 'index'])->name('settings.index');
        Route::put('/settings', [\App\Http\Controllers\Api\SettingController::class, 'update'])->middleware('role:admin_commercial,super_admin')->name('settings.update');

        Route::prefix('tariffs')->name('tariffs.')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\PricingController::class, 'index'])->name('index');
            Route::get('/{id}', [\App\Http\Controllers\Api\PricingController::class, 'show'])->name('show');
            Route::post('/', [\App\Http\Controllers\Api\PricingController::class, 'store'])->middleware('role:admin_commercial,super_admin')->name('store');
            Route::put('/{id}', [\App\Http\Controllers\Api\PricingController::class, 'update'])->middleware('role:admin_commercial,super_admin')->name('update');
            Route::delete('/{id}', [\App\Http\Controllers\Api\PricingController::class, 'destroy'])->middleware('role:admin_commercial,super_admin')->name('destroy');
        });

        Route::post('admin/notifications/broadcast', [AdminNotificationController::class, 'broadcast'])
            ->middleware('role:admin_commercial,admin_marketing,super_admin')
            ->name('admin.notifications.broadcast');

        // --- App mobile caisse : scan carte fidélité (caissier + admin marketing) ---
        Route::prefix('loyalty/pos')->middleware('role:caissier,admin_marketing,super_admin')->name('loyalty.pos.')->group(function () {
            Route::get('/', [LoyaltyPosScanController::class, 'index'])->name('index');
            Route::post('/scan', [LoyaltyPosScanController::class, 'store'])
                ->middleware('throttle:180,1')
                ->name('scan');
            Route::post('/verify', [LoyaltyPosScanController::class, 'verify'])
                ->middleware('throttle:180,1')
                ->name('verify');
            Route::get('/activity', [LoyaltyActivityController::class, 'index'])->name('activity');
            Route::get('/settings', [LoyaltySettingController::class, 'index'])->name('settings.index');
            Route::put('/settings/{id}', [LoyaltySettingController::class, 'update'])->name('settings.update');
        });

        // --- App mobile caisse : inscription d'un client particulier au guichet et
        // association de sa carte physique (caissier + admin marketing + marketing) ---
        Route::prefix('loyalty')->middleware('role:caissier,admin_marketing,super_admin,marketing')->name('loyalty.pos-register.')->group(function () {
            Route::post('/members', [\App\Http\Controllers\Api\LoyaltyMemberController::class, 'store'])->name('members.store');
            Route::post('/members/{id}/assign-card', [\App\Http\Controllers\Api\LoyaltyMemberController::class, 'assignCard'])->name('members.assign-card');
        });

        Route::prefix('accounts')->name('accounts.')->group(function () {
            Route::middleware('role:admin_commercial,admin_marketing,super_admin,commercial,marketing')->group(function () {
                Route::get('/', [AccountController::class, 'index'])->name('index');
                Route::post('/', [AccountController::class, 'store'])->name('store');
                Route::put('/{id}', [AccountController::class, 'update'])->name('update');
                Route::delete('/{id}', [AccountController::class, 'destroy'])->name('destroy');
                Route::post('/{id}/restore', [AccountController::class, 'restore'])->name('restore');
                Route::post('/{id}/recharge', [AccountController::class, 'updateBalance'])->name('recharge');
                Route::post('/{id}/convert', [AccountController::class, 'convert'])->name('convert');
                Route::post('/{id}/contacts', [AccountController::class, 'addContact'])->name('contacts');
                Route::get('/{id}/subscription-contract', [\App\Http\Controllers\Api\SubscriptionContractController::class, 'show'])->name('subscription-contract.show');
                Route::post('/{id}/subscription-contract', [\App\Http\Controllers\Api\SubscriptionContractController::class, 'store'])->name('subscription-contract.store');
            });
            Route::get('/{id}', [AccountController::class, 'show'])->middleware('role:admin_commercial,admin_marketing,super_admin,commercial,marketing,client')->name('show');
        });

        Route::prefix('prospects')->middleware('role:admin_commercial,super_admin,commercial')->name('prospects.')->group(function () {
            Route::get('/', [ProspectController::class, 'index'])->name('index');
            Route::get('/sectors', [ProspectController::class, 'getSectors'])->name('sectors');
            Route::get('/lead-sources', [ProspectController::class, 'getLeadSources'])->name('lead-sources');
            Route::post('/', [ProspectController::class, 'store'])->name('store');
            Route::get('/{id}', [ProspectController::class, 'show'])->name('show');
            Route::put('/{id}', [ProspectController::class, 'update'])->name('update');
            Route::patch('/{id}/temperature', [ProspectController::class, 'updateTemperature'])->name('temperature');
            Route::patch('/{id}/convert', [ProspectController::class, 'convertToClient'])->name('convert');
        });

        Route::prefix('vehicles')->middleware('role:admin_commercial,admin_marketing,super_admin,commercial,client,marketing')->name('vehicles.')->group(function () {
            Route::get('/stats', [VehicleController::class, 'fleetStatsSimple'])->name('stats');
            Route::get('/stats/summary', [VehicleController::class, 'fleetStats'])->name('stats.summary');
            Route::get('/', [VehicleController::class, 'index'])->name('index');
            Route::post('/', [VehicleController::class, 'store'])->name('store');
            Route::get('/import/template', [VehicleController::class, 'downloadImportTemplate'])->name('import.template');
            Route::post('/import', [VehicleController::class, 'importFromExcel'])
                ->middleware('throttle:10,1')
                ->name('import');
            Route::get('/{id}', [VehicleController::class, 'show'])->name('show');
            Route::put('/{id}', [VehicleController::class, 'update'])->name('update');
            Route::delete('/{id}', [VehicleController::class, 'destroy'])->name('destroy');
            Route::post('/{id}/documents', [VehicleController::class, 'uploadDocs'])->name('documents');
            Route::post('/{id}/visit', [VehicleController::class, 'recordVisit'])->name('visit');
        });

        Route::prefix('quotes')->middleware('role:admin_commercial,super_admin,commercial,client')->name('quotes.')->group(function () {
            Route::get('/', [QuoteController::class, 'index'])->name('index');
            Route::post('/', [QuoteController::class, 'store'])->name('store');
            Route::get('/{id}', [QuoteController::class, 'show'])->name('show');
            Route::patch('/{id}', [QuoteController::class, 'update'])->name('update');
            Route::patch('/{id}/status', [QuoteController::class, 'updateStatus'])->name('status');
            Route::post('/{id}/upload-accord', [QuoteController::class, 'uploadBonDeCommande'])->name('upload-accord');
        });

        Route::prefix('quote-requests')->middleware('role:admin_commercial,super_admin,commercial,client')->name('quote-requests.')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\QuoteRequestController::class, 'index'])->name('index');
            Route::post('/', [\App\Http\Controllers\Api\QuoteRequestController::class, 'store'])->name('store');
            Route::get('/{id}', [\App\Http\Controllers\Api\QuoteRequestController::class, 'show'])->name('show');
            Route::patch('/{id}/status', [\App\Http\Controllers\Api\QuoteRequestController::class, 'updateStatus'])
                ->middleware('role:admin_commercial,super_admin,commercial')
                ->name('status');
        });

        Route::prefix('support')->name('support.')->group(function () {
            Route::get('/', [SupportController::class, 'index'])->name('index');
            Route::post('/', [SupportController::class, 'store'])->name('store');
            Route::post('/{id}/reply', [SupportController::class, 'reply'])
                ->middleware('role:admin_commercial,super_admin,commercial')
                ->name('reply');
        });

        Route::prefix('notifications')->name('notifications.')->group(function () {
            Route::get('/', [NotificationController::class, 'index'])->name('index');
            Route::get('/unread-count', [NotificationController::class, 'unreadCount'])->name('unread-count');
            Route::patch('/mark-all-read', [NotificationController::class, 'markAllRead'])->name('mark-all-read');
            Route::patch('/{id}/read', [NotificationController::class, 'markAsRead'])->name('read');
        });

        Route::get('/stats/dashboard', [StatsController::class, 'getDashboardStats'])
            ->middleware('role:admin_commercial,super_admin,commercial,client')
            ->name('stats.dashboard');

        Route::prefix('kpi-targets')->name('kpi-targets.')->group(function () {
            Route::get('/progress', [CommercialKpiTargetController::class, 'progress'])->middleware('role:admin_commercial,super_admin,commercial')->name('progress');
            Route::middleware('role:admin_commercial,super_admin')->group(function () {
                Route::get('/', [CommercialKpiTargetController::class, 'index'])->name('index');
                Route::post('/', [CommercialKpiTargetController::class, 'store'])->name('store');
                Route::put('/{id}', [CommercialKpiTargetController::class, 'update'])->name('update');
                Route::delete('/{id}', [CommercialKpiTargetController::class, 'destroy'])->name('destroy');
            });
        });

        /** Fidélité : lecture (comptes, rapports, catalogue) pour les deux admins, marketing, commercial (portefeuille filtré pour commercial). */
        Route::prefix('loyalty')->middleware('role:admin_commercial,admin_marketing,super_admin,marketing,commercial')->name('loyalty.')->group(function () {
            Route::get('/reports/station-scans', [LoyaltyStationScanReportController::class, 'index'])->name('reports.station-scans');
            Route::get('/reports/station-scans/export', [LoyaltyStationScanReportController::class, 'export'])->name('reports.station-scans.export');

            Route::get('/accounts', [LoyaltyAccountController::class, 'index'])->name('accounts.index');
            Route::get('/accounts/{id}', [LoyaltyAccountController::class, 'show'])->name('accounts.show');
            Route::get('/accounts/{id}/scan-history', [LoyaltyAccountController::class, 'scanHistory'])->name('accounts.scan-history');

            Route::get('/rewards', [LoyaltyRewardController::class, 'index'])->name('rewards.index');
            Route::get('/rewards/{id}', [LoyaltyRewardController::class, 'show'])->name('rewards.show');
        });

        /** Back-office fidélité : activité scans (hors app caisse). */
        Route::prefix('loyalty')->middleware('role:admin_commercial,admin_marketing,super_admin,marketing,commercial')->name('loyalty.')->group(function () {
            Route::get('/activity', [LoyaltyActivityController::class, 'index'])->name('activity.index');
        });

        /** Réglages du programme fidélité : réservés au service marketing. */
        Route::prefix('loyalty')->middleware('role:admin_marketing,super_admin')->name('loyalty.admin.')->group(function () {
            Route::get('/settings', [LoyaltySettingController::class, 'index'])->name('settings.index');
            Route::put('/settings/{id}', [LoyaltySettingController::class, 'update'])->name('settings.update');
        });

        Route::prefix('loyalty')->middleware('role:admin_marketing,super_admin,marketing')->name('loyalty.')->group(function () {
            Route::get('/lookup/client-users', [LoyaltyMarketingLookupController::class, 'clientUsers'])->name('lookup.client-users');
            Route::post('/lookup/client-users', [LoyaltyMarketingLookupController::class, 'createClientUser'])->name('lookup.client-users.store');
            Route::get('/lookup/companies', [LoyaltyMarketingLookupController::class, 'companies'])->name('lookup.companies');
            Route::post('/lookup/companies', [LoyaltyMarketingLookupController::class, 'createCompany'])->name('lookup.companies.store');
            Route::get('/stats/referrals', [LoyaltyMarketingLookupController::class, 'referralStats'])->name('stats.referrals');
            Route::get('/stats/dashboard', [LoyaltyMarketingLookupController::class, 'dashboardStats'])->name('stats.dashboard');
            Route::post('/accounts/{id}/adjust', [LoyaltyAccountController::class, 'adjust'])->name('accounts.adjust');

            Route::post('/rewards', [LoyaltyRewardController::class, 'store'])->name('rewards.store');
            Route::patch('/rewards/{id}', [LoyaltyRewardController::class, 'update'])->name('rewards.update');
            Route::delete('/rewards/{id}', [LoyaltyRewardController::class, 'destroy'])->name('rewards.destroy');
            
            Route::get('/redemptions', [\App\Http\Controllers\Api\LoyaltyRedemptionController::class, 'index'])->name('redemptions.index');
            Route::patch('/redemptions/{id}', [\App\Http\Controllers\Api\LoyaltyRedemptionController::class, 'update'])->name('redemptions.update');
        });

        // Client/Admin claiming a reward
        Route::prefix('loyalty')->middleware('role:admin_commercial,admin_marketing,super_admin,marketing,commercial,client')->name('loyalty.')->group(function () {
            Route::post('/redemptions', [\App\Http\Controllers\Api\LoyaltyRedemptionController::class, 'store'])->name('redemptions.store');
        });

        Route::prefix('loyalty')->middleware('role:admin_marketing,super_admin,marketing')->name('loyalty.marketing.')->group(function () {
            Route::post('/accounts/bootstrap', [LoyaltyAccountController::class, 'bootstrap'])->name('accounts.bootstrap');
            Route::get('/accounts/{id}/qr-payload', [LoyaltyAccountController::class, 'qrPayload'])->name('accounts.qr-payload');
            Route::get('/accounts/{id}/card-pdf', [LoyaltyAccountController::class, 'downloadCard'])->name('accounts.card-pdf');
            Route::patch('/accounts/{id}', [LoyaltyAccountController::class, 'update'])->name('accounts.update');
            Route::post('/accounts/{id}/associate-card', [LoyaltyAccountController::class, 'associateCard'])->name('accounts.associate-card');

            // Liste de clients propre au marketing (indépendante du CRM commercial).
            Route::get('/members', [\App\Http\Controllers\Api\LoyaltyMemberController::class, 'index'])->name('members.index');
            // Demandes de carte SIRA en attente de validation (routes fixes, avant /members/{id}).
            Route::get('/members/requests', [\App\Http\Controllers\Api\LoyaltyMemberController::class, 'requests'])->name('members.requests');
            Route::get('/members/{id}', [\App\Http\Controllers\Api\LoyaltyMemberController::class, 'show'])->name('members.show');
            Route::patch('/members/{id}', [\App\Http\Controllers\Api\LoyaltyMemberController::class, 'update'])->name('members.update');
            Route::post('/members/{id}/validate', [\App\Http\Controllers\Api\LoyaltyMemberController::class, 'validateRequest'])->name('members.validate');
            Route::post('/members/{id}/reject', [\App\Http\Controllers\Api\LoyaltyMemberController::class, 'reject'])->name('members.reject');
            Route::post('/members/{id}/retry-provisioning', [\App\Http\Controllers\Api\LoyaltyMemberController::class, 'retryProvisioning'])->name('members.retry-provisioning');

            // Studio Carte : modèles visuels (fond + positionnement QR/texte).
            Route::get('/card-templates', [\App\Http\Controllers\Api\LoyaltyCardTemplateController::class, 'index'])->name('card-templates.index');
            Route::post('/card-templates', [\App\Http\Controllers\Api\LoyaltyCardTemplateController::class, 'store'])->name('card-templates.store');
            Route::post('/card-templates/{id}', [\App\Http\Controllers\Api\LoyaltyCardTemplateController::class, 'update'])->name('card-templates.update');
            Route::delete('/card-templates/{id}', [\App\Http\Controllers\Api\LoyaltyCardTemplateController::class, 'destroy'])->name('card-templates.destroy');

            // Génération de cartes vierges en masse (PDF) + suivi des lots (impression).
            Route::get('/card-batches', [\App\Http\Controllers\Api\LoyaltyCardBatchController::class, 'index'])->name('card-batches.index');
            Route::post('/card-batches', [\App\Http\Controllers\Api\LoyaltyCardBatchController::class, 'store'])->name('card-batches.store');
            Route::get('/card-batches/{id}/download', [\App\Http\Controllers\Api\LoyaltyCardBatchController::class, 'download'])->name('card-batches.download');
            Route::patch('/card-batches/{id}/status', [\App\Http\Controllers\Api\LoyaltyCardBatchController::class, 'updateStatus'])->name('card-batches.update-status');
        });

        /** Call center marketing : relances visite technique (formulaire QR station). */
        Route::prefix('technical-visit-reminders')->middleware('role:admin_commercial,admin_marketing,super_admin,marketing,commercial')->name('technical-visit-reminders.')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\TechnicalVisitReminderController::class, 'index'])->name('index');
            Route::patch('/{id}', [\App\Http\Controllers\Api\TechnicalVisitReminderController::class, 'update'])->name('update');
        });
    });
});

Route::get('/sync-odoo', function () {
    \Illuminate\Support\Facades\Artisan::call('odoo:sync', ['--full' => true]);
    $logs = \App\Models\OdooSyncLog::latest('id')->take(6)->get();
    return response()->json([
        'success' => true,
        'message' => 'Synchronisation Odoo exécutée avec succès.',
        'recent_logs' => $logs,
    ]);
});
