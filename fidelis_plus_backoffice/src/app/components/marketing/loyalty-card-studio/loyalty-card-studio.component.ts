import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as QRCode from 'qrcode';
import {
  LoyaltyService,
  LoyaltyCardTemplateRow,
  LoyaltyCardTemplateLayout,
  LoyaltyMemberRow,
  LoyaltyAccountRow,
  LoyaltyCardBatchRow,
  PaginatedMeta,
  MarketingDashboardStats,
} from '../../../services/loyalty.service';
import { ToastService } from '../../../services/toast.service';
import { MarketingBgPatternComponent } from '../../ui/marketing-bg-pattern/marketing-bg-pattern.component';

function defaultLayout(): LoyaltyCardTemplateLayout {
  return {
    qr_x: 70, qr_y: 25, qr_size: 24,
    card_number_x: 8, card_number_y: 88, card_number_color: '#ffffff', card_number_size: 12,
    holder_name_enabled: false,
    holder_name_x: 8, holder_name_y: 75, holder_name_color: '#ffffff', holder_name_size: 11,
  };
}

@Component({
  selector: 'app-loyalty-card-studio',
  standalone: true,
  imports: [CommonModule, FormsModule, MarketingBgPatternComponent],
  template: `
    <app-marketing-bg-pattern></app-marketing-bg-pattern>
    <div class="animate-fade-in-up space-y-8 pb-20 relative z-[1]">

      <section class="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 class="text-2xl md:text-3xl font-headline font-black text-on-surface">Studio <span class="text-primary">Carte</span></h1>
          <p class="text-outline text-sm font-medium mt-1">Modèles visuels et émission des cartes fidélité (physiques et virtuelles).</p>
        </div>
        <div class="flex gap-2 bg-surface-container-low rounded-2xl p-1">
          <button type="button" (click)="section.set('issue')"
                  [class]="section() === 'issue' ? 'px-5 py-2.5 bg-white text-primary shadow-sm rounded-xl text-xs font-black uppercase tracking-widest' : 'px-5 py-2.5 text-outline text-xs font-black uppercase tracking-widest'">
            Émettre / Gérer
          </button>
          <button type="button" (click)="section.set('templates')"
                  [class]="section() === 'templates' ? 'px-5 py-2.5 bg-white text-primary shadow-sm rounded-xl text-xs font-black uppercase tracking-widest' : 'px-5 py-2.5 text-outline text-xs font-black uppercase tracking-widest'">
            Modèles
          </button>
          <button type="button" (click)="section.set('batch')"
                  [class]="section() === 'batch' ? 'px-5 py-2.5 bg-white text-primary shadow-sm rounded-xl text-xs font-black uppercase tracking-widest' : 'px-5 py-2.5 text-outline text-xs font-black uppercase tracking-widest'">
            Génération en masse
          </button>
        </div>
      </section>

      <!-- KPI -->
      <section class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-2xl p-5 border border-outline-variant/10 shadow-sm">
          <p class="text-[10px] font-black uppercase text-outline tracking-widest mb-1">Cartes émises</p>
          <p class="text-2xl font-headline font-black text-on-surface">{{ stats()?.accounts?.total ?? '—' }}</p>
          <p class="text-[10px] text-outline mt-0.5" *ngIf="stats()">{{ stats()!.accounts.particulier }} particulier · {{ stats()!.accounts.entreprise }} entreprise</p>
        </div>
        <div class="bg-white rounded-2xl p-5 border border-outline-variant/10 shadow-sm">
          <p class="text-[10px] font-black uppercase text-outline tracking-widest mb-1">Cartes vierges en stock</p>
          <p class="text-2xl font-headline font-black text-on-surface">{{ stats()?.card_stock?.blank_available ?? '—' }}</p>
        </div>
        <div class="bg-white rounded-2xl p-5 border border-outline-variant/10 shadow-sm">
          <p class="text-[10px] font-black uppercase text-outline tracking-widest mb-1">Lots à imprimer</p>
          <p class="text-2xl font-headline font-black" [class.text-error]="(stats()?.card_stock?.batches_to_print ?? 0) > 0" [class.text-on-surface]="!(stats()?.card_stock?.batches_to_print ?? 0)">{{ stats()?.card_stock?.batches_to_print ?? '—' }}</p>
        </div>
        <div class="bg-white rounded-2xl p-5 border border-outline-variant/10 shadow-sm">
          <p class="text-[10px] font-black uppercase text-outline tracking-widest mb-1">Modèles disponibles</p>
          <p class="text-2xl font-headline font-black text-on-surface">{{ templates().length }}</p>
        </div>
      </section>

      <!-- ================= ÉMETTRE / GÉRER ================= -->
      <section *ngIf="section() === 'issue'" class="grid grid-cols-1 lg:grid-cols-12 gap-8">

        <!-- Colonne gauche : recherche + sélection -->
        <div class="lg:col-span-5 space-y-6">
          <div class="bg-white rounded-[2rem] p-6 border border-outline-variant/10 shadow-sm space-y-4">
            <label class="block text-[10px] font-black uppercase text-outline tracking-[0.2em]">Client</label>
            <div class="relative">
              <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
              <input type="text" [(ngModel)]="memberSearch" (ngModelChange)="onMemberSearch($event)"
                     placeholder="Nom, entreprise, contact..."
                     class="w-full pl-11 pr-4 py-3 rounded-2xl bg-surface-container-low border-none text-sm outline-none focus:ring-2 focus:ring-primary/20">
            </div>
            <div class="max-h-64 overflow-y-auto space-y-2">
              <button *ngFor="let m of members()" type="button" (click)="selectMember(m)"
                      [class]="'w-full text-left p-3 rounded-xl border-2 transition-all ' + (selectedMember()?.id === m.id ? 'border-primary bg-primary/5' : 'border-outline-variant/15 hover:border-primary/30')">
                <p class="text-sm font-bold text-on-surface">{{ displayName(m) }}</p>
                <p class="text-xs text-outline">{{ m.contact }} · N° {{ m.loyalty_account?.card_number || '—' }}</p>
              </button>
              <p *ngIf="!loadingMembers() && members().length === 0" class="text-xs text-outline italic py-4 text-center">Aucun client trouvé.</p>
              <button *ngIf="hasMoreMembers()" type="button" (click)="loadMoreMembers()" [disabled]="loadingMoreMembers()"
                      class="w-full py-2.5 text-[11px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 rounded-xl transition-colors disabled:opacity-50">
                {{ loadingMoreMembers() ? 'Chargement…' : 'Voir plus (' + (membersMeta()!.total - members().length) + ' restants)' }}
              </button>
            </div>
          </div>

          <div class="bg-white rounded-[2rem] p-6 border border-outline-variant/10 shadow-sm space-y-4" *ngIf="selectedMember()">
            <label class="block text-[10px] font-black uppercase text-outline tracking-[0.2em]">Modèle de carte</label>
            <div class="grid grid-cols-2 gap-3">
              <button *ngFor="let t of templatesForSelected()" type="button" (click)="selectedTemplate.set(t)"
                      [class]="'rounded-2xl overflow-hidden border-2 transition-all ' + (selectedTemplate()?.id === t.id ? 'border-primary' : 'border-outline-variant/15 hover:border-primary/30')">
                <img [src]="t.background_url" class="w-full h-20 object-cover">
                <p class="text-[10px] font-bold text-on-surface p-1.5 truncate">{{ t.name }}</p>
              </button>
              <p *ngIf="templatesForSelected().length === 0" class="col-span-2 text-xs text-outline italic py-4 text-center">
                Aucun modèle pour ce type de client. Crée-en un dans l'onglet "Modèles".
              </p>
            </div>

            <button type="button" (click)="printCard()" [disabled]="!canPrint()"
                    class="w-full h-12 rounded-xl bg-[#1b1932] text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
              <span class="material-symbols-outlined text-lg">print</span>
              Imprimer / Exporter la carte
            </button>
            <button type="button" (click)="downloadCardPdf()" [disabled]="!canPrint() || downloadingCard()"
                    class="w-full h-12 rounded-xl bg-white border border-outline-variant/20 text-on-surface text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-container-low transition-colors">
              <span class="material-symbols-outlined text-lg" [class.animate-spin]="downloadingCard()">{{ downloadingCard() ? 'sync' : 'picture_as_pdf' }}</span>
              {{ downloadingCard() ? 'Génération…' : 'Télécharger en PDF' }}
            </button>
          </div>
        </div>

        <!-- Colonne droite : aperçu -->
        <div class="lg:col-span-7">
          <div class="bg-surface-container-low rounded-[2rem] p-10 flex items-center justify-center min-h-[420px]">
            <div *ngIf="!selectedMember()" class="text-outline text-sm italic">Sélectionne un client pour prévisualiser sa carte.</div>
            <div *ngIf="selectedMember() && !selectedTemplate()" class="text-outline text-sm italic">Choisis un modèle de carte.</div>

            <div id="printable-card" *ngIf="selectedMember() && selectedTemplate() as t"
                 class="relative rounded-2xl overflow-hidden shadow-2xl" style="width: 400px; aspect-ratio: 1.586;">
              <img [src]="t.background_url" class="absolute inset-0 w-full h-full object-cover">
              <div class="absolute font-bold font-mono" [style.left.%]="t.layout_json.card_number_x" [style.top.%]="t.layout_json.card_number_y"
                   [style.color]="t.layout_json.card_number_color" [style.fontSize.px]="t.layout_json.card_number_size">
                N° {{ selectedMember()?.loyalty_account?.card_number || '—' }}
              </div>
              <img *ngIf="cardQrDataUrl()" [src]="cardQrDataUrl()!"
                   class="absolute bg-white p-1 rounded"
                   [style.left.%]="t.layout_json.qr_x" [style.top.%]="t.layout_json.qr_y" [style.width.%]="t.layout_json.qr_size">
              <div *ngIf="t.layout_json.holder_name_enabled" class="absolute font-bold whitespace-nowrap"
                   [style.left.%]="t.layout_json.holder_name_x" [style.top.%]="t.layout_json.holder_name_y"
                   [style.color]="t.layout_json.holder_name_color" [style.fontSize.px]="t.layout_json.holder_name_size">
                {{ displayName(selectedMember()!) }}
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ================= MODÈLES ================= -->
      <section *ngIf="section() === 'templates'" class="grid grid-cols-1 lg:grid-cols-12 gap-8">

        <!-- Liste des modèles -->
        <div class="lg:col-span-5 space-y-4">
          <button type="button" (click)="openNewTemplateForm()"
                  class="w-full h-12 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2">
            <span class="material-symbols-outlined text-lg">add_photo_alternate</span>
            Nouveau modèle
          </button>

          <div *ngFor="let t of templates()" class="bg-white rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden flex items-center gap-4 p-3">
            <img [src]="t.background_url" class="w-20 h-14 rounded-lg object-cover shrink-0">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold text-on-surface truncate">{{ t.name }}</p>
              <p class="text-[10px] text-outline uppercase font-bold">{{ t.type }} <span *ngIf="t.is_default" class="text-primary">· par défaut</span></p>
            </div>
            <button type="button" (click)="deleteTemplate(t)" class="w-9 h-9 rounded-xl bg-error/10 text-error flex items-center justify-center hover:bg-error hover:text-white transition-colors shrink-0">
              <span class="material-symbols-outlined text-lg">delete</span>
            </button>
          </div>
          <p *ngIf="templates().length === 0" class="text-xs text-outline italic text-center py-6">Aucun modèle créé pour l'instant.</p>
        </div>

        <!-- Éditeur + aperçu -->
        <div class="lg:col-span-7 bg-white rounded-[2rem] p-8 border border-outline-variant/10 shadow-sm space-y-6" *ngIf="showTemplateForm()">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Nom du modèle</label>
              <input type="text" [(ngModel)]="templateForm.name" class="w-full px-4 py-2.5 bg-surface-container rounded-xl border-none text-sm outline-none focus:ring-2 focus:ring-primary/20">
            </div>
            <div>
              <label class="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Type de client</label>
              <select [(ngModel)]="templateForm.type" class="w-full px-4 py-2.5 bg-surface-container rounded-xl border-none text-sm outline-none focus:ring-2 focus:ring-primary/20">
                <option value="particulier">Particulier</option>
                <option value="entreprise">Entreprise</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Visuel de fond</label>
            <div (click)="bgInput.click()"
                 class="border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer hover:border-primary/50 transition-all"
                 [class.border-primary]="templateBgPreview()">
              <img *ngIf="templateBgPreview()" [src]="templateBgPreview()!" class="max-h-40 mx-auto rounded-lg mb-2">
              <p class="text-xs font-bold text-outline">{{ templateBgFile ? templateBgFile.name : 'Choisir une image (fond de carte)' }}</p>
              <input #bgInput type="file" accept="image/*" (change)="onBgSelected($event)" class="hidden">
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-[10px] font-bold text-outline uppercase tracking-wider mb-1">QR — Taille (%)</label>
              <input type="number" [(ngModel)]="templateForm.layout.qr_size" min="5" max="60" class="w-full px-3 py-2 bg-surface-container rounded-lg text-sm outline-none">
            </div>
            <div></div>
            <div>
              <label class="block text-[10px] font-bold text-outline uppercase tracking-wider mb-1">N° carte — Couleur</label>
              <input type="color" [(ngModel)]="templateForm.layout.card_number_color" class="w-full h-9 rounded-lg border-none">
            </div>
            <div>
              <label class="block text-[10px] font-bold text-outline uppercase tracking-wider mb-1">N° carte — Taille (px)</label>
              <input type="number" [(ngModel)]="templateForm.layout.card_number_size" min="6" max="30" class="w-full px-3 py-2 bg-surface-container rounded-lg text-sm outline-none">
            </div>
          </div>

          <!-- Nom du titulaire : facultatif, désactivé par défaut -->
          <div class="border border-outline-variant/15 rounded-2xl p-4 space-y-3">
            <label class="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" [(ngModel)]="templateForm.layout.holder_name_enabled" class="w-4 h-4 accent-primary rounded">
              <span class="text-xs font-bold text-on-surface">Afficher le nom du titulaire sur la carte</span>
            </label>
            <div class="grid grid-cols-2 gap-4" *ngIf="templateForm.layout.holder_name_enabled">
              <div>
                <label class="block text-[10px] font-bold text-outline uppercase tracking-wider mb-1">Nom titulaire — Couleur</label>
                <input type="color" [(ngModel)]="templateForm.layout.holder_name_color" class="w-full h-9 rounded-lg border-none">
              </div>
              <div>
                <label class="block text-[10px] font-bold text-outline uppercase tracking-wider mb-1">Nom titulaire — Taille (px)</label>
                <input type="number" [(ngModel)]="templateForm.layout.holder_name_size" min="6" max="30" class="w-full px-3 py-2 bg-surface-container rounded-lg text-sm outline-none">
              </div>
            </div>
          </div>

          <!-- Aperçu live — glisser-déposer façon Canva pour positionner le QR et le n° de carte -->
          <div>
            <label class="block text-[10px] font-bold text-outline uppercase tracking-wider mb-2">Aperçu — glissez le QR ou le n° de carte pour les positionner</label>
            <div class="bg-surface-container-low rounded-2xl p-6 flex justify-center">
              <div #templatePreviewEl class="relative rounded-2xl overflow-hidden shadow-xl select-none" style="width: 320px; aspect-ratio: 1.586;">
                <img *ngIf="templateBgPreview()" [src]="templateBgPreview()!" class="absolute inset-0 w-full h-full object-cover pointer-events-none">
                <div *ngIf="!templateBgPreview()" class="absolute inset-0 bg-surface-container flex items-center justify-center text-outline text-xs">Visuel non défini</div>
                <div class="absolute font-bold font-mono cursor-move ring-2 ring-primary/40 rounded px-0.5"
                     (mousedown)="startDrag($event, 'card_number', templatePreviewEl)" (touchstart)="startDrag($event, 'card_number', templatePreviewEl)"
                     [style.left.%]="templateForm.layout.card_number_x" [style.top.%]="templateForm.layout.card_number_y"
                     [style.color]="templateForm.layout.card_number_color" [style.fontSize.px]="templateForm.layout.card_number_size">
                  {{ templateForm.type === 'entreprise' ? 'N° ENT-0042' : 'N° FID-0042' }}
                </div>
                <div class="absolute bg-white/90 rounded flex items-center justify-center text-[8px] font-bold text-outline cursor-move ring-2 ring-primary/40"
                     (mousedown)="startDrag($event, 'qr', templatePreviewEl)" (touchstart)="startDrag($event, 'qr', templatePreviewEl)"
                     [style.left.%]="templateForm.layout.qr_x" [style.top.%]="templateForm.layout.qr_y"
                     [style.width.%]="templateForm.layout.qr_size" [style.aspectRatio]="'1'">
                  QR
                </div>
                <div *ngIf="templateForm.layout.holder_name_enabled" class="absolute font-bold cursor-move ring-2 ring-primary/40 rounded px-0.5 whitespace-nowrap"
                     (mousedown)="startDrag($event, 'holder_name', templatePreviewEl)" (touchstart)="startDrag($event, 'holder_name', templatePreviewEl)"
                     [style.left.%]="templateForm.layout.holder_name_x" [style.top.%]="templateForm.layout.holder_name_y"
                     [style.color]="templateForm.layout.holder_name_color" [style.fontSize.px]="templateForm.layout.holder_name_size">
                  {{ templateForm.type === 'entreprise' ? 'Société Exemple' : 'Prénom Nom' }}
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-2">
            <button type="button" (click)="showTemplateForm.set(false)" class="px-5 py-2.5 border border-slate-200 text-outline hover:text-on-surface font-bold text-xs rounded-lg transition-colors">
              Annuler
            </button>
            <button type="button" (click)="saveTemplate()" [disabled]="savingTemplate()"
                    class="px-6 py-2.5 bg-primary text-white font-bold text-xs rounded-lg shadow-md shadow-primary/10 hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all">
              {{ savingTemplate() ? 'Enregistrement...' : 'Enregistrer le modèle' }}
            </button>
          </div>
        </div>
      </section>

      <!-- ================= GÉNÉRATION EN MASSE ================= -->
      <section *ngIf="section() === 'batch'" class="grid grid-cols-1 lg:grid-cols-12 gap-8">

        <div class="lg:col-span-5">
          <div class="bg-white rounded-[2rem] p-8 border border-outline-variant/10 shadow-sm space-y-6">
            <div>
              <h3 class="font-headline font-black text-lg text-on-surface">Générer des cartes vierges</h3>
              <p class="text-xs text-outline mt-1">
                Produit un PDF avec N cartes prêtes à imprimer, chacune avec un QR unique déjà enregistré en
                base (sans nom). Une fois imprimées, associez chaque carte à un client depuis "Mes Clients" en
                scannant son QR.
              </p>
            </div>

            <div>
              <label class="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Modèle</label>
              <select [(ngModel)]="batchTemplateId" class="w-full px-4 py-2.5 bg-surface-container rounded-xl border-none text-sm outline-none focus:ring-2 focus:ring-primary/20">
                <option [ngValue]="null">— Choisir un modèle —</option>
                <option *ngFor="let t of templates()" [ngValue]="t.id">{{ t.name }} ({{ t.type }})</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Quantité</label>
              <input type="number" [(ngModel)]="batchQuantity" min="1" max="100"
                     class="w-full px-4 py-2.5 bg-surface-container rounded-xl border-none text-sm outline-none focus:ring-2 focus:ring-primary/20">
              <p class="text-[10px] text-outline mt-1">Entre 1 et 100 cartes par lot.</p>
            </div>

            <button type="button" (click)="generateBatch()" [disabled]="!batchTemplateId || generatingBatch()"
                    class="w-full h-12 rounded-xl bg-[#1b1932] text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
              <span *ngIf="!generatingBatch()" class="material-symbols-outlined text-lg">picture_as_pdf</span>
              <span *ngIf="generatingBatch()" class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
              {{ generatingBatch() ? 'Génération...' : 'Générer le PDF' }}
            </button>
          </div>
        </div>

        <!-- Stock des cartes -->
        <div class="lg:col-span-7">
          <div class="bg-white rounded-[2rem] border border-outline-variant/10 shadow-sm overflow-hidden">
            <div class="p-6 border-b border-outline-variant/10 space-y-4">
              <div class="flex items-center justify-between">
                <h3 class="font-headline font-black text-lg text-on-surface">Stock de cartes</h3>
                <button type="button" (click)="loadStock()" class="w-9 h-9 rounded-xl bg-surface-container-low text-outline flex items-center justify-center hover:text-primary transition-colors" title="Rafraîchir">
                  <span class="material-symbols-outlined text-lg">refresh</span>
                </button>
              </div>
              <div class="flex flex-wrap gap-3">
                <div class="relative flex-1 min-w-[160px]">
                  <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
                  <input type="text" [(ngModel)]="stockSearch" (ngModelChange)="onStockSearch($event)"
                         placeholder="N° de carte..."
                         class="w-full pl-9 pr-3 py-2.5 rounded-xl bg-surface-container-low border-none text-sm outline-none focus:ring-2 focus:ring-primary/20">
                </div>
                <select [(ngModel)]="stockFilter" (ngModelChange)="loadStock()"
                        class="px-4 py-2.5 rounded-xl bg-surface-container-low border-none text-xs font-bold outline-none">
                  <option value="">Toutes</option>
                  <option value="unassigned">Vierges (en stock)</option>
                  <option value="member">Associées</option>
                </select>
              </div>
            </div>

            <div *ngIf="loadingStock()" class="p-16 text-center">
              <span class="material-symbols-outlined animate-spin text-primary text-4xl">sync</span>
            </div>

            <div *ngIf="!loadingStock()" class="max-h-[520px] overflow-y-auto divide-y divide-outline-variant/10">
              <div *ngFor="let c of stock()" class="px-6 py-3.5 flex items-center justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                  <span class="font-mono text-sm font-bold text-on-surface shrink-0">{{ c.card_number }}</span>
                  <span *ngIf="c.holder_type === 'member' && c.member" class="text-xs text-outline truncate">
                    {{ stockMemberName(c) }}
                  </span>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <span *ngIf="c.holder_type === 'unassigned'" class="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest"
                        [class.bg-emerald-100]="c.batch?.status === 'printed'" [class.text-emerald-700]="c.batch?.status === 'printed'"
                        [class.bg-slate-100]="c.batch?.status !== 'printed'" [class.text-slate-500]="c.batch?.status !== 'printed'">
                    {{ c.batch?.status === 'printed' ? 'Imprimée' : 'Non imprimée' }}
                  </span>
                  <span class="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest"
                        [class.bg-amber-100]="c.holder_type === 'unassigned'" [class.text-amber-700]="c.holder_type === 'unassigned'"
                        [class.bg-primary/10]="c.holder_type !== 'unassigned'" [class.text-primary]="c.holder_type !== 'unassigned'">
                    {{ c.holder_type === 'unassigned' ? 'Vierge' : 'Associée' }}
                  </span>
                  <button type="button" (click)="copyQrPayload(c)" [disabled]="copyingQrId() === c.id"
                          class="w-8 h-8 rounded-lg bg-surface-container-low text-outline flex items-center justify-center hover:text-primary transition-colors disabled:opacity-40"
                          title="Copier le code QR">
                    <span *ngIf="copyingQrId() !== c.id" class="material-symbols-outlined text-base">content_copy</span>
                    <span *ngIf="copyingQrId() === c.id" class="w-3.5 h-3.5 rounded-full border-2 border-outline/30 border-t-primary animate-spin"></span>
                  </button>
                </div>
              </div>
              <p *ngIf="stock().length === 0" class="p-12 text-center text-outline italic text-sm">Aucune carte trouvée.</p>
            </div>

            <div *ngIf="!loadingStock() && stockMeta()" class="p-4 border-t border-outline-variant/10 flex items-center justify-center gap-3">
              <button type="button" (click)="loadStock(stockMeta()!.current_page - 1)" [disabled]="stockMeta()!.current_page <= 1"
                      class="h-8 px-3 rounded-lg bg-surface-container-low text-[11px] font-bold text-outline disabled:opacity-40 hover:text-primary transition-colors">Précédent</button>
              <span class="text-[11px] font-bold text-outline">Page {{ stockMeta()!.current_page }} / {{ stockMeta()!.last_page }} — {{ stockMeta()!.total }} carte(s)</span>
              <button type="button" (click)="loadStock(stockMeta()!.current_page + 1)" [disabled]="stockMeta()!.current_page >= stockMeta()!.last_page"
                      class="h-8 px-3 rounded-lg bg-surface-container-low text-[11px] font-bold text-outline disabled:opacity-40 hover:text-primary transition-colors">Suivant</button>
            </div>
          </div>
        </div>

        <!-- Lots générés : suivi d'impression -->
        <div class="lg:col-span-12">
          <div class="bg-white rounded-[2rem] border border-outline-variant/10 shadow-sm overflow-hidden">
            <div class="p-6 border-b border-outline-variant/10 flex items-center justify-between">
              <div>
                <h3 class="font-headline font-black text-lg text-on-surface">Lots générés</h3>
                <p class="text-xs text-outline mt-1">
                  La génération d'un PDF ne signifie pas que le lot est imprimé. Marquez un lot comme "imprimé"
                  une fois les cartes physiques réellement sorties de l'imprimeur — seuls les lots imprimés
                  apparaissent dans la sélection lors de l'association d'une carte à un client.
                </p>
              </div>
              <button type="button" (click)="loadBatches()" class="w-9 h-9 rounded-xl bg-surface-container-low text-outline flex items-center justify-center hover:text-primary transition-colors shrink-0" title="Rafraîchir">
                <span class="material-symbols-outlined text-lg">refresh</span>
              </button>
            </div>

            <div *ngIf="loadingBatches()" class="p-16 text-center">
              <span class="material-symbols-outlined animate-spin text-primary text-4xl">sync</span>
            </div>

            <div *ngIf="!loadingBatches()" class="divide-y divide-outline-variant/10">
              <div *ngFor="let b of batches()" class="px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-sm font-bold text-on-surface">Lot #{{ b.id }}</span>
                    <span class="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest"
                          [class.bg-amber-100]="b.status === 'generated'" [class.text-amber-700]="b.status === 'generated'"
                          [class.bg-primary/10]="b.status === 'printed'" [class.text-primary]="b.status === 'printed'">
                      {{ b.status === 'printed' ? 'Imprimé et prêt' : 'Généré (non imprimé)' }}
                    </span>
                  </div>
                  <p class="text-xs text-outline mt-1">
                    {{ b.template?.name }} — {{ b.quantity }} carte(s)
                    <span *ngIf="b.card_number_from"> · {{ b.card_number_from }} → {{ b.card_number_to }}</span>
                    <span *ngIf="b.unassigned_count !== undefined"> · {{ b.unassigned_count }} en stock / {{ b.assigned_count }} associée(s)</span>
                  </p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <button type="button" (click)="downloadBatch(b)" [disabled]="downloadingBatchId() === b.id"
                          class="h-9 px-3 rounded-lg bg-surface-container-low text-[11px] font-bold text-outline hover:text-primary transition-colors disabled:opacity-40 flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-base">download</span>
                    {{ downloadingBatchId() === b.id ? 'Téléchargement...' : 'PDF' }}
                  </button>
                  <button type="button" *ngIf="b.status === 'generated'" (click)="markBatchPrinted(b)" [disabled]="updatingBatchId() === b.id"
                          class="h-9 px-3 rounded-lg bg-primary text-white text-[11px] font-bold hover:brightness-110 transition-all disabled:opacity-40 flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-base">check_circle</span>
                    {{ updatingBatchId() === b.id ? 'Mise à jour...' : 'Marquer imprimé' }}
                  </button>
                </div>
              </div>
              <p *ngIf="batches().length === 0" class="p-12 text-center text-outline italic text-sm">Aucun lot généré pour l'instant.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .animate-fade-in-up { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @media print {
      body * { visibility: hidden !important; }
      #printable-card, #printable-card * { visibility: visible !important; }
      #printable-card { position: fixed !important; top: 40px; left: 50%; transform: translateX(-50%); }
    }
  `],
})
export class LoyaltyCardStudioComponent implements OnInit {
  section = signal<'issue' | 'templates' | 'batch'>('issue');

