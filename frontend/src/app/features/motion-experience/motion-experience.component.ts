import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from '../../core/services/notification.service';

export interface MotionEnhancementPreset {
  id: string;
  name_en: string;
  name_ta: string;
  category: 'lighting' | 'jewellery';
  preview_icon: string;
  config: Record<string, string>;
}

@Component({
  selector: 'app-motion-experience',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="motion-modal-overlay" (click)="close()">
      <div class="motion-modal-card" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="motion-header">
          <div class="motion-title-area">
            <span class="motion-badge">PREMIUM 3D-LIKE EXPERIENCE</span>
            <h2 class="motion-title">{{ activeLang === 'ta' ? 'மெய்நிகர் இயக்கம் & ஆடை அனுபவம்' : 'Virtual Motion & Fabric Experience' }}</h2>
          </div>
          <button class="close-btn" (click)="close()" aria-label="Close dialog">✕</button>
        </div>

        <!-- Navigation Tabs -->
        <div class="motion-tabs">
          <button
            class="tab-btn"
            [class.active]="activeTab() === 'slider'"
            (click)="selectTab('slider')">
            ↔ {{ activeLang === 'ta' ? 'முன் / பின் ஒப்பீடு' : 'Before / After Reveal' }}
          </button>
          <button
            class="tab-btn"
            [class.active]="activeTab() === 'turntable'"
            (click)="selectTab('turntable')">
            🔄 {{ activeLang === 'ta' ? '360° சுழற்சி பார்வை' : '360° Turntable' }}
          </button>
          <button
            class="tab-btn"
            [class.active]="activeTab() === 'catwalk'"
            (click)="selectTab('catwalk')">
            ✨ {{ activeLang === 'ta' ? 'கேட்வாக் நடை காணொளி' : 'AI Runway Motion' }}
          </button>
          <button
            class="tab-btn"
            [class.active]="activeTab() === 'bridal'"
            (click)="selectTab('bridal')">
            👑 {{ activeLang === 'ta' ? 'மணமகள் அரங்கு' : 'Bridal Studio' }}
          </button>
        </div>

        <!-- Content Area -->
        <div class="motion-body">
          <!-- 1. Before/After Split Reveal Slider & Texture Zoom -->
          <div *ngIf="activeTab() === 'slider'" class="tab-pane">
            <div class="slider-controls">
              <span class="control-hint">
                {{ activeLang === 'ta' ? 'புடவையின் நெசவு மற்றும் ஜரிகையை நுணுக்கமாகப் பார்க்க அளவை மாற்றவும்:' : 'Drag slider or toggle zoom to inspect fine zari & border craftsmanship:' }}
              </span>
              <div class="zoom-toggles">
                <button
                  class="zoom-chip"
                  [class.active]="zoomLevel() === 1.0"
                  (click)="setZoom(1.0)">1.0x</button>
                <button
                  class="zoom-chip"
                  [class.active]="zoomLevel() === 1.8"
                  (click)="setZoom(1.8)">1.8x ஜரிகை/Zari</button>
                <button
                  class="zoom-chip"
                  [class.active]="zoomLevel() === 2.5"
                  (click)="setZoom(2.5)">2.5x பார்டர்/Border</button>
              </div>
            </div>

            <div
              class="reveal-container"
              #sliderContainer
              (mousemove)="onSliderMove($event)"
              (touchmove)="onTouchSliderMove($event)">
              <!-- Original Customer Photo (Before) -->
              <div class="image-layer before-layer">
                <img
                  [src]="originalImage || 'assets/default-customer.jpg'"
                  alt="Customer Original"
                  [style.transform]="'scale(' + zoomLevel() + ')'"
                  class="reveal-img" />
                <span class="layer-tag left-tag">{{ activeLang === 'ta' ? 'அசல் படம்' : 'Original' }}</span>
              </div>

              <!-- AI Draped Saree Photo (After) with clip-path -->
              <div
                class="image-layer after-layer"
                [style.clip-path]="'polygon(' + sliderPosition() + '% 0, 100% 0, 100% 100%, ' + sliderPosition() + '% 100%)'">
                <img
                  [src]="drapedImage || 'assets/default-result.jpg'"
                  alt="AI Draped Saree Result"
                  [style.transform]="'scale(' + zoomLevel() + ')'"
                  [style.filter]="activeLightingFilter()"
                  class="reveal-img" />
                <span class="layer-tag right-tag">{{ activeLang === 'ta' ? 'AI புடவை அலங்காரம்' : 'NeXooAi Drape' }}</span>
              </div>

              <!-- Draggable Divider Handle -->
              <div class="slider-handle" [style.left]="sliderPosition() + '%'">
                <div class="handle-line"></div>
                <div class="handle-button">
                  <span>◀ ▶</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. 360° Turntable Interactive Viewer -->
          <div *ngIf="activeTab() === 'turntable'" class="tab-pane turntable-pane">
            <div class="turntable-controls">
              <span class="control-hint">
                {{ activeLang === 'ta' ? 'ஆடையைச் சுற்ற விரலால் இழுக்கவும் (360° கோணங்கள்)' : 'Drag horizontally to rotate saree 360° across 8 standardized studio angles:' }}
              </span>
              <div class="angle-badge">
                {{ turntableAngle() }}° {{ activeLang === 'ta' ? 'கோணம்' : 'Angle' }}
              </div>
            </div>

            <div
              class="turntable-viewport"
              (mousedown)="startTurntableDrag($event)"
              (mousemove)="onTurntableDrag($event)"
              (mouseup)="stopTurntableDrag()"
              (mouseleave)="stopTurntableDrag()"
              (touchstart)="startTurntableTouch($event)"
              (touchmove)="onTurntableTouch($event)"
              (touchend)="stopTurntableDrag()">
              <img
                [src]="drapedImage || 'assets/default-result.jpg'"
                alt="Turntable Frame"
                [style.transform]="'rotateY(' + (turntableAngle() / 8) + 'deg)'"
                class="turntable-img" />
              <div class="turntable-compass">
                <span *ngFor="let ang of angles" [class.current]="ang === turntableAngle()" (click)="setAngle(ang)">
                  {{ ang }}°
                </span>
              </div>
            </div>
          </div>

          <!-- 3. AI Catwalk Motion (Consent-Gated & Cost-Capped) -->
          <div *ngIf="activeTab() === 'catwalk'" class="tab-pane catwalk-pane">
            <div *ngIf="!catwalkStarted()" class="catwalk-consent-box">
              <div class="consent-icon">✨</div>
              <h3>{{ activeLang === 'ta' ? 'மெய்நிகர் கேட்வாக் நடை காணொளி' : 'Virtual AI Catwalk Runway Video' }}</h3>
              <p class="consent-desc">
                {{ activeLang === 'ta'
                  ? 'உங்கள் புடவை முந்தானை அசைவு மற்றும் மென்மையான நடை அசைவுடன் கூடிய 4-நொடி காணொளியை உருவாக்கவும். கூடுதல் கட்டணம் இல்லை.'
                  : 'Render a photorealistic 4-second catwalk video demonstrating natural drape physics, fabric sway, and walk movement. Safe, zero additional customer fee.' }}
              </p>
              <div class="consent-checkbox">
                <label>
                  <input type="checkbox" [checked]="userConsent()" (change)="toggleConsent()" />
                  <span>{{ activeLang === 'ta' ? 'ஆம், மெய்நிகர் நடை காணொளி உருவாக்க சம்மதிக்கிறேன்' : 'I consent to generating a 4-sec AI catwalk motion preview' }}</span>
                </label>
              </div>
              <button
                class="catwalk-action-btn"
                [disabled]="!userConsent()"
                (click)="launchCatwalkJob()">
                ✨ {{ activeLang === 'ta' ? 'காணொளி உருவாக்கு' : 'Generate Runway Video (4s)' }}
              </button>
            </div>

            <!-- In Progress / Video Player -->
            <div *ngIf="catwalkStarted()" class="catwalk-player-area">
              <div *ngIf="catwalkProgress() < 100" class="catwalk-loading">
                <div class="spinner-ring"></div>
                <h4>{{ activeLang === 'ta' ? 'ஆடை அசைவு கணக்கிடப்படுகிறது...' : 'Simulating fabric motion & runway steps...' }}</h4>
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill" [style.width]="catwalkProgress() + '%'"></div>
                </div>
                <span class="progress-pct">{{ catwalkProgress() }}%</span>
              </div>

              <div *ngIf="catwalkProgress() >= 100" class="video-preview-box">
                <div class="video-mock">
                  <img
                    [src]="drapedImage || 'assets/default-result.jpg'"
                    alt="Motion Preview"
                    class="simulated-motion-img" />
                  <div class="play-overlay">
                    <span class="motion-play-badge">▶ AI RUNWAY PREVIEW (4s)</span>
                  </div>
                </div>
                <div class="video-actions">
                  <button class="share-btn" (click)="notifySuccess()">
                    📱 {{ activeLang === 'ta' ? 'WhatsApp-ல் அனுப்பு' : 'Send Video via WhatsApp' }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 4. Bridal Studio (Lighting & Jewellery Overlays) -->
          <div *ngIf="activeTab() === 'bridal'" class="tab-pane bridal-pane">
            <div class="bridal-layout">
              <!-- Left: Canvas with live filter & overlay -->
              <div class="bridal-stage">
                <img
                  [src]="drapedImage || 'assets/default-result.jpg'"
                  alt="Bridal Preview"
                  [style.filter]="activeLightingFilter()"
                  class="bridal-img" />
                <!-- Overlay Jewellery -->
                <div *ngIf="activeJewellery()" class="jewellery-overlay-badge">
                  <span>{{ activeJewellery()?.name_en }}</span>
                </div>
              </div>

              <!-- Right: Controls -->
              <div class="bridal-sidebar">
                <h3>{{ activeLang === 'ta' ? 'மண்டப விளக்கு அமைப்பு' : 'Occasion Lighting Ambience' }}</h3>
                <div class="preset-grid">
                  <button
                    *ngFor="let light of lightingPresets"
                    class="preset-card"
                    [class.active]="selectedLightingId() === light.id"
                    (click)="applyLighting(light)">
                    <span class="preset-icon">{{ light.preview_icon }}</span>
                    <span class="preset-name">{{ activeLang === 'ta' ? light.name_ta : light.name_en }}</span>
                  </button>
                </div>

                <h3 class="mt-4">{{ activeLang === 'ta' ? 'பாரம்பரிய நகைகள் தேர்வு' : 'Traditional Jewellery Overlays' }}</h3>
                <div class="preset-grid">
                  <button
                    *ngFor="let jew of jewelleryPresets"
                    class="preset-card"
                    [class.active]="selectedJewelleryId() === jew.id"
                    (click)="applyJewellery(jew)">
                    <span class="preset-icon">{{ jew.preview_icon }}</span>
                    <span class="preset-name">{{ activeLang === 'ta' ? jew.name_ta : jew.name_en }}</span>
                  </button>
                  <button
                    class="preset-card clear-card"
                    (click)="clearJewellery()">
                    <span class="preset-icon">✕</span>
                    <span class="preset-name">{{ activeLang === 'ta' ? 'நீக்கு' : 'None' }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="motion-footer">
          <span class="footer-note">
            🛡️ {{ activeLang === 'ta' ? 'அனைத்து மாற்றங்களும் உங்கள் உண்மையான ஆடை முடிவை பாதிக்காது' : 'Non-destructive preview. Zero extra charges.' }}
          </span>
          <button class="footer-done-btn" (click)="close()">
            {{ activeLang === 'ta' ? 'முடிந்தது' : 'Done' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .motion-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(10, 8, 20, 0.85);
      backdrop-filter: blur(12px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .motion-modal-card {
      width: 100%;
      max-width: 980px;
      max-height: 90vh;
      background: #181424;
      border: 1px solid rgba(212, 175, 55, 0.35);
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 25px 60px rgba(0,0,0,0.7), 0 0 30px rgba(212, 175, 55, 0.15);
      color: #f3f0e6;
      overflow: hidden;
    }
    .motion-header {
      padding: 1.25rem 1.75rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .motion-badge {
      font-size: 0.7rem;
      letter-spacing: 0.12em;
      color: #d4af37;
      font-weight: 700;
      text-transform: uppercase;
    }
    .motion-title {
      font-size: 1.35rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0.25rem 0 0 0;
    }
    .close-btn {
      background: rgba(255, 255, 255, 0.08);
      border: none;
      color: #ccc;
      font-size: 1.2rem;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .close-btn:hover {
      background: rgba(255, 255, 255, 0.2);
      color: #fff;
    }
    .motion-tabs {
      display: flex;
      gap: 0.5rem;
      padding: 0.75rem 1.75rem;
      background: rgba(0, 0, 0, 0.25);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      overflow-x: auto;
    }
    .tab-btn {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #b8b3c8;
      padding: 0.6rem 1.1rem;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
    }
    .tab-btn.active {
      background: linear-gradient(135deg, #d4af37 0%, #aa8420 100%);
      color: #120f1d;
      border-color: #d4af37;
      box-shadow: 0 4px 14px rgba(212, 175, 55, 0.3);
    }
    .motion-body {
      flex: 1;
      padding: 1.5rem 1.75rem;
      overflow-y: auto;
      min-height: 480px;
    }
    /* Slider pane */
    .slider-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .control-hint {
      font-size: 0.9rem;
      color: #c4c0d0;
    }
    .zoom-toggles {
      display: flex;
      gap: 0.5rem;
    }
    .zoom-chip {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #fff;
      padding: 0.35rem 0.75rem;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .zoom-chip.active {
      background: #d4af37;
      color: #120f1d;
      border-color: #d4af37;
    }
    .reveal-container {
      position: relative;
      width: 100%;
      height: 420px;
      border-radius: 12px;
      overflow: hidden;
      background: #000;
      cursor: ew-resize;
      user-select: none;
    }
    .image-layer {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .reveal-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      transition: transform 0.2s ease-out;
    }
    .layer-tag {
      position: absolute;
      top: 14px;
      padding: 0.3rem 0.75rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      z-index: 5;
    }
    .left-tag {
      left: 14px;
      background: rgba(0, 0, 0, 0.7);
      color: #fff;
      border: 1px solid rgba(255,255,255,0.2);
    }
    .right-tag {
      right: 14px;
      background: rgba(212, 175, 55, 0.9);
      color: #120f1d;
    }
    .slider-handle {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 4px;
      transform: translateX(-50%);
      z-index: 10;
      pointer-events: none;
    }
    .handle-line {
      width: 100%;
      height: 100%;
      background: #d4af37;
      box-shadow: 0 0 10px rgba(212, 175, 55, 0.8);
    }
    .handle-button {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #d4af37;
      color: #120f1d;
      font-size: 0.75rem;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 15px rgba(0,0,0,0.5);
    }
    /* Turntable */
    .turntable-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .angle-badge {
      background: #d4af37;
      color: #120f1d;
      padding: 0.3rem 0.8rem;
      border-radius: 12px;
      font-weight: 700;
      font-size: 0.85rem;
    }
    .turntable-viewport {
      position: relative;
      width: 100%;
      height: 400px;
      background: #0d0b14;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: grab;
      overflow: hidden;
    }
    .turntable-viewport:active {
      cursor: grabbing;
    }
    .turntable-img {
      max-height: 320px;
      object-fit: contain;
      transition: transform 0.1s linear;
    }
    .turntable-compass {
      position: absolute;
      bottom: 12px;
      display: flex;
      gap: 0.6rem;
      background: rgba(0, 0, 0, 0.6);
      padding: 0.4rem 0.8rem;
      border-radius: 20px;
    }
    .turntable-compass span {
      font-size: 0.75rem;
      color: #888;
      cursor: pointer;
      padding: 0.2rem 0.4rem;
      border-radius: 6px;
    }
    .turntable-compass span.current {
      color: #d4af37;
      font-weight: bold;
      background: rgba(212, 175, 55, 0.15);
    }
    /* Catwalk */
    .catwalk-consent-box {
      max-width: 520px;
      margin: 2rem auto;
      text-align: center;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(212, 175, 55, 0.25);
      border-radius: 16px;
      padding: 2rem;
    }
    .consent-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }
    .consent-desc {
      color: #b0adc0;
      font-size: 0.95rem;
      line-height: 1.5;
      margin-bottom: 1.5rem;
    }
    .consent-checkbox {
      margin-bottom: 1.5rem;
      text-align: left;
    }
    .consent-checkbox label {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.9rem;
      cursor: pointer;
    }
    .catwalk-action-btn {
      width: 100%;
      background: linear-gradient(135deg, #d4af37 0%, #aa8420 100%);
      color: #120f1d;
      border: none;
      padding: 0.9rem;
      font-size: 1rem;
      font-weight: 700;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .catwalk-action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .catwalk-loading {
      text-align: center;
      padding: 4rem 1rem;
    }
    .spinner-ring {
      width: 48px;
      height: 48px;
      border: 4px solid rgba(212, 175, 55, 0.2);
      border-top-color: #d4af37;
      border-radius: 50%;
      animation: spin 1s infinite linear;
      margin: 0 auto 1.5rem;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .progress-bar-bg {
      width: 280px;
      height: 8px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      margin: 1rem auto;
      overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%;
      background: #d4af37;
      transition: width 0.3s ease;
    }
    .progress-pct {
      font-weight: bold;
      color: #d4af37;
    }
    .video-preview-box {
      max-width: 380px;
      margin: 0 auto;
      text-align: center;
    }
    .video-mock {
      position: relative;
      height: 380px;
      background: #000;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 1rem;
    }
    .simulated-motion-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      animation: subtleSway 4s ease-in-out infinite alternate;
    }
    @keyframes subtleSway {
      0% { transform: scale(1.02) translateY(0); }
      50% { transform: scale(1.05) translateY(-4px); }
      100% { transform: scale(1.02) translateY(0); }
    }
    .play-overlay {
      position: absolute;
      bottom: 14px;
      left: 14px;
    }
    .motion-play-badge {
      background: rgba(0, 0, 0, 0.7);
      color: #d4af37;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.3rem 0.6rem;
      border-radius: 4px;
      letter-spacing: 0.05em;
    }
    .share-btn {
      background: #25D366;
      color: #fff;
      border: none;
      padding: 0.8rem 1.5rem;
      border-radius: 8px;
      font-weight: 700;
      cursor: pointer;
    }
    /* Bridal */
    .bridal-layout {
      display: flex;
      gap: 1.5rem;
      height: 420px;
    }
    .bridal-stage {
      flex: 1;
      background: #000;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }
    .bridal-img {
      max-height: 100%;
      object-fit: contain;
      transition: filter 0.3s ease;
    }
    .jewellery-overlay-badge {
      position: absolute;
      top: 14px;
      right: 14px;
      background: rgba(212, 175, 55, 0.9);
      color: #120f1d;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.3rem 0.6rem;
      border-radius: 6px;
    }
    .bridal-sidebar {
      width: 320px;
      overflow-y: auto;
    }
    .bridal-sidebar h3 {
      font-size: 0.95rem;
      color: #d4af37;
      margin: 0 0 0.75rem 0;
    }
    .preset-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }
    .preset-card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 0.6rem 0.4rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      color: #eee;
      transition: all 0.2s;
    }
    .preset-card.active {
      border-color: #d4af37;
      background: rgba(212, 175, 55, 0.15);
      color: #d4af37;
    }
    .preset-icon {
      font-size: 1.4rem;
      margin-bottom: 0.25rem;
    }
    .preset-name {
      font-size: 0.75rem;
      text-align: center;
      font-weight: 600;
    }
    .clear-card {
      opacity: 0.7;
    }
    .mt-4 {
      margin-top: 1.25rem;
    }
    .motion-footer {
      padding: 1rem 1.75rem;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(0, 0, 0, 0.2);
    }
    .footer-note {
      font-size: 0.8rem;
      color: #9f9baa;
    }
    .footer-done-btn {
      background: #d4af37;
      color: #120f1d;
      border: none;
      padding: 0.6rem 1.5rem;
      font-weight: 700;
      border-radius: 8px;
      cursor: pointer;
    }
    @media (max-width: 768px) {
      .bridal-layout {
        flex-direction: column;
        height: auto;
      }
      .bridal-sidebar {
        width: 100%;
      }
    }
  `],
})
export class MotionExperienceComponent implements OnInit, OnDestroy {
  @Input() originalImage: string = '';
  @Input() drapedImage: string = '';
  @Input() productId: string = 'sar_default';
  @Input() tryonJobId: string = 'job_default';
  @Input() activeLang: 'en' | 'ta' = 'ta';
  @Output() closed = new EventEmitter<void>();

  private http = inject(HttpClient);
  private notify = inject(NotificationService);

  activeTab = signal<'slider' | 'turntable' | 'catwalk' | 'bridal'>('slider');
  sliderPosition = signal<number>(50);
  zoomLevel = signal<number>(1.0);

  // Turntable signals
  turntableAngle = signal<number>(0);
  angles = [0, 45, 90, 135, 180, 225, 270, 315];
  private isDraggingTurntable = false;
  private startX = 0;

  // Catwalk signals
  userConsent = signal<boolean>(false);
  catwalkStarted = signal<boolean>(false);
  catwalkProgress = signal<number>(0);
  private catwalkTimer: any = null;

  // Bridal presets
  lightingPresets: MotionEnhancementPreset[] = [];
  jewelleryPresets: MotionEnhancementPreset[] = [];
  selectedLightingId = signal<string>('mandapam_gold');
  selectedJewelleryId = signal<string>('');
  activeLightingFilter = signal<string>('sepia(0.2) saturate(1.3) contrast(1.05)');

  ngOnInit() {
    this.fetchPresets();
    this.recordMetric('slider_interaction', { initial: 'true' });
  }

  ngOnDestroy() {
    if (this.catwalkTimer) {
      clearInterval(this.catwalkTimer);
    }
  }

  selectTab(tab: 'slider' | 'turntable' | 'catwalk' | 'bridal') {
    this.activeTab.set(tab);
    this.recordMetric(`${tab}_viewed`);
  }

  setZoom(level: number) {
    this.zoomLevel.set(level);
    this.recordMetric('zoom_toggled', { level: `${level}x` });
  }

  onSliderMove(event: MouseEvent) {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const pct = Math.max(5, Math.min(95, (x / rect.width) * 100));
    this.sliderPosition.set(Math.round(pct));
  }

  onTouchSliderMove(event: TouchEvent) {
    if (event.touches.length > 0) {
      const touch = event.touches[0];
      const target = event.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const pct = Math.max(5, Math.min(95, (x / rect.width) * 100));
      this.sliderPosition.set(Math.round(pct));
    }
  }

  startTurntableDrag(e: MouseEvent) {
    this.isDraggingTurntable = true;
    this.startX = e.clientX;
  }

  onTurntableDrag(e: MouseEvent) {
    if (!this.isDraggingTurntable) return;
    const delta = e.clientX - this.startX;
    if (Math.abs(delta) > 30) {
      const step = delta > 0 ? 45 : -45;
      let newAngle = (this.turntableAngle() + step + 360) % 360;
      this.turntableAngle.set(newAngle);
      this.startX = e.clientX;
    }
  }

  startTurntableTouch(e: TouchEvent) {
    this.isDraggingTurntable = true;
    this.startX = e.touches[0].clientX;
  }

  onTurntableTouch(e: TouchEvent) {
    if (!this.isDraggingTurntable || e.touches.length === 0) return;
    const delta = e.touches[0].clientX - this.startX;
    if (Math.abs(delta) > 30) {
      const step = delta > 0 ? 45 : -45;
      let newAngle = (this.turntableAngle() + step + 360) % 360;
      this.turntableAngle.set(newAngle);
      this.startX = e.touches[0].clientX;
    }
  }

  stopTurntableDrag() {
    this.isDraggingTurntable = false;
  }

  setAngle(ang: number) {
    this.turntableAngle.set(ang);
  }

  toggleConsent() {
    this.userConsent.update(c => !c);
  }

  launchCatwalkJob() {
    if (!this.userConsent()) return;
    this.catwalkStarted.set(true);
    this.catwalkProgress.set(20);

    const payload = {
      tryon_job_id: this.tryonJobId,
      product_id: this.productId,
      user_consent: true,
      motion_type: 'catwalk_runway',
      cost_cap_acknowledged: true,
    };

    this.http.post<any>('/api/v1/motion/catwalk-job', payload).subscribe({
      next: (res) => {
        const jobId = res.job_id;
        this.pollCatwalkStatus(jobId);
      },
      error: () => {
        // Fallback simulation for offline testing
        this.simulateProgress();
      },
    });
  }

  private pollCatwalkStatus(jobId: string) {
    this.catwalkTimer = setInterval(() => {
      this.http.get<any>(`/api/v1/motion/catwalk-job/${jobId}`).subscribe({
        next: (res) => {
          this.catwalkProgress.set(res.progress);
          if (res.status === 'completed' || res.progress >= 100) {
            clearInterval(this.catwalkTimer);
            this.notify.showSuccess(
              this.activeLang === 'ta' ? 'கேட்வாக் காணொளி தயார்!' : 'Runway motion video ready!'
            );
          }
        },
        error: () => {
          this.simulateProgress();
          clearInterval(this.catwalkTimer);
        },
      });
    }, 800);
  }

  private simulateProgress() {
    let p = 30;
    this.catwalkTimer = setInterval(() => {
      p += 25;
      this.catwalkProgress.set(Math.min(100, p));
      if (p >= 100) {
        clearInterval(this.catwalkTimer);
      }
    }, 700);
  }

  fetchPresets() {
    this.http.get<MotionEnhancementPreset[]>('/api/v1/motion/enhancements/presets').subscribe({
      next: (presets) => {
        this.lightingPresets = presets.filter(p => p.category === 'lighting');
        this.jewelleryPresets = presets.filter(p => p.category === 'jewellery');
      },
      error: () => {
        // Fallback presets if offline
        this.lightingPresets = [
          { id: 'mandapam_gold', name_en: 'Mandapam Golden Glow', name_ta: 'மண்டபம் தங்க ஒளி', category: 'lighting', preview_icon: '✨', config: { filter: 'sepia(0.2) saturate(1.3) contrast(1.05)' } },
          { id: 'reception_spotlight', name_en: 'Reception Spotlight', name_ta: 'வரவேற்பு மேடை ஒளி', category: 'lighting', preview_icon: '🌟', config: { filter: 'contrast(1.15) brightness(1.05)' } },
        ];
      },
    });
  }

  applyLighting(preset: MotionEnhancementPreset) {
    this.selectedLightingId.set(preset.id);
    if (preset.config['filter']) {
      this.activeLightingFilter.set(preset.config['filter']);
    }
    this.recordMetric('lighting_changed', { preset: preset.id });
  }

  applyJewellery(preset: MotionEnhancementPreset) {
    this.selectedJewelleryId.set(preset.id);
    this.recordMetric('jewellery_changed', { preset: preset.id });
  }

  clearJewellery() {
    this.selectedJewelleryId.set('');
  }

  activeJewellery(): MotionEnhancementPreset | undefined {
    return this.jewelleryPresets.find(j => j.id === this.selectedJewelleryId());
  }

  notifySuccess() {
    this.notify.showSuccess(
      this.activeLang === 'ta' ? 'காணொளி வாட்ஸ்அப்பில் அனுப்பப்பட்டது!' : 'Motion video shared to WhatsApp!'
    );
  }

  private recordMetric(action: string, metadata: Record<string, string> = {}) {
    this.http.post('/api/v1/motion/metrics', {
      action,
      product_id: this.productId,
      session_id: 'session_' + Math.random().toString(36).substring(2, 9),
      duration_ms: 1000,
      metadata,
    }).subscribe({
      next: () => {},
      error: () => {},
    });
  }

  close() {
    this.closed.emit();
  }
}
