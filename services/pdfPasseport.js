// ============================================================
// AgriSuite Madagascar — Phase 3 / Session 6 livraison 2
// services/pdfPasseport.js
//
// Service de génération du passeport lot en HTML/PDF.
//
// NOUVEAU livraison 2 :
//   - Lecture des paramètres entreprise (en-tête personnalisé)
//   - Bilingue FR + EN via dictionnaire de traductions
//   - Couleur d'accent personnalisable
//   - Mention pied de page personnalisée
//
// API :
//   genererHtmlPasseport(lotId, langue = 'fr') → string HTML
//   genererPdfPasseport(lotId, langue = 'fr') → { uri, codeLot }
//   imprimerPasseport(lotId, langue = 'fr') → void
// ============================================================

import * as Print from 'expo-print';
import {
  getLotById,
  getEtapesByLot,
  getAnalysesByLot,
  getConditionnementsByLot,
  getBonsCollecteByLot,
  getFournisseurById,
} from '../database/exportTrack';
import { getCultureById } from '../database/cropEngine';
import { getParametresEntreprise } from '../database/parametresEntreprise';

// Imports résilients (modules optionnels)
let _getRecolteById = null;
let _getSiteById = null;
let _getParcelleById = null;

try {
  // eslint-disable-next-line global-require
  const maraicher = require('../database/maraicher');
  _getRecolteById = maraicher.getRecolteById || maraicher.getRecolteMaraichereById || null;
} catch (e) {}

try {
  // eslint-disable-next-line global-require
  const dbModule = require('../database/db');
  _getSiteById = dbModule.getSiteById || null;
  _getParcelleById = dbModule.getParcelleById || null;
} catch (e) {}

// ============================================================
// DICTIONNAIRE DE TRADUCTIONS
// ============================================================

const TRADUCTIONS = {
  fr: {
    titre_app: 'Passeport de traçabilité',
    sous_titre_app: 'Document export — Lot agroforestier',
    statut_cloture: 'Lot clôturé',
    statut_en_cours: 'Lot en cours',
    filiere_production: 'Filière A — Production',
    filiere_collecte: 'Filière B — Collecte',
    section_identite: '1. Identité du lot',
    section_origine: '2. Origine',
    section_etapes: '3. Étapes post-récolte',
    section_analyses: '4. Analyses qualité',
    section_conditionnements: '5. Conditionnements',
    section_cloture: '6. Clôture officielle',
    section_notes: '7. Notes',
    label_code_lot: 'Code lot',
    label_filiere: 'Filière',
    label_culture: 'Culture',
    label_variete: 'Variété',
    label_date_debut: 'Date début',
    label_date_fin: 'Date fin',
    label_quantite_brute: 'Quantité brute',
    label_protocole: 'Protocole post-récolte',
    label_saisi_par: 'Saisi par',
    label_saisi_le: 'Saisi le',
    label_site: 'Site',
    label_parcelle: 'Parcelle',
    label_recolte_source: 'Récolte source',
    label_recolte_du: 'Récolte du',
    label_statut: 'Statut',
    label_valide_par: 'Validé par',
    label_valide_le: 'Validé le',
    valeur_production: 'Production (filière A)',
    valeur_collecte: 'Collecte (filière B)',
    valeur_cloture: 'Clôturé',
    non_renseigne: 'Non renseigné',
    aucune_etape: 'Aucune étape enregistrée',
    aucune_analyse: 'Aucune analyse enregistrée',
    aucun_conditionnement: 'Aucun conditionnement enregistré',
    aucune_origine: 'Aucune information d\'origine renseignée',
    aucun_bon: 'Aucun bon de collecte rattaché',
    lot_non_cloture: 'Lot non clôturé (en cours d\'élaboration)',
    col_num: '#',
    col_type: 'Type',
    col_periode: 'Période',
    col_qte: 'Qté E → S',
    col_perte: 'Perte',
    col_operateur: 'Opérateur',
    col_parametres: 'Paramètres',
    col_date: 'Date',
    col_laboratoire: 'Laboratoire',
    col_valeur: 'Valeur',
    col_seuil: 'Seuil',
    col_conformite: 'Conformité',
    col_emballage: 'Emballage',
    col_nb: 'Nb',
    col_taille: 'Taille',
    col_poids: 'Poids',
    col_serie: 'N° série',
    col_stockage: 'Stockage',
    col_n_bon: 'N° bon',
    col_fournisseur: 'Fournisseur',
    col_quantite: 'Quantité',
    conforme: '✓ Conforme',
    non_conforme: '✗ Non conforme',
    interne: 'Interne',
    en_cours: '(en cours)',
    bons: 'bon(s)',
    fournisseurs: 'fournisseur(s)',
    total: 'Total',
    unites: 'unités',
    badge_copie: '📋 COPIÉ',
    badge_reverifier: '⚠ À RE-VÉRIFIER',
    document_genere_le: 'Document généré le',
    par: 'par',
    mention_archives: 'Document de traçabilité — à conserver en archives audit',
    locale: 'fr-FR',
  },
  en: {
    titre_app: 'Traceability passport',
    sous_titre_app: 'Export document — Agroforestry lot',
    statut_cloture: 'Closed lot',
    statut_en_cours: 'Open lot',
    filiere_production: 'Channel A — Own production',
    filiere_collecte: 'Channel B — Collection',
    section_identite: '1. Lot identity',
    section_origine: '2. Origin',
    section_etapes: '3. Post-harvest steps',
    section_analyses: '4. Quality analyses',
    section_conditionnements: '5. Packaging',
    section_cloture: '6. Official closure',
    section_notes: '7. Notes',
    label_code_lot: 'Lot code',
    label_filiere: 'Channel',
    label_culture: 'Crop',
    label_variete: 'Variety',
    label_date_debut: 'Start date',
    label_date_fin: 'End date',
    label_quantite_brute: 'Gross quantity',
    label_protocole: 'Post-harvest protocol',
    label_saisi_par: 'Recorded by',
    label_saisi_le: 'Recorded on',
    label_site: 'Site',
    label_parcelle: 'Plot',
    label_recolte_source: 'Source harvest',
    label_recolte_du: 'Harvest of',
    label_statut: 'Status',
    label_valide_par: 'Validated by',
    label_valide_le: 'Validated on',
    valeur_production: 'Own production (channel A)',
    valeur_collecte: 'Collection (channel B)',
    valeur_cloture: 'Closed',
    non_renseigne: 'Not provided',
    aucune_etape: 'No step recorded',
    aucune_analyse: 'No analysis recorded',
    aucun_conditionnement: 'No packaging recorded',
    aucune_origine: 'No origin information provided',
    aucun_bon: 'No collection note attached',
    lot_non_cloture: 'Lot not closed (still in progress)',
    col_num: '#',
    col_type: 'Type',
    col_periode: 'Period',
    col_qte: 'Qty In → Out',
    col_perte: 'Loss',
    col_operateur: 'Operator',
    col_parametres: 'Parameters',
    col_date: 'Date',
    col_laboratoire: 'Laboratory',
    col_valeur: 'Value',
    col_seuil: 'Threshold',
    col_conformite: 'Compliance',
    col_emballage: 'Packaging',
    col_nb: 'Qty',
    col_taille: 'Size',
    col_poids: 'Weight',
    col_serie: 'Serial #',
    col_stockage: 'Storage',
    col_n_bon: 'Note #',
    col_fournisseur: 'Supplier',
    col_quantite: 'Quantity',
    conforme: '✓ Compliant',
    non_conforme: '✗ Non-compliant',
    interne: 'In-house',
    en_cours: '(in progress)',
    bons: 'note(s)',
    fournisseurs: 'supplier(s)',
    total: 'Total',
    unites: 'units',
    badge_copie: '📋 COPIED',
    badge_reverifier: '⚠ TO RE-CHECK',
    document_genere_le: 'Document generated on',
    par: 'by',
    mention_archives: 'Traceability document — to be kept in audit archives',
    locale: 'en-US',
  },
};

