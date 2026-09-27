# EGB Atelier 5.0 — installation gratuite sur Windows et Mac

## Objectif

Ce projet produit automatiquement :

- un installateur Windows `.exe`
- un installateur macOS Intel `.dmg` + `.zip`
- un installateur macOS Apple Silicon `.dmg` + `.zip`

Aucune licence payante n'est nécessaire pour construire ces versions avec GitHub Actions dans un dépôt public : GitHub indique que l'utilisation des runners standards hébergés est gratuite et illimitée dans les dépôts publics. Pour un dépôt privé, un quota gratuit est inclus puis la facturation peut s'appliquer au-delà de ce quota.

## La méthode la plus simple (sans installer Node.js)

### Étape 1 — créer un compte GitHub

Créer un compte gratuit sur GitHub si vous n'en avez pas.

### Étape 2 — créer le dépôt

Créer un nouveau dépôt appelé par exemple :

`egb-atelier`

Pour conserver la construction gratuite sans quota de minutes, choisir **Public**.

> Attention : un dépôt public rend le code source visible. Ne jamais y mettre de mots de passe, clés API ou données de clients.

### Étape 3 — envoyer le projet

Décompresser le fichier `EGB_Atelier_V5_Source.zip`.

Dans GitHub :

`Add file` → `Upload files`

Puis envoyer **tout le contenu du dossier `EGB_Atelier_V5`**, y compris le dossier caché :

`.github/workflows/build.yml`

Valider avec `Commit changes`.

### Étape 4 — attendre la compilation

Après le premier envoi, GitHub démarre automatiquement :

- Windows x64
- macOS Intel
- macOS Apple Silicon

Ouvrir :

`Actions` → `Construire EGB Atelier`

Attendre que les trois tâches soient terminées avec une coche verte.

### Étape 5 — récupérer le logiciel

Ouvrir l'exécution terminée.

En bas de la page, les artefacts sont disponibles :

- `EGB-Atelier-Windows`
- `EGB-Atelier-macOS-Intel`
- `EGB-Atelier-macOS-Apple-Silicon`

Télécharger celui correspondant à la machine.

## Installation Windows

Dans `EGB-Atelier-Windows`, lancer le `.exe` d'installation.

Windows peut afficher un avertissement SmartScreen car l'application n'est pas signée avec un certificat commercial. C'est normal pour une diffusion gratuite sans certificat payant. Vérifier que le fichier provient bien de votre propre dépôt, puis utiliser `Informations complémentaires` → `Exécuter quand même` si Windows le demande.

## Installation Mac

Choisir :

- `macOS-Intel` pour un Mac Intel
- `macOS-Apple-Silicon` pour Mac M1/M2/M3/M4/etc.

Ouvrir le `.dmg` puis glisser `EGB Atelier` dans `Applications`.

Comme l'application n'est pas signée/notariée avec un compte Apple Developer, macOS peut afficher un avertissement. Pour une première ouverture, utiliser clic droit sur l'application → `Ouvrir`, puis confirmer.

## Première connexion

Utilisateur : `admin`

Mot de passe : `admin`

Après la première connexion, aller dans la gestion des utilisateurs et changer le mot de passe administrateur.

## Sauvegarde

La version actuelle démarre avec une base locale sur chaque ordinateur. Utiliser l'export/sauvegarde du logiciel régulièrement.

Le logiciel est conçu pour pouvoir ensuite être raccordé à un serveur privé centralisé. Cette étape pourra être ajoutée sans refaire les écrans métier.

## Important — données sensibles

Le dépôt GitHub ne doit contenir que le code de l'application. Les données clients, factures, photos et documents restent dans la base locale et le dossier de données de l'application.