  // Émettre / gérer
  members = signal<LoyaltyMemberRow[]>([]);
  membersMeta = signal<PaginatedMeta | null>(null);
  loadingMembers = signal(false);
  loadingMoreMembers = signal(false);
  memberSearch = '';
  private searchDebounce: ReturnType<typeof setTimeout> | null = null;
  selectedMember = signal<LoyaltyMemberRow | null>(null);
  templates = signal<LoyaltyCardTemplateRow[]>([]);
  selectedTemplate = signal<LoyaltyCardTemplateRow | null>(null);
  cardQrDataUrl = signal<string | null>(null);

  // Modèles
  showTemplateForm = signal(false);
  savingTemplate = signal(false);
  templateForm: { name: string; type: 'particulier' | 'entreprise'; layout: LoyaltyCardTemplateLayout } = {
    name: '', type: 'particulier', layout: defaultLayout(),
  };
  templateBgFile: File | null = null;
  templateBgPreview = signal<string | null>(null);

  // Génération en masse
  batchTemplateId: number | null = null;
  batchQuantity = 30;
  generatingBatch = signal(false);

  // Stock des cartes
  stock = signal<LoyaltyAccountRow[]>([]);
  stockMeta = signal<PaginatedMeta | null>(null);
  loadingStock = signal(false);
  stockSearch = '';
  stockFilter = '';
  private stockSearchDebounce: ReturnType<typeof setTimeout> | null = null;

