# Rapport de test : Synchronisation bidirectionnelle FidelisPlus ↔ Odoo

**Date**: 2026-08-18
**Statut**: 🔴 BLOQUÉE — Permissions API Odoo manquantes

---

## 1. Résumé exécutif

### Objectif
Tester la synchronisation bidirectionnelle des prospects et clients entre FidelisPlus et Odoo ERP (Preprod), et diagnostiquer l'erreur de permissions sur les devis et la flotte.

### Résultat
**BLOQUÉ** — L'authentification fonctionne (token valide), mais l'utilisateur API Odoo n'a PAS les permissions nécessaires pour :
- **Créer** des contacts (prospects/clients) → HTTP 403 sur `POST /partners`
- **Lire** les devis → HTTP 403 sur `GET /sale_orders`
- **Lire** la flotte → HTTP 403 sur `GET /vehicles`

---

## 2. Résultats des tests exécutés

### 2.1 Test de connexion API Odoo

| Endpoint | HTTP | Résultat |
|----------|------|----------|
| `GET /api/sale_odoo/v1/partners?limit=5` | 200 | ✅ OK (5 records) |
| `GET /api/sale_odoo/v1/vehicles?limit=5` | 403 | ❌ ACCESS_ERROR — permissions Parc automobile manquantes |
| `GET /api/sale_odoo/v1/sale_orders?limit=5` | 403 | ❌ ACCESS_ERROR — permissions Ventes manquantes |

### 2.2 Test A — Prospect FidelisPlus → Odoo (PUSH)

**Résultat**: ❌ ÉCHEC

1. ✅ Prospect créé dans FidelisPlus (ID 121, email valide)
2. ❌ `POST /api/sale_odoo/v1/partners` → HTTP 403
3. ❌ Le prospect n'apparaît PAS dans Odoo
4. ✅ Nettoyage effectué (prospect de test supprimé de FidelisPlus)

### 2.3 Test B — Prospect Odoo → FidelisPlus (PULL)

**Résultat**: ❌ ÉCHEC — impossibilité de créer le prospect de test dans Odoo (POST /partners → 403)

### 2.4 Test C — Client FidelisPlus → Odoo (PUSH)

**Résultat**: ❌ ÉCHEC — `PUT /partners/{id}` + `promote-to-customer` → HTTP 403

### 2.5 Test D — Client Odoo → FidelisPlus (PULL)

**Résultat**: ❌ ÉCHEC — POST /partners côté Odoo → 403

### 2.6 État de la base FidelisPlus

```
Total sociétés (incl. trash)   : 107
Avec odoo_partner_id           : 102
Sync status = failed           : 3
Sync status = NULL             : 104
```

---

## 3. Diagnostic racine

### ❌ PROBLÈME CRITIQUE — Permission "Contact/Création" manquante

L'utilisateur API Odoo ne peut PAS **créer** de partenaires (res.partner). Ceci bloque la synchronisation dans **les deux directions**.

**Groupes requis** (message Odoo) :
- Contact/Création
- Ventes/Administrateur
- Ventes/Utilisateur : mes documents seulement
- (Inventaire/Achats — optionnel)

### ❌ PROBLÈME — Permission "Ventes" manquante pour les devis

`GET /sale_orders` → 403

**Groupes requis** :
- Ventes/Administrateur
- Ventes/Utilisateur : mes documents seulement
- Comptabilité/Facturation (optionnel)

### ❌ PROBLÈME — Permission "Parc automobile" manquante pour la flotte

`GET /vehicles` → 403

**Groupes requis** :
- Parc automobile/Administrateur
- Parc automobile/Gestionnaire : Gérer tous les véhicules

### ❌ PROBLÈME — Bug HTTP 500 sur modified_since

`GET /partners?modified_since=2026-08-13T15:36:12+00:00` → 500

Impact : impossible de faire un pull incrémental. À corriger côté Odoo.

---

## 4. Configuration actuelle

```bash
# fidelis_plus/.env
ODOO_OUTBOUND_BASE_URL=https://preprod-mayelia.odoo-saas.veone.net
ODOO_OUTBOUND_TOKEN=foTcUtgNdL-qJPCFWQ5u6cb2YxMSbZ8ZBuzZIyzPETg
```

- Token API : **valide** pour la lecture des partners
- URL : **accessible**
- Authentification : header `X-API-Key`

---

## 5. Actions requises — Côté Odoo

### IMMÉDIAT (bloque tout)

Dans Odoo Preprod : **Paramètres → Utilisateurs et sociétés → Utilisateurs**
→ Utilisateur API : **moustapha.camara@cieria.com**

Ajouter les groupes d'accès :

| Groupe | Nécessité | Impact |
|--------|-----------|--------|
| **Contact / Création** | 🔴 CRITIQUE | Permet de créer prospects/clients (POST /partners) |
| **Ventes / Administrateur** | 🔴 HAUTE | Permet d'accéder aux devis (sale.order) |
| **Parc automobile / Administrateur** | 🔴 HAUTE | Permet d'accéder à la flotte (fleet.vehicle) |
| **Ventes / Utilisateur : mes documents seulement** | 🟠 MOYENNE | Complément Ventes |

### Ensuite

Corriger le bug HTTP 500 sur `modified_since` (parsing timestamp ISO 8601).

---

## 6. Plan de re-test après corrections

```bash
cd fidelis_plus
php sync_test_bidirectional.php
```

Ce script teste :
- **Test A** : Prospect FidelisPlus → Odoo (PUSH)
- **Test B** : Prospect Odoo → FidelisPlus (PULL)
- **Test C** : Client FidelisPlus → Odoo (PUSH)
- **Test D** : Client Odoo → FidelisPlus (PULL)

---

## 7. Fichiers de référence

| Fichier | Rôle |
|---------|------|
| `fidelis_plus/sync_test_bidirectional.php` | Script de test complet (à réutiliser après corrections) |
| `fidelis_plus/app/Services/Odoo/OdooClient.php` | Client HTTP Odoo |
| `fidelis_plus/app/Services/Odoo/OdooIngestService.php` | Ingestion des données Odoo → Fidelis |
| `fidelis_plus/app/Console/Commands/SyncFromOdoo.php` | Commande cron de pull |
| `fidelis_plus/app/Jobs/SyncCompanyToOdoo.php` | Job de push |

---

## 8. Contacts

- **Email API Odoo**: moustapha.camara@cieria.com
- **URL Preprod**: https://preprod-mayelia.odoo-saas.veone.net
- **Swagger**: https://preprod-mayelia.odoo-saas.veone.net/api/sale_odoo/docs

---

**Prochaine étape**: Transmettre à l'équipe Odoo la liste des permissions manquantes.
</｜｜DSML｜｜>
</write_to_file>