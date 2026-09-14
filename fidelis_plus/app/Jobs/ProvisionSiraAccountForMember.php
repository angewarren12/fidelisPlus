<?php

namespace App\Jobs;

use App\Models\LoyaltyMember;
use App\Services\Sira\SiraClient;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Provisionne un compte SIRA pour un client créé au guichet/marketing.
 * Conforme à la spec SIRA v2.1 :
 * - POST /users renvoie 202 Accepted (status: pending)
 * - SIRA valide et envoie directement les accès (SMS / Email) au client.
 * - Fidelis enregistre le sira_client_id et suit le statut ("pending" ou "provisioned").
 */
class ProvisionSiraAccountForMember implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public function __construct(public int $memberId) {}

    public function handle(SiraClient $sira): void
    {
        $member = LoyaltyMember::find($this->memberId);
        if ($member === null || $member->sira_client_id !== null) {
            return;
        }

        // 1. Vérifier si le client a déjà un compte SIRA via son téléphone
        $lookup = $sira->lookupUser($member->contact);

        if ($lookup === null) {
            $member->sira_provisioning_status = 'failed';
            $member->save();

            return;
        }

        if ($lookup['exists'] && ! empty($lookup['sira_client_id'])) {
            $member->sira_client_id = $lookup['sira_client_id'];
            $member->sira_provisioning_status = ($lookup['status'] === 'active') ? 'provisioned' : 'pending';
            $member->save();

            Log::info("ProvisionSiraAccountForMember: Compte SIRA existant associé", [
                'member_id' => $member->id,
                'sira_client_id' => $member->sira_client_id,
                'status' => $member->sira_provisioning_status,
            ]);

            return;
        }

        // 2. Déposer la demande de création de compte SIRA (202 Accepted)
        $created = $sira->createUser($member);

        if ($created === null) {
            $member->sira_provisioning_status = 'failed';
            $member->save();

            return;
        }

        $member->sira_client_id = $created['sira_client_id'];
        $member->sira_provisioning_status = ($created['status'] === 'active') ? 'provisioned' : 'pending';
        $member->save();

        Log::info("ProvisionSiraAccountForMember: Demande SIRA v2.1 soumise avec succès", [
            'member_id' => $member->id,
            'sira_client_id' => $member->sira_client_id,
            'status' => $member->sira_provisioning_status,
        ]);
    }
}
