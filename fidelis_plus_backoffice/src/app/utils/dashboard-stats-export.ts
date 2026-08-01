import type { DashboardStats } from '../services/dashboard.service';

/** Lignes CSV (indicateurs synthèse dashboard / performances). */
export function buildDashboardStatsCsvRows(
  stats: DashboardStats,
  options: { title: string; subjectLabel?: string }
): (string | number)[][] {
  const { title, subjectLabel } = options;
  const rows: (string | number)[][] = [
    ['Titre', title],
    ['Date export', new Date().toISOString()],
  ];
  if (subjectLabel) rows.push(['Sujet', subjectLabel]);
  rows.push(
    [],
    ['Indicateur', 'Valeur'],
    ['CA devis acceptés (XOF)', stats.revenue?.total_accepted ?? 0],
    ['Devis statut envoyé (nombre)', stats.revenue?.new_quotes_count ?? 0],
    ['Prospects (nombre)', stats.crm?.total_prospects ?? 0],
    ['Clients (nombre)', stats.crm?.total_clients ?? 0],
    ['Taux conversion (%)', stats.crm?.conversion_rate ?? 0],
    ['Flotte à jour (nombre)', stats.fleet?.a_jour ?? 0],
    ['Flotte bientôt (nombre)', stats.fleet?.bientot ?? 0],
    ['Flotte en retard (nombre)', stats.fleet?.en_retard ?? 0],
    ['Flotte jamais contrôlée (nombre)', stats.fleet?.jamais_controle ?? 0],
    ['Alertes véhicules en retard (nombre)', stats.alerts?.overdue_vehicles ?? 0],
    ['Demandes devis en attente (nombre)', stats.alerts?.pending_requests ?? 0]
  );
  return rows;
}
