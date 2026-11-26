import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { Auth } from './auth';
import { I18n } from './i18n';

const ANONYMOUS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/forgot-password', '/auth/reset-password', '/auth/verify-email'];

function withToken(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const localized = req.clone({ setHeaders: { 'Accept-Language': inject(I18n).lang() } });
  if (ANONYMOUS.some((p) => req.url.includes(p))) return next(localized);
  return next(withToken(localized, auth.accessToken)).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401 || !auth.hasRefresh()) return throwError(() => err);
      return auth.refresh().pipe(
        switchMap((t) => next(withToken(localized, t.accessToken))),
        catchError((e) => {
          auth.clear();
          return throwError(() => e);
        })
      );
    })
  );
};
