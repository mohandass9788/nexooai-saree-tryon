import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  inject,
  NgZone,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HOME_I18N } from './home-i18n';

export type LanguageCode = 'en' | 'ta' | 'hi' | 'te' | 'ml' | 'kn';

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు' },
  { code: 'ml', label: 'Malayalam', nativeLabel: 'മലയാളം' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ' },
];

export interface HeroGarmentSlide {
  id: string;
  badge: Record<LanguageCode, string>;
  headlineLine1: Record<LanguageCode, string>;
  headlineLine2: Record<LanguageCode, string>;
  headlineHighlight: Record<LanguageCode, string>;
  subtext: Record<LanguageCode, string>;
  categoryTag: Record<LanguageCode, string>;
  pillIcon: string;
  pillText: Record<LanguageCode, string>;
  accentColor: string;
  imageDark: string;
  imageLight: string;
  statsPill: Record<LanguageCode, string>;
}

export interface CollectionItem {
  id: string;
  name: Record<LanguageCode, string>;
  category: 'women' | 'men' | 'bridal';
  categoryLabel: Record<LanguageCode, string>;
  image: string;
  tag: Record<LanguageCode, string>;
}

export interface DemoLeadRecord {
  id: string;
  showroomName: string;
  contactPerson: string;
  phone: string;
  city: string;
  timestamp: string;
}

@Component({
  selector: 'app-public-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './public-home.component.html',
  styleUrls: ['./public-home.component.css'],
})
export class PublicHomeComponent implements OnInit, OnDestroy {
  readonly i18n = HOME_I18N;

  t(key: string): string {
    const item = this.i18n[key];
    if (!item) return key;
    return item[this.currentLang()] || item['en'] || key;
  }

  private readonly http = inject(HttpClient);
  private ngZone = inject(NgZone);

  // Language & Theme State
  languages = LANGUAGE_OPTIONS;
  currentLang = signal<LanguageCode>('en');
  showLangDropdown = signal<boolean>(false);
  isDarkMode = signal<boolean>(true);
  billingCycle = signal<'monthly' | 'yearly'>('monthly');

  // Floating Action Hub State
  showScrollTop = signal<boolean>(false);
  showContactHub = signal<boolean>(false);
  isScrolled = signal<boolean>(false);

  // Platform Global Feature Visibility (Managed by Super Admin)
  showPricingSection = signal<boolean>(true);
  showWebDemoSection = signal<boolean>(true);
  showRoiSection = signal<boolean>(true);
  showTestimonialsSection = signal<boolean>(true);

  // Modals & Lead Form
  showDemoModal = signal<boolean>(false);
  showVideoModal = signal<boolean>(false);
  demoSubmitted = signal<boolean>(false);
  confirmedLeadId = signal<string>('');

  demoForm = {
    showroomName: '',
    contactPerson: '',
    phone: '',
    city: 'Chennai',
  };

