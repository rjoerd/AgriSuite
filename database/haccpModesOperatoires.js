// database/haccpModesOperatoires.js
// Phase 3 Session 10a-bis2 — Modes opératoires détaillés des CCP
//
// Pour chaque CCP des 9 études HACCP, on enrichit avec 5 champs :
//   - procedure_mesure        : pas à pas opérationnel
//   - plan_echantillonnage    : fréquence + volume + emplacements
//   - calibration_equipement  : périodicité + méthode
//   - formation_requise       : compétences opérateur
//   - document_enregistrement : nom du formulaire à remplir
//
// Identification du CCP cible : (produit_code, numero)
// Sources : Codex CXC 1-1969 §5.2, ISO 22000:2018, Bureau Veritas/SGS standards.

import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('certifpilot.db');

// ============================================================
// CATALOGUE DES MODES OPÉRATOIRES PAR CCP
// ============================================================

const MODES_OPERATOIRES = [

  // ════════════════════════════════════════════════════════════
  // VANILLE — CCP1 Séchage contrôlé gousses
  // ════════════════════════════════════════════════════════════
  {
    produit_code: 'vanille',
    numero: 'CCP1',
    procedure_mesure: `1. Étalonner hygromètre Aw avec sel saturé (NaCl 75% HR ou MgCl2 33% HR) avant chaque campagne.
2. Prélever 5 gousses par lot, réparties (haut/milieu/bas du sac).
3. Couper transversalement chaque gousse en 3 morceaux.
4. Placer échantillon dans cellule hygromètre, attendre stabilisation 3-5 min.
5. Lire valeur Aw stabilisée à ±0,01.
6. Si Aw > 0,70 : reprendre étuvage. Cible Aw ≈ 0,65-0,70.
7. Mesurer humidité résiduelle (méthode gravimétrique) sur échantillon distinct si doute.`,
    plan_echantillonnage: `1 prélèvement de 5 gousses par lot de 10 kg. Minimum 3 prélèvements par lot quelle que soit la quantité. Échantillons issus de positions différentes (haut/milieu/bas du conditionnement de séchage).`,
    calibration_equipement: `Hygromètre Aw : étalonnage hebdomadaire avec sels saturés certifiés (NaCl 75,3% HR à 25°C / MgCl2 32,8% HR). Thermomètre étuves : étalonnage trimestriel comparaison glace fondante (0°C) + eau bouillante (100°C). Conservation certificats étalonnage 5 ans minimum.`,
    formation_requise: `Responsable séchoir : formation initiale 4h (théorie + pratique), recyclage annuel obligatoire. Manipulation hygromètre Aw : démonstration pratique + 3 mesures supervisées avant autonomie. Tenue cahier séchage : formation interne 1h.`,
    document_enregistrement: `Fiche F-HACCP-VAN-01 "Suivi séchage vanille" (1 fiche par lot, conservée 5 ans). Champs obligatoires : n° lot, date, heure, T°, HR ambiante, Aw mesurée, opérateur, signature responsable.`,
  },

  // ════════════════════════════════════════════════════════════
  // GIROFLE — CCP1 Séchage rapide
  // ════════════════════════════════════════════════════════════
  {
    produit_code: 'girofle',
    numero: 'CCP1',
    procedure_mesure: `1. Étalonner hygromètre digital avec étalon NaCl saturé (75% HR à 25°C).
2. Prélever 200 g de clous secs à 3 endroits du lot (surface + cœur).
3. Insérer sonde au cœur de l'échantillon, attendre 3 min stabilisation.
4. Lire humidité en % MS (matière sèche).
5. Refaire 2 fois et calculer moyenne. Écart entre mesures > 1% : refaire prélèvement.
6. Si moyenne > 12% : isoler lot, prolonger séchage 24h, retester.`,
    plan_echantillonnage: `1 prélèvement de 200g pour 100 kg de lot, minimum 3 prélèvements (zones top/milieu/bas). Pour lots > 500 kg : 1 prélèvement par 100 kg supplémentaires.`,
    calibration_equipement: `Hygromètre épices : étalonnage mensuel avec sel saturé NaCl + référence ISO 6571 pour épices. Vérification quotidienne avant 1ère mesure (test ambiant). Si dérive > 0,5%, réétalonner.`,
    formation_requise: `Responsable séchage : formation théorique aflatoxines (2h) + pratique mesure humidité (2h) + recyclage annuel. Opérateur séchage : sensibilisation aux risques aflatoxines (1h) + bonnes pratiques retournement.`,
    document_enregistrement: `Fiche F-HACCP-GIR-01 "Suivi séchage girofle" + Fiche F-HACCP-GIR-02 "Analyses aflatoxines" (1 par lot). Conservation 5 ans minimum (exigence UE BIO).`,
  },

  // ════════════════════════════════════════════════════════════
  // GIROFLE — CCP2 Analyse aflatoxines
  // ════════════════════════════════════════════════════════════
  {
    produit_code: 'girofle',
    numero: 'CCP2',
    procedure_mesure: `1. Constituer échantillon représentatif : 1 kg de clous prélevés sur l'ensemble du lot selon norme ISO 24333 (mycotoxines).
2. Homogénéiser : broyer finement (< 1 mm).
3. Diviser en 3 sous-échantillons de 300g (analyse + contre-analyse + archivage 6 mois).
4. Envoyer 1 sous-échantillon à laboratoire accrédité ISO 17025 (Cofrac ou équivalent international).
5. Demander dosage Aflatoxines B1, B2, G1, G2 par HPLC-FLD.
6. Bloquer le lot en stock isolé "Q-EN-ATTENTE" jusqu'à réception bulletin.
7. Si B1 > 5 µg/kg OU totales > 10 µg/kg : lot bloqué définitivement.`,
    plan_echantillonnage: `Échantillonnage selon Règlement UE 401/2006 - mycotoxines : 1 prélèvement de 100 incréments minimum pour lots ≤ 50 tonnes (méthode aléatoire stratifiée). Échantillon agrégé ≥ 30 kg réduit à 1 kg laboratoire.`,
    calibration_equipement: `Aucun équipement à étalonner en interne (analyses externalisées labo accrédité). Vérifier annuellement validité accréditation laboratoire prestataire (Cofrac, ISO 17025) et portée d'accréditation incluant "aflatoxines dans épices".`,
    formation_requise: `Responsable qualité : formation échantillonnage mycotoxines (8h externe accréditée), recyclage tous les 3 ans. Connaissance approfondie Règlement UE 1881/2006 et 401/2006.`,
    document_enregistrement: `Fiche F-HACCP-GIR-02 + bulletin d'analyse original du laboratoire (à conserver 5 ans). Chaîne de traçabilité échantillon : F-TRAC-ECH-01 (date prélèvement, opérateur, conditions transport, n° lot).`,
  },

  // ════════════════════════════════════════════════════════════
  // CANNELLE — CCP1 Séchage écorce
  // ════════════════════════════════════════════════════════════
  {
    produit_code: 'cannelle',
    numero: 'CCP1',
    procedure_mesure: `1. Étalonner hygromètre.
2. Prélever 100 g d'écorce sur 3 zones du lot.
3. Insérer sonde au contact écorce, attendre stabilisation 2-3 min.
4. Si humidité > 12% : prolonger séchage solaire 12-24h.
5. Re-mesurer après prolongation.`,
    plan_echantillonnage: `1 prélèvement de 100 g pour 50 kg de lot. Minimum 3 prélèvements (3 zones). Pour lots de bâtonnets : prélever bâtonnets entiers de 3 hauteurs.`,
    calibration_equipement: `Hygromètre épices : étalonnage mensuel NaCl saturé. Vérification quotidienne.`,
    formation_requise: `Responsable séchage : formation 2h initiale + recyclage annuel. Connaissance différenciation Cinnamomum verum / cassia (essentiel pour limite coumarine).`,
    document_enregistrement: `Fiche F-HACCP-CAN-01 "Suivi séchage cannelle". Conservation 5 ans.`,
  },

  // ════════════════════════════════════════════════════════════
  // CAFÉ — CCP1 Fermentation
  // ════════════════════════════════════════════════════════════
  {
    produit_code: 'cafe',
    numero: 'CCP1',
    procedure_mesure: `1. Démarrer fermentation : remplir bac à 80% maxi, noter heure (T0).
2. Toutes les 6h, insérer sonde thermique au centre du tas (profondeur 40 cm).
3. Toutes les 12h, mesurer pH du liquide percolant avec papier pH (4,0-7,0).
4. Test mucilage : prélever quelques grains, frotter entre doigts. Si glisse encore "savonneux" → continuer. Si grain rugueux et propre → fin fermentation.
5. À T0+24h max (Arabica) ou T0+12h (Robusta), faire test sensoriel rinçage : grain doit "chanter" sous l'eau.
6. Si T° > 28°C : ouvrir bac, retourner. Si T° < 18°C : isoler/couvrir bac.
7. Noter fin fermentation. Durée totale 12-36h selon profil.`,
    plan_echantillonnage: `Mesure T° toutes les 6h sur 3 points (centre haut, centre, centre bas). pH toutes les 12h. Test sensoriel mucilage : 1 fois par jour minimum jusqu'à fin fermentation.`,
    calibration_equipement: `Sonde thermique alimentaire : étalonnage trimestriel (glace fondante 0°C + eau bouillante 100°C). Papier pH : utilisation unique, vérifier péremption bandelettes.`,
    formation_requise: `Responsable post-récolte : formation 16h fermentation café (théorie + pratique terrain), avec barista/cupper certifié SCA. Recyclage annuel obligatoire. Capacité à reconnaître défauts fermentaires au cupping.`,
    document_enregistrement: `Fiche F-HACCP-CAF-01 "Suivi fermentation café" (1 par bac de fermentation) avec horodatage T°, pH, observations sensorielles, décisions. Conservation 5 ans.`,
  },

  // ════════════════════════════════════════════════════════════
  // CAFÉ — CCP2 Séchage grains
  // ════════════════════════════════════════════════════════════
  {
    produit_code: 'cafe',
    numero: 'CCP2',
    procedure_mesure: `1. Étalonner hygromètre grains (Aqua-Boy ou équivalent).
2. Prélever 200 g de grains parche (ou verts si déparchés) à 5 zones de l'aire de séchage (4 coins + centre).
3. Mesurer humidité directement à la sonde, lecture stabilisée.
4. Faire moyenne des 5 mesures. Écart > 1% entre extrêmes : homogénéiser le lot (retourner).
5. Arabica spé : viser 10,5-11,5%. Robusta : viser 11,5-12,5%.
6. Si humidité > limite : prolonger séchage. Si < limite basse : risque cassure, conditionner rapidement.`,
    plan_echantillonnage: `5 prélèvements par lot, minimum 200g chacun. Pour patios > 100m² : 1 prélèvement supplémentaire par 50m² au-delà. Pour séchoir mécanique : prélever à l'entrée, milieu et sortie.`,
    calibration_equipement: `Hygromètre grains (Aqua-Boy / Pfeuffer / Dickey-John) : étalonnage 6 mois minimum chez le fabricant + vérification mensuelle avec échantillon de référence interne (grain humide connu). Conservation certificat étalonnage.`,
    formation_requise: `Responsable séchage : formation 8h initiale (théorie séchage + manipulation hygromètre) + recyclage annuel. Connaissance courbe d'équilibre hygroscopique café vert.`,
    document_enregistrement: `Fiche F-HACCP-CAF-02 "Suivi séchage café" avec 5 mesures par contrôle, moyenne calculée, décisions. Conservation 5 ans.`,
  },

  // ════════════════════════════════════════════════════════════
  // CAFÉ — CCP3 Analyse OTA
  // ════════════════════════════════════════════════════════════
  {
    produit_code: 'cafe',
    numero: 'CCP3',
    procedure_mesure: `1. Constituer échantillon représentatif selon Règlement UE 401/2006 (méthode "café").
2. Prélever minimum 100 incréments répartis dans le lot, total ≥ 30 kg.
3. Réduire à 1-2 kg échantillon laboratoire par broyage homogénéisation.
4. Diviser en 3 : analyse / contre-analyse / archivage 6 mois (4°C).
5. Envoyer à labo ISO 17025 accrédité OTA café.
6. Demander dosage HPLC-FLD ou LC-MS/MS. LD ≤ 0,5 µg/kg.
7. Bloquer lot en zone "Q-EN-ATTENTE" jusqu'à réception bulletin.`,
    plan_echantillonnage: `UE 401/2006 - lots ≤ 15 t : 100 incréments minimum, échantillon agrégé ≥ 10 kg réduit à 1-2 kg laboratoire. Lots > 15 t : segmentation en sous-lots.`,
    calibration_equipement: `N/A — analyses externalisées. Vérifier annuellement validité accréditation laboratoire (Cofrac, ISO 17025) avec portée OTA café.`,
    formation_requise: `Responsable qualité : formation échantillonnage mycotoxines (8h externe) + recyclage 3 ans. Maîtrise UE 1881/2006 et 401/2006.`,
    document_enregistrement: `Fiche F-HACCP-CAF-03 + bulletin labo original. Traçabilité échantillon F-TRAC-ECH-01. Conservation 5 ans.`,
  },

  // ════════════════════════════════════════════════════════════
  // CACAO — CCP1 Fermentation
  // ════════════════════════════════════════════════════════════
  {
    produit_code: 'cacao',
    numero: 'CCP1',
    procedure_mesure: `1. Démarrer fermentation : remplir caisses/tas, couvrir feuilles bananier. Noter J0.
2. Toutes les 12h : sonde thermique au centre du tas (profondeur 30 cm minimum). Cible 45-50°C entre J2 et J5.
3. À J2 : 1er retournement. Re-mesurer T° après retournement.
4. À J4 : 2ème retournement.
5. À J5-J6 : 3ème retournement si nécessaire.
6. À J6-J7 : test fève — couleur brun chocolat uniforme, odeur cacao caractéristique.
7. Cut-test J7 : couper 100 fèves en 2, classer (bien fermenté / partiellement / violet / ardoisé / moisi). Cible ≥ 80% bien fermenté.
8. Si T° < 45°C à J3 : fermentation trop lente, isoler bac problématique.`,
    plan_echantillonnage: `Mesure T° toutes les 12h sur 3 points (centre, gauche, droite). Cut-test final 100 fèves par lot (sélection aléatoire répartie). Si lot > 500 kg : 200 fèves cut-test.`,
    calibration_equipement: `Sonde thermique alimentaire longue (30+ cm) : étalonnage trimestriel (glace 0°C / eau bouillante 100°C). Guillotine cut-test : aiguisage hebdomadaire, remplacement lame annuelle.`,
    formation_requise: `Responsable fermentation : formation 16h fermentation cacao (théorie + pratique cut-test certifiée ICCO ou équivalent) + recyclage annuel. Capacité à différencier les 5 classes cut-test.`,
    document_enregistrement: `Fiche F-HACCP-CAC-01 "Suivi fermentation cacao" avec courbe T°, retournements, cut-test final photographié. Conservation 5 ans.`,
  },

  // ════════════════════════════════════════════════════════════
  // CACAO — CCP2 Séchage fèves
  // ════════════════════════════════════════════════════════════
  {
    produit_code: 'cacao',
    numero: 'CCP2',
    procedure_mesure: `1. Étendre fèves fermentées sur claies/bâches au soleil, couche < 5 cm.
2. Retourner toutes les 2h en journée pour séchage uniforme.
3. Couvrir la nuit (rosée) et en cas de pluie.
4. Test pression : pincer fève entre 2 doigts. Si éclate net = sèche. Si plie = encore humide.
5. À J6-J8 : prélever 200g fèves de 3 zones, mesurer humidité hygromètre fèves cacao.
6. Cible 6,5-7,5%. Si > 7,5% : prolonger 24h.
7. Conditionner uniquement quand humidité stable < 7,5%.`,
    plan_echantillonnage: `1 prélèvement de 200g par 100 kg, minimum 3 prélèvements par lot (zones différentes).`,
    calibration_equipement: `Hygromètre cacao (Aqua-Boy ou équivalent) : étalonnage 6 mois fabricant + vérification mensuelle.`,
    formation_requise: `Responsable séchage : formation 4h + pratique terrain 16h + recyclage annuel. Connaissance impacts sur arômes (séchage trop rapide = défauts).`,
    document_enregistrement: `Fiche F-HACCP-CAC-02 "Suivi séchage cacao". Conservation 5 ans.`,
  },

  // ════════════════════════════════════════════════════════════
  // CACAO — CCP3 Analyse cadmium
  // ════════════════════════════════════════════════════════════
  {
    produit_code: 'cacao',
    numero: 'CCP3',
    procedure_mesure: `1. Échantillon représentatif : 1 kg de fèves sèches prélevé selon norme ISO 17239 (métaux dans cacao).
2. Diviser en 3 sous-échantillons (analyse / contre-analyse / archive 6 mois).
3. Envoyer 500g à laboratoire accrédité ISO 17025 avec portée "Cadmium dans cacao et produits dérivés".
4. Demander dosage Cd par ICP-MS (méthode officielle CEN ou AOAC).
5. Demander également Plomb (Pb) si UE 2023/915 met une limite.
6. Bloquer lot zone "Q-EN-ATTENTE" jusqu'à réception bulletin (10-15j).
7. Si Cd > 0,8 mg/kg : lot bloqué export UE, étudier réorientation autres marchés (USA, Asie) où la limite peut être différente.`,
    plan_echantillonnage: `Prélèvement aléatoire stratifié : 30+ incréments sur l'ensemble du lot, échantillon agrégé ≥ 2 kg réduit à 1 kg laboratoire (ISO 17239). Pour grandes parcelles à risque Cd connu : analyses par micro-parcelle.`,
    calibration_equipement: `N/A — externalisé. Vérifier annuellement accréditation laboratoire (Cofrac, ISO 17025) avec portée "Cadmium dans cacao".`,
    formation_requise: `Responsable qualité : formation 8h métaux lourds dans cacao (sols, accumulation, atténuation) + recyclage 3 ans. Maîtrise UE 2023/915 et CODEX STAN 87-1981.`,
    document_enregistrement: `Fiche F-HACCP-CAC-03 + bulletin labo. Traçabilité échantillon F-TRAC-ECH-01. Si dépassement : déclaration F-NC-01 + plan d'action sols/origine. Conservation 5 ans.`,
  },

  // ════════════════════════════════════════════════════════════
  // POIVRE — CCP1 Séchage grains
  // ════════════════════════════════════════════════════════════
  {
    produit_code: 'poivre',
    numero: 'CCP1',
    procedure_mesure: `1. Étendre grains de poivre sur bâches propres au soleil, couche < 3 cm.
2. Retourner 2-3 fois par jour pour séchage uniforme.
3. À J5-J7 : prélever 100 g grains à 3 zones du lot.
4. Mesurer humidité hygromètre épices.
5. Cible humidité ≤ 12% (ISO 959). Si > 12% : prolonger séchage.
6. Test pression : grain mature sec se casse sec sous pression dent.`,
    plan_echantillonnage: `1 prélèvement de 100g pour 50 kg de lot, minimum 3 prélèvements (3 zones).`,
    calibration_equipement: `Hygromètre épices : étalonnage mensuel NaCl saturé. Vérification quotidienne.`,
    formation_requise: `Responsable séchage : formation 2h + pratique + recyclage annuel.`,
    document_enregistrement: `Fiche F-HACCP-POI-01 "Suivi séchage poivre". Conservation 5 ans.`,
  },

  // ════════════════════════════════════════════════════════════
  // POIVRE — CCP2 Analyse Salmonella
  // ════════════════════════════════════════════════════════════
  {
    produit_code: 'poivre',
    numero: 'CCP2',
    procedure_mesure: `1. Constituer échantillon représentatif : 5 prélèvements de 50g sur l'ensemble du lot.
2. Conditionnement aseptique en sachet stérile.
3. Acheminement froid (< 4°C) au laboratoire ISO 17025 microbiologie alimentaire.
4. Demander recherche Salmonella selon ISO 6579-1:2017 (méthode horizontale).
5. Si présence détectée dans 25g : lot bloqué.
6. Options : (a) traitement décontamination par vapeur (sat steam) ou irradiation (selon marché cible), (b) destruction.`,
    plan_echantillonnage: `5 prélèvements de 50g pour lots ≤ 1 tonne. Pour lots > 1 tonne : 1 prélèvement supplémentaire par 200 kg. UE 2073/2005 critère "absence dans 25g, n=5".`,
    calibration_equipement: `N/A — analyses externalisées. Vérifier accréditation labo microbio + portée "Salmonella dans épices".`,
    formation_requise: `Responsable qualité : formation 4h microbiologie + échantillonnage aseptique + UE 2073/2005.`,
    document_enregistrement: `Fiche F-HACCP-POI-02 + bulletin labo. Conservation 5 ans.`,
  },

  // ════════════════════════════════════════════════════════════
  // GINGEMBRE — CCP1 Lavage rhizomes
  // ════════════════════════════════════════════════════════════
  {
    produit_code: 'gingembre',
    numero: 'CCP1',
    procedure_mesure: `1. Vérifier qualité eau de lavage : visuelle (limpide) + bandelette test pH + test rapide bactéries coliformes mensuel.
2. Brossage manuel ou mécanique sous eau courante haute pression.
3. Inspection visuelle 100% des rhizomes après lavage : aucune terre résiduelle, aucune zone moisie.
4. Renouveler eau de lavage tous les 50 kg de rhizomes traités (ou avant si troubles visibles).
5. Désinfection eau possible : hypochlorite < 50 ppm (BIO : eau potable simple, pas de désinfectant chimique).`,
    plan_echantillonnage: `Inspection visuelle 100% (chaque rhizome). Test eau lavage : mensuel (bactério) + quotidien (visuel/pH).`,
    calibration_equipement: `pH-mètre eau : étalonnage mensuel avec solutions tampon pH 4 et 7. Bandelettes pH : vérifier péremption avant chaque campagne.`,
    formation_requise: `Opérateurs lavage : formation hygiène 2h (initiale) + 1h annuelle. Démonstration brossage. Sensibilisation aux risques fécaux.`,
    document_enregistrement: `Fiche F-HACCP-GIN-01 "Contrôle lavage gingembre" : date, lot, qualité eau, observations visuelles, opérateur. Conservation 5 ans.`,
  },

  // ════════════════════════════════════════════════════════════
  // GINGEMBRE — CCP2 Séchage rhizomes tranchés
  // ════════════════════════════════════════════════════════════
  {
    produit_code: 'gingembre',
    numero: 'CCP2',
    procedure_mesure: `1. Trancher rhizomes en lamelles 3-5 mm épaisseur (uniformité critique).
2. Étendre sur claies, ne pas chevaucher.
3. Séchoir : régler T° 55°C (±2°C), HR < 30%.
4. Suivi T° toutes les 4h via sonde séchoir.
5. À J3-J5 : prélever 100 g lamelles séchées à 3 zones.
6. Mesurer humidité hygromètre épices. Cible ≤ 12%.
7. Si humidité > 12% : prolonger séchage 12-24h.
8. Test casse : lamelle sèche se casse net sous pression.`,
    plan_echantillonnage: `1 prélèvement de 100g par claie, minimum 3 claies différentes par lot.`,
    calibration_equipement: `Hygromètre épices : étalonnage mensuel. Thermomètre séchoir : étalonnage trimestriel (glace + eau bouillante).`,
    formation_requise: `Responsable séchage : formation 4h + pratique. Connaissance impact T° sur composés aromatiques (gingembre fragile thermiquement).`,
    document_enregistrement: `Fiche F-HACCP-GIN-02 "Suivi séchage gingembre". Conservation 5 ans.`,
  },

  // ════════════════════════════════════════════════════════════
  // FRUITS SÉCHÉS — CCP1 Séchage
  // ════════════════════════════════════════════════════════════
  {
    produit_code: 'fruits_seches',
    numero: 'CCP1',
    procedure_mesure: `1. Pré-traiter fruits selon protocole : peler, dénoyauter, trancher uniformément (5-8 mm).
2. Pour BIO : pas de soufrage. Pour conventionnel : trempage SO2 5-10 min selon recette.
3. Étaler en couche simple sur grilles.
4. Séchoir T° 60-65°C, HR < 30%, ventilation forcée.
5. Durée 12-24h selon fruit (mangue 12h, ananas 16h, banane 20h).
6. À mi-parcours : retourner.
7. Test final : prélever 50g à 3 zones, mesurer Aw avec Aw-mètre. Cible Aw < 0,65.
8. Vérifier humidité ≤ 18% (Codex STAN 130).`,
    plan_echantillonnage: `1 prélèvement de 50g par claie, minimum 3 claies. Aw-mètre + hygromètre conjoint.`,
    calibration_equipement: `Aw-mètre : étalonnage hebdomadaire avec sels saturés certifiés (NaCl 0,753 / KCl 0,843 / MgCl2 0,328). Conservation certificats.`,
    formation_requise: `Responsable séchage : formation 4h théorie (Aw, Codex STAN 130) + 8h pratique. Connaissance allergène SO2 (étiquetage obligatoire).`,
    document_enregistrement: `Fiche F-HACCP-FRU-01 "Suivi séchage fruits". Conservation 5 ans.`,
  },

  // ════════════════════════════════════════════════════════════
  // FRUITS SÉCHÉS — CCP2 Dénoyautage / contrôle visuel
  // ════════════════════════════════════════════════════════════
  {
    produit_code: 'fruits_seches',
    numero: 'CCP2',
    procedure_mesure: `1. Dénoyauter manuellement ou mécaniquement avant séchage (mangue, litchi, prune).
2. Inspection visuelle 100% après dénoyautage sur tapis lumineux (rétro-éclairage).
3. Détecteur de métaux en sortie conditionnement, sensibilité Fe ≥ 2 mm / Inox ≥ 3 mm.
4. Test détecteur à chaque démarrage de ligne avec billes étalon (Fe 2,0 mm, NF 2,5 mm, SS 3,0 mm).
5. En cas de détection : isoler unité, vérifier, action corrective.`,
    plan_echantillonnage: `Inspection visuelle 100% (tapis défilant). Détecteur métaux : test étalon démarrage + toutes les 4h + arrêt.`,
    calibration_equipement: `Détecteur métaux : vérification quotidienne avec billes étalon. Étalonnage annuel par fabricant (certificat conservé). Tapis lumineux : nettoyage quotidien.`,
    formation_requise: `Opérateurs tri : formation 4h détection visuelle défauts + corps étrangers + signes de pourriture. Recyclage semestriel. Tests vue annuels.`,
    document_enregistrement: `Fiche F-HACCP-FRU-02 "Contrôle dénoyautage et détection métaux". Test détecteur enregistré toutes les 4h. Conservation 5 ans.`,
  },

  // ════════════════════════════════════════════════════════════
  // LITCHI — CCP1 Soufrage
  // ════════════════════════════════════════════════════════════
  {
    produit_code: 'litchi',
    numero: 'CCP1',
    procedure_mesure: `1. Vérifier propreté chambre de soufrage avant chaque lot.
2. Peser litchis frais entrants (tare). Cible dose SO2 : 0,5-1,0% du poids.
3. Calculer poudre soufre nécessaire (env. 1 kg pour 100 kg litchis pour soufrage 30 min).
4. Allumer poudre soufre en zone confinée, fermer chambre, attendre 30-45 min.
5. Aérer chambre 4-6h après combustion avant retrait litchis.
6. Prélèvement 5 fruits/lot pour dosage SO2 résiduel pulpe au laboratoire (méthode Monier-Williams).
7. Bulletin labo doit confirmer SO2 pulpe ≤ 10 mg/kg pour conformité UE.`,
    plan_echantillonnage: `5 fruits par lot pour analyse SO2 résiduel pulpe + peau. Lots > 1 tonne : 10 fruits.`,
    calibration_equipement: `Balance soufre : étalonnage mensuel avec masses étalon. Hygrocapteur chambre soufrage : étalonnage trimestriel.`,
    formation_requise: `Responsable soufrage : formation 8h (sécurité SO2 + dosage + UE 1333/2008) + recyclage annuel. EPI obligatoire (masque P3, gants).`,
    document_enregistrement: `Fiche F-HACCP-LIT-01 "Suivi soufrage litchi" : poids lot, dose soufre, durée, aération, dosage labo. Conservation 5 ans + étiquetage allergène SO2 obligatoire UE 1169/2011.`,
  },

  // ════════════════════════════════════════════════════════════
  // LITCHI — CCP2 Contrôle phytosanitaire
  // ════════════════════════════════════════════════════════════
  {
    produit_code: 'litchi',
    numero: 'CCP2',
    procedure_mesure: `1. Inspection visuelle 100% des fruits avant export (loupe binoculaire pour suspects).
2. Échantillonner aléatoirement 100 fruits par lot pour dissection.
3. Découper fruit, examiner pulpe et noyau pour larves Bactrocera (cuiller à dissection).
4. Si présence détectée : traitement chaud obligatoire OU destruction lot.
5. Traitement hot water : bain thermostaté 47°C ± 0,5°C, immersion 20 min minimum (IPPC ISPM 28).
6. Vérifier T° bain via sonde immergée continue.
7. Refroidissement immédiat post-traitement.
8. Demander certificat phytosanitaire DRAEAH avant expédition.`,
    plan_echantillonnage: `100 fruits aléatoires par lot pour dissection. Inspection visuelle 100% en sortie de ligne.`,
    calibration_equipement: `Bain thermostaté hot water : étalonnage sondes 6 mois (glace fondante + eau bouillante). Vérification quotidienne avant traitement.`,
    formation_requise: `Inspecteur phytosanitaire : formation 16h + certification DRAEAH ou équivalent. Reconnaissance Bactrocera dorsalis + autres mouches. Recyclage annuel.`,
    document_enregistrement: `Fiche F-HACCP-LIT-02 "Contrôle phytosanitaire litchi" + certificat phytosanitaire officiel. Conservation 5 ans.`,
  },
];

