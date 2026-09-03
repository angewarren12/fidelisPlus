import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ToastMessage {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  /** Durée d'affichage en ms. Par défaut : 4000 (erreurs : 6000). */
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastSubject = new Subject<ToastMessage>();
  toastState$ = this.toastSubject.asObservable();

  show(message: string, type: ToastMessage['type'] = 'info', duration?: number) {
    this.toastSubject.next({ message, type, duration });
  }

  success(message: string) {
    this.show(message, 'success', 4000);
  }

  /**
   * Affiche une erreur. Si le message contient des sauts de ligne (\n),
   * le toast affichera chaque ligne séparément (utile pour les 422 multi-champs).
   */
  error(message: string) {
    this.show(message, 'error', 6000);
  }

  warning(message: string) {
    this.show(message, 'warning', 5000);
  }

  info(message: string) {
    this.show(message, 'info', 4000);
  }
}
