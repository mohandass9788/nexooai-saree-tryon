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
    const saree = component.sarees[0];
    const initialStatus = saree.is_active;
    component.toggleSareeStatus(saree);
    expect(saree.is_active).toBe(!initialStatus);
  });

  it('should toggle kiosk lock status', () => {
    const kiosk = component.kiosks[0];
    const initialLock = kiosk.isLocked;
    component.toggleKioskLock(kiosk);
    expect(kiosk.isLocked).toBe(!initialLock);
  });

  it('should allow adding try-on quota tokens', () => {
    const initialQuota = component.tokenQuota();
    component.addTokens(500);
    expect(component.tokenQuota()).toBe(initialQuota + 500);
  });
});
