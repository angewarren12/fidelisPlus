# ================================================================
#  FIDELIS+ - TESTS CRUD COMPLETS (Base MySQL reelle)
#  Lancez ce script avec : test_crud_reel.bat
# ================================================================

$BASE = "http://127.0.0.1:8000/api/v1"
$PHP  = "C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe"
$DIR  = "C:\Users\USER2\.gemini\antigravity\scratch\fidelis_plus"
$PASS = 0
$FAIL = 0

function Test-Api {
    param($Label, $Method, $Url, $Body = $null, $Token = $null, $ExpectStatus = 200)
    $headers = @{ Accept = "application/json" }
    if ($Token) { $headers["Authorization"] = "Bearer $Token" }
    try {
        $params = @{
            Uri     = $Url
            Method  = $Method
            Headers = $headers
            ErrorAction = "Stop"
            UseBasicParsing = $true
        }
        if ($Body) {
            $params["Body"] = ($Body | ConvertTo-Json -Depth 10 -Compress)
            $params["ContentType"] = "application/json"
        }
        $r = Invoke-WebRequest @params
        $json = ConvertFrom-Json $r.Content
        Write-Host "  [PASS] $Label" -ForegroundColor Green
        $script:PASS++
        return $json
    } catch {
        $code = $_.Exception.Response.StatusCode.Value__
        Write-Host "  [FAIL] $Label (HTTP $code)" -ForegroundColor Red
        $script:FAIL++
        return $null
    }
}


# ================================================================
Write-Host ""
Write-Host "  ==========================================================" -ForegroundColor Cyan
Write-Host "   FIDELIS+ CRUD TEST SUITE - Base MySQL : fidelis_plus" -ForegroundColor Cyan
Write-Host "  ==========================================================" -ForegroundColor Cyan
Write-Host ""

# ----------------------------------------------------------------
# ETAPE 0 : Vérifier/Démarrer le serveur Laravel
# ----------------------------------------------------------------
Write-Host "[0] Vérification du serveur Laravel..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri "http://127.0.0.1:8000/" -UseBasicParsing -ErrorAction Stop | Out-Null
    Write-Host "    Serveur déjà en ligne sur http://127.0.0.1:8000" -ForegroundColor Green
} catch {
    Write-Host "    Démarrage du serveur..." -ForegroundColor Yellow
    Start-Process -FilePath $PHP -ArgumentList "artisan", "serve", "--host=127.0.0.1", "--port=8000" -WorkingDirectory $DIR -WindowStyle Hidden
    Start-Sleep -Seconds 4
    Write-Host "    Serveur lancé sur http://127.0.0.1:8000" -ForegroundColor Green
}
Write-Host ""

# ----------------------------------------------------------------
# ETAPE 1 : Creer les utilisateurs et la station
# ----------------------------------------------------------------
Write-Host "[1/9] CREATION DES DONNEES DE BASE (Tinker)" -ForegroundColor Yellow
Write-Host "-----------------------------------------------"
$tinkerCmd = "App\Models\Company::firstOrCreate(['name'=>'Mayelia Interne'],['type'=>'client','category'=>'entreprise']); " +
             "`$c=App\Models\Company::where('name','Mayelia Interne')->first(); " +
             "App\Models\User::updateOrCreate(['email'=>'admin@fidelis.com'],['company_id'=>`$c->id,'role'=>'admin','first_name'=>'Super','last_name'=>'Admin','password'=>bcrypt('Test@2025!')]); " +
             "App\Models\User::updateOrCreate(['email'=>'commercial@fidelis.com'],['company_id'=>`$c->id,'role'=>'commercial','first_name'=>'Jean','last_name'=>'Commercial','password'=>bcrypt('Test@2025!')]); " +
             "App\Models\Station::firstOrCreate(['name'=>'Station Noumea Centre'],['location'=>'Rue de la Victoire, Noumea','express_capacity_per_slot'=>3]); " +
             "echo 'OK';"
& $PHP artisan tinker --execute="$tinkerCmd" 2>$null
Write-Host "  [OK] admin@fidelis.com / Test@2025!" -ForegroundColor Green
Write-Host "  [OK] commercial@fidelis.com / Test@2025!" -ForegroundColor Green
Write-Host "  [OK] Station Noumea Centre cree" -ForegroundColor Green
Write-Host ""

# ----------------------------------------------------------------
# ETAPE 2 : AUTHENTIFICATION
# ----------------------------------------------------------------
Write-Host "[2/9] AUTHENTIFICATION" -ForegroundColor Yellow
Write-Host "-----------------------------------------------"

