import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastMessage } from '../../services/toast.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
      <div *ngFor="let t of toasts; let i = index" 
           class="pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-xl shadow-xl shadow-black/5 min-w-[300px] max-w-sm animate-fade-in-up"
           [ngClass]="getBgClass(t.type)">
        
        <span class="material-symbols-outlined text-2xl font-light" [ngClass]="getIconClass(t.type)">
          {{ getIcon(t.type) }}
        </span>
        
        <p class="font-bold text-sm" [ngClass]="getTextClass(t.type)">{{ t.message }}</p>
        
        <button (click)="remove(i)" class="ml-auto opacity-50 hover:opacity-100 transition-opacity">
          <span class="material-symbols-outlined text-lg" [ngClass]="getTextClass(t.type)">close</span>
        </button>
      </div>
    </div>
  `
})
export class ToastComponent implements OnInit, OnDestroy {
  toasts: ToastMessage[] = [];
  private sub!: Subscription;

  constructor(private toastService: ToastService) {}

  ngOnInit() {
    this.sub = this.toastService.toastState$.subscribe(toast => {
      this.toasts.push(toast);
      setTimeout(() => {
        this.toasts.shift();
      }, 4000);
    });
  }

  ngOnDestroy() {
    if (this.sub) this.sub.unsubscribe();
  }

  remove(index: number) {
    this.toasts.splice(index, 1);
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
