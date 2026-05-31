<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Gère une requête entrante.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string[]  ...$roles
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $user = $request->user();

        if (!$user || !in_array($user->role, $roles)) {
            \Illuminate\Support\Facades\Log::warning('Role 403 on ' . $request->path() . ' for user role: ' . ($user ? $user->role : 'guest'));
            return response()->json([
                'status' => 'error',
                'message' => 'Accès refusé. Rôle insuffisant pour cette action.'
            ], 403);
        }

        return $next($request);
    }
}
