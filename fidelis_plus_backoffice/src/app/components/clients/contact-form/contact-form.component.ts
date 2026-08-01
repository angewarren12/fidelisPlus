import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AccountService } from '../../../services/account.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-contact-form',
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
        <span class="text-primary">Nouveau Correspondant</span>
      </nav>

      <!-- Info Banner -->
      <div class="bg-secondary/5 border-l-4 border-secondary p-4 rounded-r-xl flex items-start gap-4">
        <span class="material-symbols-outlined text-secondary mt-0.5">person_add</span>
        <p class="text-secondary text-sm leading-relaxed font-medium">
          Créez un nouvel accès utilisateur pour que ce correspondant puisse se connecter à l'application mobile Fidelis Plus.
        </p>
      </div>

      <form [formGroup]="contactForm" (ngSubmit)="onSubmit()" class="space-y-8">
        <!-- Card: Informations Correspondant -->
        <section class="bg-white rounded-xl shadow-sm p-8 border border-surface-container/30">
          <div class="flex items-center gap-3 mb-8">
            <div class="w-1.5 h-6 bg-secondary rounded-full"></div>
            <h2 class="font-headline font-bold text-xl text-on-surface">Informations Personnel</h2>
          </div>
          
          <div class="grid grid-cols-2 gap-6">
            <div class="space-y-2">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Prénom *</label>
              <input type="text" formControlName="first_name" class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-secondary/20 outline-none" placeholder="Jean">
            </div>
            <div class="space-y-2">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Nom *</label>
              <input type="text" formControlName="last_name" class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-secondary/20 outline-none" placeholder="Dupont">
            </div>
            <div class="col-span-2 space-y-2">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Email (Identifiant de connexion) *</label>
              <input type="email" formControlName="email" class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-secondary/20 outline-none" placeholder="j.dupont@entreprise.ci">
            </div>
            <div class="space-y-2">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Téléphone Direct</label>
              <input type="tel" formControlName="phone" class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-secondary/20 outline-none" placeholder="+225 00 00 00 00">
            </div>
            <div class="space-y-2">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Poste / Fonction</label>
              <input type="text" formControlName="position" class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-secondary/20 outline-none" placeholder="Directeur de parc">
            </div>
          </div>

          <div class="mt-8 p-4 bg-secondary/5 border border-secondary/10 rounded-xl flex items-start gap-4">
             <span class="material-symbols-outlined text-secondary" aria-hidden="true">lock_open</span>
             <div>
               <p class="text-[11px] font-black uppercase text-secondary tracking-widest mb-1">Sécurité</p>
               <p class="text-xs font-semibold text-secondary/80">
                 Un mot de passe est généré automatiquement et envoyé par email à ce correspondant. Il devra le modifier obligatoirement lors de sa première connexion.
               </p>
             </div>
          </div>
        </section>

        <!-- Bottom Actions -->
        <div class="flex items-center justify-end gap-8 pt-4 pb-12">
          <a [routerLink]="['/clients', clientId()]" class="text-outline hover:text-on-surface font-bold text-sm transition-colors cursor-pointer">Annuler</a>
          <button type="submit" 
                  [disabled]="contactForm.invalid || saving()"
                  class="bg-secondary text-white px-10 py-4 rounded-xl font-headline font-bold text-sm shadow-xl shadow-secondary/25 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 transition-all flex items-center gap-2">
            <span class="material-symbols-outlined" *ngIf="!saving()">person_add</span>
            <span class="material-symbols-outlined animate-spin" *ngIf="saving()">sync</span>
            {{ saving() ? 'Création...' : 'Créer le compte correspondant' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`:host { display: block; }`]
})
export class ContactFormComponent implements OnInit {
  clientId = signal<string | null>(null);
  clientName = signal<string>('');
  contactForm!: FormGroup;
  saving = signal(false);

  private fb = inject(FormBuilder);
  private accountService = inject(AccountService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.clientId.set(id);

    this.contactForm = this.fb.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      position: [''],
      role: ['client']
    });

    if (id) {
      this.accountService.getClient(id).subscribe(client => this.clientName.set(client.name));
    }
  }

  onSubmit(): void {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    const id = this.clientId();
    if (!id) return;

    this.saving.set(true);
    this.accountService.addContact(id, this.contactForm.value).subscribe({
      next: (user) => {
        this.saving.set(false);
        this.toastService.success(`${user.first_name} ${user.last_name} a été ajouté avec succès.`);
        this.router.navigate(['/clients', id]);
      },
      error: (err) => {
        this.saving.set(false);
        const msg = err.error?.errors?.email ? 'Cet email existe déjà.' : 'Erreur lors de la création.';
        this.toastService.error(msg);
      }
    });
  }
}
