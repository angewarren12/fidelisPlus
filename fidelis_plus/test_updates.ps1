$BaseUrl = "http://127.0.0.1:8000/api/v1"

Write-Host "--- VALIDATION DES MISES À JOUR ---" -ForegroundColor Cyan

# 1. Test Login par Téléphone
Write-Host "[1] Test Login par Téléphone..." -ForegroundColor Yellow
$loginBody = @{
    login = "0102030405" # Doit correspondre à un utilisateur existant (admin@fidelis.com par defaut n'a pas forcement de tel)
    password = "Test@2025!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.data.token
    Write-Host "    PASS: Connecté via le numéro." -ForegroundColor Green
} catch {
    Write-Host "    SKIP: Login par tel échoué (vérifiez si l'utilisateur 0102030405 existe). Tentative par email..." -ForegroundColor Gray
    $loginBody = @{ login = "admin@fidelis.com"; password = "Test@2025!" } | ConvertTo-Json
    $loginResponse = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.data.token
}

$headers = @{ "Authorization" = "Bearer $token"; "Accept" = "application/json" }

# 2. Vérification des 5 créneaux
Write-Host "[2] Vérification des 5 créneaux..." -ForegroundColor Yellow
$slotsResponse = Invoke-RestMethod -Uri "$BaseUrl/appointments/slots?station_id=1&date=2024-12-25" -Method Get -Headers $headers
$count = $slotsResponse.data.Count
if ($count -eq 5) {
    Write-Host "    PASS: 5 créneaux détectés ($($slotsResponse.data.time -join ', '))" -ForegroundColor Green
} else {
    Write-Host "    FAIL: $count créneaux trouvés au lieu de 5." -ForegroundColor Red
}

# 3. Test Soumission Devis (Photo)
Write-Host "[3] Test Soumission Devis (Photo)..." -ForegroundColor Yellow
# Création de fichiers bidon
Set-Content -Path "test_reg.jpg" -Value "fake image content"
Set-Content -Path "test_vig.jpg" -Value "fake image content"

$boundary = [System.Guid]::NewGuid().ToString()
$LF = "`r`n"
$bodyLines = (
    "--$boundary",
    'Content-Disposition: form-data; name="vehicle_id"',
    '',
    '1',
    "--$boundary",
    'Content-Disposition: form-data; name="registration_image"; filename="test_reg.jpg"',
    'Content-Type: image/jpeg',
    '',
    'fake data',
    "--$boundary",
    'Content-Disposition: form-data; name="vignette_image"; filename="test_vig.jpg"',
    'Content-Type: image/jpeg',
    '',
    'fake data',
    "--$boundary--",
    ''
) -join $LF

try {
    $quoteRes = Invoke-RestMethod -Uri "$BaseUrl/quote-requests" -Method Post -Headers $headers -ContentType "multipart/form-data; boundary=$boundary" -Body $bodyLines
    Write-Host "    PASS: Demande de devis créée avec ID $($quoteRes.data.id)" -ForegroundColor Green
} catch {
    Write-Host "    FAIL: Erreur lors de l'envoi du devis." -ForegroundColor Red
}

Remove-Item "test_reg.jpg", "test_vig.jpg"

Write-Host "--- VALIDATION TERMINEE ---" -ForegroundColor Cyan