  // =========================================================================
  // HERO MULTI-GARMENT DATA (Saree, Salwar, Men's Sherwani, Bridal Lehenga)
  // =========================================================================
  heroSlides: HeroGarmentSlide[] = [
    {
      id: 'saree',
      badge: {
        en: '✦ AI POWERED VIRTUAL TRY-ON',
        ta: '✦ ஏஐ விர்ச்சுவல் புடவை ட்ரை-ஆன்',
        hi: '✦ एआई पावर्ड वर्चुअल साड़ी ट्राई-ऑन',
        te: '✦ AI వర్చువల్ శారీ ట్రై-ఆన్',
        ml: '✦ AI വെർച്വൽ സാരി ട്രൈ-ഓൺ',
        kn: '✦ AI ವರ್ಚುವಲ್ ಸೀರೆ ಟ್ರೈ-ಆನ್',
      },
      headlineLine1: {
        en: 'See Yourself In',
        ta: 'அனைத்துப் புடவைகளிலும்',
        hi: 'हर साड़ी में खुद को',
        te: 'ప్రతి శారీలో మిమ్మల్ని',
        ml: 'ഓരോ സാരിയിലും നിങ്ങളെ',
        kn: 'ಪ್ರತಿಯೊಂದು ಸೀರೆಯಲ್ಲಿ ನಿಮ್ಮನ್ನು',
      },
      headlineLine2: {
        en: 'Every Saree',
        ta: 'உடனே பாருங்கள்',
        hi: 'तुरंत देखें',
        te: 'వెంటనే చూడండి',
        ml: 'ഉടൻ കാണൂ',
        kn: 'ತಕ್ಷಣ ನೋಡಿ',
      },
      headlineHighlight: {
        en: 'Instantly',
        ta: 'நொடியில்',
        hi: 'आसानी से',
        te: 'తక్షణమే',
        ml: 'നിമിഷങ്ങൾക്കുള്ളിൽ',
        kn: 'ತಕ್ಷಣವೇ',
      },
      subtext: {
        en: 'Transform your textile showroom with AI. Let customers experience Kanchipuram, Banarasi, Silk and designer sarees on themselves in 5 seconds.',
        ta: 'காஞ்சிபுரம், பனாரசி மற்றும் டிசைனர் பட்டுப்புடவைகளை வாடிக்கையாளர்கள் 5 நொடிகளில் தங்களின் மீது அணிந்து பார்த்து தேர்வு செய்யலாம்.',
        hi: 'कांजीवरम, बनारसी और सिल्क साड़ियों को ग्राहक मात्र 5 सेकंड में अपने ऊपर पहनकर लाइव देख सकते हैं।',
        te: 'కస్టమర్లు కాంచీపురం, బనారసి మరియు డిజైనర్ శారీలను కేవలం 5 సెకన్లలో తమపై ట్రై చేసుకోవచ్చు.',
        ml: 'കാഞ്ചീപുരം, ബനാറസി പട്ടുസാരികൾ ഉപഭോക്താക്കൾക്ക് 5 സെക്കൻഡിനുള്ളിൽ തത്സമയം ധരിച്ചുനോക്കാം.',
        kn: 'ಗ್ರಾಹಕರು ಕಾಂಚೀಪುರಂ ಮತ್ತು ರೇಷ್ಮೆ ಸೀರೆಗಳನ್ನು 5 ಸೆಕೆಂಡುಗಳಲ್ಲಿ ತಮ್ಮ ಮೇಲೆ ಟ್ರೈ ಮಾಡಿ ಆಯ್ಕೆ ಮಾಡಬಹುದು.',
      },
      categoryTag: {
        en: 'Silk Sarees',
        ta: 'பட்டுப்புடவைகள்',
        hi: 'सिल्क साड़ियां',
        te: 'సిల్క్ శారీలు',
        ml: 'പട്ട് സാരികൾ',
        kn: 'ರೇಷ್ಮೆ ಸೀರೆಗಳು',
      },
      pillIcon: '👗',
      pillText: {
        en: 'Realistic Saree Drape',
        ta: 'தத்ரூப பட்டு மடிப்பு',
        hi: 'असली साड़ी ड्रेप',
        te: 'రియలిస్టిక్ డ్రేప్',
        ml: 'റിയലിസ്റ്റിക് സാരി ഡ്രേപ്പ്',
        kn: 'ನೈಜ ಸೀರೆ ಡ್ರೇಪ್',
      },
      accentColor: '#ff177d',
      imageDark: 'assets/images/hero_model_dark.png',
      imageLight: 'assets/images/hero_model_light.jpg',
      statsPill: {
        en: '5 Sec Saree Try-On',
        ta: '5 வினாடி ட்ரை-ஆன்',
        hi: '5 सेकंड ट्राई-ऑन',
        te: '5 సెకన్ల ట్రై-ఆన్',
        ml: '5 സെക്കൻഡ് ട്രൈ-ഓൺ',
        kn: '5 ಸೆಕೆಂಡ್ ಟ್ರೈ-ಆನ್',
      },
    },
    {
      id: 'salwar',
      badge: {
        en: '✦ WOMEN’S SALWAR & ANARKALI TRY-ON',
        ta: '✦ சுடிதார் & அனார்கலி விர்ச்சுவல் ட்ரை-ஆன்',
        hi: '✦ सलवार सूट और अनारकली ट्राई-ऑन',
        te: '✦ సల్వార్ & అనార్కలి ట్రై-ఆన్',
        ml: '✦ സൽവാർ & അനാർക്കലി ട്രൈ-ഓൺ',
        kn: '✦ ಸಲ್ವಾರ್ & ಅನಾರ್ಕಲಿ ಟ್ರೈ-ಆನ್',
      },
      headlineLine1: {
        en: 'Style Yourself In',
        ta: 'அழகிய சுடிதார் மற்றும்',
        hi: 'हर अनारकली और सलवार में',
        te: 'సల్వార్ & అనార్కలిలో',
        ml: 'സൽവാർ സ്യൂട്ടുകളിൽ',
        kn: 'ಸಲ್ವಾರ್ ಸೂಟ್‌ಗಳಲ್ಲಿ',
      },
      headlineLine2: {
        en: 'Every Salwar & Anarkali',
        ta: 'அனார்கலி உடைகளில்',
        hi: 'अपनी परफेक्ट स्टाइल पाएं',
        te: 'మీ లుక్ ని చూడండి',
        ml: 'പുതിയ ലുക്ക് കണ്ടെത്തൂ',
        kn: 'ನಿಮ್ಮ ಹೊಸ ಶೈಲಿ ನೋಡಿ',
      },
      headlineHighlight: {
        en: 'Seamlessly',
        ta: 'துல்லியமாக',
        hi: 'शानदार रूप से',
        te: 'అద్భుతంగా',
        ml: 'മനോഹരമായി',
        kn: 'ಅದ್ಭುತವಾಗಿ',
      },
      subtext: {
        en: 'From party Anarkalis to chic office wear, let shoppers explore cuts, flares, and silhouettes with zero physical dressing trials.',
        ta: 'பார்ட்டி வேர் அனார்கலி முதல் மாடர்ன் சுடிதார் வரை அனைத்து ஆடைகளையும் தங்களின் உயரத்திற்கு ஏற்ப எளிதாக அணிந்து பார்க்கலாம்.',
        hi: 'अनारकली से लेकर ऑफिस वियर तक, सभी कट्स और फिटिंग को बिना बदले स्क्रीन पर तुरंत आजमाएं।',
        te: 'పార్టీ వేర్ అనార్కలిల నుండి ఆఫీస్ వేర్ వరకు అన్నిటినీ ట్రయల్ రూమ్ లేకుండా నేరుగా చూడండి.',
        ml: 'പാർട്ടി അനാർക്കലി മുതൽ ഓഫീസ്‌ വെയർ വരെയുള്ള എല്ലാ സ്റ്റൈലുകളും ഡ്രസ്സിംഗ് ട്രയലുകൾ ഇല്ലാതെ കാണാം.',
        kn: 'ಅನಾರ್ಕಲಿಯಿಂದ ಹಿಡಿದು ಆಫೀಸ್ ಸೂಟ್‌ಗಳವರೆಗೆ ಎಲ್ಲವನ್ನೂ ಟ್ರಯಲ್ ರೂಮ್ ಇಲ್ಲದೆ ತಕ್ಷಣ ನೋಡಿ.',
      },
      categoryTag: {
        en: 'Salwar & Anarkali',
        ta: 'சுடிதார் & அனார்கலி',
        hi: 'सलवार और अनारकली',
        te: 'సల్వార్ & అనార్కలి',
        ml: 'സൽവാർ & അനാർക്കലി',
        kn: 'ಸಲ್ವಾರ್ ಮತ್ತು ಅನಾರ್ಕಲಿ',
      },
      pillIcon: '✨',
      pillText: {
        en: 'Perfect Flare & Fit',
        ta: 'துல்லிய உடலளவு பொருத்தம்',
        hi: 'परफेक्ट फ्लेयर और कट',
        te: 'ఖచ్చితమైన ఫిట్',
        ml: 'കൃത്യമായ ഫിറ്റ്',
        kn: 'ಪರ್ಫೆಕ್ಟ್ ಫಿಟ್',
      },
      accentColor: '#00e5ff',
      imageDark: 'assets/images/hero_model_salwar.jpg',
      imageLight: 'assets/images/hero_model_salwar.jpg',
      statsPill: {
        en: 'Instant Cut Matching',
        ta: 'உடனடி ஸ்டைல் பொருத்தம்',
        hi: 'इंस्टेंट कट मैचिंग',
        te: 'తక్షణ కట్ మ్యాచింగ్',
        ml: 'ഇൻസ്റ്റന്റ് സ്റ്റൈൽ',
        kn: 'ತಕ್ಷಣದ ಕಟ್ ಮ್ಯಾಚಿಂಗ್',
      },
    },
    {
      id: 'menswear',
      badge: {
        en: "✦ MEN'S ETHNIC & ROYAL SUITS",
        ta: '✦ ஆண்களுக்கான குர்தா & ஷெர்வானி ட்ரை-ஆன்',
        hi: '✦ पुरुषों के लिए शेरवानी और कुर्ता ट्राई-ऑन',
        te: '✦ పురుషుల షేర్వానీ & కుర్తా ట్రై-ఆన్',
        ml: '✦ പുരുഷന്മാർക്കുള്ള ഷെർവാണി ട്രൈ-ഓൺ',
        kn: '✦ ಪುರುಷರ ಶೇರ್ವಾನಿ ಮತ್ತು ಕುರ್ತಾ ಟ್ರೈ-ಆನ್',
      },
      headlineLine1: {
        en: 'Find Your Royal Fit In',
        ta: 'கம்பீரமான திருமண',
        hi: 'शाही शादी शेरवानी और',
        te: 'గ్రాండ్ వెడ్డింగ్ షేర్వానీ',
        ml: 'വിവാഹ ഷെർവാണിയിലും',
        kn: 'ರಾಯಲ್ ವೆಡ್ಡಿಂಗ್ ಶೇರ್ವಾನಿ',
      },
      headlineLine2: {
        en: 'Kurtas & Sherwanis',
        ta: 'குர்தா & ஷெர்வானிகளில்',
        hi: 'कुर्ते में शाही अंदाज',
        te: 'కుర్తాలలో మీ రాయల్ లుక్',
        ml: 'കുർത്തയിലും രാജകീയ ലുക്ക്',
        kn: 'ಕುರ್ತಾಗಳಲ್ಲಿ ರಾಯಲ್ ಲುಕ್',
      },
      headlineHighlight: {
        en: 'Royally',
        ta: 'கம்பீரமாக',
        hi: 'राजसी ठाठ',
        te: 'రాయల్ గా',
        ml: 'ഗംഭീരമായി',
        kn: 'ರಾಜಗಾಂಭೀರ್ಯವಾಗಿ',
      },
      subtext: {
        en: 'Grooms and festive shoppers try grand wedding sherwanis, bandhgalas, blazers, and dhotis in showroom quality in 5 seconds.',
        ta: 'திருமண ஷெர்வானி, பந்த்கலா, பிளேசர் மற்றும் வேட்டி சட்டைகளை ஒரே நொடியில் அணிந்து பார்த்து விரைவாக வாங்கலாம்.',
        hi: 'दूल्हे और खरीदार शादी की शेरवानी, बंदगला, ब्लेज़र और कुर्ते को शोरूम में 5 सेकंड में ट्राई कर सकते हैं।',
        te: 'పెళ్లికొడుకులు గ్రాండ్ షేర్వానీలు, బ్లేజర్లు మరియు కుర్తాలను క్షణాల్లో ట్రై చేసుకోవచ్చు.',
        ml: 'വിവാഹ ഷെർവാണികളും ബ്ലേസറുകളും കുർത്തകളും ഏതാനും നിമിഷങ്ങൾക്കുള്ളിൽ ധരിച്ചുനോക്കാം.',
        kn: 'ಮದುಮಗನ ಶೇರ್ವಾನಿ, ಬ್ಲೇಜರ್ ಮತ್ತು ಕುರ್ತಾಗಳನ್ನು ಕೆಲವೇ ಸೆಕೆಂಡುಗಳಲ್ಲಿ ಟ್ರೈ ಮಾಡಿ ಆಯ್ಕೆ ಮಾಡಿ.',
      },
      categoryTag: {
        en: "Men's Sherwanis",
        ta: 'ஆண்கள் ஷெர்வானி',
        hi: 'मेंस शेरवानी',
        te: 'పురుషుల షేర్వానీ',
        ml: 'മെൻസ് ഷെർവാണി',
        kn: 'ಪುರುಷರ ಶೇರ್ವಾನಿ',
      },
      pillIcon: '👑',
      pillText: {
        en: 'Royal Groom Fit',
        ta: 'மாப்பிள்ளைக்கான கம்பீரம்',
        hi: 'रॉयल ग्रूम फिट',
        te: 'రాయల్ గ్రూమ్ ఫిట్',
        ml: 'റോയൽ ഗ്രൂം ഫിറ്റ്',
        kn: 'ರಾಯಲ್ ಗ್ರೂಮ್ ಫಿಟ್',
      },
      accentColor: '#ffd700',
      imageDark: 'assets/images/hero_model_men.jpg',
      imageLight: 'assets/images/hero_model_men.jpg',
      statsPill: {
        en: '3.2x Groom Sales',
        ta: '3.2 மடங்கு விற்பனை',
        hi: '3.2 गुना ज्यादा बिक्री',
        te: '3.2 రెట్ల అమ్మకాలు',
        ml: '3.2 മടങ്ങ് വിൽപ്പന',
        kn: '3.2 ಪಟ್ಟು ಹೆಚ್ಚು ಮಾರಾಟ',
      },
    },
    {
      id: 'bridal',
      badge: {
        en: '✦ BRIDAL & CELEBRATION LEHENGAS',
        ta: '✦ திருமண மணப்பெண் லெஹங்கா ஆடைகள்',
        hi: '✦ ब्राइडल और पार्टी वियर लहंगा',
        te: '✦ బ్రైడల్ లెహంగా ట్రై-ఆన్',
        ml: '✦ ബ്രൈഡൽ ലെഹംഗ ട്രൈ-ഓൺ',
        kn: '✦ ಬ್ರೈಡಲ್ ಲೆಹೆಂಗಾ ಟ್ರೈ-ಆನ್',
      },
      headlineLine1: {
        en: 'Dazzle In Grand',
        ta: 'பிரம்மாண்ட திருமண',
        hi: 'शाही शादी के',
        te: 'అద్భుతమైన బ్రైడల్',
        ml: 'മനോഹരമായ ബ്രൈഡൽ',
        kn: 'ಅದ್ಭುತವಾದ ಬ್ರೈಡಲ್',
      },
      headlineLine2: {
        en: 'Bridal Lehengas',
        ta: 'மணப்பெண் லெஹங்காக்களில்',
        hi: 'लहंगे में चमकें',
        te: 'లెహంగాలలో మెరవండి',
        ml: 'ലെഹംഗകളിൽ തിളങ്ങൂ',
        kn: 'ಲೆಹೆಂಗಾಗಳಲ್ಲಿ ಮಿಂಚಿ',
      },
      headlineHighlight: {
        en: 'Elegantly',
        ta: 'அழகாக',
        hi: 'शानदार',
        te: 'రాచరికంతో',
        ml: 'അതിമനോഹരമായി',
        kn: 'ರಾಜವೈಭವದಿಂದ',
      },
      subtext: {
        en: 'Experience heavy zardozi embroidery, rich flare pleats, and regal borders visualized with true-to-life cloth drape physics.',
        ta: 'ஜர்தோசி வேலைப்பாடு மற்றும் பிரம்மாண்ட எம்பிராய்டரி லெஹங்கா ஆடைகளை துல்லியமான வண்ணங்களில் அனுபவியுங்கள்.',
        hi: 'जरदोजी और कशीदाकारी लहंगे के घेरे को वास्तविक कपड़े की तरह स्क्रीन पर देखें।',
        te: 'జరి వర్క్ మరియు ఎంబ్రాయిడరీ లెహంగాల రియల్ లుక్ ని స్క్రీన్ పైనే అనుభవించండి.',
        ml: 'ഹെവി സർദോസി വർക്കുകളും ലെഹംഗകളും തത്സമയം ധരിച്ചുനോക്കി ആസ്വദിക്കൂ.',
        kn: 'ಜರ್ದೋಸಿ ಮತ್ತು ಎಂಬ್ರಾಯ್ಡರಿ ಲೆಹೆಂಗಾಗಳ ನೈಜ ನೋಟವನ್ನು ಸ್ಕ್ರೀನ್ ಮೇಲೆಯೇ ನೋಡಿ.',
      },
      categoryTag: {
        en: 'Bridal Lehengas',
        ta: 'மணப்பெண் லெஹங்கா',
        hi: 'ब्राइडल लहंगा',
        te: 'బ్రైడల్ లెహంగా',
        ml: 'ബ്രൈഡൽ ലെഹംഗ',
        kn: 'ಬ್ರೈಡಲ್ ಲೆಹೆಂಗಾ',
      },
      pillIcon: '💎',
      pillText: {
        en: 'Zari Embroidery Shine',
        ta: 'ஜரிகை பிரகாசம்',
        hi: 'जरी की असली चमक',
        te: 'జరి మెరుపు',
        ml: 'സരി തിളക്കം',
        kn: 'ಜರಿ ಹೊಳಪು',
      },
      accentColor: '#7c4dff',
      imageDark: 'assets/images/col_bridal.png',
      imageLight: 'assets/images/col_bridal.png',
      statsPill: {
        en: 'True Fabric Physics',
        ta: 'துல்லிய துணி தரம்',
        hi: 'सच्चा फैब्रिक अनुभव',
        te: 'నిజమైన ఫ్యాబ్రిక్',
        ml: 'യഥാർത്ഥ തുണി അനുഭവം',
        kn: 'ನಿಜವಾದ ಬಟ್ಟೆಯ ಅನುಭವ',
      },
    },
  ];

