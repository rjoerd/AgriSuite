import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet
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
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.titre}>🌿 AgriSuite — Sites</Text>
          <Text style={styles.sousTitre}>{sites.length} sites actifs</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.btnTransversal}
            onPress={() => navigation.navigate('CropEngine')}
          >
            <Text style={styles.btnTransversalText}>🌱 CropEngine</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnTransversal, styles.btnExport]}
            onPress={() => navigation.navigate('ExportTrackHome')}
          >
            <Text style={[styles.btnTransversalText, styles.btnExportText]}>📦 ExportTrack</Text>
          </TouchableOpacity>
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 8,
  },
  headerLeft: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'column',
    gap: 6,
    alignItems: 'flex-end',
  },
  titre: {
    color: '#7ec87e',
    fontSize: 22,
    fontWeight: 'bold',
  },
  sousTitre: {
    color: '#5a8a5a',
    fontSize: 12,
    marginTop: 2,
  },
  btnTransversal: {
    backgroundColor: '#1a3a1a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#3a6a3a',
    minWidth: 140,
    alignItems: 'center',
  },
  btnTransversalText: {
    color: '#7ec87e',
    fontSize: 13,
    fontWeight: '600',
  },
  btnExport: {
    borderColor: '#d4a04a',
  },
  btnExportText: {
    color: '#d4a04a',
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