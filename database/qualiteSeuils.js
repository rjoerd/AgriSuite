// ============================================================
// AgriSuite Madagascar — Phase 3 / Session 5 partie 2
// database/qualiteSeuils.js
//
// Catalogue de seuils de conformité prédéfinis pour les analyses
// qualité, indexés par (type_analyse, culture).
//
// Sources :
//   - Codex Alimentarius (CXS 327-2017 cannelle, CXS 332-2018 girofle)
//   - UE règlement 2018/848 BIO
//   - UE règlement 1881/2006 contaminants alimentaires
//   - UE règlement 2023/915 cadmium cacao
//   - ICO (International Coffee Organization)
//   - ICCO (International Cocoa Organization) — cacao fin Madagascar
//   - SCA (Specialty Coffee Association) — café spécialité
//   - ISO 2254 (girofle)
//
// Positionnement qualité par défaut (validé Session 5) :
//   - Vanille : black/noire prête (pas gourmet)
//   - Café Arabica : spécialité
//   - Café Robusta : lavé fine qualité
//   - Cacao : fin Sambirano (premium ICCO)
//   - Cannelle : standard UE cassia
//   - Girofle : boutons commerciaux
//
// L'utilisateur peut surcharger ces seuils dans le formulaire d'analyse
// si un acheteur impose des contraintes plus strictes.
// ============================================================

/**
 * Catalogue principal.
 * Clé : `${typeAnalyse}__${codeCulture}` (lowercase)
 * Valeur : { min, max, unite, source, commentaire }
 */