// ============================================================
// HELPERS
// ============================================================

const formatKg = (kg) => {
  if (kg == null || isNaN(kg)) return '—';
  if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t`;
  return `${kg.toFixed(1)} kg`;
};

const formatPct = (pct) => {
  if (pct == null || isNaN(pct)) return '—';
  return `${pct.toFixed(1)} %`;
};

const formatDate = (iso, locale = 'fr-FR') => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale, {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
};

const formatDateTime = (iso, locale = 'fr-FR') => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(locale, {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const escape = (str) => {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

// Ajuste une couleur hex en plus clair (pour l'arrière-plan bandeau)
const eclairCouleur = (hexColor, opacity = 0.06) => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// ============================================================
// CHARGEMENT DES DONNÉES
// ============================================================

function chargerDonneesLot(lotId) {
  const lot = getLotById(lotId);
  if (!lot) throw new Error(`Lot ${lotId} introuvable`);

  const data = {
    lot,
    culture: null,
    site: null,
    parcelle: null,
    recolteSource: null,
    fournisseurs: [],
    bonsCollecte: [],
    etapes: [],
    analyses: [],
    conditionnements: [],
  };

  try { data.culture = getCultureById(lot.culture_id); } catch (e) {}

  if (lot.filiere === 'production') {
    if (lot.site_id && _getSiteById) {
      try { data.site = _getSiteById(lot.site_id); } catch (e) {}
    }
    if (lot.parcelle_id && _getParcelleById) {
      try { data.parcelle = _getParcelleById(lot.parcelle_id); } catch (e) {}
    }
    if (lot.recolte_maraichere_id && _getRecolteById) {
      try { data.recolteSource = _getRecolteById(lot.recolte_maraichere_id); } catch (e) {}
    }
  } else if (lot.filiere === 'collecte') {
    try {
      data.bonsCollecte = getBonsCollecteByLot(lotId) || [];
      const idsFournisseurs = [...new Set(
        data.bonsCollecte.map((b) => b.fournisseur_id).filter(Boolean)
      )];
      data.fournisseurs = idsFournisseurs.map((id) => {
        try { return getFournisseurById(id); } catch (e) { return null; }
      }).filter(Boolean);
    } catch (e) {}
  }

  try { data.etapes = getEtapesByLot(lotId) || []; } catch (e) {}
  try { data.analyses = getAnalysesByLot(lotId) || []; } catch (e) {}
  try { data.conditionnements = getConditionnementsByLot(lotId) || []; } catch (e) {}

  return data;
}

// ============================================================
// CONSTRUCTION DES SECTIONS HTML
// ============================================================

function sectionVide(label) {
  return `<p class="empty">— ${escape(label)} —</p>`;
}

function htmlEntete(data, t, params, couleurAccent) {
  const { lot } = data;
  const filiereLabel = lot.filiere === 'production'
    ? t.filiere_production
    : t.filiere_collecte;
  const statutLabel = lot.est_cloture ? t.statut_cloture : t.statut_en_cours;
  const statutCouleur = lot.est_cloture ? couleurAccent : '#b8821e';

  // En-tête entreprise (si paramètres configurés)
  const blocEntreprise = params && params.nom_commercial
    ? construireBlocEntreprise(params, couleurAccent)
    : `
      <div class="entete-logo">
        <div class="entete-titre-app">AgriSuite Madagascar</div>
        <div class="entete-sous-app">${escape(t.titre_app)}</div>
      </div>
    `;

  // Sous-titre du document (toujours affiché)
  const sousTitreDocument = params && params.nom_commercial
    ? `<div class="entete-document-titre">${escape(t.titre_app)}</div>
       <div class="entete-document-sous">${escape(t.sous_titre_app)}</div>`
    : '';

  return `
    <div class="entete">
      <div class="entete-haut">
        ${blocEntreprise}
        <div class="entete-statut" style="color: ${statutCouleur};">
          ${escape(statutLabel)}
        </div>
      </div>
      ${sousTitreDocument}
      <div class="entete-bandeau">
        <div class="entete-code">${escape(lot.code_lot)}</div>
        <div class="entete-filiere">${escape(filiereLabel)}</div>
      </div>
    </div>
  `;
}

function construireBlocEntreprise(params, couleurAccent) {
  const lignes = [];

  // Nom commercial en gros
  lignes.push(`<div class="entreprise-nom" style="color: ${couleurAccent};">${escape(params.nom_commercial)}</div>`);

  // Slogan en italique sous le nom
  if (params.slogan) {
    lignes.push(`<div class="entreprise-slogan">${escape(params.slogan)}</div>`);
  }

  // Adresse compacte
  const adresseParts = [];
  if (params.adresse_ligne1) adresseParts.push(escape(params.adresse_ligne1));
  if (params.adresse_ligne2) adresseParts.push(escape(params.adresse_ligne2));
  const lieuParts = [];
  if (params.code_postal) lieuParts.push(escape(params.code_postal));
  if (params.ville) lieuParts.push(escape(params.ville));
  if (lieuParts.length > 0) adresseParts.push(lieuParts.join(' '));
  if (params.pays && params.pays !== 'Madagascar') adresseParts.push(escape(params.pays));
  if (adresseParts.length > 0) {
    lignes.push(`<div class="entreprise-adresse">${adresseParts.join(' · ')}</div>`);
  }

  // Contact
  const contactParts = [];
  if (params.email) contactParts.push(escape(params.email));
  if (params.telephone) contactParts.push(escape(params.telephone));
  if (params.site_web) contactParts.push(escape(params.site_web));
  if (contactParts.length > 0) {
    lignes.push(`<div class="entreprise-contact">${contactParts.join(' · ')}</div>`);
  }

  // Identifiants fiscaux (compact)
  const fiscalParts = [];
  if (params.nif) fiscalParts.push(`NIF ${escape(params.nif)}`);
  if (params.stat_fiscale) fiscalParts.push(`Stat ${escape(params.stat_fiscale)}`);
  if (params.numero_rcs) fiscalParts.push(`RCS ${escape(params.numero_rcs)}`);
  if (fiscalParts.length > 0) {
    lignes.push(`<div class="entreprise-fiscal">${fiscalParts.join(' · ')}</div>`);
  }

  return `<div class="entete-logo">${lignes.join('')}</div>`;
}

function htmlIdentite(data, t) {
  const { lot, culture } = data;
  const cultureNom = culture ? (culture.nom_fr || culture.nom) : `Culture #${lot.culture_id}`;

  const lignes = [
    [t.label_code_lot,         lot.code_lot,                                         'mono'],
    [t.label_filiere,          lot.filiere === 'production' ? t.valeur_production : t.valeur_collecte, null],
    [t.label_culture,          cultureNom,                                            null],
    [t.label_variete,          lot.variete || null,                                   null],
    [t.label_date_debut,       formatDate(lot.date_debut, t.locale),                  null],
    [t.label_date_fin,         lot.date_fin ? formatDate(lot.date_fin, t.locale) : null, null],
    [t.label_quantite_brute,   lot.quantite_brute_kg != null ? formatKg(lot.quantite_brute_kg) : null, null],
    [t.label_protocole,        lot.protocole_post_recolte || null,                    null],
    [t.label_saisi_par,        lot.cree_par,                                          null],
    [t.label_saisi_le,         formatDateTime(lot.cree_le, t.locale),                 null],
  ];

  const ligneshtml = lignes.map(([label, valeur, classe]) => {
    const v = valeur != null && valeur !== '—'
      ? `<span class="${classe || ''}">${escape(valeur)}</span>`
      : `<span class="empty-inline">${escape(t.non_renseigne)}</span>`;
    return `<tr><td class="cell-label">${escape(label)}</td><td>${v}</td></tr>`;
  }).join('');

  return `
    <section>
      <h2>${escape(t.section_identite)}</h2>
      <table class="tab-cles">${ligneshtml}</table>
    </section>
  `;
}

