<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class VehicleChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Ne jamais bloquer la requête HTTP si le serveur de broadcast est indisponible.
     * L'event sera mis en file d'attente (QUEUE_CONNECTION=database) si un worker tourne,
     * sinon il sera simplement en attente sans casser le flux de création.
     */
    public string $connection = 'database';

    public function __construct(
        public int $vehicleId,
        public int $companyId,
        public string $event = 'updated', // created|updated|deleted
    ) {
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('company.'.$this->companyId),
        ];
    }

    public function broadcastAs(): string
    {
        return 'VehicleChanged';
    }

    public function broadcastWith(): array
    {
        return [
            'vehicle_id' => $this->vehicleId,
            'company_id' => $this->companyId,
            'event' => $this->event,
        ];
    }
}

