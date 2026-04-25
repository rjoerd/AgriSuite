// screens/PlancheFormScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView,
  TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  insertPlanche,
  updatePlanche,
  getPlanchemById,
} from '../database/maraicher';

const COULEURS = {
  fond: '#1a2e1a',
  carte: '#243524',
  bordure: '#2d4a2d',
  vert: '#7ec87e',
  vertFonce: '#4a9a4a',
  texte: '#e8f5e8',
  texteFaible: '#8fbc8f',
  orange: '#FFA726',
  rouge: '#EF5350',
  champ: '#1f301f',
};

// Sélecteur boutons radio
function Selecteur({ label, options, valeur, onChange }) {
  return (
    <View style={styles.champ}>
      <Text style={styles.champLabel}>{label}</Text>
      <View style={styles.optionsRangee}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.valeur}
            style={[styles.optionBtn, valeur === opt.valeur && styles.optionBtnActif]}
            onPress={() => onChange(opt.valeur)}
          >
            <Text style={[styles.optionTexte, valeur === opt.valeur && styles.optionTexteActif]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const OPTIONS_EAU = [
  { valeur: 'inconnu', label: '❓ Inconnu' },
  { valeur: 'aucune', label: '🚫 Aucune' },
  { valeur: 'limite', label: '💧 Limitée' },
  { valeur: 'suffisant', label: '💧💧 Suffisant' },
];

const OPTIONS_SOL = [
  { valeur: 'argileux', label: 'Argileux' },
  { valeur: 'limoneux', label: 'Limoneux' },
  { valeur: 'sableux', label: 'Sableux' },
  { valeur: 'alluvial', label: 'Alluvial' },
  { valeur: 'inconnu', label: 'Inconnu' },
];

const OPTIONS_EXPOSITION = [
  { valeur: 'nord', label: 'Nord' },
  { valeur: 'sud', label: 'Sud' },
  { valeur: 'est', label: 'Est' },
  { valeur: 'ouest', label: 'Ouest' },
  { valeur: 'mi-ombre', label: 'Mi-ombre' },
];

export default function PlancheFormScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { siteId, siteCode, plancheId } = route.params;
  const isEdit = !!plancheId;

  const [form, setForm] = useState({
    nom: '',
    superficie_m2: '',
    type_sol: 'inconnu',
    exposition: 'sud',
    niveau_eau: 'inconnu',
    notes: '',
  });

  useEffect(() => {
    if (isEdit) {
      const planche = getPlanchemById(plancheId);
      if (planche) {
        setForm({
          nom: planche.nom,
          superficie_m2: String(planche.superficie_m2),
          type_sol: planche.type_sol || 'inconnu',
          exposition: planche.exposition || 'sud',
          niveau_eau: planche.niveau_eau || 'inconnu',
          notes: planche.notes || '',
        });
      }
    }
  }, [isEdit, plancheId]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const valider = () => {
    if (!form.nom.trim()) {
      Alert.alert('Champ requis', 'Donnez un nom à cette planche.');
      return;
    }
    const sup = parseFloat(form.superficie_m2);
    if (!form.superficie_m2 || isNaN(sup) || sup <= 0) {
      Alert.alert('Surface invalide', 'Entrez une surface en m² (ex: 25).');
      return;
    }

    const data = {
      site_id: siteId,
      nom: form.nom.trim(),
      superficie_m2: sup,
      type_sol: form.type_sol,
      exposition: form.exposition,
      niveau_eau: form.niveau_eau,
      notes: form.notes.trim() || null,
    };

    if (isEdit) {
      updatePlanche(plancheId, data);
    } else {
      insertPlanche(data);
    }

    navigation.goBack();
  };

  return (
    <View style={[styles.conteneur, { paddingTop: insets.top }]}>
      {/* En-tête */}
      <View style={styles.entete}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.boutonRetour}>
          <Text style={styles.texteRetour}>✕ Annuler</Text>
        </TouchableOpacity>
        <Text style={styles.titre}>
          {isEdit ? 'Modifier la planche' : 'Nouvelle planche'}
        </Text>
        <TouchableOpacity onPress={valider} style={styles.boutonSauver}>
          <Text style={styles.boutonSaverTexte}>Sauver</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionInfo}>
            {siteCode} — Une planche est une zone délimitée du terrain.
          </Text>

          {/* Nom */}
          <View style={styles.champ}>
            <Text style={styles.champLabel}>Nom de la planche *</Text>
            <TextInput
              style={styles.input}
              value={form.nom}
              onChangeText={(v) => set('nom', v)}
              placeholder="Ex: Planche Nord, Carré tomates, Rang gingembre"
              placeholderTextColor={COULEURS.texteFaible}
            />
          </View>

          {/* Surface */}
          <View style={styles.champ}>
            <Text style={styles.champLabel}>Surface (m²) *</Text>
            <TextInput
              style={styles.input}
              value={form.superficie_m2}
              onChangeText={(v) => set('superficie_m2', v)}
              keyboardType="decimal-pad"
              placeholder="Ex: 25"
              placeholderTextColor={COULEURS.texteFaible}
            />
            {form.superficie_m2 && !isNaN(parseFloat(form.superficie_m2)) && (
              <Text style={styles.champAide}>
                ≈ {(parseFloat(form.superficie_m2) / 10000).toFixed(4)} ha
              </Text>
            )}
          </View>

          {/* Eau */}
          <Selecteur
            label="Accès à l'eau"
            options={OPTIONS_EAU}
            valeur={form.niveau_eau}
            onChange={(v) => set('niveau_eau', v)}
          />

          {/* Sol */}
          <Selecteur
            label="Type de sol"
            options={OPTIONS_SOL}
            valeur={form.type_sol}
            onChange={(v) => set('type_sol', v)}
          />

          {/* Exposition */}
          <Selecteur
            label="Exposition / orientation"
            options={OPTIONS_EXPOSITION}
            valeur={form.exposition}
            onChange={(v) => set('exposition', v)}
          />

          {/* Notes */}
          <View style={styles.champ}>
            <Text style={styles.champLabel}>Notes (optionnel)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiligne]}
              value={form.notes}
              onChangeText={(v) => set('notes', v)}
              placeholder="Observations, contraintes particulières..."
              placeholderTextColor={COULEURS.texteFaible}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: { flex: 1, backgroundColor: COULEURS.fond },
  entete: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COULEURS.bordure,
  },
  boutonRetour: { paddingRight: 12 },
  texteRetour: { color: COULEURS.rouge, fontSize: 14 },
  titre: { flex: 1, color: COULEURS.texte, fontSize: 17, fontWeight: 'bold', textAlign: 'center' },
  boutonSauver: {
    backgroundColor: COULEURS.vertFonce,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8,
  },
  boutonSaverTexte: { color: COULEURS.texte, fontWeight: '700', fontSize: 14 },
  scroll: { flex: 1 },
  section: { padding: 16 },
  sectionInfo: {
    color: COULEURS.texteFaible, fontSize: 12,
    marginBottom: 20, fontStyle: 'italic',
  },
  champ: { marginBottom: 20 },
  champLabel: {
    color: COULEURS.vert, fontSize: 13,
    fontWeight: '600', marginBottom: 8,
  },
  input: {
    backgroundColor: COULEURS.champ,
    borderWidth: 1, borderColor: COULEURS.bordure,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    color: COULEURS.texte, fontSize: 15,
  },
  inputMultiligne: { height: 80, textAlignVertical: 'top' },
  champAide: { color: COULEURS.texteFaible, fontSize: 11, marginTop: 4 },
  optionsRangee: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionBtn: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1, borderColor: COULEURS.bordure,
    backgroundColor: COULEURS.champ,
  },
  optionBtnActif: {
    backgroundColor: COULEURS.vertFonce,
    borderColor: COULEURS.vert,
  },
  optionTexte: { color: COULEURS.texteFaible, fontSize: 13 },
  optionTexteActif: { color: COULEURS.texte, fontWeight: '600' },
});