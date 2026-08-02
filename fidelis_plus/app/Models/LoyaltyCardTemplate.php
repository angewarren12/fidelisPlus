<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LoyaltyCardTemplate extends Model
{
    protected $fillable = [
        'name',
        'type',
        'background_path',
        'layout_json',
        'is_default',
    ];

    protected function casts(): array
    {
        return [
            'layout_json' => 'array',
            'is_default' => 'boolean',
        ];
    }

    public function getBackgroundUrlAttribute(): ?string
    {
        return $this->background_path
            ? (str_starts_with($this->background_path, 'http') ? $this->background_path : url(\Illuminate\Support\Facades\Storage::url($this->background_path)))
            : null;
    }

    protected $appends = ['background_url'];
}
