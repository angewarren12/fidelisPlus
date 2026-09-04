import { Component, OnInit, OnDestroy, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';
import { RealtimeService } from '../../../services/realtime.service';
import { NotificationService, NotificationItem } from '../../../services/notification.service';
import { ToastService } from '../../../services/toast.service';
import { LayoutService } from '../../../services/layout.service';
import { UserRoles } from '../../../models/user-roles';
import { environment } from '../../../environments/environment';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="fixed top-0 right-0 left-0 lg:left-64 z-40 bg-[#f4fbf8]/80 backdrop-blur-md flex justify-between items-center px-4 sm:px-8 h-20">
      <div class="flex items-center gap-4 sm:gap-8 min-w-0">
        <button (click)="layoutService.toggleSidebar()" aria-label="Ouvrir le menu de navigation" class="lg:hidden hover:bg-teal-50/50 rounded-full p-2 transition-all shrink-0">
          <span class="material-symbols-outlined text-on-surface" aria-hidden="true">menu</span>
        </button>
        <h2 class="font-headline text-lg sm:text-2xl font-bold text-on-surface truncate">Tableau de bord de gestion</h2>
      </div>

      <div class="flex items-center gap-2 sm:gap-4 shrink-0">
        <!-- Bouton Synchronisation Odoo -->
        <button (click)="openOdooSyncModal()" title="Synchroniser Odoo" aria-label="Synchroniser Odoo" class="hover:bg-teal-50/50 rounded-full p-2 transition-all group relative text-outline hover:text-[#15b9a3]">
          <span class="material-symbols-outlined text-outline group-hover:text-primary" [class.animate-spin]="isSyncing()" aria-hidden="true">sync</span>
        </button>

        <!-- Dropdown Notifications -->
        <div class="relative">
          <button (click)="toggleNotifications($event)" aria-label="Notifications" [attr.aria-expanded]="showNotifications()" class="hover:bg-teal-50/50 rounded-full p-2 transition-all group relative">
            <span class="material-symbols-outlined text-outline group-hover:text-primary" aria-hidden="true">notifications</span>
            <span *ngIf="unreadCount() > 0" class="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-error text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
              {{ unreadCount() > 99 ? '99+' : unreadCount() }}
            </span>
          </button>

          <!-- Dropdown Notifications -->
          <div *ngIf="showNotifications()" (click)="$event.stopPropagation()"
               class="absolute right-0 mt-2 w-96 bg-white/95 backdrop-blur-md border border-slate-200/50 rounded-2xl shadow-xl z-50 overflow-hidden py-2 animate-fade-in-up">
            <div class="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
              <span class="font-headline font-bold text-sm text-on-surface">Notifications</span>
              <button *ngIf="unreadCount() > 0" (click)="markAllRead()" class="text-xs text-primary font-bold hover:underline">Tout marquer comme lu</button>
            </div>

            <div class="max-h-80 overflow-y-auto divide-y divide-slate-100">
              <div *ngFor="let item of notifications()"
                   (click)="markRead(item)"
                   [ngClass]="{'bg-teal-50/10': !item.read_at}"
                   class="px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3">
                <div class="w-8 h-8 rounded-full shrink-0 flex items-center justify-center"
                     [ngClass]="{
                       'bg-teal-50 text-[#15b9a3]': item.priority === 'normal',
                       'bg-red-50 text-red-600': item.priority === 'high',
                       'bg-amber-50 text-amber-600': item.priority === 'low'
                     }">
                  <span class="material-symbols-outlined text-[18px]">
                    {{ item.priority === 'high' ? 'warning' : (item.type === 'alert' ? 'notifications_active' : 'info') }}
                  </span>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-xs text-on-surface font-semibold truncate">{{ item.title }}</p>
                  <p class="text-xs text-slate-600 line-clamp-2 mt-0.5">{{ item.body }}</p>
                  <p class="text-[10px] text-outline mt-1">{{ item.created_at | date:'short' }}</p>
                </div>
                <div *ngIf="!item.read_at" class="w-2 h-2 rounded-full bg-[#15b9a3] shrink-0 self-center"></div>
              </div>

              <div *ngIf="notifications().length === 0" class="py-8 text-center text-xs text-outline italic">
                Aucune notification.
              </div>
            </div>
          </div>
        </div>

        <button *ngIf="showSettings" (click)="goToSettings()" aria-label="Paramètres" class="hover:bg-teal-50/50 rounded-full p-2 transition-all group">
          <span class="material-symbols-outlined text-outline group-hover:text-primary" aria-hidden="true">settings</span>
        </button>
        <button (click)="logout()" aria-label="Déconnexion" class="hover:bg-red-50 rounded-full p-2 transition-all group flex items-center gap-2 text-outline hover:text-red-600">
          <span class="material-symbols-outlined" aria-hidden="true">logout</span>
          <span class="text-xs font-bold font-headline uppercase tracking-wider hidden md:inline">Déconnexion</span>
        </button>
      </div>

      <!-- Modal Confirmation Synchronisation Odoo -->
      <div *ngIf="showOdooSyncModal()" (click)="closeOdooSyncModal()" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
        <div (click)="$event.stopPropagation()" class="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-6 animate-scale-up">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-teal-50 text-[#15b9a3] flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-2xl" [class.animate-spin]="isSyncing()">sync</span>
            </div>
            <div>
              <h3 class="font-headline font-black text-lg text-on-surface">Synchronisation Odoo</h3>
              <p class="text-xs text-outline font-medium">Synchronisation bidirectionnelle des données</p>
            </div>
          </div>

          <p class="text-sm text-slate-600 leading-relaxed">
            Voulez-vous lancer la synchronisation immédiate des prospects, clients, flottes et devis depuis Odoo ?
          </p>

          <div class="flex items-center justify-end gap-3 pt-2">
            <button (click)="closeOdooSyncModal()" [disabled]="isSyncing()" class="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all">
              Annuler
            </button>
            <button (click)="triggerOdooSync()" [disabled]="isSyncing()" class="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#15b9a3] hover:bg-[#119684] transition-all flex items-center gap-2 shadow-lg shadow-teal-500/20">
              <span *ngIf="isSyncing()" class="material-symbols-outlined text-sm animate-spin">sync</span>
              <span>{{ isSyncing() ? 'Synchronisation en cours...' : 'Lancer la synchro' }}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  `,
  styles: [`
    :host { display: contents; }
    .animate-fade-in-up {
      animation: fadeInUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .animate-scale-up {
      animation: scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes scaleUp {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
  `]
})
export class HeaderComponent implements OnInit, OnDestroy {
  showNotifications = signal(false);
  notifications = signal<NotificationItem[]>([]);
  unreadCount = signal(0);
  showOdooSyncModal = signal(false);
  isSyncing = signal(false);

  layoutService = inject(LayoutService);
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private sub?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    private realtime: RealtimeService,
    private notificationService: NotificationService
  ) {
    this.realtime.start();
  }

  get showSettings(): boolean {
    return this.authService.hasRole(UserRoles.ADMIN_COMMERCIAL, UserRoles.SUPER_ADMIN);
  }

  goToSettings(): void {
    this.router.navigate(['/admin/settings']);
  }

  ngOnInit() {
    this.sub = this.realtime.unreadCount$.subscribe(count => {
      this.unreadCount.set(count);
    });
    this.loadUnreadCount();
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  openOdooSyncModal() {
    this.showOdooSyncModal.set(true);
  }

  closeOdooSyncModal() {
    if (this.isSyncing()) return;
    this.showOdooSyncModal.set(false);
  }

  triggerOdooSync() {
    this.isSyncing.set(true);
    this.http.get<any>(`${environment.apiUrl}/api/v1/sync-odoo`).subscribe({
      next: (res) => {
        this.isSyncing.set(false);
        this.showOdooSyncModal.set(false);
        this.toast.success(res.message || 'Synchronisation Odoo exécutée avec succès !');
        // Rafraîchir l'écran courant après 1 seconde
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      },
      error: (err) => {
        this.isSyncing.set(false);
        this.showOdooSyncModal.set(false);
        this.toast.error('Erreur lors du déclenchement de la synchronisation Odoo.');
      }
    });
  }

  loadUnreadCount() {
    this.notificationService.getUnreadCount().subscribe();
  }

  toggleNotifications(event: MouseEvent) {
    event.stopPropagation();
    this.showNotifications.update(v => !v);
    if (this.showNotifications()) {
      this.loadNotifications();
    }
  }

  loadNotifications() {
    this.notificationService.getNotifications(1, 10).subscribe({
      next: (res) => {
        this.notifications.set(res.items);
      }
    });
  }

  markRead(item: NotificationItem) {
    if (item.read_at) return;
    this.notificationService.markAsRead(item.id).subscribe({
      next: () => {
        item.read_at = new Date().toISOString();
        this.unreadCount.update(n => Math.max(0, n - 1));
      }
    });
  }

  markAllRead() {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications().forEach(n => n.read_at = new Date().toISOString());
        this.unreadCount.set(0);
      }
    });
  }

  @HostListener('document:click')
  closeDropdowns() {
    this.showNotifications.set(false);
  }

  logout() {
    this.realtime.stop();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
