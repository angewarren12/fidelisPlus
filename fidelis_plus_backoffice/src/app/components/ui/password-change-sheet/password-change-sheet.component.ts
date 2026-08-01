import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmation = control.get('password_confirmation')?.value;
  return password && confirmation && password !== confirmation ? { mismatch: true } : null;
}

@Component({
  selector: 'app-password-change-sheet',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="fixed inset-0 z-[200] overflow-y-auto flex items-end sm:items-start justify-center bg-[#1b1932]/50 backdrop-blur-sm animate-fade-in">
      <div class="w-full sm:max-w-md bg-white rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden animate-slide-up">

        <div class="bg-[#1b1932] bg-[linear-gradient(135deg,#1b1932_0%,#0f3d35_60%,#006b5d_100%)] px-8 pt-7 pb-8">
          <div class="w-10 h-10 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center mb-4">
            <span class="material-symbols-outlined text-white text-xl">password</span>
          </div>
          <p class="text-secondary-fixed text-[10px] font-black uppercase tracking-[0.14em] mb-1">Sécurité du compte</p>
          <h2 class="text-white text-xl font-black tracking-tight">Définissez votre mot de passe</h2>
          <p class="text-[#c9d8d4] text-xs leading-relaxed mt-2">
            Vous utilisez encore le mot de passe provisoire reçu par email. Vous pouvez le changer maintenant ou plus tard depuis votre profil.
          </p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="p-8 space-y-4">
          <div class="space-y-1.5">
            <label class="block text-[10px] font-black uppercase tracking-wider text-outline ml-1">Mot de passe actuel</label>
            <input
              class="w-full bg-surface-container-low border-none rounded-xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              formControlName="current_password" type="password" autocomplete="current-password">
          </div>

          <div class="space-y-1.5">
            <label class="block text-[10px] font-black uppercase tracking-wider text-outline ml-1">Nouveau mot de passe</label>
            <input
              class="w-full bg-surface-container-low border-none rounded-xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              formControlName="password" type="password" autocomplete="new-password">
            <p *ngIf="form.controls['password'].invalid && form.controls['password'].touched" class="text-[11px] text-error font-medium ml-1">
              8 caractères minimum.
            </p>
          </div>

          <div class="space-y-1.5">
            <label class="block text-[10px] font-black uppercase tracking-wider text-outline ml-1">Confirmer le mot de passe</label>
            <input
              class="w-full bg-surface-container-low border-none rounded-xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              formControlName="password_confirmation" type="password" autocomplete="new-password">
            <p *ngIf="form.errors?.['mismatch'] && form.controls['password_confirmation'].touched" class="text-[11px] text-error font-medium ml-1">
              Les mots de passe ne correspondent pas.
            </p>
          </div>

          <div *ngIf="errorMessage()" class="bg-error-container text-on-error-container px-4 py-2.5 rounded-xl text-xs font-medium">
            {{ errorMessage() }}
          </div>

          <div class="flex items-center gap-3 pt-2">
            <button type="button" (click)="skip.emit()"
                    class="flex-1 py-3.5 rounded-xl bg-surface-container text-outline text-[10px] font-black uppercase tracking-widest hover:bg-surface-container-high transition-colors">
              Plus tard
            </button>
            <button type="submit" [disabled]="loading() || form.invalid"
                    class="flex-1 py-3.5 rounded-xl bg-[#1b1932] text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              <span *ngIf="loading()" class="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin"></span>
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .animate-fade-in { animation: fadeIn 0.25s ease-out forwards; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .animate-slide-up { animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class PasswordChangeSheetComponent {
  @Output() skip = new EventEmitter<void>();
  @Output() done = new EventEmitter<void>();

  form: FormGroup;
  loading = signal(false);
  errorMessage = signal('');

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
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
        this.done.emit();
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || 'Une erreur est survenue. Veuillez réessayer.');
      }
    });
  }
}
