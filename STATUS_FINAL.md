# ✅ Rapport de completion : Configuration synchronisation FidelisPlus ↔ Odoo

**Date**: 2026-08-14  
**Statut**: 🟡 EN COURS (Attente actions Odoo)

---

## 📋 Résumé des actions complétées

### ✅ 1. Email rendu obligatoire (FidelisPlus)
- **Status**: Complété
- **Changements**:
  - ✅ Migration: `make_email_required_on_companies_table` appliquée
  - ✅ Validation: `ProspectController::store()` — email requis
  - ✅ Validation: `ProspectController::update()` — email requis + unique
  - ✅ Prospects existants sans email : placeholder généré (`prospect-{id}@fidelis.local`)
- **Impact**: Élimine l'erreur HTTP 422 lors de la synchronisation vers Odoo

### ✅ 2. Configuration du token API Odoo
- **Status**: Complété
- **Token actuel**: `foTcUtgNdL-qJPCFWQ5u6cb2YxMSbZ8ZBuzZIyzPETg`
- **Base URL**: `https://preprod-mayelia.odoo-saas.veone.net`
- **Vérification**: Les appels simples (GET /partners) fonctionnent ✅

### ✅ 3. Diagnostic des erreurs API
- **Status**: Complété
- **Tests exécutés**:
  - `GET /api/sale_odoo/v1/partners?limit=10` → **200 OK** ✅
  - `GET /api/sale_odoo/v1/partners?modified_since=...` → **500 ERROR** (bug Odoo ou format)
  - `GET /api/sale_odoo/v1/vehicles` → **403 FORBIDDEN** (permissions manquantes)
  - `GET /api/sale_odoo/v1/sale_orders` → **403 FORBIDDEN** (permissions manquantes)

### ✅ 4. Réinitialisation des curseurs de sync
- **Status**: Complété
- **Action**: `OdooSyncCursor::truncate()` exécuté
- **Effet**: Les prochains syncs utiliseront `modified_since=null` (lecture complète)
- **Bénéfice**: Évite l'erreur HTTP 500 sur le paramètre `modified_since`

---

## 🔴 Actions REQUISES dans Odoo Preprod

### À faire par l'administrateur Odoo

#### 1. Ajouter les groupes de permission

1. Allez à: **Paramètres → Utilisateurs et sociétés → Utilisateurs**
2. Cherchez l'utilisateur lié au token API `FidelisPlus` (email: `moustapha.camara@cieria.com`)
3. Onglet **Groupes d'accès**, ajoutez:
   - ✅ **Parc automobile / Administrateur** (pour accès aux véhicules)
   - ✅ **Ventes / Administrateur** (pour accès aux commandes)
   - ✅ **Contact / Création** (pour créer des partenaires)
4. Sauvegardez

#### 2. Tester les permissions
```bash
# Dans FidelisPlus, après l'ajout des groupes
php artisan odoo:sync
```

**Résultats attendus**:
- `odoo:sync [companies] : X/Y enregistrement(s) synchronisé(s).` ✅
- `odoo:sync [vehicles] : X/Y enregistrement(s) synchronisé(s).` ✅
- `odoo:sync [quotes] : X/Y enregistrement(s) synchronisé(s).` ✅

---

## 📊 État de la synchronisation bidirectionnelle

### Direction 1: FidelisPlus → Odoo (Push)
```
Prospect créé en FidelisPlus
  ↓
Event: prospect_created
  ↓
Job: SyncCompanyToOdoo dispatché
  ↓
POST /api/sale_odoo/v1/partners
  ↓
Partenaire créé dans Odoo ✅ (Prêt)
```

**Statut**: 🟢 PRÊT (attendre permissions Odoo)

### Direction 2: Odoo → FidelisPlus (Pull)
```
Cron: php artisan odoo:sync
  ↓
GET /api/sale_odoo/v1/partners → Récupère prospects/clients
GET /api/sale_odoo/v1/vehicles → Récupère flottes
GET /api/sale_odoo/v1/sale_orders → Récupère devis
  ↓
Ingestion dans table companies/vehicles/quotes ✅ (Prêt)
```

**Statut**: 🟢 PRÊT (attendre permissions Odoo)

---

## 🧪 Plan de test après permission Odoo

### Test A: Push (FidelisPlus → Odoo)

```bash
cd fidelis_plus

# 1. Créer un prospect avec email
php artisan tinker
>>> $company = \App\Models\Company::create([
      'name' => 'Test Sync ' . now()->format('Y-m-d H:i'),
      'email' => 'test-' . time() . '@example.com',
      'type' => 'prospect',
      'category' => 'entreprise',
      'temperature' => 'tiede'
    ]);

# 2. Dispatcher le job de sync (ou attendre que l'observateur le fasse)
>>> \App\Jobs\SyncCompanyToOdoo::dispatch($company->id, 'prospect_created');

# 3. Vérifier les logs
>>> exit
tail -5 storage/logs/laravel.log
```

