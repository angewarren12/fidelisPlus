import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';

/** Affiche un message clair sur les refus d'accès API (403). */
export const forbiddenInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 403) {
        const apiMessage =
          typeof error.error === 'object' && error.error !== null && 'message' in error.error
            ? String((error.error as { message: string }).message)
            : null;
        toast.error(apiMessage || 'Accès refusé. Votre rôle ne permet pas cette action.');
      }
      return throwError(() => error);
    })
  );
};
