import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getSiteById, deleteSite } from '../database/db';

export default function SiteDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { siteId } = route.params;
  const [site, setSite] = useState(null);

  useFocusEffect(
    useCallback(() => {
      setSite(getSiteById(siteId));
    }, [siteId])
  );

  const handleDelete = () => {
    Alert.alert(
      'Supprimer le site',
      `Confirmer la suppression de ${site?.code} ? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            deleteSite(siteId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  if (!site) return null;

  const rows = [
    ['Superficie', site.superficie],
    ['Région / Zone', site.region],
    ['Altitude', site.altitude],
    ['Type de terrain', site.type_terrain],
    ['Activité actuelle', site.activite],
    ['Accès eau', site.acces_eau],
  ];

    return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.title}>{site.code}</Text>

        <View style={styles.table}>
          {rows.map(([label, value]) => (
            <View key={label} style={styles.row}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.value}>{value || '—'}</Text>
            </View>
          ))}
        </View>

        {!!site.notes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>📝 Notes</Text>
            <Text style={styles.notesText}>{site.notes}</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.forageButton}
          onPress={() => navigation.navigate('ForageProHome', { siteId: site.id, siteCode: site.code })}
        >
          <Text style={styles.forageButtonText}>🌿 ForagePro</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.mapButton}
          onPress={() => navigation.navigate('ParcelleMap', { siteId: site.id, siteCode: site.code })}
        >
          <Text style={styles.mapButtonText}>🗺️ Carte & Parcelles GPS</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('SiteForm', { siteId: site.id })}
        >
          <Text style={styles.editButtonText}>✏️ Modifier ce site</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>🗑️ Supprimer ce site</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a2e1a' },
  title: { color: '#7ec87e', fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  table: { backgroundColor: '#243d24', borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#3a5a3a', paddingHorizontal: 16, paddingVertical: 12 },
  label: { color: '#7ec87e', fontWeight: '600', width: 130, fontSize: 14 },
  value: { color: '#c8e6c8', flex: 1, fontSize: 14 },
  notesBox: { backgroundColor: '#1e3d1e', borderRadius: 12, padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#7ec87e' },
  notesLabel: { color: '#7ec87e', fontWeight: 'bold', marginBottom: 6 },
  notesText: { color: '#b0d4b0', fontSize: 14 },
  forageButton: { backgroundColor: '#7ec87e', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  forageButtonText: { color: '#1a2e1a', fontWeight: 'bold', fontSize: 16 },
  mapButton: { backgroundColor: '#1e3d1e', borderWidth: 1, borderColor: '#7ec87e', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  mapButtonText: { color: '#7ec87e', fontWeight: 'bold', fontSize: 16 },
  editButton: { backgroundColor: '#2a4a2a', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  editButtonText: { color: '#7ec87e', fontWeight: 'bold', fontSize: 16 },
  deleteButton: { borderWidth: 1, borderColor: '#8b2020', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 32 },
  deleteButtonText: { color: '#e07070', fontSize: 16 },
});