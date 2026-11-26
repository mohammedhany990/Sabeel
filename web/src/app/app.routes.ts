import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards';

export const routes: Routes = [
  { path: '', pathMatch: 'full', loadComponent: () => import('./pages/landing').then((m) => m.Landing) },
  { path: 'login', canActivate: [guestGuard], loadComponent: () => import('./pages/auth-pages').then((m) => m.LoginPage) },
  { path: 'register', canActivate: [guestGuard], loadComponent: () => import('./pages/auth-pages').then((m) => m.RegisterPage) },
  { path: 'forgot-password', loadComponent: () => import('./pages/auth-pages').then((m) => m.ForgotPage) },
  { path: 'reset-password', loadComponent: () => import('./pages/auth-pages').then((m) => m.ResetPage) },
  { path: 'verify-email', loadComponent: () => import('./pages/auth-pages').then((m) => m.VerifyPage) },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard').then((m) => m.Dashboard) },
      { path: 'quran', loadComponent: () => import('./pages/quran-index').then((m) => m.QuranIndex) },
      { path: 'quran/:id', loadComponent: () => import('./pages/quran-reader').then((m) => m.QuranReader) },
      { path: 'library', loadComponent: () => import('./pages/library').then((m) => m.Library) },
      { path: 'memorization', loadComponent: () => import('./pages/memorization').then((m) => m.Memorization) },
      { path: 'revision', loadComponent: () => import('./pages/revision').then((m) => m.Revision) },
      { path: 'recitation', loadComponent: () => import('./pages/recitation').then((m) => m.Recitation) },
      { path: 'prayer', loadComponent: () => import('./pages/prayer').then((m) => m.Prayer) },
      { path: 'azkar', loadComponent: () => import('./pages/azkar').then((m) => m.Azkar) },
      { path: 'courses', loadComponent: () => import('./pages/courses').then((m) => m.Courses) },
      { path: 'courses/:slug', loadComponent: () => import('./pages/course-detail').then((m) => m.CourseDetail) },
      { path: 'community', loadComponent: () => import('./pages/community').then((m) => m.Community) },
      { path: 'notifications', loadComponent: () => import('./pages/notifications').then((m) => m.Notifications) },
      { path: 'settings', loadComponent: () => import('./pages/settings').then((m) => m.Settings) }
    ]
  },
  { path: '**', redirectTo: '' }
];
