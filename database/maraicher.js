// database/maraicher.js
// MaraîcherGuide — Phase 2
// Tables : planches, cultures_maraicheres_en_cours, recoltes_maraicheres, apports_fumure

import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('agrisuite.db');

// ─────────────────────────────────────────────
// INITIALISATION DES TABLES
// ─────────────────────────────────────────────

export function initMaraicher() {

  // Table planches — unité de base du maraîchage
  // Une planche = une zone délimitée sur une parcelle, avec une culture à la fois
  db.execSync(`
    CREATE TABLE IF NOT EXISTS planches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id INTEGER NOT NULL,
      parcelle_id INTEGER,           -- lien optionnel vers table parcelles (AgroMap)
      nom TEXT NOT NULL,             -- ex: "Planche A1", "Carré nord", "Rang gingembre"
      superficie_m2 REAL NOT NULL,
      type_sol TEXT,                 -- argileux, limoneux, sableux, alluvial
      exposition TEXT,               -- nord, sud, est, ouest, mi-ombre
      niveau_eau TEXT DEFAULT 'inconnu', -- aucune / limite / suffisant / inconnu
      notes TEXT,
      active INTEGER DEFAULT 1,
      date_creation TEXT NOT NULL
    );
  `);

  // Table cultures_maraicheres_en_cours
  // Une entrée par cycle cultural sur une planche
  db.execSync(`
    CREATE TABLE IF NOT EXISTS cultures_maraicheres_en_cours (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      planche_id INTEGER NOT NULL,
      culture_id INTEGER NOT NULL,   -- lien vers table cultures du CropEngine
      date_semis TEXT NOT NULL,
      date_repiquage TEXT,
      date_recolte_prevue TEXT,
      stade_actuel TEXT DEFAULT 'semis', -- semis / germination / croissance / floraison / fructification / maturite / recolte
      rendement_prevu_kg REAL,
      destination TEXT DEFAULT 'autonomie', -- autonomie / ecole / vente_locale / export
      statut TEXT DEFAULT 'en_cours', -- en_cours / recolte / abandonne
      notes TEXT,
      date_cloture TEXT
    );
  `);

  // Table recoltes_maraicheres
  // Chaque récolte saisie par l'opérateur
  db.execSync(`
    CREATE TABLE IF NOT EXISTS recoltes_maraicheres (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      culture_en_cours_id INTEGER NOT NULL,
      planche_id INTEGER NOT NULL,
      site_id INTEGER NOT NULL,
      date_recolte TEXT NOT NULL,
      quantite_kg REAL NOT NULL,
      qualite TEXT DEFAULT 'bonne',   -- excellente / bonne / moyenne / mauvaise
      destination TEXT NOT NULL,      -- autonomie / ecole / vente_locale / export / perte
      prix_vente_ar REAL DEFAULT 0,   -- 0 si autoconsommation ou don école
      notes TEXT,
      saisi_par TEXT DEFAULT 'operateur'
    );
  `);

  // Table apports_fumure
  // Traçabilité des apports de fumier organique sur chaque planche
  // Lien avec ForagePro via site_id (le fumier vient du troupeau du même site)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS apports_fumure (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      planche_id INTEGER NOT NULL,
      site_id INTEGER NOT NULL,
      date_apport TEXT NOT NULL,
      type_fumure TEXT NOT NULL,      -- fumier_bovin / compost / fumier_composte / engrais_vert
      quantite_kg REAL NOT NULL,
      stade_culture TEXT,             -- à quel stade de la culture l'apport a été fait
      notes TEXT
    );
  `);

  // Table objectifs_production_site
  // Paramètres de site pour le calcul d'autonomie et école
  db.execSync(`
    CREATE TABLE IF NOT EXISTS objectifs_production_site (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id INTEGER NOT NULL UNIQUE,
      nb_personnes_menage INTEGER DEFAULT 0,
      nb_ouvriers INTEGER DEFAULT 0,
      nb_eleves_ecole INTEGER DEFAULT 0,   -- objectif élèves à nourrir
      frequence_ecole TEXT DEFAULT 'quotidien', -- quotidien / hebdomadaire
      besoin_legumes_g_par_personne INTEGER DEFAULT 150, -- grammes/jour/personne
      niveau_eau TEXT DEFAULT 'inconnu',   -- aucune / limite / suffisant / inconnu
      notes TEXT
    );
  `);
}

// ─────────────────────────────────────────────
// PLANCHES — CRUD
// ─────────────────────────────────────────────

export function getAllPlanches(siteId) {
  return db.getAllSync(
    `SELECT p.*, 
      (SELECT COUNT(*) FROM cultures_maraicheres_en_cours c 
       WHERE c.planche_id = p.id AND c.statut = 'en_cours') as cultures_actives
     FROM planches p
     WHERE p.site_id = ? AND p.active = 1
     ORDER BY p.nom`,
    [siteId]
  );
}

export function getPlanchemById(id) {
  return db.getFirstSync(`SELECT * FROM planches WHERE id = ?`, [id]);
}

export function insertPlanche(planche) {
  const result = db.runSync(
    `INSERT INTO planches 
      (site_id, parcelle_id, nom, superficie_m2, type_sol, exposition, niveau_eau, notes, date_creation)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      planche.site_id,
      planche.parcelle_id || null,
      planche.nom,
      planche.superficie_m2,
      planche.type_sol || null,
      planche.exposition || null,
      planche.niveau_eau || 'inconnu',
      planche.notes || null,
      new Date().toISOString().split('T')[0],
    ]
  );
  return result.lastInsertRowId;
}

