<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Quote;
use App\Models\QuoteItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Database\QueryException;

use App\Traits\ScopesByRole;
use App\Services\NotificationService;
use App\Events\QuoteStatusChanged;

class QuoteController extends Controller
{
    use ScopesByRole;

    public function __construct(private readonly NotificationService $notifs)
    {
    }

    private function generateUniqueQuoteNumber(int $maxAttempts = 25): string
    {
        $year = now()->format('Y');

        for ($i = 0; $i < $maxAttempts; $i++) {
            $suffix = (string) random_int(100000, 999999);
            $candidate = "DEV-{$year}-{$suffix}";

            if (!Quote::where('quote_number', $candidate)->exists()) {
                return $candidate;
            }
        }

        abort(500, 'Impossible de générer un numéro de devis unique.');
    }

    /**
     * Liste des devis (pagination, recherche, filtre statut + agrégats KPI hors filtre statut).
     */
    public function index(Request $request)
    {
        $query = Quote::with(['company', 'vehicles', 'items']);
        $this->scopeForUser($query);

        if ($request->filled('company_id')) {
            $query->where('company_id', $request->company_id);
        }

        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(function ($q) use ($s) {
                $q->where('quote_number', 'like', "%{$s}%")
                    ->orWhereHas('company', function ($c) use ($s) {
                        $c->where('name', 'like', "%{$s}%");
                    })
                    ->orWhereHas('items', function ($i) use ($s) {
                        $i->where('description', 'like', "%{$s}%");
                    })
                    ->orWhereHas('vehicles', function ($v) use ($s) {
                        $v->where('license_plate', 'like', "%{$s}%");
                    });
            });
        }

        $listQuery = $query->clone();
        if ($request->filled('status')) {
            if (! in_array($request->status, ['draft', 'sent', 'accepted', 'declined', 'expired'], true)) {
                return response()->json(['status' => 'error', 'message' => 'Statut de filtre invalide.'], 422);
            }
            $listQuery->where('status', $request->status);
        }

        $perPage = min(100, max(1, (int) $request->get('per_page', 15)));

        $summary = [
            'total' => $query->clone()->count(),
            'by_status' => [
                'draft' => $query->clone()->where('status', 'draft')->count(),
                'sent' => $query->clone()->where('status', 'sent')->count(),
                'accepted' => $query->clone()->where('status', 'accepted')->count(),
                'declined' => $query->clone()->where('status', 'declined')->count(),
                'expired' => $query->clone()->where('status', 'expired')->count(),
            ],
            'pipeline_value' => (float) $query->clone()->whereIn('status', ['draft', 'sent'])->sum('total_amount'),
            'signed_revenue' => (float) $query->clone()->where('status', 'accepted')->sum('total_amount'),
        ];

