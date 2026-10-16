import { Injectable, signal, computed } from '@angular/core';

export type Language = 'ta' | 'en';

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
}

const DICTIONARY: Record<Language, Translations> = {
  ta: {
    appName: 'நெக்சூஏஐ சேலை சோதனைக் கூடம்',
    appTagline: 'ஜவுளி கடைகளுக்கான நவீன மெய்நிகர் சேலை ட்ரையல் தளம்',
    kioskReady: 'கியோஸ்க் தயார் நிலையில் உள்ளது',
    inactivityNotice: 'செயலற்ற நேரம் முடிவடைகிறது:',
    resetSession: 'புதிய அமர்வு',
    langName: 'English-க்கு மாறுக',
    darkThemeBtn: 'இருண்ட பயன்முறைக்கு மாறுக (Dark Theme)',
    lightThemeBtn: 'வெளிச்ச பயன்முறைக்கு மாறுக (Light Theme)',
    darkThemeLabel: 'டார்க் தீம்',
    lightThemeLabel: 'லைட் தீம்',

    welcomeTitle: 'வணக்கம்! சேலை ட்ரையல் ஸ்டுடியோவிற்கு வரவேற்கிறோம்',
    welcomeSubtitle: 'புடவையை உடுத்திப் பார்க்காமலேயே, அது உங்களுக்கு எப்படி பொருந்துகிறது என்பதை நொடிகளில் கண்டறியுங்கள்.',
    startBtn: 'ட்ரையல் தொடங்குங்கள்',
    consentTitle: 'புகைப்பட பயன்பாட்டு ஒப்புதல்',
    consentDesc: 'உங்கள் தனிப்பட்ட தகவல் பாதுகாப்பு எங்களுக்கு மிக முக்கியம். தொடர்வதற்கு முன் படிக்கவும்:',
    consentP1: 'உங்கள் புகைப்படம் இந்த மெய்நிகர் சேலை தோற்றத்தை உருவாக்குவதற்காக மட்டுமே தற்காலிகமாகப் பயன்படுத்தப்படுகிறது.',
    consentP2: 'உங்கள் புகைப்படம் எந்தவொரு பொது தளத்திலும் பகிரப்படாது அல்லது AI பயிற்சிக்காக சேமிக்கப்படாது.',
    consentP3: 'அமர்வு முடிந்ததும் அல்லது 24 மணி நேரத்திற்குள் உங்கள் புகைப்படம் தானாகவே நிரந்தரமாக அழிக்கப்படும்.',
    consentAgree: 'நான் ஒப்புக்கொள்கிறேன் — தொடரவும்',
    consentDecline: 'ரத்து செய்',

    cameraTitle: 'நேரலை புகைப்படம் எடுக்கவும்',
    cameraSubtitle: 'நேராக நின்று கேமரா வழிகாட்டி சட்டகத்திற்குள் பொருந்தும்படி நிற்கவும்.',
    cameraPermError: 'கேமரா அனுமதி தேவை. கேமராவை அணுக அனுமதி வழங்கவும் அல்லது புகைப்படத்தை பதிவேற்றவும்.',
    captureBtn: 'புகைப்படம் எடு',
    retakeBtn: 'மீண்டும் எடு',
    confirmPhotoBtn: 'இந்த புகைப்படம் சரி — சேலை தேர்ந்தெடுக்கவும்',
    uploadFallbackBtn: 'கோப்பிலிருந்து பதிவேற்றவும்',
    cameraGuide: 'முழு உடலும் தெரியும்படி நேராக நிற்கவும்',

    catalogueTitle: 'பிடித்தமான புடவையைத் தேர்ந்தெடுக்கவும்',
    catalogueSubtitle: 'எங்கள் பிரத்யேக பட்டு, காட்டன் மற்றும் திருமண சேலை தொகுப்பை ஆராயுங்கள்.',
    allCategories: 'அனைத்து சேலைகள்',
    filterBridal: 'திருமண பட்டு',
    filterBanarasi: 'பனாரசி பட்டு',
    filterCotton: 'கைத்தறி காட்டன்',
    filterSilk: 'மைசூர் பட்டு',
    fabricLabel: 'துணி வகை:',
    colorLabel: 'நிறம்:',
    palluLabel: 'முந்தானை வேலைப்பாடு:',
    priceLabel: 'விலை:',
    skuLabel: 'SKU குறியீடு:',
    tryThisSareeBtn: 'இதை உடுத்திப் பார்',
    selectedSareePrompt: 'தேர்ந்தெடுக்கப்பட்ட சேலை:',
    changePhotoBtn: 'புகைப்படம் மாற்று',

    processingTitle: 'சேலை உடுத்தும் செயல்முறை நடக்கிறது...',
    processingSubtitle: 'எங்கள் AI மாடல் உங்கள் தோற்றத்திற்கு சேலையின் மடிப்புகளையும் முந்தானையையும் சரியாக அமைக்கிறது.',
    stepAnalysis: '1. உடல் தோற்ற அமைப்பை கண்டறிகிறது...',
    stepAlignment: '2. புடவையின் முந்தானை மற்றும் மடிப்புகளை பொருத்துகிறது...',
    stepRendering: '3. பட்டுத் துணியின் ஒளி மற்றும் அமைப்பை உருவாக்குகிறது...',
    stepFinalizing: '4. இறுதி தோற்றத்தை உருவாக்குகிறது...',
    disclaimerNotice: 'கவனிக்க: இது ஒரு மெய்நிகர் மாதிரிக் காட்சி மட்டுமே. உண்மையான ஆடையின் பொருத்தம் மற்றும் துணி தொடுதலுக்கு உத்தரவாதம் இல்லை.',

    resultTitle: 'உங்கள் புதிய சேலை தோற்றம் தயார்!',
    resultSubtitle: 'கீழே உங்கள் அசல் புகைப்படம் மற்றும் AI மெய்நிகர் சேலை தோற்றத்தை ஒப்பிட்டுப் பாருங்கள்.',
    originalPhotoLabel: 'உங்கள் அசல் தோற்றம்',
    tryonResultLabel: 'மெய்நிகர் சேலை தோற்றம்',
    qrTitle: 'மொபைலில் பதிவிறக்க QR ஸ்கேன் செய்யவும்',
    qrInstructions: 'உங்கள் மொபைல் கேமராவால் இந்த QR குறியீட்டை ஸ்கேன் செய்து உடனடியாக புகைப்படத்தை சேமித்துக் கொள்ளுங்கள்.',
    directDownloadBtn: 'புகைப்படத்தை பதிவிறக்கு',
    tryAnotherSareeBtn: 'வேறு ஆடை / சேலை முயற்சி செய்',
    finishSessionBtn: 'அமர்வை முடித்து வெளியேறு',
    tokenExpiresNotice: 'பாதுகாப்பு கருதி இந்த QR இணைப்பு 30 நிமிடங்களில் காலாவதியாகிவிடும்.',

    adminPortalBtn: 'நிர்வாகப் பலகை',
    adminBackToKiosk: 'கியோஸ்கிற்கு திரும்பு',
    adminTitle: 'கடை மேலாண்மை & புள்ளிவிவர பலகை',
    metricsTodayTryons: 'இன்றைய மொத்த ட்ரையல்கள்',
    metricsSuccessRate: 'வெற்றி விகிதம்',
    metricsActiveSarees: 'செயலில் உள்ள சேலைகள்',
    metricsCostToday: 'உத்தேச AI செலவு',
    tabCatalog: 'சேலை இருப்பு மேலாண்மை',
    tabJobs: 'ட்ரையல் கண்காணிப்பு (Telemetry)',
    addNewSaree: 'புதிய சேலை சேர்க்க',
    toggleStatusActive: 'செயலில் உள்ளது',
    toggleStatusInactive: 'செயலிழக்கப்பட்டது',
    retryJobBtn: 'மீண்டும் இயக்கு',

    launchKioskBtn: '🚀 நேரலை கியோஸ்க் (Live Kiosk)',
    exitKioskBtn: 'கியோஸ்க்கிலிருந்து வெளியேறு',
    poseGuideTitle: 'மாதிரி தோற்றம் (Pose Guide)',
    poseGuideDesc: 'வழிகாட்டி சட்டகத்திற்குள் நேராக நிற்கவும்',
    poseValidGreenTick: 'சரியான போஸ் — AI தயார் நிலையில் உள்ளது',
    categorySaree: 'சேலைகள்',
    categoryWomen: 'சுடிதார் & லெஹெங்கா',
    categoryMen: 'ஆண்கள் ஆடைகள்',
    categoryKids: 'குழந்தைகள் ஆடைகள்',
    uploadPhotoBtn: '📁 படம் பதிவேற்று',
    timerLabel: 'டைமர்',
    countdownPrompt: 'தயாராகுங்கள்...',

    backBtn: 'பின்செல்',
    retryCameraBtn: 'கேமராவை மீண்டும் இயக்கு',
    emptyCatalogTitle: 'சேலைகள் எதுவும் கிடைக்கவில்லை',
    reloadCatalogBtn: 'பட்டியலை புதுப்பிக்கவும்',
    viewResultBtn: 'புடவை தோற்றம்',
    viewOriginalBtn: 'அசல் புகைப்படம்',
    viewCompareBtn: 'ஒப்பீடு',
    viewSliderBtn: '✨ ஸ்லைடர் திரை (Split Curtain)',
    sliderPrompt: 'தங்கக் கோட்டை விரலால் நகர்த்தி தோற்ற மாற்றத்தைப் பாருங்கள்',
    stylistTitle: '👑 NeXooAi ராயல் ஃபேஷன் ஆலோசகர் (AI Stylist)',
    stylistHarmonicsLabel: 'நிறப் பொருத்த விகிதம்',
    stylistBlouseRecommend: 'பரிந்துரைக்கப்படும் பிளவுஸ் காம்போ',
    stylistOccasionLabel: 'சிறந்த நிகழ்வு / தருணம்',
    jewelleryAccentTitle: '💎 மணப்பெண் ஆபரண அலங்காரம் (Bridal Accents)',
    jewelleryNone: 'புடவை மட்டும்',
    jewelleryTempleGold: 'கோயில் நகை (Temple Gold)',
    jewelleryPolkiDiamond: 'போல்சி வைரம் (Polki Emerald)',
    jewelleryAntiqueRuby: 'ஆண்டிக் ரூபி (Antique Ruby)',
    shareWhatsAppBtn: 'வாட்ஸ்அப் பகிர்வு (WhatsApp)',
    tryonFailedTitle: 'ட்ரையல் செய்வதில் தற்காலிக சிக்கல்',
    tryonFailedDesc: 'தயவுசெய்து மீண்டும் முயற்சிக்கவும் அல்லது வேறு புடவையைத் தேர்ந்தெடுக்கவும்.',
    retryTryonBtn: 'மீண்டும் முயற்சி செய்',
    confirmAndSelectBtn: 'இந்த புகைப்படம் சரி — ஆடை தேர்ந்தெடுக்கவும்',

    // Custom Product Workflow & Combination Preview
    selectFromCatalog: 'ஷோரூம் சேலைகள் (கேட்லாக்)',
    uploadCustomProduct: 'சொந்த ஆடை புகைப்படம் (கேமரா / பதிவேற்றம்)',
    customGarmentTitle: 'உங்கள் சொந்த ஆடையை படமெடுக்கவும் அல்லது பதிவேற்றவும்',
    customGarmentSubtitle: 'ஷோரூமில் உள்ள எந்தவொரு ஆடையையும் கேமராவில் படம் பிடித்தோ அல்லது கோப்பிலிருந்து பதிவேற்றியோ ட்ரையல் பார்க்கலாம்.',
    takeProductPhotoBtn: 'ஆடை புகைப்படம் எடு (கேமரா)',
    uploadProductPhotoBtn: 'கோப்பிலிருந்து பதிவேற்று',
    productPhotoGuide: 'ஆடையை மடிப்பு தெரியாமல் தட்டையாக அல்லது ஹேங்கரில் மாட்டி படம் பிடிக்கவும்',
    retakeProductBtn: 'ஆடை படம் மாற்று',
    removeProductBtn: 'நீக்கு',
    confirmProductBtn: 'இந்த ஆடையைத் தேர்வு செய்',
    invalidProductFormatError: 'தவறான கோப்பு வடிவம். JPEG, PNG அல்லது WEBP வடிவங்களை மட்டுமே பயன்படுத்தவும்.',
    productSizeError: 'கோப்பின் அளவு 10 MB-க்கு மிகாமல் இருக்க வேண்டும்.',
    productCameraError: 'கேமரா அனுமதி கிடைக்கவில்லை. கோப்பிலிருந்து பதிவேற்றவும்.',
    combineTitle: 'தோற்றம் மற்றும் ஆடை தேர்வு உறுதிப்படுத்தல்',
    combineSubtitle: 'உங்கள் புகைப்படத்தையும் தேர்ந்தெடுத்த ஆடையையும் சரிபார்த்து AI ட்ரையலைத் தொடங்குங்கள்.',
    userPhotoLabel: 'உங்கள் தோற்றம்',
    selectedProductLabel: 'தேர்ந்தெடுக்கப்பட்ட ஆடை',
    replaceUserPhotoBtn: 'உங்கள் படம் மாற்று',
    changeProductBtn: 'வேறு ஆடை தேர்வு',
    generateTryOnBtn: '✨ AI மெய்நிகர் ட்ரையல் தொடங்கு',
    customGarmentBadge: 'தனிப்பயன் ஆடை',

    // Admin PIN Security
    adminPinTitle: 'நிர்வாகப் பாதுகாப்பு PIN',
    adminPinSubtitle: 'நிர்வாகப் பலகையைத் திறக்க 6 இலக்க ஊழியர் PIN உள்ளிடவும்',
    adminPinError: 'தவறான PIN! மீண்டும் முயற்சிக்கவும்.',
    adminPinCancel: 'ரத்து செய்',
    adminPinUnlock: 'திறக்க',
    adminLockBtn: '🔒 நிர்வாகத்தைப் பூட்டு',
    adminAutoLockHint: '60 வினாடி அமைதிக்குப் பின் தானாகப் பூட்டிக்கொள்ளும்',
    adminSessionActive: 'ஊழியர் நிர்வாக அமர்வு செயலில் உள்ளது',

    tabCustomersToday: '👥 இன்றைய வாடிக்கையாளர்கள்',
    tabSettings: '⚙️ AI & அமைப்புகள்',
    customerGalleryTitle: 'இன்றைய வாடிக்கையாளர் புகைப்படங்கள் & ட்ரையல் தோற்றம்',
    customerOriginalPhoto: 'வாடிக்கையாளர் படம்',
    customerTryonResult: 'AI சேலை பொருத்தம்',
    retentionSettingsTitle: 'புகைப்பட பாதுகாப்பு & தானியங்கி அழிப்பு நேரம்',
    aiEngineSettingsTitle: 'AI மாடல் தேர்வு (Super Admin)',
    attractModeTitle: 'விளம்பரத் திரை (Attract Mode Video)',
    purgeExpiredBtn: 'காலாவதியான படங்களை உடனே அழி',
    clearCatalogBtn: 'மாதிரி ஆடைகளை நீக்கு',
    addProductBtn: 'புதிய தயாரிப்பு சேர்',

    // Showroom Staff Kiosk Gate
    staffGateTitle: 'ஷோரூம் ஊழியர் உள்நுழைவு',
    staffGateSubtitle: 'கியோஸ்க்கை இயக்க 4-இலக்க ஊழியர் PIN உள்ளிடவும் (Default: 5521)',
    staffGatePinError: 'தவறான ஊழியர் PIN! சரியான 4-இலக்க பின்னை உள்ளிடவும்.',
    staffGateUnlockBtn: 'கியோஸ்க்கைத் தொடங்கு',
    lockKioskBtn: '🔒 கியோஸ்க் பூட்டு',

    // Photo Crop & Frame
    cropModalTitle: 'போட்டோவை சரிசெய்க (Crop & Frame)',
    cropModalSubtitle: 'ஒரு நபரை மட்டும் மையப்படுத்தி, தேவையில்லாத நபர்களை அல்லது பின்னணியை நீக்கவும்',
    cropConfirmBtn: '✓ பயிரை உறுதிசெய்',
    cropRetakeBtn: '✕ மீண்டும் படம் எடு',
    cropZoomIn: '🔍+ பெரிதாக்கு',
    cropZoomOut: '🔍- சிறிதாக்கு',
    cropReset: '🔄 மீட்டமை',

    // Lookbook Showcase
    lookbookTitle: 'இன்றைய வாடிக்கையாளர்களின் பிரத்யேக தோற்றங்கள்',
    lookbookSubtitle: 'எங்கள் ஷோரூமில் இன்று வாடிக்கையாளர்கள் தேர்ந்தெடுத்த ஆடைகளின் அழகு தோற்றங்கள்',

    // Ergonomic Reachability Mode (For Tall Kiosk Totems)
    reachModeBtn: 'கைக்கு எட்டும் வசதி',
    reachModeActive: '♿ கைக்கு எட்டும் முறைமை இயங்குகிறது (மீட்டெடுக்க தொடவும்)',
    lowerKeypadBtn: '⬇️ கீழ் விசைப்பலகை',
    standardKeypadBtn: '⬆️ மேல் விசைப்பலகை',
    restoreStandardHeight: 'இயல்பு நிலை',

    // Admin PIN & Security Credentials Management
    adminSecurityTitle: '🔐 நிர்வாகி பாதுகாப்பு அமைப்புகள்',
    adminSecuritySubtitle: 'நிர்வாக போர்ட்டல் அணுகல் பின் குறியீட்டை மாற்றுதல்',
    currentAdminPin: 'தற்போதைய நிர்வாகி பின் (Current Admin PIN)',
    newAdminPin: 'புதிய நிர்வாகி பின் (New Admin PIN - 6 இலக்கங்கள்)',
    confirmAdminPin: 'புதிய பின்னை உறுதிசெய்க (Confirm PIN)',
    updateAdminPinBtn: 'நிர்வாகி பின்னைப் புதுப்பிக்கவும்',
    adminPinUpdatedSuccess: 'நிர்வாகி அணுகல் பின் வெற்றிகரமாக மாற்றப்பட்டது!',
    staffPinSettingsTitle: '🛡️ கியோஸ்க் ஊழியர் திறப்பு பின்',
    staffPinSettingsHint: 'ஷோரூம் தொடங்கும் போது ஊழியர் கியோஸ்க்கைத் திறக்க இந்த 4-இலக்க பின்னை உள்ளிட வேண்டும்.',
  },
  en: {
    appName: 'NeXooAi Saree Try-On Studio',
    appTagline: 'AI-Powered Virtual Saree Trial Experience for Textile Showrooms',
    kioskReady: 'Kiosk Online & Ready',
    inactivityNotice: 'Idle timeout in:',
    resetSession: 'Reset Session',
    langName: 'தமிழுக்கு மாறுக',
    darkThemeBtn: 'Switch to Dark Theme',
    lightThemeBtn: 'Switch to Light Theme',
    darkThemeLabel: 'Dark Theme',
    lightThemeLabel: 'Light Theme',

    welcomeTitle: 'Welcome to the Virtual Saree Trial Studio',
    welcomeSubtitle: 'Experience how exquisite sarees look on you in seconds—without physically draping them.',
    startBtn: 'Begin Virtual Trial',
    consentTitle: 'Customer Photo Consent Notice',
    consentDesc: 'Your privacy is our utmost priority. Please review before proceeding:',
    consentP1: 'Your photo is used solely to generate this virtual saree preview on this showroom kiosk.',
    consentP2: 'Customer photos are never shared publicly or used for unauthorized AI model training.',
    consentP3: 'All temporary images and sessions are automatically purged after the retention window.',
    consentAgree: 'I Agree & Continue',
    consentDecline: 'Cancel',

    cameraTitle: 'Capture Your Portrait',
    cameraSubtitle: 'Stand naturally within the on-screen guideline frame facing the camera.',
    cameraPermError: 'Camera permission required. Please allow camera access or use photo upload.',
    captureBtn: 'Capture Photo',
    retakeBtn: 'Retake Photo',
    confirmPhotoBtn: 'Confirm Photo & Select Saree',
    uploadFallbackBtn: 'Upload from File',
    cameraGuide: 'Align yourself inside the frame',

    catalogueTitle: 'Select Your Favorite Saree',
    catalogueSubtitle: 'Browse curated collections of Kanchipuram Silks, Banarasi, and Handlooms.',
    allCategories: 'All Collections',
    filterBridal: 'Bridal Silk',
    filterBanarasi: 'Banarasi Silk',
    filterCotton: 'Handloom Cotton',
    filterSilk: 'Mysore Silk',
    fabricLabel: 'Fabric:',
    colorLabel: 'Color:',
    palluLabel: 'Pallu Work:',
    priceLabel: 'Price:',
    skuLabel: 'SKU Code:',
    tryThisSareeBtn: 'Try This Saree',
    selectedSareePrompt: 'Selected Saree:',
    changePhotoBtn: 'Change Photo',

    processingTitle: 'Draping Saree with AI...',
    processingSubtitle: 'Our neural drape pipeline is aligning the pleats, border, and pallu to your posture.',
    stepAnalysis: '1. Analyzing body posture & lighting...',
    stepAlignment: '2. Fitting pallu drape and shoulder pleats...',
    stepRendering: '3. Synthesizing authentic silk sheen & texture...',
    stepFinalizing: '4. Finalizing high-resolution trial portrait...',
    disclaimerNotice: 'Notice: This is an AI-assisted visual preview and styling guide, not a guarantee of physical fit.',

    resultTitle: 'Your Virtual Saree Drape is Ready!',
    resultSubtitle: 'Compare your original portrait with the newly draped saree preview below.',
    originalPhotoLabel: 'Original Portrait',
    tryonResultLabel: 'Virtual Drape Preview',
    qrTitle: 'Scan QR to Download on Mobile',
    qrInstructions: 'Scan this secure QR code using your smartphone camera to download the high-res photo.',
    directDownloadBtn: 'Download Image',
    tryAnotherSareeBtn: 'Try Another Garment',
    finishSessionBtn: 'Finish Session',
    tokenExpiresNotice: 'For your security, this QR download link expires in 30 minutes.',

    adminPortalBtn: 'Admin Portal',
    adminBackToKiosk: 'Back to Kiosk',
    adminTitle: 'Store Management & Telemetry Portal',
    metricsTodayTryons: "Today's Total Try-Ons",
    metricsSuccessRate: 'Success Rate',
    metricsActiveSarees: 'Active Saree Styles',
    metricsCostToday: 'Estimated AI Cost',
    tabCatalog: 'Catalog Inventory',
    tabJobs: 'Try-On Job Telemetry',
    addNewSaree: 'Add New Saree',
    toggleStatusActive: 'Active',
    toggleStatusInactive: 'Inactive',
    retryJobBtn: 'Retry Job',

    launchKioskBtn: '🚀 Launch Kiosk (Portrait Mode)',
    exitKioskBtn: 'Exit Kiosk View',
    poseGuideTitle: 'Pose Reference Guideline',
    poseGuideDesc: 'Stand naturally within the silhouette frame',
    poseValidGreenTick: 'Pose Validated — Ready for AI Drape',
    categorySaree: 'Sarees',
    categoryWomen: "Women's Wear",
    categoryMen: "Men's Wear",
    categoryKids: "Kids' Wear",
    uploadPhotoBtn: '📁 Upload Photo',
    timerLabel: 'Timer',
    countdownPrompt: 'Get Ready...',

    backBtn: 'Back',
    retryCameraBtn: 'Retry Camera Access',
    emptyCatalogTitle: 'No garments found in this category',
    reloadCatalogBtn: 'Reload Catalogue',
    viewResultBtn: 'Try-On Result',
    viewOriginalBtn: 'Original Portrait',
    viewCompareBtn: 'Side-by-Side',
    viewSliderBtn: '✨ Split-Drape Slider',
    sliderPrompt: 'Drag the golden ribbon to reveal the virtual silk drape',
    stylistTitle: '👑 NeXooAi Royal AI Stylist & Colorimetry',
    stylistHarmonicsLabel: 'Color Undertone Match',
    stylistBlouseRecommend: 'Recommended Contrast Blouse',
    stylistOccasionLabel: 'Ideal Bridal Occasion',
    jewelleryAccentTitle: '💎 Bridal Jewellery Styling (Live Accents)',
    jewelleryNone: 'Pure Saree Only',
    jewelleryTempleGold: 'Temple Gold Choker',
    jewelleryPolkiDiamond: 'Polki Emerald Set',
    jewelleryAntiqueRuby: 'Antique Ruby & Pearls',
    shareWhatsAppBtn: 'Share on WhatsApp',
    tryonFailedTitle: 'Try-On Processing Issue',
    tryonFailedDesc: 'Please try again or select another garment style.',
    retryTryonBtn: 'Retry Try-On',
    confirmAndSelectBtn: 'Confirm Photo & Select Garment',

    // Custom Product Workflow & Combination Preview
    selectFromCatalog: 'Showroom Saree Catalog',
    uploadCustomProduct: 'Custom Product Photo (Camera / Upload)',
    customGarmentTitle: 'Capture or Upload Your Custom Garment',
    customGarmentSubtitle: 'Photograph any showroom attire or upload a clear clothing picture to try it on virtually.',
    takeProductPhotoBtn: 'Take Product Photo',
    uploadProductPhotoBtn: 'Upload from File',
    productPhotoGuide: 'Place garment flat or hang neatly facing the camera',
    retakeProductBtn: 'Change Product Photo',
    removeProductBtn: 'Remove',
    confirmProductBtn: 'Confirm Product',
    invalidProductFormatError: 'Unsupported format. Please select a JPEG, PNG, or WEBP image.',
    productSizeError: 'Product image exceeds the 10 MB limit.',
    productCameraError: 'Camera access unavailable. Please upload a photo from your device.',
    combineTitle: 'Review Your Try-On Selection',
    combineSubtitle: 'Confirm your portrait and chosen garment before generating the virtual trial.',
    userPhotoLabel: 'Your Portrait Photo',
    selectedProductLabel: 'Selected Garment',
    replaceUserPhotoBtn: 'Retake Your Photo',
    changeProductBtn: 'Change Garment',
    generateTryOnBtn: '✨ Generate Virtual Try-On',
    customGarmentBadge: 'Custom Garment',

    // Admin PIN Security
    adminPinTitle: 'Store Staff Security PIN',
    adminPinSubtitle: 'Enter 6-digit staff PIN to unlock admin portal',
    adminPinError: 'Incorrect PIN! Please try again.',
    adminPinCancel: 'Cancel',
    adminPinUnlock: 'Unlock',
    adminLockBtn: '🔒 Lock Admin Portal',
    adminAutoLockHint: 'Auto-locks after 60s of inactivity',
    adminSessionActive: 'Staff Admin Session Active',

    tabCustomersToday: "👥 Today's Customers",
    tabSettings: '⚙️ AI & Settings',
    customerGalleryTitle: "Today's Customer Try-On History & Portraits",
    customerOriginalPhoto: 'Customer Portrait',
    customerTryonResult: 'AI Try-On Result',
    retentionSettingsTitle: 'Photo Privacy & Auto-Retention Timer',
    aiEngineSettingsTitle: 'AI Model Provider (Super Admin)',
    attractModeTitle: 'Showroom Attract Screen & Video',
    purgeExpiredBtn: 'Purge Expired Media',
    clearCatalogBtn: 'Clear Sample Products',
    addProductBtn: 'Add New Product',

    // Showroom Staff Kiosk Gate
    staffGateTitle: 'Showroom Staff Kiosk Gate',
    staffGateSubtitle: 'Enter 4-digit staff PIN to activate kiosk for today (Default: 5521)',
    staffGatePinError: 'Incorrect Staff PIN. Please enter your valid 4-digit code.',
    staffGateUnlockBtn: 'Activate Showroom Kiosk',
    lockKioskBtn: '🔒 Lock Kiosk',

    // Photo Crop & Frame
    cropModalTitle: 'Adjust Photo Crop & Frame',
    cropModalSubtitle: 'Center one person and remove bystanders or background distractions',
    cropConfirmBtn: '✓ Confirm & Use Photo',
    cropRetakeBtn: '✕ Retake Photo',
    cropZoomIn: '🔍+ Zoom In',
    cropZoomOut: '🔍- Zoom Out',
    cropReset: '🔄 Reset Crop',

    // Lookbook Showcase
    lookbookTitle: "Today's Showroom Styles Showcase",
    lookbookSubtitle: 'Inspiring saree styles chosen by customers in our showroom today',

    // Ergonomic Reachability Mode (For Tall Kiosk Totems)
    reachModeBtn: '♿ Reach Mode',
    reachModeActive: '♿ Reach Mode Active (Tap to restore standard height)',
    lowerKeypadBtn: '⬇️ Lower Keypad',
    standardKeypadBtn: '⬆️ Standard Height',
    restoreStandardHeight: 'Restore Height',

    // Admin PIN & Security Credentials Management
    adminSecurityTitle: '🔐 Admin Security & Credentials',
    adminSecuritySubtitle: 'Update Store Admin Portal Access Security PIN',
    currentAdminPin: 'Current Admin PIN',
    newAdminPin: 'New Admin PIN (6 digits)',
    confirmAdminPin: 'Confirm New Admin PIN',
    updateAdminPinBtn: 'Update Admin Security PIN',
    adminPinUpdatedSuccess: 'Admin access PIN updated successfully!',
    staffPinSettingsTitle: '🛡️ Showroom Staff Kiosk PIN',
    staffPinSettingsHint: 'Floor staff must enter this 4-digit PIN to activate the kiosk device for daily customer trials.',
  }
};

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private getInitialLanguage(): Language {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('nexooai_language');
      if (saved === 'ta' || saved === 'en') {
        return saved;
      }
    }
    return 'en'; // Default to English as explicitly requested
  }

  readonly currentLanguage = signal<Language>(this.getInitialLanguage());

  readonly t = computed(() => DICTIONARY[this.currentLanguage()]);

  toggleLanguage(): void {
    const next = this.currentLanguage() === 'ta' ? 'en' : 'ta';
    this.currentLanguage.set(next);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('nexooai_language', next);
      } catch (e) {
        console.warn('Storage unavailable', e);
      }
    }
  }

  setLanguage(lang: Language): void {
    this.currentLanguage.set(lang);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('nexooai_language', lang);
      } catch (e) {
        console.warn('Storage unavailable', e);
      }
    }
  }
}
