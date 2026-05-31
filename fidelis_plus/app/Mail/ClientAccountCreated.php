<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ClientAccountCreated extends Mailable
{
    use Queueable, SerializesModels;

    public $user;
    public $password;
    public $isConversion;

    /**
     * Create a new message instance.
     */
    public function __construct(User $user, string $password, bool $isConversion = false)
    {
        $this->user = $user;
        $this->password = $password;
        $this->isConversion = $isConversion;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $subject = $this->isConversion
            ? 'Félicitations ! Votre compte client est activé - ' . config('app.name')
            : 'Bienvenue chez ' . config('app.name') . ' ! Vos accès client';

        return new Envelope(
            subject: $subject,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        $intro = $this->isConversion
            ? 'Nous avons le plaisir de vous informer que votre compte a été converti avec succès en compte Client.'
            : 'Votre compte client a été créé avec succès sur notre plateforme.';

        return new Content(
            htmlString: '
            <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #006B5D;">Bonjour ' . htmlspecialchars($this->user->first_name) . ',</h2>
                <p>' . $intro . '</p>
                <p>Vous pouvez désormais vous connecter à votre Espace Client pour gérer votre flotte de véhicules, effectuer vos demandes de devis et suivre vos rendez-vous.</p>
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0 0 10px 0;"><strong>Vos identifiants de connexion :</strong></p>
                    <p style="margin: 0 0 5px 0;"><strong>Identifiant (Email) :</strong> ' . htmlspecialchars($this->user->email) . '</p>
                    <p style="margin: 0;"><strong>Mot de passe :</strong> ' . htmlspecialchars($this->password) . '</p>
                </div>
                <p>Pour des raisons de sécurité, nous vous conseillons vivement de modifier votre mot de passe après votre première connexion.</p>
                <br>
                <p>Cordialement,<br>L\'équipe ' . config('app.name') . '</p>
            </div>
            '
        );
    }

    /**
     * Get the attachments for the message.
     */
    public function attachments(): array
    {
        return [];
    }
}
