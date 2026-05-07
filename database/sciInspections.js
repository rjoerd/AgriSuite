// database/sciInspections.js
// Module SCI — Inspections : planification, réalisation, réponses, sanctions
// CORRIGÉ : f.zone_collecte_code + f.statut='actif' + exigences_referentiel

import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('agrisuite.db');

// ============================================================
// INITIALISATION DES TABLES
// ============================================================

export const initSciInspectionsTables = () => {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS inspections_planifiees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fournisseur_id INTEGER NOT NULL,
      referentiel_code TEXT NOT NULL,
      type_inspection TEXT NOT NULL CHECK(type_inspection IN ('initiale','annuelle','inopinee','suivi_sanction')),
      date_prevue TEXT NOT NULL,
      motif TEXT,
      inspecteur_prevu TEXT,
      statut TEXT NOT NULL DEFAULT 'planifiee' CHECK(statut IN ('planifiee','realisee','reportee','annulee')),
      date_creation TEXT NOT NULL DEFAULT (datetime('now')),
      notes TEXT,
      FOREIGN KEY (fournisseur_id) REFERENCES fournisseurs(id)
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS inspections_realisees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      planification_id INTEGER,
      fournisseur_id INTEGER NOT NULL,
      referentiel_code TEXT NOT NULL,
      type_inspection TEXT NOT NULL CHECK(type_inspection IN ('initiale','annuelle','inopinee','suivi_sanction')),
      date_realisee TEXT NOT NULL,
      inspecteur_nom TEXT NOT NULL,
      lieu_gps_lat REAL,
      lieu_gps_lon REAL,
      duree_minutes INTEGER,
      conclusion TEXT CHECK(conclusion IN ('conforme','non_conforme_mineure','non_conforme_majeure','non_conforme_critique')),
      signature_producteur_type TEXT CHECK(signature_producteur_type IN ('manuscrite','empreinte','temoin')),
      signature_producteur_data TEXT,
      photo_producteur_uri TEXT,
      temoin_nom TEXT,
      temoin_signature_data TEXT,
      signature_inspecteur_data TEXT,
      notes_generales TEXT,
      date_cloture TEXT,
      cloture INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (planification_id) REFERENCES inspections_planifiees(id),
      FOREIGN KEY (fournisseur_id) REFERENCES fournisseurs(id)
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS inspections_reponses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inspection_id INTEGER NOT NULL,
      exigence_id INTEGER NOT NULL,
      reponse TEXT NOT NULL CHECK(reponse IN ('conforme','non_conforme','non_applicable','a_revoir')),
      gravite TEXT CHECK(gravite IN ('mineure','majeure','critique')),
      observation TEXT,
      photo_uri TEXT,
      date_reponse TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (inspection_id) REFERENCES inspections_realisees(id),
      FOREIGN KEY (exigence_id) REFERENCES exigences_referentiel(id)
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS sanctions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fournisseur_id INTEGER NOT NULL,
      referentiel_code TEXT NOT NULL,
      inspection_id INTEGER,
      type_sanction TEXT NOT NULL CHECK(type_sanction IN ('avertissement','suspension','exclusion','levee')),
      motif TEXT NOT NULL,
      date_sanction TEXT NOT NULL,
      date_levee TEXT,
      decideur TEXT NOT NULL,
      action_corrective_demandee TEXT,
      action_corrective_realisee INTEGER NOT NULL DEFAULT 0,
      date_creation TEXT NOT NULL DEFAULT (datetime('now')),
      notes TEXT,
      FOREIGN KEY (fournisseur_id) REFERENCES fournisseurs(id),
      FOREIGN KEY (inspection_id) REFERENCES inspections_realisees(id)
    );
  `);

  // Migrations sur exigences_referentiel
  try {
    db.execSync(`ALTER TABLE exigences_referentiel ADD COLUMN types_inspection_applicable TEXT DEFAULT '["initiale","annuelle","inopinee"]';`);
    console.log('[sciInspections] Colonne types_inspection_applicable ajoutée');
  } catch (e) {}
  try {
    db.execSync(`ALTER TABLE exigences_referentiel ADD COLUMN priorite_sci INTEGER DEFAULT 2;`);
    console.log('[sciInspections] Colonne priorite_sci ajoutée');
  } catch (e) {}

  // Auto-marquage P1 pour exigences criticité=majeure (alignement audit)
  try {
    db.execSync(`UPDATE exigences_referentiel SET priorite_sci = 1 WHERE criticite = 'majeure' AND priorite_sci = 2;`);
    db.execSync(`UPDATE exigences_referentiel SET priorite_sci = 3 WHERE criticite = 'recommandation' AND priorite_sci = 2;`);
    console.log('[sciInspections] Priorités SCI auto-mappées depuis criticité');
  } catch (e) {}

  console.log('[sciInspections] 4 tables initialisées : planifiees, realisees, reponses, sanctions');
};

// ============================================================
// CRUD INSPECTIONS PLANIFIÉES
// ============================================================

export const creerInspectionPlanifiee = (data) => {
  const result = db.runSync(
    `INSERT INTO inspections_planifiees 
     (fournisseur_id, referentiel_code, type_inspection, date_prevue, motif, inspecteur_prevu, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.fournisseur_id,
      data.referentiel_code,
      data.type_inspection,
      data.date_prevue,
      data.motif || null,
      data.inspecteur_prevu || null,
      data.notes || null,
    ]
  );
  return result.lastInsertRowId;
};

