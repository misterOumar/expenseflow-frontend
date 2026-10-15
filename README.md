# ExpenseFlow — Front

Interface web d'ExpenseFlow, application de gestion des notes de frais. Elle s'appuie sur l'[API ExpenseFlow](https://github.com/misterOumar/expenseflow) (Spring Boot).

![Angular](https://img.shields.io/badge/Angular-22-DD0031)
![Material](https://img.shields.io/badge/Angular%20Material-22-757575)

## Écrans

| Écran | Rôle | Contenu |
|---|---|---|
| Connexion | Tous | Formulaire email / mot de passe, jeton conservé dans le navigateur |
| Mes notes | Employé, manager, comptable | Liste des notes avec leur statut et leur total. Le comptable y voit les notes approuvées et payées de tous les employés |
| Note de frais | Tous | Brouillon (propriétaire) : saisie de l'en-tête et des lignes (`FormArray`), upload d'un justificatif par ligne, total recalculé en direct, enregistrement, soumission, suppression. Autres statuts : consultation, motif de rejet, réouverture, export PDF, historique. Le comptable y marque une note approuvée comme payée |
| Validation | Manager | Notes de l'équipe en attente, détail des lignes et justificatifs, approbation, rejet avec motif obligatoire |

## Démarrage local

Prérequis : Node.js 24 et l'API démarrée sur `http://localhost:8080` (voir le README de l'API).

```bash
npm ci
npm start
```

L'application est servie sur http://localhost:4200. Le serveur de développement relaie `/api` vers `localhost:8080` (`proxy.conf.json`) : front et API partagent la même origine, aucune configuration CORS n'est nécessaire.

Comptes de démonstration (mot de passe `password`) : `alice@expenseflow.dev` (employée), `manager@expenseflow.dev` (manager), `compta@expenseflow.dev` (comptable).

```bash
npx ng build   # build de production dans dist/frontend/browser
```

## Principes

- **Composants autonomes et signals** : pas de NgModule ni de librairie de gestion d'état. L'état de chaque écran est porté par des `signal` et des `computed`.
- **Authentification** : un intercepteur HTTP ajoute le jeton aux appels de l'API et renvoie vers la connexion en cas de `401`. Les gardes de route protègent l'application et réservent l'écran de validation aux managers. Les règles d'accès restent appliquées par l'API ; le front ne fait qu'adapter l'affichage.
- **Synchronisation d'une note** : l'API expose la note et ses lignes séparément. À l'enregistrement, le formulaire est comparé à la dernière version chargée et seules les lignes ajoutées, modifiées ou supprimées sont envoyées. En cas d'échec en cours de route, la note est rechargée depuis l'API.
- **Fichiers protégés** : justificatifs et PDF exigent le jeton JWT. Ils sont récupérés par `HttpClient` puis proposés au téléchargement, un simple lien ne pouvant pas porter l'en-tête `Authorization`.
- **Erreurs** : le champ `detail` des réponses `ProblemDetail` de l'API est affiché tel quel à l'utilisateur.

## Organisation du code

```
src/app
├── core/     Authentification, intercepteur, gardes, client de l'API, modèles
├── layout/   Barre de navigation
├── shared/   Badge de statut, boîtes de dialogue
└── pages/    login, report-list, report-edit, approvals
```

## Déploiement

Le `Dockerfile` compile l'application avec Node 24, puis la sert avec nginx. nginx :

- relaie `/api`, Swagger UI et la spécification OpenAPI vers l'API, à l'adresse donnée par `API_UPSTREAM` ;
- renvoie `index.html` pour les routes du front ;
- accepte les uploads jusqu'à 6 Mo ;
- met en cache durablement les fichiers à empreinte ;
- ajoute les en-têtes de sécurité (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`) et transmet les en-têtes `X-Forwarded-*` à l'API.

```bash
docker build -t expenseflow-frontend .
docker run -p 8088:80 -e API_UPSTREAM=http://app:8080 expenseflow-frontend
```

| Variable | Défaut | Rôle |
|---|---|---|
| `API_UPSTREAM` | `http://app:8080` | Adresse de l'API, nom de service Docker ou URL publique |

Le conteneur utilise le DNS interne de Docker : il doit être sur le même réseau que l'API quand `API_UPSTREAM` désigne un nom de service.

## Intégration continue

Le workflow GitHub Actions construit l'application en mode production puis l'image Docker, à chaque push sur `main` et sur chaque pull request.
