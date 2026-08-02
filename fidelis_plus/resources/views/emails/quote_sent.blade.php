<!DOCTYPE html>
<html>
<head>
    <title>Votre devis {{ $quote->quote_number }}</title>
</head>
<body>
    <h2>Bonjour {{ $quote->company->name ?? 'Client' }},</h2>

    @if($customMessage)
        <p>{{ $customMessage }}</p>
    @else
        <p>Suite à votre demande, nous avons le plaisir de vous transmettre notre proposition commerciale.</p>
    @endif

    <p><strong>Devis n° :</strong> {{ $quote->quote_number }}</p>

    @if($quote->vehicles->isNotEmpty())
        <p><strong>Véhicule(s) concerné(s) :</strong> {{ $quote->vehicles->pluck('license_plate')->implode(', ') }}</p>
    @endif

    @if($quote->valid_until)
        <p><strong>Valable jusqu'au :</strong> {{ \Carbon\Carbon::parse($quote->valid_until)->format('d/m/Y') }}</p>
    @endif

    <table cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; margin-top: 16px;">
        <thead>
            <tr style="background-color: #1a1831; color: #ffffff; text-align: left;">
                <th>Description</th>
                <th>Qté</th>
                <th>Prix unitaire</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach($quote->items as $item)
                <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td>{{ $item->description }}</td>
                    <td>{{ $item->quantity }}</td>
                    <td>{{ number_format($item->price, 0, ',', ' ') }} XOF</td>
                    <td>{{ number_format($item->price * $item->quantity, 0, ',', ' ') }} XOF</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <p style="margin-top: 16px; font-size: 16px;"><strong>Montant total : {{ number_format($quote->total_amount, 0, ',', ' ') }} XOF</strong></p>

    <p style="margin-top: 24px;">
        Pour accepter ou refuser ce devis, connectez-vous à votre espace client :
        <a href="{{ $frontendUrl }}/client/quotes">{{ $frontendUrl }}/client/quotes</a>
    </p>

    <br>
    <p>Cordialement,</p>
    <p>L'équipe commerciale Mayelia — Fidelis Plus</p>
</body>
</html>
