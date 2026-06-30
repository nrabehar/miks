# MIKS — Instructions Claude Code

## Documentation

Toute documentation produit, technique ou d'analyse doit être créée dans le dossier `docs/` sous forme de fichier HTML **statique et autonome** (CSS inline, aucune dépendance externe).

- Chemin : `docs/<nom-descriptif>.html`
- Format : HTML avec styles `<style>` dans le `<head>` — pas de CDN, pas de fichiers CSS séparés
- Ne jamais utiliser l'outil Artifact pour produire de la documentation liée à ce projet
- Les deux fichiers existants (`docs/miks.doc.html`, `docs/schama.viz.html`) servent de référence de style

Cette règle s'applique à : rapports d'analyse, specs produit, schémas de données, guides d'architecture, et tout autre document destiné à être conservé dans le projet.
