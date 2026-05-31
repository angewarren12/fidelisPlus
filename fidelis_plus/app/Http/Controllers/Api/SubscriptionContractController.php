<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\SubscriptionContract;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SubscriptionContractController extends Controller
{
    /**
     * Get the subscription contract for a company.
     */
    public function show(int $companyId): JsonResponse
    {
        $company = Company::findOrFail($companyId);
        $contract = $company->subscriptionContract;

        return response()->json([
            'status' => 'success',
            'data' => $contract,
        ]);
    }

    /**
     * Create or update the subscription contract for a company.
     */
    public function store(Request $request, int $companyId): JsonResponse
    {
        $company = Company::findOrFail($companyId);

        $validator = Validator::make($request->all(), [
            'subscriber_name' => 'required|string|max:255',
            'address_zone' => 'nullable|string|max:255',
            'card_number' => 'nullable|string|max:100',
            'subscription_date' => 'required|date',
            'reward_frequency' => 'required|in:monthly,quarterly',
            'status' => 'required|in:draft,signed,expired',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $subscriptionDate = Carbon::parse($request->input('subscription_date'));
        $startDate = $subscriptionDate;
        $endDate = $startDate->copy()->addYears(3);
        $annualEvaluationDate = $startDate->copy()->addYear();

        $contractData = [
            'company_id' => $company->id,
            'subscriber_name' => $request->input('subscriber_name'),
            'address_zone' => $request->input('address_zone'),
            'card_number' => $request->input('card_number'),
            'subscription_date' => $subscriptionDate->toDateString(),
            'start_date' => $startDate->toDateString(),
            'end_date' => $endDate->toDateString(),
            'annual_evaluation_date' => $annualEvaluationDate->toDateString(),
            'min_vehicles_daily' => 10,
            'min_vehicles_monthly' => 50,
            'reward_frequency' => $request->input('reward_frequency'),
            'status' => $request->input('status'),
            'signed_at' => $request->input('status') === 'signed' ? now() : null,
        ];

        $contract = SubscriptionContract::updateOrCreate(
            ['company_id' => $company->id],
            $contractData
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Contrat d\'abonnement enregistré avec succès.',
            'data' => $contract,
        ]);
    }
}
