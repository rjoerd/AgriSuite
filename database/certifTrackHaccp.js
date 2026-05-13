// database/certifTrackHaccp.js
// Session 8b — HACCP Codex complet
// 47 exigences supplémentaires (en plus des 3 démo Session 8)
// Total après seed : 50 exigences HACCP
//
// Sources de référence :
//   - Codex Alimentarius CXC 1-1969 Rév. 2020 (Hygiène des aliments)
//   - ISO 22000:2018 (Systèmes de management sécurité alimentaire)
//   - PRP : ISO/TS 22002-1:2009 (Programmes Pré-Requis fabrication)
//
// Couverture : 7 principes HACCP + 8 PRP fondamentaux
// Périmètre : transformation des produits (séchage vanille, fermentation cacao,
//             torréfaction café, conditionnement final tous produits)
//
// ⚠️ Validation finale par consultant Bureau Veritas / SGS recommandée avant audit.

import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('certifpilot.db');

const REF_CODE = 'HACCP';

// ============================================================
// CATALOGUE EXIGENCES HACCP — 47 entrées
// ============================================================

const EXIGENCES_HACCP = [

  // ════════════════════════════════════════════════════════════
  // PRINCIPE 1 — ANALYSE DES DANGERS (6 exigences)
  // ════════════════════════════════════════════════════════════
  {
    code: 'HACCP-P1-01',
    cat: 'qualite_securite',
    titre: 'Équipe HACCP constituée et formée',
    desc: 'Équipe HACCP désignée par écrit, multidisciplinaire (production, qualité, maintenance), formée à la méthode HACCP par organisme reconnu. Coordinateur HACCP identifié.',
    crit: 'majeure',
    preuve: 'Lettres de mission équipe HACCP + attestations de formation + CV coordinateur.',
    ref: 'Codex CXC 1-1969 Rév. 2020, Annexe HACCP §1',
    auto: 0, regle: null,
  },
  {
    code: 'HACCP-P1-02',
    cat: 'qualite_securite',
    titre: 'Description du produit fini documentée',
    desc: 'Pour chaque ligne de production : composition, caractéristiques physico-chimiques (pH, aw, humidité), durée de vie, conditions de conservation, mode d\'emploi, public cible.',
    crit: 'majeure',
    preuve: 'Fiches produit signées par responsable qualité.',
    ref: 'Codex CXC 1-1969 Rév. 2020, Annexe HACCP §2',
    auto: 0, regle: null,
  },
  {
    code: 'HACCP-P1-03',
    cat: 'qualite_securite',
    titre: 'Diagramme de fabrication validé sur terrain',
    desc: 'Diagramme de chaque processus (séchage vanille, fermentation cacao, torréfaction café, conditionnement) validé par observation terrain. Daté et signé.',
    crit: 'majeure',
    preuve: 'Diagrammes daté/signé + compte-rendu de validation terrain.',
    ref: 'Codex CXC 1-1969 Rév. 2020, Annexe HACCP §3',
    auto: 0, regle: null,
  },
  {
    code: 'HACCP-P1-04',
    cat: 'qualite_securite',
    titre: 'Analyse exhaustive des dangers (4 catégories)',
    desc: 'Pour chaque étape, identification systématique des dangers : biologiques (Salmonella, aflatoxines, ochratoxine A, moisissures), chimiques (résidus pesticides, métaux lourds, allergènes), physiques (cailloux, métal, verre, insectes), allergéniques.',
    crit: 'majeure',
    preuve: 'Tableau d\'analyse des dangers exhaustif par étape de chaque processus.',
    ref: 'Codex CXC 1-1969 Rév. 2020, Principe 1',
    auto: 0, regle: null,
  },
  {
    code: 'HACCP-P1-05',
    cat: 'qualite_securite',
    titre: 'Évaluation gravité × probabilité par danger',
    desc: 'Chaque danger évalué selon matrice 3×3 ou 5×5 (gravité × probabilité). Mesures préventives associées documentées.',
    crit: 'majeure',
    preuve: 'Matrice de criticité + justification scoring.',
    ref: 'Codex CXC 1-1969 Rév. 2020, Principe 1 + ISO 22000 §8.5',
    auto: 0, regle: null,
  },
  {
    code: 'HACCP-P1-06',
    cat: 'qualite_securite',
    titre: 'Mise à jour annuelle de l\'analyse des dangers',
    desc: 'L\'analyse des dangers est révisée annuellement et à chaque modification significative (nouveau produit, équipement, fournisseur, réglementation).',
    crit: 'mineure',
    preuve: 'Registre des révisions HACCP avec dates.',
    ref: 'Codex CXC 1-1969 Rév. 2020, Annexe HACCP §11',
    auto: 0, regle: null,
  },

  // ════════════════════════════════════════════════════════════
  // PRINCIPE 2 — IDENTIFICATION DES CCP (4 exigences)
  // ════════════════════════════════════════════════════════════
  {
    code: 'HACCP-P2-01',
    cat: 'qualite_securite',
    titre: 'CCP identifiés via arbre de décision Codex',
    desc: 'Application de l\'arbre de décision Codex (4 questions) pour identifier les CCP réels et distinguer des PRP-O (programmes pré-requis opérationnels).',
    crit: 'majeure',
    preuve: 'Tableau d\'identification CCP avec arbre de décision appliqué étape par étape.',
    ref: 'Codex CXC 1-1969 Rév. 2020, Principe 2',
    auto: 0, regle: null,
  },
  {
    code: 'HACCP-P2-02',
    cat: 'qualite_securite',
    titre: 'CCP séchage : humidité finale < seuil culture',
    desc: 'Séchage vanille : humidité finale ≤ 25%. Séchage gingembre : ≤ 12%. Séchage girofle : ≤ 12%. Séchage poivre : ≤ 12%. Mesure systématique en fin de séchage.',
    crit: 'majeure',
    preuve: 'Étape "séchage" enregistrée dans ExportTrack avec analyse humidité finale conforme aux seuils par culture.',
    ref: 'Codex CXC 1-1969 + Codex épices CXC 88-2024',
    auto: 1, regle: 'ANALYSE_NON_CONFORME',
  },
  {
    code: 'HACCP-P2-03',
    cat: 'qualite_securite',
    titre: 'CCP fermentation cacao : durée + température centrale',
    desc: 'Fermentation cacao : durée 5-7 jours, T° centrale du tas/caisse 45-50°C atteinte au pic, retournements documentés.',
    crit: 'majeure',
    preuve: 'Registre de fermentation avec relevés T° quotidiens et retournements.',
    ref: 'Codex CXC 86-2014 cacao + ICCO Quality Standards',
    auto: 0, regle: null,
  },
  {
    code: 'HACCP-P2-04',
    cat: 'qualite_securite',
    titre: 'CCP détection métaux au conditionnement',
    desc: 'Si conditionnement final destiné consommation directe : passage sous détecteur de métaux ou aimant. Aucun fragment > 2mm Fe / 3mm non-Fe.',
    crit: 'mineure',
    preuve: 'Présence détecteur sur ligne + registre de calibration + registre rejets.',
    ref: 'Codex CXC 1-1969 Rév. 2020, Principe 2 + ISO 22000',
    auto: 0, regle: null,
  },

  // ════════════════════════════════════════════════════════════
  // PRINCIPE 3 — LIMITES CRITIQUES (5 exigences)
  // ════════════════════════════════════════════════════════════
  {
    code: 'HACCP-P3-01',
    cat: 'qualite_securite',
    titre: 'Limites critiques chiffrées par CCP',
    desc: 'Pour chaque CCP, limites critiques définies en termes mesurables (T°, durée, humidité, pH, aw). Pas de termes vagues type « bien sec » ou « assez chaud ».',
    crit: 'majeure',
    preuve: 'Plan HACCP avec limites critiques chiffrées et justifiées.',
    ref: 'Codex CXC 1-1969 Rév. 2020, Principe 3',
    auto: 0, regle: null,
  },
  {
    code: 'HACCP-P3-02',
    cat: 'qualite_securite',
    titre: 'Justification scientifique des limites critiques',
    desc: 'Chaque limite critique doit être justifiée : référence réglementaire (LMR Codex), littérature scientifique, ou validation interne par tests microbio.',
    crit: 'majeure',
    preuve: 'Justification écrite par CCP citant la source.',
    ref: 'Codex CXC 1-1969 Rév. 2020 + ISO 22000 §8.5.4',
    auto: 0, regle: null,
  },
  {
    code: 'HACCP-P3-03',
    cat: 'qualite_securite',
    titre: 'Limites critiques contaminants conformes UE 2023/915',
    desc: 'Aflatoxines (B1 ≤ 5 µg/kg, total ≤ 10 µg/kg pour épices), OTA (15 µg/kg café, 15 µg/kg épices), métaux lourds (Pb ≤ 2 mg/kg, Cd ≤ 0,8 mg/kg cacao). Conformes Règlement (UE) 2023/915.',
    crit: 'majeure',
    preuve: 'Plan HACCP référencant les LMR UE applicables.',
    ref: 'Règlement (UE) 2023/915 contaminants',
    auto: 1, regle: 'ANALYSE_NON_CONFORME',
  },
  {
    code: 'HACCP-P3-04',
    cat: 'qualite_securite',
    titre: 'Limites opérationnelles plus strictes que limites critiques',
    desc: 'Définition de limites opérationnelles internes (ex. T° séchage 55°C cible vs 60°C limite critique) pour anticiper les dérives avant dépassement réglementaire.',
    crit: 'mineure',
    preuve: 'Plan HACCP mentionnant limites opérationnelles + limites critiques.',
    ref: 'ISO 22000:2018 §8.5.4',
    auto: 0, regle: null,
  },
  {
    code: 'HACCP-P3-05',
    cat: 'qualite_securite',
    titre: 'Validation initiale des limites critiques',
    desc: 'Avant production commerciale, validation des limites critiques par essais (test microbio sur lot pilote, mesures multiples, validation par expert externe).',
    crit: 'majeure',
    preuve: 'Rapport de validation initiale signé par responsable qualité.',
    ref: 'ISO 22000:2018 §8.5.3',
    auto: 0, regle: null,
  },

  // ════════════════════════════════════════════════════════════
  // PRINCIPE 4 — SURVEILLANCE (6 exigences)
  // ════════════════════════════════════════════════════════════
  {
    code: 'HACCP-P4-01',
    cat: 'qualite_securite',
    titre: 'Plan de surveillance défini par CCP',
    desc: 'Pour chaque CCP : qui surveille, quoi (paramètre), comment (méthode), quand (fréquence), où (point de mesure). Plan signé par responsable qualité.',
    crit: 'majeure',
    preuve: 'Plan de surveillance HACCP exhaustif.',
    ref: 'Codex CXC 1-1969 Rév. 2020, Principe 4',
    auto: 0, regle: null,
  },
  {
    code: 'HACCP-P4-02',
    cat: 'qualite_securite',
    titre: 'Relevés CCP horodatés en continu ou fréquence définie',
    desc: 'Relevés à fréquence adaptée au risque : continu (sondes connectées), horaire, par lot, journalier. Horodatage systématique. Initiales opérateur.',
    crit: 'majeure',
    preuve: 'Registres de surveillance CCP avec dates, heures, valeurs, signatures.',
    ref: 'Codex CXC 1-1969 Rév. 2020, Principe 4',
    auto: 0, regle: null,
  },
  {
    code: 'HACCP-P4-03',
    cat: 'qualite_securite',
    titre: 'Équipements de mesure calibrés et étalonnés',
    desc: 'Thermomètres, hygromètres, balances, pH-mètres calibrés annuellement par organisme accrédité ou via étalon interne traçable. Certificat conservé.',
    crit: 'majeure',
    preuve: 'Certificats d\'étalonnage < 12 mois pour chaque équipement de mesure.',
    ref: 'ISO 22000:2018 §8.5.4 + bonnes pratiques métrologie',
    auto: 0, regle: null,
  },
  {
    code: 'HACCP-P4-04',
    cat: 'qualite_securite',
    titre: 'Opérateurs surveillance formés à la méthode',
    desc: 'Personnel chargé des relevés CCP formé spécifiquement : usage des instruments, lecture des valeurs, comportement en cas d\'écart.',
    crit: 'majeure',
    preuve: 'Attestations de formation + procédures d\'usage instruments.',
    ref: 'Codex CXC 1-1969 Rév. 2020, Principe 4 + Annexe Hygiène §10',
    auto: 0, regle: null,
  },
  {
    code: 'HACCP-P4-05',
    cat: 'qualite_securite',
    titre: 'Conservation registres CCP minimum 5 ans',
    desc: 'Tous les registres de surveillance CCP archivés 5 ans minimum. Possibilité numérique (avec backup) ou papier (local sécurisé).',
    crit: 'mineure',
    preuve: 'Politique d\'archivage + démonstration accès registres anciens.',
    ref: 'Codex CXC 1-1969 Rév. 2020, Principe 7',
    auto: 0, regle: null,
  },
  {
    code: 'HACCP-P4-06',
    cat: 'qualite_securite',
    titre: 'Alertes automatiques en cas de dépassement',
    desc: 'Si système numérique : alertes immédiates (visuelles, sonores, push notification) au dépassement d\'une limite critique. Cohérent avec moteur AgriSuite.',
    crit: 'mineure',
    preuve: 'Démonstration alertes activées + registre des alertes déclenchées.',
    ref: 'ISO 22000:2018 §8.9',
    auto: 0, regle: null,
  },

  // ════════════════════════════════════════════════════════════
  // PRINCIPE 5 — ACTIONS CORRECTIVES (5 exigences)
  // ════════════════════════════════════════════════════════════
  {
    code: 'HACCP-P5-01',
    cat: 'qualite_securite',
    titre: 'Procédure d\'action corrective par CCP',
    desc: 'Pour chaque CCP, procédure écrite décrivant : actions immédiates en cas de dépassement, traitement du produit non-conforme (isolation, retraitement, destruction), enquête sur la cause, correction préventive.',
    crit: 'majeure',
    preuve: 'Plan d\'actions correctives par CCP.',
    ref: 'Codex CXC 1-1969 Rév. 2020, Principe 5',
    auto: 0, regle: null,
  },
  {
    code: 'HACCP-P5-02',
    cat: 'qualite_securite',
    titre: 'Isolement immédiat des produits non-conformes',
    desc: 'Tout produit issu d\'un CCP en non-conformité est immédiatement isolé physiquement (zone de quarantaine identifiée), tracé jusqu\'à décision finale.',
    crit: 'majeure',
    preuve: 'Zone quarantaine identifiée + registre des isolements.',
    ref: 'Codex CXC 1-1969 Rév. 2020, Principe 5',
    auto: 0, regle: null,
  },
  {
    code: 'HACCP-P5-03',
    cat: 'qualite_securite',
    titre: 'Décision documentée sur produit non-conforme',
    desc: 'Pour chaque non-conformité : décision datée et signée par responsable qualité (retraitement validé, déclassement, destruction). Pas de remise en circuit sans validation.',
    crit: 'majeure',
    preuve: 'Registre des décisions sur non-conformités.',
    ref: 'Codex CXC 1-1969 Rév. 2020, Principe 5 + ISO 22000 §8.9',
    auto: 0, regle: null,
  },
  {
    code: 'HACCP-P5-04',
    cat: 'qualite_securite',
    titre: 'Analyse de cause racine (5 pourquoi, Ishikawa)',
    desc: 'Pour chaque non-conformité majeure, analyse de cause racine documentée (méthode 5 pourquoi, diagramme Ishikawa). Permet d\'éviter récurrence.',
    crit: 'mineure',
    preuve: 'Rapports d\'analyse de cause par incident.',
    ref: 'ISO 22000:2018 §10.2',
    auto: 0, regle: null,
  },
  {
    code: 'HACCP-P5-05',
    cat: 'qualite_securite',
    titre: 'Suivi de l\'efficacité des actions correctives',
    desc: 'Vérification après mise en œuvre : la cause a-t-elle disparu ? Récurrence éventuelle suivie. Validation finale par responsable qualité.',
    crit: 'mineure',
    preuve: 'Registre des NC avec champ "vérification efficacité" renseigné.',
    ref: 'ISO 22000:2018 §10.2',
    auto: 0, regle: null,
  },

  // ════════════════════════════════════════════════════════════
  // PRINCIPE 6 — VÉRIFICATION (5 exigences)
  // ════════════════════════════════════════════════════════════
  {
    code: 'HACCP-P6-01',
    cat: 'qualite_securite',
    titre: 'Audit interne HACCP annuel',
    desc: 'Audit interne complet du système HACCP au moins une fois par an, par auditeur qualifié interne ou consultant externe. Rapport écrit avec écarts et plan d\'actions.',
    crit: 'majeure',
    preuve: 'Rapport d\'audit interne HACCP < 12 mois.',
    ref: 'Codex CXC 1-1969 Rév. 2020, Principe 6 + ISO 19011',
    auto: 0, regle: null,
  },
  {
    code: 'HACCP-P6-02',
    cat: 'qualite_securite',
    titre: 'Test de traçabilité (rappel produit) annuel',
    desc: 'Simulation annuelle d\'un rappel produit : choisir un lot, retracer toute sa chaîne en < 4h, identifier tous les clients concernés. Rapport documenté.',
    crit: 'majeure',
    preuve: 'Rapport de test de rappel annuel signé.',
    ref: 'Codex CXC 1-1969 Rév. 2020, Annexe Hygiène §13',
    auto: 0, regle: null,
  },
  {
    code: 'HACCP-P6-03',
    cat: 'qualite_securite',
    titre: 'Analyses de vérification produit fini',
    desc: 'Plan d\'analyses de vérification (microbio, contaminants) sur produit fini selon plan d\'échantillonnage défini. Cohérence avec CCP.',
    crit: 'majeure',
    preuve: 'Plan d\'analyses + bulletins de laboratoire.',
    ref: 'Codex CXC 1-1969 Rév. 2020, Principe 6',
    auto: 0, regle: null,
  },
  {
    code: 'HACCP-P6-04',
    cat: 'qualite_securite',
    titre: 'Revue de direction HACCP annuelle',
    desc: 'Réunion annuelle de revue par direction : analyse des KPI (nombre NC, alertes, retours clients), décisions stratégiques, allocation ressources. PV signé.',
    crit: 'mineure',
    preuve: 'PV de revue de direction annuelle signé.',
    ref: 'ISO 22000:2018 §9.3',
    auto: 0, regle: null,
  },
  {
    code: 'HACCP-P6-05',
    cat: 'qualite_securite',
    titre: 'Validation des changements significatifs',
    desc: 'Tout changement significatif (nouveau produit, équipement, fournisseur, procédé) déclenche révision HACCP : nouvelle analyse, validation, formation.',
    crit: 'majeure',
    preuve: 'Registre des changements + études d\'impact HACCP.',
    ref: 'ISO 22000:2018 §6.3',
    auto: 0, regle: null,
  },

  // ════════════════════════════════════════════════════════════
  // PRINCIPE 7 — DOCUMENTATION (4 exigences supplémentaires hors démo)
  // ════════════════════════════════════════════════════════════
  {
    code: 'HACCP-P7-01',
    cat: 'documentation',
    titre: 'Manuel HACCP complet et à jour',
    desc: 'Manuel HACCP regroupant : politique sécurité alim, équipe, descriptions produits, diagrammes, analyses dangers, plan HACCP, procédures, registres modèles. Version contrôlée.',
    crit: 'majeure',
    preuve: 'Manuel HACCP daté, indice de version, signé direction.',
    ref: 'Codex CXC 1-1969 Rév. 2020, Principe 7',
    auto: 0, regle: null,
  },
  {
    code: 'HACCP-P7-02',
    cat: 'documentation',
    titre: 'Procédures opératoires standards (SOP) écrites',
    desc: 'SOP pour chaque opération critique : nettoyage, surveillance CCP, étalonnage, gestion non-conformité, formation, traçabilité. Accessibles au personnel.',
    crit: 'majeure',
    preuve: 'Bibliothèque SOP versionnée + signature de prise de connaissance par opérateurs.',
    ref: 'Codex CXC 1-1969 Rév. 2020, Principe 7',
    auto: 0, regle: null,
  },
  {
    code: 'HACCP-P7-03',
    cat: 'documentation',
    titre: 'Registres opérationnels accessibles aux auditeurs',
    desc: 'Tous les registres (CCP, nettoyage, formation, NC, calibration) facilement accessibles lors d\'audit. Stockage organisé chronologiquement ou par catégorie.',
    crit: 'mineure',
    preuve: 'Démonstration accès rapide aux registres lors d\'inspection.',
    ref: 'Codex CXC 1-1969 Rév. 2020, Principe 7',
    auto: 0, regle: null,
  },
  {
    code: 'HACCP-P7-04',
    cat: 'documentation',
    titre: 'Toutes exigences majeures justifiées par preuve',
    desc: 'Pour chaque exigence majeure HACCP, au moins une preuve enregistrée dans CertifTrack (analyse, registre, attestation, photo).',
    crit: 'majeure',
    preuve: 'Vérification automatique par moteur de conformité.',
    ref: 'Codex CXC 1-1969 Rév. 2020 + bonnes pratiques audit',
    auto: 1, regle: 'PREUVE_MANQUANTE_MAJEURE',
  },

  // ════════════════════════════════════════════════════════════
  // PRP 1 — HYGIÈNE PERSONNEL (3 exigences hors démo HACCP-FORM-01)
  // ════════════════════════════════════════════════════════════
  {
    code: 'HACCP-PRP1-01',
    cat: 'social_travail',
    titre: 'Visite médicale d\'embauche et annuelle',
    desc: 'Tout opérateur en contact avec produits passe une visite médicale à l\'embauche puis annuellement. Aptitude à manipuler des denrées alimentaires confirmée par médecin.',
    crit: 'majeure',
    preuve: 'Certificats médicaux d\'aptitude < 12 mois pour chaque opérateur.',
    ref: 'Codex CXC 1-1969 Rév. 2020, Annexe Hygiène §10.1',
    auto: 0, regle: null,
  },
  {
    code: 'HACCP-PRP1-02',
    cat: 'social_travail',
    titre: 'Tenue de travail propre dédiée',
    desc: 'Tenue dédiée fournie par employeur (blouse, charlotte, chaussures, gants jetables si nécessaire). Vestiaire séparé du local de production. Lavage régulier.',
    crit: 'majeure',
    preuve: 'Photos vestiaire + opérateurs équipés + plan de lavage.',
    ref: 'Codex CXC 1-1969 Rév. 2020, Annexe Hygiène §10.3',
    auto: 0, regle: null,
  },
  {
    code: 'HACCP-PRP1-03',
    cat: 'social_travail',
    titre: 'Procédure exclusion travailleur malade',
    desc: 'Procédure écrite : tout travailleur souffrant d\'infection (gastro, plaie infectée, fièvre) ne peut intervenir sur produits. Déclaration obligatoire. Reprise sur certif médical.',
    crit: 'majeure',
    preuve: 'Procédure écrite affichée + registre des exclusions.',
    ref: 'Codex CXC 1-1969 Rév. 2020, Annexe Hygiène §10.2',
    auto: 0, regle: null,
  },

  // ════════════════════════════════════════════════════════════
  // PRP 2 — NETTOYAGE & DÉSINFECTION (3 exigences)
  // ════════════════════════════════════════════════════════════
  {
    code: 'HACCP-PRP2-01',
    cat: 'gestion_post_recolte',
    titre: 'Plan de nettoyage et désinfection écrit',
    desc: 'Plan exhaustif : zones, équipements, fréquences, produits utilisés, dosages, opérateur responsable, méthode. Affichage dans zones concernées.',
    crit: 'majeure',
    preuve: 'Document plan N&D affiché + suivi de mise en œuvre.',
    ref: 'Codex CXC 1-1969 Rév. 2020, Annexe Hygiène §6 + ISO 22002-1 §11',
    auto: 0, regle: null,
  },
  {
    code: 'HACCP-PRP2-02',
    cat: 'gestion_post_recolte',
    titre: 'Registre des nettoyages effectués',
    desc: 'Pour chaque opération de nettoyage : date, zone, opérateur, produit utilisé, signature. Vérification visuelle de propreté avant reprise activité.',
    crit: 'majeure',
    preuve: 'Registre de nettoyage affiché + tenu à jour quotidiennement.',
    ref: 'Codex CXC 1-1969 Rév. 2020, Annexe Hygiène §6',
    auto: 0, regle: null,
  },
  {
    code: 'HACCP-PRP2-03',
    cat: 'gestion_post_recolte',
    titre: 'Tests de surface microbiologiques périodiques',
    desc: 'Vérification efficacité nettoyage par tests de surface (écouvillons, lames boîtes Petri) sur points critiques, fréquence selon risque (mensuel à trimestriel).',
    crit: 'mineure',
    preuve: 'Bulletins d\'analyse surface < 3 mois.',
    ref: 'ISO 22002-1:2009 §11 + ISO 22000',
    auto: 0, regle: null,
  },

  // ════════════════════════════════════════════════════════════
  // PRP 3 — LUTTE NUISIBLES (3 exigences)
  // ════════════════════════════════════════════════════════════
  {
    code: 'HACCP-PRP3-01',
    cat: 'gestion_post_recolte',
    titre: 'Plan de lutte intégrée contre nuisibles',
    desc: 'Plan documenté avec : cartographie des points pièges, types de pièges (rongeurs, insectes), produits utilisés (autorisés contact alim), fréquence inspection.',
    crit: 'majeure',
    preuve: 'Document plan + carte d\'implantation des pièges.',
    ref: 'Codex CXC 1-1969 Rév. 2020, Annexe Hygiène §6.3 + ISO 22002-1 §12',
    auto: 0, regle: null,
  },
  {
    code: 'HACCP-PRP3-02',
    cat: 'gestion_post_recolte',
    titre: 'Inspection mensuelle des pièges et registre',
    desc: 'Inspection mensuelle minimum des pièges avec registre : date, piège, capture éventuelle (nombre, espèce), action corrective. Confiée à prestataire ou interne formé.',
    crit: 'majeure',
    preuve: 'Registre d\'inspection pièges < 1 mois.',
    ref: 'ISO 22002-1:2009 §12',
    auto: 0, regle: null,
  },
  {
    code: 'HACCP-PRP3-03',
    cat: 'gestion_post_recolte',
    titre: 'Mesures préventives anti-nuisibles bâtiment',
    desc: 'Bâtiments protégés : moustiquaires aux ouvrants, joints sous portes, absence de nourriture accessible, gestion déchets fermée, zones humides asséchées.',
    crit: 'mineure',
    preuve: 'Photos installations + checklist préventive.',
    ref: 'Codex CXC 1-1969 Rév. 2020, Annexe Hygiène §4',
    auto: 0, regle: null,
  },

  // ════════════════════════════════════════════════════════════
  // PRP 4 — MAINTENANCE & ÉQUIPEMENTS (3 exigences)
  // ════════════════════════════════════════════════════════════
  {
    code: 'HACCP-PRP4-01',
    cat: 'gestion_post_recolte',
    titre: 'Plan de maintenance préventive équipements',
    desc: 'Plan annuel de maintenance préventive des équipements critiques (séchoirs, balances, détecteurs métaux, chaîne froid si applicable). Prestataire ou interne.',
    crit: 'mineure',
    preuve: 'Plan + registre interventions.',
    ref: 'ISO 22002-1:2009 §10',
    auto: 0, regle: null,
  },
  {
    code: 'HACCP-PRP4-02',
    cat: 'gestion_post_recolte',
    titre: 'Lubrifiants compatibles contact alimentaire',
    desc: 'Sur équipements en contact avec produits : lubrifiants de qualité alimentaire (norme NSF H1 ou équivalent). Stockage séparé des lubrifiants techniques.',
    crit: 'majeure',
    preuve: 'Fiches techniques lubrifiants + photos stockage.',
    ref: 'ISO 22002-1:2009 §10.4',
    auto: 0, regle: null,
  },
  {
    code: 'HACCP-PRP4-03',
    cat: 'gestion_post_recolte',
    titre: 'Vérification après maintenance avant redémarrage',
    desc: 'Après toute intervention de maintenance, vérification visuelle (pas d\'outil oublié, pas de fuite) + nettoyage avant redémarrage production.',
    crit: 'mineure',
    preuve: 'Procédure écrite + checklist redémarrage.',
    ref: 'ISO 22002-1:2009 §10',
    auto: 0, regle: null,
  },

  // ════════════════════════════════════════════════════════════
  // PRP 5 — EAU ET GLACE (2 exigences)
  // ════════════════════════════════════════════════════════════
  {
    code: 'HACCP-PRP5-01',
    cat: 'gestion_post_recolte',
    titre: 'Eau de process potable, analyses périodiques',
    desc: 'Eau utilisée en process (lavage, scaldage vanille) répondant aux critères eau potable (Directive UE 2020/2184 ou OMS). Analyses bactériologiques semestrielles minimum.',
    crit: 'majeure',
    preuve: 'Bulletins d\'analyse eau < 6 mois (E. coli, coliformes totaux).',
    ref: 'Codex CXC 1-1969 Rév. 2020, Annexe Hygiène §7 + Directive UE 2020/2184',
    auto: 0, regle: null,
  },
  {
    code: 'HACCP-PRP5-02',
    cat: 'gestion_post_recolte',
    titre: 'Distinction eau process / eau non potable',
    desc: 'Si réseau d\'eau non potable existe (incendie, irrigation) : tuyauteries identifiées par couleur, pas d\'interconnexion possible avec eau process.',
    crit: 'majeure',
    preuve: 'Plan des réseaux + photos identifications couleurs.',
    ref: 'ISO 22002-1:2009 §6',
    auto: 0, regle: null,
  },

  // ════════════════════════════════════════════════════════════
  // PRP 6 — GESTION DÉCHETS (1 exigence)
  // ════════════════════════════════════════════════════════════
  {
    code: 'HACCP-PRP6-01',
    cat: 'environnement',
    titre: 'Évacuation déchets sécurisée et tracée',
    desc: 'Bennes/containers étanches identifiés, sortis quotidiennement de la zone de production. Pas de stagnation. Évacuation par filière contrôlée.',
    crit: 'mineure',
    preuve: 'Photos zones déchets + contrats avec collecteur si externalisé.',
    ref: 'ISO 22002-1:2009 §13',
    auto: 0, regle: null,
  },

  // ════════════════════════════════════════════════════════════
  // PRP 7 — GESTION FOURNISSEURS (3 exigences)
  // ════════════════════════════════════════════════════════════
  {
    code: 'HACCP-PRP7-01',
    cat: 'tracabilite',
    titre: 'Évaluation et qualification fournisseurs',
    desc: 'Procédure d\'évaluation des fournisseurs (matières premières, emballages, intrants) : questionnaire, audit éventuel, fiche fournisseur conservée.',
    crit: 'majeure',
    preuve: 'Liste fournisseurs qualifiés + dossiers d\'évaluation.',
    ref: 'ISO 22000:2018 §7.1.6 + ISO 22002-1 §9',
    auto: 0, regle: null,
  },
  {
    code: 'HACCP-PRP7-02',
    cat: 'tracabilite',
    titre: 'Cahier des charges écrit avec fournisseurs',
    desc: 'Pour chaque fournisseur clé, cahier des charges signé : spécifications matière, conditions de livraison, modalités contrôle réception, gestion non-conformité.',
    crit: 'mineure',
    preuve: 'Cahiers des charges signés.',
    ref: 'ISO 22002-1:2009 §9',
    auto: 0, regle: null,
  },
  {
    code: 'HACCP-PRP7-03',
    cat: 'tracabilite',
    titre: 'Contrôle réception matières premières',
    desc: 'Plan de contrôle à réception : conformité bon de livraison, inspection visuelle, échantillonnage analyse selon risque. Acceptation/refus tracé.',
    crit: 'majeure',
    preuve: 'Registre réception avec contrôles effectués.',
    ref: 'ISO 22002-1:2009 §9',
    auto: 0, regle: null,
  },

  // ════════════════════════════════════════════════════════════
  // PRP 8 — RAPPEL PRODUIT (2 exigences)
  // ════════════════════════════════════════════════════════════
  {
    code: 'HACCP-PRP8-01',
    cat: 'tracabilite',
    titre: 'Procédure de rappel produit documentée',
    desc: 'Procédure écrite définissant : critères de déclenchement, équipe de gestion, communication clients, autorités compétentes, devenir des produits rappelés.',
    crit: 'majeure',
    preuve: 'Procédure rappel produit + organigramme cellule de crise.',
    ref: 'Codex CXC 1-1969 Rév. 2020, Annexe Hygiène §13 + ISO 22000 §8.9.5',
    auto: 0, regle: null,
  },
  {
    code: 'HACCP-PRP8-02',
    cat: 'tracabilite',
    titre: 'Coordonnées autorités compétentes à jour',
    desc: 'Coordonnées des autorités à contacter en cas de rappel (DGI Madagascar, autorité phytosanitaire export, organisme certificateur, importateur principal) maintenues à jour.',
    crit: 'mineure',
    preuve: 'Liste de contacts < 12 mois.',
    ref: 'Codex CXC 1-1969 Rév. 2020, Annexe Hygiène §13',
    auto: 0, regle: null,
  },
];

