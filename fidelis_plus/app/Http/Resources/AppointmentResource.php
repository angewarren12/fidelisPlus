<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AppointmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'date' => $this->appointment_date->toIso8601String(),
            'is_express' => (bool) $this->is_pass_express,
            'status' => $this->status,
            'vehicle' => new VehicleResource($this->whenLoaded('vehicle')),
            'station' => $this->whenLoaded('station'),
        ];
    }
}
