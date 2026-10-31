import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  signal,
  NgZone,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { getProject, types } from '@theatre/core';

export interface GarmentFabricTheme {
  name: string;
  category: string;
  labelEn: string;
  labelTa: string;
  primaryColor: number;
  sheenColor: number;
  zariGold: number;
}

@Component({
  selector: 'app-three-saree-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="three-viewer-container" #viewerContainer (mousemove)="onMouseMove($event)">
      <!-- 3D Canvas Target -->
      <canvas #webglCanvas class="webgl-canvas"></canvas>

      <!-- Floating 3D Control HUD -->
      <div class="three-hud-overlay">
        <!-- Top Title Bar -->
        <div class="three-hud-header">
          <div class="hud-badge">
            <span class="hud-pulse-dot"></span>
            <span>THREE.JS + THEATRE.JS 3D SHOWROOM KIOSK</span>
          </div>
          <span class="hud-tech-note">55-Inch Kiosk Hardware • Multi-Garment Physics</span>
        </div>

        <!-- Center Interactive Tooltip (Dismisses on first interaction) -->
        <div class="hud-gesture-hint" [class.hidden]="hasInteracted()">
          <span class="hint-icon">✦</span>
          <span>Rotate 3D Kiosk • Click Outfits & Camera Angles Below</span>
        </div>

        <!-- Bottom Controls Bar -->
        <div class="three-hud-controls">
          <!-- Cinematic Theatre.js Camera Presets -->
          <div class="camera-preset-group">
            <button
              type="button"
              class="btn-hud-preset"
              [class.active]="activePreset() === 'orbit'"
              (click)="playPreset('orbit')"
            >
              <span>🎥</span>
              <span>Kiosk 360°</span>
            </button>

            <button
              type="button"
              class="btn-hud-preset"
              [class.active]="activePreset() === 'macro'"
              (click)="playPreset('macro')"
            >
              <span>🔍</span>
              <span>Zari Macro</span>
            </button>

            <button
              type="button"
              class="btn-hud-preset"
              [class.active]="activePreset() === 'pallu'"
              (click)="playPreset('pallu')"
            >
              <span>✨</span>
              <span>Fluid Drape</span>
            </button>
          </div>

          <!-- Real-Time Multi-Garment Switcher -->
          <div class="fabric-palette-group">
            <span class="palette-label">Garment:</span>
            <div class="palette-swatches">
              @for (theme of fabricThemes; track theme.name) {
                <button
                  type="button"
                  class="swatch-btn"
                  [class.selected]="activeTheme().name === theme.name"
                  [style.background]="getSwatchCss(theme)"
                  [title]="theme.category + ': ' + theme.labelEn + ' (' + theme.labelTa + ')'"
                  (click)="selectTheme(theme)"
                ></button>
              }
            </div>
            <span class="active-garment-name">{{ activeTheme().labelEn }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .three-viewer-container {
        position: relative;
        width: 100%;
        height: 600px;
        min-height: 480px;
        border-radius: 24px;
        overflow: hidden;
        background: radial-gradient(circle at center, #1b0a1d 0%, #070208 100%);
        border: 1.5px solid rgba(212, 175, 55, 0.35);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(212, 175, 55, 0.15);
      }

      .webgl-canvas {
        position: absolute;
        inset: 0;
        width: 100% !important;
        height: 100% !important;
        display: block;
        cursor: grab;
      }

      .webgl-canvas:active {
        cursor: grabbing;
      }

      .three-hud-overlay {
        position: absolute;
        inset: 0;
        pointer-events: none;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 24px 28px;
        box-sizing: border-box;
      }

      .three-hud-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
      }

      .hud-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: rgba(14, 5, 16, 0.85);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(212, 175, 55, 0.45);
        border-radius: 999px;
        padding: 6px 14px;
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.8px;
        color: #ffd700;
      }

      .hud-pulse-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #ffd700;
        box-shadow: 0 0 8px #ffd700;
        animation: pulse 1.8s infinite ease-in-out;
      }

      .hud-tech-note {
        font-size: 0.78rem;
        color: rgba(255, 255, 255, 0.7);
        background: rgba(0, 0, 0, 0.5);
        padding: 5px 12px;
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.08);
      }

      .hud-gesture-hint {
        align-self: center;
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(18, 7, 19, 0.8);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(212, 175, 55, 0.35);
        color: #fff;
        padding: 10px 20px;
        border-radius: 999px;
        font-size: 0.85rem;
        transition: opacity 0.5s ease;
      }

      .hud-gesture-hint.hidden {
        opacity: 0;
        pointer-events: none;
      }

      .hint-icon {
        color: #ffd700;
        font-size: 1rem;
      }

      .three-hud-controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 16px;
        pointer-events: auto;
      }

      .camera-preset-group {
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(14, 5, 16, 0.85);
        backdrop-filter: blur(14px);
        padding: 6px;
        border-radius: 999px;
        border: 1px solid rgba(212, 175, 55, 0.3);
      }

      .btn-hud-preset {
        display: flex;
        align-items: center;
        gap: 6px;
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.75);
        padding: 8px 16px;
        border-radius: 999px;
        font-size: 0.82rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .btn-hud-preset:hover {
        color: #fff;
        background: rgba(212, 175, 55, 0.15);
      }

      .btn-hud-preset.active {
        background: linear-gradient(135deg, #d4af37 0%, #aa7c11 100%);
        color: #120713;
        font-weight: 700;
        box-shadow: 0 2px 10px rgba(212, 175, 55, 0.4);
      }

      .fabric-palette-group {
        display: flex;
        align-items: center;
        gap: 12px;
        background: rgba(14, 5, 16, 0.85);
        backdrop-filter: blur(14px);
        padding: 8px 18px;
        border-radius: 999px;
        border: 1px solid rgba(212, 175, 55, 0.3);
      }

      .palette-label {
        font-size: 0.8rem;
        color: rgba(255, 255, 255, 0.7);
        font-weight: 600;
      }

      .palette-swatches {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .swatch-btn {
        width: 26px;
        height: 26px;
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.4);
        cursor: pointer;
        transition: transform 0.2s ease, border-color 0.2s ease;
        padding: 0;
      }

      .swatch-btn:hover {
        transform: scale(1.15);
        border-color: #fff;
      }

      .swatch-btn.selected {
        transform: scale(1.22);
        border-color: #ffd700;
        box-shadow: 0 0 10px #ffd700;
      }

      .active-garment-name {
        font-size: 0.78rem;
        font-weight: 600;
        color: #ffd700;
        padding-left: 4px;
      }

      @keyframes pulse {
        0% {
          transform: scale(0.9);
          opacity: 0.8;
        }
        50% {
          transform: scale(1.1);
          opacity: 1;
        }
        100% {
          transform: scale(0.9);
          opacity: 0.8;
        }
      }

      @media (max-width: 768px) {
        .three-viewer-container {
          height: 480px;
        }
        .three-hud-controls {
          flex-direction: column;
          align-items: stretch;
        }
        .camera-preset-group,
        .fabric-palette-group {
          justify-content: center;
        }
        .active-garment-name {
          display: none;
        }
      }
    `,
  ],
})
export class ThreeSareeViewerComponent implements OnInit, OnDestroy {
  @ViewChild('viewerContainer', { static: true })
  containerRef!: ElementRef<HTMLDivElement>;

  @ViewChild('webglCanvas', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  private ngZone = inject(NgZone);

  // Core Three.js Objects
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private fabricMesh!: THREE.Mesh;
  private fabricMaterial!: THREE.MeshPhysicalMaterial;
  private zariGoldBorderMesh!: THREE.Mesh;
  private particlesGroup!: THREE.Points;
  private kioskGroup!: THREE.Group;
  private animationFrameId: number | null = null;
  private startTime = performance.now();

  // Mouse / Raycaster interaction
  private mouseX = 0;
  private mouseY = 0;
  private targetCameraRotationX = 0;
  private targetCameraRotationY = 0;

  // Theatre.js State
  private theatreProject: any;
  private theatreSheet: any;
  private theatreCameraObj: any;

  // Signals
  hasInteracted = signal<boolean>(false);
  activePreset = signal<'orbit' | 'macro' | 'pallu'>('orbit');

  fabricThemes: GarmentFabricTheme[] = [
    {
      name: 'crimson-saree',
      category: 'Saree',
      labelEn: 'Royal Crimson Saree',
      labelTa: 'அரக்கு பட்டு',
      primaryColor: 0x8a0d28,
      sheenColor: 0xffd700,
      zariGold: 0xe5b838,
    },
    {
      name: 'peacock-salwar',
      category: 'Salwar',
      labelEn: 'Peacock Blue Salwar',
      labelTa: 'மயில்கழுத்து நீலம்',
      primaryColor: 0x094866,
      sheenColor: 0x00e5ff,
      zariGold: 0xe5c158,
    },
    {
      name: 'emerald-sherwani',
      category: 'Sherwani',
      labelEn: 'Temple Emerald Sherwani',
      labelTa: 'கிளிப்பச்சை பட்டு',
      primaryColor: 0x0e5c38,
      sheenColor: 0x55ff99,
      zariGold: 0xdfae26,
    },
    {
      name: 'rani-lehenga',
      category: 'Lehenga',
      labelEn: 'Rani Rose Bridal Lehenga',
      labelTa: 'ராணி ரோஸ்',
      primaryColor: 0x9e1250,
      sheenColor: 0xff66cc,
      zariGold: 0xf5d77f,
    },
  ];

  activeTheme = signal<GarmentFabricTheme>(this.fabricThemes[0]);

  ngOnInit() {
    this.ngZone.runOutsideAngular(() => {
      const initialized = this.initThree();
      if (initialized) {
        this.initTheatreJs();
        this.animate();
      }
    });
  }

  ngOnDestroy() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
    window.removeEventListener('resize', this.onResize);
  }

  private initThree(): boolean {
    try {
      const container = this.containerRef?.nativeElement;
      const canvas = this.canvasRef?.nativeElement;
      if (!container || !canvas) return false;

      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return false;

      const width = container.clientWidth || 800;
      const height = container.clientHeight || 600;

      // 1. Scene
      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.FogExp2(0x070208, 0.08);

      // 2. Camera
      this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      this.camera.position.set(0, 1.2, 4.2);

      // 3. Renderer with luxury physical lighting
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.25;

      // 4. Studio Lighting Rig
      const ambientLight = new THREE.AmbientLight(0x2a142e, 1.8);
      this.scene.add(ambientLight);

      const goldKeyLight = new THREE.DirectionalLight(0xffecc2, 2.8);
      goldKeyLight.position.set(3, 4, 3);
      this.scene.add(goldKeyLight);

      const mandapamRimLight = new THREE.DirectionalLight(0xd4af37, 2.5);
      mandapamRimLight.position.set(-3, 2, -2);
      this.scene.add(mandapamRimLight);

      const bottomUplight = new THREE.PointLight(0xa61c48, 1.5, 10);
      bottomUplight.position.set(0, -1.5, 1.5);
      this.scene.add(bottomUplight);

      // 5. Build 3D 55-inch Showroom Kiosk Frame
      this.buildShowroomKioskHardware();

      // 6. Build 3D Fabric Drape Geometry & Material
      this.buildFabricDrape();

      // 7. Build Floating Zari Glitter Sparkles
      this.buildZariGlitter();

      // Handle Window Resize
      window.addEventListener('resize', this.onResize);
      return true;
    } catch {
      return false;
    }
  }

  private buildShowroomKioskHardware() {
    this.kioskGroup = new THREE.Group();

    // Pedestal Base (Metallic Round Stand with Gold Accent)
    const baseGeom = new THREE.CylinderGeometry(1.3, 1.45, 0.15, 32);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x140d18,
      metalness: 0.85,
      roughness: 0.25,
    });
    const baseMesh = new THREE.Mesh(baseGeom, baseMat);
    baseMesh.position.y = -1.55;
    this.kioskGroup.add(baseMesh);

    // Glowing LED Ring on Base
    const ringGeom = new THREE.TorusGeometry(1.4, 0.02, 16, 48);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.9,
      roughness: 0.15,
      emissive: 0xaa7c11,
      emissiveIntensity: 0.6,
    });
    const ringMesh = new THREE.Mesh(ringGeom, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = -1.47;
    this.kioskGroup.add(ringMesh);

    // 55" Portrait Kiosk Chassis (Back Casing)
    const chassisGeom = new THREE.BoxGeometry(2.55, 3.5, 0.12);
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x0d0711,
      metalness: 0.9,
      roughness: 0.2,
    });
    const chassisMesh = new THREE.Mesh(chassisGeom, chassisMat);
    chassisMesh.position.set(0, 0.35, -0.06);
    this.kioskGroup.add(chassisMesh);

    // Golden Bezel Border Frame around Kiosk Screen
    const bezelGeom = new THREE.BoxGeometry(2.6, 3.55, 0.04);
    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.95,
      roughness: 0.18,
    });
    const bezelMesh = new THREE.Mesh(bezelGeom, bezelMat);
    bezelMesh.position.set(0, 0.35, -0.08);
    this.kioskGroup.add(bezelMesh);

    this.scene.add(this.kioskGroup);
  }

  private buildFabricDrape() {
    // Dynamic cloth drape wave representing saree/garment inside kiosk view
    const geometry = new THREE.PlaneGeometry(2.35, 3.15, 64, 64);

    const pos = geometry.attributes['position'];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = Math.sin(x * 3.5) * 0.2 + Math.cos(y * 2.0) * 0.12;
      pos.setZ(i, z);
    }
    geometry.computeVertexNormals();

    const theme = this.activeTheme();

    this.fabricMaterial = new THREE.MeshPhysicalMaterial({
      color: theme.primaryColor,
      roughness: 0.32,
      metalness: 0.15,
      clearcoat: 0.5,
      clearcoatRoughness: 0.2,
      sheen: 1.0,
      sheenColor: new THREE.Color(theme.sheenColor),
      sheenRoughness: 0.3,
      side: THREE.DoubleSide,
    });

    this.fabricMesh = new THREE.Mesh(geometry, this.fabricMaterial);
    this.fabricMesh.position.set(0, 0.38, 0.03);
    this.kioskGroup.add(this.fabricMesh);

    // Zari Border Strip
    const zariGeom = new THREE.PlaneGeometry(2.35, 0.32, 32, 8);
    const zariMat = new THREE.MeshStandardMaterial({
      color: theme.zariGold,
      metalness: 0.88,
      roughness: 0.2,
      side: THREE.DoubleSide,
    });
    this.zariGoldBorderMesh = new THREE.Mesh(zariGeom, zariMat);
    this.zariGoldBorderMesh.position.set(0, -1.02, 0.05);
    this.fabricMesh.add(this.zariGoldBorderMesh);
  }

  private buildZariGlitter() {
    const particleCount = 280;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const goldColor = new THREE.Color(0xffd700);
    const roseGoldColor = new THREE.Color(0xffe6a3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 4.5;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 4.0;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 3.5;

      const chosenColor = Math.random() > 0.4 ? goldColor : roseGoldColor;
      colors[i * 3] = chosenColor.r;
      colors[i * 3 + 1] = chosenColor.g;
      colors[i * 3 + 2] = chosenColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.035,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });

    this.particlesGroup = new THREE.Points(geometry, material);
    this.scene.add(this.particlesGroup);
  }

  private initTheatreJs() {
    try {
      this.theatreProject = getProject('NeXooAiKiosk3D');
      this.theatreSheet = this.theatreProject.sheet('CinematicKioskAnimation');

      this.theatreCameraObj = this.theatreSheet.object('CameraCinematics', {
        distance: types.number(4.2, { range: [2.0, 8.0] }),
        orbitSpeed: types.number(0.35, { range: [0.0, 2.0] }),
        sheenPulse: types.number(1.0, { range: [0.5, 2.0] }),
        waveIntensity: types.number(1.2, { range: [0.2, 3.0] }),
      });
    } catch {
      // fallback
    }
  }

  private animate = () => {
    if (!this.renderer || !this.scene || !this.camera) return;
    this.animationFrameId = requestAnimationFrame(this.animate);

    const elapsedTime = (performance.now() - this.startTime) * 0.001;

    // 1. Fluid Fabric Wave Simulation on Vertex Geometry
    if (this.fabricMesh) {
      const pos = this.fabricMesh.geometry.attributes['position'];
      const waveFreq = 2.4;
      const waveAmp = 0.07;

      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z =
          Math.sin(x * 3.5 + elapsedTime * 1.5) * 0.18 +
          Math.sin(y * waveFreq + elapsedTime * 2.2) * waveAmp;
        pos.setZ(i, z);
      }
      pos.needsUpdate = true;
      this.fabricMesh.geometry.computeVertexNormals();

      // Gentle kiosk cloth breathing motion
      this.fabricMesh.rotation.y = Math.sin(elapsedTime * 0.4) * 0.08;
    }

    // 2. Slow orbital drift of glittering gold sparkles
    if (this.particlesGroup) {
      this.particlesGroup.rotation.y = elapsedTime * 0.08;
      this.particlesGroup.rotation.x = Math.sin(elapsedTime * 0.05) * 0.04;
    }

    // 3. Smooth Camera Follow on Mouse Hover
    this.targetCameraRotationY += (this.mouseX * 0.6 - this.targetCameraRotationY) * 0.05;
    this.targetCameraRotationX += (this.mouseY * 0.3 - this.targetCameraRotationX) * 0.05;

    let baseDist = 4.2;
    if (this.activePreset() === 'macro') {
      baseDist = 2.4;
    } else if (this.activePreset() === 'pallu') {
      baseDist = 3.2;
    }

    this.camera.position.x =
      Math.sin(this.targetCameraRotationY) * baseDist + Math.sin(elapsedTime * 0.15) * 0.2;
    this.camera.position.z = Math.cos(this.targetCameraRotationY) * baseDist;
    this.camera.position.y = 1.2 + this.targetCameraRotationX + Math.cos(elapsedTime * 0.2) * 0.1;
    this.camera.lookAt(0, 0.35, 0);

    this.renderer.render(this.scene, this.camera);
  };

  private onResize = () => {
    const container = this.containerRef?.nativeElement;
    if (!container || !this.renderer || !this.camera) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  onMouseMove(event: MouseEvent) {
    if (!this.hasInteracted()) {
      this.hasInteracted.set(true);
    }
    const container = this.containerRef?.nativeElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.mouseX = (x / rect.width) * 2 - 1;
    this.mouseY = -(y / rect.height) * 2 + 1;
  }

  selectTheme(theme: GarmentFabricTheme) {
    this.activeTheme.set(theme);
    if (this.fabricMaterial) {
      this.fabricMaterial.color.setHex(theme.primaryColor);
      this.fabricMaterial.sheenColor = new THREE.Color(theme.sheenColor);
    }
    if (this.zariGoldBorderMesh) {
      const mat = this.zariGoldBorderMesh.material as THREE.MeshStandardMaterial;
      if (mat) mat.color.setHex(theme.zariGold);
    }
  }

  playPreset(preset: 'orbit' | 'macro' | 'pallu') {
    this.activePreset.set(preset);
    this.hasInteracted.set(true);
  }

  getSwatchCss(theme: GarmentFabricTheme): string {
    const hex = '#' + theme.primaryColor.toString(16).padStart(6, '0');
    const gold = '#' + theme.zariGold.toString(16).padStart(6, '0');
    return `linear-gradient(135deg, ${hex} 0%, ${gold} 100%)`;
  }
}
