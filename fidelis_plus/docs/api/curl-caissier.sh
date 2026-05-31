#!/usr/bin/env bash
# Flux API minimal pour l'app caisse (Git Bash, WSL, Linux, macOS).
# Prérequis : curl, php en CLI (déjà présent avec Laravel).
#
#   bash docs/api/curl-caissier.sh
#   QR_PAYLOAD='...' bash docs/api/curl-caissier.sh   # inclut le scan
#
# Variables optionnelles : BASE_URL, LOGIN, PASSWORD, STATION_ID_USER
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8000}"
LOGIN="${LOGIN:-caisse@mayelia.test}"
PASSWORD="${PASSWORD:-caisse2026}"

echo "=== 1) Login ==="
RESP=$(curl -sS -X POST "${BASE_URL}/api/v1/auth/login" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d "{\"login\":\"${LOGIN}\",\"password\":\"${PASSWORD}\"}")
echo "$RESP" | head -c 600
echo ""

TOKEN=$(printf '%s' "$RESP" | php -r '$j=json_decode(stream_get_contents(STDIN),true); echo $j["data"]["token"]??"";' || true)
if [[ -z "$TOKEN" ]]; then
  echo "Échec : pas de token (vérifiez identifiants / seed LoyaltyCaissierDemoSeeder)."
  exit 1
fi

echo ""
echo "=== 2) GET /auth/me ==="
curl -sS "${BASE_URL}/api/v1/auth/me" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer ${TOKEN}" | head -c 800
echo ""

echo ""
echo "=== 3) GET /stations ==="
STATIONS=$(curl -sS "${BASE_URL}/api/v1/stations" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer ${TOKEN}")
echo "$STATIONS" | head -c 800
echo ""

STATION_ID=$(printf '%s' "$STATIONS" | php -r '
$j = json_decode(stream_get_contents(STDIN), true);
$d = $j["data"] ?? null;
if (is_array($d) && isset($d[0]["id"])) { echo (int) $d[0]["id"]; }
' || true)
if [[ -z "$STATION_ID" ]]; then
  STATION_ID="${STATION_ID_USER:-1}"
  echo "(Aucune station en base — station_id par défaut : ${STATION_ID})"
else
  echo "(station_id utilisé : ${STATION_ID})"
fi

echo ""
echo "=== 4) POST /loyalty/pos/scan ==="
if [[ -z "${QR_PAYLOAD:-}" ]]; then
  echo "Scan ignoré : définissez QR_PAYLOAD (ex. sortie de php artisan loyalty:generate-test-qr)."
  echo "  QR_PAYLOAD='...' bash docs/api/curl-caissier.sh"
else
  IDEM=$(command -v uuidgen >/dev/null 2>&1 && uuidgen || echo "idemp-$(date +%s)-${RANDOM}")
  export QR_PAYLOAD
  export STATION_ID
  BODY=$(php -r 'echo json_encode([
    "qr_payload" => getenv("QR_PAYLOAD") ?: "",
    "station_id" => (int) (getenv("STATION_ID") ?: 0),
    "occurred_at" => date("c"),
    "device_id" => "curl-demo",
]);')
  curl -sS -X POST "${BASE_URL}/api/v1/loyalty/pos/scan" \
    -H "Accept: application/json" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Idempotency-Key: ${IDEM}" \
    -d "${BODY}"
  echo ""
fi

echo ""
echo "=== 5) GET /notifications ==="
curl -sS "${BASE_URL}/api/v1/notifications?per_page=5" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer ${TOKEN}" | head -c 800
echo ""
