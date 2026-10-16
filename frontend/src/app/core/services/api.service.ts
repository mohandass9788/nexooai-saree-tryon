import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface SareeItem {
  id: string;
  sku: string;
  name_en: string;
  name_ta: string;
  category: string;
  fabric: string;
  color: string;
  price: number;
  description_en?: string;
  description_ta?: string;
  primary_image_url: string;
  pallu_type?: string;
  is_active: boolean;
}

export interface CatalogResponse {
  items: SareeItem[];
  total: number;
  page: number;
  pages: number;
}

export interface CategoryItem {
  id: string;
  name_en: string;
  name_ta: string;
  slug: string;
  display_order: number;
  is_active: boolean;
}

export interface CategoryListResponse {
  categories: CategoryItem[];
  total: number;
}

export interface TryOnJobResponse {
  job_id: string;
  status: string;
  provider: string;
  result_image_url?: string;
  download_token?: string;
  qr_download_url?: string;
  processing_time_ms: number;
  estimated_cost_usd: number;
  error_code?: string;
  error_message?: string;
}

export interface DashboardMetrics {
  total_tryons_today: number;
  success_rate_percent: number;
  active_catalog_count: number;
  active_kiosks: number;
  estimated_cost_usd_today: number;
  average_latency_ms: number;
}

export interface JobMonitoringItem {
  job_id: string;
  saree_sku: string;
  saree_name: string;
  status: string;
  created_at: string;
  processing_time_ms: number;
  estimated_cost_usd: number;
  error_code?: string;
  retry_count: number;
}

export interface CustomerHistoryItem {
  job_id: string;
  created_at: string;
  customer_photo_url: string;
  result_image_url: string;
  product_sku: string;
  product_name: string;
  category: string;
  price: number;
  status: string;
  provider: string;
  processing_time_ms: number;
  expires_at?: string;
}

export interface CustomerTodayResponse {
  total_customers_today: number;
  completed_tryons: number;
  failed_tryons: number;
  customers: CustomerHistoryItem[];
}

export interface AIProviderOption {
  id: string;
  name: string;
  description: string;
  is_ready: boolean;
  tier: string;
}

export interface LookbookFeedItem {
  job_id: string;
  created_at: string;
  saree_name_en: string;
  saree_name_ta: string;
  category: string;
  price: number;
  result_image_url: string;
}

export interface AdminUserItem {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface AdminLoginResponse {
  authenticated: boolean;
  token: string;
  role: string;
  name: string;
  email: string;
  user_id: string;
  expires_in_seconds: number;
}

export interface SystemSettingsDTO {
  active_ai_provider: string;
  available_providers: AIProviderOption[];
  fashn_api_key_masked: string;
  gemini_api_key_masked: string;
  openai_api_key_masked: string;
  photo_retention_minutes: number;
  idle_attract_timeout_seconds: number;
  idle_attract_video_url: string;
  attract_video_urls: string;
  attract_mode_type: string;
  idle_attract_enabled: boolean;
  idle_attract_title: string;
  idle_attract_subtitle: string;
  kiosk_staff_pin_masked: string;
  kiosk_staff_pin: string;
  kiosk_staff_session_hours: number;
  kiosk_admin_pin_masked: string;
  kiosk_admin_pin: string;
  custom_ai_prompt_template: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly http = inject(HttpClient);

  /**
   * Dynamically resolves the API host.
   * - When accessing Angular dev server on port 4200 (e.g. http://localhost:4200 or http://192.168.1.100:4200),
   *   routes to port 8000 on the same machine/host.
   * - In production behind reverse proxy or unified port, matches browser origin.
   */
  get apiHost(): string {
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      const port = window.location.port;
      if (port === '4200') {
        return `${protocol}//${hostname}:8000`;
      }
      return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
    }
    return 'http://127.0.0.1:8000';
  }

  get baseUrl(): string {
    return `${this.apiHost}/api/v1`;
  }

  /**
   * Health check verifying API & Database responsiveness.
   */
  checkHealth(): Observable<{ status: string; version: string; provider: string }> {
    return this.http.get<{ status: string; version: string; provider: string }>(`${this.baseUrl}/health`);
  }

