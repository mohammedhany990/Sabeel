import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { normalizeTheme } from './app/core/theme';

document.documentElement.setAttribute('data-theme', normalizeTheme(localStorage.getItem('sabeel.theme')));

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
