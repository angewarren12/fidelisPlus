import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { QuoteService, Quote } from '../../../services/quote.service';
import { QuoteRequestService, QuoteRequest } from '../../../services/quote-request.service';
import { VehicleService, Vehicle } from '../../../services/vehicle.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { environment } from '../../../environments/environment';
import { ConfirmModalComponent } from '../../ui/confirm-modal/confirm-modal.component';
import { QuotePreviewModalComponent } from '../../vente/quote-preview-modal/quote-preview-modal.component';

@Component({
  selector: 'app-client-quotes',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ConfirmModalComponent, QuotePreviewModalComponent],
  template: `
    <div class="animate-fade-in-up space-y-8 pb-20">

      <!-- HEADER -->
      <section class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-2xl md:text-3xl font-headline font-black text-on-surface">Mes Devis</h1>
          <p class="text-outline text-sm font-medium mt-1">Consultez vos devis et soumettez de nouvelles demandes.</p>
        </div>
        <button (click)="openRequestModal()" id="btn-nouvelle-demande"
                class="px-5 py-3 bg-gradient-to-r from-[#15b9a3] to-teal-600 hover:brightness-110 text-white font-bold text-sm rounded-xl shadow-lg shadow-[#15b9a3]/25 active:scale-95 transition-all flex items-center gap-2">
          <span class="material-symbols-outlined text-[18px]">request_quote</span>
          Demander un devis
        </button>
      </section>

      <!-- STATS SUMMARY -->
      <div class="grid grid-cols-3 gap-4">
        <div class="bg-white rounded-2xl p-4 border border-outline-variant/10 shadow-sm text-center">
          <p class="text-2xl font-black text-primary">{{ quotes().length }}</p>
          <p class="text-[11px] font-bold text-outline uppercase tracking-wider mt-0.5">Total</p>
        </div>
        <div class="bg-white rounded-2xl p-4 border border-outline-variant/10 shadow-sm text-center">
          <p class="text-2xl font-black text-amber-500">{{ countQuotesByStatus('sent') }}</p>
          <p class="text-[11px] font-bold text-outline uppercase tracking-wider mt-0.5">En cours</p>
        </div>
        <div class="bg-white rounded-2xl p-4 border border-outline-variant/10 shadow-sm text-center">
          <p class="text-2xl font-black text-teal-500">{{ countQuotesByStatus('accepted') }}</p>
          <p class="text-[11px] font-bold text-outline uppercase tracking-wider mt-0.5">Acceptés</p>
        </div>
      </div>

      <!-- TAB SWITCHER -->
      <section class="flex gap-2 bg-surface-container/60 p-1.5 rounded-xl border border-outline-variant/10 w-fit">
        <button (click)="activeTab.set('quotes')" id="tab-devis"
                [class]="activeTab() === 'quotes'
                  ? 'px-5 py-2.5 bg-white text-on-surface font-bold text-xs rounded-lg shadow-sm transition-all'
                  : 'px-5 py-2.5 text-outline font-bold text-xs rounded-lg hover:bg-white/60 transition-all'">
          Devis reçus
          <span *ngIf="quotes().length > 0" class="ml-1.5 bg-primary/10 text-primary text-[9px] font-black px-1.5 py-0.5 rounded-full">
            {{ quotes().length }}
          </span>
        </button>
        <button (click)="activeTab.set('requests')" id="tab-demandes"
                [class]="activeTab() === 'requests'
                  ? 'px-5 py-2.5 bg-white text-on-surface font-bold text-xs rounded-lg shadow-sm transition-all'
                  : 'px-5 py-2.5 text-outline font-bold text-xs rounded-lg hover:bg-white/60 transition-all'">
          Mes demandes
          <span *ngIf="pendingRequestsCount() > 0"
                class="ml-1.5 bg-amber-400 text-amber-900 text-[9px] font-black px-1.5 py-0.5 rounded-full">
            {{ pendingRequestsCount() }}
          </span>
        </button>
      </section>

      <!-- TAB: QUOTES RECEIVED -->
      <div *ngIf="activeTab() === 'quotes'">
        <div class="relative mb-4">
          <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]" aria-hidden="true">search</span>
          <input type="text" [(ngModel)]="quoteSearch"
                 placeholder="Rechercher par n° de devis, plaque, statut..."
                 class="w-full max-w-md pl-10 pr-4 py-2.5 bg-white border border-outline-variant/15 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20">
        </div>
        <div class="bg-white rounded-2xl shadow-sm border border-outline-variant/10 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-surface-container-low/60 border-b border-outline-variant/20">
                  <th class="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest">N° Devis</th>
                  <th class="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest">Véhicules</th>
                  <th class="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest">Montant</th>
                  <th class="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest">Validité</th>
                  <th class="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest">Statut</th>
                  <th class="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant/10">
                <tr *ngFor="let q of filteredQuotes()" class="hover:bg-slate-50/50 transition-colors group">
                  <td class="px-6 py-4">
                    <p class="text-sm font-bold text-on-surface font-mono">{{ q.quote_number || ('DEV-' + q.id) }}</p>
                    <p class="text-[10px] text-outline mt-0.5">Devis commercial</p>
                  </td>
                  <td class="px-6 py-4">
                    <div *ngIf="q.vehicles && q.vehicles.length > 0; else noVehicles" class="flex flex-wrap gap-1">
                      <span *ngFor="let v of q.vehicles"
                            class="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md">
                        {{ v.license_plate || v.brand }}
                      </span>
                    </div>
                    <ng-template #noVehicles><span class="text-slate-500 text-sm">—</span></ng-template>
                  </td>
                  <td class="px-6 py-4 text-sm font-bold text-on-surface">
                    {{ q.total_amount | currency:'XOF':'symbol':'1.0-0' }}
                  </td>
                  <td class="px-6 py-4">
                    <ng-container *ngIf="q.valid_until; else noDate">
                      <span [class]="isExpiringSoon(q.valid_until) ? 'text-amber-600 font-bold text-sm' : 'text-outline text-sm'">
                        {{ q.valid_until | date:'dd/MM/yyyy' }}
                      </span>
                      <span *ngIf="isExpiringSoon(q.valid_until)" class="block text-[10px] text-amber-500 font-bold">⚠ Expire bientôt</span>
                    </ng-container>
                    <ng-template #noDate><span class="text-slate-500 text-sm">—</span></ng-template>
                  </td>
                  <td class="px-6 py-4">
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
                          [ngClass]="{
                            'bg-teal-50 text-teal-600': q.status === 'accepted',
                            'bg-amber-50 text-amber-600': q.status === 'sent',
                            'bg-slate-100 text-slate-500': q.status === 'draft',
                            'bg-red-50 text-error': q.status === 'declined',
                            'bg-gray-100 text-gray-400': q.status === 'expired'
                          }">
                      {{ statusLabel(q.status) }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <div class="flex items-center justify-end gap-2">
                      <!-- Bouton voir le devis -->
                      <button *ngIf="q.id"
                              (click)="openQuoteDetail(q)"
                              class="px-3 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-lg hover:bg-primary hover:text-white transition-all flex items-center gap-1">
                        <span class="material-symbols-outlined text-[14px]">visibility</span>
                        Voir
                      </button>
                      <!-- Accepter (avec bon de commande obligatoire) / Refuser si statut sent -->
                      <ng-container *ngIf="q.status === 'sent'">
                        <button (click)="openAcceptModal(q)"
                                [disabled]="processingQuoteId() === q.id"
                                class="px-3 py-1.5 bg-teal-50 text-teal-600 text-xs font-bold rounded-lg hover:bg-teal-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                          Accepter
                        </button>
                        <button (click)="requestDeclineQuote(q)"
                                [disabled]="processingQuoteId() === q.id"
                                class="px-3 py-1.5 bg-red-50 text-error text-xs font-bold rounded-lg hover:bg-error hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                          {{ processingQuoteId() === q.id ? '...' : 'Refuser' }}
                        </button>
                      </ng-container>
                      <span *ngIf="q.status === 'accepted' && q.bon_de_commande_url" class="px-2.5 py-1 bg-teal-50 text-teal-600 text-[10px] font-bold rounded-lg flex items-center gap-1">
                        <span class="material-symbols-outlined text-[13px]">task_alt</span>
                        Bon de commande transmis
                      </span>
                    </div>
                  </td>
                </tr>

                <!-- Loading -->
                <tr *ngIf="loadingQuotes()">
                  <td colspan="6" class="px-6 py-12 text-center">
                    <span class="material-symbols-outlined animate-spin text-primary text-3xl">sync</span>
                    <p class="text-xs text-outline mt-2">Chargement de vos devis...</p>
                  </td>
                </tr>

                <!-- Empty -->
                <tr *ngIf="!loadingQuotes() && quotes().length === 0">
                  <td colspan="6" class="px-6 py-20 text-center">
                    <span class="material-symbols-outlined text-5xl text-outline/20 block mb-3">payments</span>
                    <p class="text-on-surface font-bold text-sm">Aucun devis disponible</p>
                    <p class="text-outline text-xs mt-1">Vos devis apparaîtront ici une fois établis par nos commerciaux.</p>
                    <button (click)="openRequestModal()" class="mt-4 px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl">
                      Faire une demande
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB: QUOTE REQUESTS -->
      <div *ngIf="activeTab() === 'requests'">
        <div class="relative mb-4">
          <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]" aria-hidden="true">search</span>
          <input type="text" [(ngModel)]="requestSearch"
                 placeholder="Rechercher par n° de demande, plaque, statut..."
                 class="w-full max-w-md pl-10 pr-4 py-2.5 bg-white border border-outline-variant/15 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20">
        </div>
        <div class="space-y-4">
          <div *ngFor="let r of filteredRequests()"
               class="bg-white rounded-2xl p-5 shadow-sm border border-outline-variant/10 hover:border-primary/20 hover:shadow-md transition-all">
            <div class="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div class="flex items-start gap-4">
                <div class="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary shrink-0">
                  <span class="material-symbols-outlined">description</span>
                </div>
                <div class="flex-1">
                  <div class="flex items-center gap-3 flex-wrap">
                    <p class="text-sm font-bold text-on-surface">Demande #{{ r.id }}</p>
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest"
                          [ngClass]="{
                            'bg-amber-50 text-amber-600': r.status === 'pending',
                            'bg-teal-50 text-teal-600': r.status === 'processed',
                            'bg-red-50 text-error': r.status === 'rejected'
                          }">
                      {{ r.status === 'pending' ? 'En attente' : (r.status === 'processed' ? 'Traité' : 'Rejeté') }}
                    </span>
                  </div>
                  <p class="text-xs text-outline mt-1">Soumise le {{ r.created_at | date:'dd/MM/yyyy à HH:mm' }}</p>

                  <!-- Véhicules concernés (une demande peut en couvrir plusieurs) -->
                  <div class="mt-2" *ngIf="r.vehicles && r.vehicles.length > 0">
                    <p class="text-[10px] font-bold text-outline uppercase tracking-wider mb-1">Véhicule(s) concerné(s) :</p>
                    <div class="flex flex-wrap gap-1.5">
                      <span *ngFor="let v of r.vehicles" class="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg inline-flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-[13px] text-slate-500">directions_car</span>
                        {{ v.brand }} {{ v.model }} — {{ v.license_plate }}
                      </span>
                    </div>
                  </div>

                  <p *ngIf="r.notes" class="text-xs text-on-surface-variant mt-2 italic bg-surface-container px-3 py-1.5 rounded-lg">
                    "{{ r.notes }}"
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Loading -->
          <div *ngIf="loadingRequests()" class="text-center py-12">
            <span class="material-symbols-outlined animate-spin text-primary text-3xl">sync</span>
            <p class="text-xs text-outline mt-2">Chargement de vos demandes...</p>
          </div>

          <!-- Empty -->
          <div *ngIf="!loadingRequests() && quoteRequests().length === 0"
               class="bg-white rounded-2xl p-12 text-center border border-outline-variant/10 shadow-sm">
            <span class="material-symbols-outlined text-5xl text-outline/20 block mb-3">inbox</span>
            <p class="text-on-surface font-bold text-sm">Aucune demande de devis</p>
            <p class="text-outline text-xs mt-1">Cliquez sur "Demander un devis" pour soumettre votre première demande.</p>
          </div>
        </div>
      </div>

      <!-- MODAL: NOUVELLE DEMANDE (MULTI-VÉHICULES) -->
      <div *ngIf="showRequestModal()" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 overflow-y-auto flex items-end sm:items-start justify-center p-4">
        <div class="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-100 animate-slide-up sm:animate-scale-in max-h-[92vh] flex flex-col">
          <div class="flex justify-between items-center p-6 pb-0 shrink-0">
            <div>
              <h3 class="font-headline font-black text-lg text-on-surface">Nouvelle demande de devis</h3>
              <p class="text-outline text-xs mt-0.5">Sélectionnez un ou plusieurs véhicules et vérifiez leurs documents</p>
            </div>
            <button (click)="closeRequestModal()" class="text-outline hover:text-on-surface transition-colors p-2 rounded-xl hover:bg-surface-container">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <form [formGroup]="requestForm" (ngSubmit)="submitRequest()" class="p-6 space-y-5 overflow-y-auto">

            <!-- Sélection multi-véhicules -->
            <div>
              <label class="block text-xs font-bold text-outline uppercase tracking-wider mb-2">
                Véhicules concernés
                <span class="text-primary">({{ selectedVehicleIds().length }} sélectionné{{ selectedVehicleIds().length > 1 ? 's' : '' }})</span>
              </label>

              <div *ngIf="loadingVehicles()" class="flex items-center gap-2 text-outline text-sm py-3">
                <span class="material-symbols-outlined animate-spin text-sm">sync</span> Chargement...
              </div>

              <div *ngIf="!loadingVehicles() && vehicles().length === 0"
                   class="bg-amber-50 text-amber-700 text-xs font-bold px-4 py-3 rounded-xl border border-amber-200">
                ⚠ Aucun véhicule dans votre flotte. Contactez votre commercial.
              </div>

              <div *ngIf="!loadingVehicles() && vehicles().length > 0"
                   class="space-y-2 max-h-[22rem] overflow-y-auto pr-1 scrollbar-thin">
                <div *ngFor="let v of vehicles(); let i = index"
                     class="flex flex-wrap sm:flex-nowrap items-center gap-3 p-3 rounded-xl border-2 transition-all"
                     [class]="isVehicleSelected(v.id)
                       ? 'border-primary bg-primary/5'
                       : 'border-outline-variant/30 hover:border-primary/30'">
                  <label [for]="'veh-' + v.id" class="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                    <input type="checkbox"
                           [id]="'veh-' + v.id"
                           [checked]="isVehicleSelected(v.id)"
                           (change)="toggleVehicle(v.id)"
                           class="w-4 h-4 accent-[#15b9a3] rounded shrink-0">
                    <div class="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center shrink-0">
                      <span class="material-symbols-outlined text-[18px] text-outline">directions_car</span>
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-bold text-on-surface truncate">{{ v.brand }} {{ v.model }}</p>
                      <p class="text-xs text-outline font-mono">{{ v.license_plate }}</p>
                    </div>
                  </label>

                  <!-- Statut documents par véhicule -->
                  <div class="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
                    <div class="relative">
                      <input type="file" accept="image/*,.pdf" (change)="handleVehicleDocFile($event, v, 'carte_grise')"
                             [disabled]="uploadingDocKey() === (v.id + ':carte_grise')"
                             class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10">
                      <button type="button"
                              [disabled]="uploadingDocKey() === (v.id + ':carte_grise')"
                              [title]="hasDoc(v, 'carte_grise') ? 'Carte grise déjà fournie — cliquez pour remplacer' : 'Carte grise manquante — cliquez pour envoyer'"
                              [class]="'px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ' +
                                (hasDoc(v, 'carte_grise') ? 'bg-teal-50 text-teal-600 hover:bg-teal-100' : 'bg-red-50 text-error hover:bg-red-100')">
                        <span class="material-symbols-outlined text-[13px]" [class.animate-spin]="uploadingDocKey() === (v.id + ':carte_grise')">
                          {{ uploadingDocKey() === (v.id + ':carte_grise') ? 'sync' : (hasDoc(v, 'carte_grise') ? 'check_circle' : 'error') }}
                        </span>
                        CG
                      </button>
                    </div>
                    <div class="relative">
                      <input type="file" accept="image/*,.pdf" (change)="handleVehicleDocFile($event, v, 'vignette')"
                             [disabled]="uploadingDocKey() === (v.id + ':vignette')"
                             class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10">
                      <button type="button"
                              [disabled]="uploadingDocKey() === (v.id + ':vignette')"
                              [title]="hasDoc(v, 'vignette') ? 'Vignette déjà fournie — cliquez pour remplacer' : 'Vignette manquante — cliquez pour envoyer'"
                              [class]="'px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ' +
                                (hasDoc(v, 'vignette') ? 'bg-teal-50 text-teal-600 hover:bg-teal-100' : 'bg-red-50 text-error hover:bg-red-100')">
                        <span class="material-symbols-outlined text-[13px]" [class.animate-spin]="uploadingDocKey() === (v.id + ':vignette')">
                          {{ uploadingDocKey() === (v.id + ':vignette') ? 'sync' : (hasDoc(v, 'vignette') ? 'check_circle' : 'error') }}
                        </span>
                        Vignette
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <p class="text-[10px] text-outline mt-2">
                <span class="text-teal-600 font-bold">Vert</span> = document déjà enregistré ·
                <span class="text-error font-bold">Rouge</span> = manquant, cliquez pour l'ajouter (l'un des deux ou les deux).
              </p>

              <!-- Ajout rapide d'un véhicule absent de la liste -->
              <button type="button" *ngIf="!showAddVehicleInline()" (click)="openAddVehicleInline()"
                      class="mt-3 flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
                <span class="material-symbols-outlined text-sm">add_circle</span>
                Votre véhicule n'est pas dans la liste ? Ajoutez-le
              </button>

              <div *ngIf="showAddVehicleInline()" class="mt-3 p-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 space-y-3">
                <p class="text-xs font-bold text-on-surface">Nouveau véhicule</p>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input type="text" [(ngModel)]="newVehiclePlate" [ngModelOptions]="{standalone: true}"
                         placeholder="Immatriculation *" class="px-3 py-2 rounded-lg bg-white border border-outline-variant/20 text-sm font-mono uppercase outline-none focus:ring-2 focus:ring-primary/20">
                  <input type="text" [(ngModel)]="newVehicleBrand" [ngModelOptions]="{standalone: true}"
                         placeholder="Marque" class="px-3 py-2 rounded-lg bg-white border border-outline-variant/20 text-sm outline-none focus:ring-2 focus:ring-primary/20">
                  <input type="text" [(ngModel)]="newVehicleModel" [ngModelOptions]="{standalone: true}"
                         placeholder="Modèle" class="px-3 py-2 rounded-lg bg-white border border-outline-variant/20 text-sm outline-none focus:ring-2 focus:ring-primary/20">
                </div>
                <div class="flex items-center justify-end gap-2">
                  <button type="button" (click)="cancelAddVehicleInline()" class="px-3 py-1.5 text-outline hover:text-on-surface font-bold text-[11px] uppercase tracking-wider">
                    Annuler
                  </button>
                  <button type="button" (click)="confirmAddVehicleInline()" [disabled]="!newVehiclePlate.trim() || addingVehicle()"
                          class="px-4 py-1.5 bg-primary text-white font-bold text-[11px] uppercase tracking-wider rounded-lg disabled:opacity-50 flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-sm animate-spin" *ngIf="addingVehicle()">sync</span>
                    {{ addingVehicle() ? 'Ajout…' : 'Ajouter et sélectionner' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Notes -->
            <div>
              <label class="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Notes / Description du besoin</label>
              <textarea formControlName="notes"
                        rows="3"
                        class="w-full px-4 py-2.5 bg-surface-container rounded-xl border border-transparent text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 resize-none transition-all"
                        placeholder="Ex: Contrôle technique annuel pour toute la flotte..."></textarea>
            </div>

            <div class="pt-2 flex items-center justify-end gap-3">
              <button type="button" (click)="closeRequestModal()"
                      class="px-5 py-2.5 border border-slate-200 text-outline hover:text-on-surface font-bold text-xs rounded-xl transition-colors">
                Annuler
              </button>
              <button type="submit" id="btn-submit-request"
                      [disabled]="selectedVehicleIds().length === 0 || submitting()"
                      class="px-6 py-2.5 bg-gradient-to-r from-[#15b9a3] to-teal-600 text-white font-bold text-xs rounded-xl shadow-md shadow-primary/20 hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                <span *ngIf="!submitting()">Envoyer la demande</span>
                <span *ngIf="submitting()" class="flex items-center gap-2">
                  <span class="material-symbols-outlined animate-spin text-[14px]">sync</span> Envoi...
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL: VISUALISATION DEVIS COMPLET (même aperçu que côté commercial) -->
      <app-quote-preview-modal
        *ngIf="quoteDetail()"
        [quoteData]="quoteDetail()"
        [companyName]="quoteDetail()?.company?.name || ''"
        [vehicles]="quoteDetail()?.vehicles || []"
        [showSendButton]="false"
        [showAcceptDeclineButtons]="true"
        (close)="quoteDetail.set(null)"
        (accept)="openAcceptModal(quoteDetail()!)"
        (decline)="requestDeclineQuote(quoteDetail()!)">
      </app-quote-preview-modal>

      <!-- MODAL: ACCEPTER LE DEVIS (bon de commande obligatoire, action irréversible) -->
      <div *ngIf="acceptTarget()" class="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 py-10">
        <div class="absolute inset-0 bg-[#0f172a]/75 backdrop-blur-sm" (click)="closeAcceptModal()"></div>
        <div class="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-8 border border-outline-variant/10" (click)="$event.stopPropagation()">
          <div class="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-5">
            <span class="material-symbols-outlined text-2xl">task_alt</span>
          </div>
          <h3 class="text-xl font-headline font-black text-on-surface mb-2">Accepter le devis {{ acceptTarget()?.quote_number }}</h3>
          <p class="text-sm text-outline font-medium mb-6 leading-relaxed">
            Pour valider votre accord, joignez le <strong class="text-on-surface">bon de commande signé</strong> (PDF ou photo).
            Cette action est <strong class="text-error">définitive et irréversible</strong>.
          </p>

          <label class="block cursor-pointer">
            <div [class]="'border-2 border-dashed rounded-2xl p-6 text-center transition-all ' + (acceptFile ? 'border-primary bg-primary/5' : 'border-outline-variant/40 hover:border-primary/50')">
              <span class="material-symbols-outlined text-3xl" [class.text-primary]="acceptFile">{{ acceptFile ? 'description' : 'upload_file' }}</span>
              <p class="text-xs font-bold mt-2">{{ acceptFile ? acceptFile.name : 'Choisir le bon de commande (PDF/photo)' }}</p>
            </div>
            <input type="file" accept="image/*,.pdf" (change)="onAcceptFileSelect($event)" class="hidden">
          </label>

          <div class="flex gap-3 mt-8">
            <button type="button" (click)="closeAcceptModal()"
                    class="flex-1 py-3.5 rounded-xl bg-surface-container text-on-surface text-[10px] font-black uppercase tracking-widest hover:bg-surface-container-high transition-colors">
              Annuler
            </button>
            <button type="button" [disabled]="!acceptFile || acceptSubmitting()" (click)="confirmAccept()"
                    class="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-[#15b9a3] text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
              <span *ngIf="acceptSubmitting()" class="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
              {{ acceptSubmitting() ? 'Validation...' : 'Confirmer et accepter' }}
            </button>
          </div>
        </div>
      </div>

      <!-- CONFIRM REFUS -->
      <app-confirm-modal *ngIf="declineTarget()"
        title="Refuser le devis"
        message="Voulez-vous vraiment refuser ce devis ? Cette action est irréversible."
        confirmText="Oui, refuser"
        cancelText="Retour"
        (confirm)="confirmDecline()"
        (cancel)="declineTarget.set(null)">
      </app-confirm-modal>

    </div>
  `,
  styles: [`
    :host { display: block; background: #f8f9fb; min-height: 100vh; padding: 1.5rem; }
    @media (min-width: 768px) { :host { padding: 2rem; } }
    /* Pas de transform sur cette anim: un transform (même translateY(0)) sur ce conteneur racine
       créerait un containing block et casserait le "position: fixed" des modals imbriqués
       (le modal se positionnerait par rapport à ce div au lieu du viewport). */
    .animate-fade-in-up { animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes fadeInUp { from { opacity: 0; } to { opacity: 1; } }
    .animate-scale-in { animation: scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
    .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .scrollbar-thin::-webkit-scrollbar { width: 4px; }
    .scrollbar-thin::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
  `]
})
export class ClientQuotesComponent implements OnInit {
  activeTab = signal<'quotes' | 'requests'>('quotes');
  quotes = signal<Quote[]>([]);
  quoteRequests = signal<QuoteRequest[]>([]);
  vehicles = signal<Vehicle[]>([]);
  loadingQuotes = signal(true);
  loadingRequests = signal(true);
  loadingVehicles = signal(false);
  showRequestModal = signal(false);
  submitting = signal(false);
  declineTarget = signal<Quote | null>(null);
  processingQuoteId = signal<number | null>(null);
  quoteDetail = signal<Quote | null>(null);

