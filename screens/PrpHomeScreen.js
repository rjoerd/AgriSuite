// screens/PrpHomeScreen.js
// Phase 3 - Session 10c.2 - Vue d'ensemble des 7 Programmes Pré-Requis

import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getAllPlans,
  getStatsGlobal,
  getTypePrpInfo,
  getStatutLabel,
  getStatutColor,
} from '../database/prp';

export default function PrpHomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [plans, setPlans] = useState([]);
  const [stats, setStats] = useState({ registres_7j: 0, nc_ouvertes: 0, taux_conformite_30j: null });
  const [refreshing, setRefreshing] = useState(false);

  const charger = useCallback(() => {
    try {
      setPlans(getAllPlans());
      setStats(getStatsGlobal());
    } catch (e) {
      console.error('PrpHome error:', e);
    }
  }, []);

  useFocusEffect(useCallback(() => { charger(); }, [charger]));

  const onRefresh = () => {
    setRefreshing(true);
    charger();
    setTimeout(() => setRefreshing(false), 400);
  };

  const couleurTaux = (t) => {
    if (t === null) return '#888';
    if (t >= 95) return '#7ec87e';
    if (t >= 85) return '#d4a04a';
    return '#e74c3c';
  };

  const couleurCardBordure = (plan) => {
    if (plan.nc_ouvertes > 0) return '#e74c3c';
    if (plan.nb_registres_30j === 0) return '#d4a04a';
    return '#7ec87e';
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7ec87e" />}
      >
        <Text style={styles.title}>Programmes Pré-Requis</Text>
        <Text style={styles.subtitle}>Codex CXC 1-1969 §III + ISO 22000 §8.2</Text>

        {/* KPI BANDEAU */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{stats.registres_7j}</Text>
            <Text style={styles.kpiLabel}>Registres{'\n'}7 derniers j.</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiValue, { color: couleurTaux(stats.taux_conformite_30j) }]}>
              {stats.taux_conformite_30j === null ? '—' : `${stats.taux_conformite_30j}%`}
            </Text>
            <Text style={styles.kpiLabel}>Conformité{'\n'}30 j.</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiValue, { color: stats.nc_ouvertes > 0 ? '#e74c3c' : '#7ec87e' }]}>
              {stats.nc_ouvertes}
            </Text>
            <Text style={styles.kpiLabel}>NC{'\n'}ouvertes</Text>
          </View>
        </View>

        {/* MESSAGE PÉDAGOGIQUE */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💡 Les PRP sont la fondation du HACCP. Un auditeur Bureau Veritas / Ecocert
            les vérifie <Text style={{ fontWeight: 'bold' }}>avant</Text> les CCP. Sans plan PRP
            opérationnel, le système HACCP est considéré comme non implémenté.
          </Text>
        </View>

        {/* LISTE 7 PRP */}
        <Text style={styles.sectionTitle}>Les 7 Programmes Pré-Requis</Text>

        {plans.map(plan => {
          const info = getTypePrpInfo(plan.type_prp);
          const bordure = couleurCardBordure(plan);
          const txtRegistres = plan.nb_registres_30j === 0
            ? '⚠ Aucun registre 30j'
            : `${plan.nb_registres_30j} registre${plan.nb_registres_30j > 1 ? 's' : ''} 30j`;

          return (
            <TouchableOpacity
              key={plan.id}
              style={[styles.prpCard, { borderLeftColor: bordure }]}
              onPress={() => navigation.navigate('PrpDetail', { planId: plan.id })}
            >
              <View style={styles.prpHeader}>
                <Text style={styles.prpIcone}>{info?.icone || '📋'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.prpNom}>{plan.nom}</Text>
                  <Text style={styles.prpDesc} numberOfLines={2}>
                    {plan.description}
                  </Text>
                </View>
                <View style={[styles.statutBadge, { backgroundColor: getStatutColor(plan.statut) + '33', borderColor: getStatutColor(plan.statut) }]}>
                  <Text style={[styles.statutText, { color: getStatutColor(plan.statut) }]}>
                    {getStatutLabel(plan.statut)}
                  </Text>
                </View>
              </View>

              <View style={styles.prpFooter}>
                <Text style={styles.prpStat}>📑 {plan.nb_procedures} procédure{plan.nb_procedures > 1 ? 's' : ''}</Text>
                <Text style={[styles.prpStat, plan.nb_registres_30j === 0 && { color: '#d4a04a' }]}>
                  📝 {txtRegistres}
                </Text>
                {plan.nc_ouvertes > 0 && (
                  <Text style={styles.prpStatNc}>
                    🚨 {plan.nc_ouvertes} NC ouverte{plan.nc_ouvertes > 1 ? 's' : ''}
                  </Text>
                )}
              </View>

              <Text style={styles.prpRef}>{plan.reference_reglementaire}</Text>
            </TouchableOpacity>
          );
        })}
<TouchableOpacity
  style={{ backgroundColor: '#2a3e2a', padding: 16, borderRadius: 8, marginTop: 16, borderLeftWidth: 3, borderLeftColor: '#7ec87e', alignItems: 'center' }}
  onPress={() => navigation.navigate('PrpTachesJour')}
>
  <Text style={{ color: '#7ec87e', fontSize: 15, fontWeight: 'bold' }}>📅 Mes tâches PRP du jour</Text>
  <Text style={{ color: '#888', fontSize: 11, marginTop: 4 }}>Procédures à exécuter aujourd'hui + retards</Text>
</TouchableOpacity>
<TouchableOpacity
  style={{ backgroundColor: '#2a3e2a', padding: 16, borderRadius: 8, marginTop: 12, borderLeftWidth: 3, borderLeftColor: '#7eaac8', alignItems: 'center' }}
  onPress={() => navigation.navigate('ConformitePrpHaccp')}
>
  <Text style={{ color: '#7eaac8', fontSize: 15, fontWeight: 'bold' }}>🔗 Valider HACCP depuis PRP</Text>
  <Text style={{ color: '#888', fontSize: 11, marginTop: 4 }}>Auto-cocher exigences HACCP depuis registres PRP</Text>
</TouchableOpacity>
        {/* BOUTON DASHBOARD */}
        <TouchableOpacity
          style={styles.btnDashboard}
          onPress={() => navigation.navigate('PrpDashboard')}
        >
          <Text style={styles.btnDashboardText}>📊 Dashboard surveillance PRP</Text>
          <Text style={styles.btnDashboardHint}>Vue responsable qualité — KPI, NC, retards</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a2e1a' },
  content: { padding: 16, paddingBottom: 40 },
  title: { color: '#7ec87e', fontSize: 22, fontWeight: 'bold' },
  subtitle: { color: '#888', fontSize: 12, fontStyle: 'italic', marginBottom: 16 },

  kpiRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  kpiCard: {
    flex: 1, backgroundColor: '#2a3e2a', borderRadius: 8,
    padding: 12, marginHorizontal: 3, alignItems: 'center',
  },
  kpiValue: { color: '#7ec87e', fontSize: 22, fontWeight: 'bold' },
  kpiLabel: { color: '#ccc', fontSize: 10, textAlign: 'center', marginTop: 4 },

  infoBox: {
    backgroundColor: '#1f2c38',
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#7eaac8',
    marginBottom: 20,
  },
  infoText: { color: '#a8c8e8', fontSize: 12, lineHeight: 17 },

  sectionTitle: { color: '#7ec87e', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },

  prpCard: {
    backgroundColor: '#243d24',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  prpHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  prpIcone: { fontSize: 28, marginRight: 12 },
  prpNom: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  prpDesc: { color: '#a8c8a8', fontSize: 11, marginTop: 2 },
  statutBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  statutText: { fontSize: 10, fontWeight: 'bold' },

  prpFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#3a5a3a',
  },
  prpStat: { color: '#bbb', fontSize: 11 },
  prpStatNc: { color: '#e74c3c', fontSize: 11, fontWeight: 'bold' },

  prpRef: { color: '#666', fontSize: 10, fontStyle: 'italic', marginTop: 6 },

  btnDashboard: {
    backgroundColor: '#2a3e2a',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#d4a04a',
    alignItems: 'center',
  },
  btnDashboardText: { color: '#d4a04a', fontSize: 15, fontWeight: 'bold' },
  btnDashboardHint: { color: '#888', fontSize: 11, marginTop: 4 },
});