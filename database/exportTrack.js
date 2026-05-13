// ============================================================
// AgriSuite Madagascar — Module M4 ExportTrack
// database/exportTrack.js
//
// Phase 3 — Sessions 2-4 (avec corrections Session 4B)
// 12 tables SQLite : filière production + filière collecte unifiées
// CRUD + helpers traçabilité + génération code lot + seed idempotent
//
// CORRECTIONS Session 4B :
//   - Contrainte CHECK lots assouplie pour la filière collecte
//     (fournisseur_id devient optionnel — multi-fournisseurs supportés)
//   - insertLotProduction : protection anti-doublon récolte source
//   - insertLotCollecte : validation zone uniquement (pas fournisseur)
// ============================================================

import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('certifpilot.db');

// ============================================================
// INITIALISATION DES TABLES
// ============================================================

export const initExportTrack = () => {
  // -- 1. Zones de collecte (référentiel)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS zones_collecte (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      code            TEXT NOT NULL UNIQUE,
      nom             TEXT NOT NULL,
      region          TEXT,
      latitude_centre REAL,
      longitude_centre REAL,
      cultures_principales TEXT,
      actif           INTEGER NOT NULL DEFAULT 1
    );
  `);

  // -- 2. Fournisseurs (filière collecte)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS fournisseurs (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      code                  TEXT NOT NULL UNIQUE,
      nom                   TEXT NOT NULL,
      type                  TEXT NOT NULL DEFAULT 'individuel',
      zone_collecte_code    TEXT NOT NULL,
      commune               TEXT,
      fokontany             TEXT,
      latitude              REAL,
      longitude             REAL,
      telephone             TEXT,
      cnaps_nif             TEXT,
      date_premier_contact  TEXT,
      statut                TEXT NOT NULL DEFAULT 'actif',
      notes                 TEXT,
      created_at            TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (zone_collecte_code) REFERENCES zones_collecte(code)
    );
  `);

  // -- 3. Lots (cœur du module — filière A + B unifiées)
  // CORRECTION Session 4B : la contrainte CHECK pour la collecte n'exige
  // plus fournisseur_id NOT NULL (un lot peut être multi-fournisseurs).
  db.execSync(`
    CREATE TABLE IF NOT EXISTS lots (
      id                      INTEGER PRIMARY KEY AUTOINCREMENT,
      code_lot                TEXT NOT NULL UNIQUE,
      filiere                 TEXT NOT NULL,
      parcelle_id             INTEGER,
      site_id                 INTEGER,
      fournisseur_id          INTEGER,
      zone_collecte_code      TEXT,
      culture_id              INTEGER NOT NULL,
      variete                 TEXT,
      recolte_maraichere_id   INTEGER,
      date_debut              TEXT NOT NULL,
      date_fin                TEXT,
      est_cloture             INTEGER NOT NULL DEFAULT 0,
      quantite_brute_kg       REAL,
      protocole_post_recolte  TEXT,
      est_composite           INTEGER NOT NULL DEFAULT 0,
      statut                  TEXT NOT NULL DEFAULT 'en_cours',
      cree_par                TEXT NOT NULL,
      cree_le                 TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      valide_par              TEXT,
      valide_le               TEXT,
      est_rectifie_par        INTEGER,
      notes                   TEXT,
      FOREIGN KEY (parcelle_id) REFERENCES parcelles(id),
      FOREIGN KEY (site_id) REFERENCES sites(id),
      FOREIGN KEY (fournisseur_id) REFERENCES fournisseurs(id),
      FOREIGN KEY (zone_collecte_code) REFERENCES zones_collecte(code),
      FOREIGN KEY (culture_id) REFERENCES cultures(id),
      FOREIGN KEY (recolte_maraichere_id) REFERENCES recoltes_maraicheres(id),
      FOREIGN KEY (est_rectifie_par) REFERENCES lots(id),
      CHECK (
        (filiere = 'production' AND parcelle_id IS NOT NULL AND site_id IS NOT NULL)
        OR
        (filiere = 'collecte' AND zone_collecte_code IS NOT NULL AND parcelle_id IS NULL)
      )
    );
  `);

  try { db.execSync(`CREATE INDEX IF NOT EXISTS idx_lots_code ON lots(code_lot);`); } catch (e) {}
  try { db.execSync(`CREATE INDEX IF NOT EXISTS idx_lots_filiere ON lots(filiere);`); } catch (e) {}
  try { db.execSync(`CREATE INDEX IF NOT EXISTS idx_lots_statut ON lots(statut);`); } catch (e) {}
  try { db.execSync(`CREATE INDEX IF NOT EXISTS idx_lots_culture ON lots(culture_id);`); } catch (e) {}

  // -- 4. Membres composites (table de jointure)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS lot_composite_membres (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      lot_composite_id   INTEGER NOT NULL,
      lot_parent_id      INTEGER NOT NULL,
      quantite_apportee_kg REAL NOT NULL,
      cree_le            TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lot_composite_id) REFERENCES lots(id),
      FOREIGN KEY (lot_parent_id) REFERENCES lots(id),
      UNIQUE (lot_composite_id, lot_parent_id)
    );
  `);

  // -- 5. Bons de collecte (filière B)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS bons_collecte (
      id                          INTEGER PRIMARY KEY AUTOINCREMENT,
      numero_bon                  TEXT NOT NULL UNIQUE,
      fournisseur_id              INTEGER NOT NULL,
      lot_id                      INTEGER NOT NULL,
      date_collecte               TEXT NOT NULL,
      quantite_kg                 REAL NOT NULL,
      prix_achat_unitaire         REAL NOT NULL,
      prix_total                  REAL NOT NULL,
      paiement_statut             TEXT NOT NULL DEFAULT 'paye',
      collecteur                  TEXT,
      lieu_collecte               TEXT,
      latitude_collecte           REAL,
      longitude_collecte          REAL,
      attestation_origine_photo   TEXT,
      notes                       TEXT,
      cree_le                     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      est_rectifie_par            INTEGER,
      FOREIGN KEY (fournisseur_id) REFERENCES fournisseurs(id),
      FOREIGN KEY (lot_id) REFERENCES lots(id),
      FOREIGN KEY (est_rectifie_par) REFERENCES bons_collecte(id)
    );
  `);

  try { db.execSync(`CREATE INDEX IF NOT EXISTS idx_bons_lot ON bons_collecte(lot_id);`); } catch (e) {}
  try { db.execSync(`CREATE INDEX IF NOT EXISTS idx_bons_fournisseur ON bons_collecte(fournisseur_id);`); } catch (e) {}

  // -- 6. Étapes post-récolte
  db.execSync(`
    CREATE TABLE IF NOT EXISTS etapes_post_recolte (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      lot_id              INTEGER NOT NULL,
      ordre               INTEGER NOT NULL,
      type_etape          TEXT NOT NULL,
      date_debut          TEXT NOT NULL,
      date_fin            TEXT,
      quantite_entree_kg  REAL NOT NULL,
      quantite_sortie_kg  REAL,
      perte_kg            REAL,
      taux_perte_pct      REAL,
      parametres          TEXT,
      ccp_id              INTEGER,
      conformite_ccp      TEXT,
      operateur           TEXT,
      notes               TEXT,
      photo               TEXT,
      cree_le             TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      est_rectifie_par    INTEGER,
      FOREIGN KEY (lot_id) REFERENCES lots(id),
      FOREIGN KEY (est_rectifie_par) REFERENCES etapes_post_recolte(id)
    );
  `);

  try { db.execSync(`CREATE INDEX IF NOT EXISTS idx_etapes_lot ON etapes_post_recolte(lot_id);`); } catch (e) {}
  try { db.execSync(`CREATE INDEX IF NOT EXISTS idx_etapes_lot_ordre ON etapes_post_recolte(lot_id, ordre);`); } catch (e) {}

  // -- 7. Analyses qualité
  db.execSync(`
    CREATE TABLE IF NOT EXISTS analyses_qualite (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      lot_id              INTEGER NOT NULL,
      date_analyse        TEXT NOT NULL,
      type_analyse        TEXT NOT NULL,
      laboratoire         TEXT,
      valeur              REAL,
      unite               TEXT,
      valeur_texte        TEXT,
      seuil_min           REAL,
      seuil_max           REAL,
      conforme            INTEGER,
      rapport_pdf         TEXT,
      notes               TEXT,
      cree_le             TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      est_rectifie_par    INTEGER,
      FOREIGN KEY (lot_id) REFERENCES lots(id),
      FOREIGN KEY (est_rectifie_par) REFERENCES analyses_qualite(id)
    );
  `);

  try { db.execSync(`CREATE INDEX IF NOT EXISTS idx_analyses_lot ON analyses_qualite(lot_id);`); } catch (e) {}

  // -- 8. Conditionnements
  db.execSync(`
    CREATE TABLE IF NOT EXISTS conditionnements (
      id                      INTEGER PRIMARY KEY AUTOINCREMENT,
      lot_id                  INTEGER NOT NULL,
      date_conditionnement    TEXT NOT NULL,
      type_emballage          TEXT NOT NULL,
      unite_taille            TEXT NOT NULL,
      nombre_unites           INTEGER NOT NULL,
      poids_total_kg          REAL NOT NULL,
      etiquette_recto         TEXT,
      etiquette_verso         TEXT,
      numero_serie_debut      TEXT,
      numero_serie_fin        TEXT,
      lieu_stockage           TEXT,
      conditions_stockage     TEXT,
      operateur               TEXT,
      cree_le                 TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      est_rectifie_par        INTEGER,
      FOREIGN KEY (lot_id) REFERENCES lots(id),
      FOREIGN KEY (est_rectifie_par) REFERENCES conditionnements(id)
    );
  `);

  try { db.execSync(`CREATE INDEX IF NOT EXISTS idx_cond_lot ON conditionnements(lot_id);`); } catch (e) {}

  // -- 9. Acheteurs
  db.execSync(`
    CREATE TABLE IF NOT EXISTS acheteurs (
      id                          INTEGER PRIMARY KEY AUTOINCREMENT,
      code                        TEXT NOT NULL UNIQUE,
      raison_sociale              TEXT NOT NULL,
      pays                        TEXT NOT NULL,
      ville                       TEXT,
      adresse                     TEXT,
      contact_principal           TEXT,
      email                       TEXT,
      telephone                   TEXT,
      certifications_requises     TEXT,
      exigences_specifiques       TEXT,
      conditions_paiement         TEXT,
      incoterm_prefere            TEXT,
      statut                      TEXT NOT NULL DEFAULT 'prospect',
      notes                       TEXT,
      cree_le                     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // -- 10. Expéditions
  db.execSync(`
    CREATE TABLE IF NOT EXISTS expeditions (
      id                      INTEGER PRIMARY KEY AUTOINCREMENT,
      numero_expedition       TEXT NOT NULL UNIQUE,
      acheteur_id             INTEGER NOT NULL,
      poids_total_kg          REAL NOT NULL,
      valeur_totale_eur       REAL,
      valeur_totale_usd       REAL,
      incoterm                TEXT NOT NULL,
      port_chargement         TEXT,
      port_destination        TEXT,
      transitaire             TEXT,
      numero_conteneur        TEXT,
      numero_booking          TEXT,
      date_chargement         TEXT,
      date_depart_prevue      TEXT,
      date_arrivee_prevue     TEXT,
      statut                  TEXT NOT NULL DEFAULT 'preparation',
      notes                   TEXT,
      cree_le                 TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      est_rectifie_par        INTEGER,
      FOREIGN KEY (acheteur_id) REFERENCES acheteurs(id),
      FOREIGN KEY (est_rectifie_par) REFERENCES expeditions(id)
    );
  `);

  try { db.execSync(`CREATE INDEX IF NOT EXISTS idx_exp_acheteur ON expeditions(acheteur_id);`); } catch (e) {}
  try { db.execSync(`CREATE INDEX IF NOT EXISTS idx_exp_statut ON expeditions(statut);`); } catch (e) {}

  // -- 11. Lots dans expédition (table de jointure)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS expedition_lots (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      expedition_id       INTEGER NOT NULL,
      lot_id              INTEGER NOT NULL,
      quantite_kg         REAL NOT NULL,
      cree_le             TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (expedition_id) REFERENCES expeditions(id),
      FOREIGN KEY (lot_id) REFERENCES lots(id),
      UNIQUE (expedition_id, lot_id)
    );
  `);

  // -- 12. Documents export
  db.execSync(`
    CREATE TABLE IF NOT EXISTS documents_export (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      expedition_id   INTEGER NOT NULL,
      type_document   TEXT NOT NULL,
      numero          TEXT,
      date_emission   TEXT,
      date_expiration TEXT,
      emetteur        TEXT,
      fichier_pdf     TEXT,
      notes           TEXT,
      cree_le         TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (expedition_id) REFERENCES expeditions(id)
    );
  `);

  // ============================================
