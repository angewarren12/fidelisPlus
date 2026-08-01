import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AccountService } from '../../../services/account.service';
import { ToastService } from '../../../services/toast.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-client-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="max-w-5xl mx-auto space-y-8 animate-fade-in-up">

      <!-- Info Banner -->
      <div class="bg-[#E9F7EF] border-l-4 border-secondary p-4 rounded-r-xl flex items-start gap-4">
        <span class="material-symbols-outlined text-secondary mt-0.5">info</span>
        <p class="text-green-900 text-sm leading-relaxed font-medium">
          Enregistrez un client direct qui n'est pas passé par la prospection. Un compte lui sera créé immédiatement.
        </p>
      </div>

      <form [formGroup]="clientForm" (ngSubmit)="onSubmit()" class="space-y-8">

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
                     [class.ring-2]="clientForm.get('name')?.invalid && clientForm.get('name')?.touched"
                     [class.ring-error]="clientForm.get('name')?.invalid && clientForm.get('name')?.touched">
            </div>
            
            <div class="space-y-2">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Numéro Registre de Commerce (RCCM)</label>
              <input type="text" formControlName="rccm" class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="CI-ABJ-2026-A-12345">
            </div>
            
            <div class="space-y-2">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Secteur d'activité</label>
              <select formControlName="sector" class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none">
                <option *ngFor="let s of sectors" [value]="s">{{ s }}</option>
              </select>
            </div>

            <div class="space-y-2">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Catégorie Client *</label>
              <select formControlName="category" class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none">
                <option value="entreprise">🏢 Entreprise / Flotte</option>
                <option value="particulier">👤 Particulier / Individuel</option>
              </select>
            </div>

            <div class="space-y-2" *ngIf="clientForm.get('category')?.value === 'entreprise'">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Type d'entreprise</label>
              <select formControlName="company_type" class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none">
                <option [ngValue]="null">— Non spécifié —</option>
                <option value="flotte">Gestionnaire de Flotte (10+ véhicules)</option>
                <option value="apporteur">Apporteur d'affaires</option>
                <option value="garage">Garage partenaire</option>
              </select>
            </div>
            
            <div class="col-span-2 space-y-2">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Adresse</label>
              <input type="text" formControlName="address" class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="15 Avenue des Champs-Élysées">
            </div>
          </div>
        </section>

        <!-- Card 2: Correspondant Principal -->
        <section class="bg-white rounded-xl shadow-sm p-8 border border-surface-container/30">
          <div class="flex items-center gap-3 mb-8">
            <div class="w-1.5 h-6 bg-primary rounded-full"></div>
            <h2 class="font-headline font-bold text-xl text-on-surface">Correspondant Principal</h2>
          </div>
          
          <div class="grid grid-cols-2 gap-6">
            <div class="space-y-2">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Prénom *</label>
              <input type="text" formControlName="first_name" class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Jean">
            </div>
            <div class="space-y-2">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Nom *</label>
              <input type="text" formControlName="last_name" class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Kouassi">
            </div>
            <div class="space-y-2">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Poste / Fonction</label>
              <input type="text" formControlName="position" class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Directeur Logistique">
            </div>
            <div class="space-y-2">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Téléphone Direct</label>
              <input type="tel" formControlName="phone" class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="+225 07 48 29 10">
            </div>
            <div class="col-span-2 space-y-2">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Email Professionnel *</label>
              <input type="email" formControlName="email" class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="j.kouassi@entreprise.com">
              <p *ngIf="clientForm.get('email')?.invalid && clientForm.get('email')?.touched" class="text-error text-xs mt-1 ml-1">Email invalide ou déjà utilisé.</p>
            </div>
          </div>
        </section>

        <!-- Card 3: Informations Commerciales -->
        <section class="bg-white rounded-xl shadow-sm p-8 border border-surface-container/30">
          <div class="flex items-center gap-3 mb-8">
            <div class="w-1.5 h-6 bg-secondary rounded-full"></div>
            <h2 class="font-headline font-bold text-xl text-on-surface">Informations Commerciales</h2>
          </div>
          
          <div class="grid grid-cols-2 gap-6">
            <div class="space-y-2">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Parrain (Apporteur d'affaires)</label>
              <select formControlName="referrer_company_id" class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none">
                <option [ngValue]="null">-- Aucun --</option>
                <option *ngFor="let c of clients" [value]="c.id">{{ c.name }}</option>
              </select>
            </div>
            
            <div class="col-span-2 space-y-2">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Observations / Notes</label>
              <textarea formControlName="observations" class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none h-28" placeholder="Informations importantes sur ce client..."></textarea>
            </div>
          </div>
        </section>

        <!-- Bottom Actions -->
        <div class="flex items-center justify-end gap-8 pt-4 pb-12">
          <a routerLink="/clients" class="text-outline hover:text-on-surface font-bold text-sm transition-colors cursor-pointer">Annuler</a>
          <button type="submit" 
                  [disabled]="clientForm.invalid || loading()"
                  class="bg-secondary text-white px-10 py-4 rounded-xl font-headline font-bold text-sm shadow-xl shadow-secondary/25 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 transition-all flex items-center gap-2">
            <span class="material-symbols-outlined" *ngIf="!loading()">person_add</span>
            <span class="material-symbols-outlined animate-spin" *ngIf="loading()">sync</span>
            {{ loading() ? 'Enregistrement...' : 'Créer le client' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`:host { display: block; }`]
})
export class ClientFormComponent implements OnInit {
  clientForm!: FormGroup;
  loading = signal(false);
  sectors: string[] = ['Logistique & Transport', 'Automobile', 'Construction', 'Agro-alimentaire', 'Commerce', 'Services', 'Industrie'];
  clients: any[] = [];

  private fb = inject(FormBuilder);
  private accountService = inject(AccountService);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);
  private router = inject(Router);

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    this.clientForm = this.fb.group({
      name: ['', Validators.required],
      rccm: [''],
      sector: ['Logistique & Transport'],
      address: [''],
      // Correspondent
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      position: [''],
      phone: [''],
      email: ['', [Validators.required, Validators.email]],
      // Commercial
      commercial_id: [currentUser?.id],
      category: ['entreprise', Validators.required],
      company_type: [null],
      referrer_company_id: [null],
      observations: [''],
    });

    this.accountService.getClients().subscribe(clients => {
      this.clients = clients;
    });
  }

  onSubmit(): void {
    if (this.clientForm.invalid) {
      this.clientForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const formValue = this.clientForm.value;

    this.accountService.createClient(formValue).subscribe({
      next: () => {
        this.loading.set(false);
        this.toastService.success(`Le client ${formValue.name} a été créé avec succès !`);
        this.router.navigate(['/clients']);
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 422 && err.error?.errors) {
          const errors = Object.values(err.error.errors).flat().join('\n');
          this.toastService.error('Erreur : ' + errors);
        } else {
          this.toastService.error(err.error?.message || 'Erreur lors de la création du client.');
        }
        console.error(err);
      }
    });
  }
}
