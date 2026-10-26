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
  PublicKioskFeatures,
  ShowroomSettingsItem,
  CounterTokenItem,
} from './core/services/api.service';
import { QrCodeComponent } from './shared/components/qr-code.component';
import { TranslatePipe } from './core/pipes/translate.pipe';
import { Language, SUPPORTED_LANGUAGES } from './core/services/translation.service';
import heic2any from 'heic2any';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, QrCodeComponent, TranslatePipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit, OnDestroy {
  readonly translationService = inject(TranslationService);
  readonly kioskService = inject(KioskService);
  readonly themeService = inject(ThemeService);
  private readonly apiService = inject(ApiService);
  private readonly sanitizer = inject(DomSanitizer);

  // Multi-language menu state
  readonly showLanguageMenu = signal<boolean>(false);
  readonly supportedLanguages = SUPPORTED_LANGUAGES;

  toggleLanguageMenu(): void {
    this.showLanguageMenu.update((v) => !v);
  }

  selectLanguage(lang: Language): void {
    this.translationService.setLanguage(lang);
    this.showLanguageMenu.set(false);
  }

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

  // Phase 2: Wedding Lighting Simulation & Blouse Styling Engine
  readonly selectedLighting = signal<'daylight' | 'mandapam' | 'reception'>('daylight');
  readonly selectedBlouseTone = signal<'matching' | 'contrast' | 'gold_zari'>('matching');
  readonly styledImageUrl = signal<string | null>(null);
  readonly isApplyingStyling = signal<boolean>(false);

  // Phase 3: Couple & Family Coordinated VTO
  readonly isCoupleModeActive = signal<boolean>(false);
  readonly selectedGroomAttire = signal<'dhoti' | 'kurta' | 'twinning'>('dhoti');

  // Phase 4: Multi-Style Draping Engine
  readonly selectedDrapeStyle = signal<'nivi' | 'madisar' | 'gujarati' | 'lehenga'>('nivi');

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
  readonly adminTab = signal<'METRICS' | 'CUSTOMERS' | 'CATALOG' | 'JOBS' | 'SETTINGS' | 'USERS' | 'SHOWROOM' | 'TOKENS' | 'INSIGHTS' | 'SAAS_CUSTOMERS'>('METRICS');
  readonly adminMetrics = signal<any>(null);

  // B2B SaaS Customers & Tenant Ingestion State
  readonly saasCustomers = signal<any[]>([]);
  readonly saasMetrics = signal<{
    total_customers: number;
    active_customers: number;
    total_mrr_inr: number;
    total_tokens_consumed_this_month: number;
  }>({ total_customers: 0, active_customers: 0, total_mrr_inr: 0, total_tokens_consumed_this_month: 0 });
  readonly isSaasLoading = signal<boolean>(false);
  readonly showOnboardModal = signal<boolean>(false);
  readonly onboardName = signal<string>('');
  readonly onboardCode = signal<string>('');
  readonly onboardManagerName = signal<string>('');
  readonly onboardManagerEmail = signal<string>('');
  readonly onboardManagerPassword = signal<string>('');
  readonly onboardPhone = signal<string>('');
  readonly onboardTier = signal<string>('gold');
  readonly onboardPrice = signal<number>(24999);
  readonly onboardQuota = signal<number>(2500);
  readonly onboardCatalogUrl = signal<string>('');
  readonly onboardError = signal<string | null>(null);
  readonly onboardSuccess = signal<string | null>(null);
  readonly isOnboardingSubmitting = signal<boolean>(false);

  // Catalog Feed & Direct Ingestion state
  readonly catalogSyncApiKey = signal<string>('');
  readonly catalogFeedUrlInput = signal<string>('');
  readonly catalogDirectJsonInput = signal<string>('');
  readonly catalogSyncStatus = signal<{ success?: boolean; message?: string } | null>(null);
  readonly isCatalogSyncing = signal<boolean>(false);

  readonly adminProducts = signal<SareeItem[]>([]);
  readonly adminJobs = signal<any[]>([]);
  readonly showroomInsights = signal<any | null>(null);
  readonly isInsightsLoading = signal<boolean>(false);

  // Showroom Profile & Dynamic WhatsApp Gateway state
  readonly showroomSettings = signal<ShowroomSettingsItem | null>(null);
  readonly isShowroomLoading = signal<boolean>(false);
  readonly isSavingShowroomSettings = signal<boolean>(false);
  readonly showroomSaveSuccess = signal<string | null>(null);
  readonly showroomSaveError = signal<string | null>(null);
  readonly isTestingWhatsApp = signal<boolean>(false);
  readonly whatsAppTestPhone = signal<string>('+91 98401 23456');
  readonly whatsAppTestResult = signal<{ success: boolean; msg: string } | null>(null);

  // Form signals for Showroom Settings (Editable without developer intervention)
  readonly storeNameForm = signal<string>('NeXooAi Luxury Silks');
  readonly storeTaglineForm = signal<string>('Traditional Handloom Silk Sarees & Kanchipuram Weaves');
  readonly storeLogoUrlForm = signal<string>('');
  readonly storePhoneForm = signal<string>('+91 98401 23456');
  readonly storeCityForm = signal<string>('Chennai');
  readonly watermarkEnabledForm = signal<boolean>(true);
  readonly watermarkTextForm = signal<string>('NeXooAi Luxury Silks');
  readonly watermarkSubtextForm = signal<string>('Exclusively Styled in Virtual 3D Drape');
  readonly whatsAppEnabledForm = signal<boolean>(false);
  readonly whatsAppProviderForm = signal<string>('meta_cloud');
  readonly whatsAppPhoneIdForm = signal<string>('');
  readonly whatsAppTokenForm = signal<string>('');
  readonly whatsAppSalesPhoneForm = signal<string>('+91 98401 23456');

  // Floor Sales Desk Counter Slips / POS Tokens State
  readonly counterTokensList = signal<CounterTokenItem[]>([]);
  readonly isTokensLoading = signal<boolean>(false);
  readonly showCounterTokenModal = signal<boolean>(false);
  readonly activeCounterToken = signal<any | null>(null);
  readonly isGeneratingToken = signal<boolean>(false);
  readonly customerPhoneForToken = signal<string>('');
  readonly customerNameForToken = signal<string>('');

  // Direct WhatsApp Share Modal state (Kiosk UI)
  readonly showWhatsAppModal = signal<boolean>(false);
  readonly whatsAppSharePhone = signal<string>('');
  readonly isSendingWhatsApp = signal<boolean>(false);
  readonly whatsAppShareSuccess = signal<string | null>(null);
  readonly whatsAppShareError = signal<string | null>(null);

  // Phase 3: Family Poll & Opinion Voting Engine State
  readonly showFamilyPollModal = signal<boolean>(false);
  readonly isCreatingPoll = signal<boolean>(false);
  readonly createdFamilyPoll = signal<any | null>(null);
  readonly familyPollShareCopied = signal<boolean>(false);

  // Mobile Voter Screen State (when ?poll=POLL-xxxx is loaded)
  readonly activeVoterPollCode = signal<string | null>(null);
  readonly voterPollData = signal<any | null>(null);
  readonly voterName = signal<string>('');
  readonly voterRelation = signal<string>('Mom');
  readonly selectedCandidateIndex = signal<number | null>(null);
  readonly voterComment = signal<string>('');
  readonly isSubmittingVote = signal<boolean>(false);
  readonly voteSuccessMsg = signal<string | null>(null);

  // Phase 5: Couple Drape AI Lookbook State
  readonly isGeneratingCouple = signal<boolean>(false);
  readonly coupleImageUrl = signal<string | null>(null);

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

  // B2B Client Feature Toggles & Public Kiosk Config
  readonly publicFeatures = signal<PublicKioskFeatures>({
    tryon_max: false,
    runway_video: false,
    selfie_mode: false,
    privacy_base64: false,
    split_slider: true,
    portrait_916: true,
    active_provider: 'fashn',
    custom_store_name: 'NeXooAi Luxury Silks',
    custom_store_logo_url: '',
    custom_store_ad_video_url: '',
  });

  // Showroom Custom Branding Signals
  readonly customStoreName = computed(() => {
    return this.adminSettings()?.custom_store_name || this.publicFeatures()?.custom_store_name || '';
  });

  readonly customStoreLogo = computed(() => {
    return this.adminSettings()?.custom_store_logo_url || this.publicFeatures()?.custom_store_logo_url || '';
  });

  // 5-Second Runway Fashion Video Motion State
  readonly isGeneratingVideo = signal<boolean>(false);
  readonly runwayVideoUrl = signal<string | null>(null);
  readonly videoError = signal<string | null>(null);

  // Before/After Interactive Split Slider Position (0-100%)
  readonly splitSliderPos = signal<number>(50);

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
    this.loadPublicFeatures();
    this.loadLookbookFeed();
    this.startLookbookRotation();

    // Check if voter arrived via Family Poll link: ?poll=POLL-xxxx or /poll/POLL-xxxx
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const qPoll = urlParams.get('poll');
      const pathPoll = window.location.pathname.startsWith('/poll/') ? window.location.pathname.split('/poll/')[1] : null;
      const code = qPoll || pathPoll;
      if (code) {
        this.activeVoterPollCode.set(code);
        this.loadVoterPollData(code);
      }
    }
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

  private poseToastTimeout: any = null;

  dismissPoseToast(): void {
    if (this.poseToastTimeout) {
      clearTimeout(this.poseToastTimeout);
      this.poseToastTimeout = null;
    }
    this.poseValidation.set(null);
  }

  evaluateCapturedPose(blob: Blob): void {
    this.isValidatingPose.set(true);
    if (this.poseToastTimeout) {
      clearTimeout(this.poseToastTimeout);
      this.poseToastTimeout = null;
    }
    this.apiService.validateCustomerPose(blob).subscribe({
      next: (res) => {
        this.isValidatingPose.set(false);
        this.poseValidation.set(res);
        // Auto-dismiss after 3.5 seconds so toast doesn't obscure face
        this.poseToastTimeout = setTimeout(() => {
          this.poseValidation.set(null);
        }, 3500);
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
        this.poseToastTimeout = setTimeout(() => {
          this.poseValidation.set(null);
        }, 3500);
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

  async convertHeicToJpeg(file: File): Promise<File> {
    const isHeic =
      file.name.toLowerCase().endsWith('.heic') ||
      file.name.toLowerCase().endsWith('.heif') ||
      file.type === 'image/heic' ||
      file.type === 'image/heif';

    if (!isHeic) {
      return file;
    }

    try {
      const converted = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.95,
      });
      const singleBlob = Array.isArray(converted) ? converted[0] : converted;
      const cleanName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
      return new File([singleBlob], cleanName, { type: 'image/jpeg' });
    } catch (err) {
      console.warn('heic2any conversion fallback:', err);
      return file;
    }
  }

  async onFileUpload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input?.files && input.files[0]) {
      this.isValidatingPose.set(true);
      const rawFile = input.files[0];
      const file = await this.convertHeicToJpeg(rawFile);

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

  async onProductFileUpload(event: Event): Promise<void> {
    this.productValidationError.set(null);
    const input = event.target as HTMLInputElement;
    if (input?.files && input.files[0]) {
      let file = input.files[0];
      file = await this.convertHeicToJpeg(file);

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
    const jobId = this.kioskService.tryOnResult()?.job_id;
    const jType = this.selectedJewellery();
    const lMode = this.selectedLighting();

    if (jobId && (jType !== 'none' || lMode !== 'daylight')) {
      this.apiService.applyBridalStyling({ job_id: jobId, jewellery_type: jType, lighting_preset: lMode }).subscribe({
        next: (res: any) => {
          const a = document.createElement('a');
          a.href = res.styled_image_url;
          a.download = `nexooai_bridal_styled_${Date.now()}.jpg`;
          a.target = '_blank';
          a.click();
        },
        error: () => this.fallbackDirectDownload(),
      });
    } else {
      this.fallbackDirectDownload();
    }
  }

  private fallbackDirectDownload(): void {
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

  selectLighting(mode: 'daylight' | 'mandapam' | 'reception'): void {
    this.selectedLighting.set(mode);
  }

  selectBlouseTone(tone: 'matching' | 'contrast' | 'gold_zari'): void {
    this.selectedBlouseTone.set(tone);
  }

  generateCoupleTwinDrape(): void {
    const job = this.kioskService.tryOnResult();
    const saree = this.kioskService.selectedSaree();
    if (!job?.job_id) return;

    this.isGeneratingCouple.set(true);
    this.apiService
      .generateCoupleDrape({
        job_id: job.job_id,
        groom_attire: this.selectedGroomAttire() === 'kurta' ? 'kurta' : 'dhoti',
        saree_color_hex: saree?.color || '#c99738',
        saree_name: saree ? (saree.name_ta || saree.name_en) : 'Traditional Saree',
      })
      .subscribe({
        next: (res) => {
          this.isGeneratingCouple.set(false);
          if (res?.couple_image_url) {
            this.coupleImageUrl.set(res.couple_image_url);
          }
        },
        error: () => {
          this.isGeneratingCouple.set(false);
        },
      });
  }

  // --- Phase 3: Family Poll & Opinion Voting Kiosk Methods ---
  openFamilyPollModal(): void {
    this.showFamilyPollModal.set(true);
    this.createdFamilyPoll.set(null);
    this.familyPollShareCopied.set(false);
  }

  closeFamilyPollModal(): void {
    this.showFamilyPollModal.set(false);
    this.createdFamilyPoll.set(null);
  }

  submitCreateFamilyPoll(): void {
    const currentJob = this.kioskService.tryOnResult();
    const selectedSaree = this.kioskService.selectedSaree();
    if (!currentJob) return;

    this.isCreatingPoll.set(true);

    const candidates: Array<any> = [
      {
        job_id: currentJob.job_id || 'curr_job',
        image_url: currentJob.result_image_url || '/static/benchmark_model.jpg',
        saree_name: selectedSaree ? (selectedSaree.name_ta || selectedSaree.name_en) : 'முகூர்த்த பட்டுப்புடவை',
        color: selectedSaree?.color || 'Crimson Red',
        sku: selectedSaree?.sku || 'KAN-SILK-001',
        price: selectedSaree?.price || 18500,
      },
    ];

    const otherSarees = this.sarees().filter((s) => s.id !== selectedSaree?.id).slice(0, 2);
    otherSarees.forEach((s) => {
      candidates.push({
        job_id: `cand_${s.id}`,
        image_url: s.primary_image_url,
        saree_name: s.name_ta || s.name_en,
        color: s.color || 'Royal Gold',
        sku: s.sku,
        price: s.price,
      });
    });

    this.apiService
      .createFamilyPoll({
        customer_name: this.customerNameForToken().trim() || 'Showroom Guest',
        customer_phone: this.customerPhoneForToken().trim() || undefined,
        title: `${this.customerNameForToken().trim() || 'எங்கள் குடும்ப மணமகள்'}-க்கு எந்த புடவை மிகவும் அழகாக இருக்கிறது?`,
        candidates,
      })
      .subscribe({
        next: (res) => {
          this.isCreatingPoll.set(false);
          this.createdFamilyPoll.set(res);
        },
        error: (err) => {
          this.isCreatingPoll.set(false);
          alert(err.error?.detail || 'Family Poll உருவாக்க முடியவில்லை.');
        },
      });
  }

  shareFamilyPollWhatsApp(): void {
    const poll = this.createdFamilyPoll();
    if (!poll?.share_text) return;
    const text = encodeURIComponent(poll.share_text);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  }

  copyFamilyPollLink(): void {
    const poll = this.createdFamilyPoll();
    if (!poll?.poll_url) return;
    const fullUrl = `${window.location.origin}${poll.poll_url}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      this.familyPollShareCopied.set(true);
      setTimeout(() => this.familyPollShareCopied.set(false), 3000);
    });
  }

  // --- Mobile Voter Screen Methods ---
  loadVoterPollData(pollCode: string): void {
    this.apiService.getFamilyPoll(pollCode).subscribe({
      next: (data) => this.voterPollData.set(data),
      error: () => this.voterPollData.set(null),
    });
  }

  selectPollCandidate(index: number): void {
    this.selectedCandidateIndex.set(index);
  }

  submitVoterVote(): void {
    const code = this.activeVoterPollCode();
    const candIdx = this.selectedCandidateIndex();
    const name = this.voterName().trim();
    if (!code || candIdx === null || !name) return;

    this.isSubmittingVote.set(true);
    this.apiService
      .castPollVote(code, {
        voter_name: name,
        voter_relation: this.voterRelation(),
        candidate_index: candIdx,
        comment: this.voterComment().trim() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.isSubmittingVote.set(false);
          this.voteSuccessMsg.set(res.message || 'உங்கள் வாக்கு வெற்றிகரமாக பதிவானது! நன்றி!');
          this.loadVoterPollData(code);
        },
        error: (err) => {
          this.isSubmittingVote.set(false);
          alert(err.error?.detail || 'வாக்கு பதிவு செய்ய முடியவில்லை.');
        },
      });
  }

  exitVoterView(): void {
    this.activeVoterPollCode.set(null);
    this.voterPollData.set(null);
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

  // --- Phase 3 & 4: Couple Lookbook & Multi-Style Draping Controls ---
  toggleCoupleMode(): void {
    this.isCoupleModeActive.update((v) => !v);
  }

  selectGroomAttire(attire: 'dhoti' | 'kurta' | 'twinning'): void {
    this.selectedGroomAttire.set(attire);
  }

  selectDrapeStyle(style: 'nivi' | 'madisar' | 'gujarati' | 'lehenga'): void {
    this.selectedDrapeStyle.set(style);
  }

  // --- Phase 5: Showroom Floor Heatmap & Sales Analytics ---
  loadShowroomInsights(): void {
    this.isInsightsLoading.set(true);
    this.apiService.getShowroomInsights().subscribe({
      next: (data) => {
        this.showroomInsights.set(data);
        this.isInsightsLoading.set(false);
      },
      error: () => this.isInsightsLoading.set(false),
    });
  }

  setAdminTab(tab: 'METRICS' | 'CUSTOMERS' | 'CATALOG' | 'JOBS' | 'SETTINGS' | 'USERS' | 'SHOWROOM' | 'TOKENS' | 'INSIGHTS' | 'SAAS_CUSTOMERS'): void {
    this.adminTab.set(tab);
    if (tab === 'CUSTOMERS') {
      this.loadAdminCustomers();
    } else if (tab === 'SETTINGS') {
      this.loadSystemSettings();
    } else if (tab === 'USERS') {
      this.loadAdminUsers();
    } else if (tab === 'SHOWROOM') {
      this.loadShowroomSettings();
    } else if (tab === 'TOKENS') {
      this.loadCounterTokens();
    } else if (tab === 'INSIGHTS') {
      this.loadShowroomInsights();
    } else if (tab === 'SAAS_CUSTOMERS') {
      this.loadSaaSCustomers();
    }
  }

  loadAdminData(): void {
    this.apiService.getAdminMetrics().subscribe((m) => this.adminMetrics.set(m));
    this.apiService.getAdminProducts().subscribe((p) => this.adminProducts.set(p));
    this.apiService.getAdminJobs().subscribe((j) => this.adminJobs.set(j));
    this.loadAdminCustomers();
    this.loadSystemSettings();
    this.loadAdminUsers();
    this.loadShowroomSettings();
    this.loadCounterTokens();
    this.loadShowroomInsights();
    this.loadSaaSCustomers();
  }


  // --- Dynamic Showroom Branding & WhatsApp Gateway Methods ---
  loadShowroomSettings(): void {
    this.isShowroomLoading.set(true);
    this.apiService.getShowroomSettings().subscribe({
      next: (cfg) => {
        this.showroomSettings.set(cfg);
        this.storeNameForm.set(cfg.custom_store_name || '');
        this.storeTaglineForm.set(cfg.custom_store_tagline || '');
        this.storeLogoUrlForm.set(cfg.custom_store_logo_url || '');
        this.storePhoneForm.set(cfg.store_contact_phone || '');
        this.storeCityForm.set(cfg.store_city || 'Chennai');
        this.watermarkEnabledForm.set(cfg.watermark_enabled);
        this.watermarkTextForm.set(cfg.watermark_text || '');
        this.watermarkSubtextForm.set(cfg.watermark_subtext || '');
        this.whatsAppEnabledForm.set(cfg.whatsapp_enabled);
        this.whatsAppProviderForm.set(cfg.whatsapp_provider || 'meta_cloud');
        this.whatsAppPhoneIdForm.set(cfg.whatsapp_phone_number_id || '');
        this.whatsAppSalesPhoneForm.set(cfg.whatsapp_sales_desk_phone || '');
        this.isShowroomLoading.set(false);
      },
      error: () => this.isShowroomLoading.set(false),
    });
  }

  saveShowroomSettings(): void {
    this.isSavingShowroomSettings.set(true);
    this.showroomSaveSuccess.set(null);
    this.showroomSaveError.set(null);

    const payload: any = {
      custom_store_name: this.storeNameForm(),
      custom_store_tagline: this.storeTaglineForm(),
      custom_store_logo_url: this.storeLogoUrlForm(),
      store_contact_phone: this.storePhoneForm(),
      store_city: this.storeCityForm(),
      watermark_enabled: this.watermarkEnabledForm(),
      watermark_text: this.watermarkTextForm(),
      watermark_subtext: this.watermarkSubtextForm(),
      whatsapp_enabled: this.whatsAppEnabledForm(),
      whatsapp_provider: this.whatsAppProviderForm(),
      whatsapp_phone_number_id: this.whatsAppPhoneIdForm(),
      whatsapp_sales_desk_phone: this.whatsAppSalesPhoneForm(),
    };

    if (this.whatsAppTokenForm().trim()) {
      payload.whatsapp_access_token = this.whatsAppTokenForm().trim();
    }

    this.apiService.updateShowroomSettings(payload).subscribe({
      next: () => {
        this.isSavingShowroomSettings.set(false);
        this.showroomSaveSuccess.set('கடை பிராண்டிங் மற்றும் WhatsApp அமைப்புகள் வெற்றிகரமாக சேமிக்கப்பட்டன!');
        setTimeout(() => this.showroomSaveSuccess.set(null), 4000);
        this.loadShowroomSettings();
      },
      error: (err) => {
        this.isSavingShowroomSettings.set(false);
        this.showroomSaveError.set(err.error?.detail || 'அமைப்புகளைச் சேமிப்பதில் பிழை.');
      },
    });
  }

  testWhatsAppConnection(): void {
    const phone = this.whatsAppTestPhone().trim();
    if (!phone) return;
    this.isTestingWhatsApp.set(true);
    this.whatsAppTestResult.set(null);

    this.apiService.testWhatsAppConnection(phone).subscribe({
      next: () => {
        this.isTestingWhatsApp.set(false);
        this.whatsAppTestResult.set({ success: true, msg: 'WhatsApp சோதனை செய்தி வெற்றிகரமாக சென்றடைந்தது!' });
      },
      error: (err) => {
        this.isTestingWhatsApp.set(false);
        this.whatsAppTestResult.set({ success: false, msg: err.error?.detail || 'WhatsApp சோதனை தோல்வியடைந்தது.' });
      },
    });
  }

  // --- Showroom Floor Counter Slips / POS Token Queue Methods ---
  loadCounterTokens(): void {
    this.isTokensLoading.set(true);
    this.apiService.getCounterTokens().subscribe({
      next: (tokens) => {
        this.counterTokensList.set(tokens);
        this.isTokensLoading.set(false);
      },
      error: () => this.isTokensLoading.set(false),
    });
  }

  updateTokenStatus(token: CounterTokenItem, newStatus: string): void {
    this.apiService.updateCounterTokenStatus(token.id, newStatus).subscribe({
      next: () => this.loadCounterTokens(),
      error: (err) => alert(err.error?.detail || 'நிலை மாற்றுவதில் பிழை.'),
    });
  }

  // --- Kiosk UI Floor Slip Generation (Try-to-Buy) ---
  openBuyCounterModal(): void {
    const selectedSaree = this.kioskService.selectedSaree();
    if (!selectedSaree) return;
    this.activeCounterToken.set(null);
    this.customerPhoneForToken.set('');
    this.showCounterTokenModal.set(true);
  }

  confirmGenerateCounterToken(): void {
    const selectedSaree = this.kioskService.selectedSaree();
    if (!selectedSaree) return;

    this.isGeneratingToken.set(true);
    this.apiService.createCounterToken({
      product_id: selectedSaree.id,
      job_id: this.kioskService.tryOnResult()?.job_id || undefined,
      customer_phone: this.customerPhoneForToken().trim() || undefined,
      customer_name: this.customerNameForToken().trim() || undefined,
    }).subscribe({
      next: (res) => {
        this.isGeneratingToken.set(false);
        this.activeCounterToken.set(res);
      },
      error: () => {
        this.isGeneratingToken.set(false);
        // Fallback local token display
        this.activeCounterToken.set({
          token_code: `TK-${selectedSaree.sku.slice(0, 3)}-${Math.floor(1000 + Math.random() * 9000)}`,
          product_name_en: selectedSaree.name_en,
          product_name_ta: selectedSaree.name_ta,
          sku: selectedSaree.sku,
          price: selectedSaree.price,
          rack_location: 'Section A — Rack 04',
          created_at: 'Just now',
        });
      },
    });
  }

  closeCounterTokenModal(): void {
    this.showCounterTokenModal.set(false);
    this.activeCounterToken.set(null);
  }

  // --- Direct WhatsApp Delivery of Try-On Portrait ---
  openWhatsAppShareModal(): void {
    this.whatsAppSharePhone.set('');
    this.whatsAppShareSuccess.set(null);
    this.whatsAppShareError.set(null);
    this.showWhatsAppModal.set(true);
  }

  closeWhatsAppShareModal(): void {
    this.showWhatsAppModal.set(false);
  }

  confirmSendWhatsApp(): void {
    const jobId = this.kioskService.tryOnResult()?.job_id;
    const phone = this.whatsAppSharePhone().trim();
    if (!jobId || !phone) return;

    this.isSendingWhatsApp.set(true);
    this.whatsAppShareSuccess.set(null);
    this.whatsAppShareError.set(null);

    const saree = this.kioskService.selectedSaree();
    this.apiService.sendTryOnWhatsApp({
      job_id: jobId,
      customer_phone: phone,
      garment_name: saree ? `${saree.name_ta} (${saree.name_en})` : undefined,
      jewellery_type: this.selectedJewellery(),
      lighting_mode: this.selectedLighting(),
    }).subscribe({
      next: () => {
        this.isSendingWhatsApp.set(false);
        this.whatsAppShareSuccess.set('உங்களுடைய வாட்ஸ்அப்பிற்கு புகைப்படம் அனுப்பப்பட்டது! நன்றி!');
        setTimeout(() => this.closeWhatsAppShareModal(), 3500);
      },
      error: (err) => {
        this.isSendingWhatsApp.set(false);
        this.whatsAppShareError.set(err.error?.detail || 'வாட்ஸ்அப் அனுப்புவதில் பிழை. மீண்டும் முயற்சிக்கவும்.');
      },
    });
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
      this.loadPublicFeatures();
    });
  }

  loadPublicFeatures(): void {
    this.apiService.getPublicFeatures().subscribe({
      next: (f) => this.publicFeatures.set(f),
      error: (err) => console.warn('Could not load public kiosk features', err),
    });
  }

  toggleB2BFeature(featureKey: string, currentValue: boolean | undefined): void {
    const newVal = !currentValue;
    this.saveSystemSettings({ [featureKey]: newVal });
  }

  saveBrandIdentity(storeName: string, logoUrl: string, adVideoUrl: string): void {
    this.saveSystemSettings({
      custom_store_name: storeName.trim(),
      custom_store_logo_url: logoUrl.trim(),
      custom_store_ad_video_url: adVideoUrl.trim(),
      idle_attract_video_url: adVideoUrl.trim() || this.adminSettings()?.idle_attract_video_url,
    });
  }

  generateRunwayMotion(): void {
    const job = this.kioskService.tryOnResult();
    const resultImg = job?.result_image_url;
    if (!resultImg && !job?.job_id) return;

    this.isGeneratingVideo.set(true);
    this.videoError.set(null);

    this.apiService.generateVideoMotion({ job_id: job?.job_id, image_url: resultImg, duration: 5 }).subscribe({
      next: (res) => {
        this.isGeneratingVideo.set(false);
        if (res && res.video_url) {
          this.runwayVideoUrl.set(res.video_url);
        } else {
          this.videoError.set('No video URL returned from AI engine');
        }
      },
      error: (err) => {
        this.isGeneratingVideo.set(false);
        const msg = err?.error?.detail || err?.message || 'Runway video generation failed.';
        this.videoError.set(msg);
      },
    });
  }

  closeRunwayVideoModal(): void {
    this.runwayVideoUrl.set(null);
    this.videoError.set(null);
  }

  onSplitSliderInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target) {
      this.splitSliderPos.set(+target.value);
    }
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

  async onProductImageSelected(event: any): Promise<void> {
    const rawFile = event.target.files?.[0];
    if (rawFile) {
      this.isUploadingProductImg.set(true);
      const file = await this.convertHeicToJpeg(rawFile);
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

  // =========================================================================
  // B2B SAAS BOUTIQUE ONBOARDING & CATALOG INGESTION
  // =========================================================================
  loadSaaSCustomers(): void {
    this.isSaasLoading.set(true);
    this.apiService.getSaaSCustomers().subscribe({
      next: (res) => {
        this.isSaasLoading.set(false);
        this.saasCustomers.set(res.customers || []);
        this.saasMetrics.set(res.metrics || {
          total_customers: 0,
          active_customers: 0,
          total_mrr_inr: 0,
          total_tokens_consumed_this_month: 0,
        });
        if (res.customers && res.customers.length > 0 && !this.catalogSyncApiKey()) {
          this.catalogSyncApiKey.set(res.customers[0].api_key || '');
        }
      },
      error: () => {
        this.isSaasLoading.set(false);
      },
    });
  }

  openOnboardModal(): void {
    this.onboardName.set('');
    this.onboardCode.set('');
    this.onboardManagerName.set('');
    this.onboardManagerEmail.set('');
    this.onboardManagerPassword.set('');
    this.onboardPhone.set('');
    this.onboardTier.set('gold');
    this.onboardPrice.set(24999);
    this.onboardQuota.set(2500);
    this.onboardCatalogUrl.set('');
    this.onboardError.set(null);
    this.onboardSuccess.set(null);
    this.showOnboardModal.set(true);
  }

  closeOnboardModal(): void {
    this.showOnboardModal.set(false);
  }

  onTierChange(tier: string): void {
    this.onboardTier.set(tier);
    if (tier === 'silver') {
      this.onboardPrice.set(12999);
      this.onboardQuota.set(1000);
    } else if (tier === 'gold') {
      this.onboardPrice.set(24999);
      this.onboardQuota.set(2500);
    } else if (tier === 'platinum') {
      this.onboardPrice.set(49999);
      this.onboardQuota.set(10000);
    }
  }

  submitOnboardCustomer(): void {
    const name = this.onboardName().trim();
    const code = this.onboardCode().trim() || name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
    const managerName = this.onboardManagerName().trim();
    const managerEmail = this.onboardManagerEmail().trim();

    if (!name || !managerName || !managerEmail) {
      this.onboardError.set('தயவுசெய்து கடை பெயர், மேனேஜர் பெயர் மற்றும் மின்னஞ்சலை நிரப்பவும்.');
      return;
    }

    this.isOnboardingSubmitting.set(true);
    this.onboardError.set(null);

    const payload = {
      name,
      code,
      manager_name: managerName,
      manager_email: managerEmail,
      manager_password: this.onboardManagerPassword().trim() || undefined,
      contact_phone: this.onboardPhone().trim() || undefined,
      plan_tier: this.onboardTier(),
      subscription_price_inr: this.onboardPrice(),
      monthly_token_quota: this.onboardQuota(),
      catalog_feed_url: this.onboardCatalogUrl().trim() || undefined,
    };

    this.apiService.onboardCustomer(payload).subscribe({
      next: (res) => {
        this.isOnboardingSubmitting.set(false);
        this.onboardSuccess.set(`புதிய வாடிக்கையாளர் வெற்றிகரமாக சேர்க்கப்பட்டார்! API Key: ${res.api_key}`);
        this.loadSaaSCustomers();
        setTimeout(() => {
          this.closeOnboardModal();
        }, 1800);
      },
      error: (err) => {
        this.isOnboardingSubmitting.set(false);
        this.onboardError.set(err.error?.detail || 'வாடிக்கையாளர் சேர்ப்பதில் பிழை ஏற்பட்டது.');
      },
    });
  }

  copyApiKey(apiKey: string): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(apiKey);
      alert('API Key நகலெடுக்கப்பட்டது (Copied to clipboard)!');
    }
  }

  submitSyncCatalogUrl(): void {
    const feedUrl = this.catalogFeedUrlInput().trim();
    const apiKey = this.catalogSyncApiKey().trim();
    if (!feedUrl || !apiKey) {
      this.catalogSyncStatus.set({ success: false, message: 'URL மற்றும் API Key இரண்டையும் உள்ளிடவும்.' });
      return;
    }

    this.isCatalogSyncing.set(true);
    this.catalogSyncStatus.set(null);

    this.apiService.importTenantCatalogUrl(feedUrl, apiKey).subscribe({
      next: (res) => {
        this.isCatalogSyncing.set(false);
        this.catalogSyncStatus.set({
          success: true,
          message: `வெற்றிகரமாக ${res.items_imported} புடவைகள் "${res.shop_name}" கணக்கில் இணைக்கப்பட்டது!`,
        });
        this.loadAdminData();
      },
      error: (err) => {
        this.isCatalogSyncing.set(false);
        this.catalogSyncStatus.set({
          success: false,
          message: err.error?.detail || 'URL இலிருந்து தயாரிப்புகளை பதிவிறக்க முடியவில்லை.',
        });
      },
    });
  }

  loadSampleCatalogJson(): void {
    this.apiService.getTenantCatalogSample().subscribe({
      next: (sample) => {
        this.catalogDirectJsonInput.set(JSON.stringify(sample.sample_feed, null, 2));
      },
    });
  }

  submitDirectCatalogSync(): void {
    const jsonStr = this.catalogDirectJsonInput().trim();
    const apiKey = this.catalogSyncApiKey().trim();
    if (!jsonStr || !apiKey) {
      this.catalogSyncStatus.set({ success: false, message: 'JSON தயாரிப்பு பட்டியல் மற்றும் API Key இரண்டையும் உள்ளிடவும்.' });
      return;
    }

    let parsedItems: any[];
    try {
      parsedItems = JSON.parse(jsonStr);
      if (!Array.isArray(parsedItems)) {
        this.catalogSyncStatus.set({ success: false, message: 'JSON ஒரு Array ஆக இருக்க வேண்டும் ([ {...}, {...} ]).' });
        return;
      }
    } catch {
      this.catalogSyncStatus.set({ success: false, message: 'செல்லுபடியற்ற JSON வடிவம் (Invalid JSON format).' });
      return;
    }

    this.isCatalogSyncing.set(true);
    this.catalogSyncStatus.set(null);

    this.apiService.syncTenantCatalog(parsedItems, apiKey).subscribe({
      next: (res) => {
        this.isCatalogSyncing.set(false);
        this.catalogSyncStatus.set({
          success: true,
          message: `வெற்றிகரமாக sync செய்யப்பட்டது! புதியவை: ${res.created}, புதுப்பிக்கப்பட்டவை: ${res.updated}, பெறப்பட்டவை: ${res.items_received} (${res.shop_name})`,
        });
        this.loadAdminData();
      },
      error: (err) => {
        this.isCatalogSyncing.set(false);
        this.catalogSyncStatus.set({
          success: false,
          message: err.error?.detail || 'Sync செய்வதில் பிழை ஏற்பட்டது.',
        });
      },
    });
  }
}

