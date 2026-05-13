// database/conversionBio.js
// Helpers calcul statut conversion BIO selon Règlement UE 2018/848
// Valeurs statut : non_engage | c1 | c2 | c3 | certifie

import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('certifpilot.db');

// Durée conversion selon type culture
const DUREE_CONVERSION_MOIS = {
  annuelle: 24,
  perenne: 36,
};

/**
 * Calcule le statut de conversion d'une parcelle à une date donnée
 */
export function calculerStatutConversion(dateDebutConversion, typeCultureAac, dateReference = null) {
  if (!dateDebutConversion) {
    return {
      statut: 'non_engage',
      moisEcoules: 0,
      moisRestants: 0,
      dateCertificationPrevue: null,
    };
  }

  const debut = new Date(dateDebutConversion);
  const ref = dateReference ? new Date(dateReference) : new Date();
  const dureeRequise = DUREE_CONVERSION_MOIS[typeCultureAac] || 24;

  const moisEcoules = Math.floor((ref - debut) / (1000 * 60 * 60 * 24 * 30.44));
  const moisRestants = Math.max(0, dureeRequise - moisEcoules);

  const dateCertif = new Date(debut);
  dateCertif.setMonth(dateCertif.getMonth() + dureeRequise);

  let statut;
  if (moisEcoules < 0) {
    statut = 'non_engage';
  } else if (moisEcoules < 12) {
    statut = 'c1';
  } else if (moisEcoules < 24) {
    statut = 'c2';
  } else if (moisEcoules < dureeRequise) {
    statut = 'c3';
  } else {
    statut = 'certifie';
  }

  return {
    statut,
    moisEcoules,
    moisRestants,
    dateCertificationPrevue: dateCertif.toISOString().split('T')[0],
  };
}

/**
 * Met à jour le statut de conversion stocké en base
 */
export function rafraichirStatutConversionParcelle(parcelleId) {
  const parcelle = db.getFirstSync(
    'SELECT * FROM parcelles_producteur WHERE id = ?',
    [parcelleId]
  );

  if (!parcelle) return null;

  const { statut } = calculerStatutConversion(
    parcelle.date_debut_conversion,
    parcelle.type_culture_aac
  );

  db.runSync(
    'UPDATE parcelles_producteur SET statut_conversion_bio = ? WHERE id = ?',
    [statut, parcelleId]
  );

  return statut;
}

/**
 * Démarre une conversion BIO sur une parcelle
 */
export function demarrerConversion(parcelleId, dateDebut, typeCultureAac, notes = '') {
  const parcelle = db.getFirstSync(
    'SELECT * FROM parcelles_producteur WHERE id = ?',
    [parcelleId]
  );

  if (!parcelle) {
    return { success: false, error: 'Parcelle introuvable' };
  }

  // Garde-fou antécédents intrants
  if (parcelle.date_dernier_intrant_interdit) {
    if (new Date(dateDebut) < new Date(parcelle.date_dernier_intrant_interdit)) {
      return {
        success: false,
        error: `Date conversion (${dateDebut}) doit être ≥ date dernier intrant interdit (${parcelle.date_dernier_intrant_interdit})`,
      };
    }
  }

  const { statut } = calculerStatutConversion(dateDebut, typeCultureAac);

  db.runSync(
    `UPDATE parcelles_producteur 
     SET date_debut_conversion = ?, type_culture_aac = ?, 
         statut_conversion_bio = ?, notes_conversion = ?
     WHERE id = ?`,
    [dateDebut, typeCultureAac, statut, notes, parcelleId]
  );

  return { success: true, statut };
}

/**
 * Marque une parcelle comme certifiée BIO
 */
export function certifierParcelle(parcelleId, dateCertif, organisme, numeroCertif) {
  db.runSync(
    `UPDATE parcelles_producteur 
     SET statut_conversion_bio = 'certifie',
         date_certification_bio = ?,
         organisme_certificateur = ?,
         numero_certificat_bio = ?
     WHERE id = ?`,
    [dateCertif, organisme, numeroCertif, parcelleId]
  );
  return { success: true };
}

