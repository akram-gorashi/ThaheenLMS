import { BreakpointObserver } from '@angular/cdk/layout';
import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs';

type SupportedLanguage = 'ar' | 'en';

function isSupportedLanguage(value: string | null): value is SupportedLanguage {
  return value === 'ar' || value === 'en';
}

@Component({
  selector: 'app-main-shell',
  standalone: true,
  imports: [
    MatButtonModule,
    MatMenuModule,
    MatSidenavModule,
    MatToolbarModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    TranslatePipe,
  ],
  templateUrl: './main-shell.html',
  styleUrl: './main-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainShellComponent implements OnInit {
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly document = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly translate = inject(TranslateService);
  readonly currentYear = new Date().getFullYear();
  readonly darkMode = signal(true);
  readonly currentLanguageKey = computed(() =>
    this.translate.currentLang() === 'en' ? 'PORTAL.LANGUAGE.ENGLISH' : 'PORTAL.LANGUAGE.ARABIC',
  );

  readonly isHandset = toSignal(
    this.breakpointObserver.observe('(max-width: 767px)').pipe(map((state) => state.matches)),
    { initialValue: false },
  );

  ngOnInit(): void {
    const savedLanguage =
      this.document.defaultView?.localStorage.getItem('thaheen.language') ?? null;
    this.setLanguage(isSupportedLanguage(savedLanguage) ? savedLanguage : 'ar');
    this.darkMode.set(this.document.defaultView?.localStorage.getItem('thaheen.theme') !== 'light');
    this.document.documentElement.classList.toggle('light-theme', !this.darkMode());
  }

  toggleTheme(): void {
    this.darkMode.update((isDark) => !isDark);
    this.document.documentElement.classList.toggle('light-theme', !this.darkMode());
    this.document.defaultView?.localStorage.setItem(
      'thaheen.theme',
      this.darkMode() ? 'dark' : 'light',
    );
  }

  setLanguage(language: SupportedLanguage): void {
    this.translate.use(language).subscribe(() => {
      const rootElement = this.document.documentElement;
      rootElement.lang = language;
      rootElement.dir = language === 'ar' ? 'rtl' : 'ltr';
      this.document.defaultView?.localStorage.setItem('thaheen.language', language);
      this.translate
        .get('PORTAL.APP_TITLE')
        .subscribe((pageTitle) => this.title.setTitle(pageTitle));
    });
  }
}
