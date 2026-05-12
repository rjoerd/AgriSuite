// services/pdfRegistresPrp.js
// Phase 3 - Session 10c.5 - Génération PDF registres PRP pour audit
// Format aligné attentes Ecocert / Bureau Veritas / SGS

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as SQLite from 'expo-sqlite';
import { getTypePrpInfo, getResultatLabel } from '../database/prp';

const db = SQLite.openDatabaseSync('agrisuite.db');

// ============================================================
// PDF — REGISTRES D'UN PRP SUR UNE PÉRIODE
// ============================================================

export async function genererPdfRegistresPrp(planId, dateDebut, dateFin) {
  // Récupérer le plan
  const plan = db.getFirstSync('SELECT * FROM prp_plans WHERE id = ?', [planId]);
  if (!plan) throw new Error('Plan PRP introuvable');

  const info = getTypePrpInfo(plan.type_prp);

  // Récupérer les registres de la période
  const registres = db.getAllSync(
    `SELECT r.*, p.titre as procedure_titre, p.frequence_execution
     FROM prp_registres r
     LEFT JOIN prp_procedures p ON p.id = r.prp_procedure_id
     WHERE r.prp_plan_id = ?
       AND date(r.date_execution) >= date(?)
       AND date(r.date_execution) <= date(?)
     ORDER BY r.date_execution ASC, r.heure_execution ASC`,
    [planId, dateDebut, dateFin]
  );

  // Récupérer les actions correctives liées
  const registreIds = registres.map(r => r.id);
  let actions = [];
  if (registreIds.length > 0) {
    actions = db.getAllSync(
      `SELECT * FROM prp_actions_correctives
       WHERE registre_id IN (${registreIds.map(() => '?').join(',')})
       ORDER BY date_action ASC`,
      registreIds
    );
  }

  // Stats
  const total = registres.length;
  const conformes = registres.filter(r => r.resultat === 'conforme').length;
  const nc = registres.filter(r => r.resultat === 'non_conforme').length;
  const observations = registres.filter(r => r.resultat === 'observation').length;
  const tauxConf = total > 0 ? Math.round((conformes / total) * 100) : null;

  // Opérateur (exportateur)
  const operateurInfo = db.getFirstSync('SELECT * FROM operateur LIMIT 1');

  const dateGen = new Date().toLocaleString('fr-FR');

  // Construire le HTML
  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4; margin: 1.5cm; }
  body { font-family: 'Helvetica', sans-serif; font-size: 10pt; color: #1a2e1a; }
  h1 { color: #1a4a1a; border-bottom: 3px solid #1a4a1a; padding-bottom: 6px; font-size: 16pt; }
  h2 { color: #1a4a1a; margin-top: 18px; font-size: 12pt; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
  .meta { background: #f5f7f5; padding: 10px; border-left: 4px solid #1a4a1a; margin: 10px 0; }
  .meta-row { margin: 3px 0; }
  .meta-label { font-weight: bold; display: inline-block; width: 180px; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 9pt; }
  th { background: #1a4a1a; color: white; padding: 6px; text-align: left; }
  td { padding: 5px 6px; border-bottom: 1px solid #ddd; vertical-align: top; }
  tr:nth-child(even) td { background: #f9faf9; }
  .conforme { color: #1a7a1a; font-weight: bold; }
  .nc { color: #c0392b; font-weight: bold; }
  .obs { color: #b8860b; font-weight: bold; }
  .stats { display: flex; gap: 10px; margin: 10px 0; }
  .stat-box { flex: 1; background: #f0f5f0; padding: 8px; text-align: center; border: 1px solid #1a4a1a; }
  .stat-value { font-size: 18pt; font-weight: bold; color: #1a4a1a; }
  .stat-label { font-size: 8pt; color: #555; }
  .footer { margin-top: 20px; padding-top: 8px; border-top: 1px solid #999; font-size: 8pt; color: #666; font-style: italic; }
  .action-corr { background: #fff8e1; padding: 6px; margin: 4px 0; border-left: 3px solid #d4a04a; font-size: 8pt; }
  .empty { text-align: center; color: #888; font-style: italic; padding: 20px; }
</style>
</head>
<body>

<h1>${info?.icone || ''} Registre PRP — ${plan.nom}</h1>

<div class="meta">
  <div class="meta-row"><span class="meta-label">Opérateur :</span> ${escapeHtml(operateurInfo?.nom_legal || 'Non défini')}</div>
  <div class="meta-row"><span class="meta-label">Type PRP :</span> ${escapeHtml(info?.nom || plan.type_prp)}</div>
  <div class="meta-row"><span class="meta-label">Référence réglementaire :</span> ${escapeHtml(plan.reference_reglementaire || '—')}</div>
  <div class="meta-row"><span class="meta-label">Danger maîtrisé :</span> ${escapeHtml(plan.danger_maitrise || '—')}</div>
  <div class="meta-row"><span class="meta-label">Responsable :</span> ${escapeHtml(plan.responsable || '—')}</div>
  <div class="meta-row"><span class="meta-label">Statut du plan :</span> ${escapeHtml(plan.statut)}</div>
  <div class="meta-row"><span class="meta-label">Période du registre :</span> du ${dateDebut} au ${dateFin}</div>
  <div class="meta-row"><span class="meta-label">Document généré le :</span> ${dateGen}</div>
</div>

<h2>📊 Synthèse de la période</h2>

<div class="stats">
  <div class="stat-box">
    <div class="stat-value">${total}</div>
    <div class="stat-label">Registres totaux</div>
  </div>
  <div class="stat-box">
    <div class="stat-value" style="color: #1a7a1a;">${conformes}</div>
    <div class="stat-label">Conformes</div>
  </div>
  <div class="stat-box">
    <div class="stat-value" style="color: #c0392b;">${nc}</div>
    <div class="stat-label">Non conformes</div>
  </div>
  <div class="stat-box">
    <div class="stat-value" style="color: #b8860b;">${observations}</div>
    <div class="stat-label">Observations</div>
  </div>
  <div class="stat-box">
    <div class="stat-value">${tauxConf === null ? '—' : tauxConf + '%'}</div>
    <div class="stat-label">Taux conformité</div>
  </div>
</div>

<h2>📝 Détail des enregistrements (${total})</h2>

${registres.length === 0 ? `
  <div class="empty">Aucun registre enregistré sur cette période.</div>
` : `
<table>
  <thead>
    <tr>
      <th style="width: 80px;">Date</th>
      <th style="width: 50px;">Heure</th>
      <th>Procédure</th>
      <th style="width: 100px;">Opérateur</th>
      <th style="width: 90px;">Résultat</th>
      <th>Valeurs / Observations</th>
    </tr>
  </thead>
  <tbody>
    ${registres.map(r => {
      const valeurs = r.valeurs_json ? formaterValeurs(r.valeurs_json) : '';
      const obs = r.observations || '';
      const valObsCombines = [valeurs, obs].filter(Boolean).join(' — ');
      const actionsAssocites = actions.filter(a => a.registre_id === r.id);

      return `
        <tr>
          <td>${escapeHtml(r.date_execution)}</td>
          <td>${escapeHtml(r.heure_execution || '')}</td>
          <td>${escapeHtml(r.procedure_titre || '(libre)')}</td>
          <td>${escapeHtml(r.operateur)}</td>
          <td class="${r.resultat}">${escapeHtml(getResultatLabel(r.resultat).replace(/[✅❌⚠️]/g, '').trim())}</td>
          <td>${escapeHtml(valObsCombines)}
            ${actionsAssocites.map(a => `
              <div class="action-corr">
                <strong>Action corrective (${escapeHtml(a.date_action)}) — ${escapeHtml(a.type_action)} :</strong>
                ${escapeHtml(a.description)}
                ${a.responsable_decision ? `<br>Décision : ${escapeHtml(a.responsable_decision)}` : ''}
                ${a.efficacite_verifiee ? '<br>✓ Efficacité vérifiée' : '<br>⏳ Vérification en cours'}
              </div>
            `).join('')}
          </td>
        </tr>
      `;
    }).join('')}
  </tbody>
</table>
`}

<div class="footer">
  Document horodaté généré par AgriSuite Madagascar — Confidentiel.<br>
  Conformité : Codex CXC 1-1969 §IX, ISO 22000 §7.5, UE 2018/848 art. 39.<br>
  Conservation obligatoire : 5 ans minimum à compter de la date du dernier enregistrement.
</div>

</body>
</html>
`;

  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
    width: 595,
    height: 842,
  });

  return uri;
}

// ============================================================
// HELPERS
// ============================================================

function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formaterValeurs(json) {
  try {
    const obj = JSON.parse(json);
    return Object.entries(obj)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
  } catch {
    return json;
  }
}

export async function partagerPdf(uri, nomFichier) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Partage non disponible sur cet appareil');
  }
  await Sharing.shareAsync(uri, {
    UTI: 'com.adobe.pdf',
    mimeType: 'application/pdf',
    dialogTitle: nomFichier || 'Registre PRP',
  });
}