function htmlOrigine(data, t) {
  const { lot, site, parcelle, recolteSource, fournisseurs, bonsCollecte } = data;

  let contenu = '';

  if (lot.filiere === 'production') {
    const lignes = [];
    if (site) lignes.push([t.label_site, site.nom || site.code]);
    if (parcelle) lignes.push([t.label_parcelle, parcelle.nom || `#${parcelle.id}`]);
    if (recolteSource) {
      lignes.push([
        t.label_recolte_source,
        `${t.label_recolte_du} ${formatDate(recolteSource.date_recolte, t.locale)} (${formatKg(recolteSource.quantite_kg)})`
      ]);
    }

    if (lignes.length === 0) {
      contenu = sectionVide(t.aucune_origine);
    } else {
      const ligneshtml = lignes.map(([label, valeur]) =>
        `<tr><td class="cell-label">${escape(label)}</td><td>${escape(valeur)}</td></tr>`
      ).join('');
      contenu = `<table class="tab-cles">${ligneshtml}</table>`;
    }
  } else {
    if (bonsCollecte.length === 0) {
      contenu = sectionVide(t.aucun_bon);
    } else {
      const ligneshtml = bonsCollecte.map((bon) => {
        const fournisseur = fournisseurs.find((f) => f && f.id === bon.fournisseur_id);
        const fournisseurNom = fournisseur
          ? `${escape(fournisseur.nom)} (${escape(fournisseur.code)})`
          : `Fournisseur #${bon.fournisseur_id || '—'}`;
        return `<tr>
          <td class="mono">${escape(bon.numero_bon || '—')}</td>
          <td>${formatDate(bon.date_collecte, t.locale)}</td>
          <td>${fournisseurNom}</td>
          <td class="num">${formatKg(bon.quantite_kg)}</td>
        </tr>`;
      }).join('');

      const totalKg = bonsCollecte.reduce((s, b) => s + (b.quantite_kg || 0), 0);
      const nbFournisseurs = fournisseurs.length;

      contenu = `
        <p class="meta">
          ${bonsCollecte.length} ${escape(t.bons)} · ${nbFournisseurs} ${escape(t.fournisseurs)} · ${escape(t.total)} ${formatKg(totalKg)}
        </p>
        <table class="tab-cols">
          <thead>
            <tr>
              <th>${escape(t.col_n_bon)}</th>
              <th>${escape(t.col_date)}</th>
              <th>${escape(t.col_fournisseur)}</th>
              <th class="num">${escape(t.col_quantite)}</th>
            </tr>
          </thead>
          <tbody>${ligneshtml}</tbody>
        </table>
      `;
    }
  }

  return `
    <section>
      <h2>${escape(t.section_origine)}</h2>
      ${contenu}
    </section>
  `;
}

