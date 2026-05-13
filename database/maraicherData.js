// database/maraicherData.js
// Seed des 13 cultures maraîchères — Hautes Terres Madagascar + Site D Moramanga

import * as SQLite from 'expo-sqlite';
const db = SQLite.openDatabaseSync('certifpilot.db');

// ─────────────────────────────────────────────
// DONNÉES — 13 cultures maraîchères
// ─────────────────────────────────────────────

export const CULTURES_MARAICHERES = [

  // ══════════════════════════════════════════════════
  // HAUTES TERRES — Sites A, B, C (~1 300-1 400 m)
  // ══════════════════════════════════════════════════

  {
    nom_fr: 'Chou cabus',
    nom_local: 'Laisoa',
    nom_scientifique: 'Brassica oleracea var. capitata',
    famille: 'Brassicacées',
    categorie: 'maraichage',
    sous_categorie: 'légume-feuille',
    cycle_jours: 90,
    zones_adaptees: 'hautes_terres',
    altitude_min_m: 900,
    altitude_max_m: 2000,
    tolerance_secheresse: 'bonne',
    besoin_eau: 'moyen',
    temperature_optimale_c: '15-20',
    type_sol_prefere: 'limoneux, bien drainé',
    couleur_badge: '#4CAF50',
    priorite_ecole: 1,
    rendement_ref_kg_m2: 4.0,
    notes: `Pilier des repas scolaires malgaches. Très productif en Hautes Terres. Résistant au froid. Attention aux chenilles (Plutella xylostella) — surveiller revers des feuilles. Semis en pépinière 30 jours avant repiquage.`,
    fertilisation: { apport_fumier_t_ha: 20, moment_apport: 'avant repiquage', complement: 'cendre de bois en cours de croissance' },
    stades: [
      { nom: 'Semis pépinière', j_debut: 0, j_fin: 30, alerte: false },
      { nom: 'Repiquage', j_debut: 30, j_fin: 32, alerte: true, consigne: 'Repiquer le soir ou par temps nuageux. Arroser abondamment.' },
      { nom: 'Reprise & installation', j_debut: 32, j_fin: 50, alerte: false },
      { nom: 'Formation de pomme', j_debut: 50, j_fin: 80, alerte: true, consigne: 'Surveiller la pomme centrale. Si pas de formation à J60 → vérifier fertilisation.' },
      { nom: 'Maturité & récolte', j_debut: 80, j_fin: 90, alerte: true, consigne: 'Récolter quand la pomme est ferme au toucher. Ne pas attendre la fissuration.' },
    ],
  },

  {
    nom_fr: 'Carotte',
    nom_local: 'Karoty',
    nom_scientifique: 'Daucus carota',
    famille: 'Apiacées',
    categorie: 'maraichage',
    sous_categorie: 'légume-racine',
    cycle_jours: 80,
    zones_adaptees: 'hautes_terres',
    altitude_min_m: 1000,
    altitude_max_m: 2000,
    tolerance_secheresse: 'moyenne',
    besoin_eau: 'moyen',
    temperature_optimale_c: '15-18',
    type_sol_prefere: 'sableux-limoneux, profond, sans cailloux',
    couleur_badge: '#FF7043',
    priorite_ecole: 2,
    rendement_ref_kg_m2: 3.5,
    notes: `Riche en bêtacarotène — excellent pour alimentation scolaire. Exige un sol profond et meuble. Sol à travailler en profondeur (30 cm) avant semis. Se conserve bien après récolte.`,
    fertilisation: { apport_fumier_t_ha: 15, moment_apport: 'avant semis (fumier bien décomposé uniquement)', complement: 'Éviter fumier frais — provoque des fourches. Privilégier compost mûr ou fumier de 6 mois minimum.' },
    stades: [
      { nom: 'Semis & levée', j_debut: 0, j_fin: 15, alerte: true, consigne: 'Maintenir sol humide en surface jusqu\'à levée. Couvrir avec paille fine si soleil fort.' },
      { nom: 'Croissance végétative', j_debut: 15, j_fin: 45, alerte: false },
      { nom: 'Grossissement racine', j_debut: 45, j_fin: 70, alerte: true, consigne: 'Observer l\'épaulement de la racine. Si très épais → récolte imminente.' },
      { nom: 'Récolte', j_debut: 70, j_fin: 80, alerte: true, consigne: 'Arroser la veille pour faciliter l\'extraction. Tirer en tenant le feuillage à la base.' },
    ],
  },

  {
    nom_fr: 'Haricot vert',
    nom_local: 'Tsaramaso maintso',
    nom_scientifique: 'Phaseolus vulgaris',
    famille: 'Fabacées',
    categorie: 'maraichage',
    sous_categorie: 'légumineuse-légume',
    cycle_jours: 55,
    zones_adaptees: 'hautes_terres',
    altitude_min_m: 800,
    altitude_max_m: 1800,
    tolerance_secheresse: 'moyenne',
    besoin_eau: 'moyen',
    temperature_optimale_c: '18-24',
    type_sol_prefere: 'limoneux, bien drainé',
    couleur_badge: '#66BB6A',
    priorite_ecole: 3,
    rendement_ref_kg_m2: 1.5,
    notes: `Cycle court = idéal pour les rotations rapides. Fixe l'azote atmosphérique → améliore le sol pour la culture suivante. Double usage : gousses vertes + grains secs.`,
    fertilisation: { apport_fumier_t_ha: 10, moment_apport: 'avant semis', complement: 'Pas d\'azote minéral — fixation propre suffisante' },
    stades: [
      { nom: 'Levée', j_debut: 0, j_fin: 8, alerte: false },
      { nom: 'Croissance', j_debut: 8, j_fin: 35, alerte: false },
      { nom: 'Floraison', j_debut: 35, j_fin: 45, alerte: true, consigne: 'Surveiller les thrips sur les fleurs. Ne pas arroser en plein soleil pendant floraison.' },
      { nom: 'Formation gousses', j_debut: 45, j_fin: 52, alerte: false },
      { nom: 'Récolte gousses vertes', j_debut: 52, j_fin: 55, alerte: true, consigne: 'Récolter quand la gousse est bien verte et craque à la cassure.' },
    ],
  },

  {
    nom_fr: 'Pomme de terre',
    nom_local: 'Patata',
    nom_scientifique: 'Solanum tuberosum',
    famille: 'Solanacées',
    categorie: 'maraichage',
    sous_categorie: 'légume-tubercule',
    cycle_jours: 90,
    zones_adaptees: 'hautes_terres',
    altitude_min_m: 1200,
    altitude_max_m: 2200,
    tolerance_secheresse: 'bonne',
    besoin_eau: 'moyen',
    temperature_optimale_c: '15-20',
    type_sol_prefere: 'limoneux, meuble, légèrement acide',
    couleur_badge: '#FDD835',
    priorite_ecole: 4,
    rendement_ref_kg_m2: 5.0,
    notes: `Meilleure culture de base pour les Hautes Terres. Apport calorique élevé = idéal repas scolaires. Exige buttage à mi-cycle. Attention au mildiou en période pluvieuse.`,
    fertilisation: { apport_fumier_t_ha: 25, moment_apport: 'avant plantation', complement: 'Cendre de bois riche en potasse — très bénéfique pour la tubérisation' },
    stades: [
      { nom: 'Plantation & levée', j_debut: 0, j_fin: 20, alerte: false },
      { nom: 'Croissance végétative', j_debut: 20, j_fin: 50, alerte: false },
      { nom: 'Buttage', j_debut: 40, j_fin: 45, alerte: true, consigne: 'Butter quand les tiges atteignent 20-25 cm. Ramener la terre contre les tiges.' },
      { nom: 'Tubérisation', j_debut: 50, j_fin: 75, alerte: true, consigne: 'Période critique eau. Si sécheresse → risque de pommes de terre creuses. Maintenir humidité.' },
      { nom: 'Maturation & récolte', j_debut: 75, j_fin: 90, alerte: true, consigne: 'Récolter quand le feuillage jaunit et se couche. Laisser sécher les tubercules 2h au soleil avant stockage.' },
    ],
  },

  {
    nom_fr: 'Épinard malgache',
    nom_local: 'Anamalao',
    nom_scientifique: 'Amaranthus hybridus',
    famille: 'Amaranthacées',
    categorie: 'maraichage',
    sous_categorie: 'légume-feuille',
    cycle_jours: 30,
    zones_adaptees: 'hautes_terres',
    altitude_min_m: 0,
    altitude_max_m: 1800,
    tolerance_secheresse: 'faible',
    besoin_eau: 'moyen',
    temperature_optimale_c: '20-28',
    type_sol_prefere: 'riche en matière organique',
    couleur_badge: '#388E3C',
    priorite_ecole: 5,
    rendement_ref_kg_m2: 2.0,
    notes: `Cycle ultra-court = production quasi-continue par coupes successives. Riche en fer et vitamines B. Repousse après coupe si on laisse 10 cm de tige. 3-4 coupes possibles par cycle.`,
    fertilisation: { apport_fumier_t_ha: 15, moment_apport: 'avant semis + après chaque coupe', complement: 'Répondeur rapide à la fumure azotée (fumier frais toléré)' },
    stades: [
      { nom: 'Semis & levée', j_debut: 0, j_fin: 7, alerte: false },
      { nom: 'Croissance rapide', j_debut: 7, j_fin: 25, alerte: false },
      { nom: '1ère coupe', j_debut: 25, j_fin: 30, alerte: true, consigne: 'Couper quand les feuilles atteignent 15-20 cm. Laisser 10 cm de tige pour la repousse.' },
    ],
  },

  {
    nom_fr: 'Radis',
    nom_local: 'Radisy',
    nom_scientifique: 'Raphanus sativus',
    famille: 'Brassicacées',
    categorie: 'maraichage',
    sous_categorie: 'légume-racine',
    cycle_jours: 30,
    zones_adaptees: 'hautes_terres',
    altitude_min_m: 800,
    altitude_max_m: 2000,
    tolerance_secheresse: 'bonne',
    besoin_eau: 'faible',
    temperature_optimale_c: '15-20',
    type_sol_prefere: 'tout type, meuble',
    couleur_badge: '#E91E63',
    priorite_ecole: 8,
    rendement_ref_kg_m2: 2.5,
    notes: `Culture intercalaire ou de remplissage entre deux cycles longs. Très utile pour ne pas laisser le sol nu. Prêt en 30 jours.`,
    fertilisation: { apport_fumier_t_ha: 8, moment_apport: 'avant semis uniquement', complement: 'Très peu exigeant' },
    stades: [
      { nom: 'Levée', j_debut: 0, j_fin: 5, alerte: false },
      { nom: 'Croissance', j_debut: 5, j_fin: 25, alerte: false },
      { nom: 'Récolte', j_debut: 25, j_fin: 30, alerte: true, consigne: 'Récolter rapidement — le radis monte en graines et devient creux après 35 jours.' },
    ],
  },

  {
    nom_fr: 'Poireau',
    nom_local: 'Poireau',
    nom_scientifique: 'Allium porrum',
    famille: 'Amaryllidacées',
    categorie: 'maraichage',
    sous_categorie: 'légume-tige',
    cycle_jours: 120,
    zones_adaptees: 'hautes_terres',
    altitude_min_m: 1000,
    altitude_max_m: 2000,
    tolerance_secheresse: 'bonne',
    besoin_eau: 'faible',
    temperature_optimale_c: '13-18',
    type_sol_prefere: 'limoneux, profond',
    couleur_badge: '#8BC34A',
    priorite_ecole: 7,
    rendement_ref_kg_m2: 3.0,
    notes: `Se conserve sur pied plusieurs semaines après maturité — avantage logistique majeur. Peu exigeant en eau. Peut tenir au champ 2-3 mois sans se dégrader.`,
    fertilisation: { apport_fumier_t_ha: 20, moment_apport: 'avant repiquage', complement: 'Buttage progressif pour blanchiment des tiges' },
    stades: [
      { nom: 'Pépinière', j_debut: 0, j_fin: 45, alerte: false },
      { nom: 'Repiquage', j_debut: 45, j_fin: 47, alerte: true, consigne: 'Repiquer en trou profond de 15 cm. Ne pas reboucher complètement — laisser la lumière.' },
      { nom: 'Reprise & croissance', j_debut: 47, j_fin: 100, alerte: false },
      { nom: 'Maturité', j_debut: 100, j_fin: 120, alerte: false },
      { nom: 'Récolte échelonnée', j_debut: 110, j_fin: 150, alerte: false },
    ],
  },

  {
    nom_fr: 'Tomate',
    nom_local: 'Tomate',
    nom_scientifique: 'Solanum lycopersicum',
    famille: 'Solanacées',
    categorie: 'maraichage',
    sous_categorie: 'légume-fruit',
    cycle_jours: 90,
    zones_adaptees: 'hautes_terres',
    altitude_min_m: 800,
    altitude_max_m: 1600,
    tolerance_secheresse: 'moyenne',
    besoin_eau: 'moyen',
    temperature_optimale_c: '20-26',
    type_sol_prefere: 'limoneux, riche, bien drainé',
    couleur_badge: '#F44336',
    priorite_ecole: 6,
    rendement_ref_kg_m2: 6.0,
    condition_eau: 'suffisant',
    notes: `Conditionnée à l'eau disponible à la floraison — à réserver aux planches avec accès eau sécurisé. Très rentable si bien conduite. Tuteurage obligatoire.`,
    fertilisation: { apport_fumier_t_ha: 30, moment_apport: 'avant repiquage', complement: 'Apport cendre au stade floraison pour la nouaison' },
    stades: [
      { nom: 'Pépinière', j_debut: 0, j_fin: 30, alerte: false },
      { nom: 'Repiquage & installation', j_debut: 30, j_fin: 45, alerte: true, consigne: 'Installer les tuteurs dès le repiquage. Attacher délicatement.' },
      { nom: 'Croissance végétative', j_debut: 45, j_fin: 60, alerte: false },
      { nom: 'Floraison', j_debut: 60, j_fin: 70, alerte: true, consigne: 'CRITIQUE EAU : maintenir humidité constante. Un stress hydrique à la floraison provoque la chute des fleurs.' },
      { nom: 'Fructification', j_debut: 70, j_fin: 85, alerte: false },
      { nom: 'Récolte', j_debut: 85, j_fin: 90, alerte: true, consigne: 'Récolter à la couleur orange-rouge. Ne pas attendre rouge foncé si vente.' },
    ],
  },

  {
    nom_fr: 'Laitue',
    nom_local: 'Laitue',
    nom_scientifique: 'Lactuca sativa',
    famille: 'Astéracées',
    categorie: 'maraichage',
    sous_categorie: 'légume-feuille',
    cycle_jours: 45,
    zones_adaptees: 'hautes_terres',
    altitude_min_m: 1000,
    altitude_max_m: 2000,
    tolerance_secheresse: 'faible',
    besoin_eau: 'moyen',
    temperature_optimale_c: '15-20',
    type_sol_prefere: 'riche, humide',
    couleur_badge: '#AED581',
    priorite_ecole: 9,
    rendement_ref_kg_m2: 2.0,
    condition_eau: 'suffisant',
    notes: `Réserver aux planches avec eau disponible ou en saison des pluies uniquement. Cycle court = utile pour remplir les espaces entre cultures plus longues.`,
    fertilisation: { apport_fumier_t_ha: 15, moment_apport: 'avant semis', complement: 'Répondeur rapide — visible en 15 jours' },
    stades: [
      { nom: 'Levée', j_debut: 0, j_fin: 8, alerte: false },
      { nom: 'Formation de la rosette', j_debut: 8, j_fin: 35, alerte: false },
      { nom: 'Récolte', j_debut: 35, j_fin: 45, alerte: true, consigne: 'Récolter avant montée en graines. Pomme bien formée et ferme.' },
    ],
  },

  // ══════════════════════════════════════════════════
  // SITE D — Moramanga (~900 m, tropical humide, eau disponible)
  // ══════════════════════════════════════════════════

  {
    nom_fr: 'Gingembre',
    nom_local: 'Sakamalao',
    nom_scientifique: 'Zingiber officinale',
    famille: 'Zingibéracées',
    categorie: 'maraichage',
    sous_categorie: 'épice-rhizome',
    cycle_jours: 270,
    zones_adaptees: 'moramanga,cote_est',
    altitude_min_m: 0,
    altitude_max_m: 1200,
    tolerance_secheresse: 'faible',
    besoin_eau: 'moyen',
    temperature_optimale_c: '22-28',
    type_sol_prefere: 'alluvial, limoneux, riche, bien drainé',
    couleur_badge: '#FFB300',
    priorite_ecole: 10,
    rendement_ref_kg_m2: 3.0,
    notes: `Culture d'export/local à fort potentiel. Cycle long 9 mois. Site D (Moramanga, alluvial, eau) est le site idéal. Marché local fort — export possible avec séchage/transformation.`,
    fertilisation: { apport_fumier_t_ha: 25, moment_apport: 'avant plantation + à 3 mois', complement: 'Paillage épais recommandé — conserve l\'humidité et protège les rhizomes' },
    stades: [
      { nom: 'Plantation semenceaux', j_debut: 0, j_fin: 30, alerte: false },
      { nom: 'Levée & tallage', j_debut: 30, j_fin: 90, alerte: true, consigne: 'Maintenir le paillage. Désherber à la main — pas d\'outil (risque de couper les rhizomes).' },
      { nom: 'Croissance active', j_debut: 90, j_fin: 180, alerte: false },
      { nom: 'Grossissement rhizomes', j_debut: 180, j_fin: 240, alerte: true, consigne: 'Réduire progressivement les arrosages à partir de J200 pour concentrer les arômes.' },
      { nom: 'Sénescence & maturation', j_debut: 240, j_fin: 270, alerte: true, consigne: 'Les tiges jaunissent et tombent = signal de récolte. Soulever délicatement avec une fourche.' },
    ],
  },

  {
    nom_fr: 'Piment',
    nom_local: 'Sakay',
    nom_scientifique: 'Capsicum frutescens',
    famille: 'Solanacées',
    categorie: 'maraichage',
    sous_categorie: 'légume-fruit',
    cycle_jours: 90,
    zones_adaptees: 'moramanga,cote_est',
    altitude_min_m: 0,
    altitude_max_m: 1200,
    tolerance_secheresse: 'bonne',
    besoin_eau: 'moyen',
    temperature_optimale_c: '24-30',
    type_sol_prefere: 'bien drainé, fertile',
    couleur_badge: '#FF5722',
    priorite_ecole: 11,
    rendement_ref_kg_m2: 1.5,
    notes: `Marché local très fort à Madagascar. Culture productive et rentable. Peut durer 2-3 ans en vivace si bien entretenu. Séchage facile = transformation possible.`,
    fertilisation: { apport_fumier_t_ha: 20, moment_apport: 'avant repiquage', complement: 'Cendre de bois pour potasse' },
    stades: [
      { nom: 'Pépinière', j_debut: 0, j_fin: 40, alerte: false },
      { nom: 'Installation', j_debut: 40, j_fin: 55, alerte: false },
      { nom: 'Floraison', j_debut: 55, j_fin: 70, alerte: true, consigne: 'Surveiller les acariens en période sèche. Feuilles qui se recroquevillent = alerte.' },
      { nom: 'Fructification', j_debut: 70, j_fin: 85, alerte: false },
      { nom: 'Récolte', j_debut: 85, j_fin: 90, alerte: true, consigne: 'Récolter en vert pour marché local, rouge-orangé pour séchage.' },
    ],
  },

  {
    nom_fr: 'Aubergine',
    nom_local: 'Voankazo hatoka',
    nom_scientifique: 'Solanum melongena',
    famille: 'Solanacées',
    categorie: 'maraichage',
    sous_categorie: 'légume-fruit',
    cycle_jours: 90,
    zones_adaptees: 'moramanga,cote_est',
    altitude_min_m: 0,
    altitude_max_m: 1000,
    tolerance_secheresse: 'bonne',
    besoin_eau: 'moyen',
    temperature_optimale_c: '22-28',
    type_sol_prefere: 'limoneux, fertile',
    couleur_badge: '#7B1FA2',
    priorite_ecole: 12,
    rendement_ref_kg_m2: 4.0,
    notes: `Très populaire dans la cuisine malgache. Culture productive sur Site D. Peut produire pendant 6-8 mois en vivace. Tuteurage léger recommandé.`,
    fertilisation: { apport_fumier_t_ha: 25, moment_apport: 'avant repiquage + mensuel', complement: 'Répondeur régulier — apports fractionnés préférables' },
    stades: [
      { nom: 'Pépinière', j_debut: 0, j_fin: 35, alerte: false },
      { nom: 'Repiquage & installation', j_debut: 35, j_fin: 50, alerte: false },
      { nom: 'Floraison', j_debut: 50, j_fin: 65, alerte: false },
      { nom: 'Récolte continue', j_debut: 65, j_fin: 90, alerte: true, consigne: 'Récolter avant maturité complète : fruit brillant, ferme, couleur violette franche. Un fruit ramolli = trop tardif.' },
    ],
  },

  {
    nom_fr: 'Concombre',
    nom_local: 'Konkonina',
    nom_scientifique: 'Cucumis sativus',
    famille: 'Cucurbitacées',
    categorie: 'maraichage',
    sous_categorie: 'légume-fruit',
    cycle_jours: 50,
    zones_adaptees: 'moramanga',
    altitude_min_m: 0,
    altitude_max_m: 900,
    tolerance_secheresse: 'faible',
    besoin_eau: 'moyen',
    temperature_optimale_c: '24-30',
    type_sol_prefere: 'limoneux, riche, bien drainé',
    couleur_badge: '#26A69A',
    priorite_ecole: 13,
    rendement_ref_kg_m2: 5.0,
    condition_eau: 'suffisant',
    notes: `Réservé au Site D (eau disponible). Cycle court 50 jours = rotations rapides. Conduire sur treillage vertical pour économiser l'espace.`,
    fertilisation: { apport_fumier_t_ha: 20, moment_apport: 'avant semis', complement: 'Arrosage régulier quotidien — sensible au stress hydrique' },
    stades: [
      { nom: 'Levée', j_debut: 0, j_fin: 7, alerte: false },
      { nom: 'Croissance', j_debut: 7, j_fin: 30, alerte: false },
      { nom: 'Floraison', j_debut: 30, j_fin: 38, alerte: false },
      { nom: 'Récolte', j_debut: 38, j_fin: 50, alerte: true, consigne: 'Récolter tous les 2 jours — un fruit trop gros et jaune bloque la production des suivants.' },
    ],
  },
];

