import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { TeamService } from '../../../services/team.service';
import { ToastService } from '../../../services/toast.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-team-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="max-w-4xl mx-auto space-y-10 animate-fade-in pb-20">
      
      <!-- HEADER -->
      <section class="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <a routerLink="/equipe" class="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-outline hover:text-primary transition-colors mb-4">
             <span class="material-symbols-outlined text-sm">arrow_back</span>
             Retour à l'équipe
          </a>
          <h1 class="text-3xl md:text-5xl font-headline font-black text-on-surface tracking-tighter">
            {{ isEditing ? 'Éditer' : 'Nouveau' }} <span class="text-primary">Collaborateur</span>
          </h1>
          <p class="text-outline text-sm font-medium mt-2">
            {{ isEditing ? 'Mettez à jour les informations du collaborateur.' : 'Créez un profil pour donner l\'accès à un vendeur ou un administrateur.' }}
          </p>
        </div>
      </section>

      <!-- FORMULAIRE -->
      <form [formGroup]="teamForm" (ngSubmit)="onSubmit()" class="bg-white p-10 rounded-[2.5rem] border border-outline-variant/10 shadow-sm space-y-8">
         <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <!-- Prénom -->
            <div class="space-y-2">
               <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Prénom</label>
               <input type="text" formControlName="first_name" class="w-full bg-surface-container-low border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Marc">
            </div>

            <!-- Nom -->
            <div class="space-y-2">
               <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Nom de famille</label>
               <input type="text" formControlName="last_name" class="w-full bg-surface-container-low border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Dupuis">
            </div>

            <!-- Email -->
            <div class="space-y-2">
               <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Email <span class="text-error">*</span></label>
               <input type="email" formControlName="email" class="w-full bg-surface-container-low border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="marc@mayelia.ci">
               <p *ngIf="!isEditing" class="text-[10px] text-primary/70 font-medium ml-1 mt-1">Un mot de passe sera généré et envoyé à cette adresse.</p>
            </div>

            <!-- Téléphone -->
            <div class="space-y-2">
               <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Téléphone mobile</label>
               <input type="text" formControlName="phone" class="w-full bg-surface-container-low border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="+225 0102030405">
            </div>

            <!-- Rôle -->
            <div class="space-y-2 col-span-1 md:col-span-2">
               <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Rôle dans le système</label>
               <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                  <label [class.border-primary]="teamForm.get('role')?.value === 'commercial'" [class.bg-primary/5]="teamForm.get('role')?.value === 'commercial'" class="cursor-pointer p-4 rounded-xl border border-outline-variant/20 flex flex-col items-center justify-center text-center gap-2 transition-all hover:bg-surface-container">
                     <input type="radio" formControlName="role" value="commercial" class="hidden">
                     <span class="material-symbols-outlined text-secondary text-3xl">sensor_door</span>
                     <div>
                        <span class="block font-black text-on-surface">Commercial / Vendeur</span>
                        <span class="text-[10px] text-outline">Gère ses clients et ses devis</span>
                     </div>
                  </label>
                  <label *ngIf="isAdmin" [class.border-primary]="teamForm.get('role')?.value === 'admin'" [class.bg-primary/5]="teamForm.get('role')?.value === 'admin'" class="cursor-pointer p-4 rounded-xl border border-outline-variant/20 flex flex-col items-center justify-center text-center gap-2 transition-all hover:bg-surface-container">
                     <input type="radio" formControlName="role" value="admin" class="hidden">
                     <span class="material-symbols-outlined text-primary text-3xl">admin_panel_settings</span>
                     <div>
                        <span class="block font-black text-on-surface">Administrateur</span>
                        <span class="text-[10px] text-outline">Vue globale CRM</span>
                     </div>
                  </label>
                  <label *ngIf="isAdmin" [class.border-primary]="teamForm.get('role')?.value === 'marketing'" [class.bg-primary/5]="teamForm.get('role')?.value === 'marketing'" class="cursor-pointer p-4 rounded-xl border border-outline-variant/20 flex flex-col items-center justify-center text-center gap-2 transition-all hover:bg-surface-container">
                     <input type="radio" formControlName="role" value="marketing" class="hidden">
                     <span class="material-symbols-outlined text-amber-500 text-3xl">campaign</span>
                     <div>
                        <span class="block font-black text-on-surface">Marketing</span>
                        <span class="text-[10px] text-outline">Fidélité & campagnes</span>
                     </div>
                  </label>
                  <label *ngIf="isAdmin" [class.border-primary]="teamForm.get('role')?.value === 'caissier'" [class.bg-primary/5]="teamForm.get('role')?.value === 'caissier'" class="cursor-pointer p-4 rounded-xl border border-outline-variant/20 flex flex-col items-center justify-center text-center gap-2 transition-all hover:bg-surface-container">
                     <input type="radio" formControlName="role" value="caissier" class="hidden">
                     <span class="material-symbols-outlined text-teal-400 text-3xl">qr_code_scanner</span>
                     <div>
                        <span class="block font-black text-on-surface">Caissière station</span>
                        <span class="text-[10px] text-outline">Scan carte fidélité en magasin</span>
                     </div>
                  </label>
               </div>
               <p *ngIf="!isAdmin" class="text-[10px] text-outline font-medium ml-1 mt-2">En tant que commercial, vous ne pouvez inviter que d&apos;autres commerciaux.</p>
            </div>
         </div>

         <!-- ACTIONS -->
         <div class="pt-8 mt-8 border-t border-outline-variant/10 flex items-center justify-end gap-4">
            <button type="button" routerLink="/equipe" class="px-8 py-4 rounded-xl bg-surface-container text-on-surface text-[10px] font-black uppercase tracking-widest hover:bg-surface-container-high transition-colors">
               Annuler
            </button>
            <button type="submit" [disabled]="teamForm.invalid || isSaving" class="px-8 py-4 rounded-xl bg-[#1b1932] text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
               <span *ngIf="isSaving" class="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></span>
               {{ isEditing ? 'Mettre à jour' : 'Inviter le collaborateur' }}
            </button>
         </div>
      </form>

    </div>

    <!-- MODAL IDENTIFIANTS -->
    <div *ngIf="createdCredentials()" class="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 py-10">
      <div class="absolute inset-0 bg-[#161d1b]/60 backdrop-blur-sm"></div>
      <div class="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-fade-in">

        <div class="bg-[#1b1932] px-8 py-7 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl bg-primary-container flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-white text-2xl">check_circle</span>
          </div>
          <div>
            <p class="text-secondary-fixed text-[10px] font-black uppercase tracking-[0.14em]">Compte créé</p>
            <h2 class="text-white text-lg font-black tracking-tight">Identifiants du collaborateur</h2>
          </div>
        </div>

        <div class="p-8 space-y-6">
          <p class="text-outline text-sm leading-relaxed">
            Ces identifiants ont aussi été envoyés par email à <strong class="text-on-surface">{{ createdCredentials()?.email }}</strong>.
            Conseillez au collaborateur de changer son mot de passe dès sa première connexion.
          </p>

          <div class="bg-surface-container-low rounded-2xl border border-outline-variant/20 divide-y divide-outline-variant/20">
            <div class="p-5 flex items-center justify-between gap-4">
              <div class="min-w-0">
                <p class="text-[10px] font-black uppercase tracking-widest text-outline mb-1">Email</p>
                <p class="text-sm font-bold text-on-surface truncate">{{ createdCredentials()?.email }}</p>
              </div>
              <button type="button" (click)="copy(createdCredentials()?.email, 'email')" class="shrink-0 w-9 h-9 rounded-lg bg-white border border-outline-variant/20 flex items-center justify-center hover:bg-surface-container transition-colors">
                <span class="material-symbols-outlined text-lg" [class.text-primary]="copiedField === 'email'">{{ copiedField === 'email' ? 'check' : 'content_copy' }}</span>
              </button>
            </div>
            <div class="p-5 flex items-center justify-between gap-4">
              <div class="min-w-0">
                <p class="text-[10px] font-black uppercase tracking-widest text-outline mb-1">Mot de passe provisoire</p>
                <p class="text-base font-black text-primary tracking-widest font-mono">{{ createdCredentials()?.password }}</p>
              </div>
              <button type="button" (click)="copy(createdCredentials()?.password, 'password')" class="shrink-0 w-9 h-9 rounded-lg bg-white border border-outline-variant/20 flex items-center justify-center hover:bg-surface-container transition-colors">
                <span class="material-symbols-outlined text-lg" [class.text-primary]="copiedField === 'password'">{{ copiedField === 'password' ? 'check' : 'content_copy' }}</span>
              </button>
            </div>
          </div>

          <button type="button" (click)="closeCredentialsModal()" class="w-full px-8 py-4 rounded-xl bg-[#1b1932] text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors">
            Terminé
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .animate-fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class TeamFormComponent implements OnInit {
  teamForm: FormGroup;
  isEditing = false;
  userId: number | null = null;
  isSaving = false;
  createdCredentials = signal<{ email: string; password: string } | null>(null);
  copiedField: 'email' | 'password' | null = null;

  private fb = inject(FormBuilder);
  private teamService = inject(TeamService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);

  get isAdmin(): boolean {
    return this.authService.getCurrentUser()?.role === 'admin';
  }

  constructor() {
    this.teamForm = this.fb.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      role: ['commercial', Validators.required]
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditing = true;
      this.userId = +id;
      this.loadUser();
    } else if (!this.isAdmin) {
      this.teamForm.patchValue({ role: 'commercial' });
    }
  }

  loadUser() {
    this.teamService.getById(this.userId!).subscribe({
      next: (user) => {
        this.teamForm.patchValue({
           first_name: user.first_name,
           last_name: user.last_name,
           email: user.email,
           phone: user.phone,
           role: user.role
        });
      },
      error: () => {
        this.toastService.error('Impossible de charger le profil.');
        this.router.navigate(['/equipe']);
      }
    });
  }

  onSubmit() {
    if (this.teamForm.invalid) {
       this.toastService.error('Veuillez remplir tous les champs obligatoires.');
       return;
    }

    this.isSaving = true;
    const data = this.teamForm.value;

    if (this.isEditing && this.userId) {
      this.teamService.update(this.userId, data).subscribe({
        next: () => {
          this.toastService.success('Profil mis à jour.');
          this.router.navigate(['/equipe']);
        },
        error: (err) => {
          this.isSaving = false;
          this.toastService.error(err.error?.message || 'Erreur lors de la mise à jour.');
        }
      });
    } else {
      this.teamService.create(data).subscribe({
        next: ({ user, temporary_password }) => {
          this.isSaving = false;
          this.toastService.success('Collaborateur invité. Accès envoyés par email !');
          this.createdCredentials.set({ email: user.email, password: temporary_password });
        },
        error: (err) => {
          this.isSaving = false;
          this.toastService.error(err.error?.message || 'Erreur lors de la création.');
        }
      });
    }
  }

  copy(value: string | undefined, field: 'email' | 'password') {
    if (!value) return;
    navigator.clipboard.writeText(value);
    this.copiedField = field;
    setTimeout(() => {
      if (this.copiedField === field) this.copiedField = null;
    }, 1500);
  }

  closeCredentialsModal() {
    this.createdCredentials.set(null);
    this.router.navigate(['/equipe']);
  }
}