function htmlEtapes(data, t) {
  const { etapes } = data;
  if (etapes.length === 0) {
    return `
      <section>
        <h2>${escape(t.section_etapes)}</h2>
        ${sectionVide(t.aucune_etape)}
      </section>
    `;
  }

  const ligneshtml = etapes.map((e, i) => {
    const ordre = e.ordre || i + 1;
    const dateTexte = e.date_fin
      ? `${formatDate(e.date_debut, t.locale)} → ${formatDate(e.date_fin, t.locale)}`
      : `${formatDate(e.date_debut, t.locale)} ${t.en_cours}`;

    let perte = '—';
    if (e.perte_kg != null && e.taux_perte_pct != null) {
      perte = `-${formatKg(e.perte_kg)} (${formatPct(e.taux_perte_pct)})`;
    }

    let parametres = '';
    if (e.parametres) {
      try {
        const p = typeof e.parametres === 'string' ? JSON.parse(e.parametres) : e.parametres;
        const parts = [];
        if (p.temperature_c != null) parts.push(`T° ${p.temperature_c}°C`);
        if (p.duree_h != null) parts.push(`${p.duree_h}h`);
        if (p.humidite_finale_pct != null) parts.push(`HR ${p.humidite_finale_pct}%`);
        if (p.pct_rebut != null) parts.push(`Rebut ${p.pct_rebut}%`);
        if (p.raison_rebut) parts.push(`(${p.raison_rebut})`);
        if (p.critere) parts.push(`Crit. ${p.critere}`);
        if (p.nb_calibres) parts.push(`${p.nb_calibres} calibres`);
        if (p.libre) parts.push(p.libre);
        parametres = parts.join(' · ');
      } catch (err) {}
    }

    const estCopiee = e.notes && e.notes.includes('[COPIÉ depuis lot rectifié');
    const aReVerifier = e.notes && e.notes.includes('à RE-VÉRIFIER');
    const badge = estCopiee
      ? `<span class="badge-copie ${aReVerifier ? 'badge-reverifier' : ''}">${aReVerifier ? t.badge_reverifier : t.badge_copie}</span>`
      : '';

    return `<tr>
      <td class="num-petit">${ordre}</td>
      <td><strong>${escape(e.type_etape)}</strong>${badge}</td>
      <td>${escape(dateTexte)}</td>
      <td class="num">${formatKg(e.quantite_entree_kg)}${e.quantite_sortie_kg != null ? ' → ' + formatKg(e.quantite_sortie_kg) : ''}</td>
      <td class="perte">${perte}</td>
      <td>${escape(e.operateur || '—')}</td>
      <td class="petit">${escape(parametres || '')}</td>
    </tr>`;
  }).join('');

  return `
    <section>
      <h2>${escape(t.section_etapes)} (${etapes.length})</h2>
      <table class="tab-cols">
        <thead>
          <tr>
            <th>${escape(t.col_num)}</th>
            <th>${escape(t.col_type)}</th>
            <th>${escape(t.col_periode)}</th>
            <th class="num">${escape(t.col_qte)}</th>
            <th>${escape(t.col_perte)}</th>
            <th>${escape(t.col_operateur)}</th>
            <th>${escape(t.col_parametres)}</th>
          </tr>
        </thead>
        <tbody>${ligneshtml}</tbody>
      </table>
    </section>
  `;
}

