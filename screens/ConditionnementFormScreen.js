// ============================================================
// AgriSuite Madagascar — Phase 3 / Session 5 partie 3 (livraison 1)
// screens/ConditionnementFormScreen.js
//
// Saisie d'un conditionnement final pour un lot (mise en sacs, palettes,
// sachets, étiquetage, stockage).
//
// Champs principaux :
//   - Date conditionnement *
//   - Type emballage * (sac jute / sac kraft / palette / sachet / vrac…)
//   - Unité de taille * (1 kg / 5 kg / 25 kg / 60 kg / autre)
//   - Nombre d'unités *
//   - Poids total auto-calculé (modifiable si emballages mixtes)
//   - Étiquetage recto, verso (libres)
//   - Numérotation série début / fin (optionnel)
//   - Lieu de stockage (optionnel)
//   - Conditions de stockage (T° / HR — JSON dans la base)
//   - Opérateur *
//
// Encart contextuel :
//   - Quantité actuelle du lot (dernière étape post-récolte)
//   - Poids déjà conditionné (somme des conditionnements existants)
//   - Reste à conditionner = qty actuelle - déjà conditionné
//
// Validations :
//   - Poids total > 0
//   - Si poids total > reste à conditionner → alerte (mais pas bloquant
//     car cas légitime : conditionnement mixte, recompte qty, etc.)
//   - Cohérence nb_unités × unité_taille ≈ poids_total (warning si écart > 5%)
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
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
  insertConditionnement,
  getConditionnementsByLot,
  getQuantiteActuelleLot,
} from '../database/exportTrack';
import { getCultureById } from '../database/cropEngine';

// ============================================================
// HELPERS
// ============================================================

