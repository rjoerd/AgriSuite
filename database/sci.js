// database/sci.js
// Système de Contrôle Interne (SCI) — Phase 3 Session 9a
//
// Architecture :
//   - Extension table fournisseurs (existante) avec colonnes SCI
//   - Nouvelle table contrats_producteur (contrat individuel SCI signé)
//   - Nouvelle table parcelles_producteur (cartographie GPS détaillée)
//
// Le SCI est obligatoire pour BIO UE + Fairtrade + Rainforest Alliance dès qu'il y a
// certification de groupe. Sans SCI, pas de certification de groupe possible.

import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('agrisuite.db');

// ============================================================
// CONSTANTES
// ============================================================

export const STATUTS_SCI = [
  'prospect',          // candidat à l'adhésion
  'actif',             // membre actif du SCI
  'suspendu',          // suspension temporaire suite NC
  'exclu',             // exclusion définitive
  'demissionnaire',    // a quitté volontairement
];

export const STATUTS_CONVERSION_BIO = [
  'non_engage',        // pas de démarche BIO
  'C1',                // 1ère année conversion (annuelles)
  'C2',                // 2ème année conversion (annuelles + pérennes)
  'C3',                // 3ème année conversion (pérennes uniquement)
  'certifie',          // certifié BIO
  'sortie',            // sorti du système BIO
];

export const TYPES_CONTRAT = [
  'adhesion_sci',      // contrat d'adhésion au SCI
  'engagement_bio',    // engagement spécifique BIO
  'engagement_ft',     // engagement spécifique Fairtrade
  'engagement_ra',     // engagement spécifique Rainforest
  'engagement_haccp',  // engagement spécifique HACCP
  'avenant',           // modification d'un contrat existant
  'fin_engagement',    // fin de contrat
];

// ============================================================
// INITIALISATION
// ============================================================

export const initSCI = () => {
  // Extension table fournisseurs existante (ajout colonnes SCI)
  // Migration idempotente via try/catch
  const colonnesAjouter = [
    { nom: 'statut_sci', type: "TEXT DEFAULT 'prospect'" },
    { nom: 'date_adhesion_sci', type: 'TEXT' },
    { nom: 'date_sortie_sci', type: 'TEXT' },
    { nom: 'statut_conversion_bio', type: "TEXT DEFAULT 'non_engage'" },
    { nom: 'date_debut_conversion_bio', type: 'TEXT' },
    { nom: 'engagements_actifs', type: 'TEXT' }, // JSON array : ["BIO_UE", "FAIRTRADE_FLO"]
    { nom: 'risque_evalue', type: "TEXT DEFAULT 'a_evaluer'" }, // a_evaluer, faible, moyen, eleve
    { nom: 'derniere_inspection_le', type: 'TEXT' },
    { nom: 'prochaine_inspection_prevue', type: 'TEXT' },
    { nom: 'inspecteur_referent', type: 'TEXT' },
    { nom: 'photo_producteur', type: 'TEXT' }, // chemin photo
    { nom: 'cni_numero', type: 'TEXT' }, // pièce d'identité (audit BIO/FT)
    { nom: 'date_naissance', type: 'TEXT' },
    { nom: 'genre', type: 'TEXT' }, // M/F/autre (statistiques diversité)
    { nom: 'nb_personnes_foyer', type: 'INTEGER' },
    { nom: 'notes_sci', type: 'TEXT' },
  ];

  colonnesAjouter.forEach((col) => {
    try {
      db.execSync(`ALTER TABLE fournisseurs ADD COLUMN ${col.nom} ${col.type};`);
    } catch (e) {
      // Colonne existe déjà — silencieux
    }
  });

  // Table contrats_producteur
  db.execSync(`
    CREATE TABLE IF NOT EXISTS contrats_producteur (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fournisseur_id INTEGER NOT NULL,
      type_contrat TEXT NOT NULL CHECK(type_contrat IN ('adhesion_sci', 'engagement_bio', 'engagement_ft', 'engagement_ra', 'engagement_haccp', 'avenant', 'fin_engagement')),
      reference_referentiel TEXT,
      numero_contrat TEXT,
      date_signature TEXT NOT NULL,
      date_debut TEXT NOT NULL,
      date_fin TEXT,
      objet TEXT NOT NULL,
      contenu TEXT,
      signe_par_producteur INTEGER DEFAULT 0,
      signe_par_operateur INTEGER DEFAULT 0,
      signataire_operateur TEXT,
      chemin_pdf TEXT,
      actif INTEGER DEFAULT 1,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (fournisseur_id) REFERENCES fournisseurs(id) ON DELETE CASCADE
    );
  `);

  // Table parcelles_producteur
  db.execSync(`
    CREATE TABLE IF NOT EXISTS parcelles_producteur (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fournisseur_id INTEGER NOT NULL,
      nom_parcelle TEXT NOT NULL,
      culture_principale TEXT,
      superficie_ha REAL,
      latitude REAL,
      longitude REAL,
      altitude_m INTEGER,
      coordonnees_gps_polygone TEXT,
      zone_collecte_code TEXT,
      commune TEXT,
      district TEXT,
      region TEXT,
      annee_plantation INTEGER,
      densite_plantation REAL,
      type_sol TEXT,
      acces_eau TEXT,
      historique_intrants TEXT,
      proximite_parcelle_conventionnelle INTEGER DEFAULT 0,
      distance_pollution_m INTEGER,
      statut_conversion_bio TEXT DEFAULT 'non_engage',
      date_debut_conversion TEXT,
      derniere_visite_le TEXT,
      photos_terrain TEXT,
      notes TEXT,
      actif INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (fournisseur_id) REFERENCES fournisseurs(id) ON DELETE CASCADE
    );
  `);

  // Index
  db.execSync(`CREATE INDEX IF NOT EXISTS idx_contrats_fournisseur ON contrats_producteur(fournisseur_id);`);
  db.execSync(`CREATE INDEX IF NOT EXISTS idx_contrats_type ON contrats_producteur(type_contrat, actif);`);
  db.execSync(`CREATE INDEX IF NOT EXISTS idx_parcelles_fournisseur ON parcelles_producteur(fournisseur_id);`);
  db.execSync(`CREATE INDEX IF NOT EXISTS idx_parcelles_zone ON parcelles_producteur(zone_collecte_code);`);

  console.log('✅ SCI tables initialisées (Session 9a)');
};

