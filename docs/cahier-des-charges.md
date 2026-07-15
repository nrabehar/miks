# Cahier des charges — MIKS

**Gestion de groupes d'investissement collectif**

Version 0.1 — Rédigé à partir du dossier produit (`miks.doc.html`), du document de présentation concept (`miks.investor.html`) et de l'état actuel du code (schéma Prisma, scaffolds API/Web).

---

## Sommaire

1. [Contexte et enjeux](#1-contexte-et-enjeux)
2. [Objectifs du projet](#2-objectifs-du-projet)
3. [Positionnement et périmètre](#3-positionnement-et-périmètre)
4. [Acteurs et profils utilisateurs](#4-acteurs-et-profils-utilisateurs)
5. [Spécifications fonctionnelles](#5-spécifications-fonctionnelles)
6. [Règles de gestion transverses](#6-règles-de-gestion-transverses)
7. [Spécifications techniques](#7-spécifications-techniques)
8. [Modèle de données](#8-modèle-de-données)
9. [Exigences non fonctionnelles](#9-exigences-non-fonctionnelles)
10. [État d'avancement du développement](#10-état-davancement-du-développement)
11. [Points ouverts et risques](#11-points-ouverts-et-risques)
12. [Glossaire](#12-glossaire)

---

## 1. Contexte et enjeux

Partout dans le monde, des groupes de personnes mettent de l'argent en commun pour le faire fructifier ou financer des projets partagés : la **tontine** familiale, le **chama** kenyan, le **njangi** camerounais, la **susu** nigériane, l'**eqb** éthiopien, le **chit fund** sud-asiatique, la **tanda** latino-américaine. À Madagascar comme ailleurs, ces groupes existent et fonctionnent — mais avec des outils inadaptés : un cahier, un fil WhatsApp, un fichier Excel tenu par une seule personne.

Ce mode de fonctionnement artisanal génère des problèmes récurrents et documentés :

| Problème | Description |
|---|---|
| **Opacité financière** | Seul le trésorier a la vue complète ; les autres membres doivent lui faire confiance sans pouvoir vérifier. |
| **Décisions sans mémoire** | Les décisions prises oralement ou sur WhatsApp n'ont pas de trace formelle ; les versions divergent en cas de litige. |
| **Surcharge du trésorier** | Une seule personne porte tout le poids opérationnel (calculs, relances, comptes-rendus) — point de défaillance unique. |
| **Calcul des parts illisible** | La quote-part de chaque membre (proportionnelle à ses cotisations cumulées) devient impossible à suivre manuellement dès que les cotisations varient dans le temps ou entre membres. |
| **Gestion de projets chaotique** | Budget, dépenses, revenus et redistribution d'un projet financé collectivement sont suivis dans des Excel non synchronisés. |

Il n'existe pas aujourd'hui d'outil qui adresse spécifiquement le **club d'investissement** (le capital reste dans le groupe et y fructifie) par opposition à la **tontine rotative / ROSCA** (le pot tourne intégralement d'un membre à l'autre à chaque cycle). Les solutions existantes (voir §3.3) couvrent soit la rotation (Djangui, Money Fellows), soit un marché géographique et bancaire fermé (Chamasoft/EazzyChama au Kenya), soit un usage boursier occidental (Bivio) — aucune ne propose gouvernance par vote, gestion de projets et flux configurables pour ce type de groupe.

## 2. Objectifs du projet

MIKS a pour objectif de fournir une **couche de gestion, de comptabilité et de gouvernance** que le groupe installe par-dessus son fonctionnement habituel (compte bancaire, espèces, mobile money), afin de :

- rendre la situation financière du groupe **visible en temps réel et par tous ses membres**, sans dépendre d'une personne unique ;
- **automatiser** la répartition de l'argent entrant entre les différentes réserves (coffres) du groupe selon des règles définies par le groupe lui-même ;
- calculer **en continu et sans erreur** la quote-part (part) de chaque membre, proportionnelle à ses cotisations cumulées ;
- permettre à tout membre de **proposer un projet**, de le faire approuver par un **vote formel et configurable**, puis d'en suivre la comptabilité de façon indépendante ;
- garantir la **traçabilité intégrale et non falsifiable** de toute opération financière, de tout vote et de tout changement de configuration, via un journal immuable consultable par tous les membres ;
- notifier chaque membre des événements qui le concernent, dans son compte et dans chacun de ses groupes.

**Principe cardinal, à respecter dans toute décision de conception : MIKS n'est pas une banque.** La plateforme n'détient jamais d'argent et n'exécute aucun virement ; elle enregistre des déclarations, calcule des répartitions et rend l'information visible. Toute fonctionnalité qui impliquerait la détention de fonds, l'émission de paiements ou une garantie financière sort du périmètre de MIKS tel que défini par ce document.

## 3. Positionnement et périmètre

### 3.1 Les deux modèles de groupes d'épargne collective

| | Modèle 1 — Tontine rotative (ROSCA) | Modèle 2 — Club d'investissement |
|---|---|---|
| Fonctionnement | Chaque membre cotise ; à tour de rôle, un seul membre reçoit la cagnotte entière | Les membres cotisent et l'argent **reste dans le groupe** |
| Durée du capital | Redistribué intégralement à chaque cycle | Géré et fait fructifier dans la durée |
| Notion de part | Non pertinente (tout le monde reçoit le même montant à tour de rôle) | Centrale — chaque membre a une quote-part proportionnelle |

**MIKS cible exclusivement le modèle 2** — le club d'investissement. Le modèle 1 (couvert par des acteurs comme Djangui ou Money Fellows) est explicitement hors périmètre.

### 3.2 Marché cible

Groupes informels ou semi-formels de type tontine/chama/club d'investissement, prioritairement à Madagascar et dans les marchés francophones/africains où ce type de groupe est répandu mais peu ou mal outillé. La devise par défaut du modèle de données est l'**Ariary malgache (MGA)**, configurable par groupe.

### 3.3 Analyse concurrentielle (résumé)

| Produit | Modèle couvert | Vote/gouvernance | Gestion de projets | Flux configurables | Journal immuable | Zone |
|---|---|---|---|---|---|---|
| **MIKS** | Club d'investissement | Oui | Oui | Oui | Oui | Marché global (Madagascar/Afrique en priorité) |
| Chamasoft | Chama (cotisations + prêts) | Non | Non | Partiel | Non (modifiable par l'admin) | Kenya |
| EazzyChama | Chama, white-label bancaire | Non | Non | Partiel | Non | Kenya (compte Equity Bank requis) |
| Djangui | Tontine rotative | Non | Non | Non | Non | Afrique francophone |
| Money Fellows | Tontine rotative + crédit | Non | Non | Non | Non | Égypte (établissement réglementé) |
| Bivio | Club boursier (actions cotées) | Partiel | Non | Non | Non | USA/UE |

**Conclusion de l'analyse :** aucun concurrent ne couvre à la fois la gouvernance formelle par vote, la gestion de projets intégrée et des flux de répartition librement configurables pour un club d'investissement informel — c'est l'angle que MIKS occupe.

### 3.4 Forces et limites assumées

**Forces** : transparence structurelle (journal immuable), flexibilité totale d'organisation (coffres et flux libres), gouvernance formelle unique sur ce segment, gestion de projets intégrée, multi-groupes par compte, absence de friction réglementaire (pas de détention de fonds).

**Limites assumées** :
- **Aucune vérification automatique des mouvements financiers** — une cotisation ou une dépense est *déclarée* par un membre, MIKS ne peut pas confirmer qu'un virement bancaire a réellement eu lieu.
- **Problème d'amorçage (cold start)** — la valeur de l'outil dépend de l'adoption par l'ensemble du groupe, pas d'un usage individuel.
- **Pas de fonction de crédit** — MIKS ne peut pas avancer de fonds aux membres.
- **Dépendance à la discipline du groupe** — si les membres n'enregistrent pas leurs mouvements, l'outil perd son utilité.

Ces limites doivent être communiquées explicitement aux utilisateurs (ex. dans l'onboarding) plutôt que dissimulées.

## 4. Acteurs et profils utilisateurs

| Acteur | Description |
|---|---|
| **Utilisateur (User)** | Titulaire d'un compte MIKS. Peut appartenir à **plusieurs groupes simultanément**. Un même compte a une identité unique (email et/ou téléphone), et peut se connecter via plusieurs identités (mot de passe local, OAuth). |
| **Créateur de groupe** | Le membre à l'origine du groupe. Mis en avant à titre informatif par MIKS, mais **ne dispose d'aucun privilège technique particulier imposé par la plateforme** — le groupe s'auto-organise. |
| **Membre de groupe (GroupMember)** | Un utilisateur rattaché à un groupe donné, avec un statut (`ACTIVE` / `LEFT`). Peut cotiser, proposer un projet, voter, consulter le tableau de bord et les logs. |
| **Administrateur plateforme (rôle applicatif `ADMIN`)** | Rôle porté par `User.role`, distinct de toute notion de rôle au sein d'un groupe — usage réservé à l'administration de la plateforme MIKS elle-même (support, modération), non à la gouvernance d'un groupe. |

**Règle de gestion clé** : MIKS n'impose aucun rôle hiérarchique (trésorier, président, etc.) au sein d'un groupe. Toute organisation interne (qui décide quoi) est une convention du groupe, non une contrainte du logiciel. Le seul mécanisme de décision formalisé par la plateforme est le **vote**.

## 5. Spécifications fonctionnelles

### 5.1 Groupes

- Un groupe est un espace de travail **totalement indépendant** : ses propres membres, coffres, projets, règles de flux et journal.
- Attributs : nom, description, créateur, devise (`currencyCode`, ex. `MGA`), métadonnées libres.
- Un compte utilisateur peut créer et/ou rejoindre un nombre illimité de groupes.
- Tous les membres d'un groupe ont accès en **lecture seule** au journal du groupe.

### 5.2 Membres

- Un membre a un statut `ACTIVE` ou `LEFT` (avec date d'adhésion et, le cas échéant, date de sortie).
- Tout membre actif peut : proposer un projet, cotiser, voter sur les projets en cours, consulter son tableau de bord personnel (parts, coffre retirable, historique).
- L'appartenance d'un utilisateur à un groupe est unique (un utilisateur ne peut pas avoir deux enregistrements de membre actifs simultanés dans le même groupe).

### 5.3 Coffres (Vaults)

Un groupe crée **autant de coffres que nécessaire** ; MIKS ne prescrit ni leur nombre ni leur usage.

Trois types de coffre :

| Type | Description |
|---|---|
| `GROUP` | Coffre libre créé par le groupe (ex. "Fonds commun", "Réserve", "Logistique"). |
| `WITHDRAWABLE` | **Coffre retirable personnel** — un par membre, créé et alimenté automatiquement par MIKS, jamais créé manuellement. |
| `PROJECT` | Coffre interne à un projet donné, créé pour organiser les flux financiers propres à ce projet. |

Chaque coffre a un solde mis en cache (`cachedBalance`) recalculé à chaque mouvement, dans la devise du groupe.

### 5.4 Flux (Flow rules)

Une **règle de flux** définit comment une entrée d'argent se répartit automatiquement entre les coffres.

Elle est composée de :
- une **source** (`sourceType`) : `CONTRIBUTION` (cotisation), `PROJECT_REVENU` (revenu de projet), `MANUAL_ENTRY` (entrée manuelle) ou `OTHER` ;
- une ou plusieurs **destinations**, chacune étant soit un coffre précis (`VAULT`), soit l'ensemble des coffres retirables des membres (`MEMBER_WITHDRAWABLE_VAULTS`, réparti selon les parts de chacun) ;
- un **pourcentage par destination**, la somme des pourcentages d'une règle devant être égale à 100 %.

**Règle de gestion** : dès qu'une entrée (cotisation, revenu de projet, saisie manuelle) est déclarée, MIKS applique automatiquement la ou les règles de flux actives correspondantes et enregistre les mouvements résultants — sans intervention manuelle du groupe.

> **Exemple** : à chaque cotisation, 25 % vont dans chacun des 4 coffres du groupe (aucune part vers les coffres retirables). Pour un projet donné avec deux coffres dédiés (*Capital Projet*, *Logistique*), les revenus se répartissent : 25 % → Capital Projet, 25 % → Logistique, 50 % → coffres retirables des membres au prorata de leurs parts.

### 5.5 Parts (Shares)

La part d'un membre est calculée par la formule :

```
Part membre (%) = (Cotisations cumulées du membre / Cotisations cumulées du groupe) × 100
```

- Recalculée **en temps réel** après chaque cotisation enregistrée.
- Détermine la quote-part du membre lors de toute distribution vers les coffres retirables (via une destination de flux `MEMBER_WITHDRAWABLE_VAULTS`).
- Mise en cache dans `MemberShareCache` (pourcentage à 4 décimales, total cotisé, date de calcul) pour des lectures rapides sans recalcul à la volée.

### 5.6 Coffre retirable (Withdrawable Vault)

- Chaque membre possède **un et un seul** coffre retirable personnel, créé et alimenté automatiquement selon les règles de flux et la part du membre au moment de chaque distribution.
- Le membre consulte à tout moment le solde de son coffre retirable et l'historique détaillé de ses mouvements.
- Ce coffre n'est **jamais** créé ou modifié manuellement par un membre — MIKS en a l'entière responsabilité applicative.

### 5.7 Projets

MIKS fournit un système **générique** de gestion de projets : la nature du projet (achat, commerce, location, investissement...) est entièrement libre, MIKS n'impose aucune catégorie.

**Cycle de vie** (`ProjectStatus`) : `PENDING` → `APPROVED` ou `REJECTED` → `ACTIVE` → `CLOSED`.

**Soumission** — tout membre actif peut soumettre un projet, comprenant au minimum :
- un titre et une description ;
- un budget demandé (`requestedBudget`) et un coffre source (`sourceVault`) d'où il sera prélevé ;
- les coffres propres au projet (autant que nécessaire) ;
- les règles de flux propres au projet (répartition des revenus/dépenses entre ses coffres et les coffres retirables des membres).

La soumission place le projet en statut `PENDING` et déclenche automatiquement l'ouverture d'un vote (voir §5.8).

**Gestion financière** (une fois `APPROVED`/`ACTIVE`) — comptabilité indépendante par projet :
- entrées (revenus, apports, remboursements) et sorties (dépenses, décaissements) ;
- solde par coffre du projet, suivi en temps réel ;
- application automatique des flux configurés à chaque entrée.

**Suivi et analyses** — pour chaque projet : évolution du capital par coffre dans le temps, total des entrées/sorties, solde net, historique complet des opérations.

> **Exemple** : un projet de revente crée deux coffres (*Stock*, *Logistique*) avec un flux revenus : 30 % → Stock, 20 % → Logistique, 50 % → coffres retirables des membres selon leurs parts. Le budget initial est prélevé sur un coffre existant du groupe ; chaque vente déclarée déclenche la répartition configurée.

### 5.8 Votes

Le vote est le **seul mécanisme de décision formelle** intégré à la plateforme, dédié exclusivement à l'approbation des projets.

**Déclenchement** : la soumission d'un projet ouvre automatiquement une session de vote pour l'ensemble du groupe.

**Configuration**, libre et modifiable à tout moment pour les votes à venir :
- **Seuil d'approbation** (`approvalThreshold`) — pourcentage minimum de votes favorables requis (ex. 50 %, 70 %, unanimité) ;
- **Quorum** (`minQuorum`) — nombre minimum de membres devant s'exprimer pour que le résultat soit valide ;
- **Durée** (`durationHours`) — fenêtre de temps de vote, à l'issue de laquelle le vote se clôture (`scheduledCloseAt`).

**Réponses possibles** (`VoteChoice`) : `FOR`, `AGAINST`, `ABSTAIN` — un seul vote par membre et par session (`@@unique([voteId, memberId])`).

**Résultat**, à la clôture (`VoteStatus`) :
- seuil atteint → projet **`APPROVED`**, le budget est prélevé du coffre source, le projet passe `ACTIVE` ;
- seuil non atteint → projet **`REJECTED`**, aucun fonds prélevé ;
- quorum non atteint → vote **`INVALID`**, le groupe peut relancer un nouveau vote.

Le résultat, chaque vote individuel et l'horodatage sont enregistrés de façon permanente dans le journal du groupe.

### 5.9 Journal immuable & transparence (Logs)

- Toute action significative du groupe est tracée dans un **journal immuable**, horodaté, **non modifiable et non supprimable** par quiconque (y compris un administrateur de groupe).
- Événements tracés : toutes les opérations financières (entrées, sorties, flux entre coffres), tous les votes (proposition, participation individuelle, résultat), les changements de configuration (règles de flux, paramètres de vote), les événements membres (adhésion, sortie, cotisations), et toute autre action significative.
- **Accès** : lecture seule pour tous les membres du groupe. En cas de désaccord ou réclamation, un membre peut consulter l'historique complet pour vérifier la conformité d'une opération.
- Catégories d'événements (`EventCategory`) : `FINANCIAL`, `VOTE`, `PROJECT`, `MEMBER`, `CONFIGURATION`, `ACCOUNT`, `KYC`.

### 5.10 Tableau de bord & analyses

**Vue groupe** :
- solde de chaque coffre (montant actuel et évolution) ;
- capital total du groupe (somme de tous les coffres) ;
- cotisations (taux de participation, historique, retards éventuels) ;
- projets actifs (état, budget consommé, revenus générés, solde net) ;
- votes en cours (participation, résultats) ;
- flux récents (dernières entrées/sorties).

**Vue membre** :
- parts actuelles (pourcentage et valeur en devise) et leur évolution (graphique historique) ;
- solde du coffre retirable et historique des crédits reçus ;
- historique des cotisations (régularité, montants, dates) ;
- historique de participation aux votes.

**Extensibilité** : le tableau de bord doit être conçu pour accueillir de nouvelles métriques/visualisations sans refonte structurelle.

### 5.11 Notifications

MIKS notifie chaque membre de tous les événements qui le concernent, dans son compte personnel et dans chacun de ses groupes.

**Catégories d'événements notifiés** : coffres (mouvement, flux appliqué, crédit sur coffre retirable), cotisations (enregistrement, rappel), projets (nouvelle proposition, mise à jour, clôture), votes (ouverture, rappel avant clôture, résultat), groupe (nouveau membre, changement de configuration, événement important), compte (connexion depuis un nouvel appareil, modification de profil).

**Canaux** : in-app, email, SMS, ou tout autre canal intégré, selon les préférences configurées par chaque utilisateur et par type d'événement (`NotificationPreference` : couple événement × canal × activé/désactivé).

### 5.12 Compte, authentification et sécurité d'accès

Bien que non encore implémenté en code applicatif, le modèle de données prévoit :
- **Identité utilisateur** : email et/ou téléphone (unicité garantie), nom d'affichage, rôle applicatif (`ADMIN`/`USER`).
- **Authentification multi-fournisseur** (`UserIdentity` / `AuthProvider`) : identifiants locaux (mot de passe) ou OAuth, plusieurs identités par utilisateur.
- **Vérification** (`VerificationToken`) : jetons à usage unique avec objectif typé (`VerificationTokenPurpose` — ex. vérification d'email, réinitialisation de mot de passe), nombre de tentatives limité, expiration.
- **Sessions et appareils** (`Session` / `Device`) : sessions par jeton de rafraîchissement, rattachées à un appareil (mobile/tablette/bureau/web/autre), IP et user-agent enregistrés, révocation possible.
- **Authentification par jeton JWT** access/refresh (durées configurables), transport via cookies (`cookie-parser` déjà intégré côté API).

### 5.13 KYC (vérification d'identité) — anticipé, hors dossier produit v0.1

Le schéma de données modélise déjà un sous-système de vérification d'identité (`KycVerification`, `KycDocument`, niveaux et fournisseurs KYC) non décrit dans le dossier produit fonctionnel actuel. Il doit être traité comme une **fonctionnalité de conformité anticipée** (probablement liée à des exigences réglementaires futures ou à un niveau de confiance renforcé pour certains groupes), à spécifier formellement avant implémentation. Ce point est signalé en §11 comme decision à clarifier avec le porteur de produit.

## 6. Règles de gestion transverses

1. **Non-détention de fonds** — aucune fonctionnalité ne doit permettre à MIKS de détenir des fonds, d'initier un virement ou de garantir une somme d'argent. Toute opération financière dans MIKS est une **déclaration** faite par un membre, jamais une exécution de paiement.
2. **Somme des pourcentages de flux = 100 %** — une règle de flux est invalide si la somme des pourcentages de ses destinations n'est pas exactement 100 %.
3. **Un coffre retirable par membre, automatique** — jamais créé ni modifié manuellement, un seul par couple (groupe, membre).
4. **Un vote actif par projet à la fois** — un projet ne peut avoir qu'une session de vote ouverte simultanément (l'attribut `status` du vote permet néanmoins l'historique de votes successifs, ex. après un vote `INVALID`).
5. **Immutabilité du journal** — aucune opération d'édition ou de suppression n'existe sur `AuditLog`, à aucun niveau applicatif (y compris les rôles à privilèges).
6. **Recalcul temps réel des parts** — toute cotisation enregistrée doit déclencher un recalcul (ou une invalidation du cache) de `MemberShareCache` pour tous les membres du groupe concerné.
7. **Traçabilité des renversements** — une transaction peut en annuler une autre via `reversedTransactionId`, mais l'annulation crée une nouvelle transaction ; elle ne supprime ni ne modifie l'original.
8. **Indépendance des groupes** — aucune donnée (coffre, règle de flux, vote, journal) n'est partagée entre deux groupes, même si un même utilisateur appartient aux deux.

## 7. Spécifications techniques

### 7.1 Architecture générale

Architecture en deux applications indépendantes, chacune conteneurisée :

```
┌─────────────────┐        HTTPS / /api/*        ┌──────────────────┐
│   web (nginx)    │ ────────────────────────────▶│   api (Node.js)  │
│  React 19 + Vite │◀──────────────────────────── │   NestJS 11      │
└─────────────────┘                               └─────────┬────────┘
                                                             │
                                                   ┌─────────▼────────┐
                                                   │   PostgreSQL      │
                                                   │  (via Prisma ORM) │
                                                   └────────────────────┘
```

Le frontend ne contacte jamais la base de données directement ; toute la logique métier passe par l'API NestJS. En production, nginx sert le build statique React et proxifie `/api/*` vers le backend (réécriture d'URL, en-têtes de sécurité, limitation de débit).

### 7.2 Backend — API

| Aspect | Détail |
|---|---|
| Framework | NestJS 11 (adaptateur Express) |
| Langage | TypeScript |
| ORM | Prisma v7 (`@prisma/client`, générateur `prisma-client`), adaptateur `@prisma/adapter-pg` |
| Base de données | PostgreSQL (pilote `pg`) |
| Validation | `class-validator` / `class-transformer`, `ValidationPipe` global (whitelist, forbidNonWhitelisted, transform) |
| Authentification (prévue) | JWT access + refresh (secrets et durées via configuration), sessions en cookies (`cookie-parser`) |
| Email (prévu) | Resend (`RESEND_API_KEY`, `RESEND_DOMAIN`) |
| Organisation du code | Modules infra globaux sous `src/lib/<nom>/` (ex. `database`, `config`, à terme `mail`) ; modules métier sous `src/module/<nom>/` (à créer) ; éléments transverses (guards, filtres, intercepteurs) sous `src/common/` |
| Filtres/Intercepteurs globaux déjà en place | `PrismaExceptionFilter`, `HttpExceptionFilter`, `LoggingInterceptor`, `TransformInterceptor` |
| Tests | Jest (unitaires) + configuration e2e dédiée |
| Conteneurisation | `Dockerfile` multi-étapes (dépendances → build avec génération Prisma → dépendances de prod → image d'exécution non-root), écoute sur le port applicatif configuré |

### 7.3 Frontend — Web

| Aspect | Détail |
|---|---|
| Framework | React 19.2 avec React Compiler activé (babel-plugin-react-compiler) |
| Bundler | Vite 8 (via Rolldown) |
| Style | Tailwind CSS 4, composants shadcn/ui (`components.json`), police Geist |
| Organisation prévue | Un dossier par fonctionnalité métier sous `src/features/<nom>/` (miroir des modules API : `account`, `contribution`, `group`, `kyc`, `notification`, `project`, `share`, `transaction`, `vote`...), chacun avec `components/`, `hooks/`, `api.ts` |
| Communication avec l'API | Variable d'environnement `VITE_API_URL`, injectée au build (Docker build-arg) et à l'exécution (template nginx avec `envsubst`) |
| Routage / état / data-fetching | **Non encore choisi** — aucune librairie de routage, de state management ou de fetching de données n'est installée à ce stade (voir §11) |
| Conteneurisation | `Dockerfile` multi-étapes (build Vite → runtime nginx 1.29.4-alpine), configuration nginx templatée |

### 7.4 Infrastructure et déploiement

- Chaque application (`api/`, `web/`) possède son propre `Dockerfile` ; **aucun `docker-compose.yml` ni pipeline CI/CD n'existe actuellement** dans le dépôt — l'orchestration (dev local, staging, production) reste à définir.
- Aucune infrastructure de secrets/config management externe n'est référencée à ce stade (variables d'environnement `.env` en développement).

### 7.5 Configuration et variables d'environnement

**API** (`api/.env.example`, à compléter — voir écart signalé en §11) :

```
PORT=3001
APP_URL=http://localhost:3000
DATABASE_URL='postgres://...'
JWT_ACCESS_SECRET=
JWT_ACCESS_EXPIRES_IN=
JWT_REFRESH_EXPIRES_IN=
RESEND_API_KEY=
```

Variables également lues par `configuration.ts` mais absentes de `.env.example` : `NODE_ENV`, `JWT_REFRESH_SECRET`, `RESEND_DOMAIN`.

**Web** (`web/.env.example`) :

```
VITE_API_URL=http://localhost:3001
```

## 8. Modèle de données

Le schéma Prisma est découpé par domaine sous `api/prisma/models/*.prisma`. Vue d'ensemble des entités et de leurs relations principales :

| Domaine | Modèles | Rôle |
|---|---|---|
| **Compte** (`account.prisma`) | `User`, `AuthProvider`, `UserIdentity`, `VerificationTokenPurpose`, `VerificationToken`, `Device`, `Session` | Identité, authentification multi-fournisseur, sessions, appareils. |
| **Groupe** (`group.prisma`) | `Group`, `GroupMember` | Espace de travail indépendant et son appartenance. |
| **Coffres & Flux** (`project.prisma`, `flow.prisma`) | `Vault`, `FlowRule`, `FlowDestination` | Réserves de capital et règles de répartition automatique. |
| **Projets** (`project.prisma`) | `Project` | Cycle de vie `PENDING → APPROVED/REJECTED → ACTIVE → CLOSED`. |
| **Cotisations** (`contribution.prisma`) | `Contribution` | Paiements périodiques des membres. |
| **Votes** (`vote.prisma`) | `Vote`, `VoteResponse` | Gouvernance formelle des projets. |
| **Transactions** (`transaction.prisma`) | `Transaction` | Mouvements financiers crédit/débit, avec renversement possible. |
| **Journal** (`audit.prisma`) | `AuditLog` | Journal immuable, append-only. |
| **Parts** (`share.prisma`) | `MemberShareCache` | Cache de la quote-part de chaque membre. |
| **KYC** (`kyc.prisma`) | `KycVerification`, `KycDocument` | Vérification d'identité (anticipée, non spécifiée fonctionnellement — voir §5.13). |
| **Notifications** (`notification.prisma`) | `Notification`, `NotificationPreference` | Événements notifiés et préférences par canal. |
| **Référentiels** (`reference.prisma`) | `Currency`, `PaymentMethod`, `NotificationChannel`, `EventType`, `KycLevel`, `KycProvider`, `KycDocumentType` | Tables de référence partagées. |

### 8.1 Relations clés à retenir

- `Group 1—N GroupMember 1—N Contribution` : les cotisations sont rattachées à un membre, pas directement à un utilisateur, pour permettre l'historique même après le départ d'un membre.
- `GroupMember 1—1 Vault (WITHDRAWABLE)` : le coffre retirable est unique par membre (`memberId` unique sur `Vault`).
- `Project 1—N Vault (PROJECT)` et `Project 1—1 Vault (source, optionnel)` : un projet a ses propres coffres et un coffre source d'où le budget est prélevé.
- `Project 1—N Vote`, `Vote 1—N VoteResponse` (unique par membre) : historique complet des sessions de vote d'un projet.
- `FlowRule 1—N FlowDestination` : chaque règle peut avoir plusieurs destinations, chacune avec son pourcentage.
- `Transaction` porte une référence optionnelle à une transaction renversée (`reversedTransactionId`), formant une paire annulation/original sans jamais supprimer de ligne.
- `AuditLog` référence un `EventType` typé par catégorie (`EventCategory`), un groupe (optionnel — certains événements peuvent être globaux au compte) et un acteur (optionnel — actions système).

*(Le détail champ par champ de chaque modèle a été vérifié directement dans le code source lors de la rédaction de ce document et est disponible dans `api/prisma/models/*.prisma`.)*

## 9. Exigences non fonctionnelles

| Catégorie | Exigence |
|---|---|
| **Cohérence financière** | Tout calcul de solde de coffre ou de part de membre doit être reproductible à partir du journal de transactions — pas de source de vérité parallèle. |
| **Intégrité du journal** | Aucune opération de mise à jour ou de suppression ne doit exister, à quelque niveau que ce soit (base de données, ORM, API), sur la table `AuditLog`. |
| **Multi-tenant strict** | Les données d'un groupe ne doivent jamais être accessibles à un utilisateur non membre de ce groupe, quel que soit son rôle applicatif. |
| **Devise** | Chaque groupe a une devise propre (`Group.currencyCode`) ; les montants ne doivent jamais être agrégés entre groupes de devises différentes sans conversion explicite. |
| **Précision numérique** | Les montants sont stockés en `Decimal` (18,2) et les pourcentages en `Decimal` (5,2) ou (7,4) pour les parts — aucun calcul financier ne doit passer par un type flottant. |
| **Traçabilité des accès** | Connexions depuis un nouvel appareil notifiées à l'utilisateur ; sessions révocables. |
| **Disponibilité de l'information** | Le tableau de bord et le solde des coffres doivent refléter l'état réel en temps réel (pas de latence de rafraîchissement perceptible par l'utilisateur). |
| **Auditabilité externe** | Un membre doit pouvoir, sans assistance technique, retracer l'historique complet justifiant un solde ou une décision (exigence directement issue du problème d'opacité financière que MIKS doit résoudre). |
| **Conteneurisation** | Chaque service (api, web) doit rester déployable indépendamment via son `Dockerfile` respectif. |

## 10. État d'avancement du développement

À la date de rédaction de ce document, le projet est à un stade de **scaffold** : les fondations techniques et le modèle de données sont posés, mais **aucun module métier n'est encore implémenté**.

**Fait** :
- Schéma de données Prisma complet et migré (`20260713114141_init`), couvrant l'intégralité des domaines fonctionnels décrits en section 5, y compris le sous-système KYC non encore spécifié fonctionnellement.
- Scaffold API NestJS : configuration typée, connexion Prisma, filtres d'exception et intercepteurs globaux, conteneurisation.
- Scaffold Web React : Tailwind + shadcn configurés, structure de dossiers par fonctionnalité prête (vide), conteneurisation avec proxy nginx configurable.
- Deux documents produit rédigés (fonctionnel v0.1, sections 1 à 9 ; positionnement marché).

**Restant à faire** (hors périmètre de ce document, à traiter via des specs de conception dédiées par module) :
- Tous les modules métier API (`account`/auth, `group`, `flow`, `project`, `contribution`, `vote`, `transaction`, `audit`, `notification`, `kyc`) : aucun contrôleur ni service n'existe au-delà du endpoint `GET /` par défaut.
- Authentification effective (guards JWT, stratégies OAuth) bien que le modèle de données et la configuration l'anticipent déjà.
- Toute l'interface utilisateur (aucune page, aucun routeur, aucune gestion d'état ou de requêtes n'est en place).
- Orchestration de déploiement (pas de `docker-compose`, pas de CI/CD).

## 11. Points ouverts et risques

Ces points doivent être arbitrés avec le porteur de produit avant ou pendant l'implémentation :

1. **KYC non spécifié fonctionnellement** — le schéma modélise un sous-système complet de vérification d'identité qui n'apparaît dans aucun des deux documents produit existants. Faut-il le spécifier avant la V1, le considérer comme une fonctionnalité V2, ou le retirer du schéma s'il n'est plus pertinent ?
2. **Rôle applicatif `ADMIN` sur `User`** — son périmètre exact (administration de la plateforme MIKS uniquement, ou capacités supplémentaires au sein des groupes ?) n'est pas défini dans le dossier produit et doit être clarifié pour éviter toute confusion avec le principe "aucun rôle imposé par groupe".
3. **Choix technique frontend non arbitrés** — routage, gestion d'état, couche de requêtes API : aucune décision n'est prise à ce stade ; à traiter via une session `/architect` avant le démarrage du développement des premières fonctionnalités.
4. **Absence d'orchestration de déploiement** — pas de `docker-compose`, pas de CI/CD ; à définir avant toute mise en environnement partagé (staging/production).
5. **Variables d'environnement incomplètes** — `.env.example` de l'API omet `NODE_ENV`, `JWT_REFRESH_SECRET`, `RESEND_DOMAIN` pourtant lus par la configuration ; à corriger pour fiabiliser l'onboarding développeur.
6. **Modalités précises des règles de flux à cotisation variable** — le dossier produit ne précise pas ce qui se passe si une règle de flux est modifiée alors que des distributions étaient déjà en cours, ni la politique de conservation d'historique des règles de flux modifiées (versionnement des règles ?).
7. **Politique de retrait effectif** — le coffre retirable affiche un solde, mais le dossier produit ne précise pas si/comment un membre "retire" concrètement ces fonds (MIKS n'exécutant pas de virement), ni si un flux de sortie doit être déclaré manuellement par le membre ou le groupe.

## 12. Glossaire

| Terme | Définition |
|---|---|
| **Groupe** | Espace de travail indépendant réunissant des membres autour d'un capital et de projets communs. |
| **Coffre (Vault)** | Réserve nominative de capital au sein d'un groupe ou d'un projet ; trois types : groupe, retirable, projet. |
| **Coffre retirable (Withdrawable Vault)** | Coffre personnel automatique de chaque membre, alimenté selon les règles de flux et sa part. |
| **Flux (Flow rule)** | Règle définissant comment une entrée d'argent se répartit automatiquement entre coffres. |
| **Part (Share)** | Quote-part d'un membre, proportionnelle à ses cotisations cumulées par rapport au total du groupe. |
| **Cotisation (Contribution)** | Paiement périodique effectué par un membre dans le groupe. |
| **Projet** | Initiative proposée par un membre, financée par le groupe après vote, avec sa propre comptabilité. |
| **Vote** | Mécanisme formel de décision du groupe, avec seuil d'approbation, quorum et durée configurables. |
| **Journal immuable (Audit log)** | Registre chronologique de tous les événements significatifs, non modifiable, lisible par tous les membres. |
| **Tontine rotative (ROSCA)** | Modèle où la cagnotte est intégralement redistribuée à un membre différent à chaque cycle — hors périmètre MIKS. |
| **Club d'investissement** | Modèle où le capital reste et fructifie dans le groupe — modèle ciblé par MIKS. |
| **MGA** | Code ISO de l'Ariary malgache, devise par défaut des groupes MIKS. |

---

*Document rédigé à partir de l'analyse du dossier produit (`docs/miks.doc.html`), du document de présentation concept (`docs/miks.investor.html`) et du code source du dépôt à la date du 15 juillet 2026. À maintenir à jour au fil de l'avancement du développement, notamment via `/sync`.*
