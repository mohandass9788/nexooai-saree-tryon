import { Injectable, signal, computed, effect, OnDestroy } from '@angular/core';
import { SareeItem, TryOnJobResponse } from './api.service';

export type KioskStep = 'WELCOME' | 'CAMERA' | 'CATALOGUE' | 'COMBINE' | 'PROCESSING' | 'RESULT';

@Injectable({
  providedIn: 'root'
})
export class KioskService implements OnDestroy {
  readonly currentStep = signal<KioskStep>('WELCOME');
  readonly consentAccepted = signal<boolean>(false);

  // Customer session state
  readonly customerPhotoDataUrl = signal<string | null>(null);
  readonly customerPhotoBlob = signal<Blob | null>(null);
  readonly selectedSaree = signal<SareeItem | null>(null);
  readonly customGarmentDataUrl = signal<string | null>(null);
  readonly customGarmentBlob = signal<Blob | null>(null);
  readonly tryOnResult = signal<TryOnJobResponse | null>(null);

  // Inactivity timeout (90 seconds default)
  readonly idleSecondsRemaining = signal<number>(90);
  private timerInterval: any = null;

  constructor() {
    this.startInactivityTimer();
  }

  ngOnDestroy(): void {
    this.stopInactivityTimer();
  }

  setStep(step: KioskStep): void {
    this.currentStep.set(step);
    this.recordActivity();
  }

  acceptConsent(): void {
    this.consentAccepted.set(true);
    this.setStep('CAMERA');
  }

  setCustomerPhoto(dataUrl: string, blob: Blob): void {
    this.customerPhotoDataUrl.set(dataUrl);
    this.customerPhotoBlob.set(blob);
    this.recordActivity();
  }

  setSelectedSaree(saree: SareeItem | null): void {
    this.selectedSaree.set(saree);
    if (saree && saree.id !== 'custom_product') {
      this.customGarmentDataUrl.set(null);
      this.customGarmentBlob.set(null);
    }
    this.recordActivity();
  }

  setCustomGarment(dataUrl: string, blob: Blob): void {
    this.customGarmentDataUrl.set(dataUrl);
    this.customGarmentBlob.set(blob);
    this.selectedSaree.set({
      id: 'custom_product',
      sku: 'CUSTOM-01',
      name_en: 'Custom Showroom Saree',
      name_ta: 'தனிப்பயன் ஆடை',
      category: 'Custom Saree',
      fabric: 'Showroom Piece',
      color: 'Custom Tone',
      price: 0,
      primary_image_url: dataUrl,
      is_active: false,
    });
    this.recordActivity();
  }

  clearCustomGarment(): void {
    this.customGarmentDataUrl.set(null);
    this.customGarmentBlob.set(null);
    if (this.selectedSaree()?.id === 'custom_product') {
      this.selectedSaree.set(null);
    }
    this.recordActivity();
  }

  setTryOnResult(result: TryOnJobResponse): void {
    this.tryOnResult.set(result);
    this.setStep('RESULT');
  }

  // Showroom Staff Kiosk Device Gate (Protects URL from public access)
  readonly isKioskUnlocked = signal<boolean>(this.checkStaffSession());

  // Paired Showroom Terminal Identity (Hardware binding)
  readonly pairedDeviceId = signal<string | null>(this.getStoredPairedDevice());
  readonly pairedStoreId = signal<string | null>(this.getStoredPairedStore());
  readonly pairedDeviceName = signal<string | null>(this.getStoredPairedDeviceName());

  private getStoredPairedDevice(): string | null {
    try {
      return localStorage.getItem('nexooai_paired_kiosk_id');
    } catch {
      return null;
    }
  }

  private getStoredPairedStore(): string | null {
    try {
      return localStorage.getItem('nexooai_paired_store_id') || 'shop_default';
    } catch {
      return 'shop_default';
    }
  }

  private getStoredPairedDeviceName(): string | null {
    try {
      return localStorage.getItem('nexooai_paired_kiosk_name');
    } catch {
      return null;
    }
  }

