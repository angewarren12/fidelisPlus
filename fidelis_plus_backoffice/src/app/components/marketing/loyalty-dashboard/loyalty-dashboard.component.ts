import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';
import QRCode from 'qrcode';
import {
  LoyaltyService,
  LoyaltyAccountRow,
  LoyaltyRedemptionRow,
  LoyaltyRewardRow,
  LoyaltyScanHistoryRow,
  StationScanReport,
  PaginatedMeta,
  LoyaltyMemberRow,
  CreateLoyaltyMemberPayload,
} from '../../../services/loyalty.service';
import { QrCameraScannerComponent } from '../qr-camera-scanner/qr-camera-scanner.component';
import { ToastService } from '../../../services/toast.service';
import { AuthService } from '../../../services/auth.service';
import { UserRoles } from '../../../models/user-roles';
import {
  TechnicalVisitReminderService,
  TechnicalVisitReminderRow,
  ReminderStatus,
  PaginatedMeta as ReminderPaginatedMeta,
} from '../../../services/technical-visit-reminder.service';

type LoyaltyTab =
  | 'accounts'
  | 'reports'
  | 'activity'
  | 'redemptions'
  | 'rewards'
  | 'settings'
  | 'stations'
  | 'reminders'
  | 'requests';

import { StationListComponent } from '../station-list/station-list.component';
import { MarketingBgPatternComponent } from '../../ui/marketing-bg-pattern/marketing-bg-pattern.component';

@Component({
  selector: 'app-loyalty-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgApexchartsModule, StationListComponent, QrCameraScannerComponent, MarketingBgPatternComponent],
  templateUrl: './loyalty-dashboard.component.html',
  styles: [
    `
      .animate-fade-in {
        animation: fadeIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .animate-slide-in-right {
        animation: slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      @keyframes slideInRight {
        from { opacity: 0; transform: translateX(60px); }
        to   { opacity: 1; transform: translateX(0); }
      }
    `,
  ],
})
export class LoyaltyDashboardComponent implements OnInit {
  Math = Math;
  private loyaltyService = inject(LoyaltyService);
  private toastService = inject(ToastService);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private reminderService = inject(TechnicalVisitReminderService);

  tab = signal<LoyaltyTab>('accounts');
  accounts = signal<LoyaltyAccountRow[]>([]);
  accountsMeta = signal<PaginatedMeta | null>(null);
  rewards = signal<LoyaltyRewardRow[]>([]);
  rewardSearch = '';
  rewardStatusFilter: 'all' | 'active' | 'inactive' = 'all';
  redemptions = signal<LoyaltyRedemptionRow[]>([]);
  redemptionsMeta = signal<PaginatedMeta | null>(null);
  pendingRedemptionsCount = signal(0);

  // Demandes de carte SIRA en attente (fusionné depuis "Mes Clients")
  memberRequests = signal<LoyaltyMemberRow[]>([]);
  requestSearchFilter = signal<string>('');
  requestTypeFilter = signal<'all' | 'particulier' | 'entreprise'>('all');

  filteredMemberRequests = computed(() => {
    const list = this.memberRequests();
    const search = this.requestSearchFilter().trim().toLowerCase();
    const type = this.requestTypeFilter();

    return list.filter((m) => {
      if (type !== 'all' && m.type !== type) return false;
      if (!search) return true;
      const name = this.memberDisplayName(m).toLowerCase();
      const contact = (m.contact ?? '').toLowerCase();
      const email = (m.email ?? '').toLowerCase();
      const siraId = (m.sira_client_id ?? '').toLowerCase();
      return (
        name.includes(search) ||
        contact.includes(search) ||
        email.includes(search) ||
        siraId.includes(search)
      );
    });
  });

  // Clients fidélité validés mais sans carte associée (affichés dans "Comptes Fidélité"
  // en plus des vrais comptes, avec un bouton "Associer une carte" à la place des actions).
  cardlessMembers = signal<LoyaltyMemberRow[]>([]);
  loadingCardlessMembers = signal(false);
  blankCardStock = signal<number | null>(null);
  loadingMemberRequests = signal(false);
  processingRequestId = signal<number | null>(null);

  // Création d'un nouveau client fidélité
  showCreateMemberModal = signal(false);
  creatingMember = signal(false);
  createMemberForm: CreateLoyaltyMemberPayload = this.emptyMemberForm();

  // Associer une carte physique vierge à un client fidélité
  assignCardTarget = signal<{ memberId: number; memberType: string; label: string; cardNumber: string | null } | null>(null);
  assignCardPayload = '';
  assigningCard = signal(false);
  showAssignCardCamera = signal(false);

