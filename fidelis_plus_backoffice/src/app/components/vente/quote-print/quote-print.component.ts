import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { QuoteService, Quote } from '../../../services/quote.service';

@Component({
  selector: 'app-quote-print',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-neutral-100 p-8 print:p-0 print:bg-white">
      <!-- Controls (Hidden on print) -->
      <div class="max-w-[210mm] mx-auto mb-6 flex justify-between items-center print:hidden">
        <a routerLink="/vente" class="flex items-center gap-2 text-sm font-bold text-outline hover:text-on-surface transition-colors">
          <span class="material-symbols-outlined">arrow_back</span>
          Retour aux devis
        </a>
        <button (click)="print()" class="h-11 px-6 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2">
          <span class="material-symbols-outlined text-sm">print</span>
          Imprimer / PDF
        </button>
      </div>

      <!-- Page A4 -->
      <div *ngIf="quote()" class="max-w-[210mm] mx-auto bg-white shadow-2xl print:shadow-none min-h-[297mm] p-16 flex flex-col">
        
        <!-- Header -->
        <div class="flex justify-between items-start mb-16">
          <div>
             <div class="flex items-center gap-3 mb-6">
                <div class="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white">
                   <span class="material-symbols-outlined text-3xl">verified</span>
                </div>
                <div>
                   <h1 class="text-2xl font-black tracking-tighter text-on-surface">MAYELIA</h1>
                   <p class="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Fidelis Plus CRM</p>
                </div>
             </div>
             <div class="text-xs text-outline font-medium space-y-1">
                <p>Mayelia Automotive S.A.</p>
                <p>Zone Industrielle de Dakar</p>
                <p>Sénégal</p>
                <p>+221 33 000 00 00</p>
                <p>contact@mayelia.sn</p>
             </div>
          </div>

          <div class="text-right">
             <h2 class="text-4xl font-black text-on-surface mb-2 uppercase tracking-tighter">DEVIS</h2>
             <p class="text-sm font-bold text-primary mb-6">#{{ quote()?.quote_number }}</p>
             
             <div class="space-y-1 text-xs font-medium text-outline">
                <p>Date : {{ today | date:'dd/MM/yyyy' }}</p>
                <p *ngIf="quote()?.valid_until">Valable jusqu'au : {{ quote()?.valid_until | date:'dd/MM/yyyy' }}</p>
             </div>
          </div>
        </div>

        <!-- Client Info -->
        <div class="grid grid-cols-2 gap-12 mb-16 py-8 border-y border-outline-variant/10">
           <div>
              <p class="text-[10px] font-black uppercase tracking-widest text-primary mb-4">Destinataire</p>
              <h3 class="text-lg font-black text-on-surface mb-2">{{ quote()?.company?.name }}</h3>
              <div class="text-xs text-outline font-medium space-y-1">
                 <p>{{ quote()?.company?.address || 'Adresse non renseignée' }}</p>
                 <p>{{ quote()?.company?.email }}</p>
                 <p>{{ quote()?.company?.phone }}</p>
              </div>
           </div>
           <div *ngIf="quote()?.vehicles && quote()?.vehicles!.length > 0">
              <p class="text-[10px] font-black uppercase tracking-widest text-primary mb-4">Véhicules concernés</p>
              <div class="flex flex-wrap gap-2">
                 <span *ngFor="let v of quote()?.vehicles" class="px-3 py-1 bg-surface-container text-on-surface rounded-lg text-[10px] font-black uppercase">
                    {{ v.license_plate }}
                 </span>
              </div>
           </div>
        </div>

        <!-- Table -->
        <div class="flex-grow">
           <table class="w-full text-left border-collapse">
              <thead>
                 <tr class="text-[10px] font-black uppercase tracking-widest text-outline border-b-2 border-on-surface/10">
                    <th class="py-4 px-2">Description des prestations</th>
                    <th class="py-4 px-2 text-center w-24">Qté</th>
                    <th class="py-4 px-2 text-right w-32">Prix Unitaire</th>
                    <th class="py-4 px-2 text-right w-32">Total HT</th>
                 </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant/10">
                 <tr *ngFor="let item of quote()?.items" class="text-sm font-medium text-on-surface">
                    <td class="py-6 px-2">{{ item.description }}</td>
                    <td class="py-6 px-2 text-center">{{ item.quantity || 1 }}</td>
                    <td class="py-6 px-2 text-right">{{ item.price | number:'1.0-0' }} FCFA</td>
                    <td class="py-6 px-2 text-right font-bold">{{ (item.price * (item.quantity || 1)) | number:'1.0-0' }} FCFA</td>
                 </tr>
              </tbody>
           </table>
        </div>

        <!-- Totals -->
        <div class="mt-12 pt-8 border-t-2 border-on-surface/10 flex justify-end">
           <div class="w-72 space-y-4">
              <div class="flex justify-between items-center text-sm font-bold text-outline">
                 <span>Total HT</span>
                 <span>{{ quote()?.total_amount | number:'1.0-0' }} FCFA</span>
              </div>
              <div class="flex justify-between items-center text-sm font-bold text-outline">
                 <span>TVA (18%)</span>
                 <span>{{ (quote()!.total_amount * 0.18) | number:'1.0-0' }} FCFA</span>
              </div>
              <div class="flex justify-between items-center p-4 bg-primary text-white rounded-2xl shadow-xl shadow-primary/20">
                 <span class="text-xs font-black uppercase tracking-widest">Total TTC</span>
                 <span class="text-xl font-black">{{ (quote()!.total_amount * 1.18) | number:'1.0-0' }} FCFA</span>
              </div>
           </div>
        </div>

        <!-- Footer -->
        <div class="mt-24 text-[10px] text-center text-outline/60 font-medium space-y-1">
           <p>Merci pour votre confiance. Ce devis est valable pendant 30 jours.</p>
           <p>Mayelia Automotive S.A. - RCCM SN.DKR.2023.B.0000 - NINEA 000000000</p>
        </div>

      </div>

      <!-- Loading State -->
      <div *ngIf="loading()" class="max-w-[210mm] mx-auto bg-white min-h-[297mm] flex flex-col items-center justify-center gap-4 text-outline">
         <span class="material-symbols-outlined animate-spin text-4xl text-primary">sync</span>
         <p class="text-sm font-bold">Génération du devis en cours...</p>
      </div>
    </div>
  `,
  styles: [`
    @media print {
      body { background: white !important; }
      @page { size: A4; margin: 0; }
      .min-h-screen { padding: 0 !important; }
    }
  `]
})
export class QuotePrintComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private quoteService = inject(QuoteService);

  quote = signal<Quote | null>(null);
  loading = signal(true);
  today = new Date();

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.quoteService.getById(id).subscribe({
        next: (q) => {
          this.quote.set(q);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
    }
  }

  print(): void {
    window.print();
  }
}
