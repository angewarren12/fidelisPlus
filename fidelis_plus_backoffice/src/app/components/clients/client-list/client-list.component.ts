import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AccountService } from '../../../services/account.service';
import { ToastService } from '../../../services/toast.service';
import { downloadCsv } from '../../../utils/csv-download';
import { openReportPreviewWindow } from '../../../utils/report-preview-window';

@Component({
  selector: 'app-client-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="animate-fade-in-up">
      <!-- Filter Bar -->
      <section class="mb-8 bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-4 flex flex-wrap items-center gap-4 border border-surface-container/30">
        <div class="flex-1 min-w-[200px]">
          <div class="relative">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">filter_list</span>
            <select class="w-full pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-lg text-sm font-medium appearance-none">
              <option>Statut: Tous</option>
              <option>Nouveau</option>
              <option>Ancien</option>
              <option>Inactif</option>
            </select>
          </div>
        </div>
        <div class="flex-1 min-w-[200px]">
          <select class="w-full px-4 py-2 bg-surface-container-low border-none rounded-lg text-sm font-medium appearance-none">
            <option>Nombre de véhicules</option>
            <option>1-5</option>
            <option>6-20</option>
            <option>20+</option>
          </select>
        </div>
        <div class="flex-1 min-w-[200px]">
          <select class="w-full px-4 py-2 bg-surface-container-low border-none rounded-lg text-sm font-medium appearance-none">
            <option>Station d'inspection</option>
            <option>Abidjan Nord</option>
            <option>Abidjan Sud</option>
            <option>Yamoussoukro</option>
          </select>
        </div>
        <div class="flex-1 min-w-[200px]">
          <select class="w-full px-4 py-2 bg-surface-container-low border-none rounded-lg text-sm font-medium appearance-none">
            <option>Dernière activité</option>
            <option>Aujourd'hui</option>
            <option>Cette semaine</option>
            <option>Ce mois</option>
          </select>
        </div>
        <div class="flex items-center gap-3 ml-auto">
          <button type="button" (click)="exportClientsCsv()" class="px-5 py-2 border-2 border-outline-variant text-on-surface font-bold text-sm rounded-xl hover:bg-surface-container transition-colors flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px]">download</span>
            Exporter
          </button>
          <button routerLink="/clients/nouveau" class="px-5 py-2 bg-[#15b9a3] hover:brightness-110 text-white font-bold text-sm rounded-xl shadow-lg shadow-[#15b9a3]/20 active:scale-95 transition-all flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px]">person_add</span>
            Nouveau client
          </button>
        </div>
      </section>

      <!-- Stats Overview (Asymmetric/Bento element) -->
      <div class="grid grid-cols-12 gap-6 mb-8">
        <div class="col-span-12 lg:col-span-8 bg-gradient-to-br from-[#1a1831] to-[#2a2745] p-6 rounded-xl text-white relative overflow-hidden shadow-sm">
          <div class="relative z-10">
            <h2 class="text-2xl font-headline font-extrabold mb-1">Portefeuille Clients</h2>
            <p class="text-white/60 text-sm mb-6">Performance de rétention et croissance mensuelle.</p>
            <div class="flex flex-wrap gap-12">
              <div>
                <p class="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Total Actifs</p>
                <p class="text-3xl font-headline font-extrabold text-[#15b9a3]">{{ clients().length }}</p>
              </div>
              <div>
                <p class="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Nouveaux (Mois)</p>
                <p class="text-3xl font-headline font-extrabold">+1</p>
              </div>
              <div>
                <p class="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Taux de Visite</p>
                <p class="text-3xl font-headline font-extrabold">87%</p>
              </div>
            </div>
          </div>
          <!-- Decorative background elements -->
          <div class="absolute -right-10 -bottom-10 w-64 h-64 bg-primary-container/10 rounded-full blur-3xl"></div>
          <div class="absolute right-12 top-6">
            <span class="material-symbols-outlined text-white/10 text-[120px]">analytics</span>
          </div>
        </div>
        <div class="col-span-12 lg:col-span-4 bg-white p-6 rounded-xl shadow-sm border border-surface-container/30 border-l-4 border-l-secondary">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-bold text-outline uppercase tracking-wider">Alerte Inactivité</h3>
            <span class="material-symbols-outlined text-secondary">trending_down</span>
          </div>
          <p class="text-3xl font-headline font-extrabold text-on-background mb-1">0</p>
          <p class="text-xs text-outline mb-4">Clients n'ont pas visité depuis 6+ mois</p>
          <button class="w-full py-2 bg-secondary-container/30 text-secondary text-xs font-bold rounded-lg hover:bg-secondary-container/50 transition-colors">
            Lancer une campagne de rappel
          </button>
        </div>
      </div>

      <!-- Main Data Table -->
      <div class="bg-white rounded-xl shadow-sm border border-surface-container/30 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-surface-container-low border-b border-outline-variant/30">
                <th class="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest">Nom entreprise</th>
                <th class="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest">Correspondant</th>
                <th class="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest text-center">Flotte</th>
                <th class="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest">Dernière visite</th>
                <th class="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest">Statut</th>
                <th class="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant/10">
              <tr *ngFor="let c of clients()" [routerLink]="['/clients', c.id]" class="hover:bg-surface-container-low/50 transition-colors group cursor-pointer">
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface font-bold">
                      {{ c.name.substring(0, 2).toUpperCase() }}
                    </div>
                    <div>
                      <p class="text-sm font-bold text-on-surface">{{ c.name }}</p>
                      <p class="text-xs text-outline">ID: CLI-{{ c.id * 1000 }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div>
                    <p class="text-sm font-semibold text-on-surface">
                      <ng-container *ngIf="c.contacts && c.contacts.length > 0; else noContact">
                        {{ c.contacts[0].first_name }} {{ c.contacts[0].last_name }}
                      </ng-container>
                      <ng-template #noContact><span class="text-xs text-outline italic">Aucun contact</span></ng-template>
                    </p>
                    <p class="text-xs text-outline mt-0.5">{{ c.phone || c.contacts?.[0]?.phone || '—' }}</p>
                    <p class="text-[10px] text-outline/60 mt-0.5">{{ c.email || '—' }}</p>
                  </div>
                </td>
                <td class="px-6 py-4 text-center">
                  <span class="px-2.5 py-1 bg-surface-container text-on-surface-variant rounded-full text-xs font-bold">{{ c.vehicles_count || 0 }}</span>
                </td>
                <td class="px-6 py-4 text-sm font-medium">{{ (c.last_contact || c.created_at) | date:'shortDate' }}</td>
                <td class="px-6 py-4">
                  <span class="px-3 py-1 bg-primary-container/20 text-primary rounded-full text-[11px] font-bold uppercase tracking-wider">Actif</span>
                </td>
                <td class="px-6 py-4 text-right">
                  <button class="p-2 text-outline hover:text-primary transition-colors opacity-0 group-hover:opacity-100">
                    <span class="material-symbols-outlined">more_vert</span>
                  </button>
                </td>
              </tr>
              
              <!-- Loading -->
              <tr *ngIf="loading()">
                <td colspan="6" class="px-6 py-16 text-center">
                  <span class="material-symbols-outlined animate-spin text-primary text-4xl">sync</span>
                  <p class="text-outline font-medium mt-2">Chargement des clients...</p>
                </td>
              </tr>
              <!-- Empty -->
              <tr *ngIf="!loading() && clients().length === 0">
                <td colspan="6" class="px-6 py-20 text-center">
                  <span class="material-symbols-outlined text-6xl text-outline/30 block mb-3">group_off</span>
                  <p class="text-on-surface font-bold text-lg mb-1">Aucun client trouvé</p>
                  <p class="text-outline text-sm mb-6">Convertissez un prospect chaud ou créez un client directement.</p>
                  <button routerLink="/clients/nouveau" class="px-6 py-2 bg-primary text-white font-bold text-sm rounded-xl hover:brightness-110 transition-all inline-flex items-center gap-2">
                    <span class="material-symbols-outlined text-sm">person_add</span>
                    Créer un client
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class ClientListComponent implements OnInit {
  // Angular Signals — requis en mode zoneless (Angular 21 sans zone.js)
  clients = signal<any[]>([]);
  loading = signal(true);

  private accountService = inject(AccountService);
  private toastService = inject(ToastService);

  exportClientsCsv(): void {
    const list = this.clients();
    if (!list.length) {
      this.toastService.error('Aucun client à exporter.');
      return;
    }
    openReportPreviewWindow({
      title: 'Export clients',
      subject: 'Liste courante',
      meta: [{ label: 'Total', value: String(list.length) }],
      kpis: [
        { label: 'Clients', value: String(list.length), accent: 'brand' },
        {
          label: 'Véhicules (somme)',
          value: String(list.reduce((sum: number, c: any) => sum + (c.vehicles_count ?? 0), 0)),
          accent: 'neutral',
        },
        { label: 'Période', value: 'Vue actuelle', accent: 'neutral' },
      ],
      tableTitle: 'Clients',
      columns: ['Client', 'Flotte'],
      rows: list.map((c: any) => {
        const ct = c.contacts?.[0];
        const contactName = ct ? `${ct.first_name ?? ''} ${ct.last_name ?? ''}`.trim() : '';
        return {
          label: `${c.name ?? ''}`.trim(),
          value: String(c.vehicles_count ?? 0),
          hint: `${contactName || '—'} • ${ct?.phone ?? '—'} • dernière activité: ${c.last_contact ?? c.created_at ?? '—'}`,
        };
      }),
    });
    const header = ['ID', 'Nom entreprise', 'Contact principal', 'Téléphone', 'Véhicules', 'Dernière activité'];
    const rows: (string | number)[][] = [
      header,
      ...list.map((c: any) => {
        const ct = c.contacts?.[0];
        const contactName = ct ? `${ct.first_name ?? ''} ${ct.last_name ?? ''}`.trim() : '';
        return [
          c.id,
          c.name ?? '',
          contactName,
          ct?.phone ?? '',
          c.vehicles_count ?? 0,
          c.last_contact ?? c.created_at ?? '',
        ];
      }),
    ];
    downloadCsv(`clients_${new Date().toISOString().slice(0, 10)}`, rows);
    this.toastService.success('Aperçu ouvert + CSV téléchargé.');
  }

  ngOnInit() {
    this.accountService.getClients().subscribe({
      next: (data) => {
        this.clients.set(data);
        this.loading.set(false);
        console.log('[Clients] Données reçues:', data);
      },
      error: (err) => {
        this.loading.set(false);
        console.error('[Clients] Erreur:', err);
      }
    });
  }
}
