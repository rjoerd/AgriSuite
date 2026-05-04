// ============================================================
// AgriSuite Madagascar — Phase 3 / Session 5 partie 2
// screens/AnalyseQualiteFormScreen.js
//
// Saisie d'une analyse qualité (humidité, vanilline, aflatoxines, etc.)
// avec seuils prédéfinis surchargeables.
//
// Workflow :
//   1. Choisir le type d'analyse (humidité, vanilline...)
//   2. L'app pré-remplit les seuils selon (type + culture du lot)
//   3. Saisir la valeur mesurée → conformité auto-calculée
//   4. Si l'acheteur impose plus strict, l'utilisateur peut surcharger
//      les seuils (mention "Seuil personnalisé" ajoutée aux notes)
//
// Sources des seuils par défaut : voir database/qualiteSeuils.js
//
// Champs :
//   - Type d'analyse *
//   - Date de l'analyse *
//   - Laboratoire (optionnel)
//   - Valeur mesurée *
//   - Unité (auto-renseignée)
//   - Seuil min, seuil max (auto-renseignés, surchargeables)
//   - Conformité (auto-calculée, surchargeable)
//   - Référence rapport PDF (optionnel)
//   - Notes
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
  insertAnalyse,
} from '../database/exportTrack';
import { getCultureById } from '../database/cropEngine';
import {
  TYPES_ANALYSE,
  getSeuilPredefini,
  getAnalysesPertinentesPour,
  evaluerConformite,
} from '../database/qualiteSeuils';

// ============================================================
// HELPERS
// ============================================================

