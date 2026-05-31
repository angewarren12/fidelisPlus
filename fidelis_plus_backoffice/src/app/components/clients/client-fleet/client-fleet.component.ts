import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { VehicleService, Vehicle } from '../../../services/vehicle.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-client-fleet',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="animate-fade-in-up space-y-8">
      
      <!-- HEADER BAR -->
      <section class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-2xl md:text-3xl font-headline font-black text-on-surface">Ma Flotte de Véhicules</h1>
          <p class="text-outline text-sm">Gérez et suivez l'état d'inspection de vos véhicules.</p>
        </div>
        <button (click)="openAddModal()" class="px-5 py-3 bg-[#15b9a3] hover:brightness-110 text-white font-bold text-sm rounded-xl shadow-lg shadow-[#15b9a3]/20 active:scale-95 transition-all flex items-center gap-2">
          <span class="material-symbols-outlined text-[18px]">add_circle</span>
          Enregistrer un véhicule
        </button>
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
        <div class="flex items-center gap-6 text-xs font-bold text-outline">
          <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-primary"></span> À jour : {{ countByStatus('a_jour') }}</span>
          <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Proche : {{ countByStatus('bientot') }}</span>
          <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-error"></span> Hors délai : {{ countByStatus('en_retard') }}</span>
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
              <tr *ngFor="let v of filteredVehicles()" class="hover:bg-slate-50/50 transition-colors">
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
                  <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
                        [ngClass]="{
                          'bg-primary-container/20 text-primary': v.status === 'a_jour',
                          'bg-amber-100 text-amber-700': v.status === 'bientot',
                          'bg-red-50 text-error': v.status === 'en_retard'
                        }">
                    {{ v.status === 'a_jour' ? 'À Jour' : (v.status === 'bientot' ? 'Échéance Proche' : 'Hors Délai') }}
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
              
              <!-- Empty -->
              <tr *ngIf="!loading() && filteredVehicles().length === 0">
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
      <div *ngIf="showAddModal()" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-scale-in">
          <div class="flex justify-between items-center mb-6">
            <h3 class="font-headline font-black text-lg text-on-surface">Enregistrer un véhicule</h3>
            <button (click)="closeAddModal()" class="text-outline hover:text-on-surface transition-colors">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <form [formGroup]="vehicleForm" (ngSubmit)="onSubmit()" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Immatriculation</label>
              <input type="text" formControlName="license_plate" 
                     class="w-full px-4 py-2.5 bg-surface-container rounded-xl border-none text-sm outline-none focus:ring-2 focus:ring-primary/20 font-mono font-bold placeholder:font-sans uppercase"
                     placeholder="Ex: AA-123-BB">
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Marque</label>
                <input type="text" formControlName="brand" 
                       class="w-full px-4 py-2.5 bg-surface-container rounded-xl border-none text-sm outline-none focus:ring-2 focus:ring-primary/20"
                       placeholder="Ex: Toyota">
              </div>
              <div>
                <label class="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Modèle</label>
                <input type="text" formControlName="model" 
                       class="w-full px-4 py-2.5 bg-surface-container rounded-xl border-none text-sm outline-none focus:ring-2 focus:ring-primary/20"
                       placeholder="Ex: Hilux">
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Année</label>
                <input type="number" formControlName="year" 
                       class="w-full px-4 py-2.5 bg-surface-container rounded-xl border-none text-sm outline-none focus:ring-2 focus:ring-primary/20"
                       placeholder="Ex: 2020">
              </div>
              <div>
                <label class="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Carburant</label>
                <select formControlName="fuel_type" 
                        class="w-full px-4 py-2.5 bg-surface-container rounded-xl border-none text-sm outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="diesel">Diesel</option>
                  <option value="essence">Essence</option>
                  <option value="hybride">Hybride</option>
                  <option value="electrique">Électrique</option>
                </select>
              </div>
            </div>

            <div class="pt-4 flex items-center justify-end gap-3">
              <button type="button" (click)="closeAddModal()" class="px-5 py-2.5 border border-slate-200 text-outline hover:text-on-surface font-bold text-xs rounded-lg transition-colors">
                Annuler
              </button>
              <button type="submit" [disabled]="vehicleForm.invalid || submitting()"
                      class="px-5 py-2.5 bg-primary text-white font-bold text-xs rounded-lg shadow-md shadow-primary/10 hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all">
                {{ submitting() ? 'Enregistrement...' : 'Confirmer' }}
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; background: #fbfbfd; min-height: 100vh; }
  `]
})
export class ClientFleetComponent implements OnInit {
  vehicles = signal<Vehicle[]>([]);
  loading = signal(true);
  submitting = signal(false);
  showAddModal = signal(false);
  searchQuery = signal('');

  vehicleForm: FormGroup;
  private vehicleService = inject(VehicleService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);

  constructor() {
    this.vehicleForm = this.fb.group({
      license_plate: ['', [Validators.required, Validators.minLength(3)]],
      brand: ['', [Validators.required]],
      model: ['', [Validators.required]],
      year: [new Date().getFullYear(), [Validators.min(1900), Validators.max(new Date().getFullYear() + 1)]],
      fuel_type: ['diesel', [Validators.required]]
    });
  }

  ngOnInit() {
    this.loadFleet();
  }

  loadFleet() {
    const user = this.authService.getCurrentUser();
    if (!user || user.company_id == null) {
      this.loading.set(false);
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

  openAddModal() {
    this.vehicleForm.reset({
      license_plate: '',
      brand: '',
      model: '',
      year: new Date().getFullYear(),
      fuel_type: 'diesel'
    });
    this.showAddModal.set(true);
  }

  closeAddModal() {
    this.showAddModal.set(false);
  }

  onSubmit() {
    if (this.vehicleForm.invalid) return;

    const user = this.authService.getCurrentUser();
    if (!user || user.company_id == null) {
      this.toastService.error('Erreur de session.');
      return;
    }

    this.submitting.set(true);
    const data = {
      ...this.vehicleForm.value,
      company_id: user.company_id
    };

    this.vehicleService.create(data).subscribe({
      next: (newVehicle) => {
        this.submitting.set(false);
        this.showAddModal.set(false);
        this.toastService.success('Véhicule enregistré avec succès.');
        this.vehicles.update(current => [newVehicle, ...current]);
      },
      error: (err) => {
        this.submitting.set(false);
        console.error('Error create vehicle', err);
        this.toastService.error('Erreur lors de lenregistrement.');
      }
    });
  }
}
