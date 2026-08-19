# Dictionnaire des données & Flux de transfert SIRA ↔ Fidelis Plus

Ce document liste l'ensemble des champs et données transférés entre **SIRA** (App mobile client) et **Fidelis Plus** (Marketing / Carte fidélité), sans intégration Odoo.

---

## 1. Flux Entrants (SIRA → Fidelis Plus)

Ces requêtes sont initiées par l'application mobile SIRA vers l'API de Fidelis Plus (`/api/v1/integrations/sira/*`).
L'authentification s'effectue via un jeton de service partagé dans l'en-tête `Authorization: Bearer {SIRA_API_TOKEN}`.

### 1.1 Inscription / Demande de carte fidélité
* **Route** : `POST /api/v1/integrations/sira/loyalty/register`
* **Description** : Permet à un client depuis l'app mobile SIRA de demander une carte fidélité ou d'associer un compte existant via son numéro de contact.

#### Requête JSON (Payload envoyé par SIRA)
| Champ | Type | Validation / Obligation | Description |
| :--- | :--- | :--- | :--- |
| `sira_client_id` | `string` | Requis, max 100 | Identifiant unique du client dans le système SIRA |
| `type` | `string` | Requis, `particulier` ou `entreprise` | Segment du client fidélité |
| `contact` | `string` | Requis, max 40 | Numéro de téléphone (clé de dédoublonnage) |
| `email` | `string` | Optionnel, email valide, max 190 | Adresse e-mail du client |
| `nom` | `string` | Requis si `type` = `particulier`, max 120 | Nom de famille du particulier |
| `prenom` | `string` | Requis si `type` = `particulier`, max 120 | Prénom du particulier |
| `nom_entreprise` | `string` | Requis si `type` = `entreprise`, max 190 | Raison sociale / Nom de l'entreprise |
| `registre_commerce` | `string` | Optionnel, max 80 | Numéro de registre de commerce |
| `nom_abonne` | `string` | Optionnel, max 190 | Nom de l'abonné / représentant |
| `fonction` | `string` | Optionnel, max 80 | Fonction du représentant dans l'entreprise |
| `vehicles` | `array` | Optionnel | Liste des véhicules du client (voir structure ci-dessous) |
| `vehicles.*.sira_vehicle_id` | `string` | Optionnel, max 100 | Identifiant unique du véhicule dans SIRA |
| `vehicles.*.registration` | `string` | Requis (si `vehicles` présent), max 30 | Numéro d'immatriculation |
| `vehicles.*.brand` | `string` | Optionnel, max 60 | Marque du véhicule |
| `vehicles.*.model` | `string` | Optionnel, max 60 | Modèle du véhicule |
| `vehicles.*.color` | `string` | Optionnel, max 40 | Couleur du véhicule |

#### Réponses JSON (Fidelis Plus → SIRA)

* **Cas 1 : Demande acceptée / déjà existante (HTTP 201 Created)**
  ```json
  {
    "status": "success",
    "message": "Carte fidélité créée.",
    "data": {
      "sira_client_id": "SIRA-12345",
      "display_name": "Aya KOUASSI",
      "card_number": "FID-00001234",
      "qr_payload": "eyJhbGciOi...",
      "points_balance": 0
    }
  }
  ```

* **Cas 2 : Nouvelle demande en attente de validation marketing (HTTP 202 Accepted)**
  ```json
  {
    "status": "pending",
    "message": "Demande reçue, en attente de validation."
  }
  ```

---

### 1.2 Synchronisation des véhicules
* **Route** : `PUT /api/v1/integrations/sira/loyalty/{siraClientId}/vehicles`
* **Description** : Envoi de l'état courant complet des véhicules d'un client. Fidelis Plus remplace l'ancienne liste par celle-ci (pas de gestion incrémentale).

#### Requête JSON (Payload envoyé par SIRA)
| Champ | Type | Validation / Obligation | Description |
| :--- | :--- | :--- | :--- |
| `vehicles` | `array` | Requis (présent) | Liste complète des véhicules actuellement enregistrés |
| `vehicles.*.sira_vehicle_id` | `string` | Optionnel, max 100 | Identifiant unique du véhicule dans SIRA |
| `vehicles.*.registration` | `string` | Requis, max 30 | Numéro d'immatriculation |
| `vehicles.*.brand` | `string` | Optionnel, max 60 | Marque du véhicule |
| `vehicles.*.model` | `string` | Optionnel, max 60 | Modèle du véhicule |
| `vehicles.*.color` | `string` | Optionnel, max 40 | Couleur du véhicule |

