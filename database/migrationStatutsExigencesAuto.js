// database/migrationStatutsExigencesAuto.js
// Session 10c.6 — Ajout colonnes pour traçabilité auto-évaluation
// À importer et appeler dans App.js AVANT le render, après seedPrp() etc.

import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('certifpilot.db');

export function migrationStatutsExigencesAuto() {
  // Idempotent : try/catch sur chaque ALTER (SQLite ne fait pas IF NOT EXISTS sur colonne)
  const colonnes = [
    { nom: 'preuve_auto', type: 'TEXT' },
    { nom: 'details_auto', type: 'TEXT' },
    { nom: 'source_auto', type: 'TEXT' },
    { nom: 'date_evaluation', type: 'TEXT' },
    { nom: 'statut_manuel', type: 'INTEGER DEFAULT 0' },
  ];

  for (const col of colonnes) {
    try {
      db.execSync(`ALTER TABLE statuts_exigences ADD COLUMN ${col.nom} ${col.type}`);
      console.log(`[Migration 10c.6] Colonne ${col.nom} ajoutée`);
    } catch (e) {
      // Colonne existe déjà — OK
    }
  }
}