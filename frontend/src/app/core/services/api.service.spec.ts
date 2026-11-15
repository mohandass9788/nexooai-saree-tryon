import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ApiService, PublicKioskFeatures, TryOnJobResponse } from './api.service';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [ApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch public kiosk features including single_shot flag', () => {
    const mockFeatures: PublicKioskFeatures = {
      tryon_max: false,
      feature_single_shot_tryon: true,
      runway_video: false,
      selfie_mode: false,
      privacy_base64: false,
      split_slider: true,
      portrait_916: true,
      active_provider: 'gemini_single_shot',
    };

    service.getPublicFeatures().subscribe((res) => {
      expect(res).toEqual(mockFeatures);
      expect(res.feature_single_shot_tryon).toBe(true);
    });

    const req = httpMock.expectOne(`${service.baseUrl}/admin/features-public`);
    expect(req.request.method).toBe('GET');
    req.flush(mockFeatures);
  });

  it('should submit single-shot try-on with multipart/form-data', () => {
    const photoBlob = new Blob(['sample-photo-data'], { type: 'image/jpeg' });
    const mockResponse: TryOnJobResponse = {
      job_id: 'single_job_999',
      status: 'completed',
      provider: 'gemini_single_shot',
      result_image_url: 'https://tryon.nexooai.in/media/results/out.jpg',
      qr_download_url: 'https://tryon.nexooai.in/api/v1/tryon/download/tok_abc',
      download_token: 'tok_abc',
      processing_time_ms: 1200,
      estimated_cost_usd: 0.0,
    };

    service
      .submitSingleShotTryOn(photoBlob, true, 'ta', 'kiosk_main', 'shop_1')
      .subscribe((res) => {
        expect(res.job_id).toBe('single_job_999');
        expect(res.provider).toBe('gemini_single_shot');
      });

    const req = httpMock.expectOne(`${service.baseUrl}/tryon/single-shot`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);

    const formData = req.request.body as FormData;
    expect(formData.get('consent_confirmed')).toBe('true');
    expect(formData.get('language')).toBe('ta');
    expect(formData.get('kiosk_id')).toBe('kiosk_main');
    expect(formData.get('shop_id')).toBe('shop_1');

    req.flush(mockResponse);
  });

  it('should call validateGarment endpoint and parse response', () => {
    const garmentBlob = new Blob(['garment-image-bytes'], { type: 'image/jpeg' });
    const mockValidation = {
      is_valid: true,
      garment_score: 0.95,
      category: 'saree',
      guidance_message_ta: 'சேலை வெற்றிகரமாக சரிபார்க்கப்பட்டது.',
      guidance_message_en: 'Saree successfully verified.',
      green_tick: true,
    };

    service.validateGarment(garmentBlob).subscribe((res) => {
      expect(res.is_valid).toBe(true);
      expect(res.green_tick).toBe(true);
      expect(res.garment_score).toBe(0.95);
    });

    const req = httpMock.expectOne(`${service.baseUrl}/tryon/validate-garment`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    req.flush(mockValidation);
  });

  it('should call validateCustomerPose endpoint and handle green tick response', () => {
    const personBlob = new Blob(['person-bytes'], { type: 'image/jpeg' });
    const mockPose = {
      is_valid: true,
      pose_score: 0.92,
      view_type: 'front',
      green_tick: true,
      guidance_message_ta: 'தோரணை சரியானது',
      guidance_message_en: 'Pose is clear and centered',
    };

    service.validateCustomerPose(personBlob).subscribe((res) => {
      expect(res.is_valid).toBe(true);
      expect(res.green_tick).toBe(true);
    });

    const req = httpMock.expectOne(`${service.baseUrl}/tryon/validate-pose`);
    expect(req.request.method).toBe('POST');
    req.flush(mockPose);
  });
});
