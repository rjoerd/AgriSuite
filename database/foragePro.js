import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('certifpilot.db');

export function initForagePro() {
  db.execSync(`
    -- Animaux du troupeau
    CREATE TABLE IF NOT EXISTS animaux (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id INTEGER NOT NULL,
      nom TEXT NOT NULL,
      espece TEXT DEFAULT 'bovin',
      race TEXT,
      sexe TEXT NOT NULL,          -- 'femelle' | 'male'
      categorie TEXT NOT NULL,     -- 'vache_lactante' | 'vache_tarie' | 'genisse_pleine' | 'genisse' | 'velle' | 'taureau' | 'veau'
      date_naissance TEXT,
      date_entree TEXT,
      poids_kg REAL,
      notes TEXT,
      actif INTEGER DEFAULT 1,
      FOREIGN KEY (site_id) REFERENCES sites(id)
    );

    -- Productions laitières journalières
    CREATE TABLE IF NOT EXISTS productions_laitieres (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      animal_id INTEGER NOT NULL,
      site_id INTEGER NOT NULL,
      date_releve TEXT NOT NULL,
      litres_matin REAL DEFAULT 0,
      litres_soir REAL DEFAULT 0,
      litres_total REAL GENERATED ALWAYS AS (litres_matin + litres_soir) STORED,
      qualite TEXT,                -- 'normale' | 'anormale'
      observations TEXT,
      FOREIGN KEY (animal_id) REFERENCES animaux(id),
      FOREIGN KEY (site_id) REFERENCES sites(id)
    );

    -- Stocks fourragers
    CREATE TABLE IF NOT EXISTS stocks_fourrage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id INTEGER NOT NULL,
      culture_id INTEGER,          -- lien CropEngine (nullable si fourrage acheté)
      nom_fourrage TEXT NOT NULL,
      type_stock TEXT NOT NULL,    -- 'culture_site' | 'achete' | 'collecte'
      quantite_kg REAL DEFAULT 0,
      date_maj TEXT NOT NULL,
      notes TEXT,
      FOREIGN KEY (site_id) REFERENCES sites(id),
      FOREIGN KEY (culture_id) REFERENCES cultures(id)
    );

    -- Mouvements de stock (entrées/sorties)
    CREATE TABLE IF NOT EXISTS mouvements_fourrage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stock_id INTEGER NOT NULL,
      site_id INTEGER NOT NULL,
      date_mouvement TEXT NOT NULL,
      type_mouvement TEXT NOT NULL, -- 'entree' | 'sortie_ration' | 'sortie_perte'
      quantite_kg REAL NOT NULL,
      cout_ariary REAL DEFAULT 0,
      notes TEXT,
      FOREIGN KEY (stock_id) REFERENCES stocks_fourrage(id),
      FOREIGN KEY (site_id) REFERENCES sites(id)
    );
  `);
}

// ── ANIMAUX ──────────────────────────────────────────────

export function getAllAnimaux(siteId) {
  return db.getAllSync(
    `SELECT * FROM animaux WHERE site_id = ? AND actif = 1 ORDER BY categorie, nom`,
    [siteId]
  );
}

export function getAnimalById(id) {
  return db.getFirstSync(`SELECT * FROM animaux WHERE id = ?`, [id]);
}

