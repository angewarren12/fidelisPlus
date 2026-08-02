<?php

namespace App\Mail;

use App\Models\Quote;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class QuoteSentMail extends Mailable
{
    use Queueable, SerializesModels;

    public Quote $quote;
    public ?string $customMessage;

    /**
     * Create a new message instance.
     */
    public function __construct(Quote $quote, ?string $customMessage = null)
    {
        $this->quote = $quote;
        $this->customMessage = $customMessage;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Votre devis {$this->quote->quote_number} — Fidelis Plus",
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        // Recharge explicitement les relations : après (dé)sérialisation via la queue,
        // les relations chargées avant construction du mailable ne sont pas préservées.
        $this->quote->loadMissing(['items', 'vehicles', 'company']);

        return new Content(
            view: 'emails.quote_sent',
            with: [
                'frontendUrl' => config('app.frontend_url'),
            ],
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
