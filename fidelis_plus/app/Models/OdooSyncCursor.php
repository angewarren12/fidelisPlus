<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Curseur de synchronisation par type de donnée pour le cron de pull Odoo -> Fidelis.
 * Voir app/Console/Commands/SyncFromOdoo.php.
 */
class OdooSyncCursor extends Model
{
    protected $fillable = ['resource', 'last_synced_at'];

    protected $casts = [
        'last_synced_at' => 'datetime',
    ];
}