/**
 * Annule une conversion (reset au statut non_engage)
 */
export function annulerConversion(parcelleId, motif = '') {
  db.runSync(
    `UPDATE parcelles_producteur 
     SET date_debut_conversion = NULL,
         statut_conversion_bio = 'non_engage',
         date_certification_bio = NULL,
         notes_conversion = COALESCE(notes_conversion, '') || ?
     WHERE id = ?`,
    [`\n[Annulation ${new Date().toISOString().split('T')[0]}] ${motif}`, parcelleId]
  );
  return { success: true };
}

/**
 * Récupère les parcelles d'un producteur avec calcul à jour
 */
export function getParcellesAvecConversion(fournisseurId) {
  const parcelles = db.getAllSync(
    'SELECT * FROM parcelles_producteur WHERE fournisseur_id = ?',
    [fournisseurId]
  );

  return parcelles.map(p => {
    const calc = calculerStatutConversion(p.date_debut_conversion, p.type_culture_aac);
    return { ...p, ...calc };
  });
}

/**
 * GARDE-FOU CRITIQUE
 * Vérifie si un lot peut être commercialisé en BIO depuis une parcelle
 */
export function verifierAutorisationBio(parcelleId, dateRecolte = null) {
  const parcelle = db.getFirstSync(
    'SELECT * FROM parcelles_producteur WHERE id = ?',
    [parcelleId]
  );

  if (!parcelle) {
    return { autorise: false, statut: 'introuvable', message: 'Parcelle introuvable' };
  }

  const calc = calculerStatutConversion(
    parcelle.date_debut_conversion,
    parcelle.type_culture_aac,
    dateRecolte
  );

  if (calc.statut === 'certifie') {
    return {
      autorise: true,
      statut: calc.statut,
      message: `✅ Parcelle certifiée BIO depuis ${parcelle.date_certification_bio || 'date inconnue'}`,
    };
  }

  if (calc.statut === 'c2' || calc.statut === 'c3') {
    return {
      autorise: false,
      statut: calc.statut,
      message: `⚠️ Parcelle en conversion (${calc.statut.toUpperCase()}, ${calc.moisRestants} mois restants). Mention "en conversion vers AB" possible UE — pas de label BIO complet.`,
    };
  }

  if (calc.statut === 'c1') {
    return {
      autorise: false,
      statut: calc.statut,
      message: `❌ Parcelle en C1 (an 1 conversion). Récolte = CONVENTIONNELLE obligatoire. ${calc.moisRestants} mois avant fin conversion.`,
    };
  }

  return {
    autorise: false,
    statut: 'non_engage',
    message: '❌ Parcelle non engagée en conversion BIO. Récolte = conventionnelle.',
  };
}

/**
 * Stats globales (pour dashboard SCI)
 */
export function getStatsConversion() {
  const parcelles = db.getAllSync('SELECT * FROM parcelles_producteur');
  const stats = { total: parcelles.length, non_engage: 0, c1: 0, c2: 0, c3: 0, certifie: 0 };

  parcelles.forEach(p => {
    const { statut } = calculerStatutConversion(p.date_debut_conversion, p.type_culture_aac);
    if (stats[statut] !== undefined) stats[statut]++;
  });

  return stats;
}

// Couleurs UI par statut (cohérent palette AgriSuite)
export const COULEURS_STATUT = {
  non_engage: '#888',
  c1: '#d4a04a',     // amber
  c2: '#7ec87e',     // accent vert
  c3: '#5aa55a',     // vert plus foncé
  certifie: '#2d7a2d', // vert AB
};

export const LIBELLES_STATUT = {
  non_engage: 'Conventionnel',
  c1: 'C1 - Année 1',
  c2: 'C2 - Année 2',
  c3: 'C3 - Année 3',
  certifie: 'Certifié BIO ✓',
};