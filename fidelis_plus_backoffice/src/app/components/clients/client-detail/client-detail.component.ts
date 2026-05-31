import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AccountService } from '../../../services/account.service';
import { VehicleService, Vehicle } from '../../../services/vehicle.service';
import { ToastService } from '../../../services/toast.service';
import { AuthService } from '../../../services/auth.service';
import { SubscriptionContractService } from '../../../services/subscription-contract.service';
import { ConfirmModalComponent } from '../../ui/confirm-modal/confirm-modal.component';

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
            <a *ngIf="showLoyaltyShortcut()" [routerLink]="['/marketing/fidelite']" [queryParams]="{ company_id: client()!.id }"
              class="w-full text-center text-xs font-black uppercase tracking-widest text-primary hover:underline py-1 no-underline">
              Carte fidélité — préremplir société
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
                  <span class="text-[10px] font-bold text-outline uppercase tracking-widest mb-1 shadow-sm block">SIRET / RC</span>
                  <p class="font-bold text-on-surface">{{ client()?.siret || 'N/A' }}</p>
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
                <div class="p-6" *ngIf="client()?.city || client()?.country">
                  <span class="text-[10px] font-bold text-outline uppercase tracking-widest mb-1 block">Localisation</span>
                  <p class="font-bold text-on-surface leading-relaxed">
                    {{ client()?.city || '' }}<span *ngIf="client()?.city && client()?.country">, </span>{{ client()?.country || '' }}
                  </p>
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
                <button *ngIf="client()?.category === 'entreprise'"
                        (click)="activeTab.set('contract')"
                        [class]="'text-lg font-headline font-extrabold pb-2 relative transition-all ' + (activeTab() === 'contract' ? 'text-primary border-b-2 border-primary' : 'text-outline hover:text-on-surface')">
                  Abonnement & Contrat
                </button>
              </div>
              <!-- Action Button for Parc Automobile -->
              <button *ngIf="activeTab() === 'fleet'" [routerLink]="['/clients', client().id, 'vehicules', 'nouveau']" class="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-all">
                <span class="material-symbols-outlined text-sm">add</span> Nouveau Véhicule
              </button>
            </div>

            <!-- Tab: Fleet (Vehicles) -->
            <div *ngIf="activeTab() === 'fleet'" class="space-y-6">
              <div *ngIf="loadingVehicles()" class="flex justify-center py-20">
                <span class="material-symbols-outlined animate-spin text-primary text-5xl">sync</span>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6" *ngIf="!loadingVehicles()">
                <div *ngFor="let v of vehicles()" class="group bg-white p-0 rounded-3xl border border-outline-variant/10 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden">
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

            <!-- Tab: Contract -->
            <div *ngIf="activeTab() === 'contract'" class="space-y-6">
              <!-- If Contract not exists or not signed -->
              <div *ngIf="!contract() || contract().status !== 'signed'" class="bg-white rounded-3xl p-8 border border-outline-variant/10 shadow-sm space-y-6">
                <div class="flex items-center gap-4 text-amber-500 bg-amber-50 p-4 rounded-2xl border border-amber-200">
                  <span class="material-symbols-outlined text-3xl">warning</span>
                  <div>
                    <h4 class="font-bold text-sm text-amber-800">Contrat d'abonnement non signé</h4>
                    <p class="text-xs text-amber-700">Ce client n'a pas encore de contrat d'abonnement actif. Pour les apporteurs d'affaires et flottes, la signature du contrat est requise.</p>
                  </div>
                </div>

                <div class="space-y-4">
                  <h4 class="font-headline font-bold text-lg text-on-surface">Avantages du Contrat Partenaire</h4>
                  <ul class="space-y-3 text-sm text-outline">
                    <li class="flex items-start gap-2">
                      <span class="material-symbols-outlined text-primary text-lg">check_circle</span>
                      <span><strong>Rémunération :</strong> Bons d'achat automatiques (10 000 FCFA à 20 scans, 15 000 FCFA à 30 scans, 25 000 FCFA à 50 scans).</span>
                    </li>
                    <li class="flex items-start gap-2">
                      <span class="material-symbols-outlined text-primary text-lg">check_circle</span>
                      <span><strong>Visite Offerte :</strong> Une visite technique offerte à partir de 50 passages cumulés.</span>
                    </li>
                    <li class="flex items-start gap-2">
                      <span class="material-symbols-outlined text-primary text-lg">check_circle</span>
                      <span><strong>Engagement :</strong> Collaboration sur une durée de 3 ans avec évaluation annuelle pour optimisation.</span>
                    </li>
                  </ul>
                </div>

                <button (click)="openContractModal()" class="w-full sm:w-auto px-6 py-3.5 rounded-xl font-headline font-bold text-sm bg-primary text-white shadow-xl shadow-primary/25 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                  <span class="material-symbols-outlined">edit_square</span>
                  Remplir la Fiche & Signer le Contrat
                </button>
              </div>

              <!-- If Contract exists and is signed -->
              <div *ngIf="contract() && contract().status === 'signed'" class="space-y-6">
                <!-- Document display container -->
                <div id="printable-contract" class="bg-white rounded-3xl p-8 md:p-12 border-2 border-primary/20 shadow-sm space-y-8 relative overflow-hidden">
                  <!-- Decorative top bar for Mayelia branding -->
                  <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-primary-container to-secondary"></div>
                  
                  <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-outline-variant/10 pb-6">
                    <div>
                      <div class="flex items-center gap-2 text-primary font-bold text-2xl tracking-wider uppercase font-headline">
                        <span class="material-symbols-outlined text-3xl">verified</span>
                        <span>Mayelia <span class="text-secondary font-black">Fidelis+</span></span>
                      </div>
                      <p class="text-[10px] text-outline font-black uppercase tracking-widest mt-1">FICHE D'IDENTIFICATION & DE CONTRAT D'ABONNEMENT</p>
                    </div>
                    <div class="flex items-center gap-2 px-4 py-2 bg-secondary-container/20 border border-secondary/15 rounded-xl text-secondary text-[11px] font-black uppercase tracking-widest">
                      <span class="material-symbols-outlined text-sm">verified_user</span>
                      <span>Contrat Actif & Signé</span>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                    <div class="space-y-6">
                      <h4 class="font-headline font-extrabold text-on-surface border-b border-outline-variant/5 pb-2">Informations Générales</h4>
                      <div class="space-y-4">
                        <div>
                          <span class="text-[10px] font-bold text-outline uppercase tracking-widest block mb-1">Raison sociale / Client</span>
                          <span class="font-bold text-on-surface text-base">{{ client()?.name }}</span>
                        </div>
                        <div>
                          <span class="text-[10px] font-bold text-outline uppercase tracking-widest block mb-1">Bénéficiaire / Signataire</span>
                          <span class="font-bold text-on-surface">{{ contract()?.subscriber_name }}</span>
                        </div>
                        <div>
                          <span class="text-[10px] font-bold text-outline uppercase tracking-widest block mb-1">Adresse ou Zone d'Activité</span>
                          <span class="font-bold text-on-surface">{{ contract()?.address_zone || 'Non spécifiée' }}</span>
                        </div>
                        <div>
                          <span class="text-[10px] font-bold text-outline uppercase tracking-widest block mb-1">Numéro de Carte Associé</span>
                          <span class="font-bold text-primary">{{ contract()?.card_number || 'Non spécifié' }}</span>
                        </div>
                      </div>
                    </div>

                    <div class="space-y-6">
                      <h4 class="font-headline font-extrabold text-on-surface border-b border-outline-variant/5 pb-2">Détails Contractuels</h4>
                      <div class="space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                          <div>
                            <span class="text-[10px] font-bold text-outline uppercase tracking-widest block mb-1">Date d'Abonnement</span>
                            <span class="font-bold text-on-surface">{{ contract()?.subscription_date | date:'dd MMMM yyyy' }}</span>
                          </div>
                          <div>
                            <span class="text-[10px] font-bold text-outline uppercase tracking-widest block mb-1">Période de Validité</span>
                            <span class="font-bold text-on-surface">3 ans (Renouvelable)</span>
                          </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                          <div>
                            <span class="text-[10px] font-bold text-outline uppercase tracking-widest block mb-1">Date Début</span>
                            <span class="font-bold text-on-surface">{{ contract()?.start_date | date:'dd/MM/yyyy' }}</span>
                          </div>
                          <div>
                            <span class="text-[10px] font-bold text-outline uppercase tracking-widest block mb-1">Date Échéance</span>
                            <span class="font-bold text-on-surface">{{ contract()?.end_date | date:'dd/MM/yyyy' }}</span>
                          </div>
                        </div>
                        <div>
                          <span class="text-[10px] font-bold text-outline uppercase tracking-widest block mb-1">Prochaine Évaluation Annuelle</span>
                          <span class="font-bold text-amber-600">{{ contract()?.annual_evaluation_date | date:'dd MMMM yyyy' }}</span>
                        </div>
                        <div>
                          <span class="text-[10px] font-bold text-outline uppercase tracking-widest block mb-1">Fréquence de Récompense</span>
                          <span class="font-bold text-on-surface">{{ contract()?.reward_frequency === 'monthly' ? 'Mensuelle' : 'Trimestrielle' }}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10 text-sm space-y-4">
                    <h5 class="font-headline font-bold text-primary flex items-center gap-2">
                      <span class="material-symbols-outlined">handshake</span>
                      Engagements Minimums & Réglementation
                    </h5>
                    <p class="text-xs text-outline leading-relaxed">
                      L'apporteur d'affaires s'engage à orienter un volume minimum estimé à <strong>10 véhicules par jour</strong> soit environ <strong>50 véhicules par mois</strong> vers la visite technique automobile. Le présent partenariat respecte strictement la réglementation relative au contrôle technique automobile et constitue également une protection juridique de parts et d'autres.
                    </p>
                  </div>

                  <!-- Signatures section inside contract -->
                  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-8 pt-6 border-t border-outline-variant/10">
                    <div class="space-y-1">
                      <span class="text-[10px] font-bold text-outline uppercase tracking-widest block">Statut Juridique</span>
                      <span class="text-xs font-semibold text-on-surface flex items-center gap-1">
                        <span class="material-symbols-outlined text-secondary text-sm">check_circle</span>
                        Signature Électronique Certifiée
                      </span>
                    </div>
                    <div class="text-right">
                      <span class="text-[10px] font-bold text-outline uppercase tracking-widest block mb-2">Signature du Bénéficiaire</span>
                      <span class="font-signature text-3xl text-primary font-bold block mb-1">{{ contract()?.subscriber_name }}</span>
                      <span class="text-[9px] text-outline font-bold">Signé le {{ contract()?.signed_at | date:'dd/MM/yyyy HH:mm' }}</span>
                    </div>
                  </div>
                </div>

                <div class="flex items-center gap-4">
                  <button (click)="printContract()" class="px-6 py-3 rounded-xl font-headline font-bold text-sm bg-primary text-white shadow-xl shadow-primary/20 hover:brightness-110 transition-all flex items-center gap-2">
                    <span class="material-symbols-outlined">print</span>
                    Imprimer le contrat
                  </button>
                  <button (click)="openContractModal()" class="px-6 py-3 rounded-xl font-headline font-bold text-sm bg-white border border-outline-variant/30 text-on-surface hover:bg-surface-container transition-all flex items-center gap-2">
                    <span class="material-symbols-outlined">edit</span>
                    Mettre à jour la fiche
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Contrat d'abonnement Modal -->
    <div *ngIf="showContractModal()" class="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      <!-- Backdrop with blur -->
      <div class="fixed inset-0 bg-[#161d1b]/40 backdrop-blur-sm transition-opacity" (click)="closeContractModal()"></div>
      
      <!-- Modal container -->
      <div class="bg-white rounded-3xl shadow-2xl border border-outline-variant/10 max-w-2xl w-full p-8 space-y-6 relative transform transition-all z-10 animate-fade-in-up">
        
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-outline-variant/10 pb-4">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-primary text-2xl">description</span>
            <h3 class="text-xl font-headline font-bold text-on-surface">Fiche d'Abonnement & Contrat</h3>
          </div>
          <button (click)="closeContractModal()" class="text-outline hover:text-on-surface p-1 rounded-full hover:bg-surface-container transition-colors">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <!-- Form content -->
        <form (ngSubmit)="onSaveContract()" class="space-y-6">
          <div class="grid grid-cols-2 gap-4">
            <div class="col-span-2 space-y-1">
              <label class="text-[10px] font-bold text-outline uppercase tracking-wider block ml-1">Nom Complet du Signataire *</label>
              <input type="text" [(ngModel)]="subscriberName" name="subscriberName" required
                     class="w-full bg-surface-container-low border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                     placeholder="Ex: Jean Kouassi">
            </div>
            
            <div class="col-span-2 space-y-1">
              <label class="text-[10px] font-bold text-outline uppercase tracking-wider block ml-1">Adresse ou Zone d'Activité</label>
              <input type="text" [(ngModel)]="addressZone" name="addressZone"
                     class="w-full bg-surface-container-low border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                     placeholder="Ex: Zone Industrielle Yopougon, Abidjan">
            </div>

            <div class="space-y-1">
              <label class="text-[10px] font-bold text-outline uppercase tracking-wider block ml-1">Numéro de Carte Fidélité</label>
              <input type="text" [(ngModel)]="cardNumber" name="cardNumber"
                     class="w-full bg-surface-container-low border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                     placeholder="Ex: M-100293">
            </div>

            <div class="space-y-1">
              <label class="text-[10px] font-bold text-outline uppercase tracking-wider block ml-1">Date d'Abonnement *</label>
              <input type="date" [(ngModel)]="subscriptionDate" name="subscriptionDate" required
                     class="w-full bg-surface-container-low border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none">
            </div>

            <div class="col-span-2 space-y-1">
              <label class="text-[10px] font-bold text-outline uppercase tracking-wider block ml-1">Périodicité des Récompenses *</label>
              <div class="flex gap-4">
                <label class="flex items-center gap-2 bg-surface-container-low p-3 rounded-xl flex-1 cursor-pointer select-none">
                  <input type="radio" [(ngModel)]="rewardFrequency" name="rewardFrequency" value="monthly" class="text-primary focus:ring-primary/20">
                  <span class="text-xs font-bold text-on-surface">Mensuelle</span>
                </label>
                <label class="flex items-center gap-2 bg-surface-container-low p-3 rounded-xl flex-1 cursor-pointer select-none">
                  <input type="radio" [(ngModel)]="rewardFrequency" name="rewardFrequency" value="quarterly" class="text-primary focus:ring-primary/20">
                  <span class="text-xs font-bold text-on-surface">Trimestrielle</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Commitments Box -->
          <div class="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs space-y-2">
            <h5 class="font-headline font-bold text-amber-800 flex items-center gap-1.5">
              <span class="material-symbols-outlined text-sm">gavel</span>
              ENGAGEMENTS DE L'APPORTEUR D'AFFAIRES
            </h5>
            <p class="text-amber-700 leading-relaxed">
              L'apporteur s'engage à orienter un volume minimum estimé à <strong>10 véhicules par jour soit 50 véhicules par mois</strong> vers la visite technique. Le contrat est conclu pour une durée de <strong>3 ans</strong> renouvelable après évaluation annuelle.
            </p>
          </div>

          <!-- Signature stylized -->
          <div class="space-y-4 pt-2 border-t border-outline-variant/10">
            <label class="flex items-start gap-2 cursor-pointer select-none">
              <input type="checkbox" [(ngModel)]="termsAccepted" name="termsAccepted" required
                     class="text-primary focus:ring-primary/20 rounded mt-0.5">
              <span class="text-xs text-outline font-medium leading-normal">
                Je certifie avoir lu et approuvé les conditions générales du partenariat et l'engagement d'apporteur d'affaires ci-dessus.
              </span>
            </label>

            <div class="space-y-1">
              <label class="text-[10px] font-bold text-outline uppercase tracking-wider block ml-1">Signature Stylisée (Saisir votre nom complet pour signer) *</label>
              <input type="text" [(ngModel)]="signatureName" name="signatureName" required
                     class="w-full bg-surface-container-low border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                     placeholder="Écrivez votre nom pour signer...">
            </div>

            <!-- Signature visualization -->
            <div *ngIf="signatureName" class="p-6 border-2 border-dashed border-outline-variant/30 rounded-2xl bg-surface-container-low flex flex-col items-center justify-center animate-fade-in-up">
              <span class="text-[8px] uppercase tracking-widest text-outline font-black mb-2">Signature Électronique Certifiée</span>
              <span class="font-signature text-4xl text-primary font-medium tracking-wide py-2">{{ signatureName }}</span>
              <span class="text-[9px] text-outline font-semibold">Le {{ subscriptionDate | date:'dd/MM/yyyy' }}</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-4 pt-4">
            <button type="button" (click)="closeContractModal()" class="text-outline hover:text-on-surface font-bold text-sm transition-colors cursor-pointer px-4 py-2">
              Annuler
            </button>
            <button type="submit"
                    [disabled]="!termsAccepted || !signatureName || !subscriberName || savingContract()"
                    class="bg-primary text-white px-6 py-3 rounded-xl font-headline font-bold text-sm shadow-xl shadow-primary/25 hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center gap-2">
              <span class="material-symbols-outlined" *ngIf="!savingContract()">verified</span>
              <span class="material-symbols-outlined animate-spin" *ngIf="savingContract()">sync</span>
              {{ savingContract() ? 'Enregistrement...' : 'Signer & Valider le Contrat' }}
            </button>
          </div>
        </form>
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
  `,
  styles: [`
    :host { display: block; }
    .animate-fade-in-up {
      animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
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
  client = signal<any>(null);
  error = signal<string | null>(null);
  vehicles = signal<any[]>([]);
  loadingVehicles = signal(true);

  // Tab and Contract details
  activeTab = signal<'fleet' | 'contract'>('fleet');
  contract = signal<any>(null);
  showContractModal = signal(false);
  savingContract = signal(false);

  // Form Fields for Contract Modal
  subscriberName = '';
  addressZone = '';
  cardNumber = '';
  subscriptionDate = '';
  rewardFrequency: 'monthly' | 'quarterly' = 'monthly';
  termsAccepted = false;
  signatureName = '';
  
  private route = inject(ActivatedRoute);
  private accountService = inject(AccountService);
  private vehicleService = inject(VehicleService);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);
  private subscriptionContractService = inject(SubscriptionContractService);

  /** Raccourci vers la fidélité (admin / marketing ; commercial pour suivi du portefeuille). */
  showLoyaltyShortcut(): boolean {
    const r = this.authService.getCurrentUser()?.role;
    return r === 'admin' || r === 'marketing' || r === 'commercial';
  }

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
          if (data.category === 'entreprise') {
            this.loadContract(+id);
          }
        },
        error: (err) => {
          this.error.set('Données indisponibles.');
        }
      });
    }
  }

  loadContract(clientId: number): void {
    this.subscriptionContractService.getContract(clientId).subscribe({
      next: (data) => {
        this.contract.set(data);
      },
      error: () => {
        this.contract.set(null);
      }
    });
  }

  openContractModal(): void {
    const defaultName = this.client()?.contacts?.[0] 
      ? `${this.client()?.contacts[0].first_name} ${this.client()?.contacts[0].last_name}` 
      : this.client()?.name;
      
    this.subscriberName = this.contract()?.subscriber_name || defaultName || '';
    this.addressZone = this.contract()?.address_zone || this.client()?.address || '';
    this.cardNumber = this.contract()?.card_number || '';
    this.subscriptionDate = this.contract()?.subscription_date || new Date().toISOString().substring(0, 10);
    this.rewardFrequency = this.contract()?.reward_frequency || 'monthly';
    this.termsAccepted = this.contract()?.status === 'signed';
    this.signatureName = this.contract()?.subscriber_name || '';
    this.showContractModal.set(true);
  }

  closeContractModal(): void {
    this.showContractModal.set(false);
  }

  onSaveContract(): void {
    const id = this.client()?.id;
    if (!id) return;

    this.savingContract.set(true);
    const data = {
      subscriber_name: this.subscriberName,
      address_zone: this.addressZone,
      card_number: this.cardNumber,
      subscription_date: this.subscriptionDate,
      reward_frequency: this.rewardFrequency,
      status: 'signed' as const
    };

    this.subscriptionContractService.saveContract(id, data).subscribe({
      next: (res) => {
        this.savingContract.set(false);
        this.contract.set(res);
        this.toastService.success("Le contrat d'abonnement a été signé et validé avec succès.");
        this.closeContractModal();
      },
      error: (err) => {
        this.savingContract.set(false);
        this.toastService.error("Une erreur s'est produite lors de l'enregistrement du contrat.");
      }
    });
  }

  printContract(): void {
    window.print();
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
