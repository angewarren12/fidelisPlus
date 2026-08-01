<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('quotes:check-expired')]
#[Description('Vérifie les devis dont la date de validité est dépassée et notifie les commerciaux.')]
class CheckExpiredQuotes extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(\App\Services\NotificationService $notifs)
    {
        $today = \Carbon\Carbon::today();

        $expiredQuotes = \App\Models\Quote::with('company.commercial')
            ->whereIn('status', ['draft', 'sent'])
            ->whereNotNull('valid_until')
            ->whereDate('valid_until', '<', $today)
            ->get();

        $count = 0;

        foreach ($expiredQuotes as $quote) {
            $quote->update(['status' => 'expired']);
            $count++;

            $commercial = $quote->company?->commercial;

            if ($commercial) {
                // In-app notification
                $notifs->notifyUser(
                    $commercial,
                    'Devis expiré',
                    "Le devis {$quote->quote_number} pour le client {$quote->company->name} est arrivé à échéance.",
                    type: 'quote_status',
                    data: ['quote_id' => $quote->id, 'status' => 'expired'],
                    action: 'quote_detail',
                    priority: 'high',
                    channel: 'in_app'
                );

                // Email notification
                \Illuminate\Support\Facades\Mail::to($commercial->email)->send(new \App\Mail\QuoteExpiredMail($quote, $commercial));
            }
            
            // Also notify the contact/client
            $clientContact = $quote->company?->contacts()->first() ?? \App\Models\User::where('company_id', $quote->company_id)->first();
            if ($clientContact) {
                $notifs->notifyUser(
                    $clientContact,
                    'Devis expiré',
                    "Votre devis {$quote->quote_number} a expiré.",
                    type: 'quote_status',
                    data: ['quote_id' => $quote->id, 'status' => 'expired'],
                    action: 'quote_detail',
                    channel: 'both'
                );
            }
        }

        $this->info("Terminé. {$count} devis ont été marqués comme expirés et notifiés.");
    }
}
