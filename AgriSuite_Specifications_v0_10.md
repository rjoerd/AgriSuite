# 🌿 AgriSuite Madagascar
## Suite d'applications de gestion agroforestière intégrée

**Document de Spécifications — Version 0.10 | Mai 2026**

> 📌 Ce document est le document de référence du projet AgriSuite Madagascar. Il doit être partagé en début de chaque session de développement pour garantir la continuité du contexte. Il sera mis à jour à chaque décision architecturale importante.
>
> ⚙️ Philosophie technique : les applications sont génériques — elles accueillent n'importe quelle parcelle, n'importe quel cheptel, saisi par l'utilisateur. Les données des sites réels (Section 2) servent uniquement à calibrer les guides agronomiques intégrés et à créer des jeux de données de test réalistes.
>
> 🆕 Nouveautés v0.10 : Distinction conceptuelle audit ≠ vérification (on AUDITE un acteur, on VÉRIFIE un lot). Module Vérification Lot ajouté à M4 ExportTrack avec 5 axes auditables : traçabilité ascendante, qualité physico-chimique, mass balance, test de rappel, cohérence référentielle. Module Audit Opérateur prévu Session 9d. SCI étendu (Sessions 9a-9c-fix) : fournisseurs, parcelles producteur avec GPS, contrats, inspections planifiées + terrain + sanctions, conversion BIO par parcelle, génération PDF rapports.
>
> 🆕 Nouveautés v0.9 : Phase 3 cadrée — architecture deux filières (production + collecte) en M4 ExportTrack unifié, définition formelle du lot, repriorisation de M8 CertifTrack en Phase 3, ajout d'un module HACCP complet, panorama des référentiels de certification pour Madagascar.

---

# 1. Vision du Projet

AgriSuite Madagascar est une suite d'applications de gestion agricole conçue pour piloter plusieurs sites d'exploitation agroforestière à Madagascar. Elle répond à trois piliers de production complémentaires, intégrés dans un cadre d'agroforesterie productive et durable, et inclut une **activité de collecte-export** de produits malgaches à forte valeur (vanille, girofle, cannelle, café, cacao, fruits séchés, poivre).

## 1.1 Les trois piliers de production

**Pilier 1 — Culture fourragère pour vaches laitières (PRIORITÉ 1)**
- Autonomie fourragère toute l'année, y compris en saison sèche
- Intégration d'espèces arbustives fourragères dans le système agroforestier
- Objectif : production laitière stable, non saisonnière

**Pilier 2 — Culture potagère / maraîchère (PRIORITÉ 2)**
- Exploitation des synergies avec l'élevage (fumure organique)
- Intensification sous couvert agroforestier (brise-vent, régulation thermique)

**Pilier 3 — Cultures de rente et d'exportation (PRIORITÉ 3)**
- Cultures pérennes : vanille, girofle, litchi, café, poivre, cannelle, cacao
- Cultures annuelles export : piment, gingembre, grains secs, autres
- Traçabilité et conformité aux exigences des marchés internationaux

## 1.2 Le quatrième pilier — Collecte & Négoce export (NOUVEAU v0.9)

**Pilier 4 — Collecte de produits locaux pour export (PRIORITÉ 3)**
- Achat de produits malgaches auprès de producteurs tiers (vanille, girofle, cannelle, café, cacao, fruits séchés…)
- Tri, calibrage, mise en conservation, conditionnement, export
- Transformation légère possible (séchage, fermentation, broyage, mise en sachet)
- Exigence : traçabilité ascendante complète + conformité référentiels internationaux

> 💡 **Distinction filières** : Pilier 3 = production sur sites propres (filière A). Pilier 4 = collecte + négoce (filière B). Les deux sont opérés par M4 ExportTrack avec un schéma de données unifié dès la phase post-récolte.

## 1.3 Cadre transversal

- Cadre agroforestier : toutes les cultures s'intègrent dans des Systèmes Agroforestiers (SAF)
- Objectif de productivité maximale dans le respect de la durabilité écologique
- Multi-sites : plusieurs parcelles géographiquement distinctes
- Multi-utilisateurs : hiérarchie de rôles propriétaire / gérant / opérateur
- Philosophie de développement : incrémental, learning by doing, amélioration continue

---

# 2. Sites d'Exploitation Actuels

## 2.1 Situation géographique

Les 4 sites actuels sont situés dans la zone des Hautes Terres de Madagascar (région Analamanga et environs). L'application est conçue pour couvrir l'ensemble du territoire malgache. Le site de Moramanga présente un profil pédoclimatique distinct des tanety — bas-fond alluvial, accès au fleuve Mangoro, altitude ~900 m.

| Code site | Superficie | Région / Zone | Type terrain | Activité | Eau |
|---|---|---|---|---|---|
| Site A | 1 ha | Ampanotokana (RN4) ~1 316 m | Tanety | Vierge | Problématique (puits en projet) |
| Site B | 1 000 m² | Belanitra (Ivato) ~1 300 m | Tanety | Vierge | Problématique (puits en projet) |
| Site C | 1 500 m² | Est Mahitsy ~1 400 m | Tanety | Vierge | Problématique (puits en projet) |
| Site D | 2 ha | Moramanga ~900 m | Bas-fond alluvial | Vierge | Bassin existant |
| Site E (futur) | À définir | Nord-Est Madagascar | À définir | Export rente | À définir |

> 💡 Site D est le site le plus stratégique pour la filière export production : plus grande surface, eau disponible, profil tropical, potentiel export gingembre + pisciculture.

## 2.2 Données de référence élevage laitier (jeu de test ForagePro)

| Paramètre | Valeur de référence (avril 2026) |
|---|---|
| Effectif total | 3 têtes : 1 vache lactante, 1 génisse pleine, 1 velle |
| Production laitière | 8 litres / jour (vache lactante) |
| Marché du lait | Vente directe — potentiel gargottes et pâtisseries locales |
| Coût fourrage acheté | 10 000 Ar / jour = 1/3 de la ration journalière |
| Espèces fourragères | Bana grass, Juncao, Brachiaria, Avoine, Chloris, Sesbania, Tephrosia, Mucuna, Soja, Sorgho, Paille de riz, Cajanus cajan |
| Fourrage collecté | Desmodium (collecté hors site) |
| Besoin théorique / vache | 50 kg fourrage + 5 kg provende / jour |
| Calendrier cultural cible | Démarrage mai-juin 2026 |
| Connectivité Internet | Moyenne sur tous les sites |
| Appareils terrain | À acquérir (Android prévu) |

## 2.3 Données de référence maraîchage (jeu de test MaraîcherGuide)

| Paramètre | Valeur de référence (avril 2026) |
|---|---|
| Objectif alimentaire | Autonomie ménage + ouvriers + repas scolaires (200 élèves/site) |
| Total bénéficiaires | ~800 élèves sur 4 sites + ménages + ouvriers |
| Besoin légumes estimé | ~80-120 kg/jour toutes destinations confondues |
| Accès eau sites A/B/C | Inconnu — puits à creuser, cultures tolérantes à la sécheresse prioritaires |
| Accès eau site D | Suffisant — bassin existant, cultures intensives possibles |
| Cultures prioritaires HT | Chou, carotte, pomme de terre, haricot vert, épinard malgache, radis, poireau, tomate, laitue |
| Cultures prioritaires D | Gingembre (export/local), piment, aubergine, concombre |
| Gingembre site D | Objectif export — filet de sécurité marché local |

## 2.4 Données de référence collecte-export (jeu de test ExportTrack — NOUVEAU v0.9)

| Paramètre | Valeur de référence (avril 2026) |
|---|---|
| Filière A — Production propre | Gingembre Site D (en démarrage). Vanille/girofle si Site E acquis. |
| Filière B — Collecte | Vanille, girofle, cannelle, café, cacao, fruits séchés, poivre |
| Nombre de fournisseurs au démarrage | 5 producteurs réguliers — extension progressive selon volumes |
| Zones de collecte ciblées | Côte Est (vanille, girofle, café, cacao, poivre), Hautes Terres (fruits séchés), Nord (cacao, ylang-ylang) |
| Niveau de transformation envisagé | Légère : tri, séchage, calibrage, conditionnement. Possibilité broyage / mise en sachet pour fruits séchés et épices. |
| Conformité visée | HACCP obligatoire dès transformation + BIO UE + Fairtrade + Rainforest Alliance (selon produit) |
| Marchés cibles | UE (BIO Ecocert), USA (USDA NOP), Japon (JAS) à confirmer |

---

# 3. Vision Écosystème — Décision Stratégique (Avril 2026)

## 3.1 Les trois produits de l'écosystème