// VÉRIFICATIONS DE LOTS (Session 9c-conceptuel)
// ============================================

db.execSync(`
  CREATE TABLE IF NOT EXISTS verifications_lots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lot_id INTEGER NOT NULL,
    date_verification TEXT NOT NULL,
    verificateur TEXT NOT NULL,
    referentiel_cible TEXT,
    statut_global TEXT NOT NULL DEFAULT 'en_cours'
      CHECK (statut_global IN ('en_cours','conforme','alertes','non_conforme')),
    notes_globales TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (lot_id) REFERENCES lots(id)
  );
`);

db.execSync(`
  CREATE TABLE IF NOT EXISTS verifications_lots_axes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    verification_id INTEGER NOT NULL,
    axe INTEGER NOT NULL CHECK (axe BETWEEN 1 AND 5),
    statut TEXT NOT NULL DEFAULT 'na'
      CHECK (statut IN ('na','conforme','alerte','non_conforme')),
    details_json TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (verification_id) REFERENCES verifications_lots(id) ON DELETE CASCADE,
    UNIQUE(verification_id, axe)
  );
`);

console.log('✅ Tables verifications_lots créées');

  try { db.execSync(`CREATE INDEX IF NOT EXISTS idx_docs_expedition ON documents_export(expedition_id);`); } catch (e) {}

  // ─── Migration : aligne statut sur est_cloture ───
  // Les lots clôturés avant la correction Session 6 ont est_cloture=1
  // mais statut='en_cours'. On synchronise (idempotent).
  try {
    db.runSync(
      `UPDATE lots SET statut = 'cloture'
       WHERE est_cloture = 1 AND statut != 'cloture'`
    );
    db.runSync(
      `UPDATE lots SET statut = 'en_cours'
       WHERE est_cloture = 0 AND statut = 'cloture'`
    );
  } catch (e) {
    console.warn('[ExportTrack] Migration statut/est_cloture sautée :', e.message);
  }
};

// ============================================================
// HELPERS — GÉNÉRATION CODE LOT
// ============================================================

export const CODE_CULTURE = {
  gingembre: 'GIN',
  vanille: 'VAN',
  girofle: 'GIR',
  cannelle: 'CAN',
  cafe: 'CAF',
  cacao: 'CAC',
  poivre: 'POI',
  litchi: 'LIT',
  ylang_ylang: 'YLA',
  piment: 'PIM',
  fruits_seches: 'FRS',
};

export const genererCodeLot = (codeZoneOuSite, codeCulture, annee = null) => {
  const an = annee || new Date().getFullYear();
  const prefixe = `MDG-${an}-${codeZoneOuSite}-${codeCulture}-`;

  const result = db.getFirstSync(
    `SELECT code_lot FROM lots
     WHERE code_lot LIKE ?
     ORDER BY code_lot DESC
     LIMIT 1`,
    [`${prefixe}%`]
  );

  let prochainNumero = 1;
  if (result && result.code_lot) {
    const dernierNum = parseInt(result.code_lot.split('-').pop(), 10);
    if (!isNaN(dernierNum)) prochainNumero = dernierNum + 1;
  }

  return `${prefixe}${String(prochainNumero).padStart(3, '0')}`;
};

export const genererCodeLotComposite = (codeZoneOuSite, codeCulture, annee = null) => {
  const an = annee || new Date().getFullYear();
  const prefixe = `MDG-${an}-${codeZoneOuSite}-${codeCulture}-C`;

  const result = db.getFirstSync(
    `SELECT code_lot FROM lots
     WHERE code_lot LIKE ?
     ORDER BY code_lot DESC
     LIMIT 1`,
    [`${prefixe}%`]
  );

  let prochainNumero = 1;
  if (result && result.code_lot) {
    const dernierNum = parseInt(result.code_lot.split('-C').pop(), 10);
    if (!isNaN(dernierNum)) prochainNumero = dernierNum + 1;
  }

  return `${prefixe}${String(prochainNumero).padStart(3, '0')}`;
};

// ============================================================
// CRUD — ZONES DE COLLECTE
// ============================================================

export const getAllZonesCollecte = () => {
  return db.getAllSync(`SELECT * FROM zones_collecte WHERE actif = 1 ORDER BY nom`);
};

export const getZoneCollecteByCode = (code) => {
  return db.getFirstSync(`SELECT * FROM zones_collecte WHERE code = ?`, [code]);
};

// ============================================================
// CRUD — FOURNISSEURS
// ============================================================

export const getAllFournisseurs = (statut = null) => {
  if (statut) {
    return db.getAllSync(`SELECT * FROM fournisseurs WHERE statut = ? ORDER BY nom`, [statut]);
  }
  return db.getAllSync(`SELECT * FROM fournisseurs ORDER BY nom`);
};

export const getFournisseurById = (id) => {
  return db.getFirstSync(`SELECT * FROM fournisseurs WHERE id = ?`, [id]);
};

