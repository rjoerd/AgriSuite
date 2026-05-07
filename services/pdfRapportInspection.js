// services/pdfRapportInspection.js
// Génération PDF rapport d'inspection SCI — opposable, horodaté

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('agrisuite.db');

const REF_LABELS = {
  BIO_UE: 'BIO UE 2018/848',
  HACCP: 'HACCP Codex',
  FAIRTRADE_FLO: 'Fairtrade FLO',
  RAINFOREST: 'Rainforest Alliance',
  LABEL_VANILLE_MDG: 'Label Vanille de Madagascar',
};

const TYPE_LABELS = {
  initiale: 'Initiale',
  annuelle: 'Annuelle',
  inopinee: 'Inopinée',
  suivi_sanction: 'Suivi de sanction',
};

const CONCLUSION_LABELS = {
  conforme: 'CONFORME',
  non_conforme_mineure: 'NON CONFORME (Mineure)',
  non_conforme_majeure: 'NON CONFORME (Majeure)',
  non_conforme_critique: 'NON CONFORME (Critique)',
};

const CONCLUSION_COLORS = {
  conforme: '#2e7d32',
  non_conforme_mineure: '#d4a04a',
  non_conforme_majeure: '#e67e22',
  non_conforme_critique: '#cc4444',
};

const REPONSE_LABELS = {
  conforme: 'Conforme',
  non_conforme: 'Non conforme',
  non_applicable: 'N/A',
  a_revoir: 'À revoir',
};

