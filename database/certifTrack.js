// database/certifTrack.js
// CertifTrack v1 — Catalogue référentiels + engagements par lot/site/culture
// Phase 3 Session 7
// Schéma déclaratif : v1 = engagement, v2 = exigences détaillées + alertes, v3 = SCI

import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('agrisuite.db');

// ============================================================
// INITIALISATION DES TABLES
// ============================================================

export const initCertifTrack = () => {
  // Table 1 : catalogue des référentiels de certification
  db.execSync(`
    CREATE TABLE IF NOT EXISTS referentiels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      nom_court TEXT NOT NULL,
      nom_complet TEXT NOT NULL,
      organisme_emetteur TEXT NOT NULL,
      version_reference TEXT,
      pays_origine TEXT,
      type_referentiel TEXT NOT NULL CHECK(type_referentiel IN ('bio', 'equitable', 'durable', 'qualite', 'origine', 'securite_alimentaire')),
      perimetre_produits TEXT,
      duree_conversion_annuelles INTEGER,
      duree_conversion_perennes INTEGER,
      organismes_certificateurs TEXT,
      site_web TEXT,
      description TEXT,
      exige_sci INTEGER DEFAULT 0,
      cout_indicatif_eur TEXT,
      actif INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Table 2 : engagements (un lot/site/culture s'engage sur un référentiel)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS engagements_certif (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referentiel_id INTEGER NOT NULL,
      cible_type TEXT NOT NULL CHECK(cible_type IN ('lot', 'site', 'culture')),
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

  // Table 3 : exigences (squelette v1, rempli en v2)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS exigences_referentiel (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referentiel_id INTEGER NOT NULL,
      code_exigence TEXT NOT NULL,
      categorie TEXT,
      titre TEXT NOT NULL,
      description TEXT,
      criticite TEXT CHECK(criticite IN ('majeure', 'mineure', 'recommandation')),
      preuve_attendue TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (referentiel_id) REFERENCES referentiels(id)
    );
  `);

  // Index pour performance
  db.execSync(`CREATE INDEX IF NOT EXISTS idx_engagements_cible ON engagements_certif(cible_type, cible_id);`);
  db.execSync(`CREATE INDEX IF NOT EXISTS idx_engagements_referentiel ON engagements_certif(referentiel_id);`);

  console.log('✅ CertifTrack tables initialisées');
};

// ============================================================
// CRUD RÉFÉRENTIELS
// ============================================================

export const getReferentiels = (actifsUniquement = true) => {
  const query = actifsUniquement
    ? 'SELECT * FROM referentiels WHERE actif = 1 ORDER BY type_referentiel, nom_court'
    : 'SELECT * FROM referentiels ORDER BY type_referentiel, nom_court';
  return db.getAllSync(query);
};

export const getReferentielById = (id) => {
  return db.getFirstSync('SELECT * FROM referentiels WHERE id = ?', [id]);
};

export const getReferentielByCode = (code) => {
  return db.getFirstSync('SELECT * FROM referentiels WHERE code = ?', [code]);
};

// ============================================================
// CRUD ENGAGEMENTS
// ============================================================

