// database/prp.js
// Phase 3 - Session 10c.1 - Programmes Pré-Requis (PRP)
// Référence : Codex CXC 1-1969 Rév. 2020 §III + ISO 22000 §8.2
//
// 4 tables : plans, procédures, registres, actions correctives
// Seed : 7 PRP standards avec cahier des charges + procédures pré-modélisées

import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('certifpilot.db');

// ============================================================
// TYPES PRP — Codex CXC 1-1969 §III
// ============================================================

export const TYPES_PRP = [
  {
    code: 'hygiene_personnel',
    nom: 'Hygiène du personnel',
    icone: '🧤',
    description_courte: 'Formation, suivi médical, tenue, lavage des mains',
    reference: 'Codex CXC 1-1969 §VII + ISO 22000 §8.2.4',
    danger_maitrise: 'Contamination microbiologique par opérateur',
    frequence_typique: 'Quotidienne (lavage) + annuelle (suivi médical)',
  },
  {
    code: 'nettoyage',
    nom: 'Nettoyage & désinfection',
    icone: '🧼',
    description_courte: 'Plan, produits homologués, registre, contrôle visuel + ATP',
    reference: 'Codex CXC 1-1969 §VI + ISO 22000 §8.2.4',
    danger_maitrise: 'Résidus, contamination croisée, biofilm',
    frequence_typique: 'Quotidienne (fin de poste) + hebdo (approfondi)',
  },
  {
    code: 'nuisibles',
    nom: 'Lutte contre les nuisibles',
    icone: '🐀',
    description_courte: 'Plan, postes appâts numérotés, registre interventions',
    reference: 'Codex CXC 1-1969 §VI.4 + ISO 22000 §8.2.4',
    danger_maitrise: 'Rongeurs, insectes, oiseaux — vecteurs Salmonella/E.coli',
    frequence_typique: 'Inspection mensuelle + intervention curative',
  },
  {
    code: 'eau',
    nom: 'Eau & glace',
    icone: '💧',
    description_courte: 'Analyses potabilité, sources, traitement, distribution',
    reference: 'Codex CXC 1-1969 §V + Directive UE 2020/2184 (eau potable)',
    danger_maitrise: 'Contamination microbiologique et chimique via eau',
    frequence_typique: 'Mensuel (chlore) + semestriel (microbio complet)',
  },
  {
    code: 'maintenance',
    nom: 'Maintenance équipements',
    icone: '🔧',
    description_courte: 'Calendrier préventif, étalonnage instruments, registre pannes',
    reference: 'Codex CXC 1-1969 §IV.4 + ISO 22000 §8.2.4',
    danger_maitrise: 'Corps étrangers (métal), perte de maîtrise CCP',
    frequence_typique: 'Trimestriel (préventif) + étalonnage annuel',
  },
  {
    code: 'dechets',
    nom: 'Gestion des déchets',
    icone: '🗑️',
    description_courte: 'Tri, évacuation, traçabilité — séparation propre/sale',
    reference: 'Codex CXC 1-1969 §IV.5 + Règlement UE 2008/98',
    danger_maitrise: 'Contamination croisée, nuisibles attirés',
    frequence_typique: 'Quotidienne (évacuation) + mensuelle (audit zones)',
  },
  {
    code: 'reception',
    nom: 'Réception & stockage',
    icone: '📦',
    description_courte: 'Contrôle fournisseurs, FIFO, T° stockage, séparation BIO/conv.',
    reference: 'Codex CXC 1-1969 §V.2 + Règlement UE 2018/848 art.28',
    danger_maitrise: 'Acceptation matières non conformes, mélange BIO/conv.',
    frequence_typique: 'À chaque réception + quotidien (T° stocks)',
  },
];

// ============================================================
// INITIALISATION TABLES
// ============================================================

