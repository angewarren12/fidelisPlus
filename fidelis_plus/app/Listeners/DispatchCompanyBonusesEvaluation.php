<?php

namespace App\Listeners;

use App\Events\VehicleChanged;
use App\Jobs\EvaluateCompanyBonusesJob;

class DispatchCompanyBonusesEvaluation
{
    public function handle(VehicleChanged $event): void
    {
        EvaluateCompanyBonusesJob::dispatch($event->companyId);
    }
}
