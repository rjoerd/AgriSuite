// database/haccpSurveillance.js
// Phase 3 Session 10b1 — Surveillance opérationnelle HACCP

import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('certifpilot.db');

export const initHaccpSurveillance = () => {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS releves_ccp (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ccp_id INTEGER NOT NULL,
      lot_id INTEGER,
      lot_code TEXT,
      date_releve TEXT NOT NULL,
      heure_releve TEXT,
      operateur TEXT NOT NULL,
      equipe TEXT,
      conforme INTEGER NOT NULL DEFAULT 1,
      motif_non_conforme TEXT,
      valeurs_json TEXT NOT NULL,
      photo_path TEXT,
      observations TEXT,
      necessite_action_corrective INTEGER DEFAULT 0,
      action_corrective_resolue INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ccp_id) REFERENCES ccp_haccp(id) ON DELETE CASCADE
    );
  `);
  db.execSync(`
    CREATE TABLE IF NOT EXISTS actions_correctives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      releve_id INTEGER NOT NULL,
      type_action TEXT NOT NULL CHECK(type_action IN ('isoler', 'retraiter', 'declasser', 'detruire', 'autre')),
      description TEXT NOT NULL,
      responsable_decision TEXT,
      date_action TEXT NOT NULL,
      date_resolution TEXT,
      efficacite_verifiee INTEGER DEFAULT 0,
      methode_verification TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (releve_id) REFERENCES releves_ccp(id) ON DELETE CASCADE
    );
  `);
  db.execSync(`CREATE INDEX IF NOT EXISTS idx_releves_ccp ON releves_ccp(ccp_id);`);
  db.execSync(`CREATE INDEX IF NOT EXISTS idx_releves_lot ON releves_ccp(lot_id);`);
  db.execSync(`CREATE INDEX IF NOT EXISTS idx_releves_date ON releves_ccp(date_releve);`);
  db.execSync(`CREATE INDEX IF NOT EXISTS idx_actions_releve ON actions_correctives(releve_id);`);
  migrateCcpLotObligatoire();
  console.log('✅ Tables HACCP Surveillance initialisées (2 tables + migration)');
};

const migrateCcpLotObligatoire = () => {
  try {
    db.execSync(`ALTER TABLE ccp_haccp ADD COLUMN lot_obligatoire INTEGER DEFAULT 1;`);
    console.log('✅ [HACCP 10b1] Colonne lot_obligatoire ajoutée');
    const ccps = db.getAllSync(`SELECT id, etape_processus, nom_ccp FROM ccp_haccp`);
    let nbAmbiants = 0;
    for (const c of ccps) {
      const texte = `${c.etape_processus || ''} ${c.nom_ccp || ''}`.toLowerCase();
      const ambiant = (
        texte.includes('lavage') || texte.includes('eau') ||
        texte.includes('hygiène') || texte.includes('nettoyage') ||
        texte.includes('contrôle visuel') || texte.includes('inspection visuelle') ||
        texte.includes('ambiance') || texte.includes('stockage')
      );
      if (ambiant) {
        db.runSync(`UPDATE ccp_haccp SET lot_obligatoire = 0 WHERE id = ?`, [c.id]);
        nbAmbiants++;
      }
    }
    console.log(`✅ [HACCP 10b1] ${nbAmbiants} CCP marqués 'lot optionnel'`);
  } catch (err) {
    if (!String(err.message || err).includes('duplicate column')) {
      console.log('ℹ️ [HACCP 10b1] lot_obligatoire déjà présente');
    }
  }
};

export const TYPE_ACTION_LABELS = {
  isoler: '🔒 Isoler le lot',
  retraiter: '🔄 Retraiter',
  declasser: '⬇️ Déclasser',
  detruire: '🗑️ Détruire',
  autre: '⚙️ Autre',
};

export const TYPE_ACTION_DESCRIPTIONS = {
  isoler: 'Placer le lot en zone Q-EN-ATTENTE jusqu\'à décision',
  retraiter: 'Reprendre l\'étape pour ramener dans les limites',
  declasser: 'Réorienter vers un marché à exigences moindres',
  detruire: 'Élimination du lot, non commercialisable',
  autre: 'Action spécifique à détailler dans le commentaire',
};

export const evaluerConformite = (ccpId, valeurs) => {
  const limites = db.getAllSync(`SELECT * FROM limites_critiques WHERE ccp_id = ?`, [ccpId]);
  const motifs = [];
  let conforme = 1;
  for (const lim of limites) {
    const valeur = valeurs[lim.parametre];
    if (valeur === undefined || valeur === null || valeur === '') continue;
    const num = parseFloat(valeur);
    if (isNaN(num)) continue;
    if (lim.valeur_min !== null && lim.valeur_min !== undefined) {
      const seuilMin = lim.tolerance ? lim.valeur_min - lim.tolerance : lim.valeur_min;
      if (num < seuilMin) {
        conforme = 0;
        motifs.push(`${lim.parametre} = ${num}${lim.unite ? ' ' + lim.unite : ''} < min ${lim.valeur_min}${lim.unite ? ' ' + lim.unite : ''}`);
      }
    }
    if (lim.valeur_max !== null && lim.valeur_max !== undefined) {
      const seuilMax = lim.tolerance ? lim.valeur_max + lim.tolerance : lim.valeur_max;
      if (num > seuilMax) {
        conforme = 0;
        motifs.push(`${lim.parametre} = ${num}${lim.unite ? ' ' + lim.unite : ''} > max ${lim.valeur_max}${lim.unite ? ' ' + lim.unite : ''}`);
      }
    }
  }
  return { conforme, motifs: motifs.join(' · ') };
};

export const creerReleve = (releve) => {
  const { conforme, motifs } = evaluerConformite(releve.ccp_id, releve.valeurs || {});
  const result = db.runSync(
    `INSERT INTO releves_ccp (ccp_id, lot_id, lot_code, date_releve, heure_releve, operateur, equipe, conforme, motif_non_conforme, valeurs_json, photo_path, observations, necessite_action_corrective) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      releve.ccp_id, releve.lot_id || null, releve.lot_code || null,
      releve.date_releve, releve.heure_releve || null,
      releve.operateur, releve.equipe || null,
      conforme, motifs || null,
      JSON.stringify(releve.valeurs || {}),
      releve.photo_path || null, releve.observations || null,
      conforme === 0 ? 1 : 0,
    ]
  );
  return { id: result.lastInsertRowId, conforme, motifs };
};

