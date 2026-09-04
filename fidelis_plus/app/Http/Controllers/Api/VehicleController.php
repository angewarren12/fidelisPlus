<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use App\Models\Document;
use App\Http\Resources\VehicleResource;
use App\Traits\ScopesByRole;
use App\Events\VehicleChanged;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Cell\DataValidation;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

class VehicleController extends Controller
{
    use ScopesByRole;

    /**
     * Requête flotte avec les mêmes filtres que la liste (hors pagination).
     */
    private function fleetListQuery(Request $request)
    {
        $query = Vehicle::query()
            // Permet d'obtenir la dernière visite sans charger toutes les visites (évite N+1)
            ->withMax('visits', 'visit_date');
        $this->scopeForUser($query);

        if ($request->has('company_id')) {
            $query->where('company_id', $request->company_id);
        }

        if ($request->filled('statuses')) {
            $raw = $request->input('statuses');
            $parts = is_array($raw) ? $raw : preg_split('/\s*,\s*/', (string) $raw, -1, PREG_SPLIT_NO_EMPTY);
            $allowed = ['jamais_controle', 'a_jour', 'en_retard', 'bientot'];
            $statuses = array_values(array_intersect(array_map('strval', $parts), $allowed));
            if ($statuses !== []) {
                $query->whereIn('status', $statuses);
            }
        } elseif ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('fuel_type')) {
            $query->where('fuel_type', $request->fuel_type);
        }

        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(function ($q) use ($s) {
                $q->where('license_plate', 'LIKE', "%{$s}%")
                    ->orWhere('brand', 'LIKE', "%{$s}%")
                    ->orWhere('model', 'LIKE', "%{$s}%")
                    ->orWhereHas('company', function ($c) use ($s) {
                        $c->where('name', 'LIKE', "%{$s}%");
                    });
            });
        }

        return $query;
    }

    /**
     * Totaux flotte (hors pagination) pour les cartes KPI — alignés sur les filtres actifs.
     */
    public function fleetStats(Request $request)
    {
        $query = $this->fleetListQuery($request);

        return response()->json([
            'status' => 'success',
            'data' => [
                'total' => $query->clone()->count(),
                'by_status' => [
                    'jamais_controle' => $query->clone()->where('status', 'jamais_controle')->count(),
                    'a_jour' => $query->clone()->where('status', 'a_jour')->count(),
                    'en_retard' => $query->clone()->where('status', 'en_retard')->count(),
                    'bientot' => $query->clone()->where('status', 'bientot')->count(),
                ],
            ],
        ]);
    }

    /**
     * KPI flotte — format simplifié pour le mobile.
     * Retour: { data: { total, up_to_date, late } }
     */
    public function fleetStatsSimple(Request $request)
    {
        $query = $this->fleetListQuery($request);

        return response()->json([
            'status' => 'success',
            'data' => [
                'total' => $query->clone()->count(),
                'up_to_date' => $query->clone()->where('status', 'a_jour')->count(),
                'late' => $query->clone()->where('status', 'en_retard')->count(),
                'never_controlled' => $query->clone()->where('status', 'jamais_controle')->count(),
            ],
        ]);
    }

    /**
     * Liste de la flotte (Tous les véhicules ou filtré par client).
     */
    public function index(Request $request)
    {
        $query = $this->fleetListQuery($request);

        $perPage = (int) $request->get('per_page', $request->get('limit', 15));
        $perPage = min(100, max(1, $perPage));

        $vehicles = $query->with(['company', 'documents'])->orderByDesc('id')->paginate($perPage);

        return VehicleResource::collection($vehicles);
    }

    /**
     * Enregistrement d'un nouveau véhicule (Mobile/Web).
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'company_id' => 'required|exists:companies,id',
            'license_plate' => 'required|string|unique:vehicles,license_plate',
            'brand' => 'nullable|string',
            'model' => 'nullable|string',
            'vehicle_type' => 'nullable|string|max:100',
            'ptac_kg' => 'nullable|integer',
            'seats' => 'nullable|integer',
            'registration_date' => 'nullable|date',
            'fiscal_power_cv' => 'nullable|integer',
            'ct_amount_ht' => 'nullable|numeric',
            'ct_vat_amount' => 'nullable|numeric',
            'ct_amount_ttc' => 'nullable|numeric',
            'vignette_amount' => 'nullable|numeric',
            'penalty_amount' => 'nullable|numeric',
            'year' => 'nullable|integer',
            'fuel_type' => 'nullable|string',
            'last_visit_date' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        if ($request->user()->role === 'client'
            && (int) $request->company_id !== (int) $request->user()->company_id) {
            return response()->json([
                'status' => 'error',
                'message' => 'Accès refusé pour ce compte.',
            ], 403);
        }

        if ($request->user()->role === 'commercial') {
            $company = \App\Models\Company::find($request->company_id);
            if (!$company || (int) $company->commercial_id !== (int) $request->user()->id) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Accès refusé. Cette flotte appartient à un client d\'un autre commercial.',
                ], 403);
            }
        }

        $data = $request->all();
        if ($request->filled('last_visit_date')) {
            $computed = Vehicle::computeCtStatus(Carbon::parse($request->last_visit_date), $request->input('usage_type'));
            $data['next_ct_date'] = $computed['next_ct_date']->toDateString();
            $data['status'] = $computed['status'];
        } else {
            $data['status'] = 'jamais_controle';
        }

        $vehicle = Vehicle::create($data);

        // Création automatique de la visite initiale si une date est fournie
        if ($request->filled('last_visit_date')) {
            $vehicle->visits()->create([
                'visit_date' => $request->last_visit_date,
                'notes' => 'Entretien initial enregistré lors de la création du véhicule.',
                'status' => 'complete'
            ]);
        }

        try {
            event(new VehicleChanged(
                vehicleId: (int) $vehicle->id,
                companyId: (int) $vehicle->company_id,
                event: 'created',
            ));
        } catch (\Throwable $e) {
            // Le broadcast temps réel ne doit jamais empêcher la création.
            report($e);
        }

        try {
            \App\Jobs\SyncVehicleToOdoo::dispatchSync($vehicle->id, 'vehicle_created');
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('SyncVehicleToOdoo inline sync warning: ' . $e->getMessage());
            \App\Jobs\SyncVehicleToOdoo::dispatch($vehicle->id, 'vehicle_created');
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Véhicule enregistré.',
            'data' => $vehicle
        ], 201);
    }

    /**
     * Détail d'un véhicule avec son historique de visites et ses documents.
     */
    public function show($id)
    {
        $query = Vehicle::with(['company', 'visits', 'documents', 'quotes']);
        
        // Sécurité automatique
        $this->scopeForUser($query);
        
        $vehicle = $query->findOrFail($id);

        return new VehicleResource($vehicle);
    }

    /**
     * Mise à jour des informations.
     */
    public function update(Request $request, $id)
    {
        $query = Vehicle::query();
        $this->scopeForUser($query);
        $vehicle = $query->findOrFail($id);

        $data = $request->validate([
            'license_plate' => 'sometimes|string|max:20',
            'brand' => 'sometimes|nullable|string|max:100',
            'model' => 'sometimes|nullable|string|max:100',
            'vehicle_type' => 'sometimes|nullable|string|max:100',
            'ptac_kg' => 'sometimes|nullable|integer',
            'seats' => 'sometimes|nullable|integer',
            'registration_date' => 'sometimes|nullable|date',
            'fiscal_power_cv' => 'sometimes|nullable|integer',
            'ct_amount_ht' => 'sometimes|nullable|numeric',
            'ct_vat_amount' => 'sometimes|nullable|numeric',
            'ct_amount_ttc' => 'sometimes|nullable|numeric',
            'vignette_amount' => 'sometimes|nullable|numeric',
            'penalty_amount' => 'sometimes|nullable|numeric',
            'year' => 'sometimes|nullable|integer',
            'fuel_type' => 'sometimes|nullable|string|max:50',
            'usage_type' => 'sometimes|nullable|string|max:50',
            'last_visit_date' => 'sometimes|nullable|date',
            'next_ct_date' => 'sometimes|nullable|date',
            'next_pollution_date' => 'sometimes|nullable|date',
        ]);

        // company_id et status sont exclus : gérés uniquement par la logique serveur
        // (transfert de flotte / calcul de conformité), jamais par le client.
        $vehicle->update($data);

        try {
            event(new VehicleChanged(
                vehicleId: (int) $vehicle->id,
                companyId: (int) $vehicle->company_id,
                event: 'updated',
            ));
        } catch (\Throwable $e) {
            report($e);
        }

        try {
            \App\Jobs\SyncVehicleToOdoo::dispatchSync($vehicle->id, 'vehicle_updated');
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('SyncVehicleToOdoo inline sync warning: ' . $e->getMessage());
            \App\Jobs\SyncVehicleToOdoo::dispatch($vehicle->id, 'vehicle_updated');
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Véhicule mis à jour.',
            'data' => $vehicle
        ]);
    }

    /**
     * Suppression d'un véhicule.
     */
    public function destroy($id)
    {
        $query = Vehicle::query();
        $this->scopeForUser($query);
        $vehicle = $query->findOrFail($id);
        $companyId = (int) $vehicle->company_id;
        $vehicleId = (int) $vehicle->id;
        $vehicle->delete();

        try {
            event(new VehicleChanged(
                vehicleId: $vehicleId,
                companyId: $companyId,
                event: 'deleted',
            ));
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Véhicule supprimé.'
        ]);
    }

    /**
     * Upload de documents (Carte grise, Vignette...).
     */
    public function uploadDocs(Request $request, $id)
    {
        $request->validate([
            'file' => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120',
            'name' => 'required|string',
            'type' => 'nullable|string'
        ]);

        $query = Vehicle::query();
        $this->scopeForUser($query);
        $vehicle = $query->findOrFail($id);

        // Si c'est un document unique (carte grise ou vignette), on supprime l'ancien
        if (in_array($request->type, ['carte_grise', 'vignette'])) {
            $existing = $vehicle->documents()->where('type', $request->type)->first();
            if ($existing) {
                // Supprimer le fichier physique (on extrait le nom du fichier du path /storage/...)
                $fileName = str_replace('/storage/', '', $existing->path);
                Storage::disk('public')->delete($fileName);
                $existing->delete();
            }
        }

        // Simulation de stockage public
        $path = $request->file('file')->store('vehicles/documents', 'public');

        $document = $vehicle->documents()->create([
            'name' => $request->name,
            'path' => Storage::url($path),
            'type' => $request->type ?? 'other',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Document uploadé avec succès.',
            'data' => $document
        ]);
    }
    /**
     * Enregistre une visite manuelle pour mettre à jour l'entretien du véhicule.
     */
    public function recordVisit(Request $request, $id)
    {
        $request->validate([
            'date' => 'required|date',
            'notes' => 'nullable|string',
            'vignette_image' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120',
        ]);

        $query = Vehicle::query();
        $this->scopeForUser($query);
        $vehicle = $query->findOrFail($id);

        $visitDate = Carbon::parse($request->date);
        $computed = Vehicle::computeCtStatus($visitDate, $vehicle->usage_type);
        $nextCt = $computed['next_ct_date'];

        // Mise à jour du véhicule
        $vehicle->update([
            'last_visit_date' => $visitDate->toDateString(),
            'next_ct_date' => $nextCt->toDateString(),
            'status' => $computed['status'],
        ]);

        // Création de l'entrée d'historique
        $visit = $vehicle->visits()->create([
            'visit_date' => $visitDate,
            'kind' => 'technical',
            'notes' => $request->notes ?? 'Visite enregistrée manuellement.',
            'status' => 'complete'
        ]);

        // Upload optionnel de la nouvelle vignette (archivée sur la visite + mise à jour "courante" sur le véhicule)
        if ($request->hasFile('vignette_image')) {
            $file = $request->file('vignette_image');
            $path = $file->store('vehicles/documents', 'public');
            $publicUrl = Storage::url($path);

            // Archive sur la visite
            $visit->documents()->create([
                'name' => 'Vignette visite '.$visitDate->toDateString(),
                'path' => $publicUrl,
                'type' => 'vignette',
            ]);

            // Document "courant" sur le véhicule (unique)
            $existing = $vehicle->documents()->where('type', 'vignette')->first();
            if ($existing) {
                $fileName = str_replace('/storage/', '', $existing->path);
                Storage::disk('public')->delete($fileName);
                $existing->delete();
            }

            $vehicle->documents()->create([
                'name' => 'Vignette',
                'path' => $publicUrl,
                'type' => 'vignette',
            ]);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Entretien enregistré et statut mis à jour.',
            'data' => new VehicleResource($vehicle->load(['documents', 'visits']))
        ]);
    }

    /**
     * Nombre maximum de lignes de données traitées par import (hors en-tête).
     */
    private const IMPORT_MAX_ROWS = 1000;

    /**
     * En-têtes du modèle d'import "INFO PARC AUTO CLIENTS" (ligne 11 du fichier),
     * dans l'ordre des colonnes B à N (la colonne A est le n° d'ordre, non importé).
     */
    private const IMPORT_HEADERS = [
        'IMMATRICULATION ',
        'MARQUE',
        'TYPE (GENRE)',
        'POIDS TOTAL A CHARGE (PTAC)',
        'PLACES ASSISES',
        'MISE EN CIRCULATION',
        "DATE D'EXPIRATION VISITE TECHNIQUE",
        'PUISSANCE FISCALE (CV)',
        'MONTANT HT VISITE TECHNIQUE         (CFA) ',
        'TVA',
        'MONTANT TTC VISITE TECHNIQUE  (CFA)',
        'MONTANT VIGNETTE          (CFA)',
        'PENALITE',
    ];

    /**
     * Première ligne de données du modèle (l'en-tête est en ligne 11).
     */
    private const IMPORT_HEADER_ROW = 11;
    private const IMPORT_FIRST_DATA_ROW = 12;

    /**
     * Télécharge le modèle Excel à distribuer aux clients pour l'import de flotte en masse.
     */
    public function downloadImportTemplate()
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('VEHICULES');

        $sheet->setCellValue('A8', 'INFORMATIONS PARC AUTO ');
        $sheet->mergeCells('A1:P7');
        $sheet->mergeCells('A8:N8');
        $sheet->mergeCells('A10:P10');
        $sheet->getStyle('A8')->getFont()->setBold(true)->setSize(13);

        $headers = array_merge(['N° ORD.'], self::IMPORT_HEADERS);
        $sheet->fromArray($headers, null, 'A'.self::IMPORT_HEADER_ROW);

        $headerRange = 'A'.self::IMPORT_HEADER_ROW.':N'.self::IMPORT_HEADER_ROW;
        $sheet->getStyle($headerRange)->getFont()->setBold(true);
        $sheet->getStyle($headerRange)->getFont()->getColor()->setRGB('FFFFFF');
        $sheet->getStyle($headerRange)->getFill()->setFillType(Fill::FILL_SOLID);
        $sheet->getStyle($headerRange)->getFill()->getStartColor()->setRGB('1A1831');
        $sheet->getStyle($headerRange)->getAlignment()->setVertical(Alignment::VERTICAL_CENTER)->setWrapText(true);
        $sheet->getRowDimension(self::IMPORT_HEADER_ROW)->setRowHeight(36);

        // Numérotation d'exemple des lignes de saisie.
        for ($i = 0; $i < 12; $i++) {
            $sheet->setCellValue('A'.(self::IMPORT_FIRST_DATA_ROW + $i), $i + 1);
        }

        $widths = ['A' => 8, 'B' => 18, 'C' => 14, 'D' => 16, 'E' => 14, 'F' => 12, 'G' => 16, 'H' => 20, 'I' => 14, 'J' => 16, 'K' => 10, 'L' => 16, 'M' => 16, 'N' => 12];
        foreach ($widths as $col => $width) {
            $sheet->getColumnDimension($col)->setWidth($width);
        }

        $instructions = $spreadsheet->createSheet();
        $instructions->setTitle('Instructions');
        $instructions->fromArray([
            ['Comment remplir ce fichier'],
            [''],
            ['1. Ne modifiez pas les en-têtes de la feuille "VEHICULES" (ligne '.self::IMPORT_HEADER_ROW.').'],
            ['2. La saisie des véhicules commence à la ligne '.self::IMPORT_FIRST_DATA_ROW.'.'],
            ['3. Seule l\'immatriculation est obligatoire. Toutes les autres colonnes sont optionnelles.'],
            ['4. Format de date attendu pour "MISE EN CIRCULATION" et "DATE D\'EXPIRATION VISITE TECHNIQUE" : JJ/MM/AAAA.'],
            ['5. Une immatriculation déjà présente dans la base sera ignorée et signalée dans le rapport d\'import.'],
            ['6. Maximum '.self::IMPORT_MAX_ROWS.' véhicules par fichier importé.'],
        ], null, 'A1');
        $instructions->getStyle('A1')->getFont()->setBold(true)->setSize(13);
        $instructions->getColumnDimension('A')->setWidth(100);
        $instructions->getStyle('A1:A8')->getAlignment()->setWrapText(true);

        $spreadsheet->setActiveSheetIndex(0);

        $tempFile = tempnam(sys_get_temp_dir(), 'fidelis_import_template_').'.xlsx';
        (new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet))->save($tempFile);

        return response()->download(
            $tempFile,
            'modele_import_flotte_fidelisplus.xlsx',
            ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
        )->deleteFileAfterSend(true);
    }

    /**
     * Résout la société cible de l'import : soit un company_id existant (avec vérification
     * des droits d'accès), soit un company_name à créer/retrouver (réservé admin/commercial,
     * pour le cas où le client importé n'existe pas encore dans la base).
     */
    private function resolveImportCompany(Request $request, $user)
    {
        if ($request->filled('company_id')) {
            $company = \App\Models\Company::find($request->company_id);
            if (!$company) {
                return [null, response()->json(['status' => 'error', 'message' => 'Client introuvable.'], 404)];
            }
            if ($user->role === 'client' && (int) $company->id !== (int) $user->company_id) {
                return [null, response()->json(['status' => 'error', 'message' => 'Accès refusé pour ce compte.'], 403)];
            }
            if ($user->role === 'commercial' && (int) $company->commercial_id !== (int) $user->id) {
                return [null, response()->json([
                    'status' => 'error',
                    'message' => 'Accès refusé. Cette flotte appartient à un client d\'un autre commercial.',
                ], 403)];
            }
            return [$company, null];
        }

        if ($request->filled('company_name')) {
            if (!in_array($user->role, ['admin_commercial', 'super_admin', 'commercial'], true)) {
                return [null, response()->json(['status' => 'error', 'message' => 'Accès refusé pour la création d\'un client.'], 403)];
            }

            $name = trim((string) $request->company_name);
            $query = \App\Models\Company::query()->whereRaw('LOWER(name) = ?', [strtolower($name)]);
            if ($user->role === 'commercial') {
                $query->where('commercial_id', $user->id);
            }
            $company = $query->first();

            if (!$company) {
                $company = \App\Models\Company::create([
                    'type' => 'client',
                    'category' => 'entreprise',
                    'name' => $name,
                    'commercial_id' => $user->role === 'commercial' ? $user->id : null,
                ]);
            }

            return [$company, null];
        }

        return [null, response()->json([
            'status' => 'error',
            'message' => 'Veuillez indiquer un client existant (company_id) ou un nom de nouveau client (company_name).',
        ], 422)];
    }

    /**
     * Import en masse de véhicules depuis un fichier Excel rempli à partir du modèle
     * "INFO PARC AUTO CLIENTS" (en-tête ligne 11, données à partir de la ligne 12).
     * Traitement "au mieux" : les lignes valides sont créées, les lignes invalides sont
     * rapportées sans bloquer le reste de l'import.
     */
    public function importFromExcel(Request $request)
    {
        $request->validate([
            'company_id' => 'nullable|exists:companies,id',
            'company_name' => 'nullable|string|max:255',
            'file' => 'required|file|mimes:xlsx,xls,csv|max:5120',
        ]);

        $user = $request->user();
        [$company, $errorResponse] = $this->resolveImportCompany($request, $user);
        if ($errorResponse) {
            return $errorResponse;
        }

        try {
            $spreadsheet = IOFactory::load($request->file('file')->getRealPath());
        } catch (\Throwable $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Fichier illisible. Vérifiez qu\'il s\'agit bien d\'un export du modèle fourni (.xlsx).',
            ], 422);
        }

        $sheet = $spreadsheet->getActiveSheet();
        $highestRow = min($sheet->getHighestDataRow(), self::IMPORT_FIRST_DATA_ROW - 1 + self::IMPORT_MAX_ROWS);

        $existingPlates = Vehicle::where('company_id', '!=', null)
            ->pluck('license_plate')
            ->map(fn ($p) => strtoupper(trim((string) $p)))
            ->flip();

        $created = 0;
        $errors = [];
        $seenInFile = [];

        // Colonnes B à N (immatriculation à pénalité) - la colonne A (n° ordre) n'est pas importée.
        $cols = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];

        for ($row = self::IMPORT_FIRST_DATA_ROW; $row <= $highestRow; $row++) {
            $plateRaw = trim((string) $sheet->getCell("B{$row}")->getFormattedValue());
            $brandRaw = trim((string) $sheet->getCell("C{$row}")->getFormattedValue());
            $typeRaw = trim((string) $sheet->getCell("D{$row}")->getFormattedValue());
            $ptacRaw = trim((string) $sheet->getCell("E{$row}")->getFormattedValue());
            $seatsRaw = trim((string) $sheet->getCell("F{$row}")->getFormattedValue());
            $regDateCell = $sheet->getCell("G{$row}");
            $ctExpiryCell = $sheet->getCell("H{$row}");
            $fiscalPowerRaw = trim((string) $sheet->getCell("I{$row}")->getFormattedValue());
            $htRaw = trim((string) $sheet->getCell("J{$row}")->getFormattedValue());
            $tvaRaw = trim((string) $sheet->getCell("K{$row}")->getFormattedValue());
            $ttcRaw = trim((string) $sheet->getCell("L{$row}")->getFormattedValue());
            $vignetteRaw = trim((string) $sheet->getCell("M{$row}")->getFormattedValue());
            $penaltyRaw = trim((string) $sheet->getCell("N{$row}")->getFormattedValue());

            $rowIsEmpty = true;
            foreach ($cols as $col) {
                if (trim((string) $sheet->getCell("{$col}{$row}")->getFormattedValue()) !== '') {
                    $rowIsEmpty = false;
                    break;
                }
            }
            if ($rowIsEmpty) {
                continue;
            }

            if ($plateRaw === '') {
                $errors[] = ['row' => $row, 'license_plate' => null, 'message' => 'Immatriculation manquante.'];
                continue;
            }

            $plate = strtoupper($plateRaw);

            if (isset($seenInFile[$plate])) {
                $errors[] = [
                    'row' => $row,
                    'license_plate' => $plate,
                    'message' => "Immatriculation en doublon dans le fichier (déjà en ligne {$seenInFile[$plate]}).",
                ];
                continue;
            }
            $seenInFile[$plate] = $row;

            if ($existingPlates->has($plate)) {
                $errors[] = ['row' => $row, 'license_plate' => $plate, 'message' => 'Ce véhicule existe déjà dans la base.'];
                continue;
            }

            $parseExcelDate = function ($cell) {
                $raw = $cell->getValue();
                if ($raw === null || $raw === '') {
                    return null;
                }
                if (is_numeric($raw)) {
                    return ExcelDate::excelToDateTimeObject($raw)->format('Y-m-d');
                }
                return Carbon::createFromFormat('d/m/Y', trim((string) $raw))->toDateString();
            };

            try {
                $registrationDate = $parseExcelDate($regDateCell);
            } catch (\Throwable $e) {
                $errors[] = ['row' => $row, 'license_plate' => $plate, 'message' => 'Date de mise en circulation invalide (attendu JJ/MM/AAAA).'];
                continue;
            }

            try {
                $ctExpiryDate = $parseExcelDate($ctExpiryCell);
            } catch (\Throwable $e) {
                $errors[] = ['row' => $row, 'license_plate' => $plate, 'message' => "Date d'expiration visite technique invalide (attendu JJ/MM/AAAA)."];
                continue;
            }

            $toInt = fn (string $v) => $v !== '' && is_numeric($v) ? (int) round((float) $v) : null;
            $toDecimal = fn (string $v) => $v !== '' && is_numeric(str_replace([' ', ','], ['', '.'], $v))
                ? (float) str_replace([' ', ','], ['', '.'], $v)
                : null;

            $vehicleData = [
                'company_id' => $company->id,
                'license_plate' => $plate,
                'brand' => $brandRaw !== '' ? $brandRaw : null,
                'vehicle_type' => $typeRaw !== '' ? $typeRaw : null,
                'ptac_kg' => $toInt($ptacRaw),
                'seats' => $toInt($seatsRaw),
                'registration_date' => $registrationDate,
                'fiscal_power_cv' => $toInt($fiscalPowerRaw),
                'ct_amount_ht' => $toDecimal($htRaw),
                'ct_vat_amount' => $toDecimal($tvaRaw),
                'ct_amount_ttc' => $toDecimal($ttcRaw),
                'vignette_amount' => $toDecimal($vignetteRaw),
                'penalty_amount' => $toDecimal($penaltyRaw),
            ];

            if ($ctExpiryDate) {
                $vehicleData['next_ct_date'] = $ctExpiryDate;
                $vehicleData['status'] = Vehicle::statusFromNextCtDate(Carbon::parse($ctExpiryDate));
            }

            $vehicle = Vehicle::create($vehicleData);

            $existingPlates->put($plate, true);
            $created++;
        }

        if ($created > 0) {
            try {
                event(new VehicleChanged(
                    vehicleId: 0,
                    companyId: (int) $company->id,
                    event: 'bulk_imported',
                ));
            } catch (\Throwable $e) {
                report($e);
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => "{$created} véhicule(s) importé(s) avec succès.",
            'data' => [
                'company_id' => $company->id,
                'company_name' => $company->name,
                'created' => $created,
                'errors_count' => count($errors),
                'errors' => $errors,
            ],
        ]);
    }
}