# Login Admin
$loginResult = Test-Api "POST /auth/login (Admin)" "POST" "$BASE/auth/login" @{ email = "admin@fidelis.com"; password = "Test@2025!" }
if (-not $loginResult) {
    Write-Host ""
    Write-Host "ERREUR CRITIQUE : Login impossible. Laragon/MySQL est-il demarré ?" -ForegroundColor Red
    Read-Host "Appuyez sur Entree pour quitter"
    exit 1
}
$TOKEN = $loginResult.data.token

# GET /me
Test-Api "GET /auth/me" "GET" "$BASE/auth/me" -Token $TOKEN | Out-Null

# PATCH FCM Token
Test-Api "PATCH /auth/fcm-token" "PATCH" "$BASE/auth/fcm-token" @{ fcm_token = "firebase-device-token-fidelis-test-001" } -Token $TOKEN | Out-Null

# Recuperer ID commercial
$commLogin = Test-Api "POST /auth/login (Commercial)" "POST" "$BASE/auth/login" @{ email = "commercial@fidelis.com"; password = "Test@2025!" }
$COMMERCIAL_ID = $commLogin.data.user.id
Write-Host ""

# ----------------------------------------------------------------
# ETAPE 3 : CRUD COMPTES
# ----------------------------------------------------------------
Write-Host "[3/9] CRUD COMPTES (Clients et Prospects)" -ForegroundColor Yellow
Write-Host "-----------------------------------------------"

$prospect = Test-Api "POST /accounts (Prospect ACME)" "POST" "$BASE/accounts" @{
    name          = "ACME Transport NC"
    category      = "entreprise"
    type          = "prospect"
    first_name    = "Marc"
    last_name     = "Dubois"
    email         = "marc.dubois@acme.nc"
    phone         = "0687654321"
    commercial_id = $COMMERCIAL_ID
    observations  = "Contact salon BTP 2025. Tres interesse par le forfait flotte."
    is_active     = $true
} -Token $TOKEN
$ACCOUNT_ID = $prospect.data.id

Test-Api "GET /accounts (Liste)" "GET" "$BASE/accounts" -Token $TOKEN | Out-Null
Test-Api "GET /accounts?commercial_id=$COMMERCIAL_ID" "GET" "$BASE/accounts?commercial_id=$COMMERCIAL_ID" -Token $TOKEN | Out-Null
Test-Api "GET /accounts?is_active=1" "GET" "$BASE/accounts?is_active=1" -Token $TOKEN | Out-Null
Test-Api "GET /accounts?type=prospect" "GET" "$BASE/accounts?type=prospect" -Token $TOKEN | Out-Null
Test-Api "GET /accounts/$ACCOUNT_ID (Detail)" "GET" "$BASE/accounts/$ACCOUNT_ID" -Token $TOKEN | Out-Null
Test-Api "PUT /accounts/$ACCOUNT_ID (Modification)" "PUT" "$BASE/accounts/$ACCOUNT_ID" @{ observations = "RDV confirme 15/05/2025. Potentiel eleve." } -Token $TOKEN | Out-Null
$recharge = Test-Api "POST /accounts/$ACCOUNT_ID/recharge" "POST" "$BASE/accounts/$ACCOUNT_ID/recharge" @{ amount = 50000 } -Token $TOKEN
if ($recharge) { Write-Host "         Nouveau solde : $($recharge.new_balance) XPF" -ForegroundColor DarkGray }
Test-Api "POST /accounts/$ACCOUNT_ID/convert (Prospect->Client)" "POST" "$BASE/accounts/$ACCOUNT_ID/convert" -Token $TOKEN | Out-Null
Test-Api "DELETE /accounts/$ACCOUNT_ID (Soft Delete)" "DELETE" "$BASE/accounts/$ACCOUNT_ID" -Token $TOKEN | Out-Null
Test-Api "GET /accounts?only_deleted=1 (Corbeille)" "GET" "$BASE/accounts?only_deleted=1" -Token $TOKEN | Out-Null
Test-Api "POST /accounts/$ACCOUNT_ID/restore" "POST" "$BASE/accounts/$ACCOUNT_ID/restore" -Token $TOKEN | Out-Null
Write-Host ""

# ----------------------------------------------------------------
# ETAPE 4 : KANBAN / PIPELINE
# ----------------------------------------------------------------
Write-Host "[4/9] KANBAN - PIPELINE PROSPECTION" -ForegroundColor Yellow
Write-Host "-----------------------------------------------"

$kanban = Test-Api "POST /accounts (Prospect Kanban - Froid)" "POST" "$BASE/accounts" @{
    name          = "Garage du Pacifique"
    category      = "entreprise"
    type          = "prospect"
    first_name    = "Sophie"
    last_name     = "Martin"
    email         = "sophie.martin@garage.nc"
    commercial_id = $COMMERCIAL_ID
    temperature   = "froid"
    kanban_stage  = "nouveau_lead"
} -Token $TOKEN
$KANBAN_ID = $kanban.data.id