  currentSlideIndex = signal<number>(0);
  isAutoSlidePaused = signal<boolean>(false);
  slideProgress = signal<number>(0); // 0 to 100%
  currentSlide = computed(() => this.heroSlides[this.currentSlideIndex()]);

  private slideTimer: any = null;
  private progressTimer: any = null;
  private readonly SLIDE_DURATION_MS = 4800;

  // =========================================================================
  // INTERACTIVE AI TRY-ON BEFORE/AFTER COMPARISON (MEN & WOMEN)
  // =========================================================================
  comparePosition = signal<number>(50); // percentage 0 - 100
  activeCompareGarment = signal<'saree' | 'salwar' | 'sherwani'>('saree');

  compareOutfits = {
    saree: {
      name: {
        en: 'Royal Crimson Kanchipuram Silk Saree',
        ta: 'அரக்கு பட்டுப் புடவை',
        hi: 'शाही क्रिमसन कांजीवरम सिल्क साड़ी',
        te: 'రాయల్ కాంచీపురం పట్టు శారీ',
        ml: 'റോയൽ കാഞ്ചീപുരം പട്ടുസാരി',
        kn: 'ರಾಯಲ್ ಕಾಂಚೀಪುರಂ ರೇಷ್ಮೆ ಸೀರೆ',
      },
      category: "Women's Silk Saree",
      beforeImg: 'assets/images/step_01.png',
      afterImg: 'assets/images/hero_model_dark.png',
      fitTime: '4.8s AI Drape',
    },
    salwar: {
      name: {
        en: 'Emerald Green Designer Anarkali Suit',
        ta: 'பச்சை அனார்கலி சுடிதார்',
        hi: 'एमराल्ड ग्रीन डिज़ाइनर अनारकली सूट',
        te: 'ఎమరాల్డ్ గ్రీన్ అనార్కలి సూట్',
        ml: 'എമറാൾഡ് ഗ്രീൻ അനാർക്കലി സ്യൂട്ട്',
        kn: 'ಎಮರಾಲ್ಡ್ ಗ್ರೀನ್ ಅನಾರ್ಕಲಿ ಸೂಟ್',
      },
      category: 'Salwar & Anarkali',
      beforeImg: 'assets/images/step_01.png',
      afterImg: 'assets/images/hero_model_salwar.jpg',
      fitTime: '4.2s AI Fit',
    },
    sherwani: {
      name: {
        en: 'Royal Blue Velvet & Silk Wedding Sherwani',
        ta: 'ராஜ நீல பட்டு ஷெர்வானி',
        hi: 'रॉयल ब्लू वेलवेट शादी की शेरवानी',
        te: 'రాయల్ బ్లూ వెల్వెట్ వెడ్డింగ్ షేర్వానీ',
        ml: 'റോയൽ ബ്ലൂ വെൽവെറ്റ് വെഡ്ഡിംഗ് ഷെർവാണി',
        kn: 'ರಾಯಲ್ ಬ್ಲೂ ವೆಲ್ವೆಟ್ ವೆಡ್ಡಿಂಗ್ ಶೇರ್ವಾನಿ',
      },
      category: "Men's Royal Ethnic",
      beforeImg: 'assets/images/person_male_before.jpg', // Genuine casual man photo!
      afterImg: 'assets/images/hero_model_men.jpg', // AI transformed into royal wedding sherwani!
      fitTime: '5.1s AI Tailoring',
    },
  };