function htmlAnalyses(data, t) {
  const { analyses } = data;
  if (analyses.length === 0) {
    return `
      <section>
        <h2>${escape(t.section_analyses)}</h2>
        ${sectionVide(t.aucune_analyse)}
      </section>
    `;
  }

  const ligneshtml = analyses.map((a) => {
    let conformiteTexte = '—';
    let conformiteClasse = '';
    if (a.conforme === 1) {
      conformiteTexte = t.conforme;
      conformiteClasse = 'conforme';
    } else if (a.conforme === 0) {
      conformiteTexte = t.non_conforme;
      conformiteClasse = 'non-conforme';
    }

    let valeurTexte;
    if (a.valeur_texte) {
      valeurTexte = a.valeur_texte;
    } else if (a.valeur != null) {
      valeurTexte = `${a.valeur}${a.unite ? ' ' + a.unite : ''}`;
    } else {
      valeurTexte = '—';
    }

    let seuilTexte = '—';
    if (a.seuil_min != null && a.seuil_max != null) {
      seuilTexte = `${a.seuil_min} – ${a.seuil_max} ${a.unite || ''}`;
    } else if (a.seuil_max != null) {
      seuilTexte = `≤ ${a.seuil_max} ${a.unite || ''}`;
    } else if (a.seuil_min != null) {
      seuilTexte = `≥ ${a.seuil_min} ${a.unite || ''}`;
    }

    const estCopiee = a.notes && a.notes.includes('[COPIÉ depuis lot rectifié');
    const aReVerifier = a.notes && a.notes.includes('à RE-VÉRIFIER');
    const badge = estCopiee
      ? `<span class="badge-copie ${aReVerifier ? 'badge-reverifier' : ''}">${aReVerifier ? t.badge_reverifier : t.badge_copie}</span>`
      : '';

    return `<tr>
      <td>${formatDate(a.date_analyse, t.locale)}</td>
      <td><strong>${escape(a.type_analyse)}</strong>${badge}</td>
      <td>${escape(a.laboratoire || t.interne)}</td>
      <td><strong>${escape(valeurTexte)}</strong></td>
      <td class="petit">${escape(seuilTexte)}</td>
      <td class="${conformiteClasse}"><strong>${escape(conformiteTexte)}</strong></td>
    </tr>`;
  }).join('');

  return `
    <section>
      <h2>${escape(t.section_analyses)} (${analyses.length})</h2>
      <table class="tab-cols">
        <thead>
          <tr>
            <th>${escape(t.col_date)}</th>
            <th>${escape(t.col_type)}</th>
            <th>${escape(t.col_laboratoire)}</th>
            <th>${escape(t.col_valeur)}</th>
            <th>${escape(t.col_seuil)}</th>
            <th>${escape(t.col_conformite)}</th>
          </tr>
        </thead>
        <tbody>${ligneshtml}</tbody>
      </table>
    </section>
  `;
}

