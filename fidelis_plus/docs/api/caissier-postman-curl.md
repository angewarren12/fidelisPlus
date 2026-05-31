# API app caisse — curl et Postman

Base URL par défaut : `http://localhost:8000` (voir `APP_URL` dans `.env`).

Références : [openapi/fidelis-plus-v1.yaml](../openapi/fidelis-plus-v1.yaml), `config/fidelis_api.php`.

Fichiers prêts à l’emploi :

- Collection Postman : [postman/Fidelis-Plus-Caissier.postman_collection.json](../postman/Fidelis-Plus-Caissier.postman_collection.json) (import direct).
- Script tout-en-un : [curl-caissier.sh](curl-caissier.sh) (`bash docs/api/curl-caissier.sh` depuis la racine du projet Laravel).

## Variables

| Variable      | Exemple                         |
|---------------|----------------------------------|
| `BASE_URL`    | `http://localhost:8000`         |
| `TOKEN`       | retour de `POST /api/v1/auth/login` |
| `STATION_ID`  | un `id` de `GET /api/v1/stations` |
| `QR_PAYLOAD`  | chaîne scannée / générée côté marketing ou `php artisan loyalty:generate-test-qr` |
| Idempotency   | UUID unique **par tentative** de scan (requis sur le POST scan) |

## curl (ordre recommandé)

### 1. Connexion

```bash
curl -sS -X POST "${BASE_URL}/api/v1/auth/login" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{"login":"caisse@mayelia.test","password":"caisse2026"}'
```

Extraire `data.token` dans une variable `TOKEN` (à la main ou avec `jq`: `.data.token`).

### 2. Profil

```bash
curl -sS "${BASE_URL}/api/v1/auth/me" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 3. Stations

```bash
curl -sS "${BASE_URL}/api/v1/stations" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer ${TOKEN}"
```

### 4. Scan fidélité (caissier / admin)

En-tête **`Idempotency-Key`** obligatoire (max 80 caractères).

```bash
curl -sS -X POST "${BASE_URL}/api/v1/loyalty/pos/scan" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Idempotency-Key: $(uuidgen 2>/dev/null || echo idemp-$(date +%s))" \
  -d "{\"qr_payload\":\"${QR_PAYLOAD}\",\"station_id\":${STATION_ID},\"occurred_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"device_id\":\"curl-demo\"}"
```

### 5. Notifications (optionnel)

```bash
curl -sS "${BASE_URL}/api/v1/notifications?per_page=20" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer ${TOKEN}"
```

## Collection Postman

**Import** : `docs/postman/Fidelis-Plus-Caissier.postman_collection.json` (fichier versionné dans le dépôt).

Variables de collection : `base_url`, `token` (rempli automatiquement après **POST login** grâce au script Tests), `station_id`, `qr_payload`, `idempotency_key` (`{{$guid}}` par défaut pour un nouveau scan).

Après import : lancer **POST login**, renseigner `qr_payload` et `station_id`, lancer **POST loyalty/pos/scan** (nouvelle clé d’idempotence à chaque tentative de scan réelle).