export function updatePlanche(id, planche) {
  db.runSync(
    `UPDATE planches SET
      nom = ?, superficie_m2 = ?, type_sol = ?, exposition = ?,
      niveau_eau = ?, notes = ?
     WHERE id = ?`,
    [
      planche.nom,
      planche.superficie_m2,
      planche.type_sol || null,
      planche.exposition || null,
      planche.niveau_eau || 'inconnu',
      planche.notes || null,
      id,
    ]
  );
}

export function deletePlanche(id) {
  db.runSync(`UPDATE planches SET active = 0 WHERE id = ?`, [id]);
}

// ─────────────────────────────────────────────
// CULTURES EN COURS — CRUD
// ─────────────────────────────────────────────

export function getCulturesEnCoursByPlanche(plancheId) {
  return db.getAllSync(
    `SELECT c.*, cu.nom_fr, cu.nom_scientifique, cu.cycle_jours, cu.categorie
     FROM cultures_maraicheres_en_cours c
     JOIN cultures cu ON c.culture_id = cu.id
     WHERE c.planche_id = ? AND c.statut = 'en_cours'
     ORDER BY c.date_semis DESC`,
    [plancheId]
  );
}

export function getCulturesEnCoursBySite(siteId) {
  return db.getAllSync(
    `SELECT c.*, p.nom as planche_nom, p.superficie_m2,
            cu.nom_fr, cu.nom_scientifique, cu.cycle_jours, cu.couleur_badge
     FROM cultures_maraicheres_en_cours c
     JOIN planches p ON c.planche_id = p.id
     JOIN cultures cu ON c.culture_id = cu.id
     WHERE p.site_id = ? AND c.statut = 'en_cours'
     ORDER BY c.date_recolte_prevue ASC`,
    [siteId]
  );
}

