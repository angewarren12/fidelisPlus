import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';
import { ToastComponent } from '../../ui/toast.component';
import { PasswordChangeSheetComponent } from '../../ui/password-change-sheet/password-change-sheet.component';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, HeaderComponent, ToastComponent, PasswordChangeSheetComponent],
  template: `
    <div class="min-h-screen bg-background">
      <app-toast></app-toast>
      <app-sidebar></app-sidebar>

      <main class="ml-0 lg:ml-64 min-h-screen">
        <app-header></app-header>

        <div class="pt-28 px-4 sm:px-6 lg:px-8 pb-12">
          <router-outlet></router-outlet>
        </div>
      </main>

      <app-password-change-sheet
        *ngIf="showPasswordSheet()"
        (skip)="dismissPasswordSheet()"
        (done)="dismissPasswordSheet()">
      </app-password-change-sheet>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100vh; }
  `]
})
export class MainLayoutComponent implements OnInit {
  private auth = inject(AuthService);

  showPasswordSheet = signal(false);
  private skippedThisSession = false;

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      this.auth.refreshCurrentUser().subscribe({
        next: (user) => this.syncPasswordSheet(user?.must_change_password),
        error: () => this.auth.logout(),
      });
    }

    this.auth.currentUser$.subscribe((user) => this.syncPasswordSheet(user?.must_change_password));
  }

  private syncPasswordSheet(mustChangePassword: boolean | undefined): void {
    this.showPasswordSheet.set(!!mustChangePassword && !this.skippedThisSession);
  }

  dismissPasswordSheet(): void {
    this.skippedThisSession = true;
    this.showPasswordSheet.set(false);
  }
}
