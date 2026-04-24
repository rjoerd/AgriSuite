import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, ScrollView, Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getAllAnimaux, insertAnimal, updateAnimal, deleteAnimal } from '../database/foragePro';

const CATEGORIES = [
  { value: 'vache_lactante', label: '🐄 Vache lactante', sexe: 'femelle' },
  { value: 'vache_tarie', label: '🐄 Vache tarie', sexe: 'femelle' },
  { value: 'genisse_pleine', label: '🐮 Génisse pleine', sexe: 'femelle' },
  { value: 'genisse', label: '🐮 Génisse', sexe: 'femelle' },
  { value: 'velle', label: '🐣 Velle', sexe: 'femelle' },
  { value: 'taureau', label: '🐂 Taureau', sexe: 'male' },
  { value: 'veau', label: '🐣 Veau', sexe: 'male' },
];

const CATEGORIE_COLORS = {
  vache_lactante: '#7ec87e',
  vache_tarie:    '#b0c4b0',
  genisse_pleine: '#f0c060',
  genisse:        '#f0d090',
  velle:          '#90d0f0',
  taureau:        '#d09070',
  veau:           '#a0c8e0',
};

export default function TroupeauScreen({ route, navigation }) {
  const { siteId, siteCode } = route.params;
  const insets = useSafeAreaInsets();
  const [animaux, setAnimaux] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAnimal, setEditingAnimal] = useState(null);

  const [form, setForm] = useState({
    nom: '', race: '', categorie: 'vache_lactante',
    date_naissance: '', poids_kg: '', notes: ''
  });

  const chargerAnimaux = useCallback(() => {
    setAnimaux(getAllAnimaux(siteId));
  }, [siteId]);

  useFocusEffect(chargerAnimaux);

  const ouvrirFormulaire = (animal = null) => {
    if (animal) {
      setEditingAnimal(animal);
      setForm({
        nom: animal.nom,
        race: animal.race || '',
        categorie: animal.categorie,
        date_naissance: animal.date_naissance || '',
        poids_kg: animal.poids_kg ? String(animal.poids_kg) : '',
        notes: animal.notes || ''
      });
    } else {
      setEditingAnimal(null);
      setForm({ nom: '', race: '', categorie: 'vache_lactante', date_naissance: '', poids_kg: '', notes: '' });
    }
    setModalVisible(true);
  };

  const sauvegarder = () => {
    if (!form.nom.trim()) {
      Alert.alert('Champ requis', "Le nom de l'animal est obligatoire.");
      return;
    }
    const categorieInfo = CATEGORIES.find(c => c.value === form.categorie);
    const data = {
      site_id: siteId,
      nom: form.nom.trim(),
      race: form.race.trim(),
      sexe: categorieInfo?.sexe || 'femelle',
      categorie: form.categorie,
      date_naissance: form.date_naissance.trim(),
      poids_kg: form.poids_kg ? parseFloat(form.poids_kg) : null,
      notes: form.notes.trim()
    };
    if (editingAnimal) {
      updateAnimal(editingAnimal.id, data);
    } else {
      insertAnimal(data);
    }
    setModalVisible(false);
    chargerAnimaux();
  };

  const confirmerSuppression = (animal) => {
    Alert.alert(
      'Supprimer cet animal ?',
      `${animal.nom} sera retiré du troupeau.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => {
          deleteAnimal(animal.id);
          chargerAnimaux();
        }}
      ]
    );
  };

  const vachesLactantes = animaux.filter(a => a.categorie === 'vache_lactante').length;
  const totalTetes = animaux.length;

  const renderAnimal = ({ item }) => (
    <TouchableOpacity style={styles.animalCard} onPress={() => ouvrirFormulaire(item)}>
      <View style={[styles.categoryBadge, { backgroundColor: CATEGORIE_COLORS[item.categorie] || '#888' }]}>
        <Text style={styles.categoryText}>
          {CATEGORIES.find(c => c.value === item.categorie)?.label || item.categorie}
        </Text>
      </View>
      <View style={styles.animalInfo}>
        <Text style={styles.animalNom}>{item.nom}</Text>
        {item.race ? <Text style={styles.animalDetail}>Race : {item.race}</Text> : null}
        {item.poids_kg ? <Text style={styles.animalDetail}>{item.poids_kg} kg</Text> : null}
        {item.notes ? <Text style={styles.animalNotes} numberOfLines={1}>{item.notes}</Text> : null}
      </View>
      <TouchableOpacity onPress={() => confirmerSuppression(item)} style={styles.deleteBtn}>
        <Text style={styles.deleteBtnText}>✕</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>🐄 Troupeau — {siteCode}</Text>
        <View style={styles.headerStats}>
          <Text style={styles.statChip}>{totalTetes} têtes</Text>
          <Text style={styles.statChip}>🥛 {vachesLactantes} lactante{vachesLactantes > 1 ? 's' : ''}</Text>
        </View>
        <View style={styles.headerBtns}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.navigate('SaisieJournaliere', { siteId, siteCode })}
          >
            <Text style={styles.headerBtnText}>🥛 Traite du jour</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.navigate('StockFourrage', { siteId, siteCode })}
          >
            <Text style={styles.headerBtnText}>🌾 Stocks</Text>
          </TouchableOpacity>
        </View>
      </View>

      {animaux.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Aucun animal enregistré</Text>
          <Text style={styles.emptySubText}>Ajoutez votre premier animal</Text>
        </View>
      ) : (
        <FlatList
          data={animaux}
          keyExtractor={item => String(item.id)}
          renderItem={renderAnimal}
          contentContainerStyle={styles.list}
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        onPress={() => ouvrirFormulaire()}
      >
        <Text style={styles.fabText}>+ Animal</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <Text style={styles.modalTitle}>
              {editingAnimal ? "Modifier l'animal" : 'Nouvel animal'}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>

              <Text style={styles.fieldLabel}>Nom *</Text>
              <TextInput
                style={styles.input}
                value={form.nom}
                onChangeText={v => setForm(f => ({ ...f, nom: v }))}
                placeholder="Ex: Meva, Génisse 1..."
                placeholderTextColor="#666"
              />

              <Text style={styles.fieldLabel}>Catégorie</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categoryChip,
                      form.categorie === cat.value && styles.categoryChipSelected
                    ]}
                    onPress={() => setForm(f => ({ ...f, categorie: cat.value }))}
                  >
                    <Text style={[
                      styles.categoryChipText,
                      form.categorie === cat.value && styles.categoryChipTextSelected
                    ]}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Race</Text>
              <TextInput
                style={styles.input}
                value={form.race}
                onChangeText={v => setForm(f => ({ ...f, race: v }))}
                placeholder="Ex: Locale croisée, Normande..."
                placeholderTextColor="#666"
              />

              <Text style={styles.fieldLabel}>Poids (kg)</Text>
              <TextInput
                style={styles.input}
                value={form.poids_kg}
                onChangeText={v => setForm(f => ({ ...f, poids_kg: v }))}
                keyboardType="numeric"
                placeholder="Ex: 380"
                placeholderTextColor="#666"
              />

              <Text style={styles.fieldLabel}>Date de naissance</Text>
              <TextInput
                style={styles.input}
                value={form.date_naissance}
                onChangeText={v => setForm(f => ({ ...f, date_naissance: v }))}
                placeholder="AAAA-MM-JJ"
                placeholderTextColor="#666"
              />

              <Text style={styles.fieldLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={form.notes}
                onChangeText={v => setForm(f => ({ ...f, notes: v }))}
                multiline
                numberOfLines={3}
                placeholder="Observations, état de santé..."
                placeholderTextColor="#666"
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.btnAnnuler} onPress={() => setModalVisible(false)}>
                <Text style={styles.btnAnnulerText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSauvegarder} onPress={sauvegarder}>
                <Text style={styles.btnSauvegarderText}>Sauvegarder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a2e1a' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#2a4a2a' },
  headerTitle: { color: '#7ec87e', fontSize: 18, fontWeight: 'bold' },
  headerStats: { flexDirection: 'row', gap: 8, marginTop: 8 },
  statChip: { backgroundColor: '#2a4a2a', color: '#cde8cd', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontSize: 13 },
  headerBtns: { flexDirection: 'row', gap: 8, marginTop: 10 },
  headerBtn: { flex: 1, backgroundColor: '#2a4a2a', borderRadius: 10, padding: 10, alignItems: 'center' },
  headerBtnText: { color: '#7ec87e', fontSize: 13, fontWeight: '600' },
  list: { padding: 12, paddingBottom: 100 },
  animalCard: { backgroundColor: '#243824', borderRadius: 12, padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  categoryBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginRight: 12, minWidth: 80, alignItems: 'center' },
  categoryText: { fontSize: 11, fontWeight: '600', color: '#1a2e1a' },
  animalInfo: { flex: 1 },
  animalNom: { color: '#e8f5e8', fontSize: 16, fontWeight: '600' },
  animalDetail: { color: '#8aaa8a', fontSize: 13, marginTop: 2 },
  animalNotes: { color: '#6a8a6a', fontSize: 12, marginTop: 3, fontStyle: 'italic' },
  deleteBtn: { padding: 8 },
  deleteBtnText: { color: '#ff6b6b', fontSize: 16 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#7ec87e', fontSize: 18, fontWeight: '600' },
  emptySubText: { color: '#5a8a5a', fontSize: 14, marginTop: 8 },
  fab: { position: 'absolute', right: 20, backgroundColor: '#7ec87e', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 30, elevation: 4 },
  fabText: { color: '#1a2e1a', fontWeight: 'bold', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1e321e', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalTitle: { color: '#7ec87e', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  fieldLabel: { color: '#8aaa8a', fontSize: 13, marginBottom: 4, marginTop: 12 },
  input: { backgroundColor: '#2a4a2a', color: '#e8f5e8', borderRadius: 8, padding: 12, fontSize: 15 },
  inputMultiline: { height: 80, textAlignVertical: 'top' },
  categoryScroll: { marginBottom: 4 },
  categoryChip: { backgroundColor: '#2a4a2a', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  categoryChipSelected: { backgroundColor: '#7ec87e' },
  categoryChipText: { color: '#8aaa8a', fontSize: 13 },
  categoryChipTextSelected: { color: '#1a2e1a', fontWeight: '600' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  btnAnnuler: { flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#4a6a4a', alignItems: 'center' },
  btnAnnulerText: { color: '#8aaa8a', fontSize: 15 },
  btnSauvegarder: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#7ec87e', alignItems: 'center' },
  btnSauvegarderText: { color: '#1a2e1a', fontWeight: 'bold', fontSize: 15 },
});