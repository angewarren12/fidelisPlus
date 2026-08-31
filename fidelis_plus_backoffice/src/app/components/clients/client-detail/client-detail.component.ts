import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AccountService } from '../../../services/account.service';
import { VehicleService, Vehicle, VehicleImportResult } from '../../../services/vehicle.service';
import { ToastService } from '../../../services/toast.service';
import { AuthService } from '../../../services/auth.service';
import { SubscriptionContractService } from '../../../services/subscription-contract.service';
import { ConfirmModalComponent } from '../../ui/confirm-modal/confirm-modal.component';
import { vehicleStatusLabel, vehicleStatusBadgeClass } from '../../../utils/vehicle-status';

@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ConfirmModalComponent, FormsModule],
  template: `
    <div class="animate-fade-in-up" *ngIf="client()">
      <!-- Header Section -->
      <header class="bg-white pt-8 pb-12 px-8 border-b border-outline-variant/10 rounded-t-3xl shadow-sm">
        <div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div class="flex items-center gap-8">
            <div class="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-surface-container-highest flex items-center justify-center overflow-hidden shadow-2xl shadow-primary/10">
              <div class="w-full h-full bg-primary-container/20 flex items-center justify-center text-primary font-bold text-4xl">
                {{ client()?.name?.substring(0, 2)?.toUpperCase() }}
              </div>
            </div>
            <div>
              <nav class="flex items-center gap-2 text-[10px] font-black text-outline uppercase tracking-[0.2em] mb-3">
                <a routerLink="/clients" class="hover:text-primary transition-colors cursor-pointer">Clients</a>
                <span class="material-symbols-outlined text-xs">chevron_right</span>
                <span class="text-primary">Profil Détail</span>
              </nav>
              <div class="flex items-center gap-4 mb-4">
                <h2 class="text-3xl md:text-5xl font-headline font-extrabold tracking-tight text-on-surface">{{ client()?.name }}</h2>
                <span class="px-4 py-1.5 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-black uppercase tracking-widest shadow-sm">Actif</span>
                <!-- Badge Code Client Odoo -->
                <ng-container *ngIf="client()?.odoo_client_code">
                  <span class="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm flex items-center gap-1.5"
                    [class]="client()?.odoo_is_mayelia_customer
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'">
                    <span class="material-symbols-outlined text-xs">verified</span>
                    {{ client()?.odoo_client_code }}
                  </span>
                  <span *ngIf="client()?.odoo_is_mayelia_customer"
                    class="px-3 py-1.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest shadow-md shadow-emerald-200 flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-xs">workspace_premium</span>
                    Client Officiel Mayelia
                  </span>
                </ng-container>
              </div>
              <div class="flex flex-wrap items-center gap-6 text-outline font-semibold text-sm">
                <div class="flex items-center gap-2 px-3 py-1 bg-surface-container-low rounded-lg" *ngIf="client()?.contacts?.length">
                  <span class="material-symbols-outlined text-primary text-lg">person</span>
                  <span>{{ client()?.contacts?.[0]?.first_name }} {{ client()?.contacts?.[0]?.last_name }}</span>
                </div>
                <div class="flex items-center gap-2 px-3 py-1 bg-surface-container-low rounded-lg" *ngIf="client()?.sector">
                  <span class="material-symbols-outlined text-primary text-lg">category</span>
                  <span>{{ client()?.sector }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="flex flex-col gap-3 min-w-[240px]">
            <a [routerLink]="['/vente/nouveau']" [queryParams]="{ company_id: client()!.id }"
              class="w-full px-8 py-3.5 rounded-xl font-headline font-bold text-sm bg-gradient-to-br from-primary to-secondary text-white shadow-xl shadow-primary/25 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 text-center no-underline">
              <span class="material-symbols-outlined">description</span>
              Créer un devis
            </a>
            <div class="grid grid-cols-2 gap-3">
              <button [routerLink]="['/clients', client().id, 'vehicules', 'nouveau']" class="px-4 py-3 rounded-xl font-headline font-bold text-xs bg-primary text-white hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-sm shadow-primary/20">
                <span class="material-symbols-outlined text-sm">add</span>
                Véhicule
              </button>
              <button [routerLink]="['/clients', client().id, 'modifier']" class="px-4 py-3 rounded-xl font-headline font-bold text-xs bg-white border border-outline-variant/30 text-on-surface hover:bg-surface-container transition-all flex items-center justify-center gap-2">
                <span class="material-symbols-outlined text-sm">edit</span>
                Modifier
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- Stats Bar -->
      <section class="bg-[#1b1932] py-12 rounded-b-3xl mb-8">
        <div class="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div class="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10">
            <span class="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-4 block">Parc Total</span>
            <div class="flex items-end gap-3">
              <span class="text-4xl font-headline font-black text-white leading-none">{{ vehicles().length || 0 }}</span>
              <span class="text-xs font-bold text-white/60 mb-1 uppercase tracking-wider">Véhicules</span>
            </div>
          </div>
          <div class="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10">
            <span class="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-4 block">À Jour</span>
            <div class="flex items-end gap-3">
              <span class="text-4xl font-headline font-black text-[#15b9a3] leading-none">{{ countByStatus('a_jour') }}</span>
              <span class="text-xs font-bold text-white/60 mb-1 uppercase tracking-wider">Flotte</span>
            </div>
          </div>
          <div class="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10">
            <span class="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-4 block">Aperçu Solde</span>
            <div class="flex items-end gap-3">
              <span class="text-3xl font-headline font-black text-white leading-none">{{ (client()?.balance || 0) | number:'1.0-0' }}</span>
              <span class="text-[10px] font-bold text-white/60 mb-1 tracking-widest uppercase">FCFA</span>
            </div>
          </div>
          <div class="bg-primary/20 backdrop-blur-md rounded-2xl p-6 border border-primary/20 flex flex-col justify-between">
            <span class="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2 block">Statut Financier</span>
            <div class="bg-secondary text-white text-[10px] font-black px-3 py-1.5 rounded-lg w-fit uppercase tracking-widest shadow-lg shadow-secondary/20">
              Solvabilité élevée
            </div>
          </div>
        </div>
      </section>

      <div class="max-w-7xl mx-auto py-8">
        <div class="grid grid-cols-12 gap-8 lg:gap-12 px-4 md:px-8">
          
          <!-- Column: Info & Contacts (Left) -->
          <div class="col-span-12 lg:col-span-4 space-y-12">
            <!-- Coordonnées -->
            <div class="space-y-6">
              <div class="flex items-center justify-between">
                <h3 class="text-xl font-headline font-extrabold text-on-surface">Coordonnées</h3>
                <button [routerLink]="['/clients', client().id, 'modifier']" class="text-primary hover:bg-primary/10 p-2 rounded-lg transition-colors">
                   <span class="material-symbols-outlined text-lg">edit_note</span>
                </button>
              </div>
              <div class="bg-white rounded-3xl border border-outline-variant/10 shadow-sm divide-y divide-outline-variant/10">
                <div class="p-6">
                  <span class="text-[10px] font-bold text-outline uppercase tracking-widest mb-1 shadow-sm block">Registre de Commerce (RCCM)</span>
                  <p class="font-bold text-on-surface">{{ client()?.rccm || 'N/A' }}</p>
                </div>
                <div class="p-6">
                  <span class="text-[10px] font-bold text-outline uppercase tracking-widest mb-1 block">Téléphone</span>
                  <ng-container *ngIf="client()?.phone; else noClientPhone">
                    <a class="font-bold text-on-surface hover:text-primary transition-colors" [href]="'tel:' + client()?.phone">{{ client()?.phone }}</a>
                  </ng-container>
                  <ng-template #noClientPhone>
                    <p class="font-bold text-on-surface">Non renseigné</p>
                  </ng-template>
                </div>
                <div class="p-6">
                  <span class="text-[10px] font-bold text-outline uppercase tracking-widest mb-1 block">Email</span>
                  <ng-container *ngIf="client()?.email; else noClientEmail">
                    <a class="font-bold text-on-surface hover:text-primary transition-colors" [href]="'mailto:' + client()?.email">{{ client()?.email }}</a>
                  </ng-container>
                  <ng-template #noClientEmail>
                    <p class="font-bold text-on-surface">Non renseigné</p>
                  </ng-template>
                </div>
                <div class="p-6">
                  <span class="text-[10px] font-bold text-outline uppercase tracking-widest mb-1 block">Adresse siège</span>
                  <p class="font-bold text-on-surface leading-relaxed">{{ client()?.address || 'Non renseignée' }}</p>
                </div>
                <div class="p-6" *ngIf="client()?.city || client()?.zip_code">
                  <span class="text-[10px] font-bold text-outline uppercase tracking-widest mb-1 block">Localisation</span>
                  <p class="font-bold text-on-surface leading-relaxed">
                    <span *ngIf="client()?.city">{{ client()?.city }}</span><span *ngIf="client()?.city && client()?.zip_code">, </span><span *ngIf="client()?.zip_code">{{ client()?.zip_code }}</span>
                  </p>
                </div>
                <!-- Code Client Odoo -->
                <div class="p-6 bg-emerald-50/50 rounded-b-3xl" *ngIf="client()?.odoo_client_code">
                  <span class="text-[10px] font-bold text-outline uppercase tracking-widest mb-1 block">Code Client Odoo</span>
                  <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-emerald-600 text-base">lan</span>
                    <p class="font-bold text-emerald-700 font-mono">{{ client()?.odoo_client_code }}</p>
                    <span *ngIf="client()?.odoo_is_mayelia_customer"
                      class="ml-auto px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest">
                      Mayelia Officiel
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Contacts Section -->
            <div class="space-y-6">
              <div class="flex items-center justify-between">
                <h3 class="text-xl font-headline font-extrabold text-on-surface">Correspondants</h3>
                <button
                  [routerLink]="['/clients', client().id, 'contacts', 'nouveau']"
                  class="px-4 py-2.5 rounded-xl font-headline font-bold text-xs bg-primary text-white hover:brightness-110 transition-all flex items-center gap-2 shadow-sm shadow-primary/20"
                >
                  <span class="material-symbols-outlined text-sm">person_add</span>
                  Ajouter un correspondant
                </button>
              </div>
              <div class="space-y-4">
                <div *ngFor="let contact of client()?.contacts" class="bg-white p-5 rounded-3xl border border-outline-variant/10 shadow-sm flex items-center justify-between group hover:border-primary/30 transition-all">
                  <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl bg-surface-container-high flex items-center justify-center text-primary font-bold text-lg">
                      {{ contact.first_name?.charAt(0) }}{{ contact.last_name?.charAt(0) }}
                    </div>
                    <div>
                      <h4 class="font-bold text-on-surface text-sm">{{ contact.first_name }} {{ contact.last_name }}</h4>
                      <p class="text-[11px] text-outline font-medium uppercase tracking-tighter">{{ contact.position || 'Responsable' }}</p>
                      <div class="mt-2 space-y-1">
                        <div *ngIf="contact.phone" class="flex items-center gap-2 text-xs font-bold text-on-surface">
                          <span class="material-symbols-outlined text-sm text-outline">call</span>
                          <a class="hover:text-primary transition-colors" [href]="'tel:' + contact.phone">{{ contact.phone }}</a>
                        </div>
                        <div *ngIf="contact.email" class="flex items-center gap-2 text-xs font-bold text-on-surface">
                          <span class="material-symbols-outlined text-sm text-outline">mail</span>
                          <a class="hover:text-primary transition-colors" [href]="'mailto:' + contact.email">{{ contact.email }}</a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div *ngIf="!client()?.contacts?.length" class="bg-white p-8 rounded-3xl border border-dashed border-outline-variant/20 text-center text-outline text-xs font-bold">
                  Aucun correspondant enregistré.
                </div>
              </div>
            </div>
          </div>

          <!-- Column: Fleet (Right) -->
          <div class="col-span-12 lg:col-span-8 space-y-8">
            <!-- Tabs Header -->
            <div class="flex items-center justify-between border-b border-outline-variant/10 pb-4 mb-6">
              <div class="flex gap-8">
                <button (click)="activeTab.set('fleet')"
                        [class]="'text-lg font-headline font-extrabold pb-2 relative transition-all ' + (activeTab() === 'fleet' ? 'text-primary border-b-2 border-primary' : 'text-outline hover:text-on-surface')">
                  Parc Automobile
                </button>
              </div>
              <!-- Action Buttons for Parc Automobile -->
              <div *ngIf="activeTab() === 'fleet'" class="flex items-center gap-3">
                <button (click)="openImportModal()" class="px-5 py-2.5 rounded-xl bg-white border border-outline-variant/30 text-on-surface text-xs font-bold flex items-center gap-2 hover:bg-surface-container transition-all">
                  <span class="material-symbols-outlined text-sm">upload_file</span> Importer (Excel)
                </button>
                <button [routerLink]="['/clients', client().id, 'vehicules', 'nouveau']" class="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-all">
                  <span class="material-symbols-outlined text-sm">add</span> Nouveau Véhicule
                </button>
              </div>
            </div>

            <!-- Tab: Fleet (Vehicles) -->
            <div *ngIf="activeTab() === 'fleet'" class="space-y-6">

              <!-- Search + view toggle -->
              <div class="flex flex-wrap items-center gap-3">
                <div class="relative flex-1 min-w-[220px]">
                  <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]" aria-hidden="true">search</span>
                  <input type="text" [(ngModel)]="fleetSearch"
                         placeholder="Rechercher par plaque, marque, modèle..."
                         class="w-full pl-10 pr-4 py-2.5 bg-white border border-outline-variant/20 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20">
                </div>
                <div class="flex items-center gap-1 bg-surface-container-low rounded-xl p-1">
                  <button type="button" (click)="fleetView.set('grid')" title="Vue grille"
                          [class]="'w-9 h-9 rounded-lg flex items-center justify-center transition-all ' + (fleetView() === 'grid' ? 'bg-white text-primary shadow-sm' : 'text-outline hover:text-on-surface')">
                    <span class="material-symbols-outlined text-lg">grid_view</span>
                  </button>
                  <button type="button" (click)="fleetView.set('list')" title="Vue liste"
                          [class]="'w-9 h-9 rounded-lg flex items-center justify-center transition-all ' + (fleetView() === 'list' ? 'bg-white text-primary shadow-sm' : 'text-outline hover:text-on-surface')">
                    <span class="material-symbols-outlined text-lg">view_list</span>
                  </button>
                </div>
              </div>

              <div *ngIf="loadingVehicles()" class="flex justify-center py-20">
                <span class="material-symbols-outlined animate-spin text-primary text-5xl">sync</span>
              </div>

              <div *ngIf="!loadingVehicles() && filteredVehicles().length === 0" class="bg-white p-10 rounded-3xl border border-dashed border-outline-variant/20 text-center text-outline text-sm font-bold">
                Aucun véhicule ne correspond à votre recherche.
              </div>

              <!-- List view -->
              <div *ngIf="!loadingVehicles() && fleetView() === 'list' && filteredVehicles().length > 0" class="bg-white rounded-3xl border border-outline-variant/10 shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                  <table class="w-full text-left border-collapse">
                    <thead>
                      <tr class="bg-surface-container-low border-b border-outline-variant/30">
                        <th class="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest">Plaque</th>
                        <th class="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest">Marque / Modèle</th>
                        <th class="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest">Statut</th>
                        <th class="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest">Dernière visite</th>
                        <th class="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-outline-variant/10">
                      <tr *ngFor="let v of filteredVehicles()" class="hover:bg-surface-container-low/50 transition-colors">
                        <td class="px-6 py-4">
                          <span class="font-headline font-black text-on-surface">{{ v.license_plate }}</span>
                        </td>
                        <td class="px-6 py-4 text-sm text-outline">{{ v.brand }} {{ v.model || '' }} {{ v.year ? '• ' + v.year : '' }}</td>
                        <td class="px-6 py-4">
                          <span class="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest" [ngClass]="statusBadgeClass(v.status)">
                            {{ statusLabel(v.status) }}
                          </span>
                        </td>
                        <td class="px-6 py-4 text-xs font-bold text-outline">{{ v.last_visit ? (v.last_visit | date:'dd MMM yyyy') : 'Jamais entretenu' }}</td>
                        <td class="px-6 py-4">
                          <div class="flex justify-end gap-2">
                            <button (click)="deleteVehicle(v)" class="w-9 h-9 rounded-xl bg-surface-container-low flex items-center justify-center text-outline hover:bg-error/10 hover:text-error transition-all">
                              <span class="material-symbols-outlined text-lg">delete</span>
                            </button>
                            <button [routerLink]="['/clients', client().id, 'vehicules', v.id]" class="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center hover:scale-110 transition-all shadow-md">
                              <span class="material-symbols-outlined text-lg">arrow_forward</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Grid view -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6" *ngIf="!loadingVehicles() && fleetView() === 'grid'">
                <div *ngFor="let v of filteredVehicles()" class="group bg-white p-0 rounded-3xl border border-outline-variant/10 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden">
                  <!-- Vehicle Images Gallery -->
                  <div class="relative h-48 bg-surface-container overflow-hidden">
                    <div *ngIf="!v.photos || v.photos.length === 0" class="w-full h-full flex items-center justify-center text-outline/30">
                      <span class="material-symbols-outlined text-6xl">no_crash</span>
                    </div>
                    <div *ngIf="v.photos && v.photos.length > 0" class="flex h-full w-full">
                      <img *ngFor="let photo of v.photos.slice(0, 3)" [src]="photo.path" 
                           [class]="'h-full object-cover ' + (v.photos.length === 1 ? 'w-full' : (v.photos.length === 2 ? 'w-1/2' : 'w-1/3'))">
                    </div>
                    <div class="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg text-[9px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                      <span class="material-symbols-outlined text-xs">photo_camera</span>
                      {{ v.photos?.length || 0 }}
                    </div>
                  </div>

                  <div class="p-6 pt-5">
                    <div class="flex justify-between items-start mb-4">
                      <div class="bg-surface-container-low px-3 py-1 rounded-lg text-[9px] font-black text-primary uppercase tracking-widest">{{ v.brand }}</div>
                      <div class="flex items-center gap-2">
                         <!-- Badges Admin -->
                         <span *ngIf="hasDoc(v, 'carte_grise')" class="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center" title="Carte Grise Disponible">
                           <span class="material-symbols-outlined text-sm">description</span>
                         </span>
                         <span *ngIf="hasDoc(v, 'vignette')" class="w-6 h-6 rounded-full bg-secondary/10 text-secondary flex items-center justify-center" title="Vignette Disponible">
                           <span class="material-symbols-outlined text-sm">confirmation_number</span>
                         </span>
                         <span [class]="'px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ' + (v.status === 'a_jour' ? 'bg-secondary-container/20 text-secondary border-secondary/10' : 'bg-error/10 text-error border-error/10')">
                           {{ v.status === 'a_jour' ? 'À jour' : 'En retard' }}
                         </span>
                      </div>
                    </div>
                    
                    <h4 class="text-2xl font-headline font-black text-on-surface tracking-tight leading-none mb-1">{{ v.license_plate }}</h4>
                    <p class="text-xs text-outline font-medium mb-6">{{ v.model || 'Modèle non spécifié' }} {{ v.year ? '• ' + v.year : '' }}</p>

                    <div class="flex items-center justify-between pt-5 border-t border-outline-variant/5">
                      <div class="flex flex-col">
                        <span class="text-[9px] font-extrabold text-outline uppercase tracking-widest mb-0.5">Dernière visite</span>
                        <span class="text-xs font-bold">{{ v.last_visit ? (v.last_visit | date:'dd MMM yyyy') : 'Jamais entretenu' }}</span>
                      </div>
                      <div class="flex gap-2">
                        <button (click)="deleteVehicle(v)" class="w-9 h-9 rounded-xl bg-surface-container-low flex items-center justify-center text-outline hover:bg-error/10 hover:text-error transition-all">
                          <span class="material-symbols-outlined text-lg">delete</span>
                        </button>
                        <button [routerLink]="['/clients', client().id, 'vehicules', v.id]" class="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center hover:scale-110 transition-all shadow-md">
                          <span class="material-symbols-outlined text-lg">arrow_forward</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

    <!-- Modals -->
    <app-confirm-modal *ngIf="vehicleToDelete()"
      title="Retirer le véhicule"
      [message]="'Voulez-vous vraiment retirer le véhicule immatriculé ' + vehicleToDelete()?.license_plate + ' ?'"
      confirmText="Oui, retirer"
      cancelText="Annuler"
      (confirm)="onConfirmDeleteVehicle()"
      (cancel)="vehicleToDelete.set(null)">
    </app-confirm-modal>

    <!-- Import Excel Modal -->
    <div *ngIf="showImportModal()" class="fixed inset-0 z-[200] overflow-y-auto flex items-start justify-center p-4 py-10 bg-[#1b1932]/40 backdrop-blur-sm animate-fade-in">
      <div class="bg-white w-full max-w-xl rounded-[2rem] shadow-2xl overflow-hidden border border-outline-variant/10 p-8 max-h-[90vh] overflow-y-auto">

        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-headline font-black text-on-surface">Importer la flotte (Excel)</h3>
          <button (click)="closeImportModal()" aria-label="Fermer" class="text-outline hover:text-on-surface p-1">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="bg-primary/5 border border-primary/10 rounded-2xl p-5 mb-6 flex items-start gap-4">
          <span class="material-symbols-outlined text-primary text-2xl">info</span>
          <div class="text-sm text-on-surface leading-relaxed">
            <p class="font-bold mb-1">1. Téléchargez le modèle</p>
            <p class="text-outline text-xs mb-3">Remplissez-le avec la flotte du client, puis importez-le ci-dessous. Seule l'immatriculation est obligatoire.</p>
            <button (click)="downloadTemplate()" [disabled]="downloadingTemplate()" class="px-4 py-2 rounded-xl bg-white border border-primary/30 text-primary text-xs font-bold hover:bg-primary/5 transition-all flex items-center gap-2 disabled:opacity-50">
              <span class="material-symbols-outlined text-sm" [class.animate-spin]="downloadingTemplate()">{{ downloadingTemplate() ? 'sync' : 'download' }}</span>
              Télécharger le modèle Excel
            </button>
          </div>
        </div>

        <p class="text-xs font-bold uppercase tracking-widest text-outline mb-2">2. Importer le fichier rempli</p>
        <div (click)="importFileInput.click()"
             [class]="'group border-2 border-dashed rounded-2xl p-8 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 mb-6 ' + (selectedImportFile ? 'border-primary bg-primary/5' : 'border-outline-variant/40 hover:border-primary/50 hover:bg-surface-container-low')">
          <span class="material-symbols-outlined text-4xl" [class.text-primary]="selectedImportFile">{{ selectedImportFile ? 'description' : 'upload_file' }}</span>
          <p class="text-xs font-bold text-center">{{ selectedImportFile ? selectedImportFile.name : 'Choisir le fichier Excel rempli (.xlsx)' }}</p>
          <input #importFileInput type="file" (change)="handleImportFile($event)" accept=".xlsx,.xls,.csv" class="hidden">
        </div>

        <div *ngIf="importResult() as result" class="mb-6 space-y-3">
          <div class="flex items-center gap-4">
            <div class="flex-1 bg-teal-50 rounded-xl p-4 text-center">
              <p class="text-2xl font-black text-primary">{{ result.created }}</p>
              <p class="text-[10px] font-bold uppercase tracking-widest text-primary/70">Véhicules importés</p>
            </div>
            <div class="flex-1 bg-red-50 rounded-xl p-4 text-center">
              <p class="text-2xl font-black text-error">{{ result.errors_count }}</p>
              <p class="text-[10px] font-bold uppercase tracking-widest text-error/70">Lignes en erreur</p>
            </div>
          </div>

          <div *ngIf="result.errors.length > 0" class="bg-surface-container-low rounded-xl p-4 max-h-48 overflow-y-auto space-y-2">
            <div *ngFor="let err of result.errors" class="text-xs flex items-start gap-2">
              <span class="font-bold text-error shrink-0">L{{ err.row }}{{ err.license_plate ? ' · ' + err.license_plate : '' }} :</span>
              <span class="text-outline">{{ err.message }}</span>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3">
          <button (click)="closeImportModal()" class="px-5 py-2.5 text-outline hover:text-on-surface font-bold text-xs uppercase tracking-widest transition-colors">
            {{ importResult() ? 'Fermer' : 'Annuler' }}
          </button>
          <button *ngIf="!importResult()" (click)="submitImport()" [disabled]="!selectedImportFile || importing()"
                  class="px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 disabled:opacity-40 transition-all flex items-center gap-2">
            <span class="material-symbols-outlined text-sm animate-spin" *ngIf="importing()">sync</span>
            {{ importing() ? 'Import en cours…' : "Lancer l'import" }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    /* Pas de transform sur cette anim: un transform sur ce conteneur racine casserait le
       "position: fixed" des modals imbriqués (import Excel, suppression véhicule...). */
    .animate-fade-in-up {
      animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes fadeInUp {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @media print {
      body * {
        visibility: hidden !important;
      }
      #printable-contract, #printable-contract * {
        visibility: visible !important;
      }
      #printable-contract {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
        border: 2px solid #006b5d !important;
        padding: 2rem !important;
        border-radius: 1.5rem !important;
        background: white !important;
        color: black !important;
      }
    }
  `]
})
export class ClientDetailComponent implements OnInit {
  statusLabel = vehicleStatusLabel;
  statusBadgeClass = vehicleStatusBadgeClass;
  client = signal<any>(null);
  error = signal<string | null>(null);
  vehicles = signal<any[]>([]);
  loadingVehicles = signal(true);
  activeTab = signal<'fleet'>('fleet');
  fleetSearch = signal('');
  fleetView = signal<'grid' | 'list'>('grid');

