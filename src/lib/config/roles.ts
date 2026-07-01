export type DefaultRole = {
  name: string;
  description: string;
  adminAccess: boolean;
  appAccess: boolean;
};

export const DEFAULT_ROLES: DefaultRole[] = [
  { name: 'Propriétaire', description: 'Accès racine, gestion des fondateurs', adminAccess: true, appAccess: true },
  { name: 'Fondateur', description: 'Tous les accès (site + admin)', adminAccess: true, appAccess: true },
  { name: 'Responsables', description: 'Gérer le site (articles, validations, modération)', adminAccess: true, appAccess: true },
  { name: 'Journalistes', description: 'Créer des articles (validation requise)', adminAccess: false, appAccess: true },
  { name: 'Correcteur', description: 'Corriger/relire les articles (sans publier)', adminAccess: false, appAccess: true },
  { name: 'Constructeurs', description: 'Création de contenus (validation requise)', adminAccess: false, appAccess: true },
  { name: 'Configurateur WIRED', description: 'Contenu WIRED (validation requise)', adminAccess: false, appAccess: true },
  { name: 'Graphistes', description: 'Accès de base + médias', adminAccess: false, appAccess: true },
  { name: 'Animateurs', description: 'Demandes de points (validation responsable/fondateur)', adminAccess: false, appAccess: true },
];