const formatDate = (str) => {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const escape = (s) => {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

// ============================================================
// CHARGEMENT DES DONNÉES
// ============================================================

const chargerDonneesRapport = (inspectionRealiseeId) => {
  // Inspection + fournisseur
  const inspection = db.getFirstSync(
    `SELECT ir.*, 
            f.nom as fournisseur_nom, f.code as fournisseur_code, 
            f.zone_collecte_code, f.commune, f.fokontany, f.telephone,
            f.cnaps_nif
     FROM inspections_realisees ir
     JOIN fournisseurs f ON f.id = ir.fournisseur_id
     WHERE ir.id = ?`,
    [inspectionRealiseeId]
  );

  if (!inspection) return null;

  // Réponses + détail exigences
  const reponses = db.getAllSync(
    `SELECT 
       ir.*, 
       ex.code_exigence, ex.titre, ex.description, ex.categorie, 
       ex.criticite, ex.reference_officielle
     FROM inspections_reponses ir
     JOIN exigences_referentiel ex ON ex.id = ir.exigence_id
     WHERE ir.inspection_id = ?
     ORDER BY ex.categorie, ex.code_exigence`,
    [inspectionRealiseeId]
  );

  return { inspection, reponses };
};

// ============================================================
// GÉNÉRATION HTML
// ============================================================

const genererHtml = (data) => {
  const { inspection, reponses } = data;

  const conclusionColor = CONCLUSION_COLORS[inspection.conclusion] || '#999';
  const conclusionLabel = CONCLUSION_LABELS[inspection.conclusion] || '—';

  // Stats
  const conformes = reponses.filter((r) => r.reponse === 'conforme').length;
  const nonConformes = reponses.filter((r) => r.reponse === 'non_conforme');
  const na = reponses.filter((r) => r.reponse === 'non_applicable').length;
  const aRevoir = reponses.filter((r) => r.reponse === 'a_revoir').length;

  // Groupement par catégorie
  const parCategorie = {};
  reponses.forEach((r) => {
    if (!parCategorie[r.categorie]) parCategorie[r.categorie] = [];
    parCategorie[r.categorie].push(r);
  });

  const dateGeneration = new Date().toLocaleString('fr-FR');

  // Section signatures
  let sigProducteurHtml = '';
  if (inspection.signature_producteur_type === 'manuscrite' && inspection.signature_producteur_data) {
    sigProducteurHtml = `<img src="${inspection.signature_producteur_data}" style="max-height:80px;" />`;
  } else if (inspection.signature_producteur_type === 'empreinte') {
    sigProducteurHtml = `<div class="sig-empreinte">Empreinte digitale (voir photo producteur ci-dessus)</div>`;
  } else if (inspection.signature_producteur_type === 'temoin') {
    sigProducteurHtml = `<div class="sig-temoin">
      <strong>Refus producteur — signature témoin :</strong><br/>
      <em>${escape(inspection.temoin_nom)}</em><br/>
      ${inspection.temoin_signature_data ? `<img src="${inspection.temoin_signature_data}" style="max-height:80px;" />` : ''}
    </div>`;
  }

  const sigInspecteurHtml = inspection.signature_inspecteur_data
    ? `<img src="${inspection.signature_inspecteur_data}" style="max-height:80px;" />`
    : '<em>Non signé</em>';

  // Section non-conformités
  let ncHtml = '';
  if (nonConformes.length > 0) {
    ncHtml = `
      <div class="section">
        <h2 class="section-title nc-title">⚠ Non-conformités relevées (${nonConformes.length})</h2>
        ${nonConformes.map((nc) => `
          <div class="nc-card nc-${nc.gravite || 'mineure'}">
            <div class="nc-header">
              <span class="nc-code">${escape(nc.code_exigence)}</span>
              <span class="nc-gravite">${escape((nc.gravite || 'mineure').toUpperCase())}</span>
            </div>
            <div class="nc-titre">${escape(nc.titre)}</div>
            ${nc.observation ? `<div class="nc-obs"><strong>Observation :</strong> ${escape(nc.observation)}</div>` : ''}
            ${nc.reference_officielle ? `<div class="nc-ref">Réf : ${escape(nc.reference_officielle)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  // Section détail par catégorie
  const detailHtml = Object.keys(parCategorie).map((cat) => `
    <div class="cat-block">
      <h3 class="cat-title">${escape(cat)}</h3>
      <table class="cat-table">
        <thead>
          <tr><th>Code</th><th>Exigence</th><th>Réponse</th><th>Observation</th></tr>
        </thead>
        <tbody>
          ${parCategorie[cat].map((r) => `
            <tr>
              <td class="td-code">${escape(r.code_exigence)}</td>
              <td>${escape(r.titre)}</td>
              <td class="td-rep td-rep-${r.reponse}">${escape(REPONSE_LABELS[r.reponse] || r.reponse)}${r.gravite ? ` (${r.gravite})` : ''}</td>
              <td class="td-obs">${escape(r.observation || '—')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<title>Rapport d'inspection SCI — ${escape(inspection.fournisseur_code)}</title>
<style>
  @page { margin: 1.5cm 1.2cm; }
  body { font-family: 'Helvetica', sans-serif; color: #1a1a1a; font-size: 10pt; line-height: 1.4; }
  .header { border-bottom: 3px solid #1a4d1a; padding-bottom: 12px; margin-bottom: 18px; }
  .header h1 { color: #1a4d1a; font-size: 22pt; margin: 0; }
  .header .sub { color: #666; font-size: 10pt; margin-top: 4px; }
  
  .badge-conclusion { 
    display: inline-block; padding: 8px 18px; border-radius: 6px; 
    font-weight: bold; font-size: 13pt; color: white; 
    background: ${conclusionColor}; margin: 10px 0;
  }
  
  .info-grid { 
    display: grid; grid-template-columns: 1fr 1fr; gap: 8px; 
    background: #f5f8f5; padding: 12px; border-left: 3px solid #1a4d1a; 
    margin-bottom: 16px;
  }
  .info-row { padding: 3px 0; }
  .info-label { color: #666; font-size: 9pt; }
  .info-value { font-weight: 500; }
  
  .section { margin-top: 18px; page-break-inside: avoid; }
  .section-title { 
    color: #1a4d1a; font-size: 13pt; border-bottom: 1px solid #1a4d1a; 
    padding-bottom: 4px; margin-bottom: 10px;
  }
  .nc-title { color: #cc4444; border-bottom-color: #cc4444; }
  
  .stats-grid { 
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; 
    margin: 12px 0;
  }
  .stat-box { 
    text-align: center; padding: 10px; background: #f5f8f5; 
    border-radius: 4px;
  }
  .stat-num { font-size: 22pt; font-weight: bold; }
  .stat-label { font-size: 8pt; color: #666; text-transform: uppercase; }
  
  .nc-card { 
    border-left: 4px solid #cc4444; background: #fdf5f5; 
    padding: 10px; margin-bottom: 8px; border-radius: 4px;
  }
  .nc-mineure { border-left-color: #d4a04a; background: #fdf9f0; }
  .nc-majeure { border-left-color: #e67e22; background: #fdf6ed; }
  .nc-critique { border-left-color: #cc4444; background: #fdf0f0; }
  .nc-header { display: flex; justify-content: space-between; margin-bottom: 4px; }
  .nc-code { font-weight: bold; color: #1a4d1a; }
  .nc-gravite { 
    background: #cc4444; color: white; padding: 2px 8px; 
    border-radius: 3px; font-size: 8pt; font-weight: bold;
  }
  .nc-mineure .nc-gravite { background: #d4a04a; }
  .nc-majeure .nc-gravite { background: #e67e22; }
  .nc-titre { font-weight: 600; margin: 4px 0; }
  .nc-obs { font-size: 9pt; margin-top: 4px; }
  .nc-ref { font-size: 8pt; color: #666; font-style: italic; margin-top: 4px; }
  
  .cat-block { margin-top: 12px; }
  .cat-title { 
    color: #1a4d1a; font-size: 11pt; background: #e8f0e8; 
    padding: 5px 10px; margin: 0 0 5px 0;
  }
  .cat-table { 
    width: 100%; border-collapse: collapse; font-size: 8.5pt;
  }
  .cat-table th { 
    background: #1a4d1a; color: white; padding: 5px; 
    text-align: left; font-size: 8pt;
  }
  .cat-table td { padding: 5px; border-bottom: 1px solid #eee; vertical-align: top; }
  .td-code { font-family: monospace; color: #1a4d1a; font-weight: bold; white-space: nowrap; }
  .td-rep { font-weight: 600; white-space: nowrap; }
  .td-rep-conforme { color: #2e7d32; }
  .td-rep-non_conforme { color: #cc4444; }
  .td-rep-non_applicable { color: #999; }
  .td-rep-a_revoir { color: #d4a04a; }
  .td-obs { color: #555; font-size: 8pt; }
  
  .signatures { 
    display: grid; grid-template-columns: 1fr 1fr; gap: 30px; 
    margin-top: 30px; page-break-inside: avoid;
  }
  .sig-block { 
    border: 1px solid #ccc; padding: 12px; min-height: 130px; 
    background: white; border-radius: 4px;
  }
  .sig-label { 
    font-size: 9pt; color: #666; text-transform: uppercase; 
    margin-bottom: 8px; font-weight: bold;
  }
  .sig-empreinte { font-style: italic; color: #555; padding: 20px 0; }
  .sig-temoin { font-size: 9pt; }
  
  .photo-producteur { 
    max-width: 220px; max-height: 180px; border: 2px solid #1a4d1a; 
    border-radius: 4px; margin-top: 8px;
  }
  
  .footer { 
    margin-top: 30px; padding-top: 12px; border-top: 1px solid #ccc; 
    font-size: 8pt; color: #666; text-align: center;
  }
  
  .opposabilite { 
    background: #fff8e1; border-left: 4px solid #d4a04a; 
    padding: 10px; margin: 16px 0; font-size: 9pt;
  }
  
  .notes-block { 
    background: #f5f8f5; padding: 10px; border-radius: 4px; 
    margin-top: 8px; font-size: 9pt; white-space: pre-wrap;
  }
</style>
</head>
<body>

<!-- EN-TÊTE -->
<div class="header">
  <h1>🛡 Rapport d'inspection SCI</h1>
  <div class="sub">Système de Contrôle Interne — AgriSuite Madagascar</div>
</div>

<!-- BANDEAU CONCLUSION -->
<div class="badge-conclusion">${escape(conclusionLabel)}</div>

<!-- INFOS GÉNÉRALES -->
<div class="info-grid">
  <div class="info-row">
    <div class="info-label">Producteur</div>
    <div class="info-value">${escape(inspection.fournisseur_code)} · ${escape(inspection.fournisseur_nom)}</div>
  </div>
  <div class="info-row">
    <div class="info-label">Référentiel</div>
    <div class="info-value">${escape(REF_LABELS[inspection.referentiel_code] || inspection.referentiel_code)}</div>
  </div>
  <div class="info-row">
    <div class="info-label">Type d'inspection</div>
    <div class="info-value">${escape(TYPE_LABELS[inspection.type_inspection] || inspection.type_inspection)}</div>
  </div>
  <div class="info-row">
    <div class="info-label">Date d'inspection</div>
    <div class="info-value">${formatDate(inspection.date_realisee)}</div>
  </div>
  <div class="info-row">
    <div class="info-label">Inspecteur</div>
    <div class="info-value">${escape(inspection.inspecteur_nom)}</div>
  </div>
  <div class="info-row">
    <div class="info-label">Durée inspection</div>
    <div class="info-value">${inspection.duree_minutes ? inspection.duree_minutes + ' min' : '—'}</div>
  </div>
  <div class="info-row">
    <div class="info-label">Localisation</div>
    <div class="info-value">${escape(inspection.commune || '—')}${inspection.fokontany ? ' · ' + escape(inspection.fokontany) : ''}</div>
  </div>
  <div class="info-row">
    <div class="info-label">Zone de collecte</div>
    <div class="info-value">${escape(inspection.zone_collecte_code || '—')}</div>
  </div>
</div>

<!-- STATS -->
<div class="section">
  <h2 class="section-title">📊 Synthèse des contrôles</h2>
  <div class="stats-grid">
    <div class="stat-box">
      <div class="stat-num" style="color:#2e7d32">${conformes}</div>
      <div class="stat-label">Conformes</div>
    </div>
    <div class="stat-box">
      <div class="stat-num" style="color:#cc4444">${nonConformes.length}</div>
      <div class="stat-label">Non conformes</div>
    </div>
    <div class="stat-box">
      <div class="stat-num" style="color:#999">${na}</div>
      <div class="stat-label">N/A</div>
    </div>
    <div class="stat-box">
      <div class="stat-num" style="color:#d4a04a">${aRevoir}</div>
      <div class="stat-label">À revoir</div>
    </div>
  </div>
  <div style="text-align:center; color:#666; font-size:9pt;">
    Total : <strong>${reponses.length}</strong> exigences contrôlées
  </div>
</div>

${ncHtml}

<!-- DÉTAIL PAR CATÉGORIE -->
<div class="section">
  <h2 class="section-title">📋 Détail des contrôles par catégorie</h2>
  ${detailHtml}
</div>

<!-- NOTES -->
${inspection.notes_generales ? `
<div class="section">
  <h2 class="section-title">📝 Observations finales</h2>
  <div class="notes-block">${escape(inspection.notes_generales)}</div>
</div>
` : ''}

<!-- OPPOSABILITÉ -->
<div class="opposabilite">
  <strong>📌 Document opposable :</strong> Ce rapport a été signé par le producteur (ou son témoin) 
  et l'inspecteur. Il fait foi en cas de litige et constitue une preuve auditable lors d'un contrôle 
  externe par un organisme certificateur (Ecocert, FLOCERT, RA, etc.).
</div>

<!-- SIGNATURES -->
<div class="section">
  <h2 class="section-title">✍ Signatures</h2>
  <div class="signatures">
    <div class="sig-block">
      <div class="sig-label">Producteur</div>
      <div><strong>${escape(inspection.fournisseur_nom)}</strong> · ${escape(inspection.fournisseur_code)}</div>
      <div style="margin-top:8px;">${sigProducteurHtml}</div>
      ${inspection.photo_producteur_uri ? `<img src="${inspection.photo_producteur_uri}" class="photo-producteur" />` : ''}
    </div>
    <div class="sig-block">
      <div class="sig-label">Inspecteur SCI</div>
      <div><strong>${escape(inspection.inspecteur_nom)}</strong></div>
      <div style="margin-top:8px;">${sigInspecteurHtml}</div>
      <div style="margin-top:8px; font-size:8pt; color:#666;">
        Clôturé le ${formatDate(inspection.date_cloture)}
      </div>
    </div>
  </div>
</div>

<!-- FOOTER -->
<div class="footer">
  Rapport généré le ${dateGeneration} · AgriSuite Madagascar · 
  Inspection #${inspection.id} · Conservation obligatoire 5 ans (BIO UE)
</div>

</body>
</html>
  `;
};

// ============================================================
// API PUBLIQUE
// ============================================================

export const genererRapportPDF = async (inspectionRealiseeId) => {
  const data = chargerDonneesRapport(inspectionRealiseeId);
  if (!data) throw new Error('Inspection introuvable');
  if (!data.inspection.cloture) throw new Error('Inspection non clôturée — PDF impossible');

  const html = genererHtml(data);
  const { uri } = await Print.printToFileAsync({ html, base64: false });

  // Renommage propre
  const datePart = data.inspection.date_realisee.replace(/-/g, '');
  const newName = `Rapport_SCI_${data.inspection.fournisseur_code}_${data.inspection.referentiel_code}_${datePart}.pdf`;
  const newUri = FileSystem.cacheDirectory + newName;

  try {
    await FileSystem.moveAsync({ from: uri, to: newUri });
    return newUri;
  } catch (e) {
    return uri;
  }
};

export const partagerRapportPDF = async (uri) => {
  const dispo = await Sharing.isAvailableAsync();
  if (!dispo) throw new Error('Partage non disponible sur cet appareil');
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Partager le rapport SCI',
    UTI: 'com.adobe.pdf',
  });
};

export const genererEtPartager = async (inspectionRealiseeId) => {
  const uri = await genererRapportPDF(inspectionRealiseeId);
  await partagerRapportPDF(uri);
  return uri;
};