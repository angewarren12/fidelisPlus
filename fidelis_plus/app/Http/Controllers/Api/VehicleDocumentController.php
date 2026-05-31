<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class VehicleDocumentController extends Controller
{
    /**
     * Upload rapide de la carte grise et de la vignette pour un véhicule.
     */
    public function uploadDocs(Request $request, $id)
    {
        $vehicle = Vehicle::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'registration_doc' => 'nullable|image|mimes:jpeg,png,jpg|max:5120',
            'vignette_doc' => 'nullable|image|mimes:jpeg,png,jpg|max:5120',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        $data = [];

        if ($request->hasFile('registration_doc')) {
            if ($vehicle->registration_doc_url) {
                Storage::disk('public')->delete($vehicle->registration_doc_url);
            }
            $data['registration_doc_url'] = $request->file('registration_doc')->store('vehicles/docs', 'public');
        }

        if ($request->hasFile('vignette_doc')) {
            if ($vehicle->vignette_doc_url) {
                Storage::disk('public')->delete($vehicle->vignette_doc_url);
            }
            $data['vignette_doc_url'] = $request->file('vignette_doc')->store('vehicles/docs', 'public');
        }

        if (!empty($data)) {
            $vehicle->update($data);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Documents mis à jour avec succès.',
            'data' => $vehicle->fresh()
        ]);
    }
}
