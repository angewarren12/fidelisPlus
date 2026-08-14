# Rapport de test : Synchronisation FidelisPlus ↔ Odoo Preprod

**Date**: 2026-08-14  
**Statut**: ⚠️ PROBLÈMES DÉTECTÉS

---

## 1. Résumé exécutif

### Objectif
Valider la bidirectionnalité de la synchronisation des clients et prospects entre FidelisPlus et Odoo ERP (Preprod).

### Résultat
**PARTIEL** — L'intégration est configurée mais actuellement bloquée par des erreurs d'authentification et de validation.

---

## 2. Architecture de synchronisation

### 2.1 Direction 1: FidelisPlus → Odoo (Push)

**Mécanisme**: Asynchrone via queue de jobs Laravel  
**Trigger**: Événements Eloquent sur le modèle `Company`

| Événement | Endpoint Odoo | Payload |
|-----------|---------------|---------|
| `prospect_created` | `POST /api/sale_odoo/v1/partners` | Prospect with `is_company=false` |
| `converted_to_client` | `PUT /api/sale_odoo/v1/partners/{id}` + `POST .../promote-to-customer` | Prospect → Client |
| `company_archived` | `POST /api/sale_odoo/v1/partners/{id}/archive` | Soft delete |
| `company_restored` | `POST /api/sale_odoo/v1/partners/{id}/unarchive` | Restore |

**Idempotence**: Chaque partenaire porte un `external_ref = "fidelis-company-{id}"` permettant le lookup avant création.

**Fichiers impliqués**:
- `app/Jobs/SyncCompanyToOdoo.php` — Job handler
- `app/Services/Odoo/OdooClient.php` — HTTP client (ligne ~136-220)
- Observers/Events qui déclenchent le job

### 2.2 Direction 2: Odoo → FidelisPlus (Pull)

**Mécanisme**: Cron synchrone via commande Artisan  
**Commande**: `php artisan odoo:sync`  
**Fréquence**: À être planifiée (actuellement manuel)

**Endpoints Odoo pulés**:
```
GET /api/sale_odoo/v1/partners          (prospects/clients)
GET /api/sale_odoo/v1/vehicles          (flottes)
GET /api/sale_odoo/v1/sale_orders       (devis)
```

**Pagination**: 200 records/page, automatique  
**Tracking**: Table `odoo_sync_cursors` (lastupdate per resource)

**Ingestion**: `OdooIngestService` désérialise et crée/met à jour en base de données Fidelis.

**Fichiers impliqués**:
- `app/Console/Commands/SyncFromOdoo.php` (ligne 1-70)
- `app/Services/Odoo/OdooClient.php` (ligne 430-500)
- `app/Services/Odoo/OdooIngestService.php`

---

## 3. Problèmes détectés

### Problème #1: Authentification invalide (HTTP 401/403)

**Gravité**: 🔴 CRITIQUE  
**Description**: Les appels vers l'API Odoo retournent `HTTP 401` ou `HTTP 403`.

**Logs**:
```
[2026-08-13 15:25:40] OdooClient::fetchUpdatedCompanies — HTTP 401
[2026-08-13 15:36:13] OdooClient::fetchUpdatedVehicles — HTTP 403
```

**Cause probable**:
1. Token API invalide ou expiré
2. Permissions insuffisantes de l'utilisateur API

**Configuration actuelle**:
```bash
# .env
ODOO_OUTBOUND_BASE_URL=https://preprod-mayelia.odoo-saas.veone.net
ODOO_OUTBOUND_TOKEN=foTcUtgNdL-qJPCFWQ5u6cb2YxMSbZ8ZBuzZIyzPETg
```

**Résolution**:
1. Régénérer un nouveau token API dans Odoo :
   - Menu: **API Sales → API → Nouveau**
   - Remplacer la valeur dans `.env` ou `config('services.odoo.outbound_token')`
2. Vérifier les groupes de l'utilisateur API :
   - Doit inclure: **Contact/Création**, **Ventes/Administrateur**, etc.

---

### Problème #2: Champ email manquant lors de création (HTTP 422)

