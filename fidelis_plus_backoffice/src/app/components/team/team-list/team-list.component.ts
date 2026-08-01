import { Component, OnInit, signal, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { TeamService, User, PaginatedMeta } from '../../../services/team.service';
import { ToastService } from '../../../services/toast.service';
import { AuthService } from '../../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-team-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="h-full flex flex-col space-y-10 animate-fade-in pb-20">
      
      <section class="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 class="text-3xl md:text-5xl font-headline font-black text-on-surface tracking-tighter">
            Gestion <span class="text-primary">Équipe</span>
          </h1>
          <p class="text-outline text-sm font-medium mt-2">Supervisez et administrez vos collaborateurs commerciaux.</p>
        </div>
        <a routerLink="/equipe/nouveau" class="h-14 px-8 rounded-2xl bg-[#1b1932] text-white flex items-center justify-center gap-3 hover:scale-105 transition-transform shadow-2xl shadow-primary/20">
          <span class="material-symbols-outlined text-xl">person_add</span>
          <span class="text-xs font-black uppercase tracking-[0.2em]">Nouveau</span>
        </a>
      </section>

      <section class="bg-white rounded-[2rem] p-6 border border-outline-variant/10 shadow-sm flex flex-wrap gap-4 items-end">
        <div class="w-full md:flex-1 md:min-w-[220px]">
          <label class="block text-[10px] font-black uppercase text-outline tracking-[0.2em] mb-1.5 ml-1">Recherche</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
            <input type="text" [(ngModel)]="searchText" (ngModelChange)="onSearchInput($event)" placeholder="Prénom, nom, e-mail…" class="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-surface-container-low border-none text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/25">
          </div>
        </div>
        <div class="w-full sm:w-44">
          <label class="block text-[10px] font-black uppercase text-outline tracking-[0.2em] mb-1.5 ml-1">Rôle</label>
          <select [(ngModel)]="filterRole" (ngModelChange)="onFilterChange()" class="w-full py-3.5 px-4 rounded-2xl bg-surface-container-low border-none text-sm font-bold outline-none">
            <option value="">Tous</option>
            <option value="admin">Admin</option>
            <option value="commercial">Commercial</option>
          </select>
        </div>
        <div class="w-full sm:w-28">
          <label class="block text-[10px] font-black uppercase text-outline tracking-[0.2em] mb-1.5 ml-1">Par page</label>
          <select [ngModel]="perPage()" (ngModelChange)="setPerPage(+$event)" class="w-full py-3.5 px-4 rounded-2xl bg-surface-container-low border-none text-sm font-bold outline-none">
            <option [ngValue]="6">6</option>
            <option [ngValue]="12">12</option>
            <option [ngValue]="24">24</option>
          </select>
        </div>
        <button type="button" (click)="loadTeam()" class="h-12 px-6 rounded-2xl bg-surface-container-high text-on-surface text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
          <span class="material-symbols-outlined text-lg" [class.animate-spin]="loading()">refresh</span>
          Actualiser
        </button>
        <div class="flex items-center gap-1 bg-surface-container-low rounded-2xl p-1">
          <button type="button" (click)="viewMode.set('cards')" title="Vue cartes"
            [class]="'w-11 h-11 rounded-xl flex items-center justify-center transition-all ' + (viewMode() === 'cards' ? 'bg-white text-primary shadow-sm' : 'text-outline hover:text-on-surface')">
            <span class="material-symbols-outlined text-lg">grid_view</span>
          </button>
          <button type="button" (click)="viewMode.set('list')" title="Vue liste"
            [class]="'w-11 h-11 rounded-xl flex items-center justify-center transition-all ' + (viewMode() === 'list' ? 'bg-white text-primary shadow-sm' : 'text-outline hover:text-on-surface')">
            <span class="material-symbols-outlined text-lg">view_list</span>
          </button>
        </div>
      </section>

      <section class="grid grid-cols-1 sm:grid-cols-3 gap-6">
         <div class="bg-white p-8 rounded-[2rem] border border-outline-variant/10 flex items-center justify-between">
            <div>
               <p class="text-[10px] font-black uppercase text-outline tracking-[0.2em] mb-1">Total (filtre)</p>
               <h3 class="text-3xl font-headline font-black text-on-surface">{{ meta()?.total ?? 0 }}</h3>
            </div>
            <div class="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center">
               <span class="material-symbols-outlined">group</span>
            </div>
         </div>
      </section>

      <div class="flex flex-wrap items-center justify-between gap-3 text-sm text-outline px-1">
        <span>Page {{ meta()?.current_page ?? 1 }} / {{ metaLastPage() }} — {{ meta()?.total ?? 0 }} membre(s)</span>
        <div class="flex gap-2">
          <button type="button" (click)="goPage(-1)" [disabled]="loading() || (meta()?.current_page ?? 1) <= 1" class="px-4 py-2 rounded-xl bg-white border border-outline-variant/20 text-[10px] font-black uppercase tracking-widest disabled:opacity-40">Précédent</button>
          <button type="button" (click)="goPage(1)" [disabled]="loading() || (meta()?.current_page ?? 1) >= metaLastPage()" class="px-4 py-2 rounded-xl bg-white border border-outline-variant/20 text-[10px] font-black uppercase tracking-widest disabled:opacity-40">Suivant</button>
        </div>
      </div>

      <!-- VUE LISTE (tableau) -->
      <section *ngIf="!loading() && viewMode() === 'list'" class="bg-white rounded-[2rem] border border-outline-variant/10 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-surface-container-low border-b border-outline-variant/10">
                <th class="px-6 py-4 text-[10px] font-black text-outline uppercase tracking-widest">Collaborateur</th>
                <th class="px-6 py-4 text-[10px] font-black text-outline uppercase tracking-widest">Rôle</th>
                <th class="px-6 py-4 text-[10px] font-black text-outline uppercase tracking-widest text-center">Clients</th>
                <th class="px-6 py-4 text-[10px] font-black text-outline uppercase tracking-widest text-center">Prospects</th>
                <th class="px-6 py-4 text-[10px] font-black text-outline uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant/10">
              <tr *ngFor="let user of users()" class="hover:bg-surface-container-low/50 transition-colors">
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-on-surface font-bold text-sm shrink-0">
                      {{ user.first_name.charAt(0) }}{{ user.last_name.charAt(0) }}
                    </div>
                    <div class="min-w-0">
                      <p class="text-sm font-bold text-on-surface truncate">{{ user.first_name }} {{ user.last_name }}</p>
                      <p class="text-xs text-outline truncate">{{ user.email }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <span
                    [class.bg-primary/10]="user.role === 'admin'" [class.text-primary]="user.role === 'admin'"
                    [class.bg-secondary/10]="user.role === 'commercial'" [class.text-secondary]="user.role === 'commercial'"
                    class="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                     {{ user.role }}
                  </span>
                </td>
                <td class="px-6 py-4 text-center text-sm font-bold text-on-surface">{{ user.clients_count || 0 }}</td>
                <td class="px-6 py-4 text-center text-sm font-bold text-on-surface">{{ user.prospects_count || 0 }}</td>
                <td class="px-6 py-4">
                  <div class="flex items-center justify-end gap-2">
                    <a *ngIf="showPerformanceLink(user)" (click)="goToPerformance(user.id)" title="Performances"
                       class="w-9 h-9 rounded-xl bg-surface-container-low text-primary flex items-center justify-center hover:bg-primary/10 transition-colors cursor-pointer">
                       <span class="material-symbols-outlined text-lg">monitoring</span>
                    </a>
                    <a [routerLink]="['/equipe/editer', user.id]" title="Éditer"
                       class="w-9 h-9 rounded-xl bg-surface-container-low text-on-surface flex items-center justify-center hover:bg-surface-container-high transition-colors">
                       <span class="material-symbols-outlined text-lg">edit</span>
                    </a>
                    <button type="button" (click)="prepareDelete(user)" title="Supprimer ou Réattribuer"
                       class="w-9 h-9 rounded-xl bg-error/10 text-error flex items-center justify-center hover:bg-error hover:text-white transition-colors">
                       <span class="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="users().length === 0">
                <td colspan="5" class="px-6 py-20 text-center text-outline/60 italic">
                  Aucun collaborateur ne correspond à ces critères.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section *ngIf="viewMode() === 'cards'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         <div *ngIf="loading()" class="col-span-full py-24 flex flex-col items-center justify-center text-outline">
            <span class="material-symbols-outlined animate-spin text-primary text-5xl mb-3">sync</span>
            <p class="font-medium">Chargement de l'équipe…</p>
         </div>

         <ng-container *ngIf="!loading()">
            <div *ngFor="let user of users()" class="bg-white p-8 rounded-[2rem] border border-outline-variant/10 shadow-sm relative group overflow-hidden flex flex-col">
               <div class="flex items-start justify-between mb-6">
                  <div class="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center text-on-surface text-xl font-black">
                     {{ user.first_name.charAt(0) }}{{ user.last_name.charAt(0) }}
                  </div>
                  <span 
                    [class.bg-primary/10]="user.role === 'admin'" [class.text-primary]="user.role === 'admin'"
                    [class.bg-secondary/10]="user.role === 'commercial'" [class.text-secondary]="user.role === 'commercial'"
                    class="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                     {{ user.role }}
                  </span>
               </div>
               
               <h3 class="text-xl font-headline font-black text-on-surface">{{ user.first_name }} {{ user.last_name }}</h3>
               <p class="text-xs font-bold text-outline mt-1 mb-6 flex items-center gap-2">
                  <span class="material-symbols-outlined text-[14px]">mail</span>
                  {{ user.email }}
               </p>

               <div class="grid grid-cols-2 gap-4 mb-8 pt-6 border-t border-outline-variant/10">
                  <div>
                     <p class="text-[9px] font-black uppercase text-outline tracking-widest">Clients</p>
                     <p class="text-lg font-black text-on-surface">{{ user.clients_count || 0 }}</p>
                  </div>
                  <div>
                     <p class="text-[9px] font-black uppercase text-outline tracking-widest">Prospects</p>
                     <p class="text-lg font-black text-on-surface">{{ user.prospects_count || 0 }}</p>
                  </div>
               </div>

               <button *ngIf="showPerformanceLink(user)" type="button" (click)="goToPerformance(user.id)" class="w-full py-3 mb-3 bg-surface-container-low border border-outline-variant/10 rounded-xl text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/5 transition-colors flex justify-center items-center gap-2">
                  <span class="material-symbols-outlined text-[14px]">monitoring</span>
                  Performances
               </button>

               <div class="mt-auto flex items-center gap-3 pt-4 opacity-100 group-hover:opacity-100 transition-opacity">
                  <a [routerLink]="['/equipe/editer', user.id]" class="flex-1 py-3 rounded-xl bg-surface-container text-[10px] font-black text-on-surface uppercase tracking-widest hover:bg-surface-container-high transition-colors text-center">
                     Éditer
                  </a>
                  <button type="button" (click)="prepareDelete(user)" class="w-12 h-12 rounded-xl bg-error/10 text-error flex items-center justify-center hover:bg-error hover:text-white transition-colors" title="Supprimer ou Réattribuer">
                     <span class="material-symbols-outlined text-lg">delete</span>
                  </button>
               </div>
            </div>

            <div *ngIf="users().length === 0" class="col-span-full py-20 flex flex-col items-center justify-center bg-surface-container-low text-outline/30 rounded-[3rem] border-2 border-dashed border-outline-variant/20 italic">
               <span class="material-symbols-outlined text-6xl mb-4">group_off</span>
               <p>Aucun collaborateur ne correspond à ces critères.</p>
            </div>
         </ng-container>
      </section>

      <div *ngIf="userToDelete()" class="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 py-10">
         <div class="absolute inset-0 bg-[#0f172a]/80 backdrop-blur-sm" (click)="cancelDelete()"></div>
         <div class="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl p-10 animate-fade-in">
            <h3 class="text-2xl font-headline font-black text-error mb-2">Attention</h3>
            <p class="text-sm font-medium text-outline mb-8">
               Si <strong>{{ userToDelete()?.first_name }}</strong> possède encore des clients ou prospects gérés, vous devez obligatoirement réattribuer sa base avant de supprimer son compte.
            </p>

            <div class="mb-8" *ngIf="(userToDelete()?.clients_count! + userToDelete()?.prospects_count!) > 0">
               <label class="text-[11px] font-bold uppercase tracking-wider text-outline ml-1">Réattribuer le portefeuille à :</label>
               <select [(ngModel)]="newCommercialId" class="w-full mt-2 bg-surface-container-low border-none rounded-xl p-4 text-sm font-bold text-on-surface outline-none appearance-none cursor-pointer">
                  <option [ngValue]="0">--- Sélectionner un collaborateur ---</option>
                  <ng-container *ngFor="let coll of reassignCandidates()">
                     <option *ngIf="coll.id !== userToDelete()?.id && coll.role === 'commercial'" [ngValue]="coll.id">
                        {{ coll.first_name }} {{ coll.last_name }}
                     </option>
                  </ng-container>
               </select>
            </div>

            <div class="flex gap-4">
               <button type="button" (click)="cancelDelete()" class="flex-1 py-4 bg-surface-container text-on-surface text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-surface-container-high transition-colors">Annuler</button>
               <button type="button" (click)="confirmDeleteOrReassign()" class="flex-1 py-4 bg-error text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-error/20">
                  {{ (userToDelete()?.clients_count! + userToDelete()?.prospects_count!) > 0 ? 'Réattribuer & Supprimer' : 'Supprimer Définitivement' }}
               </button>
            </div>
         </div>
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .animate-fade-in { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class TeamListComponent implements OnInit {
  users = signal<User[]>([]);
  meta = signal<PaginatedMeta | null>(null);
  reassignCandidates = signal<User[]>([]);
  userToDelete = signal<User | null>(null);
  newCommercialId: number = 0;
  loading = signal(true);

  searchText = '';
  filterRole = '';
  page = signal(1);
  perPage = signal(12);
  viewMode = signal<'cards' | 'list'>('cards');

  private search$ = new Subject<string>();
  private teamService = inject(TeamService);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  /** Performances : admin voit tous les commerciaux ; un commercial ne voit que la sienne. */
  showPerformanceLink(user: User): boolean {
    if (user.role !== 'commercial') return false;
    const me = this.authService.getCurrentUser();
    if (!me) return false;
    if (me.role === 'admin') return true;
    return me.role === 'commercial' && me.id === user.id;
  }

  ngOnInit(): void {
    this.search$
      .pipe(debounceTime(320), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(1);
        this.loadTeam();
      });
    this.loadTeam();
  }

  metaLastPage(): number {
    const m = this.meta();
    return m?.last_page && m.last_page > 0 ? m.last_page : 1;
  }

  onSearchInput(value: string): void {
    this.searchText = value;
    this.search$.next(value.trim());
  }

  onFilterChange(): void {
    this.page.set(1);
    this.loadTeam();
  }

  setPerPage(n: number): void {
    this.perPage.set(n);
    this.page.set(1);
    this.loadTeam();
  }

  goPage(delta: number): void {
    const m = this.meta();
    const cur = m?.current_page ?? 1;
    const last = this.metaLastPage();
    const next = Math.min(last, Math.max(1, cur + delta));
    if (next === cur) return;
    this.page.set(next);
    this.loadTeam();
  }

  loadTeam(): void {
    this.loading.set(true);
    this.teamService
      .getPaged({
        page: this.page(),
        per_page: this.perPage(),
        role: this.filterRole || undefined,
        search: this.searchText.trim() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.users.set(res.data);
          this.meta.set(res.meta);
          this.loading.set(false);
        },
        error: (err) => {
          console.error(err);
          this.loading.set(false);
          this.toastService.error('Erreur de chargement.');
        },
      });
  }

  goToPerformance(id: number) {
     this.router.navigate(['/equipe', id, 'performances']);
  }

  prepareDelete(user: User) {
     this.userToDelete.set(user);
     this.newCommercialId = 0;
     if (this.reassignCandidates().length === 0) {
        this.teamService.getAll('commercial').subscribe({
           next: (list) => this.reassignCandidates.set(list),
           error: () => this.reassignCandidates.set([]),
        });
     }
  }

  cancelDelete() {
     this.userToDelete.set(null);
     this.newCommercialId = 0;
  }

  confirmDeleteOrReassign() {
     const user = this.userToDelete();
     if (!user) return;

     const hasClients = (user.clients_count || 0) + (user.prospects_count || 0) > 0;

     if (hasClients) {
        if (this.newCommercialId === 0) {
           this.toastService.error('Veuillez sélectionner un remplaçant.');
           return;
        }

        this.teamService.reassignClients(user.id, this.newCommercialId).subscribe({
           next: () => {
              this.toastService.success('Clients réattribués. Suppression en cours...');
              this.deleteUser(user.id);
           },
           error: (err) => this.toastService.error(err.error?.message || 'Erreur lors de la réattribution.')
        });
     } else {
        this.deleteUser(user.id);
     }
  }

  private deleteUser(id: number) {
     this.teamService.delete(id).subscribe({
        next: () => {
          this.toastService.success('Collaborateur supprimé avec succès.');
          this.cancelDelete();
          this.loadTeam();
        },
        error: (err) => this.toastService.error(err.error?.message || 'Erreur lors de la suppression.')
     });
  }
}
