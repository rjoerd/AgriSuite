// ============================================================
// AgriSuite Madagascar — Phase 3 / Session 5 partie 2
// screens/EtapeFormScreen.js
//
// Saisie d'une étape post-récolte (tri, séchage, calibrage, fermentation,
// échaudage, décorticage, torréfaction, broyage, autre).
//
// Champs génériques toujours présents :
//   - Type d'étape *
//   - Date de début *, date de fin (optionnel)
//   - Quantité entrée (kg) *, quantité sortie (kg)
//   - Opérateur *
//   - Notes (libre)
//
// Champs spécifiques selon type :
//   - Tri        → % rebut, raison du rebut
//   - Séchage    → température cible (°C), durée (h), humidité finale (%)
//   - Calibrage  → critère (taille/poids/couleur), nb calibres
//   - Autres     → champ libre "paramètres" en fallback
//
// Calcul auto :
//   - Si qty entrée ET qty sortie renseignées → perte_kg + taux_perte_pct
//
// Navigation :
//   - navigation.navigate('EtapeForm', { lotId: 5 })  // créer
//   - navigation.navigate('EtapeForm', { etapeId: 12 }) // édition (à venir)
// ============================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import {
  getLotById,
  insertEtape,
  getProchainOrdreEtape,
  getQuantiteActuelleLot,
} from '../database/exportTrack';
import { getCultureById } from '../database/cropEngine';

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

const aujourdhui = () => new Date().toISOString().slice(0, 10);

const TYPES_ETAPE = [
  {
    code: 'tri',
    label: '🌾 Tri',
    description: 'Élimination des impuretés et défauts',
  },
  {
    code: 'sechage',
    label: '☀️ Séchage',
    description: 'Réduction d\'humidité (solaire ou mécanique)',
  },
  {
    code: 'calibrage',
    label: '⚖️ Calibrage',
    description: 'Classement par taille, poids ou couleur',
  },
  {
    code: 'fermentation',
    label: '🧪 Fermentation',
    description: 'Transformation enzymatique (cacao, vanille)',
  },
  {
    code: 'echaudage',
    label: '♨️ Échaudage',
    description: 'Vanille verte plongée dans eau chaude',
  },
  {
    code: 'decorticage',
    label: '🥥 Décorticage',
    description: 'Retrait de coque/pulpe (café, cacao)',
  },
  {
    code: 'torrefaction',
    label: '☕ Torréfaction',
    description: 'Cuisson aromatique (café, cacao)',
  },
  {
    code: 'broyage',
    label: '🌀 Broyage',
    description: 'Réduction en poudre/morceaux',
  },
  {
    code: 'autre',
    label: '⚙️ Autre',
    description: 'Étape personnalisée',
  },
];

const RAISONS_REBUT = [
  { code: 'qualite',  label: 'Qualité visuelle' },
  { code: 'taille',   label: 'Taille hors gabarit' },
  { code: 'moisi',    label: 'Moisi / fermenté' },
  { code: 'casse',    label: 'Cassé / fragmenté' },
  { code: 'germe',    label: 'Germé' },
  { code: 'corps_etranger', label: 'Corps étrangers' },
  { code: 'mixte',    label: 'Mixte / multiple' },
];