export function insertCultureEnCours(culture) {
  // Calcul automatique de la date de récolte prévue si cycle connu
  let dateRecoltePrevue = culture.date_recolte_prevue || null;
  if (!dateRecoltePrevue && culture.date_semis && culture.cycle_jours) {
    const semis = new Date(culture.date_semis);
    semis.setDate(semis.getDate() + parseInt(culture.cycle_jours));
    dateRecoltePrevue = semis.toISOString().split('T')[0];
  }

  const result = db.runSync(
    `INSERT INTO cultures_maraicheres_en_cours
      (planche_id, culture_id, date_semis, date_repiquage, date_recolte_prevue,
       stade_actuel, rendement_prevu_kg, destination, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      culture.planche_id,
      culture.culture_id,
      culture.date_semis,
      culture.date_repiquage || null,
      dateRecoltePrevue,
      culture.stade_actuel || 'semis',
      culture.rendement_prevu_kg || null,
      culture.destination || 'autonomie',
      culture.notes || null,
    ]
  );
  return result.lastInsertRowId;
}

export function updateStadeCulture(id, stade) {
  db.runSync(
    `UPDATE cultures_maraicheres_en_cours SET stade_actuel = ? WHERE id = ?`,
    [stade, id]
  );
}

export function cloturerCulture(id, statut = 'recolte') {
  db.runSync(
    `UPDATE cultures_maraicheres_en_cours 
     SET statut = ?, date_cloture = ? WHERE id = ?`,
    [statut, new Date().toISOString().split('T')[0], id]
  );
}

// ─────────────────────────────────────────────
// RÉCOLTES — CRUD
// ─────────────────────────────────────────────

export function getRecoltesBySite(siteId, limitDays = 30) {
  const dateMin = new Date();
  dateMin.setDate(dateMin.getDate() - limitDays);
  return db.getAllSync(
    `SELECT r.*, p.nom as planche_nom, cu.nom_fr as culture_nom
     FROM recoltes_maraicheres r
     JOIN planches p ON r.planche_id = p.id
     JOIN cultures_maraicheres_en_cours c ON r.culture_en_cours_id = c.id
     JOIN cultures cu ON c.culture_id = cu.id
     WHERE r.site_id = ? AND r.date_recolte >= ?
     ORDER BY r.date_recolte DESC`,
    [siteId, dateMin.toISOString().split('T')[0]]
  );
}

export function insertRecolte(recolte) {
  const result = db.runSync(
    `INSERT INTO recoltes_maraicheres
      (culture_en_cours_id, planche_id, site_id, date_recolte,
       quantite_kg, qualite, destination, prix_vente_ar, notes, saisi_par)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      recolte.culture_en_cours_id,
      recolte.planche_id,
      recolte.site_id,
      recolte.date_recolte || new Date().toISOString().split('T')[0],
      recolte.quantite_kg,
      recolte.qualite || 'bonne',
      recolte.destination || 'autonomie',
      recolte.prix_vente_ar || 0,
      recolte.notes || null,
      recolte.saisi_par || 'operateur',
    ]
  );
  return result.lastInsertRowId;
}

// ─────────────────────────────────────────────
// FUMURE ORGANIQUE — CRUD + calcul disponible
// ─────────────────────────────────────────────

export function getApportsFumureByPlanche(plancheId) {
  return db.getAllSync(
    `SELECT * FROM apports_fumure WHERE planche_id = ? ORDER BY date_apport DESC`,
    [plancheId]
  );
}

export function insertApportFumure(apport) {
  const result = db.runSync(
    `INSERT INTO apports_fumure
      (planche_id, site_id, date_apport, type_fumure, quantite_kg, stade_culture, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      apport.planche_id,
      apport.site_id,
      apport.date_apport || new Date().toISOString().split('T')[0],
      apport.type_fumure,
      apport.quantite_kg,
      apport.stade_culture || null,
      apport.notes || null,
    ]
  );
  return result.lastInsertRowId;
}

// Calcul du fumier disponible estimé par site
// Basé sur le troupeau ForagePro : nb animaux × production journalière fumier
// Vache adulte : ~15 kg fumier/jour, génisse : ~8 kg, velle : ~3 kg
export function calcFumierDisponibleKg(siteId) {

  // Récupère les animaux actifs du site via ForagePro
  const animaux = db.getAllSync(
    `SELECT categorie, COUNT(*) as nb 
     FROM animaux 
     WHERE site_id = ? AND actif = 1
     GROUP BY categorie`,
    [siteId]
  );

  let fumierJournalierKg = 0;
  const FUMIER_PAR_CATEGORIE = {
    vache_laitiere: 15,
    vache_tarie: 12,
    genisse: 8,
    veau: 3,
    taureau: 18,
  };

  animaux.forEach(({ categorie, nb }) => {
    const kg = FUMIER_PAR_CATEGORIE[categorie] || 8;
    fumierJournalierKg += kg * nb;
  });

  // Total apporté sur les 30 derniers jours depuis ce site (déjà utilisé)
  const dateMin = new Date();
  dateMin.setDate(dateMin.getDate() - 30);
  const apportResult = db.getFirstSync(
    `SELECT COALESCE(SUM(quantite_kg), 0) as total
     FROM apports_fumure
     WHERE site_id = ? AND date_apport >= ? AND type_fumure = 'fumier_bovin'`,
    [siteId, dateMin.toISOString().split('T')[0]]
  );

  const produit30j = fumierJournalierKg * 30;
  const utilise30j = apportResult?.total || 0;
  const disponible = Math.max(0, produit30j - utilise30j);

  return {
    production_journaliere_kg: fumierJournalierKg,
    production_30j_kg: produit30j,
    utilise_30j_kg: utilise30j,
    disponible_kg: disponible,
  };
}

// ─────────────────────────────────────────────
// OBJECTIFS PRODUCTION SITE
// ─────────────────────────────────────────────

export function getObjectifsSite(siteId) {
  return db.getFirstSync(
    `SELECT * FROM objectifs_production_site WHERE site_id = ?`,
    [siteId]
  );
}

export function upsertObjectifsSite(siteId, objectifs) {
  const existing = getObjectifsSite(siteId);
  if (existing) {
    db.runSync(
      `UPDATE objectifs_production_site SET
        nb_personnes_menage = ?, nb_ouvriers = ?, nb_eleves_ecole = ?,
        frequence_ecole = ?, besoin_legumes_g_par_personne = ?,
        niveau_eau = ?, notes = ?
       WHERE site_id = ?`,
      [
        objectifs.nb_personnes_menage || 0,
        objectifs.nb_ouvriers || 0,
        objectifs.nb_eleves_ecole || 0,
        objectifs.frequence_ecole || 'quotidien',
        objectifs.besoin_legumes_g_par_personne || 150,
        objectifs.niveau_eau || 'inconnu',
        objectifs.notes || null,
        siteId,
      ]
    );
  } else {
    db.runSync(
      `INSERT INTO objectifs_production_site
        (site_id, nb_personnes_menage, nb_ouvriers, nb_eleves_ecole,
         frequence_ecole, besoin_legumes_g_par_personne, niveau_eau, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        siteId,
        objectifs.nb_personnes_menage || 0,
        objectifs.nb_ouvriers || 0,
        objectifs.nb_eleves_ecole || 0,
        objectifs.frequence_ecole || 'quotidien',
        objectifs.besoin_legumes_g_par_personne || 150,
        objectifs.niveau_eau || 'inconnu',
        objectifs.notes || null,
      ]
    );
  }
}

