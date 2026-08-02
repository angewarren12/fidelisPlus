<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TechnicalVisitReminder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TechnicalVisitReminderController extends Controller
{
    /**
     * Soumission publique du formulaire "Fidelis Plus" (QR station, sans authentification).
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'station_id' => 'nullable|integer|exists:stations,id',
            'full_name' => 'required|string|max:160',
            'contact' => 'required|string|max:30',
            'vehicles' => 'required|array|min:1|max:10',
            'vehicles.*.registration' => 'required|string|max:30',
            'vehicles.*.visit_expiration_date' => 'required|date',
            'alert_period' => 'required|in:2_semaines,1_semaine,veille',
            'contact_method' => 'required|in:appel,sms,whatsapp',
            'consent_accepted' => 'required|accepted',
        ]);

        $reminder = DB::transaction(function () use ($request) {
            $reminder = TechnicalVisitReminder::create([
                'station_id' => $request->input('station_id'),
                'full_name' => $request->input('full_name'),
                'contact' => $request->input('contact'),
                'alert_period' => $request->input('alert_period'),
                'contact_method' => $request->input('contact_method'),
                'consent_accepted' => true,
            ]);

            foreach ($request->input('vehicles') as $vehicle) {
                $reminder->vehicles()->create([
                    'registration' => $vehicle['registration'],
                    'visit_expiration_date' => $vehicle['visit_expiration_date'],
                ]);
            }

            return $reminder;
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Votre demande a été enregistrée. Nous vous recontacterons.',
            'data' => $reminder->load('vehicles'),
        ], 201);
    }

    /**
     * Liste pour le call center marketing (admin/marketing).
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = min(100, max(5, (int) $request->get('per_page', 20)));

        $q = TechnicalVisitReminder::query()
            ->with(['vehicles', 'station:id,name', 'handler:id,first_name,last_name'])
            ->latest();

        if ($request->filled('status')) {
            $q->where('status', $request->string('status')->toString());
        }

        if ($request->filled('visit_date_from') || $request->filled('visit_date_to')) {
            $q->whereHas('vehicles', function ($vq) use ($request) {
                if ($request->filled('visit_date_from')) {
                    $vq->whereDate('visit_expiration_date', '>=', $request->string('visit_date_from')->toString());
                }
                if ($request->filled('visit_date_to')) {
                    $vq->whereDate('visit_expiration_date', '<=', $request->string('visit_date_to')->toString());
                }
            });
        }

        $paginator = $q->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    /**
     * Mise à jour du statut de traitement (call center).
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'status' => 'nullable|in:pending,contacted,done',
            'notes' => 'nullable|string|max:2000',
        ]);

        $reminder = TechnicalVisitReminder::query()->findOrFail($id);
        $reminder->fill($request->only(['status', 'notes']));

        if ($request->filled('status')) {
            $reminder->handled_by = $request->user()->id;
        }

        $reminder->save();

        return response()->json([
            'status' => 'success',
            'data' => $reminder->fresh(['vehicles', 'station:id,name', 'handler:id,first_name,last_name']),
        ]);
    }
}
