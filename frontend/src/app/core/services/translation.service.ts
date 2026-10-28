import { Injectable, signal, computed } from '@angular/core';

// Supported i18n Language Codes
export type Language = 'en' | 'ta' | 'hi' | 'ml' | 'te';

export interface SupportedLanguage {
  code: Language;
  label: string;
  englishLabel: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en', label: 'English', englishLabel: 'English', flag: '🇬🇧' },
  { code: 'ta', label: 'தமிழ்', englishLabel: 'Tamil', flag: '🇮🇳' },
  { code: 'hi', label: 'हिन्दी', englishLabel: 'Hindi', flag: '🇮🇳' },
  { code: 'ml', label: 'മലയാളം', englishLabel: 'Malayalam', flag: '🇮🇳' },
  { code: 'te', label: 'తెలుగు', englishLabel: 'Telugu', flag: '🇮🇳' },
];

export interface Translations {
  appName: string;
  appTagline: string;
  kioskReady: string;
  inactivityNotice: string;
  resetSession: string;
  langName: string;
  darkThemeBtn: string;
  lightThemeBtn: string;
  darkThemeLabel: string;
  lightThemeLabel: string;

  // Step 1: Welcome & Consent
  welcomeTitle: string;
  welcomeSubtitle: string;
  startBtn: string;
  consentTitle: string;
  consentDesc: string;
  consentP1: string;
  consentP2: string;
  consentP3: string;
  consentAgree: string;
  consentDecline: string;

  // Step 2: Camera Capture
  cameraTitle: string;
  cameraSubtitle: string;
  cameraPermError: string;
  captureBtn: string;
  retakeBtn: string;
  confirmPhotoBtn: string;
  uploadFallbackBtn: string;
  cameraGuide: string;

  // Step 3: Saree Catalogue
  catalogueTitle: string;
  catalogueSubtitle: string;
  allCategories: string;
  filterBridal: string;
  filterBanarasi: string;
  filterCotton: string;
  filterSilk: string;
  fabricLabel: string;
  colorLabel: string;
  palluLabel: string;
  priceLabel: string;
  skuLabel: string;
  tryThisSareeBtn: string;
  selectedSareePrompt: string;
  changePhotoBtn: string;

  // Step 4: Try-On Processing
  processingTitle: string;
  processingSubtitle: string;
  stepAnalysis: string;
  stepAlignment: string;
  stepRendering: string;
  stepFinalizing: string;
  disclaimerNotice: string;

  // Step 5: Result Preview & Download
  resultTitle: string;
  resultSubtitle: string;
  originalPhotoLabel: string;
  tryonResultLabel: string;
  qrTitle: string;
  qrInstructions: string;
  directDownloadBtn: string;
  tryAnotherSareeBtn: string;
  finishSessionBtn: string;
  tokenExpiresNotice: string;

  // Admin Dashboard
  adminPortalBtn: string;
  adminBackToKiosk: string;
  adminTitle: string;
  metricsTodayTryons: string;
  metricsSuccessRate: string;
  metricsActiveSarees: string;
  metricsCostToday: string;
  tabCatalog: string;
  tabJobs: string;
  addNewSaree: string;
  toggleStatusActive: string;
  toggleStatusInactive: string;
  retryJobBtn: string;

  // Portrait Totem & Multi-category
  launchKioskBtn: string;
  exitKioskBtn: string;
  poseGuideTitle: string;
  poseGuideDesc: string;
  poseValidGreenTick: string;
  categorySaree: string;
  categoryWomen: string;
  categoryMen: string;
  categoryKids: string;
  uploadPhotoBtn: string;
  timerLabel: string;
  countdownPrompt: string;

