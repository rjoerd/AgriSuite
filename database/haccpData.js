// database/haccpData.js
// Phase 3 Session 10a — Seed des 9 études HACCP pré-modélisées
//
// Produits : vanille, girofle, cannelle, café, cacao, poivre, gingembre,
//            fruits séchés, litchi
//
// Sources réglementaires :
//   - Codex Alimentarius CXC 1-1969 (rev. 2020) — Code d'usages général d'hygiène
//   - Règlement (UE) 1881/2006 (mycotoxines, métaux lourds)
//   - Règlement (UE) 2023/915 (refonte limites contaminants)
//   - Codex CXC 80/1981 — Code d'usages pour gingembre/épices
//   - Codex STAN 130-1981 — Standard fruits séchés
//   - ICCO Convention internationale du cacao
//   - SCA Specialty Coffee Association
//
// Structure : tableau de 9 études, chacune avec ses dangers + CCP + limites

import * as SQLite from 'expo-sqlite';
import { calculerSignificatif } from './haccp';

const db = SQLite.openDatabaseSync('certifpilot.db');

// ============================================================
// CATALOGUE DES 9 ÉTUDES HACCP
// ============================================================

const ETUDES_HACCP = [

  // ════════════════════════════════════════════════════════════
  // 1. VANILLE
  // ════════════════════════════════════════════════════════════
  {
    produit_code: 'vanille',
    produit_nom: 'Vanille',
    nom_etude: 'Étude HACCP — Vanille (Vanilla planifolia)',
    description_produit: 'Gousses de vanille préparées (échaudage, étuvage, séchage, affinage). Origine Madagascar, qualité black/noire ou gourmet.',
    destination_produit: 'Industrie agroalimentaire (pâtisserie, glacerie, parfumerie alimentaire), grande distribution',
    population_cible: 'Population générale incluant enfants',
    mode_consommation: 'Aromatisation cuit ou cru',
    duree_conservation: '24-36 mois en conditions optimales',
    conditions_stockage: 'T° 18-22°C, HR 60-70%, à l\'abri de la lumière, contenants hermétiques',
    dangers: [
      { categorie: 'biologique', nom: 'Moisissures (Aspergillus, Penicillium)', desc: 'Développement sur gousses mal séchées ou rehumidifiées', source: 'Endogène + contamination post-récolte', gravite: 'grave', proba: 'probable', mesures: 'Contrôle humidité finale ≤ 25%, stockage HR < 70%, inspection visuelle régulière', ref: 'Codex CXC 80/1981' },
      { categorie: 'biologique', nom: 'Levures osmophiles', desc: 'Fermentation indésirable sur gousses humides', source: 'Endogène', gravite: 'moyenne', proba: 'possible', mesures: 'Maîtrise humidité, conditionnement étanche', ref: 'Codex CXC 1-1969' },
      { categorie: 'chimique', nom: 'Pesticides résiduels', desc: 'Résidus phytosanitaires (cas vanille conventionnelle)', source: 'Pratiques culturales amont', gravite: 'grave', proba: 'possible', mesures: 'Bulletins analyses laboratoire accrédité par lot, traçabilité fournisseur', ref: 'UE 396/2005 (LMR pesticides)' },
      { categorie: 'chimique', nom: 'Métaux lourds (plomb, cadmium)', desc: 'Contamination sols / pollution atmosphérique', source: 'Sols, eau d\'irrigation', gravite: 'grave', proba: 'rare', mesures: 'Analyses Pb/Cd périodiques, sélection terroirs', ref: 'UE 2023/915' },
      { categorie: 'physique', nom: 'Cailloux, débris végétaux', desc: 'Contamination post-récolte', source: 'Manipulation, séchoirs', gravite: 'moyenne', proba: 'probable', mesures: 'Tri manuel à plusieurs étapes, tamisage', ref: 'Codex CXC 1-1969' },
      { categorie: 'physique', nom: 'Insectes / fragments d\'insectes', desc: 'Contamination stockage', source: 'Stockage', gravite: 'moyenne', proba: 'possible', mesures: 'Lutte intégrée nuisibles, pièges, contenants étanches', ref: 'Codex CXC 1-1969' },
    ],
    ccp: [
      {
        numero: 'CCP1', etape: 'Séchage', nom_ccp: 'Séchage contrôlé gousses', danger_idx: 0,
        justif: 'Étape éliminant le risque microbiologique principal (moisissures). Aucune étape ultérieure ne corrige une humidité trop élevée.',
        freq: 'chaque_lot', resp: 'Responsable séchoir',
        action_default: 'Si humidité > 25% : prolonger séchage. Si humidité < 20% : risque casse, ajuster process.',
        limites: [
          { param: 'Humidité finale', max: 25, unite: '%', tolerance: 1, methode: 'Hygromètre étalonné', equip: 'Hygromètre Aw ou méthode gravimétrique', ref: 'Codex CXC 80/1981' },
          { param: 'Température séchage', min: 50, max: 60, unite: '°C', tolerance: 2, methode: 'Sonde thermique', equip: 'Thermomètre digital étalonné', ref: 'Codex CXC 1-1969' },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════════
  // 2. GIROFLE
  // ════════════════════════════════════════════════════════════
  {
    produit_code: 'girofle',
    produit_nom: 'Girofle',
    nom_etude: 'Étude HACCP — Clous de girofle (Syzygium aromaticum)',
    description_produit: 'Boutons floraux séchés. Origine Madagascar (Analanjirofo). Calibre standard FAQ ou choix.',
    destination_produit: 'Industrie agroalimentaire, distillation huile essentielle, épices conditionnées',
    population_cible: 'Population générale',
    mode_consommation: 'Cuisson ou infusion',
    duree_conservation: '36 mois en conditions optimales',
    conditions_stockage: 'T° < 25°C, HR < 65%, sacs jute ou polypropylène',
    dangers: [
      { categorie: 'biologique', nom: 'Aflatoxines (Aspergillus flavus, A. parasiticus)', desc: 'Mycotoxines cancérogènes produites par moisissures sur produits mal séchés', source: 'Séchage insuffisant, stockage humide', gravite: 'critique', proba: 'possible', mesures: 'Séchage rapide post-récolte, humidité ≤ 12%, analyse aflatoxines obligatoire export UE', ref: 'UE 1881/2006 (max 5 µg/kg B1, 10 µg/kg total)' },
      { categorie: 'biologique', nom: 'Salmonella, E. coli', desc: 'Contamination fécale eau ou manipulation', source: 'Eau de lavage, mains opérateurs', gravite: 'grave', proba: 'rare', mesures: 'Eau potable, hygiène opérateurs, analyses microbio périodiques', ref: 'Codex CXC 1-1969' },
      { categorie: 'chimique', nom: 'Pesticides résiduels', desc: 'Résidus phytosanitaires', source: 'Traitements amont', gravite: 'grave', proba: 'possible', mesures: 'Analyses pesticides multi-résidus, traçabilité fournisseur', ref: 'UE 396/2005' },
      { categorie: 'chimique', nom: 'Phosphine résiduelle (PH3)', desc: 'Résidu de fumigation contre nuisibles', source: 'Fumigation export', gravite: 'grave', proba: 'possible', mesures: 'Délai aération obligatoire post-fumigation, analyses résiduelles', ref: 'UE 396/2005' },
      { categorie: 'physique', nom: 'Tiges, débris végétaux', desc: 'Tiges grossières mélangées aux clous', source: 'Récolte, tri insuffisant', gravite: 'faible', proba: 'frequent', mesures: 'Tri manuel, calibrage à tamis', ref: 'ISO 2254 standards girofle' },
      { categorie: 'physique', nom: 'Pierres, sable', desc: 'Contamination séchoirs au sol', source: 'Séchage à même le sol', gravite: 'moyenne', proba: 'probable', mesures: 'Bâches/aires bétonnées, tamisage final', ref: 'Codex CXC 1-1969' },
    ],
    ccp: [
      {
        numero: 'CCP1', etape: 'Séchage', nom_ccp: 'Séchage rapide post-récolte', danger_idx: 0,
        justif: 'Limite critique pour prévenir développement Aspergillus et formation aflatoxines. CCP majeur HACCP.',
        freq: 'chaque_lot', resp: 'Responsable séchoir',
        action_default: 'Si humidité > 12% : isoler lot, prolonger séchage et re-tester. Si > 14% à J+5 : analyse aflatoxines obligatoire avant libération.',
        limites: [
          { param: 'Humidité finale', max: 12, unite: '%', tolerance: 0.5, methode: 'Hygromètre étalonné', equip: 'Hygromètre digital', ref: 'Codex CXC 80/1981 + ISO 6571' },
          { param: 'Durée séchage', max: 5, unite: 'jours', methode: 'Suivi calendaire', equip: 'Registre séchage', ref: 'Bonne pratique' },
        ],
      },
      {
        numero: 'CCP2', etape: 'Réception / Analyse libératoire', nom_ccp: 'Analyse aflatoxines', danger_idx: 0,
        justif: 'Vérification finale conformité UE pour export. Aucune étape ultérieure ne corrige des aflatoxines présentes.',
        freq: 'chaque_lot', resp: 'Responsable qualité',
        action_default: 'Si > 5 µg/kg B1 ou > 10 µg/kg total : lot bloqué, retraitement impossible, destruction ou usage non-alimentaire.',
        limites: [
          { param: 'Aflatoxine B1', max: 5, unite: 'µg/kg', methode: 'HPLC ou ELISA labo accrédité', equip: 'Analyse externe', ref: 'UE 1881/2006' },
          { param: 'Aflatoxines totales (B1+B2+G1+G2)', max: 10, unite: 'µg/kg', methode: 'HPLC labo accrédité', equip: 'Analyse externe', ref: 'UE 1881/2006' },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════════
  // 3. CANNELLE
  // ════════════════════════════════════════════════════════════
  {
    produit_code: 'cannelle',
    produit_nom: 'Cannelle',
    nom_etude: 'Étude HACCP — Cannelle (Cinnamomum verum)',
    description_produit: 'Écorce séchée roulée en bâtons ou broyée. Cannelle de Ceylan (vraie) à différencier de la cassia.',
    destination_produit: 'Industrie agroalimentaire, herboristerie, distribution',
    population_cible: 'Population générale, attention enfants (limite coumarine)',
    mode_consommation: 'Infusion, cuisson, broyage',
    duree_conservation: '24-36 mois',
    conditions_stockage: 'T° < 25°C, HR < 65%, contenants hermétiques',
    dangers: [
      { categorie: 'biologique', nom: 'Salmonella', desc: 'Contamination fécale', source: 'Eau, manipulation', gravite: 'grave', proba: 'possible', mesures: 'Eau potable, hygiène, analyses microbio', ref: 'UE 2073/2005' },
      { categorie: 'biologique', nom: 'E. coli', desc: 'Contamination fécale', source: 'Eau', gravite: 'grave', proba: 'rare', mesures: 'Eau potable, hygiène opérateurs', ref: 'UE 2073/2005' },
      { categorie: 'chimique', nom: 'Coumarine excessive (cassia)', desc: 'Hépatotoxique à forte dose, élevée dans Cinnamomum cassia (à différencier de Ceylan)', source: 'Espèce/variété', gravite: 'grave', proba: 'possible', mesures: 'Vérification botanique espèce, tests coumarine si doute', ref: 'EFSA recommandation 0,1 mg/kg pc/jour' },
      { categorie: 'chimique', nom: 'Pesticides résiduels', desc: 'Traitements phytosanitaires amont', source: 'Pratiques culturales', gravite: 'grave', proba: 'possible', mesures: 'Analyses multi-résidus', ref: 'UE 396/2005' },
      { categorie: 'physique', nom: 'Éclats, fragments d\'écorce', desc: 'Casse mécanique', source: 'Manutention', gravite: 'faible', proba: 'frequent', mesures: 'Tamisage, calibrage', ref: 'Codex CXC 1-1969' },
      { categorie: 'physique', nom: 'Pierres, sable', desc: 'Séchage au sol', source: 'Séchage', gravite: 'moyenne', proba: 'possible', mesures: 'Aires bétonnées ou bâches, tamisage final', ref: 'Codex CXC 1-1969' },
    ],
    ccp: [
      {
        numero: 'CCP1', etape: 'Séchage', nom_ccp: 'Séchage écorce', danger_idx: 0,
        justif: 'Maîtrise activité de l\'eau pour éviter développement microbien.',
        freq: 'chaque_lot', resp: 'Responsable séchoir',
        action_default: 'Si humidité > 12% : prolonger séchage.',
        limites: [
          { param: 'Humidité finale', max: 12, unite: '%', tolerance: 1, methode: 'Hygromètre', equip: 'Hygromètre étalonné', ref: 'Codex CXC 80/1981' },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════════
  // 4. CAFÉ (Arabica + Robusta)
  // ════════════════════════════════════════════════════════════
  {
    produit_code: 'cafe',
    produit_nom: 'Café',
    nom_etude: 'Étude HACCP — Café vert (Arabica & Robusta)',
    description_produit: 'Grains de café vert lavé ou nature. Arabica spécialité (SCA ≥ 80 pts) ou Robusta lavé fine qualité. Origine Madagascar (Hautes Terres mi-altitude pour Arabica, Côte Est pour Robusta).',
    destination_produit: 'Torréfacteurs internationaux, marché spécialité, industrie',
    population_cible: 'Population générale adulte',
    mode_consommation: 'Torréfaction puis infusion',
    duree_conservation: '12-18 mois en café vert, 6-12 mois après torréfaction',
    conditions_stockage: 'T° < 25°C, HR < 65%, sacs jute GrainPro ou hermétiques',
    dangers: [
      { categorie: 'biologique', nom: 'Ochratoxine A (OTA)', desc: 'Mycotoxine néphrotoxique produite par Aspergillus ochraceus, A. carbonarius', source: 'Fermentation/séchage défectueux', gravite: 'critique', proba: 'possible', mesures: 'Maîtrise fermentation, séchage rapide, humidité ≤ 12,5%, analyses OTA', ref: 'UE 2023/915 (max 5 µg/kg café vert, 3 µg/kg torréfié)' },
      { categorie: 'biologique', nom: 'Moisissures diverses', desc: 'Aspergillus, Penicillium sur grains humides', source: 'Stockage humide', gravite: 'grave', proba: 'possible', mesures: 'HR < 65%, ventilation, contrôle visuel', ref: 'Codex CXC 1-1969' },
      { categorie: 'chimique', nom: 'Pesticides résiduels', desc: 'Glyphosate, organophosphorés', source: 'Traitements amont', gravite: 'grave', proba: 'possible', mesures: 'Analyses multi-résidus par lot export', ref: 'UE 396/2005' },
      { categorie: 'chimique', nom: 'Métaux lourds', desc: 'Pb, Cd dans sols', source: 'Pollution sol/atmosphérique', gravite: 'grave', proba: 'rare', mesures: 'Analyses Pb/Cd, sélection terroirs', ref: 'UE 2023/915' },
      { categorie: 'physique', nom: 'Cailloux, gravier', desc: 'Séchage au sol', source: 'Séchage parche', gravite: 'moyenne', proba: 'probable', mesures: 'Triage densimétrique, tamis vibrant', ref: 'SCA Green Coffee Standards' },
      { categorie: 'physique', nom: 'Métal (post-décorticage)', desc: 'Fragments métalliques équipements', source: 'Décortiqueuse, conditionnement', gravite: 'grave', proba: 'rare', mesures: 'Détecteur de métaux en sortie ligne', ref: 'Codex CXC 1-1969' },
    ],
    ccp: [
      {
        numero: 'CCP1', etape: 'Fermentation', nom_ccp: 'Fermentation contrôlée (voie humide)', danger_idx: 0,
        justif: 'Fermentation excessive ou trop courte favorise ochratoxine A et défauts qualité.',
        freq: 'chaque_lot', resp: 'Responsable post-récolte',
        action_default: 'Si pH > 4,5 ou durée hors plage : ajuster, isoler lot si suspect.',
        limites: [
          { param: 'Durée fermentation', min: 12, max: 36, unite: 'heures', tolerance: 2, methode: 'Suivi horodaté', equip: 'Registre fermentation', ref: 'SCA' },
          { param: 'Température fermentation', min: 18, max: 28, unite: '°C', methode: 'Sonde thermique', equip: 'Thermomètre digital', ref: 'SCA' },
        ],
      },
      {
        numero: 'CCP2', etape: 'Séchage', nom_ccp: 'Séchage grains', danger_idx: 0,
        justif: 'Maîtrise activité de l\'eau pour prévenir OTA.',
        freq: 'chaque_lot', resp: 'Responsable séchage',
        action_default: 'Si humidité > 12,5% : prolonger séchage.',
        limites: [
          { param: 'Humidité finale Arabica spécialité', max: 11.5, unite: '%', tolerance: 0.5, methode: 'Hygromètre grains', equip: 'Hygromètre Aqua-Boy ou équivalent', ref: 'SCA Green Coffee Standards' },
          { param: 'Humidité finale Robusta', max: 12.5, unite: '%', tolerance: 0.5, methode: 'Hygromètre grains', equip: 'Hygromètre étalonné', ref: 'ISO 6673' },
        ],
      },
      {
        numero: 'CCP3', etape: 'Analyse libératoire', nom_ccp: 'Analyse OTA', danger_idx: 0,
        justif: 'Vérification finale conformité export UE.',
        freq: 'chaque_lot', resp: 'Responsable qualité',
        action_default: 'Si OTA > 5 µg/kg : lot bloqué, destruction ou usage non-alimentaire.',
        limites: [
          { param: 'Ochratoxine A', max: 5, unite: 'µg/kg', methode: 'HPLC labo accrédité', equip: 'Analyse externe', ref: 'UE 2023/915' },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════════
  // 5. CACAO
  // ════════════════════════════════════════════════════════════
  {
    produit_code: 'cacao',
    produit_nom: 'Cacao',
    nom_etude: 'Étude HACCP — Fèves de cacao fermentées séchées',
    description_produit: 'Fèves de cacao fermentées et séchées. Origine Sambirano (Madagascar) — cacao fin de saveur ICCO 100%. Cible cut-test ≥ 80% bien fermenté.',
    destination_produit: 'Chocolatiers craft / spécialité, industrie',
    population_cible: 'Population générale incluant enfants (vigilance cadmium)',
    mode_consommation: 'Transformation chocolat / poudre',
    duree_conservation: '12-24 mois',
    conditions_stockage: 'T° < 25°C, HR < 70%, sacs jute',
    dangers: [
      { categorie: 'biologique', nom: 'Salmonella', desc: 'Contamination par eau, animaux, opérateurs', source: 'Mauvaise hygiène', gravite: 'grave', proba: 'possible', mesures: 'Eau potable, hygiène, séchage rapide', ref: 'UE 2073/2005' },
      { categorie: 'biologique', nom: 'Moisissures', desc: 'Développement sur fèves mal séchées', source: 'Séchage insuffisant', gravite: 'grave', proba: 'probable', mesures: 'HR < 70%, séchage 7-8 jours, retournement', ref: 'Codex CXC 1-1969' },
      { categorie: 'biologique', nom: 'Sous-fermentation (qualité)', desc: 'Fèves violacées non fermentées = défaut majeur', source: 'Fermentation < 5 jours', gravite: 'moyenne', proba: 'probable', mesures: 'Fermentation 5-7 jours, retournements, T° centrale 45-50°C', ref: 'ICCO Standards' },
      { categorie: 'chimique', nom: 'Cadmium (Cd)', desc: 'Métal lourd accumulé via sols volcaniques', source: 'Sols, eau d\'irrigation', gravite: 'critique', proba: 'possible', mesures: 'Analyses Cd obligatoires, sélection terroirs, possibilité chaulage sols', ref: 'UE 2023/915 (max 0,80 mg/kg cacao en poudre vendu au consommateur)' },
      { categorie: 'chimique', nom: 'Pesticides résiduels', desc: 'Résidus traitements', source: 'Pratiques culturales', gravite: 'grave', proba: 'possible', mesures: 'Analyses multi-résidus', ref: 'UE 396/2005' },
      { categorie: 'physique', nom: 'Coques, débris', desc: 'Fèves cassées, coques', source: 'Manutention', gravite: 'faible', proba: 'frequent', mesures: 'Tri manuel, tamisage', ref: 'ICCO' },
      { categorie: 'physique', nom: 'Métal', desc: 'Fragments métalliques', source: 'Équipements', gravite: 'grave', proba: 'rare', mesures: 'Détecteur métaux conditionnement', ref: 'Codex CXC 1-1969' },
    ],
    ccp: [
      {
        numero: 'CCP1', etape: 'Fermentation', nom_ccp: 'Fermentation contrôlée', danger_idx: 2,
        justif: 'Fermentation insuffisante = défaut qualité majeur, fèves violacées non commercialisables en cacao fin.',
        freq: 'chaque_lot', resp: 'Responsable fermentation',
        action_default: 'Si T° centrale < 45°C ou retournement omis : prolonger fermentation, déclassifier si nécessaire.',
        limites: [
          { param: 'Durée fermentation', min: 5, max: 7, unite: 'jours', methode: 'Suivi calendaire + retournements', equip: 'Registre fermentation', ref: 'ICCO Convention' },
          { param: 'Température centrale tas', min: 45, max: 50, unite: '°C', methode: 'Sonde thermique enfoncée', equip: 'Thermomètre étalonné', ref: 'ICCO' },
          { param: 'Cut-test bien fermenté', min: 80, unite: '%', methode: 'Coupe 100 fèves, comptage', equip: 'Guillotine cut-test', ref: 'ICCO Quality Standards' },
        ],
      },
      {
        numero: 'CCP2', etape: 'Séchage', nom_ccp: 'Séchage fèves', danger_idx: 1,
        justif: 'Activité de l\'eau pour stockage stable.',
        freq: 'chaque_lot', resp: 'Responsable séchage',
        action_default: 'Si humidité > 7,5% : prolonger séchage.',
        limites: [
          { param: 'Humidité finale', max: 7.5, unite: '%', tolerance: 0.3, methode: 'Hygromètre fèves', equip: 'Hygromètre étalonné', ref: 'ICCO + Codex CXC 1-1969' },
        ],
      },
      {
        numero: 'CCP3', etape: 'Analyse libératoire', nom_ccp: 'Analyse cadmium', danger_idx: 3,
        justif: 'Vérification conformité UE pour export. Aucune étape ne corrige Cd présent.',
        freq: 'chaque_lot', resp: 'Responsable qualité',
        action_default: 'Si Cd > 0,8 mg/kg : lot bloqué export UE, possibilité réorientation marché autre.',
        limites: [
          { param: 'Cadmium', max: 0.8, unite: 'mg/kg', methode: 'ICP-MS labo accrédité', equip: 'Analyse externe', ref: 'UE 2023/915' },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════════
  // 6. POIVRE
  // ════════════════════════════════════════════════════════════
  {
    produit_code: 'poivre',
    produit_nom: 'Poivre noir',
    nom_etude: 'Étude HACCP — Poivre noir (Piper nigrum)',
    description_produit: 'Grains de poivre noir séchés. Origine Madagascar Côte Est. Calibre ASTA ou FAQ.',
    destination_produit: 'Industrie agroalimentaire, distribution épices',
    population_cible: 'Population générale',
    mode_consommation: 'Cuisson ou cru (broyé)',
    duree_conservation: '36 mois',
    conditions_stockage: 'T° < 25°C, HR < 65%, sacs jute',
    dangers: [
      { categorie: 'biologique', nom: 'Salmonella', desc: 'Contamination historique très problématique sur poivre', source: 'Eau, animaux, manipulation', gravite: 'grave', proba: 'probable', mesures: 'Eau potable, hygiène, traitement vapeur si nécessaire, analyses systématiques', ref: 'UE 2073/2005, IPC standards' },
      { categorie: 'biologique', nom: 'E. coli', desc: 'Contamination fécale', source: 'Eau, mains', gravite: 'grave', proba: 'possible', mesures: 'Eau potable, hygiène', ref: 'UE 2073/2005' },
      { categorie: 'biologique', nom: 'Moisissures', desc: 'Développement sur grains humides', source: 'Séchage insuffisant', gravite: 'moyenne', proba: 'possible', mesures: 'Humidité ≤ 12%', ref: 'IPC' },
      { categorie: 'chimique', nom: 'Pesticides résiduels', desc: 'Résidus phytosanitaires', source: 'Traitements amont', gravite: 'grave', proba: 'possible', mesures: 'Analyses multi-résidus', ref: 'UE 396/2005' },
      { categorie: 'physique', nom: 'Cailloux, débris', desc: 'Séchage au sol', source: 'Séchage', gravite: 'moyenne', proba: 'probable', mesures: 'Aires bétonnées, tamisage', ref: 'IPC' },
    ],
    ccp: [
      {
        numero: 'CCP1', etape: 'Séchage', nom_ccp: 'Séchage grains poivre', danger_idx: 2,
        justif: 'Maîtrise humidité pour stockage stable.',
        freq: 'chaque_lot', resp: 'Responsable séchage',
        action_default: 'Si humidité > 12% : prolonger séchage.',
        limites: [
          { param: 'Humidité finale', max: 12, unite: '%', tolerance: 0.5, methode: 'Hygromètre', equip: 'Hygromètre étalonné', ref: 'IPC, ISO 959' },
        ],
      },
      {
        numero: 'CCP2', etape: 'Analyse libératoire', nom_ccp: 'Analyse Salmonella', danger_idx: 0,
        justif: 'Risque historique majeur poivre, vérification finale obligatoire.',
        freq: 'chaque_lot', resp: 'Responsable qualité',
        action_default: 'Si présence Salmonella : lot bloqué, traitement décontamination ou destruction.',
        limites: [
          { param: 'Salmonella', max: 0, unite: 'présence/25g', methode: 'Microbiologie ISO 6579', equip: 'Labo accrédité', ref: 'UE 2073/2005' },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════════
  // 7. GINGEMBRE
  // ════════════════════════════════════════════════════════════
  {
    produit_code: 'gingembre',
    produit_nom: 'Gingembre',
    nom_etude: 'Étude HACCP — Gingembre (Zingiber officinale)',
    description_produit: 'Rhizomes de gingembre séchés ou frais. Origine Site D Moramanga (Madagascar). Production propre AgriSuite.',
    destination_produit: 'Industrie agroalimentaire, marchés export UE / USA, marché local en filet de sécurité',
    population_cible: 'Population générale',
    mode_consommation: 'Cuisson, infusion, cru',
    duree_conservation: '24 mois (séché), 1-3 mois (frais réfrigéré)',
    conditions_stockage: 'Séché : T° < 25°C, HR < 65%. Frais : T° 13-15°C, HR 85-95%',
    dangers: [
      { categorie: 'biologique', nom: 'Moisissures', desc: 'Développement sur rhizomes humides', source: 'Séchage insuffisant', gravite: 'grave', proba: 'probable', mesures: 'Humidité ≤ 12%, séchage 5-7 jours', ref: 'Codex CXC 80/1981' },
      { categorie: 'biologique', nom: 'Salmonella, E. coli', desc: 'Contamination sol et eau', source: 'Sol, eau d\'irrigation', gravite: 'grave', proba: 'possible', mesures: 'Lavage eau potable, brossage, analyses microbio', ref: 'UE 2073/2005' },
      { categorie: 'chimique', nom: 'Pesticides résiduels', desc: 'Résidus traitements', source: 'Pratiques culturales', gravite: 'grave', proba: 'possible', mesures: 'Analyses multi-résidus, BPA culture BIO', ref: 'UE 396/2005' },
      { categorie: 'chimique', nom: 'Métaux lourds (Pb, Cd)', desc: 'Accumulation via sols (rhizome enterré)', source: 'Sols', gravite: 'grave', proba: 'possible', mesures: 'Analyses Pb/Cd, sélection terroirs', ref: 'UE 2023/915' },
      { categorie: 'physique', nom: 'Terre, sable, pierres', desc: 'Rhizome récolté en terre', source: 'Récolte', gravite: 'moyenne', proba: 'frequent', mesures: 'Lavage haute pression, brossage, tamisage', ref: 'Codex CXC 1-1969' },
    ],
    ccp: [
      {
        numero: 'CCP1', etape: 'Lavage', nom_ccp: 'Lavage rhizomes', danger_idx: 4,
        justif: 'Élimination contamination physique (terre) et biologique (microorganismes).',
        freq: 'chaque_lot', resp: 'Opérateur lavage',
        action_default: 'Si lavage incomplet : relancer cycle. Eau de lavage à renouveler par X kg traités.',
        limites: [
          { param: 'Qualité eau lavage', methode: 'Eau potable confirmée', equip: 'Test rapide bactériologique périodique', ref: 'Directive UE 2020/2184' },
          { param: 'Visuel propreté', methode: 'Inspection visuelle 100% surface', equip: 'Visuel + brosses', ref: 'Codex CXC 1-1969' },
        ],
      },
      {
        numero: 'CCP2', etape: 'Séchage', nom_ccp: 'Séchage rhizomes tranchés', danger_idx: 0,
        justif: 'Maîtrise activité de l\'eau pour stockage stable.',
        freq: 'chaque_lot', resp: 'Responsable séchage',
        action_default: 'Si humidité > 12% : prolonger séchage.',
        limites: [
          { param: 'Humidité finale', max: 12, unite: '%', tolerance: 0.5, methode: 'Hygromètre', equip: 'Hygromètre étalonné', ref: 'Codex CXC 80/1981' },
          { param: 'Température séchage', min: 50, max: 60, unite: '°C', methode: 'Sonde thermique', equip: 'Thermomètre digital', ref: 'BPA séchage' },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════════
  // 8. FRUITS SÉCHÉS
  // ════════════════════════════════════════════════════════════
  {
    produit_code: 'fruits_seches',
    produit_nom: 'Fruits séchés',
    nom_etude: 'Étude HACCP — Fruits séchés (mangue, ananas, banane, papaye)',
    description_produit: 'Fruits séchés en lamelles ou morceaux, sans sulfites (BIO) ou avec SO2 (conventionnel). Origine Madagascar.',
    destination_produit: 'Distribution alimentaire, en-cas, industrie pâtissière',
    population_cible: 'Population générale incluant enfants',
    mode_consommation: 'Consommation directe (prêt à manger)',
    duree_conservation: '12 mois',
    conditions_stockage: 'T° < 25°C, HR < 65%, sachets hermétiques',
    dangers: [
      { categorie: 'biologique', nom: 'Levures, moisissures', desc: 'Développement sur fruits humides ou rehumidifiés', source: 'Séchage insuffisant', gravite: 'grave', proba: 'probable', mesures: 'Humidité finale Aw < 0,65, conditionnement étanche', ref: 'Codex STAN 130-1981' },
      { categorie: 'biologique', nom: 'Insectes (mites alimentaires)', desc: 'Infestation stockage', source: 'Stockage', gravite: 'moyenne', proba: 'possible', mesures: 'Lutte intégrée, pièges, conditionnement étanche', ref: 'Codex CXC 1-1969' },
      { categorie: 'chimique', nom: 'Sulfites résiduels (SO2)', desc: 'Conservateur autorisé sauf BIO. Allergène majeur > 10 mg/kg.', source: 'Traitement post-séchage', gravite: 'grave', proba: 'possible', mesures: 'Si BIO : aucun SO2. Si conventionnel : maîtrise dosage et étiquetage allergène', ref: 'UE 1169/2011 (étiquetage allergène ≥ 10 mg/kg)' },
      { categorie: 'chimique', nom: 'Pesticides résiduels', desc: 'Résidus phytosanitaires fruits frais', source: 'Pratiques culturales', gravite: 'grave', proba: 'possible', mesures: 'Analyses multi-résidus', ref: 'UE 396/2005' },
      { categorie: 'physique', nom: 'Noyaux, fragments durs', desc: 'Mauvais dénoyautage', source: 'Préparation', gravite: 'grave', proba: 'possible', mesures: 'Vérification 100% post-dénoyautage, détecteur', ref: 'Codex STAN 130-1981' },
      { categorie: 'allergenique', nom: 'Sulfites (allergène)', desc: 'Étiquetage obligatoire si > 10 mg/kg', source: 'Conservateur ajouté', gravite: 'grave', proba: 'possible', mesures: 'Étiquetage allergène conforme UE 1169/2011', ref: 'UE 1169/2011 Annexe II' },
    ],
    ccp: [
      {
        numero: 'CCP1', etape: 'Séchage', nom_ccp: 'Séchage fruits', danger_idx: 0,
        justif: 'Maîtrise activité de l\'eau (Aw) pour prévenir développement microbien.',
        freq: 'chaque_lot', resp: 'Responsable séchage',
        action_default: 'Si Aw > 0,65 : prolonger séchage.',
        limites: [
          { param: 'Activité de l\'eau (Aw)', max: 0.65, unite: '', tolerance: 0.02, methode: 'Aw-mètre', equip: 'Activimètre', ref: 'Codex STAN 130-1981' },
          { param: 'Humidité finale', max: 18, unite: '%', tolerance: 1, methode: 'Hygromètre', equip: 'Hygromètre étalonné', ref: 'Codex STAN 130-1981' },
        ],
      },
      {
        numero: 'CCP2', etape: 'Dénoyautage / contrôle visuel', nom_ccp: 'Élimination noyaux/fragments durs', danger_idx: 4,
        justif: 'Aucune étape ultérieure ne corrige la présence de fragments durs (consommation directe).',
        freq: 'continu', resp: 'Opérateur tri',
        action_default: 'Si fragment détecté : isoler lot, repasser tri 100%.',
        limites: [
          { param: 'Présence noyau/fragment', max: 0, unite: 'unités/kg', methode: 'Inspection visuelle 100% + détecteur', equip: 'Tapis lumineux + détecteur métaux', ref: 'Codex STAN 130-1981' },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════════
  // 9. LITCHI
  // ════════════════════════════════════════════════════════════
  {
    produit_code: 'litchi',
    produit_nom: 'Litchi',
    nom_etude: 'Étude HACCP — Litchi (Litchi chinensis) frais ou séché',
    description_produit: 'Litchis frais (campagne novembre-décembre) ou séchés. Origine Côte Est Madagascar (Tamatave). Soufrage SO2 traditionnel pour export frais.',
    destination_produit: 'Marché export frais (UE) en saison + marché séché toute l\'année',
    population_cible: 'Population générale',
    mode_consommation: 'Frais : consommation directe après pelage. Séché : consommation directe.',
    duree_conservation: 'Frais : 3-4 semaines réfrigéré. Séché : 12 mois.',
    conditions_stockage: 'Frais : T° 2-5°C, HR 90-95%. Séché : T° < 25°C, HR < 65%.',
    dangers: [
      { categorie: 'biologique', nom: 'Moisissures (frais)', desc: 'Pourriture post-récolte rapide', source: 'Manipulation, blessures fruit', gravite: 'grave', proba: 'frequent', mesures: 'Refroidissement rapide, soufrage SO2 traditionnel, manipulation soigneuse', ref: 'GlobalGAP, Codex CXC 1-1969' },
      { categorie: 'biologique', nom: 'Mouche des fruits (Bactrocera)', desc: 'Risque phytosanitaire export, peut bloquer container entier', source: 'Champ', gravite: 'critique', proba: 'possible', mesures: 'Traitement chaud (hot water), inspection rigoureuse, certificat phytosanitaire', ref: 'OEPP/EPPO, Convention IPPC' },
      { categorie: 'chimique', nom: 'SO2 résiduel (litchi soufré)', desc: 'Allergène majeur, dose autorisée mais surveillée', source: 'Soufrage post-récolte', gravite: 'grave', proba: 'frequent', mesures: 'Dosage maîtrisé, étiquetage allergène obligatoire', ref: 'UE 1333/2008 (max 10-100 mg/kg selon préparation), UE 1169/2011' },
      { categorie: 'chimique', nom: 'Pesticides résiduels', desc: 'Résidus phytosanitaires', source: 'Pratiques culturales', gravite: 'grave', proba: 'possible', mesures: 'Analyses multi-résidus, respect DAR', ref: 'UE 396/2005' },
      { categorie: 'physique', nom: 'Insectes, débris végétaux', desc: 'Contamination champ', source: 'Récolte', gravite: 'moyenne', proba: 'probable', mesures: 'Tri manuel, lavage', ref: 'Codex CXC 1-1969' },
      { categorie: 'allergenique', nom: 'Sulfites (allergène)', desc: 'Étiquetage obligatoire si > 10 mg/kg', source: 'Soufrage', gravite: 'grave', proba: 'frequent', mesures: 'Étiquetage allergène UE 1169/2011', ref: 'UE 1169/2011 Annexe II' },
    ],
    ccp: [
      {
        numero: 'CCP1', etape: 'Soufrage (litchi frais export)', nom_ccp: 'Maîtrise dosage SO2', danger_idx: 2,
        justif: 'Dépassement = retrait UE / sanction. Insuffisant = pourriture en transit.',
        freq: 'chaque_lot', resp: 'Responsable soufrage',
        action_default: 'Si dosage hors plage : ajuster équipement. Si SO2 > 100 mg/kg fruits non consommés : lot bloqué.',
        limites: [
          { param: 'SO2 résiduel pulpe', max: 10, unite: 'mg/kg', methode: 'Méthode Monier-Williams', equip: 'Labo accrédité', ref: 'UE 1333/2008' },
          { param: 'SO2 résiduel peau (non consommée)', max: 250, unite: 'mg/kg', methode: 'Monier-Williams', equip: 'Labo accrédité', ref: 'UE 1333/2008' },
        ],
      },
      {
        numero: 'CCP2', etape: 'Contrôle phytosanitaire', nom_ccp: 'Inspection mouches des fruits', danger_idx: 1,
        justif: 'Risque blocage container entier sans détection préalable.',
        freq: 'chaque_lot', resp: 'Inspecteur phytosanitaire',
        action_default: 'Si présence détectée : traitement chaud (hot water 47°C/20 min) ou destruction lot.',
        limites: [
          { param: 'Présence Bactrocera', max: 0, unite: 'individus/échantillon', methode: 'Inspection visuelle + dissection échantillon', equip: 'Loupe binoculaire', ref: 'Convention IPPC, OEPP' },
          { param: 'Traitement chaud (si nécessaire)', min: 47, unite: '°C', tolerance: 0.5, methode: 'Sonde immergée', equip: 'Bain thermostaté', ref: 'IPPC ISPM 28' },
        ],
      },
    ],
  },
];

// ============================================================
// FONCTION DE SEED — IDEMPOTENT
// ============================================================

export const seedHaccp = () => {
  // Vérifier si déjà seedé
  const existing = db.getFirstSync(`SELECT COUNT(*) as n FROM etudes_haccp`);
  if (existing && existing.n >= ETUDES_HACCP.length) {
    console.log(`ℹ️ HACCP déjà seedé (${existing.n} études)`);
    return;
  }

  console.log(`🌱 Seed HACCP — ${ETUDES_HACCP.length} études à insérer...`);

  let etudesInserees = 0;
  let dangersInseres = 0;
  let ccpInseres = 0;
  let limitesInserees = 0;

  for (const etude of ETUDES_HACCP) {
    // Vérifier si étude déjà existante
    const existingEtude = db.getFirstSync(
      `SELECT id FROM etudes_haccp WHERE produit_code = ?`,
      [etude.produit_code]
    );
    if (existingEtude) continue;

    // Insérer étude
    const etudeResult = db.runSync(
      `INSERT INTO etudes_haccp (
        produit_code, produit_nom, nom_etude, version, statut,
        description_produit, destination_produit, population_cible,
        mode_consommation, duree_conservation, conditions_stockage
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        etude.produit_code,
        etude.produit_nom,
        etude.nom_etude,
        '1.0',
        'brouillon',
        etude.description_produit,
        etude.destination_produit,
        etude.population_cible,
        etude.mode_consommation,
        etude.duree_conservation,
        etude.conditions_stockage,
      ]
    );
    const etudeId = etudeResult.lastInsertRowId;
    etudesInserees++;

    // Insérer dangers (et garder les IDs pour lier aux CCP)
    const dangerIds = [];
    for (const danger of etude.dangers) {
      const sig = calculerSignificatif(danger.gravite, danger.proba);
      const dangerResult = db.runSync(
        `INSERT INTO dangers_haccp (
          etude_id, categorie, nom_danger, description, source,
          gravite, probabilite, significatif, mesures_maitrise,
          reference_reglementaire, est_seed
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          etudeId,
          danger.categorie,
          danger.nom,
          danger.desc,
          danger.source,
          danger.gravite,
          danger.proba,
          sig,
          danger.mesures,
          danger.ref,
        ]
      );
      dangerIds.push(dangerResult.lastInsertRowId);
      dangersInseres++;
    }

    // Insérer CCP avec limites
    for (const ccp of etude.ccp) {
      const dangerLinkId = ccp.danger_idx !== undefined && dangerIds[ccp.danger_idx]
        ? dangerIds[ccp.danger_idx]
        : null;
      const ccpResult = db.runSync(
        `INSERT INTO ccp_haccp (
          etude_id, numero, etape_processus, danger_id, nom_ccp,
          justification_ccp, frequence_surveillance, responsable,
          action_corrective_default, est_seed
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          etudeId,
          ccp.numero,
          ccp.etape,
          dangerLinkId,
          ccp.nom_ccp,
          ccp.justif,
          ccp.freq,
          ccp.resp,
          ccp.action_default,
        ]
      );
      const ccpId = ccpResult.lastInsertRowId;
      ccpInseres++;

      // Limites critiques pour ce CCP
      for (const lim of ccp.limites) {
        db.runSync(
          `INSERT INTO limites_critiques (
            ccp_id, parametre, valeur_min, valeur_max, unite, tolerance,
            methode_mesure, equipement, reference_reglementaire, est_seed
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [
            ccpId,
            lim.param,
            lim.min !== undefined ? lim.min : null,
            lim.max !== undefined ? lim.max : null,
            lim.unite || null,
            lim.tolerance !== undefined ? lim.tolerance : null,
            lim.methode || null,
            lim.equip || null,
            lim.ref || null,
          ]
        );
        limitesInserees++;
      }
    }
  }

  console.log(
    `✅ Seed HACCP : ${etudesInserees} études, ${dangersInseres} dangers, ` +
    `${ccpInseres} CCP, ${limitesInserees} limites critiques`
  );
};