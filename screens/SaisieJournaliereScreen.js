import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  getAllAnimaux, getProductionJour, insertProduction
} from '../database/foragePro';

export default function SaisieJournaliereScreen({ route }) {
  const { siteId, siteCode } = route.params;
  const insets = useSafeAreaInsets();
  const today = new Date().toISOString().split('T')[0];

  const [vaches, setVaches] = useState([]);
  const [saisies, setSaisies] = useState({});
  const [dejaSaisi, setDejaSaisi] = useState(false);
  const [sauvegarde, setSauvegarde] = useState(false);

  const charger = useCallback(() => {
    // Uniquement les vaches lactantes — les autres ne produisent pas
    const lactantes = getAllAnimaux(siteId).filter(
      a => a.categorie === 'vache_lactante'
    );
    setVaches(lactantes);

    // Vérifier si déjà saisi aujourd'hui
    const existant = getProductionJour(siteId, today);
    if (existant.length > 0) {
      setDejaSaisi(true);
      // Pré-remplir avec les valeurs existantes
      const init = {};
      existant.forEach(p => {
        init[p.animal_id] = {
          matin: String(p.litres_matin),
          soir: String(p.litres_soir),
          qualite: p.qualite,
          observations: p.observations || ''
        };
      });
      setSaisies(init);
    } else {
      setDejaSaisi(false);
      const init = {};
      lactantes.forEach(v => {
        init[v.id] = { matin: '', soir: '', qualite: 'normale', observations: '' };
      });
      setSaisies(init);
    }
  }, [siteId, today]);

  useFocusEffect(charger);

  const updateSaisie = (animalId, champ, valeur) => {
    setSaisies(prev => ({
      ...prev,
      [animalId]: { ...prev[animalId], [champ]: valeur }
    }));
  };

  const totalLitres = () => {
    return Object.values(saisies).reduce((acc, s) => {
      return acc + (parseFloat(s.matin) || 0) + (parseFloat(s.soir) || 0);
    }, 0).toFixed(1);
  };

  const sauvegarder = () => {
    if (vaches.length === 0) {
      Alert.alert('Aucune vache lactante', 'Ajoutez une vache lactante dans le troupeau.');
      return;
    }
    let erreur = false;
    vaches.forEach(v => {
      const s = saisies[v.id];
      if (!s || (s.matin === '' && s.soir === '')) erreur = true;
    });
    if (erreur) {
      Alert.alert('Saisie incomplète', 'Remplissez au moins une valeur (matin ou soir) pour chaque vache.');
      return;
    }

    vaches.forEach(v => {
      const s = saisies[v.id];
      insertProduction({
        animal_id: v.id,
        site_id: siteId,
        date_releve: today,
        litres_matin: parseFloat(s.matin) || 0,
        litres_soir: parseFloat(s.soir) || 0,
        qualite: s.qualite || 'normale',
        observations: s.observations || ''
      });
    });

    setSauvegarde(true);
    setTimeout(() => setSauvegarde(false), 3000);
    setDejaSaisi(true);
    Alert.alert('✅ Traite enregistrée', `Total du jour : ${totalLitres()} litres`);
  };

  const dateAffichee = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long'
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🥛 Traite du jour — {siteCode}</Text>
        <Text style={styles.headerDate}>{dateAffichee}</Text>
        {dejaSaisi && (
          <View style={styles.dejaSaisiTag}>
            <Text style={styles.dejaSaisiText}>✓ Déjà saisi aujourd'hui</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {vaches.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Aucune vache lactante</Text>
            <Text style={styles.emptySubText}>
              Ajoutez une vache avec la catégorie "Vache lactante" dans le troupeau
            </Text>
          </View>
        ) : (
          <>
            {vaches.map(vache => {
              const s = saisies[vache.id] || {};
              const totalVache = ((parseFloat(s.matin) || 0) + (parseFloat(s.soir) || 0)).toFixed(1);
              return (
                <View key={vache.id} style={styles.vacheCard}>
                  <View style={styles.vacheHeader}>
                    <Text style={styles.vacheNom}>{vache.nom}</Text>
                    {totalVache > 0 && (
                      <Text style={styles.vacheTotal}>{totalVache} L</Text>
                    )}
                  </View>
                  {vache.race ? (
                    <Text style={styles.vacheRace}>{vache.race}</Text>
                  ) : null}

                  <View style={styles.traiteRow}>
                    {/* Matin */}
                    <View style={styles.traiteChamp}>
                      <Text style={styles.traiteLabel}>🌅 Matin (L)</Text>
                      <TextInput
                        style={styles.traiteInput}
                        value={s.matin}
                        onChangeText={v => updateSaisie(vache.id, 'matin', v)}
                        keyboardType="decimal-pad"
                        placeholder="0.0"
                        placeholderTextColor="#5a8a5a"
                      />
                    </View>
                    {/* Soir */}
                    <View style={styles.traiteChamp}>
                      <Text style={styles.traiteLabel}>🌇 Soir (L)</Text>
                      <TextInput
                        style={styles.traiteInput}
                        value={s.soir}
                        onChangeText={v => updateSaisie(vache.id, 'soir', v)}
                        keyboardType="decimal-pad"
                        placeholder="0.0"
                        placeholderTextColor="#5a8a5a"
                      />
                    </View>
                  </View>

                  {/* Qualité */}
                  <View style={styles.qualiteRow}>
                    <Text style={styles.traiteLabel}>Qualité du lait</Text>
                    <View style={styles.qualiteBtns}>
                      {['normale', 'anormale'].map(q => (
                        <TouchableOpacity
                          key={q}
                          style={[
                            styles.qualiteBtn,
                            s.qualite === q && styles.qualiteBtnActive,
                            q === 'anormale' && s.qualite === q && styles.qualiteBtnDanger
                          ]}
                          onPress={() => updateSaisie(vache.id, 'qualite', q)}
                        >
                          <Text style={[
                            styles.qualiteBtnText,
                            s.qualite === q && styles.qualiteBtnTextActive
                          ]}>
                            {q === 'normale' ? '✓ Normale' : '⚠ Anormale'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Observations si anormale */}
                  {s.qualite === 'anormale' && (
                    <TextInput
                      style={styles.obsInput}
                      value={s.observations}
                      onChangeText={v => updateSaisie(vache.id, 'observations', v)}
                      placeholder="Décrivez l'anomalie (couleur, grumeaux, sang...)"
                      placeholderTextColor="#8a6a4a"
                      multiline
                    />
                  )}
                </View>
              );
            })}

            {/* Total journalier */}
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>Total du jour</Text>
              <Text style={styles.totalValeur}>{totalLitres()} L</Text>
            </View>

            {/* Bouton sauvegarder */}
            <TouchableOpacity
              style={[styles.btnSave, sauvegarde && styles.btnSaveDone]}
              onPress={sauvegarder}
            >
              <Text style={styles.btnSaveText}>
                {sauvegarde ? '✓ Enregistré !' : dejaSaisi ? '🔄 Mettre à jour' : '💾 Enregistrer la traite'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a2e1a' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#2a4a2a' },
  headerTitle: { color: '#7ec87e', fontSize: 18, fontWeight: 'bold' },
  headerDate: { color: '#8aaa8a', fontSize: 13, marginTop: 4 },
  dejaSaisiTag: { marginTop: 8, backgroundColor: '#2a4a2a', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  dejaSaisiText: { color: '#7ec87e', fontSize: 12 },
  scroll: { padding: 12, paddingBottom: 40 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { color: '#7ec87e', fontSize: 16, fontWeight: '600' },
  emptySubText: { color: '#5a8a5a', fontSize: 13, marginTop: 8, textAlign: 'center', paddingHorizontal: 20 },
  vacheCard: { backgroundColor: '#243824', borderRadius: 14, padding: 14, marginBottom: 12 },
  vacheHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  vacheNom: { color: '#e8f5e8', fontSize: 16, fontWeight: '700' },
  vacheTotal: { color: '#7ec87e', fontSize: 18, fontWeight: 'bold' },
  vacheRace: { color: '#6a8a6a', fontSize: 12, marginBottom: 10 },
  traiteRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  traiteChamp: { flex: 1 },
  traiteLabel: { color: '#8aaa8a', fontSize: 12, marginBottom: 6 },
  traiteInput: { backgroundColor: '#1a2e1a', color: '#e8f5e8', borderRadius: 10, padding: 12, fontSize: 22, fontWeight: 'bold', textAlign: 'center', borderWidth: 1, borderColor: '#3a5a3a' },
  qualiteRow: { marginTop: 12 },
  qualiteBtns: { flexDirection: 'row', gap: 8, marginTop: 6 },
  qualiteBtn: { flex: 1, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#3a5a3a', alignItems: 'center' },
  qualiteBtnActive: { backgroundColor: '#2a5a2a', borderColor: '#7ec87e' },
  qualiteBtnDanger: { backgroundColor: '#4a2020', borderColor: '#e07070' },
  qualiteBtnText: { color: '#6a8a6a', fontSize: 13 },
  qualiteBtnTextActive: { color: '#e8f5e8', fontWeight: '600' },
  obsInput: { marginTop: 8, backgroundColor: '#3a2020', color: '#e8c8a8', borderRadius: 8, padding: 10, fontSize: 13, borderWidth: 1, borderColor: '#6a4040' },
  totalCard: { backgroundColor: '#1e3d1e', borderRadius: 12, padding: 16, marginTop: 4, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#3a6a3a' },
  totalLabel: { color: '#8aaa8a', fontSize: 15 },
  totalValeur: { color: '#7ec87e', fontSize: 28, fontWeight: 'bold' },
  btnSave: { backgroundColor: '#7ec87e', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 20 },
  btnSaveDone: { backgroundColor: '#4a8a4a' },
  btnSaveText: { color: '#1a2e1a', fontWeight: 'bold', fontSize: 16 },
});