  filteredVehicles = computed(() => {
    const q = this.fleetSearch().trim().toLowerCase();
    if (!q) return this.vehicles();
    return this.vehicles().filter((v: any) => {
      const haystack = [v.license_plate, v.brand, v.model].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  });

  showImportModal = signal(false);
  downloadingTemplate = signal(false);
  importing = signal(false);
  importResult = signal<VehicleImportResult | null>(null);
  selectedImportFile: File | null = null;

  private route = inject(ActivatedRoute);
  private accountService = inject(AccountService);
  private vehicleService = inject(VehicleService);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);

  ngOnInit(): void {
    this.refreshClientData();
  }

  refreshClientData(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.accountService.getClient(id).subscribe({
        next: (data) => {
          this.client.set(data);
          this.loadVehicles(+id);
        },
        error: (err) => {
          this.error.set('Données indisponibles.');
        }
      });
    }
  }

  loadVehicles(clientId: number): void {
    this.loadingVehicles.set(true);
    this.vehicleService.getByClient(clientId).subscribe({
      next: (data) => {
        this.vehicles.set(Array.isArray(data) ? data : []);
        this.loadingVehicles.set(false);
      },
      error: (err) => {
        this.loadingVehicles.set(false);
      }
    });
  }

  openImportModal(): void {
    this.selectedImportFile = null;
    this.importResult.set(null);
    this.showImportModal.set(true);
  }