const CRITERES_CALIBRAGE = [
  { code: 'taille',   label: '📏 Taille' },
  { code: 'poids',    label: '⚖️ Poids' },
  { code: 'couleur',  label: '🎨 Couleur' },
  { code: 'mixte',    label: '🔀 Mixte' },
];

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function EtapeFormScreen({ navigation, route }) {
  const lotId = route?.params?.lotId;

  // ---- Référentiels ----
  const [lot, setLot] = useState(null);
  const [culture, setCulture] = useState(null);
  const [quantiteActuelle, setQuantiteActuelle] = useState(0);
  const [prochainOrdre, setProchainOrdre] = useState(1);

  // ---- Champs génériques ----
  const [typeEtape, setTypeEtape] = useState(null);
  const [dateDebut, setDateDebut] = useState(aujourdhui());
  const [dateFin, setDateFin] = useState('');
  const [qteEntree, setQteEntree] = useState('');
  const [qteSortie, setQteSortie] = useState('');
  const [operateur, setOperateur] = useState('');
  const [notes, setNotes] = useState('');

  // ---- Champs spécifiques tri ----
  const [pctRebut, setPctRebut] = useState('');
  const [raisonRebut, setRaisonRebut] = useState(null);

  // ---- Champs spécifiques séchage ----
  const [temperature, setTemperature] = useState('');
  const [duree, setDuree] = useState('');
  const [humiditeFinale, setHumiditeFinale] = useState('');

  // ---- Champs spécifiques calibrage ----
  const [critereCalibrage, setCritereCalibrage] = useState(null);
  const [nbCalibres, setNbCalibres] = useState('');

  // ---- Champ libre fallback ----
  const [parametresLibres, setParametresLibres] = useState('');

  // ---- État UI ----
  const [enCours, setEnCours] = useState(false);
  const [erreurs, setErreurs] = useState({});
  const [modalOuvert, setModalOuvert] = useState(null);

  // ============================================================
  // CHARGEMENT
  // ============================================================

  useEffect(() => {
    try {
      const l = getLotById(lotId);
      if (!l) {
        Alert.alert(
          'Lot introuvable',
          'Ce lot n\'existe pas ou a été supprimé.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }
      setLot(l);

      try { setCulture(getCultureById(l.culture_id)); } catch (e) {}

      const qte = getQuantiteActuelleLot(lotId);
      setQuantiteActuelle(qte);
      // Pré-remplit la qty entrée avec la qty actuelle du lot
      if (qte > 0 && !qteEntree) {
        setQteEntree(String(qte.toFixed(1)));
      }

      setProchainOrdre(getProchainOrdreEtape(lotId));
    } catch (err) {
      console.error('[EtapeForm] Erreur chargement :', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lotId, navigation]);

  // ============================================================
  // CALCULS DÉRIVÉS
  // ============================================================

  // Perte calculée auto à partir entrée + sortie
  const calcPerte = useMemo(() => {
    const entree = parseFloat(qteEntree);
    const sortie = parseFloat(qteSortie);
    if (isNaN(entree) || isNaN(sortie) || entree <= 0) return null;
    if (sortie > entree) return null; // incohérent
    const perte = entree - sortie;
    const taux = (perte / entree) * 100;
    return { perte, taux };
  }, [qteEntree, qteSortie]);

  const typeEtapeInfo = useMemo(() => {
    return TYPES_ETAPE.find((t) => t.code === typeEtape);
  }, [typeEtape]);

  // ============================================================
  // VALIDATION
  // ============================================================

  const valider = () => {
    const errs = {};

    if (!typeEtape) errs.typeEtape = 'Type d\'étape requis';
    if (!dateDebut) errs.dateDebut = 'Date de début requise';
    if (dateFin && dateDebut && new Date(dateFin) < new Date(dateDebut)) {
      errs.dateFin = 'Date de fin antérieure à date de début';
    }

    const entree = parseFloat(qteEntree);
    if (!qteEntree || isNaN(entree) || entree <= 0) {
      errs.qteEntree = 'Quantité entrée > 0 requise';
    }

    const sortie = parseFloat(qteSortie);
    if (qteSortie && (isNaN(sortie) || sortie < 0)) {
      errs.qteSortie = 'Quantité sortie ≥ 0';
    }
    if (!isNaN(sortie) && !isNaN(entree) && sortie > entree) {
      errs.qteSortie = 'Sortie > entrée impossible';
    }

    if (!operateur.trim()) errs.operateur = 'Identité de l\'opérateur requise';

    // Validations spécifiques
    if (typeEtape === 'sechage') {
      if (temperature && (isNaN(parseFloat(temperature)) ||
          parseFloat(temperature) < 0 || parseFloat(temperature) > 200)) {
        errs.temperature = 'Température entre 0 et 200 °C';
      }
      if (duree && (isNaN(parseFloat(duree)) || parseFloat(duree) < 0)) {
        errs.duree = 'Durée ≥ 0 heures';
      }
      if (humiditeFinale && (isNaN(parseFloat(humiditeFinale)) ||
          parseFloat(humiditeFinale) < 0 || parseFloat(humiditeFinale) > 100)) {
        errs.humiditeFinale = 'Humidité entre 0 et 100 %';
      }
    }

    if (typeEtape === 'tri') {
      if (pctRebut && (isNaN(parseFloat(pctRebut)) ||
          parseFloat(pctRebut) < 0 || parseFloat(pctRebut) > 100)) {
        errs.pctRebut = '% rebut entre 0 et 100';
      }
    }

    if (typeEtape === 'calibrage') {
      if (nbCalibres && (isNaN(parseInt(nbCalibres, 10)) ||
          parseInt(nbCalibres, 10) < 1)) {
        errs.nbCalibres = 'Nombre de calibres ≥ 1';
      }
    }

    setErreurs(errs);
    return Object.keys(errs).length === 0;
  };

  // ============================================================
  // SAUVEGARDE
  // ============================================================

  const sauvegarder = useCallback(() => {
    if (!valider()) {
      Alert.alert(
        'Champs manquants',
        'Vérifie les champs marqués en rouge avant de continuer.'
      );
      return;
    }

    setEnCours(true);

    try {
      // Construction de l'objet "parametres" structuré selon le type
      const parametres = {};

      if (typeEtape === 'tri') {
        if (pctRebut) parametres.pct_rebut = parseFloat(pctRebut);
        if (raisonRebut) parametres.raison_rebut = raisonRebut;
      } else if (typeEtape === 'sechage') {
        if (temperature) parametres.temperature_c = parseFloat(temperature);
        if (duree) parametres.duree_h = parseFloat(duree);
        if (humiditeFinale) parametres.humidite_finale_pct = parseFloat(humiditeFinale);
      } else if (typeEtape === 'calibrage') {
        if (critereCalibrage) parametres.critere = critereCalibrage;
        if (nbCalibres) parametres.nb_calibres = parseInt(nbCalibres, 10);
      } else {
        // Fallback : champ libre
        if (parametresLibres.trim()) {
          parametres.libre = parametresLibres.trim();
        }
      }

      const payload = {
        lot_id: lotId,
        ordre: prochainOrdre,
        type_etape: typeEtape,
        date_debut: dateDebut,
        date_fin: dateFin || null,
        quantite_entree_kg: parseFloat(qteEntree),
        quantite_sortie_kg: qteSortie ? parseFloat(qteSortie) : null,
        // perte_kg + taux_perte_pct sont calculés automatiquement par insertEtape
        parametres: Object.keys(parametres).length > 0 ? parametres : null,
        operateur: operateur.trim(),
        notes: notes.trim() || null,
      };

      const nouveauId = insertEtape(payload);
      setEnCours(false);

      Alert.alert(
        '✅ Étape enregistrée',
        `${typeEtapeInfo?.label || typeEtape} (étape n°${prochainOrdre}) ajoutée au lot ${lot?.code_lot}.\n\n` +
        (calcPerte
          ? `Quantité : ${formatKg(parseFloat(qteEntree))} → ${formatKg(parseFloat(qteSortie))}\n` +
            `Perte : ${formatKg(calcPerte.perte)} (${formatPct(calcPerte.taux)})`
          : `Quantité entrée : ${formatKg(parseFloat(qteEntree))}\n(En cours — pas encore de quantité sortie)`),
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      setEnCours(false);
      console.error('[EtapeForm] Erreur sauvegarde :', err);
      Alert.alert(
        'Erreur lors de l\'enregistrement',
        err.message || 'Impossible d\'enregistrer l\'étape.'
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    lotId, prochainOrdre, typeEtape, dateDebut, dateFin, qteEntree, qteSortie,
    operateur, notes, pctRebut, raisonRebut, temperature, duree, humiditeFinale,
    critereCalibrage, nbCalibres, parametresLibres, calcPerte, lot, typeEtapeInfo,
    navigation,
  ]);

  // ============================================================
  // RENDER
  // ============================================================

  if (!lot) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0d1a0d" />
        <View style={styles.loadingBox}>
          <Text style={styles.loadingTexte}>Chargement…</Text>
        </View>
      </View>
    );
  }

  const cultureNom = culture ? (culture.nom_fr || culture.nom) : `Culture #${lot.culture_id}`;
  const raisonRebutLabel = RAISONS_REBUT.find((r) => r.code === raisonRebut)?.label;
  const critereCalibrageLabel = CRITERES_CALIBRAGE.find((c) => c.code === critereCalibrage)?.label;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0d1a0d" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* En-tête */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.btnRetour}>‹ Retour</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitre}>Nouvelle étape post-récolte</Text>
          <Text style={styles.headerSousTitre}>
            Lot {lot.code_lot} · {cultureNom}
          </Text>
        </View>

        {/* Contexte lot */}
        <View style={styles.cardContext}>
          <View style={styles.contextLigne}>
            <Text style={styles.contextLabel}>Quantité actuelle</Text>
            <Text style={styles.contextValeur}>{formatKg(quantiteActuelle)}</Text>
          </View>
          <View style={styles.contextLigne}>
            <Text style={styles.contextLabel}>Étape n°</Text>
            <Text style={styles.contextValeur}>{prochainOrdre}</Text>
          </View>
        </View>

        {/* Type d'étape */}
        <Section titre="Type d'étape">
          <Champ label="Type *" erreur={erreurs.typeEtape}>
            <Selecteur
              valeur={typeEtapeInfo?.label}
              placeholder="Choisir un type d'étape"
              onPress={() => setModalOuvert('type')}
            />
            {typeEtapeInfo?.description && (
              <Text style={styles.hint}>{typeEtapeInfo.description}</Text>
            )}
          </Champ>
        </Section>

        {/* Dates */}
        <Section titre="Dates">
          <Champ label="Date de début *" erreur={erreurs.dateDebut}>
            <TextInput
              style={styles.input}
              value={dateDebut}
              onChangeText={setDateDebut}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#5a6a5a"
              keyboardType="numbers-and-punctuation"
            />
          </Champ>
          <Champ label="Date de fin (laisser vide si en cours)" erreur={erreurs.dateFin}>
            <TextInput
              style={styles.input}
              value={dateFin}
              onChangeText={setDateFin}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#5a6a5a"
              keyboardType="numbers-and-punctuation"
            />
          </Champ>
        </Section>

        {/* Quantités */}
        <Section titre="Quantités">
          <Champ label="Quantité entrée (kg) *" erreur={erreurs.qteEntree}>
            <View style={styles.inputAvecUnite}>
              <TextInput
                style={styles.inputQte}
                value={qteEntree}
                onChangeText={setQteEntree}
                placeholder="0"
                placeholderTextColor="#5a6a5a"
                keyboardType="decimal-pad"
              />
              <Text style={styles.inputUnite}>kg</Text>
            </View>
            <Text style={styles.hint}>
              Pré-rempli avec la quantité actuelle du lot. Modifiable si besoin.
            </Text>
          </Champ>

          <Champ label="Quantité sortie (kg)" erreur={erreurs.qteSortie}>
            <View style={styles.inputAvecUnite}>
              <TextInput
                style={styles.inputQte}
                value={qteSortie}
                onChangeText={setQteSortie}
                placeholder="0 (laisser vide si en cours)"
                placeholderTextColor="#5a6a5a"
                keyboardType="decimal-pad"
              />
              <Text style={styles.inputUnite}>kg</Text>
            </View>
          </Champ>

          {/* Perte calculée auto */}
          {calcPerte && (
            <View style={styles.perteBox}>
              <View style={styles.perteLigne}>
                <Text style={styles.perteLabel}>Perte calculée</Text>
                <Text style={styles.perteValeur}>
                  -{formatKg(calcPerte.perte)} ({formatPct(calcPerte.taux)})
                </Text>
              </View>
            </View>
          )}
        </Section>

        {/* Champs spécifiques selon type */}
        {typeEtape === 'tri' && (
          <Section titre="Paramètres tri">
            <Champ label="% rebut écarté" erreur={erreurs.pctRebut}>
              <View style={styles.inputAvecUnite}>
                <TextInput
                  style={styles.inputQte}
                  value={pctRebut}
                  onChangeText={setPctRebut}
                  placeholder="ex: 8.5"
                  placeholderTextColor="#5a6a5a"
                  keyboardType="decimal-pad"
                />
                <Text style={styles.inputUnite}>%</Text>
              </View>
              <Text style={styles.hint}>
                Pourcentage du lot écarté pour qualité insuffisante.
              </Text>
            </Champ>

            <Champ label="Raison principale du rebut">
              <Selecteur
                valeur={raisonRebutLabel}
                placeholder="Choisir une raison"
                onPress={() => setModalOuvert('raison_rebut')}
              />
            </Champ>
          </Section>
        )}

        {typeEtape === 'sechage' && (
          <Section titre="Paramètres séchage">
            <Champ label="Température cible (°C)" erreur={erreurs.temperature}>
              <View style={styles.inputAvecUnite}>
                <TextInput
                  style={styles.inputQte}
                  value={temperature}
                  onChangeText={setTemperature}
                  placeholder="ex: 50"
                  placeholderTextColor="#5a6a5a"
                  keyboardType="decimal-pad"
                />
                <Text style={styles.inputUnite}>°C</Text>
              </View>
              <Text style={styles.hint}>
                Vanille : 50-60 °C. Cacao : 35-45 °C. Gingembre : 50-55 °C.
              </Text>
            </Champ>

            <Champ label="Durée (heures)" erreur={erreurs.duree}>
              <View style={styles.inputAvecUnite}>
                <TextInput
                  style={styles.inputQte}
                  value={duree}
                  onChangeText={setDuree}
                  placeholder="ex: 48"
                  placeholderTextColor="#5a6a5a"
                  keyboardType="decimal-pad"
                />
                <Text style={styles.inputUnite}>h</Text>
              </View>
            </Champ>

            <Champ label="Humidité finale visée (%)" erreur={erreurs.humiditeFinale}>
              <View style={styles.inputAvecUnite}>
                <TextInput
                  style={styles.inputQte}
                  value={humiditeFinale}
                  onChangeText={setHumiditeFinale}
                  placeholder="ex: 25"
                  placeholderTextColor="#5a6a5a"
                  keyboardType="decimal-pad"
                />
                <Text style={styles.inputUnite}>%</Text>
              </View>
              <Text style={styles.hint}>
                Critique CCP HACCP. Vérifie via analyse qualité (humidité).
              </Text>
            </Champ>
          </Section>
        )}

        {typeEtape === 'calibrage' && (
          <Section titre="Paramètres calibrage">
            <Champ label="Critère principal">
              <Selecteur
                valeur={critereCalibrageLabel}
                placeholder="Choisir un critère"
                onPress={() => setModalOuvert('critere_calibrage')}
              />
            </Champ>

            <Champ label="Nombre de calibres obtenus" erreur={erreurs.nbCalibres}>
              <TextInput
                style={styles.input}
                value={nbCalibres}
                onChangeText={setNbCalibres}
                placeholder="ex: 3 (gros / moyen / petit)"
                placeholderTextColor="#5a6a5a"
                keyboardType="number-pad"
              />
            </Champ>
          </Section>
        )}

        {/* Champ libre fallback pour les autres types */}
        {typeEtape && !['tri', 'sechage', 'calibrage'].includes(typeEtape) && (
          <Section titre="Paramètres techniques">
            <Champ label="Paramètres (libre)">
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={parametresLibres}
                onChangeText={setParametresLibres}
                placeholder={getPlaceholderParametres(typeEtape)}
                placeholderTextColor="#5a6a5a"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <Text style={styles.hint}>
                {getHintParametres(typeEtape)}
              </Text>
            </Champ>
          </Section>
        )}

        {/* Validation */}
        <Section titre="Validation">
          <Champ label="Opérateur *" erreur={erreurs.operateur}>
            <TextInput
              style={styles.input}
              value={operateur}
              onChangeText={setOperateur}
              placeholder="Nom de la personne en charge"
              placeholderTextColor="#5a6a5a"
              autoCapitalize="words"
            />
          </Champ>
          <Champ label="Notes (optionnel)">
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Observations, conditions particulières..."
              placeholderTextColor="#5a6a5a"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </Champ>
        </Section>

        {/* Boutons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.btnAnnuler}
            onPress={() => navigation.goBack()}
            disabled={enCours}
          >
            <Text style={styles.btnAnnulerTexte}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnPrincipal, enCours && styles.btnDisabled]}
            onPress={sauvegarder}
            disabled={enCours}
          >
            <Text style={styles.btnPrincipalTexte}>
              {enCours ? 'Enregistrement…' : '+ Enregistrer l\'étape'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Modaux */}
      <ModalSelection
        visible={modalOuvert !== null}
        onClose={() => setModalOuvert(null)}
        type={modalOuvert}
        onSelectType={(c) => { setTypeEtape(c); setModalOuvert(null); }}
        onSelectRaisonRebut={(c) => { setRaisonRebut(c); setModalOuvert(null); }}
        onSelectCritereCalibrage={(c) => { setCritereCalibrage(c); setModalOuvert(null); }}
      />
    </KeyboardAvoidingView>
  );
}

// ============================================================
// HELPERS RENDU
// ============================================================

function getPlaceholderParametres(typeEtape) {
  switch (typeEtape) {
    case 'fermentation':
      return 'Ex: Fermentation 6 jours, 3 retournements, T° centrale 48 °C max';
    case 'echaudage':
      return 'Ex: Eau 65 °C, 3 minutes, 50 kg vanille verte par bain';
    case 'decorticage':
      return 'Ex: Voie humide, parche retirée à la machine';
    case 'torrefaction':
      return 'Ex: 210 °C, 14 min, profil light medium';
    case 'broyage':
      return 'Ex: Granulométrie 2 mm, broyeur à marteaux';
    default:
      return 'Décris les paramètres techniques de cette étape...';
  }
}

function getHintParametres(typeEtape) {
  switch (typeEtape) {
    case 'fermentation':
      return 'Critique pour cacao (5-7 j) et vanille (étuvage en malle).';
    case 'echaudage':
      return 'Étape clé pour la vanille — déclenche la fermentation enzymatique.';
    case 'decorticage':
      return 'Paramètres voie humide vs sèche, type de machine.';
    case 'torrefaction':
      return 'Profil temps/température détermine le goût final.';
    case 'broyage':
      return 'Granulométrie, type de broyeur.';
    default:
      return 'Détails techniques pour traçabilité.';
  }
}

// ============================================================
// SOUS-COMPOSANTS
// ============================================================

function Section({ titre, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitre}>{titre}</Text>
      {children}
    </View>
  );
}

function Champ({ label, erreur, children }) {
  return (
    <View style={styles.champ}>
      <Text style={styles.champLabel}>{label}</Text>
      {children}
      {erreur ? <Text style={styles.champErreur}>⚠ {erreur}</Text> : null}
    </View>
  );
}

function Selecteur({ valeur, placeholder, onPress }) {
  return (
    <TouchableOpacity
      style={styles.selecteur}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.selecteurValeur,
        !valeur && styles.selecteurPlaceholder,
      ]}>
        {valeur || placeholder}
      </Text>
      <Text style={styles.selecteurChevron}>›</Text>
    </TouchableOpacity>
  );
}

function ModalSelection({
  visible, onClose, type,
  onSelectType, onSelectRaisonRebut, onSelectCritereCalibrage,
}) {
  let titre = '';
  let items = [];
  let onSelect = () => {};

  if (type === 'type') {
    titre = 'Type d\'étape';
    items = TYPES_ETAPE.map((t) => ({
      id: t.code,
      label: t.label,
      sub: t.description,
    }));
    onSelect = onSelectType;
  } else if (type === 'raison_rebut') {
    titre = 'Raison du rebut';
    items = RAISONS_REBUT.map((r) => ({ id: r.code, label: r.label }));
    onSelect = onSelectRaisonRebut;
  } else if (type === 'critere_calibrage') {
    titre = 'Critère de calibrage';
    items = CRITERES_CALIBRAGE.map((c) => ({ id: c.code, label: c.label }));
    onSelect = onSelectCritereCalibrage;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitre}>{titre}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalFermer}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalListe}>
            {items.map((it) => (
              <TouchableOpacity
                key={String(it.id)}
                style={styles.modalItem}
                onPress={() => onSelect(it.id)}
              >
                <Text style={styles.modalItemLabel}>{it.label}</Text>
                {it.sub ? (
                  <Text style={styles.modalItemSub}>{it.sub}</Text>
                ) : null}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================
// STYLES
// ============================================================

const COLORS = {
  bgDark: '#0d1a0d',
  bgCard: '#1a2e1a',
  bgInput: '#0f1f0f',
  border: '#2d4a2d',
  vert: '#7ec87e',
  vertClair: '#a8d9a8',
  ambre: '#d4a04a',
  ambreClair: '#e8be78',
  texteDoux: '#c8d4c8',
  texteSecond: '#8a9a8a',
  texteMute: '#5a6a5a',
  rouge: '#c87e7e',
  jaune: '#d4c47e',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  scrollContent: { padding: 16, paddingBottom: 32 },

  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingTexte: { color: COLORS.texteSecond, fontSize: 14 },

  header: { marginBottom: 12 },
  btnRetour: { color: COLORS.vert, fontSize: 14, marginBottom: 8 },
  headerTitre: { color: COLORS.ambre, fontSize: 22, fontWeight: '700' },
  headerSousTitre: { color: COLORS.texteSecond, fontSize: 13, marginTop: 4 },

  cardContext: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  contextLigne: { alignItems: 'flex-start' },
  contextLabel: {
    color: COLORS.texteSecond,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  contextValeur: {
    color: COLORS.vertClair,
    fontSize: 16,
    fontWeight: '700',
  },

  section: {
    backgroundColor: COLORS.bgCard,
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  sectionTitre: {
    color: COLORS.vertClair,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  champ: { marginBottom: 12 },
  champLabel: {
    color: COLORS.texteDoux,
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '500',
  },
  champErreur: { color: COLORS.rouge, fontSize: 11, marginTop: 4 },

  input: {
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.texteDoux,
    fontSize: 14,
  },
  inputMulti: {
    minHeight: 70,
    textAlignVertical: 'top',
  },

  inputAvecUnite: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  inputQte: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.texteDoux,
    fontSize: 14,
  },
  inputUnite: {
    color: COLORS.ambreClair,
    fontSize: 12,
    fontWeight: '700',
    paddingRight: 12,
  },

  hint: {
    color: COLORS.texteMute,
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },

  selecteur: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selecteurValeur: { flex: 1, color: COLORS.texteDoux, fontSize: 14 },
  selecteurPlaceholder: { color: COLORS.texteMute },
  selecteurChevron: { color: COLORS.texteSecond, fontSize: 20, fontWeight: '300' },

  perteBox: {
    backgroundColor: '#2a1a1a',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.rouge,
    marginTop: 4,
  },
  perteLigne: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  perteLabel: {
    color: COLORS.rouge,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  perteValeur: {
    color: COLORS.rouge,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'monospace',
  },

  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btnAnnuler: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnAnnulerTexte: { color: COLORS.texteSecond, fontSize: 14, fontWeight: '600' },
  btnPrincipal: {
    flex: 2,
    backgroundColor: COLORS.ambre,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnPrincipalTexte: { color: '#0d1a0d', fontSize: 14, fontWeight: '700' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitre: { color: COLORS.ambreClair, fontSize: 16, fontWeight: '700' },
  modalFermer: { color: COLORS.texteSecond, fontSize: 22, paddingHorizontal: 8 },
  modalListe: { paddingVertical: 8 },
  modalItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalItemLabel: { color: COLORS.texteDoux, fontSize: 14, fontWeight: '500' },
  modalItemSub: { color: COLORS.texteSecond, fontSize: 12, marginTop: 3 },
});