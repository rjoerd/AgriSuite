// database/certifTrackExigences.js
// Seed exigences démo Session 8 — 15 exigences (3 par référentiel)
// Phase 3 Session 8
//
// ⚠️ POSTURE V2 SESSION 8 :
// Ce fichier contient un échantillon REPRÉSENTATIF mais NON EXHAUSTIF
// destiné à valider l'infrastructure. La modélisation complète de chaque
// référentiel (~445 exigences au total) est répartie sur les sessions :
//   - Session 8a : BIO UE 2018/848 complet (~120 exigences EUR-Lex)
//   - Session 8b : HACCP Codex CXC 1-1969 complet (~50 exigences)
//   - Session 8c : Fairtrade FLO SPO 2024 complet (~110 critères)
//   - Session 8d : Rainforest Alliance 2020 v1.3 complet (~140 critères)
//
// Label Vanille MDG : 3 exigences placeholder (abandon CNV en cours selon Derp).
// À retirer quand l'abandon est confirmé.
//
// Couverture session 8 (15 exigences) :
//   - 9 catégories sur 9 utilisées
//   - 3 criticités utilisées (majeure, mineure, recommandation)
//   - 5 règles auto sur 5 utilisées :
//       DELAI_CONVERSION_BIO, MELANGE_BIO_CONV, ANALYSE_NON_CONFORME,
//       ETAPE_MANQUANTE, PREUVE_MANQUANTE_MAJEURE

import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('certifpilot.db');

// ============================================================
// CATALOGUE EXIGENCES DÉMO
// ============================================================