export const SEUILS_QUALITE = {
  // ─────────────────────────────────────────────
  // VANILLE — qualité black/noire prête à l'emploi
  // ─────────────────────────────────────────────
  'humidite__vanille': {
    max: 25,
    unite: '%',
    source: 'Codex Alimentarius / FOB Madagascar',
    commentaire: 'Qualité black. Pour gourmet humide : 30-38%.',
  },
  'vanilline__vanille': {
    min: 1.6,
    unite: '%',
    source: 'Standard qualité black',
    commentaire: 'Premium gourmet : ≥ 2.0%.',
  },
  'taille__vanille': {
    min: 14,
    unite: 'cm',
    source: 'Standard qualité black',
    commentaire: 'Premium : ≥ 16 cm.',
  },
  'aflatoxine__vanille': {
    max: 10,
    unite: 'µg/kg',
    source: 'UE règlement 1881/2006',
    commentaire: 'Aflatoxines totales (B1+B2+G1+G2).',
  },

  // ─────────────────────────────────────────────
  // CAFÉ ARABICA — spécialité (SCA)
  // ─────────────────────────────────────────────
  'humidite__cafe_arabica': {
    max: 11.5,
    unite: '%',
    source: 'Specialty Coffee Association',
    commentaire: 'Café standard ICO : ≤ 12.5%.',
  },
  'ochratoxine__cafe_arabica': {
    max: 5,
    unite: 'µg/kg',
    source: 'UE règlement 1881/2006',
    commentaire: 'OTA — café vert.',
  },
  'taille__cafe_arabica': {
    min: 7.1,
    unite: 'mm',
    source: 'Grade AA Specialty',
    commentaire: 'Calibre 18 (≥ 18/64 inch). AA = ≥ 7.1mm.',
  },

  // ─────────────────────────────────────────────
  // CAFÉ ROBUSTA — lavé fine qualité
  // ─────────────────────────────────────────────
  'humidite__cafe_robusta': {
    max: 12.5,
    unite: '%',
    source: 'Norme ICO',
    commentaire: 'Standard commercial.',
  },
  'ochratoxine__cafe_robusta': {
    max: 5,
    unite: 'µg/kg',
    source: 'UE règlement 1881/2006',
    commentaire: 'OTA — café vert.',
  },
  'taille__cafe_robusta': {
    min: 6.3,
    unite: 'mm',
    source: 'Grade Robusta lavé fine',
    commentaire: 'Calibre 16. Standard : ≥ 5.5 mm.',
  },

  // ─────────────────────────────────────────────
  // CACAO — fin Sambirano (premium ICCO)
  // ─────────────────────────────────────────────
  'humidite__cacao': {
    max: 7.5,
    unite: '%',
    source: 'Codex / standard ICCO',
    commentaire: 'Fèves fermentées séchées, prêtes export.',
  },
  'cadmium__cacao': {
    max: 0.8,
    unite: 'mg/kg',
    source: 'UE règlement 2023/915',
    commentaire: 'Seuil chocolat noir ≥ 50% cacao.',
  },
  'fermentation__cacao': {
    min: 80,
    unite: '%',
    source: 'Standard cacao fin ICCO',
    commentaire: 'Cut-test : % fèves bien fermentées. Bulk : ≥ 60%.',
  },
  'moisissures__cacao': {
    max: 4,
    unite: '%',
    source: 'Standard ICCO',
    commentaire: 'Moisissures internes (cut-test).',
  },

  // ─────────────────────────────────────────────
  // CANNELLE — standard UE (cassia, qui est la principale variété MDG)
  // ─────────────────────────────────────────────
  'humidite__cannelle': {
    max: 14,
    unite: '%',
    source: 'Codex CXS 327-2017',
    commentaire: 'Cannelle séchée, prête export.',
  },
  'coumarine__cannelle': {
    max: 0.1,
    unite: '%',
    source: 'UE — cassia',
    commentaire: 'Pour cannelle vraie (Ceylan) : pas de limite stricte.',
  },
  'huile_essentielle__cannelle': {
    min: 1.2,
    unite: '%',
    source: 'Codex CXS 327-2017',
    commentaire: 'Teneur en HE — qualité commerciale.',
  },
  'cendres__cannelle': {
    max: 7,
    unite: '%',
    source: 'Codex CXS 327-2017',
    commentaire: 'Cendres totales.',
  },

  // ─────────────────────────────────────────────
  // GIROFLE — boutons commerciaux
  // ─────────────────────────────────────────────
  'humidite__girofle': {
    max: 12,
    unite: '%',
    source: 'Codex CXS 332-2018',
    commentaire: 'Boutons séchés.',
  },
  'eugenol__girofle': {
    min: 80,
    unite: '%',
    source: 'ISO 2254',
    commentaire: 'Teneur en eugénol — boutons de qualité.',
  },
  'tiges__girofle': {
    max: 5,
    unite: '%',
    source: 'Standard commercial Singapour',
    commentaire: 'Proportion de tiges/débris dans le lot.',
  },
  'cendres__girofle': {
    max: 7,
    unite: '%',
    source: 'Codex CXS 332-2018',
    commentaire: 'Cendres totales.',
  },

  // ─────────────────────────────────────────────
  // LITCHI séché
  // ─────────────────────────────────────────────
  'humidite__litchi': {
    max: 18,
    unite: '%',
    source: 'Standard export Asie',
    commentaire: 'Litchi séché entier.',
  },
  'sulfites__litchi': {
    max: 100,
    unite: 'mg/kg',
    source: 'UE règlement 1333/2008',
    commentaire: 'Si traité au SO2.',
  },

  // ─────────────────────────────────────────────
  // GINGEMBRE
  // ─────────────────────────────────────────────
  'humidite__gingembre': {
    max: 12,
    unite: '%',
    source: 'Codex / standard export',
    commentaire: 'Gingembre séché.',
  },
  'huile_essentielle__gingembre': {
    min: 1.5,
    unite: '%',
    source: 'Standard commercial',
    commentaire: 'Teneur en huile essentielle.',
  },

  // ─────────────────────────────────────────────
  // POIVRE
  // ─────────────────────────────────────────────
  'humidite__poivre': {
    max: 12,
    unite: '%',
    source: 'Codex CXS 326-2017',
    commentaire: 'Poivre noir séché.',
  },
  'piperine__poivre': {
    min: 4,
    unite: '%',
    source: 'Standard qualité commerciale',
    commentaire: 'Teneur en pipérine.',
  },

  // ─────────────────────────────────────────────
  // SEUILS GÉNÉRIQUES (s'appliquent à tous les produits alimentaires)
  // Utilisés en fallback si pas de valeur spécifique culture.
  // ─────────────────────────────────────────────
  'salmonella__generique': {
    max: 0,
    unite: 'UFC/25g',
    source: 'UE règlement 2073/2005',
    commentaire: 'Absence dans 25 g obligatoire.',
  },
  'e_coli__generique': {
    max: 100,
    unite: 'UFC/g',
    source: 'UE règlement 2073/2005',
    commentaire: 'Indicateur hygiène fabrication.',
  },
  'plomb__generique': {
    max: 0.1,
    unite: 'mg/kg',
    source: 'UE règlement 1881/2006',
    commentaire: 'Plomb (Pb).',
  },
};

/**
 * Catalogue des types d'analyses disponibles.
 * Le nom (label) et l'unité par défaut.
 */
