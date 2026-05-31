import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';
import { ToastComponent } from '../../ui/toast.component';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, HeaderComponent, ToastComponent],
  template: `
    <div class="min-h-screen bg-background">
      <app-toast></app-toast>
      <app-sidebar></app-sidebar>
      
      <main class="ml-64 min-h-screen">
        <app-header></app-header>
        
        <div class="pt-28 px-8 pb-12">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100vh; }
  `]
})
export class MainLayoutComponent implements OnInit {
  private auth = inject(AuthService);

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      this.auth.refreshCurrentUser().subscribe({ error: () => this.auth.logout() });
    }
  }
}
