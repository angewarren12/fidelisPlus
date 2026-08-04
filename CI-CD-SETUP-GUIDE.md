# Guide générique : mettre en place un CI/CD (GitHub Actions) sur un hébergement mutualisé

Ce guide documente une méthode complète et testée pour automatiser le
déploiement d'une application (Laravel ou autre) hébergée sur un hébergement
**mutualisé classique** (LWS, OVH, o2switch, etc.) — c'est-à-dire un
environnement **sans accès root, sans Docker, avec des restrictions
possibles** sur SSH et sur PHP. Il a été rédigé après une mise en place réelle
où plusieurs contraintes d'hébergement ont été découvertes en cours de route
(clé SSH refusée, SSH restreint au SFTP, `proc_open` désactivé) — chaque
contrainte a sa solution documentée ci-dessous.

**Donne ce document à un agent/développeur** avant de démarrer une mise en
place de CI/CD sur ce type d'hébergement : il évite de refaire tous les
allers-retours de diagnostic.

## 1. Avant de commencer : collecter les informations

Demande ces informations à l'utilisateur avant toute chose :

- [ ] Le projet est-il déjà un dépôt Git local (`ls .git`) ? Sinon `git init`.
- [ ] A-t-il déjà un compte GitHub/GitLab/Bitbucket ? Un dépôt existant pour
      ce projet ?
- [ ] Comment se connecte-t-il actuellement au serveur pour déployer
      (console web du panneau d'hébergement ? terminal SSH classique avec
      mot de passe ? clé SSH) ?
- [ ] Le déploiement doit-il être automatique à chaque push, ou nécessite-t-il
      une validation manuelle avant de toucher la prod (recommandé si
      l'application pilote quelque chose de sensible en production) ?
- [ ] Le dépôt sera-t-il privé ou public, sur un compte gratuit ou payant ?
      **Important** : GitHub n'autorise la protection "Required reviewers"
      sur un environnement que pour les dépôts **publics** ou les comptes
      **payants** (Pro/Team/Enterprise). Sur un dépôt privé + compte
      gratuit, cette fonctionnalité est absente de l'interface — prévoir la
      solution de repli dès le départ (section 5).

## 2. Étapes de mise en place (dans l'ordre)

### 2.1 Git local + dépôt distant
```bash
git init                      # si pas déjà fait
git add -A
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<user>/<repo>.git
git push -u origin main
```
Vérifie que `.gitignore` exclut déjà `vendor/`, `node_modules/`,
`.env*`, les dossiers de build (`public/build`, etc.) et tout dossier de
contenu utilisateur uploadé en prod (ex: `public/storage`). C'est essentiel
: le CI va reconstruire ces dossiers, ils ne doivent jamais être versionnés.

### 2.2 Déterminer l'adresse SSH réelle du serveur
Le nom affiché dans le prompt du terminal (`user@webXXXX`) n'est **pas**
forcément une adresse joignable depuis internet. Pour la trouver, exécute
**sur le serveur lui-même** :
```bash
curl -s https://api.ipify.org   # IP publique du serveur
```
C'est généralement la valeur la plus fiable à utiliser comme hôte SSH.

### 2.3 Tester l'authentification par clé SSH (à faire AVANT d'écrire le workflow)
```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f deploy_key -N ""
# Ajouter deploy_key.pub à ~/.ssh/authorized_keys sur le serveur
# (créer le dossier ~/.ssh avec chmod 700 s'il n'existe pas, chmod 600 sur authorized_keys)
ssh -i deploy_key -o IdentitiesOnly=yes user@host
```
- **Si ça connecte sans mot de passe** → parfait, utilise une clé dédiée
  (`webfactory/ssh-agent` dans le workflow). Plus sûr, révocable sans
  toucher au compte.
- **Si ça retombe sur une demande de mot de passe** → cet hébergeur
  n'accepte probablement pas l'authentification par clé du tout pour les
  connexions SSH externes (fréquent sur le low-cost). Passe directement à
  l'authentification par mot de passe (`sshpass`), inutile d'insister.

### 2.4 Tester si l'exécution de commandes à distance fonctionne
```bash
ssh user@host 'echo test'
```
- **Si ça répond `test`** → l'exécution de commandes marche, tu peux faire
  un déploiement classique (upload + `ssh` pour lancer `migrate`/cache/etc.).
- **Si tu obtiens `This service allows sftp connections only.`** → seul le
  transfert de fichiers est autorisé, **aucune commande à distance n'est
  possible**, même pas `tar -xzf`. Il faut :
  - Transférer les fichiers **déjà décompressés** via SFTP pur (`lftp
    mirror`), pas une archive à extraire à distance.
  - Remplacer tout ce qui devait s'exécuter via SSH (migrations, cache,
    éventuellement `composer install`) par un **webhook HTTP** appelé après
    le transfert (section 4).