```
┌─────────────────────────────────────────────────────┐
│              3 PRODUITS — 1 CODEBASE                │
├─────────────────┬───────────────┬───────────────────┤
│   🐄 AppLait    │  🌿 AgriSuite │  🧮 Formulateur   │
│                 │               │                   │
│ Gestion élevage │ Agroforesterie│  Nutrition        │
│ laitier         │ multi-sites   │  animale          │
└─────────────────┴───────────────┴───────────────────┘
         ↕ synchronisation offline → online (futur)
    ┌────────────────────────────────────┐
    │  Backend commun (futur)            │
    │  PostgreSQL + API REST             │
    └────────────────────────────────────┘
```

## 3.2 Architecture modulaire codebase

```
modules/
├── elevage/          ← AppLait migré progressivement
├── nutrition/        ← Formulateur migré (Phase 2/3)
└── agroforesterie/   ← AgriSuite actuel
    ├── ParcelleManager
    ├── CropEngine
    ├── ForagePro
    ├── MaraîcherGuide  ← Phase 2 ✅
    ├── ExportTrack     ← Phase 3 (production + collecte + Vérification Lot)
    ├── CertifTrack     ← Phase 3 (repriorisé v0.9)
    └── HACCP           ← Phase 3 (nouveau v0.9)
```

---

# 4. Architecture de la Suite

## 4.0 Modules Transversaux — Socle technique commun

| # | Module transversal | Description | Priorité |
|---|---|---|---|
| T1 | AgroMap — Cartographie & Aménagement | Délimitation GPS, récupération automatique altitude/climat/topographie, plan d'aménagement suggéré | P0 ✅ |
| T2 | CropEngine — Base agronomique & Alertes | Base de données itinéraires techniques, moteur alertes, grilles observation, 13 cultures fourragères + 13 cultures maraîchères + cultures export (Phase 3) | P0 ✅ |

## 4.1 Bloc TERRAIN

| # | Module | Bloc | Utilisateurs | Priorité |
|---|---|---|---|---|
| M1 | ParcelleManager + RH + Intrants | TERRAIN | Propriétaire | P1 ✅ |
| M2 | ForagePro — Fourrage & Élevage laitier | TERRAIN | Propriétaire + Gérant + Opérateur | P1 ✅ |
| M3 | MaraîcherGuide — Maraîchage + Eau | TERRAIN | Propriétaire + Gérant + Opérateur | P2 ✅ |
| M4 | ExportTrack — Cultures de rente + Collecte + Vérification Lot | TERRAIN | Propriétaire + Gérant + Opérateur | P2 🔄 Phase 3 |
| M4b | HACCP — Sécurité alimentaire & Transformation | TERRAIN | Propriétaire + Gérant | P2 🆕 Phase 3 |
| M7 | AquaPro — Pisciculture (futur) | TERRAIN | Propriétaire + Gérant + Opérateur | P4 |

## 4.2 Bloc PILOTAGE

| # | Module | Bloc | Utilisateurs | Priorité |
|---|---|---|---|---|
| M5 | AgroForestDashboard — Tableaux de bord | PILOTAGE | Propriétaire + Gérant | P3 |
| M5b | LogiSite — Logistique multi-sites | PILOTAGE | Propriétaire + Gérant | P3 |
| M5c | EconoSite — Économie agricole | PILOTAGE | Propriétaire | P3 |

## 4.3 Bloc STRATÉGIQUE

| # | Module | Bloc | Utilisateurs | Priorité |
|---|---|---|---|---|
| M6 | InfoVeille — Météo, prix, réglementation | STRATÉGIQUE | Propriétaire uniquement | P2 🔄 Phase 3 (volet prix) |
| M8 | CertifTrack — Certifications multi-référentiels | STRATÉGIQUE | Propriétaire uniquement | P2 🔄 repriorisé Phase 3 |

> 🔄 **Décision v0.9** : M8 CertifTrack repriorisé de Phase 4 vers Phase 3. Raison : la filière collecte (Pilier 4) ne peut pas fonctionner sans Système de Contrôle Interne (SCI) certifié. ExportTrack et CertifTrack sont indissociables dans le métier réel.

---

# 4b. Détail — CropEngine (Moteur Agronomique)

## 4b.1 Couverture géographique

- Hautes Terres (1 000-1 800 m) : fourrage, maraîchage, pomme de terre
- Côte Est (0-400 m) : girofle, vanille, litchi, café, gingembre, poivre, cannelle
- Moyen Ouest et Ouest : maïs, arachide, manioc
- Nord : cacao, ylang-ylang
- Sud : sisal, cultures arides

## 4b.2 Cultures en base

**13 cultures fourragères** (Phase 0b ✅) :

| Espèce | Type | Cycle | Tolérance sécheresse |
|---|---|---|---|
| Brachiaria brizantha | Graminée | 60j | Bonne |
| Bana grass | Graminée | 45j | Moyenne |
| Juncao | Graminée | 50j | Moyenne |
| Sorgho fourrager | Graminée | 90j | Excellente |
| Avoine fourragère | Graminée | 75j | Faible |
| Chloris de Rhodes | Graminée | 55j | Bonne |
| Paille de riz | Graminée | — | — |
| Sésbanie | Légumineuse | 180j | Bonne |
| Téphrosie | Légumineuse | 150j | Bonne |
| Pois d'Angole | Légumineuse | 120j | Excellente |
| Mucuna | Légumineuse | 90j | Moyenne |
| Soja | Légumineuse | 100j | Faible |
| Desmodium | Légumineuse | 90j | Faible |

**13 cultures maraîchères** (Phase 2 ✅) :

| Espèce | Zone | Cycle | Priorité école |
|---|---|---|---|
| Chou cabus | Hautes Terres | 90j | 1 |
| Carotte | Hautes Terres | 80j | 2 |
| Haricot vert | Hautes Terres | 55j | 3 |
| Pomme de terre | Hautes Terres | 90j | 4 |
| Épinard malgache | Hautes Terres | 30j | 5 |
| Tomate | Hautes Terres | 90j | 6 |
| Poireau | Hautes Terres | 120j | 7 |
| Radis | Hautes Terres | 30j | 8 |
| Laitue | Hautes Terres | 45j | 9 |
| Gingembre | Site D / Côte Est | 270j | 10 |
| Piment | Site D / Côte Est | 90j | 11 |
| Aubergine | Site D / Côte Est | 90j | 12 |
| Concombre | Site D | 50j | 13 |

**Cultures export à enrichir** (Phase 3) :

| Espèce | Zone | Type | Cycle / Productivité | Priorité Phase 3 |
|---|---|---|---|---|
| Vanille (Vanilla planifolia) | Côte Est, Nord-Est | Pérenne | 3 ans avant 1ère récolte, 8-10 ans pleine prod | 1 |
| Girofle (Syzygium aromaticum) | Côte Est (Analanjirofo) | Pérenne | 7-8 ans avant prod, longévité 50+ ans | 2 |
| Cannelle (Cinnamomum verum) | Côte Est | Pérenne | 4-5 ans avant 1ère écorce | 3 |
| Café Arabica | Hautes Terres mi-altitude, Sambirano | Pérenne | 3-4 ans avant prod | 4 |
| Café Robusta | Côte Est | Pérenne | 3 ans avant prod | 5 |
| Cacao (Theobroma cacao) | Sambirano (Nord), Côte Est | Pérenne | 3-5 ans avant prod | 6 |
| Poivre noir | Côte Est | Pérenne grimpante | 3 ans avant prod | 7 |
| Litchi | Côte Est, Tamatave | Pérenne | 5-7 ans avant prod | 8 |
| Ylang-ylang | Nosy Be, Nord | Pérenne | 3 ans avant prod | 9 |

> 💡 **Note Phase 3** : pour la filière collecte (Pilier 4), CropEngine n'a besoin que des données d'identité (variétés, zones, calendrier de récolte, qualité) pour valider la cohérence des bons de collecte. Les itinéraires techniques complets ne sont nécessaires que pour Pilier 3 (production propre, Site D et Site E futur).

---

# 4c. Détail — M4 ExportTrack (NOUVEAU v0.9)

## 4c.1 Périmètre fonctionnel

M4 ExportTrack gère la **traçabilité complète de la filière export**, depuis l'origine (parcelle propre ou fournisseur tiers) jusqu'à l'expédition à l'acheteur international. Il couvre **deux filières dans un module unifié** :

- **Filière A — Production propre** : lots issus des parcelles de l'exploitation (gingembre Site D, futures cultures pérennes Site E). Lien direct avec MaraîcherGuide / CropEngine / ParcelleManager.
- **Filière B — Collecte & négoce** : lots achetés à des producteurs tiers locaux. Lien avec CertifTrack pour le Système de Contrôle Interne (SCI).

À partir de l'étape post-récolte/post-collecte, le flux est unifié : tri, séchage, calibrage, conditionnement, expédition, dossier traçabilité.

## 4c.2 Définition formelle du lot

