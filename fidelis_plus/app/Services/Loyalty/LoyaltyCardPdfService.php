<?php

namespace App\Services\Loyalty;

use App\Models\LoyaltyAccount;
use App\Models\LoyaltyCardTemplate;
use Barryvdh\DomPDF\Facade\Pdf;
use Endroid\QrCode\QrCode;
use Endroid\QrCode\Writer\PngWriter;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;

/**
 * Génère le PDF imprimable (format carte bancaire) pour une ou plusieurs cartes fidélité —
 * utilisé aussi bien pour un lot de cartes vierges (LoyaltyCardBatchController) que pour
 * l'export d'une carte individuelle déjà associée à un client (LoyaltyAccountController).
 */
class LoyaltyCardPdfService
{
    public function __construct(
        private readonly SignedLoyaltyQrService $qrService,
        private readonly LoyaltyRulesService $rulesService,
    ) {}

    /**
     * @param  iterable<LoyaltyAccount>  $accounts
     */
    public function forAccounts(iterable $accounts, LoyaltyCardTemplate $template, string $filename): Response
    {
        $backgroundDataUri = null;
        if ($template->background_path && Storage::disk('public')->exists($template->background_path)) {
            $mime = Storage::disk('public')->mimeType($template->background_path) ?: 'image/png';
            $backgroundDataUri = 'data:'.$mime.';base64,'.base64_encode(Storage::disk('public')->get($template->background_path));
        }

        $writer = new PngWriter();

        $items = collect($accounts)->map(function (LoyaltyAccount $account) use ($writer) {
            $qrPayload = $this->qrService->encode([
                'account_uuid' => $account->public_uuid,
                'jti' => bin2hex(random_bytes(8)),
                'exp' => 0,
                'points_per_scan' => $this->rulesService->getPointsPerScan($account),
            ]);

            $qrImage = $writer->write(new QrCode($qrPayload, size: 300, margin: 0));

            return [
                'card_number' => $account->card_number,
                'holder_name' => $account->holder_type !== 'unassigned' ? $account->holderDisplayName() : null,
                'qr_data_uri' => $qrImage->getDataUri(),
            ];
        })->all();

        $pdf = Pdf::loadView('loyalty.card-batch-pdf', [
            'backgroundDataUri' => $backgroundDataUri,
            'layout' => $template->layout_json,
            'items' => $items,
        ])->setPaper([0, 0, 242.65, 153.07]); // ~85.6x54mm en points

        return $pdf->download($filename);
    }
}