  // Sélection d'une carte déjà imprimée et prête (alternative au scan)
  showPickPrintedCard = signal(false);
  printedCards = signal<LoyaltyAccountRow[]>([]);
  loadingPrintedCards = signal(false);
  pickingCardId = signal<number | null>(null);
  settings = signal<any[]>([]);
  activity = signal<any[]>([]);
  scanHistory = signal<LoyaltyScanHistoryRow[]>([]);

  loadingAccounts = signal(false);
  loadingActivity = signal(false);
  loadingSettings = signal(false);
  loadingRedemptions = signal(false);
  loadingScanHistory = signal(false);
  reportLoading = signal(false);

  accountSearchQuery = '';
  accountHolderTypeFilter: 'all' | 'particulier' | 'entreprise' = 'all';
  lastQrPayload = signal<string | null>(null);
  qrDataUrl = signal<string | null>(null);
  qrLoadingId = signal<number | null>(null);

  selectedAccountDetail = signal<LoyaltyAccountRow | null>(null);

  showEditModal = signal(false);
  editAccount = signal<LoyaltyAccountRow | null>(null);
  editForm = { subscriber_name: '', trade_register: '', subscriber_function: '' };
  editSaving = signal(false);

  showVehiclesModal = signal(false);
  vehiclesAccount = signal<LoyaltyAccountRow | null>(null);

  reminders = signal<TechnicalVisitReminderRow[]>([]);
  remindersMeta = signal<ReminderPaginatedMeta | null>(null);
  loadingReminders = signal(false);
  reminderFilter: ReminderStatus | 'all' = 'pending';
  reminderNotesDraft: Record<number, string> = {};

  reportDateFrom = '';
  reportDateTo = '';
  stationReport = signal<StationScanReport | null>(null);
  chartOptions: any;
  exportingReport = signal(false);

  redemptionFilter = 'pending';
  redemptionSearch = '';
  redemptionFilters = [
    { value: 'pending', label: 'En attente' },
    { value: 'delivered', label: 'Livrés' },
    { value: 'cancelled', label: 'Annulés' },
    { value: 'all', label: 'Tous' },
  ];

  showClaimModal = signal(false);
  claimAccount = signal<LoyaltyAccountRow | null>(null);
  claimRewardId: number | null = null;
  claimSaving = signal(false);

  showAdjustModal = signal(false);
  adjustAccount = signal<LoyaltyAccountRow | null>(null);
  adjustDelta = 0;
  adjustReason = '';
  adjustSaving = signal(false);

  showRewardForm = signal(false);
  editingReward: LoyaltyRewardRow | null = null;
  rewardForm = { name: '', description: '', points_cost: 100, is_active: true, sort_order: 0 };
  rewardSaving = signal(false);

  ngOnInit(): void {
    const td = this.todayInputDate();
    const prevWeek = new Date();
    prevWeek.setDate(prevWeek.getDate() - 7);
    this.reportDateFrom = this.formatDate(prevWeek);
    this.reportDateTo = td;

    this.route.queryParams.subscribe((p) => {
      if (p['tab']) {
        this.switchTab(p['tab'] as LoyaltyTab);
      }
    });

    this.loadAccounts();
    this.loadRewards();
  }

  pageTitle(): string {
    const titles: Record<LoyaltyTab, string> = {
      accounts: 'Comptes Fidélité',
      reports: 'Analytics Marketing',
      activity: 'Activité',
      redemptions: 'Demandes de lots',
      rewards: 'Catalogue Récompenses',
      settings: 'Réglages Fidélité',
      stations: 'Stations',
      reminders: 'Rappels Visite Technique',
      requests: 'Demandes de carte SIRA',
    };
    return titles[this.tab()] ?? 'Espace Fidélité';
  }

  switchTab(t: LoyaltyTab): void {
    this.tab.set(t);
    if (t === 'reports') this.loadStationReport();
    else if (t === 'activity') this.loadActivity();
    else if (t === 'settings') this.loadSettings();
    else if (t === 'redemptions') this.loadRedemptions();
    else if (t === 'rewards') this.loadRewards();
    else if (t === 'reminders') this.loadReminders();
    else if (t === 'requests') this.loadMemberRequests();
  }