  /** Acceptation d'un devis : nécessite l'upload du bon de commande signé (action irréversible). */
  acceptTarget = signal<Quote | null>(null);
  acceptFile: File | null = null;
  acceptSubmitting = signal(false);

  // Selected vehicle IDs for the request form
  selectedVehicleIds = signal<number[]>([]);
  uploadingDocKey = signal<string | null>(null);

  // Ajout rapide d'un véhicule absent de la liste, depuis le modal de demande de devis
  showAddVehicleInline = signal(false);
  addingVehicle = signal(false);
  newVehiclePlate = '';
  newVehicleBrand = '';
  newVehicleModel = '';

  requestForm: FormGroup;

  private quoteService = inject(QuoteService);
  private quoteRequestService = inject(QuoteRequestService);
  private vehicleService = inject(VehicleService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);

  constructor() {
    this.requestForm = this.fb.group({ notes: [''] });
  }

  pendingRequestsCount = computed(() =>
    this.quoteRequests().filter(r => r.status === 'pending').length
  );

  quoteSearch = signal('');
  filteredQuotes = computed(() => {
    const q = this.quoteSearch().trim().toLowerCase();
    if (!q) return this.quotes();
    return this.quotes().filter(quote => {
      const plates = (quote.vehicles ?? []).map((v: any) => v.license_plate).join(' ').toLowerCase();
      const haystack = [quote.quote_number, plates, this.statusLabel(quote.status)].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  });

  requestSearch = signal('');
  filteredRequests = computed(() => {
    const q = this.requestSearch().trim().toLowerCase();
    if (!q) return this.quoteRequests();
    return this.quoteRequests().filter((req: any) => {
      const plates = (req.vehicles ?? []).map((v: any) => `${v.brand} ${v.model} ${v.license_plate}`).join(' ').toLowerCase();
      const statusLabel = req.status === 'pending' ? 'en attente' : (req.status === 'processed' ? 'traité' : 'rejeté');
      const haystack = [`demande #${req.id}`, plates, statusLabel, req.notes].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  });

  ngOnInit(): void {
    this.loadQuotes();
    this.loadRequests();
    this.loadVehicles();
  }

  loadQuotes() {
    const user = this.authService.getCurrentUser();
    this.quoteService.getPage({ company_id: user?.company_id ?? undefined, per_page: 100 }).subscribe({
      next: (res) => { this.quotes.set(res.data); this.loadingQuotes.set(false); },
      error: () => { this.toastService.error('Impossible de charger vos devis.'); this.loadingQuotes.set(false); }
    });
  }

  loadRequests() {
    const user = this.authService.getCurrentUser();
    const apiUrl = `${environment.apiUrl}/api/v1/quote-requests`;
    this.http.get<any>(apiUrl).subscribe({
      next: (res) => {
        const all: QuoteRequest[] = res.data?.data || res.data || [];
        // Show only those belonging to the user's company
        this.quoteRequests.set(all.filter(r => r.company_id === user?.company_id));
        this.loadingRequests.set(false);
      },
      error: () => { this.toastService.error('Impossible de charger vos demandes.'); this.loadingRequests.set(false); }
    });
  }

  loadVehicles() {
    const user = this.authService.getCurrentUser();
    if (user?.company_id) {
      this.loadingVehicles.set(true);
      this.vehicleService.getByClient(user.company_id).subscribe({
        next: (data) => { this.vehicles.set(data); this.loadingVehicles.set(false); },
        error: () => { this.loadingVehicles.set(false); }
      });
    }
  }

  isVehicleSelected(id: number): boolean {
    return this.selectedVehicleIds().includes(id);
  }

  toggleVehicle(id: number): void {
    const current = this.selectedVehicleIds();
    if (current.includes(id)) {
      this.selectedVehicleIds.set(current.filter(x => x !== id));
    } else {
      this.selectedVehicleIds.set([...current, id]);
    }
  }

  openAddVehicleInline(): void {
    this.showAddVehicleInline.set(true);
    this.newVehiclePlate = '';
    this.newVehicleBrand = '';
    this.newVehicleModel = '';
  }

  cancelAddVehicleInline(): void {
    this.showAddVehicleInline.set(false);
  }

  confirmAddVehicleInline(): void {
    const plate = this.newVehiclePlate.trim();
    if (!plate) return;

    const user = this.authService.getCurrentUser();
    if (!user?.company_id) {
      this.toastService.error('Erreur de session.');
      return;
    }

    this.addingVehicle.set(true);
    this.vehicleService.create({
      company_id: user.company_id,
      license_plate: plate.toUpperCase(),
      brand: this.newVehicleBrand.trim(),
      model: this.newVehicleModel.trim(),
    }).subscribe({
      next: (vehicle) => {
        this.addingVehicle.set(false);
        this.showAddVehicleInline.set(false);
        this.vehicles.update(list => [vehicle, ...list]);
        this.toggleVehicle(vehicle.id);
        this.toastService.success('Véhicule ajouté et sélectionné pour la demande.');
      },
      error: (err) => {
        this.addingVehicle.set(false);
        const msg = err?.error?.errors?.license_plate?.[0] || 'Erreur lors de l\'ajout du véhicule.';
        this.toastService.error(msg);
      },
    });
  }

  isExpiringSoon(dateStr: string): boolean {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  }

  countQuotesByStatus(status: string): number {
    return this.quotes().filter(q => q.status === status).length;
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'accepted': return 'Accepté';
      case 'sent': return 'Envoyé';
      case 'draft': return 'Brouillon';
      case 'declined': return 'Refusé';
      case 'expired': return 'Expiré';
      default: return status;
    }
  }

  openQuoteDetail(q: Quote) {
    if (!q.id) return;
    this.quoteService.getById(q.id).subscribe({
      next: (detail) => this.quoteDetail.set(detail),
      error: () => this.toastService.error('Impossible de charger le devis.')
    });
  }

  // ─── Acceptation (bon de commande obligatoire, irréversible) ───────────────

  openAcceptModal(quote: Quote): void {
    this.acceptTarget.set(quote);
    this.acceptFile = null;
  }

  closeAcceptModal(): void {
    this.acceptTarget.set(null);
    this.acceptFile = null;
  }

  onAcceptFileSelect(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    this.acceptFile = file || null;
  }

  confirmAccept(): void {
    const quote = this.acceptTarget();
    const file = this.acceptFile;
    if (!quote?.id || !file) return;

    const quoteId = quote.id;
    this.acceptSubmitting.set(true);

    // 1. Le bon de commande signé est transmis, 2. le devis est marqué accepté :
    // les deux actions ne font qu'une aux yeux du client, et une fois faites
    // il n'existe aucun moyen de revenir en arrière (pas de bouton "annuler l'acceptation").
    this.quoteService.uploadBonDeCommande(quoteId, file).subscribe({
      next: (updated) => {
        this.quoteService.updateStatus(quoteId, 'accepted').subscribe({
          next: () => {
            this.acceptSubmitting.set(false);
            this.acceptTarget.set(null);
            this.acceptFile = null;
            this.toastService.success('Devis accepté avec succès. Bon de commande transmis.');
            this.quotes.update(list => list.map(q => q.id === quoteId
              ? { ...q, status: 'accepted', bon_de_commande_url: updated.bon_de_commande_url }
              : q));
            if (this.quoteDetail()?.id === quoteId) this.quoteDetail.set(null);
          },
          error: () => {
            this.acceptSubmitting.set(false);
            this.toastService.error('Le bon de commande a été transmis mais la validation a échoué. Réessayez.');
          }
        });
      },
      error: () => {
        this.acceptSubmitting.set(false);
        this.toastService.error('Erreur lors de l\'envoi du bon de commande.');
      }
    });
  }

  // ─── Refus ───────────────────────────────────────────────────────────────

  requestDeclineQuote(quote: Quote): void {
    this.declineTarget.set(quote);
  }

  confirmDecline(): void {
    const quote = this.declineTarget();
    const quoteId = quote?.id;
    if (!quote || !quoteId) return;

    this.declineTarget.set(null);
    this.processingQuoteId.set(quoteId);

    this.quoteService.updateStatus(quoteId, 'declined').subscribe({
      next: () => {
        this.processingQuoteId.set(null);
        this.toastService.success('Devis refusé.');
        this.quotes.update(list => list.map(q => q.id === quote.id ? { ...q, status: 'declined' } : q));
        if (this.quoteDetail()?.id === quote.id) this.quoteDetail.set(null);
      },
      error: () => {
        this.processingQuoteId.set(null);
        this.toastService.error('Erreur lors du refus.');
      }
    });
  }

  openRequestModal() {
    this.requestForm.reset({ notes: '' });
    this.selectedVehicleIds.set([]);
    this.showAddVehicleInline.set(false);
    this.showRequestModal.set(true);
  }

  closeRequestModal() {
    this.showRequestModal.set(false);
    this.showAddVehicleInline.set(false);
  }

  hasDoc(v: Vehicle, type: 'carte_grise' | 'vignette'): boolean {
    return !!v.documents?.some(d => d.type === type);
  }

  handleVehicleDocFile(event: Event, vehicle: Vehicle, type: 'carte_grise' | 'vignette'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const key = `${vehicle.id}:${type}`;
    this.uploadingDocKey.set(key);

    this.vehicleService.uploadDocument(vehicle.id, file, type).subscribe({
      next: (doc) => {
        this.uploadingDocKey.set(null);
        this.vehicles.update(list => list.map(v => {
          if (v.id !== vehicle.id) return v;
          const otherDocs = (v.documents ?? []).filter(d => d.type !== type);
          return { ...v, documents: [...otherDocs, doc] };
        }));
        this.toastService.success(type === 'carte_grise' ? 'Carte grise enregistrée.' : 'Vignette enregistrée.');
      },
      error: () => {
        this.uploadingDocKey.set(null);
        this.toastService.error("Erreur lors de l'envoi du document.");
      }
    });
  }

  submitRequest() {
    if (this.selectedVehicleIds().length === 0) {
      this.toastService.error('Veuillez sélectionner au moins un véhicule.');
      return;
    }

    this.submitting.set(true);
    const formData = new FormData();

    // Envoyer les IDs de véhicules sélectionnés
    this.selectedVehicleIds().forEach(id => formData.append('vehicle_ids[]', String(id)));

    if (this.requestForm.value.notes) {
      formData.append('notes', this.requestForm.value.notes);
    }

    const apiUrl = `${environment.apiUrl}/api/v1/quote-requests`;
    this.http.post<any>(apiUrl, formData).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showRequestModal.set(false);
        this.toastService.success('Demande envoyée ! Un commercial vous contactera bientôt.');
        this.loadRequests();
        this.activeTab.set('requests');
      },
      error: (err) => {
        this.submitting.set(false);
        const msg = err?.error?.errors ? Object.values(err.error.errors).flat().join(', ') : 'Erreur lors de l\'envoi.';
        this.toastService.error(msg);
      }
    });
  }
}
