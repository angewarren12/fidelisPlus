<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Facades\Storage;

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

    protected static function booted()
    {
        static::deleting(function ($document) {
            if ($document->path) {
                $fileName = str_replace('/storage/', '', $document->path);
                Storage::disk('public')->delete($fileName);
            }
        });
    }
}
