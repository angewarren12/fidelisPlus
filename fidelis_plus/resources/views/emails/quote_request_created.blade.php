<!DOCTYPE html>
<html>
<head>
    <title>Nouvelle demande de devis</title>
</head>
<body>
    <h2>Bonjour {{ $commercial->name ?? 'Commercial' }},</h2>
    
    <p>Une nouvelle demande de devis a été soumise par votre client <strong>{{ $quoteRequest->company->name ?? 'Inconnu' }}</strong>.</p>
    
    <p><strong>Véhicule concerné :</strong> {{ $quoteRequest->vehicles->pluck('license_plate')->implode(', ') }}</p>
    
    @if($quoteRequest->notes)
        <p><strong>Notes du client :</strong> {{ $quoteRequest->notes }}</p>
    @endif
    
    <p>Veuillez vous connecter à l'interface d'administration pour traiter cette demande et générer le devis correspondant.</p>
    
    <br>
    <p>Cordialement,</p>
    <p>L'équipe Fidelis Plus</p>
</body>
</html>
