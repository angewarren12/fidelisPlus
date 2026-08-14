# Guide des actions à prendre pour corriger la synchronisation Odoo

## 🔴 Actions CRITIQUES (Bloquer la synchronisation)

### 1. Régénérer le token API Odoo
**Statut**: À faire  
**Durée**: 5 min

1. Accédez à: https://preprod-mayelia.odoo-saas.veone.net
2. Attendez l'email de réinitialisation de mot de passe pour: moustapha.camara@cieria.com
3. Connexion avec le nouveau mot de passe
4. Menu: **Paramètres → API Sales → API**
5. Cliquez sur **Nouveau** pour générer un nouveau token
6. Copiez le token généré
7. Mettez à jour le fichier `fidelis_plus/.env`:
   ```bash
   ODOO_OUTBOUND_TOKEN=<NEW_TOKEN_HERE>
   ```
8. Redémarrez l'application Laravel

### 2. Configurer les permissions utilisateur API
**Statut**: À faire  
**Durée**: 10 min

1. Restez connecté à Odoo Preprod
2. Menu: **Paramètres → Utilisateurs et sociétés → Utilisateurs**
3. Cherchez l'utilisateur API (il porte un email généré automatiquement)
4. Onglet **Groupes d'accès**, ajoutez:
   - ✅ Contact / Création
   - ✅ Ventes / Administrateur
   - ✅ Inventaire / Administrateur
5. Sauvegardez

---

## 🟠 Actions de VALIDATION (Data integrity)

### 3. Rendre l'email obligatoire en FidelisPlus
**Statut**: À faire  
**Durée**: 15 min  
**Impact**: Empêche les erreurs 422 lors de creation de prospect

#### Option A: Validation au niveau DB
```sql
ALTER TABLE companies MODIFY COLUMN email VARCHAR(255) NOT NULL;
```

#### Option B: Validation au niveau application
Éditer: `app/Http/Controllers/Api/ProspectController.php`

```php
public function store(Request $request)
{
    $request->validate([
        'email' => 'required|email|unique:companies', // ← Ajouter required
        'name' => 'required|string',
        // ... autres champs
    ]);
    // ...
}
```

#### Option C: Fallback automatique (recommandé)
Éditer: `app/Jobs/SyncCompanyToOdoo.php`

```php
public function handle(OdooClient $odoo): void
{
    // ...
    $company = Company::withTrashed()->find($this->companyId);
    
    // Fallback: générer un email placeholder si absent
    if (!$company->email) {
        $company->email = "prospect-{$company->id}@fidelis.local";
        $company->save();
    }
    
    $result = $odoo->syncCompany($company, $this->event);
    // ...
}
```

### 4. Valider le format du paramètre `modified_since`
**Statut**: À vérifier  
**Durée**: 5 min

L'erreur HTTP 500 peut venir d'un format de timestamp incorrect.

Éditer: `app/Services/Odoo/OdooClient.php` (ligne ~450)

```php
private function fetchAllPages(string $path, ?string $since, string $label): ?array
{
    // Valider que $since est en format ISO 8601
    if ($since && !str_ends_with($since, 'Z') && !str_ends_with($since, '+00:00')) {
        Log::warning("Invalid timestamp format: {$since}");
        $since = null; // Reset pour retry depuis le début
    }

    $params = array_filter(['modified_since' => $since, 'limit' => $limit]);
    // ...
}
```

---

## 🟢 Actions de MISE EN PLACE (Automation)

### 5. Configurer le cron automatique
**Statut**: À faire  
**Durée**: 10 min  
**Impact**: La synchronisation Odoo → FidelisPlus sera automatique

#### Utilisez le scheduler Laravel
Éditer: `app/Console/Kernel.php`

```php
protected function schedule(Schedule $schedule)
{
    // Sync depuis Odoo chaque 5 minutes
    $schedule->command('odoo:sync')
        ->everyFiveMinutes()
        ->withoutOverlapping()
        ->onFailure(function () {
            // Notifier en cas d'erreur
        });
}
```

#### Ou directement dans `routes/console.php`:
```php
Schedule::command('odoo:sync')
    ->everyFiveMinutes()
    ->name('odoo:sync:automated');
```

#### Puis configurez la crontab du serveur:
```bash
* * * * * cd /app && php artisan schedule:run >> /dev/null 2>&1
```

Remplacez `/app` par le chemin réel de FidelisPlus.

---

## 📋 Plan de test complet

### Test A: Push (FidelisPlus → Odoo)

