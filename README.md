# EGB Atelier 5.0

Application de gestion d'atelier automobile EGB MAINTENANCES ET SERVICES.

Cette version est préparée pour un packaging automatique Windows + macOS via GitHub Actions, sans installation locale de Node.js pour l'utilisateur final.

Voir `README_INSTALLATION_GRATUITE.md` pour la procédure complète.

## Fonctions du socle

- Clients et véhicules
- Devis / OR / BC / réceptions / factures
- Vente / Cession
- Types de documents personnalisables
- Stock + lookup automatique des références
- Tarifs main-d'œuvre + lookup automatique
- Documents clôturés verrouillés
- Pièces jointes PDF / photos / documents
- Communications
- Utilisateurs et rôles
- Espace technicien
- Base locale prête à être migrée vers un serveur privé

## Développement local

```bash
npm install
npm start
```

Packaging local :

```bash
npm run dist:win
npm run dist:mac
```

## Production

La méthode recommandée pour obtenir les installateurs sans payer et sans installer les outils de développement sur votre poste est GitHub Actions. Le workflow est dans `.github/workflows/build.yml`.
