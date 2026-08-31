<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OdooSyncLog extends Model
{
    protected $fillable = [
        'resource',
        'status',
        'records_fetched',
        'records_synced',
        'duration_ms',
        'error_message',
        'synced_from',
        'synced_to',
    ];

    protected $casts = [
        'records_fetched' => 'integer',
        'records_synced'  => 'integer',
        'duration_ms'     => 'integer',
        'synced_from'     => 'datetime',
        'synced_to'       => 'datetime',
    ];
}
