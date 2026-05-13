// database/certifTrackData.js
// Seed catalogue référentiels — Pack export MDG (5 référentiels)
// Phase 3 Session 7
// Métadonnées validées par expert exportateur (organismes, versions, durées conversion)

import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('certifpilot.db');

// ============================================================
// CATALOGUE 5 RÉFÉRENTIELS
// ============================================================

const REFERENTIELS = [
  // ────────────────────────────────────────────────
  // 1. BIO UE — Cible primaire UE BIO
  // ────────────────────────────────────────────────
  {
    code: 'BIO_UE',
    nom_court: 'BIO UE',
    nom_complet: 'Agriculture Biologique — Règlement UE 2018/848',
    organisme_emetteur: 'Commission Européenne',
    version_reference: 'Règlement (UE) 2018/848 + Règlement d\'exécution 2021/1165',
    pays_origine: 'UE',
    type_referentiel: 'bio',
    perimetre_produits: 'Tous produits agricoles végétaux et animaux destinés au marché UE',
    duree_conversion_annuelles: 24,
    duree_conversion_perennes: 36,
    organismes_certificateurs: 'Ecocert, ControlUnion, BCS Öko-Garantie, CERES, IMO',
    site_web: 'https://agriculture.ec.europa.eu/farming/organic-farming_fr',
    description: 'Référentiel BIO de référence pour le marché UE. Interdit pesticides de synthèse, OGM, irradiation. Exige séparation physique BIO/conventionnel, traçabilité ascendante 100%, registres infalsifiables. Délais de conversion stricts : 24 mois cultures annuelles, 36 mois pérennes. Reconnu par USDA NOP via accord d\'équivalence.',
    exige_sci: 1,
    cout_indicatif_eur: '2 000 - 5 000 € audit initial + 1 500 - 3 000 € / an',
  },

  // ────────────────────────────────────────────────
  // 2. HACCP — Sécurité alimentaire (obligatoire transformation)
  // ────────────────────────────────────────────────
  {
    code: 'HACCP',
    nom_court: 'HACCP',
    nom_complet: 'Hazard Analysis Critical Control Point — Codex Alimentarius',
    organisme_emetteur: 'Codex Alimentarius (FAO/OMS)',
    version_reference: 'CXC 1-1969 Rév. 2020 + ISO 22000:2018',
    pays_origine: 'International',
    type_referentiel: 'securite_alimentaire',
    perimetre_produits: 'Tout produit alimentaire transformé (séchage contrôlé, fermentation, broyage, conditionnement consommation humaine)',
    duree_conversion_annuelles: null,
    duree_conversion_perennes: null,
    organismes_certificateurs: 'Bureau Veritas, SGS, DNV, TÜV',
    site_web: 'https://www.fao.org/fao-who-codexalimentarius/',
    description: 'Méthode systématique d\'identification, d\'évaluation et de maîtrise des dangers (biologiques, chimiques, physiques, allergéniques) en sécurité alimentaire. Obligatoire dès toute transformation. Repose sur 7 principes : analyse des dangers, identification CCP, limites critiques, surveillance, actions correctives, vérification, documentation. Module M4b dédié dans AgriSuite.',
    exige_sci: 0,
    cout_indicatif_eur: '1 500 - 4 000 € audit + 1 000 - 2 500 € / an',
  },

  // ────────────────────────────────────────────────
  // 3. Fairtrade FLO — Café, cacao, vanille premium
  // ────────────────────────────────────────────────
  {
    code: 'FAIRTRADE_FLO',
    nom_court: 'Fairtrade',
    nom_complet: 'Fairtrade International — Standard FLO',
    organisme_emetteur: 'Fairtrade International (FLO)',
    version_reference: 'Standard SPO (Small Producer Organizations) — version 2024',
    pays_origine: 'International (Bonn, DE)',
    type_referentiel: 'equitable',
    perimetre_produits: 'Café, cacao, vanille, fruits frais et séchés, épices, sucre, miel',
    duree_conversion_annuelles: null,
    duree_conversion_perennes: null,
    organismes_certificateurs: 'FLOCERT (organisme exclusif)',
    site_web: 'https://www.fairtrade.net',
    description: 'Référentiel commerce équitable de référence. Exige prix minimum garanti + prime Fairtrade (versée à la coopérative pour projets collectifs). Organisation démocratique des producteurs obligatoire (1 producteur = 1 voix). Formations annuelles documentées. Audits FLOCERT exclusifs. Premium 15-25% sur prix FOB. Fortement attendu sur café et cacao en Europe.',
    exige_sci: 1,
    cout_indicatif_eur: '3 000 - 8 000 € audit initial + 2 000 - 5 000 € / an + frais d\'adhésion',
  },

  // ────────────────────────────────────────────────
  // 4. Rainforest Alliance — Café spécialité, cacao fin
  // ────────────────────────────────────────────────
  {
    code: 'RAINFOREST',
    nom_court: 'Rainforest Alliance',
    nom_complet: 'Rainforest Alliance Sustainable Agriculture Standard',
    organisme_emetteur: 'Rainforest Alliance (fusion RA + UTZ)',
    version_reference: 'Standard 2020 — version 1.3 (2024)',
    pays_origine: 'International (New York, US)',
    type_referentiel: 'durable',
    perimetre_produits: 'Café, cacao, thé, épices, fruits tropicaux, fleurs',
    duree_conversion_annuelles: null,
    duree_conversion_perennes: null,
    organismes_certificateurs: 'NSF International, Africert, IMO, Control Union',
    site_web: 'https://www.rainforest-alliance.org',
    description: 'Référentiel durabilité (issu fusion RA + UTZ en 2018). Triple pilier : conservation biodiversité, conditions de travail décentes, viabilité économique. Exige cartographie des zones forestières, no-déforestation post-2014, formations producteurs, plan d\'amélioration continue. Très demandé par roasters café spécialité et chocolatiers craft EU/US. Exigences traçabilité numérique strictes (RACP — Rainforest Alliance Certification Platform).',
    exige_sci: 1,
    cout_indicatif_eur: '2 500 - 6 000 € audit + 2 000 - 4 000 € / an',
  },

  // ────────────────────────────────────────────────
  // 5. Label Vanille de Madagascar — Pré-requis CNV national
  // ────────────────────────────────────────────────
  {
    code: 'LABEL_VANILLE_MDG',
    nom_court: 'Label Vanille MDG',
    nom_complet: 'Label Vanille de Madagascar — Conseil National de la Vanille',
    organisme_emetteur: 'Conseil National de la Vanille (CNV) — Madagascar',
    version_reference: 'Cahier des charges CNV 2023',
    pays_origine: 'Madagascar',
    type_referentiel: 'origine',
    perimetre_produits: 'Vanille (Vanilla planifolia) produite à Madagascar — gousses préparées',
    duree_conversion_annuelles: null,
    duree_conversion_perennes: null,
    organismes_certificateurs: 'CNV (autorité nationale) + agréments exportateurs',
    site_web: 'https://www.cnv-madagascar.mg',
    description: 'Label d\'origine national malgache obligatoire pour tout exportateur de vanille. Garantit l\'origine MDG, le respect du calendrier de récolte officiel (date d\'ouverture campagne fixée par décret annuel), les critères qualité minimaux (taux vanilline, humidité, taille). Délivré par le Conseil National de la Vanille. Pré-requis administratif pour obtenir l\'agrément exportateur vanille. Sans ce label, pas d\'export vanille légal de Madagascar.',
    exige_sci: 0,
    cout_indicatif_eur: 'Frais d\'agrément exportateur + cotisation CNV (variable selon volume exporté)',
  },
];

