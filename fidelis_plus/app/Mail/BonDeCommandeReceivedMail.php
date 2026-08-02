<?php

namespace App\Mail;

use App\Models\Quote;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class BonDeCommandeReceivedMail extends Mailable
{
    use Queueable, SerializesModels;

    public Quote $quote;
    public User $commercial;

    /**
     * Create a new message instance.
     */
    public function __construct(Quote $quote, User $commercial)
    {
        $this->quote = $quote;
        $this->commercial = $commercial;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Bon de commande reçu — Devis {$this->quote->quote_number}",
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        $this->quote->loadMissing('company');

        return new Content(
            view: 'emails.bon_de_commande_received',
            with: [
                'frontendUrl' => config('app.frontend_url'),
            ],
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, Attachment>
     */
    public function attachments(): array
    {
        $path = $this->quote->getRawOriginal('bon_de_commande_url');
        if ($path && Storage::disk('public')->exists($path)) {
            return [Attachment::fromStorageDisk('public', $path)];
        }

        return [];
    }
}
