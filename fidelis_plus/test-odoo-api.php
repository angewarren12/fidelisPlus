#!/usr/bin/env php
<?php
/**
 * Script de test direct de l'API Odoo
 */

$token = 'foTcUtgNdL-qJPCFWQ5u6cb2YxMSbZ8ZBuzZlyzPETg';
$baseUrl = 'https://preprod-mayelia.odoo-saas.veone.net';

echo "═══════════════════════════════════════════\n";
echo "TEST DIRECT DE L'API ODOO\n";
echo "═══════════════════════════════════════════\n\n";

// Test 1: GET partners sans paramètres
echo "Test 1: GET /api/sale_odoo/v1/partners (sans since)\n";
$url = $baseUrl . '/api/sale_odoo/v1/partners?limit=10';
testEndpoint($url, $token);

// Test 2: GET partners avec limit
echo "\n\nTest 2: GET /api/sale_odoo/v1/partners?limit=5\n";
$url = $baseUrl . '/api/sale_odoo/v1/partners?limit=5';
testEndpoint($url, $token);

// Test 3: GET partners avec modified_since (le paramètre problématique)
echo "\n\nTest 3: GET /api/sale_odoo/v1/partners?modified_since=2026-08-13T15:36:12%2B00:00\n";
$url = $baseUrl . '/api/sale_odoo/v1/partners?modified_since=2026-08-13T15:36:12%2B00:00&limit=10';
testEndpoint($url, $token);

// Test 4: GET vehicles
echo "\n\nTest 4: GET /api/sale_odoo/v1/vehicles\n";
$url = $baseUrl . '/api/sale_odoo/v1/vehicles?limit=10';
testEndpoint($url, $token);

// Test 5: GET sale_orders
echo "\n\nTest 5: GET /api/sale_odoo/v1/sale_orders\n";
$url = $baseUrl . '/api/sale_odoo/v1/sale_orders?limit=10';
testEndpoint($url, $token);

function testEndpoint($url, $token)
{
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'X-API-Key: ' . $token,
        'Accept: application/json',
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Dev only!

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        echo "❌ cURL Error: {$error}\n";
        return;
    }

    echo "HTTP Status: {$httpCode}\n";

    if ($httpCode == 200) {
        $data = json_decode($response, true);
        if ($data && isset($data['success'])) {
            echo "✅ Success: " . ($data['success'] ? 'true' : 'false') . "\n";
            if (isset($data['data'])) {
                if (is_array($data['data']) && isset($data['data']['records'])) {
                    echo "   Records count: " . count($data['data']['records']) . "\n";
                } elseif (is_array($data['data'])) {
                    echo "   Data count: " . count($data['data']) . "\n";
                }
            }
            if (isset($data['error'])) {
                echo "   Error: " . $data['error']['message'] . "\n";
            }
        } else {
            echo "   Response: " . substr($response, 0, 200) . "\n";
        }
    } else {
        echo "❌ HTTP Error {$httpCode}\n";
        $body = json_decode($response, true);
        if (isset($body['error']['message'])) {
            echo "   Message: " . $body['error']['message'] . "\n";
        }
        echo "   Response: " . substr($response, 0, 300) . "\n";
    }
}