> 📌 **Définition canonique** : Un lot est un ensemble homogène de produit ayant la même origine, la même période de récolte ou de collecte, et le même traitement post-récolte. Aucun mélange entre lots n'est autorisé sauf création explicite d'un lot composite avec traçabilité ascendante préservée.

**Critères d'homogénéité** :
- Une seule origine : une parcelle (filière A) OU un fournisseur unique / un groupe homogène de petits producteurs d'une même commune (filière B)
- Une fenêtre temporelle bornée : date de début + date de fin (jamais ouverte)
- Une seule espèce / variété
- Un seul protocole post-récolte (séchage solaire OU séchoir mécanique, pas les deux)
- Un seul niveau de qualité

**Identifiant unique du lot (passeport)** : `MDG-AAAA-XXX-CCC-NNN`

| Segment | Signification | Exemple |
|---|---|---|
| MDG | Pays d'origine (ISO 3166) | MDG |
| AAAA | Année de récolte/collecte | 2026 |
| XXX | Code site (production) ou code zone collecte | D, E, ATS (Atsinanana), ANJ (Analanjirofo) |
| CCC | Code culture (3 lettres) | GIN (gingembre), VAN (vanille), GIR (girofle), CAN (cannelle), CAF (café), CAC (cacao), POI (poivre) |
| NNN | Numéro séquentiel dans l'année (par filière+site+culture) | 001, 002… |

**Exemples** :
- `MDG-2026-D-GIN-001` : gingembre Site D, lot 1 de 2026 (filière A)
- `MDG-2026-ANJ-VAN-003` : vanille collectée dans Analanjirofo, lot 3 de 2026 (filière B)
- `MDG-2026-SBR-CAC-007` : cacao Sambirano, lot 7 de 2026 (filière B)

**Lots composites** : si deux lots `MDG-2026-D-GIN-001` et `MDG-2026-D-GIN-002` sont assemblés au conditionnement, le résultat est `MDG-2026-D-GIN-C001` (préfixe C) avec la traçabilité ascendante des lots parents conservée. Interdit pour les certifications BIO et Fairtrade si les lots parents n'ont pas le même statut.

> 🔧 **Précision v0.10** : Pour la filière collecte multi-fournisseurs, `lot.fournisseur_id` reste **NULL** (la traçabilité ascendante passe par la table `bons_collecte`). La détection de filière se fait via la colonne `lot.filiere` (`'production'` / `'collecte'`), pas via `fournisseur_id`.

## 4c.3 Schéma de données SQLite (proposition)

| Table | Description | FK clés |
|---|---|---|
| `lots` | Lot unifié, source de vérité de la traçabilité | site_id (A) OU fournisseur_id (B), culture_id |
| `fournisseurs` | Producteurs tiers de la filière B | zone_collecte_id |
| `bons_collecte` | Achat à un fournisseur — préfigure un lot ou complète un lot ouvert | fournisseur_id, lot_id |
| `etapes_post_recolte` | Tri, séchage, calibrage, perte par lot — séquence ordonnée | lot_id |
| `analyses_qualite` | Mesures qualité par lot (humidité, vanilline, taille, couleur) | lot_id |
| `conditionnements` | Mise en emballage final — palette, sac, sachet | lot_id, type_emballage |
| `acheteurs` | Acheteurs internationaux et leurs exigences | pays |
| `expeditions` | Bordereau de livraison + documents export | lot_id, acheteur_id |
| `documents_export` | Phytosanitaire, certif origine, BIO, fumigation | expedition_id |
| `verifications_lots` 🆕 v0.10 | Vérification datée d'un lot (auditeur, statut global) | lot_id |
| `verifications_lots_axes` 🆕 v0.10 | Détail par axe de vérification (statut, JSON détails) | verification_id |

## 4c.4 Flux de traçabilité (cycle de vie d'un lot)

```
FILIÈRE A (production)              FILIÈRE B (collecte)
    │                                    │
    ▼                                    ▼
Récolte parcelle                  Bon de collecte
(MaraîcherGuide)                  (fournisseur SCI)
    │                                    │
    └──────────────┬─────────────────────┘
                   ▼
             Création LOT
       (ID unique MDG-AAAA-XXX-CCC-NNN)
                   │
                   ▼
            Étapes post-récolte
   (tri, séchage, calibrage, perte)
                   │
                   ▼
              Analyses qualité
   (humidité, vanilline, taille…)
                   │
                   ▼
            Conditionnement
       (sacs, palettes, étiquetage)
                   │
                   ▼
       🆕 Vérification Lot (5 axes)
       (snapshot auditable horodaté)
                   │
                   ▼
              Expédition
       (acheteur, BL, documents)
                   │
                   ▼
       Dossier traçabilité PDF
       (passeport complet du lot)
```

## 4c.5 Veille prix marchés (M6 InfoVeille — volet prix)

Scraping automatique des cours mondiaux pour les produits clés :
- **Vanille** : prix FOB Madagascar (sources : Conseil National Vanille, ITC, ICCO-équivalent vanille)
- **Girofle** : cours mondial Singapour, FOB Madagascar
- **Café** : ICE Futures (Arabica, Robusta), Bourse de New York
- **Cacao** : ICE Futures (Londres, New York), ICCO
- **Poivre** : IPC (International Pepper Community)
- **Gingembre** : difficile à trouver en cours mondial — fallback sur saisie manuelle ou API agrégateur

Saisie manuelle des prix locaux (marchés régionaux malgaches) — interface dédiée Propriétaire.

---

# 4c-bis. Vérification de Lot (NOUVEAU v0.10)

## 4c-bis.1 Distinction conceptuelle : audit ≠ vérification

> 📌 **Principe fondamental** : on **AUDITE un acteur** (opérateur, producteur, site) — on **VÉRIFIE un lot**. Ce ne sont pas les mêmes objets ni les mêmes méthodologies, et les confondre fragilise la posture face aux auditeurs externes.

| Action | Cible | Question posée | Module AgriSuite |
|---|---|---|---|
| **Audit blanc opérateur** | Exportateur lui-même | "Mon système est-il conforme au référentiel ?" | Session 9d (à venir) |
| **Inspection SCI** | Producteur tiers (filière B) | "Ce producteur respecte-t-il son engagement ?" | Sessions 9b1-9b3 (✅) |
| **Vérification lot** | Un lot précis | "Ce lot est-il auditable de bout en bout ?" | Session 9c-conceptuel (✅) |

## 4c-bis.2 Les 5 axes de vérification d'un lot