const EXIGENCES_DEMO = {

  // ────────────────────────────────────────────────
  // BIO UE 2018/848 — 3 exigences démo
  // ────────────────────────────────────────────────
  BIO_UE: [
    {
      code_exigence: 'BIO-CONV-01',
      categorie: 'tracabilite',
      titre: 'Délai de conversion BIO respecté',
      description: 'La période de conversion (24 mois cultures annuelles, 36 mois pérennes) doit être écoulée avant que la production puisse être commercialisée comme BIO. Le délai court à compter de la date de début de conversion enregistrée auprès de l\'organisme certificateur.',
      criticite: 'majeure',
      preuve_attendue: 'Date de début de conversion enregistrée. Calcul automatique de l\'écart avec la date de récolte du lot. Aucune commercialisation BIO n\'est possible avant la fin du délai.',
      reference_officielle: 'Règlement (UE) 2018/848, Article 10 §1 et Annexe II Partie I',
      auto_verifiable: 1,
      regle_auto_code: 'DELAI_CONVERSION_BIO',
      ordre: 1,
    },
    {
      code_exigence: 'BIO-INT-01',
      categorie: 'intrants',
      titre: 'Aucun pesticide de synthèse utilisé',
      description: 'L\'utilisation de pesticides chimiques de synthèse, herbicides, fongicides et insecticides non autorisés est strictement interdite sur les parcelles BIO. Seuls les produits listés à l\'Annexe I du Règlement 2021/1165 sont autorisés.',
      criticite: 'majeure',
      preuve_attendue: 'Registre des intrants tenu à jour, factures d\'achat de produits de protection des cultures, photos des produits stockés, déclaration sur l\'honneur des employés.',
      reference_officielle: 'Règlement (UE) 2018/848, Annexe II Partie I §1.6 + Règlement d\'exécution 2021/1165',
      auto_verifiable: 0,
      regle_auto_code: null,
      ordre: 2,
    },
    {
      code_exigence: 'BIO-POSTREC-01',
      categorie: 'gestion_post_recolte',
      titre: 'Séparation physique BIO / conventionnel documentée',
      description: 'Lors du tri, séchage, stockage et conditionnement, les lots BIO doivent être physiquement séparés des lots conventionnels et clairement identifiés. La séparation doit être documentée (zones de stockage distinctes, plages horaires différentes, équipements dédiés ou nettoyage entre usages).',
      criticite: 'mineure',
      preuve_attendue: 'Plan de l\'unité avec zones BIO identifiées, photos étiquetage, procédure de nettoyage entre usages BIO/conv, registre de planning machines.',
      reference_officielle: 'Règlement (UE) 2018/848, Article 28 et Annexe II Partie IV',
      auto_verifiable: 1,
      regle_auto_code: 'MELANGE_BIO_CONV',
      ordre: 3,
    },
  ],

  // ────────────────────────────────────────────────
  // HACCP — 3 exigences démo
  // ────────────────────────────────────────────────
  HACCP: [
    {
      code_exigence: 'HACCP-CCP-01',
      categorie: 'qualite_securite',
      titre: 'Limites critiques aux CCP respectées',
      description: 'À chaque Point de Contrôle Critique (CCP) identifié dans l\'étude HACCP, les limites critiques (température, humidité, durée, pH) doivent être respectées en continu. Tout dépassement déclenche une action corrective documentée.',
      criticite: 'majeure',
      preuve_attendue: 'Registre des relevés CCP horodatés (température séchage, humidité finale, durée fermentation), bulletins d\'analyses de laboratoire pour les contaminants (aflatoxines, ochratoxine A, métaux lourds, résidus pesticides) avec valeurs sous les seuils Codex.',
      reference_officielle: 'Codex CXC 1-1969 Rév. 2020, Principe 3 et 4 + ISO 22000:2018 §8.5',
      auto_verifiable: 1,
      regle_auto_code: 'ANALYSE_NON_CONFORME',
      ordre: 1,
    },
    {
      code_exigence: 'HACCP-DOC-01',
      categorie: 'documentation',
      titre: 'Étape critique post-récolte documentée pour chaque lot',
      description: 'Tout lot clôturé doit comporter au minimum une étape post-récolte documentée selon son protocole (séchage, fermentation, calibrage, etc.). Un lot clôturé sans étape critique constitue une défaillance de la traçabilité et de la maîtrise sanitaire.',
      criticite: 'majeure',
      preuve_attendue: 'Au moins une étape post-récolte enregistrée dans la fiche du lot, avec opérateur identifié, dates de début et fin, quantités entrée/sortie.',
      reference_officielle: 'Codex CXC 1-1969 Rév. 2020, Principe 7 (Documentation)',
      auto_verifiable: 1,
      regle_auto_code: 'ETAPE_MANQUANTE',
      ordre: 2,
    },
    {
      code_exigence: 'HACCP-FORM-01',
      categorie: 'social_travail',
      titre: 'Formation hygiène du personnel à jour',
      description: 'Tout opérateur intervenant sur les lots destinés à l\'export doit avoir suivi une formation aux bonnes pratiques d\'hygiène (lavage des mains, équipements de protection, gestion des plaies, déclaration des maladies). Formation initiale + recyclage annuel.',
      criticite: 'mineure',
      preuve_attendue: 'Attestations de formation signées datées de moins de 12 mois, registre de formation, photos du personnel équipé sur site.',
      reference_officielle: 'Codex CXC 1-1969 Rév. 2020, Annexe Hygiène §10 + ISO 22000:2018 §7.2',
      auto_verifiable: 0,
      regle_auto_code: null,
      ordre: 3,
    },
  ],

  // ────────────────────────────────────────────────
  // Fairtrade FLO — 3 exigences démo
  // ────────────────────────────────────────────────
  FAIRTRADE_FLO: [
    {
      code_exigence: 'FT-PRIME-01',
      categorie: 'gouvernance',
      titre: 'Utilisation démocratique de la prime Fairtrade',
      description: 'La prime Fairtrade (versée en plus du prix d\'achat) doit être utilisée pour des projets collectifs décidés démocratiquement par l\'assemblée des producteurs. Les fonds ne peuvent pas être détournés vers la trésorerie générale ou vers les bénéfices privés.',
      criticite: 'majeure',
      preuve_attendue: 'Procès-verbaux d\'assemblée générale décidant de l\'usage de la prime, plan d\'utilisation annuel, comptabilité séparée du fonds prime, factures des projets financés (école, dispensaire, équipements collectifs).',
      reference_officielle: 'Fairtrade FLO Standard SPO 2024, Critère 2.1.5 et 4.1.x',
      auto_verifiable: 0,
      regle_auto_code: null,
      ordre: 1,
    },
    {
      code_exigence: 'FT-GOUV-01',
      categorie: 'gouvernance',
      titre: 'Assemblée générale annuelle tenue',
      description: 'L\'organisation de producteurs doit tenir au moins une assemblée générale par an, ouverte à tous les membres, avec quorum, vote démocratique (1 producteur = 1 voix) et procès-verbal signé.',
      criticite: 'majeure',
      preuve_attendue: 'Procès-verbal de la dernière AG signé par le président et le secrétaire, liste de présence, ordre du jour, comptes annuels présentés et votés.',
      reference_officielle: 'Fairtrade FLO Standard SPO 2024, Critère 2.1.x (gouvernance démocratique)',
      auto_verifiable: 0,
      regle_auto_code: null,
      ordre: 2,
    },
    {
      code_exigence: 'FT-ENV-01',
      categorie: 'environnement',
      titre: 'Plan de gestion des déchets en place',
      description: 'L\'organisation doit disposer d\'un plan documenté de gestion des déchets agricoles, plastiques, emballages d\'intrants et eaux usées. Les déchets dangereux (emballages pesticides) sont collectés séparément et éliminés via une filière agréée.',
      criticite: 'mineure',
      preuve_attendue: 'Document plan de gestion des déchets daté et signé, photos des zones de tri, contrats avec collecteurs, registre des sorties de déchets dangereux.',
      reference_officielle: 'Fairtrade FLO Standard SPO 2024, Critère 3.x (environnement)',
      auto_verifiable: 0,
      regle_auto_code: null,
      ordre: 3,
    },
  ],

  // ────────────────────────────────────────────────
  // Rainforest Alliance — 3 exigences démo
  // ────────────────────────────────────────────────
  RAINFOREST: [
    {
      code_exigence: 'RA-DEF-01',
      categorie: 'environnement',
      titre: 'Aucune déforestation post-2014 sur les parcelles certifiées',
      description: 'Les parcelles certifiées RA ne doivent avoir subi aucune déforestation, conversion d\'écosystème naturel ou perte significative de couvert forestier après le 1er janvier 2014. Cartographie satellite à l\'appui obligatoire.',
      criticite: 'majeure',
      preuve_attendue: 'Cartographie GPS des parcelles, images satellite historiques (Global Forest Watch, Sentinel-2) montrant le couvert depuis 2014, déclaration sur l\'honneur du producteur.',
      reference_officielle: 'Rainforest Alliance Sustainable Agriculture Standard 2020 v1.3, Chapitre 6 §6.1',
      auto_verifiable: 0,
      regle_auto_code: null,
      ordre: 1,
    },
    {
      code_exigence: 'RA-SOC-01',
      categorie: 'social_travail',
      titre: 'Salaires conformes au minimum légal national',
      description: 'Tous les travailleurs (permanents et saisonniers) doivent recevoir au minimum le salaire minimum légal en vigueur dans le pays, payé régulièrement, avec bulletin de paie. Aucun travail forcé, aucun travail des enfants de moins de 15 ans.',
      criticite: 'majeure',
      preuve_attendue: 'Bulletins de paie échantillonnés, registre du personnel avec date de naissance, contrats de travail signés, preuve du salaire minimum applicable à Madagascar.',
      reference_officielle: 'Rainforest Alliance Standard 2020 v1.3, Chapitre 5 (Social) §5.1 et 5.2',
      auto_verifiable: 0,
      regle_auto_code: null,
      ordre: 2,
    },
    {
      code_exigence: 'RA-TRAC-01',
      categorie: 'tracabilite',
      titre: 'Toutes les exigences majeures justifiées par une preuve',
      description: 'Pour chaque exigence de criticité majeure, au moins une preuve doit être enregistrée (analyse, document, observation, attestation). Une exigence majeure sans preuve constitue un risque audit critique.',
      criticite: 'mineure',
      preuve_attendue: 'Au moins une preuve enregistrée par exigence majeure dans le système. Le moteur de conformité émet une alerte si une exigence majeure reste sans preuve sur un engagement actif.',
      reference_officielle: 'Rainforest Alliance Standard 2020 v1.3, Chapitre 1 §1.5 (traçabilité documentaire)',
      auto_verifiable: 1,
      regle_auto_code: 'PREUVE_MANQUANTE_MAJEURE',
      ordre: 3,
    },
  ],

  // ────────────────────────────────────────────────
  // Label Vanille MDG — 3 exigences démo (à retirer si abandon CNV confirmé)
  // ────────────────────────────────────────────────
  LABEL_VANILLE_MDG: [
    {
      code_exigence: 'LVM-CAMP-01',
      categorie: 'pratiques_culturales',
      titre: 'Date d\'ouverture de campagne respectée',
      description: 'La récolte de la vanille ne peut débuter qu\'à la date d\'ouverture officielle de la campagne fixée chaque année par décret du Ministère du Commerce, sur proposition du CNV. Toute récolte anticipée est interdite.',
      criticite: 'majeure',
      preuve_attendue: 'Date de récolte du lot >= date d\'ouverture campagne officielle. Pour 2026, date à confirmer par décret.',
      reference_officielle: 'Cahier des charges CNV 2023, §3.1 + Décret annuel Ministère du Commerce',
      auto_verifiable: 0,
      regle_auto_code: null,
      ordre: 1,
    },
    {
      code_exigence: 'LVM-QUAL-01',
      categorie: 'qualite_securite',
      titre: 'Taux de vanilline minimum 1,6 %',
      description: 'Pour bénéficier du label Vanille de Madagascar qualité noire/black prête, le taux de vanilline mesuré sur la matière sèche doit être au minimum de 1,6 %. Analyse en laboratoire agréé.',
      criticite: 'majeure',
      preuve_attendue: 'Bulletin d\'analyse vanilline laboratoire agréé (par ex. CTHT Tamatave, IPM Antananarivo) avec valeur ≥ 1.6 % sur matière sèche.',
      reference_officielle: 'Cahier des charges CNV 2023, §4.2 (qualité physico-chimique)',
      auto_verifiable: 1,
      regle_auto_code: 'ANALYSE_NON_CONFORME',
      ordre: 2,
    },
    {
      code_exigence: 'LVM-AGR-01',
      categorie: 'documentation',
      titre: 'Agrément exportateur en cours de validité',
      description: 'Tout exportateur de vanille doit posséder un agrément en cours de validité délivré par les autorités malgaches (Ministère du Commerce + CNV). L\'agrément est annuel et soumis à cotisation.',
      criticite: 'majeure',
      preuve_attendue: 'Copie de l\'agrément exportateur valide pour l\'année en cours, justificatif de paiement de la cotisation CNV.',
      reference_officielle: 'Cahier des charges CNV 2023, §2 (statut exportateur)',
      auto_verifiable: 0,
      regle_auto_code: null,
      ordre: 3,
    },
  ],
};

