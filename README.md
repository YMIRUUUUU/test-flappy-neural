# 🐦 Flappy Bird Neural - Apprentissage par Algorithme Génétique

Un jeu Flappy Bird complet avec IA basée sur des réseaux neuronaux et algorithme génétique.

## 🚀 Déploiement sur GitHub Pages

### Option 1: Désactiver Jekyll (Recommandé)

Si vous déployez depuis la racine du repo :
- Le fichier `.nojekyll` a déjà été créé à la racine
- Configurez GitHub Pages pour utiliser la branche `main` (ou `master`) et le dossier `/ (root)`

Si vous déployez depuis le dossier `docs` :
1. Créez un dossier `docs/` et placez-y tous les fichiers
2. Créez un fichier `docs/.nojekyll` (vide)
3. Configurez GitHub Pages pour utiliser le dossier `/docs`

### Option 2: Utiliser Jekyll (si nécessaire)

Si vous préférez garder Jekyll, créez un fichier `_config.yml` à la racine :

```yaml
theme: jekyll-theme-minimal
```

## 📁 Structure des fichiers

```
.
├── index.html
├── styles.css
├── script.js
├── .nojekyll
└── README.md
```

## 🎮 Fonctionnalités

- **Mode Manuel** : Jouez vous-même avec clic/touches
- **Mode IA** : 100 oiseaux apprennent automatiquement via algorithme génétique
- **Réseaux Neuronaux** : Architecture 4-8-2 (input-hidden-output)
- **Visualisation** : Graphique du réseau neuronal en temps réel
- **Sauvegarde** : Sauvegardez et chargez les meilleurs réseaux

## 🔧 Configuration GitHub Pages

1. Allez dans Settings → Pages de votre repo
2. Source : Choisissez "Deploy from a branch"
3. Branch : Sélectionnez `main` (ou `master`)
4. Folder : `/ (root)` ou `/docs` selon votre configuration
5. Cliquez Save

Le fichier `.nojekyll` désactive le traitement Jekyll pour les sites statiques simples.

