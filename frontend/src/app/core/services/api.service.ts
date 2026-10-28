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
  // B2B Client Feature Toggles
  feature_tryon_max?: boolean;
  feature_runway_video?: boolean;
  feature_selfie_mode?: boolean;
  feature_privacy_base64?: boolean;
  feature_split_slider?: boolean;
  feature_portrait_916?: boolean;
  fashn_resolution?: string;
  fashn_generation_mode?: string;
  saree_pleat_prompt?: string;
  custom_store_name?: string;
  custom_store_logo_url?: string;
  custom_store_ad_video_url?: string;
}

export interface PublicKioskFeatures {
  tryon_max: boolean;
  runway_video: boolean;
  selfie_mode: boolean;
  privacy_base64: boolean;
  split_slider: boolean;
  portrait_916: boolean;
  active_provider: string;
  custom_store_name?: string;
  custom_store_logo_url?: string;
  custom_store_ad_video_url?: string;
}

export interface ShowroomSettingsItem {
  custom_store_name: string;
  custom_store_tagline: string;
  custom_store_logo_url: string;
  custom_store_ad_video_url: string;
  store_contact_phone: string;
  store_city: string;
  watermark_enabled: boolean;
  watermark_text: string;
  watermark_subtext: string;
  watermark_position: string;
  whatsapp_enabled: boolean;
  whatsapp_provider: string;
  whatsapp_phone_number_id: string;
  whatsapp_business_account_id: string;
  whatsapp_access_token_masked: string;
  whatsapp_template_name: string;
  whatsapp_sales_desk_phone: string;
  counter_token_enabled: boolean;
  counter_auto_notify_sales: boolean;
}

export interface CounterTokenItem {
  id: string;
  token_code: string;
  kiosk_id?: string;
  job_id?: string;
  product_id: string;
  product_name_en: string;
  product_name_ta: string;
  sku: string;
  price: number;
  rack_location: string;
  customer_phone?: string;
  customer_name?: string;
  status: string;
  notes?: string;
  created_at: string;
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
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    return this.http.post(`${this.baseUrl}/auth/logout`, {}, { headers });
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

  // --- Public Kiosk Feature Configuration & Video Motion ---
  getPublicFeatures(): Observable<PublicKioskFeatures> {
    return this.http.get<PublicKioskFeatures>(`${this.baseUrl}/admin/features-public`);
  }

  generateVideoMotion(payload: { job_id?: string; image_url?: string; duration?: number }): Observable<{ status: string; video_url: string; prediction_id: string; duration: number }> {
    return this.http.post<{ status: string; video_url: string; prediction_id: string; duration: number }>(`${this.baseUrl}/tryon/video-motion`, payload);
  }

  // --- Dynamic Showroom Branding & WhatsApp Gateway ---
  getShowroomSettings(): Observable<ShowroomSettingsItem> {
    return this.http.get<ShowroomSettingsItem>(`${this.baseUrl}/admin/showroom/settings`);
  }

  updateShowroomSettings(data: Partial<ShowroomSettingsItem> & { whatsapp_access_token?: string }): Observable<any> {
    return this.http.put(`${this.baseUrl}/admin/showroom/settings`, data);
  }

