import { Component, OnInit, signal, inject, effect, computed } from '@angular/core';
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
        <button (click)="activeTab.set('annexes')"
                [class.border-primary]="activeTab() === 'annexes'"
                [class.text-primary]="activeTab() === 'annexes'"
                [class.text-outline]="activeTab() !== 'annexes'"
                class="pb-4 font-headline text-sm font-black uppercase tracking-wider border-b-2 border-transparent transition-all hover:text-primary">
          Frais Annexes
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
          <div class="flex items-center justify-between gap-4">
            <div>
              <h3 class="text-lg font-headline font-black text-on-surface">Barème des Vignettes</h3>
              <p class="text-xs text-outline font-medium mt-1">Éditez les tarifs applicables selon la puissance fiscale (CV) et l'ancienneté du véhicule.</p>
            </div>
            <button type="button" (click)="showAddVignette.set(!showAddVignette())"
                    class="shrink-0 h-10 px-4 rounded-xl bg-surface-container-low text-primary text-xs font-black uppercase tracking-widest flex items-center gap-1.5 hover:bg-primary/10 transition-colors">
              <span class="material-symbols-outlined text-base">add</span>
              Catégorie / Puissance
            </button>
          </div>

          <div *ngIf="showAddVignette()" class="flex items-center gap-3 p-4 rounded-2xl bg-surface-container-low border border-outline-variant/10">
            <input type="text" [(ngModel)]="newVignetteLabel" (keydown.enter)="addVignetteCategory()"
                   placeholder="Ex : Auto électrique, Camion 20 CV et plus..."
                   class="flex-1 h-10 px-4 rounded-xl bg-white border border-outline-variant/10 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all">
            <button type="button" (click)="addVignetteCategory()" [disabled]="!newVignetteLabel.trim()"
                    class="h-10 px-4 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest disabled:opacity-40 transition-all">
              Ajouter
            </button>
            <button type="button" (click)="showAddVignette.set(false); newVignetteLabel = ''"
                    class="h-10 px-4 rounded-xl text-outline text-xs font-black uppercase tracking-widest hover:text-on-surface transition-colors">
              Annuler
            </button>
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
                  <th class="px-4 py-4 w-10"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant/10 text-on-surface">
                <ng-container *ngFor="let cat of vignetteCategories()">

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
                    <td class="px-4 py-3">
                      <button *ngIf="isCustomVignette(cat.key)" type="button" (click)="removeVignetteCategory(cat.key)"
                              class="w-8 h-8 rounded-lg text-outline hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors" title="Supprimer cette catégorie">
                        <span class="material-symbols-outlined text-base">delete</span>
                      </button>
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
                      <td class="px-4 py-3" rowspan="2"></td>
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

          <!-- EXEMPTIONS DE VIGNETTE -->
          <div class="pt-4 border-t border-outline-variant/10 space-y-4">
            <div class="flex items-center justify-between gap-4">
              <div>
                <h3 class="text-lg font-headline font-black text-on-surface">Exemptions de vignette</h3>
                <p class="text-xs text-outline font-medium mt-1">
                  Tarifs fixes appliqués quand le client est exonéré (handicapé, société, communes, véhicule de projet),
                  au lieu du barème CV/âge. Utilisés dans le formulaire de devis via la case « Client exonéré ».
                </p>
              </div>
              <button type="button" (click)="showAddExemption.set(!showAddExemption())"
                      class="shrink-0 h-10 px-4 rounded-xl bg-surface-container-low text-primary text-xs font-black uppercase tracking-widest flex items-center gap-1.5 hover:bg-primary/10 transition-colors">
                <span class="material-symbols-outlined text-base">add</span>
                Motif d'exemption
              </button>
            </div>

            <div *ngIf="showAddExemption()" class="flex items-center gap-3 p-4 rounded-2xl bg-surface-container-low border border-outline-variant/10">
              <input type="text" [(ngModel)]="newExemptionLabel" (keydown.enter)="addExemption()"
                     placeholder="Ex : Véhicule diplomatique..."
                     class="flex-1 h-10 px-4 rounded-xl bg-white border border-outline-variant/10 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all">
              <button type="button" (click)="addExemption()" [disabled]="!newExemptionLabel.trim()"
                      class="h-10 px-4 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest disabled:opacity-40 transition-all">
                Ajouter
              </button>
              <button type="button" (click)="showAddExemption.set(false); newExemptionLabel = ''"
                      class="h-10 px-4 rounded-xl text-outline text-xs font-black uppercase tracking-widest hover:text-on-surface transition-colors">
                Annuler
              </button>
            </div>

            <div class="overflow-x-auto border border-outline-variant/10 rounded-2xl">
              <table class="w-full text-left text-sm border-collapse">
                <thead class="bg-surface-container-low text-[10px] font-black uppercase tracking-widest text-outline">
                  <tr class="border-b border-outline-variant/15">
                    <th class="px-6 py-4">Motif</th>
                    <th class="px-6 py-4">Tarif fixe</th>
                    <th class="px-4 py-4 w-10"></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-outline-variant/10 text-on-surface">
                  <tr *ngFor="let ex of localSettings()!['pricing.vignette_exemptions']" class="hover:bg-slate-50/50 transition-colors">
                    <td class="px-6 py-4 font-bold text-xs leading-snug">{{ ex.label }}</td>
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-1.5 bg-surface-container-low border border-outline-variant/10 rounded-xl px-3 w-32 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                        <input type="number" [(ngModel)]="ex.price"
                               class="w-full h-9 bg-transparent border-none font-bold text-xs outline-none">
                        <span class="text-[9px] text-outline font-black">XOF</span>
                      </div>
                    </td>
                    <td class="px-4 py-3">
                      <button type="button" (click)="removeExemption(ex.key)"
                              class="w-8 h-8 rounded-lg text-outline hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors" title="Supprimer ce motif">
                        <span class="material-symbols-outlined text-base">delete</span>
                      </button>
                    </td>
                  </tr>
                  <tr *ngIf="!localSettings()!['pricing.vignette_exemptions']?.length">
                    <td colspan="3" class="p-8 text-center text-outline italic text-xs">Aucun motif d'exemption configuré.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- VISITES TECHNIQUES TAB -->
        <div *ngIf="activeTab() === 'visite'" class="space-y-8 animate-fade-in">
          <div class="flex items-center justify-between gap-4">
            <div>
              <h3 class="text-lg font-headline font-black text-on-surface">Tarifs Visite Technique</h3>
              <p class="text-xs text-outline font-medium mt-1">Configurez le prix officiel des contrôles réglementaires (Visite, Révisite, Volontaire) par usage.</p>
            </div>
            <button type="button" (click)="showAddVt.set(!showAddVt())"
                    class="shrink-0 h-10 px-4 rounded-xl bg-surface-container-low text-primary text-xs font-black uppercase tracking-widest flex items-center gap-1.5 hover:bg-primary/10 transition-colors">
              <span class="material-symbols-outlined text-base">add</span>
              Usage / Catégorie
            </button>
          </div>

          <div *ngIf="showAddVt()" class="flex items-center gap-3 p-4 rounded-2xl bg-surface-container-low border border-outline-variant/10">
            <input type="text" [(ngModel)]="newVtLabel" (keydown.enter)="addVtCategory()"
                   placeholder="Ex : Personnes — PF ≤ 7CV, 10 à 24 places électrique..."
                   class="flex-1 h-10 px-4 rounded-xl bg-white border border-outline-variant/10 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all">
            <button type="button" (click)="addVtCategory()" [disabled]="!newVtLabel.trim()"
                    class="h-10 px-4 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest disabled:opacity-40 transition-all">
              Ajouter
            </button>
            <button type="button" (click)="showAddVt.set(false); newVtLabel = ''"
                    class="h-10 px-4 rounded-xl text-outline text-xs font-black uppercase tracking-widest hover:text-on-surface transition-colors">
              Annuler
            </button>
          </div>

          <div class="overflow-x-auto border border-outline-variant/10 rounded-2xl">
            <table class="w-full text-left text-sm border-collapse">
              <thead class="bg-surface-container-low text-[10px] font-black uppercase tracking-widest text-outline">
                <tr class="border-b border-outline-variant/15">
                  <th class="px-6 py-4">Usage / Catégorie</th>
                  <th class="px-6 py-4">Visite</th>
                  <th class="px-6 py-4">Révisite</th>
                  <th class="px-6 py-4">Visite Volontaire</th>
                  <th class="px-4 py-4 w-10"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant/10 text-on-surface">
                <tr *ngFor="let cat of vtCategories()" class="hover:bg-slate-50/50 transition-colors">
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
                  <td class="px-4 py-3">
                    <button *ngIf="isCustomVt(cat.key)" type="button" (click)="removeVtCategory(cat.key)"
                            class="w-8 h-8 rounded-lg text-outline hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors" title="Supprimer cette catégorie">
                      <span class="material-symbols-outlined text-base">delete</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- FRAIS ANNEXES TAB -->
        <div *ngIf="activeTab() === 'annexes'" class="space-y-8 animate-fade-in">
          <div class="flex items-center justify-between gap-4">
            <div>
              <h3 class="text-lg font-headline font-black text-on-surface">Frais Annexes</h3>
              <p class="text-xs text-outline font-medium mt-1">Carte grise, diagnostic, pesée, timbre, sécurisation... proposés en option lors de la création d'un devis.</p>
            </div>
            <button type="button" (click)="showAddService.set(!showAddService())"
                    class="shrink-0 h-10 px-4 rounded-xl bg-surface-container-low text-primary text-xs font-black uppercase tracking-widest flex items-center gap-1.5 hover:bg-primary/10 transition-colors">
              <span class="material-symbols-outlined text-base">add</span>
              Frais annexe
            </button>
          </div>

          <div *ngIf="showAddService()" class="flex items-center gap-3 p-4 rounded-2xl bg-surface-container-low border border-outline-variant/10">
            <input type="text" [(ngModel)]="newServiceLabel" (keydown.enter)="addService()"
                   placeholder="Ex : Duplicata carte grise..."
                   class="flex-1 h-10 px-4 rounded-xl bg-white border border-outline-variant/10 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all">
            <button type="button" (click)="addService()" [disabled]="!newServiceLabel.trim()"
                    class="h-10 px-4 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest disabled:opacity-40 transition-all">
              Ajouter
            </button>
            <button type="button" (click)="showAddService.set(false); newServiceLabel = ''"
                    class="h-10 px-4 rounded-xl text-outline text-xs font-black uppercase tracking-widest hover:text-on-surface transition-colors">
              Annuler
            </button>
          </div>

          <div class="overflow-x-auto border border-outline-variant/10 rounded-2xl">
            <table class="w-full text-left text-sm border-collapse">
              <thead class="bg-surface-container-low text-[10px] font-black uppercase tracking-widest text-outline">
                <tr class="border-b border-outline-variant/15">
                  <th class="px-6 py-4">Frais</th>
                  <th class="px-6 py-4">Prix</th>
                  <th class="px-4 py-4 w-10"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant/10 text-on-surface">
                <tr *ngFor="let svc of localSettings()!['pricing.additional_services']" class="hover:bg-slate-50/50 transition-colors">
                  <td class="px-6 py-4 font-bold text-xs leading-snug">{{ svc.label }}</td>
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-1.5 bg-surface-container-low border border-outline-variant/10 rounded-xl px-3 w-32 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                      <input type="number" [(ngModel)]="svc.price"
                             class="w-full h-9 bg-transparent border-none font-bold text-xs outline-none">
                      <span class="text-[9px] text-outline font-black">XOF</span>
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <button type="button" (click)="removeService(svc.key)"
                            class="w-8 h-8 rounded-lg text-outline hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors" title="Supprimer ce frais">
                      <span class="material-symbols-outlined text-base">delete</span>
                    </button>
                  </td>
                </tr>
                <tr *ngIf="!localSettings()!['pricing.additional_services']?.length">
                  <td colspan="3" class="p-8 text-center text-outline italic text-xs">Aucun frais annexe configuré.</td>
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

  activeTab = signal<'vignette' | 'visite' | 'legal' | 'notifications' | 'annexes'>('legal');
  localSettings = signal<AppSettings | null>(null);
  submitting = signal(false);

  // Catégories intégrées (non supprimables) — les catégories créées depuis l'écran
  // ("Ajouter une catégorie / usage") sont stockées dans les paramètres eux-mêmes
  // (pricing.vignette_categories / pricing.visite_technique_categories) et fusionnées
  // avec cette liste de base via les computed ci-dessous.
  defaultVignetteCategories = [
    { key: 'moto_small',     label: 'Moto < 125 CM³ (< 1 CV)' },
    { key: 'moto_large',     label: 'Moto 125 CM³ et plus (> 1 CV)' },
    { key: 'auto_2_4cv',     label: 'Auto 2-3-4 CV' },
    { key: 'auto_5_7cv',     label: 'Auto 5-6-7 CV' },
    { key: 'auto_8_11cv',    label: 'Auto 8-9-10-11 CV' },
    { key: 'auto_12_15cv',   label: 'Auto 12-13-14-15 CV' },
    { key: 'camion_16cv',    label: 'Camion 16 CV et plus' },
    { key: 'tourisme_16cv',  label: 'Voiture de tourisme 16 CV et plus' },
  ];

  defaultVtCategories = [
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

  vignetteCategories = computed(() => [
    ...this.defaultVignetteCategories,
    ...(this.localSettings()?.['pricing.vignette_categories'] ?? []),
  ]);

  vtCategories = computed(() => [
    ...this.defaultVtCategories,
    ...(this.localSettings()?.['pricing.visite_technique_categories'] ?? []),
  ]);

  showAddVignette = signal(false);
  newVignetteLabel = '';
  showAddVt = signal(false);
  newVtLabel = '';

  // Frais annexes (Carte grise, Timbre, ...) et exemptions de vignette (Handicapé, Société,
  // Communes, Véhicule de projet) — listes plates éditables (label + prix), sans distinction
  // "protégé vs custom" : entièrement gérées par l'admin depuis cet écran.
  defaultAdditionalServices = [
    { key: 'carte_grise',    label: 'Extrait / Édition Carte Grise',          price: 2000 },
    { key: 'diagnostic',     label: 'Diagnostic sécurité',                     price: 9600 },
    { key: 'pesee_neuf',     label: 'Pesée de véhicule neuf',                  price: 8200 },
    { key: 'timbre',         label: 'Timbre',                                   price: 100 },
    { key: 'securisation',   label: 'Sécurisation carte visite technique',      price: 500 },
    { key: 'vehicule_neuf',  label: 'Traitement véhicule neuf (identification)', price: 24700 },
  ];

  defaultVignetteExemptions = [
    { key: 'handicape', label: 'Handicapé',                price: 2000 },
    { key: 'societe',   label: "Cas d'une société",        price: 2000 },
    { key: 'communes',  label: 'Communes',                 price: 10000 },
    { key: 'projet',    label: 'Véhicule actif de projet',  price: 10000 },
  ];

  showAddService = signal(false);
  newServiceLabel = '';
  showAddExemption = signal(false);
  newExemptionLabel = '';

  constructor() {
    effect(() => {
      const global = this.settingSvc.settings();
      if (global && !this.localSettings()) {
        const cloned: AppSettings = JSON.parse(JSON.stringify(global));
        // Ces deux listes doivent exister comme références réelles dans localSettings() dès le
        // départ (et pas via un fallback "|| []" au moment du rendu) : le binding [(ngModel)]
        // sur svc.price/ex.price a besoin d'un objet stable à muter, sinon les saisies se
        // perdraient silencieusement.
        if (!cloned['pricing.additional_services']) {
          cloned['pricing.additional_services'] = JSON.parse(JSON.stringify(this.defaultAdditionalServices));
        }
        if (!cloned['pricing.vignette_exemptions']) {
          cloned['pricing.vignette_exemptions'] = JSON.parse(JSON.stringify(this.defaultVignetteExemptions));
        }
        this.localSettings.set(cloned);
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.settingSvc.loadSettings();
  }

  getVignetteRateRef(key: string): any {
    const settings = this.localSettings();
    if (!settings) return {};
    if (!settings['pricing.vignette']) settings['pricing.vignette'] = {};
    // Créer et attacher l'objet de tarifs en place si absent (nouvelle catégorie) : le binding
    // [(ngModel)] a besoin d'une référence stable dans localSettings(), pas d'un {} jetable,
    // sinon les valeurs saisies ne seraient jamais persistées lors de l'enregistrement.
    if (!settings['pricing.vignette'][key]) (settings['pricing.vignette'] as any)[key] = {};
    return settings['pricing.vignette'][key];
  }

  getVtRateRef(key: string): any {
    const settings = this.localSettings();
    if (!settings) return {};
    if (!settings['pricing.visite_technique']) settings['pricing.visite_technique'] = {};
    if (!settings['pricing.visite_technique'][key]) (settings['pricing.visite_technique'] as any)[key] = {};
    return settings['pricing.visite_technique'][key];
  }

  isCustomVignette(key: string): boolean {
    return !this.defaultVignetteCategories.some((c) => c.key === key);
  }

  isCustomVt(key: string): boolean {
    return !this.defaultVtCategories.some((c) => c.key === key);
  }

  addVignetteCategory(): void {
    const label = this.newVignetteLabel.trim();
    if (!label) return;
    const settings = this.localSettings();
    if (!settings) return;

    const existingKeys = this.vignetteCategories().map((c) => c.key);
    const key = this.slugifyUnique(label, existingKeys);
    const list = [...(settings['pricing.vignette_categories'] ?? []), { key, label }];

    this.localSettings.set({ ...settings, 'pricing.vignette_categories': list });
    this.newVignetteLabel = '';
    this.showAddVignette.set(false);
  }

  removeVignetteCategory(key: string): void {
    const settings = this.localSettings();
    if (!settings) return;

    const list = (settings['pricing.vignette_categories'] ?? []).filter((c) => c.key !== key);
    const rates = { ...(settings['pricing.vignette'] ?? {}) };
    delete rates[key];

    this.localSettings.set({ ...settings, 'pricing.vignette_categories': list, 'pricing.vignette': rates });
  }

  addVtCategory(): void {
    const label = this.newVtLabel.trim();
    if (!label) return;
    const settings = this.localSettings();
    if (!settings) return;

    const existingKeys = this.vtCategories().map((c) => c.key);
    const key = this.slugifyUnique(label, existingKeys);
    const list = [...(settings['pricing.visite_technique_categories'] ?? []), { key, label }];

    this.localSettings.set({ ...settings, 'pricing.visite_technique_categories': list });
    this.newVtLabel = '';
    this.showAddVt.set(false);
  }

  removeVtCategory(key: string): void {
    const settings = this.localSettings();
    if (!settings) return;

    const list = (settings['pricing.visite_technique_categories'] ?? []).filter((c) => c.key !== key);
    const rates = { ...(settings['pricing.visite_technique'] ?? {}) };
    delete rates[key];

    this.localSettings.set({ ...settings, 'pricing.visite_technique_categories': list, 'pricing.visite_technique': rates });
  }

  addService(): void {
    const label = this.newServiceLabel.trim();
    if (!label) return;
    const settings = this.localSettings();
    if (!settings) return;

    const list = settings['pricing.additional_services'] ?? [];
    const key = this.slugifyUnique(label, list.map((s) => s.key));
    list.push({ key, label, price: 0 });

    this.localSettings.set({ ...settings, 'pricing.additional_services': list });
    this.newServiceLabel = '';
    this.showAddService.set(false);
  }

  removeService(key: string): void {
    const settings = this.localSettings();
    if (!settings) return;

    const list = (settings['pricing.additional_services'] ?? []).filter((s) => s.key !== key);
    this.localSettings.set({ ...settings, 'pricing.additional_services': list });
  }

  addExemption(): void {
    const label = this.newExemptionLabel.trim();
    if (!label) return;
    const settings = this.localSettings();
    if (!settings) return;

    const list = settings['pricing.vignette_exemptions'] ?? [];
    const key = this.slugifyUnique(label, list.map((e) => e.key));
    list.push({ key, label, price: 0 });

    this.localSettings.set({ ...settings, 'pricing.vignette_exemptions': list });
    this.newExemptionLabel = '';
    this.showAddExemption.set(false);
  }

  removeExemption(key: string): void {
    const settings = this.localSettings();
    if (!settings) return;

    const list = (settings['pricing.vignette_exemptions'] ?? []).filter((e) => e.key !== key);
    this.localSettings.set({ ...settings, 'pricing.vignette_exemptions': list });
  }

  private slugifyUnique(label: string, existingKeys: string[]): string {
    const base = label
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'categorie';

    let key = base;
    let i = 2;
    while (existingKeys.includes(key)) {
      key = `${base}_${i}`;
      i++;
    }
    return key;
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
