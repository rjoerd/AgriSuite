// database/haccp.js
// Phase 3 Session 10a + 10a-bis2 — Module HACCP (Codex Alimentarius CXC 1-1969 rev. 2020)
//
// 10a    : 4 tables, dangers, CCP, limites
// 10a-bis2 : enrichissement CCP avec 5 colonnes mode opératoire
//
// 4 tables :
//   - etudes_haccp     : 1 ligne par produit
//   - dangers_haccp    : N dangers par étude
//   - ccp_haccp        : N CCP par étude (+ mode opératoire)
//   - limites_critiques : N limites par CCP

import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('certifpilot.db');

// ============================================================
// INITIALISATION DES TABLES
// ============================================================

export const initHaccp = () => {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS etudes_haccp (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produit_code TEXT NOT NULL UNIQUE,
      produit_nom TEXT NOT NULL,
      nom_etude TEXT NOT NULL,
      version TEXT DEFAULT '1.0',
      statut TEXT NOT NULL DEFAULT 'brouillon'
        CHECK(statut IN ('brouillon', 'active', 'obsolete')),
      description_produit TEXT,
      diagramme_fabrication TEXT,
      destination_produit TEXT,
      population_cible TEXT,
      mode_consommation TEXT,
      duree_conservation TEXT,
      conditions_stockage TEXT,
      responsable_redaction TEXT,
      date_redaction TEXT,
      date_validation TEXT,
      validateur TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS dangers_haccp (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      etude_id INTEGER NOT NULL,
      categorie TEXT NOT NULL
        CHECK(categorie IN ('biologique', 'chimique', 'physique', 'allergenique')),
      nom_danger TEXT NOT NULL,
      description TEXT,
      source TEXT,
      gravite TEXT NOT NULL DEFAULT 'moyenne'
        CHECK(gravite IN ('faible', 'moyenne', 'grave', 'critique')),
      probabilite TEXT NOT NULL DEFAULT 'possible'
        CHECK(probabilite IN ('rare', 'possible', 'probable', 'frequent')),
      significatif INTEGER DEFAULT 0,
      mesures_maitrise TEXT,
      reference_reglementaire TEXT,
      est_seed INTEGER DEFAULT 0,
      desactive INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (etude_id) REFERENCES etudes_haccp(id) ON DELETE CASCADE
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS ccp_haccp (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      etude_id INTEGER NOT NULL,
      numero TEXT NOT NULL,
      etape_processus TEXT NOT NULL,
      danger_id INTEGER,
      nom_ccp TEXT NOT NULL,
      justification_ccp TEXT,
      frequence_surveillance TEXT
        CHECK(frequence_surveillance IN ('continu', 'horaire', 'quotidien', 'chaque_lot', 'hebdomadaire')),
      responsable TEXT,
      action_corrective_default TEXT,
      est_seed INTEGER DEFAULT 0,
      desactive INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (etude_id) REFERENCES etudes_haccp(id) ON DELETE CASCADE,
      FOREIGN KEY (danger_id) REFERENCES dangers_haccp(id)
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS limites_critiques (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ccp_id INTEGER NOT NULL,
      parametre TEXT NOT NULL,
      valeur_min REAL,
      valeur_max REAL,
      unite TEXT,
      tolerance REAL,
      methode_mesure TEXT,
      equipement TEXT,
      reference_reglementaire TEXT,
      est_seed INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ccp_id) REFERENCES limites_critiques(id) ON DELETE CASCADE
    );
  `);

  db.execSync(`CREATE INDEX IF NOT EXISTS idx_dangers_etude ON dangers_haccp(etude_id);`);
  db.execSync(`CREATE INDEX IF NOT EXISTS idx_ccp_etude ON ccp_haccp(etude_id);`);
  db.execSync(`CREATE INDEX IF NOT EXISTS idx_limites_ccp ON limites_critiques(ccp_id);`);

  // 🆕 Migration 10a-bis2 : 5 colonnes mode opératoire sur ccp_haccp
  migrateHaccpModeOperatoire();

  console.log('✅ Tables HACCP initialisées (4 tables + mode opératoire)');
};

// ============================================================
// MIGRATION 10a-bis2 — Mode opératoire détaillé
// ============================================================

const migrateHaccpModeOperatoire = () => {
  const colonnes = [
    'procedure_mesure',
    'plan_echantillonnage',
    'calibration_equipement',
    'formation_requise',
    'document_enregistrement',
  ];

  for (const col of colonnes) {
    try {
      db.execSync(`ALTER TABLE ccp_haccp ADD COLUMN ${col} TEXT;`);
      console.log(`✅ [HACCP 10a-bis2] Colonne ${col} ajoutée`);
    } catch (err) {
      if (!String(err.message || err).includes('duplicate column')) {
        console.log(`ℹ️ [HACCP 10a-bis2] ${col} déjà présente`);
      }
    }
  }
};

// ============================================================
// HELPERS LABELS / COULEURS
// ============================================================

export const GRAVITE_LABELS = {
  faible: 'Faible',
  moyenne: 'Moyenne',
  grave: 'Grave',
  critique: 'Critique',
};

export const GRAVITE_COULEURS = {
  faible: '#7ec87e',
  moyenne: '#d4a04a',
  grave: '#e87e3a',
  critique: '#c83030',
};

export const PROBA_LABELS = {
  rare: 'Rare',
  possible: 'Possible',
  probable: 'Probable',
  frequent: 'Fréquent',
};

export const CATEGORIE_DANGER_LABELS = {
  biologique: '🦠 Biologique',
  chimique: '⚗️ Chimique',
  physique: '🪨 Physique',
  allergenique: '⚠️ Allergénique',
};

export const STATUT_ETUDE_LABELS = {
  brouillon: '📝 Brouillon',
  active: '✅ Active',
  obsolete: '🗄 Obsolète',
};

export const STATUT_ETUDE_COULEURS = {
  brouillon: '#d4a04a',
  active: '#7ec87e',
  obsolete: '#888',
};

// ============================================================
// CALCUL SIGNIFICATIVITÉ DANGER
// ============================================================

export const calculerSignificatif = (gravite, probabilite) => {
  if (gravite === 'critique') return 1;
  if (gravite === 'grave' && probabilite !== 'rare') return 1;
  if (gravite === 'moyenne' && (probabilite === 'probable' || probabilite === 'frequent')) return 1;
  return 0;
};

// ============================================================
// CRUD ÉTUDES
// ============================================================

export const getAllEtudes = () => {
  return db.getAllSync(
    `SELECT
       e.*,
       (SELECT COUNT(*) FROM dangers_haccp d WHERE d.etude_id = e.id AND d.desactive = 0) as nb_dangers,
       (SELECT COUNT(*) FROM dangers_haccp d WHERE d.etude_id = e.id AND d.desactive = 0 AND d.significatif = 1) as nb_dangers_significatifs,
       (SELECT COUNT(*) FROM ccp_haccp c WHERE c.etude_id = e.id AND c.desactive = 0) as nb_ccp
     FROM etudes_haccp e
     ORDER BY e.produit_nom`
  );
};

export const getEtudeById = (id) => {
  return db.getFirstSync(`SELECT * FROM etudes_haccp WHERE id = ?`, [id]);
};

export const getEtudeByProduit = (produit_code) => {
  return db.getFirstSync(`SELECT * FROM etudes_haccp WHERE produit_code = ?`, [produit_code]);
};

export const creerEtude = (etude) => {
  const result = db.runSync(
    `INSERT INTO etudes_haccp (
      produit_code, produit_nom, nom_etude, version, statut,
      description_produit, destination_produit, population_cible,
      mode_consommation, duree_conservation, conditions_stockage,
      responsable_redaction, date_redaction, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      etude.produit_code,
      etude.produit_nom,
      etude.nom_etude,
      etude.version || '1.0',
      etude.statut || 'brouillon',
      etude.description_produit || null,
      etude.destination_produit || null,
      etude.population_cible || null,
      etude.mode_consommation || null,
      etude.duree_conservation || null,
      etude.conditions_stockage || null,
      etude.responsable_redaction || null,
      etude.date_redaction || null,
      etude.notes || null,
    ]
  );
  return result.lastInsertRowId;
};

export const updateEtude = (id, updates) => {
  const champs = [];
  const valeurs = [];
  Object.keys(updates).forEach((key) => {
    champs.push(`${key} = ?`);
    valeurs.push(updates[key]);
  });
  champs.push('updated_at = CURRENT_TIMESTAMP');
  valeurs.push(id);
  db.runSync(
    `UPDATE etudes_haccp SET ${champs.join(', ')} WHERE id = ?`,
    valeurs
  );
};

export const supprimerEtude = (id) => {
  db.runSync(`DELETE FROM etudes_haccp WHERE id = ?`, [id]);
};

// ============================================================
// CRUD DANGERS
// ============================================================

export const getDangersByEtude = (etudeId, includeDesactives = false) => {
  const where = includeDesactives ? '' : 'AND desactive = 0';
  return db.getAllSync(
    `SELECT * FROM dangers_haccp
     WHERE etude_id = ? ${where}
     ORDER BY categorie, nom_danger`,
    [etudeId]
  );
};

export const getDangerById = (id) => {
  return db.getFirstSync(`SELECT * FROM dangers_haccp WHERE id = ?`, [id]);
};

export const creerDanger = (danger) => {
  const significatif = calculerSignificatif(
    danger.gravite || 'moyenne',
    danger.probabilite || 'possible'
  );
  const result = db.runSync(
    `INSERT INTO dangers_haccp (
      etude_id, categorie, nom_danger, description, source,
      gravite, probabilite, significatif, mesures_maitrise,
      reference_reglementaire, est_seed, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      danger.etude_id,
      danger.categorie,
      danger.nom_danger,
      danger.description || null,
      danger.source || null,
      danger.gravite || 'moyenne',
      danger.probabilite || 'possible',
      significatif,
      danger.mesures_maitrise || null,
      danger.reference_reglementaire || null,
      danger.est_seed || 0,
      danger.notes || null,
    ]
  );
  return result.lastInsertRowId;
};

export const updateDanger = (id, updates) => {
  const champs = [];
  const valeurs = [];
  if (updates.gravite || updates.probabilite) {
    const danger = getDangerById(id);
    const newGrav = updates.gravite || danger.gravite;
    const newProb = updates.probabilite || danger.probabilite;
    updates.significatif = calculerSignificatif(newGrav, newProb);
  }
  Object.keys(updates).forEach((key) => {
    champs.push(`${key} = ?`);
    valeurs.push(updates[key]);
  });
  valeurs.push(id);
  db.runSync(
    `UPDATE dangers_haccp SET ${champs.join(', ')} WHERE id = ?`,
    valeurs
  );
};

export const desactiverDanger = (id) => {
  db.runSync(`UPDATE dangers_haccp SET desactive = 1 WHERE id = ?`, [id]);
};

export const reactiverDanger = (id) => {
  db.runSync(`UPDATE dangers_haccp SET desactive = 0 WHERE id = ?`, [id]);
};

export const supprimerDanger = (id) => {
  db.runSync(`DELETE FROM dangers_haccp WHERE id = ?`, [id]);
};

// ============================================================
// CRUD CCP
// ============================================================

export const getCcpsByEtude = (etudeId, includeDesactives = false) => {
  const where = includeDesactives ? '' : 'AND c.desactive = 0';
  return db.getAllSync(
    `SELECT
       c.*,
       d.nom_danger as danger_nom,
       d.categorie as danger_categorie,
       (SELECT COUNT(*) FROM limites_critiques lc WHERE lc.ccp_id = c.id) as nb_limites
     FROM ccp_haccp c
     LEFT JOIN dangers_haccp d ON c.danger_id = d.id
     WHERE c.etude_id = ? ${where}
     ORDER BY c.numero`,
    [etudeId]
  );
};

export const getCcpById = (id) => {
  return db.getFirstSync(
    `SELECT c.*, d.nom_danger as danger_nom, d.categorie as danger_categorie
     FROM ccp_haccp c
     LEFT JOIN dangers_haccp d ON c.danger_id = d.id
     WHERE c.id = ?`,
    [id]
  );
};

export const creerCcp = (ccp) => {
  const result = db.runSync(
    `INSERT INTO ccp_haccp (
      etude_id, numero, etape_processus, danger_id, nom_ccp,
      justification_ccp, frequence_surveillance, responsable,
      action_corrective_default, est_seed, notes,
      procedure_mesure, plan_echantillonnage, calibration_equipement,
      formation_requise, document_enregistrement
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      ccp.etude_id,
      ccp.numero,
      ccp.etape_processus,
      ccp.danger_id || null,
      ccp.nom_ccp,
      ccp.justification_ccp || null,
      ccp.frequence_surveillance || null,
      ccp.responsable || null,
      ccp.action_corrective_default || null,
      ccp.est_seed || 0,
      ccp.notes || null,
      ccp.procedure_mesure || null,
      ccp.plan_echantillonnage || null,
      ccp.calibration_equipement || null,
      ccp.formation_requise || null,
      ccp.document_enregistrement || null,
    ]
  );
  return result.lastInsertRowId;
};

export const updateCcp = (id, updates) => {
  const champs = [];
  const valeurs = [];
  Object.keys(updates).forEach((key) => {
    champs.push(`${key} = ?`);
    valeurs.push(updates[key]);
  });
  valeurs.push(id);
  db.runSync(
    `UPDATE ccp_haccp SET ${champs.join(', ')} WHERE id = ?`,
    valeurs
  );
};

export const desactiverCcp = (id) => {
  db.runSync(`UPDATE ccp_haccp SET desactive = 1 WHERE id = ?`, [id]);
};

export const supprimerCcp = (id) => {
  db.runSync(`DELETE FROM ccp_haccp WHERE id = ?`, [id]);
};

// ============================================================
// CRUD LIMITES CRITIQUES
// ============================================================

export const getLimitesByCcp = (ccpId) => {
  return db.getAllSync(
    `SELECT * FROM limites_critiques WHERE ccp_id = ? ORDER BY parametre`,
    [ccpId]
  );
};

export const creerLimite = (limite) => {
  const result = db.runSync(
    `INSERT INTO limites_critiques (
      ccp_id, parametre, valeur_min, valeur_max, unite, tolerance,
      methode_mesure, equipement, reference_reglementaire, est_seed, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      limite.ccp_id,
      limite.parametre,
      limite.valeur_min !== undefined ? limite.valeur_min : null,
      limite.valeur_max !== undefined ? limite.valeur_max : null,
      limite.unite || null,
      limite.tolerance !== undefined ? limite.tolerance : null,
      limite.methode_mesure || null,
      limite.equipement || null,
      limite.reference_reglementaire || null,
      limite.est_seed || 0,
      limite.notes || null,
    ]
  );
  return result.lastInsertRowId;
};

export const updateLimite = (id, updates) => {
  const champs = [];
  const valeurs = [];
  Object.keys(updates).forEach((key) => {
    champs.push(`${key} = ?`);
    valeurs.push(updates[key]);
  });
  valeurs.push(id);
  db.runSync(
    `UPDATE limites_critiques SET ${champs.join(', ')} WHERE id = ?`,
    valeurs
  );
};

export const supprimerLimite = (id) => {
  db.runSync(`DELETE FROM limites_critiques WHERE id = ?`, [id]);
};

// ============================================================
// KPI / STATS
// ============================================================

export const getKpiHaccp = () => {
  return db.getFirstSync(
    `SELECT
       COUNT(*) as total_etudes,
       SUM(CASE WHEN statut = 'active' THEN 1 ELSE 0 END) as nb_actives,
       SUM(CASE WHEN statut = 'brouillon' THEN 1 ELSE 0 END) as nb_brouillon,
       SUM(CASE WHEN statut = 'obsolete' THEN 1 ELSE 0 END) as nb_obsoletes,
       (SELECT COUNT(*) FROM dangers_haccp WHERE desactive = 0) as total_dangers,
       (SELECT COUNT(*) FROM dangers_haccp WHERE desactive = 0 AND significatif = 1) as total_dangers_significatifs,
       (SELECT COUNT(*) FROM ccp_haccp WHERE desactive = 0) as total_ccp
     FROM etudes_haccp`
  );
};