  activeCompareData = computed(() => this.compareOutfits[this.activeCompareGarment()]);

  // =========================================================================
  // COLLECTIONS (BALANCED GENTS, LADIES & BRIDAL)
  // =========================================================================
  activeCategory = signal<'all' | 'women' | 'men' | 'bridal'>('all');

  allCollections: CollectionItem[] = [
    {
      id: 'col-kanchi',
      name: {
        en: 'Kanchipuram Silk Saree',
        ta: 'காஞ்சிபுரம் பட்டுப் புடவை',
        hi: 'कांजीवरम सिल्क साड़ी',
        te: 'కాంచీపురం పట్టు శారీ',
        ml: 'കാഞ്ചീപുരം പട്ടുസാരി',
        kn: 'ಕಾಂಚೀಪುರಂ ರೇಷ್ಮೆ ಸೀರೆ',
      },
      category: 'women',
      categoryLabel: {
        en: "Women's Saree",
        ta: 'புடவை',
        hi: 'साड़ी',
        te: 'శారీ',
        ml: 'സാരി',
        kn: 'ಸೀರೆ',
      },
      image: 'assets/images/col_kanchipuram.png',
      tag: {
        en: 'Pure Zari Silk',
        ta: 'பட்டு ஜரிகை',
        hi: 'शुद्ध जरी',
        te: 'ప్యూర్ జరి',
        ml: 'ശുദ്ധമായ സരി',
        kn: 'ಶುದ್ಧ ಜರಿ',
      },
    },
    {
      id: 'col-sherwani-men',
      name: {
        en: 'Royal Groom Sherwani',
        ta: 'ராஜ கம்பீர ஷெர்வானி',
        hi: 'रॉयल ग्रूम शेरवानी',
        te: 'రాయల్ వెడ్డింగ్ షేర్వానీ',
        ml: 'റോയൽ ഷെർവാണി',
        kn: 'ರಾಯಲ್ ಶೇರ್ವಾನಿ',
      },
      category: 'men',
      categoryLabel: {
        en: "Men's Ethnic",
        ta: 'ஆண்கள் ஆடை',
        hi: 'मेंस एथनिक',
        te: 'పురుషుల డ్రెస్',
        ml: 'മെൻസ് വെയർ',
        kn: 'ಪುರುಷರ ಉಡುಪು',
      },
      image: 'assets/images/hero_model_men.jpg',
      tag: {
        en: 'Raw Silk & Zari',
        ta: 'பட்டு & ஜரிகை',
        hi: 'सिल्क व जरी',
        te: 'సిల్క్ జరి',
        ml: 'സിൽക്ക് സരി',
        kn: 'ರೇಷ್ಮೆ ಜರಿ',
      },
    },
    {
      id: 'col-salwar-emerald',
      name: {
        en: 'Emerald Designer Anarkali',
        ta: 'அனார்கலி சுடிதார்',
        hi: 'अनारकली सलवार सूट',
        te: 'అనార్కలి సల్వార్',
        ml: 'അനാർക്കലി സൽവാർ',
        kn: 'ಅನಾರ್ಕಲಿ ಸಲ್ವಾರ್',
      },
      category: 'women',
      categoryLabel: {
        en: 'Salwar & Suits',
        ta: 'சுடிதார்',
        hi: 'सलवार सूट',
        te: 'సల్వార్ సూట్',
        ml: 'സൽവാർ സ്യൂട്ട്',
        kn: 'ಸಲ್ವಾರ್ ಸೂಟ್',
      },
      image: 'assets/images/hero_model_salwar.jpg',
      tag: {
        en: 'Chiffon & Georgette',
        ta: 'ஜார்ஜெட் துணி',
        hi: 'जॉर्जेट फैब्रिक',
        te: 'జార్జెట్',
        ml: 'ജോർജറ്റ്',
        kn: 'ಜಾರ್ಜೆಟ್',
      },
    },
    {
      id: 'col-bridal-lehenga',
      name: {
        en: 'Royal Bridal Lehenga',
        ta: 'மணப்பெண் லெஹங்கா',
        hi: 'रॉयल ब्राइडल लहंगा',
        te: 'రాయల్ బ్రైడల్ లెహంగా',
        ml: 'ബ്രൈഡൽ ലെഹംഗ',
        kn: 'ಬ್ರೈಡಲ್ ಲೆಹೆಂಗಾ',
      },
      category: 'bridal',
      categoryLabel: {
        en: 'Bridal & Festive',
        ta: 'திருமண ஆடை',
        hi: 'ब्राइडल वियर',
        te: 'వెడ్డింగ్ వస్త్రం',
        ml: 'വിവാഹ വസ്ത്രം',
        kn: 'ಮದುವೆಯ ಉಡುಪು',
      },
      image: 'assets/images/col_bridal.png',
      tag: {
        en: 'Zardozi Handwork',
        ta: 'ஜர்தோசி வேலைப்பாடு',
        hi: 'जरदोजी काम',
        te: 'జర్దోజీ వర్క్',
        ml: 'സർദോസി വർക്ക്',
        kn: 'ಜರ್ದೋಜಿ ಕೆಲಸ',
      },
    },
    {
      id: 'col-banarasi',
      name: {
        en: 'Banarasi Heritage Weave',
        ta: 'பனாரசி புடவை',
        hi: 'बनारसी साड़ी',
        te: 'బనారసి శారీ',
        ml: 'ബനാറസി സാരി',
        kn: 'ಬನಾರಸಿ ಸೀರೆ',
      },
      category: 'women',
      categoryLabel: {
        en: "Women's Saree",
        ta: 'புடவை',
        hi: 'साड़ी',
        te: 'శారీ',
        ml: 'സാരി',
        kn: 'ಸೀರೆ',
      },
      image: 'assets/images/col_banarasi.png',
      tag: {
        en: 'Brocade Motif',
        ta: 'புரோகேட் நெசவு',
        hi: 'ब्रोकेड बुनाई',
        te: 'బ్రొకేడ్',
        ml: 'ബ്രോക്കേഡ്',
        kn: 'ಬ್ರೊಕೇಡ್',
      },
    },
    {
      id: 'col-mens-kurta',
      name: {
        en: 'Festive Silk Kurta Set',
        ta: 'பட்டு குர்தா செட்',
        hi: 'सिल्क कुर्ता पायजामा',
        te: 'సిల్క్ కుర్తా సెట్',
        ml: 'സിൽക്ക് കുർത്ത സെറ്റ്',
        kn: 'ರೇಷ್ಮೆ ಕುರ್ತಾ ಸೆಟ್',
      },
      category: 'men',
      categoryLabel: {
        en: "Men's Formal",
        ta: 'ஆண்கள் ஆடை',
        hi: 'मेंस कुर्ता',
        te: 'పురుషుల కుర్తా',
        ml: 'മെൻസ് കുർത്ത',
        kn: 'ಪುರುಷರ ಕುರ್ತಾ',
      },
      image: 'assets/images/col_designer.png',
      tag: {
        en: 'Jacquard Silk',
        ta: 'ஜாக்கார்ட் பட்டு',
        hi: 'जैकவார்ட் सिल्क',
        te: 'జాక్వార్డ్ సిల్క్',
        ml: 'ജാക്കാർഡ് സിൽക്ക്',
        kn: 'ಜಾಕ್ವಾರ್ಡ್ ರೇಷ್ಮೆ',
      },
    },
    {
      id: 'col-partywear-gown',
      name: {
        en: 'Contemporary Designer Gown',
        ta: 'டிசைனர் கவுன்',
        hi: 'डिज़ाइनर पार्टी गाउन',
        te: 'డిజైనర్ గౌన్',
        ml: 'ഡിസൈനർ ഗൗൺ',
        kn: 'ಡಿಸೈನರ್ ಗೌನ್',
      },
      category: 'bridal',
      categoryLabel: {
        en: 'Festive Western',
        ta: 'பார்ட்டி ஆடை',
        hi: 'पार्टी वियर',
        te: 'పార్టీ వేర్',
        ml: 'പാർട്ടി വെയർ',
        kn: 'ಪಾರ್ಟಿ ವೇರ್',
      },
      image: 'assets/images/col_partywear.png',
      tag: {
        en: 'Modern Fusion',
        ta: 'மாடர்ன் பியூஷன்',
        hi: 'मॉडर्न फ्यूजन',
        te: 'మోడరన్ ఫ్యూజన్',
        ml: 'മോഡേൺ ഫ്യൂഷൻ',
        kn: 'ಮಾಡರ್ನ್ ಫ್ಯೂಷನ್',
      },
    },
    {
      id: 'col-pastel-organza',
      name: {
        en: 'Pastel Organza Saree',
        ta: 'ஆர்கன்சா புடவை',
        hi: 'पेस्टल ऑर्गेन्ज़ा साड़ी',
        te: 'ఆర్గాన్జా శారీ',
        ml: 'ഓർഗൻസ സാരി',
        kn: 'ಆರ್ಗನ್ಜಾ ಸೀರೆ',
      },
      category: 'women',
      categoryLabel: {
        en: "Women's Saree",
        ta: 'புடவை',
        hi: 'साड़ी',
        te: 'శారీ',
        ml: 'സാരി',
        kn: 'ಸೀರೆ',
      },
      image: 'assets/images/col_pastel.png',
      tag: {
        en: 'Lightweight Drape',
        ta: 'மெல்லிய பட்டு',
        hi: 'हल्का कपड़ा',
        te: 'లైట్‌వెయిట్',
        ml: 'ലൈറ്റ്‌വെയ്റ്റ്',
        kn: 'ಲೈಟ್‌ವೇಟ್',
      },
    },
  ];

