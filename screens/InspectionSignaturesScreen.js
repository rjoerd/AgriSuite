// screens/InspectionSignaturesScreen.js
// Signatures producteur (3 modes) + inspecteur + clôture inspection

import React, { useState, useRef } from 'react';
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
import SignatureScreen from 'react-native-signature-canvas';
import {
  getInspectionRealisee,
  updateInspectionRealisee,
  cloturerInspection,
  calculerConclusion,
} from '../database/sciInspectionsRealisation';

const COULEURS = {
  bg: '#1a2e1a',
  card: '#243824',
  cardAlt: '#2a4a2a',
  vert: '#7ec87e',
  amber: '#d4a04a',
  rouge: '#e74c3c',
  gris: '#9ca39c',
  blanc: '#ffffff',
};

const MODES_SIGNATURE = [
  { code: 'manuscrite', label: '✍ Signature manuscrite', desc: 'Producteur signe sur la tablette' },
  { code: 'empreinte', label: '👆 Empreinte digitale', desc: 'Photo du pouce sur le rapport papier' },
  { code: 'temoin', label: '👥 Témoin', desc: 'Refus producteur — un tiers signe' },
];

export default function InspectionSignaturesScreen({ route, navigation }) {
  const inspectionRealiseeId = route.params?.inspectionRealiseeId;

  const [modeSignature, setModeSignature] = useState(null);

  // Producteur
  const [signatureProducteurData, setSignatureProducteurData] = useState(null);
  const [photoProducteurUri, setPhotoProducteurUri] = useState(null);

  // Témoin
  const [temoinNom, setTemoinNom] = useState('');
  const [temoinSignatureData, setTemoinSignatureData] = useState(null);

  // Inspecteur
  const [signatureInspecteurData, setSignatureInspecteurData] = useState(null);

  // Notes générales
  const [notesGenerales, setNotesGenerales] = useState('');
  const [dureeMinutes, setDureeMinutes] = useState('');

  // Modaux signature
  const [signatureModalCible, setSignatureModalCible] = useState(null);
  // 'producteur' / 'temoin' / 'inspecteur'

  const sigRef = useRef(null);

  const ouvrirSignatureModal = (cible) => {
    setSignatureModalCible(cible);
  };

  const onSignatureOK = (sig) => {
    // sig = data URL "data:image/png;base64,..."
    if (signatureModalCible === 'producteur') setSignatureProducteurData(sig);
    if (signatureModalCible === 'temoin') setTemoinSignatureData(sig);
    if (signatureModalCible === 'inspecteur') setSignatureInspecteurData(sig);
    setSignatureModalCible(null);
  };

  const onSignatureEmpty = () => {
    Alert.alert('Signature vide', 'Veuillez signer avant de valider');
  };

  const handleConfirmSig = () => {
    sigRef.current?.readSignature();
  };

  const handleClearSig = () => {
    sigRef.current?.clearSignature();
  };

  const prendrePhotoProducteur = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission refusée', 'Activez la caméra dans les réglages.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (!result.canceled && result.assets?.[0]) {
      setPhotoProducteurUri(result.assets[0].uri);
    }
  };

  const cloturer = () => {
    // Validations métier
    if (!modeSignature) {
      Alert.alert('Mode signature requis', 'Choisissez : manuscrite, empreinte, ou témoin');
      return;
    }
    if (!photoProducteurUri) {
      Alert.alert('Photo producteur requise', 'Photo du producteur tenant le rapport (preuve d\'opposabilité)');
      return;
    }
    if (modeSignature === 'manuscrite' && !signatureProducteurData) {
      Alert.alert('Signature producteur requise', 'Demandez au producteur de signer');
      return;
    }
    if (modeSignature === 'temoin') {
      if (!temoinNom.trim()) {
        Alert.alert('Nom témoin requis', 'Saisissez le nom complet du témoin');
        return;
      }
      if (!temoinSignatureData) {
        Alert.alert('Signature témoin requise', 'Demandez au témoin de signer');
        return;
      }
    }
    if (!signatureInspecteurData) {
      Alert.alert('Signature inspecteur requise', 'L\'inspecteur doit signer');
      return;
    }

    const conclusion = calculerConclusion(inspectionRealiseeId);

    Alert.alert(
      'Clôturer l\'inspection ?',
      `Conclusion auto : ${libelleConclusion(conclusion)}\n\nLes signatures et réponses ne seront plus modifiables.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Clôturer',
          style: 'destructive',
          onPress: () => {
            try {
              updateInspectionRealisee(inspectionRealiseeId, {
                conclusion,
                signature_producteur_type: modeSignature,
                signature_producteur_data: signatureProducteurData,
                photo_producteur_uri: photoProducteurUri,
                temoin_nom: temoinNom.trim() || null,
                temoin_signature_data: temoinSignatureData,
                signature_inspecteur_data: signatureInspecteurData,
                notes_generales: notesGenerales.trim() || null,
                duree_minutes: dureeMinutes ? parseInt(dureeMinutes, 10) : null,
              });
              cloturerInspection(inspectionRealiseeId);
              console.log('[InspectionSignatures] Inspection clôturée:', inspectionRealiseeId);
             Alert.alert('✓ Inspection clôturée', 'Le rapport est consigné et opposable.', [
  {
    text: 'Voir le détail',
    onPress: () => navigation.replace('InspectionDetail', { 
      inspectionRealiseeId: inspectionRealiseeId 
    }),
  },
]);
            } catch (e) {
              console.error('[InspectionSignatures] Erreur clôture:', e);
              Alert.alert('Erreur', e.message);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Signatures & clôture</Text>

        {/* === SECTION PHOTO PRODUCTEUR === */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📸 Photo du producteur (obligatoire)</Text>
          <Text style={styles.hint}>
            Producteur tenant le rapport / présent à l'inspection. Preuve d'opposabilité en cas de litige.
          </Text>
          {photoProducteurUri ? (
            <View>
              <Image source={{ uri: photoProducteurUri }} style={styles.photoPreview} />
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={prendrePhotoProducteur}
              >
                <Text style={styles.btnSecondaryText}>Reprendre photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.btnPrimary} onPress={prendrePhotoProducteur}>
              <Text style={styles.btnPrimaryText}>📷 Prendre la photo</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* === SECTION MODE SIGNATURE === */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mode de signature producteur *</Text>
          {MODES_SIGNATURE.map((m) => (
            <TouchableOpacity
              key={m.code}
              style={[styles.modeCard, modeSignature === m.code && styles.modeCardActive]}
              onPress={() => {
                setModeSignature(m.code);
                // reset data si on change
                setSignatureProducteurData(null);
                setTemoinNom('');
                setTemoinSignatureData(null);
              }}
            >
              <Text
                style={[
                  styles.modeCardLabel,
                  modeSignature === m.code && styles.modeCardLabelActive,
                ]}
              >
                {m.label}
              </Text>
              <Text style={styles.modeCardDesc}>{m.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* === SIGNATURE MANUSCRITE === */}
        {modeSignature === 'manuscrite' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Signature manuscrite producteur</Text>
            {signatureProducteurData ? (
              <View>
                <View style={styles.signatureBox}>
                  <Image source={{ uri: signatureProducteurData }} style={styles.signaturePreview} resizeMode="contain" />
                </View>
                <TouchableOpacity
                  style={styles.btnSecondary}
                  onPress={() => ouvrirSignatureModal('producteur')}
                >
                  <Text style={styles.btnSecondaryText}>Refaire la signature</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={() => ouvrirSignatureModal('producteur')}
              >
                <Text style={styles.btnPrimaryText}>✍ Signer</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* === EMPREINTE === */}
        {modeSignature === 'empreinte' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Empreinte digitale (sur rapport papier)</Text>
            <Text style={styles.hint}>
              La photo du producteur tenant le rapport (ci-dessus) sert de preuve d'empreinte. Aucune signature numérique requise.
            </Text>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                ✓ Empreinte enregistrée via la photo producteur
              </Text>
            </View>
          </View>
        )}

        {/* === TÉMOIN === */}
        {modeSignature === 'temoin' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Témoin (refus producteur)</Text>
            <Text style={styles.label}>Nom complet du témoin *</Text>
            <TextInput
              style={styles.input}
              value={temoinNom}
              onChangeText={setTemoinNom}
              placeholder="Ex: Jean Rabe (chef fokontany)"
              placeholderTextColor={COULEURS.gris}
            />

            <Text style={styles.label}>Signature témoin *</Text>
            {temoinSignatureData ? (
              <View>
                <View style={styles.signatureBox}>
                  <Image source={{ uri: temoinSignatureData }} style={styles.signaturePreview} resizeMode="contain" />
                </View>
                <TouchableOpacity
                  style={styles.btnSecondary}
                  onPress={() => ouvrirSignatureModal('temoin')}
                >
                  <Text style={styles.btnSecondaryText}>Refaire la signature</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={() => ouvrirSignatureModal('temoin')}
              >
                <Text style={styles.btnPrimaryText}>✍ Signer (témoin)</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* === SIGNATURE INSPECTEUR === */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Signature inspecteur *</Text>
          {signatureInspecteurData ? (
            <View>
              <View style={styles.signatureBox}>
                <Image source={{ uri: signatureInspecteurData }} style={styles.signaturePreview} resizeMode="contain" />
              </View>
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={() => ouvrirSignatureModal('inspecteur')}
              >
                <Text style={styles.btnSecondaryText}>Refaire la signature</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => ouvrirSignatureModal('inspecteur')}
            >
              <Text style={styles.btnPrimaryText}>✍ Signer (inspecteur)</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* === NOTES + DURÉE === */}
        <View style={styles.section}>
          <Text style={styles.label}>Durée inspection (minutes)</Text>
          <TextInput
            style={styles.input}
            value={dureeMinutes}
            onChangeText={setDureeMinutes}
            placeholder="Ex: 90"
            placeholderTextColor={COULEURS.gris}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Notes générales / observations finales</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notesGenerales}
            onChangeText={setNotesGenerales}
            placeholder="Contexte, points marquants, recommandations globales..."
            placeholderTextColor={COULEURS.gris}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* === BOUTON CLÔTURE === */}
        <TouchableOpacity style={styles.btnCloture} onPress={cloturer}>
          <Text style={styles.btnClotureText}>🔒 Clôturer l'inspection</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>
          Action irréversible. Le rapport sera horodaté et opposable.
        </Text>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* === MODAL SIGNATURE === */}
      <Modal visible={!!signatureModalCible} animationType="slide">
        <View style={styles.sigModalContainer}>
          <Text style={styles.sigModalTitle}>
            Signature {signatureModalCible === 'producteur' ? 'producteur' : signatureModalCible === 'temoin' ? 'témoin' : 'inspecteur'}
          </Text>
          <View style={styles.sigCanvasWrap}>
            <SignatureScreen
              ref={sigRef}
              onOK={onSignatureOK}
              onEmpty={onSignatureEmpty}
              webStyle={signatureWebStyle}
              backgroundColor="#ffffff"
              penColor="#000000"
              autoClear={false}
              imageType="image/png"
              descriptionText=""
            />
          </View>
          <View style={styles.sigModalActions}>
            <TouchableOpacity style={styles.sigBtnClear} onPress={handleClearSig}>
              <Text style={styles.sigBtnClearText}>Effacer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sigBtnCancel}
              onPress={() => setSignatureModalCible(null)}
            >
              <Text style={styles.sigBtnCancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sigBtnConfirm} onPress={handleConfirmSig}>
              <Text style={styles.sigBtnConfirmText}>✓ Valider</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function libelleConclusion(c) {
  if (c === 'conforme') return 'Conforme';
  if (c === 'non_conforme_mineure') return 'NC mineure';
  if (c === 'non_conforme_majeure') return 'NC majeure';
  if (c === 'non_conforme_critique') return 'NC critique';
  return '—';
}

const signatureWebStyle = `
  .m-signature-pad { box-shadow: none; border: none; }
  .m-signature-pad--body { border: 2px dashed #ccc; }
  .m-signature-pad--footer { display: none; margin: 0; }
  body, html { width: 100%; height: 100%; margin: 0; padding: 0; }
`;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COULEURS.bg },
  scrollContent: { padding: 16 },

  title: { color: COULEURS.vert, fontSize: 22, fontWeight: '700', marginBottom: 18 },
  section: { backgroundColor: COULEURS.card, borderRadius: 12, padding: 14, marginBottom: 14 },
  sectionTitle: { color: COULEURS.amber, fontSize: 14, fontWeight: '700', marginBottom: 10 },

  hint: { color: COULEURS.gris, fontSize: 11, fontStyle: 'italic', marginBottom: 10, lineHeight: 16 },
  label: { color: COULEURS.amber, fontSize: 12, fontWeight: '600', marginTop: 10, marginBottom: 6 },

  input: {
    backgroundColor: COULEURS.cardAlt,
    color: COULEURS.blanc,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },

  modeCard: {
    backgroundColor: COULEURS.cardAlt,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: COULEURS.cardAlt,
  },
  modeCardActive: {
    borderColor: COULEURS.vert,
    backgroundColor: COULEURS.bg,
  },
  modeCardLabel: { color: COULEURS.blanc, fontSize: 14, fontWeight: '600' },
  modeCardLabelActive: { color: COULEURS.vert },
  modeCardDesc: { color: COULEURS.gris, fontSize: 11, marginTop: 4 },

  btnPrimary: { backgroundColor: COULEURS.vert, padding: 14, borderRadius: 10, alignItems: 'center' },
  btnPrimaryText: { color: COULEURS.bg, fontWeight: '700' },
  btnSecondary: { backgroundColor: COULEURS.cardAlt, padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  btnSecondaryText: { color: COULEURS.vert, fontWeight: '600' },

  photoPreview: { width: '100%', height: 200, borderRadius: 8, marginBottom: 8 },

  signatureBox: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 8,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signaturePreview: { width: '100%', height: '100%' },

  infoBox: { backgroundColor: COULEURS.cardAlt, padding: 12, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: COULEURS.vert },
  infoText: { color: COULEURS.vert, fontSize: 13 },

  btnCloture: {
    backgroundColor: COULEURS.amber,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  btnClotureText: { color: COULEURS.bg, fontWeight: '800', fontSize: 15 },

  // Modal signature
  sigModalContainer: { flex: 1, backgroundColor: COULEURS.bg, padding: 16 },
  sigModalTitle: { color: COULEURS.vert, fontSize: 18, fontWeight: '700', marginTop: 30, marginBottom: 16 },
  sigCanvasWrap: { flex: 1, backgroundColor: '#ffffff', borderRadius: 10, overflow: 'hidden' },
  sigModalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  sigBtnClear: { backgroundColor: COULEURS.cardAlt, padding: 12, borderRadius: 8, flex: 1, marginRight: 6, alignItems: 'center' },
  sigBtnClearText: { color: COULEURS.amber, fontWeight: '600' },
  sigBtnCancel: { backgroundColor: COULEURS.cardAlt, padding: 12, borderRadius: 8, flex: 1, marginHorizontal: 6, alignItems: 'center' },
  sigBtnCancelText: { color: COULEURS.gris, fontWeight: '600' },
  sigBtnConfirm: { backgroundColor: COULEURS.vert, padding: 12, borderRadius: 8, flex: 1, marginLeft: 6, alignItems: 'center' },
  sigBtnConfirmText: { color: COULEURS.bg, fontWeight: '700' },
});