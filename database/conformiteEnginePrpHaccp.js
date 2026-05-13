// database/conformiteEnginePrpHaccp.js
// Session 10c.6 — Auto-validation exigences HACCP depuis registres PRP
// v3 : colonnes réelles confirmées (date_execution, titre, frequence_execution,
//      desactive, type_prp, responsable_decision)

import * as SQLite from 'expo-sqlite';

let _db = null;
function getDb() {
  if (!_db) {
    _db = SQLite.openDatabaseSync('agrisuite.db');
  }
  return _db;
}

// Statuts d'engagement considérés comme "actifs" pour la validation
// (tout sauf abandonné/suspendu/expiré)
const STATUTS_ENGAGEMENT_ACTIFS = ['actif', 'engage', 'en_cours', 'en_conversion', 'certifie', null];

function isStatutActif(statut) {
  if (statut === null || statut === undefined || statut === '') return true;
  const inactifs = ['abandonne', 'suspendu', 'expire', 'annule', 'rejete'];
  return !inactifs.includes(statut.toLowerCase());
}

// =========================================================================
// RÈGLES PRP↔HACCP
// =========================================================================

const REGLES_PRP_HACCP = [
  // ───────────────────────────────────────────────────────────────────────
  // HACCP-FORM-01 — Formation hygiène personnel
  // ───────────────────────────────────────────────────────────────────────
  {
    code: 'HACCP-FORM-01',
    libelle: 'Formation hygiène personnel < 12 mois',
    evaluer: (db, siteId) => {
      try {
        const ligne = db.getFirstSync(
          `SELECT r.id, r.date_execution as d, p.titre as nom_proc
           FROM prp_registres r
           JOIN prp_procedures p ON p.id = r.prp_procedure_id
           JOIN prp_plans pl ON pl.id = p.prp_plan_id
           WHERE pl.type_prp = 'hygiene_personnel'
             AND p.titre LIKE '%ormation%'
             AND (r.site_id = ? OR r.site_id IS NULL)
             AND date(r.date_execution) >= date('now', '-12 months')
           ORDER BY r.date_execution DESC LIMIT 1`,
          [siteId]
        );
        if (ligne) {
          return {
            statut: 'conforme',
            preuve: `Registre PRP "${ligne.nom_proc}" du ${ligne.d}`,
            details: { registre_id: ligne.id, regle: 'PRP_FORMATION_HYGIENE_12M' },
          };
        }
        return {
          statut: 'non_conforme',
          preuve: 'Aucune formation hygiène documentée < 12 mois (Codex CXC 1-1969 §X)',
          details: { regle: 'PRP_FORMATION_HYGIENE_12M' },
        };
      } catch (e) {
        return {
          statut: 'a_verifier',
          preuve: `Erreur SQL : ${e.message}`,
          details: { regle: 'PRP_FORMATION_HYGIENE_12M', erreur: e.message },
        };
      }
    },
  },

  // ───────────────────────────────────────────────────────────────────────
  // HACCP-P5-01 — Procédure action corrective documentée
  // ───────────────────────────────────────────────────────────────────────
  {
    code: 'HACCP-P5-01',
    libelle: 'Procédure action corrective documentée',
    evaluer: (db, siteId) => {
      let nb = 0;
      try {
        // actions_correctives est partagée HACCP + PRP via releve_id
        const r = db.getFirstSync(`SELECT COUNT(*) as n FROM actions_correctives`);
        nb = r?.n || 0;
      } catch (e) {
        return {
          statut: 'a_verifier',
          preuve: `Erreur SQL : ${e.message}`,
          details: { regle: 'AC_DOCUMENTEES', erreur: e.message },
        };
      }
      if (nb > 0) {
        return {
          statut: 'conforme',
          preuve: `${nb} action(s) corrective(s) documentée(s)`,
          details: { total: nb, regle: 'AC_DOCUMENTEES' },
        };
      }
      return {
        statut: 'non_conforme',
        preuve: 'Aucune action corrective documentée (Codex Principe 5)',
        details: { regle: 'AC_DOCUMENTEES' },
      };
    },
  },

  // ───────────────────────────────────────────────────────────────────────
  // HACCP-P5-03 — Décision documentée NC (description + responsable_decision)
  // ───────────────────────────────────────────────────────────────────────
  {
    code: 'HACCP-P5-03',
    libelle: 'Décision documentée sur produit NC',
    evaluer: (db, siteId) => {
      try {
        const t = db.getFirstSync(`SELECT COUNT(*) as n FROM actions_correctives`);
        const total = t?.n || 0;
        const m = db.getFirstSync(
          `SELECT COUNT(*) as n FROM actions_correctives
           WHERE (description IS NULL OR description = ''
                  OR responsable_decision IS NULL OR responsable_decision = '')`
        );
        const manq = m?.n || 0;

        if (total === 0) {
          return {
            statut: 'a_verifier',
            preuve: 'Aucune action corrective enregistrée — non applicable',
            details: { regle: 'AC_DECISION_DOCUMENTEE' },
          };
        }
        if (manq === 0) {
          return {
            statut: 'conforme',
            preuve: `${total} action(s) avec description + responsable renseignés`,
            details: { total, regle: 'AC_DECISION_DOCUMENTEE' },
          };
        }
        return {
          statut: 'non_conforme',
          preuve: `${manq}/${total} action(s) sans description ou responsable (ISO 22000 §8.9.4)`,
          details: { total, manquantes: manq, regle: 'AC_DECISION_DOCUMENTEE' },
        };
      } catch (e) {
        return {
          statut: 'a_verifier',
          preuve: `Erreur SQL : ${e.message}`,
          details: { regle: 'AC_DECISION_DOCUMENTEE', erreur: e.message },
        };
      }
    },
  },

  // ───────────────────────────────────────────────────────────────────────
  // HACCP-P5-05 — Suivi efficacité
  // ───────────────────────────────────────────────────────────────────────
  {
    code: 'HACCP-P5-05',
    libelle: 'Vérification efficacité des actions correctives',
    evaluer: (db, siteId) => {
      try {
        const t = db.getFirstSync(`SELECT COUNT(*) as n FROM actions_correctives`);
        const total = t?.n || 0;
        const v = db.getFirstSync(
          `SELECT COUNT(*) as n FROM actions_correctives WHERE efficacite_verifiee = 1`
        );
        const verif = v?.n || 0;

        if (total === 0) {
          return {
            statut: 'a_verifier',
            preuve: 'Aucune action corrective — non applicable',
            details: { regle: 'AC_EFFICACITE' },
          };
        }
        const ratio = Math.round((verif / total) * 100);
        if (ratio >= 80) {
          return {
            statut: 'conforme',
            preuve: `${verif}/${total} actions avec efficacité vérifiée (${ratio}%)`,
            details: { total, verif, ratio, regle: 'AC_EFFICACITE' },
          };
        }
        return {
          statut: 'non_conforme',
          preuve: `Seulement ${verif}/${total} actions vérifiées (${ratio}% < 80%, ISO 22000 §8.9.3)`,
          details: { total, verif, ratio, regle: 'AC_EFFICACITE' },
        };
      } catch (e) {
        return {
          statut: 'a_verifier',
          preuve: `Erreur SQL : ${e.message}`,
          details: { regle: 'AC_EFFICACITE', erreur: e.message },
        };
      }
    },
  },

  // ───────────────────────────────────────────────────────────────────────
  // HACCP-P7-03 — Registres tenus selon fréquence
  // ───────────────────────────────────────────────────────────────────────
  {
    code: 'HACCP-P7-03',
    libelle: 'Registres PRP tenus selon fréquence prévue',
    evaluer: (db, siteId) => {
      let procedures = [];
      try {
        procedures = db.getAllSync(
          `SELECT p.id, p.titre as nom_proc, p.frequence_execution as freq
           FROM prp_procedures p
           WHERE (p.desactive IS NULL OR p.desactive = 0)`
        );
      } catch (e) {
        return {
          statut: 'a_verifier',
          preuve: `Erreur SQL : ${e.message}`,
          details: { regle: 'PRP_REGISTRES_FREQUENCE', erreur: e.message },
        };
      }

      let conformes = 0;
      const retards = [];

      for (const proc of procedures) {
        const f = (proc.freq || '').toLowerCase();
        let jMax = 30;
        if (f.includes('quotidien') || f.includes('jour')) jMax = 2;
        else if (f.includes('hebdomadaire') || f.includes('semaine')) jMax = 10;
        else if (f.includes('mensuel') || f.includes('mois')) jMax = 35;
        else if (f.includes('trimestriel')) jMax = 100;
        else if (f.includes('semestriel')) jMax = 190;
        else if (f.includes('annuel') || f.includes('an')) jMax = 380;

        let dernier = null;
        try {
          dernier = db.getFirstSync(
            `SELECT date_execution as d FROM prp_registres
             WHERE prp_procedure_id = ?
               AND (site_id = ? OR site_id IS NULL)
             ORDER BY date_execution DESC LIMIT 1`,
            [proc.id, siteId]
          );
        } catch (e) {}

        if (dernier?.d) {
          let diff = 999;
          try {
            const d = db.getFirstSync(
              `SELECT CAST(julianday('now') - julianday(?) AS INTEGER) as j`,
              [dernier.d]
            );
            diff = d?.j ?? 999;
          } catch (e) {}
          if (diff <= jMax) conformes++;
          else retards.push(`${proc.nom_proc} (${diff}j > ${jMax}j)`);
        } else {
          retards.push(`${proc.nom_proc} (jamais)`);
        }
      }

      const total = procedures.length;
      if (total === 0) {
        return {
          statut: 'a_verifier',
          preuve: 'Aucune procédure PRP active',
          details: { regle: 'PRP_REGISTRES_FREQUENCE' },
        };
      }
      if (retards.length === 0) {
        return {
          statut: 'conforme',
          preuve: `${conformes}/${total} procédures PRP à jour selon fréquence`,
          details: { total, conformes, regle: 'PRP_REGISTRES_FREQUENCE' },
        };
      }
      return {
        statut: 'non_conforme',
        preuve: `${retards.length}/${total} procédures en retard : ${retards.slice(0, 3).join(', ')}${retards.length > 3 ? '…' : ''}`,
        details: { total, retards: retards.length, exemples: retards.slice(0, 5), regle: 'PRP_REGISTRES_FREQUENCE' },
      };
    },
  },

  // ───────────────────────────────────────────────────────────────────────
  // HACCP-PRP7-01 — Évaluation fournisseurs (Codex CXC §III.5.1.1)
  // ───────────────────────────────────────────────────────────────────────
  {
    code: 'HACCP-PRP7-01',
    libelle: 'Évaluation fournisseurs documentée',
    evaluer: (db, siteId) => {
      let nbReception = 0;
      try {
        const r = db.getFirstSync(
          `SELECT COUNT(*) as n FROM prp_registres r
           JOIN prp_procedures p ON p.id = r.prp_procedure_id
           JOIN prp_plans pl ON pl.id = p.prp_plan_id
           WHERE pl.type_prp = 'reception'
             AND date(r.date_execution) >= date('now', '-12 months')`
        );
        nbReception = r?.n || 0;
      } catch (e) {}

      let fournEngages = 0;
      try {
        const f = db.getFirstSync(
          `SELECT COUNT(DISTINCT cible_id) as n FROM engagements_certif
           WHERE cible_type = 'fournisseur'`
        );
        fournEngages = f?.n || 0;
      } catch (e) {}

      if (nbReception >= 1) {
        return {
          statut: 'conforme',
          preuve: `${nbReception} contrôle(s) réception < 12 mois${fournEngages > 0 ? ` + ${fournEngages} fournisseur(s) avec engagement CertifTrack` : ''}`,
          details: { receptions: nbReception, fournisseurs_engages: fournEngages, regle: 'PRP_EVAL_FOURNISSEURS' },
        };
      }
      return {
        statut: 'non_conforme',
        preuve: 'Aucun contrôle réception documenté < 12 mois (Codex §III.5.1.1)',
        details: { regle: 'PRP_EVAL_FOURNISSEURS' },
      };
    },
  },
];

