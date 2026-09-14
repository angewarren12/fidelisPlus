<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Authentifie les appels de l'app mobile client SIRA (système externe, pas un
 * utilisateur Fidelis) via un jeton de service partagé — pas de session Sanctum.
 * Conforme à la spec SIRA v2.1 (§3 & §8) :
 * - Gestion du header X-Request-Id
 * - Format d'erreur standardisé (error_code: invalid_token, request_id)
 */
class VerifySiraToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $requestId = $request->header('X-Request-Id') ?? (string) Str::uuid();
        $expected = (string) config('services.sira.token');
        $provided = (string) $request->bearerToken();

        if ($expected === '' || $provided === '' || ! hash_equals($expected, $provided)) {
            return response()->json([
                'status' => 'error',
                'error_code' => 'invalid_token',
                'message' => 'Jeton SIRA invalide ou manquant.',
                'request_id' => $requestId,
            ], 401)->header('X-Request-Id', $requestId);
        }

        /** @var Response $response */
        $response = $next($request);
        $response->headers->set('X-Request-Id', $requestId);

        return $response;
    }
}
