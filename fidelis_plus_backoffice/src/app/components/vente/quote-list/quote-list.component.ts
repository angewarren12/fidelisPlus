import { Component, OnInit, signal, inject, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { QuoteService, Quote, QuoteListMeta, QuoteListSummary } from '../../../services/quote.service';
import { QuotePreviewModalComponent } from '../quote-preview-modal/quote-preview-modal.component';

/** Immat. extraite du format « … — PLATE (… » ou « … — PLATE » (lignes de devis). */
function extractPlateFromQuoteLine(description: string): string | null {
  const marker = ' — ';
  const i = description.indexOf(marker);
  if (i === -1) return null;
  const rest = description.slice(i + marker.length).trim();
  const op = rest.indexOf(' (');
  if (op === -1) return rest || null;
  return rest.slice(0, op).trim() || null;
}

function uniquePlatesFromItems(items: { description: string }[] | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const it of items || []) {
    const p = extractPlateFromQuoteLine(it.description);
    if (p && !seen.has(p)) {
      seen.add(p);
      out.push(p);
    }
  }
  return out;
}
import { QuoteRequestService, QuoteRequest } from '../../../services/quote-request.service';
import { SendQuoteModalComponent } from './send-quote-modal/send-quote-modal.component';

@Component({
  selector: 'app-quote-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SendQuoteModalComponent, QuotePreviewModalComponent],
  template: `
    <div class="animate-fade-in pb-20">
      
      <!-- HEADER & ACTIONS -->
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 class="text-3xl md:text-5xl font-headline font-black text-on-surface tracking-tighter">
            Ventes & <span class="text-primary">Devis</span>
          </h1>
          <p class="text-outline text-sm font-medium mt-2">Gérez vos demandes entrantes et envoyez vos propositions commerciales.</p>
        </div>
        <button routerLink="/vente/nouveau" class="px-8 py-4 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-lg shadow-primary/20 flex items-center gap-2">
           <span class="material-symbols-outlined text-lg">add_circle</span>
           Nouveau Devis
        </button>
      </div>

      <!-- NAVIGATION TABS -->
      <div class="flex items-center gap-8 border-b border-outline-variant/10 mb-10">
         <button (click)="activeTab.set('quotes')" 
                 [class.text-primary]="activeTab() === 'quotes'" 
                 [class.border-primary]="activeTab() === 'quotes'"
                 class="pb-4 px-2 text-xs font-black uppercase tracking-[0.2em] border-b-2 border-transparent transition-all">
            Mes Devis ({{ quoteSummary()?.total ?? 0 }})
         </button>
         <button (click)="activeTab.set('requests')" 
                 [class.text-primary]="activeTab() === 'requests'" 
                 [class.border-primary]="activeTab() === 'requests'"
                 class="pb-4 px-2 text-xs font-black uppercase tracking-[0.2em] border-b-2 border-transparent transition-all flex items-center gap-2">
            Demandes Reçues
            <span *ngIf="requests().length > 0" class="w-5 h-5 rounded-full bg-error text-white text-[9px] flex items-center justify-center">{{ requests().length }}</span>
         </button>
      </div>

      <!-- QUOTES TAB CONTENT -->
      <div *ngIf="activeTab() === 'quotes'" class="animate-fade-in">
        <!-- KPI SUMMARY & FILTERS (omitted for brevity in this step but usually present) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
           <div class="bg-white p-8 rounded-[2rem] border border-outline-variant/10 shadow-sm">
              <p class="text-[10px] font-black uppercase text-outline tracking-[0.2em] mb-1">Valeur pipeline</p>
              <p class="text-[9px] text-outline/70 font-medium mb-2">Brouillons + envoyés (non signés), montants TTC</p>
              <h3 class="text-2xl font-headline font-black text-on-surface">{{ pipelineValue() | currency:'XOF' }}</h3>
           </div>
           <div class="bg-white p-8 rounded-[2rem] border border-outline-variant/10 shadow-sm border-l-4 border-l-primary">
              <p class="text-[10px] font-black uppercase text-outline tracking-[0.2em] mb-1">Signés / Total</p>
              <p class="text-[9px] text-outline/70 font-medium mb-2">Le CA tableau de bord = somme TTC des devis <strong>signés</strong> uniquement — totaux selon recherche active</p>
              <h3 class="text-2xl font-headline font-black text-on-surface">{{ statusCounts().accepted }} / {{ quoteSummary()?.total ?? 0 }}</h3>
           </div>
           <div class="bg-white p-8 rounded-[2rem] border border-outline-variant/10 shadow-sm border-l-4 border-l-secondary">
              <p class="text-[10px] font-black uppercase text-outline tracking-[0.2em] mb-1">CA signé (filtre recherche)</p>
              <p class="text-[9px] text-outline/70 font-medium mb-2">Même règle que le dashboard : statut « Signé »</p>
              <h3 class="text-2xl font-headline font-black text-on-surface">{{ signedRevenueFromList() | currency:'XOF' }}</h3>
           </div>
        </div>

        <div class="bg-white rounded-[2rem] p-6 border border-outline-variant/10 shadow-sm flex flex-wrap gap-4 items-end mb-8">
          <div class="w-full md:flex-1 md:min-w-[220px]">
            <label class="block text-[10px] font-black uppercase text-outline tracking-[0.2em] mb-1.5 ml-0.5">Recherche</label>
            <div class="relative">
              <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
              <input type="text" [(ngModel)]="searchText" (ngModelChange)="onSearchInput($event)" placeholder="N° devis, client, ligne, immat…" class="w-full pl-10 pr-3 py-3 rounded-xl bg-surface-container-low border-none text-sm outline-none focus:ring-2 focus:ring-primary/25">
            </div>
          </div>
          <div class="w-full sm:w-44">
            <label class="block text-[10px] font-black uppercase text-outline tracking-[0.2em] mb-1.5 ml-0.5">Statut</label>
            <select [value]="filter()" (change)="onStatusFilterChange($any($event.target).value)" class="w-full py-3 px-3 rounded-xl bg-surface-container-low border-none text-sm font-bold outline-none">
              <option value="all">Tous</option>
              <option value="draft">Brouillon</option>
              <option value="sent">Envoyé</option>
              <option value="accepted">Signé</option>
            </select>
          </div>
          <div class="w-full sm:w-28">
            <label class="block text-[10px] font-black uppercase text-outline tracking-[0.2em] mb-1.5 ml-0.5">Par page</label>
            <select [ngModel]="perPage()" (ngModelChange)="setPerPage(+$event)" class="w-full py-3 px-3 rounded-xl bg-surface-container-low border-none text-sm font-bold outline-none">
              <option [ngValue]="10">10</option>
              <option [ngValue]="15">15</option>
              <option [ngValue]="25">25</option>
            </select>
          </div>
          <button type="button" (click)="loadQuotes()" class="h-12 px-5 rounded-xl bg-surface-container-high text-on-surface text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
            <span class="material-symbols-outlined text-lg" [class.animate-spin]="quotesLoading()">refresh</span>
            Actualiser
          </button>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 text-sm text-outline mb-4 px-1">
          <span>Page {{ quoteMeta()?.current_page ?? 1 }} / {{ quoteMetaLastPage() }} — {{ quoteMeta()?.total ?? 0 }} devis affichés</span>
          <div class="flex gap-2">
            <button type="button" (click)="goQuotePage(-1)" [disabled]="quotesLoading() || (quoteMeta()?.current_page ?? 1) <= 1" class="px-3 py-1.5 rounded-xl bg-white border border-outline-variant/20 text-[10px] font-black uppercase tracking-widest disabled:opacity-40">Précédent</button>
            <button type="button" (click)="goQuotePage(1)" [disabled]="quotesLoading() || (quoteMeta()?.current_page ?? 1) >= quoteMetaLastPage()" class="px-3 py-1.5 rounded-xl bg-white border border-outline-variant/20 text-[10px] font-black uppercase tracking-widest disabled:opacity-40">Suivant</button>
          </div>
        </div>

        <!-- LIST -->
        <div class="space-y-4">
           <div *ngIf="quotesLoading()" class="py-16 flex flex-col items-center justify-center bg-white rounded-[2.5rem] border border-outline-variant/10">
             <span class="material-symbols-outlined animate-spin text-primary text-4xl mb-2">sync</span>
             <p class="text-outline font-medium text-sm">Chargement des devis…</p>
           </div>
           <ng-container *ngIf="!quotesLoading()">
           <div *ngFor="let quote of quotes()" class="group bg-white rounded-[2.5rem] p-8 border border-outline-variant/5 shadow-sm hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center gap-8">
              <div class="flex-1 flex items-center gap-6">
                 <div class="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center text-outline group-hover:bg-primary/5 group-hover:text-primary transition-colors shrink-0">
                    <span class="material-symbols-outlined text-3xl">receipt_long</span>
                 </div>
                 <div>
                    <div class="flex items-center gap-3 mb-1">
                       <h4 class="font-black text-on-surface text-lg">{{ quote.quote_number }}</h4>
                       <span [class.bg-secondary/10]="quote.status === 'sent'" [class.text-secondary]="quote.status === 'sent'"
                             [class.bg-primary/10]="quote.status === 'accepted'" [class.text-primary]="quote.status === 'accepted'"
                             class="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-surface-container-high">
                          {{ getStatusLabel(quote.status) }}
                       </span>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                       <p class="text-sm font-bold text-outline mr-2">{{ quote.company?.name }}</p>
                       <!-- VEHICLE BADGES (pivot ou immat. déduites des lignes) -->
                       <ng-container *ngIf="displayVehicles(quote).length > 0; else noVeh">
                       <div *ngFor="let v of displayVehicles(quote)" class="flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-tighter shadow-sm"
                            [class.bg-surface-container-low]="!v.inferred" [class.border-outline-variant/10]="!v.inferred"
                            [class.bg-amber-50/80]="v.inferred" [class.border-amber-200/60]="v.inferred" [title]="v.inferred ? 'Immat. déduite des lignes du devis (liaison pivot vide)' : ''">
                          <span class="material-symbols-outlined text-[10px]">directions_car</span>
                          {{ v.license_plate }}
                          <span *ngIf="v.inferred" class="text-[8px] font-bold text-amber-800/80 normal-case">lignes</span>
                       </div>
                       </ng-container>
                       <ng-template #noVeh>
                       <span class="text-[10px] text-outline/40 italic font-medium">Aucun véhicule lié</span>
                       </ng-template>
                    </div>
                 </div>
              </div>
              <div class="flex items-center gap-6">
                 <div class="hidden lg:block w-32">
                    <p class="text-[10px] font-black text-outline uppercase tracking-widest mb-1 text-right">Montant</p>
                    <p class="font-black text-on-surface text-right">{{ quote.total_amount | currency:'XOF' }}</p>
                 </div>
                 <div class="flex flex-wrap items-center justify-end gap-2 max-w-xl">
                    <button type="button" *ngIf="quote.id" (click)="openQuotePreview(quote)"
                       class="h-12 px-4 sm:px-5 rounded-2xl bg-white border border-outline-variant/20 text-on-surface text-[10px] font-black uppercase tracking-widest hover:bg-surface-container-low transition-all flex items-center gap-2 shrink-0"
                       title="Aperçu du devis (PDF visuel)">
                       <span class="material-symbols-outlined text-lg">visibility</span>
                       <span class="hidden sm:inline">Aperçu</span>
                    </button>
                    <a *ngIf="quote.id" [routerLink]="['/vente', quote.id, 'imprimer']" class="h-12 px-4 rounded-2xl bg-white border border-outline-variant/20 text-on-surface text-[10px] font-black uppercase tracking-widest hover:bg-surface-container-low transition-all flex items-center justify-center gap-2">
                       <span class="material-symbols-outlined text-sm">print</span>
                       <span class="hidden sm:inline">PDF</span>
                    </a>
                    <button *ngIf="quote.status === 'draft' || quote.status === 'sent'" type="button" (click)="onOpenSendModal(quote)" class="h-12 px-4 sm:px-6 rounded-2xl bg-secondary text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2 shrink-0">
                       <span class="material-symbols-outlined text-sm">send</span>
                       {{ quote.status === 'draft' ? 'Envoyer' : 'Renvoyer' }}
                    </button>
                    <button *ngIf="quote.status === 'sent' && quote.id" type="button" (click)="onSignQuote(quote)"
                       class="h-12 px-4 sm:px-6 rounded-2xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-primary/20 shrink-0"
                       title="Marquer le devis comme signé par le client (comptabilisé au CA)">
                       <span class="material-symbols-outlined text-sm">draw</span>
                       Signer
                    </button>
                    <a *ngIf="quote.status === 'draft' && quote.id" [routerLink]="['/vente/nouveau']" [queryParams]="{edit: quote.id}" title="Modifier le brouillon"
                       class="w-12 h-12 shrink-0 rounded-2xl bg-surface-container-low text-outline flex items-center justify-center hover:bg-surface-container transition-all">
                       <span class="material-symbols-outlined">edit</span>
                    </a>
                 </div>
              </div>
           </div>
           <div *ngIf="quotes().length === 0" class="py-20 flex flex-col items-center justify-center bg-white rounded-[2.5rem] border border-dashed border-outline-variant/20 text-outline">
             <span class="material-symbols-outlined text-5xl mb-3 opacity-30">receipt_long</span>
             <p class="font-bold text-on-surface">Aucun devis pour ces critères</p>
             <p class="text-sm mt-1">Modifiez la recherche ou le filtre de statut.</p>
           </div>
           </ng-container>
        </div>
      </div>

      <!-- REQUESTS TAB CONTENT -->
      <div *ngIf="activeTab() === 'requests'" class="animate-fade-in">
         <div class="space-y-4">
            <div *ngFor="let req of requests()" class="group bg-white rounded-[2.5rem] p-8 border border-outline-variant/5 shadow-sm hover:shadow-md transition-all flex flex-col xl:flex-row xl:items-center gap-6">
               <div class="flex-1 flex flex-col sm:flex-row sm:items-center gap-6 min-w-0">
                 <div class="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center text-outline shrink-0">
                    <span class="material-symbols-outlined text-3xl">app_registration</span>
                 </div>
                 <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2 mb-1">
                       <h4 class="font-black text-on-surface text-lg">Demande #{{ req.id }}</h4>
                       <div *ngIf="!req.vehicle?.has_all_docs" class="flex items-center gap-1.5 px-3 py-1 bg-error/10 text-error rounded-full shadow-sm">
                          <span class="material-symbols-outlined text-[14px]">warning</span>
                          <span class="text-[9px] font-black uppercase tracking-widest">Documents manquants</span>
                       </div>
                    </div>
                    <p class="text-sm font-bold text-outline break-words">{{ req.company?.name }} — {{ req.vehicle?.brand }} {{ req.vehicle?.model }} ({{ req.vehicle?.license_plate }})</p>
                 </div>
               </div>
               <div class="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 shrink-0">
                  <button type="button" (click)="openRequestDetail(req)" class="h-11 px-5 rounded-2xl border border-outline-variant/25 text-on-surface text-[10px] font-black uppercase tracking-widest hover:bg-surface-container-low transition-colors">
                    Détails
                  </button>
                  <a *ngIf="req.vehicle_id" [routerLink]="['/clients', req.company_id, 'vehicules', req.vehicle_id]" [queryParams]="{ request_id: req.id }"
                     class="h-12 px-6 rounded-2xl bg-white border-2 border-primary/35 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/5 transition-all inline-flex items-center justify-center gap-2">
                     <span class="material-symbols-outlined text-sm">folder_open</span>
                     Fiche véhicule
                  </a>
                  <div class="flex flex-col items-stretch sm:items-end gap-1">
                     <p *ngIf="!req.vehicle?.has_all_docs" class="text-[8px] font-bold text-error uppercase text-right leading-tight">Complétez les documents sur la fiche véhicule pour activer « Traiter »</p>
                     <a *ngIf="req.vehicle?.has_all_docs" [routerLink]="['/vente/nouveau']" [queryParams]="{company_id: req.company_id, request_id: req.id}"
                        class="h-12 px-8 rounded-2xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 text-center">
                       <span class="material-symbols-outlined text-sm">add_task</span>
                       Traiter la demande
                     </a>
                     <button *ngIf="!req.vehicle?.has_all_docs" type="button" disabled
                        class="h-12 px-8 rounded-2xl bg-primary/25 text-white/80 text-[10px] font-black uppercase tracking-widest cursor-not-allowed flex items-center justify-center gap-2 grayscale opacity-60">
                       <span class="material-symbols-outlined text-sm">add_task</span>
                       Traiter la demande
                     </button>
                  </div>
                  <div class="flex flex-col items-end sm:justify-center text-right sm:min-w-[100px]">
                     <p class="text-[10px] font-black text-outline uppercase tracking-widest">Reçue le</p>
                     <p class="text-sm font-bold">{{ req.created_at | date:'dd/MM HH:mm' }}</p>
                  </div>
               </div>
            </div>

            <div *ngIf="requests().length === 0" class="py-32 flex flex-col items-center justify-center bg-surface-container rounded-[3rem] border-2 border-dashed border-outline-variant/10 text-outline">
               <span class="material-symbols-outlined text-6xl mb-4 opacity-20">mark_email_read</span>
               <p class="font-bold opacity-30 uppercase tracking-[0.3em]">Toutes les demandes ont été traitées</p>
            </div>
         </div>
      </div>

      <!-- Modal détail demande de devis -->
      <div *ngIf="requestDetail()" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-[#0f172a]/75 backdrop-blur-sm" (click)="closeRequestDetail()"></div>
        <div class="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl p-10 border border-outline-variant/10 max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
          <ng-container *ngIf="requestDetail() as r">
            <h3 class="text-2xl font-headline font-black text-on-surface mb-1">Demande #{{ r.id }}</h3>
            <p class="text-xs text-outline font-medium mb-6">Reçue le {{ r.created_at | date:'short' }}</p>

            <div class="space-y-4 mb-8">
              <div class="p-4 rounded-2xl bg-surface-container-low">
                <p class="text-[9px] font-black uppercase text-outline tracking-widest mb-1">Client</p>
                <p class="font-bold text-on-surface">{{ r.company?.name || '—' }}</p>
              </div>
              <div class="p-4 rounded-2xl bg-surface-container-low" *ngIf="r.vehicle_id">
                <p class="text-[9px] font-black uppercase text-outline tracking-widest mb-1">Véhicule</p>
                <p class="font-bold text-on-surface">{{ r.vehicle?.brand }} {{ r.vehicle?.model }}</p>
                <p class="text-sm font-mono text-primary mt-1">{{ r.vehicle?.license_plate }}</p>
                <p *ngIf="!r.vehicle?.has_all_docs" class="text-xs text-error font-bold mt-3 flex items-center gap-2">
                  <span class="material-symbols-outlined text-sm">error</span>
                  Carte grise ou vignette manquante — ajoutez-les depuis la fiche véhicule.
                </p>
              </div>
              <div class="p-4 rounded-2xl bg-surface-container-low" *ngIf="r.notes">
                <p class="text-[9px] font-black uppercase text-outline tracking-widest mb-1">Notes</p>
                <p class="text-sm text-on-surface whitespace-pre-wrap">{{ r.notes }}</p>
              </div>
            </div>

            <div class="flex flex-col sm:flex-row gap-3">
              <button type="button" (click)="closeRequestDetail()" class="flex-1 py-4 rounded-xl bg-surface-container text-on-surface text-[10px] font-black uppercase tracking-widest hover:bg-surface-container-high transition-colors">
                Fermer
              </button>
              <a *ngIf="r.vehicle_id" [routerLink]="['/clients', r.company_id, 'vehicules', r.vehicle_id]" [queryParams]="{ request_id: r.id }" (click)="closeRequestDetail()"
                 class="flex-1 py-4 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest text-center shadow-lg shadow-primary/20 hover:brightness-110 transition-all flex items-center justify-center gap-2">
                <span class="material-symbols-outlined text-sm">upload_file</span>
                Ouvrir la fiche véhicule
              </a>
            </div>
          </ng-container>
        </div>
      </div>

      <!-- MODALS -->
      <app-send-quote-modal 
        *ngIf="showSendModal()" 
        [quote]="selectedQuote()!"
        (cancel)="showSendModal.set(false)"
        (sent)="onQuoteSent()">
      </app-send-quote-modal>

      <app-quote-preview-modal
        *ngIf="showPreviewModal()"
        [quoteData]="previewQuoteData()"
        [companyName]="previewCompanyName()"
        [vehicles]="previewVehicles()"
        (close)="closePreview()"
        (send)="closePreview()">
      </app-quote-preview-modal>

      <!-- Modal confirmation signature -->
      <div *ngIf="signConfirmQuote()" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-[#0f172a]/75 backdrop-blur-sm" (click)="cancelSignConfirm()"></div>
        <div class="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl p-10 border border-outline-variant/10" (click)="$event.stopPropagation()">
          <div class="flex items-start gap-4 mb-6">
            <div class="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-2xl">task_alt</span>
            </div>
            <div>
              <h3 class="text-2xl font-headline font-black text-on-surface mb-1">Confirmer la signature</h3>
              <p class="text-sm text-outline font-medium">
                Marquer ce devis comme <strong>signé</strong> ? Le montant sera pris en compte dans le chiffre d’affaires (tableau de bord).
              </p>
            </div>
          </div>

          <div class="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/10 mb-8" *ngIf="signConfirmQuote() as q">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-[9px] font-black uppercase tracking-widest text-outline mb-1">Devis</p>
                <p class="font-black text-on-surface">{{ q.quote_number || ('#' + q.id) }}</p>
                <p class="text-xs text-outline mt-1">{{ q.company?.name || '—' }}</p>
              </div>
              <div class="text-right">
                <p class="text-[9px] font-black uppercase tracking-widest text-outline mb-1">Montant TTC</p>
                <p class="text-lg font-black text-primary">{{ (q.total_amount || 0) | currency:'XOF' }}</p>
              </div>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row gap-3">
            <button type="button" (click)="cancelSignConfirm()" class="flex-1 py-4 rounded-xl bg-surface-container text-on-surface text-[10px] font-black uppercase tracking-widest hover:bg-surface-container-high transition-colors">
              Annuler
            </button>
            <button type="button" (click)="confirmSignQuote()" class="flex-1 py-4 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:brightness-110 transition-all flex items-center justify-center gap-2">
              <span class="material-symbols-outlined text-sm">done</span>
              Confirmer
            </button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; background: #fbfbfd; min-height: 100vh; padding-top: 2rem; }
    .animate-fade-in { animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class QuoteListComponent implements OnInit {
  quotes = signal<Quote[]>([]);
  requests = signal<QuoteRequest[]>([]);
  activeTab = signal<'quotes' | 'requests'>('quotes');
  filter = signal<'all' | 'draft' | 'sent' | 'accepted'>('all');

  quoteMeta = signal<QuoteListMeta | null>(null);
  quoteSummary = signal<QuoteListSummary | null>(null);
  quotesLoading = signal(false);
  page = signal(1);
  perPage = signal(15);
  searchText = '';
  private search$ = new Subject<string>();
  
  showSendModal = signal(false);
  selectedQuote = signal<Quote | null>(null);

  showPreviewModal = signal(false);
  /** Devis chargé pour l’aperçu (liste ou détail API). */
  previewQuoteRef = signal<Quote | null>(null);

  /** Confirmation « marquer comme signé ». */
  signConfirmQuote = signal<Quote | null>(null);

  /** Détail demande entrante (modal). */
  requestDetail = signal<QuoteRequest | null>(null);

  private quoteService = inject(QuoteService);
  private requestService = inject(QuoteRequestService);
  private destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);

  statusCounts = computed(() => {
    const b = this.quoteSummary()?.by_status;
    return {
      draft: b?.draft ?? 0,
      sent: b?.sent ?? 0,
      accepted: b?.accepted ?? 0,
    };
  });

  /** Opportunités ouvertes (brouillons + envoyés), selon recherche active — indépendant du filtre de statut de la liste. */
  pipelineValue = computed(() => this.quoteSummary()?.pipeline_value ?? 0);

  /** CA signés, selon recherche active — indépendant du filtre de statut de la liste. */
  signedRevenueFromList = computed(() => this.quoteSummary()?.signed_revenue ?? 0);

  previewQuoteData = computed(() => {
    const q = this.previewQuoteRef();
    if (!q) return {};
    return {
      quote_number: q.quote_number,
      valid_until: q.valid_until,
      items: q.items ?? [],
      total_amount: Number(q.total_amount ?? 0),
      status: q.status,
    };
  });

  previewCompanyName = computed(() => {
    const q = this.previewQuoteRef();
    return (q?.company?.name ?? q?.company?.company_name ?? '').trim();
  });

  previewVehicles = computed(() => {
    const q = this.previewQuoteRef();
    if (!q) return [];
    const fromPivot = q.vehicles ?? [];
    if (fromPivot.length > 0) return fromPivot;
    return this.displayVehicles(q).map(v => ({ license_plate: v.license_plate }));
  });

  /** Véhicules liés en base, sinon immatriculations déduites des lignes du devis. */
  displayVehicles(quote: Quote): { license_plate: string; inferred: boolean }[] {
    const fromPivot = quote.vehicles ?? [];
    if (fromPivot.length > 0) {
      return fromPivot.map((v: any) => ({ license_plate: v.license_plate ?? v.licensePlate ?? '?', inferred: false }));
    }
    const plates = uniquePlatesFromItems(quote.items);
    return plates.map(license_plate => ({ license_plate, inferred: true }));
  }

  ngOnInit(): void {
    this.search$
      .pipe(debounceTime(320), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(1);
        this.loadQuotes();
      });
    this.loadQuotes();
    this.loadRequests();

    // Deep-link depuis une fiche véhicule : /vente?tab=requests&request_id=123
    const qp = this.route.snapshot.queryParamMap;
    const tab = qp.get('tab');
    const rid = qp.get('request_id');
    if (tab === 'requests') this.activeTab.set('requests');
    if (rid) {
      const id = +rid;
      if (Number.isFinite(id) && id > 0) {
        // On charge le détail et ouvre le modal automatiquement
        this.requestService.getById(id).subscribe({
          next: (full) => this.requestDetail.set(full),
          error: () => {},
        });
      }
    }
  }

  quoteMetaLastPage(): number {
    const m = this.quoteMeta();
    return m?.last_page && m.last_page > 0 ? m.last_page : 1;
  }

  onSearchInput(value: string): void {
    this.searchText = value;
    this.search$.next(value.trim());
  }

  onStatusFilterChange(value: string): void {
    if (!['all', 'draft', 'sent', 'accepted'].includes(value)) return;
    this.filter.set(value as 'all' | 'draft' | 'sent' | 'accepted');
    this.page.set(1);
    this.loadQuotes();
  }

  setPerPage(n: number): void {
    this.perPage.set(n);
    this.page.set(1);
    this.loadQuotes();
  }

  goQuotePage(delta: number): void {
    const m = this.quoteMeta();
    const cur = m?.current_page ?? 1;
    const last = this.quoteMetaLastPage();
    const next = Math.min(last, Math.max(1, cur + delta));
    if (next === cur) return;
    this.page.set(next);
    this.loadQuotes();
  }

  loadQuotes(): void {
    this.quotesLoading.set(true);
    const status = this.filter() === 'all' ? undefined : this.filter();
    this.quoteService
      .getPage({
        page: this.page(),
        per_page: this.perPage(),
        search: this.searchText.trim() || undefined,
        status,
      })
      .subscribe({
        next: (r) => {
          this.quotes.set(r.data);
          this.quoteMeta.set(r.meta);
          this.quoteSummary.set(r.summary);
          this.quotesLoading.set(false);
        },
        error: () => this.quotesLoading.set(false),
      });
  }

  loadRequests(): void {
    this.requestService.getPending().subscribe((data) => this.requests.set(data));
  }

  refreshData(): void {
    this.loadQuotes();
    this.loadRequests();
  }

  getStatusLabel(status: string): string {
    const l: any = { draft: 'Brouillon', sent: 'Envoyé', accepted: 'Signé', declined: 'Refusé' };
    return l[status] || status;
  }

  onOpenSendModal(quote: Quote): void {
    this.selectedQuote.set(quote);
    this.showSendModal.set(true);
  }

  onQuoteSent(): void {
    this.showSendModal.set(false);
    this.refreshData();
  }

  onUpdateStatus(id: number, status: string): void {
    this.quoteService.updateStatus(id, status).subscribe(() => this.refreshData());
  }

  onSignQuote(quote: Quote): void {
    if (!quote.id || quote.status !== 'sent') return;
    this.signConfirmQuote.set(quote);
  }

  cancelSignConfirm(): void {
    this.signConfirmQuote.set(null);
  }

  confirmSignQuote(): void {
    const q = this.signConfirmQuote();
    if (!q?.id) return;
    this.signConfirmQuote.set(null);
    this.onUpdateStatus(q.id, 'accepted');
  }

  openQuotePreview(quote: Quote): void {
    if (!quote.id) return;
    const hasItems = (quote.items?.length ?? 0) > 0;
    if (hasItems) {
      this.previewQuoteRef.set(quote);
      this.showPreviewModal.set(true);
      return;
    }
    this.quoteService.getById(quote.id).subscribe({
      next: (full) => {
        this.previewQuoteRef.set(full);
        this.showPreviewModal.set(true);
      },
      error: () => {
        this.previewQuoteRef.set(quote);
        this.showPreviewModal.set(true);
      },
    });
  }

  closePreview(): void {
    this.showPreviewModal.set(false);
    this.previewQuoteRef.set(null);
  }

  openRequestDetail(req: QuoteRequest): void {
    this.requestDetail.set({ ...req });
    this.requestService.getById(req.id).subscribe({
      next: (full) => this.requestDetail.set(full),
      error: () => {},
    });
  }

  closeRequestDetail(): void {
    this.requestDetail.set(null);
  }
}