export const insertFournisseur = (f) => {
  const result = db.runSync(
    `INSERT INTO fournisseurs
     (code, nom, type, zone_collecte_code, commune, fokontany, latitude, longitude,
      telephone, cnaps_nif, date_premier_contact, statut, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      f.code, f.nom, f.type || 'individuel', f.zone_collecte_code,
      f.commune || null, f.fokontany || null,
      f.latitude || null, f.longitude || null,
      f.telephone || null, f.cnaps_nif || null,
      f.date_premier_contact || null,
      f.statut || 'actif', f.notes || null,
    ]
  );
  return result.lastInsertRowId;
};

export const updateFournisseur = (id, f) => {
  db.runSync(
    `UPDATE fournisseurs SET
       nom = ?, type = ?, zone_collecte_code = ?, commune = ?, fokontany = ?,
       latitude = ?, longitude = ?, telephone = ?, cnaps_nif = ?,
       statut = ?, notes = ?
     WHERE id = ?`,
    [
      f.nom, f.type, f.zone_collecte_code, f.commune || null, f.fokontany || null,
      f.latitude || null, f.longitude || null, f.telephone || null,
      f.cnaps_nif || null, f.statut, f.notes || null, id,
    ]
  );
};

export const deleteFournisseur = (id) => {
  db.runSync(`DELETE FROM fournisseurs WHERE id = ?`, [id]);
};

// ============================================================
// CRUD — LOTS
// ============================================================

export const getAllLots = (filtres = {}) => {
  let sql = `SELECT * FROM lots WHERE est_rectifie_par IS NULL`;
  const params = [];

  if (filtres.filiere) {
    sql += ` AND filiere = ?`;
    params.push(filtres.filiere);
  }
  // Filtre statut → mappé sur est_cloture (source de vérité fiable).
  // Évite les désynchronisations entre est_cloture et statut sur les
  // données historiques.
  if (filtres.statut === 'en_cours') {
    sql += ` AND est_cloture = 0`;
  } else if (filtres.statut === 'cloture') {
    sql += ` AND est_cloture = 1`;
  } else if (filtres.statut) {
    // Autre valeur de statut : on respecte le filtre nominal
    sql += ` AND statut = ?`;
    params.push(filtres.statut);
  }
  if (filtres.culture_id) {
    sql += ` AND culture_id = ?`;
    params.push(filtres.culture_id);
  }
  if (filtres.site_id) {
    sql += ` AND site_id = ?`;
    params.push(filtres.site_id);
  }
  sql += ` ORDER BY cree_le DESC`;
  return db.getAllSync(sql, params);
};

export const getLotById = (id) => {
  return db.getFirstSync(`SELECT * FROM lots WHERE id = ?`, [id]);
};

export const getLotByCode = (codeLot) => {
  return db.getFirstSync(`SELECT * FROM lots WHERE code_lot = ?`, [codeLot]);
};

/**
 * Crée un lot filière A (production) — lié à une parcelle.
 * SÉCURITÉ : si recolte_maraichere_id est fourni, vérifie qu'aucun autre
 * lot non-rectifié n'utilise déjà cette récolte (anti-doublon BIO).
 */
export const insertLotProduction = (lot) => {
  if (!lot.parcelle_id || !lot.site_id) {
    throw new Error('Lot production : parcelle_id et site_id requis');
  }

  // Vérification anti-doublon récolte source
  if (lot.recolte_maraichere_id) {
    const existant = db.getFirstSync(
      `SELECT id, code_lot FROM lots
       WHERE recolte_maraichere_id = ?
         AND est_rectifie_par IS NULL`,
      [lot.recolte_maraichere_id]
    );
    if (existant) {
      throw new Error(
        `Cette récolte est déjà rattachée au lot ${existant.code_lot}. ` +
        `Une récolte ne peut alimenter qu'un seul lot export ` +
        `(traçabilité BIO/Fairtrade).`
      );
    }
  }

  const result = db.runSync(
    `INSERT INTO lots
     (code_lot, filiere, parcelle_id, site_id, culture_id, variete,
      recolte_maraichere_id, date_debut, date_fin, est_cloture,
      quantite_brute_kg, protocole_post_recolte, statut, cree_par, notes)
     VALUES (?, 'production', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      lot.code_lot, lot.parcelle_id, lot.site_id,
      lot.culture_id, lot.variete || null,
      lot.recolte_maraichere_id || null,
      lot.date_debut, lot.date_fin || null, lot.est_cloture ? 1 : 0,
      lot.quantite_brute_kg || null, lot.protocole_post_recolte || null,
      lot.statut || 'en_cours', lot.cree_par, lot.notes || null,
    ]
  );
  return result.lastInsertRowId;
};

/**
 * Crée un lot filière B (collecte) — lié à une zone (pas un fournisseur).
 *
 * fournisseur_id est OPTIONNEL : la majorité des lots collecte sont
 * multi-fournisseurs (alimentés par plusieurs paysans via plusieurs
 * bons), donc ce champ reste NULL. La traçabilité ascendante se fait
 * via la table bons_collecte.
 */
export const insertLotCollecte = (lot) => {
  if (!lot.zone_collecte_code) {
    throw new Error('Lot collecte : zone_collecte_code requis');
  }
  if (lot.parcelle_id || lot.site_id) {
    throw new Error('Lot collecte : ne doit pas avoir parcelle_id ou site_id');
  }

  const result = db.runSync(
    `INSERT INTO lots
     (code_lot, filiere, fournisseur_id, zone_collecte_code, culture_id, variete,
      date_debut, date_fin, est_cloture,
      quantite_brute_kg, protocole_post_recolte, statut, cree_par, notes)
     VALUES (?, 'collecte', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      lot.code_lot,
      lot.fournisseur_id || null,  // optionnel : NULL si multi-fournisseurs
      lot.zone_collecte_code,
      lot.culture_id, lot.variete || null,
      lot.date_debut, lot.date_fin || null, lot.est_cloture ? 1 : 0,
      lot.quantite_brute_kg || null, lot.protocole_post_recolte || null,
      lot.statut || 'en_cours', lot.cree_par, lot.notes || null,
    ]
  );
  return result.lastInsertRowId;
};

export const cloturerLot = (id, valide_par) => {
  const now = new Date().toISOString();
  db.runSync(
    `UPDATE lots SET
       date_fin = COALESCE(date_fin, ?),
       est_cloture = 1,
       statut = 'cloture',
       valide_par = ?,
       valide_le = ?
     WHERE id = ? AND est_cloture = 0`,
    [now, valide_par, now, id]
  );
};

/**
 * Rectifie un lot avec création d'un nouveau lot rectificatif.
 *
 * @param {number} idOriginal - ID du lot à rectifier
 * @param {object} lotCorrige - Champs modifiés du lot
 * @param {object} optionsCopie - Options de copie des éléments liés
 *   - copierEtapes: bool — copier les étapes post-récolte ?
 *   - copierAnalyses: bool — copier les analyses qualité ?
 *   - copierConditionnements: bool — copier les conditionnements ?
 *   - copierBons: bool — copier les bons de collecte (filière B) ?
 *   - marquerAReVerifier: bool — ajouter mention "à re-vérifier" dans les
 *     notes des éléments copiés (recommandé sauf rectif simple)
 *
 * @returns {number} ID du nouveau lot rectificatif
 */
