<?php

namespace App\Mail;

use App\Models\LoyaltyMember;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SiraAccessProvided extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public LoyaltyMember $member,
        public ?string $login,
        public ?string $temporaryPassword,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Votre accès à l\'application SIRA - ' . config('app.name'),
        );
    }

    public function content(): Content
    {
        $appName = config('app.name');

        return new Content(
            htmlString: '
            <!doctype html>
            <html lang="fr">
            <body style="margin:0; padding:0; background-color:#eef5f2; font-family: \'Segoe UI\', Helvetica, Arial, sans-serif;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef5f2; padding:40px 16px;">
                    <tr>
                        <td align="center">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background-color:#ffffff; border-radius:28px; overflow:hidden; box-shadow:0 20px 50px rgba(15,25,35,0.12);">
                                <tr>
                                    <td style="background-image:linear-gradient(135deg,#1b1932 0%,#0f3d35 60%,#006b5d 100%); padding:36px 40px 30px;">
                                        <p style="margin:0; color:#8bf9a7; font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.14em;">Carte de fidélité ' . e($appName) . '</p>
                                        <h1 style="margin:14px 0 0; color:#ffffff; font-size:26px; font-weight:900;">Bonjour ' . e($this->member->displayName()) . ' &#128075;</h1>
                                        <p style="margin:8px 0 0; color:#c9d8d4; font-size:14px; line-height:1.6;">Votre carte fidélité a été créée. Utilisez ces accès pour vous connecter à l\'application SIRA et suivre vos points, votre historique et votre carte virtuelle.</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:34px 40px;">
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4fbf8; border-radius:20px; border:1px solid #dde4e1;">
                                            <tr>
                                                <td style="padding:20px 26px;">
                                                    <p style="margin:0 0 3px; color:#6c7a76; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.12em;">Identifiant</p>
                                                    <p style="margin:0 0 16px; color:#161d1b; font-size:15px; font-weight:700;">' . e($this->login ?: $this->member->contact) . '</p>
                                                    ' . ($this->temporaryPassword ? '
                                                    <p style="margin:0 0 6px; color:#6c7a76; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.12em;">Mot de passe provisoire</p>
                                                    <span style="display:inline-block; background-color:#ffffff; border:1.5px dashed #15b9a3; border-radius:10px; padding:8px 16px; color:#006b5d; font-size:18px; font-weight:900; letter-spacing:0.18em; font-family:\'Courier New\',monospace;">' . e($this->temporaryPassword) . '</span>
                                                    ' : '') . '
                                                </td>
                                            </tr>
                                        </table>
                                        <p style="margin:24px 0 0; color:#3c4946; font-size:13px; line-height:1.6;">Téléchargez l\'application SIRA et connectez-vous avec ces identifiants pour accéder à votre carte de fidélité.</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:28px 40px 32px; background-color:#f4fbf8; border-top:1px solid #dde4e1;">
                                        <p style="margin:0; color:#8a9793; font-size:11px; text-align:center;">Cet email vous a été envoyé car une carte fidélité a été créée pour vous chez ' . e($appName) . '.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            '
        );
    }
}
