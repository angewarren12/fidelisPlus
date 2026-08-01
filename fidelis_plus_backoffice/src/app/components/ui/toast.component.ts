import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastMessage } from '../../services/toast.service';
import { Subscription } from 'rxjs';

interface DisplayToast extends ToastMessage {
  id: number;
}

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none" role="region" aria-label="Notifications">
      <div *ngFor="let t of toasts; trackBy: trackById"
           class="pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-xl shadow-xl shadow-black/5 min-w-[300px] max-w-sm animate-fade-in-up"
           [ngClass]="getBgClass(t.type)"
           role="status"
           [attr.aria-live]="t.type === 'error' ? 'assertive' : 'polite'">

        <span class="material-symbols-outlined text-2xl font-light" [ngClass]="getIconClass(t.type)" aria-hidden="true">
          {{ getIcon(t.type) }}
        </span>

        <p class="font-bold text-sm" [ngClass]="getTextClass(t.type)">{{ t.message }}</p>

        <button (click)="remove(t.id)" aria-label="Fermer la notification" class="ml-auto opacity-50 hover:opacity-100 transition-opacity">
          <span class="material-symbols-outlined text-lg" [ngClass]="getTextClass(t.type)" aria-hidden="true">close</span>
        </button>
      </div>
    </div>
  `
})
export class ToastComponent implements OnInit, OnDestroy {
  toasts: DisplayToast[] = [];
  private sub!: Subscription;
  private nextId = 0;

  constructor(private toastService: ToastService) {}

  ngOnInit() {
    this.sub = this.toastService.toastState$.subscribe(toast => {
      const id = ++this.nextId;
      this.toasts.push({ ...toast, id });
      setTimeout(() => this.remove(id), 4000);
    });
  }

  ngOnDestroy() {
    if (this.sub) this.sub.unsubscribe();
  }

  trackById(_index: number, toast: DisplayToast): number {
    return toast.id;
  }

  remove(id: number) {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

  getBgClass(type: string): string {
    switch (type) {
      case 'success': return 'bg-[#e8f7ec] border border-[#a1dfb5]';
      case 'error': return 'bg-[#ffebee] border border-[#ffcdd2]';
      case 'info': return 'bg-surface-container-high border border-surface-variant';
      default: return 'bg-surface-container-high';
    }
  }

  getIconClass(type: string): string {
    switch (type) {
      case 'success': return 'text-[#2e7d32]';
      case 'error': return 'text-error';
      case 'info': return 'text-primary';
      default: return 'text-primary';
    }
  }

  getTextClass(type: string): string {
    switch (type) {
      case 'success': return 'text-[#1b5e20]';
      case 'error': return 'text-[#b71c1c]';
      case 'info': return 'text-on-surface';
      default: return 'text-on-surface';
    }
  }

  getIcon(type: string): string {
    switch (type) {
      case 'success': return 'check_circle';
      case 'error': return 'error';
      case 'info': return 'info';
      default: return 'info';
    }
  }
}
