#!/usr/bin/env php
<?php
/**
 * Script de vérification : L'API Odoo retourne-t-elle les partners avec leurs contacts ?
 */

$token = 'foTcUtgNdL-qJPCFWQ5u6cb2YxMSbZ8ZBuzZIyzPETg';
$baseUrl = 'https://preprod-mayelia.odoo-saas.veone.net';

echo "═════════════════════════════════════════════════════════════════\n";
echo "VÉRIFICATION: Partners Odoo ET leurs contacts associés\n";
echo "═════════════════════════════════════════════════════════════════\n\n";

// Récupérer tous les partners créés par FidelisPlus
echo "📥 Récupération des partners créés par FidelisPlus...\n";
echo str_repeat("─", 70) . "\n\n";

$url = $baseUrl . '/api/sale_odoo/v1/partners?limit=50';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'X-API-Key: ' . $token,
    'Accept: application/json',
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200) {
    echo "❌ ERREUR HTTP {$httpCode}\n";
    $data = json_decode($response, true);
    if (isset($data['error']['message'])) {
        echo "Message: " . $data['error']['message'] . "\n";
    }
    exit(1);
}

$data = json_decode($response, true);

if (!isset($data['data']['records']) || !is_array($data['data']['records'])) {
    echo "❌ Format de réponse invalide\n";
    exit(1);
}

$partners = $data['data']['records'];
$totalPartners = count($partners);

echo "✅ {$totalPartners} partner(s) récupéré(s)\n\n";

if ($totalPartners === 0) {
    echo "⚠️  Aucun partner trouvé. La synchronisation FidelisPlus → Odoo n'a pas été testée.\n";
    exit(0);
}

// Analyser les partners FidelisPlus
$fidelisPartners = array_filter($partners, function($p) {
    return isset($p['external_ref']) && strpos($p['external_ref'], 'fidelis-') === 0;
});

echo "📊 RÉSUMÉ:\n";
echo "  - Total partners: {$totalPartners}\n";
echo "  - Partners FidelisPlus: " . count($fidelisPartners) . "\n\n";

if (empty($fidelisPartners)) {
    echo "⚠️  Aucun partner FidelisPlus trouvé (external_ref starting with 'fidelis-').\n";
    echo "   Cela signifie que la synchronisation FidelisPlus → Odoo n'a pas encore produit de données.\n";
    exit(0);
}

echo "═════════════════════════════════════════════════════════════════\n";
echo "DÉTAILS DES PARTNERS FIDELIS\n";
echo "═════════════════════════════════════════════════════════════════\n\n";

foreach ($fidelisPartners as $index => $partner) {
    echo ($index + 1) . ". " . $partner['name'] . "\n";
    echo "   ID Odoo: " . $partner['id'] . "\n";
    echo "   Reference: " . $partner['external_ref'] . "\n";
    echo "   Email: " . ($partner['email'] ?? 'N/A') . "\n";
    echo "   Type: " . ($partner['is_company'] ? 'Entreprise' : 'Particulier') . "\n";
    echo "   Actif: " . ($partner['active'] ? 'Oui' : 'Non (Archivé)') . "\n";
    
    // Afficher les contacts si disponibles
    if (isset($partner['child_ids']) && !empty($partner['child_ids'])) {
        echo "   Contacts associés: " . count($partner['child_ids']) . "\n";
        foreach ($partner['child_ids'] as $contact) {
            $contactName = trim(($contact['first_name'] ?? '') . ' ' . ($contact['last_name'] ?? ''));
            echo "     - " . $contactName . " (" . ($contact['email'] ?? 'N/A') . ")\n";
        }
    } else {
        echo "   ⚠️  Contacts associés: AUCUN\n";
    }
    
    echo "\n";
}

echo "═════════════════════════════════════════════════════════════════\n";
echo "VÉRIFICATION DES DONNÉES\n";
echo "═════════════════════════════════════════════════════════════════\n\n";

$withoutEmail = 0;
$withoutContact = 0;
$perfect = 0;

foreach ($fidelisPartners as $partner) {
    $hasEmail = !empty($partner['email']);
    $hasContact = isset($partner['child_ids']) && !empty($partner['child_ids']);
    
    if ($hasEmail && $hasContact) {
        $perfect++;
    } elseif (!$hasEmail) {
        $withoutEmail++;
    } elseif (!$hasContact) {
        $withoutContact++;
    }
}

echo "✅ Complets (email + contact): {$perfect}\n";
echo "❌ Sans email: {$withoutEmail}\n";
echo "⚠️  Sans contact associé: {$withoutContact}\n\n";

if ($perfect === count($fidelisPartners)) {
    echo "✅ Tous les partners FidelisPlus sont bien synchronisés avec email et contacts!\n";
} else {
    echo "⚠️  Certains partners sont incomplets.\n";
    if ($withoutEmail > 0) {
        echo "   → Vérifier la migration email en FidelisPlus\n";
    }
    if ($withoutContact > 0) {
        echo "   → Vérifier la synchronisation des contacts en FidelisPlus\n";
    }
}

echo "\n";
