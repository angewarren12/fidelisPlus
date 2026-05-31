<?php

namespace App\Console\Commands;

use App\Models\LoyaltyAccount;
use App\Services\Loyalty\SignedLoyaltyQrService;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class GenerateTestLoyaltyQrCommand extends Command
{
    protected $signature = 'loyalty:generate-test-qr {--account=} {--points=5} {--days=30}';

    protected $description = 'Affiche un payload QR fidélité signé (carte de test) pour scanner depuis l\'app caisse';

    public function handle(SignedLoyaltyQrService $qr): int
    {
        $accountOption = $this->option('account');
        $account = $accountOption
            ? LoyaltyAccount::query()->find((int) $accountOption)
            : LoyaltyAccount::query()->orderBy('id')->first();

        if ($account === null) {
            $this->error('Aucun compte fidélité : exécutez php artisan db:seed --class=LoyaltyCaissierDemoSeeder');

            return self::FAILURE;
        }

        $points = max(1, (int) $this->option('points'));
        $days = max(1, (int) $this->option('days'));

        $payload = $qr->encode([
            'loyalty_account_id' => $account->id,
            'jti' => (string) Str::uuid(),
            'exp' => now()->addDays($days)->getTimestamp(),
            'points_per_scan' => $points,
        ]);

        $this->info('Compte fidélité #'.$account->id.' — copiez la ligne suivante dans un générateur QR :');
        $this->line($payload);

        return self::SUCCESS;
    }
}
