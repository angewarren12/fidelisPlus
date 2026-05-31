import { Injectable } from '@angular/core';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { AuthService } from './auth.service';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../environments/environment';

declare global {
  interface Window {
    Pusher: any;
  }
}

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private echo?: Echo<any>;
  private started = false;

  readonly unreadCount$ = new BehaviorSubject<number>(0);

  constructor(private auth: AuthService) {
    window.Pusher = Pusher;
  }

  start(): void {
    if (this.started) return;
    // En développement local, on évite les erreurs console si le serveur websocket n'est pas lancé.
    if (!environment.production) return;

    const token = this.auth.getToken();
    const user = this.auth.getCurrentUser();
    if (!token || !user) return;

    this.echo = new Echo({
      broadcaster: 'pusher',
      key: environment.pusher.key,
      cluster: environment.pusher.cluster,
      wsHost: environment.pusher.host,
      wsPort: environment.pusher.port,
      wssPort: environment.pusher.port,
      forceTLS: environment.pusher.scheme === 'https',
      enabledTransports: ['ws', 'wss'],
      authorizer: (channel: any) => {
        return {
          authorize: async (socketId: string, callback: Function) => {
            try {
              const url = environment.apiUrl + '/broadcasting/auth';

              const resp = await fetch(url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                  socket_id: socketId,
                  channel_name: channel.name
                })
              });

              if (!resp.ok) {
                callback(true, { status: resp.status });
                return;
              }

              const data = await resp.json();
              callback(null, data);
            } catch (e) {
              callback(true, e);
            }
          }
        };
      }
    });

    this.started = true;

    // Notifications temps réel → badge
    this.echo
      .private(`user.${user.id}`)
      .listen('.NotificationCreated', () => this.unreadCount$.next(this.unreadCount$.value + 1));
  }

  stop(): void {
    this.echo?.disconnect();
    this.echo = undefined;
    this.started = false;
    this.unreadCount$.next(0);
  }
}

