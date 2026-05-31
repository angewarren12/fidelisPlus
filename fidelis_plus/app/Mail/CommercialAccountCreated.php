<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CommercialAccountCreated extends Mailable
{
    use Queueable, SerializesModels;

    public $user;
    public $password;

    /**
     * Create a new message instance.
     */
    public function __construct(User $user, string $password)
    {
        $this->user = $user;
        $this->password = $password;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Bienvenue chez ' . config('app.name') . ' ! Vos accès',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            htmlString: '
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2>Bonjour ' . $this->user->first_name . ',</h2>
                <p>Votre compte commercial a été créé avec succès sur notre plateforme.</p>
                <p>Voici vos identifiants pour vous connecter :</p>
                <ul>
                    <li><strong>Email :</strong> ' . $this->user->email . '</li>
                    <li><strong>Mot de passe :</strong> ' . $this->password . '</li>
                </ul>
                <p>Nous vous conseillons de modifier ce mot de passe dès votre première connexion.</p>
                <br>
                <p>Cordialement,<br> L\'équipe Administration</p>
            </div>
            '
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
