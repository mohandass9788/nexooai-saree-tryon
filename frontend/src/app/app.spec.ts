import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { App } from './app';
import { TranslationService } from './core/services/translation.service';
import { KioskService } from './core/services/kiosk.service';
import { ApiService } from './core/services/api.service';

describe('NeXooAi Saree Kiosk App', () => {
  let translationService: TranslationService;
  let kioskService: KioskService;
  let apiService: ApiService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    translationService = TestBed.inject(TranslationService);
    kioskService = TestBed.inject(KioskService);
    apiService = TestBed.inject(ApiService);
    kioskService.isKioskUnlocked.set(true);
  });

  it('should initialize the kiosk application successfully', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should start on the WELCOME step with default Tamil language', () => {
    expect(kioskService.currentStep()).toBe('WELCOME');
    expect(translationService.currentLanguage()).toBe('ta');
  });

  it('should toggle language between Tamil and English', () => {
    expect(translationService.currentLanguage()).toBe('ta');
    translationService.toggleLanguage();
    expect(translationService.currentLanguage()).toBe('en');
    translationService.toggleLanguage();
    expect(translationService.currentLanguage()).toBe('ta');
  });

  it('should open consent modal and transition to CAMERA on confirmation', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.openConsentModal();
    expect(app.showConsentModal()).toBe(true);

    app.confirmConsent();
    expect(app.showConsentModal()).toBe(false);
    expect(kioskService.consentAccepted()).toBe(true);
    expect(kioskService.currentStep()).toBe('CAMERA');
  });

  it('should reset session and clear customer data', () => {
    kioskService.setStep('CATALOGUE');
    kioskService.resetSession();

    expect(kioskService.currentStep()).toBe('WELCOME');
    expect(kioskService.customerPhotoDataUrl()).toBeNull();
    expect(kioskService.selectedSaree()).toBeNull();
    expect(kioskService.tryOnResult()).toBeNull();
  });

  it('should open PIN modal when admin toggle is tapped in kiosk mode', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    expect(app.isAdminMode()).toBe(false);
    expect(app.showAdminPinModal()).toBe(false);

    app.openAdminPinModal();
    expect(app.showAdminPinModal()).toBe(true);
    expect(app.adminPinInput()).toBe('');

    app.closeAdminPinModal();
    expect(app.showAdminPinModal()).toBe(false);
  });

  it('should enter digits, handle backspace, and clear PIN on keypad', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.openAdminPinModal();
    app.enterPinDigit('8');
    app.enterPinDigit('4');
    expect(app.adminPinInput()).toBe('84');

    app.backspacePinDigit();
    expect(app.adminPinInput()).toBe('8');

    app.enterPinDigit('9');
    expect(app.adminPinInput()).toBe('89');

    app.clearPin();
    expect(app.adminPinInput()).toBe('');
  });

  it('should successfully verify PIN and unlock admin dashboard with session token and countdown', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    vi.spyOn(apiService, 'verifyKioskPin').mockReturnValue(
      of({
        authenticated: true,
        token: 'test-jwt-admin-token',
        role: 'admin',
        name: 'Showroom Floor Manager',
        expires_in_seconds: 900,
      })
    );

    app.openAdminPinModal();
    // Entering 6 digits automatically triggers submitAdminPin()
    app.enterPinDigit('8');
    app.enterPinDigit('4');
    app.enterPinDigit('9');
    app.enterPinDigit('2');
    app.enterPinDigit('0');
    app.enterPinDigit('1');

    expect(app.isAdminMode()).toBe(true);
    expect(app.showAdminPinModal()).toBe(false);
    expect(app.adminAuthToken()).toBe('test-jwt-admin-token');
    expect(app.adminInactivitySeconds()).toBe(60);

    // Switch admin tab
    app.setAdminTab('JOBS');
    expect(app.adminTab()).toBe('JOBS');
    app.setAdminTab('CATALOG');
    expect(app.adminTab()).toBe('CATALOG');
  });

  it('should display error toast and reset PIN input on invalid PIN verification', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    vi.spyOn(apiService, 'verifyKioskPin').mockReturnValue(
      throwError(() => ({ status: 401, error: { detail: 'Invalid PIN' } }))
    );

    app.openAdminPinModal();
    app.enterPinDigit('1');
    app.enterPinDigit('1');
    app.enterPinDigit('1');
    app.enterPinDigit('1');
    app.enterPinDigit('1');
    app.enterPinDigit('1');

    expect(app.isAdminMode()).toBe(false);
    expect(app.adminPinError()).toBeTruthy();
    expect(app.adminPinInput()).toBe('');
  });

  it('should lock admin portal and clear session token on lockAdminPortal()', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    vi.spyOn(apiService, 'logoutAdmin').mockReturnValue(of({ success: true }));

    app.isAdminMode.set(true);
    app.adminAuthToken.set('active-token-xyz');

    app.lockAdminPortal();

    expect(app.isAdminMode()).toBe(false);
    expect(app.adminAuthToken()).toBeNull();
    expect(app.showAdminPinModal()).toBe(false);
  });

  it('should display selected garment name and SKU on the RESULT step', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    kioskService.setSelectedSaree({
      id: 'sar-001',
      sku: 'SKU-KAN-001',
      name_ta: 'காஞ்சிபுரம் தூய பட்டுச் சேலை',
      name_en: 'Kanchipuram Pure Silk Saree',
      category: 'Bridal Silk',
      price: 18500,
      fabric: 'Pure Mulberry Silk',
      color: 'Crimson & Zari Gold',
      pallu_type: 'Heavy Brocade Mayil',
      primary_image_url: '/static/sarees/kanchipuram_red.jpg',
      is_active: true,
    });

    kioskService.setCustomerPhoto('data:image/jpeg;base64,/9j/photo', new Blob([], { type: 'image/jpeg' }));
    kioskService.setTryOnResult({
      job_id: 'job_test_001',
      status: 'completed',
      provider: 'mock',
      result_image_url: '/media/results/tryon_test.jpg',
      download_token: 'tok_test_abc',
      qr_download_url: 'http://localhost:8000/api/v1/tryon/download/tok_test_abc',
      processing_time_ms: 1200,
      estimated_cost_usd: 0.0,
    });

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(kioskService.currentStep()).toBe('RESULT');
    expect(compiled.querySelector('.result-garment-showcase')).toBeTruthy();
    expect(compiled.querySelector('.sku-value')?.textContent).toContain('SKU-KAN-001');
    expect(compiled.querySelector('.garment-showcase-title')?.textContent).toContain('காஞ்சிபுரம் தூய பட்டுச் சேலை');
  });

  it('should show captured input photo and generated try-on result in side-by-side compare mode', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    kioskService.setCustomerPhoto('data:image/jpeg;base64,customer_portrait_data', new Blob([], { type: 'image/jpeg' }));
    kioskService.setTryOnResult({
      job_id: 'job_test_002',
      status: 'completed',
      provider: 'mock',
      result_image_url: '/media/results/tryon_result_image.jpg',
      download_token: 'tok_test_xyz',
      qr_download_url: 'http://localhost:8000/api/v1/tryon/download/tok_test_xyz',
      processing_time_ms: 850,
      estimated_cost_usd: 0.0,
    });

    fixture.detectChanges();

    expect(app.resultViewMode()).toBe('compare');
    const compiled = fixture.nativeElement as HTMLElement;
    const comparisonGrid = compiled.querySelector('.comparison-frames-grid');
    expect(comparisonGrid).toBeTruthy();

    const frames = compiled.querySelectorAll('.comparison-frames-grid .photo-frame');
    expect(frames.length).toBe(2);

    const originalImg = compiled.querySelector('.original-frame img') as HTMLImageElement;
    expect(originalImg.src).toContain('customer_portrait_data');

    const resultImg = compiled.querySelector('.result-frame img') as HTMLImageElement;
    expect(resultImg.src).toContain('tryon_result_image.jpg');
  });

  it('should allow switching result view mode between compare, result, and original', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    kioskService.setStep('RESULT');
    expect(app.resultViewMode()).toBe('compare');

    app.setResultViewMode('result');
    expect(app.resultViewMode()).toBe('result');

    app.setResultViewMode('original');
    expect(app.resultViewMode()).toBe('original');

    app.setResultViewMode('compare');
    expect(app.resultViewMode()).toBe('compare');
  });

  it('should navigate back to CAMERA when Retake Photo is triggered', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    kioskService.setCustomerPhoto('data:image/jpeg;base64,photo', new Blob([], { type: 'image/jpeg' }));
    kioskService.setTryOnResult({
      job_id: 'job_test_003',
      status: 'completed',
      provider: 'mock',
      result_image_url: '/media/results/preview.jpg',
      download_token: 'tok_123',
      qr_download_url: 'http://localhost:8000/api/v1/tryon/download/tok_123',
      processing_time_ms: 900,
      estimated_cost_usd: 0.0,
    });

    expect(kioskService.currentStep()).toBe('RESULT');

    app.retakePhoto();
    expect(kioskService.currentStep()).toBe('CAMERA');
    expect(kioskService.customerPhotoDataUrl()).toBeNull();
    expect(kioskService.tryOnResult()).toBeNull();
  });

  it('should preserve customer photo and navigate to CATALOGUE when Try Another Garment is triggered', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    const photoData = 'data:image/jpeg;base64,preserved_photo';
    kioskService.setCustomerPhoto(photoData, new Blob([], { type: 'image/jpeg' }));
    kioskService.setStep('RESULT');

    app.tryAnotherSaree();
    expect(kioskService.currentStep()).toBe('CATALOGUE');
    expect(kioskService.customerPhotoDataUrl()).toBe(photoData);
  });

  it('should render the dynamic QR code component with the download URL', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    kioskService.setTryOnResult({
      job_id: 'job_test_qr',
      status: 'completed',
      provider: 'mock',
      result_image_url: '/media/results/styled.jpg',
      download_token: 'tok_unique_qr',
      qr_download_url: 'http://localhost:8000/api/v1/tryon/download/tok_unique_qr',
      processing_time_ms: 1100,
      estimated_cost_usd: 0.0,
    });

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const qrComponent = compiled.querySelector('app-qr-code');
    expect(qrComponent).toBeTruthy();
    expect(compiled.querySelector('.qr-box-card')).toBeTruthy();
    expect(compiled.querySelector('#btn-result-download')).toBeTruthy();
  });

  // =========================================================================
  // CUSTOM PRODUCT PHOTO WORKFLOW & COMBINATION PREVIEW TESTS
  // =========================================================================

  it('should switch between catalog and custom product selection modes', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    expect(app.productSelectionMode()).toBe('catalog');

    app.setProductSelectionMode('custom');
    expect(app.productSelectionMode()).toBe('custom');

    app.setProductSelectionMode('catalog');
    expect(app.productSelectionMode()).toBe('catalog');
  });

  it('should transition to COMBINE step when a catalog saree is selected', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    const testSaree = {
      id: 'sar-002',
      sku: 'SKU-BAN-002',
      name_ta: 'பனாரசி பட்டுச் சேலை',
      name_en: 'Banarasi Brocade Silk Saree',
      category: 'Banarasi Silk',
      price: 24500,
      fabric: 'Pure Silk',
      color: 'Emerald Green',
      pallu_type: 'Floral Brocade',
      primary_image_url: '/static/sarees/banarasi_green.jpg',
      is_active: true,
    };

    app.selectSaree(testSaree);

    expect(kioskService.selectedSaree()).toEqual(testSaree);
    expect(kioskService.currentStep()).toBe('COMBINE');
  });

  it('should reject invalid MIME types during custom product upload', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    const fakePdfFile = new File(['%PDF-1.4'], 'garment.pdf', { type: 'application/pdf' });
    const event = {
      target: {
        files: [fakePdfFile],
        value: 'garment.pdf',
      },
    } as unknown as Event;

    app.onProductFileUpload(event);

    expect(app.productValidationError()).toBeTruthy();
    expect(kioskService.customGarmentBlob()).toBeNull();
  });

  it('should reject oversized files (>10MB) during custom product upload', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    // Create a mock File object with size > 10MB
    const bigFile = new File([''], 'huge_garment.jpg', { type: 'image/jpeg' });
    Object.defineProperty(bigFile, 'size', { value: 11 * 1024 * 1024 });

    const event = {
      target: {
        files: [bigFile],
        value: 'huge_garment.jpg',
      },
    } as unknown as Event;

    app.onProductFileUpload(event);

    expect(app.productValidationError()).toBeTruthy();
    expect(kioskService.customGarmentBlob()).toBeNull();
  });

  it('should allow confirming custom product and proceeding to COMBINE step', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    kioskService.setCustomGarment('data:image/jpeg;base64,custom_garment_sample', new Blob([], { type: 'image/jpeg' }));
    expect(kioskService.customGarmentDataUrl()).toContain('custom_garment_sample');

    app.confirmCustomProductAndProceed();
    expect(kioskService.currentStep()).toBe('COMBINE');
  });

  it('should allow clearing and removing custom garment', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    kioskService.setCustomGarment('data:image/jpeg;base64,sample', new Blob([], { type: 'image/jpeg' }));
    expect(kioskService.customGarmentBlob()).toBeTruthy();

    app.removeCustomGarment();
    expect(kioskService.customGarmentBlob()).toBeNull();
    expect(kioskService.customGarmentDataUrl()).toBeNull();
  });

  it('should allow replacing user photo from COMBINE step', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    kioskService.setStep('COMBINE');
    app.replaceUserPhoto();

    expect(kioskService.currentStep()).toBe('CAMERA');
  });

  it('should allow changing product from COMBINE step', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    kioskService.setStep('COMBINE');
    app.changeProduct();

    expect(kioskService.currentStep()).toBe('CATALOGUE');
  });

  it('should trigger AI generation only upon explicit startAiTryOn() call', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    kioskService.setCustomerPhoto('data:image/jpeg;base64,user_photo', new Blob([], { type: 'image/jpeg' }));
    kioskService.setCustomGarment('data:image/jpeg;base64,garment_photo', new Blob([], { type: 'image/jpeg' }));
    kioskService.setStep('COMBINE');

    // Confirm that entering COMBINE step does NOT automatically trigger PROCESSING
    expect(kioskService.currentStep()).toBe('COMBINE');

    // Trigger explicit generation
    app.startAiTryOn();
    expect(kioskService.currentStep()).toBe('PROCESSING');
  });

  // =========================================================================
  // NEW VOICE SPEC TESTS: ATTRACT MODE, CUSTOMERS TODAY, SETTINGS, PRODUCT MGMT
  // =========================================================================

  it('should activate attract mode and dismiss on user interaction', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    expect(kioskService.isAttractMode()).toBe(false);

    kioskService.isAttractMode.set(true);
    expect(kioskService.isAttractMode()).toBe(true);

    kioskService.dismissAttractMode();
    expect(kioskService.isAttractMode()).toBe(false);
  });

  it('should switch to CUSTOMERS tab and fetch today customers', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    const mockItem = {
      job_id: 'job_c1',
      created_at: new Date().toISOString(),
      customer_photo_url: '/api/v1/tryon/jobs/job_c1/customer-photo',
      result_image_url: '/media/results/res1.jpg',
      product_sku: 'KAN-001',
      product_name: 'Kanchipuram Silk',
      category: 'Bridal Silk',
      price: 18500,
      status: 'completed',
      provider: 'fashn',
      processing_time_ms: 2500,
    };

    vi.spyOn(apiService, 'getTodaysCustomers').mockReturnValue(
      of({
        total_customers_today: 1,
        completed_tryons: 1,
        failed_tryons: 0,
        customers: [mockItem],
      })
    );

    app.setAdminTab('CUSTOMERS');
    expect(app.adminTab()).toBe('CUSTOMERS');
    expect(app.adminCustomers()?.customers.length).toBe(1);
    expect(app.adminCustomers()?.customers[0].job_id).toBe('job_c1');

    // Test preview modal opening and closing
    app.openCustomerPreview(mockItem);
    expect(app.selectedCustomerPreview()).toBeTruthy();
    expect(app.selectedCustomerPreview()?.job_id).toBe('job_c1');

    app.closeCustomerPreview();
    expect(app.selectedCustomerPreview()).toBeNull();
  });

  it('should switch to SETTINGS tab and save AI provider', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    const mockSettings = {
      active_ai_provider: 'mock',
      available_providers: [
        { id: 'mock', name: 'Mock Engine', description: '', is_ready: true, tier: 'free' },
        { id: 'fashn', name: 'FASHN.ai', description: '', is_ready: true, tier: 'pro' },
      ],
      fashn_api_key_masked: '',
      gemini_api_key_masked: '',
      openai_api_key_masked: '',
      photo_retention_minutes: 60,
      idle_attract_timeout_seconds: 15,
      idle_attract_video_url: 'https://www.youtube.com/watch?v=scL_y2_p8c8',
      attract_video_urls: 'https://www.youtube.com/watch?v=scL_y2_p8c8',
      attract_mode_type: 'both' as const,
      idle_attract_enabled: true,
      idle_attract_title: 'Experience Royal Sarees',
      idle_attract_subtitle: 'Touch anywhere to begin',
      kiosk_staff_pin_masked: '••••',
      kiosk_staff_pin: '5521',
      kiosk_staff_session_hours: 24,
      kiosk_admin_pin_masked: '••••••',
      kiosk_admin_pin: '849201',
      custom_ai_prompt_template: '',
    };

    vi.spyOn(apiService, 'getSystemSettings').mockReturnValue(of(mockSettings));
    const updateSpy = vi.spyOn(apiService, 'updateSystemSettings').mockReturnValue(
      of({ ...mockSettings, active_ai_provider: 'fashn' })
    );

    app.setAdminTab('SETTINGS');
    expect(app.adminTab()).toBe('SETTINGS');

    app.updateActiveAIProvider('fashn');
    expect(updateSpy).toHaveBeenCalledWith({ active_ai_provider: 'fashn' });
  });

  it('should open and close Add Product modal', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    expect(app.showAddProductModal()).toBe(false);
    app.openAddProductModal();
    expect(app.showAddProductModal()).toBe(true);

    app.closeAddProductModal();
    expect(app.showAddProductModal()).toBe(false);
  });

  // =========================================================================
  // VOICE SPEC TESTS: STAFF GATE, CROPPER, ATTRACT LOOKBOOK
  // =========================================================================

  it('should support staff PIN input, keypad backspace, and clearing', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.staffPinInput.set('');
    app.enterStaffPinDigit('5');
    app.enterStaffPinDigit('5');
    expect(app.staffPinInput()).toBe('55');

    app.backspaceStaffPinDigit();
    expect(app.staffPinInput()).toBe('5');

    app.enterStaffPinDigit('2');
    app.enterStaffPinDigit('1');
    expect(app.staffPinInput()).toBe('521');

    app.clearStaffPin();
    expect(app.staffPinInput()).toBe('');
  });

  it('should unlock kiosk when valid staff PIN is submitted', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    kioskService.isKioskUnlocked.set(false);
    app.staffPinInput.set('');

    vi.spyOn(apiService, 'verifyStaffKioskPin').mockReturnValue(
      of({
        authenticated: true,
        token: 'mock-staff-token-24h',
        role: 'staff',
        name: 'Showroom Floor Staff',
        expires_in_hours: 24,
      })
    );

    app.enterStaffPinDigit('5');
    app.enterStaffPinDigit('5');
    app.enterStaffPinDigit('2');
    app.enterStaffPinDigit('1');

    expect(kioskService.isKioskUnlocked()).toBe(true);
    expect(app.staffPinError()).toBeNull();

    // Lock kiosk device
    app.lockKioskDevice();
    expect(kioskService.isKioskUnlocked()).toBe(false);
  });

  it('should display error toast on invalid staff PIN verification', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    kioskService.isKioskUnlocked.set(false);
    app.staffPinInput.set('');

    vi.spyOn(apiService, 'verifyStaffKioskPin').mockReturnValue(
      throwError(() => ({ status: 401, error: { detail: 'தவறான ஷோரூம் பின்' } }))
    );

    app.enterStaffPinDigit('0');
    app.enterStaffPinDigit('0');
    app.enterStaffPinDigit('0');
    app.enterStaffPinDigit('0');

    expect(app.staffPinError()).toBeTruthy();
    expect(app.staffPinInput()).toBe('');
  });

  it('should open photo cropper, adjust zoom, and apply crop', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    const samplePhoto = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBD...';
    app.openCropper(samplePhoto, 'customer');

    expect(app.showCropModal()).toBe(true);
    expect(app.rawImageForCrop()).toBe(samplePhoto);
    expect(app.cropSource()).toBe('customer');
    expect(app.cropZoom()).toBe(1.0);

    // Zoom in
    app.adjustCropZoom(0.25);
    expect(app.cropZoom()).toBe(1.25);

    // Reset crop
    app.resetCrop();
    expect(app.cropZoom()).toBe(1.0);
    expect(app.cropPanX()).toBe(0);
    expect(app.cropPanY()).toBe(0);

    // Close cropper without applying
    app.closeCropper();
    expect(app.showCropModal()).toBe(false);
  });

  it('should cycle attract mode video index and rotate display mode', () => {
    kioskService.attractVideoUrls.set([
      'https://www.youtube.com/watch?v=video1',
      'https://www.youtube.com/watch?v=video2',
    ]);
    expect(kioskService.activeVideoIndex()).toBe(0);
    expect(kioskService.attractVideoUrl()).toBe('https://www.youtube.com/watch?v=video1');

    kioskService.nextAttractVideo();
    expect(kioskService.activeVideoIndex()).toBe(1);
    expect(kioskService.attractVideoUrl()).toBe('https://www.youtube.com/watch?v=video2');

    kioskService.nextAttractVideo();
    expect(kioskService.activeVideoIndex()).toBe(0);
    expect(kioskService.attractVideoUrl()).toBe('https://www.youtube.com/watch?v=video1');
  });

  // =========================================================================
  // ERGONOMIC KIOSK REACHABILITY & ADMIN PIN CHANGE TESTS
  // =========================================================================

  it('should toggle ergonomic reach mode and staff keypad height lowering', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    expect(app.isReachModeActive()).toBe(false);
    app.toggleReachMode();
    expect(app.isReachModeActive()).toBe(true);
    app.toggleReachMode();
    expect(app.isReachModeActive()).toBe(false);

    expect(app.isStaffKeypadLowered()).toBe(false);
    app.toggleStaffKeypadLower();
    expect(app.isStaffKeypadLowered()).toBe(true);
    app.toggleStaffKeypadLower();
    expect(app.isStaffKeypadLowered()).toBe(false);
  });

  it('should validate inputs and submit admin PIN change successfully', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    // Empty current PIN validation
    app.currentAdminPinInput.set('');
    app.submitAdminPinChange();
    expect(app.adminPinChangeError()).toBeTruthy();

    // Invalid length new PIN
    app.currentAdminPinInput.set('849201');
    app.newAdminPinInput.set('12');
    app.submitAdminPinChange();
    expect(app.adminPinChangeError()).toBeTruthy();

    // Mismatched confirmation PIN
    app.newAdminPinInput.set('654321');
    app.confirmAdminPinInput.set('999999');
    app.submitAdminPinChange();
    expect(app.adminPinChangeError()).toBeTruthy();

    // Valid PIN change request
    app.confirmAdminPinInput.set('654321');
    const changeSpy = vi.spyOn(apiService, 'changeAdminPin').mockReturnValue(
      of({
        success: true,
        message: 'Admin PIN updated successfully!',
        admin_pin_masked: '••••21',
      })
    );

    app.submitAdminPinChange();
    expect(changeSpy).toHaveBeenCalledWith('849201', '654321');
    expect(app.adminPinChangeStatus()).toBe('Admin PIN updated successfully!');
    expect(app.currentAdminPinInput()).toBe('');
    expect(app.newAdminPinInput()).toBe('');
    expect(app.confirmAdminPinInput()).toBe('');
  });
});