  loadReminders(page = 1): void {
    this.loadingReminders.set(true);
    const status = this.reminderFilter === 'all' ? undefined : this.reminderFilter;
    this.reminderService.list(status, page, 20).subscribe({
      next: (res) => {
        this.reminders.set(res.items);
        this.remindersMeta.set(res.meta);
        for (const r of res.items) {
          if (this.reminderNotesDraft[r.id] === undefined) this.reminderNotesDraft[r.id] = r.notes || '';
        }
        this.loadingReminders.set(false);
      },
      error: () => {
        this.loadingReminders.set(false);
        this.toastService.error('Erreur chargement des rappels.');
      },
    });
  }

  setReminderStatus(r: TechnicalVisitReminderRow, status: ReminderStatus): void {
    this.reminderService.update(r.id, { status, notes: this.reminderNotesDraft[r.id] }).subscribe({
      next: () => {
        this.toastService.success('Statut mis à jour.');
        this.loadReminders();
      },
      error: () => this.toastService.error('Mise à jour impossible.'),
    });
  }

  saveReminderNotes(r: TechnicalVisitReminderRow): void {
    const notes = this.reminderNotesDraft[r.id];
    if (notes === undefined) return;
    this.reminderService.update(r.id, { notes }).subscribe({
      next: () => this.toastService.success('Note enregistrée.'),
      error: () => this.toastService.error('Enregistrement impossible.'),
    });
  }

  loadAccounts(page = 1): void {
    this.loadingAccounts.set(true);
    const holderType = this.accountHolderTypeFilter !== 'all'
      ? (this.accountHolderTypeFilter === 'entreprise' ? 'company' : 'member')
      : undefined;
    this.loyaltyService.listAccounts(page, 20, { holder_type: holderType }).subscribe({
      next: (res) => {
        let items = res.items;
        if (this.accountSearchQuery) {
          const q = this.accountSearchQuery.toLowerCase();
          items = items.filter(
            (a) =>
              a.company?.name?.toLowerCase().includes(q) ||
              a.user?.first_name?.toLowerCase().includes(q) ||
              a.user?.last_name?.toLowerCase().includes(q) ||
              a.member?.nom?.toLowerCase().includes(q) ||
              a.member?.prenom?.toLowerCase().includes(q) ||
              a.member?.nom_entreprise?.toLowerCase().includes(q) ||
              a.holder_key.toLowerCase().includes(q) ||
              a.card_number?.toLowerCase().includes(q),
          );
        }
        this.accounts.set(items);
        this.accountsMeta.set(res.meta);
        this.loadingAccounts.set(false);
      },
      error: () => {
        this.loadingAccounts.set(false);
        this.toastService.error('Erreur chargement comptes.');
      },
    });
    this.loadCardlessMembers();
    this.loadBlankCardStock();
  }

  loadCardlessMembers(): void {
    this.loadingCardlessMembers.set(true);
    this.loyaltyService.listMembers({ per_page: 100, search: this.accountSearchQuery.trim() || undefined }).subscribe({
      next: (res) => {
        this.cardlessMembers.set(res.items.filter((m) => !m.loyalty_account));
        this.loadingCardlessMembers.set(false);
      },
      error: () => this.loadingCardlessMembers.set(false),
    });
  }

  /** Nombre de cartes vierges disponibles en stock — désactive "Associer une carte" à 0. */
  loadBlankCardStock(): void {
    this.loyaltyService.listAccounts(1, 1, { holder_type: 'unassigned' }).subscribe({
      next: (res) => this.blankCardStock.set(res.meta.total),
      error: () => {},
    });
  }

  loadActivity(): void {
    this.loadingActivity.set(true);
    this.loyaltyService.getActivity(30).subscribe({
      next: (data) => {
        this.activity.set(data);
        this.loadingActivity.set(false);
      },
      error: () => {
        this.loadingActivity.set(false);
        this.toastService.error('Impossible de charger l’activité.');
      },
    });
  }

  loadSettings(): void {
    this.loadingSettings.set(true);
    this.loyaltyService.getSettings().subscribe({
      next: (data) => {
        this.settings.set(data);
        this.loadingSettings.set(false);
      },
      error: () => {
        this.loadingSettings.set(false);
        this.toastService.error('Réglages accessibles aux administrateurs uniquement.');
      },
    });
  }

  updateSetting(s: { id: number; value: string }): void {
    this.loyaltyService.updateSetting(s.id, s.value).subscribe({
      next: () => this.toastService.success('Réglage mis à jour.'),
      error: () => this.toastService.error('Erreur lors de la mise à jour.'),
    });
  }

  loadStationReport(): void {
    this.reportLoading.set(true);
    this.loyaltyService.stationScanReport({ from: this.reportDateFrom, to: this.reportDateTo }).subscribe({
      next: (data) => {
        this.stationReport.set(data);
        this.updateChart(data);
        this.reportLoading.set(false);
      },
      error: () => this.reportLoading.set(false),
    });
  }

