import { Component, EventEmitter, OnDestroy, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Html5Qrcode } from 'html5-qrcode';

@Component({
  selector: 'app-qr-camera-scanner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-2">
      <div class="relative w-full rounded-2xl overflow-hidden bg-black" style="aspect-ratio: 1 / 1;">
        <div [id]="elementId" class="qr-scanner-mount absolute inset-0 w-full h-full"></div>
        <div *ngIf="loading()" class="absolute inset-0 flex items-center justify-center text-white/70 text-xs font-bold gap-2">
          <span class="material-symbols-outlined animate-spin text-lg">sync</span>
          Démarrage de la caméra...
        </div>
      </div>
      <p *ngIf="error()" class="text-[11px] text-red-600 font-semibold text-center">{{ error() }}</p>
    </div>
  `,
  styles: [`
    /* html5-qrcode injecte son propre <video>/<canvas> avec des dimensions inline ;
       on force le remplissage du conteneur pour éviter un flux vidéo minuscule
       invisible sur fond noir (symptôme : carré entièrement noir, sans erreur). */
    .qr-scanner-mount ::ng-deep video,
    .qr-scanner-mount ::ng-deep canvas {
      width: 100% !important;
      height: 100% !important;
      object-fit: cover !important;
    }
  `],
})
export class QrCameraScannerComponent implements OnInit, OnDestroy {
  @Output() decoded = new EventEmitter<string>();

  elementId = 'qr-camera-scanner-' + Math.random().toString(36).slice(2);
  error = signal<string | null>(null);
  loading = signal(true);

  private html5Qr: Html5Qrcode | null = null;
  private stopped = false;

  async ngOnInit(): Promise<void> {
    this.html5Qr = new Html5Qrcode(this.elementId);
    try {
      await this.html5Qr.start(
        // 'ideal' (pas 'exact') : se rabat sur n'importe quelle caméra dispo (webcam
        // laptop, etc.) au lieu d'échouer si aucune caméra arrière n'existe.
        { facingMode: { ideal: 'environment' } },
        { fps: 10, qrbox: 220, aspectRatio: 1 },
        (decodedText) => {
          if (this.stopped) return;
          this.stopped = true;
          this.decoded.emit(decodedText);
        },
        () => {},
      );
      this.loading.set(false);
    } catch (err) {
      console.error('QrCameraScanner: échec démarrage caméra', err);
      this.loading.set(false);
      this.error.set('Caméra indisponible. Autorisez l’accès à la caméra ou collez le code manuellement.');
    }
  }

  ngOnDestroy(): void {
    if (!this.html5Qr) return;
    this.html5Qr
      .stop()
      .catch(() => {})
      .finally(() => this.html5Qr?.clear());
  }
}
