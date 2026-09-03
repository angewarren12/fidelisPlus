import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastMessage } from '../../services/toast.service';
import { Subscription } from 'rxjs';

interface DisplayToast extends ToastMessage {
  id: number;
  lines: string[];
}

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none" role="region" aria-label="Notifications">
      <div *ngFor="let t of toasts; trackBy: trackById"
           class="pointer-events-auto flex items-start gap-3 px-5 py-4 rounded-2xl shadow-2xl shadow-black/10 min-w-[300px] max-w-sm animate-fade-in-up border"
           [ngClass]="getBgClass(t.type)"
           role="status"
           [attr.aria-live]="t.type === 'error' ? 'assertive' : 'polite'">

        <!-- Icône -->
        <span class="material-symbols-outlined text-2xl shrink-0 mt-0.5" [ngClass]="getIconClass(t.type)" aria-hidden="true">
          {{ getIcon(t.type) }}
        </span>

        <!-- Message (supporte plusieurs lignes) -->
        <div class="flex-1 min-w-0">
          <ng-container *ngIf="t.lines.length === 1">
            <p class="font-bold text-sm leading-snug" [ngClass]="getTextClass(t.type)">{{ t.lines[0] }}</p>
          </ng-container>
          <ng-container *ngIf="t.lines.length > 1">
            <p class="font-black text-[11px] uppercase tracking-wider mb-1.5" [ngClass]="getTextClass(t.type)">
              {{ t.lines.length }} erreurs détectées
            </p>
            <ul class="space-y-1">
              <li *ngFor="let line of t.lines"
                  class="text-sm font-medium leading-snug flex items-start gap-1.5"
                  [ngClass]="getTextClass(t.type)">
                <span class="material-symbols-outlined text-sm shrink-0 mt-0.5" aria-hidden="true">chevron_right</span>
                {{ line }}
              </li>
            </ul>
          </ng-container>
        </div>

        <!-- Fermer -->
        <button (click)="remove(t.id)" aria-label="Fermer la notification"
                class="shrink-0 ml-1 opacity-40 hover:opacity-100 transition-opacity mt-0.5">
          <span class="material-symbols-outlined text-lg" [ngClass]="getTextClass(t.type)" aria-hidden="true">close</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .animate-fade-in-up {
      animation: fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(16px) scale(0.96); }
      to   { opacity: 1; transform: translateY(0)   scale(1);    }
    }
  `]
})
export class ToastComponent implements OnInit, OnDestroy {
  toasts: DisplayToast[] = [];
  private sub!: Subscription;
  private nextId = 0;

  constructor(private toastService: ToastService) {}

  ngOnInit() {
    this.sub = this.toastService.toastState$.subscribe(toast => {
      const id = ++this.nextId;
      // Découpe le message en lignes pour l'affichage multi-erreurs
      const lines = toast.message
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);

      this.toasts.push({ ...toast, id, lines });

      // Durée configurable — défaut selon le type si non spécifié
      const defaultDuration = toast.type === 'error' ? 6000
        : toast.type === 'warning' ? 5000
        : 4000;
      const duration = toast.duration ?? defaultDuration;

      setTimeout(() => this.remove(id), duration);
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
      case 'success': return 'bg-[#e8f7ec] border-[#a1dfb5]';
      case 'error':   return 'bg-[#ffebee] border-[#ffcdd2]';
      case 'warning': return 'bg-[#fff8e1] border-[#ffe082]';
      case 'info':    return 'bg-surface-container-high border-surface-variant';
      default:        return 'bg-surface-container-high border-surface-variant';
    }
  }

  getIconClass(type: string): string {
    switch (type) {
      case 'success': return 'text-[#2e7d32]';
      case 'error':   return 'text-[#c62828]';
      case 'warning': return 'text-[#e65100]';
      case 'info':    return 'text-primary';
      default:        return 'text-primary';
    }
  }

  getTextClass(type: string): string {
    switch (type) {
      case 'success': return 'text-[#1b5e20]';
      case 'error':   return 'text-[#b71c1c]';
      case 'warning': return 'text-[#bf360c]';
      case 'info':    return 'text-on-surface';
      default:        return 'text-on-surface';
    }
  }

  getIcon(type: string): string {
    switch (type) {
      case 'success': return 'check_circle';
      case 'error':   return 'error';
      case 'warning': return 'warning';
      case 'info':    return 'info';
      default:        return 'info';
    }
  }
}

