import { Component, Input, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import QRCode from 'qrcode';

@Component({
  selector: 'app-card-generator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card-pvc-container" #printSection>
      <div class="card-pvc relative overflow-hidden bg-gradient-to-r from-[#0d9488] to-[#14b8a6] text-white rounded-xl shadow-xl flex flex-col justify-between" style="width: 85.6mm; height: 54mm; padding: 4mm;">
        <!-- Background Pattern -->
        <div class="absolute inset-0 opacity-10 pointer-events-none" style="background-image: radial-gradient(#ffffff 1px, transparent 1px); background-size: 10px 10px;"></div>
        
        <!-- Header: Logo and Title -->
        <div class="relative z-10 flex justify-between items-start">
          <div class="flex flex-col">
            <h1 class="text-xs font-black uppercase tracking-widest text-[#f0fdfa]">Fidelis Plus</h1>
            <p class="text-[6px] font-medium tracking-widest uppercase text-[#ccfbf1] mt-0.5">{{ holderType }}</p>
          </div>
          <!-- Fake logo slot -->
          <div class="w-8 h-8 rounded bg-white/20 flex items-center justify-center text-[8px] font-black uppercase shadow-sm">
            LOGO
          </div>
        </div>

        <!-- Body: User Info & QR -->
        <div class="relative z-10 flex items-end justify-between mt-auto">
          <div class="flex flex-col gap-1">
             <p class="text-[8px] uppercase tracking-widest text-white/70">Titulaire</p>
             <h2 class="text-sm font-black uppercase leading-tight max-w-[120px] truncate">{{ holderName }}</h2>
             <p class="font-mono text-[7px] text-white/50 tracking-widest mt-1">ID: {{ publicUuid.split('-')[0].toUpperCase() }}</p>
          </div>
          
          <div class="bg-white p-1 rounded-lg shadow-sm flex items-center justify-center">
            <img *ngIf="qrDataUrl" [src]="qrDataUrl" class="w-14 h-14" alt="QR Code" />
          </div>
        </div>
      </div>
    </div>
    
    <div class="mt-4 flex gap-2">
       <button (click)="printCard()" class="h-10 px-4 rounded-xl bg-primary text-white text-[10px] font-black uppercase shadow-sm flex items-center gap-2">
         <span class="material-symbols-outlined text-[14px]">print</span>
         Imprimer (Axe CR80)
       </button>
    </div>
  `,
  styles: [`
    @media print {
      body * {
        visibility: hidden;
      }
      .card-pvc-container, .card-pvc-container * {
        visibility: visible;
      }
      .card-pvc-container {
        position: absolute;
        left: 0;
        top: 0;
        margin: 0;
        padding: 0;
      }
    }
  `]
})
export class CardGeneratorComponent implements OnInit {
  @Input() publicUuid!: string;
  @Input() holderName!: string;
  @Input() holderType!: string;
  @Input() qrPayload!: string;

  @ViewChild('printSection') printSection!: ElementRef;

  qrDataUrl: string | null = null;

  async ngOnInit() {
    if (this.qrPayload) {
      try {
        this.qrDataUrl = await QRCode.toDataURL(this.qrPayload, {
          width: 200,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' }
        });
      } catch (e) {
        console.error('QR generation failed for card print.');
      }
    }
  }

  printCard() {
    window.print();
  }
}