  private checkStaffSession(): boolean {
    try {
      // If hardware device is already paired, treat kiosk as hardware-authorized
      const paired = localStorage.getItem('nexooai_paired_kiosk_id');
      if (paired) {
        return true;
      }
      const raw = localStorage.getItem('nexooai_kiosk_staff_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.expires_at && Date.now() < parsed.expires_at) {
          return true;
        }
      }
    } catch {}
    return false;
  }

  pairDevice(terminalId: string, storeId: string = 'shop_default', deviceName?: string, token?: string): void {
    try {
      localStorage.setItem('nexooai_paired_kiosk_id', terminalId);
      localStorage.setItem('nexooai_paired_store_id', storeId);
      if (deviceName) {
        localStorage.setItem('nexooai_paired_kiosk_name', deviceName);
      }
    } catch {}
    this.pairedDeviceId.set(terminalId);
    this.pairedStoreId.set(storeId);
    if (deviceName) this.pairedDeviceName.set(deviceName);
    this.unlockKiosk(token || 'PAIRED_DEVICE_AUTH', 86400 * 365); // 1-year persistent pairing for 55" totem
  }

  unpairDevice(): void {
    try {
      localStorage.removeItem('nexooai_paired_kiosk_id');
      localStorage.removeItem('nexooai_paired_store_id');
      localStorage.removeItem('nexooai_paired_kiosk_name');
    } catch {}
    this.pairedDeviceId.set(null);
    this.pairedDeviceName.set(null);
    this.lockKiosk();
  }

  unlockKiosk(token: string, expiresInSeconds: number = 86400): void {
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    try {
      localStorage.setItem('nexooai_kiosk_staff_session', JSON.stringify({ token, expires_at: expiresAt }));
    } catch {}
    this.isKioskUnlocked.set(true);
    this.recordActivity();
  }

  lockKiosk(): void {
    try {
      localStorage.removeItem('nexooai_kiosk_staff_session');
    } catch {}
    this.isKioskUnlocked.set(false);
  }

  // Attract Screen / Idle Ad & Lookbook Showcase state
  readonly isAttractMode = signal<boolean>(false);
  readonly isAttractSuspended = signal<boolean>(false);
  readonly attractIdleSeconds = signal<number>(0);
  readonly attractTimeoutSeconds = signal<number>(this.getStoredAttractTimeout());
  readonly isAttractEnabled = signal<boolean>(true);
  readonly attractModeType = signal<'both' | 'video' | 'feed'>(this.getStoredAttractModeType());
  readonly attractDisplayMode = signal<'video' | 'feed'>('video');
  readonly attractVideoUrls = signal<string[]>(this.getStoredAttractVideoUrls());
  readonly activeVideoIndex = signal<number>(0);
  readonly attractVideoUrl = computed(() => {
    const list = this.attractVideoUrls();
    if (!list || list.length === 0) return 'https://www.youtube.com/watch?v=scL_y2_p8c8';
    return list[this.activeVideoIndex() % list.length];
  });
  readonly attractTitle = signal<string>(this.getStoredAttractTitle());
  readonly attractSubtitle = signal<string>(this.getStoredAttractSubtitle());

  private getStoredAttractTimeout(): number {
    try {
      const t = localStorage.getItem('nexooai_attract_timeout');
      if (t) return parseInt(t, 10);
    } catch {}
    return 120;
  }

  private getStoredAttractTitle(): string {
    try {
      return localStorage.getItem('nexooai_attract_title') || 'NeXooAi Luxury Saree Try-On';
    } catch {
      return 'NeXooAi Luxury Saree Try-On';
    }
  }

  private getStoredAttractSubtitle(): string {
    try {
      return localStorage.getItem('nexooai_attract_subtitle') || 'தொட்டுத் தொடங்குங்கள் — விரல் தொட்டதும் அழகிய பட்டுப் புடவை உங்களுக்கான தோற்றத்தில்!';
    } catch {
      return 'தொட்டுத் தொடங்குங்கள் — விரல் தொட்டதும் அழகிய பட்டுப் புடவை உங்களுக்கான தோற்றத்தில்!';
    }
  }

  private getStoredAttractVideoUrls(): string[] {
    try {
      const v = localStorage.getItem('nexooai_attract_video_url');
      if (v) return [v];
    } catch {}
    return ['https://www.youtube.com/watch?v=scL_y2_p8c8'];
  }

  private getStoredAttractModeType(): 'both' | 'video' | 'feed' {
    try {
      const t = localStorage.getItem('nexooai_attract_type');
      if (t === 'video' || t === 'feed' || t === 'both') return t;
    } catch {}
    return 'both';
  }

  recordActivity(): void {
    this.idleSecondsRemaining.set(90);
    this.attractIdleSeconds.set(0);
    if (this.isAttractMode()) {
      this.isAttractMode.set(false);
    }
  }

  dismissAttractMode(): void {
    this.isAttractMode.set(false);
    this.attractIdleSeconds.set(0);
    this.recordActivity();
  }

  nextAttractVideo(): void {
    const total = this.attractVideoUrls().length;
    if (total > 1) {
      this.activeVideoIndex.update((i) => (i + 1) % total);
    }
  }

  configureAttractMode(opts: {
    enabled?: boolean;
    timeoutSeconds?: number;
    videoUrl?: string;
    videoUrls?: string;
    attractModeType?: string;
    title?: string;
    subtitle?: string;
  }): void {
    if (opts.enabled !== undefined) this.isAttractEnabled.set(opts.enabled);
    if (opts.timeoutSeconds !== undefined) this.attractTimeoutSeconds.set(Math.max(120, opts.timeoutSeconds));
    if (opts.videoUrls !== undefined && opts.videoUrls.trim()) {
      const splitUrls = opts.videoUrls
        .split(/[,\n]/)
        .map((u) => u.trim())
        .filter((u) => u.length > 5);
      if (splitUrls.length > 0) {
        this.attractVideoUrls.set(splitUrls);
      }
    } else if (opts.videoUrl !== undefined && opts.videoUrl.trim()) {
      this.attractVideoUrls.set([opts.videoUrl.trim()]);
    }
    if (opts.attractModeType && ['both', 'video', 'feed'].includes(opts.attractModeType)) {
      this.attractModeType.set(opts.attractModeType as 'both' | 'video' | 'feed');
      if (opts.attractModeType === 'feed') {
        this.attractDisplayMode.set('feed');
      } else {
        this.attractDisplayMode.set('video');
      }
    }
    if (opts.title !== undefined) {
      this.attractTitle.set(opts.title);
      try { localStorage.setItem('nexooai_attract_title', opts.title); } catch {}
    }
    if (opts.subtitle !== undefined) {
      this.attractSubtitle.set(opts.subtitle);
      try { localStorage.setItem('nexooai_attract_subtitle', opts.subtitle); } catch {}
    }
    if (opts.videoUrl !== undefined && opts.videoUrl.trim()) {
      try { localStorage.setItem('nexooai_attract_video_url', opts.videoUrl.trim()); } catch {}
    }
    if (opts.attractModeType) {
      try { localStorage.setItem('nexooai_attract_type', opts.attractModeType); } catch {}
    }
    if (opts.timeoutSeconds) {
      try { localStorage.setItem('nexooai_attract_timeout', opts.timeoutSeconds.toString()); } catch {}
    }
  }

  resetSession(): void {
    // Revoke object URLs to ensure zero memory bloat during 12+ hour kiosk showroom shifts
    const prevUserUrl = this.customerPhotoDataUrl();
    if (prevUserUrl && typeof window !== 'undefined' && prevUserUrl.startsWith('blob:')) {
      try { URL.revokeObjectURL(prevUserUrl); } catch {}
    }
    const prevGarmentUrl = this.customGarmentDataUrl();
    if (prevGarmentUrl && typeof window !== 'undefined' && prevGarmentUrl.startsWith('blob:')) {
      try { URL.revokeObjectURL(prevGarmentUrl); } catch {}
    }
    this.currentStep.set('WELCOME');
    this.consentAccepted.set(false);
    this.customerPhotoDataUrl.set(null);
    this.customerPhotoBlob.set(null);
    this.selectedSaree.set(null);
    this.customGarmentDataUrl.set(null);
    this.customGarmentBlob.set(null);
    this.tryOnResult.set(null);
    this.idleSecondsRemaining.set(90);
    this.attractIdleSeconds.set(0);
  }

  private attractCycleCount = 0;

  private startInactivityTimer(): void {
    this.timerInterval = setInterval(() => {
      // 1. Check Attract Mode when on WELCOME screen and not suspended (e.g. during Admin login or when locked)
      if (this.currentStep() === 'WELCOME' && !this.isAttractSuspended() && this.isKioskUnlocked()) {
        if (this.isAttractEnabled() && !this.isAttractMode()) {
          const current = this.attractIdleSeconds();
          if (current + 1 >= this.attractTimeoutSeconds()) {
            this.isAttractMode.set(true);
            this.attractCycleCount = 0;
            if (this.attractModeType() === 'feed') {
              this.attractDisplayMode.set('feed');
            } else {
              this.attractDisplayMode.set('video');
            }
          } else {
            this.attractIdleSeconds.set(current + 1);
          }
        } else if (this.isAttractMode()) {
          // While attract mode is running: rotate content every 12 seconds
          this.attractCycleCount++;
          if (this.attractCycleCount % 12 === 0) {
            if (this.attractModeType() === 'both') {
              // Alternates between video and lookbook feed
              const nextMode = this.attractDisplayMode() === 'video' ? 'feed' : 'video';
              this.attractDisplayMode.set(nextMode);
              if (nextMode === 'video') {
                this.nextAttractVideo();
              }
            } else if (this.attractModeType() === 'video') {
              this.nextAttractVideo();
            }
          }
        }
      } else {
        // 2. Count down user active session for customer privacy
        const current = this.idleSecondsRemaining();
        if (current <= 1) {
          this.resetSession();
        } else {
          this.idleSecondsRemaining.set(current - 1);
        }
      }
    }, 1000);
  }

  private stopInactivityTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }
}
