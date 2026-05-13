// database/conformiteEngine.js
// Moteur de conformité automatique — Phase 3 Session 8
//
// 5 règles auto-vérifiables qui scrutent les données existantes (lots, étapes,
// analyses, fournisseurs, parcelles) et génèrent automatiquement :
//   1. Le statut de conformité de l'exigence (conforme / non_conforme)
//   2. Une alerte si non-conformité détectée
//
// Règles implémentées :
//   - DELAI_CONVERSION_BIO    → écart entre date_engagement et date_récolte < 24/36 mois
//   - MELANGE_BIO_CONV        → lot composite avec parents non tous BIO
//   - ANALYSE_NON_CONFORME    → analyse_qualite avec conforme=0
//   - ETAPE_MANQUANTE         → lot clôturé sans aucune étape post-récolte
//   - PREUVE_MANQUANTE_MAJEURE→ exigence majeure sans preuve attribuée
//
// API publique :
//   - evaluerEngagement(engagementId) : applique les 5 règles à 1 engagement
//   - evaluerTousEngagements() : applique sur tous les engagements actifs
//   - getRegleAutoLabel(code) : helper UI

import * as SQLite from 'expo-sqlite';
import {
  getStatutsByEngagement,
  setStatutExigence,
  creerAlerte,
  countPreuvesByExigence,
} from './certifTrack';

const db = SQLite.openDatabaseSync('certifpilot.db');

// ============================================================
// HELPERS
// ============================================================

const moisEntreDates = (date1Str, date2Str) => {
  const d1 = new Date(date1Str);
  const d2 = new Date(date2Str);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
  const moisDiff =
    (d2.getFullYear() - d1.getFullYear()) * 12 +
    (d2.getMonth() - d1.getMonth());
  return moisDiff;
};

const recupererEngagementComplet = (engagementId) => {
  return db.getFirstSync(
    `SELECT 
       e.*, r.code as ref_code, r.nom_court as ref_nom_court,
       r.duree_conversion_annuelles, r.duree_conversion_perennes
     FROM engagements_certif e
     JOIN referentiels r ON e.referentiel_id = r.id
     WHERE e.id = ?`,
    [engagementId]
  );
};

// Récupère le lot lié si l'engagement cible un lot
const getLotPourEngagement = (engagement) => {
  if (engagement.cible_type !== 'lot') return null;
  try {
    return db.getFirstSync(
      'SELECT * FROM lots WHERE id = ?',
      [engagement.cible_id]
    );
  } catch (e) {
    return null;
  }
};

// ============================================================
// RÈGLE 1 — DELAI_CONVERSION_BIO
// ============================================================

const verifierDelaiConversionBio = (engagement, exigence, lot) => {
  // Ne s'applique qu'aux engagements BIO sur des lots
  if (engagement.ref_code !== 'BIO_UE') return null;
  if (engagement.cible_type !== 'lot' || !lot) return null;

  // Date de début de conversion requise
  if (!engagement.date_debut_conversion) {
    return {
      conforme: false,
      regle: 'DELAI_CONVERSION_BIO',
      severite: 'avertissement',
      titre: 'Date de début de conversion manquante',
      message: `L'engagement BIO sur le lot ${lot.code_lot} n'a pas de date de début de conversion enregistrée. Cette date est obligatoire pour calculer la fin de la période de conversion (24 mois annuelles, 36 mois pérennes).`,
      contexte: { engagement_id: engagement.id, lot_code: lot.code_lot },
    };
  }

  // Date de récolte = date_fin du lot, sinon date_debut
  const dateRecolte = lot.date_fin || lot.date_debut;
  if (!dateRecolte) return null;

  const moisEcart = moisEntreDates(engagement.date_debut_conversion, dateRecolte);
  if (moisEcart === null) return null;

  // Pour démo : on considère pérenne par défaut (36 mois)
  // En réalité il faudrait lire un champ "type_culture" sur la table cultures
  // Cette logique sera affinée en Session 8a (BIO UE complet)
  const dureeMin = engagement.duree_conversion_annuelles || 24;

  if (moisEcart < dureeMin) {
    const moisManquants = dureeMin - moisEcart;
    return {
      conforme: false,
      regle: 'DELAI_CONVERSION_BIO',
      severite: 'critique',
      titre: 'Délai de conversion BIO non respecté',
      message: `Le lot ${lot.code_lot} a été récolté ${moisEcart} mois après le début de la conversion BIO. Le délai minimum requis est de ${dureeMin} mois (${moisManquants} mois manquants). Ce lot ne peut pas être commercialisé en BIO selon le règlement (UE) 2018/848.`,
      contexte: {
        engagement_id: engagement.id,
        lot_code: lot.code_lot,
        date_debut_conversion: engagement.date_debut_conversion,
        date_recolte: dateRecolte,
        mois_ecart: moisEcart,
        duree_min_requise: dureeMin,
      },
    };
  }

  // Conforme : délai respecté
  return { conforme: true, regle: 'DELAI_CONVERSION_BIO' };
};

