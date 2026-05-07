// screens/InspectionTerrainScreen.js
// Écran inspection terrain — swipe carte par carte (logique audit pro)

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  getExigencesPourInspection,
  creerInspectionRealisee,
  getInspectionRealisee,
  getRealisationParPlanification,
  enregistrerReponse,
  getReponseExigence,
  getProgressionInspection,
  calculerConclusion,
} from '../database/sciInspectionsRealisation';
import { getInspectionPlanifiee } from '../database/sciInspections';

const COULEURS = {
  bg: '#1a2e1a',
  card: '#243824',
  cardAlt: '#2a4a2a',
  vert: '#7ec87e',
  amber: '#d4a04a',
  rouge: '#e74c3c',
  bleu: '#5b9bd5',
  gris: '#9ca39c',
  blanc: '#ffffff',
};

const REPONSES = [
  { code: 'conforme', label: '✓ Conforme', color: COULEURS.vert },
  { code: 'non_conforme', label: '✗ Non conforme', color: COULEURS.rouge },
  { code: 'non_applicable', label: '⊘ N/A', color: COULEURS.gris },
  { code: 'a_revoir', label: '⏭ À revoir', color: COULEURS.amber },
];

const GRAVITES = [
  { code: 'mineure', label: 'Mineure', color: COULEURS.amber },
  { code: 'majeure', label: 'Majeure', color: '#e67e22' },
  { code: 'critique', label: 'Critique', color: COULEURS.rouge },
];