**Gravité**: 🟠 MOYEN  
**Description**: `POST /partners` échoue avec `Field "email" is required`.

**Log**:
```
[2026-08-13 21:23:37] OdooClient::syncCompany/POST — HTTP 422
{
  "error": {
    "code": "VALIDATION_ERROR", 
    "message": "Field \"email\" is required."
  },
  "success": false
}
```

**Cause**: Un prospect créé dans FidelisPlus n'a pas d'email (colonne `email` NULL).

**Payload Odoo attendu**:
```json
{
  "external_ref": "fidelis-company-120",
  "name": "Client Name",
  "email": "contact@example.com",  // ← REQUIS par l'API Odoo
  "phone": "+1234567890",
  "street": "123 Street",
  "city": "City",
  "zip": "12345",
  "is_company": true,
  "vat": "RCCM123"
}
```

**Résolution**:
1. **Validation FidelisPlus**: Rendre le champ `email` obligatoire lors de la création/édition d'un prospect.
2. **Validation du Job**: Ajouter une vérification dans `SyncCompanyToOdoo.handle()` pour skiper l'envoi si `email` est NULL.
3. **Fallback**: Si email manquant, générer un email placeholder (e.g., `prospect-{id}@fidelis.local`).

---

### Problème #3: Erreur d'accès (HTTP 403 - Création de partner)

**Gravité**: 🟠 MOYEN  
**Description**: L'utilisateur API n'a pas la permission de créer des partenaires.

**Log**:
```
[2026-08-13 21:36:44] OdooClient::syncCompany/POST — HTTP 403
{
  "error": {
    "code": "ACCESS_ERROR",
    "message": "Vous n'êtes pas autorisé à créer des enregistrements 'Contact' (res.partner)..."
  }
}
```

**Groupes requis** (selon message Odoo):
- Contact/Création
- Inventaire/Administrateur
- Achats/Administrateur
- Ventes/Administrateur
- Ventes/Utilisateur : mes documents seulement

**Résolution**:
1. Dans Odoo Preprod, ajouter les groupes **Contact/Création** et **Ventes/Administrateur** à l'utilisateur API.
2. Vérifier que l'utilisateur associé au token n'est pas en read-only.

---

### Problème #4: Erreur serveur sur fetch (HTTP 500)

**Gravité**: 🟡 FAIBLE (serveur, pas client)  
**Description**: `fetchUpdatedCompanies` retourne `HTTP 500`.

**Log**:
```
[2026-08-13 21:23:44] OdooClient::fetchUpdatedCompanies — HTTP 500
{"page": 1, "since": "2026-08-13T15:36:12+00:00"}
```

**Cause probable**: 
- Erreur côté serveur Odoo lors du traitement du paramètre `modified_since`
- Peut être une régression Odoo ou un format de timestamp incorrect

**Résolution**:
1. Consulter les logs d'erreur du serveur Odoo Preprod.
2. Tester manuellement via Swagger: `https://preprod-mayelia.odoo-saas.veone.net/api/sale_odoo/docs`
3. Vérifier le format ISO 8601 du timestamp envoyé.

---

## 4. Flux d'exécution détaillé

### 4.1 Création d'un prospect en FidelisPlus

```
UI FidelisPlus (créer prospect)
    ↓
ProspectController::store()
    ↓
Company Model saved (event: prospect_created)
    ↓
Observer declenche SyncCompanyToOdoo::dispatch()
    ↓
Job enters queue (database)
    ↓
Queue worker picks job
    ↓
SyncCompanyToOdoo::handle($odoo)
    ├─ Lookup par external_ref
    ├─ Validation: !created_via_marketing
    └─ $odoo->syncCompany($company, 'prospect_created')
        ├─ Build payload (name, email, phone, etc.)
        ├─ POST /api/sale_odoo/v1/partners
        └─ Store odoo_partner_id + odoo_sync_status='synced'
```

### 4.2 Synchronisation depuis Odoo