export const getReleveById = (id) => {
  const r = db.getFirstSync(
    `SELECT r.*, c.numero as ccp_numero, c.nom_ccp, c.etape_processus, c.action_corrective_default, c.responsable as ccp_responsable, e.produit_nom, e.produit_code FROM releves_ccp r INNER JOIN ccp_haccp c ON r.ccp_id = c.id INNER JOIN etudes_haccp e ON c.etude_id = e.id WHERE r.id = ?`,
    [id]
  );
  if (r && r.valeurs_json) {
    try { r.valeurs = JSON.parse(r.valeurs_json); } catch { r.valeurs = {}; }
  }
  return r;
};

export const getRelevesByCcp = (ccpId, limit = 50) => {
  return db.getAllSync(
    `SELECT r.*, (SELECT COUNT(*) FROM actions_correctives ac WHERE ac.releve_id = r.id) as nb_actions FROM releves_ccp r WHERE r.ccp_id = ? ORDER BY r.date_releve DESC, r.heure_releve DESC LIMIT ?`,
    [ccpId, limit]
  );
};

export const getRelevesNonConformesNonResolus = () => {
  return db.getAllSync(
    `SELECT r.*, c.numero as ccp_numero, c.nom_ccp, c.etape_processus, e.produit_nom, (SELECT COUNT(*) FROM actions_correctives ac WHERE ac.releve_id = r.id) as nb_actions FROM releves_ccp r INNER JOIN ccp_haccp c ON r.ccp_id = c.id INNER JOIN etudes_haccp e ON c.etude_id = e.id WHERE r.conforme = 0 AND r.action_corrective_resolue = 0 ORDER BY r.date_releve DESC`
  );
};

