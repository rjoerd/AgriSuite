import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('agrisuite.db');

export function initCropEngine() {
  db.execSync(`
    -- Cultures : identité et exigences pédoclimatiques
    CREATE TABLE IF NOT EXISTS cultures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,          -- ex: 'brachiaria_brizantha'
      nom_fr TEXT NOT NULL,               -- ex: 'Brachiaria brizantha'
      nom_local TEXT,                     -- nom malgache
      nom_scientifique TEXT,
      famille TEXT,
      type TEXT NOT NULL,                 -- 'fourrage_graminee' | 'fourrage_legumineuse' | 'maraicher' | 'export_perenne' | 'export_annuel'
      cycle_jours INTEGER,                -- cycle moyen en jours
      zones_adaptees TEXT NOT NULL,       -- JSON array: ['hautes_terres','cote_est',...]
      altitude_min INTEGER,
      altitude_max INTEGER,
      temp_min REAL,
      temp_max REAL,
      pluvio_min INTEGER,                 -- mm/an minimum
      pluvio_optimale INTEGER,
      tolerance_secheresse TEXT,          -- 'faible' | 'moyenne' | 'bonne' | 'excellente'
      type_sol_prefere TEXT,
      notes TEXT,
      actif INTEGER DEFAULT 1
    );

    -- Stades phénologiques par culture
    CREATE TABLE IF NOT EXISTS stades_phenologiques (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      culture_id INTEGER NOT NULL,
      ordre INTEGER NOT NULL,             -- ordre d'apparition
      code TEXT NOT NULL,                 -- 'semis' | 'levee' | 'tallage' | 'floraison' | 'recolte'...
      nom_fr TEXT NOT NULL,
      jour_debut INTEGER NOT NULL,        -- jours après semis/plantation
      jour_fin INTEGER,
      description TEXT,
      action_recommandee TEXT,
      FOREIGN KEY (culture_id) REFERENCES cultures(id)
    );

    -- Besoins en intrants par stade
    CREATE TABLE IF NOT EXISTS besoins_intrants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      culture_id INTEGER NOT NULL,
      stade_code TEXT NOT NULL,
      type_intrant TEXT NOT NULL,         -- 'eau' | 'fumure_organique' | 'engrais_mineral' | 'traitement'
      dose TEXT,                          -- ex: '20-30L/m²/semaine'
      unite TEXT,
      frequence TEXT,
      notes TEXT,
      FOREIGN KEY (culture_id) REFERENCES cultures(id)
    );

    -- Grilles d'observation par stade
    CREATE TABLE IF NOT EXISTS grilles_observation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      culture_id INTEGER NOT NULL,
      stade_code TEXT NOT NULL,
      heure_observation TEXT,             -- ex: '6h-9h'
      localisation_anatomique TEXT,       -- où regarder sur la plante
      criteres TEXT NOT NULL,             -- JSON array de critères visuels
      photos_requises INTEGER DEFAULT 0,
      description_photos TEXT,
      saisie_formulaire TEXT,             -- JSON schema du formulaire opérateur
      FOREIGN KEY (culture_id) REFERENCES cultures(id)
    );

    -- Ravageurs et maladies
    CREATE TABLE IF NOT EXISTS ravageurs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      culture_id INTEGER NOT NULL,
      nom TEXT NOT NULL,
      type TEXT NOT NULL,                 -- 'ravageur' | 'maladie' | 'carence'
      symptomes TEXT NOT NULL,
      seuil_intervention TEXT,
      actions_biologiques TEXT,           -- JSON array
      plantes_associees_preventives TEXT,
      FOREIGN KEY (culture_id) REFERENCES cultures(id)
    );

    -- Alertes calculées par parcelle cultivée
    CREATE TABLE IF NOT EXISTS alertes_parcelle (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parcelle_id INTEGER NOT NULL,
      culture_id INTEGER NOT NULL,
      stade_code TEXT NOT NULL,
      date_alerte TEXT NOT NULL,          -- ISO date calculée
      statut TEXT DEFAULT 'en_attente',  -- 'en_attente' | 'envoyee' | 'validee' | 'ignoree'
      date_creation TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (parcelle_id) REFERENCES parcelles(id),
      FOREIGN KEY (culture_id) REFERENCES cultures(id)
    );

    -- Cultures en cours sur une parcelle
    CREATE TABLE IF NOT EXISTS parcelle_cultures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parcelle_id INTEGER NOT NULL,
      culture_id INTEGER NOT NULL,
      date_semis TEXT NOT NULL,           -- ISO date
      superficie_m2 REAL,
      zone_parcelle TEXT,                 -- ex: 'planche_nord', 'ligne_agroforestiere'
      statut TEXT DEFAULT 'en_cours',    -- 'en_cours' | 'recolte' | 'abandonne'
      notes TEXT,
      FOREIGN KEY (parcelle_id) REFERENCES parcelles(id),
      FOREIGN KEY (culture_id) REFERENCES cultures(id)
    );
  `);
}

// ============================================================
// Patch — database/cropEngine.js
// Phase 3 / Session 4
//
// Le fichier actuel n'expose que initCropEngine(). On ajoute deux helpers
// CRUD lecture nécessaires pour les écrans M4 ExportTrack (LotListScreen
// et LotProductionFormScreen).
//
// À AJOUTER À LA FIN du fichier database/cropEngine.js, juste après la
// fermeture de initCropEngine().
// ============================================================

// ─────────────────────────────────────────────
// CRUD — Cultures (lecture)
// ─────────────────────────────────────────────

/**
 * Retourne toutes les cultures actives, triées par nom français.
 * Utilisé par les écrans qui ont besoin d'une liste de cultures
 * (sélecteurs de formulaire, indexation pour affichage).
 */
export function getAllCultures() {
  return db.getAllSync(
    `SELECT * FROM cultures WHERE actif = 1 ORDER BY nom_fr`
  );
}

/**
 * Retourne une culture par son identifiant.
 */
export function getCultureById(id) {
  return db.getFirstSync(`SELECT * FROM cultures WHERE id = ?`, [id]);
}

/**
 * Retourne une culture par son code unique (ex: 'gingembre').
 * Utile pour la résolution code culture → ID lors d'imports
 * ou de génération de codes lot.
 */
export function getCultureByCode(code) {
  return db.getFirstSync(`SELECT * FROM cultures WHERE code = ?`, [code]);
}