```bash
# 1. Vérifier un prospect existant
php artisan tinker
>>> $company = \App\Models\Company::find(120); // ID du dernier prospect
>>> $company->email

# 2. S'il n'y a pas d'email, en ajouter
>>> $company->update(['email' => 'test@example.com']);

# 3. Déclencher manuellement le sync
>>> \App\Jobs\SyncCompanyToOdoo::dispatch($company->id, 'prospect_created');

# 4. Attendre 5 sec et vérifier les logs
>>> exit
tail -20 storage/logs/laravel.log | grep "OdooClient::syncCompany"
```

**Résultat attendu**:
```
[...] OdooClient::syncCompany/POST — HTTP 201 {"company_id":120}
```

Puis allez vérifier dans Odoo Preprod: Menu **Ventes → Clients** ou **Ventes → Devis** et cherchez le partenaire avec `external_ref = "fidelis-company-120"`.

### Test B: Pull (Odoo → FidelisPlus)

```bash
# 1. Créer un client manuellement dans Odoo
# Menu: Ventes → Clients → Nouveau
# Nom: "Test Sync 2026-08-14"
# Email: test@example.com
# Sauvegarder

# 2. Exécuter le sync dans FidelisPlus
cd fidelis_plus
php artisan odoo:sync --verbose

# 3. Vérifier les logs
tail -50 storage/logs/laravel.log | grep -i "odoo"

# 4. Vérifier la DB
php artisan tinker
>>> \App\Models\Company::where('name', 'Test Sync')->first()
```

**Résultat attendu**: Le client créé dans Odoo doit apparaître dans la table `companies` avec:
- `name` = "Test Sync 2026-08-14"
- `email` = "test@example.com"
- `odoo_partner_id` = ID du partner Odoo

---

## 🧪 Tests supplémentaires (Opcional)

### Test Archive/Restauration
```bash
php artisan tinker
>>> $company = \App\Models\Company::find(120);
>>> $company->delete(); // Soft delete
>>> \App\Jobs\SyncCompanyToOdoo::dispatch($company->id, 'company_archived');
```

Vérifier dans Odoo que le partenaire est archivé (`archive=True`).

### Test Conversion Prospect → Client
```bash
php artisan tinker
>>> $company = \App\Models\Company::where('category', 'particulier')->first();
>>> $company->update(['category' => 'entreprise']);
>>> \App\Jobs\SyncCompanyToOdoo::dispatch($company->id, 'converted_to_client');
```

Vérifier dans Odoo que le partner est promu en client (`is_customer=True`).

---

## 📊 Monitoring et Logs

### Commande rapide pour voir le statut
```bash
cd fidelis_plus
php diagnose-sync.php status
php diagnose-sync.php check-auth
php diagnose-sync.php logs
```

### Monitoring continu (prod)
```bash
# Via queue worker
php artisan queue:work --timeout=60 --tries=1

# Via cron scheduler
php artisan schedule:work
```

---

## 📚 Documentation supplémentaire

- **Report complet**: `SYNC_TEST_REPORT.md` (ce répertoire)
- **OpenAPI Odoo**: https://preprod-mayelia.odoo-saas.veone.net/api/sale_odoo/docs
- **Code source**: `fidelis_plus/app/Services/Odoo/OdooClient.php`
- **Commande cron**: `fidelis_plus/app/Console/Commands/SyncFromOdoo.php`

---

## ✅ Checklist de validation finale

- [ ] Token API régénéré et stocké en `.env`
- [ ] Permissions utilisateur Odoo vérifiées (Contact/Création)
- [ ] Email obligatoire (ou fallback) en FidelisPlus
- [ ] Test A (Push) réussi
- [ ] Test B (Pull) réussi
- [ ] Cron automatique configuré
- [ ] Logs sans erreurs 401/403/422
- [ ] Documentation mise à jour
- [ ] Équipe notifiée de la mise en production

---

## Support et déboggage

**Erreur HTTP 401/403?**
→ Token API invalide. Régénérez-le dans Odoo.

**Erreur HTTP 422 "email required"?**
→ Prospect sans email. Activez le fallback ou rendez l'email obligatoire.

**Erreur HTTP 500 sur fetch?**
→ Problème Odoo. Attendez ou contactez Odoo support.

**Jobs restent en queue?**
→ Queue worker n'est pas actif. Lancez: `php artisan queue:work`

**Aucun log visible?**
→ Logs dans: `fidelis_plus/storage/logs/laravel.log`

---

**Dernière mise à jour**: 2026-08-14  
**Responsable**: DevOps / Integration Team