  filteredCollections = computed(() => {
    const cat = this.activeCategory();
    if (cat === 'all') return this.allCollections;
    return this.allCollections.filter((c) => c.category === cat);
  });

  // Touch Swipe coordinates
  private touchStartX = 0;
  private touchEndX = 0;

  @HostListener('window:scroll')
  onWindowScroll() {
    if (typeof window !== 'undefined') {
      const scrollY = window.scrollY || window.pageYOffset || 0;
      this.showScrollTop.set(scrollY > 350);
      this.isScrolled.set(scrollY > 15);
    }
  }

  ngOnInit() {
    // Theme preference
    try {
      const savedTheme = localStorage.getItem('nexooai_public_theme');
      if (savedTheme) {
        this.isDarkMode.set(savedTheme === 'dark');
      }
    } catch {
      this.isDarkMode.set(true);
    }

    // Language preference
    try {
      const savedLang = localStorage.getItem('nexooai_public_lang') as LanguageCode;
      if (savedLang && this.languages.some((l) => l.code === savedLang)) {
        this.currentLang.set(savedLang);
      }
    } catch {
      this.currentLang.set('en');
    }

    this.startAutoSlide();

    // Load Super Admin Feature Visibility Flags
    this.http.get<any>('/api/v1/admin/features-public').subscribe({
      next: (features) => {
        if (features) {
          if (features.feature_home_pricing !== undefined) {
            this.showPricingSection.set(features.feature_home_pricing);
          }
          if (features.feature_home_demo !== undefined) {
            this.showWebDemoSection.set(features.feature_home_demo);
          }
          if (features.feature_home_roi !== undefined) {
            this.showRoiSection.set(features.feature_home_roi);
          }
          if (features.feature_home_testimonials !== undefined) {
            this.showTestimonialsSection.set(features.feature_home_testimonials);
          }
        }
      },
      error: () => {}
    });
  }

