import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { VehicleService } from '../../../services/vehicle.service';
import { ToastService } from '../../../services/toast.service';
import { vehicleStatusLabel, vehicleStatusBadgeClass } from '../../../utils/vehicle-status';

@Component({
  selector: 'app-client-vehicle-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="max-w-7xl mx-auto px-6 py-8 animate-fade-in" *ngIf="vehicle()">

      <!-- HEADER -->
      <header class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div class="space-y-4">
          <nav class="flex items-center gap-2 text-[10px] font-bold text-outline/40 uppercase tracking-widest">
            <a routerLink="/client/fleet" class="hover:text-primary transition-colors">Ma Flotte</a>
            <span class="material-symbols-outlined text-[10px]">chevron_right</span>
            <span class="text-outline/70">{{ vehicle().license_plate }}</span>
          </nav>

          <div class="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
            <h1 class="text-4xl md:text-6xl font-headline font-black text-on-surface tracking-tighter">
              {{ vehicle().brand || 'Véhicule' }} <span class="text-outline/20 font-medium">{{ vehicle().model }}</span>
            </h1>
            <div class="flex items-center gap-2 h-fit bg-surface-container rounded-lg px-4 py-2 border border-outline-variant/10">
               <span class="text-2xl font-mono font-black text-on-surface tracking-tighter">{{ vehicle().license_plate }}</span>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest" [ngClass]="statusBadgeClass(vehicle().status)">
              <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
              {{ statusLabel(vehicle().status) }}
            </span>
            <span class="text-[10px] text-outline font-bold uppercase tracking-widest border-l border-outline-variant/20 pl-3">
              {{ vehicle().fuel_type || 'Thermique' }} • {{ vehicle().year || 'N/A' }}
            </span>
          </div>
        </div>

        <div class="flex gap-3">
          <button type="button" (click)="openVisitModal()" [disabled]="recordingVisit()"
                  class="h-12 px-6 rounded-2xl bg-primary text-white font-headline font-black text-[10px] uppercase tracking-widest hover:bg-primary-dark transition-all disabled:opacity-50 flex items-center gap-2">
            <span class="material-symbols-outlined text-sm" *ngIf="!recordingVisit()">verified</span>
            <span class="material-symbols-outlined text-sm animate-spin" *ngIf="recordingVisit()">sync</span>
            Enregistrer une visite
          </button>
        </div>
      </header>

      <!-- 2-COLUMN LAYOUT -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-12">

        <!-- LEFT: GALLERY -->
        <div class="lg:col-span-7 space-y-8">
          <div class="bg-surface-container-low rounded-[2.5rem] p-4 lg:p-8 border border-outline-variant/5">
             <div class="flex items-center justify-between mb-8 px-2">
               <h3 class="text-xs font-black uppercase tracking-[0.2em] text-outline">Galerie de la voiture</h3>
               <span class="text-[10px] text-outline/50 font-bold uppercase tracking-widest">{{ vehicle().photos?.length || 0 }} Photos</span>
             </div>

             <div class="space-y-6" *ngIf="vehicle().photos?.length">
               <div *ngFor="let photo of vehicle().photos" class="rounded-[2rem] overflow-hidden shadow-sm">
                 <img [src]="photo.path" class="w-full aspect-video object-cover">
               </div>
             </div>

             <div *ngIf="!vehicle().photos?.length" class="h-64 flex flex-col items-center justify-center bg-white rounded-[2rem] border border-dashed border-outline-variant/20 italic text-outline/40">
                <span class="material-symbols-outlined text-4xl mb-2 opacity-10">no_crash</span>
                Aucun visuel disponible
             </div>
          </div>
        </div>

        <!-- RIGHT: SPECS & DOCS -->
        <div class="lg:col-span-5 space-y-12">

          <div class="bg-white rounded-[2.5rem] p-10 border border-outline-variant/5 shadow-sm space-y-8">
            <div class="flex items-center justify-between">
              <h3 class="text-xs font-black uppercase tracking-[0.2em] text-outline">État du Véhicule</h3>
              <p class="text-[10px] font-bold text-primary">{{ vehicle().last_visit ? ('Visité le ' + (vehicle().last_visit | date:'dd/MM/yy')) : 'Jamais entretenu' }}</p>
            </div>

            <div class="grid grid-cols-2 gap-8">
              <div class="space-y-1">
                <p class="text-[9px] font-black uppercase text-outline/40 tracking-widest">Marque</p>
                <p class="text-lg font-black text-on-surface">{{ vehicle().brand || '—' }}</p>
              </div>
              <div class="space-y-1">
                <p class="text-[9px] font-black uppercase text-outline/40 tracking-widest">Modèle</p>
                <p class="text-lg font-black text-on-surface">{{ vehicle().model || '—' }}</p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-8 pt-4">
              <div class="space-y-1">
                <p class="text-[9px] font-black uppercase text-outline/40 tracking-widest">Usage</p>
                <p class="text-sm font-bold text-on-surface">
                  {{ vehicle().usage_type === 'transport' ? 'Véhicule de transport (CT tous les 6 mois)' : 'Véhicule personnel (CT tous les 12 mois)' }}
                </p>
              </div>
              <div class="space-y-1" *ngIf="vehicle().next_ct_date">
                <p class="text-[9px] font-black uppercase text-outline/40 tracking-widest">Prochaine visite technique</p>
                <p class="text-sm font-bold text-on-surface">
                  {{ vehicle().next_ct_date | date:'dd/MM/yy' }}
                </p>
              </div>
            </div>

            <div class="pt-8 border-t border-outline-variant/10">
              <h4 class="text-[10px] font-black text-outline uppercase tracking-widest mb-6">Documents Administratifs</h4>

              <div class="space-y-4">
                <!-- CARTE GRISE -->
                <div class="flex items-center justify-between p-5 rounded-3xl bg-surface-container-low border border-outline-variant/5 transition-all hover:bg-white hover:shadow-md group">
                  <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                      <span class="material-symbols-outlined">receipt_long</span>
                    </div>
                    <div>
                      <p class="text-[11px] font-black uppercase text-on-surface mb-0.5">Carte Grise</p>
                      <a [href]="vehicle().carte_grise?.path" target="_blank" *ngIf="vehicle().carte_grise"
                         class="text-[9px] font-bold text-primary hover:underline flex items-center gap-1">
                         Consulter le fichier <span class="material-symbols-outlined text-[10px]">open_in_new</span>
                      </a>
                      <p *ngIf="!vehicle().carte_grise" class="text-[9px] font-medium text-outline/40 italic">Document non renseigné</p>
                    </div>
                  </div>
                  <button (click)="cgInput.click()" [disabled]="replacingDoc() === 'carte_grise'"
                          class="w-10 h-10 rounded-full border border-outline-variant/10 text-outline hover:bg-primary hover:text-white transition-all flex items-center justify-center">
                    <span class="material-symbols-outlined text-sm" [class.animate-spin]="replacingDoc() === 'carte_grise'">sync</span>
                  </button>
                  <input #cgInput type="file" (change)="onReplaceDoc($event, 'carte_grise')" accept="image/*,.pdf" class="hidden">
                </div>

                <!-- VIGNETTE -->
                <div class="flex items-center justify-between p-5 rounded-3xl bg-surface-container-low border border-outline-variant/5 transition-all hover:bg-white hover:shadow-md group">
                  <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center">
                      <span class="material-symbols-outlined">confirmation_number</span>
                    </div>
                    <div>
                      <p class="text-[11px] font-black uppercase text-on-surface mb-0.5">Vignette Fiscale</p>
                      <a [href]="vehicle().vignette?.path" target="_blank" *ngIf="vehicle().vignette"
                         class="text-[9px] font-bold text-secondary hover:underline flex items-center gap-1">
                         Consulter le fichier <span class="material-symbols-outlined text-[10px]">open_in_new</span>
                      </a>
                      <p *ngIf="!vehicle().vignette" class="text-[9px] font-medium text-outline/40 italic">Document manquant</p>
                    </div>
                  </div>
                  <button (click)="vgInput.click()" [disabled]="replacingDoc() === 'vignette'"
                          class="w-10 h-10 rounded-full border border-outline-variant/10 text-outline hover:bg-secondary hover:text-white transition-all flex items-center justify-center">
                    <span class="material-symbols-outlined text-sm" [class.animate-spin]="replacingDoc() === 'vignette'">sync</span>
                  </button>
                  <input #vgInput type="file" (change)="onReplaceDoc($event, 'vignette')" accept="image/*,.pdf" class="hidden">
                </div>
              </div>
            </div>

            <!-- INFOS TECHNIQUES & TARIFICATION (issues de l'import parc auto) -->
            <div class="pt-8 border-t border-outline-variant/10" *ngIf="hasTechnicalInfo()">
              <h4 class="text-[10px] font-black text-outline uppercase tracking-widest mb-6">Informations techniques &amp; tarification</h4>
              <div class="grid grid-cols-2 gap-6">
                <div class="space-y-1" *ngIf="vehicle().vehicle_type">
                  <p class="text-[9px] font-black uppercase text-outline/40 tracking-widest">Type (genre)</p>
                  <p class="text-sm font-bold text-on-surface">{{ vehicle().vehicle_type }}</p>
                </div>
                <div class="space-y-1" *ngIf="vehicle().ptac_kg">
                  <p class="text-[9px] font-black uppercase text-outline/40 tracking-widest">PTAC</p>
                  <p class="text-sm font-bold text-on-surface">{{ vehicle().ptac_kg }} kg</p>
                </div>
                <div class="space-y-1" *ngIf="vehicle().seats">
                  <p class="text-[9px] font-black uppercase text-outline/40 tracking-widest">Places assises</p>
                  <p class="text-sm font-bold text-on-surface">{{ vehicle().seats }}</p>
                </div>
                <div class="space-y-1" *ngIf="vehicle().registration_date">
                  <p class="text-[9px] font-black uppercase text-outline/40 tracking-widest">Mise en circulation</p>
                  <p class="text-sm font-bold text-on-surface">{{ vehicle().registration_date | date:'dd/MM/yyyy' }}</p>
                </div>
                <div class="space-y-1" *ngIf="vehicle().fiscal_power_cv">
                  <p class="text-[9px] font-black uppercase text-outline/40 tracking-widest">Puissance fiscale</p>
                  <p class="text-sm font-bold text-on-surface">{{ vehicle().fiscal_power_cv }} CV</p>
                </div>
                <div class="space-y-1" *ngIf="vehicle().ct_amount_ht != null">
                  <p class="text-[9px] font-black uppercase text-outline/40 tracking-widest">Visite technique HT</p>
                  <p class="text-sm font-bold text-on-surface">{{ vehicle().ct_amount_ht | number:'1.0-0' }} CFA</p>
                </div>
                <div class="space-y-1" *ngIf="vehicle().ct_vat_amount != null">
                  <p class="text-[9px] font-black uppercase text-outline/40 tracking-widest">TVA</p>
                  <p class="text-sm font-bold text-on-surface">{{ vehicle().ct_vat_amount | number:'1.0-0' }} CFA</p>
                </div>
                <div class="space-y-1" *ngIf="vehicle().ct_amount_ttc != null">
                  <p class="text-[9px] font-black uppercase text-outline/40 tracking-widest">Visite technique TTC</p>
                  <p class="text-sm font-bold text-on-surface">{{ vehicle().ct_amount_ttc | number:'1.0-0' }} CFA</p>
                </div>
                <div class="space-y-1" *ngIf="vehicle().vignette_amount != null">
                  <p class="text-[9px] font-black uppercase text-outline/40 tracking-widest">Vignette</p>
                  <p class="text-sm font-bold text-on-surface">{{ vehicle().vignette_amount | number:'1.0-0' }} CFA</p>
                </div>
                <div class="space-y-1" *ngIf="vehicle().penalty_amount != null">
                  <p class="text-[9px] font-black uppercase text-outline/40 tracking-widest">Pénalité</p>
                  <p class="text-sm font-bold text-on-surface">{{ vehicle().penalty_amount | number:'1.0-0' }} CFA</p>
                </div>
              </div>
            </div>

            <div class="pt-8 border-t border-outline-variant/10">
              <div class="flex items-center gap-4 p-6 rounded-3xl bg-surface-container text-on-surface">
                 <span class="material-symbols-outlined text-outline/30">info</span>
                 <p class="text-[11px] font-medium leading-relaxed italic text-outline">
                    Le statut de conformité et la prochaine visite sont calculés automatiquement : véhicules de transport tous les 6 mois, véhicules personnels tous les 12 mois.
                 </p>
              </div>
            </div>

            <!-- HISTORIQUE DES VISITES -->
            <div class="pt-8 border-t border-outline-variant/10" *ngIf="vehicle().visits?.length">
              <h4 class="text-[10px] font-black text-outline uppercase tracking-widest mb-4">Historique des visites</h4>
              <div class="space-y-3 max-h-64 overflow-auto pr-1">
                <div *ngFor="let v of vehicle().visits"
                     class="flex items-start justify-between p-4 rounded-2xl bg-surface-container-low border border-outline-variant/10">
                  <div class="space-y-1">
                    <p class="text-xs font-bold text-on-surface">
                      {{ v.date | date:'dd/MM/yy' }} • {{ v.kind === 'technical' ? 'Visite technique' : (v.kind || 'Visite') }}
                    </p>
                    <p class="text-[11px] text-outline leading-snug">
                      {{ v.notes || 'Aucun commentaire saisi.' }}
                    </p>
                  </div>
                  <div class="flex flex-col items-end gap-1 ml-3">
                    <span *ngIf="v.result"
                          [class]="'px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ' + (v.result === 'favorable' ? 'bg-secondary/10 text-secondary' : 'bg-error/10 text-error')">
                      {{ v.result === 'favorable' ? 'Favorable' : 'Défavorable' }}
                    </span>
                    <a *ngIf="v.vignette"
                       [href]="v.vignette"
                       target="_blank"
                       class="text-[10px] font-bold text-primary hover:underline flex items-center gap-1">
                      Vignette
                      <span class="material-symbols-outlined text-[12px]">open_in_new</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- Modal : date de visite -->
      <div *ngIf="showVisitModal()" class="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 py-10">
        <div class="absolute inset-0 bg-[#0f172a]/70 backdrop-blur-sm" (click)="closeVisitModal()"></div>
        <div class="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-8 border border-outline-variant/10 animate-fade-in">
          <div class="flex items-center gap-3 mb-2">
            <div class="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <span class="material-symbols-outlined text-2xl">event_available</span>
            </div>
            <h3 class="text-xl font-headline font-black text-on-surface">Enregistrer une visite</h3>
          </div>
          <p class="text-sm text-outline font-medium mb-6">
            Indiquez la date de l'entretien ou de la visite technique pour <span class="font-bold text-on-surface">{{ vehicle()?.license_plate }}</span>.
          </p>
          <label class="block text-[10px] font-black uppercase text-outline tracking-widest mb-2 ml-1">Date de la visite</label>
          <input type="date" [(ngModel)]="visitDateInput" class="w-full px-4 py-3.5 rounded-xl bg-surface-container-low border border-outline-variant/10 text-on-surface font-semibold outline-none focus:ring-2 focus:ring-primary/30 mb-8">

          <label class="block text-[10px] font-black uppercase text-outline tracking-widest mb-2 ml-1">Nouvelle vignette (optionnel)</label>
          <input type="file" (change)="onSelectVisitVignette($event)" accept="image/*,.pdf" class="w-full mb-8 text-sm">

          <div class="flex gap-3">
            <button type="button" (click)="closeVisitModal()" [disabled]="recordingVisit()" class="flex-1 py-4 rounded-xl bg-surface-container text-on-surface text-[10px] font-black uppercase tracking-widest hover:bg-surface-container-high transition-colors disabled:opacity-50">
              Annuler
            </button>
            <button type="button" (click)="submitVisitDate()" [disabled]="recordingVisit() || !visitDateInput" class="flex-1 py-4 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:brightness-110 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
              <span class="material-symbols-outlined text-lg animate-spin" *ngIf="recordingVisit()">sync</span>
              Valider
            </button>
          </div>
        </div>
      </div>

      <!-- Loading state -->
    </div>
    <div *ngIf="!vehicle() && loading()" class="flex flex-col items-center justify-center py-32 text-outline">
      <span class="material-symbols-outlined animate-spin text-primary text-5xl mb-4">sync</span>
      <p class="text-sm font-bold uppercase tracking-widest">Chargement du véhicule…</p>
    </div>
  `,
  styles: [`
    :host { display: block; background: #ffffff; min-height: 100vh; }
    .animate-fade-in {
      animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(15px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class ClientVehicleDetailComponent implements OnInit {
  statusLabel = vehicleStatusLabel;
  statusBadgeClass = vehicleStatusBadgeClass;
  vehicle = signal<any>(null);
  loading = signal(true);
  recordingVisit = signal(false);
  replacingDoc = signal<string | null>(null);
  showVisitModal = signal(false);
  visitDateInput = '';
  visitVignetteFile: File | null = null;

  private route = inject(ActivatedRoute);
  private vehicleService = inject(VehicleService);
  private toastService = inject(ToastService);

  hasTechnicalInfo(): boolean {
    const v = this.vehicle();
    if (!v) return false;
    return [
      v.vehicle_type, v.ptac_kg, v.seats, v.registration_date, v.fiscal_power_cv,
      v.ct_amount_ht, v.ct_vat_amount, v.ct_amount_ttc, v.vignette_amount, v.penalty_amount,
    ].some((f) => f !== null && f !== undefined && f !== '');
  }

  ngOnInit(): void {
    this.refreshData();
  }

  refreshData(): void {
    const vId = this.route.snapshot.paramMap.get('vehicleId');
    if (!vId) return;

    this.loading.set(true);
    this.vehicleService.getById(+vId).subscribe({
      next: (data) => {
        this.vehicle.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toastService.error('Impossible de charger ce véhicule.');
      }
    });
  }

  openVisitModal(): void {
    this.visitDateInput = new Date().toISOString().split('T')[0];
    this.visitVignetteFile = null;
    this.showVisitModal.set(true);
  }

  closeVisitModal(): void {
    if (this.recordingVisit()) return;
    this.showVisitModal.set(false);
  }

  onSelectVisitVignette(event: any): void {
    const file: File | undefined = event?.target?.files?.[0];
    this.visitVignetteFile = file ?? null;
  }

  submitVisitDate(): void {
    const vId = this.vehicle()?.id;
    if (!vId || !this.visitDateInput?.trim()) {
      this.toastService.error('Veuillez sélectionner une date.');
      return;
    }

    this.recordingVisit.set(true);
    this.vehicleService
      .recordVisit(vId, { date: this.visitDateInput.trim(), vignetteFile: this.visitVignetteFile ?? undefined })
      .subscribe({
        next: (updatedVehicle) => {
          this.vehicle.set(updatedVehicle);
          this.recordingVisit.set(false);
          this.showVisitModal.set(false);
          this.toastService.success('Visite enregistrée.');
        },
        error: () => {
          this.recordingVisit.set(false);
          this.toastService.error('Erreur lors de la validation.');
        },
      });
  }

  onReplaceDoc(event: any, type: string): void {
    const file = event.target.files[0];
    const vId = this.vehicle()?.id;
    if (!file || !vId) return;

    this.replacingDoc.set(type);
    const label = type === 'carte_grise' ? 'Carte Grise' : 'Vignette';

    this.vehicleService.uploadDocument(vId, file, type, `${label} MAJ`).subscribe({
      next: () => {
        this.refreshData();
        this.replacingDoc.set(null);
        this.toastService.success(`Le document ${label} a été mis à jour.`);
      },
      error: () => {
        this.replacingDoc.set(null);
        this.toastService.error('Erreur lors du remplacement.');
      }
    });
  }
}