export const TYPES_ANALYSE = [
  { code: 'humidite',         label: '💧 Humidité',           unite_def: '%' },
  { code: 'vanilline',        label: '🌿 Vanilline',          unite_def: '%' },
  { code: 'taille',           label: '📏 Taille / Calibre',   unite_def: 'cm' },
  { code: 'fermentation',     label: '🧪 % fermentation',     unite_def: '%' },
  { code: 'moisissures',      label: '🍄 Moisissures',        unite_def: '%' },
  { code: 'aflatoxine',       label: '⚠️ Aflatoxines',        unite_def: 'µg/kg' },
  { code: 'ochratoxine',      label: '⚠️ Ochratoxine A',     unite_def: 'µg/kg' },
  { code: 'cadmium',          label: '⚗️ Cadmium',            unite_def: 'mg/kg' },
  { code: 'plomb',            label: '⚗️ Plomb',              unite_def: 'mg/kg' },
  { code: 'salmonella',       label: '🦠 Salmonella',         unite_def: 'UFC/25g' },
  { code: 'e_coli',           label: '🦠 E. coli',            unite_def: 'UFC/g' },
  { code: 'sulfites',         label: '🧪 Sulfites (SO2)',     unite_def: 'mg/kg' },
  { code: 'pesticides',       label: '🧪 Pesticides (multi)', unite_def: '' },
  { code: 'coumarine',        label: '🌿 Coumarine',          unite_def: '%' },
  { code: 'huile_essentielle', label: '🌿 Huile essentielle', unite_def: '%' },
  { code: 'eugenol',          label: '🌿 Eugénol',            unite_def: '%' },
  { code: 'piperine',         label: '🌿 Pipérine',           unite_def: '%' },
  { code: 'tiges',            label: '🌿 % tiges/débris',     unite_def: '%' },
  { code: 'cendres',          label: '⚗️ Cendres',            unite_def: '%' },
  { code: 'organoleptique',   label: '👃 Organoleptique',     unite_def: '' },
  { code: 'autre',            label: '🔬 Autre',              unite_def: '' },
];

/**
 * Retourne le seuil prédéfini pour un (type, culture).
 * Si pas de match exact, tente un fallback générique.
 *
 * Le matching se fait sur le code culture (lowercase, sans accent).
 * Mapping fait à partir de cultures.code OU de cultures.nom_fr.
 *
 * @returns { min, max, unite, source, commentaire } ou null
 */
export function getSeuilPredefini(typeAnalyse, codeCulture) {
  if (!typeAnalyse) return null;

  // Normalisation du code culture
  const culture = (codeCulture || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');

  // Match exact
  const cleExacte = `${typeAnalyse}__${culture}`;
  if (SEUILS_QUALITE[cleExacte]) {
    return { ...SEUILS_QUALITE[cleExacte], scope: 'culture' };
  }

  // Match générique (ex: salmonella, plomb...)
  const cleGenerique = `${typeAnalyse}__generique`;
  if (SEUILS_QUALITE[cleGenerique]) {
    return { ...SEUILS_QUALITE[cleGenerique], scope: 'generique' };
  }

  return null;
}

/**
 * Retourne la liste des analyses disponibles pour une culture donnée.
 * Utilisé pour proposer en priorité les analyses pertinentes.
 */
export function getAnalysesPertinentesPour(codeCulture) {
  const culture = (codeCulture || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');

  const codesUtilises = new Set();
  for (const cle of Object.keys(SEUILS_QUALITE)) {
    const [type, scope] = cle.split('__');
    if (scope === culture || scope === 'generique') {
      codesUtilises.add(type);
    }
  }
  return TYPES_ANALYSE.filter((t) => codesUtilises.has(t.code))
    // Mettre les pertinents en premier, puis tous les autres
    .concat(TYPES_ANALYSE.filter((t) => !codesUtilises.has(t.code)));
}

/**
 * Évalue la conformité d'une valeur par rapport à un seuil prédéfini OU custom.
 *
 * @param valeur - valeur mesurée (number)
 * @param seuil  - { min, max } (au moins l'un des deux)
 * @returns 1 si conforme, 0 si non conforme, null si pas de seuil
 */
export function evaluerConformite(valeur, seuil) {
  if (!seuil || valeur == null || isNaN(valeur)) return null;
  if (seuil.min != null && valeur < seuil.min) return 0;
  if (seuil.max != null && valeur > seuil.max) return 0;
  return 1;
}