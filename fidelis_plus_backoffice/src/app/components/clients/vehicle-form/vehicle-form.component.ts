import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { VehicleService } from '../../../services/vehicle.service';
import { AccountService } from '../../../services/account.service';
import { ToastService } from '../../../services/toast.service';
import { forkJoin, Observable } from 'rxjs';

@Component({
  selector: 'app-vehicle-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="max-w-5xl mx-auto space-y-8 animate-fade-in-up pb-20">
      
      <nav class="flex items-center gap-2 text-[10px] font-black text-outline uppercase tracking-[0.2em] mb-4">
        <a routerLink="/clients" class="hover:text-primary transition-colors">Clients</a>
        <span class="material-symbols-outlined text-xs">chevron_right</span>
        <a [routerLink]="['/clients', clientId]" class="hover:text-primary transition-colors">{{ clientName || 'Détail' }}</a>
        <span class="material-symbols-outlined text-xs">chevron_right</span>
        <span class="text-primary font-bold">{{ isEditMode ? 'Modifier le véhicule' : 'Nouveau véhicule — documents & photos' }}</span>
      </nav>

      <div *ngIf="loadingVehicle()" class="py-32 flex flex-col items-center justify-center text-outline">
        <span class="material-symbols-outlined text-5xl animate-spin text-primary mb-4">sync</span>
        <p class="text-sm font-bold uppercase tracking-widest">Chargement du véhicule…</p>
      </div>

      <div *ngIf="!loadingVehicle()" class="bg-primary/5 border-l-4 border-primary p-6 rounded-r-2xl flex items-start gap-4 shadow-sm">
        <span class="material-symbols-outlined text-primary text-3xl">info</span>
        <div>
          <p class="text-primary-dark text-sm font-bold mb-1">{{ isEditMode ? 'Mise à jour' : 'Documents et photos (optionnels)' }}</p>
          <p class="text-primary-dark/70 text-xs leading-relaxed">
            {{ isEditMode ? 'Modifiez les informations et ajoutez ou remplacez les pièces jointes si besoin.' : "Vous pouvez ajouter la carte grise, la vignette et jusqu'à 3 photos du véhicule." }}
          </p>
        </div>
      </div>

      <form *ngIf="!loadingVehicle()" [formGroup]="vehicleForm" (ngSubmit)="onSubmit()" class="space-y-10">
        <section class="bg-white rounded-3xl shadow-sm p-10 border border-surface-container/40 block">
          <div class="flex items-center gap-3 mb-10">
            <div class="w-2 h-8 bg-primary rounded-full"></div>
            <h2 class="font-headline font-extrabold text-2xl text-on-surface">Spécifications techniques</h2>
          </div>
          
          <div class="grid grid-cols-2 gap-8">
            <div class="col-span-2 space-y-2">
              <label class="text-[11px] font-black uppercase tracking-widest text-outline ml-1">Immatriculation (plaque) *</label>
              <input type="text" formControlName="license_plate" class="w-full bg-surface-container-low border-none rounded-2xl p-5 text-2xl font-mono font-black text-primary placeholder:text-outline/10 focus:ring-4 focus:ring-primary/10 outline-none uppercase" placeholder="ABC-1234-ZY">
            </div>
            
            <div class="space-y-2">
              <label class="text-[11px] font-black uppercase tracking-widest text-outline ml-1">Marque</label>
              <input type="text" formControlName="brand" class="w-full bg-surface-container-low border-none rounded-2xl p-5 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none" placeholder="Ex: Toyota">
            </div>
            <div class="space-y-2">
              <label class="text-[11px] font-black uppercase tracking-widest text-outline ml-1">Modèle</label>
              <input type="text" formControlName="model" class="w-full bg-surface-container-low border-none rounded-2xl p-5 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none" placeholder="Ex: Hilux">
            </div>

            <div class="space-y-2">
              <label class="text-[11px] font-black uppercase tracking-widest text-outline ml-1">Année</label>
              <input type="number" formControlName="year" class="w-full bg-surface-container-low border-none rounded-2xl p-5 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none" placeholder="2022">
            </div>
            <div class="space-y-2">
              <label class="text-[11px] font-black uppercase tracking-widest text-outline ml-1">Dernière visite technique</label>
              <input type="date" formControlName="last_visit_date" class="w-full bg-surface-container-low border-none rounded-2xl p-5 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none">
            </div>
            <div class="space-y-2">
              <label class="text-[11px] font-black uppercase tracking-widest text-outline ml-1">Énergie / carburant</label>
              <select formControlName="fuel_type" class="w-full bg-surface-container-low border-none rounded-2xl p-5 text-sm font-black focus:ring-4 focus:ring-primary/10 outline-none appearance-none">
                <option value="">Sélectionner…</option>
                <option value="essence">Essence</option>
                <option value="diesel">Diesel</option>
                <option value="hybride">Hybride</option>
                <option value="electrique">Électrique</option>
              </select>
            </div>
          </div>
        </section>

        <section class="bg-white rounded-3xl shadow-sm p-10 border border-surface-container/40 block">
          <div class="flex items-center gap-3 mb-10">
            <div class="w-2 h-8 bg-tertiary rounded-full"></div>
            <h2 class="font-headline font-extrabold text-2xl text-on-surface">Informations techniques &amp; tarification</h2>
          </div>

          <div class="grid grid-cols-2 gap-8">
            <div class="space-y-2">
              <label class="text-[11px] font-black uppercase tracking-widest text-outline ml-1">Type (genre)</label>
              <input type="text" formControlName="vehicle_type" class="w-full bg-surface-container-low border-none rounded-2xl p-5 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none" placeholder="Ex: VP, Camionnette">
            </div>
            <div class="space-y-2">
              <label class="text-[11px] font-black uppercase tracking-widest text-outline ml-1">PTAC (kg)</label>
              <input type="number" formControlName="ptac_kg" class="w-full bg-surface-container-low border-none rounded-2xl p-5 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none" placeholder="Ex: 1500">
            </div>
            <div class="space-y-2">
              <label class="text-[11px] font-black uppercase tracking-widest text-outline ml-1">Places assises</label>
              <input type="number" formControlName="seats" class="w-full bg-surface-container-low border-none rounded-2xl p-5 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none" placeholder="Ex: 5">
            </div>
            <div class="space-y-2">
              <label class="text-[11px] font-black uppercase tracking-widest text-outline ml-1">Mise en circulation</label>
              <input type="date" formControlName="registration_date" class="w-full bg-surface-container-low border-none rounded-2xl p-5 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none">
            </div>
            <div class="space-y-2">
              <label class="text-[11px] font-black uppercase tracking-widest text-outline ml-1">Puissance fiscale (CV)</label>
              <input type="number" formControlName="fiscal_power_cv" class="w-full bg-surface-container-low border-none rounded-2xl p-5 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none" placeholder="Ex: 9">
            </div>
            <div class="space-y-2">
              <label class="text-[11px] font-black uppercase tracking-widest text-outline ml-1">Visite technique HT (CFA)</label>
              <input type="number" formControlName="ct_amount_ht" class="w-full bg-surface-container-low border-none rounded-2xl p-5 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none">
            </div>
            <div class="space-y-2">
              <label class="text-[11px] font-black uppercase tracking-widest text-outline ml-1">TVA (CFA)</label>
              <input type="number" formControlName="ct_vat_amount" class="w-full bg-surface-container-low border-none rounded-2xl p-5 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none">
            </div>
            <div class="space-y-2">
              <label class="text-[11px] font-black uppercase tracking-widest text-outline ml-1">Visite technique TTC (CFA)</label>
              <input type="number" formControlName="ct_amount_ttc" class="w-full bg-surface-container-low border-none rounded-2xl p-5 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none">
            </div>
            <div class="space-y-2">
              <label class="text-[11px] font-black uppercase tracking-widest text-outline ml-1">Montant vignette (CFA)</label>
              <input type="number" formControlName="vignette_amount" class="w-full bg-surface-container-low border-none rounded-2xl p-5 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none">
            </div>
            <div class="space-y-2">
              <label class="text-[11px] font-black uppercase tracking-widest text-outline ml-1">Pénalité (CFA)</label>
              <input type="number" formControlName="penalty_amount" class="w-full bg-surface-container-low border-none rounded-2xl p-5 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none">
            </div>
          </div>
        </section>

        <section class="bg-surface-container-low rounded-3xl p-10 border border-outline-variant/20 block" style="display: block !important;">
          <div class="flex items-center gap-3 mb-10">
            <div class="w-2 h-8 bg-secondary rounded-full"></div>
            <h2 class="font-headline font-extrabold text-2xl text-on-surface">Documents officiels</h2>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div class="space-y-3">
               <label class="text-[11px] font-black uppercase tracking-widest text-outline ml-1">Carte grise (PDF / image)</label>
               <div (click)="cgInput.click()" 
                    [class]="'group border-2 border-dashed rounded-3xl p-10 transition-all cursor-pointer flex flex-col items-center justify-center gap-4 ' + (selectedCg ? 'border-primary bg-primary/5' : 'border-outline-variant/40 hover:border-primary/50 hover:bg-white')">
                  <span class="material-symbols-outlined text-4xl" [class.text-primary]="selectedCg">{{ selectedCg ? 'article' : 'upload_file' }}</span>
                  <p class="text-xs font-black uppercase tracking-widest text-center">{{ selectedCg ? selectedCg.name : 'Choisir la carte grise' }}</p>
                  <input #cgInput type="file" (change)="handleAdminFile($event, 'cg')" accept="image/*,.pdf" class="hidden">
               </div>
            </div>

            <div class="space-y-3">
               <label class="text-[11px] font-black uppercase tracking-widest text-outline ml-1">Vignette fiscale</label>
               <div (click)="vgInput.click()" 
                    [class]="'group border-2 border-dashed rounded-3xl p-10 transition-all cursor-pointer flex flex-col items-center justify-center gap-4 ' + (selectedVg ? 'border-secondary bg-secondary/5' : 'border-outline-variant/40 hover:border-secondary/50 hover:bg-white')">
                  <span class="material-symbols-outlined text-4xl" [class.text-secondary]="selectedVg">{{ selectedVg ? 'confirmation_number' : 'upload_file' }}</span>
                  <p class="text-xs font-black uppercase tracking-widest text-center">{{ selectedVg ? selectedVg.name : 'Choisir la vignette' }}</p>
                  <input #vgInput type="file" (change)="handleAdminFile($event, 'vg')" accept="image/*,.pdf" class="hidden">
               </div>
            </div>
          </div>
        </section>

        <section class="bg-white rounded-3xl shadow-sm p-10 border border-surface-container/40 block">
          <div class="flex items-center gap-3 mb-10">
            <div class="w-2 h-8 bg-primary-dark rounded-full"></div>
            <h2 class="font-headline font-extrabold text-2xl text-on-surface">Galerie photos <span class="text-xs text-outline font-normal ml-3">(max 3)</span></h2>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div *ngFor="let p of pPreviews; let i = index" class="relative group aspect-square rounded-3xl overflow-hidden shadow-lg">
                <img [src]="p" class="w-full h-full object-cover" alt="">
                <button type="button" (click)="removeImg(i)" class="absolute top-4 right-4 w-10 h-10 rounded-full bg-error text-white flex items-center justify-center shadow-2xl">
                    <span class="material-symbols-outlined text-lg">close</span>
                </button>
            </div>

            <div *ngIf="sPhotos.length < 3" 
                 (click)="pInput.click()"
                 class="aspect-square rounded-3xl border-2 border-dashed border-outline-variant/40 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all text-outline hover:text-primary group">
                <span class="material-symbols-outlined text-4xl group-hover:scale-110 transition-transform">add_a_photo</span>
                <span class="text-[10px] font-black uppercase tracking-widest">Ajouter une photo</span>
                <input #pInput type="file" (change)="handlePhotos($event)" accept="image/*" class="hidden" multiple>
            </div>
          </div>
        </section>

        <div class="flex items-center justify-end gap-10 pt-10">
          <a [routerLink]="isEditMode ? ['/clients', clientId, 'vehicules', editVehicleId] : ['/clients', clientId]" class="text-outline hover:text-on-surface font-black text-sm uppercase tracking-widest transition-colors cursor-pointer">Annuler</a>
          <button type="submit" 
                  [disabled]="vehicleForm.invalid || isSaving"
                  class="bg-on-surface text-white px-12 py-5 rounded-2xl font-headline font-black text-xs uppercase tracking-widest shadow-2xl hover:scale-[1.05] active:scale-95 disabled:opacity-30 disabled:scale-100 transition-all flex items-center gap-4">
            <span class="material-symbols-outlined" *ngIf="!isSaving">verified</span>
            <span class="material-symbols-outlined animate-spin" *ngIf="isSaving">sync</span>
            {{ isSaving ? 'Traitement…' : (isEditMode ? 'Enregistrer les modifications' : "Finaliser l'enregistrement") }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`:host { display: block; }`]
})
export class VehicleFormComponent implements OnInit {
  clientId: string | null = null;
  clientName: string = '';
  vehicleForm!: FormGroup;
  isSaving = false;
  editVehicleId: number | null = null;
  loadingVehicle = signal(false);