// ============================================================
// FONCTION DE SEED IDEMPOTENTE
// ============================================================

export const seedCertifTrack = () => {
  // Vérifier si déjà seedé (idempotent)
  const count = db.getFirstSync('SELECT COUNT(*) as count FROM referentiels');

  if (count && count.count >= REFERENTIELS.length) {
    console.log(`✅ CertifTrack déjà seedé (${count.count} référentiels)`);
    return;
  }

  console.log('🌱 Seed CertifTrack — insertion des référentiels...');

  REFERENTIELS.forEach((ref) => {
    const existing = db.getFirstSync(
      'SELECT id FROM referentiels WHERE code = ?',
      [ref.code]
    );

    if (existing) {
      console.log(`  ↪ ${ref.code} déjà présent, skip`);
      return;
    }

    db.runSync(
      `INSERT INTO referentiels (
        code, nom_court, nom_complet, organisme_emetteur, version_reference,
        pays_origine, type_referentiel, perimetre_produits,
        duree_conversion_annuelles, duree_conversion_perennes,
        organismes_certificateurs, site_web, description,
        exige_sci, cout_indicatif_eur, actif
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        ref.code,
        ref.nom_court,
        ref.nom_complet,
        ref.organisme_emetteur,
        ref.version_reference,
        ref.pays_origine,
        ref.type_referentiel,
        ref.perimetre_produits,
        ref.duree_conversion_annuelles,
        ref.duree_conversion_perennes,
        ref.organismes_certificateurs,
        ref.site_web,
        ref.description,
        ref.exige_sci,
        ref.cout_indicatif_eur,
      ]
    );

    console.log(`  ✓ ${ref.code} — ${ref.nom_court}`);
  });

  const finalCount = db.getFirstSync('SELECT COUNT(*) as count FROM referentiels');
  console.log(`✅ CertifTrack seed complet : ${finalCount.count} référentiels en base`);
};