export function insertAnimal(animal) {
  return db.runSync(
    `INSERT INTO animaux (site_id, nom, espece, race, sexe, categorie, date_naissance, date_entree, poids_kg, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [animal.site_id, animal.nom, animal.espece || 'bovin', animal.race || '',
     animal.sexe, animal.categorie, animal.date_naissance || '',
     animal.date_entree || new Date().toISOString().split('T')[0],
     animal.poids_kg || null, animal.notes || '']
  );
}

export function updateAnimal(id, animal) {
  return db.runSync(
    `UPDATE animaux SET nom=?, race=?, sexe=?, categorie=?, date_naissance=?, poids_kg=?, notes=? WHERE id=?`,
    [animal.nom, animal.race || '', animal.sexe, animal.categorie,
     animal.date_naissance || '', animal.poids_kg || null, animal.notes || '', id]
  );
}

export function deleteAnimal(id) {
  return db.runSync(`UPDATE animaux SET actif = 0 WHERE id = ?`, [id]);
}

// ── PRODUCTIONS LAITIÈRES ────────────────────────────────

export function getProductionsRecentes(siteId, jours = 7) {
  return db.getAllSync(
    `SELECT pl.*, a.nom as animal_nom, a.categorie
     FROM productions_laitieres pl
     JOIN animaux a ON pl.animal_id = a.id
     WHERE pl.site_id = ?
     AND pl.date_releve >= date('now', ? || ' days')
     ORDER BY pl.date_releve DESC, a.nom`,
    [siteId, `-${jours}`]
  );
}

export function getProductionJour(siteId, date) {
  return db.getAllSync(
    `SELECT pl.*, a.nom as animal_nom
     FROM productions_laitieres pl
     JOIN animaux a ON pl.animal_id = a.id
     WHERE pl.site_id = ? AND pl.date_releve = ?`,
    [siteId, date]
  );
}

export function insertProduction(prod) {
  return db.runSync(
    `INSERT INTO productions_laitieres (animal_id, site_id, date_releve, litres_matin, litres_soir, qualite, observations)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [prod.animal_id, prod.site_id, prod.date_releve,
     prod.litres_matin || 0, prod.litres_soir || 0,
     prod.qualite || 'normale', prod.observations || '']
  );
}

// ── STOCKS FOURRAGERS ────────────────────────────────────

export function getStocksBySite(siteId) {
  return db.getAllSync(
    `SELECT sf.*, c.nom_fr as culture_nom
     FROM stocks_fourrage sf
     LEFT JOIN cultures c ON sf.culture_id = c.id
     WHERE sf.site_id = ?
     ORDER BY sf.quantite_kg DESC`,
    [siteId]
  );
}

export function updateQuantiteStock(stockId, nouvelleQuantite) {
  return db.runSync(
    `UPDATE stocks_fourrage SET quantite_kg = ?, date_maj = date('now') WHERE id = ?`,
    [nouvelleQuantite, stockId]
  );
}

export function insertMouvement(mouvement) {
  // Enregistre le mouvement ET met à jour le stock
  db.runSync(
    `INSERT INTO mouvements_fourrage (stock_id, site_id, date_mouvement, type_mouvement, quantite_kg, cout_ariary, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [mouvement.stock_id, mouvement.site_id, mouvement.date_mouvement,
     mouvement.type_mouvement, mouvement.quantite_kg,
     mouvement.cout_ariary || 0, mouvement.notes || '']
  );
  const delta = mouvement.type_mouvement === 'entree' ? mouvement.quantite_kg : -mouvement.quantite_kg;
  db.runSync(
    `UPDATE stocks_fourrage SET quantite_kg = quantite_kg + ?, date_maj = date('now') WHERE id = ?`,
    [delta, mouvement.stock_id]
  );
}

// ── CALCULS ALERTE SOUDURE ───────────────────────────────

export function getStatsSoudure(siteId) {
  // Total stock disponible
  const stockTotal = db.getFirstSync(
    `SELECT COALESCE(SUM(quantite_kg), 0) as total FROM stocks_fourrage WHERE site_id = ?`,
    [siteId]
  );
  // Consommation moyenne sur 7 derniers jours (sorties ration)
  const consoMoy = db.getFirstSync(
    `SELECT COALESCE(AVG(quantite_kg), 0) as moy_jour
     FROM (
       SELECT date_mouvement, SUM(quantite_kg) as quantite_kg
       FROM mouvements_fourrage
       WHERE site_id = ? AND type_mouvement = 'sortie_ration'
       AND date_mouvement >= date('now', '-7 days')
       GROUP BY date_mouvement
     )`,
    [siteId]
  );
  const stockKg = stockTotal.total;
  const consoJour = consoMoy.moy_jour;
  const joursRestants = consoJour > 0 ? Math.floor(stockKg / consoJour) : null;
  return { stockKg, consoJour, joursRestants };
}