// screens/HaccpHomeScreen.js
// Phase 3 Session 10a — Écran d'accueil HACCP
//
// Liste des études HACCP par produit + KPI global + accès détail.
// L'écran de détail (HaccpEtudeDetailScreen) sera codé en Session 10a-bis si besoin,
// ou en Session 10b avec la surveillance opérationnelle.

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  getAllEtudes,
  getKpiHaccp,
  STATUT_ETUDE_LABELS,
  STATUT_ETUDE_COULEURS,
} from '../database/haccp';

export default function HaccpHomeScreen({ navigation }) {
  const [etudes, setEtudes] = useState([]);
  const [kpi, setKpi] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(() => {
    try {
      setEtudes(getAllEtudes() || []);
      setKpi(getKpiHaccp());
    } catch (err) {
      console.error('[HaccpHome] Erreur chargement:', err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    setTimeout(() => setRefreshing(false), 300);
  };

  const ouvrirEtude = (etude) => {
    // Pour l'instant, navigation vers un écran de détail à venir
    // En 10a, on affiche juste un alert avec les infos clés
    if (navigation.navigate) {
      // Si HaccpEtudeDetail existe (10a-bis), on y va. Sinon, fallback alert.
      try {
        navigation.navigate('HaccpEtudeDetail', { etudeId: etude.id });
      } catch (e) {
        // Route pas encore définie : ignorer
      }
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#7ec87e"
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🧪 HACCP</Text>
        <Text style={styles.subtitle}>
          Sécurité alimentaire — Codex Alimentarius CXC 1-1969
        </Text>
      </View>

      {/* KPI Banner */}
      {kpi && (
        <View style={styles.kpiBanner}>
          <View style={styles.kpiCol}>
            <Text style={styles.kpiNumber}>{kpi.total_etudes || 0}</Text>
            <Text style={styles.kpiLabel}>Études</Text>
          </View>
          <View style={styles.kpiSeparator} />
          <View style={styles.kpiCol}>
            <Text style={[styles.kpiNumber, { color: '#7ec87e' }]}>{kpi.nb_actives || 0}</Text>
            <Text style={styles.kpiLabel}>Actives</Text>
          </View>
          <View style={styles.kpiSeparator} />
          <View style={styles.kpiCol}>
            <Text style={[styles.kpiNumber, { color: '#d4a04a' }]}>{kpi.nb_brouillon || 0}</Text>
            <Text style={styles.kpiLabel}>Brouillon</Text>
          </View>
        </View>
      )}

      {/* KPI dangers + CCP */}
      {kpi && kpi.total_dangers > 0 && (
        <View style={styles.subKpiBanner}>
          <Text style={styles.subKpiText}>
            ⚠️ {kpi.total_dangers} dangers identifiés (
            <Text style={{ color: '#e87e3a', fontWeight: '700' }}>
              {kpi.total_dangers_significatifs} significatifs
            </Text>
            ) · 🎯 {kpi.total_ccp} CCP
          </Text>
        </View>
      )}

      {/* Section études */}
      <Text style={styles.sectionTitle}>📋 Études par produit</Text>

      {etudes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🧪</Text>
          <Text style={styles.emptyTitle}>Aucune étude HACCP</Text>
          <Text style={styles.emptyText}>
            Le seed initial devrait avoir créé 9 études (vanille, girofle, cannelle,
            café, cacao, poivre, gingembre, fruits séchés, litchi).
          </Text>
        </View>
      ) : (
        etudes.map((etude) => {
          const couleurStatut = STATUT_ETUDE_COULEURS[etude.statut] || '#7ec87e';
          return (
            <TouchableOpacity
              key={etude.id}
              style={[styles.etudeCard, { borderLeftColor: couleurStatut }]}
              onPress={() => ouvrirEtude(etude)}
              activeOpacity={0.7}
            >
              <View style={styles.etudeHeader}>
                <Text style={styles.etudeProduit}>{etude.produit_nom}</Text>
                <View style={[styles.statutBadge, { backgroundColor: couleurStatut }]}>
                  <Text style={styles.statutText}>
                    {STATUT_ETUDE_LABELS[etude.statut] || etude.statut}
                  </Text>
                </View>
              </View>

              <Text style={styles.etudeNom} numberOfLines={1}>
                {etude.nom_etude}
              </Text>

              <View style={styles.etudeStatsRow}>
                <View style={styles.statBlock}>
                  <Text style={styles.statNumber}>{etude.nb_dangers || 0}</Text>
                  <Text style={styles.statLabel}>dangers</Text>
                </View>
                <View style={styles.statSeparator} />
                <View style={styles.statBlock}>
                  <Text style={[styles.statNumber, { color: '#e87e3a' }]}>
                    {etude.nb_dangers_significatifs || 0}
                  </Text>
                  <Text style={styles.statLabel}>significatifs</Text>
                </View>
                <View style={styles.statSeparator} />
                <View style={styles.statBlock}>
                  <Text style={[styles.statNumber, { color: '#7ec87e' }]}>
                    {etude.nb_ccp || 0}
                  </Text>
                  <Text style={styles.statLabel}>CCP</Text>
                </View>
                <View style={{ flex: 1 }} />
                <Text style={styles.chevron}>›</Text>
              </View>

              {etude.version && (
                <Text style={styles.versionInfo}>
                  v{etude.version}
                  {etude.date_validation ? ` · validée ${etude.date_validation}` : ' · non validée'}
                </Text>
              )}
            </TouchableOpacity>
          );
        })
      )}

      {/* Note version */}
      <View style={styles.versionNote}>
        <Text style={styles.versionNoteText}>
          ℹ️ HACCP v1 (Session 10a) — Études pré-modélisées en brouillon avec dangers
          types et CCP suggérés (Codex Alimentarius + UE 1881/2006 + UE 2023/915).
          Surveillance CCP opérationnelle (relevés journaliers) en Session 10b.
          PRP (hygiène, nuisibles, eau, déchets) en Session 10c.
        </Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a2e1a',
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#7ec87e',
  },
  subtitle: {
    fontSize: 13,
    color: '#a8c8a8',
    marginTop: 4,
    fontStyle: 'italic',
  },

  // KPI Banner
  kpiBanner: {
    flexDirection: 'row',
    backgroundColor: '#243d24',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    alignItems: 'center',
  },
  kpiCol: {
    flex: 1,
    alignItems: 'center',
  },
  kpiNumber: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
  },
  kpiLabel: {
    fontSize: 11,
    color: '#a8c8a8',
    marginTop: 2,
  },
  kpiSeparator: {
    width: 1,
    height: 32,
    backgroundColor: '#3a5a3a',
  },

  subKpiBanner: {
    backgroundColor: '#243d24',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    alignItems: 'center',
  },
  subKpiText: {
    fontSize: 13,
    color: '#a8c8a8',
  },

  // Sections
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7ec87e',
    marginTop: 16,
    marginBottom: 12,
  },

  // Cards études
  etudeCard: {
    backgroundColor: '#243d24',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  etudeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  etudeProduit: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  statutBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statutText: {
    fontSize: 10,
    color: '#1a2e1a',
    fontWeight: '700',
  },
  etudeNom: {
    fontSize: 12,
    color: '#a8c8a8',
    marginBottom: 10,
    fontStyle: 'italic',
  },

  etudeStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a2e1a',
    borderRadius: 8,
    padding: 8,
  },
  statBlock: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 9,
    color: '#a8c8a8',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statSeparator: {
    width: 1,
    height: 26,
    backgroundColor: '#3a5a3a',
  },
  chevron: {
    fontSize: 22,
    color: '#7ec87e',
    fontWeight: '300',
    paddingRight: 6,
  },

  versionInfo: {
    fontSize: 10,
    color: '#7a9a7a',
    marginTop: 6,
    fontStyle: 'italic',
  },

  // État vide
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#a8c8a8',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#7a9a7a',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Note version
  versionNote: {
    backgroundColor: '#1f2f1f',
    borderRadius: 8,
    padding: 12,
    marginTop: 24,
    borderLeftWidth: 3,
    borderLeftColor: '#d4a04a',
  },
  versionNoteText: {
    fontSize: 11,
    color: '#a8c8a8',
    lineHeight: 16,
    fontStyle: 'italic',
  },
});