  ngOnDestroy() {
    this.stopAutoSlide();
  }

  // =========================================================================
  // CAROUSEL & LOADING PROGRESS BAR
  // =========================================================================
  startAutoSlide() {
    this.stopAutoSlide();
    this.slideProgress.set(0);

    const stepInterval = 48; // Update progress bar every 48ms
    const stepIncrement = (stepInterval / this.SLIDE_DURATION_MS) * 100;

    this.ngZone.runOutsideAngular(() => {
      this.progressTimer = setInterval(() => {
        if (!this.isAutoSlidePaused()) {
          this.ngZone.run(() => {
            const current = this.slideProgress();
            if (current >= 100) {
              this.slideProgress.set(0);
              this.nextSlide();
            } else {
              this.slideProgress.set(current + stepIncrement);
            }
          });
        }
      }, stepInterval);
    });
  }

  stopAutoSlide() {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
    if (this.slideTimer) {
      clearInterval(this.slideTimer);
      this.slideTimer = null;
    }
  }

  pauseAutoSlide() {
    this.isAutoSlidePaused.set(true);
  }

  resumeAutoSlide() {
    this.isAutoSlidePaused.set(false);
  }

  goToSlide(index: number) {
    if (index >= 0 && index < this.heroSlides.length) {
      this.currentSlideIndex.set(index);
      this.slideProgress.set(0);
    }
  }

