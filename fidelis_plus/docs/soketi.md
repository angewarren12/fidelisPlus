## Soketi (dev) + Laravel Broadcasting

### Démarrer Soketi

Depuis `fidelis_plus/`:

```bash
docker compose -f docker-compose.soketi.yml up -d
```

Soketi écoute par défaut sur:
- WebSocket: `ws://127.0.0.1:6001`
- Metrics: `http://127.0.0.1:9601`

### Variables `.env` (Laravel)

Ajoute/valide ces variables:

```env
BROADCAST_CONNECTION=pusher

PUSHER_APP_ID=fidelis
PUSHER_APP_KEY=local
PUSHER_APP_SECRET=local
PUSHER_HOST=127.0.0.1
PUSHER_PORT=6001
PUSHER_SCHEME=http
PUSHER_APP_CLUSTER=mt1
```

### Channels

- `private-user.{userId}` via `Echo.private('user.{userId}')`
- `private-company.{companyId}` via `Echo.private('company.{companyId}')`

