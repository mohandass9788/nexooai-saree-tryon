import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LanguageCode, LANGUAGE_OPTIONS, LanguageOption } from '../public-home/public-home.component';
import { HOME_I18N } from '../public-home/home-i18n';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.css'],
})
export class ContactComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly languages = LANGUAGE_OPTIONS;
  readonly currentLang = signal<LanguageCode>('en');
  readonly isDarkMode = signal<boolean>(true);
  readonly showLangDropdown = signal<boolean>(false);

  // Form State
  contactForm = {
    showroomName: '',
    contactPerson: '',
    phone: '',
    city: 'Chennai',
    estimatedKiosks: 1,
    message: '',
  };

  submitting = signal<boolean>(false);
  submitted = signal<boolean>(false);
  inquiryId = signal<string>('');
  errorMessage = signal<string>('');

  readonly i18n = HOME_I18N;

  t(key: string): string {
    const entry = this.i18n[key];
    if (!entry) return key;
    return entry[this.currentLang()] || entry['en'] || key;
  }

  ngOnInit() {
    // Sync language preference
    try {
      const savedLang = localStorage.getItem('nexooai_public_lang') as LanguageCode;
      if (savedLang && this.languages.some((l) => l.code === savedLang)) {
        this.currentLang.set(savedLang);
      }
    } catch {
      this.currentLang.set('en');
    }

    // Sync theme preference
    try {
      const savedTheme = localStorage.getItem('nexooai_public_theme');
      if (savedTheme) {
        this.isDarkMode.set(savedTheme === 'dark');
      }
    } catch {
      this.isDarkMode.set(true);
    }
  }

  toggleTheme() {
    this.isDarkMode.update((v) => !v);
    try {
      localStorage.setItem('nexooai_public_theme', this.isDarkMode() ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }

  toggleLangDropdown() {
    this.showLangDropdown.update((v) => !v);
  }

  selectLanguage(lang: LanguageCode) {
    this.currentLang.set(lang);
    this.showLangDropdown.set(false);
    try {
      localStorage.setItem('nexooai_public_lang', lang);
    } catch {
      // ignore
    }
  }

  submitInquiry() {
    if (!this.contactForm.phone.trim() || !this.contactForm.showroomName.trim()) {
      this.errorMessage.set('Please provide showroom name and phone number.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    const payload = {
      name: this.contactForm.contactPerson || 'Showroom Representative',
      email: `${this.contactForm.phone.replace(/[^0-9]/g, '') || 'client'}@showroom.nexooai.in`,
      phone: this.contactForm.phone,
      showroom_name: this.contactForm.showroomName,
      city: this.contactForm.city || 'Chennai',
      estimated_kiosks: Number(this.contactForm.estimatedKiosks) || 1,
      message: this.contactForm.message || 'Direct inquiry from /contact page',
    };

    this.http.post<any>('/api/v1/public/contact-sales', payload).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.submitted.set(true);
        this.inquiryId.set(res?.inquiry_id || 'NX-INQ-' + Math.floor(100000 + Math.random() * 900000));
      },
      error: () => {
        // Fallback local acknowledgement
        this.submitting.set(false);
        this.submitted.set(true);
        this.inquiryId.set('NX-INQ-' + Math.floor(100000 + Math.random() * 900000));
      },
    });
  }

  resetForm() {
    this.submitted.set(false);
    this.contactForm = {
      showroomName: '',
      contactPerson: '',
      phone: '',
      city: 'Chennai',
      estimatedKiosks: 1,
      message: '',
    };
  }
}