// Calcul du besoin journalier total en légumes (kg/jour)
export function calcBesoinJournalierKg(siteId) {
  const obj = getObjectifsSite(siteId);
  if (!obj) return { total_personnes: 0, besoin_kg_jour: 0 };

  const totalPersonnes =
    (obj.nb_personnes_menage || 0) +
    (obj.nb_ouvriers || 0) +
    (obj.nb_eleves_ecole || 0);

  const besoinKgJour =
    (totalPersonnes * (obj.besoin_legumes_g_par_personne || 150)) / 1000;

  return {
    total_personnes: totalPersonnes,
    besoin_kg_jour: besoinKgJour,
    dont_eleves: obj.nb_eleves_ecole || 0,
    dont_menage_ouvriers:
      (obj.nb_personnes_menage || 0) + (obj.nb_ouvriers || 0),
  };
}

// ─────────────────────────────────────────────
// DASHBOARD — Données synthétiques par site
// ─────────────────────────────────────────────

export function getDashboardMaraicher(siteId) {

  // Planches actives
  const planches = getAllPlanches(siteId);
  const superficieTotaleM2 = planches.reduce(
    (sum, p) => sum + p.superficie_m2,
    0
  );

  // Cultures en cours
  const cultures = getCulturesEnCoursBySite(siteId);

  // Prochaines récoltes (dans les 14 jours)
  const dans14j = new Date();
  dans14j.setDate(dans14j.getDate() + 14);
  const prochainesRecoltes = cultures.filter(
    (c) =>
      c.date_recolte_prevue &&
      new Date(c.date_recolte_prevue) <= dans14j
  );

  // Récoltes des 7 derniers jours
  const recoltes7j = getRecoltesBySite(siteId, 7);
  const totalRecolte7j = recoltes7j.reduce((sum, r) => sum + r.quantite_kg, 0);

  // Besoin journalier
  const besoin = calcBesoinJournalierKg(siteId);

  // Fumure disponible
  const fumure = calcFumierDisponibleKg(siteId);

  // Taux de couverture alimentaire (récolte moyenne/jour vs besoin/jour)
  const recoltesMoyenneJour = totalRecolte7j / 7;
  const tauxCouverture =
    besoin.besoin_kg_jour > 0
      ? Math.round((recoltesMoyenneJour / besoin.besoin_kg_jour) * 100)
      : null;

  return {
    nb_planches: planches.length,
    superficie_totale_m2: superficieTotaleM2,
    nb_cultures_actives: cultures.length,
    prochaines_recoltes: prochainesRecoltes,
    recolte_7j_kg: totalRecolte7j,
    besoin_journalier: besoin,
    fumure_disponible: fumure,
    taux_couverture_pct: tauxCouverture,
  };
}