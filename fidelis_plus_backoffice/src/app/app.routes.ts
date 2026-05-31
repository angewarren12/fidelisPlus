import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { MainLayoutComponent } from './components/layout/main-layout/main-layout.component';
import { ProspectListComponent } from './components/prospects/prospect-list/prospect-list.component';
import { ProspectFormComponent } from './components/prospects/prospect-form/prospect-form.component';
import { ClientListComponent } from './components/clients/client-list/client-list.component';
import { ClientDetailComponent } from './components/clients/client-detail/client-detail.component';
import { ClientFormComponent } from './components/clients/client-form/client-form.component';
import { ClientEditComponent } from './components/clients/client-edit/client-edit.component';
import { ContactFormComponent } from './components/clients/contact-form/contact-form.component';
import { VehicleFormComponent } from './components/clients/vehicle-form/vehicle-form.component';
import { VehicleDetailComponent } from './components/clients/vehicle-detail/vehicle-detail.component';
import { FleetListComponent } from './components/fleet/fleet-list/fleet-list.component';
import { QuoteFormComponent } from './components/vente/quote-form/quote-form.component';
import { QuoteListComponent } from './components/vente/quote-list/quote-list.component';
import { QuotePrintComponent } from './components/vente/quote-print/quote-print.component';
import { TeamListComponent } from './components/team/team-list/team-list.component';
import { TeamFormComponent } from './components/team/team-form/team-form.component';
import { CommercialPerformanceComponent } from './components/team/commercial-performance/commercial-performance.component';
import { LoyaltyDashboardComponent } from './components/marketing/loyalty-dashboard/loyalty-dashboard.component';
import { StationListComponent } from './components/marketing/station-list/station-list.component';
import { authGuard } from './guards/auth.guard';
import { marketingRoleGuard } from './guards/marketing-role.guard';
import { backofficeAccessGuard } from './guards/backoffice-access.guard';
import { crmRoleGuard } from './guards/crm-role.guard';
import { staffRoleGuard } from './guards/staff-role.guard';
import { adminRoleGuard } from './guards/admin-role.guard';
import { homeRedirectGuard } from './guards/home-redirect.guard';
import { clientsRoleGuard } from './guards/clients-role.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard, backofficeAccessGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent, canActivate: [crmRoleGuard] },
      { path: 'prospection', component: ProspectListComponent, canActivate: [crmRoleGuard] },
      { path: 'prospection/nouveau', component: ProspectFormComponent, canActivate: [crmRoleGuard] },
      { path: 'clients', component: ClientListComponent, canActivate: [clientsRoleGuard] },
      { path: 'clients/nouveau', component: ClientFormComponent, canActivate: [clientsRoleGuard] },
      { path: 'clients/:id', component: ClientDetailComponent, canActivate: [clientsRoleGuard] },
      { path: 'clients/:id/modifier', component: ClientEditComponent, canActivate: [clientsRoleGuard] },
      { path: 'clients/:id/contacts/nouveau', component: ContactFormComponent, canActivate: [clientsRoleGuard] },
      { path: 'clients/:id/vehicules/nouveau', component: VehicleFormComponent, canActivate: [clientsRoleGuard] },
      { path: 'clients/:id/vehicules/:vehicleId/editer', component: VehicleFormComponent, canActivate: [clientsRoleGuard] },
      { path: 'clients/:id/vehicules/:vehicleId', component: VehicleDetailComponent, canActivate: [clientsRoleGuard] },
      { path: 'fleet', component: FleetListComponent, canActivate: [crmRoleGuard] },
      { path: 'vente', component: QuoteListComponent, canActivate: [crmRoleGuard] },
      { path: 'vente/nouveau', component: QuoteFormComponent, canActivate: [crmRoleGuard] },
      { path: 'vente/:id/imprimer', component: QuotePrintComponent, canActivate: [crmRoleGuard] },
      { path: 'equipe', component: TeamListComponent, canActivate: [staffRoleGuard] },
      { path: 'equipe/nouveau', component: TeamFormComponent, canActivate: [staffRoleGuard] },
      { path: 'equipe/editer/:id', component: TeamFormComponent, canActivate: [staffRoleGuard] },
      { path: 'equipe/:id/performances', component: CommercialPerformanceComponent, canActivate: [staffRoleGuard] },
      {
        path: 'marketing/fidelite',
        component: LoyaltyDashboardComponent,
        canActivate: [marketingRoleGuard],
      },
      {
        path: 'admin/stations',
        component: StationListComponent,
        canActivate: [adminRoleGuard],
      },
      { path: '', pathMatch: 'full', canActivate: [homeRedirectGuard], children: [] },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
