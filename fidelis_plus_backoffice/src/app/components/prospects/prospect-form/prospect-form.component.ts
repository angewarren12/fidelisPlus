import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProspectService } from '../../../services/prospect.service';
import { ToastService } from '../../../services/toast.service';
import { AuthService } from '../../../services/auth.service';
import { CreateProspectDto } from '../../../models/prospect.model';

@Component({
  selector: 'app-prospect-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="max-w-6xl mx-auto space-y-8 animate-fade-in-up">
      <!-- Info Banner -->
      <!-- <div class="bg-[#FFF4E5] border-l-4 border-orange-400 p-4 mb-8 rounded-r-xl flex items-start gap-4">
        <span class="material-symbols-outlined text-orange-500 mt-0.5">info</span>
        <p class="text-orange-900 text-sm leading-relaxed font-medium">
          Un prospect n'a pas de compte client. Il sera converti en client lors de la signature d'un bon de commande.
        </p>
      </div> -->

      <div *ngIf="loadingInitial()" class="flex items-center justify-center py-24 text-outline gap-3">
        <span class="material-symbols-outlined animate-spin text-3xl text-primary">sync</span>
        <p class="text-sm font-bold">Chargement du prospect...</p>
      </div>

      <div *ngIf="!loadingInitial()" class="flex items-center gap-3">
        <h1 class="font-headline font-black text-2xl text-on-surface">{{ isEditMode() ? 'Modifier le prospect' : 'Nouveau prospect' }}</h1>
      </div>

      <form *ngIf="!loadingInitial()" [formGroup]="prospectForm" (ngSubmit)="onSubmit()" class="space-y-8">
        <!-- Card 1: Informations Entreprise -->
        <section class="bg-white rounded-xl shadow-sm p-8 border border-surface-container/30">
          <div class="flex items-center gap-3 mb-8">
            <div class="w-1.5 h-6 bg-primary rounded-full"></div>
            <h2 class="font-headline font-bold text-xl text-on-surface">Informations Entreprise</h2>
          </div>

          <div class="grid grid-cols-2 gap-6">
            <div class="col-span-2 space-y-2">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Raison sociale <span class="text-error">*</span></label>
              <input type="text" formControlName="name" class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Ex: Mayelia Automotive Group">
            </div>

            <div class="space-y-2">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Numéro Registre de Commerce (RCCM)</label>
              <input type="text" formControlName="rccm" class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="CI-ABJ-2026-A-12345">
            </div>

            <div class="space-y-2">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Catégorie Client <span class="text-error">*</span></label>
              <select formControlName="category" class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none">
                <option value="entreprise">🏢 Entreprise / Flotte</option>
                <option value="particulier">👤 Particulier / Individuel</option>
              </select>
            </div>

            <div class="space-y-2" *ngIf="prospectForm.get('category')?.value === 'entreprise'">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Type d'entreprise</label>
              <select formControlName="company_type" class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none">
                <option [ngValue]="null">— Non spécifié —</option>
                <option value="flotte">Gestionnaire de Flotte (10+ véhicules)</option>
                <option value="apporteur">Apporteur d'affaires</option>
                <option value="garage">Garage partenaire</option>
              </select>
            </div>

            <div class="space-y-2">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Secteur d'activité <span class="text-error">*</span></label>
              <div class="space-y-2">
                <select formControlName="sector" class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none">
                  <option *ngFor="let s of sectors" [value]="s">{{ s }}</option>
                  <option value="NEW_SECTOR">+ Ajouter un nouveau secteur...</option>
                </select>

                <input *ngIf="prospectForm.get('sector')?.value === 'NEW_SECTOR'"
                       type="text"
                       formControlName="newSector"
                       class="w-full bg-surface-container-low border-2 border-primary/30 rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none animate-fade-in-up"
                       placeholder="Saisissez le nom du nouveau secteur">
              </div>
            </div>

            <div class="col-span-2 space-y-2">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Adresse</label>
              <input type="text" formControlName="address" class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="15 Avenue des Champs-Élysées">
            </div>

            <div class="col-span-2 space-y-2">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Ville</label>
              <input type="text" formControlName="city" class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Paris">
            </div>

            <div class="space-y-2">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Téléphone Entreprise</label>
              <input type="tel" formControlName="phone" class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="+33 1 23 45 67 89">
            </div>
            <div class="space-y-2">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Email Entreprise</label>
              <input type="email" formControlName="email" class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="contact@entreprise.com">
            </div>

            <div class="space-y-2">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Code postal</label>
              <input type="text" formControlName="zip_code" class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="75008">
            </div>
            <div class="space-y-2">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Source du lead</label>
              <input type="text" formControlName="lead_source" class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Salon, recommandation...">
            </div>
            <div class="space-y-2">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Potentiel estimé (FCFA)</label>
              <input type="number" min="0" formControlName="estimated_potential" class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="0">
            </div>
            <div class="space-y-2">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Date de décision estimée</label>
              <input type="date" formControlName="estimated_decision_date" class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none">
            </div>
            <div class="col-span-2 space-y-2">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Besoins identifiés</label>
              <textarea formControlName="needs" rows="3" class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Renouvellement de flotte, financement..."></textarea>
            </div>
          </div>
        </section>

        <!-- Card 2: Correspondant -->
        <section class="bg-white rounded-xl shadow-sm p-8 border border-surface-container/30">
          <div class="flex items-center gap-3 mb-8">
            <div class="w-1.5 h-6 bg-primary rounded-full"></div>
            <h2 class="font-headline font-bold text-xl text-on-surface">Correspondant</h2>
          </div>

          <div class="grid grid-cols-2 gap-6">
            <div class="space-y-2">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Prénom <span class="text-error">*</span></label>
              <input type="text" formControlName="contact_first_name" class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Jean">
            </div>
            <div class="space-y-2">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Nom <span class="text-error">*</span></label>
              <input type="text" formControlName="contact_last_name" class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Dupont">
            </div>
            <div class="space-y-2">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Poste</label>
              <input type="text" formControlName="contact_position" class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Directeur Technique">
            </div>
            <div class="space-y-2">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Téléphone Direct</label>
              <input type="tel" formControlName="contact_phone" class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="+33 6 12 34 56 78">
            </div>
            <div class="col-span-2 space-y-2">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">
                Email Professionnel <span class="text-error" *ngIf="!isEditMode()">*</span>
              </label>
              <input type="email" formControlName="contact_email" class="w-full bg-surface-container-low border-none rounded-lg p-3.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-60" placeholder="j.dupont@entreprise.com">
              <p *ngIf="isEditMode()" class="text-[10px] text-outline ml-1">L'email de connexion ne peut pas être modifié ici.</p>
            </div>
          </div>
        </section>

        <!-- Card 3: Qualification commerciale -->
        <section class="bg-white rounded-xl shadow-sm p-8 border border-surface-container/30">
          <div class="flex items-center gap-3 mb-8">
            <div class="w-1.5 h-6 bg-primary rounded-full"></div>
            <h2 class="font-headline font-bold text-xl text-on-surface">Qualification commerciale</h2>
          </div>

          <!-- Temperature Selection -->
          <div class="space-y-3 mb-8">
            <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Température du prospect <span class="text-error">*</span></label>
            <div class="grid grid-cols-3 gap-4">
              <div (click)="setTemperature('chaud')"
                   [class]="'p-4 rounded-xl cursor-pointer transition-all border-2 ' + (prospectForm.get('temperature')?.value === 'chaud' ? 'border-error bg-error-container/10' : 'border-surface-container-low')">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-xl">🔴</span>
                  <span class="font-bold text-error">Chaud</span>
                </div>
                <p class="text-[11px] text-on-surface-variant leading-tight">Prêt à signer, besoin urgent identifié.</p>
              </div>
              <div (click)="setTemperature('tiede')"
                   [class]="'p-4 rounded-xl cursor-pointer transition-all border-2 ' + (prospectForm.get('temperature')?.value === 'tiede' ? 'border-amber-500 bg-amber-500/10' : 'border-surface-container-low')">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-xl">🟡</span>
                  <span class="font-bold text-amber-700">Tiède</span>
                </div>
                <p class="text-[11px] text-on-surface-variant leading-tight">Intérêt manifeste, décision à moyen terme.</p>
              </div>
              <div (click)="setTemperature('froid')"
                   [class]="'p-4 rounded-xl cursor-pointer transition-all border-2 ' + (prospectForm.get('temperature')?.value === 'froid' ? 'border-blue-400 bg-blue-500/10' : 'border-surface-container-low')">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-xl">🔵</span>
                  <span class="font-bold text-blue-700">Froid</span>
                </div>
                <p class="text-[11px] text-on-surface-variant leading-tight">Simple prise de contact ou veille.</p>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-6">
            <div class="col-span-2 space-y-2">
              <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Commercial assigné</label>
              <div class="relative flex items-center">
                <div class="absolute left-3 w-7 h-7 rounded-full overflow-hidden bg-primary-container/20 flex items-center justify-center text-[10px] font-bold">ME</div>
                <select class="w-full bg-surface-container-low border-none rounded-lg p-3.5 pl-12 text-sm focus:ring-2 focus:ring-primary/20 outline-none">
                  <option>Moi-même</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        <!-- Bottom Actions -->
        <div class="flex items-center justify-end gap-8 pt-4 pb-12">
          <a routerLink="/prospection" class="text-outline hover:text-on-surface font-bold text-sm transition-colors cursor-pointer">Annuler</a>
          <button type="submit"
                  [disabled]="prospectForm.invalid || loading()"
                  class="bg-primary text-white px-10 py-4 rounded-xl font-headline font-bold text-sm shadow-xl shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 transition-all flex items-center gap-2">
            <span class="material-symbols-outlined" *ngIf="!loading()">save</span>
            <span class="material-symbols-outlined animate-spin" *ngIf="loading()">sync</span>
            {{ loading() ? 'Enregistrement...' : (isEditMode() ? 'Enregistrer les modifications' : 'Enregistrer le prospect') }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class ProspectFormComponent implements OnInit {
  prospectForm!: FormGroup;
  // Signals — requis en mode zoneless (Angular 21 sans zone.js) pour que les
  // mises à jour déclenchées dans les callbacks HTTP se reflètent dans le template.
  loading = signal(false);
  loadingInitial = signal(false);
  isEditMode = signal(false);
  prospectId: number | null = null;
  sectors: string[] = ['Logistique & Transport', 'Automobile', 'Construction'];

  constructor(
    private fb: FormBuilder,
    private prospectService: ProspectService,
    private toastService: ToastService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.initForm();
    this.loadSectors();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEditMode.set(true);
      this.prospectId = Number(idParam);
      this.loadProspect(this.prospectId);
    }
  }

  initForm(): void {
    const currentUser = this.authService.getCurrentUser();

    this.prospectForm = this.fb.group({
      name: ['', Validators.required],
      rccm: [''],
      sector: ['Logistique & Transport', Validators.required],
      newSector: [''],
      address: [''],
      city: [''],
      zip_code: [''],
      phone: [''],
      email: ['', Validators.email],
      lead_source: [''],
      estimated_potential: [null],
      estimated_decision_date: [null],
      needs: [''],
      temperature: ['tiede', Validators.required],
      commercial_id: [currentUser?.id, Validators.required],
      category: ['entreprise', Validators.required],
      company_type: [null],

      // Correspondant
      contact_first_name: ['', Validators.required],
      contact_last_name: ['', Validators.required],
      contact_position: [''],
      contact_phone: [''],
      contact_email: ['', [Validators.required, Validators.email]]
    });
  }

  loadProspect(id: number): void {
    this.loadingInitial.set(true);
    this.prospectService.getProspect(id).subscribe({
      next: (prospect: any) => {
        const mainContact = prospect.contacts?.find((c: any) => c.is_main_contact) ?? prospect.contacts?.[0];

        this.prospectForm.patchValue({
          name: prospect.name,
          rccm: prospect.rccm,
          sector: prospect.sector,
          address: prospect.address,
          city: prospect.city,
          zip_code: prospect.zip_code,
          phone: prospect.phone,
          email: prospect.email,
          lead_source: prospect.lead_source,
          estimated_potential: prospect.estimated_potential,
          estimated_decision_date: prospect.estimated_decision_date,
          needs: prospect.needs,
          temperature: prospect.temperature,
          commercial_id: prospect.commercial_id,
          category: prospect.category,
          company_type: prospect.company_type,
          contact_first_name: mainContact?.first_name,
          contact_last_name: mainContact?.last_name,
          contact_phone: mainContact?.phone,
          contact_email: mainContact?.email,
        });

        // L'email de connexion n'est pas modifiable via cet endpoint.
        this.prospectForm.get('contact_email')?.disable();

        this.loadingInitial.set(false);
      },
      error: (err) => {
        console.error('Erreur chargement prospect', err);
        this.loadingInitial.set(false);
        this.toastService.error('Impossible de charger ce prospect.');
        this.router.navigate(['/prospection']);
      }
    });
  }

  loadSectors(): void {
    this.prospectService.getSectors().subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          const defaults = ['Logistique & Transport', 'Automobile', 'Construction'];
          this.sectors = Array.from(new Set([...defaults, ...data]));
        }
      },
      error: (err) => console.error('Erreur chargement secteurs', err)
    });
  }

  setTemperature(temp: string): void {
    this.prospectForm.get('temperature')?.setValue(temp);
  }

  onSubmit(): void {
    if (this.prospectForm.valid) {
      this.loading.set(true);
      // getRawValue() inclut contact_email même désactivé (mode édition), pour l'affichage/débogage ;
      // il est simplement ignoré par le backend en update().
      const formValue = this.prospectForm.getRawValue();

      // Logique pour les champs dynamiques
      const sector = formValue.sector === 'NEW_SECTOR' ? formValue.newSector : formValue.sector;

      const data: CreateProspectDto = {
        ...formValue,
        sector: sector,
      };

      const request$ = this.isEditMode() && this.prospectId
        ? this.prospectService.updateProspect(this.prospectId, data)
        : this.prospectService.createProspect(data);

      request$.subscribe({
        next: () => {
          this.loading.set(false);
          this.toastService.success(this.isEditMode() ? 'Le prospect a été mis à jour avec succès !' : 'Le prospect a été créé avec succès !');
          this.router.navigate(['/prospection']);
        },
        error: (err) => {
          this.loading.set(false);
          console.error('Erreur enregistrement prospect', err);

          if (err.status === 422 && err.error.errors) {
            const errors = err.error.errors;
            let message = 'Erreurs de validation :\n';
            Object.keys(errors).forEach(key => {
              message += `- ${errors[key].join(', ')}\n`;
            });
            this.toastService.error(message);
          } else {
            this.toastService.error(err.error?.message || 'Une erreur est survenue lors de l\'enregistrement du prospect.');
          }
        }
      });
    }
  }
}