  // Drag & drop façon Canva (positionnement QR / n° de carte dans l'éditeur de modèle)
  private dragTarget: 'qr' | 'card_number' | 'holder_name' | null = null;
  private dragContainer: HTMLElement | null = null;
  private onDragMoveBound = (event: MouseEvent | TouchEvent) => this.onDragMove(event);
  private onDragEndBound = () => this.onDragEnd();

  private loyaltyService = inject(LoyaltyService);
  private toastService = inject(ToastService);

  ngOnInit(): void {
    this.loadMembers();
    this.loadTemplates();
    this.loadStock();
    this.loadBatches();
    this.loadStats();
  }

  stats = signal<MarketingDashboardStats | null>(null);

  loadStats(): void {
    this.loyaltyService.dashboardStats().subscribe({
      next: (data) => this.stats.set(data),
      error: () => {},
    });
  }

  displayName(m: LoyaltyMemberRow): string {
    if (m.type === 'entreprise') return m.nom_entreprise || 'Entreprise';
    return `${m.prenom ?? ''} ${m.nom ?? ''}`.trim() || 'Particulier';
  }

  templatesForSelected() {
    const m = this.selectedMember();
    if (!m) return [];
    return this.templates().filter((t) => t.type === m.type);
  }

  canPrint(): boolean {
    return !!this.selectedMember() && !!this.selectedTemplate() && !!this.cardQrDataUrl();
  }

