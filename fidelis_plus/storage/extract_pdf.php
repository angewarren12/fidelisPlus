<?php
// Tenter d'extraire le texte du PDF avec plusieurs méthodes
function extractAllText($file) {
    $content = file_get_contents($file);
    
    // Méthode 1: Chercher des chaines ASCII lisibles
    $texts = [];
    // Trouver toutes les séquences de caractères imprimables de 3+ caractères
    preg_match_all('/[ -~\x80-\xFF]{3,}/', $content, $m);
    foreach ($m[0] as $str) {
        $str = trim($str);
        // Garder uniquement les séquences avec des lettres et chiffres
        if (preg_match('/[a-zA-ZÀ-ÿ0-9]{2,}/', $str)) {
            $texts[] = $str;
        }
    }
    return $texts;
}

echo "=== VIGNETTE TARIF ===\n";
$lines = extractAllText('VIGNETTE TARIF.pdf');
// Filtrer pour garder les lignes pertinentes avec prix ou catégories
foreach ($lines as $line) {
    if (preg_match('/[0-9]{3,}|v[ée]hicule|catégorie|tarif|prix|taxe|FCFA|CFA|tech|visite|tonnes?|CV|place|utilitaire|cylindr/i', $line)) {
        echo $line . "\n";
    }
}

echo "\n=== VISITE TECHNIQUE TARIF ===\n";
$lines2 = extractAllText('VISITE TECHNIQUE TARIF.pdf');
foreach ($lines2 as $line) {
    if (preg_match('/[0-9]{3,}|v[ée]hicule|catégorie|tarif|prix|taxe|FCFA|CFA|tech|visite|tonnes?|CV|place|utilitaire|cylindr/i', $line)) {
        echo $line . "\n";
    }
}