export const rectifierLot = (idOriginal, lotCorrige, optionsCopie = {}) => {
  const original = getLotById(idOriginal);
  if (!original) throw new Error(`Lot ${idOriginal} introuvable`);

  const {
    copierEtapes = false,
    copierAnalyses = false,
    copierConditionnements = false,
    copierBons = false,
    marquerAReVerifier = false,
  } = optionsCopie;

  // ─── Génération nouveau code lot ───
  const segments = original.code_lot.split('-');
  let nouveauCodeLot;
  if (segments.length >= 5 && segments[0] === 'MDG') {
    const annee = parseInt(segments[1], 10) || new Date().getFullYear();
    const codeZoneOuSite = segments[2];
    const codeCulture = segments[3];
    nouveauCodeLot = genererCodeLot(codeZoneOuSite, codeCulture, annee);
  } else {
    nouveauCodeLot = `${original.code_lot}-R${Date.now()}`;
  }

  const payload = {
    ...original,
    ...lotCorrige,
    code_lot: nouveauCodeLot,
    id: undefined,
    est_rectifie_par: null,
    cree_le: undefined,
  };

  // ─── Pré-marquage pour libérer la récolte source ───
  const aRecolteSource = original.filiere === 'production'
                         && original.recolte_maraichere_id != null;

  if (aRecolteSource) {
    db.runSync(
      `UPDATE lots SET est_rectifie_par = -1 WHERE id = ?`,
      [idOriginal]
    );
  }

  let nouveauId;
  try {
    if (original.filiere === 'production') {
      nouveauId = insertLotProduction(payload);
    } else {
      nouveauId = insertLotCollecte(payload);
    }
  } catch (err) {
    if (aRecolteSource) {
      db.runSync(
        `UPDATE lots SET est_rectifie_par = NULL WHERE id = ?`,
        [idOriginal]
      );
    }
    throw err;
  }

  // ─── Copie sélective des éléments liés ───
  // Préfixe à ajouter aux notes si "à re-vérifier" coché
  const prefixeReVerifier = marquerAReVerifier
    ? `[COPIÉ depuis lot rectifié ${original.code_lot} — à RE-VÉRIFIER]`
    : `[COPIÉ depuis lot rectifié ${original.code_lot}]`;

  const ajouterPrefixe = (notesOriginales) => {
    if (!notesOriginales) return prefixeReVerifier;
    return `${prefixeReVerifier}\n${notesOriginales}`;
  };

  try {
    // Copie ÉTAPES POST-RÉCOLTE
    if (copierEtapes) {
      const etapes = getEtapesByLot(idOriginal);
      etapes.forEach((e) => {
        // Parse parametres si JSON string
        let parametres = e.parametres;
        if (typeof parametres === 'string') {
          try { parametres = JSON.parse(parametres); } catch (err) {}
        }
        insertEtape({
          lot_id: nouveauId,
          ordre: e.ordre,
          type_etape: e.type_etape,
          date_debut: e.date_debut,
          date_fin: e.date_fin,
          quantite_entree_kg: e.quantite_entree_kg,
          quantite_sortie_kg: e.quantite_sortie_kg,
          perte_kg: e.perte_kg,
          taux_perte_pct: e.taux_perte_pct,
          parametres: parametres,
          ccp_id: e.ccp_id,
          conformite_ccp: e.conformite_ccp,
          operateur: e.operateur,
          notes: ajouterPrefixe(e.notes),
          photo: e.photo,
        });
      });
    }

    // Copie ANALYSES QUALITÉ
    if (copierAnalyses) {
      const analyses = getAnalysesByLot(idOriginal);
      analyses.forEach((a) => {
        insertAnalyse({
          lot_id: nouveauId,
          date_analyse: a.date_analyse,
          type_analyse: a.type_analyse,
          laboratoire: a.laboratoire,
          valeur: a.valeur,
          unite: a.unite,
          valeur_texte: a.valeur_texte,
          seuil_min: a.seuil_min,
          seuil_max: a.seuil_max,
          conforme: a.conforme,
          rapport_pdf: a.rapport_pdf,
          notes: ajouterPrefixe(a.notes),
        });
      });
    }

    // Copie CONDITIONNEMENTS
    if (copierConditionnements) {
      const conds = getConditionnementsByLot(idOriginal);
      conds.forEach((c) => {
        // Parse conditions_stockage si JSON string
        let conditionsStockage = c.conditions_stockage;
        if (typeof conditionsStockage === 'string') {
          try { conditionsStockage = JSON.parse(conditionsStockage); } catch (err) {}
        }
        insertConditionnement({
          lot_id: nouveauId,
          date_conditionnement: c.date_conditionnement,
          type_emballage: c.type_emballage,
          unite_taille: c.unite_taille,
          nombre_unites: c.nombre_unites,
          poids_total_kg: c.poids_total_kg,
          etiquette_recto: c.etiquette_recto,
          etiquette_verso: c.etiquette_verso
            ? `${c.etiquette_verso}\n${prefixeReVerifier}`
            : prefixeReVerifier,
          numero_serie_debut: c.numero_serie_debut,
          numero_serie_fin: c.numero_serie_fin,
          lieu_stockage: c.lieu_stockage,
          conditions_stockage: conditionsStockage,
          operateur: c.operateur,
        });
      });
    }

    // Copie BONS DE COLLECTE (filière B uniquement)
    if (copierBons && original.filiere === 'collecte') {
      const bons = getBonsCollecteByLot(idOriginal);
      bons.forEach((b) => {
        // On reproduit l'INSERT directement parce qu'insertBonCollecte
        // pourrait avoir des effets de bord (calcul totaux, alertes…)
        db.runSync(
          `INSERT INTO bons_collecte
           (lot_id, fournisseur_id, numero_bon, date_collecte, zone_collecte_code,
            quantite_kg, prix_unitaire_ar, prix_total_ar, qualite, photo,
            notes, saisi_par)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            nouveauId, b.fournisseur_id, b.numero_bon, b.date_collecte,
            b.zone_collecte_code, b.quantite_kg, b.prix_unitaire_ar,
            b.prix_total_ar, b.qualite, b.photo,
            ajouterPrefixe(b.notes), b.saisi_par,
          ]
        );
      });
    }
  } catch (err) {
    // Rollback complet si la copie échoue
    if (aRecolteSource) {
      db.runSync(
        `UPDATE lots SET est_rectifie_par = NULL WHERE id = ?`,
        [idOriginal]
      );
    }
    // On supprime aussi le lot rectificatif partiellement créé
    db.runSync(`DELETE FROM lots WHERE id = ?`, [nouveauId]);
    throw new Error(`Erreur lors de la copie des éléments liés : ${err.message}`);
  }

  // ─── Mise à jour finale avec le vrai id du rectificatif ───
  db.runSync(
    `UPDATE lots SET est_rectifie_par = ? WHERE id = ?`,
    [nouveauId, idOriginal]
  );
  return nouveauId;
};

// ============================================================
// CRUD — BONS DE COLLECTE
// ============================================================

export const getBonsCollecteByLot = (lotId) => {
  return db.getAllSync(
    `SELECT * FROM bons_collecte
     WHERE lot_id = ? AND est_rectifie_par IS NULL
     ORDER BY date_collecte ASC`,
    [lotId]
  );
};

export const getBonsCollecteByFournisseur = (fournisseurId) => {
  return db.getAllSync(
    `SELECT * FROM bons_collecte
     WHERE fournisseur_id = ? AND est_rectifie_par IS NULL
     ORDER BY date_collecte DESC`,
    [fournisseurId]
  );
};

export const insertBonCollecte = (bon) => {
  const prixTotal = bon.prix_total != null
    ? bon.prix_total
    : (bon.quantite_kg * bon.prix_achat_unitaire);

  const result = db.runSync(
    `INSERT INTO bons_collecte
     (numero_bon, fournisseur_id, lot_id, date_collecte, quantite_kg,
      prix_achat_unitaire, prix_total, paiement_statut, collecteur, lieu_collecte,
      latitude_collecte, longitude_collecte, attestation_origine_photo, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      bon.numero_bon, bon.fournisseur_id, bon.lot_id, bon.date_collecte,
      bon.quantite_kg, bon.prix_achat_unitaire, prixTotal,
      bon.paiement_statut || 'paye',
      bon.collecteur || null, bon.lieu_collecte || null,
      bon.latitude_collecte || null, bon.longitude_collecte || null,
      bon.attestation_origine_photo || null, bon.notes || null,
    ]
  );
  return result.lastInsertRowId;
};

export const genererNumeroBonCollecte = (annee = null) => {
  const an = annee || new Date().getFullYear();
  const prefixe = `BC-${an}-`;
  const result = db.getFirstSync(
    `SELECT numero_bon FROM bons_collecte
     WHERE numero_bon LIKE ?
     ORDER BY numero_bon DESC LIMIT 1`,
    [`${prefixe}%`]
  );
  let prochain = 1;
  if (result && result.numero_bon) {
    const num = parseInt(result.numero_bon.split('-').pop(), 10);
    if (!isNaN(num)) prochain = num + 1;
  }
  return `${prefixe}${String(prochain).padStart(5, '0')}`;
};

// ============================================================
// CRUD — ÉTAPES POST-RÉCOLTE
// ============================================================

export const getEtapesByLot = (lotId) => {
  return db.getAllSync(
    `SELECT * FROM etapes_post_recolte
     WHERE lot_id = ? AND est_rectifie_par IS NULL
     ORDER BY ordre ASC`,
    [lotId]
  );
};

export const insertEtape = (e) => {
  let perte = e.perte_kg;
  let tauxPerte = e.taux_perte_pct;
  if (e.quantite_entree_kg != null && e.quantite_sortie_kg != null) {
    perte = e.quantite_entree_kg - e.quantite_sortie_kg;
    tauxPerte = e.quantite_entree_kg > 0
      ? (perte / e.quantite_entree_kg) * 100
      : 0;
  }

  const result = db.runSync(
    `INSERT INTO etapes_post_recolte
     (lot_id, ordre, type_etape, date_debut, date_fin,
      quantite_entree_kg, quantite_sortie_kg, perte_kg, taux_perte_pct,
      parametres, ccp_id, conformite_ccp, operateur, notes, photo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      e.lot_id, e.ordre, e.type_etape, e.date_debut, e.date_fin || null,
      e.quantite_entree_kg, e.quantite_sortie_kg || null, perte || null, tauxPerte || null,
      e.parametres ? JSON.stringify(e.parametres) : null,
      e.ccp_id || null, e.conformite_ccp || null,
      e.operateur || null, e.notes || null, e.photo || null,
    ]
  );
  return result.lastInsertRowId;
};

export const getProchainOrdreEtape = (lotId) => {
  const result = db.getFirstSync(
    `SELECT MAX(ordre) AS max_ordre FROM etapes_post_recolte
     WHERE lot_id = ? AND est_rectifie_par IS NULL`,
    [lotId]
  );
  return (result && result.max_ordre) ? result.max_ordre + 1 : 1;
};

// ============================================================
// CRUD — ANALYSES QUALITÉ
// ============================================================

export const getAnalysesByLot = (lotId) => {
  return db.getAllSync(
    `SELECT * FROM analyses_qualite
     WHERE lot_id = ? AND est_rectifie_par IS NULL
     ORDER BY date_analyse DESC`,
    [lotId]
  );
};

export const insertAnalyse = (a) => {
  let conforme = a.conforme;
  if (conforme == null && a.valeur != null) {
    if (a.seuil_min != null && a.seuil_max != null) {
      conforme = (a.valeur >= a.seuil_min && a.valeur <= a.seuil_max) ? 1 : 0;
    } else if (a.seuil_max != null) {
      conforme = (a.valeur <= a.seuil_max) ? 1 : 0;
    } else if (a.seuil_min != null) {
      conforme = (a.valeur >= a.seuil_min) ? 1 : 0;
    }
  }

  const result = db.runSync(
    `INSERT INTO analyses_qualite
     (lot_id, date_analyse, type_analyse, laboratoire, valeur, unite,
      valeur_texte, seuil_min, seuil_max, conforme, rapport_pdf, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      a.lot_id, a.date_analyse, a.type_analyse, a.laboratoire || null,
      a.valeur || null, a.unite || null, a.valeur_texte || null,
      a.seuil_min || null, a.seuil_max || null, conforme,
      a.rapport_pdf || null, a.notes || null,
    ]
  );
  return result.lastInsertRowId;
};

// ============================================================
// CRUD — CONDITIONNEMENTS
// ============================================================

export const getConditionnementsByLot = (lotId) => {
  return db.getAllSync(
    `SELECT * FROM conditionnements
     WHERE lot_id = ? AND est_rectifie_par IS NULL
     ORDER BY date_conditionnement DESC`,
    [lotId]
  );
};

export const insertConditionnement = (c) => {
  const result = db.runSync(
    `INSERT INTO conditionnements
     (lot_id, date_conditionnement, type_emballage, unite_taille,
      nombre_unites, poids_total_kg, etiquette_recto, etiquette_verso,
      numero_serie_debut, numero_serie_fin, lieu_stockage, conditions_stockage, operateur)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      c.lot_id, c.date_conditionnement, c.type_emballage, c.unite_taille,
      c.nombre_unites, c.poids_total_kg,
      c.etiquette_recto || null, c.etiquette_verso || null,
      c.numero_serie_debut || null, c.numero_serie_fin || null,
      c.lieu_stockage || null,
      c.conditions_stockage ? JSON.stringify(c.conditions_stockage) : null,
      c.operateur || null,
    ]
  );
  return result.lastInsertRowId;
};

// ============================================================
// CRUD — ACHETEURS
// ============================================================

export const getAllAcheteurs = (statut = null) => {
  if (statut) {
    return db.getAllSync(`SELECT * FROM acheteurs WHERE statut = ? ORDER BY raison_sociale`, [statut]);
  }
  return db.getAllSync(`SELECT * FROM acheteurs ORDER BY raison_sociale`);
};

export const getAcheteurById = (id) => {
  return db.getFirstSync(`SELECT * FROM acheteurs WHERE id = ?`, [id]);
};

export const insertAcheteur = (a) => {
  const result = db.runSync(
    `INSERT INTO acheteurs
     (code, raison_sociale, pays, ville, adresse, contact_principal, email, telephone,
      certifications_requises, exigences_specifiques, conditions_paiement,
      incoterm_prefere, statut, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      a.code, a.raison_sociale, a.pays, a.ville || null, a.adresse || null,
      a.contact_principal || null, a.email || null, a.telephone || null,
      a.certifications_requises ? JSON.stringify(a.certifications_requises) : null,
      a.exigences_specifiques || null, a.conditions_paiement || null,
      a.incoterm_prefere || null, a.statut || 'prospect', a.notes || null,
    ]
  );
  return result.lastInsertRowId;
};

// ============================================================
// CRUD — EXPÉDITIONS
// ============================================================

export const getAllExpeditions = (statut = null) => {
  if (statut) {
    return db.getAllSync(
      `SELECT * FROM expeditions
       WHERE statut = ? AND est_rectifie_par IS NULL
       ORDER BY cree_le DESC`,
      [statut]
    );
  }
  return db.getAllSync(
    `SELECT * FROM expeditions WHERE est_rectifie_par IS NULL ORDER BY cree_le DESC`
  );
};

export const getExpeditionById = (id) => {
  return db.getFirstSync(`SELECT * FROM expeditions WHERE id = ?`, [id]);
};

export const insertExpedition = (exp, lots) => {
  const result = db.runSync(
    `INSERT INTO expeditions
     (numero_expedition, acheteur_id, poids_total_kg, valeur_totale_eur, valeur_totale_usd,
      incoterm, port_chargement, port_destination, transitaire,
      numero_conteneur, numero_booking,
      date_chargement, date_depart_prevue, date_arrivee_prevue, statut, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      exp.numero_expedition, exp.acheteur_id, exp.poids_total_kg,
      exp.valeur_totale_eur || null, exp.valeur_totale_usd || null,
      exp.incoterm, exp.port_chargement || null, exp.port_destination || null,
      exp.transitaire || null, exp.numero_conteneur || null, exp.numero_booking || null,
      exp.date_chargement || null, exp.date_depart_prevue || null, exp.date_arrivee_prevue || null,
      exp.statut || 'preparation', exp.notes || null,
    ]
  );
  const expeditionId = result.lastInsertRowId;

  if (lots && lots.length > 0) {
    for (const l of lots) {
      db.runSync(
        `INSERT INTO expedition_lots (expedition_id, lot_id, quantite_kg)
         VALUES (?, ?, ?)`,
        [expeditionId, l.lot_id, l.quantite_kg]
      );
    }
  }
  return expeditionId;
};

export const getLotsByExpedition = (expeditionId) => {
  return db.getAllSync(
    `SELECT el.*, l.code_lot, l.filiere, l.culture_id, l.variete
     FROM expedition_lots el
     JOIN lots l ON l.id = el.lot_id
     WHERE el.expedition_id = ?`,
    [expeditionId]
  );
};

// ============================================================
// CRUD — DOCUMENTS EXPORT
// ============================================================

export const getDocumentsByExpedition = (expeditionId) => {
  return db.getAllSync(
    `SELECT * FROM documents_export WHERE expedition_id = ? ORDER BY date_emission DESC`,
    [expeditionId]
  );
};

export const insertDocumentExport = (d) => {
  const result = db.runSync(
    `INSERT INTO documents_export
     (expedition_id, type_document, numero, date_emission, date_expiration,
      emetteur, fichier_pdf, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      d.expedition_id, d.type_document, d.numero || null,
      d.date_emission || null, d.date_expiration || null,
      d.emetteur || null, d.fichier_pdf || null, d.notes || null,
    ]
  );
  return result.lastInsertRowId;
};

// ============================================================
// HELPERS — TRAÇABILITÉ & QUANTITÉ
// ============================================================

export const getQuantiteActuelleLot = (lotId) => {
  const lot = getLotById(lotId);
  if (!lot) return 0;

  const etape = db.getFirstSync(
    `SELECT quantite_sortie_kg FROM etapes_post_recolte
     WHERE lot_id = ? AND est_rectifie_par IS NULL AND quantite_sortie_kg IS NOT NULL
     ORDER BY ordre DESC LIMIT 1`,
    [lotId]
  );
  if (etape && etape.quantite_sortie_kg != null) {
    return etape.quantite_sortie_kg;
  }

  if (lot.quantite_brute_kg != null) return lot.quantite_brute_kg;

  if (lot.filiere === 'collecte') {
    const r = db.getFirstSync(
      `SELECT SUM(quantite_kg) AS total FROM bons_collecte
       WHERE lot_id = ? AND est_rectifie_par IS NULL`,
      [lotId]
    );
    return (r && r.total) ? r.total : 0;
  }
  return 0;
};

export const getTracabiliteAscendante = (lotId) => {
  const lot = getLotById(lotId);
  if (!lot) return null;

  const tracabilite = {
    lot,
    quantite_actuelle_kg: getQuantiteActuelleLot(lotId),
    bons_collecte: [],
    etapes: getEtapesByLot(lotId),
    analyses: getAnalysesByLot(lotId),
    conditionnements: getConditionnementsByLot(lotId),
    parents: [],
  };

  if (lot.filiere === 'collecte') {
    tracabilite.bons_collecte = getBonsCollecteByLot(lotId);
    tracabilite.fournisseur = getFournisseurById(lot.fournisseur_id);
  }

  if (lot.est_composite) {
    const membres = db.getAllSync(
      `SELECT * FROM lot_composite_membres WHERE lot_composite_id = ?`,
      [lotId]
    );
    for (const m of membres) {
      tracabilite.parents.push({
        membre: m,
        tracabilite: getTracabiliteAscendante(m.lot_parent_id),
      });
    }
  }

  return tracabilite;
};

// ============================================================
// SEED IDEMPOTENT — Zones de collecte de référence Madagascar
// ============================================================

const ZONES_COLLECTE_REFERENCE = [
  { code: 'ANJ', nom: 'Analanjirofo', region: 'Analanjirofo', latitude_centre: -16.9, longitude_centre: 49.7,
    cultures_principales: ['girofle', 'vanille', 'litchi'] },
  { code: 'ATS', nom: 'Atsinanana', region: 'Atsinanana', latitude_centre: -18.1, longitude_centre: 49.4,
    cultures_principales: ['vanille', 'litchi', 'cafe', 'poivre'] },
  { code: 'SAV', nom: 'SAVA', region: 'SAVA (Sambava-Antalaha-Vohémar-Andapa)', latitude_centre: -14.3, longitude_centre: 50.0,
    cultures_principales: ['vanille', 'cafe'] },
  { code: 'SBR', nom: 'Sambirano', region: 'DIANA', latitude_centre: -13.8, longitude_centre: 48.5,
    cultures_principales: ['cacao', 'cafe'] },
  { code: 'NSB', nom: 'Nosy Be', region: 'DIANA', latitude_centre: -13.3, longitude_centre: 48.3,
    cultures_principales: ['ylang_ylang', 'vanille'] },
  { code: 'ANA', nom: 'Analamanga', region: 'Analamanga', latitude_centre: -18.9, longitude_centre: 47.5,
    cultures_principales: ['fruits_seches', 'pomme_de_terre'] },
  { code: 'VAK', nom: 'Vakinankaratra', region: 'Vakinankaratra', latitude_centre: -19.9, longitude_centre: 47.0,
    cultures_principales: ['fruits_seches', 'pomme_de_terre'] },
  { code: 'ALM', nom: 'Alaotra-Mangoro', region: 'Alaotra-Mangoro', latitude_centre: -18.5, longitude_centre: 48.2,
    cultures_principales: ['gingembre', 'cafe', 'poivre'] },
];

export const seedExportTrack = () => {
  initExportTrack();

  const count = db.getFirstSync(`SELECT COUNT(*) AS n FROM zones_collecte`);
  if (count && count.n > 0) {
    console.log(`[ExportTrack seed] ${count.n} zones déjà en base, seed sauté`);
    return;
  }

  for (const z of ZONES_COLLECTE_REFERENCE) {
    db.runSync(
      `INSERT INTO zones_collecte
       (code, nom, region, latitude_centre, longitude_centre, cultures_principales, actif)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [
        z.code, z.nom, z.region,
        z.latitude_centre, z.longitude_centre,
        JSON.stringify(z.cultures_principales),
      ]
    );
  }
  console.log(`[ExportTrack seed] ${ZONES_COLLECTE_REFERENCE.length} zones de collecte insérées`);
};

// ============================================
// CRUD Vérifications de lots
// ============================================

export function creerVerificationLot(lotId, verificateur, referentielCible = null) {
  const result = db.runSync(
    `INSERT INTO verifications_lots (lot_id, date_verification, verificateur, referentiel_cible)
     VALUES (?, datetime('now','localtime'), ?, ?)`,
    [lotId, verificateur, referentielCible]
  );
  // Initialise les 5 axes en 'na'
  for (let axe = 1; axe <= 5; axe++) {
    db.runSync(
      `INSERT INTO verifications_lots_axes (verification_id, axe, statut) VALUES (?, ?, 'na')`,
      [result.lastInsertRowId, axe]
    );
  }
  return result.lastInsertRowId;
}

export function getVerificationLot(verificationId) {
  return db.getFirstSync(
    `SELECT * FROM verifications_lots WHERE id = ?`,
    [verificationId]
  );
}

export function getVerificationsParLot(lotId) {
  return db.getAllSync(
    `SELECT * FROM verifications_lots WHERE lot_id = ? ORDER BY date_verification DESC`,
    [lotId]
  );
}

export function getAxesVerification(verificationId) {
  return db.getAllSync(
    `SELECT * FROM verifications_lots_axes WHERE verification_id = ? ORDER BY axe`,
    [verificationId]
  );
}

export function updateAxeVerification(verificationId, axe, statut, detailsJson, notes) {
  db.runSync(
    `UPDATE verifications_lots_axes
     SET statut = ?, details_json = ?, notes = ?
     WHERE verification_id = ? AND axe = ?`,
    [statut, JSON.stringify(detailsJson || {}), notes || null, verificationId, axe]
  );
  // Recalcule statut global
  const axes = getAxesVerification(verificationId);
  let statutGlobal = 'conforme';
  if (axes.some(a => a.statut === 'non_conforme')) statutGlobal = 'non_conforme';
  else if (axes.some(a => a.statut === 'alerte')) statutGlobal = 'alertes';
  else if (axes.every(a => a.statut === 'na')) statutGlobal = 'en_cours';
  db.runSync(
    `UPDATE verifications_lots SET statut_global = ? WHERE id = ?`,
    [statutGlobal, verificationId]
  );
}

// ============================================
// AXE 1 — Calcul automatique traçabilité ascendante
// ============================================

export function calculerAxe1Tracabilite(lotId) {
  const lot = db.getFirstSync(`SELECT * FROM lots WHERE id = ?`, [lotId]);
  if (!lot) return { statut: 'non_conforme', details: { erreur: 'Lot introuvable' } };

  // Source de vérité = colonne filiere (et non fournisseur_id qui peut
  // être NULL pour un lot collecte multi-fournisseurs)
  const filiere = lot.filiere === 'collecte' ? 'B' : 'A';

  const details = {
    filiere,
    sources: [],
    problemes: [],
  };

  if (filiere === 'B') {
    // Filière B : remonter via les bons de collecte → fournisseurs → parcelles producteur
    const bons = db.getAllSync(
      `SELECT * FROM bons_collecte
       WHERE lot_id = ? AND est_rectifie_par IS NULL`,
      [lotId]
    );

    if (bons.length === 0) {
      details.problemes.push('Aucun bon de collecte rattaché au lot');
    }

    // Regroupement par fournisseur (un fournisseur peut avoir plusieurs bons)
    const fournisseursVus = new Map();
    for (const bon of bons) {
      if (!fournisseursVus.has(bon.fournisseur_id)) {
        const fournisseur = db.getFirstSync(
          `SELECT * FROM fournisseurs WHERE id = ?`,
          [bon.fournisseur_id]
        );

        // Parcelles producteur (table peut ne pas exister selon avancement Session 9)
        let parcelles = [];
        try {
          parcelles = db.getAllSync(
            `SELECT * FROM parcelles_producteur WHERE fournisseur_id = ?`,
            [bon.fournisseur_id]
          );
        } catch (e) {
          // Table parcelles_producteur absente → on continue sans bloquer
        }

        fournisseursVus.set(bon.fournisseur_id, {
          fournisseur: fournisseur?.nom || `Fournisseur #${bon.fournisseur_id}`,
          zone: fournisseur?.zone_collecte_code || '?',
          nb_bons: 1,
          quantite_totale_kg: bon.quantite_kg || 0,
          nb_parcelles: parcelles.length,
          parcelles_avec_gps: parcelles.filter(p => p.latitude && p.longitude).length,
        });

        if (parcelles.length === 0) {
          details.problemes.push(
            `Fournisseur ${fournisseur?.nom || '#' + bon.fournisseur_id} : aucune parcelle déclarée`
          );
        }
      } else {
        const f = fournisseursVus.get(bon.fournisseur_id);
        f.nb_bons += 1;
        f.quantite_totale_kg += (bon.quantite_kg || 0);
      }
    }
    details.sources = Array.from(fournisseursVus.values());

  } else {
    // Filière A : remonter via la récolte maraîchère → planche → site
    if (lot.recolte_maraichere_id) {
      const recolte = db.getFirstSync(
        `SELECT * FROM recoltes_maraicheres WHERE id = ?`,
        [lot.recolte_maraichere_id]
      );
      details.sources.push({
        recolte_id: recolte?.id,
        planche_id: recolte?.planche_id,
        date_recolte: recolte?.date_recolte,
      });
    } else {
      details.problemes.push('Filière A mais aucune récolte source rattachée');
    }

    if (!lot.parcelle_id) {
      details.problemes.push('Aucune parcelle source identifiée');
    }
  }

  let statut = 'conforme';
  if (details.problemes.length > 0) {
    statut = details.problemes.length >= 2 ? 'non_conforme' : 'alerte';
  }
  return { statut, details };
}

// ============================================
// AXE 2 — Qualité physico-chimique
// ============================================

export function calculerAxe2Qualite(lotId) {
  const lot = db.getFirstSync(`SELECT * FROM lots WHERE id = ?`, [lotId]);
  if (!lot) return { statut: 'non_conforme', details: { erreur: 'Lot introuvable' } };

  const analyses = db.getAllSync(
    `SELECT * FROM analyses_qualite
     WHERE lot_id = ? AND est_rectifie_par IS NULL
     ORDER BY date_analyse DESC`,
    [lotId]
  );

  const details = {
    nb_analyses: analyses.length,
    types_couverts: [],
    analyses: [],
    problemes: [],
  };

  if (analyses.length === 0) {
    details.problemes.push('Aucune analyse qualité enregistrée pour ce lot');
    return { statut: 'non_conforme', details };
  }

  // Types d'analyses critiques attendues selon culture (catalogue minimal)
  const TYPES_CRITIQUES_PAR_CULTURE = {
    GIN: ['humidite'],
    VAN: ['humidite', 'vanilline'],
    GIR: ['humidite', 'aflatoxines'],
    CAN: ['humidite', 'coumarine'],
    CAF: ['humidite', 'ochratoxine_a'],
    CAC: ['humidite', 'cadmium', 'fermentation'],
    POI: ['humidite', 'salmonella'],
  };

  // Extraire le code culture du code_lot (segment 4 : MDG-AAAA-XXX-CCC-NNN)
  const segments = lot.code_lot?.split('-') || [];
  const codeCulture = segments[3];
  const typesCritiques = TYPES_CRITIQUES_PAR_CULTURE[codeCulture] || [];

  let nbConformes = 0;
  let nbNonConformes = 0;

  for (const a of analyses) {
    const conforme = a.conforme === 1;
    if (conforme) nbConformes++;
    else if (a.conforme === 0) nbNonConformes++;

    details.analyses.push({
      type: a.type_analyse,
      date: a.date_analyse,
      valeur: a.valeur,
      unite: a.unite,
      seuil_min: a.seuil_min,
      seuil_max: a.seuil_max,
      conforme: a.conforme,
      laboratoire: a.laboratoire,
    });

    if (!details.types_couverts.includes(a.type_analyse)) {
      details.types_couverts.push(a.type_analyse);
    }

    if (a.conforme === 0) {
      details.problemes.push(
        `${a.type_analyse} non conforme (${a.valeur} ${a.unite || ''})`
      );
    }
  }

  // Vérifie que les types critiques sont couverts
  const manquants = typesCritiques.filter(t => !details.types_couverts.includes(t));
  if (manquants.length > 0) {
    details.problemes.push(
      `Analyses critiques manquantes pour ${codeCulture} : ${manquants.join(', ')}`
    );
  }

  details.nb_conformes = nbConformes;
  details.nb_non_conformes = nbNonConformes;

  let statut = 'conforme';
  if (nbNonConformes > 0) statut = 'non_conforme';
  else if (manquants.length > 0) statut = 'alerte';

  return { statut, details };
}

// ============================================
// AXE 3 — Mass balance
// ============================================

export function calculerAxe3MassBalance(lotId) {
  const lot = db.getFirstSync(`SELECT * FROM lots WHERE id = ?`, [lotId]);
  if (!lot) return { statut: 'non_conforme', details: { erreur: 'Lot introuvable' } };

  // ─── ENTRÉES ───
  let entreeKg = 0;
  let sourceEntree = '';

  if (lot.filiere === 'collecte') {
    const r = db.getFirstSync(
      `SELECT SUM(quantite_kg) AS total
       FROM bons_collecte
       WHERE lot_id = ? AND est_rectifie_par IS NULL`,
      [lotId]
    );
    entreeKg = r?.total || 0;
    sourceEntree = `${entreeKg.toFixed(1)} kg via bons de collecte`;
  } else {
    entreeKg = lot.quantite_brute_kg || 0;
    sourceEntree = `${entreeKg.toFixed(1)} kg brut récolté`;
  }

  // ─── SORTIES (conditionnements) ───
  const conds = db.getAllSync(
    `SELECT * FROM conditionnements
     WHERE lot_id = ? AND est_rectifie_par IS NULL`,
    [lotId]
  );
  const sortieKg = conds.reduce((s, c) => s + (c.poids_total_kg || 0), 0);

  // ─── PERTES DOCUMENTÉES (étapes post-récolte) ───
  const etapes = db.getAllSync(
    `SELECT * FROM etapes_post_recolte
     WHERE lot_id = ? AND est_rectifie_par IS NULL
     ORDER BY ordre ASC`,
    [lotId]
  );
  const pertes = etapes.reduce((s, e) => s + (e.perte_kg || 0), 0);

  // ─── BILAN ───
  const ecart = entreeKg - sortieKg - pertes;
  const ecartPct = entreeKg > 0 ? (ecart / entreeKg) * 100 : 0;

  const details = {
    entree_kg: entreeKg,
    source_entree: sourceEntree,
    sortie_kg: sortieKg,
    nb_conditionnements: conds.length,
    pertes_documentees_kg: pertes,
    nb_etapes: etapes.length,
    ecart_kg: ecart,
    ecart_pct: ecartPct,
    detail_etapes: etapes.map(e => ({
      type: e.type_etape,
      ordre: e.ordre,
      entree: e.quantite_entree_kg,
      sortie: e.quantite_sortie_kg,
      perte: e.perte_kg,
      taux_perte_pct: e.taux_perte_pct,
    })),
    problemes: [],
  };

  // ─── ÉVALUATION ───
  if (entreeKg === 0) {
    details.problemes.push('Aucune quantité d\'entrée enregistrée (lot vide ?)');
    return { statut: 'non_conforme', details };
  }

  if (sortieKg === 0 && conds.length === 0) {
    // Lot pas encore conditionné — on ne peut pas conclure
    details.problemes.push('Lot non encore conditionné — bilan matière non calculable');
    return { statut: 'na', details };
  }

  let statut = 'conforme';
  const ecartAbs = Math.abs(ecartPct);

  if (ecart < 0) {
    // Sortie + pertes > entrée → impossible physiquement
    details.problemes.push(
      `Sorties (${sortieKg.toFixed(1)} kg) + pertes (${pertes.toFixed(1)} kg) > entrée (${entreeKg.toFixed(1)} kg) — incohérence`
    );
    statut = 'non_conforme';
  } else if (ecartAbs > 5) {
    details.problemes.push(
      `Écart de ${ecart.toFixed(1)} kg (${ecartPct.toFixed(1)}%) non documenté — seuil critique 5% dépassé`
    );
    statut = 'non_conforme';
  } else if (ecartAbs > 2) {
    details.problemes.push(
      `Écart de ${ecart.toFixed(1)} kg (${ecartPct.toFixed(1)}%) à justifier (tolérance 2-5%)`
    );
    statut = 'alerte';
  }

  return { statut, details };
}

// ============================================
// AXE 5 — Cohérence référentielle
// ============================================

export function calculerAxe5Coherence(lotId) {
  const lot = db.getFirstSync(`SELECT * FROM lots WHERE id = ?`, [lotId]);
  if (!lot) return { statut: 'non_conforme', details: { erreur: 'Lot introuvable' } };

  const details = {
    engagements_lot: [],
    fournisseurs_verifies: [],
    problemes: [],
  };

  // ─── Engagements du lot ───
  let engagementsLot = [];
  try {
    engagementsLot = db.getAllSync(
      `SELECT e.*, r.nom_court, r.code AS ref_code
       FROM engagements_certif e
       JOIN referentiels r ON r.id = e.referentiel_id
       WHERE e.cible_type = 'lot' AND e.cible_id = ?`,
      [lotId]
    );
  } catch (err) {
    details.problemes.push('Module CertifTrack indisponible (table engagements_certif manquante)');
    return { statut: 'na', details };
  }

  if (engagementsLot.length === 0) {
    details.problemes.push('Aucun référentiel engagé sur ce lot — impossible de juger la cohérence');
    return { statut: 'na', details };
  }

  for (const eng of engagementsLot) {
    details.engagements_lot.push({
      referentiel: eng.nom_court,
      ref_code: eng.ref_code,
      statut: eng.statut,
      date_engagement: eng.date_engagement,
    });

    // Engagement du lot lui-même actif ?
    if (eng.statut === 'suspendu' || eng.statut === 'abandonne') {
      details.problemes.push(
        `Engagement ${eng.nom_court} sur le lot est ${eng.statut}`
      );
    }
  }

  // ─── Filière B : vérifier chaque fournisseur amont ───
  if (lot.filiere === 'collecte') {
    const bons = db.getAllSync(
      `SELECT * FROM bons_collecte
       WHERE lot_id = ? AND est_rectifie_par IS NULL`,
      [lotId]
    );

    // Regrouper bons par fournisseur (un fournisseur = plusieurs bons possibles)
    const fournisseursMap = new Map();
    for (const bon of bons) {
      if (!fournisseursMap.has(bon.fournisseur_id)) {
        fournisseursMap.set(bon.fournisseur_id, {
          fournisseur_id: bon.fournisseur_id,
          dates_collecte: [],
        });
      }
      fournisseursMap.get(bon.fournisseur_id).dates_collecte.push(bon.date_collecte);
    }

    for (const [fid, info] of fournisseursMap.entries()) {
      const fournisseur = db.getFirstSync(
        `SELECT * FROM fournisseurs WHERE id = ?`,
        [fid]
      );
      const dateMin = info.dates_collecte.sort()[0];

      const result = {
        fournisseur: fournisseur?.nom || `#${fid}`,
        date_collecte_premiere: dateMin,
        engagements: [],
      };

      // Pour chaque référentiel engagé sur le lot, vérifier que le fournisseur l'avait aussi
      for (const engLot of engagementsLot) {
        let engFourn = null;
        try {
          engFourn = db.getFirstSync(
            `SELECT * FROM engagements_certif
             WHERE cible_type = 'fournisseur' AND cible_id = ? AND referentiel_id = ?
             ORDER BY date_engagement ASC LIMIT 1`,
            [fid, engLot.referentiel_id]
          );
        } catch (err) {}

        if (!engFourn) {
          details.problemes.push(
            `${result.fournisseur} : aucun engagement ${engLot.nom_court} déclaré`
          );
          result.engagements.push({
            referentiel: engLot.nom_court,
            statut: 'absent',
            valide_a_la_collecte: false,
          });
          continue;
        }

        // Engagement actif au moment de la collecte ?
        const valideALaCollecte =
          engFourn.date_engagement <= dateMin &&
          engFourn.statut !== 'suspendu' &&
          engFourn.statut !== 'abandonne';

        if (!valideALaCollecte) {
          details.problemes.push(
            `${result.fournisseur} : ${engLot.nom_court} non valide à la date de collecte (${dateMin}) — engagement ${engFourn.statut} depuis ${engFourn.date_engagement}`
          );
        }

        // BIO : conversion vs certifié
        const flagsConversion = [];
        if (engLot.ref_code?.includes('BIO') && engFourn.statut === 'en_conversion') {
          flagsConversion.push('en_conversion (vente sous mention BIO interdite avant C3)');
          details.problemes.push(
            `${result.fournisseur} : ${engLot.nom_court} en conversion — vente sous mention BIO interdite`
          );
        }

        result.engagements.push({
          referentiel: engLot.nom_court,
          statut: engFourn.statut,
          date_engagement: engFourn.date_engagement,
          valide_a_la_collecte: valideALaCollecte,
          flags: flagsConversion,
        });
      }

      details.fournisseurs_verifies.push(result);
    }
  }

  // ─── Évaluation finale ───
  let statut = 'conforme';
  if (details.problemes.length > 0) {
    // Problèmes graves = engagement absent ou en conversion sous mention BIO
    const probsGraves = details.problemes.filter(p =>
      p.includes('aucun engagement') ||
      p.includes('en conversion') ||
      p.includes('non valide à la date')
    );
    statut = probsGraves.length > 0 ? 'non_conforme' : 'alerte';
  }

  return { statut, details };
}

// ============================================
// AXE 4 — Test de rappel (recall test)
// ============================================

export function calculerAxe4Recall(lotId) {
  const lot = db.getFirstSync(`SELECT * FROM lots WHERE id = ?`, [lotId]);
  if (!lot) return { statut: 'non_conforme', details: { erreur: 'Lot introuvable' } };

  const details = {
    chaine: [],
    problemes: [],
  };

  // ─── MAILLON 1 : Conditionnement (sachet final) ───
  const conds = db.getAllSync(
    `SELECT * FROM conditionnements
     WHERE lot_id = ? AND est_rectifie_par IS NULL
     ORDER BY date_conditionnement DESC`,
    [lotId]
  );

  const maillon1 = {
    nom: '1. Conditionnement (sachet final)',
    present: conds.length > 0,
    complet: false,
    details: '',
  };

  if (conds.length === 0) {
    maillon1.details = 'Aucun conditionnement enregistré';
    details.problemes.push('Maillon 1 manquant : pas de conditionnement → impossible de tracer un sachet');
  } else {
    const totalUnites = conds.reduce((s, c) => s + (c.nombre_unites || 0), 0);
    const sansSerie = conds.filter(c => !c.numero_serie_debut && !c.numero_serie_fin).length;
    maillon1.complet = sansSerie === 0;
    maillon1.details = `${conds.length} conditionnement(s), ${totalUnites} unités`;
    if (sansSerie > 0) {
      details.problemes.push(`${sansSerie} conditionnement(s) sans numéro de série — recall impossible à grain fin`);
    }
  }
  details.chaine.push(maillon1);

  // ─── MAILLON 2 : Lot ───
  const maillon2 = {
    nom: '2. Lot',
    present: true,
    complet: !!(lot.code_lot && lot.date_debut && lot.cree_par),
    details: `${lot.code_lot} (${lot.filiere}, créé par ${lot.cree_par || '?'})`,
  };
  if (!lot.code_lot) details.problemes.push('Lot sans code unique');
  if (!lot.date_debut) details.problemes.push('Lot sans date de début');
  details.chaine.push(maillon2);

  // ─── MAILLON 3 : Étapes post-récolte ───
  const etapes = db.getAllSync(
    `SELECT * FROM etapes_post_recolte
     WHERE lot_id = ? AND est_rectifie_par IS NULL
     ORDER BY ordre ASC`,
    [lotId]
  );

  const maillon3 = {
    nom: '3. Étapes post-récolte',
    present: etapes.length > 0,
    complet: false,
    details: '',
  };

  if (etapes.length === 0) {
    maillon3.details = 'Aucune étape enregistrée';
    // Pas bloquant si lot très récent, mais on flag
    if (conds.length > 0) {
      details.problemes.push('Maillon 3 manquant : conditionnement existe mais aucune étape post-récolte tracée');
    }
  } else {
    const sansOperateur = etapes.filter(e => !e.operateur).length;
    const sansDate = etapes.filter(e => !e.date_debut).length;
    maillon3.complet = sansOperateur === 0 && sansDate === 0;
    maillon3.details = etapes.map(e => `#${e.ordre} ${e.type_etape}`).join(' → ');
    if (sansOperateur > 0) details.problemes.push(`${sansOperateur} étape(s) sans opérateur identifié`);
    if (sansDate > 0) details.problemes.push(`${sansDate} étape(s) sans date`);
  }
  details.chaine.push(maillon3);

  // ─── MAILLONS 4 & 5 : selon filière ───
  if (lot.filiere === 'collecte') {
    // MAILLON 4 : Bons de collecte
    const bons = db.getAllSync(
      `SELECT * FROM bons_collecte
       WHERE lot_id = ? AND est_rectifie_par IS NULL`,
      [lotId]
    );

    const maillon4 = {
      nom: '4. Bons de collecte',
      present: bons.length > 0,
      complet: false,
      details: '',
    };

    if (bons.length === 0) {
      maillon4.details = 'Aucun bon de collecte';
      details.problemes.push('Maillon 4 manquant : lot collecte sans bon → origine inconnue');
    } else {
      const sansDate = bons.filter(b => !b.date_collecte).length;
      const sansGps = bons.filter(b => !b.latitude_collecte || !b.longitude_collecte).length;
      maillon4.complet = sansDate === 0;
      maillon4.details = `${bons.length} bon(s), total ${bons.reduce((s, b) => s + (b.quantite_kg || 0), 0).toFixed(1)} kg`;
      if (sansDate > 0) details.problemes.push(`${sansDate} bon(s) sans date de collecte`);
      if (sansGps > 0) details.problemes.push(`${sansGps} bon(s) sans coordonnées GPS du lieu de collecte`);
    }
    details.chaine.push(maillon4);

    // MAILLON 5 : Fournisseurs + parcelles
    const fournisseursIds = [...new Set(bons.map(b => b.fournisseur_id))];
    const maillon5 = {
      nom: '5. Fournisseurs + parcelles',
      present: fournisseursIds.length > 0,
      complet: false,
      details: '',
    };

    let sousDetails = [];
    let nbSansParcelle = 0;
    let nbSansGpsFournisseur = 0;

    for (const fid of fournisseursIds) {
      const f = db.getFirstSync(`SELECT * FROM fournisseurs WHERE id = ?`, [fid]);
      if (!f) continue;
      if (!f.latitude || !f.longitude) nbSansGpsFournisseur++;

      let nbParcelles = 0;
      let nbGpsParcelles = 0;
      try {
        const parcelles = db.getAllSync(
          `SELECT * FROM parcelles_producteur WHERE fournisseur_id = ?`,
          [fid]
        );
        nbParcelles = parcelles.length;
        nbGpsParcelles = parcelles.filter(p => p.latitude && p.longitude).length;
      } catch (e) {}

      if (nbParcelles === 0) nbSansParcelle++;
      sousDetails.push(`${f.nom} (${nbParcelles} parc., ${nbGpsParcelles} GPS)`);
    }

    maillon5.complet = nbSansParcelle === 0 && nbSansGpsFournisseur === 0;
    maillon5.details = sousDetails.join(' · ');
    if (nbSansParcelle > 0) details.problemes.push(`${nbSansParcelle} fournisseur(s) sans aucune parcelle déclarée — recall ne remonte pas à la terre`);
    if (nbSansGpsFournisseur > 0) details.problemes.push(`${nbSansGpsFournisseur} fournisseur(s) sans GPS`);
    details.chaine.push(maillon5);

  } else {
    // FILIÈRE A : MAILLON 4 = Récolte source, MAILLON 5 = Parcelle propre
    const maillon4 = {
      nom: '4. Récolte source',
      present: !!lot.recolte_maraichere_id,
      complet: false,
      details: '',
    };
    if (!lot.recolte_maraichere_id) {
      maillon4.details = 'Aucune récolte rattachée';
      details.problemes.push('Maillon 4 manquant : lot production sans récolte source');
    } else {
      try {
        const recolte = db.getFirstSync(
          `SELECT * FROM recoltes_maraicheres WHERE id = ?`,
          [lot.recolte_maraichere_id]
        );
        maillon4.complet = !!(recolte?.date_recolte);
        maillon4.details = `Récolte #${recolte?.id} du ${recolte?.date_recolte || '?'}`;
      } catch (e) {
        maillon4.details = 'Table recoltes_maraicheres inaccessible';
      }
    }
    details.chaine.push(maillon4);

    const maillon5 = {
      nom: '5. Parcelle propre',
      present: !!lot.parcelle_id,
      complet: false,
      details: '',
    };
    if (!lot.parcelle_id) {
      maillon5.details = 'Aucune parcelle liée';
      details.problemes.push('Maillon 5 manquant : lot production sans parcelle');
    } else {
      try {
        const parcelle = db.getFirstSync(
          `SELECT * FROM parcelles WHERE id = ?`,
          [lot.parcelle_id]
        );
        maillon5.complet = !!(parcelle?.nom);
        maillon5.details = `${parcelle?.nom || `#${lot.parcelle_id}`} (site ${lot.site_id})`;
      } catch (e) {
        maillon5.details = `Parcelle #${lot.parcelle_id}`;
      }
    }
    details.chaine.push(maillon5);
  }

  // ─── ÉVALUATION ───
  const maillonsManquants = details.chaine.filter(m => !m.present).length;
  const maillonsIncomplets = details.chaine.filter(m => m.present && !m.complet).length;

  details.nb_maillons = details.chaine.length;
  details.nb_presents = details.chaine.filter(m => m.present).length;
  details.nb_complets = details.chaine.filter(m => m.complet).length;

  let statut = 'conforme';
  if (maillonsManquants > 0) {
    statut = 'non_conforme';
  } else if (maillonsIncomplets > 0) {
    statut = 'alerte';
  }

  return { statut, details };
}