# EGB Atelier V4 — architecture

## Objectif
Application desktop multiplateforme (macOS + Windows) avec un serveur local embarqué, et un mode serveur autonome pour partager la même base entre plusieurs postes du réseau.

## Modules
- Authentification / profils / droits
- Clients / véhicules
- Devis, OR, BC, réceptions, factures
- Vente / Cession et types de documents personnalisables
- Stock et tarifs de main-d'œuvre avec lookup automatique
- Pièces jointes et communication
- Espace technicien
- Journal d'activité
- Tableau de bord ventes / cessions

## Mode multi-postes
Le serveur autonome (`npm run server`) peut être lancé sur un PC serveur du réseau avec `HOST=0.0.0.0`. Les postes desktop pourront ensuite être configurés pour utiliser l'URL du serveur central (prévu comme évolution de la V4).

## Sécurité
Les mots de passe sont hachés avec `scrypt`, jamais stockés en clair. Les documents en statut `CLOTURE` sont refusés par l'API en modification.

## Évolutivité
Les types Devis/OR/Facture sont stockés dans les paramètres et sont créables via l'interface. Les modules sont séparés côté serveur et la partie UI est organisée par vues.
