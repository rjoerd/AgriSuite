// database/certifTrackNiveaux.js
// Phase 3 Session 9d1 + 9d2 — Reclassification des exigences par niveau d'application
//
// Session 9d1 : reclassification BIO UE uniquement (120 exigences, 100% reclassées)
// Session 9d2 : extension à HACCP (58 exigences) + Fairtrade (110) + Rainforest (140)
//
// Principe (cf. AgriSuite_Specifications v0.10) :
//   - operateur   : système qualité global (plan BIO, procédures, registres, gouvernance)
//   - site        : spécifique à un site de production (zones tampons, stockage, signalétique)
//   - lot         : spécifique à un lot de produit (analyses, traçabilité, étapes post-récolte)
//   - fournisseur : spécifique à un producteur tiers (contrat SCI, inspection, conversion)
//   - multi       : applicable à plusieurs niveaux (rare, fallback)

import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('agrisuite.db');

// ============================================================
// RÈGLES DE CLASSIFICATION PAR PRÉFIXE DE CODE
// ============================================================
// Convention codes (Sessions 8 + 8a/b/c/d) :
//
//   BIO UE      → BIO-{CONV|INT|POSTREC|TRAC|DOC|GOUV|SOC|ENV|CULT|SEP|FOUR|PROD|ECH}-XX
//   HACCP       → HACCP-{PRP|CCP|HYG|FORM|TRAC|DOC|VER|REC|ALERG}-XX
//   Fairtrade   → FT-{GOUV|PRIX|SOC|ENV|TRAC|DOC|PROD|FORM|DEMO}-XX
//   Rainforest  → RA-{ENV|BIODIV|SOC|GOUV|PROD|TRAC|DOC|FORM|CLIM}-XX

const NIVEAU_PAR_PREFIXE = {
  // ── BIO UE ──
  'BIO-DOC': 'operateur',
  'BIO-GOUV': 'operateur',
  'BIO-PROD': 'operateur',
  'BIO-SEP': 'site',
  'BIO-ENV': 'site',
  'BIO-POSTREC': 'lot',
  'BIO-TRAC': 'lot',
  'BIO-ECH': 'lot',
  'BIO-FOUR': 'fournisseur',
  'BIO-CONV': 'multi',
  'BIO-INT': 'multi',
  'BIO-CULT': 'multi',
  'BIO-SOC': 'multi',

  // ── HACCP ──
  'HACCP-DOC': 'operateur',
  'HACCP-VER': 'operateur',
  'HACCP-FORM': 'operateur',
  'HACCP-ALERG': 'operateur',
  'HACCP-PRP': 'site',
  'HACCP-HYG': 'site',
  'HACCP-CCP': 'lot',
  'HACCP-TRAC': 'lot',
  'HACCP-REC': 'lot',

  // ── Fairtrade ──
  'FT-GOUV': 'operateur',
  'FT-DEMO': 'operateur',
  'FT-PRIX': 'operateur',
  'FT-DOC': 'operateur',
  'FT-FORM': 'operateur',
  'FT-SOC': 'multi',
  'FT-ENV': 'site',
  'FT-PROD': 'site',
  'FT-TRAC': 'lot',

  // ── Rainforest Alliance ──
  'RA-GOUV': 'operateur',
  'RA-DOC': 'operateur',
  'RA-FORM': 'operateur',
  'RA-CLIM': 'operateur',
  'RA-ENV': 'site',
  'RA-BIODIV': 'site',
  'RA-PROD': 'site',
  'RA-SOC': 'multi',
  'RA-TRAC': 'lot',
};

// ============================================================
// MOTS-CLÉS POUR CLASSIFICATION FINE
// ============================================================

const MOTS_CLES_OPERATEUR = [
  'plan', 'procédure', 'registre', 'manuel', 'politique',
  'responsable qualité', 'organigramme', 'formation du personnel',
  'système qualité', 'engagement écrit', 'numéro de certificat',
  'organisme certificateur', 'audit annuel', 'déclaration',
  'gestion des non-conformités', 'rappel produit',
  'cartographie', 'analyse de risques', 'comité',
  'assemblée', 'démocratie', 'prime fairtrade', 'plan d\'action',
  'évaluation interne', 'salaires', 'contrat de travail',
  'liberté syndicale', 'discrimination', 'travail forcé',
  'travail des enfants',
];

const MOTS_CLES_SITE = [
  'parcelle', 'zone tampon', 'stockage', 'hangar', 'magasin',
  'panneau', 'balisage', 'signalétique', 'site', 'voisinage',
  'séparation physique', 'aire de séchage', 'aire de fermentation',
  'bâtiment', 'équipement fixe', 'biodiversité', 'corridor écologique',
  'haie', 'arbres', 'cours d\'eau', 'érosion', 'couvert végétal',
];