  testWhatsAppConnection(testPhone: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/whatsapp/test`, { test_phone: testPhone });
  }

  // --- Showroom Floor Counter Slips / POS Tokens ---
  createCounterToken(payload: {
    product_id: string;
    job_id?: string;
    kiosk_id?: string;
    customer_phone?: string;
    customer_name?: string;
    notes?: string;
  }): Observable<{
    success: boolean;
    token_id: string;
    token_code: string;
    product_name_en: string;
    product_name_ta: string;
    sku: string;
    rack_location: string;
    price: number;
    created_at: string;
    status: string;
  }> {
    return this.http.post<any>(`${this.baseUrl}/tryon/counter-token`, payload);
  }

  getCounterTokens(): Observable<CounterTokenItem[]> {
    return this.http.get<CounterTokenItem[]>(`${this.baseUrl}/admin/counter-tokens`);
  }

  updateCounterTokenStatus(tokenId: string, status: string, notes?: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/admin/counter-tokens/${tokenId}`, { status, notes });
  }

  sendTryOnWhatsApp(payload: {
    job_id: string;
    customer_phone: string;
    garment_name?: string;
    jewellery_type?: string;
    lighting_mode?: string;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/tryon/send-whatsapp`, payload);
  }

  // --- Phase 2: Bridal Styling Transformation ---
  applyBridalStyling(payload: {
    job_id: string;
    jewellery_type?: string;
    lighting_preset?: string;
    blouse_tone?: string;
    drape_style?: string;
  }): Observable<{
    status: string;
    job_id: string;
    styled_image_url: string;
    jewellery_applied: string;
    lighting_applied: string;
  }> {
    return this.http.post<any>(`${this.baseUrl}/tryon/apply-styling`, payload);
  }

  // --- Phase 5: Showroom Sales Analytics & Rack Heatmap ---
  getShowroomInsights(): Observable<{
    total_tryons: number;
    total_tokens: number;
    conversion_rate_percent: number;
    rack_heatmap: Array<{
      rack: string;
      tokens: number;
      tryons: number;
      conversion_percent: number;
      revenue_inr: number;
      heat_level: string;
    }>;
    color_trends: Array<{
      color_name: string;
      percentage: number;
      color_hex: string;
    }>;
    restock_alerts: Array<{
      sku: string;
      name: string;
      rack: string;
      tryons_today: number;
      token_demand: number;
      alert_level: string;
      advice: string;
    }>;
  }> {
    return this.http.get<any>(`${this.baseUrl}/admin/analytics/showroom-insights`);
  }

  // --- Phase 5: Couple & Groom Coordinated Drape Lookbook ---
  generateCoupleDrape(payload: {
    job_id: string;
    groom_attire?: string;
    saree_color_hex?: string;
    saree_name?: string;
  }): Observable<{
    success: boolean;
    couple_image_url: string;
    groom_attire: string;
  }> {
    return this.http.post<any>(`${this.baseUrl}/tryon/couple-drape`, payload);
  }

  // --- Phase 3: Family Poll & Opinion Voting Engine ---
  createFamilyPoll(payload: {
    customer_name?: string;
    customer_phone?: string;
    title?: string;
    candidates: Array<{
      job_id: string;
      image_url: string;
      saree_name: string;
      color: string;
      sku: string;
      price: number;
    }>;
  }): Observable<{
    success: boolean;
    poll_id: string;
    poll_code: string;
    poll_url: string;
    share_text: string;
    candidate_count: number;
  }> {
    return this.http.post<any>(`${this.baseUrl}/tryon/family-poll`, payload);
  }

  getFamilyPoll(pollCode: string): Observable<{
    poll_code: string;
    title: string;
    customer_name: string;
    status: string;
    total_votes: number;
    candidates: Array<{
      index: number;
      job_id: string;
      image_url: string;
      saree_name: string;
      color: string;
      sku: string;
      price: number;
      vote_count: number;
      vote_percentage: number;
    }>;
    recent_votes: Array<{
      voter_name: string;
      voter_relation: string;
      candidate_index: number;
      comment?: string;
      created_at: string;
    }>;
  }> {
    return this.http.get<any>(`${this.baseUrl}/tryon/family-poll/${pollCode}`);
  }

  castPollVote(pollCode: string, payload: {
    voter_name: string;
    voter_relation?: string;
    candidate_index: number;
    comment?: string;
  }): Observable<{
    success: boolean;
    message: string;
    candidate_voted: string;
  }> {
    return this.http.post<any>(`${this.baseUrl}/tryon/family-poll/${pollCode}/vote`, payload);
  }

  testPOSSync(test_url?: string): Observable<{
    success: boolean;
    http_status?: number;
    response?: string;
    error?: string;
  }> {
    return this.http.post<any>(`${this.baseUrl}/admin/pos/test-sync`, { test_url });
  }

  // --- B2B SaaS Multi-Tenant Customers & Catalog Ingestion ---
  getSaaSCustomers(): Observable<{
    customers: Array<{
      id: string;
      name: string;
      code: string;
      contact_email: string;
      contact_phone?: string;
      address?: string;
      is_active: boolean;
      plan_tier: string;
      subscription_price_inr: number;
      monthly_token_quota: number;
      tokens_used_this_month: number;
      payment_status: string;
      billing_cycle: string;
      api_key?: string;
      catalog_feed_url?: string;
      last_catalog_sync_at?: string;
      branch_count: number;
      kiosk_count: number;
      manager_count: number;
      created_at: string;
    }>;
    metrics: {
      total_customers: number;
      active_customers: number;
      total_mrr_inr: number;
      total_tokens_consumed_this_month: number;
    };
  }> {
    return this.http.get<any>(`${this.baseUrl}/admin/customers`);
  }

  onboardCustomer(payload: {
    name: string;
    code: string;
    manager_name: string;
    manager_email: string;
    manager_password?: string;
    contact_phone?: string;
    address?: string;
    plan_tier?: string;
    subscription_price_inr?: number;
    monthly_token_quota?: number;
    billing_cycle?: string;
    catalog_feed_url?: string;
  }): Observable<{
    success: boolean;
    shop_id: string;
    name: string;
    api_key: string;
    manager_email: string;
    default_password_generated: boolean;
    message: string;
  }> {
    return this.http.post<any>(`${this.baseUrl}/admin/customers`, payload);
  }

  updateCustomer(shopId: string, payload: any): Observable<{ success: boolean; message: string }> {
    return this.http.patch<any>(`${this.baseUrl}/admin/customers/${shopId}`, payload);
  }

  deleteCustomer(shopId: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<any>(`${this.baseUrl}/admin/customers/${shopId}`);
  }


  syncTenantCatalog(items: any[], apiKey: string): Observable<{
    success: boolean;
    shop_name: string;
    items_received: number;
    created: number;
    updated: number;
    skipped: number;
  }> {
    return this.http.post<any>(`${this.baseUrl}/tenant/catalog/sync`, { items }, {
      headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' }
    });
  }

  importTenantCatalogUrl(feedUrl: string, apiKey: string): Observable<{
    success: boolean;
    shop_name: string;
    items_imported: number;
    feed_url: string;
  }> {
    return this.http.post<any>(`${this.baseUrl}/tenant/catalog/import-url`, { feed_url: feedUrl }, {
      headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' }
    });
  }

  getTenantCatalogSample(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/tenant/catalog/feed-sample`);
  }
}
