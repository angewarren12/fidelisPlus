import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LayoutService {
  sidebarOpen = signal(false);

  /**
   * Émis après une synchronisation Odoo réussie.
   * Les composants (dashboard, quotes, clients…) s'abonnent à ce Subject
   * pour rafraîchir leurs données sans recharger la page.
   */
  readonly odooSync$ = new Subject<void>();

  toggleSidebar(): void {
    this.sidebarOpen.update(v => !v);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  triggerOdooDataRefresh(): void {
    this.odooSync$.next();
  }
}