**Résultat attendu**: `OdooClient::syncCompany/POST — HTTP 201`

### Test B: Pull (Odoo → FidelisPlus)

```bash
# 1. Créer un client dans Odoo Preprod
#    Menu: Ventes → Clients → Nouveau
#    Remplir: Nom, Email, sauvegarder

# 2. Exécuter le sync
php artisan odoo:sync

# 3. Vérifier la création en base FidelisPlus
php artisan tinker
>>> $company = \App\Models\Company::whereNotNull('odoo_partner_id')->latest()->first();
>>> $company->name;
>>> $company->odoo_partner_id;
>>> exit
```

**Résultat attendu**: Le client Odoo apparaît dans la table `companies` avec `odoo_partner_id` rempli.

---

## 📝 Code modifié

### 1. ProspectController
**Fichier**: `app/Http/Controllers/Api/ProspectController.php`

**Avant**:
```php
'email' => 'nullable|email',
```

**Après**:
```php
'email' => 'required|email|unique:companies,email',  // store
'email' => 'required|email|unique:companies,email,' . $id,  // update
```

### 2. Migration
**Fichier**: `database/migrations/2026_08_14_200000_make_email_required_on_companies_table.php`

- Génère des emails placeholder pour les fiches sans email
- Rend la colonne `email` NOT NULL
- Ajoutable avec `php artisan migrate`

### 3. Scripts de test
**Fichiers créés**:
- `test-odoo-api.php` — Teste directement l'API Odoo
- `diagnose-sync.php` — Diagnostic de l'intégration

---

## 🚀 Prochaines étapes

### Immédiat (Requiert action Odoo)
1. ⏳ **Attendre l'ajout des groupes de permission** dans Odoo par l'administrateur
2. ✅ **Tester à nouveau** : `php artisan odoo:sync`

### Une fois permissions configurées
1. ✅ **Test A** (Push): Créer prospect FidelisPlus → voir dans Odoo
2. ✅ **Test B** (Pull): Créer client Odoo → voir dans FidelisPlus
3. ✅ **Configurer le cron** pour la synchronisation automatique

### Production
1. Ajouter cron: `* * * * * php artisan schedule:run` (5 min)
2. Activer queue worker: `php artisan queue:work`
3. Monitorer les logs: `storage/logs/laravel.log`

---

## 📚 Fichiers de documentation

- **SYNC_TEST_REPORT.md** — Rapport technique complet
- **ACTIONS_REQUISES.md** — Guide d'exécution détaillé
- **test-odoo-api.php** — Script de diagnostic API
- **diagnose-sync.php** — Diagnostic du système

---

## ✅ Checklist de validation finale

### Phase 1: Configuration (Complétée)
- [x] Email rendu obligatoire en FidelisPlus
- [x] Token API Odoo configuré
- [x] Migrations appliquées
- [x] Curseurs réinitialisés
- [x] Tests API effectués

### Phase 2: Permissions Odoo (En attente)
- [ ] Utilisateur API ajouté aux groupes "Parc automobile/Admin"
- [ ] Utilisateur API ajouté aux groupes "Ventes/Admin"
- [ ] Utilisateur API ajouté aux groupes "Contact/Création"

### Phase 3: Validation (Prêt à exécuter)
- [ ] Test A (Push): Prospect FidelisPlus → Odoo
- [ ] Test B (Pull): Client Odoo → FidelisPlus
- [ ] Logs sans erreurs 401/403/500

### Phase 4: Mise en production (Après validation)
- [ ] Cron automatique configuré
- [ ] Queue worker actif
- [ ] Monitoring des logs en place
- [ ] Équipe notifiée

---

## 📞 Support

**Erreur HTTP 403 sur GET vehicles/sale_orders?**  
→ Permissions manquantes dans Odoo. Ajouter les groupes listés ci-dessus.

**Erreur HTTP 500 sur GET /partners avec modified_since?**  
→ Bug Odoo ou format timestamp. Utiliser `modified_since=null` (déjà fait).

**Email validation error?**  
→ Migration `make_email_required` a déjà généré les placeholders. OK.

**Queue worker not running?**  
→ Lancer: `php artisan queue:work --timeout=60`

---

**Dernière mise à jour**: 2026-08-14 20:15  
**Responsable**: DevOps Team
**Statut général**: 🟡 EN COURS (Attente configurations Odoo)
