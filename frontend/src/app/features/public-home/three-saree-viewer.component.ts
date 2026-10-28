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

export interface SareeFabricTheme {
  name: string;
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
            <span>THREE.JS + THEATRE.JS 3D FABRIC ENGINE</span>
          </div>
          <span class="hud-tech-note">Physical Silk Sheen • Real-Time Zari Physics</span>
        </div>

        <!-- Center Interactive Tooltip (Dismisses on first interaction) -->
        <div class="hud-gesture-hint" [class.hidden]="hasInteracted()">
          <span class="hint-icon">✦</span>
          <span>Drag or hover to inspect 3D silk drape • Click presets below</span>
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
              <span>Cinematic Orbit</span>
            </button>

            <button
              type="button"
              class="btn-hud-preset"
              [class.active]="activePreset() === 'macro'"
              (click)="playPreset('macro')"
            >
              <span>🔍</span>
              <span>Zari Macro View</span>
            </button>

            <button
              type="button"
              class="btn-hud-preset"
              [class.active]="activePreset() === 'pallu'"
              (click)="playPreset('pallu')"
            >
              <span>✨</span>
              <span>Floating Pallu</span>
            </button>
          </div>

          <!-- Real-Time Fabric Color Palette Switcher -->
          <div class="fabric-palette-group">
            <span class="palette-label">Silk Fabric:</span>
            <div class="palette-swatches">
              @for (theme of fabricThemes; track theme.name) {
                <button
                  type="button"
                  class="swatch-btn"
                  [class.selected]="activeTheme().name === theme.name"
                  [style.background]="getSwatchCss(theme)"
                  [title]="theme.labelEn + ' (' + theme.labelTa + ')'"
                  (click)="selectTheme(theme)"
                ></button>
              }
            </div>
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
        color: rgba(255, 255, 255, 0.6);
        background: rgba(0, 0, 0, 0.4);
        padding: 4px 10px;
        border-radius: 6px;
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

      @keyframes pulse {
        0% { transform: scale(0.9); opacity: 0.8; }
        50% { transform: scale(1.15); opacity: 1; }
        100% { transform: scale(0.9); opacity: 0.8; }
      }

      @media (max-width: 768px) {
        .three-viewer-container {
          height: 440px;
        }

        .three-hud-controls {
          flex-direction: column;
          align-items: stretch;
        }

        .camera-preset-group,
        .fabric-palette-group {
          justify-content: center;
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

  // Three.js instances
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private fabricMesh!: THREE.Mesh;
  private fabricMaterial!: THREE.MeshPhysicalMaterial;
  private zariGoldBorderMesh!: THREE.Mesh;
  private particlesGroup!: THREE.Points;
  private mannequinGroup!: THREE.Group;
  private animationFrameId: number | null = null;
  private clock = new THREE.Clock();

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

  fabricThemes: SareeFabricTheme[] = [
    {
      name: 'crimson',
      labelEn: 'Royal Crimson Gold',
      labelTa: 'அரக்கு பட்டு',
      primaryColor: 0x8a0d28,
      sheenColor: 0xffd700,
      zariGold: 0xe5b838,
    },
    {
      name: 'peacock',
      labelEn: 'Peacock Mayilkazhutthu',
      labelTa: 'மயில்கழுத்து நீலம்',
      primaryColor: 0x094866,
      sheenColor: 0x00e5ff,
      zariGold: 0xe5c158,
    },
    {
      name: 'emerald',
      labelEn: 'Temple Emerald Green',
      labelTa: 'கிளிப்பச்சை பட்டு',
      primaryColor: 0x0e5c38,
      sheenColor: 0x55ff99,
      zariGold: 0xdfae26,
    },
    {
      name: 'rani',
      labelEn: 'Rani Magenta Rose',
      labelTa: 'ராணி ரோஸ்',
      primaryColor: 0x9e1250,
      sheenColor: 0xff66cc,
      zariGold: 0xf5d77f,
    },
  ];

  activeTheme = signal<SareeFabricTheme>(this.fabricThemes[0]);

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
  }

  private initThree(): boolean {
    try {
      const container = this.containerRef?.nativeElement;
      const canvas = this.canvasRef?.nativeElement;
      if (!container || !canvas) return false;

      // Check for WebGL support
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

    // 5. Build 3D Saree Drape Geometry & Material
    this.buildSareeDrape();

    // 6. Build Floating Zari Glitter Sparkles
    this.buildZariGlitter();

    // 7. Build Elegant Pedestal
    this.buildMannequinPedestal();

    // Handle Window Resize
    window.addEventListener('resize', this.onResize);
    return true;
  } catch {
    return false;
  }
}

  private buildSareeDrape() {
    // Curving wave cloth mesh representing flowing pleated Kanchipuram silk
    const geometry = new THREE.PlaneGeometry(2.4, 3.2, 64, 64);

    // Initial cloth drape curve
    const pos = geometry.attributes['position'];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      // Create S-curve pleat cascade
      const z = Math.sin(x * 3.5) * 0.25 + Math.cos(y * 2.0) * 0.15;
      pos.setZ(i, z);
    }
    geometry.computeVertexNormals();

    const theme = this.activeTheme();

    // Luxury Physical Sheen Material (Charlie Sheen BRDF model)
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
    this.fabricMesh.position.set(0, 0.4, 0);
    this.scene.add(this.fabricMesh);

    // Add Heavy Golden Zari Border Strip at Bottom & Pallu
    const zariGeom = new THREE.PlaneGeometry(2.4, 0.35, 32, 8);
    const zariMat = new THREE.MeshStandardMaterial({
      color: theme.zariGold,
      metalness: 0.85,
      roughness: 0.22,
      side: THREE.DoubleSide,
    });
    this.zariGoldBorderMesh = new THREE.Mesh(zariGeom, zariMat);
    this.zariGoldBorderMesh.position.set(0, -1.05, 0.05);
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

  private buildMannequinPedestal() {
    this.mannequinGroup = new THREE.Group();

    // Pedestal Cylinder
    const baseGeom = new THREE.CylinderGeometry(1.2, 1.35, 0.15, 32);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x180d1a,
      metalness: 0.7,
      roughness: 0.3,
    });
    const baseMesh = new THREE.Mesh(baseGeom, baseMat);
    baseMesh.position.y = -1.45;
    this.mannequinGroup.add(baseMesh);

