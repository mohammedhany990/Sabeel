import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { Api } from './api';
import { Auth } from './auth';

export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);
  return auth.ensureUser().pipe(
    map((ok) => (ok ? true : router.createUrlTree(['/login']))),
    catchError(() => of(router.createUrlTree(['/login'])))
  );
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);
  return auth.isLoggedIn() ? router.createUrlTree(['/app/dashboard']) : true;
};

export const verseRedirectGuard: CanActivateFn = (route) => {
  const api = inject(Api);
  const router = inject(Router);
  if (route.queryParamMap.get('view') === 'verse') return true;
  const id = Number(route.paramMap.get('id'));
  const ayah = route.queryParamMap.get('ayah');
  return api.surahs().pipe(
    map((list) => {
      const s = list.find((x) => x.id === id);
      if (ayah && /^\d+$/.test(ayah)) return router.createUrlTree(['/app/mushaf'], { queryParams: { ayah: id + ':' + ayah } });
      return s?.startPage ? router.createUrlTree(['/app/mushaf'], { queryParams: { page: s.startPage } }) : true;
    }),
    catchError(() => of(true))
  );
};
