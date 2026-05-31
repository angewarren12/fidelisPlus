# Inventaire exports / rapports / PDF

Généré dans le cadre du plan « Performances commerciale et stratégie rapports ». Mise à jour du code : avril 2026.

## Backoffice Angular (`src/app`)

| Emplacement | Type | Implémentation |
|-------------|------|----------------|
| `components/dashboard/dashboard.component.ts` | Rapport hebdo (CSV) | `exportRapportHebdo()` — `buildDashboardStatsCsvRows` + `downloadCsv` |
| `components/team/commercial-performance/commercial-performance.component.ts` | Rapport commercial (CSV) | `exportRapport()` — mêmes helpers |
| `components/fleet/fleet-list/fleet-list.component.ts` | CSV flotte | `exportFleetCsv()` — page courante + filtres actifs |
| `components/clients/client-list/client-list.component.ts` | CSV clients | `exportClientsCsv()` — liste chargée |
| `components/vente/quote-preview-modal/quote-preview-modal.component.ts` | Impression devis | `printDevis()` — `window.print()` + styles `@media print` |
| `components/vente/quote-form/quote-form.component.ts` | Aperçu « PDF » | Modal HTML (pas de PDF binaire) |
| `components/vente/quote-list/quote-list.component.ts` | Aperçu visuel devis | Ouverture modal (libellé PDF visuel) |
| `components/clients/vehicle-form.component.ts` | Upload | Accept `image/*,.pdf` (pièces jointes) |
| `components/clients/vehicle-detail.component.ts` | Upload | Idem |

### Utilitaires partagés

- `utils/csv-download.ts` — `downloadCsv` (UTF-8 BOM, séparateur `;`)
- `utils/dashboard-stats-export.ts` — `buildDashboardStatsCsvRows` (données alignées sur `DashboardService`)

### Hors périmètre MVP (évolutions possibles)

- PDF binaire côté serveur (Laravel Dompdf / Browsershot)
- Export CSV flotte « tout le parc » paginé côté API
- `jspdf` / `html2canvas` (non présents dans le projet)

## API Laravel (`fidelis_plus/routes/api.php`)

Données consommées par les exports front (pas de route `GET .../export` dédiée au MVP) :

| Préfixe / route | Contrôleur | Usage export |
|-----------------|------------|--------------|
| `GET /api/v1/stats/dashboard` | `StatsController@getDashboardStats` | KPI dashboard / performances (`?commercial_id=` réservé admin) |
| `GET /api/v1/vehicles` | `VehicleController@index` | Liste flotte (export CSV page = données déjà chargées) |
| `GET /api/v1/accounts` (clients) | `AccountController@index` | Liste clients |
| `GET /api/v1/team/{id}` | `TeamController@show` | Fiche commercial (performances) |

Autres routes utiles contexte documents : `POST .../vehicles/{id}/documents`, modèle `Visit` (`report_pdf_url` — app mobile / visites).

## MVP retenu (implémenté)

1. **Impression devis** — `window.print()` + masquage en-tête / fond à l’impression.
2. **CSV synthèse** — dashboard + performances commercial (même schéma d’indicateurs).
3. **CSV listes** — flotte (page courante), clients (liste courante).

Évolution recommandée : préfixe API `GET /api/v1/reports/...` pour gros volumes et archivage serveur.
