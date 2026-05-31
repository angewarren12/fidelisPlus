<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Document extends Model
{
    protected $fillable = ['documentable_id', 'documentable_type', 'name', 'path', 'type', 'meta'];

    protected $casts = [
        'meta' => 'array',
    ];

    public function documentable(): MorphTo
    {
        return $this->morphTo();
    }
}
