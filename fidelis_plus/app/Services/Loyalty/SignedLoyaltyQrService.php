<?php

namespace App\Services\Loyalty;

use Illuminate\Support\Facades\Config;

class SignedLoyaltyQrService
{
    /**
     * Encode un payload signé : base64url(json).base64url(hmac_sha256(secret, payload_b64)).
     *
     * @param  array{account_uuid:string,jti:string,exp:int,points_per_scan?:int}  $claims
     */
    public function encode(array $claims): string
    {
        $secret = $this->secret();
        ksort($claims);
        $json = json_encode($claims, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);
        $payloadB64 = $this->base64UrlEncode($json);
        $sig = hash_hmac('sha256', $payloadB64, $secret, true);

        return $payloadB64.'.'.$this->base64UrlEncode($sig);
    }

    /**
     * @return array{account_uuid:string,jti:string,exp:int,points_per_scan:int}
     *
     * @throws \InvalidArgumentException
     */
    public function decodeAndVerify(string $qrPayload): array
    {
        $qrPayload = trim($qrPayload);
        
        // Si c'est un code QR physique brut (sans signature JWT/HMAC ".")
        if (!str_contains($qrPayload, '.')) {
            if (preg_match('/^[a-zA-Z0-9\-]{6,100}$/', $qrPayload)) {
                return [
                    'account_uuid' => $qrPayload,
                    'jti' => 'raw-' . $qrPayload . '-' . bin2hex(random_bytes(5)),
                    'exp' => 0,
                    'points_per_scan' => 10, // Valeur par défaut, recalculée par le POS via RulesService
                ];
            }
            throw new \InvalidArgumentException('QR physique invalide : format alphanumérique attendu (6-100 caractères).');
        }

        $secret = $this->secret();
        $parts = explode('.', $qrPayload, 2);
        if (count($parts) !== 2) {
            throw new \InvalidArgumentException('QR invalide : format attendu payload.signature');
        }
        [$payloadB64, $sigB64] = $parts;
        $expectedSig = hash_hmac('sha256', $payloadB64, $secret, true);
        $sig = $this->base64UrlDecode($sigB64);
        if ($sig === false || ! hash_equals($expectedSig, $sig)) {
            throw new \InvalidArgumentException('QR invalide : signature incorrecte');
        }
        $json = $this->base64UrlDecode($payloadB64);
        if ($json === false) {
            throw new \InvalidArgumentException('QR invalide : payload illisible');
        }
        /** @var mixed $data */
        $data = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        if (! is_array($data)) {
            throw new \InvalidArgumentException('QR invalide');
        }
        $accountUuid = isset($data['account_uuid']) ? (string) $data['account_uuid'] : '';
        $jti = isset($data['jti']) ? (string) $data['jti'] : '';
        $exp = isset($data['exp']) ? (int) $data['exp'] : 0;
        $points = isset($data['points_per_scan']) ? max(0, (int) $data['points_per_scan']) : 1;

        if ($accountUuid === '' || $jti === '') {
            throw new \InvalidArgumentException('QR invalide : données obligatoires manquantes');
        }

        // Pour les cartes physiques permanentes (sans date d'expiration),
        // on génère un jti unique par scan pour éviter la contrainte d'unicité en base de données.
        if ($exp === 0) {
            $jti = 'perm-' . $accountUuid . '-' . bin2hex(random_bytes(5));
        }

        return [
            'account_uuid' => $accountUuid,
            'jti' => $jti,
            'exp' => $exp,
            'points_per_scan' => max(1, $points),
        ];
    }

    public function isExpired(int $expUnix): bool
    {
        if ($expUnix === 0) return false; // Permanent
        return time() > $expUnix;
    }

    public function payloadHash(string $qrPayload): string
    {
        return hash('sha256', $qrPayload);
    }

    private function secret(): string
    {
        $secret = (string) Config::get('loyalty.qr_secret');
        if ($secret === '') {
            throw new \RuntimeException('LOYALTY_QR_SECRET n\'est pas configuré.');
        }

        return $secret;
    }

    private function base64UrlEncode(string $raw): string
    {
        return rtrim(strtr(base64_encode($raw), '+/', '-_'), '=');
    }

    private function base64UrlDecode(string $b64): string|false
    {
        $pad = 4 - (strlen($b64) % 4);
        if ($pad < 4) {
            $b64 .= str_repeat('=', $pad);
        }

        return base64_decode(strtr($b64, '-_', '+/'), true);
    }
}
