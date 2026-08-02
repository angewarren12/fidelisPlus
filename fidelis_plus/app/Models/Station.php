<?php

namespace App\Models;

use Database\Factories\StationFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Station extends Model
{
    /** @use HasFactory<StationFactory> */
    use HasFactory;
    protected $fillable = [
        'name',
        'location',
        'express_capacity_per_slot'
    ];
}
