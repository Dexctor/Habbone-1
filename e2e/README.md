# Tests e2e

Les tests Playwright couvrent les parcours publics par défaut et activent les parcours authentifiés uniquement si des identifiants de test sont fournis.

## Commandes

```bash
npm run test:e2e:install
npm run test:e2e
```

Par défaut, Playwright démarre `next dev` sur `127.0.0.1:3000`.

Variables utiles :

```bash
E2E_PORT=3001
E2E_BASE_URL=http://127.0.0.1:3001
E2E_WEB_SERVER_COMMAND="npm run dev -- --hostname 127.0.0.1 --port 3001"
E2E_SKIP_WEB_SERVER=1
```

## Parcours authentifiés

Ces tests sont ignorés tant que les variables suivantes ne sont pas définies :

```bash
E2E_USER_NICK=...
E2E_USER_PASSWORD=...
E2E_ADMIN_NICK=...
E2E_ADMIN_PASSWORD=...
```

Utiliser des comptes dédiés aux tests, sans privilèges inutiles. Le compte admin doit avoir accès à `/admin`.
