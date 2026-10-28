import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ThreeSareeViewerComponent } from './three-saree-viewer.component';

@Component({
  selector: 'app-public-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ThreeSareeViewerComponent],
  templateUrl: './public-home.component.html',
  styleUrls: ['./public-home.component.css'],
})
export class PublicHomeComponent implements OnInit {
  isDarkMode = signal<boolean>(true);
  billingCycle = signal<'monthly' | 'yearly'>('monthly');
  showDemoModal = signal<boolean>(false);
  showVideoModal = signal<boolean>(false);
  demoSubmitted = signal<boolean>(false);

  demoForm = {
    showroomName: '',
    contactPerson: '',
    phone: '',
    city: 'Chennai',
  };

  ngOnInit() {
    // Check saved theme preference, default to dark as primary showroom luxury theme
    try {
      const savedTheme = localStorage.getItem('nexooai_public_theme');
      if (savedTheme) {
        this.isDarkMode.set(savedTheme === 'dark');
      } else {
        this.isDarkMode.set(true); // Default to Dark mode as instructed
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
      // ignore in SSR / restricted storage
    }
  }

  setBillingCycle(cycle: 'monthly' | 'yearly') {
    this.billingCycle.set(cycle);
  }

  openDemoModal() {
    this.showDemoModal.set(true);
    this.demoSubmitted.set(false);
  }

  closeDemoModal() {
    this.showDemoModal.set(false);
  }

  openVideoModal() {
    this.showVideoModal.set(true);
  }

  closeVideoModal() {
    this.showVideoModal.set(false);
  }

  submitDemo() {
    if (!this.demoForm.phone) return;
    this.demoSubmitted.set(true);
    setTimeout(() => {
      this.showDemoModal.set(false);
      this.demoSubmitted.set(false);
      this.demoForm = { showroomName: '', contactPerson: '', phone: '', city: 'Chennai' };
    }, 2000);
  }
}
