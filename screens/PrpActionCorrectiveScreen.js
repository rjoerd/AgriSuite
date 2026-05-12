// screens/PrpActionCorrectiveScreen.js
// Phase 3 - Session 10c.3 - Action corrective sur NC PRP (ISO 22000 §8.9.2)

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getRegistreById,
  createActionCorrective,
  getTypePrpInfo,
} from '../database/prp';

// 5 types alignés Codex CXC 1-1969 §B.5 + ISO 22000 §8.9.2
const TYPES_ACTION = [
  {
    code: 'correction_immediate',
    label: 'Correction immédiate',
    desc: 'Action immédiate qui rétablit la conformité (ex : nouveau nettoyage, désinfection refaite)',
  },
  {
    code: 'retraitement',
    label: 'Retraitement',
    desc: 'Procédure complète à recommencer selon le plan PRP',
  },
  {
    code: 'formation',
    label: 'Formation du personnel',
    desc: 'NC causée par méconnaissance — formation ou rappel BPF requis',
  },
  {
    code: 'maintenance',
    label: 'Maintenance / réparation',
    desc: 'Équipement défectueux à réparer ou remplacer',
  },
  {
    code: 'autre',
    label: 'Autre (à justifier)',
    desc: 'Décision dérogatoire — justification écrite obligatoire',
  },
];

