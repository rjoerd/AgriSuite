import * as SQLite from 'expo-sqlite';


const db = SQLite.openDatabaseSync('certifpilot.db');

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
      { code: 'Site A', superficie: '1 ha', region: 'Ampanotokana (près RN4)', altitude: '~1 316 m', type_terrain: 'Tanety', activite: 'Vierge — tout à faire', acces_eau: 'Problématique', notes: '' },
      { code: 'Site B', superficie: '1 000 m²', region: 'Belanitra (nord aéroport Ivato)', altitude: '~1 300 m', type_terrain: 'Tanety', activite: 'Vierge — tout à faire', acces_eau: 'Problématique', notes: '' },
      { code: 'Site C', superficie: '1 500 m²', region: '7 km est de Mahitsy', altitude: '~1 400 m', type_terrain: 'Tanety', activite: 'Vierge — tout à faire', acces_eau: 'Problématique', notes: '' },
      { code: 'Site D', superficie: '2 ha', region: '5 km de Moramanga', altitude: '~900 m', type_terrain: 'Bas-fond alluvial (fleuve Mangoro)', activite: 'Vierge — tout à faire', acces_eau: 'Bassin existant', notes: 'Potentiel pisciculture à évaluer' },
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