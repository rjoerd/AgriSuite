import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('agrisuite.db');

export function initDB() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS sites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL,
      superficie TEXT,
      region TEXT,
      altitude TEXT,
      type_terrain TEXT,
      activite TEXT,
      acces_eau TEXT,
      notes TEXT
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS parcelles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id INTEGER NOT NULL,
      nom TEXT,
      coordonnees TEXT,
      superficie_m2 REAL,
      date_releve TEXT,
      FOREIGN KEY (site_id) REFERENCES sites(id)
    );
  `);

  const count = db.getFirstSync('SELECT COUNT(*) as n FROM sites');
  if (count.n === 0) {
    const sites = [
      { code: 'Site A', superficie: '2 ha', region: 'Ampanotokana (près RN4)', altitude: '~1 316 m', type_terrain: 'Tanety', activite: 'Vierge — tout à faire', acces_eau: 'Problématique', notes: '' },
      { code: 'Site B', superficie: '1 ha', region: 'Belanitra (nord aéroport Ivato)', altitude: '~1 300 m', type_terrain: 'Tanety', activite: 'Vierge — tout à faire', acces_eau: 'Problématique', notes: '' },
      { code: 'Site C', superficie: '3 000 m²', region: '7 km est de Mahitsy', altitude: '~1 400 m', type_terrain: 'Tanety', activite: 'Vierge — tout à faire', acces_eau: 'Problématique', notes: '' },
      { code: 'Site D', superficie: '1 000 m²', region: '5 km de Moramanga', altitude: '~900 m', type_terrain: 'Bas-fond alluvial (fleuve Mangoro)', activite: 'Vierge — tout à faire', acces_eau: 'Bassin existant', notes: 'Potentiel pisciculture à évaluer' },
    ];
    for (const s of sites) {
      db.runSync(
        'INSERT INTO sites (code, superficie, region, altitude, type_terrain, activite, acces_eau, notes) VALUES (?,?,?,?,?,?,?,?)',
        [s.code, s.superficie, s.region, s.altitude, s.type_terrain, s.activite, s.acces_eau, s.notes]
      );
    }
  }
}

export function getAllSites() {
  return db.getAllSync('SELECT * FROM sites ORDER BY id ASC');
}

export function getSiteById(id) {
  return db.getFirstSync('SELECT * FROM sites WHERE id = ?', [id]);
}

export function insertSite(site) {
  const { code, superficie, region, altitude, type_terrain, activite, acces_eau, notes } = site;
  db.runSync(
    'INSERT INTO sites (code, superficie, region, altitude, type_terrain, activite, acces_eau, notes) VALUES (?,?,?,?,?,?,?,?)',
    [code, superficie, region, altitude, type_terrain, activite, acces_eau, notes]
  );
}

export function updateSite(id, site) {
  const { code, superficie, region, altitude, type_terrain, activite, acces_eau, notes } = site;
  db.runSync(
    'UPDATE sites SET code=?, superficie=?, region=?, altitude=?, type_terrain=?, activite=?, acces_eau=?, notes=? WHERE id=?',
    [code, superficie, region, altitude, type_terrain, activite, acces_eau, notes, id]
  );
}

export function deleteSite(id) {
  db.runSync('DELETE FROM sites WHERE id = ?', [id]);
}

export function getParcellesBySite(siteId) {
  return db.getAllSync('SELECT * FROM parcelles WHERE site_id = ? ORDER BY id ASC', [siteId]);
}

export function insertParcelle(parcelle) {
  const { site_id, nom, coordonnees, superficie_m2, date_releve } = parcelle;
  db.runSync(
    'INSERT INTO parcelles (site_id, nom, coordonnees, superficie_m2, date_releve) VALUES (?,?,?,?,?)',
    [site_id, nom, JSON.stringify(coordonnees), superficie_m2, date_releve]
  );
}

export function deleteParcelle(id) {
  db.runSync('DELETE FROM parcelles WHERE id = ?', [id]);
}

import { initCropEngine } from './cropEngine';
import { CULTURES_FOURRAGERES, STADES_FOURRAGERS } from './cropData';

/**
 * Peuple la base CropEngine avec les données initiales.
 * Idempotent — vérifie si les données existent déjà.
 */
export function seedCropEngine() {
  const count = db.getFirstSync('SELECT COUNT(*) as n FROM cultures');
  if (count?.n > 0) return; // Déjà seedé

  CULTURES_FOURRAGERES.forEach(c => {
    db.runSync(`
      INSERT OR IGNORE INTO cultures (
        code, nom_fr, nom_local, nom_scientifique, famille, type,
        cycle_jours, zones_adaptees, altitude_min, altitude_max,
        temp_min, temp_max, pluvio_min, pluvio_optimale,
        tolerance_secheresse, type_sol_prefere, notes
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        c.code, c.nom_fr, c.nom_local, c.nom_scientifique, c.famille, c.type,
        c.cycle_jours, JSON.stringify(c.zones_adaptees),
        c.altitude_min, c.altitude_max, c.temp_min, c.temp_max,
        c.pluvio_min, c.pluvio_optimale, c.tolerance_secheresse,
        c.type_sol_prefere, c.notes,
      ]
    );
  });

  STADES_FOURRAGERS.forEach(s => {
    const culture = db.getFirstSync(
      'SELECT id FROM cultures WHERE code = ?', [s.culture_code]
    );
    if (!culture) return;

    db.runSync(`
      INSERT OR IGNORE INTO stades_phenologiques (
        culture_id, ordre, code, nom_fr, jour_debut, jour_fin, description, action_recommandee
      ) VALUES (?,?,?,?,?,?,?,?)`,
      [culture.id, s.ordre, s.code, s.nom_fr, s.jour_debut, s.jour_fin, s.description, s.action_recommandee]
    );
  });
}