  /**
   * Fetches apparel categories directly from the database.
   */
  getCategories(): Observable<CategoryListResponse> {
    return this.http.get<CategoryListResponse>(`${this.baseUrl}/catalog/categories/list`);
  }

  /**
   * Fetches real apparel catalogue items directly from the backend API.
   * Strips any mock fallback; failures are handled authentically by the UI.
   */
  getCatalog(category?: string, search?: string): Observable<CatalogResponse> {
    let url = `${this.baseUrl}/catalog`;
    const params: string[] = [];
    if (category && category !== 'all') params.push(`category=${encodeURIComponent(category)}`);
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    return this.http.get<CatalogResponse>(url).pipe(
      map(res => ({
        ...res,
        items: res.items.map(item => ({
          ...item,
          primary_image_url: item.primary_image_url && item.primary_image_url.startsWith('http')
            ? item.primary_image_url
            : `${this.apiHost}${item.primary_image_url}`
        }))
      }))
    );
  }

  /**
   * Submits Customer Photo & Garment for AI Try-On.
   * Persists job, customer photo, and result in the backend storage & SQLite database.
   */
  submitTryOn(
    personBlob: Blob,
    sareeId: string,
    consent: boolean,
    language: string,
    garmentBlob?: Blob | null
  ): Observable<TryOnJobResponse> {
    const formData = new FormData();
    formData.append('person_image', personBlob, 'customer_photo.jpg');
    formData.append('saree_id', sareeId);
    formData.append('consent_confirmed', String(consent));
    formData.append('language', language);
    if (garmentBlob) {
      formData.append('garment_image', garmentBlob, 'garment_photo.jpg');
    }

    return this.http.post<TryOnJobResponse>(`${this.baseUrl}/tryon`, formData).pipe(
      map(res => ({
        ...res,
        result_image_url: res.result_image_url && res.result_image_url.startsWith('http')
          ? res.result_image_url
          : (res.result_image_url ? `${this.apiHost}${res.result_image_url}` : ''),
        qr_download_url: res.qr_download_url && res.qr_download_url.startsWith('http')
          ? res.qr_download_url
          : (res.qr_download_url ? `${this.apiHost}${res.qr_download_url}` : ''),
      }))
    );
  }

  /**
   * Calls Gemini Pose Guard via Backend API to validate customer pose quality.
   */
  validateCustomerPose(personBlob: Blob): Observable<{
    is_valid: boolean;
    pose_score: number;
    view_type: string;
    guidance_message_ta: string;
    guidance_message_en: string;
    green_tick: boolean;
  }> {
    const formData = new FormData();
    formData.append('person_image', personBlob, 'pose_frame.jpg');
    return this.http.post<any>(`${this.baseUrl}/tryon/validate-pose`, formData);
  }

  // --- Admin Dashboard Methods (100% DB-driven) ---
  getAdminMetrics(): Observable<DashboardMetrics> {
    return this.http.get<DashboardMetrics>(`${this.baseUrl}/admin/metrics`);
  }

  getAdminProducts(): Observable<SareeItem[]> {
    return this.http.get<SareeItem[]>(`${this.baseUrl}/admin/products`).pipe(
      map(items => items.map(item => ({
        ...item,
        primary_image_url: item.primary_image_url && item.primary_image_url.startsWith('http')
          ? item.primary_image_url
          : `${this.apiHost}${item.primary_image_url}`
      })))
    );
  }

  toggleProductStatus(sareeId: string, isActive: boolean): Observable<SareeItem> {
    return this.http.put<SareeItem>(
      `${this.baseUrl}/admin/products/${sareeId}/status?is_active=${isActive}`,
      {}
    );
  }

  createProduct(product: Partial<SareeItem>): Observable<SareeItem> {
    return this.http.post<SareeItem>(`${this.baseUrl}/admin/products`, product);
  }

  getAdminJobs(): Observable<JobMonitoringItem[]> {
    return this.http.get<JobMonitoringItem[]>(`${this.baseUrl}/admin/jobs`);
  }

  retryFailedJob(jobId: string): Observable<JobMonitoringItem> {
    return this.http.post<JobMonitoringItem>(`${this.baseUrl}/admin/jobs/${jobId}/retry`, {});
  }