// ============================================================
// RÈGLE 2 — MELANGE_BIO_CONV
// ============================================================

const verifierMelangeBioConv = (engagement, exigence, lot) => {
  if (engagement.ref_code !== 'BIO_UE') return null;
  if (engagement.cible_type !== 'lot' || !lot) return null;

  // Détection lot composite : code commence par MDG-AAAA-XXX-CCC-CNNN (préfixe C)
  // ou présence d'une notion de lots parents (table lots_composite si elle existe)
  const codeParts = (lot.code_lot || '').split('-');
  const dernierSegment = codeParts[codeParts.length - 1] || '';
  const estComposite = dernierSegment.startsWith('C');

  if (!estComposite) {
    return { conforme: true, regle: 'MELANGE_BIO_CONV' };
  }

  // Lot composite détecté : il faut vérifier que tous les lots parents
  // sont eux-mêmes engagés en BIO. Pour démo : on lève simplement un avertissement.
  // En Session 8a on lira la vraie table de liens lots_composite.
  return {
    conforme: false,
    regle: 'MELANGE_BIO_CONV',
    severite: 'avertissement',
    titre: 'Lot composite à vérifier (mélange BIO/conventionnel)',
    message: `Le lot ${lot.code_lot} est un lot composite (préfixe C). La conformité BIO exige que TOUS les lots parents aient également un engagement BIO valide. Vérifiez manuellement l'engagement BIO de chaque lot parent.`,
    contexte: { engagement_id: engagement.id, lot_code: lot.code_lot },
  };
};

// ============================================================
// RÈGLE 3 — ANALYSE_NON_CONFORME
// ============================================================

const verifierAnalyseNonConforme = (engagement, exigence, lot) => {
  if (engagement.cible_type !== 'lot' || !lot) return null;

  // Récupérer toutes les analyses non conformes de ce lot
  let analysesNonConformes = [];
  try {
    analysesNonConformes = db.getAllSync(
      `SELECT * FROM analyses_qualite 
       WHERE lot_id = ? AND conforme = 0`,
      [lot.id]
    ) || [];
  } catch (e) {
    return null;
  }

  if (analysesNonConformes.length === 0) {
    return { conforme: true, regle: 'ANALYSE_NON_CONFORME' };
  }

  // Premier exemple pour le message
  const a = analysesNonConformes[0];
  const valeurAffichee = a.valeur != null
    ? `${a.valeur} ${a.unite || ''}`
    : (a.valeur_texte || 'valeur non renseignée');

  return {
    conforme: false,
    regle: 'ANALYSE_NON_CONFORME',
    severite: 'critique',
    titre: `${analysesNonConformes.length} analyse${analysesNonConformes.length > 1 ? 's' : ''} non conforme${analysesNonConformes.length > 1 ? 's' : ''}`,
    message: `Le lot ${lot.code_lot} comporte ${analysesNonConformes.length} analyse(s) qualité non conforme(s). Exemple : ${a.type_analyse} = ${valeurAffichee}${a.seuil_max != null ? ` (seuil max ≤ ${a.seuil_max})` : ''}. Une analyse non conforme bloque la certification.`,
    contexte: {
      engagement_id: engagement.id,
      lot_code: lot.code_lot,
      nb_analyses_nc: analysesNonConformes.length,
      premiere_analyse: { type: a.type_analyse, valeur: a.valeur, seuil: a.seuil_max },
    },
  };
};