#### Réponse JSON (HTTP 200 OK)
```json
{
  "status": "success",
  "message": "Véhicules synchronisés.",
  "data": [
    {
      "registration": "AB-123-CD",
      "brand": "Toyota",
      "model": "Corolla",
      "color": "Blanc"
    }
  ]
}
```

---

### 1.3 Consultation de la carte & Solde
* **Route** : `GET /api/v1/integrations/sira/loyalty/{siraClientId}`
* **Description** : Récupération du solde des points, du QR code signé et du numéro de carte virtuelle.

#### Réponse JSON (HTTP 200 OK)
```json
{
  "status": "success",
  "data": {
    "sira_client_id": "SIRA-12345",
    "display_name": "Aya KOUASSI",
    "card_number": "FID-00001234",
    "qr_payload": "eyJhbGciOi...",
    "points_balance": 150
  }
}
```

---

### 1.4 Historique des scans / points
* **Route** : `GET /api/v1/integrations/sira/loyalty/{siraClientId}/history?per_page=20`
* **Description** : Liste paginée des scans de carte en station (crédits/débits de points).

#### Réponse JSON (HTTP 200 OK)
```json
{
  "status": "success",
  "data": [
    {
      "date": "2026-08-18T14:04:15Z",
      "points": 10,
      "station": "Station Mayelia Vridi",
      "vehicle_registration": "AB-123-CD",
      "vehicle_brand": "Toyota",
      "vehicle_color": "Blanc",
      "visit_type": "lavage"
    }
  ],
  "meta": {
    "current_page": 1,
    "last_page": 5,
    "total": 98
  }
}
```

---

## 2. Flux Sortants (Fidelis Plus → SIRA)

Ces requêtes sont initiées de manière asynchrone par Fidelis Plus (`SiraClient`) vers l'API SIRA.
L'authentification s'effectue via un jeton dans l'en-tête `Authorization: Bearer {SIRA_OUTBOUND_TOKEN}`.

### 2.1 Recherche d'un utilisateur par contact (Lookup)
* **Route** : `GET {SIRA_OUTBOUND_BASE_URL}/partners/fidelis/users/lookup?phone={phone}`
* **Description** : Vérifier si le numéro de contact du client guichet possède déjà un compte dans l'application SIRA.

#### Paramètre d'URL
* `phone` : Numéro de téléphone du client (ex: `+2250700112233`)

#### Réponse JSON attendue de SIRA (HTTP 200 OK)
| Champ | Type | Obligation | Description |
| :--- | :--- | :--- | :--- |
| `exists` | `boolean` | Requis | Indique si l'utilisateur existe déjà dans SIRA |
| `sira_client_id` | `string` | Requis si `exists` = true (nullable sinon) | Identifiant unique du client dans SIRA |

Exemple :
```json
{
  "exists": true,
  "sira_client_id": "SIRA-12345"
}
```

---

### 2.2 Provisioning / Création de compte utilisateur dans SIRA
* **Route** : `POST {SIRA_OUTBOUND_BASE_URL}/partners/fidelis/users`
* **Description** : Demande de création automatique d'un compte utilisateur sur SIRA lorsqu'un client est créé au guichet physique de Fidelis Plus.

#### Requête JSON (Payload envoyé par Fidelis Plus)
| Champ | Type | Obligation | Description |
| :--- | :--- | :--- | :--- |
| `type` | `string` | Requis | Segment du client fidélité (`particulier` ou `entreprise`) |
| `nom` | `string` | Requis si `type` = `particulier` (nullable sinon) | Nom de famille |
| `prenom` | `string` | Requis si `type` = `particulier` (nullable sinon) | Prénom |
| `nom_entreprise` | `string` | Requis si `type` = `entreprise` (nullable sinon) | Nom de l'entreprise |
| `contact` | `string` | Requis | Numéro de téléphone |
| `email` | `string` | Optionnel (nullable) | Adresse e-mail |

#### Réponse JSON attendue de SIRA (HTTP 200/201 OK)
| Champ | Type | Obligation | Description |
| :--- | :--- | :--- | :--- |
| `sira_client_id` | `string` | Requis | Identifiant unique généré pour ce client dans SIRA |
| `login` | `string` | Optionnel (nullable) | Identifiant de connexion (généralement l'e-mail ou le contact) |
| `temporary_password` | `string` | Optionnel (nullable) | Mot de passe temporaire généré pour la première connexion |

Exemple :
```json
{
  "sira_client_id": "SIRA-12345",
  "login": "aya@example.ci",
  "temporary_password": "TempPass123!"
}
```
