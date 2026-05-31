import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';
import QRCode from 'qrcode';
import { CardGeneratorComponent } from '../card-generator/card-generator.component';
import {
  LoyaltyService,
  LoyaltyAccountRow,
  LoyaltyClientUserOption,
  LoyaltyCompanyOption,
  LoyaltyRedemptionRow,
  LoyaltyRewardRow,
  StationScanReport,
} from '../../../services/loyalty.service';
import { ToastService } from '../../../services/toast.service';
import { AuthService } from '../../../services/auth.service';
import { UserRoles } from '../../../models/user-roles';

type LoyaltyTab = 'accounts' | 'reports' | 'bootstrap' | 'activity' | 'redemptions' | 'rewards' | 'settings';

@Component({
  selector: 'app-loyalty-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgApexchartsModule, CardGeneratorComponent],
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

  tab = signal<LoyaltyTab>('accounts');
  accounts = signal<LoyaltyAccountRow[]>([]);
  rewards = signal<LoyaltyRewardRow[]>([]);
  redemptions = signal<LoyaltyRedemptionRow[]>([]);
  settings = signal<any[]>([]);
  activity = signal<any[]>([]);
  referralStats = signal<{ total_referrals: number; top_referrers: { id: number; name: string; referrals_count: number }[] } | null>(null);

  loadingAccounts = signal(false);
  loadingActivity = signal(false);
  loadingSettings = signal(false);
  loadingRedemptions = signal(false);
  reportLoading = signal(false);
  bootstrapLoading = signal(false);

  accountSearchQuery = '';
  lastQrPayload = signal<string | null>(null);
  qrDataUrl = signal<string | null>(null);
  qrLoadingId = signal<number | null>(null);
  showCardModal = signal(false);
  printAccount = signal<LoyaltyAccountRow | null>(null);
  
  selectedAccountDetail = signal<LoyaltyAccountRow | null>(null);

  reportDateFrom = '';
  reportDateTo = '';
  stationReport = signal<StationScanReport | null>(null);
  chartOptions: any;

  bootstrapMode: 'company' | 'user' = 'company';
  companySearch = '';
  userSearch = '';
  companyOptions = signal<LoyaltyCompanyOption[]>([]);
  userOptions = signal<LoyaltyClientUserOption[]>([]);
  selectedCompanyId: number | null = null;
  selectedUserId: number | null = null;

  redemptionFilter = 'pending';

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
  cardQrPayload = '';

  ngOnInit(): void {
    const td = this.todayInputDate();
    const prevWeek = new Date();
    prevWeek.setDate(prevWeek.getDate() - 7);
    this.reportDateFrom = this.formatDate(prevWeek);
    this.reportDateTo = td;

    this.route.queryParams.subscribe((p) => {
      const cid = p['company_id'];
      if (cid) {
        this.selectedCompanyId = Number(cid);
        this.bootstrapMode = 'company';
        this.switchTab('bootstrap');
        this.searchCompanies();
      }
      if (p['tab']) {
        this.switchTab(p['tab'] as LoyaltyTab);
      }
    });

    this.loadAccounts();
    this.loadRewards();
    if (this.canManageLoyalty()) {
      this.loadReferralStats();
    }
  }

  switchTab(t: LoyaltyTab): void {
    this.tab.set(t);
    if (t === 'reports') this.loadStationReport();
    else if (t === 'activity') this.loadActivity();
    else if (t === 'settings') this.loadSettings();
    else if (t === 'redemptions') this.loadRedemptions();
    else if (t === 'rewards') this.loadRewards();
  }

  loadAccounts(): void {
    this.loadingAccounts.set(true);
    this.loyaltyService.listAccounts(1, 100).subscribe({
      next: (res) => {
        let items = res.items;
        if (this.accountSearchQuery) {
          const q = this.accountSearchQuery.toLowerCase();
          items = items.filter(
            (a) =>
              a.company?.name?.toLowerCase().includes(q) ||
              a.user?.first_name?.toLowerCase().includes(q) ||
              a.user?.last_name?.toLowerCase().includes(q) ||
              a.holder_key.toLowerCase().includes(q),
          );
        }
        this.accounts.set(items);
        this.loadingAccounts.set(false);
      },
      error: () => {
        this.loadingAccounts.set(false);
        this.toastService.error('Erreur chargement comptes.');
      },
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

  loadReferralStats(): void {
    this.loyaltyService.referralStats().subscribe({
      next: (data) => this.referralStats.set(data),
      error: () => {},
    });
  }

  loadRedemptions(): void {
    this.loadingRedemptions.set(true);
    const status = this.redemptionFilter === 'all' ? undefined : this.redemptionFilter;
    this.loyaltyService.listRedemptions(status).subscribe({
      next: (res) => {
        this.redemptions.set(res.items);
        this.loadingRedemptions.set(false);
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

  searchCompanies(): void {
    this.loyaltyService.searchCompanies(this.companySearch).subscribe((rows) => {
      this.companyOptions.set(rows);
      if (this.selectedCompanyId && !rows.find((c) => c.id === this.selectedCompanyId)) {
        const pre = rows.find((c) => c.id === this.selectedCompanyId);
        if (!pre && this.companySearch === '') {
          this.loyaltyService.searchCompanies('').subscribe((all) => this.companyOptions.set(all));
        }
      }
    });
  }

  searchUsers(): void {
    this.loyaltyService.searchClientUsers(this.userSearch).subscribe((rows) => this.userOptions.set(rows));
  }

  runBootstrap(): void {
    const opts =
      this.bootstrapMode === 'company'
        ? { company_id: this.selectedCompanyId ?? undefined, qr_payload: this.cardQrPayload.trim() || undefined }
        : { user_id: this.selectedUserId ?? undefined, qr_payload: this.cardQrPayload.trim() || undefined };

    if (!opts.company_id && !opts.user_id) {
      this.toastService.error('Sélectionnez une société ou un client.');
      return;
    }

    this.bootstrapLoading.set(true);
    this.loyaltyService.bootstrapAccount(opts).subscribe({
      next: async (res) => {
        this.bootstrapLoading.set(false);
        this.cardQrPayload = '';
        await this.displayQr(res.qr_payload);
        this.toastService.success('Carte fidélité créée ou récupérée.');
        this.loadAccounts();
        this.tab.set('accounts');
      },
      error: (err) => {
        this.bootstrapLoading.set(false);
        this.toastService.error(err?.error?.message || 'Échec création carte.');
      },
    });
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

  openCardModal(a: LoyaltyAccountRow): void {
    this.printAccount.set(a);
    this.loyaltyService.getQrPayload(a.id, false).subscribe({
      next: (res) => {
        this.lastQrPayload.set(res.qr_payload);
        this.showCardModal.set(true);
      },
      error: () => this.toastService.error('Erreur chargement QR pour la carte.')
    });
  }

  closeCardModal(): void {
    this.showCardModal.set(false);
    this.printAccount.set(null);
    this.lastQrPayload.set(null);
  }

  openAccountDetail(a: LoyaltyAccountRow): void {
    this.selectedAccountDetail.set(a);
  }

  closeAccountDetail(): void {
    this.selectedAccountDetail.set(null);
  }

  openClaimModal(a: LoyaltyAccountRow): void {
    this.claimAccount.set(a);
    this.claimRewardId = this.rewards().find((r) => r.is_active)?.id ?? null;
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

  holderLabel(a: LoyaltyAccountRow): string {
    if (a.holder_type === 'company') return a.company?.name || 'Société';
    return `${a.user?.first_name || ''} ${a.user?.last_name || ''}`.trim() || 'Particulier';
  }

  filteredRewardsForClaim(): LoyaltyRewardRow[] {
    const acc = this.claimAccount();
    if (!acc) return [];
    
    let segment = 'particulier';
    if (acc.holder_type === 'company' && acc.company) {
      segment = acc.company.company_type || 'flotte';
    }
    
    return this.rewards().filter(r => {
      if (!r.client_segments || r.client_segments.length === 0) return true;
      return r.client_segments.includes(segment);
    });
  }

  redemptionHolderLabel(r: LoyaltyRedemptionRow): string {
    const acc = r.account;
    if (!acc) return '—';
    return this.holderLabel(acc);
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
    return this.auth.hasRole(UserRoles.ADMIN);
  }

  canManageLoyalty(): boolean {
    return this.auth.hasRole(UserRoles.ADMIN, UserRoles.MARKETING);
  }

  canEmitLoyaltyCard(): boolean {
    return this.canManageLoyalty();
  }

  showCrmLinks(): boolean {
    return this.auth.hasRole(UserRoles.ADMIN, UserRoles.COMMERCIAL);
  }

  private todayInputDate(): string {
    return this.formatDate(new Date());
  }

  private formatDate(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
}
