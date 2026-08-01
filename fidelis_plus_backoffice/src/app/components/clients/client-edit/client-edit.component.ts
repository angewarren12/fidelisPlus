import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AccountService } from '../../../services/account.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-client-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="max-w-5xl mx-auto space-y-8 animate-fade-in-up">
      
      <!-- Breadcrumbs -->
      <nav class="flex items-center gap-2 text-[10px] font-black text-outline uppercase tracking-[0.2em] mb-4">
        <a routerLink="/clients" class="hover:text-primary transition-colors">Clients</a>
        <span class="material-symbols-outlined text-xs">chevron_right</span>
        <a [routerLink]="['/clients', clientId()]" class="hover:text-primary transition-colors">{{ clientName() || 'Détail' }}</a>
        <span class="material-symbols-outlined text-xs">chevron_right</span>
        <span class="text-primary">Modifier</span>
      </nav>

      <!-- Info Banner -->
      <div class="bg-primary/5 border-l-4 border-primary p-4 rounded-r-xl flex items-start gap-4">
        <span class="material-symbols-outlined text-primary mt-0.5">info</span>
        <p class="text-primary-dark text-sm leading-relaxed font-medium">
          Modification des informations administratives et commerciales de l'entreprise.
        </p>
      </div>

      <div *ngIf="loadingData()" class="flex flex-col items-center justify-center py-20 bg-white rounded-xl shadow-sm border border-surface-container/30">
        <span class="material-symbols-outlined animate-spin text-primary text-4xl mb-4">sync</span>
        <p class="text-xs font-bold text-outline uppercase tracking-widest">Chargement des données...</p>
      </div>

      <form *ngIf="!loadingData()" [formGroup]="editForm" (ngSubmit)="onSubmit()" class="space-y-8">
        <!-- Card 1: Informations Entreprise -->
        <section class="bg-white rounded-xl shadow-sm p-8 border border-surface-container/30">
          <div class="flex items-center gap-3 mb-8">
            <div class="w-1.5 h-6 bg-primary rounded-full"></div>
            <h2 class="font-headline font-bold text-xl text-on-surface">Informations Entreprise</h2>
          </div>
          
          <div class="grid grid-cols-2 gap-6">
            <div class="col-span-2 space-y-2">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Raison sociale *</label>
              <input type="text" formControlName="name" 
                     class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                     placeholder="Ex: Logistique Transport SA"
                     [class.ring-2]="editForm.get('name')?.invalid && editForm.get('name')?.touched"
                     [class.ring-error]="editForm.get('name')?.invalid && editForm.get('name')?.touched">
            </div>
            
            <div class="space-y-2">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Numéro Registre de Commerce (RCCM)</label>
              <input type="text" formControlName="rccm" class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="CI-ABJ-2026-A-12345">
            </div>
            
            <div class="space-y-2">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Email Officiel</label>
              <input type="email" formControlName="email" class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="contact@entreprise.com">
            </div>

            <div class="space-y-2">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Téléphone Standard</label>
              <input type="tel" formControlName="phone" class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="+225 ...">
            </div>

            <div class="space-y-2">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Secteur d'activité</label>
              <select formControlName="sector" class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none">
                <option *ngFor="let s of sectors" [value]="s">{{ s }}</option>
              </select>
            </div>
            
            <div class="col-span-2 space-y-2">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Adresse complète</label>
              <input type="text" formControlName="address" class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="15 Avenue des Champs-Élysées">
            </div>
          </div>
        </section>

        <!-- Card 2: Informations Commerciales -->
        <section class="bg-white rounded-xl shadow-sm p-8 border border-surface-container/30">
          <div class="flex items-center gap-3 mb-8">
            <div class="w-1.5 h-6 bg-secondary rounded-full"></div>
            <h2 class="font-headline font-bold text-xl text-on-surface">Observations & Notes</h2>
          </div>
          
          <div class="grid grid-cols-2 gap-6">
            <div class="col-span-2 space-y-2">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Observations internes</label>
              <textarea formControlName="observations" class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none h-32" placeholder="Notes sur le client..."></textarea>
            </div>
          </div>
        </section>

        <!-- Bottom Actions -->
        <div class="flex items-center justify-end gap-8 pt-4 pb-12">
          <a [routerLink]="['/clients', clientId()]" class="text-outline hover:text-on-surface font-bold text-sm transition-colors cursor-pointer">Annuler</a>
          <button type="submit" 
                  [disabled]="editForm.invalid || saving()"
                  class="bg-primary text-white px-10 py-4 rounded-xl font-headline font-bold text-sm shadow-xl shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 transition-all flex items-center gap-2">
            <span class="material-symbols-outlined" *ngIf="!saving()">save</span>
            <span class="material-symbols-outlined animate-spin" *ngIf="saving()">sync</span>
            {{ saving() ? 'Enregistrement...' : 'Enregistrer les modifications' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`:host { display: block; }`]
})
export class ClientEditComponent implements OnInit {
  clientId = signal<string | null>(null);
  clientName = signal<string>('');
  editForm!: FormGroup;
  loadingData = signal(true);
  saving = signal(false);
  sectors: string[] = ['Logistique & Transport', 'Automobile', 'Construction', 'Agro-alimentaire', 'Commerce', 'Services', 'Industrie'];

  private fb = inject(FormBuilder);
  private accountService = inject(AccountService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.clientId.set(id);

    this.editForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      rccm: [''],
      sector: ['Logistique & Transport'],
      address: [''],
      observations: [''],
    });

    if (id) {
      this.loadClientData(id);
    }
  }

  loadClientData(id: string): void {
    this.loadingData.set(true);
    this.accountService.getClient(id).subscribe({
      next: (client) => {
        this.clientName.set(client.name);
        this.editForm.patchValue({
          name: client.name,
          email: client.email,
          phone: client.phone,
          rccm: client.rccm,
          sector: client.sector,
          address: client.address,
          observations: client.observations,
        });
        this.loadingData.set(false);
      },
      error: (err) => {
        this.toastService.error('Erreur lors du chargement des données.');
        this.router.navigate(['/clients']);
      }
    });
  }

  onSubmit(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const id = this.clientId();
    if (!id) return;

    this.saving.set(true);
    this.accountService.updateClient(id, this.editForm.value).subscribe({
      next: () => {
        this.saving.set(false);
        this.toastService.success('Le profil client a été mis à jour avec succès.');
        this.router.navigate(['/clients', id]);
      },
      error: (err) => {
        this.saving.set(false);
        this.toastService.error('Erreur lors de la mise à jour.');
      }
    });
  }
}
