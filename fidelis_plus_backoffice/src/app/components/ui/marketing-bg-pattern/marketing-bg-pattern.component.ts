import { Component } from '@angular/core';

/**
 * Fond décoratif partagé par les dashboards du rôle marketing (fidélité, studio carte,
 * stations...) : grille de points + halos verts Mayelia flottants, en arrière-plan fixe.
 * Centralisé ici pour garder un rendu identique sur toutes les pages marketing.
 */
@Component({
  selector: 'app-marketing-bg-pattern',
  standalone: true,
  template: `
    <div class="mkt-bg__grid"></div>
    <div class="mkt-bg__blob mkt-bg__blob--1"></div>
    <div class="mkt-bg__blob mkt-bg__blob--2"></div>
    <div class="mkt-bg__blob mkt-bg__blob--3"></div>
  `,
  host: { 'aria-hidden': 'true' },
  styles: [`
    :host {
      position: fixed;
      inset: 0;
      z-index: 0;
      display: block;
      overflow: hidden;
      pointer-events: none;
    }

    .mkt-bg__grid {
      position: absolute;
      inset: -10%;
      background-image: radial-gradient(circle, rgba(21, 185, 163, 0.3) 1.6px, transparent 1.6px);
      background-size: 28px 28px;
      animation: mktBgDrift 60s linear infinite;
    }

    .mkt-bg__blob {
      position: absolute;
      border-radius: 9999px;
      filter: blur(100px);
    }
    .mkt-bg__blob--1 {
      width: 560px;
      height: 560px;
      top: -180px;
      right: -160px;
      background: radial-gradient(circle, rgba(21, 185, 163, 0.55), transparent 70%);
      animation: mktBlobA 24s ease-in-out infinite;
    }
    .mkt-bg__blob--2 {
      width: 480px;
      height: 480px;
      bottom: -200px;
      left: -140px;
      background: radial-gradient(circle, rgba(0, 107, 93, 0.5), transparent 70%);
      animation: mktBlobB 30s ease-in-out infinite;
    }
    .mkt-bg__blob--3 {
      width: 340px;
      height: 340px;
      top: 38%;
      left: 58%;
      background: radial-gradient(circle, rgba(79, 220, 196, 0.4), transparent 70%);
      animation: mktBlobC 26s ease-in-out infinite;
    }

    @keyframes mktBgDrift {
      from { background-position: 0 0; }
      to { background-position: 280px 280px; }
    }
    @keyframes mktBlobA {
      0%, 100% { transform: translate(0, 0) scale(1); }
      50% { transform: translate(-40px, 50px) scale(1.12); }
    }
    @keyframes mktBlobB {
      0%, 100% { transform: translate(0, 0) scale(1); }
      50% { transform: translate(50px, -40px) scale(1.1); }
    }
    @keyframes mktBlobC {
      0%, 100% { transform: translate(0, 0) scale(1); }
      50% { transform: translate(-30px, -30px) scale(1.15); }
    }
  `],
})
export class MarketingBgPatternComponent {}