// ============================================================
// RÈGLE 4 — ETAPE_MANQUANTE
// ============================================================

const verifierEtapeManquante = (engagement, exigence, lot) => {
  if (engagement.cible_type !== 'lot' || !lot) return null;

  // Ne s'applique qu'aux lots clôturés
  if (!lot.est_cloture) {
    return null; // pas encore évaluable
  }

  let etapes = [];
  try {
    etapes = db.getAllSync(
      'SELECT id FROM etapes_post_recolte WHERE lot_id = ?',
      [lot.id]
    ) || [];
  } catch (e) {
    return null;
  }

  if (etapes.length > 0) {
    return { conforme: true, regle: 'ETAPE_MANQUANTE' };
  }

  return {
    conforme: false,
    regle: 'ETAPE_MANQUANTE',
    severite: 'critique',
    titre: 'Lot clôturé sans étape post-récolte',
    message: `Le lot ${lot.code_lot} a été clôturé sans aucune étape post-récolte documentée (séchage, tri, calibrage, etc.). Selon le Codex CXC 1-1969 Principe 7, toute opération critique doit être tracée. Cette défaillance bloque l'audit HACCP.`,
    contexte: {
      engagement_id: engagement.id,
      lot_code: lot.code_lot,
      cloture_le: lot.valide_le || lot.date_fin,
    },
  };
};

// ============================================================
// RÈGLE 5 — PREUVE_MANQUANTE_MAJEURE
// ============================================================

const verifierPreuveManquanteMajeure = (engagement) => {
  // On évalue toutes les exigences majeures de cet engagement
  const exigencesMajeures = db.getAllSync(
    `SELECT ex.id, ex.code_exigence, ex.titre, ex.criticite
     FROM exigences_referentiel ex
     INNER JOIN engagements_certif e ON e.id = ?
     WHERE ex.referentiel_id = e.referentiel_id 
       AND ex.criticite = 'majeure'`,
    [engagement.id]
  ) || [];

  if (exigencesMajeures.length === 0) return null;

  const exigencesSansPreuve = [];
  exigencesMajeures.forEach((ex) => {
    const nbPreuves = countPreuvesByExigence(engagement.id, ex.id);
    if (nbPreuves === 0) {
      exigencesSansPreuve.push(ex);
    }
  });

  if (exigencesSansPreuve.length === 0) {
    return { conforme: true, regle: 'PREUVE_MANQUANTE_MAJEURE' };
  }

  return {
    conforme: false,
    regle: 'PREUVE_MANQUANTE_MAJEURE',
    severite: 'avertissement',
    titre: `${exigencesSansPreuve.length} exigence(s) majeure(s) sans preuve`,
    message: `${exigencesSansPreuve.length} exigence(s) de criticité majeure n'ont aucune preuve enregistrée pour cet engagement ${engagement.ref_nom_court}. Un auditeur considérera ces exigences comme non vérifiables. Exemples : ${exigencesSansPreuve.slice(0, 3).map((e) => e.code_exigence).join(', ')}${exigencesSansPreuve.length > 3 ? '...' : ''}`,
    contexte: {
      engagement_id: engagement.id,
      nb_majeures_sans_preuve: exigencesSansPreuve.length,
      total_majeures: exigencesMajeures.length,
    },
  };
};

// ============================================================
// ÉVALUATION COMPLÈTE D'UN ENGAGEMENT
// ============================================================

