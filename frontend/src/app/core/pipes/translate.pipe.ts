import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslationService } from '../services/translation.service';

/**
 * Standard Angular Translation Pipe for i18n
 * Usage in templates:
 *   {{ 'welcomeTitle' | translate }}
 *   {{ 'confirmPhotoBtn' | translate:'Confirm Photo' }}
 */
@Pipe({
  name: 'translate',
  standalone: true,
  pure: false, // Reactive to dynamic language signal changes
})
export class TranslatePipe implements PipeTransform {
  private readonly translationService = inject(TranslationService);

  transform(key: string, fallback?: string): string {
    if (!key) return '';
    return this.translationService.translateKey(key, fallback);
  }
}
