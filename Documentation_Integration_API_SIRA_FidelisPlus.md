# 📖 Documentation d'Intégration API — FidelisPlus ↔ SIRA
**Environnement de Préproduction**  
*Version : 1.0 — Septembre 2026*

---

## 🛠️ 1. Informations Générales & Accès

### 🌐 Endpoints & Authentification
* **URL de Base API Préprod :** `https://fidelisplus.cieria-app.com/api/v1/integrations/sira`
* **Type d'authentification :** Bearer Token (Jeton de service)
* **Header requis sur toutes les requêtes :**
  ```http
  Authorization: Bearer 17bdc798acf522aaf2a5f09698b5d1f69c2510524a944de4
  Accept: application/json
  Content-Type: application/json
  ```
* **Limitation de débit (Rate Limit) :** 120 requêtes / minute

---

### 🔑 Accès Backoffice FidelisPlus (pour validations manuelles)
Pour tester le flux d'approbation manuelle des cartes fidélité (Parcours 1) :
* **URL du Backoffice :** `https://fidelisplus.cieria-app.com`
* **Identifiant (Email) :** `olivier.loukou@cieria.com`
* **Rôle :** Admin Marketing (`admin_marketing`)
* **Accès aux validations :** Menu de gauche → **Marketing / FidelisPlus** → **Demandes SIRA**

---

## 📦 2. Fichiers de Test Fournis

Vous avez reçu deux éléments complémentaires :
1. **`FidelisPlus_SIRA_Postman_Preprod.json`** : Collection Postman complète avec les 4 dossiers d'endpoints et tous les jeux de données mockés.
2. **Ce document (`Documentation_Integration_API_SIRA_FidelisPlus.md`)** : Guide technique complet et contrats d'interfaces.

---

## 🧪 3. Jeu de Données Pré-chargé en Préproduction

Pour simplifier vos tests, un jeu de données initial (Seeder) a été injecté sur la préproduction :

| `sira_client_id` | Type | Statut actuel | Numéro Carte / Solde | Usage dans Postman |
|---|---|---|---|---|
| `SIRA-DEV-TEST-001` | Particulier | **Validated** (Approuvé) | Carte `FID-0042` — Solde : **150 pts** | Test **GET /loyalty/{id}** (200 OK) et **GET /history** (Passages) |
| `SIRA-DEV-PART-001` | Particulier | **Pending** (En attente) | Pas encore activée | Test **GET /loyalty/{id}** (202 Pending) et Validation Backoffice |
| `SIRA-DEV-ENT-002` | Entreprise | **Pending** (En attente) | Pas encore activée | Test **Flotte Entreprise** et Validation Backoffice |
| `SIRA-INEXISTANT-99999` | Inexistant | N/A | N/A | Test des erreurs **404 Not Found** |

---

## 🚀 4. Déroulé et Ordre des Tests Postman

La collection Postman est structurée en **4 dossiers chronologiques** :

```
📁 FidelisPlus ↔ SIRA
 ├── 📂 A — Demande / Activation (POST /loyalty/register)
 ├── 📂 B — Consultation Carte & QR Code (GET /loyalty/{siraClientId})
 ├── 📂 C — Synchronisation Flotte Véhicules (PUT /loyalty/{siraClientId}/vehicles)
 └── 📂 D — Historique des Points & Passages (GET /loyalty/{siraClientId}/history)
```

---

### 📂 Dossier A : Demande & Inscription (`POST /loyalty/register`)
Permet à l'application SIRA d'inscrire un client ou de demander une carte fidélité Fidelis.

#### 1. Inscription Particulier (`A1`)
* **Endpoint :** `POST /loyalty/register`
* **Payload Request :**
```json
{
  "sira_client_id": "SIRA-DEV-PART-001",
  "type": "particulier",
  "contact": "+2250700000001",
  "email": "jean.kouassi@test-sira.ci",
  "nom": "KOUASSI",
  "prenom": "Jean-Baptiste",
  "vehicles": [
    {
      "sira_vehicle_id": "V-PART-101",
      "registration": "9900-AA-01",
      "brand": "TOYOTA",
      "model": "Corolla",
      "color": "Gris Métallisé"
    }
  ]
}
```
* **Réponse attendue (`202 Accepted`) :**
```json
{
  "status": "pending",
  "message": "Demande reçue, en attente de validation."
}
```