  verifyKioskPin(pin: string, kioskId: string = 'KIOSK-TN-CHN-01'): Observable<{
    authenticated: boolean;
    token: string;
    role: string;
    name: string;
    expires_in_seconds: number;
  }> {
    return this.http.post<{
      authenticated: boolean;
      token: string;
      role: string;
      name: string;
      expires_in_seconds: number;
    }>(`${this.baseUrl}/auth/kiosk-pin-verify`, { pin, kiosk_id: kioskId });
  }

  logoutAdmin(token?: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/logout?token=${token || ''}`, {});
  }

  // --- Today's Customers & Photos (100% DB-driven) ---
  getTodaysCustomers(): Observable<CustomerTodayResponse> {
    return this.http.get<CustomerTodayResponse>(`${this.baseUrl}/admin/customers/today`).pipe(
      map(res => ({
        ...res,
        customers: res.customers.map(c => ({
          ...c,
          customer_photo_url: c.customer_photo_url && c.customer_photo_url.startsWith('http')
            ? c.customer_photo_url
            : `${this.apiHost}${c.customer_photo_url}`,
          result_image_url: c.result_image_url && c.result_image_url.startsWith('http')
            ? c.result_image_url
            : `${this.apiHost}${c.result_image_url}`,
        }))
      }))
    );
  }

  deleteCustomerRecord(jobId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/admin/customers/${jobId}`);
  }

  purgeExpiredCustomerPhotos(): Observable<{ message: string; purged_media_files: number }> {
    return this.http.post<{ message: string; purged_media_files: number }>(
      `${this.baseUrl}/admin/customers/purge-expired`,
      {}
    );
  }

  // --- AI Provider & System Settings ---
  getSystemSettings(): Observable<SystemSettingsDTO> {
    return this.http.get<SystemSettingsDTO>(`${this.baseUrl}/admin/settings`);
  }

  updateSystemSettings(payload: any): Observable<SystemSettingsDTO> {
    return this.http.post<SystemSettingsDTO>(`${this.baseUrl}/admin/settings`, payload);
  }

  testAIProvider(provider: string, apiKey?: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.baseUrl}/admin/settings/test-provider`,
      { provider, api_key: apiKey }
    );
  }

  // --- Product Management ---
  uploadProductImage(file: File): Observable<{ image_url: string }> {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post<{ image_url: string }>(`${this.baseUrl}/admin/products/upload-image`, formData);
  }

  deleteProduct(sareeId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/admin/products/${sareeId}`);
  }

  clearCatalog(): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/catalog/clear`, {});
  }

  // --- Showroom Staff Kiosk Gate & Lookbook Feed ---
  verifyStaffKioskPin(pin: string, deviceId: string = 'KIOSK-01'): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/auth/staff-kiosk-verify`, { pin, device_id: deviceId });
  }

  getTodayLookbookFeed(): Observable<LookbookFeedItem[]> {
    return this.http.get<LookbookFeedItem[]>(`${this.baseUrl}/tryon/today-feed`);
  }

  changeAdminPin(currentPin: string, newPin: string): Observable<{ success: boolean; message: string; admin_pin_masked: string }> {
    return this.http.post<{ success: boolean; message: string; admin_pin_masked: string }>(
      `${this.baseUrl}/auth/change-admin-pin`,
      { current_pin: currentPin, new_pin: newPin }
    );
  }

  // --- Staff & Admin Role-Based Access Control (RBAC) ---
  adminLogin(email: string, password: string): Observable<AdminLoginResponse> {
    return this.http.post<AdminLoginResponse>(`${this.baseUrl}/auth/login`, { email, password });
  }

  getAdminUsers(): Observable<AdminUserItem[]> {
    return this.http.get<AdminUserItem[]>(`${this.baseUrl}/admin/users`);
  }

  createAdminUser(data: { email: string; name: string; password: string; role: string }): Observable<AdminUserItem> {
    return this.http.post<AdminUserItem>(`${this.baseUrl}/admin/users`, data);
  }

  updateAdminUser(userId: string, data: any): Observable<AdminUserItem> {
    return this.http.put<AdminUserItem>(`${this.baseUrl}/admin/users/${userId}`, data);
  }

  deleteAdminUser(userId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/admin/users/${userId}`);
  }
}