```
Scheduler / Manual: php artisan odoo:sync
    ↓
SyncFromOdoo::handle($odoo, $ingest)
    ├─ fetchUpdatedCompanies() → GET /api/sale_odoo/v1/partners
    ├─ fetchUpdatedVehicles() → GET /api/sale_odoo/v1/vehicles
    └─ fetchUpdatedQuotes() → GET /api/sale_odoo/v1/sale_orders
        ├─ Paginate (200/page)
        ├─ Log last_synced_at per resource
        └─ For each record:
            ├─ $ingest->ingestCompany($record)
            └─ Create/update in Fidelis DB
```

---

## 5. Plan de remédiation

### Étape 1: Corriger l'authentification (URGENT)

- [ ] Accéder à Odoo Preprod : https://preprod-mayelia.odoo-saas.veone.net
- [ ] Se connecter avec `moustapha.camara@cieria.com` (attendre password reset email)
- [ ] Menu **API Sales → API → Nouveau** → générer nouveau token
- [ ] Copier le token dans FidelisPlus `.env`
- [ ] Redémarrer queue worker et application

### Étape 2: Vérifier les permissions

- [ ] Odoo → Menu **Paramètres → Utilisateurs**
- [ ] Trouver l'utilisateur API (créé avec le token)
- [ ] Ajouter groupes: **Contact/Création**, **Ventes/Administrateur**
- [ ] Sauvegarder

### Étape 3: Valider les données

- [ ] **Test A (Push)**: Créer prospect dans FidelisPlus avec email valide
  - [ ] Vérifier logs: `odoo_sync_status = 'synced'`
  - [ ] Vérifier dans Odoo Preprod: partenaire créé avec `external_ref = "fidelis-company-X"`
- [ ] **Test B (Pull)**: Créer client dans Odoo Preprod
  - [ ] Exécuter: `php artisan odoo:sync`
  - [ ] Vérifier logs et base de données Fidelis

### Étape 4: Mettre en place le cron automatique

- [ ] Ajouter cron ou scheduler pour `php artisan odoo:sync` (ex: chaque 5 min)
- [ ] Documenter la fréquence choisie dans `docs/ops/production-cron-queue-setup.md`

---

## 6. Vérification manuelle (Swagger Odoo)

URL: https://preprod-mayelia.odoo-saas.veone.net/api/sale_odoo/docs

### Test endpoint GET Partners

```bash
curl -X GET "https://preprod-mayelia.odoo-saas.veone.net/api/sale_odoo/v1/partners?limit=10" \
  -H "X-API-Key: <TOKEN>"
```

**Réponse attendue (2xx)**:
```json
{
  "success": true,
  "data": {
    "records": [
      {
        "id": 123,
        "name": "Client Name",
        "email": "contact@example.com",
        "external_ref": "fidelis-company-..."
      }
    ],
    "total": 1
  }
}
```

---

## 7. Logs pertinents

Tous les logs se trouvent dans: `storage/logs/laravel.log`

Rechercher:
- `OdooClient::fetchUpdatedCompanies` — synchronisation entrante
- `OdooClient::syncCompany` — synchronisation sortante
- `SyncFromOdoo::` — tâche planifiée
- `OdooIngestService::` — traitement des données

---

## 8. Checklist de validation finale

- [ ] Token API régénéré et actif
- [ ] Utilisateur API a permissions "Contact/Création"
- [ ] Email obligatoire lors de création prospect (FidelisPlus)
- [ ] Test A: Prospect FidelisPlus → Odoo ✓
- [ ] Test B: Client Odoo → FidelisPlus ✓
- [ ] Cron `odoo:sync` configuré et actif
- [ ] Logs sans warnings `HTTP 401/403`
- [ ] Documentation mise à jour

---

## Contacts & Ressources

- **Odoo Preprod**: https://preprod-mayelia.odoo-saas.veone.net
- **Odoo Swagger**: https://preprod-mayelia.odoo-saas.veone.net/api/sale_odoo/docs
- **Email API**: moustapha.camara@cieria.com
- **Documentation technique**: voir `/docs/openapi/odoo-integration-v1.yaml`
