<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Authentifie les appels de l'app mobile client SIRA (système externe, pas un
 * utilisateur Fidelis) via un jeton de service partagé — pas de session Sanctum.
 */
class VerifySiraToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $expected = (string) config('services.sira.token');
        $provided = (string) $request->bearerToken();

        if ($expected === '' || $provided === '' || ! hash_equals($expected, $provided)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Jeton SIRA invalide ou manquant.',
            ], 401);
        }

        return $next($request);
    }
}