export default function PrpActionCorrectiveScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { registreId } = route.params;

  const [registre, setRegistre] = useState(null);
  const [typeAction, setTypeAction] = useState('');
  const [description, setDescription] = useState('');
  const [responsable, setResponsable] = useState('');
  const [dateAction, setDateAction] = useState(new Date().toISOString().split('T')[0]);
  const [methodeVerif, setMethodeVerif] = useState('');
  const [efficaciteVerifiee, setEfficaciteVerifiee] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    try {
      const r = getRegistreById(registreId);
      setRegistre(r);
    } catch (e) {
      Alert.alert('Erreur', e.message);
    }
  }, [registreId]);

  const valider = () => {
    if (!typeAction) {
      Alert.alert('Type d\'action requis', 'Sélectionne le type d\'action corrective.');
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      Alert.alert('Description insuffisante', 'Détaille l\'action (min. 10 caractères). Un auditeur doit comprendre ce qui a été fait.');
      return;
    }
    if (!responsable.trim()) {
      Alert.alert('Responsable requis', 'Qui a décidé cette action ?');
      return;
    }

    if (typeAction === 'autre') {
      Alert.alert(
        '⚠ Décision dérogatoire',
        'L\'option "Autre" exige une justification solide en audit. Confirmer ?',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Confirmer', style: 'destructive', onPress: () => sauvegarder() },
        ]
      );
      return;
    }

    sauvegarder();
  };

  const sauvegarder = () => {
    try {
      createActionCorrective({
        registre_id: registreId,
        type_action: typeAction,
        description: description.trim(),
        responsable_decision: responsable.trim(),
        date_action: dateAction,
        date_resolution: efficaciteVerifiee ? dateAction : null,
        efficacite_verifiee: efficaciteVerifiee,
        methode_verification: methodeVerif.trim() || null,
        notes: notes.trim() || null,
      });

      Alert.alert(
        '✅ Action corrective enregistrée',
        'NC clôturée. Traçabilité ISO 22000 §8.9.2 préservée : registre NC conservé + action corrective horodatée.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e) {
      console.error('Sauvegarde action PRP:', e);
      Alert.alert('Erreur', e.message);
    }
  };

  if (!registre) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#7ec87e' }}>Chargement...</Text>
      </View>
    );
  }

  const info = getTypePrpInfo(registre.type_prp);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Action corrective PRP</Text>
          <Text style={styles.subtitle}>ISO 22000 §8.9.2 + Codex CXC 1-1969 §B.5</Text>

          {/* RAPPEL NC */}
          <View style={styles.ncCard}>
            <Text style={styles.ncBadge}>NC PRP — À CLÔTURER</Text>
            <Text style={styles.ncTitle}>
              {info?.icone} {registre.plan_nom}
            </Text>
            <Text style={styles.ncMeta}>Procédure : {registre.procedure_titre || '(libre)'}</Text>
            <Text style={styles.ncMeta}>Date NC : {registre.date_execution} {registre.heure_execution || ''}</Text>
            <Text style={styles.ncMeta}>Opérateur : {registre.operateur}</Text>
            {registre.lieu && <Text style={styles.ncMeta}>Lieu : {registre.lieu}</Text>}
            {registre.observations && (
              <Text style={styles.ncObs}>« {registre.observations} »</Text>
            )}
            {registre.valeurs_json && (
              <Text style={styles.ncObs}>Valeurs : {registre.valeurs_json}</Text>
            )}
          </View>

          {/* TYPE D'ACTION */}
          <Text style={styles.label}>Type d'action *</Text>
          {TYPES_ACTION.map(t => (
            <TouchableOpacity
              key={t.code}
              style={[styles.typeCard, typeAction === t.code && styles.typeCardSelected]}
              onPress={() => setTypeAction(t.code)}
            >
              <View style={styles.typeHeader}>
                <View style={[styles.radio, typeAction === t.code && styles.radioSelected]} />
                <Text style={[styles.typeLabel, typeAction === t.code && styles.typeLabelSelected]}>
                  {t.label}
                </Text>
              </View>
              <Text style={styles.typeDesc}>{t.desc}</Text>
            </TouchableOpacity>
          ))}

          {/* DESCRIPTION */}
          <Text style={styles.label}>Description de l'action *</Text>
          <Text style={styles.hint}>Ce qu'un auditeur doit pouvoir comprendre</Text>
          <TextInput
            style={styles.textarea}
            value={description}
            onChangeText={setDescription}
            placeholder="Ex : Nettoyage refait avec désinfectant alimentaire homologué. Contrôle ATP après : 45 RLU (conforme)."
            placeholderTextColor="#666"
            multiline
            numberOfLines={4}
          />

          {/* RESPONSABLE */}
          <Text style={styles.label}>Responsable de la décision *</Text>
          <TextInput
            style={styles.input}
            value={responsable}
            onChangeText={setResponsable}
            placeholder="Responsable qualité / gérant"
            placeholderTextColor="#666"
          />

          {/* DATE ACTION */}
          <Text style={styles.label}>Date de l'action *</Text>
          <TextInput
            style={styles.input}
            value={dateAction}
            onChangeText={setDateAction}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#666"
          />

          {/* MÉTHODE VÉRIFICATION */}
          <Text style={styles.label}>Méthode de vérification</Text>
          <Text style={styles.hint}>Comment prouver que l'action a fonctionné ?</Text>
          <TextInput
            style={styles.input}
            value={methodeVerif}
            onChangeText={setMethodeVerif}
            placeholder="Ex : Nouveau contrôle ATP, ré-inspection visuelle..."
            placeholderTextColor="#666"
          />

          {/* EFFICACITÉ VÉRIFIÉE */}
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setEfficaciteVerifiee(!efficaciteVerifiee)}
          >
            <View style={[styles.checkbox, efficaciteVerifiee && styles.checkboxChecked]}>
              {efficaciteVerifiee && <Text style={styles.checkboxIcon}>✓</Text>}
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.checkboxLabel}>Efficacité vérifiée</Text>
              <Text style={styles.checkboxHint}>
                L'action a été contrôlée et a corrigé la NC (sinon action en cours)
              </Text>
            </View>
          </TouchableOpacity>

          {/* NOTES */}
          <Text style={styles.label}>Notes additionnelles</Text>
          <TextInput
            style={styles.textarea}
            value={notes}
            onChangeText={setNotes}
            placeholder="Cause racine, mesures préventives à venir..."
            placeholderTextColor="#666"
            multiline
            numberOfLines={3}
          />

          {/* BOUTONS */}
          <TouchableOpacity style={styles.btnValider} onPress={valider}>
            <Text style={styles.btnValiderText}>✅ Enregistrer et clôturer la NC</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnAnnuler} onPress={() => navigation.goBack()}>
            <Text style={styles.btnAnnulerText}>Annuler</Text>
          </TouchableOpacity>

          <Text style={styles.footer}>
            💡 Le registre NC original reste intact (horodatage infalsifiable).
            L'action corrective est ajoutée en complément.
          </Text>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a2e1a' },
  content: { padding: 16, paddingBottom: 60 },
  title: { color: '#7ec87e', fontSize: 22, fontWeight: 'bold' },
  subtitle: { color: '#888', fontSize: 12, fontStyle: 'italic', marginBottom: 20 },

  ncCard: {
    backgroundColor: '#3a2a2a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: '#e74c3c',
  },
  ncBadge: {
    color: '#fff',
    backgroundColor: '#e74c3c',
    fontSize: 10, fontWeight: 'bold',
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 4, alignSelf: 'flex-start',
    marginBottom: 8,
  },
  ncTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold', marginBottom: 6 },
  ncMeta: { color: '#bbb', fontSize: 12, marginTop: 2 },
  ncObs: { color: '#d4a04a', fontSize: 12, marginTop: 8, fontStyle: 'italic' },

  label: { color: '#7ec87e', fontSize: 14, fontWeight: 'bold', marginTop: 16, marginBottom: 4 },
  hint: { color: '#888', fontSize: 11, fontStyle: 'italic', marginBottom: 8 },

  input: {
    backgroundColor: '#2a3e2a', color: '#fff',
    padding: 12, borderRadius: 6, fontSize: 14,
  },
  textarea: {
    backgroundColor: '#2a3e2a', color: '#fff',
    padding: 12, borderRadius: 6, fontSize: 14,
    textAlignVertical: 'top', minHeight: 80,
  },

  typeCard: {
    backgroundColor: '#2a3e2a',
    borderRadius: 6, padding: 12,
    marginBottom: 6,
    borderWidth: 1, borderColor: 'transparent',
  },
  typeCardSelected: {
    borderColor: '#7ec87e',
    backgroundColor: '#2e4a2e',
  },
  typeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  radio: {
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 2, borderColor: '#7ec87e',
    marginRight: 10,
  },
  radioSelected: { backgroundColor: '#7ec87e' },
  typeLabel: { color: '#ccc', fontSize: 14, fontWeight: 'bold' },
  typeLabelSelected: { color: '#7ec87e' },
  typeDesc: { color: '#888', fontSize: 11, marginLeft: 26 },

  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#2a3e2a',
    borderRadius: 6,
  },
  checkbox: {
    width: 22, height: 22,
    borderWidth: 2, borderColor: '#7ec87e',
    borderRadius: 4,
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: '#7ec87e' },
  checkboxIcon: { color: '#1a2e1a', fontWeight: 'bold', fontSize: 14 },
  checkboxLabel: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  checkboxHint: { color: '#888', fontSize: 11, marginTop: 2 },

  btnValider: {
    backgroundColor: '#7ec87e',
    padding: 16, borderRadius: 8,
    marginTop: 24, alignItems: 'center',
  },
  btnValiderText: { color: '#1a2e1a', fontSize: 15, fontWeight: 'bold' },

  btnAnnuler: { padding: 14, marginTop: 8, alignItems: 'center' },
  btnAnnulerText: { color: '#888', fontSize: 14 },

  footer: { color: '#666', fontSize: 11, fontStyle: 'italic', marginTop: 16, textAlign: 'center' },
});