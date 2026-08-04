import { Component, Input, Output, EventEmitter, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingService } from '../../../services/setting.service';

@Component({
  selector: 'app-quote-preview-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 py-10 sm:p-6">
      
      <!-- BACKDROP -->
      <div class="absolute inset-0 bg-[#0f172a]/80 backdrop-blur-sm hide-on-print" (click)="close.emit()"></div>

      <!-- MODAL CONTENT (A4 Document Format) -->
      <div class="relative w-full max-w-4xl bg-surface-container-low rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] animate-fade-in-up overflow-hidden print-modal-shell">
        
        <!-- HEADER ACIONS -->
        <div class="flex items-center justify-between p-6 border-b border-outline-variant/10 bg-white hide-on-print">
           <div>
              <h3 class="text-xl font-headline font-black text-on-surface">Aperçu du Devis</h3>
              <p class="text-[10px] uppercase font-bold tracking-widest text-outline">Généré dynamiquement</p>
           </div>
           <div class="flex gap-3">
              <button type="button" (click)="printDevis()" class="px-5 flex items-center gap-2 rounded-xl bg-surface-container text-on-surface text-xs font-black uppercase tracking-widest hover:bg-surface-container-high transition-all border border-outline-variant/20">
                 <span class="material-symbols-outlined text-sm">print</span> Imprimer
              </button>
              <button type="button" (click)="close.emit()" class="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-outline hover:bg-surface-container-high transition-all">
                 <span class="material-symbols-outlined">close</span>
              </button>
              <button *ngIf="showSendButton" type="button" (click)="onSend()" class="px-8 flex items-center gap-2 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-primary/20">
                 <span class="material-symbols-outlined text-sm">send</span> Envoyer
              </button>
              <button *ngIf="showAcceptDeclineButtons && quoteData?.status === 'sent'" type="button" (click)="decline.emit()" class="px-6 flex items-center gap-2 rounded-xl bg-red-50 text-error text-xs font-black uppercase tracking-widest hover:bg-error hover:text-white transition-all">
                 <span class="material-symbols-outlined text-sm">close</span> Refuser
              </button>
              <button *ngIf="showAcceptDeclineButtons && quoteData?.status === 'sent'" type="button" (click)="accept.emit()" class="px-8 flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-primary text-white text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-primary/20">
                 <span class="material-symbols-outlined text-sm">check_circle</span> Accepter
              </button>
           </div>
        </div>

        <!-- SCROLLABLE A4 CONTAINER -->
        <div class="flex-1 overflow-y-auto p-4 md:p-10 bg-surface-container-low flex justify-center print-scroll-area">
            
            <!-- A4 PAPER -->
            <div class="bg-white w-full max-w-[794px] min-h-[1123px] shadow-sm p-12 relative print-container flex flex-col">
               
               <!-- LOGO & BRANDING -->
               <div class="flex justify-between items-start mb-16">
                  <div>
                     <h1 class="text-4xl font-headline font-black text-primary tracking-tighter">MAYELIA</h1>
                     <p class="text-sm font-black text-on-surface tracking-[0.2em] uppercase mt-1">Fidelis Plus</p>
                  </div>
                  <div class="text-right">
                     <h2 class="text-4xl font-headline font-black text-on-surface/10 uppercase tracking-tighter">Devis</h2>
                     <p class="text-sm font-bold text-on-surface mt-2">{{ quoteData?.quote_number }}</p>
                     <p class="text-[10px] uppercase font-bold tracking-widest text-outline">Date : {{ today | date:'dd/MM/yyyy' }}</p>
                  </div>
               </div>

               <!-- ADDRESSES -->
               <div class="grid grid-cols-2 gap-10 mb-16">
                  <div class="space-y-1">
                     <p class="text-[10px] uppercase font-black tracking-widest text-outline mb-2">Émetteur</p>
                     <p class="font-bold text-on-surface">Mayelia Automotive</p>
                     <p class="text-sm text-outline">Zone Industrielle de Vridi</p>
                     <p class="text-sm text-outline">Abidjan, Côte d'Ivoire</p>
                     <p class="text-sm text-outline">contact@mayelia.ci</p>
                  </div>
                  <div class="space-y-1 bg-surface-container/30 p-6 rounded-2xl">
                     <p class="text-[10px] uppercase font-black tracking-widest text-primary mb-2">Client / Destinataire</p>
                     <p class="font-black text-lg text-on-surface">{{ clientDisplayName }}</p>
                     <p class="text-sm text-outline" *ngIf="quoteData?.valid_until">Valable jusqu'au : {{ quoteData?.valid_until | date:'dd/MM/yyyy' }}</p>
                     <p class="text-sm text-outline" *ngIf="paymentTermLabel">Condition de paiement : <strong class="text-on-surface">{{ paymentTermLabel }}</strong></p>
                  </div>
               </div>

               <!-- VEHICLES LINKED -->
               <div *ngIf="vehicles.length > 0" class="mb-10">
                  <p class="text-[10px] uppercase font-black tracking-widest text-outline mb-3 border-b border-outline-variant/20 pb-2">Véhicules Concernés</p>
                  <div class="flex flex-wrap gap-2">
                     <div *ngFor="let v of vehicles" class="px-3 py-1.5 rounded bg-surface-container-low border border-outline-variant/10 text-xs font-bold text-on-surface">
                        {{ v.license_plate }} <span class="text-outline font-medium text-[10px]">({{ v.brand }} {{ v.model }})</span>
                     </div>
                  </div>
               </div>

               <!-- TABLE ITEMS -->
               <table class="w-full text-left mb-16">
                  <thead>
                     <tr class="border-b-2 border-on-surface text-on-surface">
                        <th class="py-4 text-[10px] uppercase font-black tracking-widest w-1/2">Description</th>
                        <th class="py-4 text-[10px] uppercase font-black tracking-widest text-center">Qté</th>
                        <th class="py-4 text-[10px] uppercase font-black tracking-widest text-right">Prix Unitaire ({{ currency }})</th>
                        <th class="py-4 text-[10px] uppercase font-black tracking-widest text-right">Total ({{ currency }})</th>
                     </tr>
                  </thead>
                  <tbody>
                     <ng-container *ngFor="let group of groupedItems().groups">
                        <!-- En-tête du groupe de véhicule -->
                        <tr class="bg-surface-container-low/60 border-b border-outline-variant/10">
                           <td colspan="4" class="py-2.5 px-3">
                              <div class="flex items-center gap-3">
                                 <span class="px-2.5 py-1 rounded-md bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">{{ group.plate }}</span>
                                 <span *ngIf="group.vehicleName" class="text-xs font-bold text-outline">{{ group.vehicleName }}</span>
                              </div>
                           </td>
                        </tr>
                        <!-- Lignes du véhicule -->
                        <tr *ngFor="let item of group.items" class="border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors">
                           <td class="py-3 pr-4 pl-6">
                              <p class="text-sm font-bold text-on-surface">{{ item.parsed?.title || item.description }}</p>
                              <p *ngIf="item.parsed?.detail" class="text-[10px] text-outline font-medium mt-0.5">{{ item.parsed.detail }}</p>
                           </td>
                           <td class="py-3 text-sm font-bold text-outline text-center">{{ item.quantity || 1 }}</td>
                           <td class="py-3 text-sm font-bold text-outline text-right">{{ item.price | number:'1.0-0' }}</td>
                           <td class="py-3 text-sm font-black text-on-surface text-right">{{ (item.price * (item.quantity || 1)) | number:'1.0-0' }}</td>
                        </tr>
                     </ng-container>

                     <!-- Lignes générales (sans plaque ou frais annexes) -->
                     <ng-container *ngIf="groupedItems().others.length > 0">
                        <tr *ngIf="groupedItems().groups.length > 0" class="bg-surface-container-low/60 border-b border-outline-variant/10">
                           <td colspan="4" class="py-2.5 px-3">
                              <div class="flex items-center gap-3">
                                 <span class="text-[10px] font-black text-outline uppercase tracking-widest">Autres / Frais Généraux</span>
                              </div>
                           </td>
                        </tr>
                        <tr *ngFor="let item of groupedItems().others" class="border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors">
                           <td class="py-3 pr-4 pl-6">
                              <p class="text-sm font-bold text-on-surface">{{ item.parsed?.title || item.description }}</p>
                              <p *ngIf="item.parsed?.detail" class="text-[10px] text-outline font-medium mt-0.5">{{ item.parsed.detail }}</p>
                           </td>
                           <td class="py-3 text-sm font-bold text-outline text-center">{{ item.quantity || 1 }}</td>
                           <td class="py-3 text-sm font-bold text-outline text-right">{{ item.price | number:'1.0-0' }}</td>
                           <td class="py-3 text-sm font-black text-on-surface text-right">{{ (item.price * (item.quantity || 1)) | number:'1.0-0' }}</td>
                        </tr>
                     </ng-container>
                  </tbody>
               </table>

               <!-- TOTALS -->
               <div class="flex justify-end">
                  <div class="w-1/2 space-y-4">
                     <div class="flex items-center justify-between">
                        <span class="text-[10px] uppercase font-black tracking-widest text-outline">Sous-Total HT</span>
                        <span class="font-bold text-on-surface">{{ totalHT() | number:'1.0-0' }} {{ currency }}</span>
                     </div>
                     <div class="flex items-center justify-between">
                        <span class="text-[10px] uppercase font-black tracking-widest text-outline">TVA ({{ tvaRate() }}%)</span>
                        <span class="font-bold text-on-surface">{{ totalTVA() | number:'1.0-0' }} {{ currency }}</span>
                     </div>
                     <div class="flex items-center justify-between pt-4 border-t-2 border-on-surface mt-4">
                        <span class="text-xs uppercase font-black tracking-[0.2em] text-primary">Total TTC</span>
                        <span class="text-2xl font-headline font-black text-on-surface">{{ totalTTC() | number:'1.0-0' }} {{ currency }}</span>
                     </div>
                  </div>
               </div>

               <!-- FOOTER : "mt-auto" sur un parent flex-col le colle en bas quand le contenu est
                    court, mais le laisse redescendre naturellement (jamais de chevauchement avec
                    le Total TTC) quand le contenu (lignes, véhicules) est long. -->
               <div class="text-center border-t border-outline-variant/10 pt-6 mt-auto">
                  <p class="text-[9px] text-outline uppercase tracking-widest font-bold whitespace-pre-line">{{ footerText() }}</p>
                  <p class="text-[9px] text-outline/50 mt-1">Ce devis est valable {{ validityDays() }} jours à compter de sa date d'émission.</p>
               </div>

            </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .animate-fade-in-up { animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
    @media print {
      .hide-on-print { display: none !important; }
      .print-modal-shell { max-height: none !important; box-shadow: none !important; border-radius: 0 !important; }
      .print-scroll-area { overflow: visible !important; background: #fff !important; padding: 0 !important; }
    }
  `]
})
export class QuotePreviewModalComponent {
  private settingSvc = inject(SettingService);

  @Input() quoteData: any;
  @Input() companyName: string = '';
  @Input() vehicles: any[] = [];
  /** Bouton "Envoyer" — pertinent côté commercial uniquement. */
  @Input() showSendButton: boolean = true;
  /** Boutons "Accepter" / "Refuser" — pertinents côté client uniquement. */
  @Input() showAcceptDeclineButtons: boolean = false;
  @Output() close = new EventEmitter<void>();
  @Output() send = new EventEmitter<void>();
  @Output() accept = new EventEmitter<void>();
  @Output() decline = new EventEmitter<void>();

  tvaRate = computed(() => this.settingSvc.settings()?.['quote.legal.tva_rate'] ?? 18);
  validityDays = computed(() => this.settingSvc.settings()?.['quote.legal.validity_days'] ?? 30);
  footerText = computed(() => this.settingSvc.settings()?.['quote.legal.footer_text'] ?? 'Mayelia Automotive - SARL au capital de 10.000.000 XOF - RCCM CI-ABJ-2026-B-XXXXX');

  get currency(): string {
    return this.quoteData?.currency || 'XOF';
  }

  get paymentTermLabel(): string | null {
    return this.quoteData?.payment_term_label ?? this.quoteData?.payment_term?.label ?? null;
  }

  /** Nom affiché : input explicite ou champ porté par quoteData (ex. aperçu depuis liste). */
  get clientDisplayName(): string {
    const fromInput = (this.companyName ?? '').trim();
    if (fromInput) return fromInput;
    const fromPayload = this.quoteData?.company_name;
    return typeof fromPayload === 'string' ? fromPayload.trim() : '';
  }

  today = new Date();

  totalHT = computed(() => {
    if (!this.quoteData || !this.quoteData.items) return 0;
    return this.quoteData.items.reduce((sum: number, item: any) => sum + (item.price * (item.quantity || 1)), 0);
  });

  totalTVA = computed(() => this.totalHT() * (this.tvaRate() / 100));
  totalTTC = computed(() => this.totalHT() + this.totalTVA());

  groupedItems = computed(() => {
    if (!this.quoteData || !this.quoteData.items) return { groups: [], others: [] };
    
    const groups: { plate: string; vehicleName?: string; items: any[] }[] = [];
    const others: any[] = [];
    
    // Create map for vehicle names
    const vehicleMap = new Map<string, string>();
    for (const v of this.vehicles) {
      vehicleMap.set(v.license_plate, `${v.brand} ${v.model}`);
    }

    for (const item of this.quoteData.items) {
      const parsed = this.splitDescription(item.description);
      if (parsed && parsed.plate) {
        let group = groups.find(g => g.plate === parsed.plate);
        if (!group) {
          group = { plate: parsed.plate, vehicleName: vehicleMap.get(parsed.plate), items: [] };
          groups.push(group);
        }
        group.items.push({ ...item, parsed });
      } else {
        others.push({ ...item, parsed: parsed || { title: item.description, plate: '', detail: '' } });
      }
    }
    
    return { groups, others };
  });

  onSend() {
    this.send.emit();
  }

  printDevis(): void {
    window.print();
  }

  /**
   * Rend la plaque plus lisible dans le devis.
   * Supporte : `Service — PLATE (détails)` ou `Service — PLATE`.
   */
  splitDescription(description: any): { title: string; plate: string; detail: string } | null {
    const desc = typeof description === 'string' ? description.trim() : '';
    if (!desc) return null;
    const marker = ' — ';
    const i = desc.indexOf(marker);
    if (i === -1) return { title: desc, plate: '', detail: '' };
    const title = desc.slice(0, i).trim();
    const rest = desc.slice(i + marker.length).trim();
    // détail optionnel entre parenthèses
    const open = rest.indexOf('(');
    if (open === -1) return { title, plate: rest, detail: '' };
    const plate = rest.slice(0, open).trim();
    const detail = rest.slice(open).trim();
    return { title, plate, detail };
  }
}
