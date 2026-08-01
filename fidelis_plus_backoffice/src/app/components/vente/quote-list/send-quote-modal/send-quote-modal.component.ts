import { Component, OnInit, signal, inject, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuoteService, Quote } from '../../../../services/quote.service';

@Component({
  selector: 'app-send-quote-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-[110] overflow-y-auto flex items-start justify-center p-4 py-10 bg-[#1b1932]/40 backdrop-blur-md animate-fade-in text-on-surface">
      <div class="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-outline-variant/10">
        
        <div class="p-8 border-b border-surface-container/50 bg-surface-container-low/30">
          <h2 class="text-xl font-headline font-black">Envoyer le Devis</h2>
          <p class="text-xs text-outline font-medium mt-1">Préparez le message pour votre client.</p>
        </div>

        <div class="p-8 space-y-6">
          <!-- DESTINATAIRE -->
          <div class="space-y-2">
            <label class="block text-[10px] font-black text-outline uppercase tracking-widest ml-1">Destinataire (Email)</label>
            <div class="w-full bg-surface-container-low rounded-2xl p-2 flex items-center gap-3 border border-transparent focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
               <span class="material-symbols-outlined text-primary text-lg ml-2">alternate_email</span>
               <input type="email" [(ngModel)]="customEmail" class="w-full bg-transparent border-none text-sm font-bold outline-none p-2 text-on-surface" placeholder="contact@client.com" />
            </div>
            <p class="text-[9px] text-outline/60 italic ml-1">* Modifiez cet email si vous souhaitez envoyer à une autre adresse.</p>
          </div>

          <!-- MESSAGE -->
          <div class="space-y-2">
            <label class="block text-[10px] font-black text-outline uppercase tracking-widest ml-1">Message personnalisé</label>
            <textarea [(ngModel)]="message" rows="4" placeholder="Bonjour, voici le devis pour votre véhicule..." 
                      class="w-full bg-surface-container-low border-none rounded-2xl p-4 text-sm font-medium focus:ring-primary/20 outline-none resize-none"></textarea>
          </div>

          <div class="pt-4 flex gap-3">
             <button (click)="cancel.emit()" class="flex-1 py-4 rounded-2xl bg-surface-container text-outline text-[10px] font-black uppercase tracking-widest hover:bg-surface-container-high transition-all">Annuler</button>
             <button (click)="send()" [disabled]="sending()" class="flex-[2] py-4 rounded-2xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                <span *ngIf="sending()" class="material-symbols-outlined animate-spin text-sm">sync</span>
                <span *ngIf="!sending()">Envoyer le Devis</span>
             </button>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .animate-fade-in { animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
  `]
})
export class SendQuoteModalComponent implements OnInit {
  @Input() quote!: Quote;
  @Output() cancel = new EventEmitter<void>();
  @Output() sent = new EventEmitter<void>();

  customEmail = '';
  message = '';
  sending = signal(false);

  private quoteService = inject(QuoteService);

  ngOnInit(): void {
    // On charge l'email du contact principal ou de l'entreprise
    this.customEmail = this.quote.company?.email || 'contact@client.com';
    this.message = `Bonjour ${this.quote.company?.name},\n\nSuite à votre demande de devis, nous avons le plaisir de vous transmettre notre proposition commerciale concernant votre véhicule.\n\nCordialement,\nL'équipe commerciale Mayelia.`;
  }

  send(): void {
    this.sending.set(true);
    this.quoteService.updateStatus(this.quote.id!, 'sent', {
      email: this.customEmail.trim() || undefined,
      message: this.message.trim() || undefined,
    }).subscribe({
      next: () => {
        this.sending.set(false);
        this.sent.emit();
      },
      error: () => this.sending.set(false)
    });
  }
}