// ============================================================
// FONCTION DE SEED — IDEMPOTENT
// ============================================================

export const seedHaccpModesOperatoires = () => {
  // Vérifier si la migration a été faite (colonne procedure_mesure existe)
  const tableInfo = db.getAllSync(`PRAGMA table_info(ccp_haccp)`);
  const hasProcedure = tableInfo.some((c) => c.name === 'procedure_mesure');
  if (!hasProcedure) {
    console.log('ℹ️ Migration mode opératoire pas encore appliquée, seed ignoré');
    return;
  }

  let updated = 0;
  let skipped = 0;

  for (const mo of MODES_OPERATOIRES) {
    // Récupérer l'étude
    const etude = db.getFirstSync(
      `SELECT id FROM etudes_haccp WHERE produit_code = ?`,
      [mo.produit_code]
    );
    if (!etude) {
      skipped++;
      continue;
    }

    // Récupérer le CCP
    const ccp = db.getFirstSync(
      `SELECT id, procedure_mesure FROM ccp_haccp WHERE etude_id = ? AND numero = ?`,
      [etude.id, mo.numero]
    );
    if (!ccp) {
      skipped++;
      continue;
    }

    // Update uniquement si procedure_mesure est NULL (pas écraser une saisie utilisateur)
    if (ccp.procedure_mesure) {
      skipped++;
      continue;
    }

    db.runSync(
      `UPDATE ccp_haccp SET
         procedure_mesure = ?,
         plan_echantillonnage = ?,
         calibration_equipement = ?,
         formation_requise = ?,
         document_enregistrement = ?
       WHERE id = ?`,
      [
        mo.procedure_mesure,
        mo.plan_echantillonnage,
        mo.calibration_equipement,
        mo.formation_requise,
        mo.document_enregistrement,
        ccp.id,
      ]
    );
    updated++;
  }

  console.log(
    `✅ Seed modes opératoires HACCP : ${updated} CCP enrichis, ${skipped} déjà remplis ou non trouvés`
  );
};