// ============================================================
// AgriSuite Madagascar — Phase 3 / Session 6 finition UX
// screens/SiteListScreen.js
//
// Écran liste des sites — version simplifiée.
// Les modules transversaux (CropEngine, ExportTrack, Paramètres) sont
// désormais accessibles depuis HomeScreen, plus depuis cet écran.
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getAllSites } from '../database/db';

export default function SiteListScreen({ navigation }) {
  const [sites, setSites] = useState([]);
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      setSites(getAllSites());
    }, [])
  );

  const eauBadge = (acces) => {
    const ok = acces?.toLowerCase().includes('bassin');
    return (
      <View style={[styles.badge, ok ? styles.badgeOk : styles.badgeWarn]}>
        <Text style={styles.badgeText}>{ok ? '💧 OK' : '⚠️ Eau'}</Text>
      </View>
    );
  };

  return (
    <View style={[
      styles.container,
      { paddingTop: insets.top, paddingBottom: insets.bottom },
    ]}>
      {/* Header avec bouton retour vers HomeScreen */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.btnRetour}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.btnRetourTexte}>‹ Retour</Text>
        </TouchableOpacity>
        <View style={styles.headerCentre}>
          <Text style={styles.titre}>📍 Sites</Text>
          <Text style={styles.sousTitre}>
            {sites.length} site{sites.length > 1 ? 's' : ''} actif{sites.length > 1 ? 's' : ''}
          </Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      <FlatList
        data={sites}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('SiteDetail', { siteId: item.id })}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardCode}>{item.code}</Text>
              {eauBadge(item.acces_eau)}
            </View>
            <Text style={styles.cardRegion}>{item.region}</Text>
            <View style={styles.cardRow}>
              <Text style={styles.cardMeta}>{item.superficie}</Text>
              <Text style={styles.cardMeta}>{item.altitude}</Text>
              <Text style={styles.cardMeta}>{item.type_terrain}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListFooterComponent={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('SiteForm', {})}
          >
            <Text style={styles.addButtonText}>+ Ajouter un site</Text>
          </TouchableOpacity>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a2e1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2d4a2d',
  },
  btnRetour: {
    width: 60,
  },
  btnRetourTexte: {
    color: '#7ec87e',
    fontSize: 14,
  },
  headerCentre: {
    flex: 1,
    alignItems: 'center',
  },
  titre: {
    color: '#7ec87e',
    fontSize: 20,
    fontWeight: 'bold',
  },
  sousTitre: {
    color: '#5a8a5a',
    fontSize: 12,
    marginTop: 2,
  },
  card: {
    backgroundColor: '#243d24',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3a5a3a',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardCode: {
    color: '#7ec87e',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardRegion: {
    color: '#b0d4b0',
    fontSize: 14,
    marginBottom: 8,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  cardMeta: {
    color: '#7ec87e',
    fontSize: 12,
    backgroundColor: '#1a2e1a',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeOk: { backgroundColor: '#1e4d2b' },
  badgeWarn: { backgroundColor: '#4d3300' },
  badgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#7ec87e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  addButtonText: {
    color: '#1a2e1a',
    fontWeight: 'bold',
    fontSize: 16,
  },
});