// database/certifTrack.js
// CertifTrack v2 — Session 8 : exigences atomiques + preuves + alertes conformité
// Phase 3 Session 8
//
// Évolution depuis Session 7 :
//   - Table exigences_referentiel : enrichie (categorie + criticite alignées)
//   - Nouvelle table statuts_exigences : statut conformité par engagement × exigence
//   - Nouvelle table preuves_engagement : preuves typées liées aux exigences
//   - Nouvelle table alertes_conformite : alertes auto générées par le moteur
//   - Nouveaux CRUD : exigences, statuts, preuves, alertes, score préparation audit

import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('certifpilot.db');

// ============================================================
// CONSTANTES
// ============================================================

export const CATEGORIES_EXIGENCES = [
  'tracabilite',
  'intrants',
  'pratiques_culturales',
  'gestion_post_recolte',
  'qualite_securite',
  'social_travail',
  'gouvernance',
  'environnement',
  'documentation',
];

export const CRITICITES = ['majeure', 'mineure', 'recommandation'];

export const STATUTS_EXIGENCE = [
  'a_verifier',
  'conforme',
  'non_conforme',
  'non_applicable',
];

export const TYPES_PREUVE = [
  'analyse_qualite',
  'etape_lot',
  'fournisseur',
  'lot',
  'parcelle',
  'document_externe',
  'attestation',
  'observation',
];

// ============================================================
// INITIALISATION DES TABLES
// ============================================================

export const initCertifTrack = () => {
  // Table 1 : catalogue référentiels (Session 7 — inchangée)
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

  // Table 2 : engagements (Session 7 — inchangée)
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

  // Table 3 : exigences atomiques par référentiel (Session 8 — enrichie)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS exigences_referentiel (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referentiel_id INTEGER NOT NULL,
      code_exigence TEXT NOT NULL,
      categorie TEXT NOT NULL,
      titre TEXT NOT NULL,
      description TEXT,
      criticite TEXT CHECK(criticite IN ('majeure', 'mineure', 'recommandation')),
      preuve_attendue TEXT,
      reference_officielle TEXT,
      auto_verifiable INTEGER DEFAULT 0,
      regle_auto_code TEXT,
      ordre INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (referentiel_id) REFERENCES referentiels(id)
    );
  `);

  // Table 4 : statut conformité par exigence × engagement (Session 8)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS statuts_exigences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      engagement_id INTEGER NOT NULL,
      exigence_id INTEGER NOT NULL,
      statut TEXT NOT NULL DEFAULT 'a_verifier' CHECK(statut IN ('a_verifier', 'conforme', 'non_conforme', 'non_applicable')),
      verifie_par TEXT,
      date_verification TEXT,
      commentaire TEXT,
      auto_genere INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(engagement_id, exigence_id),
      FOREIGN KEY (engagement_id) REFERENCES engagements_certif(id) ON DELETE CASCADE,
      FOREIGN KEY (exigence_id) REFERENCES exigences_referentiel(id)
    );
  `);

  // Table 5 : preuves typées (Session 8)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS preuves_engagement (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      engagement_id INTEGER NOT NULL,
      exigence_id INTEGER NOT NULL,
      type_preuve TEXT NOT NULL CHECK(type_preuve IN ('analyse_qualite', 'etape_lot', 'fournisseur', 'lot', 'parcelle', 'document_externe', 'attestation', 'observation')),
      reference_id INTEGER,
      titre TEXT NOT NULL,
      description TEXT,
      url_externe TEXT,
      chemin_fichier TEXT,
      saisi_par TEXT,
      date_preuve TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (engagement_id) REFERENCES engagements_certif(id) ON DELETE CASCADE,
      FOREIGN KEY (exigence_id) REFERENCES exigences_referentiel(id)
    );
  `);

  // Table 6 : alertes conformité auto-générées (Session 8)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS alertes_conformite (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      engagement_id INTEGER NOT NULL,
      exigence_id INTEGER,
      regle_code TEXT NOT NULL,
      severite TEXT NOT NULL CHECK(severite IN ('critique', 'avertissement', 'info')),
      titre TEXT NOT NULL,
      message TEXT NOT NULL,
      donnees_contexte TEXT,
      statut TEXT NOT NULL DEFAULT 'active' CHECK(statut IN ('active', 'acquittee', 'resolue')),
      acquittee_par TEXT,
      acquittee_le TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (engagement_id) REFERENCES engagements_certif(id) ON DELETE CASCADE
    );
  `);

  // Index pour performance
  db.execSync(`CREATE INDEX IF NOT EXISTS idx_engagements_cible ON engagements_certif(cible_type, cible_id);`);
  db.execSync(`CREATE INDEX IF NOT EXISTS idx_engagements_referentiel ON engagements_certif(referentiel_id);`);
  db.execSync(`CREATE INDEX IF NOT EXISTS idx_exigences_referentiel ON exigences_referentiel(referentiel_id);`);
  db.execSync(`CREATE INDEX IF NOT EXISTS idx_exigences_categorie ON exigences_referentiel(categorie);`);
  db.execSync(`CREATE INDEX IF NOT EXISTS idx_statuts_engagement ON statuts_exigences(engagement_id);`);
  db.execSync(`CREATE INDEX IF NOT EXISTS idx_preuves_engagement ON preuves_engagement(engagement_id, exigence_id);`);
  db.execSync(`CREATE INDEX IF NOT EXISTS idx_alertes_engagement ON alertes_conformite(engagement_id, statut);`);

  console.log('✅ CertifTrack tables initialisées (v2 Session 8)');
};