// ─────────────────────────────────────────────
// OBJECTIFS PAR DÉFAUT DES 4 SITES
// ─────────────────────────────────────────────

export const OBJECTIFS_SITES_DEFAULT = [
  { site_id: 1, nb_personnes_menage: 4, nb_ouvriers: 3, nb_eleves_ecole: 200, frequence_ecole: 'quotidien', besoin_legumes_g_par_personne: 150, niveau_eau: 'inconnu', notes: 'Puits en projet. Cultures eau-tolérantes prioritaires.' },
  { site_id: 2, nb_personnes_menage: 2, nb_ouvriers: 2, nb_eleves_ecole: 200, frequence_ecole: 'quotidien', besoin_legumes_g_par_personne: 150, niveau_eau: 'inconnu', notes: 'Petit site 1000m². Focus cultures à cycle court.' },
  { site_id: 3, nb_personnes_menage: 2, nb_ouvriers: 2, nb_eleves_ecole: 200, frequence_ecole: 'quotidien', besoin_legumes_g_par_personne: 150, niveau_eau: 'inconnu', notes: 'Altitude 1400m — chou et pomme de terre en priorité.' },
  { site_id: 4, nb_personnes_menage: 2, nb_ouvriers: 4, nb_eleves_ecole: 200, frequence_ecole: 'quotidien', besoin_legumes_g_par_personne: 150, niveau_eau: 'suffisant', notes: 'Bassin existant. Gingembre + cultures tropicales. Site prioritaire maraîchage.' },
];

