import { Component, OnInit, signal, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuoteRequestService, QuoteRequest } from '../../../services/quote-request.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-quote-request-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-[#1b1932]/60 backdrop-blur-xl animate-fade-in">
      <div class="bg-white w-full max-w-5xl max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden relative border border-white/20">
        
        <!-- HEADER -->
        <div class="p-8 border-b border-surface-container/50 flex items-center justify-between bg-surface-container-low/30">
          <div>
            <h2 class="text-2xl font-headline font-black text-on-surface flex items-center gap-3">
              Demandes de Devis <span class="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full">{{ requests().length }}</span>
            </h2>
            <p class="text-xs text-outline font-medium mt-1">Traitement des demandes reçues depuis l'application mobile.</p>
          </div>
          <button (click)="close.emit()" class="w-12 h-12 rounded-2xl hover:bg-surface-container transition-colors flex items-center justify-center text-outline">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="flex-1 overflow-hidden flex flex-col lg:flex-row">
          
          <!-- LIST SIDEBAR (LEFT) -->
          <div class="w-full lg:w-80 border-r border-surface-container/50 overflow-y-auto bg-surface-container-lowest">
            <div *ngIf="loading()" class="p-10 text-center">
               <span class="material-symbols-outlined animate-spin text-primary text-3xl">sync</span>
            </div>
            
            <div *ngFor="let req of requests()" 
                 (click)="selectRequest(req)"
                 [class.bg-primary/5]="selectedRequest()?.id === req.id"
                 [class.border-l-4]="selectedRequest()?.id === req.id"
                 class="p-6 border-b border-surface-container/30 cursor-pointer hover:bg-surface-container-low transition-all border-l-primary">
              <p class="text-[10px] font-black uppercase text-outline tracking-widest mb-2">{{ req.created_at | date:'dd/MM HH:mm' }}</p>
              <h4 class="font-bold text-on-surface truncate">{{ req.company?.name || 'Client' }}</h4>
              <p class="text-xs text-outline mt-1">{{ req.vehicle?.brand }} {{ req.vehicle?.model }}</p>
            </div>

            <div *ngIf="!loading() && !requests().length" class="p-20 text-center text-outline/30">
               <span class="material-symbols-outlined text-5xl mb-3">inbox</span>
               <p class="text-xs font-bold uppercase">Aucune demande</p>
            </div>
          </div>

          <!-- DETAIL VIEW (RIGHT) -->
          <div class="flex-1 overflow-y-auto p-10 bg-white">
            <div *ngIf="!selectedRequest()" class="h-full flex flex-col items-center justify-center text-outline/40">
               <span class="material-symbols-outlined text-6xl mb-4">description</span>
               <p class="font-medium">Sélectionnez une demande pour voir les détails</p>
            </div>

            <div *ngIf="selectedRequest()" class="space-y-10 animate-fade-in">
               
               <div class="flex flex-col md:flex-row md:items-start justify-between gap-6">
                 <div>
                    <h3 class="text-3xl font-headline font-black text-on-surface">{{ selectedRequest()?.company?.name }}</h3>
                    <p class="text-primary font-bold mt-1">Correspondant : {{ selectedRequest()?.user?.first_name }} {{ selectedRequest()?.user?.last_name }}</p>
                 </div>
                 <div class="flex gap-3">
                    <button (click)="reject()" class="px-6 py-3 rounded-2xl bg-surface-container text-outline text-xs font-black uppercase tracking-widest hover:bg-error/10 hover:text-error transition-all">Rejeter</button>
                    <button (click)="generateQuote()" class="px-6 py-3 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-lg shadow-primary/20">Générer le devis</button>
                 </div>
               </div>

               <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <!-- Info Plate -->
                  <div class="space-y-6">
                     <div class="bg-surface-container-low p-6 rounded-[2rem] border border-surface-container">
                        <p class="text-[10px] font-black uppercase text-outline tracking-widest mb-4">Véhicule concerné</p>
                        <div class="flex items-center gap-4">
                           <div class="w-16 h-12 bg-white rounded-xl border border-outline-variant/10 flex items-center justify-center font-mono font-bold text-lg text-primary shadow-sm">
                              {{ selectedRequest()?.vehicle?.license_plate }}
                           </div>
                           <div>
                              <p class="font-black text-on-surface">{{ selectedRequest()?.vehicle?.brand }} {{ selectedRequest()?.vehicle?.model }}</p>
                              <p class="text-xs text-outline">{{ selectedRequest()?.vehicle?.fuel_type || 'NC' }} — {{ selectedRequest()?.vehicle?.year || 'NC' }}</p>
                           </div>
                        </div>
                     </div>

                     <div class="bg-surface-container-low p-6 rounded-[2rem] border border-surface-container" *ngIf="selectedRequest()?.notes">
                        <p class="text-[10px] font-black uppercase text-outline tracking-widest mb-2">Observations client</p>
                        <p class="text-sm text-on-surface-variant leading-relaxed">{{ selectedRequest()?.notes }}</p>
                     </div>
                  </div>

                  <!-- Documents Preview -->
                  <div class="space-y-4">
                     <p class="text-[10px] font-black uppercase text-outline tracking-widest ml-1">Documents joints</p>
                     <div class="grid grid-cols-2 gap-4">
                        <div class="group relative aspect-[4/3] rounded-3xl overflow-hidden bg-surface-container cursor-zoom-in border border-surface-container"
                             [class.opacity-60]="!selectedRequest()?.registration_image_url"
                             (click)="openImage(selectedRequest()?.registration_image_url)">
                           <img *ngIf="selectedRequest()?.registration_image_url; else noReg"
                                [src]="selectedRequest()?.registration_image_url"
                                class="w-full h-full object-cover group-hover:scale-105 transition-transform">
                           <ng-template #noReg>
                             <div class="w-full h-full flex flex-col items-center justify-center text-outline/60">
                               <span class="material-symbols-outlined text-3xl mb-2">image_not_supported</span>
                               <span class="text-[10px] font-black uppercase tracking-widest">Carte grise</span>
                               <span class="text-[10px] font-black uppercase tracking-widest text-outline/50 mt-1">Non fournie</span>
                             </div>
                           </ng-template>
                           <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                              <span class="text-white text-[10px] font-black uppercase">Carte Grise</span>
                           </div>
                        </div>
                        <div class="group relative aspect-[4/3] rounded-3xl overflow-hidden bg-surface-container cursor-zoom-in border border-surface-container"
                             [class.opacity-60]="!selectedRequest()?.vignette_image_url"
                             (click)="openImage(selectedRequest()?.vignette_image_url)">
                           <img *ngIf="selectedRequest()?.vignette_image_url; else noVig"
                                [src]="selectedRequest()?.vignette_image_url"
                                class="w-full h-full object-cover group-hover:scale-105 transition-transform">
                           <ng-template #noVig>
                             <div class="w-full h-full flex flex-col items-center justify-center text-outline/60">
                               <span class="material-symbols-outlined text-3xl mb-2">image_not_supported</span>
                               <span class="text-[10px] font-black uppercase tracking-widest">Vignette</span>
                               <span class="text-[10px] font-black uppercase tracking-widest text-outline/50 mt-1">Non fournie</span>
                             </div>
                           </ng-template>
                           <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                              <span class="text-white text-[10px] font-black uppercase">Vignette</span>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  `,
  styles: [`
    .animate-fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
  `]
})
export class QuoteRequestModalComponent implements OnInit {
  @Output() close = new EventEmitter<void>();

  requests = signal<QuoteRequest[]>([]);
  selectedRequest = signal<QuoteRequest | null>(null);
  loading = signal(true);

  private quoteRequestService = inject(QuoteRequestService);
  private router = inject(Router);

  ngOnInit(): void {
    this.loadRequests();
  }

  loadRequests(): void {
    this.loading.set(true);
    this.quoteRequestService.getPending().subscribe({
      next: (data) => {
        this.requests.set(data);
        this.loading.set(false);
        if (data.length > 0) this.selectRequest(data[0]);
      },
      error: () => this.loading.set(false)
    });
  }

  selectRequest(req: QuoteRequest): void {
    // Re-fetch detail to get fresh URLs for images
    this.quoteRequestService.getById(req.id).subscribe(fullReq => {
      this.selectedRequest.set(fullReq);
    });
  }

  generateQuote(): void {
    const req = this.selectedRequest();
    if (!req) return;
    
    // On redirige vers la création de devis avec les paramètres en query
    this.router.navigate(['/vente/nouveau'], { 
      queryParams: { 
        company_id: req.company_id, 
        request_id: req.id,
        vehicle_id: req.vehicle_id ?? req.vehicle?.id
      } 
    });
    this.close.emit();
  }

  reject(): void {
    const req = this.selectedRequest();
    if (!req) return;

    if (confirm('Rejeter cette demande de devis ?')) {
      this.quoteRequestService.updateStatus(req.id, 'rejected').subscribe(() => {
        this.loadRequests();
      });
    }
  }

  openImage(url?: string): void {
    if (!url) return;
    window.open(url, '_blank', 'noopener');
  }
}