const formatKg = (kg) => {
  if (kg == null || isNaN(kg)) return '—';
  if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t`;
  if (kg >= 100) return `${kg.toFixed(0)} kg`;
  return `${kg.toFixed(1)} kg`;
};

const aujourdhui = () => new Date().toISOString().slice(0, 10);

// ============================================================
// CONSTANTES
// ============================================================

const TYPES_EMBALLAGE = [
  { code: 'sac_jute',     label: '🧺 Sac jute',
    description: 'Naturel, respirant — café, cacao, vanille' },
  { code: 'sac_kraft',    label: '📜 Sac kraft / papier',
    description: 'Kraft alimentaire — épices, fruits secs' },
  { code: 'sac_pp',       label: '🛍 Sac polypropylène',
    description: 'Plastique tissé — gingembre, racines' },
  { code: 'sachet',       label: '📦 Sachet (sous vide / scellé)',
    description: 'Petit format vente — vanille gourmet, épices premium' },
  { code: 'palette',      label: '🪵 Palette bois',
    description: 'Conditionnement export, chargement container' },
  { code: 'carton',       label: '📦 Carton',
    description: 'Multi-couches, fruits frais ou semi-séchés' },
  { code: 'vrac',         label: '⚖️ Vrac',
    description: 'Container vrac, gros volume non emballé individuellement' },
  { code: 'autre',        label: '📋 Autre',
    description: 'Conditionnement personnalisé' },
];

const UNITES_TAILLE = [
  { code: '1kg',    label: '1 kg',    poids: 1 },
  { code: '5kg',    label: '5 kg',    poids: 5 },
  { code: '10kg',   label: '10 kg',   poids: 10 },
  { code: '25kg',   label: '25 kg',   poids: 25 },
  { code: '50kg',   label: '50 kg',   poids: 50 },
  { code: '60kg',   label: '60 kg (sac café standard)', poids: 60 },
  { code: '69kg',   label: '69 kg (sac cacao standard)', poids: 69 },
  { code: '100g',   label: '100 g (sachet vente)',      poids: 0.1 },
  { code: '250g',   label: '250 g (sachet vente)',      poids: 0.25 },
  { code: '500g',   label: '500 g',   poids: 0.5 },
  { code: 'autre',  label: 'Autre (saisie libre)',      poids: null },
];

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function ConditionnementFormScreen({ navigation, route }) {
  const lotId = route?.params?.lotId;

  // ---- Référentiels ----
  const [lot, setLot] = useState(null);
  const [culture, setCulture] = useState(null);
  const [quantiteActuelle, setQuantiteActuelle] = useState(0);
  const [dejaConditionne, setDejaConditionne] = useState(0);

  // ---- Champs ----
  const [dateConditionnement, setDateConditionnement] = useState(aujourdhui());
  const [typeEmballage, setTypeEmballage] = useState(null);
  const [uniteTaille, setUniteTaille] = useState(null);
  const [uniteTailleAutre, setUniteTailleAutre] = useState('');
  const [nombreUnites, setNombreUnites] = useState('');
  const [poidsTotal, setPoidsTotal] = useState('');
  const [poidsAutoCalcule, setPoidsAutoCalcule] = useState(true);
  const [etiquetteRecto, setEtiquetteRecto] = useState('');
  const [etiquetteVerso, setEtiquetteVerso] = useState('');
  const [numSerieDebut, setNumSerieDebut] = useState('');
  const [numSerieFin, setNumSerieFin] = useState('');
  const [lieuStockage, setLieuStockage] = useState('');
  const [tempStockage, setTempStockage] = useState('');
  const [hrStockage, setHrStockage] = useState('');
  const [operateur, setOperateur] = useState('');

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

      // Quantité actuelle
      const qte = getQuantiteActuelleLot(lotId);
      setQuantiteActuelle(qte);

      // Total déjà conditionné
      const conds = getConditionnementsByLot(lotId) || [];
      const total = conds.reduce((s, c) => s + (c.poids_total_kg || 0), 0);
      setDejaConditionne(total);

      // Pré-remplit étiquette recto avec le code lot
      if (!etiquetteRecto && l.code_lot) {
        setEtiquetteRecto(l.code_lot);
      }
    } catch (err) {
      console.error('[ConditionnementForm] Erreur chargement :', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lotId, navigation]);

  // ============================================================
  // CALCUL AUTO POIDS TOTAL
  // ============================================================

  // Quand l'utilisateur change unité_taille ou nombre_unités, on recalcule
  // automatiquement le poids total — sauf s'il l'a modifié manuellement.
  useEffect(() => {
    if (!poidsAutoCalcule) return;
    if (!uniteTaille || !nombreUnites) return;

    const uniteInfo = UNITES_TAILLE.find((u) => u.code === uniteTaille);
    let poidsUnitaire = uniteInfo?.poids;

    // Cas "autre" : utiliser la saisie libre
    if (uniteTaille === 'autre' && uniteTailleAutre) {
      const parsed = parseFloat(uniteTailleAutre);
      if (!isNaN(parsed) && parsed > 0) {
        poidsUnitaire = parsed;
      }
    }

    if (poidsUnitaire == null) return;

    const nb = parseInt(nombreUnites, 10);
    if (isNaN(nb) || nb <= 0) return;

    const total = poidsUnitaire * nb;
    setPoidsTotal(total.toFixed(1));
  }, [uniteTaille, uniteTailleAutre, nombreUnites, poidsAutoCalcule]);

  const handlePoidsTotalChange = (v) => {
    setPoidsTotal(v);
    setPoidsAutoCalcule(false);
  };

  const reactiverAutoCalcul = () => {
    setPoidsAutoCalcule(true);
    // Re-déclenche le calcul
    const uniteInfo = UNITES_TAILLE.find((u) => u.code === uniteTaille);
    let poidsUnitaire = uniteInfo?.poids;
    if (uniteTaille === 'autre' && uniteTailleAutre) {
      const parsed = parseFloat(uniteTailleAutre);
      if (!isNaN(parsed) && parsed > 0) poidsUnitaire = parsed;
    }
    if (poidsUnitaire != null) {
      const nb = parseInt(nombreUnites, 10);
      if (!isNaN(nb) && nb > 0) {
        setPoidsTotal((poidsUnitaire * nb).toFixed(1));
      }
    }
  };

  // ============================================================
  // VARIABLES DÉRIVÉES
  // ============================================================

  const typeEmballageInfo = useMemo(() => {
    return TYPES_EMBALLAGE.find((t) => t.code === typeEmballage);
  }, [typeEmballage]);

  const uniteTailleInfo = useMemo(() => {
    return UNITES_TAILLE.find((u) => u.code === uniteTaille);
  }, [uniteTaille]);

  const cultureNom = culture
    ? (culture.nom_fr || culture.nom)
    : `Culture #${lot?.culture_id}`;

  const resteAConditionner = Math.max(0, quantiteActuelle - dejaConditionne);

  const poidsTotalNum = parseFloat(poidsTotal);
  const depasse = !isNaN(poidsTotalNum) && poidsTotalNum > resteAConditionner + 0.01;

  // Cohérence nb × unité ≈ poids total ?
  const incoherence = useMemo(() => {
    if (poidsAutoCalcule) return null;
    const nb = parseInt(nombreUnites, 10);
    const total = parseFloat(poidsTotal);
    if (isNaN(nb) || isNaN(total) || nb <= 0 || total <= 0) return null;

    let poidsUnitaire = uniteTailleInfo?.poids;
    if (uniteTaille === 'autre' && uniteTailleAutre) {
      const parsed = parseFloat(uniteTailleAutre);
      if (!isNaN(parsed) && parsed > 0) poidsUnitaire = parsed;
    }
    if (poidsUnitaire == null) return null;

    const calcule = nb * poidsUnitaire;
    const ecart = Math.abs(total - calcule);
    const ecartPct = (ecart / calcule) * 100;
    if (ecartPct > 5) {
      return {
        calcule,
        saisi: total,
        ecartPct,
      };
    }
    return null;
  }, [poidsAutoCalcule, nombreUnites, poidsTotal, uniteTaille, uniteTailleAutre, uniteTailleInfo]);

  // ============================================================
  // VALIDATION
  // ============================================================

  const valider = () => {
    const errs = {};
    if (!dateConditionnement) errs.dateConditionnement = 'Date requise';
    if (!typeEmballage) errs.typeEmballage = 'Type d\'emballage requis';
    if (!uniteTaille) errs.uniteTaille = 'Unité de taille requise';

    if (uniteTaille === 'autre') {
      const u = parseFloat(uniteTailleAutre);
      if (!uniteTailleAutre || isNaN(u) || u <= 0) {
        errs.uniteTailleAutre = 'Poids unitaire > 0 requis';
      }
    }

    const nb = parseInt(nombreUnites, 10);
    if (!nombreUnites || isNaN(nb) || nb <= 0) {
      errs.nombreUnites = 'Nombre d\'unités > 0 requis';
    }

    const pt = parseFloat(poidsTotal);
    if (!poidsTotal || isNaN(pt) || pt <= 0) {
      errs.poidsTotal = 'Poids total > 0 requis';
    }

    // Validation conditions stockage si saisies
    if (tempStockage && (isNaN(parseFloat(tempStockage)) ||
        parseFloat(tempStockage) < -50 || parseFloat(tempStockage) > 80)) {
      errs.tempStockage = 'Température entre -50 et 80 °C';
    }
    if (hrStockage && (isNaN(parseFloat(hrStockage)) ||
        parseFloat(hrStockage) < 0 || parseFloat(hrStockage) > 100)) {
      errs.hrStockage = 'HR entre 0 et 100 %';
    }

    if (!operateur.trim()) errs.operateur = 'Opérateur requis';

    setErreurs(errs);
    return Object.keys(errs).length === 0;
  };

  // ============================================================
  // SAUVEGARDE
  // ============================================================

  const sauvegarder = () => {
    if (!valider()) {
      Alert.alert(
        'Champs manquants',
        'Vérifie les champs marqués en rouge avant de continuer.'
      );
      return;
    }

    // Avertissement si dépassement
    if (depasse) {
      Alert.alert(
        '⚠️ Poids supérieur au reste à conditionner',
        `Tu vas conditionner ${formatKg(parseFloat(poidsTotal))} mais il ` +
        `ne reste que ${formatKg(resteAConditionner)} dans le lot.\n\n` +
        `Cas possibles :\n` +
        `• Recompte de la quantité réelle\n` +
        `• Ajout de matière (rare)\n` +
        `• Erreur de saisie\n\n` +
        `Confirmer quand même ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Confirmer', onPress: () => commitSauvegarde() },
        ]
      );
      return;
    }

    commitSauvegarde();
  };

  const commitSauvegarde = () => {
    setEnCours(true);

    try {
      // Construction des conditions de stockage en JSON
      const conditionsStockage = {};
      if (tempStockage) conditionsStockage.temperature_c = parseFloat(tempStockage);
      if (hrStockage) conditionsStockage.humidite_relative_pct = parseFloat(hrStockage);

      // Détermination de l'unité de taille finale
      let uniteTailleFinal = uniteTailleInfo?.label || uniteTaille;
      if (uniteTaille === 'autre' && uniteTailleAutre) {
        uniteTailleFinal = `${uniteTailleAutre} kg`;
      }

      const payload = {
        lot_id: lotId,
        date_conditionnement: dateConditionnement,
        type_emballage: typeEmballageInfo?.label || typeEmballage,
        unite_taille: uniteTailleFinal,
        nombre_unites: parseInt(nombreUnites, 10),
        poids_total_kg: parseFloat(poidsTotal),
        etiquette_recto: etiquetteRecto.trim() || null,
        etiquette_verso: etiquetteVerso.trim() || null,
        numero_serie_debut: numSerieDebut.trim() || null,
        numero_serie_fin: numSerieFin.trim() || null,
        lieu_stockage: lieuStockage.trim() || null,
        conditions_stockage: Object.keys(conditionsStockage).length > 0
          ? conditionsStockage : null,
        operateur: operateur.trim(),
      };

      const nouveauId = insertConditionnement(payload);
      setEnCours(false);

      Alert.alert(
        '✅ Conditionnement enregistré',
        `${nombreUnites} × ${uniteTailleFinal} ${typeEmballageInfo?.label || ''}\n` +
        `Poids total : ${formatKg(parseFloat(poidsTotal))}\n` +
        `Reste à conditionner après : ${formatKg(resteAConditionner - parseFloat(poidsTotal))}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      setEnCours(false);
      console.error('[ConditionnementForm] Erreur sauvegarde :', err);
      Alert.alert(
        'Erreur lors de l\'enregistrement',
        err.message || 'Impossible d\'enregistrer le conditionnement.'
      );
    }
  };

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
          <Text style={styles.headerTitre}>Nouveau conditionnement</Text>
          <Text style={styles.headerSousTitre}>
            Lot {lot.code_lot} · {cultureNom}
          </Text>
        </View>

        {/* Encart contextuel quantités */}
        <View style={styles.cardContext}>
          <View style={styles.contextLigne}>
            <Text style={styles.contextLabel}>Quantité actuelle</Text>
            <Text style={styles.contextValeur}>{formatKg(quantiteActuelle)}</Text>
          </View>
          <View style={styles.contextSep} />
          <View style={styles.contextLigne}>
            <Text style={styles.contextLabel}>Déjà conditionné</Text>
            <Text style={styles.contextValeur}>{formatKg(dejaConditionne)}</Text>
          </View>
          <View style={styles.contextSep} />
          <View style={styles.contextLigne}>
            <Text style={styles.contextLabel}>Reste</Text>
            <Text style={[styles.contextValeur, styles.contextValeurFort]}>
              {formatKg(resteAConditionner)}
            </Text>
          </View>
        </View>

        {/* Date */}
        <Section titre="Date">
          <Champ label="Date de conditionnement *" erreur={erreurs.dateConditionnement}>
            <TextInput
              style={styles.input}
              value={dateConditionnement}
              onChangeText={setDateConditionnement}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#5a6a5a"
              keyboardType="numbers-and-punctuation"
            />
          </Champ>
        </Section>

        {/* Emballage */}
        <Section titre="Emballage">
          <Champ label="Type d'emballage *" erreur={erreurs.typeEmballage}>
            <Selecteur
              valeur={typeEmballageInfo?.label}
              placeholder="Choisir un type"
              onPress={() => setModalOuvert('type_emballage')}
            />
            {typeEmballageInfo?.description && (
              <Text style={styles.hint}>{typeEmballageInfo.description}</Text>
            )}
          </Champ>

          <Champ label="Unité de taille *" erreur={erreurs.uniteTaille}>
            <Selecteur
              valeur={uniteTailleInfo?.label}
              placeholder="Choisir une taille"
              onPress={() => setModalOuvert('unite_taille')}
            />
          </Champ>

          {uniteTaille === 'autre' && (
            <Champ label="Poids unitaire (kg) *" erreur={erreurs.uniteTailleAutre}>
              <View style={styles.inputAvecUnite}>
                <TextInput
                  style={styles.inputQte}
                  value={uniteTailleAutre}
                  onChangeText={setUniteTailleAutre}
                  placeholder="0"
                  placeholderTextColor="#5a6a5a"
                  keyboardType="decimal-pad"
                />
                <Text style={styles.inputUnite}>kg</Text>
              </View>
            </Champ>
          )}

          <Champ label="Nombre d'unités *" erreur={erreurs.nombreUnites}>
            <TextInput
              style={styles.input}
              value={nombreUnites}
              onChangeText={setNombreUnites}
              placeholder="Ex: 50 sacs"
              placeholderTextColor="#5a6a5a"
              keyboardType="number-pad"
            />
          </Champ>
        </Section>

        {/* Poids total */}
        <Section titre="Poids total">
          <Champ label="Poids total (kg) *" erreur={erreurs.poidsTotal}>
            <View style={styles.inputAvecUnite}>
              <TextInput
                style={styles.inputPoidsTotal}
                value={poidsTotal}
                onChangeText={handlePoidsTotalChange}
                placeholder="0"
                placeholderTextColor="#5a6a5a"
                keyboardType="decimal-pad"
              />
              <Text style={styles.inputUnite}>kg</Text>
            </View>

            {poidsAutoCalcule && uniteTaille && nombreUnites && (
              <Text style={styles.hint}>
                Calculé automatiquement : nombre d'unités × poids unitaire
              </Text>
            )}

            {!poidsAutoCalcule && (
              <TouchableOpacity onPress={reactiverAutoCalcul}>
                <Text style={styles.linkInline}>
                  ↺ Réactiver le calcul automatique
                </Text>
              </TouchableOpacity>
            )}
          </Champ>

          {/* Alerte dépassement */}
          {depasse && (
            <View style={styles.alerteRouge}>
              <Text style={styles.alerteRougeTexte}>
                ⚠️ Le poids saisi ({formatKg(parseFloat(poidsTotal))}) dépasse
                le reste à conditionner ({formatKg(resteAConditionner)}).{'\n'}
                Tu pourras quand même valider, mais une confirmation sera demandée.
              </Text>
            </View>
          )}

          {/* Alerte incohérence */}
          {incoherence && (
            <View style={styles.alerteJaune}>
              <Text style={styles.alerteJauneTexte}>
                ⚠️ Cohérence à vérifier :{'\n'}
                {nombreUnites} × {uniteTailleInfo?.label || uniteTailleAutre + ' kg'} = {formatKg(incoherence.calcule)}{'\n'}
                Saisi : {formatKg(incoherence.saisi)} (écart {incoherence.ecartPct.toFixed(1)}%)
              </Text>
            </View>
          )}
        </Section>

        {/* Étiquetage */}
        <Section titre="Étiquetage">
          <Champ label="Étiquette recto">
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={etiquetteRecto}
              onChangeText={setEtiquetteRecto}
              placeholder={`Ex: ${lot.code_lot} | Vanille MDG black | 25 kg | BIO`}
              placeholderTextColor="#5a6a5a"
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />
            <Text style={styles.hint}>
              Pré-rempli avec le code lot. Modifie selon ton template.
            </Text>
          </Champ>

          <Champ label="Étiquette verso">
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={etiquetteVerso}
              onChangeText={setEtiquetteVerso}
              placeholder="Ex: traçabilité, certifications, conditions, contact..."
              placeholderTextColor="#5a6a5a"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </Champ>

          <View style={styles.serieRow}>
            <Champ label="N° série début" style={{ flex: 1 }}>
              <TextInput
                style={styles.input}
                value={numSerieDebut}
                onChangeText={setNumSerieDebut}
                placeholder="Ex: 0001"
                placeholderTextColor="#5a6a5a"
              />
            </Champ>
            <View style={{ width: 10 }} />
            <Champ label="N° série fin" style={{ flex: 1 }}>
              <TextInput
                style={styles.input}
                value={numSerieFin}
                onChangeText={setNumSerieFin}
                placeholder="Ex: 0050"
                placeholderTextColor="#5a6a5a"
              />
            </Champ>
          </View>
          <Text style={styles.hint}>
            Plage de numéros sur les unités physiques (sacs, sachets...). Optionnel
            mais utile pour le suivi rappel produit.
          </Text>
        </Section>

        {/* Stockage */}
        <Section titre="Stockage (optionnel)">
          <Champ label="Lieu de stockage">
            <TextInput
              style={styles.input}
              value={lieuStockage}
              onChangeText={setLieuStockage}
              placeholder="Ex: Hangar A1, Sambava — étage 2"
              placeholderTextColor="#5a6a5a"
            />
          </Champ>

          <View style={styles.gpsRow}>
            <Champ label="Température (°C)" erreur={erreurs.tempStockage} style={{ flex: 1 }}>
              <View style={styles.inputAvecUnite}>
                <TextInput
                  style={styles.inputQte}
                  value={tempStockage}
                  onChangeText={setTempStockage}
                  placeholder="20"
                  placeholderTextColor="#5a6a5a"
                  keyboardType="decimal-pad"
                />
                <Text style={styles.inputUnite}>°C</Text>
              </View>
            </Champ>
            <View style={{ width: 10 }} />
            <Champ label="Humidité relative" erreur={erreurs.hrStockage} style={{ flex: 1 }}>
              <View style={styles.inputAvecUnite}>
                <TextInput
                  style={styles.inputQte}
                  value={hrStockage}
                  onChangeText={setHrStockage}
                  placeholder="60"
                  placeholderTextColor="#5a6a5a"
                  keyboardType="decimal-pad"
                />
                <Text style={styles.inputUnite}>%</Text>
              </View>
            </Champ>
          </View>
          <Text style={styles.hint}>
            HACCP : stockage typique export — T° &lt; 25 °C, HR &lt; 65%.
          </Text>
        </Section>

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
              {enCours ? 'Enregistrement…' : '+ Enregistrer le conditionnement'}
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
        onSelectTypeEmballage={(c) => { setTypeEmballage(c); setModalOuvert(null); }}
        onSelectUniteTaille={(c) => { setUniteTaille(c); setModalOuvert(null); }}
      />
    </KeyboardAvoidingView>
  );
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

function Champ({ label, erreur, children, style }) {
  return (
    <View style={[styles.champ, style]}>
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
  onSelectTypeEmballage, onSelectUniteTaille,
}) {
  let titre = '';
  let items = [];
  let onSelect = () => {};

  if (type === 'type_emballage') {
    titre = 'Type d\'emballage';
    items = TYPES_EMBALLAGE.map((t) => ({
      id: t.code,
      label: t.label,
      sub: t.description,
    }));
    onSelect = onSelectTypeEmballage;
  } else if (type === 'unite_taille') {
    titre = 'Unité de taille';
    items = UNITES_TAILLE.map((u) => ({
      id: u.code,
      label: u.label,
      sub: u.poids != null ? `${u.poids} kg/unité` : null,
    }));
    onSelect = onSelectUniteTaille;
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

  // Encart contextuel
  cardContext: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 12,
  },
  contextLigne: {
    flex: 1,
    alignItems: 'center',
  },
  contextSep: {
    width: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  contextLabel: {
    color: COLORS.texteSecond,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  contextValeur: {
    color: COLORS.texteDoux,
    fontSize: 14,
    fontWeight: '700',
  },
  contextValeurFort: {
    color: COLORS.vertClair,
    fontSize: 16,
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
    minHeight: 60,
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
  inputPoidsTotal: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: COLORS.texteDoux,
    fontSize: 22,
    fontWeight: 'bold',
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

  linkInline: {
    color: COLORS.ambre,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
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

  // Alertes
  alerteRouge: {
    backgroundColor: '#3a1a1a',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.rouge,
  },
  alerteRougeTexte: {
    color: COLORS.rouge,
    fontSize: 11,
    lineHeight: 16,
  },
  alerteJaune: {
    backgroundColor: '#2a2a14',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.jaune,
  },
  alerteJauneTexte: {
    color: COLORS.jaune,
    fontSize: 11,
    lineHeight: 16,
  },

  // Lignes 2 colonnes
  serieRow: { flexDirection: 'row' },
  gpsRow: { flexDirection: 'row' },

  // Actions
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

  // Modal
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