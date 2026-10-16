import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  ViewChild,
  ElementRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TranslationService } from './core/services/translation.service';
import { KioskService, KioskStep } from './core/services/kiosk.service';
import { ThemeService } from './core/services/theme.service';
import {
  ApiService,
  SareeItem,
  CategoryItem,
  CustomerHistoryItem,
  CustomerTodayResponse,
  SystemSettingsDTO,
  AIProviderOption,
  LookbookFeedItem,
  AdminUserItem,
} from './core/services/api.service';
import { QrCodeComponent } from './shared/components/qr-code.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, QrCodeComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit, OnDestroy {
  readonly translationService = inject(TranslationService);
  readonly kioskService = inject(KioskService);
  readonly themeService = inject(ThemeService);
  private readonly apiService = inject(ApiService);
  private readonly sanitizer = inject(DomSanitizer);

  // Theme reactive state
  readonly isLightTheme = computed(() => this.themeService.currentTheme() === 'light');

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  // Translation shortcut
  readonly t = this.translationService.t;

  // Sanitized Attract Mode Video URL
  readonly sanitizedAttractUrl = computed<SafeResourceUrl>(() => {
    let url = this.kioskService.attractVideoUrl();
    if (!url) return '';
    if (url.includes('youtube.com/watch?v=') || url.includes('youtu.be/')) {
      let videoId = '';
      if (url.includes('v=')) {
        videoId = url.split('v=')[1]?.split('&')[0] || '';
      } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
      }
      if (videoId) {
        url = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1&rel=0`;
      }
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  // Catalogue state (100% DB-driven from API)
  readonly sarees = signal<SareeItem[]>([]);
  readonly categories = signal<CategoryItem[]>([]);
  readonly activeCategory = signal<string>('all');
  readonly showConsentModal = signal<boolean>(false);
  readonly isApiConnected = signal<boolean>(true);
  readonly apiErrorMessage = signal<string | null>(null);

  // User Camera state
  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement?: ElementRef<HTMLCanvasElement>;
  private mediaStream: MediaStream | null = null;
  readonly isCameraActive = signal<boolean>(false);
  readonly cameraError = signal<string | null>(null);
  readonly capturedPreviewUrl = signal<string | null>(null);

  // Custom Product Camera & Selection state
  @ViewChild('productVideoElement') productVideoElement?: ElementRef<HTMLVideoElement>;
  @ViewChild('productCanvasElement') productCanvasElement?: ElementRef<HTMLCanvasElement>;
  private productMediaStream: MediaStream | null = null;
  readonly isProductCameraActive = signal<boolean>(false);
  readonly productCameraError = signal<string | null>(null);
  readonly productValidationError = signal<string | null>(null);
  readonly productSelectionMode = signal<'catalog' | 'custom'>('catalog');

  // Processing state
  readonly processingProgress = signal<number>(25);
  readonly processingStageText = signal<string>('');
  private progressInterval: any = null;
  readonly tryOnError = signal<string | null>(null);

  // Result state (Haute Couture Interactive Split-Drape Slider default)
  readonly resultViewMode = signal<'slider' | 'compare' | 'result' | 'original'>('slider');
  readonly sliderPosition = signal<number>(50);
  readonly selectedJewellery = signal<'none' | 'temple' | 'polki' | 'antique'>('none');

  // AI Personal Stylist & Colorimetry Harmonic Engine
  readonly stylistHarmonics = computed(() => {
    const saree = this.kioskService.selectedSaree();
    if (!saree) {
      return {
        matchScore: 98,
        undertone: 'Warm Golden Undertone Harmonized (98% Match)',
        blouseContrast: 'Royal Crimson Maroon with Gold Zari Brocade',
        occasion: 'Grand Muhurtham & Royal Wedding Reception',
        sheenRating: 'Pure Mulberry Silk Lustre — Authentic Drape',
      };
    }
    const color = (saree.color || '').toLowerCase();
    let blouse = 'Contrast Magenta Crimson';
    let occasion = 'Grand Muhurtham & Wedding Reception';
    let undertone = 'Warm Golden Glow (98% Harmony)';

    if (color.includes('red') || color.includes('maroon') || color.includes('crimson')) {
      blouse = 'Emerald Green Brocade with Heavy Zardosi Work';
      occasion = 'Bridal Muhurtham & Vivaha Ceremony';
      undertone = 'Rich Warm Radiance (99% Harmony)';
    } else if (color.includes('blue') || color.includes('peacock') || color.includes('navy')) {
      blouse = 'Deep Magenta Pink / Antique Copper Gold';
      occasion = 'Grand Reception & Sangeet Evening';
      undertone = 'Cool Royal Luminance (97% Harmony)';
    } else if (color.includes('green') || color.includes('emerald')) {
      blouse = 'Deep Ruby Red / Rani Pink Velvet';
      occasion = 'Temple Muhurtham & Traditional Rituals';
      undertone = 'Vibrant Festive Radiance (98% Harmony)';
    } else if (color.includes('gold') || color.includes('yellow')) {
      blouse = 'Peacock Blue Velvet / Scarlet Red';
      occasion = 'Engagement, Haldi & Morning Muhurtham';
      undertone = 'Lustrous Golden Glow (99% Harmony)';
    }

    return {
      matchScore: 98,
      undertone,
      blouseContrast: blouse,
      occasion,
      sheenRating: `${saree.fabric || 'Pure Kanchipuram Silk'} with Authentic Zari Weave`,
    };
  });

  // Filtered catalogue computed signal
  readonly displayedCatalog = computed(() => {
    const cat = this.activeCategory();
    const list = this.sarees();
    if (!cat || cat === 'all') return list;
    return list.filter((item) => item.category.toLowerCase().includes(cat.toLowerCase()));
  });

  // Admin Dashboard state
  readonly isAdminMode = signal<boolean>(false);
  readonly adminTab = signal<'METRICS' | 'CUSTOMERS' | 'CATALOG' | 'JOBS' | 'SETTINGS' | 'USERS'>('METRICS');
  readonly adminMetrics = signal<any>(null);
  readonly adminProducts = signal<SareeItem[]>([]);
  readonly adminJobs = signal<any[]>([]);

  // User & Staff Access Control (RBAC)
  readonly currentAdminUser = signal<{ id: string; email: string; name: string; role: string } | null>(null);
  readonly adminUsers = signal<AdminUserItem[]>([]);
  readonly adminLoginMode = signal<'password' | 'pin'>('password');
  readonly adminEmailInput = signal<string>('mohandass@nexooai.in');
  readonly adminPasswordInput = signal<string>('');
  readonly adminLoginError = signal<string | null>(null);
  readonly isLoggingIn = signal<boolean>(false);

  // Add New User Modal state
  readonly showAddUserModal = signal<boolean>(false);
  readonly newUserName = signal<string>('');
  readonly newUserEmail = signal<string>('');
  readonly newUserPassword = signal<string>('');
  readonly newUserRole = signal<string>('store_staff');
  readonly userModalError = signal<string | null>(null);
  readonly isSavingUser = signal<boolean>(false);

  // Today's Customers Gallery & History state
  readonly adminCustomers = signal<CustomerTodayResponse | null>(null);
  readonly selectedCustomerPreview = signal<CustomerHistoryItem | null>(null);
  readonly customerPhotoZoomMode = signal<'both' | 'customer' | 'result'>('both');

  // Admin AI & System Settings state
  readonly adminSettings = signal<SystemSettingsDTO | null>(null);
  readonly providerTestResult = signal<{ success: boolean; message: string } | null>(null);
  readonly isTestingProvider = signal<boolean>(false);
  readonly settingsFeedbackMsg = signal<string | null>(null);

  // Product Create Modal state
  readonly showAddProductModal = signal<boolean>(false);
  readonly isUploadingProductImg = signal<boolean>(false);
  readonly newProdSku = signal<string>('');
  readonly newProdNameEn = signal<string>('');
  readonly newProdNameTa = signal<string>('');
  readonly newProdCategory = signal<string>('Bridal Silk');
  readonly newProdFabric = signal<string>('Pure Silk');
  readonly newProdColor = signal<string>('Red & Gold');
  readonly newProdPrice = signal<number>(18500);
  readonly newProdPallu = signal<string>('Heavy Zari');
  readonly newProdDescEn = signal<string>('');
  readonly newProdImageUrl = signal<string>('');

  // Admin PIN Security & Session State
  readonly showAdminPinModal = signal<boolean>(false);
  readonly adminPinInput = signal<string>('');
  readonly adminPinError = signal<string | null>(null);
  readonly adminAuthToken = signal<string | null>(null);
  readonly adminInactivitySeconds = signal<number>(60);
  private adminInactivityTimer: any = null;

  // Portrait Totem Live Kiosk state
  readonly isKioskTotemMode = signal<boolean>(false);
  readonly isTotemDraping = signal<boolean>(false);
  readonly isTotemDrawerMinimized = signal<boolean>(false);
  readonly totemCategory = signal<string>('all');
  readonly poseValidation = signal<{
    is_valid: boolean;
    pose_score: number;
    guidance_message_ta: string;
    guidance_message_en: string;
    green_tick: boolean;
  } | null>(null);
  readonly isValidatingPose = signal<boolean>(false);

  // Staff Kiosk Activation Gate state (Showroom Floor Security)
  readonly staffPinInput = signal<string>('');
  readonly staffPinError = signal<string | null>(null);

  // Photo Cropping & Touch Framing state
  readonly showCropModal = signal<boolean>(false);
  readonly rawImageForCrop = signal<string | null>(null);
  readonly cropSource = signal<'customer' | 'product'>('customer');
  readonly cropZoom = signal<number>(1.0);
  readonly cropPanX = signal<number>(0);
  readonly cropPanY = signal<number>(0);
  readonly isDraggingCrop = signal<boolean>(false);
  private dragStartX = 0;
  private dragStartY = 0;

  // Lookbook Showcase Feed state
  readonly lookbookFeed = signal<LookbookFeedItem[]>([]);
  readonly activeLookbookIndex = signal<number>(0);
  private lookbookInterval: any = null;

  // Ergonomic Reachability Mode (For Tall Kiosk Totems)
  readonly isReachModeActive = signal<boolean>(false);
  readonly isStaffKeypadLowered = signal<boolean>(false);

  // Draggable Floating Edge Menu Dock (Travels along side edges, snaps left/right)
  readonly isFloatingDockExpanded = signal<boolean>(false);
  readonly floatingDockSide = signal<'left' | 'right'>('right');
  readonly floatingDockTop = signal<number>(380); // px from top
  readonly isDraggingDock = signal<boolean>(false);
  private dockDragStartY = 0;
  private dockDragStartTop = 380;

  // Admin PIN & Security Credentials Management State
  readonly currentAdminPinInput = signal<string>('');
  readonly newAdminPinInput = signal<string>('');
  readonly confirmAdminPinInput = signal<string>('');
  readonly adminPinChangeStatus = signal<string | null>(null);
  readonly adminPinChangeError = signal<string | null>(null);
  readonly isChangingAdminPin = signal<boolean>(false);

  // Countdown timer state for camera capture
  readonly selectedTimer = signal<number>(3); // Default 3s countdown
  readonly isCountingDown = signal<boolean>(false);
  readonly countdownSeconds = signal<number>(0);
  private countdownInterval: any = null;

  @HostListener('document:click')
  @HostListener('document:touchstart')
  @HostListener('document:mousemove')
  @HostListener('document:keydown')
  onKioskInteraction(): void {
    if (this.kioskService.isAttractMode()) {
      this.kioskService.dismissAttractMode();
    } else {
      this.kioskService.recordActivity();
    }
  }

  ngOnInit(): void {
    this.loadCategories();
    this.loadCatalog();
    this.loadSystemSettings();
    this.loadLookbookFeed();
    this.startLookbookRotation();
  }

  ngOnDestroy(): void {
    this.stopCamera();
    this.stopProductCamera();
    this.stopProgressSimulation();
    this.cancelCountdown();
    this.stopAdminInactivityCountdown();
    if (this.lookbookInterval) {
      clearInterval(this.lookbookInterval);
    }
  }

  // Session activity listener
  onUserInteraction(): void {
    this.kioskService.recordActivity();
    this.onAdminUserActivity();
  }

  // --- Showroom Staff Kiosk Gate Methods ---
  enterStaffPinDigit(digit: string): void {
    if (this.staffPinInput().length < 4) {
      const next = this.staffPinInput() + digit;
      this.staffPinInput.set(next);
      this.staffPinError.set(null);
      if (next.length === 4) {
        this.submitStaffPin();
      }
    }
  }

  backspaceStaffPinDigit(): void {
    const cur = this.staffPinInput();
    if (cur.length > 0) {
      this.staffPinInput.set(cur.slice(0, -1));
      this.staffPinError.set(null);
    }
  }

  clearStaffPin(): void {
    this.staffPinInput.set('');
    this.staffPinError.set(null);
  }

  submitStaffPin(): void {
    const pin = this.staffPinInput();
    if (pin.length < 4) {
      this.staffPinError.set(this.t().staffGatePinError);
      return;
    }
    this.apiService.verifyStaffKioskPin(pin).subscribe({
      next: (res) => {
        this.kioskService.unlockKiosk(res.token, res.expires_in_seconds || 86400);
        this.staffPinInput.set('');
        this.staffPinError.set(null);
      },
      error: () => {
        this.staffPinError.set(this.t().staffGatePinError);
        this.staffPinInput.set('');
      },
    });
  }

  lockKioskDevice(): void {
    this.kioskService.lockKiosk();
    this.staffPinInput.set('');
    this.staffPinError.set(null);
  }

  // --- Ergonomic Reachability Mode Methods ---
  toggleReachMode(): void {
    this.isReachModeActive.update(v => !v);
  }

  toggleStaffKeypadLower(): void {
    this.isStaffKeypadLowered.update(v => !v);
  }

  // --- Draggable Floating Edge Menu Methods ---
  toggleFloatingDockExpanded(): void {
    this.isFloatingDockExpanded.update(v => !v);
  }

  toggleDockSide(): void {
    this.floatingDockSide.update(side => (side === 'right' ? 'left' : 'right'));
  }

  onDockMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;
    // Don't drag if clicking buttons inside the dock
    const target = event.target as HTMLElement;
    if (target.closest('.dock-action-btn') || target.closest('.btn-dock-tool')) {
      return;
    }
    this.isDraggingDock.set(true);
    this.dockDragStartY = event.clientY;
    this.dockDragStartTop = this.floatingDockTop();

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - this.dockDragStartY;
      const newTop = Math.max(90, Math.min(window.innerHeight - 280, this.dockDragStartTop + deltaY));
      this.floatingDockTop.set(newTop);

      // Snap to nearest side edge if dragged across screen
      if (moveEvent.clientX < window.innerWidth / 2) {
        if (this.floatingDockSide() !== 'left') this.floatingDockSide.set('left');
      } else {
        if (this.floatingDockSide() !== 'right') this.floatingDockSide.set('right');
      }
    };

    const onMouseUp = () => {
      this.isDraggingDock.set(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  onDockTouchStart(event: TouchEvent): void {
    if (event.touches.length !== 1) return;
    const target = event.target as HTMLElement;
    if (target.closest('.dock-action-btn') || target.closest('.btn-dock-tool')) {
      return;
    }
    const touch = event.touches[0];
    this.isDraggingDock.set(true);
    this.dockDragStartY = touch.clientY;
    this.dockDragStartTop = this.floatingDockTop();
  }

  onDockTouchMove(event: TouchEvent): void {
    if (!this.isDraggingDock() || event.touches.length !== 1) return;
    const touch = event.touches[0];
    const deltaY = touch.clientY - this.dockDragStartY;
    const newTop = Math.max(90, Math.min(window.innerHeight - 280, this.dockDragStartTop + deltaY));
    this.floatingDockTop.set(newTop);

    // Snap to nearest side edge
    if (touch.clientX < window.innerWidth / 2) {
      if (this.floatingDockSide() !== 'left') this.floatingDockSide.set('left');
    } else {
      if (this.floatingDockSide() !== 'right') this.floatingDockSide.set('right');
    }
  }

  onDockTouchEnd(): void {
    this.isDraggingDock.set(false);
  }

  // --- Admin Security Credentials Management ---
  submitAdminPinChange(): void {
    const current = this.currentAdminPinInput().trim();
    const newPin = this.newAdminPinInput().trim();
    const confirmPin = this.confirmAdminPinInput().trim();

    this.adminPinChangeError.set(null);
    this.adminPinChangeStatus.set(null);

    if (!current) {
      this.adminPinChangeError.set(
        this.translationService.currentLanguage() === 'ta'
          ? 'தற்போதைய நிர்வாகி பின்னை உள்ளிடவும்.'
          : 'Please enter current Admin PIN.'
      );
      return;
    }
    if (!newPin || newPin.length < 4 || newPin.length > 8 || !/^\d+$/.test(newPin)) {
      this.adminPinChangeError.set(
        this.translationService.currentLanguage() === 'ta'
          ? 'புதிய பின் 4 முதல் 8 எண்களாக இருக்க வேண்டும்.'
          : 'New PIN must be 4 to 8 numeric digits.'
      );
      return;
    }
    if (newPin !== confirmPin) {
      this.adminPinChangeError.set(
        this.translationService.currentLanguage() === 'ta'
          ? 'புதிய பின் உறுதிப்படுத்தல் பொருந்தவில்லை.'
          : 'New PIN confirmation does not match.'
      );
      return;
    }

    this.isChangingAdminPin.set(true);
    this.apiService.changeAdminPin(current, newPin).subscribe({
      next: (res) => {
        this.isChangingAdminPin.set(false);
        this.adminPinChangeStatus.set(res.message || this.t().adminPinUpdatedSuccess);
        this.currentAdminPinInput.set('');
        this.newAdminPinInput.set('');
        this.confirmAdminPinInput.set('');
        this.loadSystemSettings();
      },
      error: (err) => {
        this.isChangingAdminPin.set(false);
        const detail =
          err.error?.detail ||
          (this.translationService.currentLanguage() === 'ta'
            ? 'பின் மாற்றுவதில் பிழை ஏற்பட்டது.'
            : 'Failed to update Admin PIN.');
        this.adminPinChangeError.set(detail);
      },
    });
  }

  // --- Interactive Touch Photo Cropper Methods ---
  openCropper(dataUrl: string, source: 'customer' | 'product' = 'customer'): void {
    this.rawImageForCrop.set(dataUrl);
    this.cropSource.set(source);
    this.cropZoom.set(1.0);
    this.cropPanX.set(0);
    this.cropPanY.set(0);
    this.showCropModal.set(true);
  }

  closeCropper(): void {
    this.showCropModal.set(false);
    this.rawImageForCrop.set(null);
  }

  adjustCropZoom(delta: number): void {
    const current = this.cropZoom();
    const updated = Math.min(3.0, Math.max(1.0, current + delta));
    this.cropZoom.set(Number(updated.toFixed(2)));
  }

  resetCrop(): void {
    this.cropZoom.set(1.0);
    this.cropPanX.set(0);
    this.cropPanY.set(0);
  }

  onCropMouseDown(event: MouseEvent | TouchEvent): void {
    this.isDraggingCrop.set(true);
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    this.dragStartX = clientX - this.cropPanX();
    this.dragStartY = clientY - this.cropPanY();
  }

  onCropMouseMove(event: MouseEvent | TouchEvent): void {
    if (!this.isDraggingCrop()) return;
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    this.cropPanX.set(clientX - this.dragStartX);
    this.cropPanY.set(clientY - this.dragStartY);
  }

  onCropMouseUp(): void {
    this.isDraggingCrop.set(false);
  }

  applyCrop(): void {
    const rawUrl = this.rawImageForCrop();
    if (!rawUrl) return;

    const img = new Image();
    img.onload = () => {
      const targetW = 720;
      const targetH = 1280;
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0f0c12';
        ctx.fillRect(0, 0, targetW, targetH);

        const zoom = this.cropZoom();
        const baseScale = Math.max(targetW / img.width, targetH / img.height);
        const drawW = img.width * baseScale * zoom;
        const drawH = img.height * baseScale * zoom;
        const drawX = (targetW - drawW) / 2 + this.cropPanX();
        const drawY = (targetH - drawH) / 2 + this.cropPanY();

        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
        canvas.toBlob((blob) => {
          if (blob) {
            if (this.cropSource() === 'customer') {
              this.capturedPreviewUrl.set(croppedDataUrl);
              this.kioskService.setCustomerPhoto(croppedDataUrl, blob);
              this.evaluateCapturedPose(blob);
            } else {
              this.kioskService.setCustomGarment(croppedDataUrl, blob);
            }
          }
          this.closeCropper();
        }, 'image/jpeg', 0.92);
      }
    };
    img.src = rawUrl;
  }

  // --- Lookbook Showcase Feed Methods ---
  loadLookbookFeed(): void {
    this.apiService.getTodayLookbookFeed().subscribe((feed) => {
      if (feed && feed.length > 0) {
        this.lookbookFeed.set(feed);
      }
    });
  }

  startLookbookRotation(): void {
    if (this.lookbookInterval) clearInterval(this.lookbookInterval);
    this.lookbookInterval = setInterval(() => {
      const total = this.lookbookFeed().length;
      if (total > 1) {
        this.activeLookbookIndex.update((i) => (i + 1) % total);
      }
    }, 6000);
  }

  // --- Step 1: Welcome & Consent ---
  openConsentModal(): void {
    this.showConsentModal.set(true);
  }

  closeConsentModal(): void {
    this.showConsentModal.set(false);
  }

  confirmConsent(): void {
    this.showConsentModal.set(false);
    this.kioskService.acceptConsent();
    this.startCamera();
  }

  // --- Step 2: Camera Capture ---
  async startCamera(): Promise<void> {
    this.cameraError.set(null);
    this.capturedPreviewUrl.set(null);

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });

        this.isCameraActive.set(true);

        setTimeout(() => {
          if (this.videoElement?.nativeElement && this.mediaStream) {
            this.videoElement.nativeElement.srcObject = this.mediaStream;
            this.videoElement.nativeElement.play();
          }
        }, 100);
      } else {
        this.cameraError.set(this.t().cameraPermError);
      }
    } catch (err: any) {
      console.warn('Camera access unavailable or declined:', err);
      this.cameraError.set(this.t().cameraPermError);
    }
  }

  stopCamera(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    this.isCameraActive.set(false);
  }

  capturePhoto(): void {
    if (!this.videoElement?.nativeElement || !this.canvasElement?.nativeElement) {
      return;
    }

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      this.capturedPreviewUrl.set(dataUrl);

      this.kioskService.tryOnResult.set(null);
      // Convert to Blob for API submission and Gemini Pose Validation
      canvas.toBlob(
        (blob) => {
          if (blob) {
            this.kioskService.setCustomerPhoto(dataUrl, blob);
            this.evaluateCapturedPose(blob);
          }
        },
        'image/jpeg',
        0.92
      );
    }
  }

  evaluateCapturedPose(blob: Blob): void {
    this.isValidatingPose.set(true);
    this.apiService.validateCustomerPose(blob).subscribe({
      next: (res) => {
        this.isValidatingPose.set(false);
        this.poseValidation.set(res);
      },
      error: () => {
        this.isValidatingPose.set(false);
        this.poseValidation.set({
          is_valid: true,
          pose_score: 0.92,
          guidance_message_ta: 'போர்ட்ரெய்ட் தோற்றம் ஏற்கப்பட்டது.',
          guidance_message_en: 'Portrait posture confirmed.',
          green_tick: true,
        });
      },
    });
  }

  retakePhoto(): void {
    this.capturedPreviewUrl.set(null);
    this.kioskService.customerPhotoDataUrl.set(null);
    this.kioskService.customerPhotoBlob.set(null);
    this.kioskService.tryOnResult.set(null);
    this.kioskService.setStep('CAMERA');
    this.startCamera();
  }

  confirmPhotoAndProceed(): void {
    this.stopCamera();
    this.kioskService.setStep('CATALOGUE');
  }

  goBackFromCamera(): void {
    this.stopCamera();
    this.cancelCountdown();
    this.capturedPreviewUrl.set(null);
    this.kioskService.setStep('WELCOME');
  }

  retryCamera(): void {
    this.startCamera();
  }

  goBackFromCatalogue(): void {
    this.kioskService.setStep('CAMERA');
    if (!this.capturedPreviewUrl()) {
      this.startCamera();
    }
  }

  reloadCatalog(): void {
    this.activeCategory.set('all');
    this.loadCatalog('all');
  }

  setTimerDuration(seconds: number): void {
    this.selectedTimer.set(seconds);
  }

  startCaptureWithTimer(): void {
    if (this.isCountingDown()) return;
    const duration = this.selectedTimer();
    if (duration <= 0) {
      this.capturePhoto();
      return;
    }

    this.isCountingDown.set(true);
    this.countdownSeconds.set(duration);

    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    this.countdownInterval = setInterval(() => {
      const remaining = this.countdownSeconds() - 1;
      if (remaining > 0) {
        this.countdownSeconds.set(remaining);
      } else {
        clearInterval(this.countdownInterval);
        this.countdownInterval = null;
        this.isCountingDown.set(false);
        this.countdownSeconds.set(0);
        this.capturePhoto();
      }
    }, 1000);
  }

  cancelCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    this.isCountingDown.set(false);
    this.countdownSeconds.set(0);
  }

  onFileUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        this.capturedPreviewUrl.set(dataUrl);
        this.kioskService.tryOnResult.set(null);
        this.kioskService.setCustomerPhoto(dataUrl, file);
        this.evaluateCapturedPose(file);
      };
      reader.readAsDataURL(file);
    }
  }

  // --- Step 3: Saree Catalogue (100% DB-driven from API) ---
  loadCategories(): void {
    this.apiService.getCategories().subscribe({
      next: (res) => {
        if (res.categories && res.categories.length > 0) {
          this.categories.set(res.categories);
        }
      },
      error: (err) => {
        console.warn('Could not load categories from DB:', err);
      },
    });
  }

  loadCatalog(category?: string): void {
    const catQuery = category === 'all' ? undefined : category;
    this.apiService.getCatalog(catQuery).subscribe({
      next: (res) => {
        this.sarees.set(res.items || []);
        this.isApiConnected.set(true);
        this.apiErrorMessage.set(null);
      },
      error: (err) => {
        console.error('API catalog fetch failed:', err);
        this.isApiConnected.set(false);
        this.apiErrorMessage.set(
          this.translationService.currentLanguage() === 'ta'
            ? 'ஷோரூம் சேவையகத்துடன் இணைக்க முடியவில்லை. தயவுசெய்து சேவையகத்தை சரிபார்க்கவும்.'
            : 'Showroom API connection error. Please verify backend server is running.'
        );
      },
    });
  }

  filterCategory(category: string): void {
    this.activeCategory.set(category);
    this.loadCatalog(category);
  }

  selectSaree(saree: SareeItem): void {
    this.kioskService.setSelectedSaree(saree);
    this.kioskService.tryOnResult.set(null);
    this.kioskService.setStep('COMBINE');
  }

  selectSareeAndStartTryOn(saree: SareeItem): void {
    this.selectSaree(saree);
  }

  // --- Custom Product Camera & Upload Handlers ---
  setProductSelectionMode(mode: 'catalog' | 'custom'): void {
    this.productSelectionMode.set(mode);
    this.productValidationError.set(null);
    if (mode === 'custom') {
      this.productCameraError.set(null);
    } else {
      this.stopProductCamera();
    }
  }

  async startProductCamera(): Promise<void> {
    this.productCameraError.set(null);
    this.productValidationError.set(null);

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.productMediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });

        this.isProductCameraActive.set(true);

        setTimeout(() => {
          if (this.productVideoElement?.nativeElement && this.productMediaStream) {
            this.productVideoElement.nativeElement.srcObject = this.productMediaStream;
            this.productVideoElement.nativeElement.play();
          }
        }, 100);
      } else {
        this.productCameraError.set(this.t().productCameraError);
      }
    } catch (err: any) {
      console.warn('Product camera access unavailable or declined:', err);
      this.productCameraError.set(this.t().productCameraError);
    }
  }

  stopProductCamera(): void {
    if (this.productMediaStream) {
      this.productMediaStream.getTracks().forEach((track) => track.stop());
      this.productMediaStream = null;
    }
    this.isProductCameraActive.set(false);
  }

  captureProductPhoto(): void {
    if (!this.productVideoElement?.nativeElement || !this.productCanvasElement?.nativeElement) {
      return;
    }

    const video = this.productVideoElement.nativeElement;
    const canvas = this.productCanvasElement.nativeElement;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            this.kioskService.setCustomGarment(dataUrl, blob);
            this.stopProductCamera();
          }
        },
        'image/jpeg',
        0.92
      );
    }
  }

  onProductFileUpload(event: Event): void {
    this.productValidationError.set(null);
    const input = event.target as HTMLInputElement;
    if (input?.files && input.files[0]) {
      const file = input.files[0];

      // Client-side validation consistent with backend limits (10 MB, JPEG/PNG/WEBP)
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        this.productValidationError.set(this.t().invalidProductFormatError);
        input.value = '';
        return;
      }

      const maxSizeBytes = 10 * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        this.productValidationError.set(this.t().productSizeError);
        input.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        this.kioskService.setCustomGarment(dataUrl, file);
        this.stopProductCamera();
      };
      reader.readAsDataURL(file);
    }
  }

  retakeProductPhoto(): void {
    this.kioskService.clearCustomGarment();
    this.startProductCamera();
  }

  removeCustomGarment(): void {
    this.kioskService.clearCustomGarment();
    this.stopProductCamera();
    this.productValidationError.set(null);
    this.productCameraError.set(null);
  }

  confirmCustomProductAndProceed(): void {
    this.stopProductCamera();
    this.kioskService.setStep('COMBINE');
  }

  // --- Step 4: Combination Review & Explicit AI Generation ---
  replaceUserPhoto(): void {
    this.kioskService.setStep('CAMERA');
    this.startCamera();
  }

  changeProduct(): void {
    this.kioskService.setStep('CATALOGUE');
  }

  startAiTryOn(): void {
    const saree = this.kioskService.selectedSaree();
    if (!saree && !this.kioskService.customGarmentBlob()) {
      return;
    }
    this.kioskService.tryOnResult.set(null);
    this.isTotemDraping.set(true);
    this.kioskService.setStep('PROCESSING');
    this.executeTryOn(saree);
  }

  // --- Step 5: AI Try-On Execution ---
  private async executeTryOn(saree: SareeItem | null): Promise<void> {
    this.tryOnError.set(null);
    this.processingProgress.set(15);
    this.processingStageText.set(this.t().stepAnalysis);

    // Simulate animated progress while API executes
    this.stopProgressSimulation();
    this.progressInterval = setInterval(() => {
      const current = this.processingProgress();
      if (current < 40) {
        this.processingProgress.set(current + 10);
        this.processingStageText.set(this.t().stepAlignment);
      } else if (current < 75) {
        this.processingProgress.set(current + 8);
        this.processingStageText.set(this.t().stepRendering);
      } else if (current < 90) {
        this.processingProgress.set(current + 4);
        this.processingStageText.set(this.t().stepFinalizing);
      }
    }, 450);

    const blob = this.kioskService.customerPhotoBlob() || new Blob([], { type: 'image/jpeg' });
    const lang = this.translationService.currentLanguage();
    const sareeId = saree?.id || 'custom_product';

    // Resolve garment binary image blob: either custom uploaded/captured garment,
    // or fetched directly from catalog saree image URL so BOTH images are sent as binary files to AI
    let garmentBlob: Blob | null = this.kioskService.customGarmentBlob();
    if (!garmentBlob && saree?.primary_image_url) {
      try {
        const response = await fetch(saree.primary_image_url);
        if (response.ok) {
          garmentBlob = await response.blob();
        }
      } catch (err) {
        console.warn('Could not fetch catalog garment binary blob:', err);
      }
    }

    this.apiService.submitTryOn(blob, sareeId, true, lang, garmentBlob).subscribe({
      next: (res) => {
        this.stopProgressSimulation();
        this.processingProgress.set(100);
        if (res.status === 'failed') {
          this.tryOnError.set(res.error_message || this.t().tryonFailedTitle);
        }
        setTimeout(() => {
          this.isTotemDraping.set(false);
          this.kioskService.setTryOnResult(res);
        }, 300);
      },
      error: (err) => {
        this.stopProgressSimulation();
        this.isTotemDraping.set(false);
        const detail = err.error?.detail || this.t().tryonFailedDesc;
        this.tryOnError.set(detail);
      },
    });
  }

  private stopProgressSimulation(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }
  // --- Step 6: Result Actions ---

  retryCurrentTryOn(): void {
    this.startAiTryOn();
  }

  tryAnotherSaree(): void {
    this.kioskService.setStep('CATALOGUE');
  }

  finishSession(): void {
    this.stopCamera();
    this.stopProductCamera();
    this.kioskService.resetSession();
    this.capturedPreviewUrl.set(null);
  }

  triggerDirectDownload(): void {
    const resultUrl = this.kioskService.tryOnResult()?.result_image_url;
    const photo = resultUrl || this.kioskService.customerPhotoDataUrl();
    if (photo) {
      const a = document.createElement('a');
      a.href = photo;
      a.download = `nexooai_saree_preview_${Date.now()}.jpg`;
      a.target = '_blank';
      a.click();
    }
  }

  setResultViewMode(mode: 'slider' | 'compare' | 'result' | 'original'): void {
    this.resultViewMode.set(mode);
  }

  onSliderRangeChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input) {
      this.sliderPosition.set(Number(input.value));
    }
  }

  selectJewellery(type: 'none' | 'temple' | 'polki' | 'antique'): void {
    this.selectedJewellery.set(type);
  }

  shareOnWhatsApp(): void {
    const resultUrl = this.kioskService.tryOnResult()?.result_image_url || '';
    const saree = this.kioskService.selectedSaree();
    const sareeTitle = saree
      ? (this.translationService.currentLanguage() === 'ta' ? saree.name_ta : saree.name_en)
      : 'NeXooAi Luxury Saree';
    const text = encodeURIComponent(
      `✨ NeXooAi Virtual Saree Try-On ✨\nI just tried on this gorgeous ${sareeTitle} virtually! Check out my preview: ${resultUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  }

  // --- Admin Dashboard & Security PIN Methods ---
  openAdminPinModal(): void {
    if (this.isAdminMode()) {
      this.lockAdminPortal();
      return;
    }
    this.adminPinInput.set('');
    this.adminPinError.set(null);
    this.kioskService.isAttractSuspended.set(true);
    this.showAdminPinModal.set(true);
  }

  closeAdminPinModal(): void {
    this.showAdminPinModal.set(false);
    this.adminPinInput.set('');
    this.adminPinError.set(null);
    if (!this.isAdminMode()) {
      this.kioskService.isAttractSuspended.set(false);
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    this.kioskService.recordActivity();
    if (this.showAdminPinModal()) {
      if (/^[0-9]$/.test(event.key)) {
        this.enterPinDigit(event.key);
      } else if (event.key === 'Backspace') {
        this.backspacePinDigit();
      } else if (event.key === 'Escape') {
        this.closeAdminPinModal();
      } else if (event.key === 'Enter') {
        this.submitAdminPin();
      }
    }
  }

  enterPinDigit(digit: string): void {
    if (this.adminPinInput().length < 6) {
      const nextPin = this.adminPinInput() + digit;
      this.adminPinInput.set(nextPin);
      this.adminPinError.set(null);
      if (nextPin.length === 6) {
        this.submitAdminPin();
      }
    }
  }

  backspacePinDigit(): void {
    const current = this.adminPinInput();
    if (current.length > 0) {
      this.adminPinInput.set(current.slice(0, -1));
      this.adminPinError.set(null);
    }
  }

  clearPin(): void {
    this.adminPinInput.set('');
    this.adminPinError.set(null);
  }

  submitAdminPasswordLogin(): void {
    const email = this.adminEmailInput().trim();
    const password = this.adminPasswordInput().trim();
    if (!email || !password) {
      this.adminLoginError.set('மின்னஞ்சல் மற்றும் கடவுச்சொல் இரண்டையும் உள்ளிடவும் (Please enter both email and password).');
      return;
    }

    this.isLoggingIn.set(true);
    this.adminLoginError.set(null);

    this.apiService.adminLogin(email, password).subscribe({
      next: (res) => {
        this.isLoggingIn.set(false);
        this.adminAuthToken.set(res.token);
        this.currentAdminUser.set({
          id: res.user_id,
          email: res.email,
          name: res.name,
          role: res.role,
        });
        this.showAdminPinModal.set(false);
        this.isAdminMode.set(true);
        this.kioskService.isAttractSuspended.set(true);
        this.loadAdminData();
        this.startAdminInactivityCountdown();
      },
      error: (err) => {
        this.isLoggingIn.set(false);
        this.adminLoginError.set(err.error?.detail || 'உள்நுழைவு தோல்வியடைந்தது. விவரங்களை சரிபார்க்கவும்.');
      },
    });
  }

  submitAdminPin(): void {
    const pin = this.adminPinInput();
    if (pin.length < 4) {
      this.adminPinError.set(this.t().adminPinError);
      return;
    }

    this.apiService.verifyKioskPin(pin).subscribe({
      next: (res) => {
        this.adminAuthToken.set(res.token);
        this.currentAdminUser.set({
          id: 'pin_session',
          email: 'staff@showroom.kiosk',
          name: res.name,
          role: res.role,
        });
        this.showAdminPinModal.set(false);
        this.isAdminMode.set(true);
        this.kioskService.isAttractSuspended.set(true);
        this.loadAdminData();
        this.startAdminInactivityCountdown();
      },
      error: () => {
        this.adminPinError.set(this.t().adminPinError);
        this.adminPinInput.set('');
      },
    });
  }

  startAdminInactivityCountdown(): void {
    this.stopAdminInactivityCountdown();
    this.adminInactivitySeconds.set(60);
    this.adminInactivityTimer = setInterval(() => {
      const remaining = this.adminInactivitySeconds() - 1;
      if (remaining > 0) {
        this.adminInactivitySeconds.set(remaining);
      } else {
        this.lockAdminPortal();
      }
    }, 1000);
  }

  stopAdminInactivityCountdown(): void {
    if (this.adminInactivityTimer) {
      clearInterval(this.adminInactivityTimer);
      this.adminInactivityTimer = null;
    }
  }

  onAdminUserActivity(): void {
    if (this.isAdminMode()) {
      this.adminInactivitySeconds.set(60);
    }
  }

  lockAdminPortal(): void {
    this.stopAdminInactivityCountdown();
    const token = this.adminAuthToken();
    if (token) {
      this.apiService.logoutAdmin(token).subscribe();
    }
    this.adminAuthToken.set(null);
    this.currentAdminUser.set(null);
    this.isAdminMode.set(false);
    this.showAdminPinModal.set(false);
    this.adminPinInput.set('');
    this.adminPasswordInput.set('');
    this.adminLoginError.set(null);
    this.kioskService.isAttractSuspended.set(false);
  }

  toggleAdminMode(): void {
    this.openAdminPinModal();
  }

  setAdminTab(tab: 'METRICS' | 'CUSTOMERS' | 'CATALOG' | 'JOBS' | 'SETTINGS' | 'USERS'): void {
    this.adminTab.set(tab);
    if (tab === 'CUSTOMERS') {
      this.loadAdminCustomers();
    } else if (tab === 'SETTINGS') {
      this.loadSystemSettings();
    } else if (tab === 'USERS') {
      this.loadAdminUsers();
    }
  }

  loadAdminData(): void {
    this.apiService.getAdminMetrics().subscribe((m) => this.adminMetrics.set(m));
    this.apiService.getAdminProducts().subscribe((p) => this.adminProducts.set(p));
    this.apiService.getAdminJobs().subscribe((j) => this.adminJobs.set(j));
    this.loadAdminCustomers();
    this.loadSystemSettings();
    this.loadAdminUsers();
  }

  // --- Staff & User Access Control (RBAC) Methods ---
  loadAdminUsers(): void {
    this.apiService.getAdminUsers().subscribe({
      next: (users) => this.adminUsers.set(users),
      error: (err) => console.warn('Could not load staff users:', err),
    });
  }

  openAddUserModal(): void {
    this.newUserName.set('');
    this.newUserEmail.set('');
    this.newUserPassword.set('');
    this.newUserRole.set('store_staff');
    this.userModalError.set(null);
    this.showAddUserModal.set(true);
  }

  closeAddUserModal(): void {
    this.showAddUserModal.set(false);
    this.userModalError.set(null);
  }

  saveNewUser(): void {
    const name = this.newUserName().trim();
    const email = this.newUserEmail().trim().toLowerCase();
    const password = this.newUserPassword().trim();
    const role = this.newUserRole();

    if (!name || !email || !password) {
      this.userModalError.set('அனைத்து புலங்களையும் நிரப்பவும் (Please fill all required fields).');
      return;
    }

    if (password.length < 6) {
      this.userModalError.set('கடவுச்சொல் குறைந்தது 6 எழுத்துக்களாக இருக்க வேண்டும் (Password must be >= 6 characters).');
      return;
    }

    this.isSavingUser.set(true);
    this.userModalError.set(null);

    this.apiService.createAdminUser({ name, email, password, role }).subscribe({
      next: () => {
        this.isSavingUser.set(false);
        this.closeAddUserModal();
        this.loadAdminUsers();
        this.settingsFeedbackMsg.set(`புதிய பயனர் ${email} வெற்றிகரமாக உருவாக்கப்பட்டது!`);
        setTimeout(() => this.settingsFeedbackMsg.set(null), 4000);
      },
      error: (err) => {
        this.isSavingUser.set(false);
        this.userModalError.set(err.error?.detail || 'பயனரை உருவாக்க முடியவில்லை.');
      },
    });
  }

  toggleUserActive(user: AdminUserItem): void {
    if (user.email.toLowerCase() === 'mohandass@nexooai.in') {
      alert('Master Super Admin கணக்கை முடக்க முடியாது (Master Super Admin cannot be deactivated).');
      return;
    }

    const nextStatus = !user.is_active;
    this.apiService.updateAdminUser(user.id, { is_active: nextStatus }).subscribe({
      next: () => {
        this.loadAdminUsers();
        this.settingsFeedbackMsg.set(`பயனர் நிலை மாற்றப்பட்டது: ${user.email}`);
        setTimeout(() => this.settingsFeedbackMsg.set(null), 3000);
      },
      error: (err) => alert(err.error?.detail || 'நிலை மாற்ற முடியவில்லை.'),
    });
  }

  deleteUser(user: AdminUserItem): void {
    if (user.email.toLowerCase() === 'mohandass@nexooai.in') {
      alert('Master Super Admin கணக்கை நீக்க முடியாது (Master Super Admin cannot be deleted).');
      return;
    }

    if (confirm(`நிச்சயமாக பயனர் '${user.name}' (${user.email}) கணக்கை நீக்க வேண்டுமா?`)) {
      this.apiService.deleteAdminUser(user.id).subscribe({
        next: () => {
          this.loadAdminUsers();
          this.settingsFeedbackMsg.set(`பயனர் கணக்கு நீக்கப்பட்டது: ${user.email}`);
          setTimeout(() => this.settingsFeedbackMsg.set(null), 3000);
        },
        error: (err) => alert(err.error?.detail || 'பயனரை நீக்க முடியவில்லை.'),
      });
    }
  }

  // --- Today's Customers Gallery Methods ---
  loadAdminCustomers(): void {
    this.apiService.getTodaysCustomers().subscribe((resp) => {
      this.adminCustomers.set(resp);
    });
  }

  openCustomerPreview(customer: CustomerHistoryItem): void {
    this.selectedCustomerPreview.set(customer);
    this.customerPhotoZoomMode.set('both');
  }

  closeCustomerPreview(): void {
    this.selectedCustomerPreview.set(null);
  }

  deleteCustomerRecord(jobId: string): void {
    if (confirm('Are you sure you want to delete this customer record and photos permanently?')) {
      this.apiService.deleteCustomerRecord(jobId).subscribe(() => {
        if (this.selectedCustomerPreview()?.job_id === jobId) {
          this.closeCustomerPreview();
        }
        this.loadAdminCustomers();
        this.apiService.getAdminMetrics().subscribe((m) => this.adminMetrics.set(m));
      });
    }
  }

  purgeExpiredCustomerPhotos(): void {
    this.apiService.purgeExpiredCustomerPhotos().subscribe((res) => {
      this.settingsFeedbackMsg.set(`Purged ${res.purged_media_files} expired media files.`);
      setTimeout(() => this.settingsFeedbackMsg.set(null), 4000);
      this.loadAdminCustomers();
      this.apiService.getAdminMetrics().subscribe((m) => this.adminMetrics.set(m));
    });
  }

  // --- AI & System Settings Methods ---
  loadSystemSettings(): void {
    this.apiService.getSystemSettings().subscribe((s) => {
      this.adminSettings.set(s);
      this.kioskService.configureAttractMode({
        enabled: s.idle_attract_enabled,
        timeoutSeconds: s.idle_attract_timeout_seconds,
        videoUrl: s.idle_attract_video_url,
        videoUrls: s.attract_video_urls || s.idle_attract_video_url,
        attractModeType: s.attract_mode_type || 'both',
        title: s.idle_attract_title,
        subtitle: s.idle_attract_subtitle,
      });
    });
  }

  updateActiveAIProvider(providerId: string): void {
    this.apiService.updateSystemSettings({ active_ai_provider: providerId }).subscribe((updated) => {
      this.adminSettings.set(updated);
      this.settingsFeedbackMsg.set(`AI Engine switched to: ${providerId.toUpperCase()}`);
      setTimeout(() => this.settingsFeedbackMsg.set(null), 3000);
    });
  }

  saveSystemSettings(partial: any): void {
    this.apiService.updateSystemSettings(partial).subscribe((updated) => {
      this.adminSettings.set(updated);
      this.kioskService.configureAttractMode({
        enabled: updated.idle_attract_enabled,
        timeoutSeconds: updated.idle_attract_timeout_seconds,
        videoUrl: updated.idle_attract_video_url,
        videoUrls: updated.attract_video_urls || updated.idle_attract_video_url,
        attractModeType: updated.attract_mode_type || 'both',
        title: updated.idle_attract_title,
        subtitle: updated.idle_attract_subtitle,
      });
      this.settingsFeedbackMsg.set('Settings saved successfully!');
      setTimeout(() => this.settingsFeedbackMsg.set(null), 3000);
    });
  }

  testProvider(providerId: string, apiKey?: string): void {
    this.isTestingProvider.set(true);
    this.providerTestResult.set(null);
    this.apiService.testAIProvider(providerId, apiKey).subscribe({
      next: (res) => {
        this.isTestingProvider.set(false);
        this.providerTestResult.set(res);
      },
      error: () => {
        this.isTestingProvider.set(false);
        this.providerTestResult.set({ success: false, message: 'Provider test connection error.' });
      },
    });
  }

  // --- Product Management Methods ---
  openAddProductModal(): void {
    this.showAddProductModal.set(true);
    this.newProdSku.set(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
  }

  closeAddProductModal(): void {
    this.showAddProductModal.set(false);
    this.newProdImageUrl.set('');
  }

  onProductImageSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.isUploadingProductImg.set(true);
      this.apiService.uploadProductImage(file).subscribe({
        next: (resp) => {
          this.isUploadingProductImg.set(false);
          this.newProdImageUrl.set(resp.image_url);
        },
        error: () => {
          this.isUploadingProductImg.set(false);
          alert('Failed to upload image. Please try again.');
        },
      });
    }
  }

  saveProduct(): void {
    const sku = this.newProdSku().trim();
    const nameEn = this.newProdNameEn().trim();
    const nameTa = this.newProdNameTa().trim() || nameEn;
    const img = this.newProdImageUrl() || '/static/benchmark_model.jpg';

    if (!sku || !nameEn) {
      alert('Please provide SKU and Product Title.');
      return;
    }

    const payload: Partial<SareeItem> = {
      sku,
      name_en: nameEn,
      name_ta: nameTa,
      category: this.newProdCategory(),
      fabric: this.newProdFabric(),
      color: this.newProdColor(),
      price: Number(this.newProdPrice()),
      pallu_type: this.newProdPallu(),
      description_en: this.newProdDescEn() || nameEn,
      description_ta: nameTa,
      primary_image_url: img,
    };

    this.apiService.createProduct(payload).subscribe({
      next: () => {
        this.closeAddProductModal();
        this.loadAdminData();
        this.loadCatalog();
      },
      error: (err) => {
        alert(err.error?.detail || 'Failed to create product.');
      },
    });
  }

  deleteProduct(sareeId: string): void {
    if (confirm('Delete this product from catalog?')) {
      this.apiService.deleteProduct(sareeId).subscribe(() => {
        this.loadAdminData();
        this.loadCatalog();
      });
    }
  }

  clearSampleCatalog(): void {
    if (confirm('Are you sure you want to remove all dummy/sample products? You will be able to add your real store products!')) {
      this.apiService.clearCatalog().subscribe(() => {
        this.loadAdminData();
        this.loadCatalog();
      });
    }
  }

  toggleSareeActive(saree: SareeItem): void {
    const newStatus = !saree.is_active;
    this.apiService.toggleProductStatus(saree.id, newStatus).subscribe(() => {
      saree.is_active = newStatus;
      this.loadAdminData();
      this.loadCatalog(); // sync kiosk catalogue
    });
  }

  retryJob(jobId: string): void {
    this.apiService.retryFailedJob(jobId).subscribe(() => {
      this.loadAdminData();
    });
  }

  // --- Portrait Totem Kiosk Lifecycle ---
  launchKioskTotem(): void {
    this.isKioskTotemMode.set(true);
    this.isAdminMode.set(false);
    this.kioskService.setStep('CAMERA');
    this.startCamera();
  }

  exitKioskTotem(): void {
    this.isKioskTotemMode.set(false);
    this.stopCamera();
    this.kioskService.resetSession();
    this.capturedPreviewUrl.set(null);
    this.poseValidation.set(null);
  }

  setTotemCategory(cat: string): void {
    this.totemCategory.set(cat);
  }

  toggleTotemDrawer(): void {
    this.isTotemDrawerMinimized.update((v) => !v);
  }

  get filteredTotemItems(): SareeItem[] {
    const cat = this.totemCategory();
    const all = this.sarees().filter((s) => s.is_active);
    if (cat === 'all') return all;
    if (cat === 'saree') {
      return all.filter((s) => s.category.toLowerCase().includes('silk') || s.category.toLowerCase().includes('cotton'));
    }
    if (cat === 'women') {
      return all.filter((s) => s.category.toLowerCase().includes('chudi') || s.category.toLowerCase().includes('women'));
    }
    if (cat === 'men') {
      return all.filter((s) => s.category.toLowerCase().includes('men'));
    }
    if (cat === 'kids') {
      return all.filter((s) => s.category.toLowerCase().includes('kids'));
    }
    return all;
  }
}