### 2.5 Si un webhook PHP est nécessaire, tester `proc_open`
Avant de faire reposer le webhook sur `composer install`/toute commande
shell, vérifie que PHP peut lancer des sous-processus **depuis le contexte
web** (souvent désactivé par sécurité sur le mutualisé, indépendamment de ce
qui fonctionne en CLI/SSH) :
```php
// route de test temporaire
Route::get('/test-proc-open', fn () => response()->json(['proc_open' => function_exists('proc_open') && !in_array('proc_open', explode(',', ini_get('disable_functions')))]));
```
- **Si `proc_open` est désactivé** → le webhook ne peut lancer AUCUNE
  commande shell (`composer install` inclus). Il faut alors :
  - Transférer `vendor/` (et tout autre artefact généré) **déjà construit**
    via le même transfert de fichiers (SFTP), au lieu de le reconstruire
    côté serveur.
  - Le webhook se limite aux actions faisables en PHP pur, sans
    sous-processus : `Artisan::call('migrate', ['--force' => true])`,
    `Artisan::call('config:cache')`, etc. — ces appels **ne dépendent pas**
    de `proc_open`, ils s'exécutent dans le même process PHP.
  - Supprime la route de test une fois le diagnostic fait.

## 3. Template de workflow GitHub Actions (à adapter)

```yaml
name: Build & Deploy

on:
  push:
    branches: [main]
  workflow_dispatch: {}

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.3'   # <-- version exacte utilisee en prod
          coverage: none

      - name: Install PHP dependencies
        run: composer install --no-dev --optimize-autoloader --no-interaction

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install Node dependencies
        run: npm ci

      - name: Build front-end assets
        run: npm run build

      # IMPORTANT : ecrire l'archive HORS du dossier archive, sinon tar
      # detecte que le dossier "." change pendant qu'il le lit (le fichier
      # de sortie se cree dedans) et echoue avec "file changed as we read it".
      - name: Package artifact
        run: |
          tar -czf /tmp/release.tar.gz \
            --exclude='.git' \
            --exclude='.github' \
            --exclude='node_modules' \
            --exclude='storage/logs' \
            --exclude='storage/framework/cache' \
            --exclude='storage/framework/sessions' \
            --exclude='storage/framework/views' \
            --exclude='public/storage' \
            .
          mv /tmp/release.tar.gz release.tar.gz

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: release
          path: release.tar.gz
          retention-days: 3

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: production
    # Si "Required reviewers" n'est pas disponible (repo prive + compte
    # gratuit), ceci est la validation manuelle de repli : le job ne se
    # lance QUE sur declenchement manuel, jamais sur un simple push.
    if: github.event_name == 'workflow_dispatch'
    steps:
      - name: Download artifact
        uses: actions/download-artifact@v4
        with:
          name: release

      - name: Extract release locally
        run: mkdir release && tar -xzf release.tar.gz -C release

      - name: Install lftp
        run: sudo apt-get update && sudo apt-get install -y lftp

      # Transfert en SFTP pur -- fonctionne meme si l'hebergeur bloque toute
      # execution de commande a distance. Pas de --delete : ne supprime
      # jamais un fichier absent de l'archive (protege les dossiers de
      # contenu utilisateur non versionnes comme public/storage, .env, etc.)
      - name: Upload files via SFTP
        run: |
          lftp -u "${{ secrets.SSH_USER }},${{ secrets.SSH_PASSWORD }}" sftp://${{ secrets.SSH_HOST }} -e "
            set sftp:auto-confirm yes
            set net:max-retries 2
            mirror -R --parallel=4 --verbose release ${{ secrets.DEPLOY_PATH }}
            quit
          "

      # Si l'hebergeur permet l'execution de commandes via SSH, remplacer
      # cette etape par un appel ssh direct (migrate/cache). Sinon, webhook
      # protege par jeton (voir section 4).
      - name: Run post-deploy commands via webhook
        run: |
          http_code=$(curl -s -o response.json -w "%{http_code}" -X POST "${{ secrets.DEPLOY_HOOK_URL }}" \
            -H "X-Deploy-Token: ${{ secrets.DEPLOY_TOKEN }}")
          echo "HTTP status: $http_code"
          cat response.json
          echo
          if [ "$http_code" -ge 400 ]; then
            exit 1
          fi
```

