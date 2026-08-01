import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin, Observable } from 'rxjs';
import { VehicleService, Vehicle, VehicleImportResult } from '../../../services/vehicle.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { vehicleStatusLabel, vehicleStatusBadgeClass } from '../../../utils/vehicle-status';

@Component({
  selector: 'app-client-fleet',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="animate-fade-in-up space-y-8">

      <!-- HEADER BAR -->
      <section class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-2xl md:text-3xl font-headline font-black text-on-surface">Ma Flotte de Véhicules</h1>
          <p class="text-outline text-sm">Gérez et suivez l'état d'inspection de vos véhicules.</p>
        </div>
        <div class="flex items-center gap-3">
          <button (click)="openImportModal()" class="px-5 py-3 bg-white border border-outline-variant/30 text-on-surface font-bold text-sm rounded-xl hover:bg-surface-container transition-all flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px]">upload_file</span>
            Importer (Excel)
          </button>
          <button (click)="openAddModal()" class="px-5 py-3 bg-[#15b9a3] hover:brightness-110 text-white font-bold text-sm rounded-xl shadow-lg shadow-[#15b9a3]/20 active:scale-95 transition-all flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px]">add_circle</span>
            Enregistrer un véhicule
          </button>
        </div>
      </section>

      <!-- SEARCH AND STATUS COUNT BAR -->
      <section class="bg-white rounded-xl shadow-sm border border-surface-container/30 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div class="relative w-full md:w-80">
          <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
          <input type="text"
                 [value]="searchQuery()"
                 (input)="onSearchInput($event)"
                 class="w-full pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
                 placeholder="Rechercher par immatriculation, marque...">
        </div>
        <div class="flex items-center gap-6 text-xs font-bold text-outline flex-wrap">
          <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-primary"></span> À jour : {{ countByStatus('a_jour') }}</span>
          <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Proche : {{ countByStatus('bientot') }}</span>
          <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-error"></span> Hors délai : {{ countByStatus('en_retard') }}</span>
          <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-slate-400"></span> Jamais contrôlé : {{ countByStatus('jamais_controle') }}</span>
        </div>
      </section>

      <!-- FLEET TABLE -->
      <div class="bg-white rounded-xl shadow-sm border border-surface-container/30 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-surface-container-low border-b border-outline-variant/30">
                <th class="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest">Véhicule</th>
                <th class="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest">Immatriculation</th>
                <th class="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest text-center">Énergie</th>
                <th class="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest">Dernière visite</th>
                <th class="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest">Statut</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant/10">
              <tr *ngFor="let v of filteredVehicles()" [routerLink]="['/client/fleet', v.id]" class="hover:bg-slate-50/50 transition-colors cursor-pointer">
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-outline">
                      <span class="material-symbols-outlined">directions_car</span>
                    </div>
                    <div>
                      <p class="text-sm font-bold text-on-surface">{{ v.brand }} {{ v.model }}</p>
                      <p class="text-[10px] text-outline" *ngIf="v.year">Année : {{ v.year }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 font-mono font-bold text-sm text-on-surface-variant">{{ v.license_plate }}</td>
                <td class="px-6 py-4 text-center text-xs font-semibold text-outline capitalize">{{ v.fuel_type || '—' }}</td>
                <td class="px-6 py-4 text-sm font-medium text-on-surface">{{ (v.last_visit | date:'shortDate') || 'Aucune visite' }}</td>
                <td class="px-6 py-4">
                  <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest" [ngClass]="statusBadgeClass(v.status)">
                    {{ statusLabel(v.status) }}
                  </span>
                </td>
              </tr>

              <!-- Loading -->
              <tr *ngIf="loading()">
                <td colspan="5" class="px-6 py-12 text-center">
                  <span class="material-symbols-outlined animate-spin text-primary text-3xl">sync</span>
                  <p class="text-xs text-outline mt-2">Chargement de votre flotte...</p>
                </td>
              </tr>

              <!-- Compte non rattaché à une entreprise -->
              <tr *ngIf="!loading() && noCompanyId()">
                <td colspan="5" class="px-6 py-16 text-center">
                  <span class="material-symbols-outlined text-5xl text-outline/20 block mb-2">domain_disabled</span>
                  <p class="text-on-surface font-bold text-sm">Service non disponible</p>
                  <p class="text-outline text-xs mt-1 max-w-xs mx-auto">Votre compte n'est pas rattaché à une entreprise. Contactez votre conseiller pour activer ce service.</p>
                </td>
              </tr>

              <!-- Empty -->
              <tr *ngIf="!loading() && !noCompanyId() && filteredVehicles().length === 0">
                <td colspan="5" class="px-6 py-16 text-center">
                  <span class="material-symbols-outlined text-5xl text-outline/20 block mb-2">directions_car_off</span>
                  <p class="text-on-surface font-bold text-sm">Aucun véhicule trouvé</p>
                  <p class="text-outline text-xs mt-1">Cliquez sur le bouton ci-dessus pour enregistrer votre premier véhicule.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ADD VEHICLE MODAL -->
      <div *ngIf="showAddModal()" class="fixed inset-0 bg-[#1b1932]/40 backdrop-blur-sm z-50 overflow-y-auto flex items-start justify-center p-4 py-10">
        <div class="bg-white rounded-[2rem] max-w-3xl w-full p-8 shadow-2xl border border-slate-100 animate-scale-in max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-8">
            <div>
              <h3 class="font-headline font-black text-xl text-on-surface">Enregistrer un véhicule</h3>
              <p class="text-outline text-xs mt-0.5">Renseignez les caractéristiques et, si besoin, les documents officiels.</p>
            </div>
            <button (click)="closeAddModal()" class="text-outline hover:text-on-surface transition-colors p-2 rounded-xl hover:bg-surface-container">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <form [formGroup]="vehicleForm" (ngSubmit)="onSubmit()" class="space-y-8">

            <!-- Spécifications techniques -->
            <section>
              <div class="flex items-center gap-3 mb-5">
                <div class="w-1.5 h-6 bg-primary rounded-full"></div>
                <h4 class="font-headline font-extrabold text-sm uppercase tracking-widest text-on-surface">Spécifications techniques</h4>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div class="sm:col-span-2">
                  <label for="license_plate" class="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Immatriculation <span class="text-error">*</span></label>
                  <input type="text" id="license_plate" formControlName="license_plate"
                         class="w-full px-4 py-3 bg-surface-container-low rounded-xl border-none text-lg outline-none focus:ring-2 focus:ring-primary/20 font-mono font-bold placeholder:font-sans placeholder:text-base uppercase"
                         placeholder="Ex: AA-123-BB">
                  <p *ngIf="vehicleForm.controls['license_plate'].invalid && vehicleForm.controls['license_plate'].touched" class="text-xs text-error font-medium mt-1">
                    L'immatriculation est requise (3 caractères minimum).
                  </p>
                </div>

                <div>
                  <label for="brand" class="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Marque</label>
                  <input type="text" id="brand" formControlName="brand"
                         class="w-full px-4 py-3 bg-surface-container-low rounded-xl border-none text-sm outline-none focus:ring-2 focus:ring-primary/20"
                         placeholder="Ex: Toyota">
                </div>
                <div>
                  <label for="model" class="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Modèle</label>
                  <input type="text" id="model" formControlName="model"
                         class="w-full px-4 py-3 bg-surface-container-low rounded-xl border-none text-sm outline-none focus:ring-2 focus:ring-primary/20"
                         placeholder="Ex: Hilux">
                </div>

                <div>
                  <label class="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Année</label>
                  <input type="number" formControlName="year"
                         class="w-full px-4 py-3 bg-surface-container-low rounded-xl border-none text-sm outline-none focus:ring-2 focus:ring-primary/20"
                         placeholder="Ex: 2020">
                </div>
                <div>
                  <label class="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Carburant</label>
                  <select formControlName="fuel_type"
                          class="w-full px-4 py-3 bg-surface-container-low rounded-xl border-none text-sm outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="diesel">Diesel</option>
                    <option value="essence">Essence</option>
                    <option value="hybride">Hybride</option>
                    <option value="electrique">Électrique</option>
                  </select>
                </div>

                <div class="sm:col-span-2">
                  <label class="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Dernière visite technique</label>
                  <input type="date" formControlName="last_visit_date"
                         class="w-full px-4 py-3 bg-surface-container-low rounded-xl border-none text-sm outline-none focus:ring-2 focus:ring-primary/20">
                </div>
              </div>
            </section>

            <!-- Informations techniques & tarification -->
            <section>
              <div class="flex items-center gap-3 mb-5">
                <div class="w-1.5 h-6 bg-tertiary rounded-full"></div>
                <h4 class="font-headline font-extrabold text-sm uppercase tracking-widest text-on-surface">Informations techniques <span class="text-outline font-medium normal-case">(optionnel)</span></h4>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label class="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Type (genre)</label>
                  <input type="text" formControlName="vehicle_type"
                         class="w-full px-4 py-3 bg-surface-container-low rounded-xl border-none text-sm outline-none focus:ring-2 focus:ring-primary/20"
                         placeholder="Ex: VP, Camionnette">
                </div>
                <div>
                  <label class="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">PTAC (kg)</label>
                  <input type="number" formControlName="ptac_kg"
                         class="w-full px-4 py-3 bg-surface-container-low rounded-xl border-none text-sm outline-none focus:ring-2 focus:ring-primary/20">
                </div>
                <div>
                  <label class="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Places assises</label>
                  <input type="number" formControlName="seats"
                         class="w-full px-4 py-3 bg-surface-container-low rounded-xl border-none text-sm outline-none focus:ring-2 focus:ring-primary/20">
                </div>
                <div>
                  <label class="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Mise en circulation</label>
                  <input type="date" formControlName="registration_date"
                         class="w-full px-4 py-3 bg-surface-container-low rounded-xl border-none text-sm outline-none focus:ring-2 focus:ring-primary/20">
                </div>
                <div>
                  <label class="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Puissance fiscale (CV)</label>
                  <input type="number" formControlName="fiscal_power_cv"
                         class="w-full px-4 py-3 bg-surface-container-low rounded-xl border-none text-sm outline-none focus:ring-2 focus:ring-primary/20">
                </div>
              </div>
            </section>

            <!-- Documents officiels -->
            <section class="bg-surface-container-low rounded-3xl p-6 border border-outline-variant/20">
              <div class="flex items-center gap-3 mb-5">
                <div class="w-1.5 h-6 bg-secondary rounded-full"></div>
                <h4 class="font-headline font-extrabold text-sm uppercase tracking-widest text-on-surface">Documents officiels <span class="text-outline font-medium normal-case">(optionnel)</span></h4>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label class="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Carte grise</label>
                  <div (click)="cgInput.click()"
                       [class]="'border-2 border-dashed rounded-2xl p-6 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 text-center ' + (selectedCg ? 'border-primary bg-primary/5' : 'border-outline-variant/40 hover:border-primary/50 bg-white')">
                    <span class="material-symbols-outlined text-2xl" [class.text-primary]="selectedCg">{{ selectedCg ? 'article' : 'upload_file' }}</span>
                    <p class="text-xs font-bold truncate max-w-full">{{ selectedCg ? selectedCg.name : 'Choisir un fichier' }}</p>
                    <input #cgInput type="file" (change)="handleAdminFile($event, 'cg')" accept="image/*,.pdf" class="hidden">
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Vignette fiscale</label>
                  <div (click)="vgInput.click()"
                       [class]="'border-2 border-dashed rounded-2xl p-6 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 text-center ' + (selectedVg ? 'border-secondary bg-secondary/5' : 'border-outline-variant/40 hover:border-secondary/50 bg-white')">
                    <span class="material-symbols-outlined text-2xl" [class.text-secondary]="selectedVg">{{ selectedVg ? 'confirmation_number' : 'upload_file' }}</span>
                    <p class="text-xs font-bold truncate max-w-full">{{ selectedVg ? selectedVg.name : 'Choisir un fichier' }}</p>
                    <input #vgInput type="file" (change)="handleAdminFile($event, 'vg')" accept="image/*,.pdf" class="hidden">
                  </div>
                </div>
              </div>
            </section>

            <!-- Photos -->
            <section>
              <div class="flex items-center gap-3 mb-5">
                <div class="w-1.5 h-6 bg-primary-dark rounded-full"></div>
                <h4 class="font-headline font-extrabold text-sm uppercase tracking-widest text-on-surface">Photos <span class="text-outline font-medium normal-case">(max 3)</span></h4>
              </div>
              <div class="grid grid-cols-3 sm:grid-cols-4 gap-4">
                <div *ngFor="let p of pPreviews; let i = index" class="relative aspect-square rounded-2xl overflow-hidden shadow-sm">
                  <img [src]="p" class="w-full h-full object-cover" alt="">
                  <button type="button" (click)="removeImg(i)" class="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-error text-white flex items-center justify-center shadow-md">
                    <span class="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
                <div *ngIf="sPhotos.length < 3"
                     (click)="pInput.click()"
                     class="aspect-square rounded-2xl border-2 border-dashed border-outline-variant/40 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all text-outline hover:text-primary">
                  <span class="material-symbols-outlined text-2xl">add_a_photo</span>
                  <input #pInput type="file" (change)="handlePhotos($event)" accept="image/*" class="hidden" multiple>
                </div>
              </div>
            </section>

            <div class="pt-2 flex items-center justify-end gap-3 border-t border-outline-variant/10 pt-6">
              <button type="button" (click)="closeAddModal()" class="px-6 py-3 border border-slate-200 text-outline hover:text-on-surface font-bold text-xs uppercase tracking-widest rounded-xl transition-colors">
                Annuler
              </button>
              <button type="submit" [disabled]="vehicleForm.invalid || submitting()"
                      class="px-8 py-3 bg-primary text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-md shadow-primary/10 hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all">
                {{ submitting() ? 'Enregistrement...' : 'Confirmer' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- IMPORT EXCEL MODAL -->
      <div *ngIf="showImportModal()" class="fixed inset-0 z-[200] overflow-y-auto flex items-start justify-center p-4 py-10 bg-[#1b1932]/40 backdrop-blur-sm animate-fade-in">
        <div class="bg-white w-full max-w-xl rounded-[2rem] shadow-2xl overflow-hidden border border-outline-variant/10 p-8 max-h-[90vh] overflow-y-auto">

          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-headline font-black text-on-surface">Importer ma flotte (Excel)</h3>
            <button (click)="closeImportModal()" aria-label="Fermer" class="text-outline hover:text-on-surface p-1">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div class="bg-primary/5 border border-primary/10 rounded-2xl p-5 mb-6 flex items-start gap-4">
            <span class="material-symbols-outlined text-primary text-2xl">info</span>
            <div class="text-sm text-on-surface leading-relaxed">
              <p class="font-bold mb-1">1. Téléchargez le modèle</p>
              <p class="text-outline text-xs mb-3">Remplissez-le avec vos véhicules, puis importez-le ci-dessous. Seule l'immatriculation est obligatoire.</p>
              <button (click)="downloadTemplate()" [disabled]="downloadingTemplate()" class="px-4 py-2 rounded-xl bg-white border border-primary/30 text-primary text-xs font-bold hover:bg-primary/5 transition-all flex items-center gap-2 disabled:opacity-50">
                <span class="material-symbols-outlined text-sm" [class.animate-spin]="downloadingTemplate()">{{ downloadingTemplate() ? 'sync' : 'download' }}</span>
                Télécharger le modèle Excel
              </button>
            </div>
          </div>

          <p class="text-xs font-bold uppercase tracking-widest text-outline mb-2">2. Importer le fichier rempli</p>
          <div (click)="importFileInput.click()"
               [class]="'group border-2 border-dashed rounded-2xl p-8 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 mb-6 ' + (selectedImportFile ? 'border-primary bg-primary/5' : 'border-outline-variant/40 hover:border-primary/50 hover:bg-surface-container-low')">
            <span class="material-symbols-outlined text-4xl" [class.text-primary]="selectedImportFile">{{ selectedImportFile ? 'description' : 'upload_file' }}</span>
            <p class="text-xs font-bold text-center">{{ selectedImportFile ? selectedImportFile.name : 'Choisir le fichier Excel rempli (.xlsx)' }}</p>
            <input #importFileInput type="file" (change)="handleImportFile($event)" accept=".xlsx,.xls,.csv" class="hidden">
          </div>

          <div *ngIf="importResult() as result" class="mb-6 space-y-3">
            <div class="flex items-center gap-4">
              <div class="flex-1 bg-teal-50 rounded-xl p-4 text-center">
                <p class="text-2xl font-black text-primary">{{ result.created }}</p>
                <p class="text-[10px] font-bold uppercase tracking-widest text-primary/70">Véhicules importés</p>
              </div>
              <div class="flex-1 bg-red-50 rounded-xl p-4 text-center">
                <p class="text-2xl font-black text-error">{{ result.errors_count }}</p>
                <p class="text-[10px] font-bold uppercase tracking-widest text-error/70">Lignes en erreur</p>
              </div>
            </div>

            <div *ngIf="result.errors.length > 0" class="bg-surface-container-low rounded-xl p-4 max-h-48 overflow-y-auto space-y-2">
              <div *ngFor="let err of result.errors" class="text-xs flex items-start gap-2">
                <span class="font-bold text-error shrink-0">L{{ err.row }}{{ err.license_plate ? ' · ' + err.license_plate : '' }} :</span>
                <span class="text-outline">{{ err.message }}</span>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3">
            <button (click)="closeImportModal()" class="px-5 py-2.5 text-outline hover:text-on-surface font-bold text-xs uppercase tracking-widest transition-colors">
              {{ importResult() ? 'Fermer' : 'Annuler' }}
            </button>
            <button *ngIf="!importResult()" (click)="submitImport()" [disabled]="!selectedImportFile || importing()"
                    class="px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 disabled:opacity-40 transition-all flex items-center gap-2">
              <span class="material-symbols-outlined text-sm animate-spin" *ngIf="importing()">sync</span>
              {{ importing() ? 'Import en cours…' : "Lancer l'import" }}
            </button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; background: #fbfbfd; min-height: 100vh; }
    .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  `]
})
export class ClientFleetComponent implements OnInit {
  vehicles = signal<Vehicle[]>([]);
  loading = signal(true);
  submitting = signal(false);
  showAddModal = signal(false);
  searchQuery = signal('');
  noCompanyId = signal(false);

  selectedCg: File | null = null;
  selectedVg: File | null = null;
  sPhotos: File[] = [];
  pPreviews: string[] = [];

  showImportModal = signal(false);
  downloadingTemplate = signal(false);
  importing = signal(false);
  importResult = signal<VehicleImportResult | null>(null);
  selectedImportFile: File | null = null;

  vehicleForm: FormGroup;
  private vehicleService = inject(VehicleService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);

  constructor() {
    this.vehicleForm = this.fb.group({
      license_plate: ['', [Validators.required, Validators.minLength(3)]],
      brand: [''],
      model: [''],
      year: [new Date().getFullYear(), [Validators.min(1900), Validators.max(new Date().getFullYear() + 1)]],
      fuel_type: ['diesel', [Validators.required]],
      last_visit_date: [''],
      vehicle_type: [''],
      ptac_kg: [null],
      seats: [null],
      registration_date: [''],
      fiscal_power_cv: [null],
    });
  }

  ngOnInit() {
    this.loadFleet();
  }

  loadFleet() {
    const user = this.authService.getCurrentUser();
    if (!user || user.company_id == null) {
      this.loading.set(false);
      this.noCompanyId.set(true);
      return;
    }

    this.vehicleService.getByClient(user.company_id).subscribe({
      next: (data) => {
        this.vehicles.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error load fleet', err);
        this.toastService.error('Impossible de charger votre flotte.');
        this.loading.set(false);
      }
    });
  }

  filteredVehicles() {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.vehicles();
    return this.vehicles().filter(v =>
      v.license_plate.toLowerCase().includes(query) ||
      v.brand.toLowerCase().includes(query) ||
      v.model.toLowerCase().includes(query)
    );
  }

  onSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  countByStatus(status: string): number {
    return this.vehicles().filter(v => v.status === status).length;
  }

  statusLabel = vehicleStatusLabel;
  statusBadgeClass = vehicleStatusBadgeClass;

  openAddModal() {
    this.vehicleForm.reset({
      license_plate: '',
      brand: '',
      model: '',
      year: new Date().getFullYear(),
      fuel_type: 'diesel',
      last_visit_date: '',
    });
    this.selectedCg = null;
    this.selectedVg = null;
    this.sPhotos = [];
    this.pPreviews = [];
    this.showAddModal.set(true);
  }

  closeAddModal() {
    this.showAddModal.set(false);
  }

  handleAdminFile(ev: any, type: 'cg' | 'vg'): void {
    const file = ev.target.files[0];
    if (file) {
      if (type === 'cg') this.selectedCg = file;
      else this.selectedVg = file;
    }
  }

  handlePhotos(ev: any): void {
    const files: FileList = ev.target.files;
    if (!files) return;

    const currentLen = this.sPhotos.length;
    const canAdd = 3 - currentLen;
    const count = Math.min(files.length, canAdd);

    for (let i = 0; i < count; i++) {
      const f = files[i];
      this.sPhotos.push(f);
      const reader = new FileReader();
      reader.onload = (e: any) => this.pPreviews.push(e.target.result);
      reader.readAsDataURL(f);
    }
    ev.target.value = '';
  }

  removeImg(index: number): void {
    this.sPhotos.splice(index, 1);
    this.pPreviews.splice(index, 1);
  }

  onSubmit() {
    if (this.vehicleForm.invalid) return;

    const user = this.authService.getCurrentUser();
    if (!user || user.company_id == null) {
      this.toastService.error('Erreur de session.');
      return;
    }

    this.submitting.set(true);
    const raw = this.vehicleForm.value;
    const data = {
      company_id: user.company_id,
      license_plate: String(raw.license_plate).toUpperCase(),
      brand: raw.brand,
      model: raw.model,
      year: raw.year ?? null,
      fuel_type: raw.fuel_type || null,
      last_visit_date: raw.last_visit_date || null,
      vehicle_type: raw.vehicle_type || null,
      ptac_kg: raw.ptac_kg ?? null,
      seats: raw.seats ?? null,
      registration_date: raw.registration_date || null,
      fiscal_power_cv: raw.fiscal_power_cv ?? null,
    };

    this.vehicleService.create(data).subscribe({
      next: (newVehicle) => {
        const up: Observable<any>[] = [];
        if (this.selectedCg) up.push(this.vehicleService.uploadDocument(newVehicle.id, this.selectedCg, 'carte_grise'));
        if (this.selectedVg) up.push(this.vehicleService.uploadDocument(newVehicle.id, this.selectedVg, 'vignette'));
        this.sPhotos.forEach((f) => up.push(this.vehicleService.uploadDocument(newVehicle.id, f, 'photo')));

        const finish = () => {
          this.submitting.set(false);
          this.showAddModal.set(false);
          this.toastService.success('Véhicule enregistré avec succès.');
          this.vehicles.update(current => [newVehicle, ...current]);
        };

        if (up.length > 0) {
          forkJoin(up).subscribe({ next: finish, error: finish });
        } else {
          finish();
        }
      },
      error: (err) => {
        this.submitting.set(false);
        console.error('Error create vehicle', err);
        this.toastService.error('Erreur lors de l’enregistrement.');
      }
    });
  }

  openImportModal(): void {
    this.selectedImportFile = null;
    this.importResult.set(null);
    this.showImportModal.set(true);
  }

  closeImportModal(): void {
    this.showImportModal.set(false);
    if (this.importResult()?.created) {
      this.loadFleet();
    }
  }

  downloadTemplate(): void {
    this.downloadingTemplate.set(true);
    this.vehicleService.downloadImportTemplate().subscribe({
      next: (blob) => {
        this.downloadingTemplate.set(false);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'modele_import_flotte_fidelisplus.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.downloadingTemplate.set(false);
        this.toastService.error('Impossible de télécharger le modèle.');
      }
    });
  }

  handleImportFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.selectedImportFile = file;
      this.importResult.set(null);
    }
  }

  submitImport(): void {
    const user = this.authService.getCurrentUser();
    if (!this.selectedImportFile || !user || user.company_id == null) return;

    this.importing.set(true);
    this.vehicleService.importFromExcel({ companyId: user.company_id }, this.selectedImportFile).subscribe({
      next: (result) => {
        this.importing.set(false);
        this.importResult.set(result);
        if (result.created > 0) {
          this.toastService.success(`${result.created} véhicule(s) importé(s).`);
        }
      },
      error: () => {
        this.importing.set(false);
        this.toastService.error("Erreur lors de l'import du fichier.");
      }
    });
  }
}
