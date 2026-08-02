<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LoyaltyAccount;
use App\Models\LoyaltyCardBatch;
use App\Models\LoyaltyCardTemplate;
use App\Services\Loyalty\LoyaltyRulesService;
use App\Services\Loyalty\SignedLoyaltyQrService;
use Barryvdh\DomPDF\Facade\Pdf;
use Endroid\QrCode\QrCode;
use Endroid\QrCode\Writer\PngWriter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Génération de cartes fidélité "vierges" en masse (sans client) : chaque carte a un QR
 * unique déjà enregistré en base (compte fidélité `holder_type=unassigned`), imprimées à
 * l'avance puis associées à un client au moment de l'adhésion (voir
 * LoyaltyMemberController::assignCard()).
 *
 * Un lot (LoyaltyCardBatch) suit son propre cycle : `generated` (PDF généré mais pas encore
 * confirmé imprimé) puis `printed` (confirmé imprimé et prêt à être distribué/scanné) — la
 * génération du PDF ne signifie pas que l'impression physique a eu lieu.
 */
class LoyaltyCardBatchController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = min(100, max(5, (int) $request->get('per_page', 20)));

        $paginator = LoyaltyCardBatch::query()
            ->with('template:id,name,type')
            ->withCount([
                'accounts as unassigned_count' => fn ($q) => $q->where('holder_type', 'unassigned'),
                'accounts as assigned_count' => fn ($q) => $q->where('holder_type', '!=', 'unassigned'),
            ])
            ->orderByDesc('created_at')
            ->paginate($perPage);

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

    public function store(
        Request $request,
        SignedLoyaltyQrService $qrService,
        LoyaltyRulesService $rulesService,
    ): Response {
        $data = $request->validate([
            'template_id' => 'required|integer|exists:loyalty_card_templates,id',
            'quantity' => 'required|integer|min:1|max:100',
        ]);

        $template = LoyaltyCardTemplate::query()->findOrFail($data['template_id']);

        $batch = DB::transaction(function () use ($data, $template, $request) {
            $batch = LoyaltyCardBatch::query()->create([
                'loyalty_card_template_id' => $data['template_id'],
                'quantity' => $data['quantity'],
                'status' => 'generated',
                'created_by' => $request->user()?->id,
            ]);

            $accounts = [];
            for ($i = 0; $i < $data['quantity']; $i++) {
                $accounts[] = LoyaltyAccount::query()->create([
                    'holder_key' => 'unassigned:'.Str::uuid(),
                    'holder_type' => 'unassigned',
                    'blank_card_type' => $template->type,
                    'loyalty_card_batch_id' => $batch->id,
                ]);
            }

            $batch->update([
                'card_number_from' => $accounts[0]->card_number,
                'card_number_to' => end($accounts)->card_number,
            ]);

            return $batch;
        });

        return $this->pdfForBatch($batch, $qrService, $rulesService);
    }

    public function download(
        int $id,
        SignedLoyaltyQrService $qrService,
        LoyaltyRulesService $rulesService,
    ): Response {
        $batch = LoyaltyCardBatch::query()->with('template')->findOrFail($id);

        return $this->pdfForBatch($batch, $qrService, $rulesService);
    }

    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'status' => 'required|in:generated,printed',
        ]);

        $batch = LoyaltyCardBatch::query()->findOrFail($id);
        $batch->update([
            'status' => $data['status'],
            'printed_at' => $data['status'] === 'printed' ? now() : null,
        ]);

        return response()->json(['status' => 'success', 'data' => $batch->fresh()]);
    }

    private function pdfForBatch(
        LoyaltyCardBatch $batch,
        SignedLoyaltyQrService $qrService,
        LoyaltyRulesService $rulesService,
    ): Response {
        $template = $batch->template ?? LoyaltyCardTemplate::query()->findOrFail($batch->loyalty_card_template_id);

        $backgroundDataUri = null;
        if ($template->background_path && Storage::disk('public')->exists($template->background_path)) {
            $mime = Storage::disk('public')->mimeType($template->background_path) ?: 'image/png';
            $backgroundDataUri = 'data:'.$mime.';base64,'.base64_encode(Storage::disk('public')->get($template->background_path));
        }

        $accounts = $batch->accounts()->orderBy('card_number')->get();

        $writer = new PngWriter();

        $items = $accounts->map(function (LoyaltyAccount $account) use ($qrService, $rulesService, $writer) {
            $qrPayload = $qrService->encode([
                'account_uuid' => $account->public_uuid,
                'jti' => bin2hex(random_bytes(8)),
                'exp' => 0,
                'points_per_scan' => $rulesService->getPointsPerScan($account),
            ]);

            $qrImage = $writer->write(new QrCode($qrPayload, size: 300, margin: 0));

            return [
                'card_number' => $account->card_number,
                'qr_data_uri' => $qrImage->getDataUri(),
            ];
        })->all();

        $pdf = Pdf::loadView('loyalty.card-batch-pdf', [
            'backgroundDataUri' => $backgroundDataUri,
            'layout' => $template->layout_json,
            'items' => $items,
        ])->setPaper([0, 0, 242.65, 153.07]); // ~85.6x54mm en points

        return $pdf->download('cartes-fidelite-lot-'.$batch->id.'.pdf');
    }
}
