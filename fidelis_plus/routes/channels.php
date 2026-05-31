<?php

use Illuminate\Support\Facades\Broadcast;
use App\Models\Company;

Broadcast::channel('user.{userId}', function ($user, $userId) {
    return (int) $user->id === (int) $userId;
});

Broadcast::channel('company.{companyId}', function ($user, $companyId) {
    $companyId = (int) $companyId;
    if ($user->role === 'admin') return true;
    if ($user->role === 'client') return (int) $user->company_id === $companyId;
    if ($user->role === 'commercial') {
        $company = Company::find($companyId);
        return $company && (int) $company->commercial_id === (int) $user->id;
    }
    if ($user->role === 'marketing') {
        return true;
    }
    return false;
});