// ============================================================
// SEED IDEMPOTENT
// ============================================================

export const seedCertifTrackExigences = () => {
  console.log('🌱 Seed CertifTrack — exigences démo Session 8...');

  let totalInsere = 0;
  let totalSkip = 0;

  Object.keys(EXIGENCES_DEMO).forEach((codeReferentiel) => {
    // Récupérer l'id du référentiel
    const ref = db.getFirstSync(
      'SELECT id FROM referentiels WHERE code = ?',
      [codeReferentiel]
    );

    if (!ref) {
      console.log(`  ⚠ Référentiel ${codeReferentiel} introuvable, skip`);
      return;
    }

    const exigences = EXIGENCES_DEMO[codeReferentiel];

    exigences.forEach((ex) => {
      // Vérifier si l'exigence existe déjà (idempotent par code)
      const existing = db.getFirstSync(
        'SELECT id FROM exigences_referentiel WHERE referentiel_id = ? AND code_exigence = ?',
        [ref.id, ex.code_exigence]
      );

      if (existing) {
        totalSkip++;
        return;
      }

      db.runSync(
        `INSERT INTO exigences_referentiel (
          referentiel_id, code_exigence, categorie, titre, description,
          criticite, preuve_attendue, reference_officielle,
          auto_verifiable, regle_auto_code, ordre
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ref.id,
          ex.code_exigence,
          ex.categorie,
          ex.titre,
          ex.description,
          ex.criticite,
          ex.preuve_attendue,
          ex.reference_officielle,
          ex.auto_verifiable,
          ex.regle_auto_code,
          ex.ordre,
        ]
      );
      totalInsere++;
    });

    console.log(`  ✓ ${codeReferentiel} : ${exigences.length} exigences`);
  });

  if (totalSkip > 0) {
    console.log(`  ↪ ${totalSkip} exigences déjà présentes, skipped`);
  }

  const finalCount = db.getFirstSync(
    'SELECT COUNT(*) as count FROM exigences_referentiel'
  );
  console.log(`✅ Seed exigences complet : ${finalCount.count} exigences en base (${totalInsere} nouvelles)`);
};