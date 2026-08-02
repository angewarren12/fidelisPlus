<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LoyaltyCardTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

/**
 * Studio Carte : gestion des modèles visuels (fond + positionnement QR/texte en %)
 * utilisés pour générer/imprimer la carte fidélité d'un client.
 */
class LoyaltyCardTemplateController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = LoyaltyCardTemplate::query()->orderByDesc('is_default')->orderByDesc('id');
        if ($request->filled('type')) {
            $q->where('type', $request->input('type'));
        }

        return response()->json(['status' => 'success', 'data' => $q->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'type' => ['required', Rule::in(['particulier', 'entreprise'])],
            'background' => 'required|image|mimes:jpeg,png,jpg,webp|max:5120',
            'layout_json' => 'required|string', // JSON encodé côté front
            'is_default' => 'nullable|boolean',
        ]);

        $path = $request->file('background')->store('loyalty/card-templates', 'public');

        $layout = json_decode($data['layout_json'], true);
        if (! is_array($layout)) {
            return response()->json(['status' => 'error', 'message' => 'layout_json invalide.'], 422);
        }

        if ($request->boolean('is_default')) {
            LoyaltyCardTemplate::query()->where('type', $data['type'])->update(['is_default' => false]);
        }

        $template = LoyaltyCardTemplate::create([
            'name' => $data['name'],
            'type' => $data['type'],
            'background_path' => $path,
            'layout_json' => $layout,
            'is_default' => $request->boolean('is_default'),
        ]);

        return response()->json(['status' => 'success', 'data' => $template], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $template = LoyaltyCardTemplate::query()->findOrFail($id);

        $data = $request->validate([
            'name' => 'sometimes|string|max:120',
            'layout_json' => 'sometimes|string',
            'is_default' => 'nullable|boolean',
            'background' => 'sometimes|image|mimes:jpeg,png,jpg,webp|max:5120',
        ]);

        if ($request->hasFile('background')) {
            if ($template->background_path) {
                Storage::disk('public')->delete($template->background_path);
            }
            $template->background_path = $request->file('background')->store('loyalty/card-templates', 'public');
        }

        if (isset($data['name'])) {
            $template->name = $data['name'];
        }

        if (isset($data['layout_json'])) {
            $layout = json_decode($data['layout_json'], true);
            if (! is_array($layout)) {
                return response()->json(['status' => 'error', 'message' => 'layout_json invalide.'], 422);
            }
            $template->layout_json = $layout;
        }

        if ($request->boolean('is_default')) {
            LoyaltyCardTemplate::query()->where('type', $template->type)->where('id', '!=', $template->id)->update(['is_default' => false]);
            $template->is_default = true;
        }

        $template->save();

        return response()->json(['status' => 'success', 'data' => $template->fresh()]);
    }

    public function destroy(int $id): JsonResponse
    {
        $template = LoyaltyCardTemplate::query()->findOrFail($id);
        if ($template->background_path) {
            Storage::disk('public')->delete($template->background_path);
        }
        $template->delete();

        return response()->json(['status' => 'success']);
    }
}