// ============================================================
// CRUD PRODUCTEURS SCI (sur fournisseurs étendus)
// ============================================================

export const getProducteursSCI = (filters = {}) => {
  let query = `SELECT * FROM fournisseurs WHERE 1=1`;
  const params = [];

  if (filters.statut_sci) {
    query += ` AND statut_sci = ?`;
    params.push(filters.statut_sci);
  }
  if (filters.engagement) {
    // Filtre sur JSON array engagements_actifs (LIKE simple)
    query += ` AND engagements_actifs LIKE ?`;
    params.push(`%${filters.engagement}%`);
  }
  if (filters.statut_conversion_bio) {
    query += ` AND statut_conversion_bio = ?`;
    params.push(filters.statut_conversion_bio);
  }
  if (filters.zone_collecte_code) {
    query += ` AND zone_collecte_code = ?`;
    params.push(filters.zone_collecte_code);
  }

  query += ` ORDER BY nom`;
  return db.getAllSync(query, params);
};

export const getProducteurSCI = (id) => {
  const f = db.getFirstSync('SELECT * FROM fournisseurs WHERE id = ?', [id]);
  if (!f) return null;

  // Décode les engagements_actifs JSON
  if (f.engagements_actifs) {
    try { f.engagements_actifs_array = JSON.parse(f.engagements_actifs); }
    catch (e) { f.engagements_actifs_array = []; }
  } else {
    f.engagements_actifs_array = [];
  }
  return f;
};

export const updateProducteurSCI = (id, updates) => {
  // Si engagements_actifs est un array, le sérialiser
  if (Array.isArray(updates.engagements_actifs)) {
    updates.engagements_actifs = JSON.stringify(updates.engagements_actifs);
  }

  const champs = Object.keys(updates);
  if (champs.length === 0) return;

  const setClause = champs.map((c) => `${c} = ?`).join(', ');
  const valeurs = champs.map((c) => updates[c]);
  valeurs.push(id);

  db.runSync(`UPDATE fournisseurs SET ${setClause} WHERE id = ?`, valeurs);
};