export const creerEngagement = (engagement) => {
  const {
    referentiel_id,
    cible_type,
    cible_id,
    statut = 'vise',
    date_engagement,
    date_debut_conversion = null,
    organisme_certificateur = null,
    notes = null,
  } = engagement;

  const result = db.runSync(
    `INSERT INTO engagements_certif 
     (referentiel_id, cible_type, cible_id, statut, date_engagement, date_debut_conversion, organisme_certificateur, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [referentiel_id, cible_type, cible_id, statut, date_engagement, date_debut_conversion, organisme_certificateur, notes]
  );
  return result.lastInsertRowId;
};

export const updateEngagement = (id, updates) => {
  const champs = [];
  const valeurs = [];

  Object.keys(updates).forEach((key) => {
    champs.push(`${key} = ?`);
    valeurs.push(updates[key]);
  });

  champs.push('updated_at = CURRENT_TIMESTAMP');
  valeurs.push(id);

  db.runSync(
    `UPDATE engagements_certif SET ${champs.join(', ')} WHERE id = ?`,
    valeurs
  );
};

export const supprimerEngagement = (id) => {
  db.runSync('DELETE FROM engagements_certif WHERE id = ?', [id]);
};

// Engagements pour une cible précise (lot, site, culture)
export const getEngagementsForCible = (cible_type, cible_id) => {
  return db.getAllSync(
    `SELECT 
       e.*,
       r.code as ref_code,
       r.nom_court as ref_nom_court,
       r.nom_complet as ref_nom_complet,
       r.type_referentiel as ref_type,
       r.organisme_emetteur as ref_organisme,
       r.exige_sci as ref_exige_sci
     FROM engagements_certif e
     JOIN referentiels r ON e.referentiel_id = r.id
     WHERE e.cible_type = ? AND e.cible_id = ?
     ORDER BY r.type_referentiel, r.nom_court`,
    [cible_type, cible_id]
  );
};

// Tous les engagements actifs (pour dashboard)
export const getAllEngagements = () => {
  return db.getAllSync(
    `SELECT 
       e.*,
       r.code as ref_code,
       r.nom_court as ref_nom_court,
       r.nom_complet as ref_nom_complet,
       r.type_referentiel as ref_type
     FROM engagements_certif e
     JOIN referentiels r ON e.referentiel_id = r.id
     ORDER BY e.created_at DESC`
  );
};

// Stats engagements par référentiel (pour CertifTrackHomeScreen)
export const getStatsEngagementsParReferentiel = () => {
  return db.getAllSync(
    `SELECT 
       r.id as referentiel_id,
       r.code,
       r.nom_court,
       r.nom_complet,
       r.type_referentiel,
       COUNT(e.id) as nb_engagements,
       SUM(CASE WHEN e.statut = 'vise' THEN 1 ELSE 0 END) as nb_vises,
       SUM(CASE WHEN e.statut = 'en_conversion' THEN 1 ELSE 0 END) as nb_conversion,
       SUM(CASE WHEN e.statut = 'certifie' THEN 1 ELSE 0 END) as nb_certifies
     FROM referentiels r
     LEFT JOIN engagements_certif e ON r.id = e.referentiel_id
     WHERE r.actif = 1
     GROUP BY r.id
     ORDER BY r.type_referentiel, r.nom_court`
  );
};

// Compteurs globaux pour KPI dashboard
export const getKpiCertifTrack = () => {
  const stats = db.getFirstSync(
    `SELECT 
       COUNT(DISTINCT e.id) as total_engagements,
       SUM(CASE WHEN e.statut = 'vise' THEN 1 ELSE 0 END) as total_vises,
       SUM(CASE WHEN e.statut = 'en_conversion' THEN 1 ELSE 0 END) as total_conversion,
       SUM(CASE WHEN e.statut = 'certifie' THEN 1 ELSE 0 END) as total_certifies,
       COUNT(DISTINCT CASE WHEN e.cible_type = 'lot' THEN e.cible_id END) as lots_engages,
       COUNT(DISTINCT CASE WHEN e.cible_type = 'site' THEN e.cible_id END) as sites_engages,
       COUNT(DISTINCT CASE WHEN e.cible_type = 'culture' THEN e.cible_id END) as cultures_engagees
     FROM engagements_certif e`
  );
  return stats || {
    total_engagements: 0,
    total_vises: 0,
    total_conversion: 0,
    total_certifies: 0,
    lots_engages: 0,
    sites_engages: 0,
    cultures_engagees: 0,
  };
};

// ============================================================
// HELPERS UI
// ============================================================

export const getStatutLabel = (statut) => {
  const labels = {
    vise: 'Visé',
    en_conversion: 'En conversion',
    certifie: 'Certifié',
    suspendu: 'Suspendu',
    abandonne: 'Abandonné',
  };
  return labels[statut] || statut;
};

export const getStatutColor = (statut) => {
  const colors = {
    vise: '#d4a04a',         // amber
    en_conversion: '#7ec87e', // vert clair
    certifie: '#2e7d32',      // vert foncé
    suspendu: '#999999',      // gris
    abandonne: '#cc4444',     // rouge
  };
  return colors[statut] || '#999999';
};

export const getTypeReferentielLabel = (type) => {
  const labels = {
    bio: 'Agriculture biologique',
    equitable: 'Commerce équitable',
    durable: 'Agriculture durable',
    qualite: 'Qualité / Spécialité',
    origine: 'Origine / Terroir',
    securite_alimentaire: 'Sécurité alimentaire',
  };
  return labels[type] || type;
};

export const getTypeReferentielColor = (type) => {
  const colors = {
    bio: '#7ec87e',
    equitable: '#d4a04a',
    durable: '#5fa96f',
    qualite: '#8b6f47',
    origine: '#a86b3c',
    securite_alimentaire: '#c0392b',
  };
  return colors[type] || '#999999';
};