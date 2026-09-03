import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';

/**
 * Dictionnaire des clés de validation Laravel → messages français lisibles.
 * Couvre les cas les plus fréquents. Étendre au besoin.
 */
const VALIDATION_MESSAGES: Record<string, string> = {
  'validation.unique':   'Cette valeur est déjà utilisée (doublon).',
  'validation.required': 'Ce champ est obligatoire.',
  'validation.email':    'Adresse email invalide.',
  'validation.max':      'La valeur dépasse la taille maximale autorisée.',
  'validation.min':      'La valeur est trop courte.',
  'validation.in':       'Valeur non autorisée.',
  'validation.numeric':  'Ce champ doit être un nombre.',
  'validation.integer':  'Ce champ doit être un entier.',
  'validation.string':   'Ce champ doit être du texte.',
  'validation.boolean':  'Ce champ doit être vrai ou faux.',
  'validation.array':    'Ce champ doit être une liste.',
  'validation.date':     'Date invalide.',
  'validation.url':      'URL invalide.',
};

/** Labels lisibles pour les champs courants de l'API. */
const FIELD_LABELS: Record<string, string> = {
  email:          'Email',
  first_name:     'Prénom',
  last_name:      'Nom',
  phone:          'Téléphone',
  role:           'Rôle',
  password:       'Mot de passe',
  contact:        'Contact',
  nom:            'Nom',
  prenom:         'Prénom',
  nom_entreprise: 'Nom de l\'entreprise',
  sira_client_id: 'ID client SIRA',
  type:           'Type de compte',
  registration:   'Immatriculation',
  card_number:    'Numéro de carte',
  amount:         'Montant',
  points:         'Points',
  status:         'Statut',
  title:          'Titre',
  description:    'Description',
};

/**
 * Extrait un message d'erreur lisible depuis une réponse HTTP d'erreur Laravel.
 *
 * Priorité :
 *   1. Erreurs de validation 422 (errors.field[0]) — toutes affichées en séquence
 *   2. Message d'erreur Laravel lisible (message ≠ clé de traduction)
 *   3. Messages génériques par code HTTP
 */
export function extractErrorMessage(error: HttpErrorResponse): string {
  const body = error.error;

  // ── 422 Validation errors ──────────────────────────────────────
  if (error.status === 422 && body?.errors && typeof body.errors === 'object') {
    const messages: string[] = [];

    for (const [field, fieldErrors] of Object.entries(body.errors)) {
      const fieldLabel = FIELD_LABELS[field] ?? field;
      const rawErrors = Array.isArray(fieldErrors) ? fieldErrors : [String(fieldErrors)];

      for (const raw of rawErrors) {
        const rawStr = String(raw);
        // Si c'est une clé de traduction Laravel (validation.xxx), on la traduit.
        // Sinon on garde le message tel quel (Laravel peut retourner un message custom).
        const humanMsg = VALIDATION_MESSAGES[rawStr] ?? rawStr;
        messages.push(`${fieldLabel} : ${humanMsg}`);
      }
    }

    if (messages.length > 0) return messages.join('\n');
  }

  // ── Message backend lisible ────────────────────────────────────
  if (body?.message && typeof body.message === 'string') {
    const msg: string = body.message;
    // On évite d'afficher les clés de traduction brutes (ex: "validation.unique")
    if (!msg.startsWith('validation.') && msg.length < 300) {
      return msg;
    }
  }

  // ── Messages génériques par statut ────────────────────────────
  switch (error.status) {
    case 0:    return 'Impossible de joindre le serveur. Vérifiez votre connexion.';
    case 400:  return 'Requête incorrecte (400).';
    case 401:  return 'Session expirée. Veuillez vous reconnecter.';
    case 403:  return 'Vous n\'avez pas les droits pour effectuer cette action.';
    case 404:  return 'Ressource introuvable (404).';
    case 409:  return 'Conflit : cette ressource existe déjà.';
    case 422:  return 'Données invalides. Vérifiez les champs du formulaire.';
    case 429:  return 'Trop de requêtes. Veuillez patienter un instant.';
    case 500:  return 'Erreur serveur interne. Réessayez dans quelques instants.';
    case 502:
    case 503:  return 'Service temporairement indisponible. Réessayez plus tard.';
    default:   return `Erreur inattendue (${error.status}).`;
  }
}

/**
 * Intercepteur global — affiche automatiquement un toast d'erreur pour
 * toute réponse HTTP en erreur, SAUF les 401 (géré par authErrorInterceptor)
 * et les 403 (géré par forbiddenInterceptor).
 *
 * Les composants peuvent toujours ajouter leur propre logique dans le bloc
 * `error:` de leur subscribe(), mais n'ont plus besoin de parser l'erreur
 * eux-mêmes pour l'afficher à l'utilisateur.
 */
export const errorToastInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        // 401 → authErrorInterceptor gère la redirection
        // 403 → forbiddenInterceptor gère le message
        // On évite les doubles toasts pour ces deux cas.
        if (error.status !== 401 && error.status !== 403) {
          const message = extractErrorMessage(error);
          toast.error(message);
        }
      }

      // On re-propage l'erreur pour que les composants puissent
      // aussi réagir (ex: désactiver un spinner, logger, etc.)
      return throwError(() => error);
    })
  );
};
