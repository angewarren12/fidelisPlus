import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { DashboardService, DashboardStats } from '../../services/dashboard.service';
import { RouterModule } from '@angular/router';
import { QuoteRequestModalComponent } from './quote-request-modal/quote-request-modal.component';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { downloadCsv } from '../../utils/csv-download';
import { buildDashboardStatsCsvRows } from '../../utils/dashboard-stats-export';
import { openReportPreviewWindow } from '../../utils/report-preview-window';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, BaseChartDirective, RouterModule, QuoteRequestModalComponent],
  template: `
    <div class="space-y-10 animate-fade-in pb-20" *ngIf="stats()">
      
      <!-- GREETING & HEADER -->
      <section class="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 class="text-3xl md:text-5xl font-headline font-black text-on-surface tracking-tighter">
            Bonjour, <span class="text-primary">{{ currentUser()?.first_name || 'Chargé daffaires' }}</span> 👋
          </h1>
          <p class="text-outline text-sm font-medium mt-2">Voici l'état de votre activité pour aujourd'hui.</p>
        </div>
        <div class="flex items-center gap-3">
          <div class="px-4 py-2 bg-surface-container rounded-xl border border-outline-variant/10 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
            <span class="text-[10px] font-black uppercase text-on-surface tracking-widest">{{ today | date:'dd MMMM yyyy' }}</span>
          </div>
        </div>
      </section>

      <!-- PREMIUM KPI ROW -->
      <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        
        <!-- KPI: Chiffre d'Affaires -->
        <div class="relative bg-[#1b1932] p-8 rounded-[2rem] overflow-hidden group shadow-2xl">
          <div class="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-[60px] -mr-16 -mt-16"></div>
          <div class="relative z-10">
            <div class="flex items-center justify-between mb-6">
               <span class="material-symbols-outlined text-primary text-3xl">payments</span>
               <span class="text-[10px] font-black text-secondary uppercase tracking-widest">+12%</span>
            </div>
            <p class="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Chiffre d'Affaires</p>
            <h3 class="text-3xl font-headline font-black text-white">{{ stats()?.revenue?.total_accepted | currency:'XOF':'symbol':'1.0-2' }}</h3>
          </div>
        </div>

        <!-- KPI: Portefeuille CRM (Clients vs Prospects) -->
        <div class="relative bg-white p-8 rounded-[2rem] border border-outline-variant/10 shadow-sm group">
          <div class="flex items-center justify-between mb-6">
             <span class="material-symbols-outlined text-tertiary text-3xl">group</span>
             <div class="text-right">
                <span class="block text-[10px] font-black text-secondary tracking-widest">{{ stats()?.crm?.conversion_rate }}% TAUX CONV.</span>
             </div>
          </div>
          <div class="flex items-end gap-1 mb-1">
             <h3 class="text-3xl font-headline font-black text-on-surface">{{ stats()?.crm?.total_clients }}</h3>
             <span class="text-outline text-xs font-bold pb-1.5">/ {{ stats()?.crm?.total_prospects }}</span>
          </div>
          <p class="text-outline/60 text-[10px] font-black uppercase tracking-[0.2em]">Clients vs Prospects</p>
        </div>

        <!-- KPI: Flotte à Risque -->
        <div class="relative bg-white p-8 rounded-[2rem] border-2 border-error/10 shadow-sm group">
          <div class="flex items-center justify-between mb-6">
             <span class="material-symbols-outlined text-error text-3xl">warning</span>
             <span class="text-[10px] font-black text-error uppercase tracking-widest">Urgent</span>
          </div>
          <p class="text-outline/60 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Véhicules en Retard</p>
          <h3 class="text-3xl font-headline font-black text-error">{{ stats()?.fleet?.en_retard }}</h3>
        </div>

      </section>

      <!-- MAIN CONTENT GRID -->
      <div class="grid grid-cols-12 gap-8">
        
        <!-- LEFT: CHART & INSIGHTS -->
        <div class="col-span-12 lg:col-span-8 space-y-8">
          <div class="bg-white rounded-[2.5rem] p-10 shadow-sm border border-outline-variant/5">
             <div class="flex items-center justify-between mb-10">
               <div>
                  <h3 class="text-xl font-headline font-black text-on-surface">Performance Opérationnelle</h3>
                  <p class="text-xs text-outline font-medium tracking-tight">Volume d'inspections sur les 7 derniers jours</p>
               </div>
               <div class="flex bg-surface-container rounded-xl p-1">
                 <button class="px-4 py-1.5 text-[10px] font-black uppercase rounded-lg bg-white shadow-sm text-on-surface">Semaine</button>
                 <button class="px-4 py-1.5 text-[10px] font-black uppercase rounded-lg text-outline">Mois</button>
               </div>
             </div>
             <div class="h-80 relative">
               <canvas baseChart [data]="chartData" [options]="chartOptions" [type]="'bar'"></canvas>
             </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div class="bg-surface-container-low p-8 rounded-[2rem] border border-outline-variant/10 flex items-center justify-between">
                <div>
                   <p class="text-[10px] font-black uppercase text-outline tracking-widest mb-1">Prospects Actifs</p>
                   <p class="text-3xl font-headline font-black text-on-surface">{{ stats()?.crm?.total_prospects }}</p>
                </div>
                <div class="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary">
                   <span class="material-symbols-outlined text-3xl">add_reaction</span>
                </div>
             </div>
             <div class="bg-surface-container-low p-8 rounded-[2rem] border border-outline-variant/10 flex items-center justify-between">
                <div>
                   <p class="text-[10px] font-black uppercase text-outline tracking-widest mb-1">Devis à Relancer</p>
                   <p class="text-3xl font-headline font-black text-on-surface">{{ stats()?.revenue?.new_quotes_count }}</p>
                </div>
                <div class="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-secondary">
                   <span class="material-symbols-outlined text-3xl">send</span>
                </div>
             </div>
          </div>
        </div>

        <!-- RIGHT: ACTION CENTER & ALERTS -->
        <div class="col-span-12 lg:col-span-4 space-y-8">
           <div class="bg-[#1b1932] rounded-[2.5rem] p-10 shadow-2xl text-white">
              <h3 class="text-xl font-headline font-black mb-8 flex items-center gap-3">
                Action Center <span class="w-2 h-2 rounded-full bg-error"></span>
              </h3>
              
              <div class="space-y-6">
                 
                 <!-- Alert: Late Vehicles -->
                 <div class="p-6 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group cursor-pointer" [routerLink]="['/fleet']" [queryParams]="{ priority: '1' }">
                    <div class="flex items-start gap-4">
                       <div class="w-12 h-12 rounded-2xl bg-error/20 text-error flex items-center justify-center shrink-0">
                          <span class="material-symbols-outlined text-2xl">history</span>
                       </div>
                       <div>
                          <h4 class="text-sm font-black mb-1">Mises à jour prioritaires</h4>
                          <p class="text-[10px] text-white/40 leading-relaxed">{{ stats()?.alerts?.overdue_vehicles }} véhicules ont dépassé leur date de visite prévue.</p>
                       </div>
                    </div>
                 </div>

                 <!-- Alert: Pending Requests -->
                 <div class="p-6 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group cursor-pointer" (click)="showQuoteRequests.set(true)">
                    <div class="flex items-start gap-4">
                       <div class="w-12 h-12 rounded-2xl bg-secondary/20 text-secondary flex items-center justify-center shrink-0">
                          <span class="material-symbols-outlined text-2xl">signature</span>
                       </div>
                       <div>
                          <h4 class="text-sm font-black mb-1">Demandes de devis</h4>
                          <p class="text-[10px] text-white/40 leading-relaxed">{{ stats()?.alerts?.pending_requests }} demandes de devis reçues en attente.</p>
                       </div>
                    </div>
                 </div>

                 <div class="pt-8 mt-6 border-t border-white/5">
                    <button type="button" (click)="exportRapportHebdo()" class="w-full py-4 rounded-2xl bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">
                       Exporter rapport hebdo
                    </button>
                 </div>
              </div>
           </div>
        </div>

      </div>

      <!-- BOTTOM: AGENDA SECTION -->
      <section class="bg-white rounded-[2.5rem] p-10 shadow-sm border border-outline-variant/5">
         <div class="flex items-center justify-between mb-10">
            <div>
               <h3 class="text-2xl font-headline font-black text-on-surface">Agenda du Jour</h3>
               <p class="text-xs text-outline font-medium tracking-tight">Rendez-vous programmés pour aujourd'hui</p>
            </div>
            <span class="text-[10px] font-black uppercase text-outline/50">Vue synthétique</span>
         </div>

         <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            <div *ngFor="let apt of stats()?.agenda" class="p-6 rounded-[2rem] bg-surface-container-low border border-outline-variant/5 flex flex-col gap-6 group hover:border-primary/20 transition-all">
               <div class="flex items-center justify-between">
                  <span class="text-xl font-headline font-black text-primary">{{ apt.appointment_date | date:'HH:mm' }}</span>
                  <span class="px-3 py-1 bg-white rounded-full text-[9px] font-black uppercase tracking-widest text-outline border border-outline-variant/10 shadow-sm">Confirmé</span>
               </div>
               <div>
                  <h4 class="font-black text-on-surface mb-1">{{ apt.company?.name || 'Client Direct' }}</h4>
                  <p class="text-xs text-outline font-medium">{{ apt.vehicle?.brand }} {{ apt.vehicle?.model }} — {{ apt.vehicle?.license_plate }}</p>
               </div>
               <div class="flex items-center gap-2 pt-2 border-t border-outline-variant/10">
                  <span class="material-symbols-outlined text-sm text-outline">location_on</span>
                  <span class="text-[10px] font-bold text-outline">{{ apt.station?.name || 'Centre Principal' }}</span>
               </div>
            </div>

            <div *ngIf="!stats()?.agenda?.length" class="col-span-full py-20 flex flex-col items-center justify-center bg-surface-container text-outline/30 rounded-[2rem] border border-dashed border-outline-variant/20 italic">
               <span class="material-symbols-outlined text-5xl mb-3">event_busy</span>
               Aucun rendez-vous aujourd'hui.
            </div>

         </div>
      </section>

      <!-- MODALS -->
      <app-quote-request-modal 
        *ngIf="showQuoteRequests()" 
        (close)="showQuoteRequests.set(false)">
      </app-quote-request-modal>

    </div>
  `,
  styles: [`
    :host { display: block; background: #fbfbfd; min-height: 100vh; }
    .animate-fade-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class DashboardComponent implements OnInit {
  stats = signal<DashboardStats | null>(null);
  showQuoteRequests = signal(false);
  today = new Date();

  private dashboardService = inject(DashboardService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  currentUser = computed(() => this.authService.getCurrentUser());

  // Chart configuration with premium aesthetics
  public chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1b1932',
        padding: 12,
        cornerRadius: 12,
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 }
      }
    },
    scales: {
      y: { display: false, beginAtZero: true },
      x: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 10, weight: 'bold' }, color: '#94a3b8' } }
    }
  };

  public chartData: ChartData<'bar'> = {
    labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
    datasets: [{
      data: [12, 19, 15, 25, 22, 18, 12],
      backgroundColor: '#006B5D',
      hoverBackgroundColor: '#004D40',
      borderRadius: 12,
      barThickness: 32
    }]
  };

  ngOnInit(): void {
    this.dashboardService.getStats().subscribe({
      next: (data) => {
        this.stats.set(data);
        if (data.inspections_weekly && Array.isArray(data.inspections_weekly)) {
          this.chartData = {
            labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
            datasets: [{
              data: data.inspections_weekly,
              backgroundColor: '#006B5D',
              hoverBackgroundColor: '#004D40',
              borderRadius: 12,
              barThickness: 32
            }]
          };
        }
      },
      error: (err) => {
        console.error('Dashboard Stats Error', err);
        this.toastService.error('Impossible de charger le tableau de bord.');
      },
    });
  }

  exportRapportHebdo(): void {
    const s = this.stats();
    if (!s) {
      this.toastService.error('Données non disponibles.');
      return;
    }
    const u = this.currentUser();
    const subject = u ? `${u.first_name} ${u.last_name}`.trim() : '';
    openReportPreviewWindow({
      title: 'Rapport hebdomadaire (dashboard)',
      subject: subject || 'Synthèse globale',
      meta: [
        { label: 'Période', value: '7 derniers jours (actuel)' },
      ],
      kpis: [
        { label: 'CA acceptés', value: `${s.revenue?.total_accepted ?? 0} XOF`, accent: 'brand' },
        { label: 'Clients', value: String(s.crm?.total_clients ?? 0), accent: 'neutral' },
        { label: 'Prospects', value: String(s.crm?.total_prospects ?? 0), accent: 'neutral' },
      ],
      tableTitle: 'Indicateurs',
      columns: ['Indicateur', 'Valeur'],
      rows: [
        { label: 'Devis envoyés', value: String(s.revenue?.new_quotes_count ?? 0) },
        { label: 'Taux conversion', value: `${s.crm?.conversion_rate ?? 0}%` },
        { label: 'Flotte à jour', value: String(s.fleet?.a_jour ?? 0) },
        { label: 'Flotte bientôt', value: String(s.fleet?.bientot ?? 0) },
        { label: 'Flotte en retard', value: String(s.fleet?.en_retard ?? 0), hint: 'À traiter en priorité' },
        { label: 'Demandes devis en attente', value: String(s.alerts?.pending_requests ?? 0) },
        { label: 'RDV du jour', value: String(Array.isArray(s.agenda) ? s.agenda.length : 0) },
      ],
    });
    const rows = buildDashboardStatsCsvRows(s, {
      title: 'Rapport hebdomadaire (synthèse dashboard)',
      subjectLabel: subject || undefined,
    });
    downloadCsv(`rapport_dashboard_${new Date().toISOString().slice(0, 10)}`, rows);
    this.toastService.success('Aperçu ouvert + CSV téléchargé.');
  }
}
