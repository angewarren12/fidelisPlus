export type VehicleStatus = 'jamais_controle' | 'a_jour' | 'bientot' | 'en_retard' | string;

/** Libellé humain pour un statut de conformité contrôle technique. */
export function vehicleStatusLabel(status: VehicleStatus): string {
  switch (status) {
    case 'a_jour': return 'À jour';
    case 'bientot': return 'Échéance proche';
    case 'en_retard': return 'Hors délai';
    case 'jamais_controle': return 'Jamais contrôlé';
    default: return 'Inconnu';
  }
}

/** Classes Tailwind (fond + texte) pour le badge de statut. */
export function vehicleStatusBadgeClass(status: VehicleStatus): string {
  switch (status) {
    case 'a_jour': return 'bg-primary-container/20 text-primary';
    case 'bientot': return 'bg-amber-100 text-amber-700';
    case 'en_retard': return 'bg-red-50 text-error';
    case 'jamais_controle': return 'bg-slate-100 text-slate-500';
    default: return 'bg-slate-100 text-slate-500';
  }
}
