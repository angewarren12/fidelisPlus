import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-[200] overflow-y-auto flex items-start justify-center p-4 py-10 bg-[#1b1932]/40 backdrop-blur-sm animate-fade-in">
      <div class="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden border border-outline-variant/10 p-8 text-center">
        
        <div class="w-16 h-16 rounded-2xl bg-error/10 text-error flex items-center justify-center mx-auto mb-6">
          <span class="material-symbols-outlined text-3xl">warning</span>
        </div>

        <h3 class="text-xl font-headline font-black text-on-surface mb-2">{{ title }}</h3>
        <p class="text-sm text-outline font-medium leading-relaxed mb-8">{{ message }}</p>

        <div class="flex flex-col gap-3">
          <button (click)="confirm.emit()" 
                  class="w-full py-4 rounded-xl bg-error text-white text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-error/20">
            {{ confirmText }}
          </button>
          <button (click)="cancel.emit()" 
                  class="w-full py-4 rounded-xl bg-surface-container text-outline text-xs font-black uppercase tracking-widest hover:bg-surface-container-high transition-all">
            {{ cancelText }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .animate-fade-in { animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
  `]
})
export class ConfirmModalComponent {
  @Input() title: string = 'Confirmation';
  @Input() message: string = 'Êtes-vous sûr de vouloir effectuer cette action ?';
  @Input() confirmText: string = 'Confirmer';
  @Input() cancelText: string = 'Annuler';

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
