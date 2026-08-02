<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Http\Resources\CompanyResource;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Carbon;

class VehicleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $lastVisit = $this->last_visit_date ?: ($this->visits_max_visit_date ?? null);

        return [
            'id' => $this->id,
            'company_id' => $this->company_id,
            'license_plate' => $this->license_plate,
            'brand' => $this->brand,
            'model' => $this->model,
            'vehicle_type' => $this->vehicle_type,
            'ptac_kg' => $this->ptac_kg,
            'seats' => $this->seats,
            'registration_date' => $this->registration_date ? Carbon::parse($this->registration_date)->toDateString() : null,
            'fiscal_power_cv' => $this->fiscal_power_cv,
            'ct_amount_ht' => $this->ct_amount_ht !== null ? (float) $this->ct_amount_ht : null,
            'ct_vat_amount' => $this->ct_vat_amount !== null ? (float) $this->ct_vat_amount : null,
            'ct_amount_ttc' => $this->ct_amount_ttc !== null ? (float) $this->ct_amount_ttc : null,
            'vignette_amount' => $this->vignette_amount !== null ? (float) $this->vignette_amount : null,
            'penalty_amount' => $this->penalty_amount !== null ? (float) $this->penalty_amount : null,
            'year' => $this->year,
            'fuel_type' => $this->fuel_type,
            'usage_type' => $this->usage_type,
            'registration_doc_url' => $this->registration_doc_url ? (str_starts_with($this->registration_doc_url, 'http') ? $this->registration_doc_url : url(Storage::url($this->registration_doc_url))) : null,
            'vignette_doc_url' => $this->vignette_doc_url ? (str_starts_with($this->vignette_doc_url, 'http') ? $this->vignette_doc_url : url(Storage::url($this->vignette_doc_url))) : null,
            'has_required_doc' => $this->has_required_doc,
            'last_visit' => $lastVisit ? Carbon::parse($lastVisit)->toDateString() : null,
            'next_ct_date' => $this->next_ct_date ? Carbon::parse($this->next_ct_date)->toDateString() : null,
            'next_pollution_date' => $this->next_pollution_date ? Carbon::parse($this->next_pollution_date)->toDateString() : null,
            'status' => $this->status,
            'visits' => $this->whenLoaded('visits', function() {
                return $this->visits->map(fn($v) => [
                    'id' => $v->id,
                    'date' => $v->visit_date
                        ? Carbon::parse($v->visit_date)->toDateString()
                        : Carbon::parse($v->created_at)->toDateString(),
                    'kind' => $v->kind ?? 'technical',
                    'result' => $v->result,
                    'notes' => $v->notes,
                    'report_url' => $v->report_pdf_url,
                    'vignette' => $v->documents()
                        ->where('type', 'vignette')
                        ->orderByDesc('id')
                        ->first()?->path,
                ]);
            }),
            'quotes' => $this->whenLoaded('quotes', function() {
                return $this->quotes->map(fn($q) => [
                    'id' => $q->id,
                    'quote_number' => $q->quote_number,
                    'status' => $q->status,
                    'total_amount' => $q->total_amount,
                    'valid_until' => $q->valid_until ? Carbon::parse($q->valid_until)->toDateString() : null,
                ]);
            }),
            'company' => new CompanyResource($this->whenLoaded('company')),
            'documents' => $this->whenLoaded('documents', function() {
                return $this->documents->map(fn($doc) => [
                    'id' => $doc->id,
                    'name' => $doc->name,
                    'type' => $doc->type,
                    'path' => str_starts_with($doc->path, 'http') ? $doc->path : url($doc->path),
                ]);
            }),
            'photos' => $this->whenLoaded('documents', function() {
                return $this->documents->where('type', 'photo')->map(fn($doc) => [
                    'id' => $doc->id,
                    'path' => str_starts_with($doc->path, 'http') ? $doc->path : url($doc->path),
                ])->values();
            }),
            'carte_grise' => $this->whenLoaded('documents', function() {
                $doc = $this->documents->where('type', 'carte_grise')->first();
                return $doc ? [
                    'id' => $doc->id,
                    'path' => str_starts_with($doc->path, 'http') ? $doc->path : url($doc->path),
                ] : null;
            }),
            'vignette' => $this->whenLoaded('documents', function() {
                $doc = $this->documents->where('type', 'vignette')->first();
                return $doc ? [
                    'id' => $doc->id,
                    'path' => str_starts_with($doc->path, 'http') ? $doc->path : url($doc->path),
                ] : null;
            }),
        ];
    }
}