    // Golden Rim Ring on Pedestal
    const ringGeom = new THREE.TorusGeometry(1.3, 0.02, 16, 48);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.9,
      roughness: 0.15,
    });
    const ringMesh = new THREE.Mesh(ringGeom, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = -1.37;
    this.mannequinGroup.add(ringMesh);

    this.scene.add(this.mannequinGroup);
  }

  private initTheatreJs() {
    try {
      this.theatreProject = getProject('NeXooAiSaree3D');
      this.theatreSheet = this.theatreProject.sheet('CinematicDrapeAnimation');

      this.theatreCameraObj = this.theatreSheet.object('CameraCinematics', {
        distance: types.number(4.2, { range: [2.0, 8.0] }),
        orbitSpeed: types.number(0.35, { range: [0.0, 2.0] }),
        sheenPulse: types.number(1.0, { range: [0.5, 2.0] }),
        waveIntensity: types.number(1.2, { range: [0.2, 3.0] }),
      });
    } catch {
      // Graceful fallback if project store initializes in memory
    }
  }

  private animate = () => {
    if (!this.renderer || !this.scene || !this.camera) return;
    this.animationFrameId = requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    // 1. Fluid Fabric Wave Simulation on Vertex Geometry
    if (this.fabricMesh) {
      const pos = this.fabricMesh.geometry.attributes['position'];
      const waveFreq = 2.4;
      const waveAmp = 0.08;

      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        // Dynamic procedural ripples
        const z =
          Math.sin(x * 3.5 + elapsedTime * 1.5) * 0.2 +
          Math.sin(y * waveFreq + elapsedTime * 2.2) * waveAmp;
        pos.setZ(i, z);
      }
      pos.needsUpdate = true;
      this.fabricMesh.geometry.computeVertexNormals();

      // Gentle cloth breathing floating rotation
      this.fabricMesh.rotation.y = Math.sin(elapsedTime * 0.4) * 0.12;
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

    this.camera.position.x = Math.sin(this.targetCameraRotationY) * baseDist;
    this.camera.position.z = Math.cos(this.targetCameraRotationY) * baseDist;
    this.camera.position.y = 1.1 + this.targetCameraRotationX;
    this.camera.lookAt(0, 0.2, 0);

    // 4. Render
    this.renderer.render(this.scene, this.camera);
  };

  onMouseMove(event: MouseEvent) {
    this.hasInteracted.set(true);
    const rect = this.containerRef.nativeElement.getBoundingClientRect();
    this.mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseY = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  }

  playPreset(preset: 'orbit' | 'macro' | 'pallu') {
    this.activePreset.set(preset);
    this.hasInteracted.set(true);

    if (preset === 'orbit') {
      this.mouseX = 0.5;
    } else if (preset === 'macro') {
      this.mouseX = 0.1;
      this.mouseY = -0.3;
    } else if (preset === 'pallu') {
      this.mouseX = -0.6;
      this.mouseY = 0.2;
    }
  }

  selectTheme(theme: SareeFabricTheme) {
    this.activeTheme.set(theme);
    this.hasInteracted.set(true);

    if (this.fabricMaterial) {
      this.fabricMaterial.color.setHex(theme.primaryColor);
      this.fabricMaterial.sheenColor.setHex(theme.sheenColor);
    }
    if (this.zariGoldBorderMesh) {
      (this.zariGoldBorderMesh.material as THREE.MeshStandardMaterial).color.setHex(
        theme.zariGold
      );
    }
  }

  getSwatchCss(theme: SareeFabricTheme): string {
    const hex = '#' + theme.primaryColor.toString(16).padStart(6, '0');
    const gold = '#' + theme.zariGold.toString(16).padStart(6, '0');
    return `linear-gradient(135deg, ${hex} 60%, ${gold} 100%)`;
  }

  private onResize = () => {
    if (!this.containerRef || !this.renderer || !this.camera) return;
    const width = this.containerRef.nativeElement.clientWidth;
    const height = this.containerRef.nativeElement.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };
}