// ============================================================
// CRUD RÉFÉRENTIELS (Session 7 — inchangé)
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
// CRUD ENGAGEMENTS (Session 7 — inchangé)
// ============================================================

export const creerEngagement = (engagement) => {
  const {
    referentiel_id, cible_type, cible_id, statut = 'vise',
    date_engagement, date_debut_conversion = null,
    organisme_certificateur = null, notes = null,
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

export const getEngagementsForCible = (cible_type, cible_id) => {
  return db.getAllSync(
    `SELECT 
       e.*, r.code as ref_code, r.nom_court as ref_nom_court,
       r.nom_complet as ref_nom_complet, r.type_referentiel as ref_type,
       r.organisme_emetteur as ref_organisme, r.exige_sci as ref_exige_sci
     FROM engagements_certif e
     JOIN referentiels r ON e.referentiel_id = r.id
     WHERE e.cible_type = ? AND e.cible_id = ?
     ORDER BY r.type_referentiel, r.nom_court`,
    [cible_type, cible_id]
  );
};

export const getAllEngagements = () => {
  return db.getAllSync(
    `SELECT 
       e.*, r.code as ref_code, r.nom_court as ref_nom_court,
       r.nom_complet as ref_nom_complet, r.type_referentiel as ref_type
     FROM engagements_certif e
     JOIN referentiels r ON e.referentiel_id = r.id
     ORDER BY e.created_at DESC`
  );
};

export const getStatsEngagementsParReferentiel = () => {
  return db.getAllSync(
    `SELECT 
       r.id as referentiel_id, r.code, r.nom_court, r.nom_complet,
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
    total_engagements: 0, total_vises: 0, total_conversion: 0,
    total_certifies: 0, lots_engages: 0, sites_engages: 0, cultures_engagees: 0,
  };
};

// ============================================================
// NOUVEAU SESSION 8 — CRUD EXIGENCES
// ============================================================

export const getExigencesByReferentiel = (referentielId) => {
  return db.getAllSync(
    `SELECT * FROM exigences_referentiel 
     WHERE referentiel_id = ? 
     ORDER BY categorie, ordre, code_exigence`,
    [referentielId]
  );
};

export const getExigenceById = (id) => {
  return db.getFirstSync(
    'SELECT * FROM exigences_referentiel WHERE id = ?',
    [id]
  );
};

export const countExigencesByReferentiel = (referentielId) => {
  const r = db.getFirstSync(
    'SELECT COUNT(*) as nb FROM exigences_referentiel WHERE referentiel_id = ?',
    [referentielId]
  );
  return r?.nb || 0;
};

// ============================================================
// NOUVEAU SESSION 8 — CRUD STATUTS EXIGENCES
// ============================================================

// Récupère TOUTES les exigences d'un engagement avec leur statut éventuel
export const getStatutsByEngagement = (engagementId, niveau = null) => {
  let whereNiveau = '';
  let params = [engagementId, engagementId];

  if (niveau) {
    // Inclut le niveau demandé + 'multi' (applicable partout)
    whereNiveau = ` AND (ex.niveau_application = ? OR ex.niveau_application = 'multi')`;
    params.push(niveau);
  }

  return db.getAllSync(
    `SELECT 
       ex.id as exigence_id,
       ex.code_exigence, ex.categorie, ex.titre, ex.description,
       ex.criticite, ex.preuve_attendue, ex.reference_officielle,
       ex.auto_verifiable, ex.regle_auto_code, ex.ordre,
       ex.niveau_application,
       s.id as statut_id, s.statut, s.verifie_par, s.date_verification,
       s.commentaire, s.auto_genere
     FROM exigences_referentiel ex
     INNER JOIN engagements_certif e ON e.id = ?
     LEFT JOIN statuts_exigences s ON s.exigence_id = ex.id AND s.engagement_id = ?
     WHERE ex.referentiel_id = e.referentiel_id${whereNiveau}
     ORDER BY ex.categorie, ex.ordre, ex.code_exigence`,
    params
  );
};

// Upsert : crée ou met à jour le statut d'une exigence pour un engagement
export const setStatutExigence = (engagementId, exigenceId, statut, options = {}) => {
  const {
    verifie_par = null,
    commentaire = null,
    auto_genere = 0,
  } = options;
  const date_verification = new Date().toISOString().split('T')[0];

  const existing = db.getFirstSync(
    'SELECT id FROM statuts_exigences WHERE engagement_id = ? AND exigence_id = ?',
    [engagementId, exigenceId]
  );

  if (existing) {
    db.runSync(
      `UPDATE statuts_exigences 
       SET statut = ?, verifie_par = ?, date_verification = ?, 
           commentaire = ?, auto_genere = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [statut, verifie_par, date_verification, commentaire, auto_genere, existing.id]
    );
    return existing.id;
  } else {
    const result = db.runSync(
      `INSERT INTO statuts_exigences 
       (engagement_id, exigence_id, statut, verifie_par, date_verification, commentaire, auto_genere)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [engagementId, exigenceId, statut, verifie_par, date_verification, commentaire, auto_genere]
    );
    return result.lastInsertRowId;
  }
};

// Score de préparation à l'audit pour un engagement
export const getScoreEngagement = (engagementId) => {
  const stats = db.getFirstSync(
    `SELECT 
       COUNT(ex.id) as total_exigences,
       SUM(CASE WHEN s.statut = 'conforme' THEN 1 ELSE 0 END) as nb_conformes,
       SUM(CASE WHEN s.statut = 'non_conforme' THEN 1 ELSE 0 END) as nb_non_conformes,
       SUM(CASE WHEN s.statut = 'a_verifier' OR s.statut IS NULL THEN 1 ELSE 0 END) as nb_a_verifier,
       SUM(CASE WHEN s.statut = 'non_applicable' THEN 1 ELSE 0 END) as nb_na,
       SUM(CASE WHEN s.statut = 'non_conforme' AND ex.criticite = 'majeure' THEN 1 ELSE 0 END) as nb_nc_majeures,
       SUM(CASE WHEN s.statut = 'non_conforme' AND ex.criticite = 'mineure' THEN 1 ELSE 0 END) as nb_nc_mineures
     FROM exigences_referentiel ex
     INNER JOIN engagements_certif e ON e.id = ?
     LEFT JOIN statuts_exigences s ON s.exigence_id = ex.id AND s.engagement_id = ?
     WHERE ex.referentiel_id = e.referentiel_id`,
    [engagementId, engagementId]
  );
  return stats || {
    total_exigences: 0, nb_conformes: 0, nb_non_conformes: 0,
    nb_a_verifier: 0, nb_na: 0, nb_nc_majeures: 0, nb_nc_mineures: 0,
  };
};

// ============================================================
// NOUVEAU SESSION 8 — CRUD PREUVES
// ============================================================

export const creerPreuve = (preuve) => {
  const {
    engagement_id, exigence_id, type_preuve, reference_id = null,
    titre, description = null, url_externe = null, chemin_fichier = null,
    saisi_par = null, date_preuve = null,
  } = preuve;
  const result = db.runSync(
    `INSERT INTO preuves_engagement 
     (engagement_id, exigence_id, type_preuve, reference_id, titre, description, url_externe, chemin_fichier, saisi_par, date_preuve)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [engagement_id, exigence_id, type_preuve, reference_id, titre, description, url_externe, chemin_fichier, saisi_par, date_preuve]
  );
  return result.lastInsertRowId;
};

export const supprimerPreuve = (id) => {
  db.runSync('DELETE FROM preuves_engagement WHERE id = ?', [id]);
};

export const getPreuvesByExigence = (engagementId, exigenceId) => {
  return db.getAllSync(
    `SELECT * FROM preuves_engagement 
     WHERE engagement_id = ? AND exigence_id = ?
     ORDER BY created_at DESC`,
    [engagementId, exigenceId]
  );
};

export const getPreuvesByEngagement = (engagementId) => {
  return db.getAllSync(
    `SELECT 
       p.*, ex.code_exigence, ex.titre as exigence_titre, ex.categorie
     FROM preuves_engagement p
     JOIN exigences_referentiel ex ON p.exigence_id = ex.id
     WHERE p.engagement_id = ?
     ORDER BY p.created_at DESC`,
    [engagementId]
  );
};

export const countPreuvesByExigence = (engagementId, exigenceId) => {
  const r = db.getFirstSync(
    'SELECT COUNT(*) as nb FROM preuves_engagement WHERE engagement_id = ? AND exigence_id = ?',
    [engagementId, exigenceId]
  );
  return r?.nb || 0;
};

// ============================================================
// NOUVEAU SESSION 8 — CRUD ALERTES CONFORMITÉ
// ============================================================

export const creerAlerte = (alerte) => {
  const {
    engagement_id, exigence_id = null, regle_code, severite,
    titre, message, donnees_contexte = null,
  } = alerte;

  // Anti-doublon : si une alerte active existe déjà avec mêmes engagement+règle+exigence
  const existing = db.getFirstSync(
    `SELECT id FROM alertes_conformite 
     WHERE engagement_id = ? AND regle_code = ? 
     AND ((exigence_id IS NULL AND ? IS NULL) OR exigence_id = ?)
     AND statut = 'active'`,
    [engagement_id, regle_code, exigence_id, exigence_id]
  );
  if (existing) return existing.id;

  const ctxJson = donnees_contexte ? JSON.stringify(donnees_contexte) : null;
  const result = db.runSync(
    `INSERT INTO alertes_conformite 
     (engagement_id, exigence_id, regle_code, severite, titre, message, donnees_contexte)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [engagement_id, exigence_id, regle_code, severite, titre, message, ctxJson]
  );
  return result.lastInsertRowId;
};

export const acquitterAlerte = (id, acquittee_par) => {
  const date = new Date().toISOString().split('T')[0];
  db.runSync(
    `UPDATE alertes_conformite 
     SET statut = 'acquittee', acquittee_par = ?, acquittee_le = ?
     WHERE id = ?`,
    [acquittee_par, date, id]
  );
};

export const resoudreAlerte = (id) => {
  db.runSync(`UPDATE alertes_conformite SET statut = 'resolue' WHERE id = ?`, [id]);
};

export const getAlertesActivesByEngagement = (engagementId) => {
  return db.getAllSync(
    `SELECT * FROM alertes_conformite 
     WHERE engagement_id = ? AND statut = 'active'
     ORDER BY 
       CASE severite WHEN 'critique' THEN 1 WHEN 'avertissement' THEN 2 ELSE 3 END,
       created_at DESC`,
    [engagementId]
  );
};

export const getToutesAlertesActives = () => {
  return db.getAllSync(
    `SELECT 
       a.*, e.cible_type, e.cible_id, r.nom_court as ref_nom_court
     FROM alertes_conformite a
     JOIN engagements_certif e ON a.engagement_id = e.id
     JOIN referentiels r ON e.referentiel_id = r.id
     WHERE a.statut = 'active'
     ORDER BY 
       CASE a.severite WHEN 'critique' THEN 1 WHEN 'avertissement' THEN 2 ELSE 3 END,
       a.created_at DESC`
  );
};

export const countAlertesActives = () => {
  const r = db.getFirstSync(
    `SELECT 
       COUNT(*) as total,
       SUM(CASE WHEN severite = 'critique' THEN 1 ELSE 0 END) as critiques,
       SUM(CASE WHEN severite = 'avertissement' THEN 1 ELSE 0 END) as avertissements
     FROM alertes_conformite WHERE statut = 'active'`
  );
  return r || { total: 0, critiques: 0, avertissements: 0 };
};

// ============================================================
// HELPERS UI
// ============================================================

export const getStatutLabel = (statut) => {
  const labels = {
    vise: 'Visé', en_conversion: 'En conversion', certifie: 'Certifié',
    suspendu: 'Suspendu', abandonne: 'Abandonné',
  };
  return labels[statut] || statut;
};

export const getStatutColor = (statut) => {
  const colors = {
    vise: '#d4a04a', en_conversion: '#7ec87e', certifie: '#2e7d32',
    suspendu: '#999999', abandonne: '#cc4444',
  };
  return colors[statut] || '#999999';
};

export const getTypeReferentielLabel = (type) => {
  const labels = {
    bio: 'Agriculture biologique', equitable: 'Commerce équitable',
    durable: 'Agriculture durable', qualite: 'Qualité / Spécialité',
    origine: 'Origine / Terroir', securite_alimentaire: 'Sécurité alimentaire',
  };
  return labels[type] || type;
};

export const getTypeReferentielColor = (type) => {
  const colors = {
    bio: '#7ec87e', equitable: '#d4a04a', durable: '#5fa96f',
    qualite: '#8b6f47', origine: '#a86b3c', securite_alimentaire: '#c0392b',
  };
  return colors[type] || '#999999';
};

// Nouveaux helpers Session 8

export const getCategorieLabel = (categorie) => {
  const labels = {
    tracabilite: '🔗 Traçabilité',
    intrants: '🧪 Intrants',
    pratiques_culturales: '🌱 Pratiques culturales',
    gestion_post_recolte: '📦 Gestion post-récolte',
    qualite_securite: '🔬 Qualité & sécurité',
    social_travail: '👥 Social & travail',
    gouvernance: '🏛️ Gouvernance',
    environnement: '🌍 Environnement',
    documentation: '📄 Documentation',
  };
  return labels[categorie] || categorie;
};

export const getCriticiteLabel = (criticite) => {
  const labels = {
    majeure: 'Majeure',
    mineure: 'Mineure',
    recommandation: 'Recommandation',
  };
  return labels[criticite] || criticite;
};

export const getCriticiteColor = (criticite) => {
  const colors = {
    majeure: '#cc4444',
    mineure: '#d4a04a',
    recommandation: '#7eaac8',
  };
  return colors[criticite] || '#999';
};

export const getStatutExigenceLabel = (statut) => {
  const labels = {
    a_verifier: 'À vérifier',
    conforme: 'Conforme',
    non_conforme: 'Non conforme',
    non_applicable: 'Non applicable',
  };
  return labels[statut] || statut;
};

export const getStatutExigenceColor = (statut) => {
  const colors = {
    a_verifier: '#8a9a8a',
    conforme: '#7ec87e',
    non_conforme: '#cc4444',
    non_applicable: '#666666',
  };
  return colors[statut] || '#999';
};

export const getStatutExigenceIcone = (statut) => {
  const icones = {
    a_verifier: '○',
    conforme: '✓',
    non_conforme: '✗',
    non_applicable: '—',
  };
  return icones[statut] || '?';
};

export const getTypePreuveLabel = (type) => {
  const labels = {
    analyse_qualite: '🔬 Analyse qualité',
    etape_lot: '🔄 Étape post-récolte',
    fournisseur: '🤝 Fournisseur',
    lot: '📦 Lot',
    parcelle: '🗺️ Parcelle',
    document_externe: '📄 Document externe',
    attestation: '📜 Attestation',
    observation: '💬 Observation',
  };
  return labels[type] || type;
};

export const getSevereiteAlerteColor = (severite) => {
  const colors = {
    critique: '#cc4444',
    avertissement: '#d4a04a',
    info: '#7eaac8',
  };
  return colors[severite] || '#999';
};

export const getSevereiteAlerteIcone = (severite) => {
  const icones = {
    critique: '🚨',
    avertissement: '⚠️',
    info: 'ℹ️',
  };
  return icones[severite] || '•';
};