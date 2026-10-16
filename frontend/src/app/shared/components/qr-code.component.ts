import { Component, Input, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-qr-code',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="qr-container">
      @if (qrDataUrl()) {
        <img [src]="qrDataUrl()" [alt]="'Scan QR to download try-on photo'" [width]="size" [height]="size" class="qr-image" />
      } @else {
        <div class="qr-placeholder" [style.width.px]="size" [style.height.px]="size">
          <span>QR Code</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .qr-container {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 6px;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 6px 24px rgba(212, 175, 55, 0.35);
      border: 2px solid #d4af37;
    }
    .qr-image {
      display: block;
      border-radius: 6px;
    }
    .qr-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      color: #888;
      background: #f7f7f7;
      border-radius: 6px;
    }
  `]
})
export class QrCodeComponent implements OnChanges {
  @Input() value: string = '';
  @Input() size: number = 130;

  readonly qrDataUrl = signal<string>('');

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] || changes['size']) {
      this.generateQr();
    }
  }

  private async generateQr(): Promise<void> {
    if (!this.value) {
      this.qrDataUrl.set('');
      return;
    }
    try {
      const url = await QRCode.toDataURL(this.value, {
        width: this.size * 2,
        margin: 1,
        color: {
          dark: '#1c0d16',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      });
      this.qrDataUrl.set(url);
    } catch (err) {
      console.error('Error generating QR code:', err);
    }
  }
}