  // Additional UI enhancement keys
  backBtn: string;
  retryCameraBtn: string;
  emptyCatalogTitle: string;
  reloadCatalogBtn: string;
  viewResultBtn: string;
  viewOriginalBtn: string;
  viewCompareBtn: string;
  viewSliderBtn: string;
  sliderPrompt: string;
  stylistTitle: string;
  stylistHarmonicsLabel: string;
  stylistBlouseRecommend: string;
  stylistOccasionLabel: string;
  jewelleryAccentTitle: string;
  jewelleryNone: string;
  jewelleryTempleGold: string;
  jewelleryPolkiDiamond: string;
  jewelleryAntiqueRuby: string;
  weddingLightingTitle: string;
  lightingDaylight: string;
  lightingMandapam: string;
  lightingReception: string;
  blouseCustomizerTitle: string;
  blouseMatching: string;
  blouseContrast: string;
  blouseGoldZari: string;
  // Phase 3: Couple & Family Matching
  coupleMatchingTitle: string;
  coupleMatchingSubtitle: string;
  coupleDhotiOption: string;
  coupleKurtaOption: string;
  coupleTwinningOption: string;
  // Phase 4: Multi-Style Draping Engine
  drapingStyleTitle: string;
  styleClassicNivi: string;
  styleMadisar: string;
  styleGujaratiFront: string;
  styleLehengaDrape: string;
  // Phase 5: Showroom Floor Heatmap & Analytics
  tabInsights: string;
  rackHeatmapTitle: string;
  colorTrendsTitle: string;
  restockAlertsTitle: string;
  shareWhatsAppBtn: string;
  tryonFailedTitle: string;
  tryonFailedDesc: string;
  retryTryonBtn: string;
  confirmAndSelectBtn: string;

  // Custom Product Workflow & Combination Preview
  selectFromCatalog: string;
  uploadCustomProduct: string;
  customGarmentTitle: string;
  customGarmentSubtitle: string;
  takeProductPhotoBtn: string;
  uploadProductPhotoBtn: string;
  productPhotoGuide: string;
  retakeProductBtn: string;
  removeProductBtn: string;
  confirmProductBtn: string;
  invalidProductFormatError: string;
  productSizeError: string;
  productCameraError: string;
  combineTitle: string;
  combineSubtitle: string;
  userPhotoLabel: string;
  selectedProductLabel: string;
  replaceUserPhotoBtn: string;
  changeProductBtn: string;
  generateTryOnBtn: string;
  customGarmentBadge: string;

  // Admin PIN Security
  adminPinTitle: string;
  adminPinSubtitle: string;
  adminPinError: string;
  adminPinCancel: string;
  adminPinUnlock: string;
  adminLockBtn: string;
  adminAutoLockHint: string;
  adminSessionActive: string;

  // Today's Customers, Settings & Attract Mode
  tabCustomersToday: string;
  tabSettings: string;
  customerGalleryTitle: string;
  customerOriginalPhoto: string;
  customerTryonResult: string;
  retentionSettingsTitle: string;
  aiEngineSettingsTitle: string;
  attractModeTitle: string;
  purgeExpiredBtn: string;
  clearCatalogBtn: string;
  addProductBtn: string;

  // Showroom Staff Kiosk Gate
  staffGateTitle: string;
  staffGateSubtitle: string;
  staffGatePinError: string;
  staffGateUnlockBtn: string;
  lockKioskBtn: string;

  // Photo Crop & Frame
  cropModalTitle: string;
  cropModalSubtitle: string;
  cropConfirmBtn: string;
  cropRetakeBtn: string;
  cropZoomIn: string;
  cropZoomOut: string;
  cropReset: string;

  // Lookbook Showcase
  lookbookTitle: string;
  lookbookSubtitle: string;

  // Ergonomic Reachability Mode (For Tall Kiosk Totems)
  reachModeBtn: string;
  reachModeActive: string;
  lowerKeypadBtn: string;
  standardKeypadBtn: string;
  restoreStandardHeight: string;

  // Admin PIN & Security Credentials Management
  adminSecurityTitle: string;
  adminSecuritySubtitle: string;
  currentAdminPin: string;
  newAdminPin: string;
  confirmAdminPin: string;
  updateAdminPinBtn: string;
  adminPinUpdatedSuccess: string;
  staffPinSettingsTitle: string;
  staffPinSettingsHint: string;

  // B2B Feature Tiers & Runway Video
  b2bFeaturesTitle: string;
  b2bFeaturesSubtitle: string;
  viewRunwayVideoBtn: string;
  generatingVideoText: string;

