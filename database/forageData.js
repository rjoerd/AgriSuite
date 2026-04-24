import * as SQLite from 'expo-sqlite';
const db = SQLite.openDatabaseSync('agrisuite.db');

export function seedForagePro() {
  const count = db.getFirstSync(`SELECT COUNT(*) as n FROM animaux`);
  if (count.n > 0) return;

  const siteId = 1;

  // Vache lactante
  db.runSync(
    `INSERT INTO animaux (site_id, nom, espece, race, sexe, categorie, date_entree, poids_kg, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [siteId, 'Vache 1', 'bovin', 'Locale croisée', 'femelle', 'vache_lactante', '2025-01-01', 380, '8L/jour actuellement']
  );

  // Génisse pleine
  db.runSync(
    `INSERT INTO animaux (site_id, nom, espece, race, sexe, categorie, date_entree, poids_kg, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [siteId, 'Génisse', 'bovin', 'Locale croisée', 'femelle', 'genisse_pleine', '2025-06-01', 280, 'Vêlage prévu dans ~2 mois']
  );

  // Velle
  db.runSync(
    `INSERT INTO animaux (site_id, nom, espece, race, sexe, categorie, date_entree, poids_kg, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [siteId, 'Velle', 'bovin', 'Locale', 'femelle', 'velle', '2025-10-01', 95, 'Née sur site']
  );

  // Stocks initiaux
  const stocks = [
    { nom: 'Bana grass', type: 'culture_site', qte: 120 },
    { nom: 'Brachiaria brizantha', type: 'culture_site', qte: 85 },
    { nom: 'Sorgho fourrager', type: 'culture_site', qte: 60 },
    { nom: 'Fourrage acheté (marché)', type: 'achete', qte: 50 },
    { nom: 'Desmodium', type: 'collecte', qte: 25 },
  ];
  for (const s of stocks) {
    db.runSync(
      `INSERT INTO stocks_fourrage (site_id, nom_fourrage, type_stock, quantite_kg, date_maj)
       VALUES (?, ?, ?, ?, date('now'))`,
      [siteId, s.nom, s.type, s.qte]
    );
  }
}