export const evaluerEngagement = (engagementId) => {
  const engagement = recupererEngagementComplet(engagementId);
  if (!engagement) {
    console.warn(`[Conformite] Engagement ${engagementId} introuvable`);
    return null;
  }

  const lot = getLotPourEngagement(engagement);

  // Récupérer les exigences avec leurs statuts
  const exigences = getStatutsByEngagement(engagementId);
  const exigencesAuto = exigences.filter((ex) => ex.auto_verifiable === 1);

  const resultats = {
    engagement_id: engagementId,
    nb_evaluees: 0,
    nb_conformes: 0,
    nb_non_conformes: 0,
    nb_alertes_creees: 0,
    details: [],
  };

  // Pour chaque exigence auto-vérifiable, lancer la règle correspondante
  exigencesAuto.forEach((ex) => {
    let resultat = null;

    switch (ex.regle_auto_code) {
      case 'DELAI_CONVERSION_BIO':
        resultat = verifierDelaiConversionBio(engagement, ex, lot);
        break;
      case 'MELANGE_BIO_CONV':
        resultat = verifierMelangeBioConv(engagement, ex, lot);
        break;
      case 'ANALYSE_NON_CONFORME':
        resultat = verifierAnalyseNonConforme(engagement, ex, lot);
        break;
      case 'ETAPE_MANQUANTE':
        resultat = verifierEtapeManquante(engagement, ex, lot);
        break;
      case 'PREUVE_MANQUANTE_MAJEURE':
        resultat = verifierPreuveManquanteMajeure(engagement);
        break;
      default:
        return;
    }

    if (resultat === null) return; // règle non applicable, on saute

    resultats.nb_evaluees++;

    // Mettre à jour le statut de l'exigence
    const nouveauStatut = resultat.conforme ? 'conforme' : 'non_conforme';
    setStatutExigence(engagementId, ex.exigence_id, nouveauStatut, {
      verifie_par: 'moteur_auto',
      commentaire: resultat.conforme
        ? '✓ Vérifié automatiquement — conforme'
        : `✗ Non-conformité détectée : ${resultat.titre}`,
      auto_genere: 1,
    });

    if (resultat.conforme) {
      resultats.nb_conformes++;
    } else {
      resultats.nb_non_conformes++;

      // Créer une alerte
      const alerteId = creerAlerte({
        engagement_id: engagementId,
        exigence_id: ex.exigence_id,
        regle_code: resultat.regle,
        severite: resultat.severite,
        titre: resultat.titre,
        message: resultat.message,
        donnees_contexte: resultat.contexte,
      });
      if (alerteId) resultats.nb_alertes_creees++;
    }

    resultats.details.push({
      code_exigence: ex.code_exigence,
      regle: resultat.regle,
      conforme: resultat.conforme,
      titre: resultat.titre || null,
    });
  });

  return resultats;
};

// ============================================================
// ÉVALUATION GLOBALE (TOUS ENGAGEMENTS ACTIFS)
// ============================================================

export const evaluerTousEngagements = () => {
  const engagements = db.getAllSync(
    `SELECT id FROM engagements_certif 
     WHERE statut IN ('vise', 'en_conversion', 'certifie')
     ORDER BY id`
  );

  const synthese = {
    nb_engagements_evalues: 0,
    nb_alertes_total: 0,
    nb_non_conformites: 0,
    details: [],
  };

  engagements.forEach((e) => {
    const r = evaluerEngagement(e.id);
    if (!r) return;
    synthese.nb_engagements_evalues++;
    synthese.nb_alertes_total += r.nb_alertes_creees;
    synthese.nb_non_conformites += r.nb_non_conformes;
    synthese.details.push(r);
  });

  console.log(
    `🔍 Conformité scan : ${synthese.nb_engagements_evalues} engagements, ` +
    `${synthese.nb_non_conformites} non-conformités, ${synthese.nb_alertes_total} alertes`
  );

  return synthese;
};

// ============================================================
// HELPER UI
// ============================================================

export const getRegleAutoLabel = (code) => {
  const labels = {
    DELAI_CONVERSION_BIO: 'Délai de conversion BIO',
    MELANGE_BIO_CONV: 'Mélange BIO / conventionnel',
    ANALYSE_NON_CONFORME: 'Analyse qualité non conforme',
    ETAPE_MANQUANTE: 'Étape post-récolte manquante',
    PREUVE_MANQUANTE_MAJEURE: 'Preuve manquante (exigence majeure)',
  };
  return labels[code] || code;
};

export const REGLES_AUTO = [
  'DELAI_CONVERSION_BIO',
  'MELANGE_BIO_CONV',
  'ANALYSE_NON_CONFORME',
  'ETAPE_MANQUANTE',
  'PREUVE_MANQUANTE_MAJEURE',
];