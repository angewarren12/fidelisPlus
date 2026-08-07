<?php

namespace App\Jobs;

use App\Models\Quote;
use App\Services\Odoo\OdooClient;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Pousse un devis créé ou accepté (bon de commande validé) vers Odoo (service
 * commercial uniquement). Ne bloque jamais la création/mise à jour du devis côté
 * Fidelis en cas d'échec — le statut reste "failed" et un réessai manuel reste possible.
 */
class SyncQuoteToOdoo implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public function __construct(public int $quoteId, public string $event) {}

    public function handle(OdooClient $odoo): void
    {
        $quote = Quote::with(['company', 'items', 'paymentTerm'])->find($this->quoteId);
        if ($quote === null || $quote->company?->created_via_marketing) {
            return;
        }

        $result = $odoo->syncQuote($quote, $this->event);

        if ($result === null) {
            $quote->odoo_sync_status = 'failed';
            $quote->save();

            return;
        }

        if (! empty($result['odoo_quote_id'])) {
            $quote->odoo_quote_id = $result['odoo_quote_id'];
        }
        $quote->odoo_sync_status = 'synced';
        $quote->odoo_synced_at = now();
        $quote->save();
    }
}
