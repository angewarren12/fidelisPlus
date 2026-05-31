<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LoyaltyReward;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LoyaltyRewardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = LoyaltyReward::query()->orderBy('sort_order')->orderBy('name');

        if ($request->boolean('active_only')) {
            $query->where('is_active', true);
        }

        return response()->json([
            'status' => 'success',
            'data' => $query->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'points_cost' => 'required|integer|min:1',
            'client_segments' => 'nullable|array',
            'client_segments.*' => 'string|max:64',
            'is_active' => 'sometimes|boolean',
            'sort_order' => 'sometimes|integer|min:0',
        ]);

        $reward = LoyaltyReward::query()->create($validated);

        return response()->json([
            'status' => 'success',
            'data' => $reward,
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $reward = LoyaltyReward::query()->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $reward,
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $reward = LoyaltyReward::query()->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'points_cost' => 'sometimes|integer|min:1',
            'client_segments' => 'nullable|array',
            'client_segments.*' => 'string|max:64',
            'is_active' => 'sometimes|boolean',
            'sort_order' => 'sometimes|integer|min:0',
        ]);

        $reward->update($validated);

        return response()->json([
            'status' => 'success',
            'data' => $reward->fresh(),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        LoyaltyReward::query()->whereKey($id)->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Récompense supprimée.',
        ]);
    }
}