const aujourdhui = () => new Date().toISOString().slice(0, 10);

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function AnalyseQualiteFormScreen({ navigation, route }) {
  const lotId = route?.params?.lotId;

  // ---- Référentiels ----
  const [lot, setLot] = useState(null);
  const [culture, setCulture] = useState(null);

  // ---- Champs ----
  const [typeAnalyse, setTypeAnalyse] = useState(null);
  const [dateAnalyse, setDateAnalyse] = useState(aujourdhui());
  const [laboratoire, setLaboratoire] = useState('');
  const [valeur, setValeur] = useState('');
  const [valeurTexte, setValeurTexte] = useState('');
  const [unite, setUnite] = useState('');
  const [seuilMin, setSeuilMin] = useState('');
  const [seuilMax, setSeuilMax] = useState('');
  const [seuilSurcharge, setSeuilSurcharge] = useState(false);
  const [conformiteForce, setConformiteForce] = useState(null); // null | 0 | 1
  const [rapportPdf, setRapportPdf] = useState('');
  const [notes, setNotes] = useState('');

  // ---- État UI ----
  const [enCours, setEnCours] = useState(false);
  const [erreurs, setErreurs] = useState({});
  const [modalOuvert, setModalOuvert] = useState(null);
  const [seuilPredefiniInfo, setSeuilPredefiniInfo] = useState(null);

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
    } catch (err) {
      console.error('[AnalyseQualiteForm] Erreur chargement :', err);
    }
  }, [lotId, navigation]);

  // ============================================================
  // PRÉ-REMPLISSAGE SEUILS QUAND TYPE + CULTURE DISPONIBLES
  // ============================================================

  useEffect(() => {
    if (!typeAnalyse) {
      setSeuilPredefiniInfo(null);
      return;
    }

    // Cherche la culture (par code ou par nom)
    const codeCultureRecherche = culture?.code || culture?.nom_fr || culture?.nom || '';

    const seuil = getSeuilPredefini(typeAnalyse, codeCultureRecherche);
    setSeuilPredefiniInfo(seuil);

    // Renseigne unité par défaut
    const typeInfo = TYPES_ANALYSE.find((t) => t.code === typeAnalyse);
    if (typeInfo?.unite_def) setUnite(typeInfo.unite_def);

    // Pré-remplit les seuils si pas encore en surcharge
    if (seuil && !seuilSurcharge) {
      setSeuilMin(seuil.min != null ? String(seuil.min) : '');
      setSeuilMax(seuil.max != null ? String(seuil.max) : '');
      if (seuil.unite) setUnite(seuil.unite);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeAnalyse, culture]);

  // ============================================================
  // CONFORMITÉ AUTO-CALCULÉE
  // ============================================================

  const conformiteAuto = useMemo(() => {
    const val = parseFloat(valeur);
    if (isNaN(val)) return null;
    const seuil = {
      min: seuilMin ? parseFloat(seuilMin) : null,
      max: seuilMax ? parseFloat(seuilMax) : null,
    };
    return evaluerConformite(val, seuil);
  }, [valeur, seuilMin, seuilMax]);

  // Conformité effective (forcée par l'utilisateur ou calculée)
  const conformiteEffective = conformiteForce != null ? conformiteForce : conformiteAuto;

  // ============================================================
  // VARIABLES DÉRIVÉES
  // ============================================================

  const typeAnalyseInfo = useMemo(() => {
    return TYPES_ANALYSE.find((t) => t.code === typeAnalyse);
  }, [typeAnalyse]);

  const cultureNom = culture
    ? (culture.nom_fr || culture.nom)
    : `Culture #${lot?.culture_id}`;

  // Type quantitatif (a une valeur numérique) vs textuel (organoleptique, salmonella...)
  const isTextuel = typeAnalyse === 'organoleptique' || typeAnalyse === 'autre';

  // ============================================================
  // VALIDATION
  // ============================================================

  const valider = () => {
    const errs = {};
    if (!typeAnalyse) errs.typeAnalyse = 'Type d\'analyse requis';
    if (!dateAnalyse) errs.dateAnalyse = 'Date requise';

    if (isTextuel) {
      if (!valeurTexte.trim()) errs.valeurTexte = 'Description requise';
    } else {
      const val = parseFloat(valeur);
      if (!valeur || isNaN(val)) {
        errs.valeur = 'Valeur numérique requise';
      }
      if (seuilMin && isNaN(parseFloat(seuilMin))) {
        errs.seuilMin = 'Seuil min invalide';
      }
      if (seuilMax && isNaN(parseFloat(seuilMax))) {
        errs.seuilMax = 'Seuil max invalide';
      }
      if (seuilMin && seuilMax &&
          parseFloat(seuilMin) >= parseFloat(seuilMax)) {
        errs.seuilMax = 'Seuil max doit être > seuil min';
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
      // Notes finales : ajout mention "Seuil personnalisé" si surchargé
      let notesFinales = notes.trim();
      if (seuilSurcharge && seuilPredefiniInfo) {
        const seuilPredef = `Seuil par défaut (${seuilPredefiniInfo.source}) : ` +
          `${seuilPredefiniInfo.min != null ? `min ${seuilPredefiniInfo.min}` : ''}` +
          `${seuilPredefiniInfo.min != null && seuilPredefiniInfo.max != null ? ' / ' : ''}` +
          `${seuilPredefiniInfo.max != null ? `max ${seuilPredefiniInfo.max}` : ''}`;
        const mention = `[Seuil personnalisé — ${seuilPredef}]`;
        notesFinales = notesFinales ? `${mention}\n${notesFinales}` : mention;
      }
      // Mention si conformité forcée manuellement
      if (conformiteForce != null && conformiteForce !== conformiteAuto) {
        const mention = `[Conformité forcée manuellement (auto = ${conformiteAuto === 1 ? 'conforme' : 'non conforme'})]`;
        notesFinales = notesFinales ? `${mention}\n${notesFinales}` : mention;
      }

      const payload = {
        lot_id: lotId,
        date_analyse: dateAnalyse,
        type_analyse: typeAnalyse,
        laboratoire: laboratoire.trim() || null,
        valeur: isTextuel ? null : parseFloat(valeur),
        unite: unite || null,
        valeur_texte: isTextuel ? valeurTexte.trim() : null,
        seuil_min: seuilMin ? parseFloat(seuilMin) : null,
        seuil_max: seuilMax ? parseFloat(seuilMax) : null,
        conforme: conformiteEffective,
        rapport_pdf: rapportPdf.trim() || null,
        notes: notesFinales || null,
      };

      const nouveauId = insertAnalyse(payload);
      setEnCours(false);

      const conformeMsg = conformiteEffective === 1
        ? '✓ Conforme'
        : conformiteEffective === 0
          ? '✗ Non conforme'
          : '— Conformité indéterminée';

      Alert.alert(
        '✅ Analyse enregistrée',
        `${typeAnalyseInfo?.label || typeAnalyse} ajoutée au lot ${lot?.code_lot}\n\n` +
        `${isTextuel ? `Valeur : ${valeurTexte}` : `Valeur : ${valeur} ${unite || ''}`}\n` +
        `${conformeMsg}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      setEnCours(false);
      console.error('[AnalyseQualiteForm] Erreur sauvegarde :', err);
      Alert.alert(
        'Erreur lors de l\'enregistrement',
        err.message || 'Impossible d\'enregistrer l\'analyse.'
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    lotId, typeAnalyse, dateAnalyse, laboratoire, valeur, valeurTexte,
    unite, seuilMin, seuilMax, seuilSurcharge, conformiteForce,
    conformiteAuto, conformiteEffective, rapportPdf, notes,
    seuilPredefiniInfo, typeAnalyseInfo, lot, isTextuel, navigation,
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
          <Text style={styles.headerTitre}>Nouvelle analyse qualité</Text>
          <Text style={styles.headerSousTitre}>
            Lot {lot.code_lot} · {cultureNom}
          </Text>
        </View>

        {/* Type d'analyse */}
        <Section titre="Type d'analyse">
          <Champ label="Analyse *" erreur={erreurs.typeAnalyse}>
            <Selecteur
              valeur={typeAnalyseInfo?.label}
              placeholder="Choisir une analyse"
              onPress={() => setModalOuvert('type')}
            />
          </Champ>

          {/* Affichage du seuil pré-rempli */}
          {seuilPredefiniInfo && (
            <View style={styles.seuilInfoBox}>
              <Text style={styles.seuilInfoTitre}>
                📋 Seuil de référence
              </Text>
              <Text style={styles.seuilInfoTexte}>
                {seuilPredefiniInfo.min != null && (
                  <>min : <Text style={styles.seuilInfoFort}>{seuilPredefiniInfo.min} {seuilPredefiniInfo.unite}</Text>{seuilPredefiniInfo.max != null && '   '}</>
                )}
                {seuilPredefiniInfo.max != null && (
                  <>max : <Text style={styles.seuilInfoFort}>{seuilPredefiniInfo.max} {seuilPredefiniInfo.unite}</Text></>
                )}
              </Text>
              <Text style={styles.seuilInfoSource}>
                Source : {seuilPredefiniInfo.source}
                {seuilPredefiniInfo.scope === 'generique' && ' · seuil générique'}
              </Text>
              {seuilPredefiniInfo.commentaire && (
                <Text style={styles.seuilInfoCommentaire}>
                  💡 {seuilPredefiniInfo.commentaire}
                </Text>
              )}
            </View>
          )}

          {typeAnalyse && !seuilPredefiniInfo && (
            <View style={styles.seuilAbsentBox}>
              <Text style={styles.seuilAbsentTexte}>
                ℹ️ Pas de seuil prédéfini pour cette analyse sur cette culture.
                Saisis tes seuils manuellement si applicable.
              </Text>
            </View>
          )}
        </Section>

        {/* Mesure */}
        {typeAnalyse && (
          <Section titre="Mesure">
            <Champ label="Date de l'analyse *" erreur={erreurs.dateAnalyse}>
              <TextInput
                style={styles.input}
                value={dateAnalyse}
                onChangeText={setDateAnalyse}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#5a6a5a"
                keyboardType="numbers-and-punctuation"
              />
            </Champ>

            <Champ label="Laboratoire">
              <TextInput
                style={styles.input}
                value={laboratoire}
                onChangeText={setLaboratoire}
                placeholder="Ex: SGS Antananarivo, Bureau Veritas, labo interne..."
                placeholderTextColor="#5a6a5a"
              />
            </Champ>

            {isTextuel ? (
              <Champ label="Valeur (description) *" erreur={erreurs.valeurTexte}>
                <TextInput
                  style={[styles.input, styles.inputMulti]}
                  value={valeurTexte}
                  onChangeText={setValeurTexte}
                  placeholder={
                    typeAnalyse === 'organoleptique'
                      ? 'Ex: arôme intense, notes florales et boisées, robe brun acajou'
                      : 'Description du résultat...'
                  }
                  placeholderTextColor="#5a6a5a"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </Champ>
            ) : (
              <View style={styles.mesureRow}>
                <View style={{ flex: 2 }}>
                  <Champ label="Valeur mesurée *" erreur={erreurs.valeur}>
                    <TextInput
                      style={styles.inputMesure}
                      value={valeur}
                      onChangeText={setValeur}
                      placeholder="0"
                      placeholderTextColor="#5a6a5a"
                      keyboardType="decimal-pad"
                    />
                  </Champ>
                </View>
                <View style={{ width: 10 }} />
                <View style={{ flex: 1 }}>
                  <Champ label="Unité">
                    <TextInput
                      style={styles.input}
                      value={unite}
                      onChangeText={setUnite}
                      placeholder="%"
                      placeholderTextColor="#5a6a5a"
                    />
                  </Champ>
                </View>
              </View>
            )}
          </Section>
        )}

        {/* Seuils (uniquement quantitatif) */}
        {typeAnalyse && !isTextuel && (
          <Section titre="Seuils de conformité">
            <View style={styles.seuilsRow}>
              <View style={{ flex: 1 }}>
                <Champ label="Seuil min" erreur={erreurs.seuilMin}>
                  <TextInput
                    style={styles.input}
                    value={seuilMin}
                    onChangeText={(v) => {
                      setSeuilMin(v);
                      setSeuilSurcharge(true);
                    }}
                    placeholder="—"
                    placeholderTextColor="#5a6a5a"
                    keyboardType="decimal-pad"
                  />
                </Champ>
              </View>
              <View style={{ width: 10 }} />
              <View style={{ flex: 1 }}>
                <Champ label="Seuil max" erreur={erreurs.seuilMax}>
                  <TextInput
                    style={styles.input}
                    value={seuilMax}
                    onChangeText={(v) => {
                      setSeuilMax(v);
                      setSeuilSurcharge(true);
                    }}
                    placeholder="—"
                    placeholderTextColor="#5a6a5a"
                    keyboardType="decimal-pad"
                  />
                </Champ>
              </View>
            </View>

            {seuilSurcharge && seuilPredefiniInfo && (
              <View style={styles.surchargeBox}>
                <Text style={styles.surchargeTexte}>
                  ⚠️ Seuils personnalisés (différents du défaut). Mention sera
                  ajoutée aux notes pour traçabilité audit.
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setSeuilSurcharge(false);
                    if (seuilPredefiniInfo.min != null) setSeuilMin(String(seuilPredefiniInfo.min));
                    else setSeuilMin('');
                    if (seuilPredefiniInfo.max != null) setSeuilMax(String(seuilPredefiniInfo.max));
                    else setSeuilMax('');
                  }}
                >
                  <Text style={styles.surchargeReset}>↺ Restaurer les seuils par défaut</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Conformité auto + override */}
            {valeur && conformiteAuto != null && (
              <View style={[
                styles.conformiteBox,
                conformiteEffective === 1 && styles.conformiteOk,
                conformiteEffective === 0 && styles.conformiteKo,
              ]}>
                <View style={styles.conformiteLigne}>
                  <Text style={styles.conformiteLabel}>Conformité</Text>
                  <Text style={[
                    styles.conformiteValeur,
                    conformiteEffective === 1 && styles.conformiteValeurOk,
                    conformiteEffective === 0 && styles.conformiteValeurKo,
                  ]}>
                    {conformiteEffective === 1 ? '✓ Conforme' :
                     conformiteEffective === 0 ? '✗ Non conforme' : '—'}
                  </Text>
                </View>

                {/* Override conformité */}
                <View style={styles.conformiteOverride}>
                  <TouchableOpacity
                    style={[
                      styles.overrideBtn,
                      conformiteForce === null && styles.overrideBtnActif,
                    ]}
                    onPress={() => setConformiteForce(null)}
                  >
                    <Text style={[
                      styles.overrideBtnTexte,
                      conformiteForce === null && styles.overrideBtnTexteActif,
                    ]}>
                      Auto
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.overrideBtn,
                      conformiteForce === 1 && styles.overrideBtnActif,
                    ]}
                    onPress={() => setConformiteForce(1)}
                  >
                    <Text style={[
                      styles.overrideBtnTexte,
                      conformiteForce === 1 && styles.overrideBtnTexteActif,
                    ]}>
                      Forcer ✓
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.overrideBtn,
                      conformiteForce === 0 && styles.overrideBtnActif,
                    ]}
                    onPress={() => setConformiteForce(0)}
                  >
                    <Text style={[
                      styles.overrideBtnTexte,
                      conformiteForce === 0 && styles.overrideBtnTexteActif,
                    ]}>
                      Forcer ✗
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Section>
        )}

        {/* Documentation */}
        {typeAnalyse && (
          <Section titre="Documentation">
            <Champ label="Référence rapport PDF (optionnel)">
              <TextInput
                style={styles.input}
                value={rapportPdf}
                onChangeText={setRapportPdf}
                placeholder="Ex: SGS-2026-0145.pdf"
                placeholderTextColor="#5a6a5a"
              />
              <Text style={styles.hint}>
                Pour l'instant, saisi le nom du fichier. Upload PDF à venir Session 6.
              </Text>
            </Champ>

            <Champ label="Notes (optionnel)">
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Observations, conditions d'analyse, contexte..."
                placeholderTextColor="#5a6a5a"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </Champ>
          </Section>
        )}

        {/* Boutons */}
        {typeAnalyse && (
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
                {enCours ? 'Enregistrement…' : '+ Enregistrer l\'analyse'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Modal type d'analyse */}
      <ModalTypeAnalyse
        visible={modalOuvert === 'type'}
        onClose={() => setModalOuvert(null)}
        culture={culture}
        onSelect={(c) => { setTypeAnalyse(c); setModalOuvert(null); }}
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

function ModalTypeAnalyse({ visible, onClose, culture, onSelect }) {
  // Trier les types selon pertinence pour la culture
  const codeCulture = culture?.code || culture?.nom_fr || culture?.nom || '';
  const typesOrdonnes = useMemo(() => {
    return getAnalysesPertinentesPour(codeCulture);
  }, [codeCulture]);

  // On marque les pertinents avec une étoile
  const codesPertinents = new Set();
  for (const t of TYPES_ANALYSE) {
    if (getSeuilPredefini(t.code, codeCulture)) {
      codesPertinents.add(t.code);
    }
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
            <Text style={styles.modalTitre}>Type d'analyse</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalFermer}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.modalSous}>
            ⭐ = analyse avec seuil prédéfini pour cette culture
          </Text>
          <ScrollView style={styles.modalListe}>
            {typesOrdonnes.map((t) => {
              const isPertinent = codesPertinents.has(t.code);
              return (
                <TouchableOpacity
                  key={t.code}
                  style={[styles.modalItem, isPertinent && styles.modalItemPertinent]}
                  onPress={() => onSelect(t.code)}
                >
                  <Text style={[
                    styles.modalItemLabel,
                    isPertinent && styles.modalItemLabelPertinent,
                  ]}>
                    {isPertinent && '⭐ '}{t.label}
                  </Text>
                  {t.unite_def && (
                    <Text style={styles.modalItemSub}>Unité par défaut : {t.unite_def}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
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
  rougeFonce: '#3a1a1a',
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
  inputMesure: {
    backgroundColor: COLORS.bgInput,
    borderWidth: 1.5,
    borderColor: COLORS.ambre,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: COLORS.texteDoux,
    fontSize: 22,
    fontWeight: 'bold',
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

  // Box info seuil prédéfini
  seuilInfoBox: {
    backgroundColor: '#1f2c38',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#7eaac8',
    marginTop: 8,
  },
  seuilInfoTitre: {
    color: '#7eaac8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  seuilInfoTexte: {
    color: COLORS.texteDoux,
    fontSize: 13,
    marginBottom: 4,
  },
  seuilInfoFort: {
    fontWeight: '700',
    color: COLORS.vertClair,
  },
  seuilInfoSource: {
    color: COLORS.texteSecond,
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 2,
  },
  seuilInfoCommentaire: {
    color: COLORS.texteSecond,
    fontSize: 11,
    marginTop: 6,
    lineHeight: 15,
  },

  seuilAbsentBox: {
    backgroundColor: '#2a2a14',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.jaune,
  },
  seuilAbsentTexte: {
    color: COLORS.texteSecond,
    fontSize: 11,
    lineHeight: 16,
  },

  // Mesure (valeur + unité)
  mesureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  // Seuils row
  seuilsRow: {
    flexDirection: 'row',
  },

  // Surcharge
  surchargeBox: {
    backgroundColor: '#2a2a14',
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.jaune,
  },
  surchargeTexte: {
    color: COLORS.jaune,
    fontSize: 11,
    lineHeight: 16,
  },
  surchargeReset: {
    color: COLORS.ambreClair,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
    textDecorationLine: 'underline',
  },

  // Conformité
  conformiteBox: {
    padding: 14,
    borderRadius: 10,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.texteSecond,
    backgroundColor: COLORS.bgInput,
  },
  conformiteOk: {
    borderLeftColor: COLORS.vert,
    backgroundColor: '#1f2e1f',
  },
  conformiteKo: {
    borderLeftColor: COLORS.rouge,
    backgroundColor: COLORS.rougeFonce,
  },
  conformiteLigne: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  conformiteLabel: {
    color: COLORS.texteSecond,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  conformiteValeur: {
    color: COLORS.texteSecond,
    fontSize: 16,
    fontWeight: '700',
  },
  conformiteValeurOk: {
    color: COLORS.vert,
  },
  conformiteValeurKo: {
    color: COLORS.rouge,
  },

  conformiteOverride: {
    flexDirection: 'row',
    gap: 6,
  },
  overrideBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  overrideBtnActif: {
    backgroundColor: COLORS.bgInput,
    borderColor: COLORS.ambre,
  },
  overrideBtnTexte: {
    color: COLORS.texteSecond,
    fontSize: 11,
    fontWeight: '600',
  },
  overrideBtnTexteActif: {
    color: COLORS.ambreClair,
  },

  // Boutons
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  btnAnnuler: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnAnnulerTexte: {
    color: COLORS.texteSecond,
    fontSize: 14,
    fontWeight: '600',
  },
  btnPrincipal: {
    flex: 2,
    backgroundColor: COLORS.ambre,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnPrincipalTexte: {
    color: '#0d1a0d',
    fontSize: 14,
    fontWeight: '700',
  },

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
    maxHeight: '85%',
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
  modalSous: {
    color: COLORS.texteSecond,
    fontSize: 11,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontStyle: 'italic',
  },
  modalListe: { paddingVertical: 4 },
  modalItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalItemPertinent: {
    backgroundColor: '#1f2c1f',
  },
  modalItemLabel: { color: COLORS.texteDoux, fontSize: 14, fontWeight: '500' },
  modalItemLabelPertinent: {
    color: COLORS.vertClair,
    fontWeight: '600',
  },
  modalItemSub: { color: COLORS.texteSecond, fontSize: 11, marginTop: 3 },
});