export const getDerniersReleves = (limit = 20) => {
  return db.getAllSync(
    `SELECT r.*, c.numero as ccp_numero, c.nom_ccp, c.etape_processus, e.produit_nom FROM releves_ccp r INNER JOIN ccp_haccp c ON r.ccp_id = c.id INNER JOIN etudes_haccp e ON c.etude_id = e.id ORDER BY r.date_releve DESC, r.heure_releve DESC LIMIT ?`,
    [limit]
  );
};

export const supprimerReleve = (id) => {
  db.runSync(`DELETE FROM releves_ccp WHERE id = ?`, [id]);
};

export const creerActionCorrective = (action) => {
  const result = db.runSync(
    `INSERT INTO actions_correctives (releve_id, type_action, description, responsable_decision, date_action, date_resolution, efficacite_verifiee, methode_verification, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      action.releve_id, action.type_action, action.description,
      action.responsable_decision || null,
      action.date_action, action.date_resolution || null,
      action.efficacite_verifiee || 0,
      action.methode_verification || null,
      action.notes || null,
    ]
  );
  if (action.date_resolution) {
    db.runSync(`UPDATE releves_ccp SET action_corrective_resolue = 1 WHERE id = ?`, [action.releve_id]);
  }
  return result.lastInsertRowId;
};

export const getActionsByReleve = (releveId) => {
  return db.getAllSync(
    `SELECT * FROM actions_correctives WHERE releve_id = ? ORDER BY date_action DESC`,
    [releveId]
  );
};

export const updateActionCorrective = (id, updates) => {
  const champs = [];
  const valeurs = [];
  Object.keys(updates).forEach((key) => {
    champs.push(`${key} = ?`);
    valeurs.push(updates[key]);
  });
  valeurs.push(id);
  db.runSync(`UPDATE actions_correctives SET ${champs.join(', ')} WHERE id = ?`, valeurs);
  if (updates.date_resolution) {
    const action = db.getFirstSync(`SELECT releve_id FROM actions_correctives WHERE id = ?`, [id]);
    if (action) {
      db.runSync(`UPDATE releves_ccp SET action_corrective_resolue = 1 WHERE id = ?`, [action.releve_id]);
    }
  }
};

export const supprimerActionCorrective = (id) => {
  db.runSync(`DELETE FROM actions_correctives WHERE id = ?`, [id]);
};

export const getKpiSurveillance = () => {
  return db.getFirstSync(
    `SELECT (SELECT COUNT(*) FROM releves_ccp) as total_releves, (SELECT COUNT(*) FROM releves_ccp WHERE conforme = 1) as nb_conformes, (SELECT COUNT(*) FROM releves_ccp WHERE conforme = 0) as nb_non_conformes, (SELECT COUNT(*) FROM releves_ccp WHERE conforme = 0 AND action_corrective_resolue = 0) as nb_nc_non_resolus, (SELECT COUNT(*) FROM releves_ccp WHERE date_releve >= date('now', '-7 days')) as nb_7j, (SELECT COUNT(*) FROM releves_ccp WHERE date_releve = date('now')) as nb_aujourdhui`
  );
};

export const getCcpAvecLimites = (ccpId) => {
  const ccp = db.getFirstSync(
    `SELECT c.*, e.produit_nom, e.produit_code FROM ccp_haccp c INNER JOIN etudes_haccp e ON c.etude_id = e.id WHERE c.id = ?`,
    [ccpId]
  );
  if (!ccp) return null;
  ccp.limites = db.getAllSync(
    `SELECT * FROM limites_critiques WHERE ccp_id = ? ORDER BY parametre`,
    [ccpId]
  );
  return ccp;
};