  // ─── Émettre / gérer ──────────────────────────────────────────────────────

  loadMembers(): void {
    this.loadingMembers.set(true);
    this.loyaltyService.listMembers({ search: this.memberSearch.trim() || undefined, page: 1, per_page: 30 }).subscribe({
      next: (res) => {
        this.members.set(res.items);
        this.membersMeta.set(res.meta);
        this.loadingMembers.set(false);
      },
      error: () => this.loadingMembers.set(false),
    });
  }

  hasMoreMembers(): boolean {
    const meta = this.membersMeta();
    return !!meta && meta.current_page < meta.last_page;
  }

  loadMoreMembers(): void {
    const meta = this.membersMeta();
    if (!meta || this.loadingMoreMembers()) return;

    this.loadingMoreMembers.set(true);
    this.loyaltyService.listMembers({ search: this.memberSearch.trim() || undefined, page: meta.current_page + 1, per_page: 30 }).subscribe({
      next: (res) => {
        this.members.update((list) => [...list, ...res.items]);
        this.membersMeta.set(res.meta);
        this.loadingMoreMembers.set(false);
      },
      error: () => this.loadingMoreMembers.set(false),
    });
  }

  onMemberSearch(value: string): void {
    this.memberSearch = value;
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => this.loadMembers(), 320);
  }

  selectMember(m: LoyaltyMemberRow): void {
    this.selectedMember.set(m);
    this.selectedTemplate.set(this.templatesForSelected().find((t) => t.is_default) ?? this.templatesForSelected()[0] ?? null);
    this.cardQrDataUrl.set(null);

    const accountId = m.loyalty_account?.id;
    if (!accountId) return;
    this.loyaltyService.getQrPayload(accountId).subscribe({
      next: ({ qr_payload }) => {
        if (!qr_payload) return;
        QRCode.toDataURL(qr_payload, { width: 300, margin: 0 })
          .then((url) => this.cardQrDataUrl.set(url))
          .catch(() => this.cardQrDataUrl.set(null));
      },
      error: () => this.cardQrDataUrl.set(null),
    });
  }

  printCard(): void {
    if (!this.canPrint()) return;
    window.print();
  }

  downloadingCard = signal(false);

  downloadCardPdf(): void {
    if (!this.canPrint()) return;
    const accountId = this.selectedMember()?.loyalty_account?.id;
    const templateId = this.selectedTemplate()?.id;
    if (!accountId || !templateId) return;

    this.downloadingCard.set(true);
    this.loyaltyService.downloadCardPdf(accountId, templateId).subscribe({
      next: (blob) => {
        this.downloadingCard.set(false);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `carte-fidelite-${this.selectedMember()?.loyalty_account?.card_number || accountId}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.downloadingCard.set(false);
        this.toastService.error('Erreur lors de la génération du PDF.');
      },
    });
  }

  // ─── Modèles ──────────────────────────────────────────────────────────────

  loadTemplates(): void {
    this.loyaltyService.listCardTemplates().subscribe({
      next: (list) => this.templates.set(list),
      error: () => this.toastService.error('Impossible de charger les modèles de carte.'),
    });
  }

  openNewTemplateForm(): void {
    this.templateForm = { name: '', type: 'particulier', layout: defaultLayout() };
    this.templateBgFile = null;
    this.templateBgPreview.set(null);
    this.showTemplateForm.set(true);
  }

  onBgSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.toastService.error('Format non supporté. Utilise une image JPEG, PNG ou WebP.');
      input.value = '';
      return;
    }
    const maxSizeBytes = 5 * 1024 * 1024; // 5 Mo — même limite que côté backend
    if (file.size > maxSizeBytes) {
      this.toastService.error(`Image trop lourde (${(file.size / (1024 * 1024)).toFixed(1)} Mo). Limite : 5 Mo.`);
      input.value = '';
      return;
    }

    this.templateBgFile = file;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const dataUrl = e.target.result;
      this.templateBgPreview.set(dataUrl);

      // Alerte non bloquante si le visuel s'écarte trop du ratio carte bancaire (1.586) :
      // il sera quand même accepté, mais recadré (object-cover) sur l'aperçu/l'impression.
      const img = new Image();
      img.onload = () => {
        const ratio = img.width / img.height;
        if (Math.abs(ratio - 1.586) / 1.586 > 0.15) {
          this.toastService.info('Ce visuel ne respecte pas le ratio carte bancaire (1.586) — il sera recadré à l\'affichage.');
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  saveTemplate(): void {
    if (!this.templateForm.name.trim()) {
      this.toastService.error('Le nom du modèle est obligatoire.');
      return;
    }
    if (!this.templateBgFile) {
      this.toastService.error('Choisis un visuel de fond.');
      return;
    }

    this.savingTemplate.set(true);
    this.loyaltyService.createCardTemplate({
      name: this.templateForm.name,
      type: this.templateForm.type,
      background: this.templateBgFile,
      layout: this.templateForm.layout,
    }).subscribe({
      next: (t) => {
        this.savingTemplate.set(false);
        this.showTemplateForm.set(false);
        this.templates.update((list) => [t, ...list]);
        this.toastService.success('Modèle de carte créé.');
      },
      error: (err) => {
        this.savingTemplate.set(false);
        this.toastService.error(err?.error?.message || 'Erreur lors de la création du modèle.');
      },
    });
  }

  deleteTemplate(t: LoyaltyCardTemplateRow): void {
    if (!confirm(`Supprimer définitivement le modèle "${t.name}" ? Cette action est irréversible.`)) return;
    this.loyaltyService.deleteCardTemplate(t.id).subscribe({
      next: () => {
        this.templates.update((list) => list.filter((x) => x.id !== t.id));
        if (this.selectedTemplate()?.id === t.id) this.selectedTemplate.set(null);
        this.toastService.success('Modèle supprimé.');
      },
      error: () => this.toastService.error('Erreur lors de la suppression.'),
    });
  }

  // ─── Drag & drop façon Canva (positionnement dans l'éditeur de modèle) ──────

  startDrag(event: MouseEvent | TouchEvent, target: 'qr' | 'card_number' | 'holder_name', container: HTMLElement): void {
    event.preventDefault();
    this.dragTarget = target;
    this.dragContainer = container;
    window.addEventListener('mousemove', this.onDragMoveBound);
    window.addEventListener('mouseup', this.onDragEndBound);
    window.addEventListener('touchmove', this.onDragMoveBound, { passive: false });
    window.addEventListener('touchend', this.onDragEndBound);
  }

  private onDragMove(event: MouseEvent | TouchEvent): void {
    if (!this.dragTarget || !this.dragContainer) return;
    event.preventDefault();
    const point = 'touches' in event ? event.touches[0] : event;
    if (!point) return;
    const rect = this.dragContainer.getBoundingClientRect();
    let x = ((point.clientX - rect.left) / rect.width) * 100;
    let y = ((point.clientY - rect.top) / rect.height) * 100;
    x = Math.max(0, Math.min(95, Math.round(x)));
    y = Math.max(0, Math.min(95, Math.round(y)));
    if (this.dragTarget === 'qr') {
      this.templateForm.layout.qr_x = x;
      this.templateForm.layout.qr_y = y;
    } else if (this.dragTarget === 'card_number') {
      this.templateForm.layout.card_number_x = x;
      this.templateForm.layout.card_number_y = y;
    } else if (this.dragTarget === 'holder_name') {
      this.templateForm.layout.holder_name_x = x;
      this.templateForm.layout.holder_name_y = y;
    }
  }

  private onDragEnd(): void {
    this.dragTarget = null;
    this.dragContainer = null;
    window.removeEventListener('mousemove', this.onDragMoveBound);
    window.removeEventListener('mouseup', this.onDragEndBound);
    window.removeEventListener('touchmove', this.onDragMoveBound);
    window.removeEventListener('touchend', this.onDragEndBound);
  }

  // ─── Génération en masse ──────────────────────────────────────────────────

  generateBatch(): void {
    if (!this.batchTemplateId) return;
    const qty = Math.max(1, Math.min(100, this.batchQuantity || 0));
    this.generatingBatch.set(true);
    this.loyaltyService.generateCardBatch(this.batchTemplateId, qty).subscribe({
      next: (blob) => {
        this.generatingBatch.set(false);
        this.triggerBlobDownload(blob, `cartes-fidelite-lot-${Date.now()}.pdf`);
        this.toastService.success(`${qty} carte(s) générée(s). Le lot n'est pas encore marqué comme imprimé.`);
        this.loadStock();
        this.loadBatches();
      },
      error: () => {
        this.generatingBatch.set(false);
        this.toastService.error('Erreur lors de la génération du lot de cartes.');
      },
    });
  }

  private triggerBlobDownload(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // ─── Lots générés (suivi impression) ────────────────────────────────────────

  batches = signal<LoyaltyCardBatchRow[]>([]);
  batchesMeta = signal<PaginatedMeta | null>(null);
  loadingBatches = signal(false);
  downloadingBatchId = signal<number | null>(null);
  updatingBatchId = signal<number | null>(null);

  loadBatches(page = 1): void {
    this.loadingBatches.set(true);
    this.loyaltyService.listCardBatches(page, 20).subscribe({
      next: (res) => {
        this.batches.set(res.items);
        this.batchesMeta.set(res.meta);
        this.loadingBatches.set(false);
      },
      error: () => this.loadingBatches.set(false),
    });
  }

  downloadBatch(b: LoyaltyCardBatchRow): void {
    this.downloadingBatchId.set(b.id);
    this.loyaltyService.downloadCardBatch(b.id).subscribe({
      next: (blob) => {
        this.downloadingBatchId.set(null);
        this.triggerBlobDownload(blob, `cartes-fidelite-lot-${b.id}.pdf`);
      },
      error: () => {
        this.downloadingBatchId.set(null);
        this.toastService.error('Erreur lors du téléchargement du PDF.');
      },
    });
  }

  markBatchPrinted(b: LoyaltyCardBatchRow): void {
    this.updatingBatchId.set(b.id);
    this.loyaltyService.markCardBatchPrinted(b.id).subscribe({
      next: (updated) => {
        this.updatingBatchId.set(null);
        this.batches.update((list) => list.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
        this.toastService.success('Lot marqué comme imprimé et prêt.');
      },
      error: () => {
        this.updatingBatchId.set(null);
        this.toastService.error('Erreur lors de la mise à jour du lot.');
      },
    });
  }

  // ─── Stock des cartes ───────────────────────────────────────────────────────

  loadStock(page = 1): void {
    this.loadingStock.set(true);
    this.loyaltyService.listAccounts(page, 20, {
      holder_type: this.stockFilter || undefined,
      search: this.stockSearch.trim() || undefined,
    }).subscribe({
      next: (res) => {
        this.stock.set(res.items);
        this.stockMeta.set(res.meta);
        this.loadingStock.set(false);
      },
      error: () => this.loadingStock.set(false),
    });
  }

  onStockSearch(value: string): void {
    this.stockSearch = value;
    if (this.stockSearchDebounce) clearTimeout(this.stockSearchDebounce);
    this.stockSearchDebounce = setTimeout(() => this.loadStock(), 320);
  }

  stockMemberName(c: LoyaltyAccountRow): string {
    const m = c.member;
    if (!m) return '';
    if (m.type === 'entreprise') return m.nom_entreprise || 'Entreprise';
    return `${m.prenom ?? ''} ${m.nom ?? ''}`.trim() || 'Particulier';
  }

  copyingQrId = signal<number | null>(null);

  copyQrPayload(c: LoyaltyAccountRow): void {
    this.copyingQrId.set(c.id);
    this.loyaltyService.getQrPayload(c.id).subscribe({
      next: async ({ qr_payload }) => {
        this.copyingQrId.set(null);
        if (!qr_payload) {
          this.toastService.error('Aucun code QR disponible pour cette carte.');
          return;
        }
        try {
          await navigator.clipboard.writeText(qr_payload);
          this.toastService.success('Code QR copié dans le presse-papier.');
        } catch {
          this.toastService.error('Impossible de copier dans le presse-papier.');
        }
      },
      error: () => {
        this.copyingQrId.set(null);
        this.toastService.error('Erreur lors de la récupération du code QR.');
      },
    });
  }
}
