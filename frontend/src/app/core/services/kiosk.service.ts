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

  private checkStaffSession(): boolean {
    try {
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
  readonly attractTimeoutSeconds = signal<number>(120);
  readonly isAttractEnabled = signal<boolean>(true);
  readonly attractModeType = signal<'both' | 'video' | 'feed'>('both');
  readonly attractDisplayMode = signal<'video' | 'feed'>('video');
  readonly attractVideoUrls = signal<string[]>(['https://www.youtube.com/watch?v=scL_y2_p8c8']);
  readonly activeVideoIndex = signal<number>(0);
  readonly attractVideoUrl = computed(() => {
    const list = this.attractVideoUrls();
    if (!list || list.length === 0) return 'https://www.youtube.com/watch?v=scL_y2_p8c8';
    return list[this.activeVideoIndex() % list.length];
  });
  readonly attractTitle = signal<string>('NeXooAi Luxury Saree Try-On');
  readonly attractSubtitle = signal<string>('தொட்டுத் தொடங்குங்கள் — விரல் தொட்டதும் அழகிய பட்டுப் புடவை உங்களுக்கான தோற்றத்தில்!');

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
    if (opts.title !== undefined) this.attractTitle.set(opts.title);
    if (opts.subtitle !== undefined) this.attractSubtitle.set(opts.subtitle);
  }

  resetSession(): void {
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
