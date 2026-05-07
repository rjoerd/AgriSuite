// database/sciSanctions.js
// CRUD registre sanctions SCI

import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('agrisuite.db');

// ============================================================
// CRÉATION SANCTION
// ============================================================

export const creerSanction = (data) => {
  const result = db.runSync(
    `INSERT INTO sanctions
     (fournisseur_id, referentiel_code, inspection_id, type_sanction,
      motif, date_sanction, decideur, action_corrective_demandee, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.fournisseur_id,
      data.referentiel_code,
      data.inspection_id || null,
      data.type_sanction,
      data.motif,
      data.date_sanction,
      data.decideur,
      data.action_corrective_demandee || null,
      data.notes || null,
    ]
  );
  return result.lastInsertRowId;
};

// ============================================================
// LEVÉE D'UNE SANCTION (créer une nouvelle entrée 'levee')
// ============================================================

export const leverSanction = (sanctionParenteId, data) => {
  // Récupérer la sanction parente
  const parente = db.getFirstSync(
    `SELECT * FROM sanctions WHERE id = ?`,
    [sanctionParenteId]
  );
  if (!parente) throw new Error('Sanction introuvable');

  // Marquer la parente comme levée (date_levee + action_realisee)
  db.runSync(
    `UPDATE sanctions 
     SET date_levee = ?, action_corrective_realisee = 1
     WHERE id = ?`,
    [data.date_levee, sanctionParenteId]
  );

  // Créer une nouvelle entrée 'levee' (registre append-only)
  const result = db.runSync(
    `INSERT INTO sanctions
     (fournisseur_id, referentiel_code, inspection_id, type_sanction,
      motif, date_sanction, decideur, notes)
     VALUES (?, ?, ?, 'levee', ?, ?, ?, ?)`,
    [
      parente.fournisseur_id,
      parente.referentiel_code,
      parente.inspection_id,
      `Levée de la sanction #${sanctionParenteId} (${parente.type_sanction}) — ${data.motif_levee || ''}`,
      data.date_levee,
      data.decideur,
      data.notes || null,
    ]
  );
  return result.lastInsertRowId;
};

// ============================================================
// LECTURES
// ============================================================

export const getSanctionsParFournisseur = (fournisseur_id) => {
  return db.getAllSync(
    `SELECT * FROM sanctions
     WHERE fournisseur_id = ?
     ORDER BY date_sanction DESC, id DESC`,
    [fournisseur_id]
  );
};

export const getSanctionsActives = (fournisseur_id = null) => {
  // Active = pas encore levée ET pas de type 'levee'
  if (fournisseur_id) {
    return db.getAllSync(
      `SELECT s.*, f.nom as fournisseur_nom, f.code as fournisseur_code
       FROM sanctions s
       JOIN fournisseurs f ON f.id = s.fournisseur_id
       WHERE s.fournisseur_id = ?
         AND s.type_sanction != 'levee'
         AND s.date_levee IS NULL
       ORDER BY s.date_sanction DESC`,
      [fournisseur_id]
    );
  }
  return db.getAllSync(
    `SELECT s.*, f.nom as fournisseur_nom, f.code as fournisseur_code
     FROM sanctions s
     JOIN fournisseurs f ON f.id = s.fournisseur_id
     WHERE s.type_sanction != 'levee'
       AND s.date_levee IS NULL
     ORDER BY s.date_sanction DESC`
  );
};

export const getToutesSanctions = () => {
  return db.getAllSync(
    `SELECT s.*, f.nom as fournisseur_nom, f.code as fournisseur_code
     FROM sanctions s
     JOIN fournisseurs f ON f.id = s.fournisseur_id
     ORDER BY s.date_sanction DESC, s.id DESC`
  );
};

export const getSanctionById = (id) => {
  return db.getFirstSync(
    `SELECT s.*, f.nom as fournisseur_nom, f.code as fournisseur_code
     FROM sanctions s
     JOIN fournisseurs f ON f.id = s.fournisseur_id
     WHERE s.id = ?`,
    [id]
  );
};

export const getSanctionsParInspection = (inspection_id) => {
  return db.getAllSync(
    `SELECT * FROM sanctions WHERE inspection_id = ? ORDER BY date_sanction DESC`,
    [inspection_id]
  );
};

// ============================================================
// KPI
// ============================================================

export const getKpiSanctions = () => {
  const total = db.getFirstSync(
    `SELECT COUNT(*) as n FROM sanctions WHERE type_sanction != 'levee' AND date_levee IS NULL`
  );
  const avert = db.getFirstSync(
    `SELECT COUNT(*) as n FROM sanctions WHERE type_sanction = 'avertissement' AND date_levee IS NULL`
  );
  const susp = db.getFirstSync(
    `SELECT COUNT(*) as n FROM sanctions WHERE type_sanction = 'suspension' AND date_levee IS NULL`
  );
  const excl = db.getFirstSync(
    `SELECT COUNT(*) as n FROM sanctions WHERE type_sanction = 'exclusion' AND date_levee IS NULL`
  );

  return {
    actives: total?.n || 0,
    avertissements: avert?.n || 0,
    suspensions: susp?.n || 0,
    exclusions: excl?.n || 0,
  };
};

// ============================================================
// HELPERS UI
// ============================================================

export const getTypeSanctionLabel = (type) => {
  const labels = {
    avertissement: 'Avertissement',
    suspension: 'Suspension',
    exclusion: 'Exclusion',
    levee: 'Levée',
  };
  return labels[type] || type;
};

export const getTypeSanctionColor = (type) => {
  const colors = {
    avertissement: '#d4a04a',
    suspension: '#e67e22',
    exclusion: '#cc4444',
    levee: '#7ec87e',
  };
  return colors[type] || '#999';
};

export const getTypeSanctionIcon = (type) => {
  const icons = {
    avertissement: '⚠',
    suspension: '⏸',
    exclusion: '🚫',
    levee: '✓',
  };
  return icons[type] || '•';
};