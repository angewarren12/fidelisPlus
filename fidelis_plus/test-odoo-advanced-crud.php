#!/usr/bin/env php
<?php
/**
 * Script de test avancé CRUD pour l'API Odoo
 * Permet d'identifier précisément les erreurs de permissions (403 ACCESS_ERROR)
 * sur les opérations avancées (véhicules et devis).
 */

$token = 'foTcUtgNdL-qJPCFWQ5u6cb2YxMSbZ8ZBuzZIyzPETg';
$baseUrl = 'https://preprod-mayelia.odoo-saas.veone.net';

echo "═════════════════════════════════════════════════════════════════\n";
echo "TEST DES OPÉRATIONS AVANCÉES ODOO (VEHICLES & SALE ORDERS)\n";
echo "═════════════════════════════════════════════════════════════════\n\n";

// Étape 1 : Récupérer un partenaire existant pour associer le véhicule et le devis
echo "[1/7] Récupération d'un partenaire Odoo pour les tests...\n";
$partnersUrl = $baseUrl . '/api/sale_odoo/v1/partners?limit=1';
$res = callApi('GET', $partnersUrl, null, $token);

if ($res['status'] !== 200 || empty($res['json']['data']['records'])) {
    echo "❌ Impossible de récupérer un partenaire Odoo. Fin du test.\n";
    exit(1);
}

$partner = $res['json']['data']['records'][0];
$partnerId = (int) $partner['id'];
$partnerName = $partner['name'];
echo "✅ Partenaire sélectionné : ID {$partnerId} - {$partnerName}\n\n";

// Étape 2 : Création de véhicule
echo "[2/7] Test : Création de véhicule (POST /vehicles)...\n";
$vehicleRef = 'fidelis-vehicle-test-' . uniqid();
$vehiclePayload = [
    'external_ref'  => $vehicleRef,
    'license_plate' => 'TEST-' . rand(100, 999) . '-XX',
    'brand_name'    => 'Toyota',
    'model_name'    => 'HiAce Test',
    'year'          => 2023,
    'model_year'    => '2023',
    'fuel'          => 'diesel',
    'fuel_type'     => 'diesel',
    'state_name'    => 'active',
    'partner_id'    => $partnerId,
    'owner_id'      => $partnerId
];

$vehicleUrl = $baseUrl . '/api/sale_odoo/v1/vehicles';
$vehicleRes = callApi('POST', $vehicleUrl, $vehiclePayload, $token);
$vehicleId = null;

if ($vehicleRes['status'] === 201 || $vehicleRes['status'] === 200) {
    $vehicleId = $vehicleRes['json']['data']['id'] ?? null;
    echo "✅ Création Véhicule réussie (ID: " . ($vehicleId ?? 'N/A') . ")\n\n";
} else {
    echo "❌ Échec de la création du véhicule !\n\n";
}

// Étape 3 : Modification de véhicule (si créé)
if ($vehicleId) {
    echo "[3/7] Test : Modification de véhicule (PUT /vehicles/{id})...\n";
    $updateVehiclePayload = [
        'license_plate' => 'TEST-' . rand(100, 999) . '-YY',
        'brand_name'    => 'Toyota Updated',
        'model_name'    => 'HiAce Test Updated'
    ];
    $updateVehicleUrl = $baseUrl . "/api/sale_odoo/v1/vehicles/{$vehicleId}";
    $updateVehicleRes = callApi('PUT', $updateVehicleUrl, $updateVehiclePayload, $token);
    if ($updateVehicleRes['status'] === 200) {
        echo "✅ Modification Véhicule réussie\n\n";
    } else {
        echo "❌ Échec de la modification du véhicule !\n\n";
    }
} else {
    echo "[3/7] Test : Modification de véhicule sauté (pas de véhicule créé)\n\n";
}

// Étape 4 : Archivage de véhicule (si créé)
if ($vehicleId) {
    echo "[4/7] Test : Archivage de véhicule (POST /vehicles/{id}/archive)...\n";
    $archiveVehicleUrl = $baseUrl . "/api/sale_odoo/v1/vehicles/{$vehicleId}/archive";
    $archiveVehicleRes = callApi('POST', $archiveVehicleUrl, [], $token);
    if ($archiveVehicleRes['status'] === 200) {
        echo "✅ Archivage Véhicule réussi\n\n";
    } else {
        echo "❌ Échec de l'archivage du véhicule !\n\n";
    }
} else {
    echo "[4/7] Test : Archivage de véhicule sauté (pas de véhicule créé)\n\n";
}