export const updateInspectionPlanifiee = (id, data) => {
  db.runSync(
    `UPDATE inspections_planifiees 
     SET referentiel_code = ?, type_inspection = ?, date_prevue = ?, 
         motif = ?, inspecteur_prevu = ?, statut = ?, notes = ?
     WHERE id = ?`,
    [
      data.referentiel_code,
      data.type_inspection,
      data.date_prevue,
      data.motif || null,
      data.inspecteur_prevu || null,
      data.statut || 'planifiee',
      data.notes || null,
      id,
    ]
  );
};

export const supprimerInspectionPlanifiee = (id) => {
  db.runSync(`DELETE FROM inspections_planifiees WHERE id = ?`, [id]);
};

export const getInspectionPlanifiee = (id) => {
  return db.getFirstSync(
    `SELECT ip.*, f.nom as fournisseur_nom, f.code as fournisseur_code, f.zone_collecte_code as fournisseur_zone
     FROM inspections_planifiees ip
     JOIN fournisseurs f ON f.id = ip.fournisseur_id
     WHERE ip.id = ?`,
    [id]
  );
};

// ============================================================
// REQUÊTES TRIÉES PAR SECTIONS
// ============================================================

export const getInspectionsEnRetard = () => {
  return db.getAllSync(
    `SELECT ip.*, f.nom as fournisseur_nom, f.code as fournisseur_code, f.zone_collecte_code as fournisseur_zone,
            CAST(julianday('now') - julianday(ip.date_prevue) AS INTEGER) as jours_retard
     FROM inspections_planifiees ip
     JOIN fournisseurs f ON f.id = ip.fournisseur_id
     WHERE ip.statut = 'planifiee' AND ip.date_prevue < date('now')
     ORDER BY ip.date_prevue ASC`
  );
};

export const getInspectionsAVenir30j = () => {
  return db.getAllSync(
    `SELECT ip.*, f.nom as fournisseur_nom, f.code as fournisseur_code, f.zone_collecte_code as fournisseur_zone,
            CAST(julianday(ip.date_prevue) - julianday('now') AS INTEGER) as jours_restants
     FROM inspections_planifiees ip
     JOIN fournisseurs f ON f.id = ip.fournisseur_id
     WHERE ip.statut = 'planifiee' 
       AND ip.date_prevue >= date('now') 
       AND ip.date_prevue <= date('now', '+30 days')
     ORDER BY ip.date_prevue ASC`
  );
};

export const getInspectionsPlusTard = () => {
  return db.getAllSync(
    `SELECT ip.*, f.nom as fournisseur_nom, f.code as fournisseur_code, f.zone_collecte_code as fournisseur_zone
     FROM inspections_planifiees ip
     JOIN fournisseurs f ON f.id = ip.fournisseur_id
     WHERE ip.statut = 'planifiee' 
       AND ip.date_prevue > date('now', '+30 days')
     ORDER BY ip.date_prevue ASC`
  );
};

export const getInspectionsRealiseesRecentes = () => {
  return db.getAllSync(
    `SELECT ip.*, f.nom as fournisseur_nom, f.code as fournisseur_code, f.zone_collecte_code as fournisseur_zone
     FROM inspections_planifiees ip
     JOIN fournisseurs f ON f.id = ip.fournisseur_id
     WHERE ip.statut = 'realisee'
     ORDER BY ip.date_prevue DESC
     LIMIT 50`
  );
};

export const getInspectionsReporteesAnnulees = () => {
  return db.getAllSync(
    `SELECT ip.*, f.nom as fournisseur_nom, f.code as fournisseur_code, f.zone_collecte_code as fournisseur_zone
     FROM inspections_planifiees ip
     JOIN fournisseurs f ON f.id = ip.fournisseur_id
     WHERE ip.statut IN ('reportee','annulee')
     ORDER BY ip.date_prevue DESC
     LIMIT 30`
  );
};

// ============================================================
// REQUÊTES PAR FOURNISSEUR
// ============================================================

export const getInspectionsParFournisseur = (fournisseur_id) => {
  return db.getAllSync(
    `SELECT * FROM inspections_planifiees 
     WHERE fournisseur_id = ?
     ORDER BY date_prevue DESC`,
    [fournisseur_id]
  );
};

export const getDerniereInspectionRealisee = (fournisseur_id, referentiel_code) => {
  return db.getFirstSync(
    `SELECT date_prevue FROM inspections_planifiees
     WHERE fournisseur_id = ? AND referentiel_code = ? AND statut = 'realisee'
     ORDER BY date_prevue DESC LIMIT 1`,
    [fournisseur_id, referentiel_code]
  );
};

// ============================================================
// KPI GLOBAUX
// ============================================================

export const getKpiInspections = () => {
  const enRetard = db.getFirstSync(
    `SELECT COUNT(*) as n FROM inspections_planifiees 
     WHERE statut = 'planifiee' AND date_prevue < date('now')`
  );
  const aVenir30j = db.getFirstSync(
    `SELECT COUNT(*) as n FROM inspections_planifiees 
     WHERE statut = 'planifiee' AND date_prevue BETWEEN date('now') AND date('now', '+30 days')`
  );
  const realisees12mois = db.getFirstSync(
    `SELECT COUNT(*) as n FROM inspections_planifiees 
     WHERE statut = 'realisee' AND date_prevue >= date('now', '-12 months')`
  );
  const fournisseursActifs = db.getFirstSync(
    `SELECT COUNT(*) as n FROM fournisseurs WHERE statut = 'actif'`
  );

  return {
    en_retard: enRetard?.n || 0,
    a_venir_30j: aVenir30j?.n || 0,
    realisees_12mois: realisees12mois?.n || 0,
    fournisseurs_actifs: fournisseursActifs?.n || 0,
  };
};