<?php

namespace App\Services\Loyalty;

use Illuminate\Support\Facades\Config;

/**
 * Chiffrement réel (AES-256-GCM) du contenu du QR fidélité : le payload n'est plus
 * lisible sans la clé (contrairement à l'ancien format signé-mais-clair "payload.signature"),
 * et il n'existe plus de mode "code brut" accepté sans vérification cryptographique — toute
 * carte physique doit porter un QR généré par ce service.
 */
class SignedLoyaltyQrService
{
    private const CIPHER = 'aes-256-gcm';
    private const IV_LENGTH = 12;
    private const TAG_LENGTH = 16;

    /**
     * @param  array{account_uuid:string,jti:string,exp:int,points_per_scan?:int}  $claims
     */
    public function encode(array $claims): string
    {
        $key = $this->key();
        ksort($claims);
        $json = json_encode($claims, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);

        $iv = random_bytes(self::IV_LENGTH);
        $tag = '';
        $cipherText = openssl_encrypt($json, self::CIPHER, $key, OPENSSL_RAW_DATA, $iv, $tag);
        if ($cipherText === false) {
            throw new \RuntimeException('Échec du chiffrement du QR fidélité.');
        }

        return $this->base64UrlEncode($iv.$tag.$cipherText);
    }

    /**
     * @return array{account_uuid:string,jti:string,exp:int,points_per_scan:int}
     *
     * @throws \InvalidArgumentException
     */
    public function decodeAndVerify(string $qrPayload): array
    {
        $qrPayload = trim($qrPayload);
        if ($qrPayload === '') {
            throw new \InvalidArgumentException('QR invalide : payload vide.');
        }

        $raw = $this->base64UrlDecode($qrPayload);
        if ($raw === false || strlen($raw) <= self::IV_LENGTH + self::TAG_LENGTH) {
            throw new \InvalidArgumentException('QR invalide : format illisible.');
        }

        $iv = substr($raw, 0, self::IV_LENGTH);
        $tag = substr($raw, self::IV_LENGTH, self::TAG_LENGTH);
        $cipherText = substr($raw, self::IV_LENGTH + self::TAG_LENGTH);

        $json = openssl_decrypt($cipherText, self::CIPHER, $this->key(), OPENSSL_RAW_DATA, $iv, $tag);
        if ($json === false) {
            // Déchiffrement échoué = mauvaise clé, QR falsifié, ou QR d'un autre format (ancien/étranger).
            throw new \InvalidArgumentException('QR invalide : déchiffrement impossible (carte falsifiée ou inconnue).');
        }

        /** @var mixed $data */
        $data = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        if (! is_array($data)) {
            throw new \InvalidArgumentException('QR invalide.');
        }

        $accountUuid = isset($data['account_uuid']) ? (string) $data['account_uuid'] : '';
        $jti = isset($data['jti']) ? (string) $data['jti'] : '';
        $exp = isset($data['exp']) ? (int) $data['exp'] : 0;
        $points = isset($data['points_per_scan']) ? max(0, (int) $data['points_per_scan']) : 1;

        if ($accountUuid === '' || $jti === '') {
            throw new \InvalidArgumentException('QR invalide : données obligatoires manquantes.');
        }

        // Cartes physiques permanentes (sans date d'expiration) : un jti unique est régénéré
        // à chaque scan pour éviter la contrainte d'unicité en base de données.
        if ($exp === 0) {
            $jti = 'perm-'.$accountUuid.'-'.bin2hex(random_bytes(5));
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
        if ($expUnix === 0) {
            return false; // Permanent
        }

        return time() > $expUnix;
    }

    public function payloadHash(string $qrPayload): string
    {
        return hash('sha256', $qrPayload);
    }

    /**
     * Dérive une clé AES-256 (32 octets) à partir du secret configuré. `hash(..., true)`
     * garantit toujours 32 octets quelle que soit la longueur du secret fourni en config.
     */
    private function key(): string
    {
        $secret = (string) Config::get('loyalty.qr_key');
        if ($secret === '') {
            throw new \RuntimeException('LOYALTY_QR_KEY n\'est pas configuré.');
        }

        return hash('sha256', $secret, true);
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
