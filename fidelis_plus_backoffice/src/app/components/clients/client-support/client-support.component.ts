import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { SupportService, SupportTicket } from '../../../services/support.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-client-support',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="animate-fade-in-up space-y-8 pb-20">

      <!-- HEADER -->
      <section class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-2xl md:text-3xl font-headline font-black text-on-surface">Support</h1>
          <p class="text-outline text-sm font-medium mt-1">Contactez notre équipe pour toute question ou demande d'assistance.</p>
        </div>
        <button (click)="openModal()"
                class="px-5 py-3 bg-[#15b9a3] hover:brightness-110 text-white font-bold text-sm rounded-xl shadow-lg shadow-[#15b9a3]/20 active:scale-95 transition-all flex items-center gap-2">
          <span class="material-symbols-outlined text-[18px]">add_circle</span>
          Nouveau ticket
        </button>
      </section>

      <!-- TICKETS LIST -->
      <div class="space-y-4">

        <!-- Loading -->
        <div *ngIf="loading()" class="bg-white rounded-xl border border-surface-container/30 shadow-sm p-12 text-center">
          <span class="material-symbols-outlined animate-spin text-primary text-3xl">sync</span>
          <p class="text-xs text-outline mt-2">Chargement de vos tickets...</p>
        </div>

        <!-- Empty -->
        <div *ngIf="!loading() && tickets().length === 0"
             class="bg-white rounded-xl border border-surface-container/30 shadow-sm p-16 text-center">
          <span class="material-symbols-outlined text-5xl text-outline/20 block mb-2">support_agent</span>
          <p class="text-on-surface font-bold text-sm">Aucun ticket ouvert</p>
          <p class="text-outline text-xs mt-1">Cliquez sur "Nouveau ticket" pour contacter notre équipe.</p>
        </div>

        <!-- Ticket cards -->
        <div *ngFor="let ticket of tickets()"
             class="bg-white rounded-xl border border-surface-container/30 shadow-sm p-5 space-y-3">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-black text-on-surface truncate">{{ ticket.subject }}</p>
              <p class="text-xs text-outline mt-0.5">{{ ticket.created_at | date:'dd/MM/yyyy à HH:mm' }}</p>
            </div>
            <span class="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
                  [ngClass]="{
                    'bg-amber-100 text-amber-700': ticket.status === 'open',
                    'bg-primary-container/20 text-primary': ticket.status === 'in_progress',
                    'bg-slate-100 text-slate-500': ticket.status === 'closed'
                  }">
              {{ ticket.status === 'open' ? 'Ouvert' : ticket.status === 'in_progress' ? 'En cours' : 'Fermé' }}
            </span>
          </div>

          <p class="text-sm text-on-surface-variant bg-surface-container/40 rounded-lg px-4 py-3 leading-relaxed">
            {{ ticket.message }}
          </p>

          <!-- Réponse du staff -->
          <div *ngIf="ticket.staff_reply" class="space-y-2 pt-1">
            <p class="text-[10px] font-bold text-outline uppercase tracking-wider">Réponse de notre équipe</p>
            <div class="flex gap-3 p-3 rounded-xl bg-primary-container/10">
              <div class="w-7 h-7 rounded-full bg-primary-container/30 flex items-center justify-center text-primary text-xs font-black shrink-0">
                <span class="material-symbols-outlined text-sm">support_agent</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs text-on-surface-variant leading-relaxed">{{ ticket.staff_reply }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL: NEW TICKET -->
      <div *ngIf="showModal()" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 overflow-y-auto flex items-start justify-center p-4 py-10">
        <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-scale-in">
          <div class="flex justify-between items-center mb-6">
            <h3 class="font-headline font-black text-lg text-on-surface">Nouveau ticket</h3>
            <button (click)="closeModal()" class="text-outline hover:text-on-surface transition-colors">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <form [formGroup]="ticketForm" (ngSubmit)="onSubmit()" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Sujet</label>
              <input type="text" id="subject" formControlName="subject"
                     class="w-full px-4 py-2.5 bg-surface-container rounded-xl border-none text-sm outline-none focus:ring-2 focus:ring-primary/20"
                     placeholder="Ex: Problème avec mon devis">
              <p *ngIf="ticketForm.controls['subject'].invalid && ticketForm.controls['subject'].touched" class="text-xs text-error font-medium mt-1">
                Le sujet doit contenir au moins 3 caractères.
              </p>
            </div>

            <div>
              <label for="message" class="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Message</label>
              <textarea id="message" formControlName="message" rows="5"
                        class="w-full px-4 py-2.5 bg-surface-container rounded-xl border-none text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                        placeholder="Décrivez votre demande en détail..."></textarea>
              <p *ngIf="ticketForm.controls['message'].invalid && ticketForm.controls['message'].touched" class="text-xs text-error font-medium mt-1">
                Le message doit contenir au moins 10 caractères.
              </p>
            </div>

            <div class="pt-2 flex items-center justify-end gap-3">
              <button type="button" (click)="closeModal()"
                      class="px-5 py-2.5 border border-slate-200 text-outline hover:text-on-surface font-bold text-xs rounded-lg transition-colors">
                Annuler
              </button>
              <button type="submit" [disabled]="ticketForm.invalid || submitting()"
                      class="px-5 py-2.5 bg-primary text-white font-bold text-xs rounded-lg shadow-md shadow-primary/10 hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all">
                {{ submitting() ? 'Envoi...' : 'Envoyer' }}
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; background: #fbfbfd; min-height: 100vh; }
    .animate-fade-in-up { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    .animate-scale-in { animation: scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
  `]
})
export class ClientSupportComponent implements OnInit {
  tickets = signal<SupportTicket[]>([]);
  loading = signal(true);
  submitting = signal(false);
  showModal = signal(false);

  ticketForm: FormGroup;

  private supportService = inject(SupportService);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);

  constructor() {
    this.ticketForm = this.fb.group({
      subject: ['', [Validators.required, Validators.minLength(3)]],
      message: ['', [Validators.required, Validators.minLength(10)]],
    });
  }

  ngOnInit(): void {
    this.loadTickets();
  }

  loadTickets(): void {
    this.supportService.list().subscribe({
      next: (data) => {
        this.tickets.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.toastService.error('Impossible de charger vos tickets.');
        this.loading.set(false);
      }
    });
  }

  openModal(): void {
    this.ticketForm.reset();
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  onSubmit(): void {
    if (this.ticketForm.invalid) return;
    this.submitting.set(true);

    this.supportService.create(this.ticketForm.value).subscribe({
      next: (ticket) => {
        this.submitting.set(false);
        this.showModal.set(false);
        this.toastService.success('Ticket envoyé avec succès.');
        this.tickets.update(list => [ticket, ...list]);
      },
      error: () => {
        this.submitting.set(false);
        this.toastService.error('Erreur lors de l\'envoi du ticket.');
      }
    });
  }
}