const MOTS_CLES_LOT = [
  'lot', 'récolte', 'séchage', 'fermentation', 'tri', 'calibrage',
  'analyse', 'humidité', 'mycotoxine', 'pesticide', 'résidu',
  'conditionnement', 'expédition', 'passeport',
  'numéro de lot', 'bon de collecte', 'ccp', 'limite critique',
  'point critique', 'surveillance',
];

const MOTS_CLES_FOURNISSEUR = [
  'fournisseur', 'producteur tiers', 'producteur membre',
  'contrat fournisseur', 'inspection sci', 'sci',
  'cartographie producteurs', 'engagement producteur',
  'visite producteur', 'sanction producteur',
  'petits producteurs', 'groupe de producteurs',
  'organisation de producteurs',
];

// ============================================================
// CLASSIFICATION D'UNE EXIGENCE
// ============================================================

const classifierExigence = (exigence) => {
  const code = (exigence.code_exigence || '').toUpperCase();
  const texte = `${exigence.titre || ''} ${exigence.description || ''}`.toLowerCase();
  const cat = (exigence.categorie || '').toLowerCase();

  // 1. Tentative par préfixe de code (ordre : plus spécifique d'abord)
  // On trie les préfixes par longueur décroissante pour matcher le plus spécifique
  const prefixesTries = Object.keys(NIVEAU_PAR_PREFIXE).sort((a, b) => b.length - a.length);
  for (const prefixe of prefixesTries) {
    if (code.startsWith(prefixe)) {
      const niveauPrefixe = NIVEAU_PAR_PREFIXE[prefixe];
      if (niveauPrefixe !== 'multi') {
        return niveauPrefixe;
      }
      break;
    }
  }

  // 2. Mots-clés (du plus global au plus local)
  if (MOTS_CLES_OPERATEUR.some(m => texte.includes(m))) return 'operateur';
  if (MOTS_CLES_FOURNISSEUR.some(m => texte.includes(m))) return 'fournisseur';
  if (MOTS_CLES_SITE.some(m => texte.includes(m))) return 'site';
  if (MOTS_CLES_LOT.some(m => texte.includes(m))) return 'lot';

  // 3. Heuristique catégorie
  if (cat === 'documentation' || cat === 'gouvernance') return 'operateur';
  if (cat === 'tracabilite' || cat === 'qualite_securite') return 'lot';
  if (cat === 'gestion_post_recolte') return 'lot';
  if (cat === 'social' || cat === 'social_travail') return 'operateur';
  if (cat === 'environnement') return 'site';
  if (cat === 'intrants' || cat === 'pratiques_culturales') return 'site';

  return 'multi';
};

// ============================================================
// RECLASSIFICATION SEED — IDEMPOTENT — MULTI-RÉFÉRENTIELS
// ============================================================

export const reclasserExigencesParNiveau = () => {
  // Référentiels traités en Session 9d1 + 9d2
  const codesReferentiels = ['BIO_UE', 'HACCP', 'FAIRTRADE_FLO', 'RAINFOREST'];
  const resultatsGlobal = {};

  for (const codeRef of codesReferentiels) {
    const ref = db.getFirstSync(
      `SELECT id FROM referentiels WHERE code = ?`,
      [codeRef]
    );
    if (!ref) {
      console.log(`ℹ️ Référentiel ${codeRef} absent — skip`);
      continue;
    }

    const exigences = db.getAllSync(
      `SELECT id, code_exigence, titre, description, categorie, niveau_application
       FROM exigences_referentiel
       WHERE referentiel_id = ?`,
      [ref.id]
    );

    if (exigences.length === 0) continue;

    let reclassees = 0;
    const repartition = { operateur: 0, site: 0, lot: 0, fournisseur: 0, multi: 0 };

    for (const ex of exigences) {
      const nouveauNiveau = classifierExigence(ex);
      repartition[nouveauNiveau]++;

      if (
        nouveauNiveau !== ex.niveau_application &&
        (ex.niveau_application === 'multi' || ex.niveau_application === null)
      ) {
        db.runSync(
          `UPDATE exigences_referentiel SET niveau_application = ? WHERE id = ?`,
          [nouveauNiveau, ex.id]
        );
        reclassees++;
      }
    }

    console.log(
      `✅ Reclassification ${codeRef} : ${reclassees}/${exigences.length} mises à jour ` +
      `(opérateur=${repartition.operateur}, site=${repartition.site}, ` +
      `lot=${repartition.lot}, fournisseur=${repartition.fournisseur}, multi=${repartition.multi})`
    );

    resultatsGlobal[codeRef] = { total: exigences.length, reclassees, repartition };
  }

  return resultatsGlobal;
};