  selectedCg: File | null = null;
  selectedVg: File | null = null;

  sPhotos: File[] = [];
  pPreviews: string[] = [];

  private fb = inject(FormBuilder);
  private vehicleService = inject(VehicleService);
  private accountService = inject(AccountService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  get isEditMode(): boolean {
    return this.editVehicleId != null;
  }

  ngOnInit(): void {
    this.clientId = this.route.snapshot.paramMap.get('id');

    this.vehicleForm = this.fb.group({
      license_plate: ['', [Validators.required, Validators.minLength(4)]],
      brand: [''],
      model: [''],
      year: [null],
      fuel_type: [''],
      last_visit_date: [''],
      vehicle_type: [''],
      ptac_kg: [null],
      seats: [null],
      registration_date: [''],
      fiscal_power_cv: [null],
      ct_amount_ht: [null],
      ct_vat_amount: [null],
      ct_amount_ttc: [null],
      vignette_amount: [null],
      penalty_amount: [null],
    });

    if (this.clientId) {
      this.accountService.getClient(this.clientId).subscribe((c) => (this.clientName = c.name));
    }

    const vehicleIdParam = this.route.snapshot.paramMap.get('vehicleId');
    if (vehicleIdParam && /^\d+$/.test(vehicleIdParam) && this.router.url.includes('/editer')) {
      this.editVehicleId = +vehicleIdParam;
      this.loadingVehicle.set(true);
      this.vehicleService.getById(this.editVehicleId).subscribe({
        next: (v: any) => {
          const last = v.last_visit || v.last_visit_date;
          this.vehicleForm.patchValue({
            license_plate: (v.license_plate || '').toString(),
            brand: v.brand || '',
            model: v.model || '',
            year: v.year ?? null,
            fuel_type: v.fuel_type || '',
            last_visit_date: last ? String(last).slice(0, 10) : '',
            vehicle_type: v.vehicle_type || '',
            ptac_kg: v.ptac_kg ?? null,
            seats: v.seats ?? null,
            registration_date: v.registration_date ? String(v.registration_date).slice(0, 10) : '',
            fiscal_power_cv: v.fiscal_power_cv ?? null,
            ct_amount_ht: v.ct_amount_ht ?? null,
            ct_vat_amount: v.ct_vat_amount ?? null,
            ct_amount_ttc: v.ct_amount_ttc ?? null,
            vignette_amount: v.vignette_amount ?? null,
            penalty_amount: v.penalty_amount ?? null,
          });
          this.loadingVehicle.set(false);
        },
        error: () => {
          this.loadingVehicle.set(false);
          this.toastService.error('Véhicule introuvable.');
          this.router.navigate(['/clients', this.clientId]);
        },
      });
    }
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

  onSubmit(): void {
    if (this.vehicleForm.invalid || !this.clientId) return;

    this.isSaving = true;
    const raw = this.vehicleForm.value;
    const basePayload = {
      company_id: +this.clientId,
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
      ct_amount_ht: raw.ct_amount_ht ?? null,
      ct_vat_amount: raw.ct_vat_amount ?? null,
      ct_amount_ttc: raw.ct_amount_ttc ?? null,
      vignette_amount: raw.vignette_amount ?? null,
      penalty_amount: raw.penalty_amount ?? null,
    };

    const afterSave = (vehicleId: number) => {
      const up: Observable<any>[] = [];
      if (this.selectedCg) up.push(this.vehicleService.uploadDocument(vehicleId, this.selectedCg, 'carte_grise'));
      if (this.selectedVg) up.push(this.vehicleService.uploadDocument(vehicleId, this.selectedVg, 'vignette'));
      this.sPhotos.forEach((f) => up.push(this.vehicleService.uploadDocument(vehicleId, f, 'photo')));

      if (up.length > 0) {
        forkJoin(up).subscribe({
          next: () => this.done(vehicleId),
          error: () => {
            this.toastService.error('Erreur lors de l’envoi des documents.');
            this.done(vehicleId);
          },
        });
      } else {
        this.done(vehicleId);
      }
    };

    if (this.editVehicleId != null) {
      this.vehicleService.update(this.editVehicleId, basePayload).subscribe({
        next: () => afterSave(this.editVehicleId!),
        error: () => {
          this.isSaving = false;
          this.toastService.error('Erreur lors de la mise à jour.');
        },
      });
    } else {
      this.vehicleService.create(basePayload).subscribe({
        next: (v) => afterSave(v.id),
        error: () => {
          this.isSaving = false;
          this.toastService.error('Erreur lors de la création.');
        },
      });
    }
  }

  private done(vehicleId: number): void {
    this.isSaving = false;
    this.toastService.success(this.isEditMode ? 'Véhicule mis à jour.' : 'Véhicule enregistré.');
    if (this.isEditMode) {
      this.router.navigate(['/clients', this.clientId, 'vehicules', vehicleId]);
    } else {
      this.router.navigate(['/clients', this.clientId]);
    }
  }
}
