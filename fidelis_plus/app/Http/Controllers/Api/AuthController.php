<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    /**
     * Connexion de l'utilisateur et génération du token Sanctum.
     */
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'login' => 'required|string', // Peut être email ou téléphone
            'password' => 'required',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        $user = User::where('email', $request->login)
            ->orWhere('phone', $request->login)
            ->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Identifiants invalides.'
            ], 401);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([

            'status' => 'success',
            'data' => [
                'user' => $user->load('company'),
                'token' => $token,
                'token_type' => 'Bearer',
            ]
        ]);
    }

    /**
     * Informations sur l'utilisateur connecté.
     */
    public function me(Request $request)
    {
        $user = $request->user();
        if ($user->role === 'client') {
            $user->load(['company.loyaltyAccounts', 'loyaltyAccounts']);
        } else {
            $user->load('company');
        }

        return response()->json([
            'status' => 'success',
            'data' => $user
        ]);
    }

    /**
     * Déconnexion (Révocation des tokens).
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Déconnexion réussie.'
        ]);
    }

    /**
     * Demande de réinitialisation de mot de passe (envoi email via broker Laravel).
     * Requiert MAIL_* correctement configurés dans .env (voir config/mail.php).
     */
    public function forgotPassword(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        Password::sendResetLink($request->only('email'));

        return response()->json([
            'status' => 'success',
            'message' => 'Si cet e-mail existe, un lien de réinitialisation a été envoyé.',
        ]);
    }

    /**
     * Réinitialisation effective du mot de passe (token issu de l’email Laravel).
     */
    public function resetPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'token' => 'required',
            'password' => 'required|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill(['password' => $password])->save();
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json([
                'status' => 'success',
                'message' => 'Le mot de passe a été réinitialisé.',
            ]);
        }

        $message = match ($status) {
            Password::INVALID_TOKEN => 'Jeton de réinitialisation invalide ou expiré.',
            Password::INVALID_USER => 'Aucun compte ne correspond à cet e-mail.',
            Password::RESET_THROTTLED => 'Veuillez patienter avant une nouvelle tentative.',
            default => 'La réinitialisation a échoué.',
        };

        $code = $status === Password::RESET_THROTTLED ? 429 : 422;

        return response()->json([
            'status' => 'error',
            'message' => $message,
        ], $code);
    }

    /**
     * Mettre à jour le token FCM pour les notifications Push.
     */
    public function updateFcmToken(Request $request)
    {
        $request->validate(['fcm_token' => 'required|string']);

        $request->user()->update(['fcm_token' => $request->fcm_token]);

        return response()->json([
            'status' => 'success',
            'message' => 'Token FCM enregistré.'
        ]);
    }

    /**
     * Mettre à jour les préférences de notifications (mobile).
     */
    public function updateNotificationPreferences(Request $request)
    {
        $prefs = $request->validate([
            'fleet_ct' => 'nullable|boolean',
            'quotes' => 'nullable|boolean',
            'support' => 'nullable|boolean',
            'generic' => 'nullable|boolean',
            'push_enabled' => 'nullable|boolean',
        ]);

        $user = $request->user();
        $current = (array) ($user->notification_preferences ?? []);
        $merged = array_merge($current, $prefs);
        $user->update(['notification_preferences' => $merged]);

        return response()->json([
            'status' => 'success',
            'data' => $merged,
        ]);
    }
}
