import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { jwtInterceptor } from './interceptors/jwt.interceptor';
import { authErrorInterceptor } from './interceptors/auth-error.interceptor';
import { forbiddenInterceptor } from './interceptors/forbidden.interceptor';
import { errorToastInterceptor } from './interceptors/error-toast.interceptor';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(
      // Ordre important : jwt d'abord (ajoute le token), puis gestion des erreurs.
      // errorToastInterceptor en dernier pour intercepter après les autres.
      withInterceptors([jwtInterceptor, authErrorInterceptor, forbiddenInterceptor, errorToastInterceptor])
    ),
    provideCharts(withDefaultRegisterables())
  ]
};

