<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    protected $fillable = ['key', 'value'];

    protected $casts = [
        'value' => 'json'
    ];

    public static function getSettings()
    {
        return Cache::rememberForever('global_settings', function () {
            return self::pluck('value', 'key');
        });
    }

    public static function getValue(string $key, $default = null)
    {
        $settings = self::getSettings();
        return $settings->get($key, $default);
    }
}
