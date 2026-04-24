import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ScrollView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  getStocksBySite, insertMouvement, getStatsSoudure,
  getAllAnimaux
} from '../database/foragePro';

const TYPES_STOCK = [
  { value: 'culture_site', label: '🌱 Culture sur site' },
  { value: 'achete', label: '🛒 Fourrage acheté' },
  { value: 'collecte', label: '🧺 Fourrage collecté' },
];

export default function StockFourrageScreen({ route }) {
  const { siteId, siteCode } = route.params;
  const insets = useSafeAreaInsets();
  const [stocks, setStocks] = useState([]);
  const [soudure, setSoudure] = useState(null);
  const [modalMvt, setModalMvt] = useState(false);
  const [stockSelectionne, setStockSelectionne] = useState(null);
  const [typeMvt, setTypeMvt] = useState('entree');
  const [quantite, setQuantite] = useState('');
  const [cout, setCout] = useState('');
  const [notes, setNotes] = useState('');

  const charger = useCallback(() => {
    setStocks(getStocksBySite(siteId));
    setSoudure(getStatsSoudure(siteId));
  }, [siteId]);

  useFocusEffect(charger);

  // Calcul besoin journalier théorique depuis le troupeau
  const getNbLactantes = () => {
    return getAllAnimaux(siteId).filter(a => a.categorie === 'vache_lactante').length;
  };

  const besoinJour = getNbLactantes() * 50; // 50 kg/vache lactante/jour (specs)

  const ouvrirMouvement = (stock, type) => {
    setStockSelectionne(stock);
    setTypeMvt(type);
    setQuantite('');
    setCout('');
    setNotes('');
    setModalMvt(true);
  };

  const enregistrerMouvement = () => {
    if (!quantite || parseFloat(quantite) <= 0) {
      Alert.alert('Quantité invalide', 'Entrez une quantité supérieure à 0.');
      return;
    }
    insertMouvement({
      stock_id: stockSelectionne.id,
      site_id: siteId,
      date_mouvement: new Date().toISOString().split('T')[0],
      type_mouvement: typeMvt,
      quantite_kg: parseFloat(quantite),
      cout_ariary: parseFloat(cout) || 0,
      notes: notes.trim()
    });
    setModalMvt(false);
    charger();
  };

  // Niveau d'alerte soudure
  const getNiveauAlerte = (jours) => {
    if (jours === null) return null;
    if (jours <= 7)  return { couleur: '#e07070', label: '🔴 CRITIQUE', bg: '#4a1a1a' };
    if (jours <= 21) return { couleur: '#f0c060', label: '🟡 ATTENTION', bg: '#4a3a10' };
    if (jours <= 45) return { couleur: '#f0d090', label: '🟠 SURVEILLER', bg: '#3a2a10' };
    return { couleur: '#7ec87e', label: '🟢 OK', bg: '#1e3d1e' };
  };

  const alerte = soudure ? getNiveauAlerte(soudure.joursRestants) : null;

  const renderStock = ({ item }) => (
    <View style={styles.stockCard}>
      <View style={styles.stockHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.stockNom}>{item.nom_fourrage}</Text>
          <Text style={styles.stockType}>
            {TYPES_STOCK.find(t => t.value === item.type_stock)?.label || item.type_stock}
          </Text>
        </View>
        <Text style={[
          styles.stockQte,
          item.quantite_kg < 50 && { color: '#e07070' }
        ]}>
          {item.quantite_kg} kg
        </Text>
      </View>

      <View style={styles.stockActions}>
        <TouchableOpacity
          style={styles.btnEntree}
          onPress={() => ouvrirMouvement(item, 'entree')}
        >
          <Text style={styles.btnEntreeText}>+ Entrée</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnSortie}
          onPress={() => ouvrirMouvement(item, 'sortie_ration')}
        >
          <Text style={styles.btnSortieText}>− Ration</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnPerte}
          onPress={() => ouvrirMouvement(item, 'sortie_perte')}
        >
          <Text style={styles.btnPerteText}>Perte</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🌾 Stocks fourragers — {siteCode}</Text>
      </View>

      {/* Alerte soudure */}
      {soudure && alerte && (
        <View style={[styles.soudureCard, { backgroundColor: alerte.bg, borderColor: alerte.couleur }]}>
          <View style={styles.soudureRow}>
            <Text style={[styles.soudureLabel, { color: alerte.couleur }]}>
              {alerte.label}
            </Text>
            {soudure.joursRestants !== null && (
              <Text style={[styles.soudureJours, { color: alerte.couleur }]}>
                {soudure.joursRestants} jours de stock
              </Text>
            )}
          </View>
          <View style={styles.soudureDetails}>
            <Text style={styles.soudureDetail}>
              📦 Stock total : {soudure.stockKg.toFixed(0)} kg
            </Text>
            <Text style={styles.soudureDetail}>
              📉 Conso moy. : {soudure.consoJour.toFixed(1)} kg/j
            </Text>
            <Text style={styles.soudureDetail}>
              🐄 Besoin théorique : {besoinJour} kg/j
            </Text>
          </View>
          {soudure.joursRestants !== null && soudure.joursRestants <= 21 && (
            <Text style={styles.soudureConseil}>
              ⚡ Action requise : commandez ou récoltez du fourrage maintenant
            </Text>
          )}
        </View>
      )}

      {/* Liste stocks */}
      <FlatList
        data={stocks}
        keyExtractor={item => String(item.id)}
        renderItem={renderStock}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Aucun stock enregistré</Text>
          </View>
        }
      />

      {/* Modal mouvement */}
      <Modal visible={modalMvt} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <Text style={styles.modalTitle}>
              {typeMvt === 'entree' ? '+ Entrée de stock' :
               typeMvt === 'sortie_ration' ? '− Distribution ration' : '⚠ Perte / gaspillage'}
            </Text>
            {stockSelectionne && (
              <Text style={styles.modalSous}>{stockSelectionne.nom_fourrage}</Text>
            )}

            <Text style={styles.fieldLabel}>Quantité (kg) *</Text>
            <TextInput
              style={styles.input}
              value={quantite}
              onChangeText={setQuantite}
              keyboardType="decimal-pad"
              placeholder="Ex: 25"
              placeholderTextColor="#666"
              autoFocus
            />

            {typeMvt === 'entree' && (
              <>
                <Text style={styles.fieldLabel}>Coût (Ariary)</Text>
                <TextInput
                  style={styles.input}
                  value={cout}
                  onChangeText={setCout}
                  keyboardType="numeric"
                  placeholder="Ex: 5000"
                  placeholderTextColor="#666"
                />
              </>
            )}

            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput
              style={styles.input}
              value={notes}
              onChangeText={setNotes}
              placeholder="Optionnel"
              placeholderTextColor="#666"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.btnAnnuler}
                onPress={() => setModalMvt(false)}
              >
                <Text style={styles.btnAnnulerText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnSauvegarder,
                  typeMvt !== 'entree' && { backgroundColor: '#8a4a2a' }
                ]}
                onPress={enregistrerMouvement}
              >
                <Text style={styles.btnSauvegarderText}>Enregistrer</Text>
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
  soudureCard: { margin: 12, borderRadius: 14, padding: 14, borderWidth: 2 },
  soudureRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  soudureLabel: { fontSize: 15, fontWeight: 'bold' },
  soudureJours: { fontSize: 22, fontWeight: 'bold' },
  soudureDetails: { gap: 3 },
  soudureDetail: { color: '#a0c0a0', fontSize: 13 },
  soudureConseil: { color: '#f0c060', fontSize: 13, marginTop: 8, fontStyle: 'italic' },
  list: { padding: 12, paddingBottom: 40 },
  stockCard: { backgroundColor: '#243824', borderRadius: 12, padding: 14, marginBottom: 10 },
  stockHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  stockNom: { color: '#e8f5e8', fontSize: 15, fontWeight: '600' },
  stockType: { color: '#6a8a6a', fontSize: 12, marginTop: 2 },
  stockQte: { color: '#7ec87e', fontSize: 20, fontWeight: 'bold' },
  stockActions: { flexDirection: 'row', gap: 8 },
  btnEntree: { flex: 1, backgroundColor: '#2a5a2a', borderRadius: 8, padding: 8, alignItems: 'center' },
  btnEntreeText: { color: '#7ec87e', fontWeight: '600', fontSize: 13 },
  btnSortie: { flex: 1, backgroundColor: '#3a2a1a', borderRadius: 8, padding: 8, alignItems: 'center' },
  btnSortieText: { color: '#f0c060', fontWeight: '600', fontSize: 13 },
  btnPerte: { flex: 1, backgroundColor: '#3a1a1a', borderRadius: 8, padding: 8, alignItems: 'center' },
  btnPerteText: { color: '#e07070', fontWeight: '600', fontSize: 13 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#5a8a5a', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1e321e', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { color: '#7ec87e', fontSize: 17, fontWeight: 'bold', marginBottom: 4 },
  modalSous: { color: '#8aaa8a', fontSize: 13, marginBottom: 16 },
  fieldLabel: { color: '#8aaa8a', fontSize: 13, marginBottom: 4, marginTop: 12 },
  input: { backgroundColor: '#2a4a2a', color: '#e8f5e8', borderRadius: 8, padding: 12, fontSize: 15 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  btnAnnuler: { flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#4a6a4a', alignItems: 'center' },
  btnAnnulerText: { color: '#8aaa8a', fontSize: 15 },
  btnSauvegarder: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#7ec87e', alignItems: 'center' },
  btnSauvegarderText: { color: '#1a2e1a', fontWeight: 'bold', fontSize: 15 },
});