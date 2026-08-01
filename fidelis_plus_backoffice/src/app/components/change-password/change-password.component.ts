import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmation = control.get('password_confirmation')?.value;
  return password && confirmation && password !== confirmation ? { mismatch: true } : null;
}

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <main class="w-full max-w-[420px] bg-white rounded-xl shadow-xl p-10 overflow-hidden mx-auto my-20">
      <header class="flex flex-col items-center mb-8 text-center">
        <div class="w-14 h-14 bg-primary-container rounded-xl flex items-center justify-center mb-4 text-white">
          <span class="material-symbols-outlined text-3xl" aria-hidden="true">password</span>
        </div>
        <h1 class="font-headline font-extrabold text-2xl text-[#1a1831] tracking-tight">Nouveau mot de passe requis</h1>
        <p class="font-label text-sm text-on-surface-variant/70 tracking-wide mt-1">
          Pour votre sécurité, veuillez définir un nouveau mot de passe avant de continuer.
        </p>
      </header>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-5">
        <div class="space-y-1.5">
          <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider ml-1" for="current_password">
            Mot de passe reçu par email
          </label>
          <input
            class="w-full bg-[#f4f6f8] border-none rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary-container/20 focus:bg-white transition-all outline-none"
            id="current_password"
            formControlName="current_password"
            type="password"
            autocomplete="current-password">
          <p *ngIf="form.controls['current_password'].invalid && form.controls['current_password'].touched" class="text-xs text-error font-medium ml-1 mt-1">
            Ce champ est requis.
          </p>
        </div>

        <div class="space-y-1.5">
          <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider ml-1" for="password">
            Nouveau mot de passe
          </label>
          <input
            class="w-full bg-[#f4f6f8] border-none rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary-container/20 focus:bg-white transition-all outline-none"
            id="password"
            formControlName="password"
            type="password"
            autocomplete="new-password">
          <p *ngIf="form.controls['password'].invalid && form.controls['password'].touched" class="text-xs text-error font-medium ml-1 mt-1">
            8 caractères minimum.
          </p>
        </div>

        <div class="space-y-1.5">
          <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider ml-1" for="password_confirmation">
            Confirmer le nouveau mot de passe
          </label>
          <input
            class="w-full bg-[#f4f6f8] border-none rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary-container/20 focus:bg-white transition-all outline-none"
            id="password_confirmation"
            formControlName="password_confirmation"
            type="password"
            autocomplete="new-password">
          <p *ngIf="form.errors?.['mismatch'] && form.controls['password_confirmation'].touched" class="text-xs text-error font-medium ml-1 mt-1">
            Les mots de passe ne correspondent pas.
          </p>
        </div>

        <div *ngIf="errorMessage()" class="bg-error-container text-on-error-container px-4 py-2 rounded-lg text-xs font-medium border border-error/10">
          {{ errorMessage() }}
        </div>

        <button
          [disabled]="loading() || form.invalid"
          class="w-full bg-[#15b9a3] hover:bg-[#006b5d] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          type="submit">
          <span *ngIf="!loading()">Valider et continuer</span>
          <span *ngIf="loading()">Enregistrement...</span>
        </button>
      </form>
    </main>
  `
})
export class ChangePasswordComponent {
  form: FormGroup;
  loading = signal(false);
  errorMessage = signal('');

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  constructor() {
    this.form = this.fb.group({
      current_password: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      password_confirmation: ['', [Validators.required]],
    }, { validators: passwordsMatchValidator });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set('');
    const { current_password, password, password_confirmation } = this.form.value;

    this.authService.changePassword(current_password, password, password_confirmation).subscribe({
      next: () => {
        this.loading.set(false);
        this.toastService.success('Mot de passe mis à jour avec succès.');
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || 'Une erreur est survenue. Veuillez réessayer.');
      }
    });
  }
}
