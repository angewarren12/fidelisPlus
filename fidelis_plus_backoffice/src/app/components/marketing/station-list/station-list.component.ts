import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StationService, Station } from '../../../services/station.service';
import { ToastService } from '../../../services/toast.service';
import { AuthService } from '../../../services/auth.service';
import { MarketingBgPatternComponent } from '../../ui/marketing-bg-pattern/marketing-bg-pattern.component';

@Component({
  selector: 'app-station-list',
  standalone: true,
  imports: [CommonModule, FormsModule, MarketingBgPatternComponent],
  template: `
    <app-marketing-bg-pattern></app-marketing-bg-pattern>
    <div class="max-w-6xl mx-auto px-6 py-10 animate-fade-in space-y-10 relative z-[1]">
      <header class="flex items-center justify-between gap-6">
        <div>
          <h1 class="text-3xl font-headline font-black text-on-surface tracking-tight">Gestion des Stations</h1>
          <p class="text-sm text-outline font-medium mt-1">Configurez les points de scan pour la fidélité.</p>
        </div>
        <button *ngIf="isAdmin()" (click)="openForm()" 
          class="h-12 px-6 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/25 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
          <span class="material-symbols-outlined">add_circle</span>
          Nouvelle Station
        </button>
      </header>

      <div class="bg-white rounded-[2rem] border border-outline-variant/10 shadow-sm overflow-hidden">
        <div *ngIf="loading()" class="p-16 text-center text-outline">
          <span class="material-symbols-outlined animate-spin text-primary text-4xl">sync</span>
        </div>

        <div *ngIf="!loading()" class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-surface-container-low text-[10px] font-black uppercase tracking-widest text-outline">
              <tr>
                <th class="px-6 py-4">Nom</th>
                <th class="px-6 py-4">Localisation</th>
                <th class="px-6 py-4">Statut</th>
                <th *ngIf="isAdmin()" class="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant/10">
              <tr *ngFor="let s of stations()" class="hover:bg-surface-container-low/40 transition-colors">
                <td class="px-6 py-4 font-bold text-on-surface">{{ s.name }}</td>
                <td class="px-6 py-4 text-outline text-xs">{{ s.location || '—' }}</td>
                <td class="px-6 py-4">
                  <span [class]="s.is_active ? 'bg-secondary/10 text-secondary' : 'bg-outline/10 text-outline'" 
                        class="px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                    {{ s.is_active ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td *ngIf="isAdmin()" class="px-6 py-4 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <button (click)="openForm(s)" class="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Modifier">
                      <span class="material-symbols-outlined text-sm">edit</span>
                    </button>
                    <button (click)="deleteStation(s)" class="p-2 text-error hover:bg-error/10 rounded-lg transition-colors" title="Supprimer">
                      <span class="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <div *ngIf="stations().length === 0" class="p-12 text-center text-outline text-sm italic font-medium">Aucune station configurée.</div>
        </div>
      </div>

      <!-- Station Modal Form -->
      <div *ngIf="showModal()" class="fixed inset-0 z-[60] overflow-y-auto flex items-start justify-center p-6 py-10 animate-fade-in">
        <div class="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" (click)="closeModal()"></div>
        <div class="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden p-8 space-y-6">
          <header>
            <h3 class="text-xl font-headline font-black text-on-surface">{{ editStationId ? 'Modifier' : 'Nouvelle' }} Station</h3>
            <p class="text-[10px] font-black uppercase text-outline tracking-widest mt-1">Configuration point de vente</p>
          </header>

          <div class="space-y-4">
            <div class="space-y-1.5">
              <label class="text-[10px] font-black uppercase text-outline ml-1">Nom de la station *</label>
              <input type="text" [(ngModel)]="formStation.name" placeholder="Ex: Caisse Principale Cocody"
                     class="w-full h-12 px-4 rounded-xl bg-surface-container-low border border-outline-variant/10 font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all">
            </div>

            <div class="space-y-1.5">
              <label class="text-[10px] font-black uppercase text-outline ml-1">Localisation / Adresse</label>
              <input type="text" [(ngModel)]="formStation.location" placeholder="Ex: Angle Rue des Jardins"
                     class="w-full h-12 px-4 rounded-xl bg-surface-container-low border border-outline-variant/10 font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all">
            </div>

            <div class="flex items-center gap-3 p-4 rounded-xl bg-surface-container-low/50 border border-outline-variant/5">
              <input type="checkbox" id="is_active" [(ngModel)]="formStation.is_active" class="w-5 h-5 accent-secondary">
              <label for="is_active" class="text-xs font-bold text-on-surface select-none">Station active (autorise les scans)</label>
            </div>
          </div>

          <div class="flex items-center gap-4 pt-2">
            <button (click)="closeModal()" class="flex-1 h-12 rounded-xl border border-outline-variant/20 text-xs font-black uppercase tracking-widest hover:bg-surface-container-low transition-all">Annuler</button>
            <button (click)="saveStation()" [disabled]="!formStation.name || submitting()"
                    class="flex-1 h-12 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
              <span class="material-symbols-outlined text-sm" *ngIf="!submitting()">save</span>
              <span class="material-symbols-outlined animate-spin text-sm" *ngIf="submitting()">sync</span>
              {{ submitting() ? '...' : 'Valider' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class StationListComponent implements OnInit {
  private stationService = inject(StationService);
  private toastService = inject(ToastService);
  private auth = inject(AuthService);

  stations = signal<Station[]>([]);
  loading = signal(true);
  submitting = signal(false);
  showModal = signal(false);

  editStationId: number | null = null;
  formStation: Partial<Station> = { name: '', location: '', is_active: true };

  ngOnInit(): void {
    this.loadStations();
  }

  isAdmin(): boolean {
    return this.auth.getCurrentUser()?.role === 'admin';
  }

  loadStations(): void {
    this.loading.set(true);
    this.stationService.list().subscribe({
      next: (data) => {
        this.stations.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toastService.error('Impossible de charger les stations.');
      }
    });
  }

  openForm(s?: Station): void {
    if (s) {
      this.editStationId = s.id;
      this.formStation = { ...s };
    } else {
      this.editStationId = null;
      this.formStation = { name: '', location: '', is_active: true };
    }
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  saveStation(): void {
    this.submitting.set(true);
    const obs = this.editStationId 
      ? this.stationService.update(this.editStationId, this.formStation)
      : this.stationService.create(this.formStation);

    obs.subscribe({
      next: () => {
        this.submitting.set(false);
        this.toastService.success(this.editStationId ? 'Station mise à jour.' : 'Station créée.');
        this.closeModal();
        this.loadStations();
      },
      error: (err) => {
        this.submitting.set(false);
        this.toastService.error(err.error?.message || 'Erreur lors de l\'enregistrement.');
      }
    });
  }

  deleteStation(s: Station): void {
    if (!confirm(`Supprimer la station "${s.name}" ?`)) return;
    this.stationService.delete(s.id).subscribe({
      next: () => {
        this.toastService.success('Station supprimée.');
        this.loadStations();
      },
      error: () => this.toastService.error('Action impossible.')
    });
  }
}