        $paginator = $listQuery->latest()->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
            'summary' => $summary,
        ]);
    }

    /**
     * Détail d'un devis (lignes et véhicules inclus).
     */
    public function show($id)
    {
        $quote = Quote::with(['company', 'items', 'vehicles'])->findOrFail($id);

        $user = request()->user();
        if ($user && $user->role === 'commercial' && (int) $quote->company->commercial_id !== (int) $user->id) {
            return response()->json(['status' => 'error', 'message' => 'Accès refusé.'], 403);
        }

        return response()->json([
            'status' => 'success',
            'data' => $quote,
        ]);
    }

    /**
     * Création d'un devis avec ses lignes (Items).
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'company_id' => 'required|exists:companies,id',
            'quote_request_id' => 'nullable|exists:quote_requests,id',
            'vehicle_ids' => 'nullable|array',
            'vehicle_ids.*' => 'exists:vehicles,id',
            // Si non fourni, le serveur génère un numéro unique.
            'quote_number' => 'nullable|string|unique:quotes,quote_number',
            'valid_until' => 'nullable|date',
            'items' => 'required|array|min:1',
            'items.*.description' => 'required|string',
            'items.*.price' => 'required|numeric',
            'items.*.quantity' => 'nullable|integer',
            'appointment_date' => 'nullable|date',
            'station_id' => 'nullable|exists:stations,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        if ($request->user() && $request->user()->role === 'commercial') {
            $company = \App\Models\Company::find($request->company_id);
            if (!$company || (int) $company->commercial_id !== (int) $request->user()->id) {
                return response()->json(['status' => 'error', 'message' => 'Opération refusée : Ce client ne fait pas partie de votre portefeuille.'], 403);
            }
        }

        // Validate appointment slots
        if ($request->filled('appointment_date') && $request->filled('station_id')) {
            $station = \App\Models\Station::find($request->station_id);
            if ($station) {
                $existing = \App\Models\Appointment::where('station_id', $request->station_id)
                    ->where('appointment_date', $request->appointment_date)
                    ->count();
                    
                $globalCapacity = \App\Models\Setting::getValue('quote.appointment.global_capacity', 5);
                $capacity = $station->express_capacity_per_slot > 0 ? $station->express_capacity_per_slot : (int) $globalCapacity;

                if ($existing >= $capacity) {
                    return response()->json(['status' => 'error', 'message' => 'Ce créneau a atteint le nombre maximum de rendez-vous pour cette station.'], 422);
                }
            }
        }

        return DB::transaction(function () use ($request) {
            $quoteNumber = trim((string) $request->input('quote_number', ''));
            if ($quoteNumber === '') {
                $quoteNumber = $this->generateUniqueQuoteNumber();
            }

            $quote = Quote::create([
                'company_id' => $request->company_id,
                'quote_request_id' => $request->quote_request_id,
                'quote_number' => $quoteNumber,
                'valid_until' => $request->valid_until,
                'status' => 'draft',
                'total_amount' => 0,
            ]);

            // Association des véhicules via la table pivot
            if ($request->has('vehicle_ids')) {
                $quote->vehicles()->sync($request->vehicle_ids);
            }

            // Si c'est lié à une demande, on la marque comme "processed"
            if ($request->quote_request_id) {
                $req = \App\Models\QuoteRequest::lockForUpdate()->find($request->quote_request_id);
                if ($req) {
                    if ($req->status !== 'pending') {
                        abort(422, 'Cette demande a déjà été traitée ou refusée.');
                    }
                    $req->update(['status' => 'processed']);
                    // Si le devis n'avait pas de véhicules mais la demande en a un, on le lie
                    if (empty($request->vehicle_ids) && $req->vehicle_id) {
                        $quote->vehicles()->sync([$req->vehicle_id]);
                    }
                }
            }

            $total = 0;
            foreach ($request->items as $item) {
                $qty = $item['quantity'] ?? 1;
                $price = $item['price'];
                $total += ($price * $qty);

                QuoteItem::create([
                    'quote_id' => $quote->id,
                    'description' => $item['description'],
                    'price' => $price,
                    'quantity' => $qty,
                ]);
            }

            if ($request->filled('appointment_date') && $request->filled('station_id')) {
                $appointmentPrice = (float) \App\Models\Setting::getValue('quote.appointment.price', 0);
                
                $appointment = \App\Models\Appointment::create([
                    'company_id' => $request->company_id,
                    'station_id' => $request->station_id,
                    'appointment_date' => $request->appointment_date,
                    'status' => 'confirme',
                ]);

                if ($request->has('vehicle_ids') && is_array($request->vehicle_ids)) {
                    $appointment->vehicles()->sync($request->vehicle_ids);
                }

                if ($appointmentPrice > 0) {
                    $total += $appointmentPrice;
                    QuoteItem::create([
                        'quote_id' => $quote->id,
                        'description' => 'Frais de prise de rendez-vous',
                        'price' => $appointmentPrice,
                        'quantity' => 1,
                    ]);
                }
            }

            $quote->update(['total_amount' => $total]);

            return response()->json([
                'status' => 'success',
                'message' => 'Devis créé avec succès.',
                'data' => $quote->load(['items', 'vehicles'])
            ], 201);
        });
    }

    /**
     * Mise à jour d'un devis brouillon (lignes, véhicules, montants).
     */
    public function update(Request $request, $id)
    {
        $quote = Quote::with('company')->findOrFail($id);

        if ($quote->status !== 'draft') {
            return response()->json([
                'status' => 'error',
                'message' => 'Seuls les devis au statut brouillon peuvent être modifiés.',
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'company_id' => 'required|exists:companies,id',
            'quote_request_id' => 'nullable|exists:quote_requests,id',
            'vehicle_ids' => 'nullable|array',
            'vehicle_ids.*' => 'exists:vehicles,id',
            // Si vide, le serveur peut régénérer un numéro unique (rare, mais évite les blocages).
            'quote_number' => ['nullable', 'string', Rule::unique('quotes', 'quote_number')->ignore($quote->id)],
            'valid_until' => 'nullable|date',
            'items' => 'required|array|min:1',
            'items.*.description' => 'required|string',
            'items.*.price' => 'required|numeric',
            'items.*.quantity' => 'nullable|integer',
            'status' => 'nullable|in:draft,sent',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        if ($request->user() && $request->user()->role === 'commercial') {
            $company = \App\Models\Company::find($request->company_id);
            if (!$company || (int) $company->commercial_id !== (int) $request->user()->id) {
                return response()->json(['status' => 'error', 'message' => 'Opération refusée : Ce client ne fait pas partie de votre portefeuille.'], 403);
            }
        }

        return DB::transaction(function () use ($request, $quote) {
            $quoteNumber = trim((string) $request->input('quote_number', $quote->quote_number));
            if ($quoteNumber === '') {
                $quoteNumber = $this->generateUniqueQuoteNumber();
            }

            $quote->update([
                'company_id' => $request->company_id,
                'quote_request_id' => $request->quote_request_id,
                'quote_number' => $quoteNumber,
                'valid_until' => $request->valid_until,
                'status' => $request->input('status', 'draft'),
            ]);

            // Si on lie une demande (ou qu'on envoie), on la marque comme traitée.
            if ($request->filled('quote_request_id')) {
                $req = \App\Models\QuoteRequest::with('company')->find($request->quote_request_id);
                if ($req && (int) $req->company_id === (int) $quote->company_id) {
                    $req->update(['status' => 'processed']);
                    if ($request->input('status') === 'sent' && $quote->wasChanged('status')) {
                        // no-op: status processed suffit, mais garde-fou explicite
                    }
                }
            }

            if ($request->has('vehicle_ids')) {
                $quote->vehicles()->sync($request->vehicle_ids);
            } else {
                $quote->vehicles()->sync([]);
            }

            $quote->items()->delete();

            $total = 0;
            foreach ($request->items as $item) {
                $qty = $item['quantity'] ?? 1;
                $price = $item['price'];
                $total += ($price * $qty);

                QuoteItem::create([
                    'quote_id' => $quote->id,
                    'description' => $item['description'],
                    'price' => $price,
                    'quantity' => $qty,
                ]);
            }

            $quote->update(['total_amount' => $total]);

            return response()->json([
                'status' => 'success',
                'message' => 'Devis mis à jour.',
                'data' => $quote->fresh()->load(['items', 'vehicles', 'company']),
            ]);
        });
    }

    /**
     * Mise à jour du statut (Envoyé, Accepté, Refusé).
     */
    public function updateStatus(Request $request, $id)
    {
        $request->validate(['status' => 'required|in:draft,sent,accepted,declined,expired']);

        $quote = Quote::with('company')->findOrFail($id);
        $oldStatus = $quote->status;
        $newStatus = $request->status;
        
        $quote->update(['status' => $newStatus]);

        // Si le devis est rattaché à une demande, on la marque comme traitée dès qu'il est envoyé / signé.
        if (in_array($newStatus, ['sent', 'accepted'], true) && $quote->quote_request_id) {
            $req = \App\Models\QuoteRequest::find($quote->quote_request_id);
            if ($req && (int) $req->company_id === (int) $quote->company_id) {
                $req->update(['status' => 'processed']);
            }
        }

        // NOTIFICATIONS + TEMPS RÉEL
        if ($oldStatus !== $newStatus) {
            $contact = $quote->company?->contacts()->first()
                ?? \App\Models\User::where('company_id', $quote->company_id)->first();

            if ($contact) {
                $title = 'Devis';
                $body = match ($newStatus) {
                    'sent' => "Un devis ({$quote->quote_number}) vient d’être envoyé.",
                    'accepted' => "Votre devis ({$quote->quote_number}) a été accepté.",
                    'declined' => "Votre devis ({$quote->quote_number}) a été refusé.",
                    'expired' => "Votre devis ({$quote->quote_number}) a expiré.",
                    default => "Statut du devis ({$quote->quote_number}) mis à jour.",
                };

                $this->notifs->notifyUser(
                    $contact,
                    $title,
                    $body,
                    type: 'quote_status',
                    data: ['quote_id' => $quote->id, 'status' => $newStatus],
                    action: 'quote_detail',
                    priority: in_array($newStatus, ['sent', 'accepted'], true) ? 'high' : 'normal',
                    channel: 'both',
                );
            }

            event(new QuoteStatusChanged(
                quoteId: (int) $quote->id,
                companyId: (int) $quote->company_id,
                quoteNumber: (string) $quote->quote_number,
                status: (string) $newStatus,
            ));
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Statut du devis mis à jour.',
            'data' => $quote
        ]);
    }
    /**
     * Upload du Bon pour Accord par le client ou le commercial.
     */
    public function uploadBonPourAccord(Request $request, $id)
    {
        $request->validate([
            'bon_pour_accord' => 'required|file|mimes:pdf,jpeg,png,jpg|max:5120',
        ]);

        $quote = Quote::with('company')->findOrFail($id);

        // Security check
        $user = $request->user();
        if ($user) {
            if ($user->role === 'client' && (int) $quote->company_id !== (int) $user->company_id) {
                return response()->json(['status' => 'error', 'message' => 'Accès refusé.'], 403);
            }
            if ($user->role === 'commercial' && (int) $quote->company->commercial_id !== (int) $user->id) {
                return response()->json(['status' => 'error', 'message' => 'Opération refusée : Ce client ne fait pas partie de votre portefeuille.'], 403);
            }
        }

        // Handle upload
        if ($quote->bon_pour_accord_url) {
            $oldFile = str_replace('/storage/', '', $quote->bon_pour_accord_url);
            \Illuminate\Support\Facades\Storage::disk('public')->delete($oldFile);
        }

        $path = $request->file('bon_pour_accord')->store('quotes/accords', 'public');
        
        $oldStatus = $quote->status;
        
        $quote->update([
            'bon_pour_accord_url' => $path,
            'status' => 'accepted' // Automatically set status to accepted
        ]);

        // If the quote is linked to a request, mark the request as processed
        if ($quote->quote_request_id) {
            $req = \App\Models\QuoteRequest::find($quote->quote_request_id);
            if ($req && (int) $req->company_id === (int) $quote->company_id) {
                $req->update(['status' => 'processed']);
            }
        }

        // NOTIFICATIONS
        if ($oldStatus !== 'accepted') {
            $contact = $quote->company?->contacts()->first()
                ?? \App\Models\User::where('company_id', $quote->company_id)->first();

            if ($contact) {
                $title = 'Devis';
                $body = "Votre devis ({$quote->quote_number}) a été accepté (Bon pour accord reçu).";

                $this->notifs->notifyUser(
                    $contact,
                    $title,
                    $body,
                    type: 'quote_status',
                    data: ['quote_id' => $quote->id, 'status' => 'accepted'],
                    action: 'quote_detail',
                    priority: 'high',
                    channel: 'both',
                );
            }

            event(new QuoteStatusChanged(
                quoteId: (int) $quote->id,
                companyId: (int) $quote->company_id,
                quoteNumber: (string) $quote->quote_number,
                status: 'accepted',
            ));
        }

        // Return full URL
        $quote->bon_pour_accord_url = asset('storage/' . $quote->bon_pour_accord_url);

        return response()->json([
            'status' => 'success',
            'message' => 'Bon pour accord enregistré avec succès, devis accepté.',
            'data' => $quote
        ]);
    }
}
