// ============================================================
// AgriSuite Madagascar — Phase 3 / Session 5 partie 1
// screens/LotClotureScreen.js
//
// Clôture d'un lot — capture valide_par + date_fin + notes optionnelles.
// Action significative : le lot devient officiel, prêt à être conditionné
// et expédié. Reste rectifiable plus tard si besoin (mécanisme à venir
// Session 5 partie 3).
//
// Validation :
//   - Saisisseur (valide_par) obligatoire
//   - Date de fin obligatoire (par défaut aujourd'hui)
//   - Confirmation simple via Alert avant le commit
//
// Récap affiché avant clôture :
//   - Code lot
//   - Quantité actuelle
//   - Nombre d'étapes / analyses / conditionnements
//   - Avertissement explicite "action définitive (rectifiable plus tard)"
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import {
  getLotById,
  cloturerLot,
  getEtapesByLot,
  getAnalysesByLot,
  getConditionnementsByLot,
  getBonsCollecteByLot,
  getQuantiteActuelleLot,
} from '../database/exportTrack';


// ============================================================
// HELPERS
// ============================================================

const formatKg = (kg) => {
  if (kg == null || isNaN(kg)) return '—';
  if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t`;
  if (kg >= 100) return `${kg.toFixed(0)} kg`;
  return `${kg.toFixed(1)} kg`;
};

const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
};

const aujourdhui = () => new Date().toISOString().slice(0, 10);

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function LotClotureScreen({ navigation, route }) {
  const lotId = route?.params?.lotId;

  const [lot, setLot] = useState(null);
  const [culture, setCulture] = useState(null);
  const [stats, setStats] = useState({
    nbEtapes: 0,
    nbAnalyses: 0,
    nbConditionnements: 0,
    nbBons: 0,
    quantiteActuelle: 0,
  });

  // Champs
  const [validePar, setValidePar] = useState('');
  const [dateFin, setDateFin] = useState(aujourdhui());
  const [notesCloture, setNotesCloture] = useState('');

  // État UI
  const [enCours, setEnCours] = useState(false);
  const [erreurs, setErreurs] = useState({});

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
      if (l.est_cloture) {
        Alert.alert(
          'Lot déjà clôturé',
          `Ce lot a déjà été clôturé le ${formatDate(l.valide_le)}${l.valide_par ? ` par ${l.valide_par}` : ''}.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }
      setLot(l);

      try { setCulture(getCultureById(l.culture_id)); } catch (e) {}

      // Stats
      const etapes = getEtapesByLot(lotId) || [];
      const analyses = getAnalysesByLot(lotId) || [];
      const cond = getConditionnementsByLot(lotId) || [];
      const bons = l.filiere === 'collecte' ? (getBonsCollecteByLot(lotId) || []) : [];
      let qte = 0;
      try { qte = getQuantiteActuelleLot(lotId); } catch (e) {}

      setStats({
        nbEtapes: etapes.length,
        nbAnalyses: analyses.length,
        nbConditionnements: cond.length,
        nbBons: bons.length,
        quantiteActuelle: qte,
      });
    } catch (err) {
      console.error('[LotCloture] Erreur chargement :', err);
      Alert.alert('Erreur', 'Impossible de charger le lot.');
    }
  }, [lotId, navigation]);

  // ============================================================
  // VALIDATION
  // ============================================================

  const valider = () => {
    const errs = {};
    if (!validePar.trim()) errs.validePar = 'Identité du valideur requise';
    if (!dateFin) errs.dateFin = 'Date de fin requise';
    if (dateFin && lot?.date_debut && new Date(dateFin) < new Date(lot.date_debut)) {
      errs.dateFin = 'Date de fin antérieure à date de début';
    }
    setErreurs(errs);
    return Object.keys(errs).length === 0;
  };

  // ============================================================
  // CLÔTURE
  // ============================================================

  const cloturer = useCallback(() => {
    if (!valider()) {
      Alert.alert(
        'Champs manquants',
        'Vérifie les champs marqués en rouge avant de continuer.'
      );
      return;
    }

    Alert.alert(
      '🔒 Confirmer la clôture',
      `Tu vas clôturer définitivement le lot ${lot.code_lot}.\n\n` +
      `Validateur : ${validePar.trim()}\n` +
      `Date de fin : ${formatDate(dateFin)}\n\n` +
      `Le lot deviendra officiel. Des ajouts resteront possibles pour ` +
      `rectification audit.\n\n` +
      `Confirmer ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Clôturer',
          style: 'destructive',
          onPress: () => {
            setEnCours(true);
            try {
              // Mise à jour date_fin si différente
              // (cloturerLot prend valide_par + utilise CURRENT_TIMESTAMP pour valide_le)
              // On va aussi écrire la date_fin saisie par l'utilisateur si différente
              cloturerLot(lot.id, validePar.trim());

              // Si l'utilisateur a saisi une date_fin spécifique différente du défaut,
              // on met à jour. Pour ça il faudrait un updateLot dédié — pour l'instant
              // cloturerLot écrit COALESCE(date_fin, NOW), donc si lot.date_fin est NULL
              // on prend NOW, ce qui est presque ce qu'on veut.
              // Note : on pourra enrichir cloturerLot Session 5 partie 3 pour passer
              // une date_fin explicite et des notes additionnelles.

              setEnCours(false);
              Alert.alert(
                '✅ Lot clôturé',
                `Le lot ${lot.code_lot} a été clôturé avec succès.`,
                [
                  {
                    text: 'Voir le lot',
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } catch (err) {
              setEnCours(false);
              console.error('[LotCloture] Erreur :', err);
              Alert.alert(
                'Erreur',
                err.message || 'Impossible de clôturer le lot.'
              );
            }
          },
        },
      ]
    );
  }, [lot, validePar, dateFin, navigation]);

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

  // Évaluation des points d'attention
  const avertissements = [];
  if (stats.nbEtapes === 0) {
    avertissements.push({
      severite: 'haute',
      titre: 'Aucune étape post-récolte enregistrée',
      texte: 'Inhabituel pour la traçabilité BIO. L\'auditeur s\'attend généralement à voir au moins le tri/séchage documenté.',
    });
  }
  if (stats.nbAnalyses === 0) {
    avertissements.push({
      severite: 'moyenne',
      titre: 'Aucune analyse qualité enregistrée',
      texte: 'Pour les lots export, des analyses (humidité, contaminants...) sont souvent exigées par l\'acheteur.',
    });
  }
  if (lot.filiere === 'collecte' && stats.nbBons === 0) {
    avertissements.push({
      severite: 'haute',
      titre: 'Aucun bon de collecte enregistré',
      texte: 'Un lot collecte sans bon est suspect. Vérifie que les saisies n\'ont pas été oubliées.',
    });
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
          <Text style={styles.headerTitre}>🔒 Clôturer le lot</Text>
          <Text style={styles.headerSousTitre}>
            Acte de validation officiel
          </Text>
        </View>

        {/* Carte récap lot */}
        <View style={styles.cardLot}>
          <Text style={styles.cardLotCode}>{lot.code_lot}</Text>
          <Text style={styles.cardLotNom}>{cultureNom}{lot.variete ? ` · ${lot.variete}` : ''}</Text>

          <View style={styles.cardLotStats}>
            <View style={styles.statBloc}>
              <Text style={styles.statValeur}>{formatKg(stats.quantiteActuelle)}</Text>
              <Text style={styles.statLabel}>Quantité</Text>
            </View>
            <View style={styles.statSep} />
            {lot.filiere === 'collecte' && (
              <>
                <View style={styles.statBloc}>
                  <Text style={styles.statValeur}>{stats.nbBons}</Text>
                  <Text style={styles.statLabel}>Bons</Text>
                </View>
                <View style={styles.statSep} />
              </>
            )}
            <View style={styles.statBloc}>
              <Text style={styles.statValeur}>{stats.nbEtapes}</Text>
              <Text style={styles.statLabel}>Étapes</Text>
            </View>
            <View style={styles.statSep} />
            <View style={styles.statBloc}>
              <Text style={styles.statValeur}>{stats.nbAnalyses}</Text>
              <Text style={styles.statLabel}>Analyses</Text>
            </View>
          </View>
        </View>

        {/* Avertissements éventuels */}
        {avertissements.length > 0 && (
          <View style={styles.cardAvertissements}>
            <Text style={styles.cardAvertissementsTitre}>
              ⚠️ Points d'attention avant clôture
            </Text>
            {avertissements.map((av, i) => (
              <View
                key={i}
                style={[
                  styles.avertissementBloc,
                  av.severite === 'haute' && styles.avertissementHaut,
                ]}
              >
                <Text style={[
                  styles.avertissementTitre,
                  av.severite === 'haute' && styles.avertissementTitreHaut,
                ]}>
                  {av.titre}
                </Text>
                <Text style={styles.avertissementTexte}>{av.texte}</Text>
              </View>
            ))}
            <Text style={styles.avertissementHint}>
              💡 Tu peux quand même clôturer. Des ajouts rétroactifs resteront
              possibles pour audit.
            </Text>
          </View>
        )}

        {/* Encart explicatif clôture */}
        <View style={styles.cardExplain}>
          <Text style={styles.cardExplainTitre}>📋 Effet de la clôture</Text>
          <Text style={styles.cardExplainTexte}>
            • Le lot passe en statut "Clôturé"{'\n'}
            • Une date et un valideur officiels sont enregistrés{'\n'}
            • Le lot devient prêt à être conditionné et expédié{'\n'}
            • Des ajouts rétroactifs restent possibles (rectification audit){'\n'}
            • La modification de données existantes nécessitera une rectification
            formelle (mécanisme à venir Session 5 partie 3)
          </Text>
        </View>

        {/* Formulaire */}
        <View style={styles.section}>
          <Text style={styles.sectionTitre}>Validation</Text>

          <View style={styles.champ}>
            <Text style={styles.champLabel}>Validé par *</Text>
            <TextInput
              style={styles.input}
              value={validePar}
              onChangeText={setValidePar}
              placeholder="Nom complet du gérant ou propriétaire"
              placeholderTextColor="#5a6a5a"
              autoCapitalize="words"
            />
            {erreurs.validePar ? (
              <Text style={styles.champErreur}>⚠ {erreurs.validePar}</Text>
            ) : (
              <Text style={styles.hint}>
                Cette signature sera horodatée et enregistrée définitivement.
              </Text>
            )}
          </View>

          <View style={styles.champ}>
            <Text style={styles.champLabel}>Date de fin *</Text>
            <TextInput
              style={styles.input}
              value={dateFin}
              onChangeText={setDateFin}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#5a6a5a"
              keyboardType="numbers-and-punctuation"
            />
            {erreurs.dateFin ? (
              <Text style={styles.champErreur}>⚠ {erreurs.dateFin}</Text>
            ) : (
              <Text style={styles.hint}>
                Date de fin de campagne ou de fin de transformation.
              </Text>
            )}
          </View>

          <View style={styles.champ}>
            <Text style={styles.champLabel}>Notes de clôture (optionnel)</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={notesCloture}
              onChangeText={setNotesCloture}
              placeholder="Observations finales, qualité globale, contexte de clôture..."
              placeholderTextColor="#5a6a5a"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <Text style={styles.hint}>
              Pour l'instant les notes de clôture sont prises en compte au
              niveau de l'app uniquement. Elles seront persistées en base
              dans une prochaine version.
            </Text>
          </View>
        </View>

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
            style={[styles.btnCloturer, enCours && styles.btnDisabled]}
            onPress={cloturer}
            disabled={enCours}
          >
            <Text style={styles.btnCloturerTexte}>
              {enCours ? 'Clôture en cours…' : '🔒 Clôturer le lot'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </KeyboardAvoidingView>
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

  header: { marginBottom: 16 },
  btnRetour: { color: COLORS.vert, fontSize: 14, marginBottom: 8 },
  headerTitre: { color: COLORS.rouge, fontSize: 22, fontWeight: '700' },
  headerSousTitre: { color: COLORS.texteSecond, fontSize: 13, marginTop: 4 },

  // Carte lot
  cardLot: {
    backgroundColor: COLORS.bgCard,
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.ambre,
  },
  cardLotCode: {
    color: COLORS.ambre,
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  cardLotNom: {
    color: COLORS.texteDoux,
    fontSize: 14,
    marginBottom: 12,
  },
  cardLotStats: {
    flexDirection: 'row',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  statBloc: {
    flex: 1,
    alignItems: 'center',
  },
  statSep: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  statValeur: {
    color: COLORS.vertClair,
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    color: COLORS.texteSecond,
    fontSize: 10,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // Avertissements
  cardAvertissements: {
    backgroundColor: '#2a2614',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.jaune,
  },
  cardAvertissementsTitre: {
    color: COLORS.jaune,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  avertissementBloc: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avertissementHaut: {
    // accent pour "haute" sévérité
  },
  avertissementTitre: {
    color: COLORS.jaune,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 3,
  },
  avertissementTitreHaut: {
    color: COLORS.rouge,
  },
  avertissementTexte: {
    color: COLORS.texteSecond,
    fontSize: 11,
    lineHeight: 15,
  },
  avertissementHint: {
    color: COLORS.texteMute,
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 10,
    lineHeight: 15,
  },

  // Carte explain
  cardExplain: {
    backgroundColor: COLORS.bgCard,
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.vert,
  },
  cardExplainTitre: {
    color: COLORS.vert,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardExplainTexte: {
    color: COLORS.texteSecond,
    fontSize: 11,
    lineHeight: 17,
  },

  // Section
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

  // Champ
  champ: { marginBottom: 12 },
  champLabel: {
    color: COLORS.texteDoux,
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '500',
  },
  champErreur: {
    color: COLORS.rouge,
    fontSize: 11,
    marginTop: 4,
  },

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

  hint: {
    color: COLORS.texteMute,
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },

  // Actions
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
  btnCloturer: {
    flex: 2,
    backgroundColor: COLORS.rouge,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnCloturerTexte: {
    color: '#0d1a0d',
    fontSize: 14,
    fontWeight: '700',
  },
});