// ─────────────────────────────────────────────
// SEED — Fonction appelée depuis App.js
// ─────────────────────────────────────────────

export function seedMaraicher() {

  // ── 2. Migrations colonnes EN PREMIER ──
  const colonnesAjouter = [
    { name: 'categorie', type: 'TEXT' },
    { name: 'couleur_badge', type: 'TEXT' },
    { name: 'besoin_eau', type: 'TEXT' },
    { name: 'temperature_optimale_c', type: 'TEXT' },
    { name: 'rendement_ref_kg_m2', type: 'REAL' },
    { name: 'priorite_ecole', type: 'INTEGER' },
    { name: 'condition_eau', type: 'TEXT' },
    { name: 'sous_categorie', type: 'TEXT' },
  ];
  for (const col of colonnesAjouter) {
    try { db.execSync(`ALTER TABLE cultures ADD COLUMN ${col.name} ${col.type}`); } catch { }
  }

  // ── 3. Insertion cultures maraîchères ──
  const countCultures = db.getFirstSync(`SELECT COUNT(*) as n FROM cultures WHERE categorie = 'maraichage'`);
  if (countCultures?.n === 0) {
    for (const culture of CULTURES_MARAICHERES) {
      const codeAuto = culture.nom_fr
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');

      const result = db.runSync(
        `INSERT INTO cultures (
          code, nom_fr, nom_local, nom_scientifique, famille, type, categorie,
          cycle_jours, zones_adaptees, altitude_min, altitude_max,
          tolerance_secheresse, besoin_eau, temperature_optimale_c,
          type_sol_prefere, couleur_badge, actif,
          rendement_ref_kg_m2, priorite_ecole, condition_eau, notes
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?,?,?)`,
        [
          codeAuto,
          culture.nom_fr, culture.nom_local, culture.nom_scientifique,
          culture.famille, 'maraicher', culture.categorie,
          culture.cycle_jours,
          JSON.stringify(
            Array.isArray(culture.zones_adaptees)
              ? culture.zones_adaptees
              : culture.zones_adaptees.split(',').map(z => z.trim())
          ),
          culture.altitude_min_m, culture.altitude_max_m,
          culture.tolerance_secheresse, culture.besoin_eau,
          culture.temperature_optimale_c, culture.type_sol_prefere,
          culture.couleur_badge,
          culture.rendement_ref_kg_m2 || null,
          culture.priorite_ecole || null,
          culture.condition_eau || null,
          culture.notes,
        ]
      );
      const cultureId = result.lastInsertRowId;

      if (culture.stades) {
        culture.stades.forEach((stade, i) => {
          db.runSync(
            `INSERT INTO stades_phenologiques (culture_id, ordre, code, nom_fr, jour_debut, jour_fin, action_recommandee) VALUES (?,?,?,?,?,?,?)`,
            [cultureId, i + 1, `stade_${i + 1}`, stade.nom, stade.j_debut, stade.j_fin, stade.consigne || null]
          );
        });
      }

      if (culture.fertilisation) {
        db.runSync(
          `INSERT INTO besoins_intrants (culture_id, type_intrant, dose, unite, stade_code, notes) VALUES (?,?,?,?,?,?)`,
          [cultureId, 'fumier_organique', String(culture.fertilisation.apport_fumier_t_ha || 0), 't/ha', 'avant_semis', culture.fertilisation.complement || null]
        );
      }
    }
  }

  // ── 4. Objectifs de production par site ──
  const countObj = db.getFirstSync(`SELECT COUNT(*) as n FROM objectifs_production_site`);
  if (countObj?.n === 0) {
    for (const obj of OBJECTIFS_SITES_DEFAULT) {
      db.runSync(
        `INSERT OR IGNORE INTO objectifs_production_site (site_id, nb_personnes_menage, nb_ouvriers, nb_eleves_ecole, frequence_ecole, besoin_legumes_g_par_personne, niveau_eau, notes) VALUES (?,?,?,?,?,?,?,?)`,
        [obj.site_id, obj.nb_personnes_menage, obj.nb_ouvriers, obj.nb_eleves_ecole, obj.frequence_ecole, obj.besoin_legumes_g_par_personne, obj.niveau_eau, obj.notes]
      );
    }
  }
}