<?php

namespace App\Jobs;

use App\Mail\SiraAccessProvided;
use App\Models\LoyaltyMember;
use App\Services\Sira\SiraClient;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

/**
 * Provisionne un compte SIRA pour un client créé au guichet/marketing qui n'a pas encore
 * de sira_client_id : vérifie s'il existe déjà côté SIRA, sinon le crée, puis envoie ses
 * accès par email. Ne bloque jamais la création du LoyaltyMember côté Fidelis en cas
 * d'échec — le statut reste "failed" et un réessai manuel reste possible.
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

        $lookup = $sira->lookupUser($member->contact);

        if ($lookup === null) {
            $member->sira_provisioning_status = 'failed';
            $member->save();

            return;
        }

        if ($lookup['exists'] && ! empty($lookup['sira_client_id'])) {
            $member->sira_client_id = $lookup['sira_client_id'];
            $member->sira_provisioning_status = 'provisioned';
            $member->save();

            return;
        }

        $created = $sira->createUser($member);

        if ($created === null) {
            $member->sira_provisioning_status = 'failed';
            $member->save();

            return;
        }

        $member->sira_client_id = $created['sira_client_id'];
        $member->sira_provisioning_status = 'provisioned';
        $member->save();

        if ($member->email) {
            Mail::to($member->email)->send(new SiraAccessProvided(
                $member,
                $created['login'],
                $created['temporary_password'],
            ));
        }
    }
}
