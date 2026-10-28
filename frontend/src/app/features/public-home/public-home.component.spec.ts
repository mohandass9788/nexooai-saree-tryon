import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PublicHomeComponent } from './public-home.component';

describe('PublicHomeComponent', () => {
  let component: PublicHomeComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicHomeComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(PublicHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create public home component', () => {
    expect(component).toBeTruthy();
  });

  it('should default to dark theme and toggle to light theme', () => {
    expect(component.isDarkMode()).toBe(true);
    component.toggleTheme();
    expect(component.isDarkMode()).toBe(false);
    component.toggleTheme();
    expect(component.isDarkMode()).toBe(true);
  });

  it('should toggle billing cycle between monthly and yearly', () => {
    expect(component.billingCycle()).toBe('monthly');
    component.setBillingCycle('yearly');
    expect(component.billingCycle()).toBe('yearly');
  });

  it('should open and close demo modal', () => {
    expect(component.showDemoModal()).toBe(false);
    component.openDemoModal();
    expect(component.showDemoModal()).toBe(true);
    component.closeDemoModal();
    expect(component.showDemoModal()).toBe(false);
  });
});