  exportStationReport(): void {
    this.exportingReport.set(true);
    this.loyaltyService.exportStationScansCsv({ from: this.reportDateFrom, to: this.reportDateTo }).subscribe({
      next: (blob) => {
        this.exportingReport.set(false);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `export_fidelite_${this.reportDateFrom}_${this.reportDateTo}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.exportingReport.set(false);
        this.toastService.error("Impossible d'exporter le rapport.");
      },
    });
  }

  loadScanHistory(accountId: number): void {
    this.loadingScanHistory.set(true);
    this.loyaltyService.getScanHistory(accountId).subscribe({
      next: (res) => {
        this.scanHistory.set(res.items);
        this.loadingScanHistory.set(false);
      },
      error: () => {
        this.scanHistory.set([]);
        this.loadingScanHistory.set(false);
      },
    });
  }

  loadRedemptions(page = 1): void {
    this.loadingRedemptions.set(true);
    const status = this.redemptionFilter === 'all' ? undefined : this.redemptionFilter;
    this.loyaltyService.listRedemptions(status, page, 20).subscribe({
      next: (res) => {
        this.redemptions.set(res.items);
        this.redemptionsMeta.set(res.meta);
        this.loadingRedemptions.set(false);
        if (this.redemptionFilter === 'pending') this.pendingRedemptionsCount.set(res.meta.total);
      },
      error: () => {
        this.loadingRedemptions.set(false);
        this.toastService.error('Erreur chargement des lots.');
      },
    });
  }

  loadRewards(): void {
    this.loyaltyService.listRewards(false).subscribe((r) => this.rewards.set(r));
  }

  refreshQrPayload(a: LoyaltyAccountRow, regenerate: boolean): void {
    this.qrLoadingId.set(a.id);
    this.loyaltyService.getQrPayload(a.id, regenerate).subscribe({
      next: async (res) => {
        await this.displayQr(res.qr_payload);
        this.qrLoadingId.set(null);
        if (regenerate) this.toastService.info('QR régénéré.');
      },
      error: () => {
        this.qrLoadingId.set(null);
        this.toastService.error('Impossible de générer le QR.');
      },
    });
  }

  private async displayQr(payload: string): Promise<void> {
    this.lastQrPayload.set(payload);
    try {
      const url = await QRCode.toDataURL(payload, { width: 280, margin: 2 });
      this.qrDataUrl.set(url);
    } catch {
      this.qrDataUrl.set(null);
    }
  }

  closeQrModal(): void {
    this.lastQrPayload.set(null);
    this.qrDataUrl.set(null);
  }

  openVehiclesModal(a: LoyaltyAccountRow): void {
    this.vehiclesAccount.set(a);
    this.showVehiclesModal.set(true);
  }

  closeVehiclesModal(): void {
    this.showVehiclesModal.set(false);
    this.vehiclesAccount.set(null);
  }

  /** Regroupe l'historique des scans déjà chargé par véhicule (plaque). */
  groupedVehicles(): { registration: string; brand: string | null; color: string | null; visits: string[]; totalPoints: number }[] {
    const groups = new Map<string, { registration: string; brand: string | null; color: string | null; visits: string[]; totalPoints: number }>();
    for (const s of this.scanHistory()) {
      const plate = (s.vehicle_registration || '').trim();
      if (!plate) continue;
      if (!groups.has(plate)) {
        groups.set(plate, { registration: plate, brand: s.vehicle_brand, color: s.vehicle_color, visits: [], totalPoints: 0 });
      }
      const g = groups.get(plate)!;
      g.visits.push(s.created_at);
      g.totalPoints += s.points_credited;
      if (!g.brand && s.vehicle_brand) g.brand = s.vehicle_brand;
      if (!g.color && s.vehicle_color) g.color = s.vehicle_color;
    }
    return Array.from(groups.values()).sort((a, b) => b.visits.length - a.visits.length);
  }

  openAccountDetail(a: LoyaltyAccountRow): void {
    this.selectedAccountDetail.set(a);
    this.scanHistory.set([]);
    this.loadScanHistory(a.id);
  }

  closeAccountDetail(): void {
    this.selectedAccountDetail.set(null);
    this.scanHistory.set([]);
  }

  openEditModal(a: LoyaltyAccountRow): void {
    this.editAccount.set(a);
    this.editForm = {
      subscriber_name: a.subscriber_name || '',
      trade_register: a.trade_register || '',
      subscriber_function: a.subscriber_function || '',
    };
    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
    this.editAccount.set(null);
  }

  saveEditAccount(): void {
    const acc = this.editAccount();
    if (!acc) return;
    this.editSaving.set(true);
    this.loyaltyService.updateAccount(acc.id, this.editForm).subscribe({
      next: (updated) => {
        this.editSaving.set(false);
        this.toastService.success('Compte mis à jour.');
        this.closeEditModal();
        this.loadAccounts();
        if (this.selectedAccountDetail()?.id === acc.id) this.selectedAccountDetail.set(updated);
      },
      error: () => {
        this.editSaving.set(false);
        this.toastService.error('Mise à jour impossible.');
      },
    });
  }

  toggleBlockAccount(a: LoyaltyAccountRow): void {
    const blocked = !a.blocked_at;
    if (!confirm(blocked ? `Bloquer le compte de ${this.holderLabel(a)} ?` : `Débloquer ce compte ?`)) return;
    this.loyaltyService.updateAccount(a.id, { blocked }).subscribe({
      next: (updated) => {
        this.toastService.success(blocked ? 'Compte bloqué.' : 'Compte débloqué.');
        this.loadAccounts();
        if (this.selectedAccountDetail()?.id === a.id) this.selectedAccountDetail.set(updated);
      },
      error: () => this.toastService.error('Action impossible.'),
    });
  }

  openClaimModal(a: LoyaltyAccountRow): void {
    this.claimAccount.set(a);
    this.claimRewardId = this.rewards().find((r) => r.is_active && r.points_cost <= a.points_balance)?.id ?? null;
    this.showClaimModal.set(true);
    this.loadRewards();
  }

  closeClaimModal(): void {
    this.showClaimModal.set(false);
    this.claimAccount.set(null);
  }

  submitClaim(): void {
    const acc = this.claimAccount();
    if (!acc || !this.claimRewardId) {
      this.toastService.error('Choisissez une récompense.');
      return;
    }
    this.claimSaving.set(true);
    this.loyaltyService.claimReward(acc.id, this.claimRewardId).subscribe({
      next: () => {
        this.claimSaving.set(false);
        this.toastService.success('Lot attribué — demande enregistrée.');
        this.closeClaimModal();
        this.loadAccounts();
        if (this.tab() === 'redemptions') this.loadRedemptions();
      },
      error: (err) => {
        this.claimSaving.set(false);
        this.toastService.error(err?.error?.message || 'Échec attribution.');
      },
    });
  }

  openAdjustModal(a: LoyaltyAccountRow): void {
    this.adjustAccount.set(a);
    this.adjustDelta = 0;
    this.adjustReason = '';
    this.showAdjustModal.set(true);
  }

  closeAdjustModal(): void {
    this.showAdjustModal.set(false);
    this.adjustAccount.set(null);
  }

  submitAdjust(): void {
    const acc = this.adjustAccount();
    if (!acc || !this.adjustReason.trim()) {
      this.toastService.error('Indiquez un motif.');
      return;
    }
    if (this.adjustDelta === 0) {
      this.toastService.error('Le delta doit être différent de zéro.');
      return;
    }
    this.adjustSaving.set(true);
    this.loyaltyService.adjustPoints(acc.id, this.adjustDelta, this.adjustReason.trim()).subscribe({
      next: (res) => {
        this.adjustSaving.set(false);
        this.toastService.success(`Solde mis à jour : ${res.new_balance} pts`);
        this.closeAdjustModal();
        this.loadAccounts();
      },
      error: (err) => {
        this.adjustSaving.set(false);
        this.toastService.error(err?.error?.message || 'Ajustement refusé.');
      },
    });
  }

  setRedemptionStatus(r: LoyaltyRedemptionRow, status: 'delivered' | 'cancelled'): void {
    this.loyaltyService.updateRedemptionStatus(r.id, status).subscribe({
      next: () => {
        this.toastService.success(status === 'delivered' ? 'Lot marqué livré.' : 'Demande annulée.');
        this.loadRedemptions();
      },
      error: () => this.toastService.error('Mise à jour impossible.'),
    });
  }

  openRewardForm(r?: LoyaltyRewardRow): void {
    this.editingReward = r ?? null;
    this.rewardForm = r
      ? {
        name: r.name,
        description: r.description || '',
        points_cost: r.points_cost,
        is_active: r.is_active,
        sort_order: r.sort_order,
      }
      : { name: '', description: '', points_cost: 100, is_active: true, sort_order: 0 };
    this.showRewardForm.set(true);
  }

  closeRewardForm(): void {
    this.showRewardForm.set(false);
    this.editingReward = null;
  }

  saveReward(): void {
    if (!this.rewardForm.name.trim()) {
      this.toastService.error('Nom requis.');
      return;
    }
    this.rewardSaving.set(true);
    const payload = {
      name: this.rewardForm.name.trim(),
      description: this.rewardForm.description || null,
      points_cost: this.rewardForm.points_cost,
      is_active: this.rewardForm.is_active,
      sort_order: this.rewardForm.sort_order,
    };
    const req = this.editingReward
      ? this.loyaltyService.updateReward(this.editingReward.id, payload)
      : this.loyaltyService.createReward(payload);
    req.subscribe({
      next: () => {
        this.rewardSaving.set(false);
        this.toastService.success(this.editingReward ? 'Récompense mise à jour.' : 'Récompense créée.');
        this.closeRewardForm();
        this.loadRewards();
      },
      error: () => {
        this.rewardSaving.set(false);
        this.toastService.error('Enregistrement impossible.');
      },
    });
  }

  deleteReward(r: LoyaltyRewardRow): void {
    if (!confirm(`Supprimer « ${r.name} » ?`)) return;
    this.loyaltyService.deleteReward(r.id).subscribe({
      next: () => {
        this.toastService.success('Récompense supprimée.');
        this.loadRewards();
      },
      error: () => this.toastService.error('Suppression impossible.'),
    });
  }


  toggleRewardActive(r: LoyaltyRewardRow): void {
    this.loyaltyService.updateReward(r.id, { is_active: !r.is_active }).subscribe({
      next: () => {
        this.rewards.update((list) => list.map((x) => (x.id === r.id ? { ...x, is_active: !x.is_active } : x)));
        this.toastService.success(r.is_active ? 'Récompense désactivée.' : 'Récompense activée.');
      },
      error: () => this.toastService.error('Erreur lors de la mise à jour.'),
    });
  }

  filteredRewards(): LoyaltyRewardRow[] {
    const q = this.rewardSearch.trim().toLowerCase();
    let list = q ? this.rewards().filter((r) => r.name.toLowerCase().includes(q) || (r.description ?? '').toLowerCase().includes(q)) : this.rewards();
    if (this.rewardStatusFilter === 'active') list = list.filter((r) => r.is_active);
    if (this.rewardStatusFilter === 'inactive') list = list.filter((r) => !r.is_active);
    return [...list].sort((a, b) => a.sort_order - b.sort_order || a.points_cost - b.points_cost);
  }

  activeRewardsCount(): number {
    return this.rewards().filter((r) => r.is_active).length;
  }

  holderLabel(a: LoyaltyAccountRow): string {
    if (a.holder_type === 'company') return a.company?.name || 'Société';
    if (a.holder_type === 'member') {
      const m = a.member;
      if (!m) return 'Client fidélité';
      if (m.type === 'entreprise') return m.nom_entreprise || 'Entreprise';
      return `${m.prenom ?? ''} ${m.nom ?? ''}`.trim() || 'Particulier';
    }
    if (a.holder_type === 'unassigned') return 'Carte vierge';
    return `${a.user?.first_name || ''} ${a.user?.last_name || ''}`.trim() || 'Particulier';
  }

  holderTypeBadge(a: LoyaltyAccountRow): string {
    if (a.holder_type === 'company') return 'Entreprise';
    if (a.holder_type === 'unassigned') return 'Vierge';
    if (a.holder_type === 'member' && a.member?.type === 'entreprise') return 'Entreprise';
    return 'Particulier';
  }

  filteredRewardsForClaim(): LoyaltyRewardRow[] {
    const acc = this.claimAccount();
    if (!acc) return [];
    return this.rewards().filter((r) => r.is_active && r.points_cost <= acc.points_balance);
  }

  canOfferReward(a: LoyaltyAccountRow): boolean {
    return this.rewards().some((r) => r.is_active && r.points_cost <= a.points_balance);
  }

  nextReward(a: LoyaltyAccountRow): LoyaltyRewardRow | null {
    const candidates = this.rewards()
      .filter((r) => r.is_active && r.points_cost > a.points_balance)
      .sort((x, y) => x.points_cost - y.points_cost);
    return candidates[0] ?? null;
  }

  progressToNextReward(a: LoyaltyAccountRow): number {
    const next = this.nextReward(a);
    if (!next || next.points_cost === 0) return 100;
    return Math.min(100, Math.round((a.points_balance / next.points_cost) * 100));
  }

  redemptionHolderLabel(r: LoyaltyRedemptionRow): string {
    const acc = r.account;
    if (!acc) return '—';
    return this.holderLabel(acc);
  }

  filteredRedemptions(): LoyaltyRedemptionRow[] {
    const q = this.redemptionSearch.trim().toLowerCase();
    if (!q) return this.redemptions();
    return this.redemptions().filter((r) =>
      this.redemptionHolderLabel(r).toLowerCase().includes(q) || (r.reward?.name ?? '').toLowerCase().includes(q));
  }

  updateChart(report: StationScanReport): void {
    const days = report.by_day.map((d) => d.day);
    const counts = report.by_day.map((d) => d.scans_count);
    this.chartOptions = {
      series: [{ name: 'Scans', data: counts }],
      chart: { height: 300, type: 'area', toolbar: { show: false }, zoom: { enabled: false }, fontFamily: 'Inter, sans-serif' },
      colors: ['#6366f1'],
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 3 },
      xaxis: { categories: days, labels: { style: { colors: '#94a3b8', fontSize: '10px', fontWeight: 600 } } },
      grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
    };
  }

  isAdmin(): boolean {
    return this.auth.hasRole(UserRoles.ADMIN_MARKETING, UserRoles.SUPER_ADMIN);
  }

  canManageLoyalty(): boolean {
    return this.auth.hasRole(UserRoles.ADMIN_MARKETING, UserRoles.SUPER_ADMIN, UserRoles.MARKETING);
  }

  canEmitLoyaltyCard(): boolean {
    return this.canManageLoyalty();
  }

  showCrmLinks(): boolean {
    return this.auth.hasRole(UserRoles.ADMIN_COMMERCIAL, UserRoles.SUPER_ADMIN, UserRoles.COMMERCIAL);
  }

  private todayInputDate(): string {
    return this.formatDate(new Date());
  }

  private formatDate(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  // ─── Demandes de carte SIRA (fusionné depuis "Mes Clients") ─────────────────

  loadMemberRequests(): void {
    this.loadingMemberRequests.set(true);
    this.loyaltyService.listMemberRequests().subscribe({
      next: (list) => {
        this.memberRequests.set(list);
        this.loadingMemberRequests.set(false);
      },
      error: () => this.loadingMemberRequests.set(false),
    });
  }

  memberDisplayName(m: LoyaltyMemberRow): string {
    if (m.type === 'entreprise') return m.nom_entreprise || 'Entreprise';
    return `${m.prenom ?? ''} ${m.nom ?? ''}`.trim() || 'Particulier';
  }

  validateMemberRequestAction(m: LoyaltyMemberRow): void {
    this.processingRequestId.set(m.id);
    this.loyaltyService.validateMemberRequest(m.id).subscribe({
      next: () => {
        this.processingRequestId.set(null);
        this.toastService.success('Demande validée, carte fidélité créée.');
        this.memberRequests.update((list) => list.filter((r) => r.id !== m.id));
        this.loadAccounts();
      },
      error: (err) => {
        this.processingRequestId.set(null);
        this.toastService.error(err?.error?.message || 'Erreur lors de la validation.');
      },
    });
  }

  rejectMemberRequestAction(m: LoyaltyMemberRow): void {
    this.processingRequestId.set(m.id);
    this.loyaltyService.rejectMemberRequest(m.id).subscribe({
      next: () => {
        this.processingRequestId.set(null);
        this.toastService.success('Demande refusée.');
        this.memberRequests.update((list) => list.filter((r) => r.id !== m.id));
      },
      error: (err) => {
        this.processingRequestId.set(null);
        this.toastService.error(err?.error?.message || 'Erreur lors du refus.');
      },
    });
  }

  // ─── Création d'un nouveau client fidélité ───────────────────────────────────

  private emptyMemberForm(): CreateLoyaltyMemberPayload {
    return { type: 'particulier', contact: '', email: '', nom: '', prenom: '', nom_entreprise: '', registre_commerce: '', nom_abonne: '', fonction: '' };
  }

  openCreateMemberModal(): void {
    this.createMemberForm = this.emptyMemberForm();
    this.showCreateMemberModal.set(true);
  }

  closeCreateMemberModal(): void {
    this.showCreateMemberModal.set(false);
  }

  submitCreateMember(): void {
    const f = this.createMemberForm;
    if (!f.contact?.trim()) {
      this.toastService.error('Le contact est obligatoire.');
      return;
    }
    if (f.type === 'particulier' && (!f.nom?.trim() || !f.prenom?.trim())) {
      this.toastService.error('Nom et prénom sont obligatoires.');
      return;
    }
    if (f.type === 'entreprise' && !f.nom_entreprise?.trim()) {
      this.toastService.error("Le nom de l'entreprise est obligatoire.");
      return;
    }

    this.creatingMember.set(true);
    this.loyaltyService.createMember(f).subscribe({
      next: ({ member }) => {
        this.creatingMember.set(false);
        this.showCreateMemberModal.set(false);
        this.toastService.success('Client créé. Scannez une carte vierge pour l\'associer.');
        this.loadCardlessMembers();
        this.openAssignCardModalForMember(member);
      },
      error: (err) => {
        this.creatingMember.set(false);
        this.toastService.error(err?.error?.message || 'Erreur lors de la création.');
      },
    });
  }

  // ─── Associer une carte physique vierge à un client fidélité ────────────────

  openAssignCardModal(a: LoyaltyAccountRow): void {
    if (!a.member) return;
    this.assignCardTarget.set({ memberId: a.member.id, memberType: a.member.type, label: this.holderLabel(a), cardNumber: a.card_number });
    this.assignCardPayload = '';
    this.showAssignCardCamera.set(false);
    this.showPickPrintedCard.set(false);
  }

  openAssignCardModalForMember(m: LoyaltyMemberRow): void {
    this.assignCardTarget.set({ memberId: m.id, memberType: m.type, label: this.memberDisplayName(m), cardNumber: null });
    this.assignCardPayload = '';
    this.showAssignCardCamera.set(false);
    this.showPickPrintedCard.set(false);
  }

  closeAssignCardModal(): void {
    this.assignCardTarget.set(null);
    this.assignCardPayload = '';
    this.showAssignCardCamera.set(false);
    this.showPickPrintedCard.set(false);
  }

  onAssignCardScanned(decodedText: string): void {
    this.assignCardPayload = decodedText;
    this.showAssignCardCamera.set(false);
    this.submitAssignCard();
  }

  submitAssignCard(): void {
    const target = this.assignCardTarget();
    if (!target || !this.assignCardPayload.trim()) return;

    this.assigningCard.set(true);
    this.loyaltyService.assignCard(target.memberId, this.assignCardPayload.trim()).subscribe({
      next: () => {
        this.assigningCard.set(false);
        this.toastService.success('Carte physique associée au client.');
        this.closeAssignCardModal();
        this.loadAccounts();
      },
      error: (err) => {
        this.assigningCard.set(false);
        this.toastService.error(err?.error?.message || "Erreur lors de l'association de la carte.");
      },
    });
  }

  // ─── Sélection d'une carte déjà imprimée et prête (sans scanner) ────────────

  openPickPrintedCard(): void {
    this.showPickPrintedCard.set(true);
    this.showAssignCardCamera.set(false);
    this.loadPrintedCards();
  }

  closePickPrintedCard(): void {
    this.showPickPrintedCard.set(false);
  }

  loadPrintedCards(): void {
    this.loadingPrintedCards.set(true);
    const memberType = this.assignCardTarget()?.memberType;
    this.loyaltyService.listAccounts(1, 50, { holder_type: 'unassigned', batch_status: 'printed', blank_card_type: memberType }).subscribe({
      next: (res) => {
        this.printedCards.set(res.items);
        this.loadingPrintedCards.set(false);
      },
      error: () => this.loadingPrintedCards.set(false),
    });
  }

  pickPrintedCard(card: LoyaltyAccountRow): void {
    const target = this.assignCardTarget();
    if (!target) return;

    this.pickingCardId.set(card.id);
    this.loyaltyService.getQrPayload(card.id).subscribe({
      next: ({ qr_payload }) => {
        this.pickingCardId.set(null);
        if (!qr_payload) {
          this.toastService.error('Impossible de récupérer le code de cette carte.');
          return;
        }
        this.assignCardPayload = qr_payload;
        this.showPickPrintedCard.set(false);
        this.submitAssignCard();
      },
      error: () => {
        this.pickingCardId.set(null);
        this.toastService.error('Erreur lors de la récupération du code de cette carte.');
      },
    });
  }

  retryMemberProvisioning(a: LoyaltyAccountRow): void {
    const memberId = a.member?.id;
    if (!memberId) return;
    this.loyaltyService.retryMemberSiraProvisioning(memberId).subscribe({
      next: () => {
        this.toastService.success('Nouvelle tentative de provisioning SIRA lancée.');
        this.loadAccounts();
      },
      error: (err) => this.toastService.error(err?.error?.message || 'Erreur lors de la relance.'),
    });
  }
}
