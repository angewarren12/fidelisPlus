import { Component, OnInit, signal, inject, computed, effect, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { QuoteService, Quote, QuoteItem } from '../../../services/quote.service';
import { AccountService } from '../../../services/account.service';
import { VehicleService, Vehicle } from '../../../services/vehicle.service';
import { ToastService } from '../../../services/toast.service';
import { QuoteRequestService } from '../../../services/quote-request.service';
import { QuotePreviewModalComponent } from '../quote-preview-modal/quote-preview-modal.component';

// ─── TABLEAUX DE PRIX ──────────────────────────────────────────────────────
// Alignés sur fidelis_plus/storage/VIGNETTE TARIF.pdf et VISITE TECHNIQUE TARIF.pdf

const VIGNETTE_CATEGORIES = [
  { key: 'moto_small',     label: 'Moto < 125 CM³ (< 1 CV)' },
  { key: 'moto_large',     label: 'Moto 125 CM³ et plus (> 1 CV)' },
  { key: 'auto_2_4cv',     label: 'Auto 2-3-4 CV' },
  { key: 'auto_5_7cv',     label: 'Auto 5-6-7 CV' },
  { key: 'auto_8_11cv',    label: 'Auto 8-9-10-11 CV' },
  { key: 'auto_12_15cv',   label: 'Auto 12-13-14-15 CV' },
  { key: 'camion_16cv',    label: 'Camion 16 CV et plus' },
  { key: 'tourisme_16cv',  label: 'Voiture de tourisme 16 CV et plus' },
];

const VIGNETTE_RATES: Record<string, Record<string, number>> = {
  moto_small:    { recent: 5000, medium: 3750, old: 3500 },
  moto_large:    { recent: 12000, medium: 9000, old: 6000 },
  auto_2_4cv:    { recent: 19000, medium: 14250, old: 13500 },
  auto_5_7cv:    { recent: 35000, medium: 26250, old: 25000 },
  auto_8_11cv:   { recent: 49000, medium: 36750, old: 30000 },
  auto_12_15cv:  { recent: 96000, medium: 72000, old: 40000 },
  camion_16cv:   { recent: 190000, medium: 142500, old: 80000 },
  // Voiture de tourisme 16CV+: 1-2 ans = 250000, 3-4 ans = 190000, puis idem camion
  tourisme_16cv: { recent_1_2: 250000, recent_3_4: 190000, medium: 142500, old: 80000 },
};

const VT_CATEGORIES = [
  { key: 'utilitaire_inf7cv_ptac35',  label: 'Marchandises utilitaire — PF ≤ 7CV, PTAC < 3,5T' },
  { key: 'utilitaire_sup7cv_ptac35',  label: 'Marchandises utilitaire — PF ≥ 7CV, PTAC < 3,5T' },
  { key: 'ptac_3_10t',                label: 'Marchandises — PTAC 3,5T à 10T (remorques inclus)' },
  { key: 'ptac_10t_plus',             label: 'Marchandises — PTAC > 10T (tracteurs, engins spéciaux)' },
  { key: 'perso_inf7cv_9places',      label: 'Personnes — PF ≤ 7CV, ≤ 9 places' },
  { key: 'perso_sup7cv_9places',      label: 'Personnes — PF > 7CV, ≤ 9 places' },
  { key: 'perso_sup7cv_24places',     label: 'Personnes — PF > 7CV, 10 à 24 places (gbaka, wôrô)' },
  { key: 'perso_sup7cv_25plus',       label: 'Personnes — PF > 7CV, ≥ 25 places (autocar)' },
  { key: 'compteur_noro',             label: 'Contrôleur de compteur norokilométrique' },
  { key: 'moto_125_600',              label: 'Moto — 125 à 600 CM³' },
  { key: 'tricycle',                  label: 'Tricycle' },
  { key: 'quadricycle',               label: 'Quadricycle' },
];

const VT_RATES: Record<string, { visite: number; revisite: number; volontaire: number | null }> = {
  utilitaire_inf7cv_ptac35:  { visite: 13700, revisite: 12350, volontaire: 12300 },
  utilitaire_sup7cv_ptac35:  { visite: 16100, revisite: 12350, volontaire: 12300 },
  ptac_3_10t:                { visite: 18600, revisite: 14700, volontaire: null },
  ptac_10t_plus:             { visite: 21050, revisite: 14700, volontaire: null },
  perso_inf7cv_9places:      { visite: 13700, revisite: 12380, volontaire: 12300 },
  perso_sup7cv_9places:      { visite: 16100, revisite: 12350, volontaire: 12300 },
  perso_sup7cv_24places:     { visite: 18600, revisite: 12350, volontaire: 12300 },
  perso_sup7cv_25plus:       { visite: 21050, revisite: 12350, volontaire: 12300 },
  compteur_noro:             { visite: 3250,  revisite: 3250,  volontaire: 3250 },
  moto_125_600:              { visite: 8500,  revisite: 5000,  volontaire: 5000 },
  tricycle:                  { visite: 8500,  revisite: 5000,  volontaire: 5000 },
  quadricycle:               { visite: 8500,  revisite: 5000,  volontaire: 5000 },
};

/** Regroupe les libellés VT longs pour navigation plus claire (optgroups). */
const VT_CATEGORY_GROUPS: { label: string; keys: string[] }[] = [
  {
    label: 'Marchandises & utilitaires',
    keys: ['utilitaire_inf7cv_ptac35', 'utilitaire_sup7cv_ptac35', 'ptac_3_10t', 'ptac_10t_plus'],
  },
  {
    label: 'Transport de personnes',
    keys: ['perso_inf7cv_9places', 'perso_sup7cv_9places', 'perso_sup7cv_24places', 'perso_sup7cv_25plus'],
  },
  {
    label: 'Deux roues, légers & contrôle',
    keys: ['moto_125_600', 'tricycle', 'quadricycle', 'compteur_noro'],
  },
];

const VIGNETTE_AGE_TILES_STANDARD: { key: string; title: string; band: 'recent' | 'medium' | 'old' }[] = [
  { key: 'recent', title: '1 à 4 ans', band: 'recent' },
  { key: 'medium', title: '5 à 10 ans', band: 'medium' },
  { key: 'old', title: '11 ans et plus', band: 'old' },
];

const VIGNETTE_AGE_TILES_TOURISME: { key: string; title: string; hint?: string; band?: 'medium' | 'old' }[] = [
  { key: 'recent_1_2', title: '1 à 2 ans', hint: '250 000 F' },
  { key: 'recent_3_4', title: '3 à 4 ans', hint: '190 000 F' },
  { key: 'medium', title: '5 à 10 ans', band: 'medium' },
  { key: 'old', title: '11 ans et plus', band: 'old' },
];

const VT_VISIT_TYPES: { key: 'visite' | 'revisite' | 'volontaire'; label: string; abbr: string }[] = [
  { key: 'visite', label: 'Visite technique', abbr: 'Visite' },
  { key: 'revisite', label: 'Révisite', abbr: 'Révisite' },
  { key: 'volontaire', label: 'Visite volontaire', abbr: 'Volontaire' },
];

const ADDITIONAL_SERVICES = [
  { key: 'carte_grise',    label: 'Extrait / Édition Carte Grise',          price: 2000 },
  { key: 'diagnostic',     label: 'Diagnostic sécurité',                     price: 9600 },
  { key: 'pesee_neuf',     label: 'Pesée de véhicule neuf',                  price: 8200 },
  { key: 'timbre',         label: 'Timbre',                                   price: 100 },
  { key: 'securisation',   label: 'Sécurisation carte visite technique',      price: 500 },
  { key: 'vehicule_neuf',  label: 'Traitement véhicule neuf (identification)', price: 24700 },
];

interface VehicleService_ {
  vehicleId: number;
  vignette: { enabled: boolean; category: string; ageGroup: string; price: number };
  visite:   { enabled: boolean; category: string; type: 'visite' | 'revisite' | 'volontaire'; price: number };
  additionals: string[];
}

function getAgeGroup(year: number | null): string {
  if (!year) return 'recent';
  const age = new Date().getFullYear() - year;
  if (age <= 4)  return 'recent';
  if (age <= 10) return 'medium';
  return 'old';
}

function vignetteAgeLabel(ageGroup: string): string {
  if (ageGroup === 'recent') return '1 à 4 ans';
  if (ageGroup === 'recent_1_2') return '1 à 2 ans';
  if (ageGroup === 'recent_3_4') return '3 à 4 ans';
  if (ageGroup === 'medium') return '5 à 10 ans';
  return '11 ans et plus';
}

function computeVignettePrice(category: string, ageGroup: string): number {
  const rates = VIGNETTE_RATES[category];
  if (!rates) return 0;
  if (category === 'tourisme_16cv') {
    if (ageGroup === 'recent_1_2' || ageGroup === 'recent') return rates['recent_1_2'] || 250000;
    if (ageGroup === 'recent_3_4') return rates['recent_3_4'] || 190000;
    if (ageGroup === 'medium') return rates['medium'] || 142500;
    return rates['old'] || 80000;
  }
  return rates[ageGroup] || 0;
}

/** Années civiles indicatives pour la tranche (année courante = ref). */
function yearRangeForBand(band: 'recent' | 'medium' | 'old'): string {
  const y = new Date().getFullYear();
  if (band === 'recent') return `${y} – ${y - 3}`;
  if (band === 'medium') return `${y - 4} – ${y - 9}`;
  return `≤ ${y - 10}`;
}

function computeVtPrice(category: string, type: 'visite' | 'revisite' | 'volontaire'): number {
  const rates = VT_RATES[category];
  if (!rates) return 0;
  return rates[type] ?? 0;
}

function normalizePlateForMatch(p: string): string {
  return p.trim().toUpperCase().replace(/\s+/g, '');
}

function resolveAgeGroupFromStoredLabel(ageLabel: string, tourisme: boolean): string {
  const l = ageLabel.trim();
  const table: Record<string, string> = {
    '1 à 4 ans': 'recent',
    '5 à 10 ans': 'medium',
    '11 ans et plus': 'old',
    '1 à 2 ans': 'recent_1_2',
    '3 à 4 ans': 'recent_3_4',
  };
  const k = table[l];
  if (k) return k;
  return tourisme ? 'recent_1_2' : 'recent';
}

function parseVignetteDescription(desc: string): { plate: string; catKey: string; ageGroup: string } | null {
  if (!desc.startsWith('Vignette — ')) return null;
  const rest = desc.slice('Vignette — '.length);
  const op = rest.indexOf(' (');
  if (op === -1) return null;
  const plate = rest.slice(0, op).trim();
  const after = rest.slice(op + 2);
  const close = after.lastIndexOf(')');
  if (close === -1) return null;
  const inside = after.slice(0, close);
  const comma = inside.indexOf(', ');
  if (comma === -1) return null;
  const catLabel = inside.slice(0, comma).trim();
  const ageLabel = inside.slice(comma + 2).trim();
  const cat = VIGNETTE_CATEGORIES.find(c => c.label === catLabel);
  if (!cat) return null;
  const ageGroup = resolveAgeGroupFromStoredLabel(ageLabel, cat.key === 'tourisme_16cv');
  return { plate, catKey: cat.key, ageGroup };
}

function parseVtDescription(desc: string): { plate: string; catKey: string; visiteType: 'visite' | 'revisite' | 'volontaire' } | null {
  const tries: { prefix: string; type: 'visite' | 'revisite' | 'volontaire' }[] = [
    { prefix: 'Visite Technique — ', type: 'visite' },
    { prefix: 'Révisite — ', type: 'revisite' },
    { prefix: 'Visite Volontaire — ', type: 'volontaire' },
  ];
  for (const { prefix, type } of tries) {
    if (!desc.startsWith(prefix)) continue;
    const rest = desc.slice(prefix.length);
    const op = rest.indexOf(' (');
    if (op === -1) continue;
    const plate = rest.slice(0, op).trim();
    const after = rest.slice(op + 2);
    const close = after.lastIndexOf(')');
    if (close === -1) continue;
    const vtLabel = after.slice(0, close).trim();
    const cat = VT_CATEGORIES.find(c => c.label === vtLabel);
    if (!cat) continue;
    return { plate, catKey: cat.key, visiteType: type };
  }
  return null;
}

function parseAdditionalDescription(desc: string): { plate: string; key: string } | null {
  for (const svc of ADDITIONAL_SERVICES) {
    const prefix = `${svc.label} — `;
    if (desc.startsWith(prefix)) return { plate: desc.slice(prefix.length).trim(), key: svc.key };
  }
  return null;
}

function hydrateVehicleServicesFromQuoteItems(
  items: { description: string; price: number; quantity?: number }[],
  vehicleIds: number[],
  vehicles: Vehicle[],
): Map<number, VehicleService_> {
  const map = new Map<number, VehicleService_>();
  for (const vid of vehicleIds) {
    const vehicle = vehicles.find(v => v.id === vid);
    if (!vehicle) continue;
    const plateNorm = normalizePlateForMatch(vehicle.license_plate);
    let vignette: VehicleService_['vignette'] = {
      enabled: false,
      category: '',
      ageGroup: getAgeGroup(vehicle.year ?? null),
      price: 0,
    };
    let visite: VehicleService_['visite'] = {
      enabled: false,
      category: '',
      type: 'visite',
      price: 0,
    };
    const additionals: string[] = [];

    for (const it of items) {
      const d = it.description;
      const pv = parseVignetteDescription(d);
      if (pv && normalizePlateForMatch(pv.plate) === plateNorm) {
        vignette = {
          enabled: true,
          category: pv.catKey,
          ageGroup: pv.ageGroup,
          price: computeVignettePrice(pv.catKey, pv.ageGroup),
        };
        continue;
      }
      const pvt = parseVtDescription(d);
      if (pvt && normalizePlateForMatch(pvt.plate) === plateNorm) {
        visite = {
          enabled: true,
          category: pvt.catKey,
          type: pvt.visiteType,
          price: computeVtPrice(pvt.catKey, pvt.visiteType),
        };
        continue;
      }
      const pa = parseAdditionalDescription(d);
      if (pa && normalizePlateForMatch(pa.plate) === plateNorm && !additionals.includes(pa.key)) {
        additionals.push(pa.key);
      }
    }
    map.set(vid, { vehicleId: vid, vignette, visite, additionals });
  }
  return map;
}

function inferVehicleIdsFromItems(items: { description: string }[], vehicles: Vehicle[]): number[] {
  const ids = new Set<number>();
  const plates = new Set<string>();
  for (const it of items) {
    const pv = parseVignetteDescription(it.description);
    if (pv) plates.add(normalizePlateForMatch(pv.plate));
    const pvt = parseVtDescription(it.description);
    if (pvt) plates.add(normalizePlateForMatch(pvt.plate));
    const pa = parseAdditionalDescription(it.description);
    if (pa) plates.add(normalizePlateForMatch(pa.plate));
  }
  for (const v of vehicles) {
    if (plates.has(normalizePlateForMatch(v.license_plate))) ids.add(v.id);
  }
  return [...ids];
}

@Component({
  selector: 'app-quote-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, QuotePreviewModalComponent],
  template: `
    <div class="animate-fade-in-up pb-20">
      
      <!-- Header -->
      <div class="flex items-center justify-between mb-10">
        <div class="flex items-center gap-4">
          <button routerLink="/vente" class="w-10 h-10 rounded-xl bg-white border border-outline-variant/10 shadow-sm flex items-center justify-center text-outline hover:text-primary transition-colors">
            <span class="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 class="text-3xl font-headline font-black text-on-surface tracking-tight">Configuration du Devis</h1>
            <p *ngIf="!editingQuoteId()" class="text-xs text-outline font-medium tracking-wide uppercase mt-1">Vignette & Visite Technique — Tarifs officiels</p>
            <p *ngIf="editingQuoteId()" class="text-xs text-primary font-black tracking-wide uppercase mt-1">Édition du brouillon n° {{ quote.quote_number }}</p>
          </div>
        </div>
        <div class="flex gap-3">
           <button (click)="cancel()" class="px-6 py-3 rounded-2xl bg-surface-container text-outline text-xs font-black uppercase tracking-widest hover:bg-surface-container-high transition-all">Annuler</button>
           <button (click)="saveDraft()" [disabled]="!isValid() || !allVehiclesCompliant()" class="px-6 py-3 rounded-2xl bg-[#1b1932] text-white text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-primary/10 disabled:opacity-50">Brouillon</button>
           <button (click)="showPreview.set(true)" [disabled]="!isValid() || !allVehiclesCompliant()" class="px-8 py-3 rounded-2xl bg-white border border-outline-variant/20 text-on-surface text-xs font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-sm disabled:opacity-50 flex items-center gap-2">
             <span class="material-symbols-outlined text-lg">visibility</span>
             Aperçu PDF
           </button>
           <button (click)="sendQuote()" [disabled]="!isValid() || !allVehiclesCompliant()" class="px-8 py-3 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center gap-2">
             <span class="material-symbols-outlined text-lg">send</span>
             Générer Devis
           </button>
        </div>
      </div>

      <div class="grid grid-cols-12 gap-8">
        
        <!-- MAIN FORM (LEFT) -->
        <div class="col-span-12 lg:col-span-8 space-y-8">
           
           <!-- Client & Numéro -->
           <div class="bg-white rounded-[2.5rem] p-10 shadow-sm border border-outline-variant/5">
              <h3 class="text-lg font-headline font-black text-on-surface mb-8 flex items-center gap-3">
                 1. Client & Flotte <span class="w-2 h-2 rounded-full bg-primary"></span>
              </h3>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                 <div class="space-y-2">
                    <label class="block text-[10px] font-black text-outline uppercase tracking-widest ml-1">Client / Entreprise</label>
                    <select [(ngModel)]="quote.company_id" (change)="onClientChange()" class="w-full bg-surface-container-low border-none rounded-2xl p-4 text-sm font-bold focus:ring-primary/20 outline-none transition-all">
                       <option [ngValue]="0">Sélectionnez un client</option>
                       <option *ngFor="let client of clients()" [ngValue]="+client.id">{{ client.name }}</option>
                    </select>
                 </div>
                 <div class="space-y-2">
                    <label class="block text-[10px] font-black text-outline uppercase tracking-widest ml-1">Numéro de Devis</label>
                    <input type="text" [(ngModel)]="quote.quote_number" placeholder="DEV-2024-XXXX" class="w-full bg-surface-container-low border-none rounded-2xl p-4 text-sm font-bold focus:ring-primary/20 outline-none">
                 </div>
              </div>

              <!-- VEHICLE MULTI-SELECT -->
              <div *ngIf="quote.company_id > 0" class="space-y-4 animate-fade-in">
                 <label class="block text-[10px] font-black text-outline uppercase tracking-widest ml-1">Sélectionner les véhicules concernés ({{ selectedVehicles().length }})</label>
                 <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div *ngFor="let vehicle of companyVehicles()" 
                         (click)="toggleVehicle(vehicle)"
                         [class.ring-2]="isVehicleSelected(vehicle.id)"
                         [class.ring-primary]="isVehicleSelected(vehicle.id)"
                         [class.bg-primary/5]="isVehicleSelected(vehicle.id)"
                         class="p-5 rounded-[2rem] border border-outline-variant/10 cursor-pointer hover:bg-surface-container-low transition-all relative overflow-hidden group">
                       <div class="flex items-center gap-4">
                          <div [class.bg-primary]="isVehicleSelected(vehicle.id)" class="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-outline transition-colors">
                             <span class="material-symbols-outlined text-xl" [class.text-white]="isVehicleSelected(vehicle.id)">directions_car</span>
                          </div>
                          <div>
                             <p class="text-xs font-black text-on-surface">{{ vehicle.license_plate }}</p>
                             <p class="text-[10px] text-outline font-bold">{{ vehicle.brand }} {{ vehicle.model }} — {{ vehicle.year || 'Année ?' }}</p>
                          </div>
                       </div>
                       <div class="absolute top-5 right-5">
                          <span *ngIf="vehicle.has_all_docs" class="material-symbols-outlined text-primary text-lg">check_circle</span>
                          <span *ngIf="!vehicle.has_all_docs" class="material-symbols-outlined text-error text-lg animate-pulse">warning</span>
                       </div>
                       <div *ngIf="isVehicleSelected(vehicle.id)" class="relative z-10 mt-4 pt-4 border-t border-outline-variant/15 flex flex-wrap gap-2 justify-stretch sm:justify-end" (click)="$event.stopPropagation()">
                          <button type="button"
                             (click)="openVehicleDocPreview($event, vehicle.registration_doc_url, 'Carte grise')"
                             [title]="vehicle.registration_doc_url ? 'Ouvrir la carte grise dans un nouvel onglet' : 'Carte grise non téléversée'"
                             class="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white border text-[9px] font-black uppercase tracking-widest transition-all"
                             [class.border-outline-variant/20]="vehicle.registration_doc_url"
                             [class.text-on-surface]="vehicle.registration_doc_url"
                             [class.hover:border-primary/40]="vehicle.registration_doc_url"
                             [class.hover:bg-primary/5]="vehicle.registration_doc_url"
                             [class.border-dashed]="!vehicle.registration_doc_url"
                             [class.border-outline-variant/40]="!vehicle.registration_doc_url"
                             [class.text-outline]="!vehicle.registration_doc_url"
                             [class.opacity-70]="!vehicle.registration_doc_url">
                             <span class="material-symbols-outlined text-base" [class.text-primary]="vehicle.registration_doc_url">visibility</span>
                             Carte grise
                          </button>
                          <button type="button"
                             (click)="openVehicleDocPreview($event, vehicle.vignette_doc_url, 'Vignette')"
                             [title]="vehicle.vignette_doc_url ? 'Ouvrir la vignette dans un nouvel onglet' : 'Vignette non téléversée'"
                             class="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white border text-[9px] font-black uppercase tracking-widest transition-all"
                             [class.border-outline-variant/20]="vehicle.vignette_doc_url"
                             [class.text-on-surface]="vehicle.vignette_doc_url"
                             [class.hover:border-amber-500/50]="vehicle.vignette_doc_url"
                             [class.hover:bg-amber-50/50]="vehicle.vignette_doc_url"
                             [class.border-dashed]="!vehicle.vignette_doc_url"
                             [class.border-outline-variant/40]="!vehicle.vignette_doc_url"
                             [class.text-outline]="!vehicle.vignette_doc_url"
                             [class.opacity-70]="!vehicle.vignette_doc_url">
                             <span class="material-symbols-outlined text-base" [class.text-amber-600]="vehicle.vignette_doc_url">visibility</span>
                             Vignette
                          </button>
                       </div>
                    </div>
                 </div>
                 <div *ngIf="companyVehicles().length === 0" class="p-8 text-center bg-surface-container-low rounded-[2rem] border border-dashed border-outline-variant/20 italic text-outline text-xs">
                    Aucun véhicule enregistré pour ce client.
                 </div>
              </div>
           </div>

           <!-- QUICK UPLOAD SECTION FOR MISSING DOCS -->
           <div *ngIf="selectedVehiclesMissingDocs().length > 0" class="animate-fade-in relative">
              <div class="absolute -top-3 left-10 px-4 py-1 bg-error text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg z-10">Mise en conformité requise</div>
              <div class="bg-error/5 rounded-[2.5rem] p-10 border border-error/10 space-y-8">
                 <div *ngFor="let v of selectedVehiclesMissingDocs()" class="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div class="flex items-center gap-4">
                       <div class="w-12 h-12 rounded-2xl bg-error/10 text-error flex items-center justify-center">
                          <span class="material-symbols-outlined">receipt_long</span>
                       </div>
                       <div>
                          <p class="text-sm font-black text-on-surface">{{ v.license_plate }}</p>
                          <p class="text-[10px] text-error font-bold uppercase tracking-widest">
                             {{ !v.registration_doc_url && !v.vignette_doc_url ? 'Carte Grise & Vignette manquantes' : 
                                (!v.registration_doc_url ? 'Carte Grise manquante' : 'Vignette manquante') }}
                          </p>
                       </div>
                    </div>
                    <div class="flex items-center gap-3">
                       <div class="relative group">
                          <input type="file" (change)="uploadDocs(v, $event, 'registration')" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20">
                          <button class="px-4 py-2.5 rounded-xl bg-surface-container text-outline text-[9px] font-black uppercase tracking-widest flex items-center gap-2 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                             <span class="material-symbols-outlined text-sm">{{ v.registration_doc_url ? 'check_circle' : 'upload' }}</span>
                             CG
                          </button>
                       </div>
                       <div class="relative group">
                          <input type="file" (change)="uploadDocs(v, $event, 'vignette')" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20">
                          <button class="px-4 py-2.5 rounded-xl bg-surface-container text-outline text-[9px] font-black uppercase tracking-widest flex items-center gap-2 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                             <span class="material-symbols-outlined text-sm">{{ v.vignette_doc_url ? 'check_circle' : 'upload' }}</span>
                             Vignette
                          </button>
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           <!-- ─── SERVICES PAR VÉHICULE ─────────────────────────────────── -->
           <div *ngIf="selectedVehicles().length > 1" class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 px-1">
             <p class="text-[10px] font-black uppercase tracking-[0.2em] text-outline">
               Véhicules ({{ selectedVehicles().length }}) — faites glisser
             </p>
             <div class="flex items-center justify-between sm:justify-end gap-3">
               <p class="text-[10px] font-bold text-outline/60 hidden sm:block">
                 {{ selectedVehicles()[0]?.license_plate }} → {{ selectedVehicles()[selectedVehicles().length - 1]?.license_plate }}
               </p>
               <div class="flex items-center gap-2">
                 <button
                   type="button"
                   (click)="goVehicleSlide(-1)"
                   [disabled]="currentVehicleSlide() <= 0"
                   class="h-10 px-4 rounded-2xl bg-white border border-outline-variant/20 text-on-surface text-[10px] font-black uppercase tracking-widest hover:bg-surface-container-low transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
                   <span class="material-symbols-outlined text-sm">chevron_left</span>
                   Précédent
                 </button>
                 <button
                   type="button"
                   (click)="goVehicleSlide(1)"
                   [disabled]="currentVehicleSlide() >= selectedVehicles().length - 1"
                   class="h-10 px-4 rounded-2xl bg-[#1b1932] text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-primary/10">
                   Suivant
                   <span class="material-symbols-outlined text-sm">chevron_right</span>
                 </button>
               </div>
             </div>
           </div>

           <div
             #vehSlider
             (scroll)="onVehicleSliderScroll()"
             class="flex gap-6 overflow-x-auto pb-4 md:pb-6 -mx-2 px-2 scroll-smooth snap-x snap-mandatory"
             style="-webkit-overflow-scrolling: touch;"
             aria-label="Slider véhicules">
             <div
               *ngFor="let vehicle of selectedVehicles(); let vi = index"
               data-vehicle-slide
               class="bg-white rounded-[2.5rem] shadow-sm border border-outline-variant/5 overflow-hidden animate-fade-in snap-start shrink-0 w-[92%] sm:w-[520px] md:w-[620px] lg:w-[720px]">
              
              <!-- Vehicle Header -->
              <div class="bg-gradient-to-r from-[#1b1932] to-slate-800 p-6 flex items-center justify-between">
                 <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                       <span class="material-symbols-outlined text-2xl">directions_car</span>
                    </div>
                    <div>
                       <p class="text-white font-black font-headline text-base">{{ vehicle.license_plate }}</p>
                       <p class="text-white/50 text-[10px] font-bold uppercase tracking-widest">{{ vehicle.brand }} {{ vehicle.model }} · {{ vehicle.year || 'Année non renseignée' }} · {{ vehicleAgeBracketLabelFromYear(vehicle.year) }}</p>
                    </div>
                 </div>
                 <div class="text-right">
                    <p class="text-primary font-black text-xl font-headline">{{ getVehicleTotal(vehicle.id) | number:'1.0-0' }} XOF</p>
                    <p class="text-white/40 text-[10px] font-bold uppercase">Total véhicule HT</p>
                 </div>
              </div>

              <div class="p-8 space-y-8">

                <!-- ── VIGNETTE ─────────────────────────────────────────── -->
                <div class="border border-outline-variant/10 rounded-[1.5rem] overflow-hidden">
                   <div class="flex items-center justify-between p-5 cursor-pointer hover:bg-surface-container-low/50 transition-colors" (click)="toggleVignetteEnabled(vehicle.id)">
                      <div class="flex items-center gap-3">
                         <div [class.bg-amber-500]="getVehicleSvc(vehicle.id).vignette.enabled" [class.bg-surface-container]="!getVehicleSvc(vehicle.id).vignette.enabled" class="w-8 h-8 rounded-xl flex items-center justify-center transition-colors">
                            <span class="material-symbols-outlined text-sm" [class.text-white]="getVehicleSvc(vehicle.id).vignette.enabled">bookmark_added</span>
                         </div>
                         <div>
                            <p class="font-black text-sm text-on-surface">Vignette</p>
                            <p class="text-[10px] text-outline font-bold">Taxe annuelle obligatoire</p>
                         </div>
                      </div>
                      <div class="flex items-center gap-4">
                         <span *ngIf="getVehicleSvc(vehicle.id).vignette.enabled" class="font-black text-amber-600 text-base font-headline">
                            {{ getVehicleSvc(vehicle.id).vignette.price | number:'1.0-0' }} XOF
                         </span>
                         <div [class.bg-amber-500]="getVehicleSvc(vehicle.id).vignette.enabled" class="w-11 h-6 rounded-full border-2 border-outline-variant/20 relative transition-colors">
                            <div [class.translate-x-5]="getVehicleSvc(vehicle.id).vignette.enabled" class="w-5 h-5 rounded-full bg-white shadow absolute top-0 left-0 transition-transform duration-200"></div>
                         </div>
                      </div>
                   </div>

                   <div *ngIf="getVehicleSvc(vehicle.id).vignette.enabled" class="border-t border-outline-variant/10 p-6 bg-amber-50/30 space-y-5 animate-fade-in">
                      <p class="text-[11px] text-amber-900/80 leading-relaxed -mt-1 mb-1">
                         Choisissez la <strong>puissance fiscale (CV)</strong> comme sur la carte grise, puis la <strong>tranche d’âge du véhicule</strong> pour appliquer le barème.
                      </p>
                      <div class="space-y-6">
                         <div class="space-y-3">
                            <label class="block text-[10px] font-black text-outline uppercase tracking-widest ml-1">Catégorie (CV / type)</label>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                               <button type="button" *ngFor="let cat of vignetteCategories"
                                  (click)="pickVignetteCategory(vehicle.id, cat.key)"
                                  [attr.aria-pressed]="getVehicleSvc(vehicle.id).vignette.category === cat.key"
                                  class="text-left p-4 rounded-2xl border border-outline-variant/15 bg-white transition-all hover:border-amber-400/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
                                  [class.ring-2]="getVehicleSvc(vehicle.id).vignette.category === cat.key"
                                  [class.ring-amber-500]="getVehicleSvc(vehicle.id).vignette.category === cat.key"
                                  [class.bg-amber-50]="getVehicleSvc(vehicle.id).vignette.category === cat.key">
                                  <span class="text-xs font-bold text-on-surface leading-snug">{{ cat.label }}</span>
                               </button>
                            </div>
                         </div>
                         <div class="space-y-3" *ngIf="getVehicleSvc(vehicle.id).vignette.category">
                            <label class="block text-[10px] font-black text-outline uppercase tracking-widest ml-1">Tranche d’âge du véhicule</label>
                            <ng-container *ngIf="getVehicleSvc(vehicle.id).vignette.category !== 'tourisme_16cv'; else ageTourismeTiles">
                               <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  <button type="button" *ngFor="let ag of vignetteAgeTilesStandard"
                                     (click)="pickVignetteAge(vehicle.id, ag.key)"
                                     [attr.aria-pressed]="getVehicleSvc(vehicle.id).vignette.ageGroup === ag.key"
                                     class="text-left p-4 rounded-2xl border border-outline-variant/15 bg-white transition-all hover:border-amber-400/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
                                     [class.ring-2]="getVehicleSvc(vehicle.id).vignette.ageGroup === ag.key"
                                     [class.ring-amber-500]="getVehicleSvc(vehicle.id).vignette.ageGroup === ag.key"
                                     [class.bg-amber-50]="getVehicleSvc(vehicle.id).vignette.ageGroup === ag.key">
                                     <span class="block text-xs font-black text-on-surface">{{ ag.title }}</span>
                                     <span class="block text-[10px] text-outline font-medium mt-0.5">{{ yearRangeHint(ag.band) }}</span>
                                  </button>
                               </div>
                            </ng-container>
                            <ng-template #ageTourismeTiles>
                               <p class="text-[10px] text-outline font-medium -mt-1 mb-2">Barème tourisme 16 CV et plus : tranches 1–2 ans et 3–4 ans distinctes.</p>
                               <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <button type="button" *ngFor="let ag of vignetteAgeTilesTourisme"
                                     (click)="pickVignetteAge(vehicle.id, ag.key)"
                                     [attr.aria-pressed]="getVehicleSvc(vehicle.id).vignette.ageGroup === ag.key"
                                     class="text-left p-4 rounded-2xl border border-outline-variant/15 bg-white transition-all hover:border-amber-400/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
                                     [class.ring-2]="getVehicleSvc(vehicle.id).vignette.ageGroup === ag.key"
                                     [class.ring-amber-500]="getVehicleSvc(vehicle.id).vignette.ageGroup === ag.key"
                                     [class.bg-amber-50]="getVehicleSvc(vehicle.id).vignette.ageGroup === ag.key">
                                     <span class="block text-xs font-black text-on-surface">{{ ag.title }}</span>
                                     <span class="block text-[10px] font-medium mt-0.5" [class.text-amber-700]="ag.hint" [class.text-outline]="!ag.hint">
                                        {{ ag.hint || (ag.band ? yearRangeHint(ag.band) : '') }}
                                     </span>
                                  </button>
                               </div>
                            </ng-template>
                         </div>
                      </div>
                      <div *ngIf="getVehicleSvc(vehicle.id).vignette.price > 0" class="flex items-center justify-between bg-amber-500/10 rounded-2xl px-6 py-4">
                         <span class="text-xs font-bold text-amber-700">Tarif vignette calculé</span>
                         <span class="font-black text-amber-700 text-lg font-headline">{{ getVehicleSvc(vehicle.id).vignette.price | number:'1.0-0' }} XOF</span>
                      </div>
                   </div>
                </div>

                <!-- ── VISITE TECHNIQUE ─────────────────────────────────── -->
                <div class="border border-outline-variant/10 rounded-[1.5rem] overflow-hidden">
                   <div class="flex items-center justify-between p-5 cursor-pointer hover:bg-surface-container-low/50 transition-colors" (click)="toggleVisiteEnabled(vehicle.id)">
                      <div class="flex items-center gap-3">
                         <div [class.bg-primary]="getVehicleSvc(vehicle.id).visite.enabled" [class.bg-surface-container]="!getVehicleSvc(vehicle.id).visite.enabled" class="w-8 h-8 rounded-xl flex items-center justify-center transition-colors">
                            <span class="material-symbols-outlined text-sm" [class.text-white]="getVehicleSvc(vehicle.id).visite.enabled">verified</span>
                         </div>
                         <div>
                            <p class="font-black text-sm text-on-surface">Visite Technique</p>
                            <p class="text-[10px] text-outline font-bold">Contrôle réglementaire obligatoire</p>
                         </div>
                      </div>
                      <div class="flex items-center gap-4">
                         <span *ngIf="getVehicleSvc(vehicle.id).visite.enabled" class="font-black text-primary text-base font-headline">
                            {{ getVehicleSvc(vehicle.id).visite.price | number:'1.0-0' }} XOF
                         </span>
                         <div [class.bg-primary]="getVehicleSvc(vehicle.id).visite.enabled" class="w-11 h-6 rounded-full border-2 border-outline-variant/20 relative transition-colors">
                            <div [class.translate-x-5]="getVehicleSvc(vehicle.id).visite.enabled" class="w-5 h-5 rounded-full bg-white shadow absolute top-0 left-0 transition-transform duration-200"></div>
                         </div>
                      </div>
                   </div>

                   <div *ngIf="getVehicleSvc(vehicle.id).visite.enabled" class="border-t border-outline-variant/10 p-6 bg-primary/5 space-y-5 animate-fade-in">
                      <p class="text-[11px] text-on-surface/80 leading-relaxed -mt-1 mb-1">
                         La catégorie VT correspond au <strong>type d’usage</strong> (marchandises, personnes, tonnage, places). Le libellé reprend les critères réglementaires (PF, PTAC, places).
                      </p>
                      <div class="space-y-8">
                         <div class="space-y-4">
                            <label class="block text-[10px] font-black text-outline uppercase tracking-widest ml-1">Catégorie de transport</label>
                            <div *ngFor="let grp of vtCategoryGroups" class="space-y-2">
                               <p class="text-[10px] font-black text-primary uppercase tracking-wider ml-1">{{ grp.label }}</p>
                               <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <button type="button" *ngFor="let key of grp.keys"
                                     (click)="pickVtCategory(vehicle.id, key)"
                                     [attr.aria-pressed]="getVehicleSvc(vehicle.id).visite.category === key"
                                     class="text-left p-4 rounded-2xl border border-outline-variant/15 bg-white transition-all hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                                     [class.ring-2]="getVehicleSvc(vehicle.id).visite.category === key"
                                     [class.ring-primary]="getVehicleSvc(vehicle.id).visite.category === key"
                                     [class.bg-primary/5]="getVehicleSvc(vehicle.id).visite.category === key">
                                     <span class="text-[11px] font-bold text-on-surface leading-snug">{{ vtLabel(key) }}</span>
                                  </button>
                               </div>
                            </div>
                         </div>
                         <div class="space-y-3" *ngIf="getVehicleSvc(vehicle.id).visite.category">
                            <label class="block text-[10px] font-black text-outline uppercase tracking-widest ml-1">Type de visite</label>
                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                               <button type="button" *ngFor="let vt of vtVisitTypes"
                                  (click)="pickVtType(vehicle.id, vt.key)"
                                  [attr.aria-pressed]="getVehicleSvc(vehicle.id).visite.type === vt.key"
                                  [attr.aria-disabled]="vt.key === 'volontaire' && isVolontaireDisabled(vehicle.id)"
                                  [disabled]="vt.key === 'volontaire' && isVolontaireDisabled(vehicle.id)"
                                  class="text-left p-4 rounded-2xl border border-outline-variant/15 bg-white transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                                  [class.opacity-45]="vt.key === 'volontaire' && isVolontaireDisabled(vehicle.id)"
                                  [class.cursor-not-allowed]="vt.key === 'volontaire' && isVolontaireDisabled(vehicle.id)"
                                  [class.hover:border-primary/40]="!(vt.key === 'volontaire' && isVolontaireDisabled(vehicle.id))"
                                  [class.ring-2]="getVehicleSvc(vehicle.id).visite.type === vt.key"
                                  [class.ring-primary]="getVehicleSvc(vehicle.id).visite.type === vt.key"
                                  [class.bg-primary/5]="getVehicleSvc(vehicle.id).visite.type === vt.key">
                                  <span class="block text-xs font-black text-on-surface">{{ vt.label }}</span>
                                  <span class="block text-[10px] text-outline mt-0.5" *ngIf="vt.key === 'volontaire' && isVolontaireDisabled(vehicle.id)">Non prévu pour cette catégorie</span>
                               </button>
                            </div>
                         </div>
                      </div>
                      <div *ngIf="getVehicleSvc(vehicle.id).visite.price > 0" class="flex items-center justify-between bg-primary/10 rounded-2xl px-6 py-4">
                         <span class="text-xs font-bold text-primary">Tarif calculé</span>
                         <span class="font-black text-primary text-lg font-headline">{{ getVehicleSvc(vehicle.id).visite.price | number:'1.0-0' }} XOF</span>
                      </div>
                   </div>
                </div>

                <!-- ── SERVICES ADDITIONNELS ──────────────────────────── -->
                <div class="space-y-3">
                   <p class="text-[10px] font-black text-outline uppercase tracking-widest ml-1">Services additionnels</p>
                   <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label *ngFor="let svc of additionalServices"
                             class="flex items-center gap-3 p-4 rounded-2xl border border-outline-variant/10 cursor-pointer hover:bg-surface-container-low/50 transition-all"
                             [class.border-primary]="isAdditionalSelected(vehicle.id, svc.key)"
                             [class.bg-primary/5]="isAdditionalSelected(vehicle.id, svc.key)">
                         <input type="checkbox" 
                                [checked]="isAdditionalSelected(vehicle.id, svc.key)"
                                (change)="toggleAdditional(vehicle.id, svc.key)"
                                class="w-4 h-4 accent-primary rounded">
                         <div class="flex-1">
                            <p class="text-xs font-bold text-on-surface">{{ svc.label }}</p>
                         </div>
                         <span class="text-xs font-black text-primary">{{ svc.price | number:'1.0-0' }} XOF</span>
                      </label>
                   </div>
                </div>

              </div>
            </div>
           </div>

           <!-- Placeholder si aucun véhicule sélectionné -->
           <div *ngIf="selectedVehicles().length === 0 && quote.company_id > 0" class="bg-white rounded-[2.5rem] p-16 shadow-sm border border-dashed border-outline-variant/20 text-center space-y-4 text-outline">
              <span class="material-symbols-outlined text-5xl block opacity-20">directions_car</span>
              <p class="text-sm font-black">Sélectionnez au moins un véhicule pour configurer ses services</p>
           </div>

        </div>

        <!-- SUMMARY PANEL (RIGHT) -->
        <div class="col-span-12 lg:col-span-4 space-y-8">
           <div class="bg-[#1b1932] rounded-[2.5rem] p-10 shadow-2xl text-white sticky top-10">
              <h3 class="text-xl font-headline font-black mb-10 text-primary">Récapitulatif</h3>
              
              <div class="space-y-6">
                 <div class="flex justify-between items-center text-white/50">
                    <span class="text-[10px] font-black uppercase tracking-widest">Véhicules</span>
                    <span class="font-bold">{{ selectedVehicles().length }}</span>
                 </div>
                 <div class="flex justify-between items-center text-white/50">
                    <span class="text-[10px] font-black uppercase tracking-widest">Services configurés</span>
                    <span class="font-bold">{{ configuredServicesCount() }}</span>
                 </div>

                 <!-- Lines per vehicle -->
                 <div *ngFor="let vehicle of selectedVehicles()" class="space-y-2 pt-4 border-t border-white/10">
                    <p class="text-[10px] font-black text-white/40 uppercase tracking-widest">{{ vehicle.license_plate }}</p>
                    <div *ngIf="getVehicleSvc(vehicle.id).vignette.enabled && getVehicleSvc(vehicle.id).vignette.price > 0" class="flex justify-between items-center text-sm">
                       <span class="text-white/70 flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-amber-400 inline-block"></span> Vignette</span>
                       <span class="font-bold text-amber-400">{{ getVehicleSvc(vehicle.id).vignette.price | number:'1.0-0' }}</span>
                    </div>
                    <div *ngIf="getVehicleSvc(vehicle.id).visite.enabled && getVehicleSvc(vehicle.id).visite.price > 0" class="flex justify-between items-center text-sm">
                       <span class="text-white/70 flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-primary inline-block"></span> Visite Tech.</span>
                       <span class="font-bold text-primary">{{ getVehicleSvc(vehicle.id).visite.price | number:'1.0-0' }}</span>
                    </div>
                    <div *ngFor="let key of getVehicleSvc(vehicle.id).additionals" class="flex justify-between items-center text-sm">
                       <span class="text-white/60 text-xs">· {{ getAdditionalLabel(key) }}</span>
                       <span class="font-bold text-white/60 text-xs">{{ getAdditionalPrice(key) | number:'1.0-0' }}</span>
                    </div>
                 </div>

                 <div class="border-t border-white/10 pt-6 space-y-3">
                    <div class="flex justify-between items-center">
                       <span class="text-[10px] font-black uppercase tracking-widest text-white/50">Total HT</span>
                       <span class="font-black text-white text-lg font-headline">{{ totalHT() | number:'1.0-0' }} XOF</span>
                    </div>
                    <div class="flex justify-between items-center">
                       <span class="text-[10px] font-black uppercase tracking-widest text-primary">TVA 18%</span>
                       <span class="font-bold text-primary">{{ totalTVA() | number:'1.0-0' }} XOF</span>
                    </div>
                    <div class="flex justify-between items-center bg-white/5 rounded-2xl px-4 py-4">
                       <span class="text-sm font-black uppercase tracking-widest text-white">TOTAL TTC</span>
                       <span class="font-black text-2xl text-primary font-headline">{{ totalTTC() | number:'1.0-0' }}</span>
                    </div>
                    <p class="text-[10px] text-white/30 text-center">XOF (Franc CFA)</p>
                 </div>

                 <div *ngIf="!isValid()" class="text-[10px] text-error/80 text-center font-bold">
                    Sélectionnez un client, un véhicule et au moins un service pour générer le devis.
                 </div>
                 <div *ngIf="!allVehiclesCompliant() && selectedVehicles().length > 0" class="flex items-center gap-2 bg-error/10 rounded-2xl p-4 text-error text-xs font-black">
                    <span class="material-symbols-outlined text-sm">warning</span>
                    Documents manquants sur certains véhicules
                 </div>
              </div>
           </div>
        </div>

      </div>

    </div>

    <!-- MODAL PREVIEW PDF -->
    <app-quote-preview-modal
      *ngIf="showPreview()"
      [quoteData]="getPdfData()"
      [companyName]="selectedCompanyName()"
      [vehicles]="selectedVehicles()"
      (close)="showPreview.set(false)"
      (send)="onPreviewSend()">
    </app-quote-preview-modal>
  `,
  styles: [`
    @keyframes fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fade-in { animation: fade-in 0.25s ease-out both; }
    .animate-fade-in-up { animation: fade-in 0.35s ease-out both; }
  `]
})
export class QuoteFormComponent implements OnInit {
  @ViewChild('vehSlider') vehSlider?: ElementRef<HTMLElement>;
  currentVehicleSlide = signal(0);

  quote: any = {
    company_id: 0,
    quote_number: '',
    status: 'draft',
    total_amount: 0,
    items: [],
    vehicle_ids: []
  };

  clients         = signal<any[]>([]);
  companyVehicles = signal<Vehicle[]>([]);
  selectedVehicleIds = signal<number[]>([]);
  vehicleServices = signal<Map<number, VehicleService_>>(new Map());
  showPreview     = signal(false);
  /** Si défini, enregistrement via PATCH (brouillon existant). */
  editingQuoteId  = signal<number | null>(null);

  // Data tables exposed to template
  vignetteCategories = VIGNETTE_CATEGORIES;
  vignetteAgeTilesStandard = VIGNETTE_AGE_TILES_STANDARD;
  vignetteAgeTilesTourisme = VIGNETTE_AGE_TILES_TOURISME;
  vtCategories       = VT_CATEGORIES;
  vtCategoryGroups   = VT_CATEGORY_GROUPS;
  vtVisitTypes       = VT_VISIT_TYPES;
  additionalServices = ADDITIONAL_SERVICES;

  pickVignetteCategory(vehicleId: number, key: string): void {
    const svc = this.getVehicleSvc(vehicleId);
    svc.vignette.category = key;
    this.onVignetteCategoryChange(vehicleId);
  }

  pickVignetteAge(vehicleId: number, ageGroup: string): void {
    const svc = this.getVehicleSvc(vehicleId);
    svc.vignette.ageGroup = ageGroup;
    this.recalcVignette(vehicleId);
  }

  pickVtCategory(vehicleId: number, key: string): void {
    const svc = this.getVehicleSvc(vehicleId);
    svc.visite.category = key;
    if (VT_RATES[key]?.volontaire === null && svc.visite.type === 'volontaire') {
      svc.visite.type = 'visite';
    }
    this.recalcVisite(vehicleId);
  }

  pickVtType(vehicleId: number, type: 'visite' | 'revisite' | 'volontaire'): void {
    if (type === 'volontaire' && this.isVolontaireDisabled(vehicleId)) return;
    const svc = this.getVehicleSvc(vehicleId);
    svc.visite.type = type;
    this.recalcVisite(vehicleId);
  }

  vtLabel(key: string): string {
    return VT_CATEGORIES.find(c => c.key === key)?.label ?? key;
  }

  yearRangeHint(band: 'recent' | 'medium' | 'old'): string {
    return yearRangeForBand(band);
  }

  vehicleAgeBracketLabelFromYear(year: number | null | undefined): string {
    return vignetteAgeLabel(getAgeGroup(year ?? null));
  }

  onVignetteCategoryChange(vehicleId: number): void {
    const svc = this.getVehicleSvc(vehicleId);
    const c = svc.vignette.category;
    const a = svc.vignette.ageGroup;
    if (c === 'tourisme_16cv') {
      if (a === 'recent') svc.vignette.ageGroup = 'recent_1_2';
      else if (!['recent_1_2', 'recent_3_4', 'medium', 'old'].includes(a)) svc.vignette.ageGroup = 'recent_1_2';
    } else if (a === 'recent_1_2' || a === 'recent_3_4') {
      svc.vignette.ageGroup = 'recent';
    }
    this.recalcVignette(vehicleId);
  }

  selectedCompanyName = computed(() => {
    const client = this.clients().find(c => Number(c.id) === Number(this.quote.company_id));
    if (!client) return '';
    return (client.name ?? client.company_name ?? '').trim();
  });

  selectedVehicles            = computed(() => this.companyVehicles().filter(v => this.selectedVehicleIds().includes(v.id)));
  selectedVehiclesMissingDocs = computed(() => this.selectedVehicles().filter(v => !v.has_all_docs));
  allVehiclesCompliant        = computed(() => this.selectedVehicles().every(v => v.has_all_docs));

  totalHT = computed(() => {
    let total = 0;
    for (const [, svc] of this.vehicleServices()) {
      if (svc.vignette.enabled)  total += svc.vignette.price;
      if (svc.visite.enabled)    total += svc.visite.price;
      for (const key of svc.additionals) total += this.getAdditionalPrice(key);
    }
    return total;
  });

  totalTVA = computed(() => this.totalHT() * 0.18);
  totalTTC = computed(() => this.totalHT() + this.totalTVA());

  configuredServicesCount = computed(() => {
    let count = 0;
    for (const [, svc] of this.vehicleServices()) {
      if (svc.vignette.enabled && svc.vignette.price > 0) count++;
      if (svc.visite.enabled && svc.visite.price > 0) count++;
      count += svc.additionals.length;
    }
    return count;
  });

  private quoteService   = inject(QuoteService);
  private accountService = inject(AccountService);
  private vehicleSvc     = inject(VehicleService);
  private toastService   = inject(ToastService);
  private quoteRequestService = inject(QuoteRequestService);
  private route          = inject(ActivatedRoute);
  private router         = inject(Router);
  private preselectVehicleId: number | null = null;

  ngOnInit(): void {
    this.accountService.getClients().subscribe(data => this.clients.set(data));

    const editParam = this.route.snapshot.queryParamMap.get('edit');
    if (editParam) {
      this.loadQuoteForEdit(+editParam);
    } else {
      const qp = this.route.snapshot.queryParamMap;
      const companyId = qp.get('company_id');
      const vehicleId = qp.get('vehicle_id');
      const requestId = qp.get('request_id');

      if (requestId) this.quote.quote_request_id = +requestId;
      if (vehicleId) this.preselectVehicleId = +vehicleId;

      // Si request_id est présent mais vehicle_id absent, on récupère la demande
      // pour inférer le véhicule et sécuriser la pré-sélection.
      if (requestId && !vehicleId) {
        this.quoteRequestService.getById(+requestId).subscribe({
          next: (req: any) => {
            const inferredCompanyId = Number(req.company_id || req.company?.id || companyId || 0);
            const inferredVehicleId = Number(req.vehicle_id || req.vehicle?.id || 0);
            if (inferredVehicleId) this.preselectVehicleId = inferredVehicleId;
            if (inferredCompanyId) this.quote.company_id = inferredCompanyId;
            if (this.quote.company_id > 0) this.onClientChange();
          },
          error: () => {
            if (companyId) {
              this.quote.company_id = +companyId;
              this.onClientChange();
            }
          },
        });
      } else if (companyId) {
        this.quote.company_id = +companyId;
        this.onClientChange();
      }
    }

    effect(() => {
      this.quote.vehicle_ids = this.selectedVehicleIds();
    }, { allowSignalWrites: true });

    // Reset index quand la sélection change (navigation boutons).
    effect(() => {
      const count = this.selectedVehicles().length;
      if (count <= 1) {
        this.currentVehicleSlide.set(0);
        return;
      }
      // Si l’index courant dépasse, on le ramène.
      const cur = this.currentVehicleSlide();
      if (cur > count - 1) this.currentVehicleSlide.set(0);
    }, { allowSignalWrites: true });
  }

  private vehicleSlideElements(): HTMLElement[] {
    const host = this.vehSlider?.nativeElement;
    if (!host) return [];
    return Array.from(host.querySelectorAll<HTMLElement>('[data-vehicle-slide]'));
  }

  goVehicleSlide(delta: number): void {
    const slides = this.vehicleSlideElements();
    if (slides.length <= 1) return;
    const next = Math.min(slides.length - 1, Math.max(0, this.currentVehicleSlide() + delta));
    this.currentVehicleSlide.set(next);
    slides[next]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  }

  onVehicleSliderScroll(): void {
    const host = this.vehSlider?.nativeElement;
    if (!host) return;
    const slides = this.vehicleSlideElements();
    if (slides.length <= 1) return;
    const left = host.scrollLeft;
    let bestIdx = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < slides.length; i++) {
      const d = Math.abs(slides[i].offsetLeft - left);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    if (bestIdx !== this.currentVehicleSlide()) this.currentVehicleSlide.set(bestIdx);
  }

  private loadQuoteForEdit(id: number): void {
    this.quoteService.getById(id).subscribe({
      next: (q: any) => {
        if (q.status !== 'draft') {
          this.toastService.info('Seuls les brouillons peuvent être modifiés.');
          this.router.navigate(['/vente']);
          return;
        }
        this.editingQuoteId.set(id);
        this.quote.id = q.id;
        this.quote.company_id = q.company_id;
        this.quote.quote_number = q.quote_number;
        this.quote.status = q.status;
        this.quote.quote_request_id = q.quote_request_id;
        this.quote.valid_until = q.valid_until;

        let vehicleIds: number[] = (q.vehicles || []).map((v: any) => v.id).filter(Boolean);
        const rawItems = q.items || [];

        this.vehicleSvc.getByClient(q.company_id).subscribe(vehicles => {
          this.companyVehicles.set(vehicles);
          if (vehicleIds.length === 0 && rawItems.length > 0) {
            vehicleIds = inferVehicleIdsFromItems(rawItems, vehicles);
          }
          this.selectedVehicleIds.set(vehicleIds);
          const map = hydrateVehicleServicesFromQuoteItems(rawItems, vehicleIds, vehicles);
          this.vehicleServices.set(map);
        });
      },
      error: () => {
        this.toastService.error('Impossible de charger ce devis.');
        this.router.navigate(['/vente']);
      },
    });
  }

  onClientChange(): void {
    if (this.quote.company_id > 0) {
      this.vehicleSvc.getByClient(this.quote.company_id).subscribe(data => {
        this.companyVehicles.set(data);
        const vehicleId = this.preselectVehicleId;
        if (vehicleId) {
          this.selectedVehicleIds.set([vehicleId]);
          this.ensureVehicleService(vehicleId, data.find(v => v.id === vehicleId));
          this.preselectVehicleId = null;
        }
      });
    } else {
      this.companyVehicles.set([]);
      this.selectedVehicleIds.set([]);
    }
  }

  toggleVehicle(vehicle: Vehicle): void {
    const current = this.selectedVehicleIds();
    if (current.includes(vehicle.id)) {
      this.selectedVehicleIds.set(current.filter(id => id !== vehicle.id));
    } else {
      this.selectedVehicleIds.set([...current, vehicle.id]);
      this.ensureVehicleService(vehicle.id, vehicle);
    }
  }

  private ensureVehicleService(vehicleId: number, vehicle?: Vehicle): void {
    const map = new Map(this.vehicleServices());
    if (!map.has(vehicleId)) {
      const ageGroup = getAgeGroup(vehicle?.year ?? null);
      map.set(vehicleId, {
        vehicleId,
        vignette: { enabled: false, category: '', ageGroup, price: 0 },
        visite:   { enabled: false, category: '', type: 'visite', price: 0 },
        additionals: [],
      });
      this.vehicleServices.set(map);
    }
  }

  isVehicleSelected(id: number): boolean {
    return this.selectedVehicleIds().includes(id);
  }

  getVehicleSvc(vehicleId: number): VehicleService_ {
    const map = this.vehicleServices();
    if (!map.has(vehicleId)) {
      const newSvc: VehicleService_ = {
        vehicleId,
        vignette: { enabled: false, category: '', ageGroup: 'recent', price: 0 },
        visite:   { enabled: false, category: '', type: 'visite', price: 0 },
        additionals: [],
      };
      const newMap = new Map(map);
      newMap.set(vehicleId, newSvc);
      this.vehicleServices.set(newMap);
      return newSvc;
    }
    return map.get(vehicleId)!;
  }

  toggleVignetteEnabled(vehicleId: number): void {
    const svc = this.getVehicleSvc(vehicleId);
    svc.vignette.enabled = !svc.vignette.enabled;
    this.vehicleServices.set(new Map(this.vehicleServices()));
  }

  toggleVisiteEnabled(vehicleId: number): void {
    const svc = this.getVehicleSvc(vehicleId);
    svc.visite.enabled = !svc.visite.enabled;
    this.vehicleServices.set(new Map(this.vehicleServices()));
  }

  recalcVignette(vehicleId: number): void {
    const svc = this.getVehicleSvc(vehicleId);
    svc.vignette.price = computeVignettePrice(svc.vignette.category, svc.vignette.ageGroup);
    this.vehicleServices.set(new Map(this.vehicleServices()));
  }

  recalcVisite(vehicleId: number): void {
    const svc = this.getVehicleSvc(vehicleId);
    svc.visite.price = computeVtPrice(svc.visite.category, svc.visite.type);
    this.vehicleServices.set(new Map(this.vehicleServices()));
  }

  isVolontaireDisabled(vehicleId: number): boolean {
    const cat = this.getVehicleSvc(vehicleId).visite.category;
    if (!cat) return false;
    return VT_RATES[cat]?.volontaire === null;
  }

  isAdditionalSelected(vehicleId: number, key: string): boolean {
    return this.getVehicleSvc(vehicleId).additionals.includes(key);
  }

  toggleAdditional(vehicleId: number, key: string): void {
    const svc = this.getVehicleSvc(vehicleId);
    if (svc.additionals.includes(key)) {
      svc.additionals = svc.additionals.filter(k => k !== key);
    } else {
      svc.additionals = [...svc.additionals, key];
    }
    this.vehicleServices.set(new Map(this.vehicleServices()));
  }

  getAdditionalLabel(key: string): string {
    return ADDITIONAL_SERVICES.find(s => s.key === key)?.label ?? key;
  }

  getAdditionalPrice(key: string): number {
    return ADDITIONAL_SERVICES.find(s => s.key === key)?.price ?? 0;
  }

  getVehicleTotal(vehicleId: number): number {
    const svc = this.getVehicleSvc(vehicleId);
    let total = 0;
    if (svc.vignette.enabled) total += svc.vignette.price;
    if (svc.visite.enabled)   total += svc.visite.price;
    for (const key of svc.additionals) total += this.getAdditionalPrice(key);
    return total;
  }

  openVehicleDocPreview(event: Event, url: string | undefined | null, label: string): void {
    event.stopPropagation();
    if (!url?.trim()) {
      this.toastService.info(`${label} : aucun fichier. Téléversez-le depuis la zone « Mise en conformité » si besoin.`);
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  uploadDocs(vehicle: Vehicle, event: any, type: 'registration' | 'vignette'): void {
    const file = event.target.files[0];
    if (!file) return;
    const reg = type === 'registration' ? file : undefined;
    const vig = type === 'vignette' ? file : undefined;
    this.toastService.info(`Upload en cours...`);
    this.vehicleSvc.uploadQuickDocs(vehicle.id, reg, vig).subscribe({
      next: (updatedVehicle) => {
        this.toastService.success('Document mis à jour.');
        this.companyVehicles.update(prev => prev.map(v => v.id === vehicle.id ? { ...v, ...updatedVehicle } : v));
      },
      error: () => this.toastService.error("Erreur lors de l'upload.")
    });
  }

  isValid(): boolean {
    return this.quote.company_id > 0 && this.selectedVehicleIds().length > 0 && this.configuredServicesCount() > 0;
  }

  /** Génère les items de devis depuis les services configurés */
  private buildItems(): QuoteItem[] {
    const items: QuoteItem[] = [];
    for (const vehicle of this.selectedVehicles()) {
      const svc = this.getVehicleSvc(vehicle.id);
      const plate = vehicle.license_plate;
      const catLabel = VIGNETTE_CATEGORIES.find(c => c.key === svc.vignette.category)?.label ?? '';
      
      if (svc.vignette.enabled && svc.vignette.price > 0) {
        items.push({
          description: `Vignette — ${plate} (${catLabel}, ${vignetteAgeLabel(svc.vignette.ageGroup)})`,
          price: svc.vignette.price,
          quantity: 1,
        });
      }
      if (svc.visite.enabled && svc.visite.price > 0) {
        const vtLabel = VT_CATEGORIES.find(c => c.key === svc.visite.category)?.label ?? '';
        const typeLabel = svc.visite.type === 'visite' ? 'Visite Technique' : svc.visite.type === 'revisite' ? 'Révisite' : 'Visite Volontaire';
        items.push({
          description: `${typeLabel} — ${plate} (${vtLabel})`,
          price: svc.visite.price,
          quantity: 1,
        });
      }
      for (const key of svc.additionals) {
        items.push({
          description: `${this.getAdditionalLabel(key)} — ${plate}`,
          price: this.getAdditionalPrice(key),
          quantity: 1,
        });
      }
    }
    return items;
  }

  saveDraft(): void { this.submit('draft'); }
  sendQuote(): void { this.submit('sent'); }
  onPreviewSend(): void { this.showPreview.set(false); this.submit('sent'); }

  getPdfData(): any {
    return {
      ...this.quote,
      items: this.buildItems(),
      total_amount: this.totalTTC(),
      company_name: this.selectedCompanyName(),
    };
  }

  private submit(targetStatus: 'draft' | 'sent'): void {
    if (!this.isValid() || !this.allVehiclesCompliant()) return;
    this.quote.items = this.buildItems();
    this.quote.status = targetStatus;
    this.quote.total_amount = this.totalTTC();

    const payload: any = {
      company_id: this.quote.company_id,
      vehicle_ids: this.selectedVehicleIds(),
      items: this.quote.items,
      total_amount: this.quote.total_amount,
      quote_request_id: this.quote.quote_request_id,
      valid_until: this.quote.valid_until,
      status: targetStatus,
    };
    const qn = String(this.quote.quote_number ?? '').trim();
    if (qn) payload.quote_number = qn;

    const editId = this.editingQuoteId();
    if (editId) {
      this.quoteService.update(editId, payload).subscribe({
        next: () => {
          this.toastService.success('Brouillon mis à jour.');
          this.router.navigate(['/vente']);
        },
        error: (err) => {
          const msg = err?.error?.message || err?.error?.errors ? 'Données invalides.' : 'Erreur lors de la mise à jour.';
          this.toastService.error(typeof msg === 'string' ? msg : 'Erreur lors de la mise à jour.');
        },
      });
      return;
    }

    const createBody: any = {
      company_id: this.quote.company_id,
      quote_request_id: this.quote.quote_request_id,
      valid_until: this.quote.valid_until,
      vehicle_ids: this.selectedVehicleIds(),
      items: this.quote.items,
    };
    if (qn) createBody.quote_number = qn;
    this.quoteService.create(createBody as unknown as Quote).subscribe({
      next: () => {
        this.toastService.success('Devis enregistré avec succès.');
        this.router.navigate(['/vente']);
      },
      error: () => this.toastService.error('Erreur lors de la création.'),
    });
  }

  cancel(): void { this.router.navigate(['/vente']); }
}
