import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('certifpilot.db');

/**
 * Calcule et enregistre toutes les alertes pour une culture plantée sur une parcelle.
 * À appeler quand on enregistre une nouvelle parcelle_culture.
 */
export function genererAlertes(parcelleCultureId, cultureId, dateSemisISO) {
  // Récupérer tous les stades de cette culture
  const stades = db.getAllSync(
    'SELECT * FROM stades_phenologiques WHERE culture_id = ? ORDER BY ordre',
    [cultureId]
  );

  const dateSemis = new Date(dateSemisISO);

  // Supprimer les alertes existantes pour cette parcelle_culture
  db.runSync(
    'DELETE FROM alertes_parcelle WHERE parcelle_id = ? AND culture_id = ?',
    [parcelleCultureId, cultureId]
  );

  // Générer une alerte par stade
  const stmt = db.prepareSync(
    `INSERT INTO alertes_parcelle 
     (parcelle_id, culture_id, stade_code, date_alerte, statut) 
     VALUES (?, ?, ?, ?, 'en_attente')`
  );

  stades.forEach(stade => {
    // Alerte 2 jours avant le début du stade (pour préparation)
    const dateAlerte = new Date(dateSemis);
    dateAlerte.setDate(dateAlerte.getDate() + stade.jour_debut - 2);

    // Ne pas générer d'alerte dans le passé
    const aujourd_hui = new Date();
    if (dateAlerte >= aujourd_hui) {
      stmt.executeSync([
        parcelleCultureId,
        cultureId,
        stade.code,
        dateAlerte.toISOString().split('T')[0],
      ]);
    }
  });

  stmt.finalizeSync();
}

/**
 * Récupère les alertes à venir pour tous les sites (7 prochains jours).
 */
export function getAlertesProchaines(joursHorizon = 7) {
  const dateMin = new Date().toISOString().split('T')[0];
  const dateMax = new Date(Date.now() + joursHorizon * 86400000).toISOString().split('T')[0];

  return db.getAllSync(`
    SELECT 
      ap.id,
      ap.date_alerte,
      ap.stade_code,
      ap.statut,
      c.nom_fr AS culture_nom,
      c.code AS culture_code,
      p.nom AS parcelle_nom,
      s.nom_fr AS stade_nom,
      s.description AS stade_description,
      s.action_recommandee
    FROM alertes_parcelle ap
    JOIN cultures c ON ap.culture_id = c.id
    JOIN parcelles p ON ap.parcelle_id = p.id
    JOIN stades_phenologiques s ON s.culture_id = ap.culture_id AND s.code = ap.stade_code
    WHERE ap.statut = 'en_attente'
      AND ap.date_alerte BETWEEN ? AND ?
    ORDER BY ap.date_alerte ASC
  `, [dateMin, dateMax]);
}

/**
 * Marque une alerte comme validée ou ignorée.
 */
export function updateStatutAlerte(alerteId, statut) {
  db.runSync(
    'UPDATE alertes_parcelle SET statut = ? WHERE id = ?',
    [statut, alerteId]
  );
}

/**
 * Calcule le stade actuel d'une culture plantée.
 */
export function getStadeActuel(cultureId, dateSemisISO) {
  const joursSemis = Math.floor(
    (Date.now() - new Date(dateSemisISO).getTime()) / 86400000
  );

  const stade = db.getFirstSync(`
    SELECT * FROM stades_phenologiques
    WHERE culture_id = ?
      AND jour_debut <= ?
      AND (jour_fin IS NULL OR jour_fin >= ?)
    ORDER BY ordre DESC
    LIMIT 1
  `, [cultureId, joursSemis, joursSemis]);

  return stade ? { ...stade, jours_depuis_semis: joursSemis } : null;
}