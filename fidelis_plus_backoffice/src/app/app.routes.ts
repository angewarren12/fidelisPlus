import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { marketingRoleGuard } from './guards/marketing-role.guard';
import { backofficeAccessGuard } from './guards/backoffice-access.guard';
import { crmRoleGuard } from './guards/crm-role.guard';
import { staffRoleGuard } from './guards/staff-role.guard';
import { adminRoleGuard, commercialAdminRoleGuard } from './guards/admin-role.guard';
import { homeRedirectGuard } from './guards/home-redirect.guard';
import { clientsRoleGuard } from './guards/clients-role.guard';
import { clientRoleGuard } from './guards/client-role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./components/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
  },
  {
    path: 'change-password',
    loadComponent: () => import('./components/change-password/change-password.component').then(m => m.ChangePasswordComponent),
    canActivate: [authGuard],
  },
  {
    path: 'fidelis-plus',
    loadComponent: () => import('./components/public/fidelis-plus-landing/fidelis-plus-landing.component').then(m => m.FidelisPlusLandingComponent),
  },
  {
    path: '',
    loadComponent: () => import('./components/layout/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard, backofficeAccessGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent),
        canActivate: [crmRoleGuard],
      },
      {
        path: 'prospection',
        loadComponent: () => import('./components/prospects/prospect-list/prospect-list.component').then(m => m.ProspectListComponent),
        canActivate: [crmRoleGuard],
      },
      {
        path: 'prospection/nouveau',
        loadComponent: () => import('./components/prospects/prospect-form/prospect-form.component').then(m => m.ProspectFormComponent),
        canActivate: [crmRoleGuard],
      },
      {
        path: 'prospection/:id/editer',
        loadComponent: () => import('./components/prospects/prospect-form/prospect-form.component').then(m => m.ProspectFormComponent),
        canActivate: [crmRoleGuard],
      },
      {
        path: 'clients',
        loadComponent: () => import('./components/clients/client-list/client-list.component').then(m => m.ClientListComponent),
        canActivate: [clientsRoleGuard],
      },
      {
        path: 'clients/nouveau',
        loadComponent: () => import('./components/clients/client-form/client-form.component').then(m => m.ClientFormComponent),
        canActivate: [clientsRoleGuard],
      },
      {
        path: 'clients/:id',
        loadComponent: () => import('./components/clients/client-detail/client-detail.component').then(m => m.ClientDetailComponent),
        canActivate: [clientsRoleGuard],
      },
      {
        path: 'clients/:id/modifier',
        loadComponent: () => import('./components/clients/client-edit/client-edit.component').then(m => m.ClientEditComponent),
        canActivate: [clientsRoleGuard],
      },
      {
        path: 'clients/:id/contacts/nouveau',
        loadComponent: () => import('./components/clients/contact-form/contact-form.component').then(m => m.ContactFormComponent),
        canActivate: [clientsRoleGuard],
      },
      {
        path: 'clients/:id/vehicules/nouveau',
        loadComponent: () => import('./components/clients/vehicle-form/vehicle-form.component').then(m => m.VehicleFormComponent),
        canActivate: [clientsRoleGuard],
      },
      {
        path: 'clients/:id/vehicules/:vehicleId/editer',
        loadComponent: () => import('./components/clients/vehicle-form/vehicle-form.component').then(m => m.VehicleFormComponent),
        canActivate: [clientsRoleGuard],
      },
      {
        path: 'clients/:id/vehicules/:vehicleId',
        loadComponent: () => import('./components/clients/vehicle-detail/vehicle-detail.component').then(m => m.VehicleDetailComponent),
        canActivate: [clientsRoleGuard],
      },
      {
        path: 'fleet',
        loadComponent: () => import('./components/fleet/fleet-list/fleet-list.component').then(m => m.FleetListComponent),
        canActivate: [crmRoleGuard],
      },
      {
        path: 'vente',
        loadComponent: () => import('./components/vente/quote-list/quote-list.component').then(m => m.QuoteListComponent),
        canActivate: [crmRoleGuard],
      },
      {
        path: 'vente/rappels',
        loadComponent: () => import('./components/vente/reminders-list/reminders-list.component').then(m => m.RemindersListComponent),
        canActivate: [crmRoleGuard],
      },
      {
        path: 'vente/nouveau',
        loadComponent: () => import('./components/vente/quote-form/quote-form.component').then(m => m.QuoteFormComponent),
        canActivate: [crmRoleGuard],
      },
      {
        path: 'vente/:id/imprimer',
        loadComponent: () => import('./components/vente/quote-print/quote-print.component').then(m => m.QuotePrintComponent),
        canActivate: [crmRoleGuard],
      },
      {
        path: 'equipe',
        loadComponent: () => import('./components/team/team-list/team-list.component').then(m => m.TeamListComponent),
        canActivate: [staffRoleGuard],
      },
      {
        path: 'equipe/nouveau',
        loadComponent: () => import('./components/team/team-form/team-form.component').then(m => m.TeamFormComponent),
        canActivate: [staffRoleGuard],
      },
      {
        path: 'equipe/editer/:id',
        loadComponent: () => import('./components/team/team-form/team-form.component').then(m => m.TeamFormComponent),
        canActivate: [staffRoleGuard],
      },
      {
        path: 'equipe/:id/performances',
        loadComponent: () => import('./components/team/commercial-performance/commercial-performance.component').then(m => m.CommercialPerformanceComponent),
        canActivate: [staffRoleGuard],
      },
      {
        path: 'equipe/:id',
        loadComponent: () => import('./components/team/team-member-detail/team-member-detail.component').then(m => m.TeamMemberDetailComponent),
        canActivate: [staffRoleGuard],
      },
      {
        path: 'marketing/dashboard',
        loadComponent: () => import('./components/marketing/marketing-dashboard/marketing-dashboard.component').then(m => m.MarketingDashboardComponent),
        canActivate: [marketingRoleGuard],
      },
      {
        path: 'marketing/fidelite',
        loadComponent: () => import('./components/marketing/loyalty-dashboard/loyalty-dashboard.component').then(m => m.LoyaltyDashboardComponent),
        canActivate: [marketingRoleGuard],
      },
      {
        // "Mes Clients" a été fusionné dans "Comptes Fidélité" (/marketing/fidelite) —
        // on redirige les anciens liens plutôt que de casser les favoris/bookmarks.
        path: 'marketing/clients',
        redirectTo: 'marketing/fidelite',
        pathMatch: 'full',
      },
      {
        path: 'marketing/studio-carte',
        loadComponent: () => import('./components/marketing/loyalty-card-studio/loyalty-card-studio.component').then(m => m.LoyaltyCardStudioComponent),
        canActivate: [marketingRoleGuard],
      },
      {
        path: 'admin/stations',
        loadComponent: () => import('./components/marketing/station-list/station-list.component').then(m => m.StationListComponent),
        canActivate: [adminRoleGuard],
      },
      {
        path: 'admin/settings',
        loadComponent: () => import('./components/admin/settings/settings.component').then(m => m.SettingsComponent),
        canActivate: [commercialAdminRoleGuard],
      },
      {
        path: 'admin/payment-terms',
        loadComponent: () => import('./components/admin/payment-terms/payment-terms.component').then(m => m.PaymentTermsComponent),
        canActivate: [commercialAdminRoleGuard],
      },
      { path: '', pathMatch: 'full', canActivate: [homeRedirectGuard], children: [] },

      // ─── ESPACE CLIENT ───────────────────────────────────────────────────
      {
        path: 'client/dashboard',
        loadComponent: () => import('./components/clients/client-dashboard/client-dashboard.component').then(m => m.ClientDashboardComponent),
        canActivate: [clientRoleGuard],
      },
      {
        path: 'client/fleet',
        loadComponent: () => import('./components/clients/client-fleet/client-fleet.component').then(m => m.ClientFleetComponent),
        canActivate: [clientRoleGuard],
      },
      {
        path: 'client/fleet/:vehicleId',
        loadComponent: () => import('./components/clients/client-vehicle-detail/client-vehicle-detail.component').then(m => m.ClientVehicleDetailComponent),
        canActivate: [clientRoleGuard],
      },
      {
        path: 'client/quotes',
        loadComponent: () => import('./components/clients/client-quotes/client-quotes.component').then(m => m.ClientQuotesComponent),
        canActivate: [clientRoleGuard],
      },
      {
        path: 'client/support',
        loadComponent: () => import('./components/clients/client-support/client-support.component').then(m => m.ClientSupportComponent),
        canActivate: [clientRoleGuard],
      },
      {
        path: 'client/profile',
        loadComponent: () => import('./components/clients/client-profile/client-profile.component').then(m => m.ClientProfileComponent),
        canActivate: [clientRoleGuard],
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
