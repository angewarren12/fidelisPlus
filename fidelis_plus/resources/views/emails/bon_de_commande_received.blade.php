<!DOCTYPE html>
<html>
<head>
    <title>Bon de commande reçu</title>
</head>
<body>
    <h2>Bonjour {{ $commercial->first_name ?? $commercial->name ?? 'Commercial' }},</h2>

    <p>Le client <strong>{{ $quote->company->name ?? 'Inconnu' }}</strong> vient de transmettre le bon de commande du devis <strong>{{ $quote->quote_number }}</strong>.</p>

    <p>Le document est joint à cet email. Merci de l'analyser puis de mettre à jour le statut du devis (Accepter ou Refuser) depuis l'application.</p>

    <p style="margin-top: 24px;">
        <a href="{{ $frontendUrl }}/vente">{{ $frontendUrl }}/vente</a>
    </p>

    <br>
    <p>Cordialement,</p>
    <p>L'équipe Fidelis Plus</p>
</body>
</html>