#### 2. Inscription Entreprise / Flotte (`A2`)
* **Payload Request :**
```json
{
  "sira_client_id": "SIRA-DEV-ENT-002",
  "type": "entreprise",
  "contact": "+2250707070707",
  "email": "fleet@transports-ci.com",
  "nom_entreprise": "TRANSPORTS ABIDJAN SARL",
  "vehicles": [
    {
      "sira_vehicle_id": "V-ENT-201",
      "registration": "3300-CC-01",
      "brand": "MERCEDES",
      "model": "Sprinter",
      "color": "Blanc"
    }
  ]
}
```

---

### 📂 Dossier B : Consultation Carte & QR Code (`GET /loyalty/{siraClientId}`)
Permet à l'app SIRA d'afficher la carte virtuelle, le QR Code et le solde de points.

#### 1. Cas Compte Validé (`B1`)
* **Endpoint :** `GET /loyalty/SIRA-DEV-TEST-001`
* **Réponse (`200 OK`) :**
```json
{
  "status": "success",
  "data": {
    "sira_client_id": "SIRA-DEV-TEST-001",
    "display_name": "Jean KOUASSI",
    "card_number": "FID-0042",
    "qr_payload": "2z7vTA6uxC0JzXWiywIacrev-Z45...",
    "points_balance": 150
  }
}
```
> 💡 **Remarque Intégration QR Code :** La valeur `qr_payload` est une chaîne signée. Passez-la directement telle quelle dans votre générateur QR Code frontend (`react-native-qrcode-svg`, `qr_code_flutter`, etc.).

#### 2. Cas Compte En Attente (`B2`)
* **Endpoint :** `GET /loyalty/SIRA-DEV-PART-001`
* **Réponse (`202 Accepted`) :**
```json
{
  "status": "pending",
  "message": "Demande reçue, en attente de validation."
}
```

---

### 📂 Dossier C : Synchronisation Flotte Véhicules (`PUT /loyalty/{siraClientId}/vehicles`)
Synchronise l'état du garage virtuel SIRA vers FidelisPlus.

> ⚠️ **IMPORTANT (State-Sync) :** Transmettez **toujours la liste complète et actuelle** des véhicules du client. FidelisPlus effectue un remplacement d'état (les véhicules absents du tableau sont retirés, les nouveaux sont ajoutés).

* **Endpoint :** `PUT /loyalty/SIRA-DEV-PART-001/vehicles`
* **Payload Request :**
```json
{
  "vehicles": [
    {
      "sira_vehicle_id": "V-PART-101",
      "registration": "9900-AA-01",
      "brand": "TOYOTA",
      "model": "Corolla",
      "color": "Gris Métallisé"
    },
    {
      "sira_vehicle_id": "V-PART-NEW-103",
      "registration": "6677-FF-01",
      "brand": "HYUNDAI",
      "model": "Tucson",
      "color": "Noir"
    }
  ]
}
```
* **Réponse (`200 OK`) :**
```json
{
  "status": "success",
  "message": "Véhicules synchronisés.",
  "data": [ ... ]
}
```

---

### 📂 Dossier D : Historique des Passages & Points (`GET /loyalty/{siraClientId}/history`)
Récupère l'historique paginé des visites en station et des crédits de points.

* **Endpoint :** `GET /loyalty/SIRA-DEV-TEST-001/history?page=1&per_page=20`
* **Réponse (`200 OK`) :**
```json
{
  "status": "success",
  "data": [
    {
      "date": "2026-09-02T10:15:00.000000Z",
      "points": 10,
      "station": "[TEST] Station Abidjan Plateau",
      "vehicle_registration": "9900-XX-01",
      "vehicle_brand": "TOYOTA",
      "vehicle_color": "Gris",
      "visit_type": "Vignette"
    }
  ],
  "meta": {
    "current_page": 1,
    "last_page": 1,
    "total": 3
  }
}
```

---

## 🚦 5. Codes Erreurs HTTP et Formats

| Code HTTP | Libellé | Signification |
|---|---|---|
| `200 OK` | Succès | Opération traitée avec succès |
| `201 Created` | Création | Carte/Membre créé et immédiatement actif |
| `202 Accepted` | En Attente | Demande enregistrée, en attente de validation marketing |
| `401 Unauthorized` | Non Autorisé | Token Bearer absent ou invalide |
| `404 Not Found` | Introuvable | `sira_client_id` non enregistré dans FidelisPlus |
| `422 Unprocessable` | Validation | Format JSON incorrect ou champs obligatoires manquants |
| `429 Too Many Req.` | Rate Limit | Plus de 120 requêtes envoyées dans la même minute |

---

## 📩 Support Technique
Pour toute question d'intégration ou problème d'accès, contactez l'équipe technique FidelisPlus.