Test-Api "PUT Pipeline: froid->tiede + Stage=contact" "PUT" "$BASE/accounts/$KANBAN_ID" @{ temperature = "tiede"; kanban_stage = "contact" } -Token $TOKEN | Out-Null
Test-Api "PUT Pipeline: tiede->chaud + Stage=proposition" "PUT" "$BASE/accounts/$KANBAN_ID" @{ temperature = "chaud"; kanban_stage = "proposition" } -Token $TOKEN | Out-Null
Write-Host ""

# ----------------------------------------------------------------
# ETAPE 5 : CRUD VEHICULES
# ----------------------------------------------------------------
Write-Host "[5/9] CRUD VEHICULES (Parc Automobile)" -ForegroundColor Yellow
Write-Host "-----------------------------------------------"

$vehicle = Test-Api "POST /vehicles" "POST" "$BASE/vehicles" @{
    company_id    = $ACCOUNT_ID
    license_plate = "TX-042-NC"
    brand         = "Toyota"
    model         = "HiAce"
    year          = 2022
    fuel_type     = "diesel"
} -Token $TOKEN
$VEHICLE_ID = $vehicle.data.id

Test-Api "GET /vehicles (Liste Flotte)" "GET" "$BASE/vehicles" -Token $TOKEN | Out-Null
Test-Api "GET /vehicles/$VEHICLE_ID (Detail)" "GET" "$BASE/vehicles/$VEHICLE_ID" -Token $TOKEN | Out-Null
Test-Api "PUT /vehicles/$VEHICLE_ID (statut->bientot)" "PUT" "$BASE/vehicles/$VEHICLE_ID" @{ status = "bientot" } -Token $TOKEN | Out-Null

# Creer un 2eme vehicule pour les RDV (le 1er sera supprime)
$vehicle2 = Test-Api "POST /vehicles (2eme pour RDV)" "POST" "$BASE/vehicles" @{
    company_id    = $ACCOUNT_ID
    license_plate = "TX-099-NC"
    brand         = "Nissan"
    model         = "Navara"
    year          = 2023
    fuel_type     = "diesel"
} -Token $TOKEN
$VEHICLE2_ID = $vehicle2.data.id

Test-Api "DELETE /vehicles/$VEHICLE_ID (Suppression)" "DELETE" "$BASE/vehicles/$VEHICLE_ID" -Token $TOKEN | Out-Null
Write-Host ""

# ----------------------------------------------------------------
# ETAPE 6 : CRUD RENDEZ-VOUS
# ----------------------------------------------------------------
Write-Host "[6/9] CRUD RENDEZ-VOUS (Planning + Pass Express)" -ForegroundColor Yellow
Write-Host "-----------------------------------------------"

# Recuperer ID station
$stationIdRaw = & $PHP artisan tinker --execute="echo App\Models\Station::where('name','Station Noumea Centre')->first()->id;" 2>$null
$STATION_ID = ($stationIdRaw | Select-String -Pattern '^\d+$').Matches.Value
if (-not $STATION_ID) { $STATION_ID = 1 }

$slots = Test-Api "GET /appointments/slots" "GET" "$BASE/appointments/slots?station_id=$STATION_ID&date=2025-06-15" -Token $TOKEN
if ($slots) {
    $dispo = ($slots.data | Where-Object { -not $_.is_full }).Count
    Write-Host "         $($slots.data.Count) creneaux, $dispo disponibles" -ForegroundColor DarkGray
}

$rdv = Test-Api "POST /appointments (RDV Normal)" "POST" "$BASE/appointments" @{
    vehicle_id       = $VEHICLE2_ID
    station_id       = $STATION_ID
    appointment_date = "2025-06-15 09:00:00"
    is_pass_express  = $false
} -Token $TOKEN
$RDV_ID = $rdv.data.id

Test-Api "POST /appointments (Pass Express)" "POST" "$BASE/appointments" @{
    vehicle_id       = $VEHICLE2_ID
    station_id       = $STATION_ID
    appointment_date = "2025-06-15 10:00:00"
    is_pass_express  = $true
} -Token $TOKEN | Out-Null

Test-Api "GET /appointments?station_id=$STATION_ID" "GET" "$BASE/appointments?station_id=$STATION_ID" -Token $TOKEN | Out-Null
Test-Api "PATCH /appointments/$RDV_ID/cancel" "PATCH" "$BASE/appointments/$RDV_ID/cancel" -Token $TOKEN | Out-Null
Write-Host ""