// =========================================================================
// FONCTIONS PUBLIQUES
// =========================================================================

export function evaluerReglesPrpHaccp(siteId) {
  const db = getDb();
  const resultats = [];
  for (const regle of REGLES_PRP_HACCP) {
    try {
      const res = regle.evaluer(db, siteId);
      resultats.push({
        code_exigence: regle.code,
        libelle: regle.libelle,
        ...res,
      });
    } catch (e) {
      resultats.push({
        code_exigence: regle.code,
        libelle: regle.libelle,
        statut: 'a_verifier',
        preuve: `Erreur évaluation : ${e.message}`,
        details: { erreur: e.message },
      });
    }
  }
  return resultats;
}

export function appliquerReglesPrpHaccp(siteId) {
  const db = getDb();
  let appliques = 0;
  let ignores = 0;
  let erreurs = 0;

  // Récupère TOUS les engagements HACCP (filtrage statut côté JS)
  let engagementsRaw = [];
  try {
    engagementsRaw = db.getAllSync(
      `SELECT e.id, e.cible_type, e.cible_id, e.statut, r.code as code_ref
       FROM engagements_certif e
       JOIN referentiels r ON r.id = e.referentiel_id
       WHERE r.code LIKE 'HACCP%'`
    );
    console.log('[ConformitePrpHaccp] Engagements HACCP bruts:', engagementsRaw);
  } catch (e) {
    console.warn('[ConformitePrpHaccp] Erreur lecture engagements:', e.message);
    return { appliques: 0, ignores: 0, erreurs: 1, message: e.message };
  }

  // Filtre côté JS sur les statuts actifs
  const engagements = engagementsRaw.filter(e => isStatutActif(e.statut));
  console.log('[ConformitePrpHaccp] Engagements actifs:', engagements.length, 'sur', engagementsRaw.length);

  if (engagements.length === 0) {
    const statuts = engagementsRaw.map(e => e.statut).join(', ');
    return {
      appliques: 0, ignores: 0, erreurs: 0,
      message: `Aucun engagement HACCP actif. Total HACCP: ${engagementsRaw.length} (statuts: ${statuts || 'aucun'})`
    };
  }

  const resultats = evaluerReglesPrpHaccp(siteId);

  // Code → ID exigence (cache)
  const exigCache = {};
  for (const res of resultats) {
    try {
      const ex = db.getFirstSync(
        `SELECT id FROM exigences_referentiel WHERE code_exigence = ?`,
        [res.code_exigence]
      );
      if (ex) exigCache[res.code_exigence] = ex.id;
    } catch (e) {
      console.warn(`[ConformitePrpHaccp] Exigence ${res.code_exigence} introuvable`);
    }
  }
  console.log('[ConformitePrpHaccp] Exigences mappées:', exigCache);

  for (const eng of engagements) {
    for (const res of resultats) {
      const exigId = exigCache[res.code_exigence];
      if (!exigId) {
        ignores++;
        continue;
      }
      try {
        const existant = db.getFirstSync(
          `SELECT id, statut_manuel FROM statuts_exigences
           WHERE engagement_id = ? AND exigence_id = ?`,
          [eng.id, exigId]
        );
        if (existant && existant.statut_manuel === 1) {
          ignores++;
          continue;
        }
        const now = new Date().toISOString();
        if (existant) {
          db.runSync(
            `UPDATE statuts_exigences
             SET statut = ?, preuve_auto = ?, details_auto = ?,
                 source_auto = 'PRP_HACCP', date_evaluation = ?,
                 auto_genere = 1, updated_at = ?
             WHERE id = ?`,
            [res.statut, res.preuve, JSON.stringify(res.details), now, now, existant.id]
          );
        } else {
          db.runSync(
            `INSERT INTO statuts_exigences
             (engagement_id, exigence_id, statut, preuve_auto, details_auto,
              source_auto, date_evaluation, statut_manuel, auto_genere, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 'PRP_HACCP', ?, 0, 1, ?, ?)`,
            [eng.id, exigId, res.statut, res.preuve, JSON.stringify(res.details), now, now, now]
          );
        }
        appliques++;
      } catch (e) {
        console.warn(`[ConformitePrpHaccp] Erreur ${res.code_exigence}:`, e.message);
        erreurs++;
      }
    }
  }

  return { appliques, ignores, erreurs, engagements: engagements.length };
}

export function getReglesPrpHaccpDisponibles() {
  return REGLES_PRP_HACCP.map(r => ({
    code: r.code,
    libelle: r.libelle,
  }));
}