  nextSlide() {
    const next = (this.currentSlideIndex() + 1) % this.heroSlides.length;
    this.currentSlideIndex.set(next);
    this.slideProgress.set(0);
  }

  prevSlide() {
    const prev =
      (this.currentSlideIndex() - 1 + this.heroSlides.length) % this.heroSlides.length;
    this.currentSlideIndex.set(prev);
    this.slideProgress.set(0);
  }

  onTouchStart(e: TouchEvent) {
    this.touchStartX = e.changedTouches[0].screenX;
  }

  onTouchEnd(e: TouchEvent) {
    this.touchEndX = e.changedTouches[0].screenX;
    const diff = this.touchStartX - this.touchEndX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        this.nextSlide();
      } else {
        this.prevSlide();
      }
    }
  }

  // =========================================================================
  // LANGUAGE SWITCHER
  // =========================================================================
  
  toggleLangDropdown(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.showLangDropdown.update((v) => !v);
  }

  selectLanguageAndClose(lang: LanguageCode) {
    this.setLanguage(lang);
    this.showLangDropdown.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target && !target.closest('.lang-pill-container')) {
      this.showLangDropdown.set(false);
    }
  }

  setLanguage(lang: LanguageCode) {
    this.currentLang.set(lang);
    try {
      localStorage.setItem('nexooai_public_lang', lang);
    } catch {
      // ignore
    }
  }

  // =========================================================================
  // SMOOTH SCROLLING
  // =========================================================================
  isMobileNavOpen = signal<boolean>(false);

  toggleMobileNav(): void {
    this.isMobileNavOpen.update((v) => !v);
  }

  closeMobileNav(): void {
    this.isMobileNavOpen.set(false);
  }

  scrollToSection(sectionId: string, event?: Event) {
    if (event) {
      event.preventDefault();
    }
    this.closeMobileNav();
    if (typeof document !== 'undefined') {
      const target = document.getElementById(sectionId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  scrollToTop() {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  toggleContactHub() {
    this.showContactHub.update((v) => !v);
  }

  // =========================================================================
  // BEFORE/AFTER SLIDER LOGIC
  // =========================================================================
  onCompareSliderChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input) {
      this.comparePosition.set(Number(input.value));
    }
  }

  setCompareOutfit(outfit: 'saree' | 'salwar' | 'sherwani') {
    this.activeCompareGarment.set(outfit);
  }

  // =========================================================================
  // COLLECTIONS FILTER
  // =========================================================================
  setCategory(category: 'all' | 'women' | 'men' | 'bridal') {
    this.activeCategory.set(category);
  }

  // =========================================================================
  // THEME & DEMO MODAL
  // =========================================================================
  toggleTheme() {
    this.isDarkMode.update((v) => !v);
    try {
      localStorage.setItem('nexooai_public_theme', this.isDarkMode() ? 'dark' : 'light');
    } catch {
      // ignore
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
    if (!this.demoForm.phone.trim() || !this.demoForm.showroomName.trim()) {
      return;
    }

    const leadId = 'NX-' + Math.floor(100000 + Math.random() * 900000);
    this.confirmedLeadId.set(leadId);

    const leadRecord: DemoLeadRecord = {
      id: leadId,
      showroomName: this.demoForm.showroomName,
      contactPerson: this.demoForm.contactPerson || 'Showroom Owner',
      phone: this.demoForm.phone,
      city: this.demoForm.city,
      timestamp: new Date().toISOString(),
    };

    // Store in localStorage
    try {
      const existingRaw = localStorage.getItem('nexooai_demo_leads');
      const leads = existingRaw ? JSON.parse(existingRaw) : [];
      leads.push(leadRecord);
      localStorage.setItem('nexooai_demo_leads', JSON.stringify(leads));
    } catch {
      // ignore in test / restricted mode
    }

    const payload = {
      name: this.demoForm.contactPerson || 'Showroom Owner',
      email: `${this.demoForm.phone.replace(/[^0-9]/g, '') || 'client'}@showroom.nexooai.in`,
      phone: this.demoForm.phone,
      showroom_name: this.demoForm.showroomName,
      city: this.demoForm.city || 'Chennai',
      estimated_kiosks: 1,
      message: `Enterprise showroom demo requested from public showcase portal. City: ${this.demoForm.city || 'Chennai'}`
    };

    this.http.post<any>('/api/v1/public/contact-sales', payload).subscribe({
      next: (res) => {
        if (res?.inquiry_id) {
          this.confirmedLeadId.set(res.inquiry_id);
        }
      },
      error: () => {}
    });

    this.demoSubmitted.set(true);
    setTimeout(() => {
      this.showDemoModal.set(false);
      this.demoSubmitted.set(false);
      this.demoForm = {
        showroomName: '',
        contactPerson: '',
        phone: '',
        city: 'Chennai',
      };
    }, 2800);
  }
}