export const ajouterEngagementProducteur = (fournisseurId, codeReferentiel) => {
  const f = getProducteurSCI(fournisseurId);
  if (!f) return;

  const engagements = f.engagements_actifs_array || [];
  if (engagements.includes(codeReferentiel)) return;

  engagements.push(codeReferentiel);
  updateProducteurSCI(fournisseurId, { engagements_actifs: engagements });
};

export const retirerEngagementProducteur = (fournisseurId, codeReferentiel) => {
  const f = getProducteurSCI(fournisseurId);
  if (!f) return;

  const engagements = (f.engagements_actifs_array || []).filter((e) => e !== codeReferentiel);
  updateProducteurSCI(fournisseurId, { engagements_actifs: engagements });
};

// ============================================================
// CRUD CONTRATS
// ============================================================

export const creerContrat = (contrat) => {
  const {
    fournisseur_id, type_contrat, reference_referentiel = null,
    numero_contrat = null, date_signature, date_debut, date_fin = null,
    objet, contenu = null,
    signe_par_producteur = 0, signe_par_operateur = 0,
    signataire_operateur = null, chemin_pdf = null, notes = null,
  } = contrat;

  const result = db.runSync(
    `INSERT INTO contrats_producteur (
      fournisseur_id, type_contrat, reference_referentiel,
      numero_contrat, date_signature, date_debut, date_fin,
      objet, contenu, signe_par_producteur, signe_par_operateur,
      signataire_operateur, chemin_pdf, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      fournisseur_id, type_contrat, reference_referentiel,
      numero_contrat, date_signature, date_debut, date_fin,
      objet, contenu, signe_par_producteur, signe_par_operateur,
      signataire_operateur, chemin_pdf, notes,
    ]
  );
  return result.lastInsertRowId;
};

export const updateContrat = (id, updates) => {
  const champs = Object.keys(updates);
  if (champs.length === 0) return;
  const setClause = champs.map((c) => `${c} = ?`).join(', ');
  const valeurs = champs.map((c) => updates[c]);
  valeurs.push(id);
  db.runSync(
    `UPDATE contrats_producteur SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    valeurs
  );
};

export const supprimerContrat = (id) => {
  db.runSync('DELETE FROM contrats_producteur WHERE id = ?', [id]);
};

export const getContratsParProducteur = (fournisseurId) => {
  return db.getAllSync(
    `SELECT * FROM contrats_producteur 
     WHERE fournisseur_id = ? 
     ORDER BY date_signature DESC`,
    [fournisseurId]
  );
};

export const getContratActif = (fournisseurId, typeContrat) => {
  return db.getFirstSync(
    `SELECT * FROM contrats_producteur 
     WHERE fournisseur_id = ? AND type_contrat = ? AND actif = 1
     ORDER BY date_signature DESC LIMIT 1`,
    [fournisseurId, typeContrat]
  );
};

// ============================================================
// CRUD PARCELLES PRODUCTEUR
// ============================================================

export const creerParcelleProducteur = (parcelle) => {
  const champs = Object.keys(parcelle);
  const placeholders = champs.map(() => '?').join(', ');
  const valeurs = champs.map((c) => parcelle[c]);

  const result = db.runSync(
    `INSERT INTO parcelles_producteur (${champs.join(', ')}) VALUES (${placeholders})`,
    valeurs
  );
  return result.lastInsertRowId;
};

