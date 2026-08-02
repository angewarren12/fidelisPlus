<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Tariff extends Model
{
    protected $fillable = ['type', 'code', 'name', 'prices'];

    protected $casts = [
        'prices' => 'array',
    ];
}
