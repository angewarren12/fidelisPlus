<!DOCTYPE html>
<html>
<head>
    <title>Devis expiré</title>
</head>
<body>
    <h2>Bonjour {{ $commercial->name ?? 'Commercial' }},</h2>
    
    <p>Le devis <strong>{{ $quote->quote_number }}</strong> pour le client <strong>{{ $quote->company->name ?? 'Inconnu' }}</strong> est arrivé à échéance ({{ \Carbon\Carbon::parse($quote->valid_until)->format('d/m/Y') }}).</p>
    
    <p>Son statut a été automatiquement mis à jour à "Expiré".</p>
    
    <p>Veuillez prendre contact avec le client si nécessaire ou relancer un nouveau devis.</p>
    
    <br>
    <p>Cordialement,</p>
    <p>L'équipe Fidelis Plus</p>
</body>
</html>
