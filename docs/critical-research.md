# Analyse cinéphile à la demande

Dans Railway, sur le service `cineapi`, ajouter une variable d'environnement
`OPENAI_API_KEY` contenant une clé API OpenAI avec facturation active. La clé
reste côté serveur ; ne pas la placer dans Nuxt, Git ou une URL. Le modèle peut
être changé avec `OPENAI_RESEARCH_MODEL` (par défaut `gpt-5.5`).

Le bouton **Analyser ce film** dans chaque fiche de Présélections lance une
recherche web en arrière-plan pour ce film uniquement. Le navigateur interroge
ensuite l'API toutes les cinq secondes. Le texte et les URLs citées sont
conservés dans `FilmRecommendation.evidence.criticalAnalysis` pour le cinéma
choisi ; recharger la page ne relance pas la recherche payante. Le bouton
**Actualiser cette analyse** lance une nouvelle recherche explicitement.

L'analyse privilégie les revues et la presse cinéphiles et demande de comparer
leurs avis. Une source absente est signalée, et les entrées observées de la salle
restent un contexte descriptif. Les résultats sont une aide à la décision à
vérifier dans les articles liés. Aucune migration Prisma n'est nécessaire.

Si la clé manque, l'API renvoie 503 avec un message explicite. En cas d'échec
du fournisseur, le bouton peut être relancé ; les logs Railway contiennent le
code d'erreur sans afficher la clé. Les appels du modèle et les recherches web
peuvent être facturés par le fournisseur.
