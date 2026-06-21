# MIKS — Dossier de Présentation Complet
### Système d'Exploitation Numérique des Coopératives Autonomes

> **Version** : 1.0 | **Contexte** : SaaS B2B Madagascar & Afrique francophone  
> **Sources analysées** : `project_types.jsx`, `features_catalog.jsx`, `Miks_Project_Presentation_v1.pdf`

---

## Table des matières

1. [Vision & Positionnement stratégique](#1-vision--positionnement-stratégique)
2. [Nature juridique & modèle économique](#2-nature-juridique--modèle-économique)
3. [Architecture financière — Les 3 Coffres](#3-architecture-financière--les-3-coffres)
4. [Modèle de capitalisation & Proof of Stake](#4-modèle-de-capitalisation--proof-of-stake-pos)
5. [Les 10 types de projets](#5-les-10-types-de-projets)
6. [Moteur de gouvernance unifié](#6-moteur-de-gouvernance-unifié)
7. [Catalogue complet des fonctionnalités (130+)](#7-catalogue-complet-des-fonctionnalités-130)
8. [Failles systémiques & atténuations techniques](#8-failles-systémiques--atténuations-techniques)
9. [Roadmap par phases (MVP → V3)](#9-roadmap-par-phases-mvp--v3)
10. [Résumé synthétique pour l'IA](#10-résumé-synthétique-pour-lia)

---

## 1. Vision & Positionnement stratégique

**MIKS** est une plateforme SaaS conçue pour **digitaliser et autonomiser les organisations coopératives informelles** — principalement les groupes **tontine** à Madagascar et en Afrique francophone.

### Problème résolu

Les groupes tontine (cotisations collectives, projets partagés, gouvernance entre pairs) fonctionnent encore quasi-exclusivement sur papier, via Excel ou WhatsApp. Cela génère :
- Opacité financière → risque de fraude ou d'erreur
- Absence de traçabilité des votes et des décisions
- Impossibilité de gérer plusieurs projets en parallèle
- Accès au crédit impossible (pas d'historique formalisé)

### Ce que MIKS apporte

| Sans MIKS | Avec MIKS |
|---|---|
| Carnet papier ou Excel | Grand Livre numérique immuable |
| Vote à main levée | Moteur de vote typé, horodaté, archivé |
| Trésorier = boîte noire | Double signature + audit trail complet |
| 1 projet à la fois | 10 types de projets simultanés |
| Aucun accès au crédit formel | Dossier bancaire auto-généré |

### Positionnement

MIKS **n'est pas** :
- Une banque ou un établissement financier
- Un dépositaire de fonds (il ne touche jamais l'argent réel)
- Un portefeuille Mobile Money

MIKS **est** :
- Une **infrastructure logicielle pure** (SaaS)
- Un **Grand Livre Comptable automatisé, immuable et transparent**
- Un **moteur de gouvernance collective** synchronisé par événements avec les flux financiers réels

---

## 2. Nature juridique & modèle économique

### Souveraineté des fonds

> **100% de la liquidité réelle reste localisée** sur les comptes bancaires, portefeuilles Mobile Money (Orange Money, MTN, Wave, M-Pesa, MVola, Airtel Money) ou portefeuilles numériques propres à chaque organisation.

MIKS ne déplace pas l'argent. Il **enregistre, calcule et gouverne** les mouvements décidés et exécutés par le groupe lui-même.

### Modèle économique

- **Abonnement mensuel ou annuel** calculé par organisation (workspace)
- **Zéro prélèvement** sur les cotisations des utilisateurs
- Modèle B2B : le client est le groupe organisé, pas l'individu

---

## 3. Architecture financière — Les 3 Coffres

Le cœur algorithmique de MIKS est un **système de ventilation automatique** du capital entrant en trois compartiments distincts. Les ratios sont définis par la gouvernance de chaque communauté.

```
Ctotal = C1 (Liquidité) + C2 (Investissement) + C3 (Sécurité)
```

### Tableau des 3 coffres

| # | Coffre | Usage Opérationnel | Statut Liquidité |
|---|---|---|---|
| **C1** | 🟢 **Liquidité** | Prêts internes, retraits des bénéfices disponibles, urgences immédiates, gestion du fonds de roulement | **Liquide** (Disponible) |
| **C2** | 🔵 **Investissement** | Financement de projets validés par vote, acquisition d'actifs tangibles, dépenses de développement (matériel, logistique, marketing) | **Illiquide** (Bloqué) |
| **C3** | 🟠 **Sécurité** | Fonds de réserve, assurance collective, mécanisme de stabilisation en cas de défaut de prêt ou de crise systémique | **Semi-Liquide** |

### Ventilation automatisée

Un **Worker (tâche de fond)** exécute chaque nuit le calcul de répartition basé sur les règles dynamiques de l'organisation. Chaque entrée de capital est automatiquement ventilée selon les ratios définis par vote.

---

## 4. Modèle de capitalisation & Proof of Stake (PoS)

### Concept clé : Parts Sociales

> Toute cotisation validée via la liaison d'API externe **détruit la nature liquide du dépôt** pour générer des **Parts Sociales non retirables**.

Les parts sociales mesurent la contribution historique cumulative d'un membre. Elles déterminent :

1. **Le poids du droit de vote** — Plus tu as contribué, plus ton vote compte
2. **La quote-part lors de la distribution de dividendes** — Proportionnel à tes parts

### Formule de distribution des dividendes

```
Dividendeₙ = Bénéfices × (Partsₙ / Partstotales) × Coeff_Activitéₙ
```

Le **Coefficient d'Activité** est un multiplicateur défini par la gouvernance qui récompense les membres actifs (participation aux votes, missions accomplies, régularité de cotisation).

### Calcul de la quote-part (Equity Engine)

```
Quote-part membre (%) = (Cumul cotisations membre / Cumul cotisations global) × 100
```

Ce calcul est **temps réel** — mis à jour après chaque saisie de cotisation.

---

## 5. Les 10 types de projets

MIKS supporte nativement **10 types de projets**, chacun avec son propre formulaire de soumission, ses flux financiers, ses rôles et ses métriques. Tous partagent le même moteur de gouvernance.

---

### 🛒 1. Projet Commercial (Négoce & Revente)

**Description** : Le groupe achète des produits pour les revendre avec une marge. La caisse avance le capital, les membres exécutent les tâches et sont rémunérés. La marge nette retourne en caisse.

**Flux** : `Caisse → Achat → Vente → Marge → Caisse`

| Champs obligatoires | Métriques de suivi |
|---|---|
| BFR nécessaire | Marge brute réalisée |
| Fournisseur (sourcing) | Marge nette reversée en caisse |
| Prix achat / prix vente | Taux de commandes annulées |
| Membres volontaires par rôle | Commissions versées par rôle |
| Analyse des risques (min. 3) | |

**Exemples Madagascar** : Revente de vêtements achetés à Analakely, négoce de produits alimentaires en gros, import-revente de matériel électronique

**Retour financier** : Oui — marge nette  
**Risque principal** : Annulation client, invendu  
**Spécificité** : Grille tarifaire contractuelle, gestion COD, acompte obligatoire hors réseau de confiance

---

### 🏗️ 2. Projet d'Investissement (Actifs collectifs)

**Description** : Le groupe investit dans un actif tangible ou financier (terrain, équipement, véhicule, obligation) détenu collectivement. Retour différé sous forme de revenus passifs ou plus-value.

**Flux** : `Caisse → Acquisition → Actif collectif → Revenus passifs`

**Exemples Madagascar** : Achat collectif d'un terrain à Antananarivo, acquisition d'un véhicule pour les livraisons, placement en bons du Trésor malgache

**Retour financier** : Oui — différé (revenu passif ou plus-value)  
**Risque principal** : Dépréciation, litige de co-propriété  
**Spécificité** : Quote-part de chaque membre sur l'actif calculée au moment de l'achat ; gestion dans le bilan du workspace

---

### 🤝 3. Projet de Solidarité (Entraide & Urgence)

**Description** : Le groupe mobilise une partie de la caisse ou de la réserve de prévoyance pour aider un membre en difficulté. C'est un **don collectif, pas un prêt**.

**Flux** : `Caisse/Réserve → Don → Membre aidé (sans retour attendu)`

**Exemples Madagascar** : Aide médicale pour un membre hospitalisé, contribution funéraires (famadihana, décès), soutien après perte d'emploi

**Retour financier** : Non — don collectif  
**Risque principal** : Abus du dispositif, épuisement de la réserve  
**Spécificité** : Vote à **70% requis**. Plafonné à X% de la caisse (configurable). Peut puiser dans la réserve de prévoyance dédiée

---

### 💳 4. Prêt à un Membre (Micro-crédit interne)

**Description** : La caisse avance une somme à un membre selon un échéancier voté. Le groupe peut décider d'un taux d'intérêt ou d'un prêt sans intérêt.

**Flux** : `Caisse → Prêt → Membre → Remboursements → Caisse (+intérêts optionnels)`

**Exemples Madagascar** : Avance pour création d'une petite activité personnelle, prêt pour frais de scolarité, micro-crédit pour achat de fonds de commerce

**Retour financier** : Oui — remboursement + intérêts optionnels  
**Risque principal** : Non-remboursement, tension entre membres  
**Spécificité** : Alertes automatiques en cas de retard ; déduction possible sur la quote-part si défaut persistant

---

### 🎉 5. Projet Événementiel (Célébrations & Rassemblements)

**Description** : Le groupe organise un événement collectif financé par la caisse ou par des contributions volontaires. Pas de retour financier — dépense collective pour la cohésion.

**Flux** : `Caisse / Contributions volontaires → Dépenses événement`

**Exemples Madagascar** : Fête de fin d'année, voyage collectif, cérémonie de lancement du premier projet

**Retour financier** : Non — dépense collective  
**Risque principal** : Dépassement de budget  
**Spécificité** : Plafond défini lors du vote ; chaque dépense tracée avec reçu

---

### 📚 6. Projet de Formation (Développement des compétences)

**Description** : Le groupe finance une formation pour un ou plusieurs membres. Investissement immatériel — les compétences acquises bénéficient à tout le groupe via les futurs projets.

**Flux** : `Caisse → Frais de formation → Compétences → Bénéfice collectif futur`

**Exemples Madagascar** : Formation en vente et négociation, cours de comptabilité pour le Co-Trésorier, formation gestion de réseaux sociaux (Facebook)

**Retour financier** : Indirect — compétences du groupe  
**Risque principal** : Membre formé qui quitte le groupe  
**Spécificité** : Clause de remboursement partiel si départ dans les X mois suivant la formation

---

### 🎯 7. Épargne Cible (Objectif collectif bloqué)

**Description** : Le groupe épargne vers un objectif précis avec une date cible. Le montant est mis de côté dans une sous-caisse dédiée et **ne peut pas être utilisé** avant l'objectif ou par vote extraordinaire.

**Flux** : `Contributions régulières → Sous-caisse dédiée → Déblocage à l'objectif`

**Exemples Madagascar** : Épargner 2 000 000 Ar pour l'achat d'un terrain dans 18 mois, constituer un fonds de démarrage entreprise

**Retour financier** : Non — épargne bloquée jusqu'à l'objectif  
**Risque principal** : Décaissement anticipé par urgence  
**Spécificité** : Sous-caisse visuelle avec barre de progression ; déblocage uniquement par vote à 70% ou à la date cible

---

### 🔄 8. Tontine Rotative (Pot tournant classique)

**Description** : Le modèle traditionnel — chaque semaine ou mois, la totalité du pot collecté est remise à un seul membre selon un ordre prédéfini. Tous les membres reçoivent à tour de rôle.

**Flux** : `Cotisations → Pot → Membre du tour → Tour suivant`

**Exemples Madagascar** : Tontine classique entre amis 10 membres × 50 000 Ar/mois, tontine familiale pour les dépenses saisonnières

**Retour financier** : Oui — à chaque membre à son tour  
**Risque principal** : Membres recevant tôt qui abandonnent ensuite  
**Spécificité** : Calendrier des tours visible par tous ; membres ayant déjà reçu ne peuvent pas quitter sans avoir cotisé pour les autres

---

### 🌾 9. Projet de Production (Agriculture, artisanat, fabrication)

**Description** : Le groupe produit quelque chose (culture agricole, artisanat, transformation alimentaire). Inclut des coûts de production, de transformation et de valorisation.

**Flux** : `Caisse → Intrants/Travail → Production → Transformation → Vente → Revenus → Caisse`

**Exemples Madagascar** : Culture collective de légumes revendus au marché, fabrication de confitures, élevage collectif (poulets, zébus), artisanat vendu en ligne

**Retour financier** : Oui — revenus de la production  
**Risque principal** : Mauvaise récolte, marché peu porteur, coûts imprévus  
**Spécificité** : Gestion des coûts de production séparée des coûts d'exploitation

---

### 🔧 10. Projet de Service (Prestation collective)

**Description** : Les membres offrent collectivement un service à des clients externes. Les revenus sont collectivisés et répartis selon les règles du groupe.

**Flux** : `Compétences membres → Service client → Paiement → Caisse → Rémunération + Réinvestissement`

**Exemples Madagascar** : Service de nettoyage résidentiel, jardinage, transport et déménagement léger, prestations informatiques, cuisine traiteur

**Retour financier** : Oui — revenus de prestation  
**Risque principal** : Disponibilité des membres, qualité variable  
**Spécificité** : Attribution des missions selon disponibilités ; reçus de prestation générés automatiquement

---

## 6. Moteur de gouvernance unifié

> **Principe fondamental** : Tous les 10 types de projets partagent exactement le **même moteur de validation**. Le type de projet change le formulaire et les métriques, jamais la gouvernance.

### Pipeline de validation (Machine à états)

```
PROPOSAL → FEASIBILITY_ANALYTICS → VOTING [Quorum + Timer] → FUNDED → OPERATIONAL
```

### Les deux phases de vote

| Phase | Type | Seuil | Usage |
|---|---|---|---|
| **Vote Phase 1** | Orientation | **50% + 1** (majorité simple) | Faisabilité, go/no-go initial |
| **Vote Phase 2** | Validation | **70%** (majorité qualifiée) | Approbation finale, déblocage du budget |

### Types de votes disponibles

- **Orientation** : 50%+1 — Décisions stratégiques légères
- **Validation** : 70% — Projets, budget, exclusions
- **Admission** : Vote d'intégration d'un nouveau membre
- **Exclusion** : Vote disciplinaire (nominatif par défaut)
- **Dissolution** : Vote de fermeture du workspace
- **Modification Charte** : Changement des règles fondamentales

### Règles de gouvernance communes à tous les projets

1. Dossier de soumission typé obligatoire
2. Analyse des risques documentée (minimum 3 risques avec atténuations)
3. Budget approuvé avant tout décaissement
4. Double signature Co-Trésorier pour tout décaissement > seuil
5. Suivi financier en temps réel obligatoire
6. Rapport de clôture et bilan automatique

---

## 7. Catalogue complet des fonctionnalités (130+)

### Vue d'ensemble par catégorie et phase

| Catégorie | MVP | V1 | V2 | V3 | Total |
|---|---|---|---|---|---|
| Workspace & Onboarding | 5 | 0 | 3 | 0 | 8 |
| Cotisations & Épargne | 5 | 1 | 5 | 1 | 12 |
| Trésorerie & Comptabilité | 4 | 4 | 4 | 2 | 14 |
| Gouvernance & Décisions | 4 | 3 | 4 | 1 | 12 |
| Moteur de Projets — Commun | 6 | 4 | 0 | 0 | 10 |
| Projets — Commerce & Production | 1 | 3 | 8 | 0 | 12 |
| Projets — Épargne, Crédit & Tontine | 0 | 5 | 5 | 0 | 10 |
| Projets — Solidarité, Formation & Événements | 0 | 3 | 7 | 0 | 10 |
| Logistique & Livraison | 0 | 3 | 2 | 3 | 8 |
| Membres & RH | 0 | 4 | 3 | 0 | 8 |
| Communication & Notifications | 4 | 2 | 3 | 0 | 9 |
| Sécurité & Contrôle | 3 | 1 | 3 | 2 | 9 |
| Analytics & Intelligence | 2 | 3 | 4 | 1 | 10 |
| Intégrations & Mobile Money | 0 | 1 | 5 | 2 | 8 |
| Légal & Formalisation | 0 | 3 | 3 | 0 | 6 |
| Écosystème & Multi-Groupe | 0 | 1 | 2 | 4 | 7 |

---

### Catégorie : Workspace & Onboarding

| ID | Fonctionnalité | Phase | Description |
|---|---|---|---|
| W01 | Création de workspace guidée | MVP | Assistant 3 étapes : nom du groupe → règles → invitation. Opérationnel en < 5 minutes |
| W02 | Invitation par lien ou SMS | MVP | Lien sécurisé avec expiration configurable + envoi SMS direct |
| W03 | Parrainage formalisé (2 parrains) | MVP | Toute candidature requiert 2 parrains désignés. Responsabilité morale tracée |
| W04 | Vote d'admission automatisé | MVP | Vote déclenché automatiquement à chaque candidature |
| W05 | Multi-workspace (1 compte, N groupes) | V2 | Un utilisateur appartient à plusieurs groupes avec un seul compte |
| W06 | Workspace depuis un template | V2 | Templates prédéfinis : Tontine Rotative, Caisse de Solidarité, Club d'Épargne |
| W07 | Onboarding interactif 7 jours | MVP | Checklist guidée : Mobile Money configuré, 1ère cotisation, 1er vote |
| W08 | Page publique du workspace | V2 | Page partageable pour recruter sans exposer les données financières |

---

### Catégorie : Cotisations & Épargne (sélection MVP/V1)

| ID | Fonctionnalité | Phase | Points clés |
|---|---|---|---|
| C01 | Saisie batch cotisations (mode dimanche) | MVP | Interface rapide, validation en 1 clic pour tous les cotisants |
| C02 | Moteur Equity temps réel | MVP | Calcul automatique des quotes-parts après chaque saisie |
| C03 | Historique immuable des cotisations | MVP | Append-only en base. Audit trail complet, non modifiable |
| C04 | Snapshot trimestriel officiel | MVP | Valorisation figée publiée chaque 1er dimanche du trimestre |
| C05 | Suivi des retards avec niveaux d'alerte | MVP | Vert / Jaune (1–7j) / Rouge (>7j). Suspension vote à J+8 |
| C12 | Historique de l'évolution de ma quote-part | V1 | Graphique personnel de l'évolution de la part au fil du temps |

---

### Catégorie : Trésorerie & Comptabilité (MVP)

| ID | Fonctionnalité | Phase | Points clés |
|---|---|---|---|
| T01 | Grand livre numérique immuable | MVP | Chaque transaction tracée (IN/OUT) avec catégorie, auteur, horodatage |
| T02 | Workflow de double signature | MVP | Tout décaissement > seuil requiert co-validation Co-Trésorier en 2h |
| T03 | Réserve de prévoyance automatique (5%) | MVP | Prélèvement auto de 5% de chaque marge. Mobilisation soumise à vote |
| T04 | Rapport hebdomadaire automatisé | MVP | Draft généré chaque dimanche 22h. Co-Trésorier valide en 12h |

---

### Catégorie : Sécurité & Contrôle

| ID | Fonctionnalité | Phase | Points clés |
|---|---|---|---|
| S01 | OTP SMS pour actions sensibles | MVP | Code unique requis pour décaissement, changement de rôle, exclusion |
| S02 | Isolation multi-tenant (Row Level Security) | MVP | Cloisonnement DB par workspace. Zéro fuite inter-workspace |
| S03 | Audit trail immuable | MVP | Toutes les actions tracées : qui, quoi, quand, depuis quelle IP |
| S04 | Détection de comportements suspects | V2 | Alertes : connexions multiples, décaissement à heure inhabituelle |

---

### Catégorie : Intégrations & Mobile Money

| ID | Fonctionnalité | Phase | Opérateur |
|---|---|---|---|
| I01 | Webhook MVola (Telma) | V2 | Chaque paiement reçu proposé automatiquement à l'imputation |
| I02 | Webhook Orange Money | V2 | Même mécanisme que MVola |
| I03 | Intégration Airtel Money | V3 | Troisième opérateur Mobile Money malgache |
| I04 | QR code de paiement du workspace | V2 | QR code unique par workspace pour recevoir les cotisations |
| I05 | Lien de paiement dynamique | V2 | Lien personnalisé envoyé chaque dimanche à chaque membre |
| I06 | Export Google Sheets en temps réel | V1 | Synchronisation automatique du tableau de bord |

---

### Catégorie : Analytics & Intelligence

| ID | Fonctionnalité | Phase | Description |
|---|---|---|---|
| A01 | Dashboard Admin consolidé | MVP | Solde caisse, taux de cotisation, projets actifs, votes ouverts |
| A02 | Dashboard personnel du Membre | MVP | Quote-part %, valeur en Ar, rang, historique, droits |
| A07 | Alertes intelligentes automatiques | V2 | Détection : caisse qui baisse 3 semaines, taux cotisation < 70% |
| A08 | Score de santé du groupe (0-100) | V2 | Régularité cotisations + votes + rentabilité + niveau de réserve |
| A09 | Prédiction date d'atteinte d'objectif | V2 | "Au rythme actuel, vous atteindrez 500 000 Ar dans 6 semaines" |

---

### Catégorie : Écosystème & Multi-Groupe (V3)

| ID | Fonctionnalité | Description |
|---|---|---|
| E01 | Fédération de workspaces | Plusieurs groupes se fédèrent pour un projet commun |
| E02 | Marketplace inter-groupes | Un groupe propose ses produits/services à d'autres groupes |
| E03 | Achat groupé multi-workspaces | Regroupement pour commander en plus grande quantité |
| E04 | Répertoire de fournisseurs vérifiés | Base de données des grossistes avec avis et prix de référence |

---

## 8. Failles systémiques & atténuations techniques

La présentation technique identifie 3 failles critiques et leurs solutions.

---

### Faille 1 — Le Décalage Temporel & Erreur de Synchronisation d'API

**Risque** : L'infrastructure s'appuie sur des Webhooks tiers (Mobile Money/Banques). En cas de panne de l'opérateur, les transactions réelles ont lieu mais le Grand Livre MIKS n'est pas notifié. Cela fausse le calcul des parts et bloque la gouvernance.

**Atténuation MIKS** :
- **CRON Job nocturne de réconciliation comptable** : Le système interroge les logs d'API de l'opérateur sur les dernières 24h, compare les soldes, corrige les écarts
- Levée d'un drapeau `DESYNC_DETECTED` si une anomalie persiste après réconciliation

---

### Faille 2 — La Crise de Liquidité au 91ème jour (Retrait de Membre)

**Risque** : Un membre exige son retrait total. La règle impose un remboursement sous 90 jours. Mais 95% du capital est bloqué dans un actif illiquide (Coffre 2). Au 91ème jour → blocage logique.

**Atténuation MIKS** :
- **État de bascule automatique `LIQUIDATION_DEFAULT`**
- Si à t = 90 jours le Coffre 1 est insuffisant : gel de la distribution de dividendes des autres membres actifs
- Réallocation de **100% des flux entrants** du groupe à l'apurement de la dette envers le membre sortant
- Transformation de la créance en **obligation prioritaire**

---

### Faille 3 — L'Opacité de l'Algorithme Secret d'Activité

**Risque** : Chaque organisation définit sa propre logique pour "membre actif/inactif". Si cette logique est une boîte noire non standardisée, elle introduit un risque d'erreurs ou de contestation juridique (membre privé de dividendes par erreur).

**Atténuation MIKS** :
- **Moteur de Règles Dynamique (Rule Engine)** structuré
- Les critères d'activité doivent obligatoirement être traduits en **variables quantifiables en base de données** :
  - Taux de participation aux votes (%)
  - Fréquence minimale de cotisation
  - Nombre de missions complétées
- Zéro boîte noire — toute règle est configurable, auditable et contestable

---

## 9. Roadmap par phases (MVP → V3)

### MVP — Lancement Initial
> Objectif : Rendre un groupe opérationnel en moins de 5 minutes

**Fonctionnalités critiques** :
- Workspace créé et membres invités
- Saisie des cotisations + Equity Engine temps réel
- Grand livre immuable + double signature
- Moteur de vote typé (5 types)
- 10 types de projets avec dossier de soumission
- Dashboard Admin et Dashboard Membre
- Alertes de retard graduelles + suspension automatique
- OTP SMS + isolation multi-tenant (sécurité de base)
- Rapport hebdomadaire automatisé

### V1 — Post-Lancement
> Objectif : Enrichir la mémoire institutionnelle et la comptabilité

- Catégorisation des dépenses + budget prévisionnel de projet
- Bilan trimestriel et annuel automatique
- Agenda des réunions + PV auto-généré
- Bibliothèque de projets clôturés
- Profil membre enrichi + Annuaire des compétences
- Export Google Sheets en temps réel
- Programme de parrainage SaaS

### V2 — Croissance
> Objectif : Automatisation avancée et intégrations Mobile Money

- Webhooks MVola & Orange Money
- QR code de paiement + lien de paiement dynamique
- Rapprochement Mobile Money assisté
- Score de santé du groupe (0-100) + alertes intelligentes
- Heatmap de régularité des cotisations (52 semaines)
- Contrat de prêt auto-généré + suivi remboursements
- Multi-workspace (1 compte, N groupes)
- Signature électronique de documents
- Intégration WhatsApp Business
- Assistant de formalisation juridique Madagascar

### V3 — Long Terme
> Objectif : Écosystème inter-groupes et intelligence avancée

- Intégration Airtel Money
- Fédération de workspaces pour projets communs
- Marketplace inter-groupes + achat groupé multi-workspaces
- Score de crédit interne des membres
- API publique documentée (REST + webhooks sortants)
- Benchmark anonyme entre groupes similaires
- Authentification biométrique (mobile)
- Chiffrement E2E des espaces privés

---

## 10. Résumé synthétique pour l'IA

Ce résumé est conçu pour être passé en contexte à un système d'IA qui travaille sur MIKS.

```
MIKS est un SaaS B2B de digitalisation des groupes coopératifs/tontine, ciblant
Madagascar et l'Afrique francophone. Il n'est PAS une banque ni un portefeuille —
il est un Grand Livre Comptable automatisé synchronisé avec les flux réels (Mobile
Money, banques).

ARCHITECTURE CORE :
- 3 Coffres : C1 Liquidité (disponible) / C2 Investissement (bloqué) / C3 Sécurité (semi-liquide)
- Ventilation automatique nightly par Worker
- Equity Engine : Quote-part = (cumul membre / cumul total) × 100, mis à jour en temps réel
- Proof of Stake : les cotisations génèrent des Parts Sociales qui déterminent droit de vote ET dividendes

GOUVERNANCE :
- 10 types de projets natifs, tous avec le même moteur de validation
- Vote Phase 1 (50%+1) → Vote Phase 2 (70%) pour tout projet
- Double signature Co-Trésorier pour tout décaissement
- Audit trail immuable + OTP SMS sur actions sensibles
- Suspension automatique du droit de vote à J+8 de retard

10 TYPES DE PROJETS :
1. Commercial (Revente) — flux: caisse → achat → vente → marge → caisse
2. Investissement — actif collectif, revenus passifs différés
3. Solidarité — don collectif sans retour, vote 70% requis
4. Prêt membre — micro-crédit interne, remboursement + intérêts
5. Événementiel — dépense collective, plafond voté
6. Formation — investissement immatériel en compétences
7. Épargne Cible — sous-caisse bloquée avec barre de progression
8. Tontine Rotative — pot tournant classique ordre prédéfini
9. Production — agriculture/artisanat, gestion coûts de production
10. Service — prestation collective à clients externes

FAILLES CRITIQUES CONNUES ET GÉRÉES :
1. DESYNC_DETECTED : CRON Job de réconciliation si webhook Mobile Money tombe
2. LIQUIDATION_DEFAULT : gel des dividendes + réallocation totale si membre sortant au J+91
3. Rule Engine obligatoire : critères d'activité quantifiables en DB (zéro boîte noire)

ROADMAP : MVP (core) → V1 (mémoire/compta) → V2 (MM intégration + intelligence) → V3 (écosystème)
MARCHÉ CIBLE : Groupes tontine informels Madagascar. Mobile Money dominant : MVola, Orange Money, Airtel.
MODÈLE ÉCON. : Abonnement mensuel/annuel par workspace. Zéro prélèvement sur cotisations.
```

---

*Document généré automatiquement à partir de l'analyse de `project_types.jsx`, `features_catalog.jsx` et `Miks_Project_Presentation_v1.pdf`.*  
*MIKS — Système d'Exploitation Numérique des Coopératives Autonomes*
