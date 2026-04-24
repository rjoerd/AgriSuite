import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView,
  TouchableOpacity, StyleSheet, SafeAreaView, Alert
} from 'react-native';
import { getSiteById, insertSite, updateSite } from '../database/db';

const CHAMPS = [
  { key: 'code', label: 'Code du site', placeholder: 'Ex: Site E', required: true },
  { key: 'superficie', label: 'Superficie', placeholder: 'Ex: 2 ha' },
  { key: 'region', label: 'Région / Zone', placeholder: 'Ex: Ampanotokana' },
  { key: 'altitude', label: 'Altitude', placeholder: 'Ex: ~1 300 m' },
  { key: 'type_terrain', label: 'Type de terrain', placeholder: 'Ex: Tanety' },
  { key: 'activite', label: 'Activité actuelle', placeholder: 'Ex: Vierge — tout à faire' },
  { key: 'acces_eau', label: "Accès à l'eau", placeholder: 'Ex: Problématique' },
  { key: 'notes', label: 'Notes', placeholder: 'Observations, potentiel...', multiline: true },
];

export default function SiteFormScreen({ route, navigation }) {
  const { siteId } = route.params || {};
  const isEdit = !!siteId;

  const [form, setForm] = useState({
    code: '', superficie: '', region: '', altitude: '',
    type_terrain: '', activite: '', acces_eau: '', notes: '',
  });

  useEffect(() => {
    if (isEdit) {
      const site = getSiteById(siteId);
      if (site) setForm(site);
    }
  }, [siteId]);

  const handleSave = () => {
    if (!form.code.trim()) {
      Alert.alert('Champ requis', 'Le code du site est obligatoire.');
      return;
    }
    if (isEdit) {
      updateSite(siteId, form);
    } else {
      insertSite(form);
    }
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {CHAMPS.map((champ) => (
          <View key={champ.key} style={styles.field}>
            <Text style={styles.label}>
              {champ.label}
              {champ.required && <Text style={styles.required}> *</Text>}
            </Text>
            <TextInput
              style={[styles.input, champ.multiline && styles.inputMulti]}
              placeholder={champ.placeholder}
              placeholderTextColor="#5a7a5a"
              value={String(form[champ.key] || '')}
              onChangeText={(v) => setForm({ ...form, [champ.key]: v })}
              multiline={champ.multiline}
              numberOfLines={champ.multiline ? 3 : 1}
            />
          </View>
        ))}

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>
            {isEdit ? '✅ Enregistrer les modifications' : '✅ Créer le site'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Annuler</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a2e1a' },
  field: { marginBottom: 16 },
  label: { color: '#7ec87e', fontSize: 14, fontWeight: '600', marginBottom: 6 },
  required: { color: '#e07070' },
  input: {
    backgroundColor: '#243d24',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3a5a3a',
    color: '#c8e6c8',
    padding: 12,
    fontSize: 15,
  },
  inputMulti: { height: 90, textAlignVertical: 'top' },
  saveButton: { backgroundColor: '#7ec87e', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12, marginTop: 8 },
  saveButtonText: { color: '#1a2e1a', fontWeight: 'bold', fontSize: 16 },
  cancelButton: { borderWidth: 1, borderColor: '#3a5a3a', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 40 },
  cancelButtonText: { color: '#7ec87e', fontSize: 15 },
});