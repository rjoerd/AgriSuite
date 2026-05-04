// ============================================================
// AgriSuite Madagascar — Phase 3 / Session 6 livraison 2
// database/parametresEntreprise.js
//
// Table singleton (une seule entrée) qui stocke les paramètres de
// l'entreprise utilisateur d'AgriSuite : nom commercial, adresse,
// contact, identifiants fiscaux malgaches.
//
// Ces paramètres sont utilisés pour personnaliser l'en-tête des
// documents générés (PDF passeport lot, futurs rapports SCI, contrats
// producteurs, etc.).
//
// API :
//   - initParametresEntreprise() : création de la table (idempotent)
//   - getParametresEntreprise() : lecture (retourne null si pas configuré)
//   - upsertParametresEntreprise(params) : insert ou update
// ============================================================

import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('agrisuite.db');

// ============================================================
// INITIALISATION
// ============================================================

export function initParametresEntreprise() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS parametres_entreprise (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      nom_commercial TEXT,
      raison_sociale TEXT,
      adresse_ligne1 TEXT,
      adresse_ligne2 TEXT,
      code_postal TEXT,
      ville TEXT,
      pays TEXT DEFAULT 'Madagascar',
      email TEXT,
      telephone TEXT,
      site_web TEXT,
      nif TEXT,
      stat_fiscale TEXT,
      numero_rcs TEXT,
      slogan TEXT,
      couleur_accent TEXT DEFAULT '#1a5d2e',
      langue_pdf_defaut TEXT DEFAULT 'fr',
      mention_pied_page TEXT,
      cree_le TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      modifie_le TEXT
    );
  `);
}

// ============================================================
// CRUD
// ============================================================

/**
 * Récupère les paramètres de l'entreprise.
 * @returns {object|null} - paramètres ou null si jamais configuré
 */
export function getParametresEntreprise() {
  return db.getFirstSync(
    `SELECT * FROM parametres_entreprise WHERE id = 1`
  );
}

/**
 * Insère ou met à jour les paramètres entreprise (singleton).
 * @param {object} params
 */
export function upsertParametresEntreprise(params) {
  const existing = getParametresEntreprise();
  const now = new Date().toISOString();

  if (existing) {
    db.runSync(
      `UPDATE parametres_entreprise SET
        nom_commercial = ?, raison_sociale = ?,
        adresse_ligne1 = ?, adresse_ligne2 = ?,
        code_postal = ?, ville = ?, pays = ?,
        email = ?, telephone = ?, site_web = ?,
        nif = ?, stat_fiscale = ?, numero_rcs = ?,
        slogan = ?, couleur_accent = ?,
        langue_pdf_defaut = ?, mention_pied_page = ?,
        modifie_le = ?
       WHERE id = 1`,
      [
        params.nom_commercial || null,
        params.raison_sociale || null,
        params.adresse_ligne1 || null,
        params.adresse_ligne2 || null,
        params.code_postal || null,
        params.ville || null,
        params.pays || 'Madagascar',
        params.email || null,
        params.telephone || null,
        params.site_web || null,
        params.nif || null,
        params.stat_fiscale || null,
        params.numero_rcs || null,
        params.slogan || null,
        params.couleur_accent || '#1a5d2e',
        params.langue_pdf_defaut || 'fr',
        params.mention_pied_page || null,
        now,
      ]
    );
  } else {
    db.runSync(
      `INSERT INTO parametres_entreprise
        (id, nom_commercial, raison_sociale,
         adresse_ligne1, adresse_ligne2,
         code_postal, ville, pays,
         email, telephone, site_web,
         nif, stat_fiscale, numero_rcs,
         slogan, couleur_accent,
         langue_pdf_defaut, mention_pied_page)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        params.nom_commercial || null,
        params.raison_sociale || null,
        params.adresse_ligne1 || null,
        params.adresse_ligne2 || null,
        params.code_postal || null,
        params.ville || null,
        params.pays || 'Madagascar',
        params.email || null,
        params.telephone || null,
        params.site_web || null,
        params.nif || null,
        params.stat_fiscale || null,
        params.numero_rcs || null,
        params.slogan || null,
        params.couleur_accent || '#1a5d2e',
        params.langue_pdf_defaut || 'fr',
        params.mention_pied_page || null,
      ]
    );
  }
}

/**
 * Indique si les paramètres sont configurés (au moins le nom commercial).
 */
export function estConfigure() {
  const p = getParametresEntreprise();
  return !!(p && p.nom_commercial);
}