export const updateParcelleProducteur = (id, updates) => {
  const champs = Object.keys(updates);
  if (champs.length === 0) return;
  const setClause = champs.map((c) => `${c} = ?`).join(', ');
  const valeurs = champs.map((c) => updates[c]);
  valeurs.push(id);
  db.runSync(
    `UPDATE parcelles_producteur SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    valeurs
  );
};

export const supprimerParcelleProducteur = (id) => {
  db.runSync('DELETE FROM parcelles_producteur WHERE id = ?', [id]);
};

export const getParcellesProducteur = (fournisseurId, actifsUniquement = true) => {
  const query = actifsUniquement
    ? 'SELECT * FROM parcelles_producteur WHERE fournisseur_id = ? AND actif = 1 ORDER BY nom_parcelle'
    : 'SELECT * FROM parcelles_producteur WHERE fournisseur_id = ? ORDER BY nom_parcelle';
  return db.getAllSync(query, [fournisseurId]);
};

export const getParcelleProducteur = (id) => {
  return db.getFirstSync('SELECT * FROM parcelles_producteur WHERE id = ?', [id]);
};

export const getParcellesParZone = (zoneCode) => {
  return db.getAllSync(
    `SELECT p.*, f.nom as nom_producteur, f.code as code_producteur
     FROM parcelles_producteur p
     JOIN fournisseurs f ON p.fournisseur_id = f.id
     WHERE p.zone_collecte_code = ? AND p.actif = 1
     ORDER BY f.nom, p.nom_parcelle`,
    [zoneCode]
  );
};

// ============================================================
// KPI SCI
// ============================================================

export const getKpiSCI = () => {
  const stats = db.getFirstSync(
    `SELECT 
       COUNT(*) as total_producteurs,
       SUM(CASE WHEN statut_sci = 'actif' THEN 1 ELSE 0 END) as actifs,
       SUM(CASE WHEN statut_sci = 'prospect' THEN 1 ELSE 0 END) as prospects,
       SUM(CASE WHEN statut_sci = 'suspendu' THEN 1 ELSE 0 END) as suspendus,
       SUM(CASE WHEN statut_sci = 'exclu' THEN 1 ELSE 0 END) as exclus,
       SUM(CASE WHEN statut_conversion_bio = 'C1' THEN 1 ELSE 0 END) as bio_c1,
       SUM(CASE WHEN statut_conversion_bio = 'C2' THEN 1 ELSE 0 END) as bio_c2,
       SUM(CASE WHEN statut_conversion_bio = 'C3' THEN 1 ELSE 0 END) as bio_c3,
       SUM(CASE WHEN statut_conversion_bio = 'certifie' THEN 1 ELSE 0 END) as bio_certifies,
       SUM(CASE WHEN genre = 'F' THEN 1 ELSE 0 END) as femmes,
       SUM(CASE WHEN genre = 'M' THEN 1 ELSE 0 END) as hommes
     FROM fournisseurs`
  );

  const surfaces = db.getFirstSync(
    `SELECT 
       COUNT(*) as total_parcelles,
       SUM(superficie_ha) as superficie_totale_ha,
       SUM(CASE WHEN statut_conversion_bio = 'certifie' THEN superficie_ha ELSE 0 END) as superficie_bio_ha
     FROM parcelles_producteur WHERE actif = 1`
  );

  return {
    ...stats,
    ...surfaces,
  };
};

// ============================================================
// HELPERS UI
// ============================================================

export const getStatutSCILabel = (statut) => {
  const labels = {
    prospect: 'Prospect',
    actif: 'Actif',
    suspendu: 'Suspendu',
    exclu: 'Exclu',
    demissionnaire: 'Démissionnaire',
  };
  return labels[statut] || statut;
};

export const getStatutSCIColor = (statut) => {
  const colors = {
    prospect: '#7eaac8',
    actif: '#7ec87e',
    suspendu: '#d4a04a',
    exclu: '#cc4444',
    demissionnaire: '#999999',
  };
  return colors[statut] || '#999';
};

export const getStatutConversionLabel = (statut) => {
  const labels = {
    non_engage: 'Non engagé',
    C1: 'Conversion an 1',
    C2: 'Conversion an 2',
    C3: 'Conversion an 3',
    certifie: 'Certifié BIO',
    sortie: 'Sorti BIO',
  };
  return labels[statut] || statut;
};

export const getStatutConversionColor = (statut) => {
  const colors = {
    non_engage: '#999999',
    C1: '#d4a04a',
    C2: '#d4c47e',
    C3: '#a8d9a8',
    certifie: '#2e7d32',
    sortie: '#cc4444',
  };
  return colors[statut] || '#999';
};

export const getTypeContratLabel = (type) => {
  const labels = {
    adhesion_sci: '📋 Adhésion SCI',
    engagement_bio: '🌱 Engagement BIO',
    engagement_ft: '⚖️ Engagement Fairtrade',
    engagement_ra: '🌳 Engagement Rainforest',
    engagement_haccp: '🔬 Engagement HACCP',
    avenant: '✏️ Avenant',
    fin_engagement: '🚪 Fin engagement',
  };
  return labels[type] || type;
};