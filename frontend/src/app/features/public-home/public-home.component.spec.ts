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

  it('should switch between 6 Indian languages dynamically', () => {
    expect(component.currentLang()).toBe('en');
    expect(component.currentSlide().categoryTag['en']).toBe('Silk Sarees');

    component.setLanguage('ta');
    expect(component.currentLang()).toBe('ta');
    expect(component.currentSlide().categoryTag['ta']).toBe('பட்டுப்புடவைகள்');

    component.setLanguage('hi');
    expect(component.currentLang()).toBe('hi');
    expect(component.currentSlide().categoryTag['hi']).toBe('सिल्क साड़ियां');

    component.setLanguage('te');
    expect(component.currentLang()).toBe('te');

    component.setLanguage('ml');
    expect(component.currentLang()).toBe('ml');

    component.setLanguage('kn');
    expect(component.currentLang()).toBe('kn');
  });

  it('should navigate through hero multi-garment slides and reset loader progress', () => {
    expect(component.currentSlideIndex()).toBe(0);
    expect(component.currentSlide().id).toBe('saree');
    expect(component.currentSlide().headlineLine2['en']).toBe('Every Saree');

    // Next slide -> Salwar
    component.nextSlide();
    expect(component.currentSlideIndex()).toBe(1);
    expect(component.currentSlide().id).toBe('salwar');
    expect(component.currentSlide().headlineLine2['en']).toBe('Every Salwar & Anarkali');

    // Next slide -> Men's wear
    component.nextSlide();
    expect(component.currentSlideIndex()).toBe(2);
    expect(component.currentSlide().id).toBe('menswear');
    expect(component.currentSlide().headlineLine2['en']).toBe('Kurtas & Sherwanis');

    // Next slide -> Bridal
    component.nextSlide();
    expect(component.currentSlideIndex()).toBe(3);
    expect(component.currentSlide().id).toBe('bridal');

    // Loop back to 0
    component.nextSlide();
    expect(component.currentSlideIndex()).toBe(0);

    // Direct navigation
    component.goToSlide(2);
    expect(component.currentSlideIndex()).toBe(2);
  });

  it('should handle interactive AI try-on before/after outfit selection for men and women', () => {
    expect(component.activeCompareGarment()).toBe('saree');
    expect(component.activeCompareData().name['en']).toContain('Saree');

    component.setCompareOutfit('salwar');
    expect(component.activeCompareGarment()).toBe('salwar');
    expect(component.activeCompareData().name['en']).toContain('Anarkali');

    component.setCompareOutfit('sherwani');
    expect(component.activeCompareGarment()).toBe('sherwani');
    expect(component.activeCompareData().name['en']).toContain('Sherwani');
    expect(component.activeCompareData().beforeImg).toBe('assets/images/person_male_before.jpg');
    expect(component.activeCompareData().afterImg).toBe('assets/images/hero_model_men.jpg');
  });

  it('should filter collections dynamically by category', () => {
    expect(component.activeCategory()).toBe('all');
    expect(component.filteredCollections().length).toBe(component.allCollections.length);

    component.setCategory('women');
    expect(component.activeCategory()).toBe('women');
    expect(component.filteredCollections().every((c) => c.category === 'women')).toBe(true);

    component.setCategory('men');
    expect(component.activeCategory()).toBe('men');
    expect(component.filteredCollections().every((c) => c.category === 'men')).toBe(true);

    component.setCategory('bridal');
    expect(component.activeCategory()).toBe('bridal');
    expect(component.filteredCollections().every((c) => c.category === 'bridal')).toBe(true);
  });

  it('should toggle contact hub and submit demo lead with reference ID', () => {
    expect(component.showContactHub()).toBe(false);
    component.toggleContactHub();
    expect(component.showContactHub()).toBe(true);

    component.demoForm = {
      showroomName: 'Sri Kumaran Silks',
      contactPerson: 'Mr. Raman',
      phone: '9876543210',
      city: 'Chennai',
    };

    component.submitDemo();
    expect(component.demoSubmitted()).toBe(true);
    expect(component.confirmedLeadId()).toMatch(/^NX-\d{6}$/);
  });
});
