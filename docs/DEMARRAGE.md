# Démarrage développeur

1. Installer Node.js 20+.
2. Dans le dossier du projet : `npm install`
3. Lancer l'application : `npm start`
4. Première connexion : `admin` / `admin`
5. Aller dans Utilisateurs et remplacer le mot de passe administrateur.

## Packaging
- Windows : `npm run dist:win`
- macOS : `npm run dist:mac`

Le packaging macOS doit être produit sur un Mac pour générer un DMG correctement signé/notarisé. Pour une diffusion interne, une archive ZIP peut être suffisante.
