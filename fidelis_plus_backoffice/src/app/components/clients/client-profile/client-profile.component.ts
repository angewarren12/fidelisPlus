import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-client-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="animate-fade-in-up space-y-8 max-w-2xl">

      <section>
        <h1 class="text-2xl md:text-3xl font-headline font-black text-on-surface">Mon Profil</h1>
        <p class="text-outline text-sm font-medium mt-1">Gérez vos informations personnelles.</p>
      </section>

      <div class="bg-white rounded-2xl border border-surface-container/30 shadow-sm p-8">
        <form [formGroup]="profileForm" (ngSubmit)="onSubmit()" class="space-y-6">

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label for="first_name" class="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Prénom</label>
              <input type="text" id="first_name" formControlName="first_name" readonly
                     class="w-full px-4 py-2.5 bg-surface-container-high text-outline rounded-xl border-none text-sm outline-none cursor-not-allowed">
            </div>
            <div>
              <label for="last_name" class="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Nom</label>
              <input type="text" id="last_name" formControlName="last_name" readonly
                     class="w-full px-4 py-2.5 bg-surface-container-high text-outline rounded-xl border-none text-sm outline-none cursor-not-allowed">
            </div>
          </div>

          <div>
            <label for="email" class="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Email (identifiant de connexion)</label>
            <input type="email" id="email" formControlName="email" autocomplete="email" readonly
                   class="w-full px-4 py-2.5 bg-surface-container-high text-outline rounded-xl border-none text-sm outline-none cursor-not-allowed">
          </div>
          <p class="text-[11px] text-outline/70 -mt-3">
            Le prénom, le nom et l'email sont gérés par votre conseiller et ne peuvent pas être modifiés ici. Contactez-le pour toute correction.
          </p>

          <div>
            <label for="phone" class="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Téléphone</label>
            <input type="tel" id="phone" formControlName="phone" autocomplete="tel" placeholder="+225 00 00 00 00 00"
                   class="w-full px-4 py-2.5 bg-surface-container rounded-xl border-none text-sm outline-none focus:ring-2 focus:ring-primary/20">
          </div>

          <div *ngIf="errorMessage()" class="bg-error-container text-on-error-container px-4 py-2 rounded-lg text-xs font-medium border border-error/10">
            {{ errorMessage() }}
          </div>

          <div class="pt-2 flex items-center justify-end gap-3">
            <button type="submit" [disabled]="profileForm.invalid || profileForm.pristine || submitting()"
                    class="px-6 py-2.5 bg-primary text-white font-bold text-xs rounded-lg shadow-md shadow-primary/10 hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all">
              {{ submitting() ? 'Enregistrement...' : 'Enregistrer' }}
            </button>
          </div>
        </form>
      </div>

      <div class="bg-white rounded-2xl border border-surface-container/30 shadow-sm p-8 flex items-center justify-between gap-4">
        <div>
          <p class="text-sm font-bold text-on-surface">Mot de passe</p>
          <p class="text-outline text-xs mt-0.5">Modifiez votre mot de passe de connexion.</p>
        </div>
        <a routerLink="/change-password" class="px-5 py-2.5 border border-slate-200 text-outline hover:text-on-surface font-bold text-xs rounded-lg transition-colors shrink-0">
          Changer le mot de passe
        </a>
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; }
    .animate-fade-in-up { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class ClientProfileComponent implements OnInit {
  profileForm: FormGroup;
  submitting = signal(false);
  errorMessage = signal('');

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  constructor() {
    this.profileForm = this.fb.group({
      // Lecture seule : identité et identifiant de connexion gérés par le commercial/admin.
      first_name: [{ value: '', disabled: true }],
      last_name: [{ value: '', disabled: true }],
      email: [{ value: '', disabled: true }],
      phone: [''],
    });
  }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.profileForm.patchValue({
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone ?? '',
      });
    }
  }

  onSubmit(): void {
    if (this.profileForm.invalid) return;
    this.errorMessage.set('');
    this.submitting.set(true);

    // Seul le téléphone est modifiable par le client : prénom/nom/email sont en lecture seule.
    const raw = this.profileForm.getRawValue();
    this.authService.updateProfile({
      phone: raw.phone?.trim() || null,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.profileForm.markAsPristine();
        this.toastService.success('Profil mis à jour avec succès.');
      },
      error: (err) => {
        this.submitting.set(false);
        const msg = err?.error?.errors?.email?.[0] || err?.error?.message || 'Erreur lors de la mise à jour du profil.';
        this.errorMessage.set(msg);
      }
    });
  }
}