  // New keys for Welcome Screen, Draggable Dock, and System Alerts
  featureDrapeTitle: string;
  featureDrapeDesc: string;
  featureSilkTitle: string;
  featureSilkDesc: string;
  featurePrivacyTitle: string;
  featurePrivacyDesc: string;
  featureQrTitle: string;
  featureQrDesc: string;
  dockMenu: string;
  dockDragToMove: string;
  dockSwitchLeft: string;
  dockSwitchRight: string;
  dockQuickMenuHint: string;
  dockClose: string;
  adminExitBtn: string;
  adminPortalTitle: string;
  touchToStart: string;
  touchScreenToBegin: string;
  tapAnywhereToStart: string;
  kioskFooterPrivacyNotice: string;
  staffGateFooterHint: string;
  customerGallerySubtitle: string;
  lookbookCustomerTagline: string;
  cameraPermErrorHint: string;
  analyzingPose: string;
  cancelCountdownBtn: string;
  yourPhotoLabel: string;
  apiOfflineTitle: string;
  retryConnectionBtn: string;
  reloadCatalogueHint: string;
  customProductCameraHint: string;
  customProductFormatHint: string;
  sourceLabel: string;
  matchScoreLabel: string;
  cropDragInstruction: string;
  runwayVideoTitle: string;
  runwayVideoDesc: string;
  downloadVideoBtn: string;
  closeBtn: string;
  configureTimerBtn: string;
  noCustomersTodayTitle: string;
  noCustomersTodayDesc: string;
  inspectHdBtn: string;
  deleteBtn: string;
}

// Inlined core bundle dictionaries for zero-latency, offline kiosk stability
import enDict from '../../../../public/assets/i18n/en.json';
import taDict from '../../../../public/assets/i18n/ta.json';
import hiDict from '../../../../public/assets/i18n/hi.json';
import mlDict from '../../../../public/assets/i18n/ml.json';
import teDict from '../../../../public/assets/i18n/te.json';

const DICTIONARIES: Record<Language, any> = {
  en: enDict,
  ta: taDict,
  hi: hiDict,
  ml: mlDict,
  te: teDict,
};

@Injectable({
  providedIn: 'root',
})
export class TranslationService {
  readonly supportedLanguages = SUPPORTED_LANGUAGES;

  private getInitialLanguage(): Language {
    try {
      if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
        const saved = localStorage.getItem('nexooai_language') as Language;
        if (saved && ['en', 'ta', 'hi', 'ml', 'te'].includes(saved)) {
          return saved;
        }
      }
    } catch {
      // Storage unavailable
    }
    return 'ta'; // Default to Tamil for showroom kiosk
  }

  readonly currentLanguage = signal<Language>(this.getInitialLanguage());

  // Current language descriptor
  readonly currentLangInfo = computed(() => {
    const lang = this.currentLanguage();
    return SUPPORTED_LANGUAGES.find((l) => l.code === lang) || SUPPORTED_LANGUAGES[0];
  });

  // Reactive translations dictionary matching current language with English fallback
  readonly t = computed<Translations>(() => {
    const lang = this.currentLanguage();
    const primary = DICTIONARIES[lang] || DICTIONARIES['en'];
    const fallback = DICTIONARIES['en'];

    return new Proxy(primary, {
      get(target, prop: string) {
        if (prop in target && target[prop]) {
          return target[prop];
        }
        return fallback[prop] ?? prop;
      },
    }) as Translations;
  });

  /**
   * Translates a key by name, used by TranslatePipe
   */
  translateKey(key: string, fallback?: string): string {
    const lang = this.currentLanguage();
    const currentDict = DICTIONARIES[lang];
    if (currentDict && currentDict[key]) {
      return currentDict[key];
    }
    const defaultDict = DICTIONARIES['en'];
    if (defaultDict && defaultDict[key]) {
      return defaultDict[key];
    }
    return fallback || key;
  }

  /**
   * Changes active application language and persists to localStorage
   */
  setLanguage(lang: Language): void {
    if (!['en', 'ta', 'hi', 'ml', 'te'].includes(lang)) return;
    this.currentLanguage.set(lang);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('nexooai_language', lang);
      } catch (e) {
        console.warn('Storage unavailable', e);
      }
    }
  }

  /**
   * Toggle language between Tamil and English (primary kiosk bilingual switch)
   */
  toggleLanguage(): void {
    const next = this.currentLanguage() === 'ta' ? 'en' : 'ta';
    this.setLanguage(next);
  }
}
