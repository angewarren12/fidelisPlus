<?php

namespace App\Services\Loyalty;

use App\Models\LoyaltyAccount;
use App\Models\LoyaltyMember;
use Illuminate\Support\Facades\DB;

/**
 * Logique unique et sécurisée d'association d'une carte physique pré-imprimée (vierge,
 * `holder_type=unassigned`, générée en masse depuis le Studio Carte) à un compte fidélité
 * existant. Utilisée à la fois par le flux marketing ("Mes Clients") et par le flux CRM
 * ("Comptes Fidélité") — un seul endroit qui applique les règles de sécurité :
 * - le QR scanné doit correspondre à une carte vierge non réclamée (pas n'importe quel QR) ;
 * - un compte qui a déjà un historique (points ou scans) ne peut pas être réécrasé.
 */
class LoyaltyCardAssignmentService
{
    public function __construct(private readonly SignedLoyaltyQrService $qrService) {}

    /**
     * @throws \InvalidArgumentException si le QR est invalide ou si la règle métier est violée.
     */
    public function assignBlankCard(LoyaltyAccount $targetAccount, string $qrPayload): LoyaltyAccount
    {
        $claims = $this->qrService->decodeAndVerify($qrPayload);

        $blank = LoyaltyAccount::query()
            ->where('public_uuid', $claims['account_uuid'])
            ->where('holder_type', 'unassigned')
            ->whereNull('loyalty_member_id')
            ->first();

        if ($blank === null) {
            throw new \InvalidArgumentException(
                'Ce QR ne correspond pas à une carte vierge disponible (déjà associée, ou carte invalide).'
            );
        }

        if ($blank->id === $targetAccount->id) {
            throw new \InvalidArgumentException('Cette carte est déjà celle de ce compte.');
        }

        if ($targetAccount->holder_type === 'member' && $blank->blank_card_type !== null) {
            $memberType = $targetAccount->member?->type;
            if ($memberType !== null && $memberType !== $blank->blank_card_type) {
                throw new \InvalidArgumentException(
                    "Cette carte est de type « {$blank->blank_card_type} », incompatible avec ce client « {$memberType} »."
                );
            }
        }

        $hasHistory = $targetAccount->points_balance > 0 || $targetAccount->scanEvents()->exists();
        if ($hasHistory) {
            throw new \InvalidArgumentException(
                'Ce compte a déjà un historique (points ou scans), remplacement de carte impossible.'
            );
        }

        return DB::transaction(function () use ($targetAccount, $blank) {
            // Capturer l'identité de la carte vierge avant suppression : la contrainte
            // unique sur public_uuid empêcherait sinon la mise à jour tant que les deux
            // lignes coexistent avec la même valeur.
            $blankUuid = $blank->public_uuid;
            $blankCardNumber = $blank->card_number;
            $blankBatchId = $blank->loyalty_card_batch_id;
            $blank->delete();

            $targetAccount->update([
                'public_uuid' => $blankUuid,
                'card_number' => $blankCardNumber,
                'loyalty_card_batch_id' => $blankBatchId,
            ]);

            return $targetAccount->fresh();
        });
    }

    /**
     * Attache directement une carte vierge à un membre qui n'a pas encore de compte fidélité
     * (au lieu de transférer l'identité sur un compte existant).
     *
     * @throws \InvalidArgumentException si le QR est invalide.
     */
    public function claimBlankCardForNewMember(string $qrPayload, int $loyaltyMemberId): LoyaltyAccount
    {
        $claims = $this->qrService->decodeAndVerify($qrPayload);

        $blank = LoyaltyAccount::query()
            ->where('public_uuid', $claims['account_uuid'])
            ->where('holder_type', 'unassigned')
            ->whereNull('loyalty_member_id')
            ->first();

        if ($blank === null) {
            throw new \InvalidArgumentException(
                'Ce QR ne correspond pas à une carte vierge disponible (déjà associée, ou carte invalide).'
            );
        }

        if ($blank->blank_card_type !== null) {
            $member = LoyaltyMember::query()->findOrFail($loyaltyMemberId);
            if ($member->type !== $blank->blank_card_type) {
                throw new \InvalidArgumentException(
                    "Cette carte est de type « {$blank->blank_card_type} », incompatible avec ce client « {$member->type} »."
                );
            }
        }

        $blank->update([
            'loyalty_member_id' => $loyaltyMemberId,
            'holder_type' => 'member',
            'holder_key' => 'member:'.$loyaltyMemberId,
        ]);

        return $blank->fresh();
    }
}
