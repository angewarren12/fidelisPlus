<?php

namespace App\Traits;

use Illuminate\Database\Eloquent\Builder;

trait ScopesByRole
{
    /**
     * Applique automatiquement un filtre company_id si l'utilisateur est un client.
     */
    protected function scopeForUser(Builder $query)
    {
        $user = auth()->user();

        if ($user && $user->role === 'client') {
            return $query->where('company_id', $user->company_id);
        }

        if ($user && $user->role === 'commercial') {
            $modelClass = get_class($query->getModel());
            if ($modelClass === \App\Models\Company::class) {
                return $query->where('commercial_id', $user->id);
            } else {
                return $query->whereHas('company', function ($q) use ($user) {
                    $q->where('commercial_id', $user->id);
                });
            }
        }

        return $query;
    }
}
