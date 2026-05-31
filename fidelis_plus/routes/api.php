<?php

use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\AppointmentController;
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

Route::prefix('v1')->name('api.v1.')->group(function () {

    // --- Auth publique ---
    Route::post('/auth/login', [AuthController::class, 'login'])
        ->middleware('throttle:60,1')
        ->name('auth.login');
    Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword'])
        ->middleware('throttle:5,1')
        ->name('auth.forgot-password');
    Route::post('/auth/reset-password', [AuthController::class, 'resetPassword'])
        ->name('auth.reset-password');

    Route::middleware('auth:sanctum')->group(function () {

        Route::get('/auth/me', [AuthController::class, 'me'])->name('auth.me');
        Route::post('/auth/logout', [AuthController::class, 'logout'])->name('auth.logout');
        Route::patch('/auth/fcm-token', [AuthController::class, 'updateFcmToken'])->name('auth.fcm-token');
        Route::patch('/me/notification-preferences', [AuthController::class, 'updateNotificationPreferences'])
            ->name('me.notification-preferences');

        Route::apiResource('team', \App\Http\Controllers\Api\TeamController::class)
            ->middleware('role:admin,commercial');
        Route::post('team/{id}/reassign', [\App\Http\Controllers\Api\TeamController::class, 'reassignClients'])
            ->middleware('role:admin')
            ->name('team.reassign');

        Route::apiResource('stations', StationController::class);

        Route::post('admin/notifications/broadcast', [AdminNotificationController::class, 'broadcast'])
            ->middleware('role:admin')
            ->name('admin.notifications.broadcast');

        // --- App mobile caisse : scan carte fidélité (caissier + admin) ---
        Route::prefix('loyalty/pos')->middleware('role:caissier,admin')->name('loyalty.pos.')->group(function () {
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

        Route::prefix('accounts')->name('accounts.')->group(function () {
            Route::middleware('role:admin,commercial,marketing')->group(function () {
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
            Route::get('/{id}', [AccountController::class, 'show'])->name('show');
        });

        Route::prefix('prospects')->middleware('role:admin,commercial')->name('prospects.')->group(function () {
            Route::get('/', [ProspectController::class, 'index'])->name('index');
            Route::get('/sectors', [ProspectController::class, 'getSectors'])->name('sectors');
            Route::get('/lead-sources', [ProspectController::class, 'getLeadSources'])->name('lead-sources');
            Route::post('/', [ProspectController::class, 'store'])->name('store');
            Route::patch('/{id}/temperature', [ProspectController::class, 'updateTemperature'])->name('temperature');
            Route::patch('/{id}/convert', [ProspectController::class, 'convertToClient'])->name('convert');
        });

        Route::prefix('vehicles')->middleware('role:admin,commercial,client,marketing')->name('vehicles.')->group(function () {
            Route::get('/stats', [VehicleController::class, 'fleetStatsSimple'])->name('stats');
            Route::get('/stats/summary', [VehicleController::class, 'fleetStats'])->name('stats.summary');
            Route::get('/', [VehicleController::class, 'index'])->name('index');
            Route::post('/', [VehicleController::class, 'store'])->name('store');
            Route::get('/{id}', [VehicleController::class, 'show'])->name('show');
            Route::put('/{id}', [VehicleController::class, 'update'])->name('update');
            Route::delete('/{id}', [VehicleController::class, 'destroy'])->name('destroy');
            Route::post('/{id}/documents', [VehicleController::class, 'uploadDocs'])->name('documents');
            Route::post('/{id}/visit', [VehicleController::class, 'recordVisit'])->name('visit');
        });

        Route::prefix('appointments')->middleware('role:admin,commercial,client')->name('appointments.')->group(function () {
            Route::get('/', [AppointmentController::class, 'index'])->name('index');
            Route::post('/', [AppointmentController::class, 'store'])->name('store');
            Route::get('/slots', [AppointmentController::class, 'getAvailableSlots'])->name('slots');
            Route::patch('/{id}/cancel', [AppointmentController::class, 'cancel'])->name('cancel');
        });

        Route::prefix('quotes')->middleware('role:admin,commercial,client')->name('quotes.')->group(function () {
            Route::get('/', [QuoteController::class, 'index'])->name('index');
            Route::post('/', [QuoteController::class, 'store'])->name('store');
            Route::get('/{id}', [QuoteController::class, 'show'])->name('show');
            Route::patch('/{id}', [QuoteController::class, 'update'])->name('update');
            Route::patch('/{id}/status', [QuoteController::class, 'updateStatus'])->name('status');
        });

        Route::prefix('quote-requests')->middleware('role:admin,commercial,client')->name('quote-requests.')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\QuoteRequestController::class, 'index'])->name('index');
            Route::post('/', [\App\Http\Controllers\Api\QuoteRequestController::class, 'store'])->name('store');
            Route::get('/{id}', [\App\Http\Controllers\Api\QuoteRequestController::class, 'show'])->name('show');
            Route::patch('/{id}/status', [\App\Http\Controllers\Api\QuoteRequestController::class, 'updateStatus'])
                ->middleware('role:admin,commercial')
                ->name('status');
        });

        Route::prefix('support')->name('support.')->group(function () {
            Route::get('/', [SupportController::class, 'index'])->name('index');
            Route::post('/', [SupportController::class, 'store'])->name('store');
            Route::post('/{id}/reply', [SupportController::class, 'reply'])
                ->middleware('role:admin,commercial')
                ->name('reply');
        });

        Route::prefix('notifications')->name('notifications.')->group(function () {
            Route::get('/', [NotificationController::class, 'index'])->name('index');
            Route::get('/unread-count', [NotificationController::class, 'unreadCount'])->name('unread-count');
            Route::patch('/mark-all-read', [NotificationController::class, 'markAllRead'])->name('mark-all-read');
            Route::patch('/{id}/read', [NotificationController::class, 'markAsRead'])->name('read');
        });

        Route::get('/stats/dashboard', [StatsController::class, 'getDashboardStats'])
            ->middleware('role:admin,commercial,client')
            ->name('stats.dashboard');

        Route::prefix('kpi-targets')->name('kpi-targets.')->group(function () {
            Route::get('/progress', [CommercialKpiTargetController::class, 'progress'])->name('progress');
            Route::middleware('role:admin')->group(function () {
                Route::get('/', [CommercialKpiTargetController::class, 'index'])->name('index');
                Route::post('/', [CommercialKpiTargetController::class, 'store'])->name('store');
                Route::put('/{id}', [CommercialKpiTargetController::class, 'update'])->name('update');
                Route::delete('/{id}', [CommercialKpiTargetController::class, 'destroy'])->name('destroy');
            });
        });

        /** Fidélité : lecture (comptes, rapports, catalogue) pour admin, marketing, commercial (portefeuille filtré pour commercial). */
        Route::prefix('loyalty')->middleware('role:admin,marketing,commercial')->name('loyalty.')->group(function () {
            Route::get('/reports/station-scans', [LoyaltyStationScanReportController::class, 'index'])->name('reports.station-scans');
            Route::get('/reports/station-scans/export', [LoyaltyStationScanReportController::class, 'export'])->name('reports.station-scans.export');

            Route::get('/accounts', [LoyaltyAccountController::class, 'index'])->name('accounts.index');
            Route::get('/accounts/{id}', [LoyaltyAccountController::class, 'show'])->name('accounts.show');

            Route::get('/rewards', [LoyaltyRewardController::class, 'index'])->name('rewards.index');
            Route::get('/rewards/{id}', [LoyaltyRewardController::class, 'show'])->name('rewards.show');
        });

        /** Back-office fidélité : activité scans (hors app caisse). */
        Route::prefix('loyalty')->middleware('role:admin,marketing,commercial')->name('loyalty.')->group(function () {
            Route::get('/activity', [LoyaltyActivityController::class, 'index'])->name('activity.index');
        });

        Route::prefix('loyalty')->middleware('role:admin')->name('loyalty.admin.')->group(function () {
            Route::get('/settings', [LoyaltySettingController::class, 'index'])->name('settings.index');
            Route::put('/settings/{id}', [LoyaltySettingController::class, 'update'])->name('settings.update');
        });

        Route::prefix('loyalty')->middleware('role:admin,marketing')->name('loyalty.')->group(function () {
            Route::get('/lookup/client-users', [LoyaltyMarketingLookupController::class, 'clientUsers'])->name('lookup.client-users');
            Route::get('/lookup/companies', [LoyaltyMarketingLookupController::class, 'companies'])->name('lookup.companies');
            Route::get('/stats/referrals', [LoyaltyMarketingLookupController::class, 'referralStats'])->name('stats.referrals');
            Route::post('/accounts/{id}/adjust', [LoyaltyAccountController::class, 'adjust'])->name('accounts.adjust');

            Route::post('/rewards', [LoyaltyRewardController::class, 'store'])->name('rewards.store');
            Route::patch('/rewards/{id}', [LoyaltyRewardController::class, 'update'])->name('rewards.update');
            Route::delete('/rewards/{id}', [LoyaltyRewardController::class, 'destroy'])->name('rewards.destroy');
            
            Route::get('/redemptions', [\App\Http\Controllers\Api\LoyaltyRedemptionController::class, 'index'])->name('redemptions.index');
            Route::patch('/redemptions/{id}', [\App\Http\Controllers\Api\LoyaltyRedemptionController::class, 'update'])->name('redemptions.update');
        });

        // Client/Admin claiming a reward
        Route::prefix('loyalty')->middleware('role:admin,marketing,commercial,client')->name('loyalty.')->group(function () {
            Route::post('/redemptions', [\App\Http\Controllers\Api\LoyaltyRedemptionController::class, 'store'])->name('redemptions.store');
        });

        Route::prefix('loyalty')->middleware('role:admin,marketing')->name('loyalty.marketing.')->group(function () {
            Route::post('/accounts/bootstrap', [LoyaltyAccountController::class, 'bootstrap'])->name('accounts.bootstrap');
            Route::get('/accounts/{id}/qr-payload', [LoyaltyAccountController::class, 'qrPayload'])->name('accounts.qr-payload');
        });
    });
});
