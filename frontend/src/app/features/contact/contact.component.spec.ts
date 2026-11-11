import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { ContactComponent } from './contact.component';

describe('ContactComponent', () => {
  let component: ContactComponent;

  beforeEach(async () => {
    try {
      localStorage.clear();
    } catch {}

    await TestBed.configureTestingModule({
      imports: [ContactComponent],
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();

    const fixture = TestBed.createComponent(ContactComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create contact component', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle theme between dark and light', () => {
    expect(component.isDarkMode()).toBe(true);
    component.toggleTheme();
    expect(component.isDarkMode()).toBe(false);
    component.toggleTheme();
    expect(component.isDarkMode()).toBe(true);
  });

  it('should switch languages and toggle language dropdown', () => {
    expect(component.currentLang()).toBe('en');
    expect(component.showLangDropdown()).toBe(false);

    component.toggleLangDropdown();
    expect(component.showLangDropdown()).toBe(true);

    component.selectLanguage('ta');
    expect(component.currentLang()).toBe('ta');
    expect(component.showLangDropdown()).toBe(false);

    expect(component.t('contactBadge')).toContain('நேரடி தலைமை தொடர்பு');
  });

  it('should validate form and reject empty phone/showroom', () => {
    component.contactForm.showroomName = '';
    component.contactForm.phone = '';
    component.submitInquiry();
    expect(component.errorMessage()).toBeTruthy();
    expect(component.submitted()).toBe(false);
  });

  it('should reset form state on resetForm()', () => {
    component.submitted.set(true);
    component.contactForm.showroomName = 'Sri Kumaran Silks';
    component.resetForm();
    expect(component.submitted()).toBe(false);
    expect(component.contactForm.showroomName).toBe('');
  });
});
