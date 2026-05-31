<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class QuoteStatusChanged implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $quoteId,
        public int $companyId,
        public string $quoteNumber,
        public string $status,
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
        return 'QuoteStatusChanged';
    }

    public function broadcastWith(): array
    {
        return [
            'quote_id' => $this->quoteId,
            'company_id' => $this->companyId,
            'quote_number' => $this->quoteNumber,
            'status' => $this->status,
        ];
    }
}

