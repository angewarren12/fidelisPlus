<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Station;
use App\Models\Vehicle;
use App\Http\Resources\AppointmentResource;
use App\Traits\ScopesByRole;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class AppointmentController extends Controller
{
    use ScopesByRole;

    /**
     * Voir les rendez-vous existants (Vue Calendrier).
     */
    public function index(Request $request)
    {
        $request->validate(['station_id' => 'required|exists:stations,id']);

        $query = Appointment::where('station_id', $request->station_id);

        // Sécurité automatique
        $this->scopeForUser($query);

        $appointments = $query->with(['company', 'vehicles'])->get();

        return AppointmentResource::collection($appointments);
    }

    /**
     * Obtenir les créneaux disponibles pour une station et une date.
     */
    public function getAvailableSlots(Request $request)
    {
        $request->validate([
            'station_id' => 'required|exists:stations,id',
            'date' => 'required|date_format:Y-m-d'
        ]);

        $station = Station::findOrFail($request->station_id);
        $date = $request->date;

        // Définition des créneaux de la journée (ex: 08:00 à 17:00)
        $defaultSlots = ['08:30', '10:30', '13:30', '15:30', '17:30'];
        $slotsSetting = \App\Models\Setting::getValue('quote.appointment.time_slots');
        $slots = $slotsSetting && is_array($slotsSetting) ? $slotsSetting : (is_string($slotsSetting) ? explode(',', $slotsSetting) : $defaultSlots);

        $availability = [];

        foreach ($slots as $time) {
            $dateTime = $date . ' ' . $time . ':00';
            
            // Compter les RDV existants sur ce créneau
            $count = Appointment::where('station_id', $station->id)
                ->where('appointment_date', $dateTime)
                ->count();

            $globalCapacity = \App\Models\Setting::getValue('quote.appointment.global_capacity', 5);
            $capacity = $station->express_capacity_per_slot > 0 ? $station->express_capacity_per_slot : (int) $globalCapacity;

            $availability[] = [
                'time' => $time,
                'is_full' => $count >= $capacity,
                'available_spots' => max(0, $capacity - $count)
            ];
        }

        return response()->json([
            'status' => 'success',
            'data' => $availability
        ]);
    }

    /**
     * Réservation d'un rendez-vous.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'vehicle_ids' => 'required|array|min:1',
            'vehicle_ids.*' => 'required|exists:vehicles,id',
            'station_id' => 'required|exists:stations,id',
            'appointment_date' => 'required|date_format:Y-m-d H:i:s',
            'is_pass_express' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        // Validation stricte des créneaux
        $defaultSlots = ['08:30:00', '10:30:00', '13:30:00', '15:30:00', '17:30:00'];
        $slotsSetting = \App\Models\Setting::getValue('quote.appointment.time_slots');
        $rawSlots = $slotsSetting && is_array($slotsSetting) ? $slotsSetting : (is_string($slotsSetting) ? explode(',', $slotsSetting) : $defaultSlots);
        $allowedSlots = array_map(fn($s) => strlen($s) === 5 ? "$s:00" : $s, $rawSlots);
        $timeOnly = date('H:i:s', strtotime($request->appointment_date));
        
        if (!in_array($timeOnly, $allowedSlots)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Heure de rendez-vous invalide. Veuillez choisir l’un des créneaux officiels.'
            ], 422);
        }

        $companyId = $request->user()->company_id;
        if ($companyId === null) {
            return response()->json([
                'status' => 'error',
                'message' => 'Votre compte n’est pas rattaché à une entreprise. Impossible de réserver.',
            ], 422);
        }

        // Vérification de la propriété des véhicules sélectionnés
        $vehicles = Vehicle::whereIn('id', $request->vehicle_ids)->get();
        if ($vehicles->count() !== count(array_unique($request->vehicle_ids))) {
            return response()->json([
                'status' => 'error',
                'message' => 'Un ou plusieurs véhicules sélectionnés sont invalides.',
            ], 422);
        }

        foreach ($vehicles as $vehicle) {
            if ((int) $vehicle->company_id !== (int) $companyId) {
                return response()->json([
                    'status' => 'error',
                    'message' => "Le véhicule {$vehicle->license_plate} n’appartient pas à votre compte.",
                ], 403);
            }
        }

        $station = Station::findOrFail($request->station_id);

        // Vérification de la capacité avant insertion
        $existingCount = Appointment::where('station_id', $station->id)
            ->where('appointment_date', $request->appointment_date)
            ->count();

        $globalCapacity = \App\Models\Setting::getValue('quote.appointment.global_capacity', 5);
        $capacity = $station->express_capacity_per_slot > 0 ? $station->express_capacity_per_slot : (int) $globalCapacity;

        if ($existingCount >= $capacity) {
            return response()->json([
                'status' => 'error',
                'message' => 'Ce créneau est complet.'
            ], 400);
        }

        $appointment = Appointment::create([
            'company_id' => $companyId,
            'station_id' => $request->station_id,
            'appointment_date' => $request->appointment_date,
            'is_pass_express' => $request->is_pass_express ?? false,
            'status' => 'confirme' // Pas de paiement en ligne, donc confirmé direct
        ]);

        $appointment->vehicles()->sync($request->vehicle_ids);

        return response()->json([
            'status' => 'success',
            'message' => 'Rendez-vous réservé avec succès.',
            'data' => $appointment->load('vehicles')
        ], 201);
    }

    /**
     * Annulation d'un rendez-vous.
     */
    public function cancel($id)
    {
        $query = Appointment::query();
        $this->scopeForUser($query);
        $appointment = $query->findOrFail($id);

        $appointment->update(['status' => 'annule']);

        return response()->json([
            'status' => 'success',
            'message' => 'Rendez-vous annulé.'
        ]);
    }
}
