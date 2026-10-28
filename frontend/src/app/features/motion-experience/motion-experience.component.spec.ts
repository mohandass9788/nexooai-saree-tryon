import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MotionExperienceComponent } from './motion-experience.component';

describe('MotionExperienceComponent', () => {
  let component: MotionExperienceComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MotionExperienceComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(MotionExperienceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create motion experience component', () => {
    expect(component).toBeTruthy();
  });

  it('should default to slider tab and allow switching tabs', () => {
    expect(component.activeTab()).toBe('slider');
    component.selectTab('turntable');
    expect(component.activeTab()).toBe('turntable');
    component.selectTab('catwalk');
    expect(component.activeTab()).toBe('catwalk');
    component.selectTab('bridal');
    expect(component.activeTab()).toBe('bridal');
  });

  it('should update zoom level', () => {
    expect(component.zoomLevel()).toBe(1.0);
    component.setZoom(1.8);
    expect(component.zoomLevel()).toBe(1.8);
  });

  it('should update turntable angles on drag calculation', () => {
    expect(component.turntableAngle()).toBe(0);
    component.setAngle(90);
    expect(component.turntableAngle()).toBe(90);
  });

  it('should toggle consent and launch catwalk simulation', () => {
    expect(component.userConsent()).toBe(false);
    component.toggleConsent();
    expect(component.userConsent()).toBe(true);
    component.launchCatwalkJob();
    expect(component.catwalkStarted()).toBe(true);
  });

  it('should emit closed event when close() is called', () => {
    let closedCalled = false;
    component.closed.subscribe(() => {
      closedCalled = true;
    });
    component.close();
    expect(closedCalled).toBe(true);
  });
});
