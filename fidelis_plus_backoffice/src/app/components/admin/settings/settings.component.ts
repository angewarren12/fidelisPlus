import { Component, OnInit, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingService, AppSettings } from '../../../services/setting.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-6xl mx-auto px-6 py-10 animate-fade-in space-y-10">
      
      <!-- HEADER -->
      <header class="flex items-center justify-between gap-6">
        <div>
          <h1 class="text-3xl font-headline font-black text-on-surface tracking-tight">Paramètres du Système</h1>
          <p class="text-sm text-outline font-medium mt-1">Configurez les limites de rendez-vous et les grilles tarifaires officielles.</p>
        </div>
        <button (click)="saveSettings()" [disabled]="submitting() || !localSettings()"
          class="h-12 px-8 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50">
          <span class="material-symbols-outlined text-sm" *ngIf="!submitting()">save</span>
          <span class="material-symbols-outlined animate-spin text-sm" *ngIf="submitting()">sync</span>
          Enregistrer
        </button>
      </header>

      <!-- TABS NAVIGATION -->
      <div class="flex border-b border-outline-variant/15 gap-4 overflow-x-auto whitespace-nowrap">
        <button (click)="activeTab.set('legal')"
                [class.border-primary]="activeTab() === 'legal'"
                [class.text-primary]="activeTab() === 'legal'"
                [class.text-outline]="activeTab() !== 'legal'"
                class="pb-4 font-headline text-sm font-black uppercase tracking-wider border-b-2 border-transparent transition-all hover:text-primary">
          Mentions Légales Devis
        </button>
        <button (click)="activeTab.set('notifications')"
                [class.border-primary]="activeTab() === 'notifications'"
                [class.text-primary]="activeTab() === 'notifications'"
                [class.text-outline]="activeTab() !== 'notifications'"
                class="pb-4 font-headline text-sm font-black uppercase tracking-wider border-b-2 border-transparent transition-all hover:text-primary">
          Notifications
        </button>
        <button (click)="activeTab.set('vignette')"
                [class.border-primary]="activeTab() === 'vignette'"
                [class.text-primary]="activeTab() === 'vignette'"
                [class.text-outline]="activeTab() !== 'vignette'"
                class="pb-4 font-headline text-sm font-black uppercase tracking-wider border-b-2 border-transparent transition-all hover:text-primary">
          Grille Vignettes
        </button>
        <button (click)="activeTab.set('visite')"
                [class.border-primary]="activeTab() === 'visite'"
                [class.text-primary]="activeTab() === 'visite'"
                [class.text-outline]="activeTab() !== 'visite'"
                class="pb-4 font-headline text-sm font-black uppercase tracking-wider border-b-2 border-transparent transition-all hover:text-primary">
          Grille Visite Technique
        </button>
      </div>

      <!-- MAIN CONTAINER -->
      <div *ngIf="localSettings(); else loadingBlock" class="bg-white rounded-[2rem] border border-outline-variant/10 shadow-sm p-8 md:p-10">
        
        <!-- LEGAL TAB -->
        <div *ngIf="activeTab() === 'legal'" class="space-y-8 animate-fade-in">
          <div>
            <h3 class="text-lg font-headline font-black text-on-surface">Mentions Légales Devis</h3>
            <p class="text-xs text-outline font-medium mt-1">Configurez le taux de TVA et le pied de page généré sur les documents officiels.</p>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div class="space-y-2">
              <label class="block text-[10px] font-black text-outline uppercase tracking-widest ml-1">Taux de TVA (%)</label>
              <input type="number" [(ngModel)]="localSettings()!['quote.legal.tva_rate']" placeholder="Ex: 18"
                     class="w-full h-12 px-4 rounded-xl bg-surface-container-low border border-outline-variant/10 font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all">
              <p class="text-[10px] text-outline font-medium ml-1">Valeur de la TVA appliquée sur le HT (Ex: 18).</p>
            </div>
            
            <div class="space-y-2">
              <label class="block text-[10px] font-black text-outline uppercase tracking-widest ml-1">Validité du Devis (Jours)</label>
              <input type="number" [(ngModel)]="localSettings()!['quote.legal.validity_days']" placeholder="Ex: 30"
                     class="w-full h-12 px-4 rounded-xl bg-surface-container-low border border-outline-variant/10 font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all">
            </div>

            <div class="space-y-2 md:col-span-2">
              <label class="block text-[10px] font-black text-outline uppercase tracking-widest ml-1">Texte de pied de page</label>
              <textarea [(ngModel)]="localSettings()!['quote.legal.footer_text']" rows="3"
                     class="w-full p-4 rounded-xl bg-surface-container-low border border-outline-variant/10 font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"></textarea>
              <p class="text-[10px] text-outline font-medium ml-1">Ex: Mayelia Automotive - SARL au capital de 10.000.000 XOF - RCCM CI-ABJ...</p>
            </div>
          </div>

          <div class="pt-4 border-t border-outline-variant/10">
            <h3 class="text-lg font-headline font-black text-on-surface">Pénalités de retard — Vignette</h3>
            <p class="text-xs text-outline font-medium mt-1">
              Taux appliqués sur le montant de la vignette lorsque la visite technique du véhicule est en retard.
              Le commercial choisit manuellement le taux applicable lors de la création du devis.
            </p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div class="space-y-2">
              <label class="block text-[10px] font-black text-outline uppercase tracking-widest ml-1">Pénalité — retard &gt; 6 mois (%)</label>
              <input type="number" [(ngModel)]="localSettings()!['quote.penalty.rate_6_months']" placeholder="Ex: 25"
                     class="w-full h-12 px-4 rounded-xl bg-surface-container-low border border-outline-variant/10 font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all">
            </div>
            <div class="space-y-2">
              <label class="block text-[10px] font-black text-outline uppercase tracking-widest ml-1">Pénalité — retard &gt; 1 an et 1 jour (%)</label>
              <input type="number" [(ngModel)]="localSettings()!['quote.penalty.rate_1_year']" placeholder="Ex: 100"
                     class="w-full h-12 px-4 rounded-xl bg-surface-container-low border border-outline-variant/10 font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all">
            </div>
          </div>
        </div>

        <!-- NOTIFICATIONS TAB -->
        <div *ngIf="activeTab() === 'notifications'" class="space-y-8 animate-fade-in">
          <div>
            <h3 class="text-lg font-headline font-black text-on-surface">Modèles de Notifications (Email / SMS)</h3>
            <p class="text-xs text-outline font-medium mt-1">Configurez le texte brut envoyé aux clients lors de relances ou d'actions clés.</p>
          </div>
          
          <div class="space-y-6">
            <div class="space-y-2">
              <label class="block text-[10px] font-black text-outline uppercase tracking-widest ml-1">SMS - Rappel de Visite Technique</label>
              <textarea [(ngModel)]="localSettings()!['notification.sms.visit_reminder']" rows="3"
                     class="w-full p-4 rounded-xl bg-surface-container-low border border-outline-variant/10 font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"></textarea>
              <p class="text-[10px] text-outline font-medium ml-1">Tags disponibles : {{ '{' }}client_name{{ '}' }}, {{ '{' }}vehicle_plate{{ '}' }}</p>
            </div>
            
            <div class="space-y-2">
              <label class="block text-[10px] font-black text-outline uppercase tracking-widest ml-1">Email - Envoi de Devis</label>
              <textarea [(ngModel)]="localSettings()!['notification.email.quote_sent']" rows="4"
                     class="w-full p-4 rounded-xl bg-surface-container-low border border-outline-variant/10 font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"></textarea>
              <p class="text-[10px] text-outline font-medium ml-1">Texte principal de l'email accompagnant le devis (PDF en PJ).</p>
            </div>
          </div>
        </div>

        <!-- VIGNETTES TAB -->
        <div *ngIf="activeTab() === 'vignette'" class="space-y-8 animate-fade-in">
          <div>
            <h3 class="text-lg font-headline font-black text-on-surface">Barème des Vignettes</h3>
            <p class="text-xs text-outline font-medium mt-1">Éditez les tarifs applicables selon la puissance fiscale (CV) et l'ancienneté du véhicule.</p>
          </div>

          <!-- VIGNETTES TABLE -->
          <div class="overflow-x-auto border border-outline-variant/10 rounded-2xl">
            <table class="w-full text-left text-sm border-collapse">
              <thead class="bg-surface-container-low text-[10px] font-black uppercase tracking-widest text-outline">
                <tr class="border-b border-outline-variant/15">
                  <th class="px-6 py-4 w-1/3">Catégorie / Puissance</th>
                  <th class="px-6 py-4">Récent</th>
                  <th class="px-6 py-4">Moyen (5 à 10 ans)</th>
                  <th class="px-6 py-4">Ancien (11 ans +)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant/10 text-on-surface">
                <ng-container *ngFor="let cat of vignetteCategories">

                  <!-- Ligne standard (une seule tranche récent) -->
                  <tr *ngIf="cat.key !== 'tourisme_16cv'" class="hover:bg-slate-50/50 transition-colors">
                    <td class="px-6 py-3 font-bold text-xs leading-snug">{{ cat.label }}</td>
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-1 bg-surface-container-low border border-outline-variant/10 rounded-xl px-3 w-32 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                        <span class="text-[9px] text-outline font-black whitespace-nowrap">1–4 ans</span>
                        <input type="number" [(ngModel)]="getVignetteRateRef(cat.key)['recent']"
                               class="w-full h-9 bg-transparent border-none font-bold text-xs outline-none">
                        <span class="text-[9px] text-outline font-black">XOF</span>
                      </div>
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-1.5 bg-surface-container-low border border-outline-variant/10 rounded-xl px-3 w-32 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                        <input type="number" [(ngModel)]="getVignetteRateRef(cat.key)['medium']"
                               class="w-full h-9 bg-transparent border-none font-bold text-xs outline-none">
                        <span class="text-[9px] text-outline font-black">XOF</span>
                      </div>
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-1.5 bg-surface-container-low border border-outline-variant/10 rounded-xl px-3 w-32 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                        <input type="number" [(ngModel)]="getVignetteRateRef(cat.key)['old']"
                               class="w-full h-9 bg-transparent border-none font-bold text-xs outline-none">
                        <span class="text-[9px] text-outline font-black">XOF</span>
                      </div>
                    </td>
                  </tr>

                  <!-- Ligne tourisme 16CV+ : 1-2 ans et 3-4 ans dans des sous-lignes -->
                  <ng-container *ngIf="cat.key === 'tourisme_16cv'">
                    <!-- Sous-ligne 1-2 ans -->
                    <tr class="hover:bg-slate-50/50 transition-colors">
                      <td class="px-6 py-3 font-bold text-xs leading-snug" rowspan="2">{{ cat.label }}</td>
                      <td class="px-4 py-3">
                        <div class="flex items-center gap-1 bg-surface-container-low border border-outline-variant/10 rounded-xl px-3 w-36 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                          <span class="text-[9px] text-outline font-black whitespace-nowrap">1–2 ans</span>
                          <input type="number" [(ngModel)]="getVignetteRateRef(cat.key)['recent_1_2']"
                                 class="w-full h-9 bg-transparent border-none font-bold text-xs outline-none">
                          <span class="text-[9px] text-outline font-black">XOF</span>
                        </div>
                      </td>
                      <td class="px-4 py-3" rowspan="2">
                        <div class="flex items-center gap-1.5 bg-surface-container-low border border-outline-variant/10 rounded-xl px-3 w-32 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                          <input type="number" [(ngModel)]="getVignetteRateRef(cat.key)['medium']"
                                 class="w-full h-9 bg-transparent border-none font-bold text-xs outline-none">
                          <span class="text-[9px] text-outline font-black">XOF</span>
                        </div>
                      </td>
                      <td class="px-4 py-3" rowspan="2">
                        <div class="flex items-center gap-1.5 bg-surface-container-low border border-outline-variant/10 rounded-xl px-3 w-32 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                          <input type="number" [(ngModel)]="getVignetteRateRef(cat.key)['old']"
                                 class="w-full h-9 bg-transparent border-none font-bold text-xs outline-none">
                          <span class="text-[9px] text-outline font-black">XOF</span>
                        </div>
                      </td>
                    </tr>
                    <!-- Sous-ligne 3-4 ans -->
                    <tr class="hover:bg-slate-50/50 transition-colors">
                      <td class="px-4 py-3">
                        <div class="flex items-center gap-1 bg-surface-container-low border border-outline-variant/10 rounded-xl px-3 w-36 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                          <span class="text-[9px] text-outline font-black whitespace-nowrap">3–4 ans</span>
                          <input type="number" [(ngModel)]="getVignetteRateRef(cat.key)['recent_3_4']"
                                 class="w-full h-9 bg-transparent border-none font-bold text-xs outline-none">
                          <span class="text-[9px] text-outline font-black">XOF</span>
                        </div>
                      </td>
                    </tr>
                  </ng-container>

                </ng-container>
              </tbody>
            </table>
          </div>
        </div>

        <!-- VISITES TECHNIQUES TAB -->
        <div *ngIf="activeTab() === 'visite'" class="space-y-8 animate-fade-in">
          <div>
            <h3 class="text-lg font-headline font-black text-on-surface">Tarifs Visite Technique</h3>
            <p class="text-xs text-outline font-medium mt-1">Configurez le prix officiel des contrôles réglementaires (Visite, Révisite, Volontaire) par usage.</p>
          </div>

          <div class="overflow-x-auto border border-outline-variant/10 rounded-2xl">
            <table class="w-full text-left text-sm border-collapse">
              <thead class="bg-surface-container-low text-[10px] font-black uppercase tracking-widest text-outline">
                <tr class="border-b border-outline-variant/15">
                  <th class="px-6 py-4">Usage / Catégorie</th>
                  <th class="px-6 py-4">Visite</th>
                  <th class="px-6 py-4">Révisite</th>
                  <th class="px-6 py-4">Visite Volontaire</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant/10 text-on-surface">
                <tr *ngFor="let cat of vtCategories" class="hover:bg-slate-50/50 transition-colors">
                  <td class="px-6 py-4 font-bold text-xs leading-snug">{{ cat.label }}</td>
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-1.5 bg-surface-container-low border border-outline-variant/10 rounded-xl px-3 w-32 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                      <input type="number" [(ngModel)]="getVtRateRef(cat.key)['visite']"
                             class="w-full h-9 bg-transparent border-none font-bold text-xs outline-none">
                      <span class="text-[9px] text-outline font-black">XOF</span>
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-1.5 bg-surface-container-low border border-outline-variant/10 rounded-xl px-3 w-32 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                      <input type="number" [(ngModel)]="getVtRateRef(cat.key)['revisite']"
                             class="w-full h-9 bg-transparent border-none font-bold text-xs outline-none">
                      <span class="text-[9px] text-outline font-black">XOF</span>
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <div *ngIf="getVtRateRef(cat.key)['volontaire'] !== null" class="flex items-center gap-1.5 bg-surface-container-low border border-outline-variant/10 rounded-xl px-3 w-32 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                      <input type="number" [(ngModel)]="getVtRateRef(cat.key)['volontaire']"
                             class="w-full h-9 bg-transparent border-none font-bold text-xs outline-none">
                      <span class="text-[9px] text-outline font-black">XOF</span>
                    </div>
                    <span *ngIf="getVtRateRef(cat.key)['volontaire'] === null" class="text-[10px] text-outline font-bold italic ml-2">Non applicable</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <!-- LOADING STATE -->
      <ng-template #loadingBlock>
        <div class="bg-white rounded-[2rem] border border-outline-variant/10 shadow-sm p-16 text-center text-outline">
          <span class="material-symbols-outlined animate-spin text-primary text-4xl">sync</span>
          <p class="text-xs font-bold mt-2">Chargement des configurations...</p>
        </div>
      </ng-template>

    </div>
  `,
  styles: [`
    .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class SettingsComponent implements OnInit {
  private settingSvc = inject(SettingService);
  private toastService = inject(ToastService);

  activeTab = signal<'vignette' | 'visite' | 'legal' | 'notifications'>('legal');
  localSettings = signal<AppSettings | null>(null);
  submitting = signal(false);

  vignetteCategories = [
    { key: 'moto_small',     label: 'Moto < 125 CM³ (< 1 CV)' },
    { key: 'moto_large',     label: 'Moto 125 CM³ et plus (> 1 CV)' },
    { key: 'auto_2_4cv',     label: 'Auto 2-3-4 CV' },
    { key: 'auto_5_7cv',     label: 'Auto 5-6-7 CV' },
    { key: 'auto_8_11cv',    label: 'Auto 8-9-10-11 CV' },
    { key: 'auto_12_15cv',   label: 'Auto 12-13-14-15 CV' },
    { key: 'camion_16cv',    label: 'Camion 16 CV et plus' },
    { key: 'tourisme_16cv',  label: 'Voiture de tourisme 16 CV et plus' },
  ];

  vtCategories = [
    { key: 'utilitaire_inf7cv_ptac35',  label: 'Marchandises utilitaire — PF ≤ 7CV, PTAC < 3,5T' },
    { key: 'utilitaire_sup7cv_ptac35',  label: 'Marchandises utilitaire — PF ≥ 7CV, PTAC < 3,5T' },
    { key: 'ptac_3_10t',                label: 'Marchandises — PTAC 3,5T à 10T (remorques inclus)' },
    { key: 'ptac_10t_plus',             label: 'Marchandises — PTAC > 10T (tracteurs, engins)' },
    { key: 'perso_inf7cv_9places',      label: 'Personnes — PF ≤ 7CV, ≤ 9 places' },
    { key: 'perso_sup7cv_9places',      label: 'Personnes — PF > 7CV, ≤ 9 places' },
    { key: 'perso_sup7cv_24places',     label: 'Personnes — PF > 7CV, 10 à 24 places (gbaka, wôrô)' },
    { key: 'perso_sup7cv_25plus',       label: 'Personnes — PF > 7CV, ≥ 25 places (autocar)' },
    { key: 'compteur_noro',             label: 'Contrôleur de compteur norokilométrique' },
    { key: 'moto_125_600',              label: 'Moto — 125 à 600 CM³' },
    { key: 'tricycle',                  label: 'Tricycle' },
    { key: 'quadricycle',               label: 'Quadricycle' },
  ];

  constructor() {
    effect(() => {
      const global = this.settingSvc.settings();
      if (global && !this.localSettings()) {
        this.localSettings.set(JSON.parse(JSON.stringify(global)));
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.settingSvc.loadSettings();
  }

  getVignetteRateRef(key: string): any {
    const settings = this.localSettings();
    if (!settings || !settings['pricing.vignette']) {
      return {};
    }
    return settings['pricing.vignette'][key] || {};
  }

  getVtRateRef(key: string): any {
    const settings = this.localSettings();
    if (!settings || !settings['pricing.visite_technique']) {
      return {};
    }
    return settings['pricing.visite_technique'][key] || {};
  }

  saveSettings(): void {
    const payload = this.localSettings();
    if (!payload) return;

    this.submitting.set(true);
    this.settingSvc.updateSettings(payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.toastService.success('Configuration enregistrée avec succès !');
        this.settingSvc.settings.set(payload); // Update global settings signal
      },
      error: () => {
        this.submitting.set(false);
        this.toastService.error('Erreur lors de l\'enregistrement des paramètres.');
      }
    });
  }
}
