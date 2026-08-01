import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <main class="w-full max-w-[400px] bg-white rounded-xl shadow-xl p-10 overflow-hidden mx-auto my-20">
      <header class="flex flex-col items-center mb-8 text-center">
        <div class="w-14 h-14 bg-primary-container rounded-xl flex items-center justify-center mb-4 text-white">
          <span class="material-symbols-outlined text-3xl" aria-hidden="true">lock_reset</span>
        </div>
        <h1 class="font-headline font-extrabold text-2xl text-[#1a1831] tracking-tight">Mot de passe oublié</h1>
        <p class="font-label text-sm text-on-surface-variant/70 tracking-wide mt-1">Recevez un lien de réinitialisation par email.</p>
      </header>

      <form *ngIf="!sent()" [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-6">
        <div class="space-y-1.5">
          <label class="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider ml-1" for="email">Adresse email</label>
          <input
            class="w-full bg-[#f4f6f8] border-none rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary-container/20 focus:bg-white transition-all outline-none"
            id="email"
            formControlName="email"
            type="email"
            autocomplete="email"
            placeholder="votre@email.com">
          <p *ngIf="form.controls['email'].invalid && form.controls['email'].touched" class="text-xs text-error font-medium ml-1 mt-1">
            {{ emailErrorMessage() }}
          </p>
        </div>

        <div *ngIf="errorMessage()" class="bg-error-container text-on-error-container px-4 py-2 rounded-lg text-xs font-medium border border-error/10">
          {{ errorMessage() }}
        </div>

        <button
          [disabled]="loading() || form.invalid"
          class="w-full bg-[#15b9a3] hover:bg-[#006b5d] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          type="submit">
          <span *ngIf="!loading()">Envoyer le lien</span>
          <span *ngIf="loading()">Envoi...</span>
        </button>
      </form>

      <div *ngIf="sent()" class="text-center space-y-4">
        <span class="material-symbols-outlined text-primary text-4xl" aria-hidden="true">mark_email_read</span>
        <p class="text-sm text-on-surface-variant">Si cet email existe, un lien de réinitialisation vient de vous être envoyé.</p>
      </div>

      <div class="text-center mt-8">
        <a routerLink="/login" class="text-xs font-medium text-primary-container hover:text-primary transition-colors">Retour à la connexion</a>
      </div>
    </main>
  `
})
export class ForgotPasswordComponent {
  form: FormGroup;
  loading = signal(false);
  sent = signal(false);
  errorMessage = signal('');

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  constructor() {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  emailErrorMessage(): string {
    const errors = this.form.controls['email'].errors;
    if (errors?.['required']) return "L'email est requis.";
    return "Format d'email invalide.";
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set('');
    this.authService.forgotPassword(this.form.value.email).subscribe({
      next: () => {
        this.loading.set(false);
        this.sent.set(true);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || 'Une erreur est survenue. Veuillez réessayer.');
      }
    });
  }
}