// Étape 5 : Création de devis / sale order
echo "[5/7] Test : Création de Devis/Commande (POST /sale_orders)...\n";
$quoteRef = 'fidelis-quote-test-' . uniqid();
$quotePayload = [
    'external_ref'     => $quoteRef,
    'client_order_ref' => 'DEV-TEST-' . rand(1000, 9999),
    'partner_id'       => $partnerId,
    'state'            => 'draft',
    'validity_date'    => date('Y-m-d', strtotime('+30 days')),
    'note'             => 'Devis généré pour test de droits API',
    'order_lines'      => [
        [
            'product_id'      => 330, // Visite VL1-TP1
            'name'            => 'Controle technique vehicule leger (Test)',
            'product_uom_qty' => 1.0,
            'price_unit'      => 15000.0
        ]
    ]
];

$orderUrl = $baseUrl . '/api/sale_odoo/v1/sale_orders';
$orderRes = callApi('POST', $orderUrl, $quotePayload, $token);
$orderId = null;

if ($orderRes['status'] === 201 || $orderRes['status'] === 200) {
    $orderId = $orderRes['json']['data']['id'] ?? null;
    echo "✅ Création Devis/Commande réussie (ID: " . ($orderId ?? 'N/A') . ")\n\n";
} else {
    echo "❌ Échec de la création du devis !\n\n";
}

// Étape 6 : Modification de devis (si créé)
if ($orderId) {
    echo "[6/7] Test : Modification de Devis/Commande (PUT /sale_orders/{id})...\n";
    $updateOrderPayload = [
        'state' => 'sent',
        'client_order_ref' => 'DEV-TEST-UPD-' . rand(1000, 9999)
    ];
    $updateOrderUrl = $baseUrl . "/api/sale_odoo/v1/sale_orders/{$orderId}";
    $updateOrderRes = callApi('PUT', $updateOrderUrl, $updateOrderPayload, $token);
    if ($updateOrderRes['status'] === 200) {
        echo "✅ Modification Devis/Commande réussie\n\n";
    } else {
        echo "❌ Échec de la modification du devis !\n\n";
    }
} else {
    echo "[6/7] Test : Modification de devis sauté (pas de devis créé)\n\n";
}

// Étape 7 : Ajout de pièce jointe au devis (si créé)
if ($orderId) {
    echo "[7/7] Test : Pièce jointe Devis (POST /sale_orders/{id}/attachments)...\n";
    $attachmentPayload = [
        'url' => 'https://preprod-mayelia.odoo-saas.veone.net/web/image/res.partner/' . $partnerId . '/image_128' // Utilise une URL d'image existante sur leur Odoo
    ];
    $attachmentUrl = $baseUrl . "/api/sale_odoo/v1/sale_orders/{$orderId}/attachments";
    $attachmentRes = callApi('POST', $attachmentUrl, $attachmentPayload, $token);
    if ($attachmentRes['status'] === 200) {
        echo "✅ Ajout de pièce jointe réussi\n\n";
    } else {
        echo "❌ Échec de l'ajout de pièce jointe !\n\n";
    }
} else {
    echo "[7/7] Test : Pièce jointe Devis sauté (pas de devis créé)\n\n";
}

echo "═════════════════════════════════════════════════════════════════\n";
echo "FIN DES TESTS\n";
echo "═════════════════════════════════════════════════════════════════\n";

/**
 * Exécute une requête API cURL et retourne le statut et le corps décodé
 */
function callApi(string $method, string $url, ?array $payload, string $token): array
{
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    
    $headers = [
        'X-API-Key: ' . $token,
        'Accept: application/json',
    ];
    
    if ($payload !== null) {
        $body = json_encode($payload);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        $headers[] = 'Content-Type: application/json';
    }
    
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_TIMEOUT, 12);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($error) {
        echo "   ❌ Erreur cURL : {$error}\n";
        return ['status' => 0, 'json' => null];
    }
    
    $json = json_decode($response, true);
    
    echo "   👉 Requête : {$method} {$url}\n";
    if ($payload !== null) {
        echo "   👉 Payload envoyé : " . json_encode($payload, JSON_UNESCAPED_SLASHES) . "\n";
    }
    echo "   👈 Statut HTTP : {$httpCode}\n";
    
    if ($httpCode >= 400) {
        echo "   👈 Réponse : " . ($response ?: '(vide)') . "\n";
    }
    
    return ['status' => $httpCode, 'json' => $json];
}
