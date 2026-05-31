<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LoyaltySetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LoyaltySettingController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => LoyaltySetting::all(),
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $setting = LoyaltySetting::findOrFail($id);

        $request->validate([
            'value' => 'required|string',
        ]);

        $setting->update([
            'value' => $request->value,
        ]);

        return response()->json([
            'status' => 'success',
            'data' => $setting,
        ]);
    }
}
