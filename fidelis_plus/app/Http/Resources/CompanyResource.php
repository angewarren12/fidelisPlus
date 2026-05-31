<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CompanyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'commercial_id' => $this->commercial_id,
            'commercial_name' => $this->commercial ? ($this->commercial->first_name . ' ' . $this->commercial->last_name) : null,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'type' => $this->type,
            'category' => $this->category,
            'siret' => $this->siret,
            'address' => $this->address,
            'observations' => $this->observations,
            'sector' => $this->sector,
            'kanban_stage' => $this->kanban_stage,
            'temperature' => $this->temperature,
            'is_active' => (bool) $this->is_active,
            'balance' => (float) $this->account_balance,
            'vehicles_count' => $this->vehicles_count,
            'last_contact' => $this->last_contact_date?->toIso8601String(),
            'contacts' => UserResource::collection($this->whenLoaded('contacts')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
