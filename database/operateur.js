// database/operateur.js
// Phase 3 Session 9d1 + 9d2 — Entité Opérateur (l'exportateur lui-même)
//
// Session 9d1 : table operateur, migrations, helpers niveaux exigences
// Session 9d2 : helpers pour audit blanc opérateur (engagements + filtrage par niveau)

import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('agrisuite.db');

// ============================================================
// INITIALISATION TABLE OPÉRATEUR
// ============================================================

export const initOperateur = () => {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS operateur (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom_legal TEXT NOT NULL,
      nom_commercial TEXT,
      forme_juridique TEXT,
      nif TEXT,
      stat TEXT,
      rcs TEXT,
      adresse_siege TEXT,
      ville TEXT,
      pays TEXT DEFAULT 'Madagascar',
      telephone TEXT,
      email TEXT,
      site_web TEXT,
      responsable_qualite_nom TEXT,
      responsable_qualite_telephone TEXT,
      responsable_qualite_email TEXT,
      date_creation_entreprise TEXT,
      effectif_total INTEGER,
      effectif_permanent INTEGER,
      effectif_saisonnier INTEGER,
      activites_principales TEXT,
      marches_cibles TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✅ Table operateur initialisée');
};

// ============================================================
// MIGRATION SCHEMA (9d1 — INCHANGÉ)
// ============================================================

export const migrateOperateurSchema = () => {
  try {
    db.execSync(`
      ALTER TABLE exigences_referentiel
      ADD COLUMN niveau_application TEXT
        CHECK(niveau_application IN ('operateur', 'site', 'lot', 'fournisseur', 'multi'))
        DEFAULT 'multi';
    `);
    console.log('✅ Colonne niveau_application ajoutée à exigences_referentiel');
  } catch (err) {
    if (!String(err.message || err).includes('duplicate column')) {
      console.log('ℹ️ niveau_application déjà présente ou erreur:', err.message);
    }
  }

  const tableInfo = db.getAllSync(`PRAGMA table_info(engagements_certif)`);
  if (tableInfo.length === 0) return;

  const migrationDone = db.getFirstSync(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name='_migration_operateur_done'
  `);
  if (migrationDone) {
    console.log('ℹ️ Migration cible_type opérateur déjà appliquée');
    return;
  }

  console.log('🔄 Migration de engagements_certif pour cible_type=operateur...');
  try {
    db.execSync(`BEGIN TRANSACTION;`);
    db.execSync(`ALTER TABLE engagements_certif RENAME TO engagements_certif_old;`);
    db.execSync(`
      CREATE TABLE engagements_certif (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        referentiel_id INTEGER NOT NULL,
        cible_type TEXT NOT NULL CHECK(cible_type IN ('lot', 'site', 'culture', 'fournisseur', 'operateur')),
        cible_id INTEGER NOT NULL,
        statut TEXT NOT NULL DEFAULT 'vise' CHECK(statut IN ('vise', 'en_conversion', 'certifie', 'suspendu', 'abandonne')),
        date_engagement TEXT NOT NULL,
        date_debut_conversion TEXT,
        date_certification TEXT,
        date_expiration TEXT,
        numero_certificat TEXT,
        organisme_certificateur TEXT,
        annee_conversion INTEGER,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (referentiel_id) REFERENCES referentiels(id)
      );
    `);
    db.execSync(`INSERT INTO engagements_certif SELECT * FROM engagements_certif_old;`);
    db.execSync(`DROP TABLE engagements_certif_old;`);
    db.execSync(`CREATE INDEX IF NOT EXISTS idx_engagements_cible ON engagements_certif(cible_type, cible_id);`);
    db.execSync(`CREATE INDEX IF NOT EXISTS idx_engagements_referentiel ON engagements_certif(referentiel_id);`);
    db.execSync(`CREATE TABLE _migration_operateur_done (done INTEGER);`);
    db.runSync(`INSERT INTO _migration_operateur_done VALUES (1);`);
    db.execSync(`COMMIT;`);
    console.log('✅ Migration engagements_certif terminée');
  } catch (err) {
    db.execSync(`ROLLBACK;`);
    console.error('❌ Erreur migration engagements_certif:', err);
  }
};

// ============================================================
// SEED OPÉRATEUR INITIAL
// ============================================================

export const seedOperateur = () => {
  const existing = db.getFirstSync(`SELECT COUNT(*) as n FROM operateur`);
  if (existing && existing.n > 0) {
    console.log('ℹ️ Opérateur déjà seedé');
    return;
  }
  db.runSync(
    `INSERT INTO operateur (
      nom_legal, nom_commercial, pays, activites_principales, marches_cibles
    ) VALUES (?, ?, ?, ?, ?)`,
    [
      'AgriSuite Madagascar',
      'AgriSuite',
      'Madagascar',
      'Production agroforestière + collecte-export produits malgaches',
      'UE (BIO Ecocert) — USA — Japon (à confirmer)',
    ]
  );
  console.log('✅ Opérateur initial seedé');
};

// ============================================================
// CRUD OPÉRATEUR
// ============================================================

export const getOperateur = () => {
  return db.getFirstSync(`SELECT * FROM operateur ORDER BY id LIMIT 1`);
};

export const updateOperateur = (id, updates) => {
  const champs = [];
  const valeurs = [];
  Object.keys(updates).forEach((key) => {
    champs.push(`${key} = ?`);
    valeurs.push(updates[key]);
  });
  champs.push('updated_at = CURRENT_TIMESTAMP');
  valeurs.push(id);
  db.runSync(
    `UPDATE operateur SET ${champs.join(', ')} WHERE id = ?`,
    valeurs
  );
};

// ============================================================
// HELPERS NIVEAUX EXIGENCES
// ============================================================

export const NIVEAUX_LABELS = {
  operateur: '🏢 Opérateur',
  site: '🗺️ Site',
  lot: '📦 Lot',
  fournisseur: '👤 Fournisseur',
  multi: '🔁 Multi-niveaux',
};

export const NIVEAUX_DESCRIPTION = {
  operateur: 'Système qualité global de l\'entreprise — une seule réponse pour toute l\'opération',
  site: 'Spécifique à un site de production — une réponse par site',
  lot: 'Spécifique à un lot de produit — une réponse par lot',
  fournisseur: 'Spécifique à un producteur tiers — une réponse par fournisseur',
  multi: 'Applicable à plusieurs niveaux selon le contexte',
};

export const getExigencesParNiveau = (referentielId, niveau) => {
  return db.getAllSync(
    `SELECT * FROM exigences_referentiel
     WHERE referentiel_id = ? AND (niveau_application = ? OR niveau_application = 'multi')
     ORDER BY criticite DESC, code_exigence`,
    [referentielId, niveau]
  );
};

export const getCountExigencesParNiveau = (referentielId) => {
  return db.getFirstSync(
    `SELECT
       SUM(CASE WHEN niveau_application = 'operateur' THEN 1 ELSE 0 END) as nb_operateur,
       SUM(CASE WHEN niveau_application = 'site' THEN 1 ELSE 0 END) as nb_site,
       SUM(CASE WHEN niveau_application = 'lot' THEN 1 ELSE 0 END) as nb_lot,
       SUM(CASE WHEN niveau_application = 'fournisseur' THEN 1 ELSE 0 END) as nb_fournisseur,
       SUM(CASE WHEN niveau_application = 'multi' THEN 1 ELSE 0 END) as nb_multi,
       COUNT(*) as total
     FROM exigences_referentiel
     WHERE referentiel_id = ?`,
    [referentielId]
  );
};

// ============================================================
// 🆕 SESSION 9d2 — HELPERS AUDIT OPÉRATEUR
// ============================================================

/**
 * Récupère tous les engagements de l'opérateur avec infos référentiel,
 * + count exigences niveau opérateur + count statuts conformes.
 */
export const getEngagementsOperateur = (operateurId) => {
  return db.getAllSync(
    `SELECT
       e.id, e.referentiel_id, e.statut, e.date_engagement,
       e.date_debut_conversion, e.date_certification, e.numero_certificat,
       e.organisme_certificateur,
       r.code as ref_code,
       r.nom_court as ref_nom_court,
       r.nom_complet as ref_nom_complet,
       r.type_referentiel as ref_type,
       (SELECT COUNT(*) FROM exigences_referentiel ex
          WHERE ex.referentiel_id = r.id
          AND ex.niveau_application = 'operateur') as nb_exigences_operateur,
       (SELECT COUNT(*) FROM statuts_exigences s
          INNER JOIN exigences_referentiel ex ON ex.id = s.exigence_id
          WHERE s.engagement_id = e.id
          AND ex.niveau_application = 'operateur'
          AND s.statut = 'conforme') as nb_conformes_operateur,
       (SELECT COUNT(*) FROM statuts_exigences s
          INNER JOIN exigences_referentiel ex ON ex.id = s.exigence_id
          WHERE s.engagement_id = e.id
          AND ex.niveau_application = 'operateur'
          AND s.statut = 'non_conforme'
          AND ex.criticite = 'majeure') as nb_nc_majeures
     FROM engagements_certif e
     INNER JOIN referentiels r ON r.id = e.referentiel_id
     WHERE e.cible_type = 'operateur' AND e.cible_id = ?
     ORDER BY r.type_referentiel, r.nom_court`,
    [operateurId]
  );
};

/**
 * Liste les référentiels pas encore engagés sur l'opérateur (pour le bouton "Ajouter").
 */
export const getReferentielsNonEngagesOperateur = (operateurId) => {
  return db.getAllSync(
    `SELECT r.* FROM referentiels r
     WHERE r.actif = 1
     AND r.id NOT IN (
       SELECT referentiel_id FROM engagements_certif
       WHERE cible_type = 'operateur' AND cible_id = ?
     )
     ORDER BY r.type_referentiel, r.nom_court`,
    [operateurId]
  );
};