// ============================================================
// SEED IDEMPOTENT
// ============================================================

export const seedCertifTrackHaccp = () => {
  const ref = db.getFirstSync(
    'SELECT id FROM referentiels WHERE code = ?',
    [REF_CODE]
  );
  if (!ref) {
    console.log(`⚠ Référentiel ${REF_CODE} introuvable, seed HACCP annulé`);
    return;
  }

  const existingCount = db.getFirstSync(
    'SELECT COUNT(*) as nb FROM exigences_referentiel WHERE referentiel_id = ?',
    [ref.id]
  );

  // Cible : 3 démo + 47 = 50
  if (existingCount.nb >= 50) {
    console.log(`✅ Seed HACCP déjà complet (${existingCount.nb} exigences)`);
    return;
  }

  console.log(`🌱 Seed HACCP Session 8b — ${EXIGENCES_HACCP.length} exigences à insérer...`);

  let insere = 0;
  let skip = 0;
  let ordre = 100;

  EXIGENCES_HACCP.forEach((ex) => {
    const existing = db.getFirstSync(
      'SELECT id FROM exigences_referentiel WHERE referentiel_id = ? AND code_exigence = ?',
      [ref.id, ex.code]
    );
    if (existing) { skip++; return; }

    db.runSync(
      `INSERT INTO exigences_referentiel (
        referentiel_id, code_exigence, categorie, titre, description,
        criticite, preuve_attendue, reference_officielle,
        auto_verifiable, regle_auto_code, ordre
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ref.id, ex.code, ex.cat, ex.titre, ex.desc,
        ex.crit, ex.preuve, ex.ref,
        ex.auto || 0, ex.regle || null, ordre++,
      ]
    );
    insere++;
  });

  if (skip > 0) console.log(`  ↪ ${skip} exigences déjà présentes`);
  const final = db.getFirstSync(
    'SELECT COUNT(*) as nb FROM exigences_referentiel WHERE referentiel_id = ?',
    [ref.id]
  );
  console.log(`✅ Seed HACCP complet : ${final.nb} exigences en base (${insere} nouvelles)`);
};