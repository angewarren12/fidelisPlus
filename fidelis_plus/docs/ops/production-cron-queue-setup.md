# Mise en place du cron de production (scheduler + file d'attente)

## Pourquoi ce document existe

L'app dépend de deux mécanismes qui ne tournent **jamais tout seuls** — sans
configuration côté hébergeur, ils ne font rien du tout, silencieusement,
sans aucune erreur visible :

1. **Le scheduler Laravel** (`Schedule::command(...)` dans
   `routes/console.php`) — pilote `notifications:ct-reminders`,
   `quotes:check-expired` et `odoo:sync` (cron de pull Odoo, voir
   `docs/openapi/odoo-integration-v1.yaml`). Il ne s'exécute que si quelque
   chose appelle `php artisan schedule:run` à intervalle régulier.
2. **La file d'attente** (`QUEUE_CONNECTION=database`) — c'est elle qui
   traite en tâche de fond les jobs `SyncCompanyToOdoo`, `SyncQuoteToOdoo`,
   `SyncVehicleToOdoo` (intégration Odoo), `ProvisionSiraAccountForMember`,
   etc. Sans un processus qui les traite, ils **s'accumulent indéfiniment**
   dans la table `jobs` sans jamais partir.

L'hébergement de production (LWS, mutualisé, voir
`CI-CD-SETUP-GUIDE.md` à la racine du dépôt) ne permet **aucune exécution de
commande à distance** (SSH restreint au SFTP, `proc_open` désactivé côté
web) — donc pas de worker permanent (`php artisan queue:work` en démon) ni de
`crontab -e` classique. Le déploiement actuel (`.github/workflows/deploy.yml`
+ `DeployController::hook()`) ne fait que transférer les fichiers et lancer
`migrate`/`config:cache` — **rien n'y déclenche le scheduler ou la queue**.

## La solution : une seule tâche cron, via le panel LWS

Laravel recommande justement, pour ce cas (pas de worker permanent
possible) : planifier `queue:work --stop-when-empty` **comme une tâche du
scheduler lui-même**, plutôt que d'exiger un second processus séparé. C'est
déjà fait ici :

```php
// routes/console.php
Schedule::command('queue:work --stop-when-empty --max-time=50 --tries=1')
    ->everyMinute()
    ->withoutOverlapping();
```

Résultat : **une seule tâche cron externe suffit**. Chaque minute, elle
appelle `schedule:run`, qui à son tour :
- lance `queue:work --stop-when-empty` (traite tout ce qui attend dans la
  table `jobs`, puis s'arrête tout seul — jamais de démon à superviser) ;
- déclenche `odoo:sync` toutes les 15 minutes, `notifications:ct-reminders`
  et `quotes:check-expired` tous les jours à 8h, quand c'est leur tour.

Vérifié en local (`php artisan schedule:run` exécuté une fois) : un job
`SyncCompanyToOdoo` dispatché est bien traité et disparaît de la table
`jobs` dans le même passage.

## À configurer côté hébergeur (LWS Panel)

1. Se connecter à l'espace client LWS → **Domaine et hébergement** → **Admin
   / Administrer** sur l'hébergement concerné → section **"5- Gestion
   MySQL/PHP/Sauvegardes"** → **"Tâches cron"**.
   (Référence : [aide LWS — mettre en place une tâche cron sur hébergement mutualisé](https://aide.lws.fr/doku.php/hebergement_mutualise:comment_mettre_en_place_une_tache_cron-hebergement_mutualise))
2. Créer **une seule** tâche, fréquence **chaque minute**, commande :
   ```
   php /chemin/absolu/vers/laravel/artisan schedule:run
   ```
   (remplacer `/chemin/absolu/vers/laravel` par le chemin réel sur le
   serveur — voir `DEPLOY_PATH` utilisé par le workflow de déploiement).

   ⚠️ **À vérifier directement dans le panel LWS** (non confirmé par manque
   d'accès à l'interface pendant la rédaction de ce document) :
   - le champ attend-il une commande **CLI** (comme ci-dessus) ou une **URL**
     à appeler (`wget`/`curl` interne) ? Si c'est une URL, il faudrait un
     endpoint HTTP équivalent — à éviter si possible, moins standard pour
     Laravel, en dernier recours seulement.
   - la fréquence **"chaque minute"** est-elle vraiment disponible, ou la
     grille de fréquences de LWS Panel est-elle plus grossière (ex. minimum
     5 ou 15 minutes) ? Si seule une fréquence plus large est possible,
     `everyMinute()` devient inutile — indiquer la fréquence réelle
     disponible pour qu'on ajuste `routes/console.php` en conséquence (les
     jobs Odoo resteront alors en attente plus longtemps entre deux passages,
     ce qui reste correct mais moins réactif).
3. Une fois créée, vérifier qu'elle s'exécute réellement (LWS Panel affiche
   généralement un historique des dernières exécutions de la tâche cron).

## Comment vérifier que ça marche, une fois en place

```bash
# Sur le serveur, ou via un webhook de diagnostic temporaire si pas de SSH exécutable :
php artisan tinker --execute="echo App\Models\OdooSyncCursor::count();"
# Doit être > 0 et augmenter au fil du temps une fois odoo:sync configuré
# avec de vraies informations Odoo (ODOO_OUTBOUND_BASE_URL/TOKEN).

php artisan tinker --execute="echo DB::table('jobs')->count();"
# Doit rester proche de 0 en continu si la queue est bien traitée à chaque
# minute — une valeur qui grossit sans jamais redescendre = la tâche cron
# n'est pas configurée ou ne s'exécute pas.
```

## Rappel

Tant que cette tâche cron n'est pas configurée côté LWS :
- `odoo:sync` ne tournera jamais → aucune donnée ne sera jamais récupérée
  depuis Odoo, même une fois l'URL/le jeton renseignés ;
- tous les jobs `Sync*ToOdoo` resteront bloqués indéfiniment dans la table
  `jobs` → **aucune donnée créée dans FidelisPlus ne sera jamais poussée vers
  Odoo**, même si leur endpoint est prêt et fonctionnel.

C'est un prérequis d'infrastructure indépendant de l'intégration Odoo
elle-même — sans lui, tout le travail de synchronisation déjà construit et
testé reste inerte en production.
