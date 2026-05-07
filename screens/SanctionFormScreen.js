// screens/SanctionFormScreen.js
// Création / consultation / levée d'une sanction SCI

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import {
  creerSanction,
  leverSanction,
  getSanctionById,
  getTypeSanctionLabel,
  getTypeSanctionColor,
} from '../database/sciSanctions';

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

const TYPES_SANCTION = [
  { code: 'avertissement', label: '⚠ Avertissement', desc: '1ère violation, pas de retrait label. Action corrective obligatoire.' },
  { code: 'suspension', label: '⏸ Suspension', desc: 'Retrait temporaire du label. Le producteur ne peut plus livrer en BIO/Fairtrade.' },
  { code: 'exclusion', label: '🚫 Exclusion', desc: 'Sortie définitive du SCI. Récidive ou faute grave.' },
];

export default function SanctionFormScreen({ route, navigation }) {
  const sanctionId = route.params?.sanctionId || null;
  const fournisseurIdInit = route.params?.fournisseurId || null;
  const referentielCodeInit = route.params?.referentielCode || null;
  const inspectionIdInit = route.params?.inspectionId || null;
  const isView = !!sanctionId;

  const [sanction, setSanction] = useState(null);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showLeveeModal, setShowLeveeModal] = useState(false);

  // Form fields (création)
  const [typeSanction, setTypeSanction] = useState('avertissement');
  const [motif, setMotif] = useState('');
  const [dateSanction, setDateSanction] = useState(new Date().toISOString().split('T')[0]);
  const [decideur, setDecideur] = useState('');
  const [actionCorrective, setActionCorrective] = useState('');
  const [notes, setNotes] = useState('');

  // Levée
  const [dateLevee, setDateLevee] = useState(new Date().toISOString().split('T')[0]);
  const [motifLevee, setMotifLevee] = useState('');
  const [decideurLevee, setDecideurLevee] = useState('');

  useEffect(() => {
    if (isView) {
      const s = getSanctionById(sanctionId);
      if (s) setSanction(s);
    }
  }, [sanctionId, isView]);

  const validerDate = (str) => /^\d{4}-\d{2}-\d{2}$/.test(str);

  const handleCreer = () => {
    if (!motif.trim()) {
      Alert.alert('Motif requis', 'Décrivez la raison de la sanction');
      return;
    }
    if (!validerDate(dateSanction)) {
      Alert.alert('Date invalide', 'Format AAAA-MM-JJ');
      return;
    }
    if (!decideur.trim()) {
      Alert.alert('Décideur requis', 'Qui prend la décision ?');
      return;
    }
    if (typeSanction !== 'avertissement' && !actionCorrective.trim()) {
      Alert.alert('Action corrective requise', 'Pour suspension/exclusion, précisez l\'action corrective demandée');
      return;
    }

    Alert.alert(
      'Confirmer la sanction ?',
      `${getTypeSanctionLabel(typeSanction)} — action irréversible inscrite au registre.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          style: 'destructive',
          onPress: () => {
            try {
              const id = creerSanction({
                fournisseur_id: fournisseurIdInit,
                referentiel_code: referentielCodeInit,
                inspection_id: inspectionIdInit,
                type_sanction: typeSanction,
                motif: motif.trim(),
                date_sanction: dateSanction,
                decideur: decideur.trim(),
                action_corrective_demandee: actionCorrective.trim() || null,
                notes: notes.trim() || null,
              });
              console.log('[SanctionForm] Sanction créée:', id);
              Alert.alert('✓ Sanction enregistrée', '', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (e) {
              Alert.alert('Erreur', e.message);
            }
          },
        },
      ]
    );
  };

  const handleLever = () => {
    if (!validerDate(dateLevee)) {
      Alert.alert('Date invalide', 'Format AAAA-MM-JJ');
      return;
    }
    if (!motifLevee.trim()) {
      Alert.alert('Motif requis', 'Décrivez la raison de la levée (action corrective réalisée, etc.)');
      return;
    }
    if (!decideurLevee.trim()) {
      Alert.alert('Décideur requis', 'Qui décide la levée ?');
      return;
    }

    try {
      leverSanction(sanctionId, {
        date_levee: dateLevee,
        motif_levee: motifLevee.trim(),
        decideur: decideurLevee.trim(),
      });
      console.log('[SanctionForm] Sanction levée:', sanctionId);
      Alert.alert('✓ Sanction levée', 'L\'historique est conservé au registre.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Erreur', e.message);
    }
  };

  const formatDate = (str) => {
    if (!str) return '—';
    const d = new Date(str);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // ============================================================
  // VUE CONSULTATION (sanction existante)
  // ============================================================
  if (isView && sanction) {
    const isLevee = sanction.date_levee !== null || sanction.type_sanction === 'levee';
    const peutEtreLevee = !isLevee && sanction.type_sanction !== 'levee';

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.bandeau, { backgroundColor: getTypeSanctionColor(sanction.type_sanction) }]}>
            <Text style={styles.bandeauText}>
              {getTypeSanctionLabel(sanction.type_sanction).toUpperCase()}
              {isLevee && ' — LEVÉE'}
            </Text>
          </View>

          <View style={styles.section}>
            <Row label="Producteur" value={`${sanction.fournisseur_code} · ${sanction.fournisseur_nom}`} />
            <Row label="Référentiel" value={sanction.referentiel_code} />
            <Row label="Type" value={getTypeSanctionLabel(sanction.type_sanction)} />
            <Row label="Date sanction" value={formatDate(sanction.date_sanction)} />
            <Row label="Décideur" value={sanction.decideur} />
            {isLevee && <Row label="Date levée" value={formatDate(sanction.date_levee)} />}
            {sanction.action_corrective_realisee === 1 && <Row label="Action corrective" value="✓ Réalisée" />}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Motif</Text>
            <View style={styles.notesBlock}>
              <Text style={styles.notesText}>{sanction.motif}</Text>
            </View>
          </View>

          {!!sanction.action_corrective_demandee && (
            <View style={styles.section}>
              <Text style={styles.label}>Action corrective demandée</Text>
              <View style={styles.notesBlock}>
                <Text style={styles.notesText}>{sanction.action_corrective_demandee}</Text>
              </View>
            </View>
          )}

          {!!sanction.notes && (
            <View style={styles.section}>
              <Text style={styles.label}>Notes</Text>
              <View style={styles.notesBlock}>
                <Text style={styles.notesText}>{sanction.notes}</Text>
              </View>
            </View>
          )}

          {peutEtreLevee && (
            <TouchableOpacity 
              style={[styles.btnAction, { backgroundColor: COULEURS.vert }]}
              onPress={() => setShowLeveeModal(true)}
            >
              <Text style={styles.btnActionText}>✓ Lever cette sanction</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Modal levée */}
        <Modal visible={showLeveeModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Lever la sanction</Text>
              <Text style={styles.hint}>
                La sanction reste au registre (append-only) avec mention "levée".
              </Text>

              <Text style={styles.label}>Date de levée *</Text>
              <TextInput
                style={styles.input}
                value={dateLevee}
                onChangeText={setDateLevee}
                placeholder="2026-06-15"
                placeholderTextColor={COULEURS.gris}
              />

              <Text style={styles.label}>Décideur *</Text>
              <TextInput
                style={styles.input}
                value={decideurLevee}
                onChangeText={setDecideurLevee}
                placeholder="Ex: Jean Rakoto, Responsable SCI"
                placeholderTextColor={COULEURS.gris}
              />

              <Text style={styles.label}>Motif de la levée *</Text>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={motifLevee}
                onChangeText={setMotifLevee}
                placeholder="Ex: Action corrective réalisée et vérifiée — preuves photo + analyse..."
                placeholderTextColor={COULEURS.gris}
                multiline
              />

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.btnAction, { backgroundColor: COULEURS.cardAlt, flex: 1, marginRight: 6 }]}
                  onPress={() => setShowLeveeModal(false)}
                >
                  <Text style={[styles.btnActionText, { color: COULEURS.gris }]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.btnAction, { backgroundColor: COULEURS.vert, flex: 1, marginLeft: 6 }]}
                  onPress={handleLever}
                >
                  <Text style={styles.btnActionText}>✓ Lever</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ============================================================
  // VUE CRÉATION
  // ============================================================
  const typeLabel = TYPES_SANCTION.find((t) => t.code === typeSanction);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>🚫 Déclencher une sanction</Text>

        <Text style={styles.label}>Type de sanction *</Text>
        <TouchableOpacity style={styles.selector} onPress={() => setShowTypeModal(true)}>
          <Text style={styles.selectorText}>{typeLabel?.label || typeSanction}</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>{typeLabel?.desc}</Text>

        <Text style={styles.label}>Motif détaillé *</Text>
        <TextInput
          style={[styles.input, styles.inputMulti]}
          value={motif}
          onChangeText={setMotif}
          placeholder="Ex: Utilisation de pesticide synthétique constatée le 12/05 — preuves photo lors inspection #5"
          placeholderTextColor={COULEURS.gris}
          multiline
        />

        <Text style={styles.label}>Date de la décision * (AAAA-MM-JJ)</Text>
        <TextInput
          style={styles.input}
          value={dateSanction}
          onChangeText={setDateSanction}
          placeholder="2026-06-15"
          placeholderTextColor={COULEURS.gris}
        />

        <Text style={styles.label}>Décideur *</Text>
        <TextInput
          style={styles.input}
          value={decideur}
          onChangeText={setDecideur}
          placeholder="Ex: Jean Rakoto, Responsable SCI"
          placeholderTextColor={COULEURS.gris}
        />

        <Text style={styles.label}>Action corrective demandée {typeSanction !== 'avertissement' && '*'}</Text>
        <TextInput
          style={[styles.input, styles.inputMulti]}
          value={actionCorrective}
          onChangeText={setActionCorrective}
          placeholder="Ex: Destruction des stocks contaminés + formation pesticides + nouvelle inspection sous 30j"
          placeholderTextColor={COULEURS.gris}
          multiline
        />

        <Text style={styles.label}>Notes internes</Text>
        <TextInput
          style={[styles.input, styles.inputMulti]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Contexte, antécédents..."
          placeholderTextColor={COULEURS.gris}
          multiline
        />

        <TouchableOpacity 
          style={[styles.btnAction, { backgroundColor: getTypeSanctionColor(typeSanction) }]}
          onPress={handleCreer}
        >
          <Text style={styles.btnActionText}>
            {TYPES_SANCTION.find((t) => t.code === typeSanction)?.label} — Confirmer
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal types */}
      <Modal visible={showTypeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Type de sanction</Text>
            {TYPES_SANCTION.map((t) => (
              <TouchableOpacity
                key={t.code}
                style={styles.modalItem}
                onPress={() => {
                  setTypeSanction(t.code);
                  setShowTypeModal(false);
                }}
              >
                <Text style={styles.modalItemText}>{t.label}</Text>
                <Text style={styles.modalItemSub}>{t.desc}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowTypeModal(false)}>
              <Text style={styles.modalCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const Row = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COULEURS.bg },
  scrollContent: { padding: 16 },
  title: { color: COULEURS.vert, fontSize: 22, fontWeight: '700', marginBottom: 18 },

  bandeau: { padding: 16, borderRadius: 10, alignItems: 'center', marginBottom: 16 },
  bandeauText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  section: { backgroundColor: COULEURS.card, borderRadius: 12, padding: 14, marginBottom: 14 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COULEURS.cardAlt,
  },
  rowLabel: { color: COULEURS.gris, fontSize: 12, flex: 1 },
  rowValue: { color: COULEURS.blanc, fontSize: 13, flex: 2, textAlign: 'right', fontWeight: '500' },

  label: { color: COULEURS.amber, fontSize: 13, fontWeight: '600', marginTop: 14, marginBottom: 6 },
  hint: { color: COULEURS.gris, fontSize: 11, fontStyle: 'italic', marginTop: 4, marginBottom: 6 },

  input: {
    backgroundColor: COULEURS.card, color: COULEURS.blanc,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
  },
  inputMulti: { minHeight: 70, textAlignVertical: 'top' },

  selector: {
    backgroundColor: COULEURS.card, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 12,
  },
  selectorText: { color: COULEURS.blanc, fontSize: 14 },

  notesBlock: { backgroundColor: COULEURS.cardAlt, padding: 12, borderRadius: 8 },
  notesText: { color: COULEURS.blanc, fontSize: 13, lineHeight: 18 },

  btnAction: {
    padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 24,
  },
  btnActionText: { color: COULEURS.bg, fontWeight: '700', fontSize: 14 },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COULEURS.bg,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '85%',
  },
  modalTitle: {
    color: COULEURS.vert, fontSize: 17, fontWeight: '700', marginBottom: 14,
  },
  modalItem: {
    paddingVertical: 12, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: COULEURS.cardAlt,
  },
  modalItemText: { color: COULEURS.blanc, fontSize: 15 },
  modalItemSub: { color: COULEURS.gris, fontSize: 12, marginTop: 3 },
  modalClose: {
    backgroundColor: COULEURS.cardAlt, borderRadius: 8,
    padding: 12, alignItems: 'center', marginTop: 14,
  },
  modalCloseText: { color: COULEURS.blanc, fontWeight: '600' },
  modalActions: { flexDirection: 'row', marginTop: 20 },
});