export const initPRP = () => {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS prp_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type_prp TEXT NOT NULL CHECK(type_prp IN (
        'hygiene_personnel','nettoyage','nuisibles','eau',
        'maintenance','dechets','reception'
      )),
      nom TEXT NOT NULL,
      description TEXT,
      responsable TEXT,
      frequence_revision TEXT,
      derniere_revision TEXT,
      prochaine_revision TEXT,
      statut TEXT NOT NULL DEFAULT 'brouillon'
        CHECK(statut IN ('brouillon','valide','obsolete')),
      reference_reglementaire TEXT,
      danger_maitrise TEXT,
      site_id INTEGER,
      notes TEXT,
      est_seed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS prp_procedures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prp_plan_id INTEGER NOT NULL,
      titre TEXT NOT NULL,
      contenu_detaille TEXT,
      frequence_execution TEXT NOT NULL,
      responsable_execution TEXT,
      ordre INTEGER DEFAULT 0,
      lot_obligatoire INTEGER DEFAULT 0,
      photo_obligatoire INTEGER DEFAULT 0,
      valeurs_attendues_json TEXT,
      desactive INTEGER DEFAULT 0,
      est_seed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(prp_plan_id) REFERENCES prp_plans(id)
    );

    CREATE TABLE IF NOT EXISTS prp_registres (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prp_plan_id INTEGER NOT NULL,
      prp_procedure_id INTEGER,
      date_execution TEXT NOT NULL,
      heure_execution TEXT,
      operateur TEXT NOT NULL,
      lieu TEXT,
      resultat TEXT NOT NULL
        CHECK(resultat IN ('conforme','non_conforme','observation')),
      valeurs_json TEXT,
      observations TEXT,
      photo_path TEXT,
      necessite_action_corrective INTEGER DEFAULT 0,
      action_corrective_resolue INTEGER DEFAULT 0,
      site_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(prp_plan_id) REFERENCES prp_plans(id),
      FOREIGN KEY(prp_procedure_id) REFERENCES prp_procedures(id)
    );

    CREATE TABLE IF NOT EXISTS prp_actions_correctives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      registre_id INTEGER NOT NULL,
      type_action TEXT NOT NULL
        CHECK(type_action IN ('correction_immediate','retraitement','formation','maintenance','autre')),
      description TEXT NOT NULL,
      responsable_decision TEXT,
      date_action TEXT NOT NULL,
      date_resolution TEXT,
      efficacite_verifiee INTEGER DEFAULT 0,
      methode_verification TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(registre_id) REFERENCES prp_registres(id)
    );

    CREATE INDEX IF NOT EXISTS idx_prp_plans_type ON prp_plans(type_prp);
    CREATE INDEX IF NOT EXISTS idx_prp_proc_plan ON prp_procedures(prp_plan_id);
    CREATE INDEX IF NOT EXISTS idx_prp_reg_date ON prp_registres(date_execution);
    CREATE INDEX IF NOT EXISTS idx_prp_reg_plan ON prp_registres(prp_plan_id);
  `);

  console.log('✅ Tables PRP initialisées (4 tables Codex CXC 1-1969)');
};

// ============================================================
// SEED — 7 PRP STANDARDS avec procédures pré-modélisées
// ============================================================

export const seedPRP = () => {
  const existant = db.getFirstSync('SELECT COUNT(*) as n FROM prp_plans')?.n || 0;
  if (existant > 0) {
    console.log(`ℹ️ PRP déjà seedé (${existant} plans)`);
    return;
  }

  console.log('🌱 Seed PRP — 7 plans standards Codex CXC 1-1969...');

  TYPES_PRP.forEach(t => {
    const result = db.runSync(
      `INSERT INTO prp_plans
       (type_prp, nom, description, responsable, frequence_revision,
        statut, reference_reglementaire, danger_maitrise, est_seed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        t.code,
        `Plan ${t.nom}`,
        t.description_courte,
        'Responsable Qualité',
        'Annuelle',
        'brouillon',
        t.reference,
        t.danger_maitrise,
      ]
    );

    const planId = result.lastInsertRowId;
    const procs = PROCEDURES_SEED[t.code] || [];

    procs.forEach((p, idx) => {
      db.runSync(
        `INSERT INTO prp_procedures
         (prp_plan_id, titre, contenu_detaille, frequence_execution,
          responsable_execution, ordre, valeurs_attendues_json, est_seed)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          planId,
          p.titre,
          p.contenu,
          p.frequence,
          p.responsable || 'Opérateur',
          idx + 1,
          p.valeurs ? JSON.stringify(p.valeurs) : null,
        ]
      );
    });

    console.log(`   ✓ ${t.nom} : ${procs.length} procédure(s)`);
  });

  console.log('✅ Seed PRP terminé');
};

// ============================================================
// SEED — PROCÉDURES PAR PRP
// (3 à 5 procédures clés par PRP — couvre 80% des attentes auditeur)
// ============================================================

const PROCEDURES_SEED = {
  hygiene_personnel: [
    {
      titre: 'Lavage des mains à l\'entrée en zone production',
      contenu: 'Savon antibactérien, eau potable, séchage essuie-tout jetable. Durée minimale 30 secondes. Renouveler après pause, passage WC, manipulation déchets.',
      frequence: 'À chaque entrée en zone',
      valeurs: { conforme_si: 'lavage_effectue_30s', controle: 'visuel' },
    },
    {
      titre: 'Port de la tenue de travail propre',
      contenu: 'Blouse propre, charlotte cheveux, chaussures dédiées. Pas de bijoux mains/poignets. Ongles courts, non vernis.',
      frequence: 'Quotidienne (début de poste)',
      valeurs: { conforme_si: 'tenue_complete_propre' },
    },
    {
      titre: 'Suivi médical du personnel',
      contenu: 'Certificat aptitude annuel pour personnel manipulant denrées. Exclusion temporaire en cas de maladie infectieuse (gastro, plaies ouvertes, infection cutanée).',
      frequence: 'Annuelle',
      valeurs: { documents: 'certificat_aptitude_medical' },
    },
    {
      titre: 'Formation hygiène alimentaire',
      contenu: 'Formation initiale obligatoire + rappel annuel. Contenu : risques microbiologiques, lavage mains, BPF, traçabilité.',
      frequence: 'Annuelle',
      valeurs: { documents: 'attestation_formation' },
    },
  ],

  nettoyage: [
    {
      titre: 'Nettoyage fin de poste — surfaces de travail',
      contenu: 'Évacuation déchets → eau chaude + détergent alimentaire → rinçage eau potable → désinfectant homologué contact alimentaire → rinçage final → séchage air libre.',
      frequence: 'Quotidienne (fin de poste)',
      valeurs: { produits: 'detergent + desinfectant homologues', controle: 'visuel' },
    },
    {
      titre: 'Nettoyage approfondi équipements de séchage',
      contenu: 'Démontage parties amovibles. Brossage à sec. Lavage détergent alcalin. Rinçage. Désinfection. Vérification visuelle absence résidus.',
      frequence: 'Hebdomadaire',
      valeurs: { duree_minimum_minutes: 60 },
    },
    {
      titre: 'Contrôle ATP de propreté',
      contenu: 'Mesure ATP par luminomètre sur 3 points critiques (surface travail, table séchage, tapis convoyeur). Seuil acceptable : < 100 RLU. Si > 100 : nouveau nettoyage.',
      frequence: 'Hebdomadaire',
      valeurs: { seuil_max_rlu: 100, nb_points: 3 },
    },
    {
      titre: 'Rotation produits désinfectants',
      contenu: 'Alternance entre 2 désinfectants à modes d\'action différents pour éviter résistances. Documenter changement mensuel.',
      frequence: 'Mensuelle',
    },
  ],

  nuisibles: [
    {
      titre: 'Inspection visuelle postes d\'appâtage',
      contenu: 'Vérification de tous les postes numérotés (plan de masse). État : intact / consommé / endommagé / déplacé. Remplacement si nécessaire.',
      frequence: 'Mensuelle',
      valeurs: { format: 'tableau_par_poste', etats_possibles: ['intact','consomme','endommage','deplace'] },
    },
    {
      titre: 'Inspection traces de nuisibles',
      contenu: 'Recherche déjections, traces de gras, trous, nids dans zones de stockage et production. Photos des zones suspectes.',
      frequence: 'Mensuelle',
      valeurs: { zones: ['stockage','production','exterieur_5m'] },
    },
    {
      titre: 'Intervention curative en cas d\'infestation',
      contenu: 'Si traces avérées : isolation lots, intervention société prestataire agréée, traitement, contrôle 7-14 jours après. Documenter type produit et dose.',
      frequence: 'À la demande (NC)',
      valeurs: { prestataire_agree: 'requis' },
    },
    {
      titre: 'Contrat société de dératisation',
      contenu: 'Contrat actif avec prestataire agréé. Visites trimestrielles minimum. Rapport écrit conservé 5 ans.',
      frequence: 'Trimestrielle (visite prestataire)',
      valeurs: { documents: 'contrat + rapports_visite' },
    },
  ],

  eau: [
    {
      titre: 'Mesure chlore résiduel — eau de process',
      contenu: 'Test colorimétrique DPD au point d\'utilisation. Cible : 0.2 - 0.5 mg/L chlore libre. Si < 0.2 : recharger chloration. Si > 0.5 : diluer.',
      frequence: 'Quotidienne',
      valeurs: { unite: 'mg/L', min: 0.2, max: 0.5, parametre: 'chlore_libre' },
    },
    {
      titre: 'Analyse microbiologique complète',
      contenu: 'Prélèvement en bouteille stérile au point d\'utilisation. Envoi laboratoire accrédité COFRAC. Paramètres : E.coli, entérocoques, coliformes totaux, dénombrement microbien 22°C et 37°C.',
      frequence: 'Semestrielle',
      valeurs: { lab_accredite: 'requis', parametres: ['E.coli','enterocoques','coliformes'] },
    },
    {
      titre: 'Analyse physico-chimique',
      contenu: 'Paramètres : pH, conductivité, dureté, nitrates, métaux lourds (Pb, Cd, As). Conformité au Règlement UE 2020/2184.',
      frequence: 'Annuelle',
      valeurs: { reference: 'UE_2020_2184' },
    },
    {
      titre: 'Inspection visuelle bassin / source',
      contenu: 'Bassin Site D : état clôture, absence corps étrangers flottants, propreté berges 2m, absence animaux.',
      frequence: 'Hebdomadaire',
    },
  ],

  maintenance: [
    {
      titre: 'Étalonnage thermomètres CCP',
      contenu: 'Comparaison avec thermomètre étalon certifié (point de fusion glace 0°C + ébullition 100°C). Tolérance ± 1°C. Documenter écart.',
      frequence: 'Trimestrielle',
      valeurs: { tolerance_c: 1, points_etalonnage: [0, 100] },
    },
    {
      titre: 'Étalonnage balances',
      contenu: 'Vérification avec masses étalons (10g, 100g, 1kg, 10kg selon balance). Tolérance ± 0.5% de la masse de référence.',
      frequence: 'Semestrielle',
      valeurs: { tolerance_pct: 0.5 },
    },
    {
      titre: 'Vérification séchoirs (T° et HR)',
      contenu: 'Contrôle régulation thermostat. Test à vide T° cible. Vérification ventilation. État joints d\'étanchéité.',
      frequence: 'Trimestrielle',
    },
    {
      titre: 'Maintenance préventive générale',
      contenu: 'Tour complet équipements : graissage, serrage, état courroies/joints, propreté moteurs. Remplacement pièces usées avant panne.',
      frequence: 'Trimestrielle',
    },
  ],

  dechets: [
    {
      titre: 'Évacuation déchets organiques (résidus végétaux)',
      contenu: 'Sortie quotidienne fin de poste vers zone compost (≥ 20m des zones production). Bacs propres et identifiés. Pas de stockage > 24h en zone production.',
      frequence: 'Quotidienne',
      valeurs: { delai_max_h: 24 },
    },
    {
      titre: 'Tri sélectif déchets recyclables',
      contenu: 'Bacs distincts : plastique / carton / verre / métal. Nettoyage hebdo des bacs. Évacuation vers filière de recyclage agréée.',
      frequence: 'Hebdomadaire (nettoyage bacs)',
    },
    {
      titre: 'Audit zone stockage déchets',
      contenu: 'Vérification absence nuisibles, intégrité bacs, étanchéité, signalétique. Pas de déchets liquides au sol.',
      frequence: 'Mensuelle',
    },
  ],

  reception: [
    {
      titre: 'Contrôle réception matière première',
      contenu: 'Vérification bon de livraison vs commande. État emballage (intégrité, propreté). Température si pertinent. Documents fournisseur (certificat BIO, analyses, traçabilité).',
      frequence: 'À chaque réception',
      valeurs: { documents_requis: ['BL','certificat_origine','BIO_si_applicable'] },
    },
    {
      titre: 'Séparation physique lots BIO / conventionnels',
      contenu: 'Zones de stockage distinctes et identifiées. Pas de stockage simultané sur même palette. Affichage clair.',
      frequence: 'À chaque réception',
      valeurs: { reference: 'UE_2018_848_art_28' },
    },
    {
      titre: 'Application FIFO (First In First Out)',
      contenu: 'Étiquetage date réception sur chaque lot. Disposition stocks par date. Utilisation prioritaire des plus anciens. Surveillance DLC/DLUO.',
      frequence: 'Quotidienne (utilisation)',
    },
    {
      titre: 'Contrôle T° et HR zone stockage',
      contenu: 'Relevé quotidien thermomètre/hygromètre. Cibles : T° < 25°C, HR < 65% (produits secs). Alerte si dépassement.',
      frequence: 'Quotidienne',
      valeurs: { temp_max_c: 25, hr_max_pct: 65 },
    },
  ],
};

// ============================================================
// CRUD PLANS
// ============================================================

export const getAllPlans = () => {
  return db.getAllSync(`
    SELECT p.*,
      (SELECT COUNT(*) FROM prp_procedures WHERE prp_plan_id = p.id AND COALESCE(desactive,0) = 0) as nb_procedures,
      (SELECT COUNT(*) FROM prp_registres WHERE prp_plan_id = p.id AND date(date_execution) >= date('now','-30 days')) as nb_registres_30j,
      (SELECT COUNT(*) FROM prp_registres WHERE prp_plan_id = p.id AND necessite_action_corrective = 1 AND COALESCE(action_corrective_resolue,0) = 0) as nc_ouvertes
    FROM prp_plans p
    ORDER BY p.type_prp
  `);
};

export const getPlanById = (id) => {
  return db.getFirstSync('SELECT * FROM prp_plans WHERE id = ?', [id]);
};

export const getPlanByType = (typePrp) => {
  return db.getFirstSync('SELECT * FROM prp_plans WHERE type_prp = ?', [typePrp]);
};

export const updatePlan = (id, data) => {
  const fields = ['nom','description','responsable','frequence_revision',
    'derniere_revision','prochaine_revision','statut','notes','site_id'];
  const sets = fields.filter(f => data[f] !== undefined).map(f => `${f} = ?`);
  const vals = fields.filter(f => data[f] !== undefined).map(f => data[f]);
  if (sets.length === 0) return;
  db.runSync(
    `UPDATE prp_plans SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`,
    [...vals, id]
  );
};

// ============================================================
// CRUD PROCÉDURES
// ============================================================

export const getProceduresByPlan = (planId) => {
  return db.getAllSync(
    `SELECT * FROM prp_procedures
     WHERE prp_plan_id = ? AND COALESCE(desactive,0) = 0
     ORDER BY ordre, id`,
    [planId]
  );
};

export const createProcedure = (data) => {
  const result = db.runSync(
    `INSERT INTO prp_procedures
     (prp_plan_id, titre, contenu_detaille, frequence_execution,
      responsable_execution, ordre, lot_obligatoire, photo_obligatoire, valeurs_attendues_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.prp_plan_id, data.titre, data.contenu_detaille || null,
      data.frequence_execution, data.responsable_execution || null,
      data.ordre || 0, data.lot_obligatoire ? 1 : 0,
      data.photo_obligatoire ? 1 : 0,
      data.valeurs_attendues_json || null,
    ]
  );
  return result.lastInsertRowId;
};

// ============================================================
// CRUD REGISTRES
// ============================================================

export const createRegistre = (data) => {
  const result = db.runSync(
    `INSERT INTO prp_registres
     (prp_plan_id, prp_procedure_id, date_execution, heure_execution,
      operateur, lieu, resultat, valeurs_json, observations, photo_path,
      necessite_action_corrective, site_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.prp_plan_id, data.prp_procedure_id || null,
      data.date_execution, data.heure_execution || null,
      data.operateur, data.lieu || null,
      data.resultat, data.valeurs_json || null,
      data.observations || null, data.photo_path || null,
      data.resultat === 'non_conforme' ? 1 : 0,
      data.site_id || null,
    ]
  );
  return result.lastInsertRowId;
};

export const getRegistresByPlan = (planId, limit = 50) => {
  return db.getAllSync(
    `SELECT r.*, p.titre as procedure_titre
     FROM prp_registres r
     LEFT JOIN prp_procedures p ON p.id = r.prp_procedure_id
     WHERE r.prp_plan_id = ?
     ORDER BY r.date_execution DESC, r.heure_execution DESC
     LIMIT ?`,
    [planId, limit]
  );
};

export const getRegistreById = (id) => {
  return db.getFirstSync(
    `SELECT r.*, p.titre as procedure_titre, pl.nom as plan_nom, pl.type_prp
     FROM prp_registres r
     LEFT JOIN prp_procedures p ON p.id = r.prp_procedure_id
     LEFT JOIN prp_plans pl ON pl.id = r.prp_plan_id
     WHERE r.id = ?`,
    [id]
  );
};

// ============================================================
// CRUD ACTIONS CORRECTIVES
// ============================================================

export const createActionCorrective = (data) => {
  db.runSync(
    `INSERT INTO prp_actions_correctives
     (registre_id, type_action, description, responsable_decision,
      date_action, date_resolution, efficacite_verifiee, methode_verification, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.registre_id, data.type_action, data.description,
      data.responsable_decision || null, data.date_action,
      data.date_resolution || null,
      data.efficacite_verifiee ? 1 : 0,
      data.methode_verification || null, data.notes || null,
    ]
  );
  db.runSync(
    `UPDATE prp_registres SET action_corrective_resolue = 1 WHERE id = ?`,
    [data.registre_id]
  );
};

export const getActionsByRegistre = (registreId) => {
  return db.getAllSync(
    'SELECT * FROM prp_actions_correctives WHERE registre_id = ? ORDER BY date_action DESC',
    [registreId]
  );
};

// ============================================================
// STATISTIQUES & DASHBOARD
// ============================================================

export const getStatsPlan = (planId) => {
  const total30j = db.getFirstSync(
    `SELECT COUNT(*) as n FROM prp_registres
     WHERE prp_plan_id = ? AND date(date_execution) >= date('now','-30 days')`,
    [planId]
  )?.n || 0;

  const conformes30j = db.getFirstSync(
    `SELECT COUNT(*) as n FROM prp_registres
     WHERE prp_plan_id = ? AND date(date_execution) >= date('now','-30 days')
       AND resultat = 'conforme'`,
    [planId]
  )?.n || 0;

  const ncOuvertes = db.getFirstSync(
    `SELECT COUNT(*) as n FROM prp_registres
     WHERE prp_plan_id = ? AND necessite_action_corrective = 1
       AND COALESCE(action_corrective_resolue,0) = 0`,
    [planId]
  )?.n || 0;

  const dernierReleve = db.getFirstSync(
    `SELECT MAX(date_execution) as d FROM prp_registres WHERE prp_plan_id = ?`,
    [planId]
  )?.d;

  return {
    total_30j: total30j,
    conformes_30j: conformes30j,
    taux_conformite: total30j > 0 ? Math.round((conformes30j / total30j) * 100) : null,
    nc_ouvertes: ncOuvertes,
    dernier_releve: dernierReleve,
  };
};

export const getStatsGlobal = () => {
  const total7j = db.getFirstSync(
    `SELECT COUNT(*) as n FROM prp_registres WHERE date(date_execution) >= date('now','-7 days')`
  )?.n || 0;

  const ncTotal = db.getFirstSync(
    `SELECT COUNT(*) as n FROM prp_registres
     WHERE necessite_action_corrective = 1 AND COALESCE(action_corrective_resolue,0) = 0`
  )?.n || 0;

  const conf30j = db.getFirstSync(
    `SELECT
       SUM(CASE WHEN resultat = 'conforme' THEN 1 ELSE 0 END) as ok,
       COUNT(*) as total
     FROM prp_registres
     WHERE date(date_execution) >= date('now','-30 days')`
  );
  const taux = conf30j.total > 0 ? Math.round((conf30j.ok / conf30j.total) * 100) : null;

  return {
    registres_7j: total7j,
    nc_ouvertes: ncTotal,
    taux_conformite_30j: taux,
  };
};

// ============================================================
// HELPERS UI
// ============================================================

export const getTypePrpInfo = (code) => TYPES_PRP.find(t => t.code === code);

export const getStatutLabel = (statut) => {
  const map = {
    brouillon: 'Brouillon',
    valide: 'Validé',
    obsolete: 'Obsolète',
  };
  return map[statut] || statut;
};

export const getStatutColor = (statut) => {
  const map = {
    brouillon: '#d4a04a',
    valide: '#7ec87e',
    obsolete: '#888',
  };
  return map[statut] || '#888';
};

export const getResultatColor = (resultat) => {
  const map = {
    conforme: '#7ec87e',
    non_conforme: '#e74c3c',
    observation: '#d4a04a',
  };
  return map[resultat] || '#888';
};

export const getResultatLabel = (resultat) => {
  const map = {
    conforme: '✅ Conforme',
    non_conforme: '❌ Non conforme',
    observation: '⚠️ Observation',
  };
  return map[resultat] || resultat;
};