  closeImportModal(): void {
    this.showImportModal.set(false);
    if (this.importResult()?.created) {
      const id = this.route.snapshot.paramMap.get('id');
      if (id) this.loadVehicles(+id);
    }
  }

  downloadTemplate(): void {
    this.downloadingTemplate.set(true);
    this.vehicleService.downloadImportTemplate().subscribe({
      next: (blob) => {
        this.downloadingTemplate.set(false);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'modele_import_flotte_fidelisplus.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.downloadingTemplate.set(false);
        this.toastService.error('Impossible de télécharger le modèle.');
      }
    });
  }

  handleImportFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.selectedImportFile = file;
      this.importResult.set(null);
    }
  }

  submitImport(): void {
    const client = this.client();
    if (!this.selectedImportFile || !client) return;

    this.importing.set(true);
    this.vehicleService.importFromExcel({ companyId: client.id }, this.selectedImportFile).subscribe({
      next: (result) => {
        this.importing.set(false);
        this.importResult.set(result);
        if (result.created > 0) {
          this.toastService.success(`${result.created} véhicule(s) importé(s).`);
        }
      },
      error: () => {
        this.importing.set(false);
        this.toastService.error("Erreur lors de l'import du fichier.");
      }
    });
  }

  hasDoc(v: any, type: string): boolean {
    return v.documents?.some((d: any) => d.type === type);
  }

  countByStatus(status: string): number {
    return this.vehicles().filter(v => v.status === status).length;
  }

  vehicleToDelete = signal<any>(null);

  deleteVehicle(v: any): void {
    this.vehicleToDelete.set(v);
  }

  onConfirmDeleteVehicle(): void {
    const v = this.vehicleToDelete();
    if (!v) return;

    this.vehicleService.delete(v.id).subscribe({
      next: () => {
        this.vehicles.update(vs => vs.filter(x => x.id !== v.id));
        this.toastService.success(`Le véhicule ${v.license_plate} a été retiré.`);
        this.vehicleToDelete.set(null);
      },
      error: () => {
        this.toastService.error('Action impossible.');
        this.vehicleToDelete.set(null);
      }
    });
  }
}
