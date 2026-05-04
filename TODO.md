# AgriSuite — Carnet des TODO différés

Ce fichier liste les éléments qui ont été identifiés comme nécessaires mais
volontairement reportés à une session ultérieure pour préserver le focus de
chaque session de développement.

Mise à jour : Phase 3 / Session 4 — Avril 2026

---

## 🔴 PRIORITÉ HAUTE — À traiter Sessions 5-6 Phase 3

### LotDetailScreen v2 — enrichissement post-récolte

**Statut actuel** : placeholder Session 4 affichant les infos de base du lot

**À ajouter Session 5** :
- Bloc **Étapes post-récolte** avec timeline : tri, séchage, calibrage, perte
  - Bouton "+ Ajouter une étape" (ouvre formulaire EtapeForm)
  - Affichage par carte : type, dates, qté entrée/sortie, perte calculée
  - Conformité CCP (si HACCP plus tard)
- Bloc **Analyses qualité** avec graphique d'évolution
  - Bouton "+ Saisir une analyse"
  - Humidité (objectif < 12% gingembre, < 25% épices générales)
  - Vanilline (vanille), polyphénols (cacao), taille calibrée
  - Conformité automatique selon seuils
- Bouton **🔒 Clôturer le lot**
  - Capture `valide_par` + `valide_le`
  - Confirmation avant action (irréversible sauf rectificatif)
  - Disabled si lot déjà clôturé
- Bouton **🔗 Voir la récolte source** (si `recolte_maraichere_id` existe)
  - Navigation vers MaraîcherGuide pour traçabilité ascendante

**À ajouter Session 6** :
- Bloc **Conditionnement** : palette, sac, sachet, étiquetage
- Bouton **+ Créer un lot composite** à partir de ce lot
- Génération PDF passeport du lot (Session 14)

---

## 🟡 PRIORITÉ MOYENNE — Mini-phase agroécologie après ExportTrack

### Associations de cultures sur une même planche

**Problème identifié Session 4** : la table `cultures_maraicheres_en_cours`
permet techniquement plusieurs cultures sur une même `planche_id`, mais sans
lien explicite. Conséquences :
- Surface comptée plusieurs fois dans calculs couverture alimentaire
- Rendements faussés (chaque culture évaluée comme si elle avait toute la
  surface)
- Pas de date de "début d'association" pour suivi agronomique

**Pourquoi c'est important** : l'agroécologie malgache pratique massivement
les associations (les "trois sœurs" maïs-haricot-courge, riz-pisciculture,
vanille sous tuteur vivant, tomate-basilic, carotte-poireau). Pour la
certification BIO et la pertinence agronomique, on ne peut pas l'ignorer.

**Approche court terme (1 session)** :
```sql
ALTER TABLE cultures_maraicheres_en_cours
  ADD COLUMN est_associee INTEGER DEFAULT 0;
ALTER TABLE cultures_maraicheres_en_cours
  ADD COLUMN part_surface_pct REAL DEFAULT 100;
```
+ UI dans `CultureFormScreen` : checkbox "Cette culture est associée à une
autre", saisie de la part de surface en %. Calculs de rendement et
couverture alimentaire pondérés par `part_surface_pct / 100`.

**Approche long terme (mini-phase complète, 3-4 sessions)** :
- Nouvelle table `associations_culturales` : id, planche_id, nom,
  date_debut, date_fin, type (ex: "trois_soeurs", "agroforesterie")
- Table de jointure `association_membres` : association_id, culture_id,
  rang (principal/secondaire/couvre-sol), part_surface_pct
- Table `regles_compatibilite` : couples de cultures, niveau (favorable/
  neutre/défavorable), justification agronomique
- UI dédiée : sélection d'une combinaison, validation des règles, suggestions
- Intégration CropEngine pour les itinéraires techniques d'association

---

## 🟡 PRIORITÉ MOYENNE — Phase 3 Session 13

### Détection automatique cultures export filière A

**Statut actuel** : dans `SaisieRecolteScreen.js`, la fonction
`estCultureExportFiliereA(culture)` détecte uniquement le gingembre via
test sur `nom_fr`. Code de l'écran :

```js
function estCultureExportFiliereA(culture) {
  if (!culture) return false;
  const nom = (culture.nom_fr || '').toLowerCase();
  return nom.includes('gingembre');
}
```

**À étendre Session 13** (enrichissement CropEngine cultures pérennes) :
- Lors du seed des cultures export (vanille, girofle, cannelle, café,
  cacao, poivre, litchi, ylang-ylang), ajouter colonne migration :
  ```sql
  ALTER TABLE cultures ADD COLUMN est_export_filiere_a INTEGER DEFAULT 0;
  ```
- Mettre à jour le seed pour positionner ce flag à 1 pour gingembre +
  cultures pérennes éligibles à la filière A (production propre)
- Refactor de `estCultureExportFiliereA()` :
  ```js
  return culture?.est_export_filiere_a === 1;
  ```
- Idem dans `LotProductionFormScreen.js` (sélecteur de récolte source)

---

## 🟢 PRIORITÉ BASSE — Améliorations futures

### RecoltesHistoryScreen — filtres avancés

**Statut actuel** : écran ajouté en bonus Session 4 avec filtres simples
(site, période 7j/30j/90j/365j, recherche texte sur culture/planche).

**Améliorations possibles** :
- Filtre par destination (autonomie, école, vente, export, perte)
- Filtre par culture spécifique (sélecteur dédié)
- Période personnalisée avec date pickers (du X au Y)
- Export CSV/PDF de l'historique filtré
- Graphique d'évolution kg/jour sur la période

### Ajustements visuels Phase 3 Session 4

À faire lors d'une passe esthétique dédiée :
- Cohérence entre les deux palettes (Phase 2 vert COULEURS vs Phase 3
  vert+ambre COLORS) — possibilité d'unifier dans un fichier
  `theme/colors.js`
- Vérifier le contraste sur Android d'entrée de gamme (luminosité
  écran limitée)
- Tester en mode plein soleil (lecture terrain)

### Migration de SafeAreaView vers react-native-safe-area-context

**Warning observé Session 4** :
```
SafeAreaView has been deprecated and will be removed in a future release.
Please use 'react-native-safe-area-context' instead.
```

À corriger : remplacer les imports `SafeAreaView` de `react-native` par
`useSafeAreaInsets` ou `SafeAreaView` de `react-native-safe-area-context`
dans tous les écrans concernés. Pas urgent mais à faire avant production.

---

## Historique des décisions reportées

| Session | Décision | Justification report |
|---|---|---|
| Phase 3 / 4 | LotDetailScreen v1 = placeholder | Cœur métier (étapes post-récolte) prévu Session 5-6 |
| Phase 3 / 4 | Associations cultures non traitées | Sujet de fond mérite mini-phase, pas un patch |
| Phase 3 / 4 | RecoltesHistoryScreen ajouté en bonus | Manque identifié dans Phase 2, intégré ici car simple |
| Phase 3 / 4 | Détection export = gingembre uniquement | Cultures pérennes seedées seulement Session 13 |
