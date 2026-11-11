import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppShellComponent } from './app-shell.component';

describe('AppShellComponent', () => {
  let component: AppShellComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(AppShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the AppShellComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should allow switching navigation tabs', () => {
    expect(component.activeNav()).toBe('dashboard');
    component.setNav('catalogue');
    expect(component.activeNav()).toBe('catalogue');
    component.setNav('kiosks');
    expect(component.activeNav()).toBe('kiosks');
    component.setNav('subscription');
    expect(component.activeNav()).toBe('subscription');
  });

  it('should toggle saree active status', () => {
    const testSaree = {
      id: 'sar-test',
      sku: 'TEST-01',
      name_en: 'Test Saree',
      name_ta: 'டெஸ்ட் புடவை',
      category: 'Silk',
      fabric: 'Mulberry',
      price: 15000,
      rack_location: 'A-01',
      is_active: true,
      thumbnail: 'test.jpg',
    };
    component.sarees = [testSaree];
    const initialStatus = testSaree.is_active;
    component.toggleSareeStatus(testSaree);
    expect(testSaree.is_active).toBe(!initialStatus);
  });

  it('should toggle kiosk lock status', () => {
    const testKiosk = {
      id: 'KIOSK-01',
      name: 'Test Kiosk',
      section: 'Main',
      status: 'online' as const,
      lastPing: 'now',
      screenResolution: '1080x1920',
      isLocked: false,
    };
    component.kiosks = [testKiosk];
    const initialLock = testKiosk.isLocked;
    component.toggleKioskLock(testKiosk);
    expect(testKiosk.isLocked).toBe(!initialLock);
  });

  it('should allow adding try-on quota tokens', () => {
    const initialQuota = component.tokenQuota();
    component.addTokens(500);
    expect(component.tokenQuota()).toBe(initialQuota + 500);
  });
});