**Secrets GitHub à créer** (Settings → Environments → `production` → "Add
environment secret", ou au niveau du dépôt si pas d'environnement) :

| Secret | Valeur |
|---|---|
| `SSH_HOST` | IP publique du serveur (voir 2.2) |
| `SSH_USER` | utilisateur SSH/SFTP |
| `SSH_PASSWORD` | mot de passe SSH/SFTP (si clé refusée, voir 2.3) |
| `DEPLOY_PATH` | chemin absolu du dossier de déploiement sur le serveur |
| `DEPLOY_HOOK_URL` | URL du webhook (si SSH command execution indisponible) |
| `DEPLOY_TOKEN` | jeton secret partagé avec le `.env` du serveur |

## 4. Webhook de déploiement (si SSH n'autorise que le SFTP)

Route (exemple Laravel), protégée par jeton, à exclure du CSRF :
```php
// routes/web.php
Route::post('/internal/deploy-hook', [DeployController::class, 'hook'])
    ->middleware('throttle:5,1');
```
```php
// app/Http/Controllers/DeployController.php
public function hook(Request $request)
{
    $token = $request->header('X-Deploy-Token');
    $expected = (string) config('app.deploy_token'); // env('DEPLOY_TOKEN')

    if (!$expected || !$token || !hash_equals($expected, (string) $token)) {
        abort(403);
    }

    Artisan::call('migrate', ['--force' => true]);
    Artisan::call('config:cache');
    Artisan::call('route:cache');
    Artisan::call('view:cache');

    return response()->json(['success' => true]);
}
```
Ajoute `DEPLOY_TOKEN=<valeur-longue-aleatoire>` dans le `.env` du serveur
(même valeur que le secret GitHub `DEPLOY_TOKEN`).

⚠️ **Amorçage requis une seule fois** : si le serveur a déjà un
`route:cache`/`config:cache` figé d'un déploiement manuel antérieur, la
toute première fois qu'on ajoute cette route/ce token, il faut lancer une
fois à la main sur le serveur (console web du panneau, ou SSH interactif
si disponible) :
```bash
php artisan config:clear && php artisan config:cache
php artisan route:clear && php artisan route:cache
```
Après ça, chaque futur appel du webhook se recache lui-même — plus besoin de
le refaire.

## 5. Validation manuelle du déploiement sans fonctionnalité payante

Si `Required reviewers` n'apparaît pas sur l'environnement GitHub (dépôt
privé + compte gratuit), la solution de repli déjà intégrée au template
(section 3) fonctionne aussi bien : le job `deploy` porte
`if: github.event_name == 'workflow_dispatch'`, donc un simple push ne
déclenche que `build` (vérifie que le code compile), et le déploiement réel
n'a lieu qu'en cliquant explicitement sur **"Run workflow"** dans l'onglet
Actions → choisir la branche → confirmer.

## 6. Pièges déjà rencontrés (checklist de dépannage rapide)

| Symptôme | Cause | Fix |
|---|---|---|
| `tar: .: file changed as we read it` | L'archive est écrite dans le dossier qu'elle archive | Écrire dans `/tmp/` puis déplacer (voir 3) |
| `Permission denied (publickey,password)` malgré une clé correcte (vérifiée avec `ssh-keygen -yf`) | Hébergeur n'autorise pas l'auth par clé | Passer au mot de passe + `sshpass` |
| `This service allows sftp connections only.` | Compte restreint au SFTP | Transfert par `lftp mirror`, webhook pour le reste (section 4) |
| `The Process class relies on proc_open, which is not available` | `proc_open` désactivé côté PHP web | Ne pas lancer de sous-processus (composer inclus) depuis le webhook ; transférer `vendor/` déjà construit |
| `git push` → `Repository not found` sur un repo qui existe bien | Ancienne credential GitHub en cache sous un autre compte Windows | `cmdkey /delete:LegacyGeneric:target=git:https://github.com` puis repousser |
| Pas d'option "Required reviewers" sur l'environnement | Fonctionnalité indisponible sur repo privé + compte gratuit | Utiliser `if: github.event_name == 'workflow_dispatch'` (section 5) |
| `$HOME` pointe vers un chemin inattendu (ex: `/home` au lieu de `/home/user`) | Particularité de certains hébergeurs mutualisés | Toujours vérifier avec `echo $HOME` et `pwd -P` avant de construire des chemins |

## 7. Checklist finale avant de considérer le CI/CD "prêt"

- [ ] `build` passe sur un push normal
- [ ] `deploy` reste bien en attente (ou skip) tant qu'on ne le lance pas
      manuellement
- [ ] Le site répond normalement après un déploiement
- [ ] Les dossiers de contenu utilisateur (uploads, `.env`, logs) sont
      intacts après déploiement — jamais écrasés ni supprimés
- [ ] Un rollback simple est possible (revert du commit + relancer le
      workflow manuellement)