function htmlConditionnements(data, t) {
  const { conditionnements } = data;
  if (conditionnements.length === 0) {
    return `
      <section>
        <h2>${escape(t.section_conditionnements)}</h2>
        ${sectionVide(t.aucun_conditionnement)}
      </section>
    `;
  }

  const ligneshtml = conditionnements.map((c) => {
    let serie = '';
    if (c.numero_serie_debut && c.numero_serie_fin) {
      serie = `${escape(c.numero_serie_debut)} → ${escape(c.numero_serie_fin)}`;
    } else if (c.numero_serie_debut) {
      serie = escape(c.numero_serie_debut);
    }

    let stockage = c.lieu_stockage ? escape(c.lieu_stockage) : '';
    if (c.conditions_stockage) {
      try {
        const cs = typeof c.conditions_stockage === 'string'
          ? JSON.parse(c.conditions_stockage) : c.conditions_stockage;
        const parts = [];
        if (cs.temperature_c != null) parts.push(`${cs.temperature_c}°C`);
        if (cs.humidite_relative_pct != null) parts.push(`HR ${cs.humidite_relative_pct}%`);
        if (parts.length > 0) {
          stockage = stockage ? `${stockage} (${parts.join(', ')})` : parts.join(', ');
        }
      } catch (err) {}
    }

    const verso = c.etiquette_verso || '';
    const estCopiee = verso.includes('[COPIÉ depuis lot rectifié');
    const aReVerifier = verso.includes('à RE-VÉRIFIER');
    const badge = estCopiee
      ? `<span class="badge-copie ${aReVerifier ? 'badge-reverifier' : ''}">${aReVerifier ? t.badge_reverifier : t.badge_copie}</span>`
      : '';

    return `<tr>
      <td>${formatDate(c.date_conditionnement, t.locale)}</td>
      <td><strong>${escape(c.type_emballage)}</strong>${badge}</td>
      <td class="num-petit">${c.nombre_unites}</td>
      <td>${escape(c.unite_taille)}</td>
      <td class="num">${formatKg(c.poids_total_kg)}</td>
      <td class="petit">${serie}</td>
      <td class="petit">${stockage || '—'}</td>
    </tr>`;
  }).join('');

  const totalKg = conditionnements.reduce((s, c) => s + (c.poids_total_kg || 0), 0);
  const totalUnites = conditionnements.reduce((s, c) => s + (c.nombre_unites || 0), 0);

  return `
    <section>
      <h2>${escape(t.section_conditionnements)} (${conditionnements.length})</h2>
      <p class="meta">${totalUnites} ${escape(t.unites)} · ${escape(t.total)} ${formatKg(totalKg)}</p>
      <table class="tab-cols">
        <thead>
          <tr>
            <th>${escape(t.col_date)}</th>
            <th>${escape(t.col_emballage)}</th>
            <th>${escape(t.col_nb)}</th>
            <th>${escape(t.col_taille)}</th>
            <th class="num">${escape(t.col_poids)}</th>
            <th>${escape(t.col_serie)}</th>
            <th>${escape(t.col_stockage)}</th>
          </tr>
        </thead>
        <tbody>${ligneshtml}</tbody>
      </table>
    </section>
  `;
}

function htmlCloture(data, t) {
  const { lot } = data;
  if (!lot.est_cloture) {
    return `
      <section>
        <h2>${escape(t.section_cloture)}</h2>
        <p class="empty">— ${escape(t.lot_non_cloture)} —</p>
      </section>
    `;
  }

  const lignes = [
    [t.label_statut,       t.valeur_cloture],
    [t.label_valide_par,   lot.valide_par || null],
    [t.label_valide_le,    lot.valide_le ? formatDateTime(lot.valide_le, t.locale) : null],
  ];

  const ligneshtml = lignes.map(([label, valeur]) => {
    const v = valeur != null
      ? `<strong>${escape(valeur)}</strong>`
      : `<span class="empty-inline">${escape(t.non_renseigne)}</span>`;
    return `<tr><td class="cell-label">${escape(label)}</td><td>${v}</td></tr>`;
  }).join('');

  return `
    <section>
      <h2>${escape(t.section_cloture)}</h2>
      <table class="tab-cles">${ligneshtml}</table>
    </section>
  `;
}

function htmlNotes(data, t) {
  const { lot } = data;
  if (!lot.notes || !lot.notes.trim()) return '';
  return `
    <section>
      <h2>${escape(t.section_notes)}</h2>
      <pre class="notes">${escape(lot.notes)}</pre>
    </section>
  `;
}