export default function InspectionTerrainScreen({ route, navigation }) {
  // Routes possibles : { planificationId } OU { inspectionRealiseeId }
  const planificationId = route.params?.planificationId || null;
  const inspectionRealiseeIdParam = route.params?.inspectionRealiseeId || null;

  const [planification, setPlanification] = useState(null);
  const [inspectionRealiseeId, setInspectionRealiseeId] = useState(inspectionRealiseeIdParam);
  const [exigences, setExigences] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [reponseActuelle, setReponseActuelle] = useState(null);
  const [graviteActuelle, setGraviteActuelle] = useState(null);
  const [observationActuelle, setObservationActuelle] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [progression, setProgression] = useState({ total: 0, repondu: 0, pourcentage: 0 });
  const [showRecap, setShowRecap] = useState(false);
  const [allReponses, setAllReponses] = useState({});
  const [loaded, setLoaded] = useState(false);

  // Initialisation
  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      let planif = null;
      let realisationId = inspectionRealiseeId;

      if (planificationId) {
        planif = getInspectionPlanifiee(planificationId);
        if (!planif) {
          Alert.alert('Erreur', 'Planification introuvable');
          navigation.goBack();
          return;
        }
        setPlanification(planif);

        // Vérifier si une réalisation en cours existe déjà
        const existante = getRealisationParPlanification(planificationId);
        if (existante) {
          realisationId = existante.id;
        } else {
          // Créer une nouvelle réalisation
          realisationId = creerInspectionRealisee({
            planification_id: planificationId,
            fournisseur_id: planif.fournisseur_id,
            referentiel_code: planif.referentiel_code,
            type_inspection: planif.type_inspection,
            date_realisee: new Date().toISOString().split('T')[0],
            inspecteur_nom: planif.inspecteur_prevu || 'À définir',
          });
        }
        setInspectionRealiseeId(realisationId);
      } else if (inspectionRealiseeIdParam) {
        const real = getInspectionRealisee(inspectionRealiseeIdParam);
        if (real) {
          planif = {
            fournisseur_id: real.fournisseur_id,
            fournisseur_nom: real.fournisseur_nom,
            fournisseur_code: real.fournisseur_code,
            referentiel_code: real.referentiel_code,
            type_inspection: real.type_inspection,
          };
          setPlanification(planif);
        }
      }

      if (!planif) {
        Alert.alert('Erreur', 'Aucune inspection à charger');
        navigation.goBack();
        return;
      }

      // Charger les exigences applicables
      const exigs = getExigencesPourInspection(planif.referentiel_code, planif.type_inspection);
      setExigences(exigs);

      // Charger toutes les réponses existantes
      if (realisationId) {
        const reponsesMap = {};
        exigs.forEach((e) => {
          const r = getReponseExigence(realisationId, e.id);
          if (r) reponsesMap[e.id] = r;
        });
        setAllReponses(reponsesMap);

        // Positionner sur la première non-répondue
        const firstUnanswered = exigs.findIndex((e) => !reponsesMap[e.id]);
        if (firstUnanswered >= 0) setCurrentIdx(firstUnanswered);

        // Mettre à jour progression
        setProgression(getProgressionInspection(realisationId, exigs.length));
      }

      setLoaded(true);
    } catch (e) {
      console.error('[InspectionTerrain] Erreur init:', e);
      Alert.alert('Erreur', e.message);
    }
  };

  // Charger la réponse de la carte courante
  useEffect(() => {
    if (!loaded || exigences.length === 0) return;
    const exig = exigences[currentIdx];
    if (!exig) return;
    const r = allReponses[exig.id];
    if (r) {
      setReponseActuelle(r.reponse);
      setGraviteActuelle(r.gravite);
      setObservationActuelle(r.observation || '');
      setPhotoUri(r.photo_uri);
    } else {
      setReponseActuelle(null);
      setGraviteActuelle(null);
      setObservationActuelle('');
      setPhotoUri(null);
    }
  }, [currentIdx, loaded, exigences.length]);

  const prendrePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission refusée', 'Activez la caméra dans les réglages.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.6,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets?.[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const choisirGalerie = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission refusée', 'Activez la galerie dans les réglages.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.6,
      allowsEditing: false,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (!result.canceled && result.assets?.[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const sauvegarderEtSuivant = () => {
    if (!reponseActuelle) {
      Alert.alert('Réponse requise', 'Sélectionnez Conforme / Non conforme / N/A / À revoir');
      return;
    }
    if (reponseActuelle === 'non_conforme' && !graviteActuelle) {
      Alert.alert('Gravité requise', 'Précisez la gravité de la non-conformité');
      return;
    }

    const exig = exigences[currentIdx];
    try {
      enregistrerReponse({
        inspection_id: inspectionRealiseeId,
        exigence_id: exig.id,
        reponse: reponseActuelle,
        gravite: reponseActuelle === 'non_conforme' ? graviteActuelle : null,
        observation: observationActuelle,
        photo_uri: photoUri,
      });

      // Mise à jour locale
      const nouveauMap = { ...allReponses };
      nouveauMap[exig.id] = {
        reponse: reponseActuelle,
        gravite: graviteActuelle,
        observation: observationActuelle,
        photo_uri: photoUri,
      };
      setAllReponses(nouveauMap);
      setProgression(getProgressionInspection(inspectionRealiseeId, exigences.length));

      // Passage à la suivante (ou récap si fin)
      if (currentIdx < exigences.length - 1) {
        setCurrentIdx(currentIdx + 1);
      } else {
        setShowRecap(true);
      }
    } catch (e) {
      console.error('[InspectionTerrain] Erreur save:', e);
      Alert.alert('Erreur', e.message);
    }
  };

  const precedente = () => {
    if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
  };

  const sortir = () => {
    Alert.alert(
      'Quitter ?',
      'Les réponses déjà enregistrées sont sauvegardées. Vous pourrez reprendre plus tard.',
      [
        { text: 'Continuer l\'inspection', style: 'cancel' },
        {
          text: 'Quitter',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const allerVersSignatures = () => {
    setShowRecap(false);
    navigation.replace('InspectionSignatures', {
      inspectionRealiseeId,
    });
  };

  if (!loaded) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (exigences.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.centerBox}>
          <Text style={styles.emptyTitle}>Aucune exigence applicable</Text>
          <Text style={styles.emptyText}>
            Le référentiel {planification?.referentiel_code} n'a pas encore d'exigences avec priorité SCI définie pour le type "{planification?.type_inspection}".
          </Text>
          <TouchableOpacity style={styles.btnSecondary} onPress={() => navigation.goBack()}>
            <Text style={styles.btnSecondaryText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const exig = exigences[currentIdx];

  return (
    <View style={styles.container}>
      {/* Barre progression haute */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={sortir}>
          <Text style={styles.topBarBack}>‹ Pause</Text>
        </TouchableOpacity>
        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle}>
            {planification?.fournisseur_code} · {planification?.referentiel_code}
          </Text>
          <Text style={styles.topBarSub}>
            Carte {currentIdx + 1} / {exigences.length} · {progression.repondu} répondues
          </Text>
        </View>
        <TouchableOpacity onPress={() => setShowRecap(true)}>
          <Text style={styles.topBarRecap}>Récap</Text>
        </TouchableOpacity>
      </View>

      {/* Barre progression visuelle */}
      <View style={styles.progressBg}>
        <View
          style={[
            styles.progressFill,
            { width: `${(currentIdx / Math.max(1, exigences.length - 1)) * 100}%` },
          ]}
        />
      </View>

      <ScrollView contentContainerStyle={styles.cardContainer}>
        {/* Carte exigence */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.priorityBadge, getPrioStyle(exig.priorite_sci)]}>
              <Text style={styles.priorityText}>P{exig.priorite_sci || 2}</Text>
            </View>
            <Text style={styles.cardCategorie}>{exig.categorie}</Text>
            <Text style={styles.cardCode}>{exig.code}</Text>
          </View>
          <Text style={styles.cardLibelle}>{exig.libelle}</Text>
          {!!exig.description && (
            <Text style={styles.cardDescription}>{exig.description}</Text>
          )}
        </View>

        {/* Boutons de réponse */}
        <View style={styles.reponsesGrid}>
          {REPONSES.map((r) => (
            <TouchableOpacity
              key={r.code}
              style={[
                styles.btnReponse,
                { borderColor: r.color },
                reponseActuelle === r.code && { backgroundColor: r.color },
              ]}
              onPress={() => {
                setReponseActuelle(r.code);
                if (r.code !== 'non_conforme') setGraviteActuelle(null);
              }}
            >
              <Text
                style={[
                  styles.btnReponseText,
                  { color: r.color },
                  reponseActuelle === r.code && { color: COULEURS.bg },
                ]}
              >
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Gravité (si non conforme) */}
        {reponseActuelle === 'non_conforme' && (
          <View style={styles.graviteSection}>
            <Text style={styles.label}>Gravité de la non-conformité *</Text>
            <View style={styles.graviteRow}>
              {GRAVITES.map((g) => (
                <TouchableOpacity
                  key={g.code}
                  style={[
                    styles.btnGravite,
                    { borderColor: g.color },
                    graviteActuelle === g.code && { backgroundColor: g.color },
                  ]}
                  onPress={() => setGraviteActuelle(g.code)}
                >
                  <Text
                    style={[
                      styles.btnGraviteText,
                      { color: g.color },
                      graviteActuelle === g.code && { color: COULEURS.blanc },
                    ]}
                  >
                    {g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Observation */}
        <Text style={styles.label}>Observation</Text>
        <TextInput
          style={styles.textArea}
          value={observationActuelle}
          onChangeText={setObservationActuelle}
          placeholder="Notes, mesures, contexte..."
          placeholderTextColor={COULEURS.gris}
          multiline
          numberOfLines={3}
        />

        {/* Photo preuve */}
        <Text style={styles.label}>Photo preuve</Text>
        {photoUri ? (
          <View style={styles.photoBox}>
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
            <TouchableOpacity style={styles.btnRetirerPhoto} onPress={() => setPhotoUri(null)}>
              <Text style={styles.btnRetirerPhotoText}>✕ Retirer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.photoActionsRow}>
            <TouchableOpacity style={styles.btnPhoto} onPress={prendrePhoto}>
              <Text style={styles.btnPhotoText}>📷 Caméra</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnPhoto} onPress={choisirGalerie}>
              <Text style={styles.btnPhotoText}>🖼 Galerie</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Boutons navigation bas */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.btnNav, currentIdx === 0 && styles.btnNavDisabled]}
          onPress={precedente}
          disabled={currentIdx === 0}
        >
          <Text style={styles.btnNavText}>‹ Précédente</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSuivant} onPress={sauvegarderEtSuivant}>
          <Text style={styles.btnSuivantText}>
            {currentIdx === exigences.length - 1 ? 'Terminer →' : 'Suivante →'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modal récap */}
      <Modal visible={showRecap} animationType="slide">
        <View style={styles.recapContainer}>
          <Text style={styles.recapTitle}>Récapitulatif</Text>
          <View style={styles.recapStats}>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: COULEURS.vert }]}>{progression.conforme}</Text>
              <Text style={styles.statLabel}>Conformes</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: COULEURS.rouge }]}>{progression.non_conforme}</Text>
              <Text style={styles.statLabel}>Non conformes</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: COULEURS.gris }]}>{progression.non_applicable}</Text>
              <Text style={styles.statLabel}>N/A</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: COULEURS.amber }]}>{progression.a_revoir}</Text>
              <Text style={styles.statLabel}>À revoir</Text>
            </View>
          </View>

          <Text style={styles.recapInfo}>
            {progression.repondu} / {progression.total} répondues
            {progression.restant > 0 && ` · ${progression.restant} restantes`}
          </Text>

          {progression.non_conforme > 0 && (
            <View style={styles.recapAlert}>
              <Text style={styles.recapAlertText}>
                ⚠ Conclusion auto : {libelleConclusion(calculerConclusion(inspectionRealiseeId))}
              </Text>
            </View>
          )}

          {progression.a_revoir > 0 && (
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() => {
                const idx = exigences.findIndex(
                  (e) => allReponses[e.id]?.reponse === 'a_revoir'
                );
                if (idx >= 0) {
                  setCurrentIdx(idx);
                  setShowRecap(false);
                }
              }}
            >
              <Text style={styles.btnSecondaryText}>↻ Revoir les "À revoir" ({progression.a_revoir})</Text>
            </TouchableOpacity>
          )}

          {progression.restant > 0 && (
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() => {
                const idx = exigences.findIndex((e) => !allReponses[e.id]);
                if (idx >= 0) {
                  setCurrentIdx(idx);
                  setShowRecap(false);
                }
              }}
            >
              <Text style={styles.btnSecondaryText}>→ Continuer (carte {progression.repondu + 1})</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.btnPrimary, progression.restant > 0 && styles.btnPrimaryDimmed]}
            onPress={allerVersSignatures}
          >
            <Text style={styles.btnPrimaryText}>
              {progression.restant > 0 ? 'Passer aux signatures (incomplet)' : '✓ Passer aux signatures'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnTextOnly} onPress={() => setShowRecap(false)}>
            <Text style={styles.btnTextOnlyText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

function getPrioStyle(prio) {
  if (prio === 1) return { backgroundColor: COULEURS.rouge };
  if (prio === 2) return { backgroundColor: COULEURS.amber };
  return { backgroundColor: COULEURS.gris };
}

function libelleConclusion(c) {
  if (c === 'conforme') return 'Conforme';
  if (c === 'non_conforme_mineure') return 'NC mineure';
  if (c === 'non_conforme_majeure') return 'NC majeure';
  if (c === 'non_conforme_critique') return 'NC critique';
  return '—';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COULEURS.bg },
  loadingText: { color: COULEURS.gris, textAlign: 'center', marginTop: 40 },
  centerBox: { padding: 24, alignItems: 'center', marginTop: 60 },
  emptyTitle: { color: COULEURS.amber, fontSize: 17, fontWeight: '700', marginBottom: 12 },
  emptyText: { color: COULEURS.gris, fontSize: 13, textAlign: 'center', lineHeight: 20 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: COULEURS.card,
  },
  topBarBack: { color: COULEURS.amber, fontSize: 14, fontWeight: '600' },
  topBarCenter: { flex: 1, alignItems: 'center' },
  topBarTitle: { color: COULEURS.blanc, fontSize: 13, fontWeight: '700' },
  topBarSub: { color: COULEURS.gris, fontSize: 11, marginTop: 2 },
  topBarRecap: { color: COULEURS.vert, fontSize: 14, fontWeight: '600' },

  progressBg: { height: 4, backgroundColor: COULEURS.cardAlt },
  progressFill: { height: 4, backgroundColor: COULEURS.vert },

  cardContainer: { padding: 16 },

  card: {
    backgroundColor: COULEURS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COULEURS.vert,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    marginRight: 8,
  },
  priorityText: { color: COULEURS.blanc, fontSize: 11, fontWeight: '800' },
  cardCategorie: { color: COULEURS.amber, fontSize: 11, fontWeight: '600', flex: 1 },
  cardCode: { color: COULEURS.gris, fontSize: 11 },
  cardLibelle: { color: COULEURS.blanc, fontSize: 16, fontWeight: '600', lineHeight: 22 },
  cardDescription: { color: COULEURS.gris, fontSize: 13, marginTop: 8, lineHeight: 18 },

  reponsesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  btnReponse: {
    width: '48%',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    marginBottom: 8,
  },
  btnReponseText: { fontSize: 14, fontWeight: '700' },

  graviteSection: { marginBottom: 14 },
  graviteRow: { flexDirection: 'row', justifyContent: 'space-between' },
  btnGravite: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  btnGraviteText: { fontSize: 12, fontWeight: '700' },

  label: { color: COULEURS.amber, fontSize: 12, fontWeight: '600', marginTop: 10, marginBottom: 6 },
  textArea: {
    backgroundColor: COULEURS.card,
    color: COULEURS.blanc,
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    minHeight: 70,
    textAlignVertical: 'top',
  },

  photoBox: { backgroundColor: COULEURS.card, borderRadius: 8, padding: 8 },
  photoPreview: { width: '100%', height: 200, borderRadius: 6 },
  btnRetirerPhoto: {
    backgroundColor: COULEURS.rouge,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  btnRetirerPhotoText: { color: COULEURS.blanc, fontWeight: '600' },

  photoActionsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  btnPhoto: {
    flex: 1,
    backgroundColor: COULEURS.cardAlt,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  btnPhotoText: { color: COULEURS.vert, fontSize: 13, fontWeight: '600' },

  bottomBar: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COULEURS.card,
    borderTopWidth: 1,
    borderTopColor: COULEURS.cardAlt,
  },
  btnNav: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COULEURS.cardAlt,
    marginRight: 8,
  },
  btnNavText: { color: COULEURS.gris, fontSize: 13 },
  btnNavDisabled: { opacity: 0.4 },
  btnSuivant: {
    flex: 1,
    backgroundColor: COULEURS.vert,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnSuivantText: { color: COULEURS.bg, fontSize: 14, fontWeight: '700' },

  recapContainer: { flex: 1, backgroundColor: COULEURS.bg, padding: 20 },
  recapTitle: { color: COULEURS.vert, fontSize: 22, fontWeight: '700', marginTop: 30, marginBottom: 24 },
  recapStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statBox: { flex: 1, alignItems: 'center', backgroundColor: COULEURS.card, padding: 14, marginHorizontal: 4, borderRadius: 8 },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { color: COULEURS.gris, fontSize: 11, marginTop: 4 },
  recapInfo: { color: COULEURS.gris, textAlign: 'center', fontSize: 13, marginBottom: 20 },
  recapAlert: { backgroundColor: COULEURS.cardAlt, padding: 14, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: COULEURS.rouge, marginBottom: 14 },
  recapAlertText: { color: COULEURS.rouge, fontWeight: '600' },

  btnPrimary: { backgroundColor: COULEURS.vert, padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 14 },
  btnPrimaryDimmed: { backgroundColor: COULEURS.amber },
  btnPrimaryText: { color: COULEURS.bg, fontSize: 15, fontWeight: '700' },
  btnSecondary: { backgroundColor: COULEURS.cardAlt, padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  btnSecondaryText: { color: COULEURS.vert, fontWeight: '600' },
  btnTextOnly: { padding: 12, alignItems: 'center', marginTop: 10 },
  btnTextOnlyText: { color: COULEURS.gris },
});