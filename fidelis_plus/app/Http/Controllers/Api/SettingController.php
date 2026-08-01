<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    /**
     * Display a listing of the settings.
     */
    public function index()
    {
        return response()->json(Setting::getSettings());
    }

    /**
     * Update the specified settings.
     */
    public function update(Request $request)
    {
        $request->validate([
            'settings' => 'required|array',
            'settings.*' => 'required',
        ]);

        foreach ($request->settings as $key => $value) {
            Setting::updateOrCreate(
                ['key' => $key],
                ['value' => $value]
            );
        }

        \Illuminate\Support\Facades\Cache::forget('global_settings');

        return response()->json(['message' => 'Paramètres mis à jour avec succès']);
    }
}