Une vérification de lot est un **événement daté** (auditeur + date + contexte) qui produit un **rapport horodaté infalsifiable**, conservable 5 ans (BIO UE). Un même lot peut être vérifié plusieurs fois (ex : à 6 mois d'écart) — l'historique est préservé.

### Axe 1 — Traçabilité ascendante

**Question auditeur** : Le lot remonte-t-il à une parcelle (filière A) ou à un fournisseur avec parcelles déclarées (filière B) ?

**Méthode** :
- Filière A : présence de `recolte_maraichere_id` + `parcelle_id`
- Filière B : présence de bons de collecte + fournisseurs avec parcelles producteur (table `parcelles_producteur` avec GPS)

**Drapeau rouge** : fournisseur sans aucune parcelle déclarée → impossible de prouver l'origine.

### Axe 2 — Qualité physico-chimique

**Question auditeur** : Les analyses critiques (humidité, mycotoxines, métaux lourds, résidus) sont-elles présentes et conformes aux seuils ?

**Méthode** : lecture de `analyses_qualite`, vérification des types critiques selon culture (catalogue intégré).

| Culture | Types critiques minimum |
|---|---|
| Gingembre | humidité |
| Vanille | humidité, vanilline |
| Girofle | humidité, aflatoxines |
| Cannelle | humidité, coumarine |
| Café | humidité, ochratoxine A |
| Cacao | humidité, cadmium, fermentation |
| Poivre | humidité, salmonella |

### Axe 3 — Mass balance (bilan matière)

**Question auditeur** : "Tu as collecté 50 kg, tu en as 42 conditionnés, où sont les 8 ?"

**Formule** :
```
Entrée − Sortie − Pertes documentées = Écart
```

**Seuils** :
- Écart ≤ 2% : ✅ conforme (manutention normale)
- Écart 2-5% : ⚠ alerte (à justifier)
- Écart > 5% : ❌ non conforme (suspicion fuite/mélange avec conventionnel)

### Axe 4 — Test de rappel (recall test)

**Question auditeur** : "Voici un sachet pris au hasard. Montre-moi en moins de 4 heures la chaîne complète jusqu'à la parcelle d'origine."

**Méthode** : reconstitution automatique des 5 maillons :
1. Conditionnement (sachet final + numéros série)
2. Lot
3. Étapes post-récolte (avec dates + opérateurs)
4. Bons de collecte (filière B) ou récolte source (filière A)
5. Fournisseurs + parcelles (filière B) ou parcelle propre (filière A)

**Statut** : tous présents et complets = ✅ ; un seul manquant = ❌ (NC majeure HACCP/BIO).

### Axe 5 — Cohérence référentielle

**Question auditeur** : "Tu vends ce gingembre comme BIO. Au moment de la collecte le 22 mars, ton fournisseur était-il bien certifié BIO ce jour-là ?"

**Méthode** : pour chaque référentiel engagé sur le lot, vérifier que **chaque fournisseur amont** a un engagement actif sur le **même référentiel** à la **date de la collecte** (pas après).

**Drapeaux rouges** :
- Engagement fournisseur absent sur référentiel
- Engagement obtenu **après** la date de collecte (fraude rétroactive)
- Statut `en_conversion` BIO (vente sous mention BIO interdite avant C3)
- Statut `suspendu` ou `abandonne`

## 4c-bis.3 Schéma de données

| Table | Description |
|---|---|
| `verifications_lots` | Une vérification = un événement daté (auditeur, date, statut global). Statuts : `en_cours`, `conforme`, `alertes`, `non_conforme` |
| `verifications_lots_axes` | Détail par axe (statut, JSON de détails, notes). Statuts : `na`, `conforme`, `alerte`, `non_conforme` |

Statut global recalculé automatiquement : `non_conforme` si au moins un axe l'est ; `alertes` si au moins un en alerte ; `conforme` sinon.

## 4c-bis.4 Posture expert auditeur

> 🎯 La fonction Vérification de Lot agit avec la rigueur d'un auditeur Ecocert / FLOCERT. Elle ne masque pas les non-conformités, ne propose pas de "petits arrangements". Si un fournisseur n'a pas de parcelle déclarée, c'est dit explicitement. Si l'écart de mass balance est de 7%, l'alerte est rouge même si les 7 kg "se sont peut-être perdus en chemin". L'objectif est qu'un auditeur externe trouve toujours **moins** de non-conformités qu'AgriSuite n'en avait déjà signalées en interne.

## 4c-bis.5 Architecture extensible

L'écran `VerifLotScreen` utilise un **registre de calculateurs** (`CALCULATEURS`) qui mappe chaque numéro d'axe à sa fonction de calcul. Ajouter un 6ème axe (par exemple "Empreinte carbone" ou "Conformité douanière") ne nécessite que :
1. Une nouvelle fonction `calculerAxeN(lotId)` dans `database/exportTrack.js`
2. Une entrée dans `CALCULATEURS`
3. Une fonction `renderDetailsAxeN(axe)` pour l'affichage pédagogique

---

# 4d. Détail — M8 CertifTrack (REPRIORISÉ Phase 3 v0.9)

## 4d.1 Mission

CertifTrack est le **système d'accompagnement, de preuve et d'audit de conformité** aux référentiels de certification internationaux. Il agit comme un **expert auditeur intégré** : pointilleux, exhaustif, exigeant le niveau de preuve requis par chaque référentiel.

CertifTrack ne remplace pas l'organisme certificateur. Il prépare le dossier d'audit de manière irréprochable et garantit la conformité quotidienne.

## 4d.2 Architecture interne

```
CertifTrack
├── Catalogue Référentiels
│   ├── BIO UE (Ecocert, ControlUnion, BCS) — Règlement UE 2018/848
│   ├── USDA NOP (National Organic Program)
│   ├── JAS (Japanese Agricultural Standard)
│   ├── HACCP (Codex Alimentarius)
│   ├── ISO 22000
│   ├── FSSC 22000
│   ├── Fairtrade FLO / Max Havelaar
│   ├── Rainforest Alliance (incluant ex-UTZ)
│   ├── GlobalGAP
│   ├── Ecocert ESR / For Life
│   ├── Symbole des Producteurs Paysans (SPP)
│   ├── Demeter (biodynamie)
│   ├── Halal / Kosher (cas par cas)
│   ├── Label Vanille de Madagascar (CNV)
│   └── PIP COLEACP (cadre d'accompagnement UE fruits/légumes)
│
├── Engagement
│   └── Le Propriétaire active 1..N référentiels par site / culture / lot / fournisseur
│
├── Exigences (428 modélisées en Phase 3 ✅)
│   └── Chaque référentiel se décompose en exigences atomiques
│       (cahier des charges détaillé, sens, preuves attendues)
│
├── Preuves
│   └── Chaque exigence demande des preuves concrètes :
│       photo, registre, attestation, analyse labo, formation, contrat
│
├── Moteur de conformité (alertes auto)
│   └── Scan continu des données ParcelleManager / CropEngine /
│       MaraîcherGuide / ExportTrack pour détecter les violations
│
├── Audit blanc (engagement référentiel)
│   ├── Score par référentiel engagé
│   ├── Liste exigences à vérifier
│   ├── Statut conformité par exigence (à vérifier / conforme / non conforme)
│   ├── NC majeures bloquantes vs mineures
│   └── Préparation dossier audit externe
│
├── Système de Contrôle Interne (SCI) — filière collecte ✅ Sessions 9a-9c-fix
│   ├── Producteurs membres (cartographiés via AgroMap)
│   ├── Fiche producteur (contrat, parcelles, statut conversion)
│   ├── Parcelles producteur avec GPS individuel 🆕 v0.10
│   ├── Calendrier d'inspection interne (≥ 1×/an obligatoire)
│   ├── Inspections planifiées + terrain + sanctions ✅ Sessions 9b1-9b3
│   ├── Inspecteur interne (rôle dédié)
│   ├── Grille d'inspection par référentiel
│   ├── Sanctions (avertissement, suspension, exclusion)
│   ├── Conversion BIO par parcelle (C1/C2/C3/Certifié) 🆕 v0.10
│   └── Génération PDF rapport SCI ✅ Session 9b3
│
└── Dossier d'audit
    ├── Génération PDF horodaté
    ├── Pièces jointes complètes
    ├── Traçabilité ascendante des lots
    └── Export pour Ecocert / FLO / RA / etc.
```

## 4d.3 Posture "expert auditeur"

> 🎯 **Engagement v0.9** : CertifTrack agit avec la rigueur d'un auditeur certifié. Pas de demi-mesure, pas de "ça passera". Chaque exigence est interprétée à la lettre du règlement. Une non-conformité bloquante interdit la commercialisation sous le label concerné, sans recours interne automatique.

Niveau de pointilleur attendu :
- Aucune tolérance sur les intrants interdits (BIO : pesticides de synthèse, OGM, irradiation)
- Délai de conversion BIO strictement appliqué (24 mois cultures annuelles, 36 mois pérennes)
- Séparation physique et documentaire des lots BIO / conventionnels obligatoire
- Tenue de registres datée, signée, infalsifiable
- Traçabilité ascendante 100% : du sachet final à la parcelle ou au producteur d'origine
- Documentation produits/intrants : fiche technique + bulletin d'analyse pour chaque lot d'intrant
- Formations producteurs documentées (Fairtrade, RA)
- Visites SCI annuelles obligatoires + visites surprises

## 4d.4 Référentiels les plus utilisés à Madagascar

| Référentiel | Cible produit | Présence MDG | Organisme certificateur typique |
|---|---|---|---|
| **BIO UE 2018/848** | Tout végétal | Très forte | Ecocert, ControlUnion, BCS |
| **USDA NOP** | Marché USA | Forte (vanille++) | Ecocert, ControlUnion |
| **JAS** | Marché japonais | Moyenne (vanille) | OCIA, Ecocert |
| **Fairtrade FLO** | Café, cacao, vanille, fruits | Forte (coopératives) | FLOCERT |
| **Rainforest Alliance / UTZ** | Café, cacao, thé, épices | Moyenne | RA, NSF |
| **HACCP / Codex** | Sécurité alim. (transfo) | Obligatoire export sérieux | Bureau Veritas, SGS |
| **ISO 22000 / FSSC 22000** | Industrie agro-alim. | Faible mais croissance | SGS, BV, DNV |
| **GlobalGAP** | Bonnes pratiques agricoles | Faible (grande distrib UE) | SGS, BV |
| **Ecocert ESR / For Life** | Commerce équitable alternatif | Moyenne | Ecocert |
| **Symbole Producteurs Paysans (SPP)** | Petits producteurs | Faible mais hausse | SPP Global |
| **Demeter (biodynamie)** | Premium niche | Très faible | Demeter International |
| **Label Vanille de Madagascar** | Origine + qualité vanille | National | CNV (Conseil National Vanille) |
| **PIP COLEACP** | Cadre filière fruits/légumes UE | National (cadre) | COLEACP |

## 4d.5 Recommandation par produit (filières AgriSuite)

| Produit | Certifs MVP (à viser dès Phase 3) | Certifs valorisantes (V2) |
|---|---|---|
| **Vanille** | HACCP + BIO UE/NOP + Label Vanille MDG | Fairtrade, Rainforest, Demeter, JAS |
| **Girofle** | HACCP + BIO UE | Fairtrade, Rainforest, ESR |
| **Cannelle** | HACCP + BIO UE | Fairtrade, ESR |
| **Poivre noir** | HACCP + BIO UE | Fairtrade, Demeter |
| **Café (Arabica/Robusta)** | HACCP + BIO + Fairtrade | Rainforest, SPP, Specialty Coffee Association |
| **Cacao** | HACCP + BIO + Fairtrade | Rainforest, Direct Trade, SPP |
| **Gingembre (production Site D)** | HACCP + BIO UE | GlobalGAP (grande distrib UE) |
| **Fruits séchés** | HACCP + BIO | Fairtrade, GlobalGAP (frais), FSSC 22000 (transfo) |
| **Piment** | HACCP + BIO | GlobalGAP |
| **Litchi (frais ou séché)** | HACCP + BIO + GlobalGAP | Fairtrade |
| **Ylang-ylang (huile essentielle)** | BIO + COSMOS | Demeter |

> 🎯 **Stratégie certif recommandée** : viser dès le départ le trio **HACCP + BIO UE + Fairtrade**, qui couvre 80% de la demande européenne et nord-américaine. Ajouter **Rainforest Alliance** pour café et cacao spécifiquement. **Demeter** et **SPP** en option premium phase ultérieure.

## 4d.6 Système de Contrôle Interne (SCI) — point critique filière collecte

Pour BIO, Fairtrade et Rainforest Alliance, dès qu'il y a certification d'un **groupe de producteurs**, le certificateur exige la mise en place d'un Système de Contrôle Interne. C'est l'opérateur (vous) qui devient l'auditeur de premier niveau de ses fournisseurs.

**Composantes obligatoires du SCI dans CertifTrack** ✅ implémentées Sessions 9a-9c-fix :

1. **Liste exhaustive des producteurs membres** avec coordonnées GPS de chaque parcelle (réutilise AgroMap)
2. **Contrat individuel** entre l'opérateur et chaque producteur (modèle PDF généré)
3. **Engagement écrit** du producteur sur le respect du référentiel
4. **Cartographie des risques** par producteur (proximité parcelle conventionnelle, intrants utilisés, antécédents)
5. **Calendrier d'inspections internes** : minimum 1 visite annuelle par producteur, ponctuée de visites surprises (≥ 10% des producteurs/an)
6. **Grille d'inspection** par référentiel (BIO ≠ Fairtrade ≠ RA)
7. **Rapport d'inspection signé** par l'inspecteur interne et le producteur
8. **Registre des sanctions** : avertissement → suspension → exclusion
9. **Statut de conversion BIO par parcelle** : C1 (an 1) → C2 (an 2) → C3 (an 3, si pérenne) → Certifié 🆕 v0.10 (granularité parcelle, pas producteur)
10. **Formation annuelle** des producteurs (obligatoire Fairtrade et RA) — Session 9c2 à venir

**Démarrage prévu** : 5 producteurs au lancement, extension progressive selon volumes commercialisés. CertifTrack supporte dès le MVP la création individuelle ; import CSV pour scaling à venir.

---

# 4e. Détail — M4b HACCP (NOUVEAU v0.9)

## 4e.1 Mission

M4b HACCP est un **module complet** (pas un mini-module) dédié à la sécurité alimentaire selon la méthode HACCP du Codex Alimentarius. Il devient obligatoire dès que l'opération inclut **toute forme de transformation** (séchage contrôlé, fermentation, broyage, mise en sachet, étiquetage final pour consommation humaine).

> 🎯 **Décision v0.9** : HACCP est traité comme un module à part entière (et non comme une sous-section de CertifTrack), parce que sa mise en œuvre est opérationnelle quotidienne (relevés CCP, registres) et non documentaire ponctuelle. Il s'interface avec CertifTrack pour l'audit, mais vit en parallèle pour l'exploitation.

## 4e.2 Architecture interne

```
HACCP
├── Étude HACCP (par produit / ligne de transformation)
│   ├── Description du produit
│   ├── Diagramme de fabrication
│   ├── Analyse des dangers (biologique, chimique, physique, allergénique)
│   ├── Identification des CCP (Critical Control Points)
│   ├── Limites critiques par CCP
│   └── Validation du plan
│
├── Surveillance opérationnelle
│   ├── Relevés CCP quotidiens (température, humidité, pH, durée)
│   ├── Saisie opérateur sur smartphone
│   ├── Alertes automatiques en cas de dépassement
│   └── Photos en preuve
│
├── Actions correctives
│   ├── Procédure par CCP en cas de non-conformité
│   ├── Traçabilité des produits non-conformes
│   ├── Décisions : isolation, retraitement, destruction
│   └── Registre des actions
│
├── Vérification
│   ├── Audit interne périodique
│   ├── Calibration des équipements (thermomètres, balances)
│   └── Test de traçabilité (rappel produit simulé) — couvert par Vérification Lot Axe 4 🆕 v0.10
│
├── Hygiène & PRP (Programmes Pré-Requis)
│   ├── Hygiène du personnel (formation, suivi médical)
│   ├── Nettoyage et désinfection (plan + registre)
│   ├── Lutte contre les nuisibles
│   ├── Maintenance des équipements
│   ├── Eau et glace
│   └── Gestion des déchets
│
└── Documentation
    ├── Manuel HACCP
    ├── Procédures opérationnelles
    ├── Registres horodatés
    └── Rapport d'audit interne / dossier auditeur externe
```

## 4e.3 Dangers à analyser pour les produits AgriSuite

| Produit | Dangers biologiques | Dangers chimiques | Dangers physiques |
|---|---|---|---|
| **Vanille** | Moisissures, levures osmophiles | Pesticides, métaux lourds | Cailloux, débris végétaux |
| **Girofle** | Aflatoxines (Aspergillus) | Pesticides, fumigants (PH3) | Tiges, débris |
| **Cannelle** | Salmonella, E. coli | Coumarine excessive (cassia), pesticides | Éclats, pierres |
| **Café** | Ochratoxine A | Pesticides, métaux lourds | Cailloux, métal (post-décorticage) |
| **Cacao** | Salmonella, moisissures | Cadmium, pesticides | Coques, métaux |
| **Poivre** | Salmonella, E. coli | Pesticides | Cailloux, débris |
| **Gingembre** | Moisissures, bactéries | Résidus de pesticides, métaux lourds | Terre, pierres |
| **Fruits séchés** | Levures, moisissures, insectes | Sulfites résiduels (si SO2), pesticides | Noyaux, fragments |

## 4e.4 CCP typiques par filière

| Filière | CCP typiques | Limites critiques indicatives |
|---|---|---|
| **Séchage vanille** | Température, humidité finale | Hum. finale ≤ 25%, température 50-60 °C contrôlée |
| **Fermentation cacao** | Durée, température, retournement | 5-7 jours, T° centrale 45-50 °C |
| **Torréfaction café** | Température, durée | Selon profil — 200-220 °C, 10-15 min |
| **Séchage gingembre** | Humidité finale | Humidité ≤ 12% |
| **Conditionnement** | Détection de métaux | Aucun fragment > 2 mm |
| **Stockage** | Température, humidité, nuisibles | T° < 25 °C, HR < 65%, absence d'insectes |

## 4e.5 Lien HACCP ↔ CertifTrack ↔ ExportTrack ↔ Vérification Lot

- HACCP fournit les **registres opérationnels** (températures, humidités, actions correctives)
- CertifTrack vérifie que les registres HACCP existent et sont conformes lors d'un audit BIO/Fairtrade/etc.
- ExportTrack attache les rapports HACCP du lot au dossier traçabilité PDF du lot
- 🆕 Vérification Lot Axe 4 (recall test) consomme les données de chaînage HACCP pour valider la traçabilité ascendante en moins de 4h

---

# 5. Hiérarchie des Rôles Utilisateurs

| Rôle | Droits et accès |
|---|---|
| 🔑 Propriétaire | Accès total : guides agronomiques, suggestions IA, validation des décisions, tableaux de bord, veille stratégique, paramétrage tous sites, gestion rôles, CertifTrack, EconoSite, gestion des fournisseurs collecte, **lancement des vérifications de lot et audits blancs**. |
| 📋 Gérant de site | Accès tableaux de bord de son/ses site(s), décisions validées, rapports production, tâches opérateurs. Peut saisir observations et commentaires. Peut superviser les opérations HACCP de son site. **Peut consulter les vérifications de lot.** |
| 🌾 Opérateur de terrain | Accès uniquement aux formulaires de saisie : mesures journalières, observations, relevés météo, récoltes, **bons de collecte fournisseurs, relevés CCP HACCP**. Interface simplifiée Android. |
| 🛡️ Inspecteur SCI (NOUVEAU v0.9) | Rôle dédié filière collecte : visite producteurs, remplit grille d'inspection, signe rapports, ne saisit pas d'autres données. Peut être interne ou externe. |

---

# 6. Contraintes & Impératifs Techniques

## 6.1 Contraintes techniques

- Couverture nationale : CropEngine couvre toutes les zones agroécologiques
- Fonctionnement offline-first : synchronisation différée
- Interface légère : Android d'entrée de gamme, utilisateurs novices
- Multilingue : français + malgache simplifié
- Sécurité des données : accès contrôlé par rôle
- Synchronisation multi-sites
- **Horodatage infalsifiable** (NOUVEAU v0.9) : tous les enregistrements de traçabilité (lots, CCP HACCP, inspections SCI, **vérifications de lot 🆕 v0.10**) doivent être horodatés et non-modifiables après validation. Une correction = un nouvel enregistrement avec mention "rectificatif".
- **Conservation historique des vérifications** 🆕 v0.10 : un même lot peut être vérifié plusieurs fois (à 6 mois d'écart par exemple). Chaque vérification est un événement daté à part entière, jamais écrasé.

## 6.2 Contraintes agronomiques

- Saisonnalité critique : soudure fourragère = risque n°1
- Données météo par site : API OpenWeatherMap + saisie manuelle
- Synergie inter-modules : fumure organique élevage → fertilisation maraîchère
- Gestion incertitude hydrique : niveau eau par planche (inconnu/limité/suffisant) filtre les recommandations cultures

## 6.3 Contraintes export & certification (NOUVEAU v0.9)

- Traçabilité ascendante 100% obligatoire de l'expédition au producteur d'origine
- Séparation physique et documentaire des lots BIO / conventionnels
- Délais de conversion BIO strictement appliqués (cultures annuelles 24 mois, pérennes 36 mois)
- Documents export obligatoires : phytosanitaire, certificat d'origine, certificat BIO du lot, fumigation si demandée
- Rappel produit (recall) : test de traçabilité simulé annuel obligatoire pour HACCP — **automatisé via Vérification Lot Axe 4 🆕 v0.10**
- Conservation des registres : 5 ans minimum (BIO UE), parfois plus selon référentiel

## 6.4 Impératifs de développement

- Paramétrage fin par parcelle
- Incrémentalité : chaque module utilisable indépendamment
- Formation intégrée : guides et tutoriels contextuels
- Interopérabilité future : sync cloud + outils comptables
- Génération PDF native (passeport lot, dossier audit, rapport SCI, manuel HACCP, **rapport vérification lot 🆕 v0.10**)

---

# 7. Roadmap de Développement

| Phase | Durée est. | Modules | Livrable |
|---|---|---|---|
| 0a ✅ | 2-3 semaines | T1 AgroMap — GPS, carte satellite, calcul superficie Shoelace | M1 ParcelleManager opérationnel |
| 0b ✅ | 3-4 semaines | T2 CropEngine — 13 cultures fourragères, moteur alertes, écran gestion | CropEngine opérationnel |
| 1 ✅ | 6-8 semaines | M2 ForagePro + M6 InfoVeille météo | Suivi fourrage + élevage laitier opérationnel |
| 2 ✅ | 6-8 semaines | M3 MaraîcherGuide + enrichissement CropEngine 13 cultures maraîchères | Maraîchage connecté à l'élevage, planches, cultures, récoltes |
| **3** 🔄 | **12-16 semaines** | **M4 ExportTrack (filière A+B + Vérification Lot) + M4b HACCP + M8 CertifTrack + M6 InfoVeille prix + enrichissement CropEngine cultures export** | **Filière export complète : production + collecte + transformation + certification + audit + vérification** |
| 4 | 6-8 semaines | M5 Dashboard + M5b LogiSite + M5c EconoSite | Pilotage complet (CertifTrack absorbé en Phase 3) |
| 5 | À définir | M7 AquaPro — Pisciculture | Pisciculture intégrée |
| Migration AppLait | En parallèle | modules/elevage/ | AppLait terrain complet intégré |
| Migration Formulateur | Phase 3 ou 4 | modules/nutrition/ | Formulateur React Native opérationnel |

> 🔄 **Décision v0.9** : Phase 3 élargie de 8-10 à 12-16 semaines pour absorber CertifTrack + HACCP. Phase 4 réduite en conséquence (CertifTrack retiré). Justification : la filière collecte est inopérante sans SCI/HACCP/CertifTrack.

## 7.1 Découpage Phase 3 — Sessions prévues / réalisées

| Session | Objectif | Livrable | Statut |
|---|---|---|---|
| 1 | Cadrage stratégique, décisions architecturales | v0.9 des specs | ✅ |
| 2 | Schéma SQLite ExportTrack — lots production + collecte unifiés | `database/exportTrack.js` + tables | ✅ |
| 3 | Écran ExportTrack Home + saisie lot production (lien MaraîcherGuide gingembre) | MVP filière A | ✅ |
| 4 | Écrans CollecteTrack — fournisseurs + bons de collecte | MVP filière B | ✅ |
| 5 | Étapes post-récolte (tri, séchage, calibrage, perte) + analyses qualité | Commun A et B | ✅ |
| 6 | Conditionnement + acheteurs + bordereau d'expédition + export PDF passeport lot | Sortie traçabilité | ✅ |
| 7 | CertifTrack v1 — catalogue référentiels + engagement par lot/site/culture | `database/certifTrack.js` | ✅ |
| 8 | CertifTrack v2 — exigences détaillées par référentiel + preuves + alertes conformité auto (428 exigences) | Cœur du module | ✅ |
| 9a | SCI base — fournisseurs, contrats, parcelles_producteur | Tables SCI | ✅ |
| 9b1/2/3 | SCI inspections — planifiées + terrain + sanctions + PDF rapport | Workflow inspection | ✅ |
| 9c-fix | Conversion BIO par parcelle + écrans parcelles producteur + fixes navigation | Granularité parcelle | ✅ |
| **9c-conceptuel** 🆕 | **Vérification lot 5 axes (traçabilité, qualité, mass balance, recall, cohérence)** | **`screens/VerifLotScreen.js` + tables verifications_lots** | **✅ v0.10** |
| 9c2 | Formations producteurs (obligatoires Fairtrade/RA) | Module formations | À venir |
| 9c3 | Dashboard SCI — vue synthétique multi-producteurs | Pilotage SCI | À venir |
| 9d | Audit blanc opérateur (référentiel par référentiel sur l'exportateur lui-même) | Module dédié | À venir |
| 10 | HACCP v1 — étude HACCP, CCP, limites critiques, schéma de fabrication | `database/haccp.js` | À venir |
| 11 | HACCP v2 — surveillance opérationnelle (relevés CCP), actions correctives, PRP | Module complet | À venir |
| 12 | InfoVeille prix — scraping cours mondiaux + saisie manuelle locale | Veille active | À venir |
| 13 | Enrichissement CropEngine cultures pérennes export (vanille, girofle, cannelle, café, cacao, poivre, litchi) | Données seed | À venir |
| 14 | Génération PDF : passeport lot + dossier audit + rapport SCI + manuel HACCP + **rapport vérification lot** | Sortie documentaire | Partiel ✅ (passeport + SCI faits) |
| 15 | Tests intégrés filière A + filière B + simulation audit complet | Validation | À venir |
| 16 | Corrections, clôture Phase 3, mise à jour v1.0 | Phase clôturée | À venir |

---

# 8. Informations à Préparer — Checklist

## 8.1 Phases 0, 1, 2 ✅

Toutes les informations nécessaires sont disponibles et intégrées.

## 8.2 Pour démarrer la Phase 3 (ExportTrack + HACCP + CertifTrack)

| Information requise | Statut | Module |
|---|---|---|
| Cultures export prioritaires production | ✅ Gingembre Site D confirmé | M4 ExportTrack |
| Cultures cibles collecte | ✅ Vanille, girofle, cannelle, café, cacao, fruits séchés, poivre | M4 ExportTrack |
| Architecture deux filières dans M4 | ✅ Validée v0.9 | M4 ExportTrack |
| Définition formelle du lot | ✅ Validée v0.9 (parcelle/fournisseur + fenêtre + traitement homogène) | M4 ExportTrack |
| Format ID lot | ✅ MDG-AAAA-XXX-CCC-NNN | M4 ExportTrack |
| Distinction audit ≠ vérification | ✅ Validée v0.10 | M4 + M8 |
| 5 axes de vérification de lot | ✅ Implémentés Session 9c-conceptuel | M4 ExportTrack |
| Niveau de transformation | ✅ Légère + module HACCP complet | M4b HACCP |
| Nombre de fournisseurs au démarrage | ✅ 5 producteurs, extension progressive | M8 CertifTrack (SCI) |
| Référentiels prioritaires | ✅ HACCP + BIO UE + Fairtrade + RA selon produit | M8 CertifTrack |
| Posture certif | ✅ Expert auditeur pointilleux, pas de demi-mesure | M8 CertifTrack + Vérif Lot |
| Marchés cibles export | ⏳ UE/USA/Japon — à confirmer selon premiers acheteurs | M4 + M6 InfoVeille |
| Acheteurs identifiés | ⏳ À prospecter | M4 + M6 InfoVeille |
| Prix marchés internationaux | ✅ Scraping automatique décidé (vanille, girofle, café, cacao, poivre) | M6 InfoVeille |
| Prix marchés locaux | ⏳ Saisie manuelle Propriétaire — à collecter | M6 InfoVeille |

---

# 9. Organisation des Sessions de Travail

## 9.1 Règles de collaboration

- Chat stratégique : vision, architecture, décisions transversales. Pas de développement.
- Un chat par module : nouveau chat dédié pour chaque module.
- Partager ce document en début de chat.
- Sessions courtes et ciblées : un objectif précis par session.
- Mise à jour du document après chaque décision importante.

## 9.2 Convention de nommage des chats

| Type de chat | Exemple de nom |
|---|---|
| Chat stratégique | AgriSuite — Architecture & Vision |
| Développement module | AgriSuite — M4 ExportTrack — Schéma SQLite |
| Session de revue | AgriSuite — Revue Phase 3 — Audit blanc |
| Problème / bug | AgriSuite — M4 ExportTrack — Correction passeport lot |

---

# 10. Historique des Versions

| Version | Date | Modifications |
|---|---|---|
| v0.1 | Avril 2026 | Création initiale — Vision, architecture 3 blocs / 8 modules, rôles, roadmap |
| v0.2 | Avril 2026 | Ajout données réelles sites + données élevage de référence + checklists |
| v0.3 | Avril 2026 | Ajout T1 AgroMap + T2 CropEngine, Section 3b, couverture nationale |
| v0.4 | Avril 2026 | Session 1 Phase 0a : stack React Native + Expo, modes carte bureau/terrain |
| v0.5 | Avril 2026 | Phase 0a bouclée : Navigation Stack, SQLite offline-first, CRUD Sites, GPS terrain, superficie Shoelace |
| v0.6 | Avril 2026 | Phase 0b bouclée : CropEngine 13 cultures fourragères, moteur alertes, écran gestion |
| v0.7 | Avril 2026 | Phase 1 bouclée : ForagePro 5 écrans, météo OpenWeatherMap. Décision écosystème 3 produits / 1 codebase. |
| v0.8 | Avril 2026 | Phase 2 bouclée : M3 MaraîcherGuide complet. Correction surfaces sites. Ajout Section 2.3 données maraîchage. |
| v0.9 | Avril 2026 | Phase 3 cadrée — architecture deux filières en M4 ExportTrack (production + collecte unifiés), définition formelle du lot et format ID, repriorisation de M8 CertifTrack en Phase 3, ajout module M4b HACCP complet, panorama référentiels MDG, posture expert auditeur, ajout rôle Inspecteur SCI, ajout pilier 4 collecte-export, sessions Phase 3 détaillées (16 sessions). |
| **v0.10** | **Mai 2026** | **Session 9c-conceptuel : distinction audit ≠ vérification (on AUDITE un acteur, on VÉRIFIE un lot), module Vérification Lot avec 5 axes auditables (traçabilité ascendante, qualité physico-chimique, mass balance, test de rappel, cohérence référentielle), tables `verifications_lots` + `verifications_lots_axes`, écran `VerifLotScreen` avec accordéon pédagogique, posture expert auditeur Ecocert/FLOCERT. SCI étendu (Sessions 9a-9c-fix) : fournisseurs, parcelles_producteur avec GPS, contrats, inspections planifiées + terrain + sanctions + PDF, conversion BIO par parcelle (granularité parcelle pas producteur). Audit blanc opérateur déplacé vers Session 9d.** |

---

# 11. Historique des Sessions de Développement

## 11.1 Phase 0a — Sessions 1, 2 & 3

**Décisions techniques**

| Décision | Choix | Raison |
|---|---|---|
| Stack | React Native + Expo | Développement IA-assisté, test via Expo Go, zéro config |
| Carte | Deux modes | Bureau (dessin satellite) + terrain (GPS en marchant) |
| Séquençage | Parallèle décalé | 0a sem. 1-2, 0b sem. 3, intégration sem. 7 |

**Environnement technique**
- Node.js v24.15.0 — C:\Users\rjoer\AgriSuite
- VS Code + Expo Go Android — flux validé

**État fin Phase 0a** ✅ : CRUD Sites, carte satellite, GPS terrain, calcul superficie Shoelace, parcelles offline-first.

## 11.2 Phase 0b — CropEngine

**Fichiers créés**

| Fichier | Contenu |
|---|---|
| database/cropEngine.js | 6 tables SQLite : cultures, stades_phenologiques, besoins_intrants, grilles_observation, ravageurs, alertes_parcelle, parcelle_cultures |
| database/cropData.js | 13 cultures fourragères + stades phénologiques Brachiaria / Bana grass / Sorgho |
| database/alertEngine.js | genererAlertes(), getAlertesProchaines(), getStadeActuel(), updateStatutAlerte() |
| screens/CropEngineScreen.js | Écran Propriétaire : liste, filtres, détail, ajout/modif, génération IA, désactivation |

**État fin Phase 0b** ✅ : CropEngine opérationnel, 13 cultures fourragères en base.

## 11.3 Phase 1 — ForagePro + Météo

**Fichiers créés**

| Fichier | Contenu |
|---|---|
| database/foragePro.js | 4 tables : animaux, productions_laitieres, stocks_fourrage, mouvements_fourrage |
| database/forageData.js | Seed 3 animaux réels + 5 stocks initiaux + seedForagePro() |
| screens/ForageProHomeScreen.js | Dashboard synthétique : production jour, alerte soudure, accès 4 modules |
| screens/TroupeauScreen.js | CRUD animaux, badges catégorie, formulaire modal |
| screens/SaisieJournaliereScreen.js | Formulaire opérateur : litres matin/soir, qualité, anomalies |
| screens/StockFourrageScreen.js | Stocks par espèce, mouvements, calcul soudure, alertes colorées |
| screens/MeteoSiteScreen.js | API OpenWeatherMap auto + saisie manuelle, historique 14 jours |

**Décisions techniques Phase 1**

| Décision | Choix |
|---|---|
| Météo API | OpenWeatherMap plan gratuit |
| Calcul soudure | Moyenne 7 derniers jours sorties ration |
| Seed animaux | Idempotent (COUNT > 0) |

**État fin Phase 1** ✅ : ForagePro opérationnel — troupeau, traites, stocks fourragers, alerte soudure, météo.

## 11.4 Phase 2 — MaraîcherGuide

**Fichiers créés**

| Fichier | Contenu |
|---|---|
| database/maraicher.js | 5 tables SQLite : planches, cultures_maraicheres_en_cours, recoltes_maraicheres, apports_fumure, objectifs_production_site. CRUD complet + calcul fumier disponible (lien ForagePro) + calcul besoin journalier + dashboard synthétique |
| database/maraicherData.js | 13 cultures maraîchères avec itinéraires techniques complets + seedMaraicher() |
| screens/MaraicherHomeScreen.js | Dashboard : taux couverture alimentaire, fumure disponible, cultures actives, alertes récolte |
| screens/PlancheListScreen.js | Liste planches par site, cultures en cours, actions clôture |
| screens/PlancheFormScreen.js | Formulaire planche : nom, surface, eau, sol, exposition |
| screens/CultureFormScreen.js | Démarrer une culture : choix CropEngine, date semis, destination, warning eau |
| screens/SaisieRecolteScreen.js | Saisie récolte opérateur : quantité (grand champ), qualité, destination, prix vente, confirmation flash |
| screens/SiteDetailScreen.js | Refonte : bouton MaraîcherGuide intégré, sections Modules/Actions, paddingBottom navigation Android |

**Décisions techniques Phase 2**

| Décision | Choix | Raison |
|---|---|---|
| Seed maraîcher | Dans maraicherData.js | Pattern cohérent avec forageData.js — données et seed dans le même fichier |
| Migration colonnes CropEngine | ALTER TABLE dans seedMaraicher() avant tout INSERT | Colonnes maraîchage absentes de la table initiale — migration idempotente via try/catch |
| Gingembre | Géré dans MaraîcherGuide, pas ExportTrack | Suivi agronomique d'abord, traçabilité export greffée plus tard |
| Niveau eau par planche | Paramètre inconnu/limité/suffisant | Filtre recommandations cultures selon disponibilité eau réelle |
| Objectif école | 200 élèves/site = 800 élèves total | Base de calcul couverture alimentaire dans le dashboard |

**Corrections techniques Phase 2**

- `getDb()` inexistant → instance SQLite locale dans maraicher.js (même pattern que foragePro.js)
- Colonnes CropEngine : `altitude_min/max` (pas `altitude_min_m`), `actif` (pas `active`), `nom_fr` pour stades, `jour_debut/fin`, `action_recommandee`, `stade_code`, `dose`
- `import` doit être en première ligne — pas après les `export const`
- Code exécuté hors fonction interdit (DELETE de nettoyage encapsulé dans seedMaraicher)
- Commentaire `//` invalide dans JSX → remplacer par `{/* */}`
- `zones_adaptees` stocké en JSON array : `JSON.stringify([...])` requis, split sur virgule pour les strings multi-zones

**État fin Phase 2** ✅ : MaraîcherGuide opérationnel — planches, cultures, récoltes, fumure, dashboard couverture alimentaire école.

## 11.5 Phase 3 — ExportTrack + HACCP + CertifTrack (en cours)

**Session 1 — Cadrage stratégique** (avril 2026)

Décisions architecturales validées :

| Décision | Choix | Justification |
|---|---|---|
| Périmètre M4 | Deux filières unifiées (production + collecte) | Le métier réel inclut beaucoup de collecte-négoce, pas que de la production propre |
| Définition lot | Origine homogène + fenêtre temporelle bornée + traitement homogène | Standard filière épices/vanille MDG |
| Format ID lot | MDG-AAAA-XXX-CCC-NNN (lots composites préfixés C) | Passeport unique infalsifiable |
| CertifTrack | Repriorisé Phase 3 (au lieu de Phase 4) | Indissociable d'ExportTrack pour la filière collecte |
| HACCP | Module complet à part entière (M4b) | Obligatoire dès transformation, vie opérationnelle quotidienne distincte de l'audit |
| Posture certif | Expert auditeur pointilleux | "Pas de demi-mesure, agit comme un expert auditeur de chaque référentiel" |
| Fournisseurs collecte | 5 au démarrage, extension progressive | Démarrage prudent, support import CSV pour scaling |
| Prix marchés | Scraping automatique cours mondiaux + saisie manuelle prix locaux | Mix pertinent selon disponibilité données |
| Phase 3 durée | Étendue de 8-10 à 12-16 semaines | Absorption CertifTrack + HACCP |

**Sessions 2-6 — ExportTrack MVP** (avril 2026) ✅

| Fichier | Contenu |
|---|---|
| database/exportTrack.js | 12 tables SQLite, 25+ CRUD, génération code lot, traceability helpers |
| database/qualiteSeuils.js | 30+ seuils Codex/UE/ICCO/SCA |
| screens/ExportTrackHomeScreen.js | KPI banner, filière split cards, alertes |
| screens/LotProductionFormScreen.js | Filière A — anti-double-rattachement |
| screens/LotCollecteFormScreen.js | Filière B — mode rapide création inline |
| screens/BonCollecteFormScreen.js | Auto-calcul totaux, lot à la volée |
| screens/FournisseurListScreen.js + FournisseurFormScreen.js | Code F-{ZONE}-{NNN} auto, CRUD complet |
| screens/LotDetailScreen.js | Cycle de vie complet, sections origine A/B |
| screens/LotClotureScreen.js | Audit pré-clôture, signature validateur |
| screens/EtapeFormScreen.js | Tri/séchage/calibrage avec champs spécifiques |
| screens/AnalyseQualiteFormScreen.js | Seuils prédéfinis surcharge-ables, auto-conformité |
| screens/ConditionnementFormScreen.js | Mise en sachets/palettes |
| screens/RectifierLotScreen.js | Copie sélective avec cases à cocher |
| services/pdfPasseport.js + PasseportPdfPreviewScreen.js | PDF passeport via expo-print + expo-sharing |

**Sessions 7-8 — CertifTrack catalogue + exigences** (avril-mai 2026) ✅

| Fichier | Contenu |
|---|---|
| database/certifTrack.js | Référentiels, engagements, exigences, preuves (428 exigences modélisées) |
| screens/CertifTrackHomeScreen.js | Vue par cible (lot/site/culture/fournisseur) |
| screens/EngagementFormScreen.js | Création engagement + carte score audit blanc |
| screens/AuditBlancScreen.js | Audit blanc complet du référentiel engagé sur la cible |

**Session 9a — SCI base** (mai 2026) ✅

Tables : `parcelles_producteur` (avec GPS), `contrats_sci`, `engagements_certif` étendu pour fournisseurs.

**Sessions 9b1/2/3 — SCI inspections** (mai 2026) ✅

| Fichier | Contenu |
|---|---|
| database/sci.js | Tables inspections planifiées + terrain + sanctions |
| screens/InspectionPlanifieeScreen.js | Calendrier annuel par producteur |
| screens/InspectionTerrainScreen.js | Grille remplie sur le terrain |
| screens/SanctionScreen.js | Avertissement → suspension → exclusion |
| services/pdfRapportSci.js | PDF rapport inspection signé |

**Session 9c-fix — Conversion BIO + fixes** (mai 2026) ✅

- Conversion BIO par parcelle (granularité parcelle, pas producteur)
- `ProducteurParcelleFormScreen` avec saisie GPS lat/lon + capture position courante
- Fix bug double bon de collecte (useFocusEffect re-déclenché)
- Fix paddingBottom InspectionTerrainScreen
- Liste parcelles dans FournisseurFormScreen (mode édition)

**Session 9c-conceptuel — Vérification Lot** (mai 2026) ✅ 🆕 v0.10

Glissement conceptuel majeur : **on AUDITE un acteur, on VÉRIFIE un lot**. Refonte du module "Audit blanc lot" en "Vérification traçabilité lot" avec 5 axes structurés.

| Fichier | Contenu |
|---|---|
| database/exportTrack.js | Ajout tables `verifications_lots` + `verifications_lots_axes`. CRUD : creerVerificationLot, getVerificationLot, getAxesVerification, updateAxeVerification (avec recalcul auto statut global). 5 calculateurs : calculerAxe1Tracabilite (filière A/B via colonne `lots.filiere`, agrégation par fournisseur, flag parcelles manquantes), calculerAxe2Qualite (analyses critiques par culture), calculerAxe3MassBalance (entrée − sortie − pertes, seuils 2%/5%), calculerAxe4Recall (chaîne 5 maillons reconstituée), calculerAxe5Coherence (engagements fournisseur amont vs date collecte, fraude rétroactive détectée) |
| screens/VerifLotScreen.js | Accordéon 5 axes avec badges statut (na/conforme/alerte/non_conforme), description pédagogique par axe (question d'auditeur), rendu détaillé spécifique par axe, registry CALCULATEURS extensible |

**Décisions techniques Session 9c-conceptuel**

| Décision | Choix | Raison |
|---|---|---|
| Audit ≠ vérification | Distinction explicite | Confusion fragilise la posture face aux auditeurs |
| Détection filière | Via `lots.filiere` (pas `fournisseur_id`) | `fournisseur_id` est NULL pour lots collecte multi-fournisseurs |
| Stockage vérifications | Table dédiée `verifications_lots` (pas dans `lots`) | Une vérif = événement daté, plusieurs vérifs possibles, historique préservé |
| UX 5 axes | Accordéon (pas onglets) | Vue d'ensemble auditeur + déroulé pédagogique sur demande |
| Architecture | Registry CALCULATEURS | Ajout futur axe 6+ trivial : 1 fonction calc + 1 fonction render |

**État fin Session 9c-conceptuel** ✅ : Vérification Lot opérationnelle sur les 5 axes, posture expert auditeur Ecocert/FLOCERT respectée.

---

# 12. Décision Stratégique — Migration AppLait & Formulateur

## 12.1 Modules AppLait à migrer (par priorité)

| Priorité | Module | Effort | Notes |
|---|---|---|---|
| P1 | Troupeau + Fiches animales | Moyen | UI à réécrire, logique simple |
| P1 | Traites journalières + courbe production | Faible | Logique JS réutilisable |
| P2 | Reproduction (IA, vêlage, gestations) | Moyen | |
| P2 | Santé + signalements vétérinaires | Moyen | |
| P3 | Scoring A/B/C | Faible | Calcul déjà écrit |
| P3 | Formulateur de rations | Fort | Le plus complexe — pont entre AppLait et AgriSuite |

## 12.2 Le Formulateur comme pont stratégique

Le Formulateur produit la quantité de fourrage nécessaire par animal/jour — c'est exactement le chiffre qui alimente le calcul de soudure de ForagePro. Intégration prévue en Phase 3 ou 4 dans `modules/nutrition/` selon la charge de Phase 3.

---

> 🚀 Prochaine étape : Session 9d — Audit blanc opérateur (audit du référentiel sur l'exportateur lui-même, distinct de la vérification de lot). Ouvrir le chat "AgriSuite — M8 CertifTrack — Audit Opérateur" et partager ce document v0.10 en début de session.

---

*Confidentiel — Usage interne uniquement*
