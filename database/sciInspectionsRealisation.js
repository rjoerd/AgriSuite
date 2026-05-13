// database/sciInspectionsRealisation.js
// Extension SCI Inspections : CRUD réalisation, réponses, sélection exigences
// CORRIGÉ : table exigences_referentiel + colonnes code_exigence/titre/description

import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('certifpilot.db');

// ============================================================
// SÉLECTION DES EXIGENCES À INSPECTER
// ============================================================
//
// Filtre selon référentiel + type d'inspection (priorité)
// initiale → priorités 1+2+3 (large découverte)
// annuelle → priorités 1+2 (focus pratique)
// inopinee → priorité 1 (critiques seulement)
// suivi_sanction → priorités 1+2

export const getExigencesPourInspection = (referentiel_code, type_inspection) => {
  let prioritesMax;
  if (type_inspection === 'initiale') prioritesMax = 3;
  else if (type_inspection === 'inopinee') prioritesMax = 1;
  else prioritesMax = 2;

  return db.getAllSync(
    `SELECT 
       ex.id, 
       ex.code_exigence as code, 
       ex.titre as libelle, 
       ex.description, 
       ex.categorie, 
       ex.criticite,
       ex.priorite_sci, 
       ex.types_inspection_applicable
     FROM exigences_referentiel ex
     JOIN referentiels r ON r.id = ex.referentiel_id
     WHERE r.code = ?
       AND COALESCE(ex.priorite_sci, 2) <= ?
     ORDER BY COALESCE(ex.priorite_sci, 2) ASC, ex.categorie ASC, ex.code_exigence ASC`,
    [referentiel_code, prioritesMax]
  );
};

// ============================================================
// CRUD INSPECTIONS RÉALISÉES
// ============================================================

export const creerInspectionRealisee = (data) => {
  const result = db.runSync(
    `INSERT INTO inspections_realisees
     (planification_id, fournisseur_id, referentiel_code, type_inspection,
      date_realisee, inspecteur_nom, lieu_gps_lat, lieu_gps_lon, duree_minutes,
      conclusion, signature_producteur_type, signature_producteur_data, photo_producteur_uri,
      temoin_nom, temoin_signature_data, signature_inspecteur_data, notes_generales,
      cloture, date_cloture)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)`,
    [
      data.planification_id || null,
      data.fournisseur_id,
      data.referentiel_code,
      data.type_inspection,
      data.date_realisee,
      data.inspecteur_nom,
      data.lieu_gps_lat || null,
      data.lieu_gps_lon || null,
      data.duree_minutes || null,
      data.conclusion || null,
      data.signature_producteur_type || null,
      data.signature_producteur_data || null,
      data.photo_producteur_uri || null,
      data.temoin_nom || null,
      data.temoin_signature_data || null,
      data.signature_inspecteur_data || null,
      data.notes_generales || null,
    ]
  );
  return result.lastInsertRowId;
};

export const updateInspectionRealisee = (id, data) => {
  db.runSync(
    `UPDATE inspections_realisees
     SET conclusion = ?, signature_producteur_type = ?, signature_producteur_data = ?,
         photo_producteur_uri = ?, temoin_nom = ?, temoin_signature_data = ?,
         signature_inspecteur_data = ?, notes_generales = ?, duree_minutes = ?
     WHERE id = ?`,
    [
      data.conclusion || null,
      data.signature_producteur_type || null,
      data.signature_producteur_data || null,
      data.photo_producteur_uri || null,
      data.temoin_nom || null,
      data.temoin_signature_data || null,
      data.signature_inspecteur_data || null,
      data.notes_generales || null,
      data.duree_minutes || null,
      id,
    ]
  );
};

export const cloturerInspection = (id) => {
  db.runSync(
    `UPDATE inspections_realisees SET cloture = 1, date_cloture = datetime('now') WHERE id = ?`,
    [id]
  );
  db.runSync(
    `UPDATE inspections_planifiees SET statut = 'realisee'
     WHERE id = (SELECT planification_id FROM inspections_realisees WHERE id = ?)`,
    [id]
  );
};

export const getInspectionRealisee = (id) => {
  return db.getFirstSync(
    `SELECT ir.*, f.nom as fournisseur_nom, f.code as fournisseur_code
     FROM inspections_realisees ir
     JOIN fournisseurs f ON f.id = ir.fournisseur_id
     WHERE ir.id = ?`,
    [id]
  );
};

export const getRealisationParPlanification = (planification_id) => {
  return db.getFirstSync(
    `SELECT * FROM inspections_realisees WHERE planification_id = ? AND cloture = 0 LIMIT 1`,
    [planification_id]
  );
};

// ============================================================
// CRUD RÉPONSES (point par point)
// ============================================================

export const enregistrerReponse = (data) => {
  const existing = db.getFirstSync(
    `SELECT id FROM inspections_reponses WHERE inspection_id = ? AND exigence_id = ?`,
    [data.inspection_id, data.exigence_id]
  );

  if (existing) {
    db.runSync(
      `UPDATE inspections_reponses
       SET reponse = ?, gravite = ?, observation = ?, photo_uri = ?, date_reponse = datetime('now')
       WHERE id = ?`,
      [data.reponse, data.gravite || null, data.observation || null, data.photo_uri || null, existing.id]
    );
    return existing.id;
  } else {
    const result = db.runSync(
      `INSERT INTO inspections_reponses
       (inspection_id, exigence_id, reponse, gravite, observation, photo_uri)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.inspection_id,
        data.exigence_id,
        data.reponse,
        data.gravite || null,
        data.observation || null,
        data.photo_uri || null,
      ]
    );
    return result.lastInsertRowId;
  }
};

export const getReponsesInspection = (inspection_id) => {
  return db.getAllSync(
    `SELECT * FROM inspections_reponses WHERE inspection_id = ?`,
    [inspection_id]
  );
};

export const getReponseExigence = (inspection_id, exigence_id) => {
  return db.getFirstSync(
    `SELECT * FROM inspections_reponses WHERE inspection_id = ? AND exigence_id = ?`,
    [inspection_id, exigence_id]
  );
};

// ============================================================
// CALCUL CONCLUSION AUTO
// ============================================================

export const calculerConclusion = (inspection_id) => {
  const reponses = getReponsesInspection(inspection_id);
  const nonConformes = reponses.filter((r) => r.reponse === 'non_conforme');

  if (nonConformes.length === 0) return 'conforme';

  const critiques = nonConformes.filter((r) => r.gravite === 'critique').length;
  const majeures = nonConformes.filter((r) => r.gravite === 'majeure').length;

  if (critiques > 0) return 'non_conforme_critique';
  if (majeures > 0) return 'non_conforme_majeure';
  return 'non_conforme_mineure';
};

// ============================================================
// STATS PROGRESSION
// ============================================================

export const getProgressionInspection = (inspection_id, total_exigences) => {
  const reponses = getReponsesInspection(inspection_id);
  const repondu = reponses.length;
  const conforme = reponses.filter((r) => r.reponse === 'conforme').length;
  const nonConforme = reponses.filter((r) => r.reponse === 'non_conforme').length;
  const na = reponses.filter((r) => r.reponse === 'non_applicable').length;
  const aRevoir = reponses.filter((r) => r.reponse === 'a_revoir').length;

  return {
    total: total_exigences,
    repondu,
    restant: total_exigences - repondu,
    conforme,
    non_conforme: nonConforme,
    non_applicable: na,
    a_revoir: aRevoir,
    pourcentage: total_exigences > 0 ? Math.round((repondu / total_exigences) * 100) : 0,
  };
};