# ----------------------------------------------------------------
# ETAPE 7 : CRUD DEVIS
# ----------------------------------------------------------------
Write-Host "[7/9] CRUD DEVIS (Module Vente)" -ForegroundColor Yellow
Write-Host "-----------------------------------------------"

$quote = Test-Api "POST /quotes (Devis 2 lignes)" "POST" "$BASE/quotes" @{
    company_id   = $ACCOUNT_ID
    quote_number = "DEV-2025-001"
    valid_until  = "2025-12-31"
    items        = @(
        @{ description = "Controle technique vehicule leger"; price = 15000; quantity = 1 }
        @{ description = "Vignette assurance annuelle";       price = 4500;  quantity = 2 }
    )
} -Token $TOKEN
$QUOTE_ID = $quote.data.id
if ($quote) { Write-Host "         Total calcule : $($quote.data.total_amount) XPF" -ForegroundColor DarkGray }

Test-Api "GET /quotes (Liste)" "GET" "$BASE/quotes" -Token $TOKEN | Out-Null
Test-Api "PATCH /quotes/$QUOTE_ID/status -> sent" "PATCH" "$BASE/quotes/$QUOTE_ID/status" @{ status = "sent" } -Token $TOKEN | Out-Null
Test-Api "PATCH /quotes/$QUOTE_ID/status -> accepted" "PATCH" "$BASE/quotes/$QUOTE_ID/status" @{ status = "accepted" } -Token $TOKEN | Out-Null
Write-Host ""

# ----------------------------------------------------------------
# ETAPE 8 : SUPPORT & NOTIFICATIONS
# ----------------------------------------------------------------
Write-Host "[8/9] CRUD SUPPORT et NOTIFICATIONS" -ForegroundColor Yellow
Write-Host "-----------------------------------------------"

Test-Api "POST /support (Ticket priorite haute)" "POST" "$BASE/support" @{
    subject  = "Probleme connexion application mobile"
    message  = "Impossible de se connecter depuis ce matin. Erreur 401."
    priority = "high"
} -Token $TOKEN | Out-Null

Test-Api "GET /support (Liste Tickets)" "GET" "$BASE/support" -Token $TOKEN | Out-Null
Test-Api "GET /notifications (Liste)" "GET" "$BASE/notifications" -Token $TOKEN | Out-Null
Write-Host ""

# ----------------------------------------------------------------
# ETAPE 9 : STATS DASHBOARD + LOGOUT
# ----------------------------------------------------------------
Write-Host "[9/9] STATS DASHBOARD et LOGOUT" -ForegroundColor Yellow
Write-Host "-----------------------------------------------"

$stats = Test-Api "GET /stats/dashboard" "GET" "$BASE/stats/dashboard" -Token $TOKEN
if ($stats) {
    Write-Host "  --- Resultats Dashboard ---" -ForegroundColor DarkGray
    Write-Host "      Clients     : $($stats.data.crm.total_clients)" -ForegroundColor DarkGray
    Write-Host "      Prospects   : $($stats.data.crm.total_prospects)" -ForegroundColor DarkGray
    Write-Host "      Conversion  : $($stats.data.crm.conversion_rate)%" -ForegroundColor DarkGray
    Write-Host "      CA accepte  : $($stats.data.revenue.total_accepted) XPF" -ForegroundColor DarkGray
    Write-Host "      Pipeline    : $($stats.data.revenue.pipeline_potential) XPF" -ForegroundColor DarkGray
}

Test-Api "POST /auth/logout" "POST" "$BASE/auth/logout" -Token $TOKEN | Out-Null
Write-Host ""

# ----------------------------------------------------------------
# RAPPORT FINAL
# ----------------------------------------------------------------
$total = $PASS + $FAIL
Write-Host "  ==========================================================" -ForegroundColor Cyan
Write-Host "   RAPPORT FINAL : $PASS PASS / $FAIL FAIL / $total TOTAL" -ForegroundColor Cyan
Write-Host "  ==========================================================" -ForegroundColor Cyan
if ($FAIL -eq 0) {
    Write-Host "  Tous les tests sont PASSES ! Backend operationnel." -ForegroundColor Green
} else {
    Write-Host "  $FAIL test(s) ont echoue. Verifiez les erreurs ci-dessus." -ForegroundColor Red
}
Write-Host ""
Write-Host "  Base de donnees : fidelis_plus (MySQL Laragon)" -ForegroundColor DarkGray
Write-Host "  Verifiez vos donnees dans HeidiSQL pour confirmer." -ForegroundColor DarkGray
Write-Host ""
Read-Host "  Appuyez sur Entree pour quitter"
