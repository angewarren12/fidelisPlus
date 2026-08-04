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
        $appName = config('app.name');
        $roleLabels = [
            'admin' => 'Administrateur',
            'commercial' => 'Commercial / Vendeur',
            'marketing' => 'Marketing',
            'caissier' => 'Caissière station',
            'admin_commercial' => 'Administrateur — Service commercial',
            'admin_marketing' => 'Administrateur — Service marketing',
            'super_admin' => 'Super administrateur',
        ];
        $roleLabel = $roleLabels[$this->user->role] ?? ucfirst($this->user->role);
        $loginUrl = config('app.frontend_url', config('app.url'));

        return new Content(
            htmlString: '
            <!doctype html>
            <html lang="fr">
            <body style="margin:0; padding:0; background-color:#eef5f2; font-family: \'Segoe UI\', Helvetica, Arial, sans-serif;">
                <div style="display:none; max-height:0; overflow:hidden; opacity:0;">Vos accès ' . e($appName) . ' sont prêts &mdash; email et mot de passe provisoire à l\'intérieur.</div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef5f2; padding:40px 16px;">
                    <tr>
                        <td align="center">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background-color:#ffffff; border-radius:28px; overflow:hidden; box-shadow:0 20px 50px rgba(15,25,35,0.12);">

                                <!-- Header -->
                                <tr>
                                    <td style="background-color:#0f2a24; background-image:linear-gradient(135deg,#1b1932 0%,#0f3d35 60%,#006b5d 100%); padding:36px 40px 30px;">
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="width:48px; height:48px; background-color:#ffffff; border-radius:14px; text-align:center; vertical-align:middle;">
                                                    <span style="color:#006b5d; font-size:22px; font-weight:900; line-height:48px; font-family:Georgia,serif;">M</span>
                                                </td>
                                                <td style="padding-left:14px; vertical-align:middle;">
                                                    <p style="margin:0; color:#ffffff; font-size:16px; font-weight:800; letter-spacing:0.02em;">' . e($appName) . '</p>
                                                    <p style="margin:0; color:#8bf9a7; font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.14em;">Gestion commerciale</p>
                                                </td>
                                            </tr>
                                        </table>
                                        <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:26px;">
                                            <tr><td style="background-color:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.25); border-radius:999px; padding:6px 14px;">
                                                <span style="color:#ffffff; font-size:11px; font-weight:700; letter-spacing:0.04em;">&#10024; Compte ' . e($roleLabel) . ' activé</span>
                                            </td></tr>
                                        </table>
                                        <h1 style="margin:22px 0 0; color:#ffffff; font-size:28px; font-weight:900; letter-spacing:-0.02em;">Bonjour ' . e($this->user->first_name) . ' &#128075;</h1>
                                        <p style="margin:8px 0 0; color:#c9d8d4; font-size:14px; line-height:1.6; max-width:420px;">Votre espace a été créé avec succès. Voici vos accès personnels pour démarrer.</p>
                                    </td>
                                </tr>

                                <!-- Body -->
                                <tr>
                                    <td style="padding:34px 40px 8px;">

                                        <!-- Credentials card -->
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4fbf8; border-radius:20px; border:1px solid #dde4e1;">
                                            <tr>
                                                <td style="padding:6px 26px;">

                                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px dashed #cbd8d4;">
                                                        <tr>
                                                            <td style="width:38px; padding:20px 0; vertical-align:top;">
                                                                <div style="width:34px; height:34px; border-radius:10px; background-color:#e0f2ef; text-align:center; line-height:34px; font-size:16px;">&#9993;&#65039;</div>
                                                            </td>
                                                            <td style="padding:20px 0 20px 12px; vertical-align:middle;">
                                                                <p style="margin:0 0 3px; color:#6c7a76; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.12em;">Identifiant / Email</p>
                                                                <p style="margin:0; color:#161d1b; font-size:15px; font-weight:700;">' . e($this->user->email) . '</p>
                                                            </td>
                                                        </tr>
                                                    </table>

                                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td style="width:38px; padding:20px 0; vertical-align:top;">
                                                                <div style="width:34px; height:34px; border-radius:10px; background-color:#e0f2ef; text-align:center; line-height:34px; font-size:16px;">&#128274;</div>
                                                            </td>
                                                            <td style="padding:20px 0 20px 12px; vertical-align:middle;">
                                                                <p style="margin:0 0 6px; color:#6c7a76; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.12em;">Mot de passe provisoire</p>
                                                                <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background-color:#ffffff; border:1.5px dashed #15b9a3; border-radius:10px; padding:8px 16px;">
                                                                    <span style="color:#006b5d; font-size:18px; font-weight:900; letter-spacing:0.18em; font-family:\'Courier New\',monospace;">' . e($this->password) . '</span>
                                                                </td></tr></table>
                                                            </td>
                                                        </tr>
                                                    </table>

                                                </td>
                                            </tr>
                                        </table>

                                        <!-- CTA -->
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                                            <tr><td align="center">
                                                <table role="presentation" cellpadding="0" cellspacing="0">
                                                    <tr><td style="background-color:#006b5d; background-image:linear-gradient(120deg,#006b5d,#15b9a3); border-radius:14px; box-shadow:0 10px 24px rgba(0,107,93,0.28);">
                                                        <a href="' . e($loginUrl) . '" style="display:inline-block; padding:16px 36px; color:#ffffff; font-size:12.5px; font-weight:800; text-transform:uppercase; letter-spacing:0.12em; text-decoration:none;">Accéder à mon espace &rarr;</a>
                                                    </td></tr>
                                                </table>
                                            </td></tr>
                                        </table>

                                        <!-- Steps -->
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;">
                                            <tr>
                                                <td style="font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.14em; color:#006b5d; padding-bottom:14px;">Prochaines étapes</td>
                                            </tr>
                                            <tr>
                                                <td style="padding:10px 0; border-top:1px solid #eef1ef;">
                                                    <span style="display:inline-block; width:20px; height:20px; border-radius:999px; background-color:#1b1932; color:#fff; font-size:11px; font-weight:800; text-align:center; line-height:20px;">1</span>
                                                    <span style="font-size:13.5px; color:#3c4946; margin-left:10px; vertical-align:middle;">Connectez-vous avec l\'email et le mot de passe ci-dessus</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:10px 0; border-top:1px solid #eef1ef;">
                                                    <span style="display:inline-block; width:20px; height:20px; border-radius:999px; background-color:#1b1932; color:#fff; font-size:11px; font-weight:800; text-align:center; line-height:20px;">2</span>
                                                    <span style="font-size:13.5px; color:#3c4946; margin-left:10px; vertical-align:middle;">Changez votre mot de passe dans <em>Mon profil</em></span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:10px 0 4px; border-top:1px solid #eef1ef;">
                                                    <span style="display:inline-block; width:20px; height:20px; border-radius:999px; background-color:#1b1932; color:#fff; font-size:11px; font-weight:800; text-align:center; line-height:20px;">3</span>
                                                    <span style="font-size:13.5px; color:#3c4946; margin-left:10px; vertical-align:middle;">Retrouvez vos clients et devis sur le tableau de bord</span>
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- Security note -->
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fff8e1; border-radius:14px; margin-top:28px;">
                                            <tr><td style="padding:16px 20px; color:#7a5b00; font-size:12.5px; line-height:1.5;">
                                                &#128737;&#65039; <strong>Sécurité :</strong> ce mot de passe est à usage unique. Ne le partagez avec personne et modifiez-le dès votre première connexion.
                                            </td></tr>
                                        </table>

                                    </td>
                                </tr>

                                <!-- Footer -->
                                <tr>
                                    <td style="padding:28px 40px 32px; background-color:#f4fbf8; border-top:1px solid #dde4e1;">
                                        <p style="margin:0 0 4px; color:#161d1b; font-size:12.5px; font-weight:700; text-align:center;">L\'équipe Administration &middot; ' . e($appName) . '</p>
                                        <p style="margin:0; color:#8a9793; font-size:11px; text-align:center;">Cet email vous a été envoyé car un compte a été créé pour vous sur ' . e($appName) . '.</p>
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