function htmlPiedDePage(data, t, params) {
  const horodatage = formatDateTime(new Date().toISOString(), t.locale);
  const nomEntreprise = params?.nom_commercial || 'AgriSuite Madagascar';
  const mentionPersonnalisee = params?.mention_pied_page;

  return `
    <footer>
      <div class="footer-ligne1">
        ${escape(t.document_genere_le)} ${horodatage} ${escape(t.par)} ${escape(nomEntreprise)}
      </div>
      <div class="footer-ligne2">
        ${escape(t.mention_archives)}
      </div>
      ${mentionPersonnalisee ? `<div class="footer-ligne3">${escape(mentionPersonnalisee)}</div>` : ''}
    </footer>
  `;
}

// ============================================================
// CSS DYNAMIQUE (selon couleur d'accent)
// ============================================================

function genererCss(couleurAccent) {
  const couleurAccentClair = eclairCouleur(couleurAccent, 0.06);
  const COULEUR_AMBRE = '#b8821e';
  const COULEUR_GRIS = '#666666';
  const COULEUR_GRIS_CLAIR = '#a0a0a0';
  const COULEUR_ROUGE = '#a04040';
  const COULEUR_BORDURE = '#d0d0d0';

  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4; margin: 18mm 14mm; }
    body {
      font-family: Helvetica, Arial, sans-serif;
      color: #222;
      font-size: 10.5pt;
      line-height: 1.4;
      background: #fff;
    }

    /* En-tête */
    .entete {
      margin-bottom: 16px;
      padding-bottom: 10px;
      border-bottom: 2px solid ${couleurAccent};
    }
    .entete-haut {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
    }
    .entete-logo { flex: 1; }
    .entete-titre-app {
      font-size: 16pt;
      font-weight: bold;
      color: ${couleurAccent};
    }
    .entete-sous-app {
      font-size: 9pt;
      color: ${COULEUR_GRIS};
      margin-top: 2px;
    }
    .entete-statut {
      font-size: 11pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Bloc entreprise (en-tête personnalisé) */
    .entreprise-nom {
      font-size: 18pt;
      font-weight: bold;
      letter-spacing: -0.3px;
    }
    .entreprise-slogan {
      font-size: 9pt;
      color: ${COULEUR_GRIS};
      font-style: italic;
      margin-top: 1px;
    }
    .entreprise-adresse {
      font-size: 8.5pt;
      color: #444;
      margin-top: 4px;
    }
    .entreprise-contact {
      font-size: 8.5pt;
      color: #444;
      margin-top: 1px;
    }
    .entreprise-fiscal {
      font-size: 7.5pt;
      color: ${COULEUR_GRIS};
      margin-top: 4px;
      font-family: 'Courier New', monospace;
    }

    /* Sous-titre document (sous l'en-tête entreprise) */
    .entete-document-titre {
      font-size: 11pt;
      font-weight: bold;
      color: ${couleurAccent};
      margin-top: 8px;
      padding-top: 6px;
      border-top: 1px dotted ${COULEUR_BORDURE};
    }
    .entete-document-sous {
      font-size: 9pt;
      color: ${COULEUR_GRIS};
      font-style: italic;
    }

    /* Bandeau code lot */
    .entete-bandeau {
      background: ${couleurAccentClair};
      padding: 8px 12px;
      border-left: 4px solid ${couleurAccent};
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 8px;
    }
    .entete-code {
      font-family: 'Courier New', monospace;
      font-size: 14pt;
      font-weight: bold;
      color: ${COULEUR_AMBRE};
      letter-spacing: 1px;
    }
    .entete-filiere {
      font-size: 10pt;
      color: ${COULEUR_GRIS};
      font-style: italic;
    }

    /* Sections */
    section {
      margin-bottom: 16px;
      page-break-inside: avoid;
    }
    h2 {
      font-size: 11pt;
      font-weight: bold;
      color: ${couleurAccent};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding-bottom: 4px;
      margin-bottom: 8px;
      border-bottom: 1px solid ${COULEUR_BORDURE};
    }

    /* Tableaux clé/valeur */
    table.tab-cles { width: 100%; border-collapse: collapse; }
    table.tab-cles td {
      padding: 4px 8px;
      vertical-align: top;
      border-bottom: 1px solid #f0f0f0;
    }
    table.tab-cles td.cell-label {
      width: 35%;
      color: ${COULEUR_GRIS};
      font-size: 9.5pt;
    }

    /* Tableaux colonnes */
    table.tab-cols { width: 100%; border-collapse: collapse; margin-top: 4px; }
    table.tab-cols th {
      background: #f5f5f5;
      padding: 6px 8px;
      text-align: left;
      font-size: 9pt;
      font-weight: bold;
      color: ${COULEUR_GRIS};
      text-transform: uppercase;
      letter-spacing: 0.3px;
      border-bottom: 2px solid ${couleurAccent};
    }
    table.tab-cols td {
      padding: 6px 8px;
      border-bottom: 1px solid #f0f0f0;
      font-size: 9.5pt;
      vertical-align: top;
    }
    table.tab-cols .num { text-align: right; font-family: 'Courier New', monospace; }
    table.tab-cols .num-petit { text-align: center; }
    table.tab-cols .petit { font-size: 8.5pt; color: ${COULEUR_GRIS}; }

    .mono { font-family: 'Courier New', monospace; }
    .perte { color: ${COULEUR_ROUGE}; font-family: 'Courier New', monospace; font-size: 9pt; }
    .conforme { color: ${couleurAccent}; }
    .non-conforme { color: ${COULEUR_ROUGE}; }

    /* Badges */
    .badge-copie {
      display: inline-block;
      margin-left: 6px;
      padding: 1px 5px;
      font-size: 7pt;
      font-weight: bold;
      border-radius: 3px;
      background: #e6f0f7;
      color: #2e6a8e;
      border: 1px solid #2e6a8e;
      letter-spacing: 0.3px;
    }
    .badge-copie.badge-reverifier {
      background: #fdf6e3;
      color: #886612;
      border-color: #886612;
    }

    /* Vides / méta */
    .empty {
      color: ${COULEUR_GRIS_CLAIR};
      font-style: italic;
      padding: 8px 0;
      text-align: center;
      font-size: 9.5pt;
    }
    .empty-inline { color: ${COULEUR_GRIS_CLAIR}; font-style: italic; }
    .meta {
      font-size: 9pt;
      color: ${COULEUR_GRIS};
      margin-bottom: 6px;
      font-style: italic;
    }

    /* Notes */
    pre.notes {
      background: #fafafa;
      border: 1px solid ${COULEUR_BORDURE};
      padding: 10px;
      font-family: 'Courier New', monospace;
      font-size: 8.5pt;
      white-space: pre-wrap;
      word-break: break-word;
      color: #444;
    }

    /* Pied de page */
    footer {
      margin-top: 24px;
      padding-top: 10px;
      border-top: 1px solid ${COULEUR_BORDURE};
      text-align: center;
      color: ${COULEUR_GRIS};
      font-size: 8pt;
    }
    .footer-ligne1 { margin-bottom: 2px; }
    .footer-ligne2 { font-style: italic; color: ${COULEUR_GRIS_CLAIR}; }
    .footer-ligne3 {
      margin-top: 4px;
      font-weight: bold;
      color: ${COULEUR_GRIS};
      font-style: italic;
    }
  `;
}

// ============================================================
// API PUBLIQUE
// ============================================================

/**
 * Génère le HTML complet du passeport.
 * @param {number} lotId
 * @param {string} langue - 'fr' ou 'en' (défaut : paramètres entreprise ou 'fr')
 */
export function genererHtmlPasseport(lotId, langue = null) {
  const data = chargerDonneesLot(lotId);

  // Charge les paramètres entreprise (peut être null si pas configuré)
  let params = null;
  try { params = getParametresEntreprise(); } catch (e) {}

  // Détermine la langue effective
  const langueEffective = langue
    || (params && params.langue_pdf_defaut)
    || 'fr';
  const t = TRADUCTIONS[langueEffective] || TRADUCTIONS.fr;

  // Couleur d'accent (depuis paramètres ou défaut vert AgriSuite)
  const couleurAccent = (params && params.couleur_accent) || '#1a5d2e';

  const css = genererCss(couleurAccent);

  return `<!DOCTYPE html>
<html lang="${langueEffective}">
<head>
<meta charset="UTF-8">
<title>Passeport ${escape(data.lot.code_lot)}</title>
<style>${css}</style>
</head>
<body>
${htmlEntete(data, t, params, couleurAccent)}
${htmlIdentite(data, t)}
${htmlOrigine(data, t)}
${htmlEtapes(data, t)}
${htmlAnalyses(data, t)}
${htmlConditionnements(data, t)}
${htmlCloture(data, t)}
${htmlNotes(data, t)}
${htmlPiedDePage(data, t, params)}
</body>
</html>`;
}

/**
 * Génère le PDF.
 * @param {number} lotId
 * @param {string} langue - 'fr' ou 'en'
 * @returns {Promise<{ uri: string, codeLot: string }>}
 */
export async function genererPdfPasseport(lotId, langue = null) {
  const lot = getLotById(lotId);
  if (!lot) throw new Error(`Lot ${lotId} introuvable`);

  const html = genererHtmlPasseport(lotId, langue);

  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
    margins: { left: 40, top: 50, right: 40, bottom: 50 },
  });

  return { uri, codeLot: lot.code_lot };
}

/**
 * Lance l'impression directe.
 * @param {number} lotId
 * @param {string} langue - 'fr' ou 'en'
 */
export async function imprimerPasseport(lotId, langue = null) {
  const html = genererHtmlPasseport(lotId, langue);
  await Print.printAsync({ html });
}