import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const db = SQLite.openDatabaseSync('agrisuite.db');

// Conversion fréquence texte → nb jours max entre relevés
function frequenceEnJours(freq) {
  if (!freq) return 7; // défaut prudent
  const f = freq.toLowerCase();
  if (f.includes('continue') || f.includes('chaque lot') || f.includes('par lot')) return 1;
  if (f.includes('horaire') || f.includes('heure')) return 1;
  if (f.includes('quotidien') || f.includes('jour')) return 1;
  if (f.includes('hebdo') || f.includes('semaine')) return 7;
  if (f.includes('mensuel') || f.includes('mois')) return 30;
  return 7;
}

function joursDepuis(dateStr) {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now - d) / (1000 * 60 * 60 * 24));
}

export default function HaccpDashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [kpi, setKpi] = useState({ releves7j: 0, tauxConf30j: 0, ncOuvertes: 0, ccpRetard: 0 });
  const [ccpRetard, setCcpRetard] = useState([]);
  const [ncOuvertes, setNcOuvertes] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const charger = useCallback(() => {
    try {
      // KPI 1 — relevés 7 derniers jours
      const r7 = db.getAllSync(
        `SELECT COUNT(*) as n FROM releves_ccp WHERE date(date_releve) >= date('now', '-7 days')`
      )[0].n;

      // KPI 2 — taux conformité 30 jours
      const conf30 = db.getAllSync(
        `SELECT 
          SUM(CASE WHEN conforme = 1 THEN 1 ELSE 0 END) as ok,
          COUNT(*) as total
         FROM releves_ccp 
         WHERE date(date_releve) >= date('now', '-30 days')`
      )[0];
      const taux = conf30.total > 0 ? Math.round((conf30.ok / conf30.total) * 100) : null;

      // KPI 3 — NC ouvertes (action corrective requise et non résolue)
      const nc = db.getAllSync(
        `SELECT COUNT(*) as n FROM releves_ccp 
         WHERE necessite_action_corrective = 1 AND COALESCE(action_corrective_resolue, 0) = 0`
      )[0].n;

      // Liste détaillée NC ouvertes
      const ncList = db.getAllSync(
        `SELECT r.id, r.date_releve, r.lot_code, r.motif_non_conforme, r.operateur,
                c.nom_ccp, c.numero
         FROM releves_ccp r
         LEFT JOIN ccp_haccp c ON c.id = r.ccp_id
         WHERE r.necessite_action_corrective = 1 
           AND COALESCE(r.action_corrective_resolue, 0) = 0
         ORDER BY r.date_releve ASC`
      );

      // KPI 4 + liste — CCP en retard de relevé
      const ccps = db.getAllSync(
        `SELECT c.id, c.numero, c.nom_ccp, c.frequence_surveillance, c.responsable,
                e.produit_nom,
                (SELECT MAX(date_releve) FROM releves_ccp WHERE ccp_id = c.id) as dernier_releve
         FROM ccp_haccp c
         LEFT JOIN etudes_haccp e ON e.id = c.etude_id
         WHERE COALESCE(c.desactive, 0) = 0`
      );

      const retard = ccps
        .map(c => {
          const maxJ = frequenceEnJours(c.frequence_surveillance);
          const depuis = joursDepuis(c.dernier_releve);
          return { ...c, max_jours: maxJ, jours_depuis: depuis, retard: depuis - maxJ };
        })
        .filter(c => c.retard > 0 || c.dernier_releve === null)
        .sort((a, b) => b.retard - a.retard);

      setKpi({
        releves7j: r7,
        tauxConf30j: taux,
        ncOuvertes: nc,
        ccpRetard: retard.length,
      });
      setCcpRetard(retard);
      setNcOuvertes(ncList);
    } catch (e) {
      console.error('Dashboard HACCP error:', e);
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7ec87e" />}
      >
        <Text style={styles.title}>Dashboard Surveillance HACCP</Text>
        <Text style={styles.subtitle}>Vue responsable qualité</Text>

        {/* KPI BANDEAU */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{kpi.releves7j}</Text>
            <Text style={styles.kpiLabel}>Relevés{'\n'}7 derniers j.</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiValue, { color: couleurTaux(kpi.tauxConf30j) }]}>
              {kpi.tauxConf30j === null ? '—' : `${kpi.tauxConf30j}%`}
            </Text>
            <Text style={styles.kpiLabel}>Conformité{'\n'}30 j.</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiValue, { color: kpi.ncOuvertes > 0 ? '#e74c3c' : '#7ec87e' }]}>
              {kpi.ncOuvertes}
            </Text>
            <Text style={styles.kpiLabel}>NC{'\n'}ouvertes</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiValue, { color: kpi.ccpRetard > 0 ? '#e74c3c' : '#7ec87e' }]}>
              {kpi.ccpRetard}
            </Text>
            <Text style={styles.kpiLabel}>CCP en{'\n'}retard</Text>
          </View>
        </View>

        {/* BLOC CCP EN RETARD */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏰ CCP en retard de relevé</Text>
          <Text style={styles.sectionHint}>
            Selon ISO 22000 §8.5.4, un CCP sans surveillance documentée est une NC majeure.
          </Text>
          {ccpRetard.length === 0 ? (
            <Text style={styles.empty}>✅ Tous les CCP sont à jour</Text>
          ) : (
            ccpRetard.map(c => (
              <TouchableOpacity
                key={c.id}
                style={styles.itemCard}
                onPress={() => navigation.navigate('ReleveCcpForm', { ccpId: c.id })}
              >
                <View style={styles.itemHeader}>
                  <Text style={styles.itemBadge}>CCP {c.numero}</Text>
                  <Text style={styles.itemBadgeRed}>
                    {c.dernier_releve === null ? 'JAMAIS' : `+${c.retard} j`}
                  </Text>
                </View>
                <Text style={styles.itemTitle}>{c.nom_ccp}</Text>
                <Text style={styles.itemMeta}>Produit : {c.produit_nom || '—'}</Text>
                <Text style={styles.itemMeta}>
                  Fréquence requise : {c.frequence_surveillance || '?'} (max {c.max_jours} j)
                </Text>
                <Text style={styles.itemMeta}>
                  Dernier relevé : {c.dernier_releve || 'aucun'}
                </Text>
                {c.responsable && (
                  <Text style={styles.itemMeta}>Responsable : {c.responsable}</Text>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* BLOC NC OUVERTES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚨 Non-conformités ouvertes</Text>
          <Text style={styles.sectionHint}>
            ISO 22000 §8.9.2 : toute NC doit être clôturée avec action corrective documentée.
          </Text>
          {ncOuvertes.length === 0 ? (
            <Text style={styles.empty}>✅ Aucune NC ouverte</Text>
          ) : (
            ncOuvertes.map(n => (
              <TouchableOpacity
                key={n.id}
                style={styles.itemCard}
                onPress={() => navigation.navigate('ActionCorrectiveForm', { releveId: n.id })}
              >
                <View style={styles.itemHeader}>
                  <Text style={styles.itemBadge}>CCP {n.numero}</Text>
                  <Text style={styles.itemBadgeAmber}>
                    +{joursDepuis(n.date_releve)} j
                  </Text>
                </View>
                <Text style={styles.itemTitle}>{n.nom_ccp}</Text>
                <Text style={styles.itemMeta}>Lot : {n.lot_code || '—'}</Text>
                <Text style={styles.itemMeta}>Date : {n.date_releve}</Text>
                <Text style={styles.itemMeta}>Opérateur : {n.operateur}</Text>
                <Text style={styles.itemMotif}>{n.motif_non_conforme}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a2e1a' },
  content: { padding: 16, paddingBottom: 40 },
  title: { color: '#7ec87e', fontSize: 22, fontWeight: 'bold' },
  subtitle: { color: '#aaa', fontSize: 13, marginBottom: 20 },

  kpiRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  kpiCard: {
    flex: 1,
    backgroundColor: '#2a3e2a',
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 3,
    alignItems: 'center',
  },
  kpiValue: { color: '#7ec87e', fontSize: 22, fontWeight: 'bold' },
  kpiLabel: { color: '#ccc', fontSize: 10, textAlign: 'center', marginTop: 4 },

  section: { marginBottom: 24 },
  sectionTitle: { color: '#7ec87e', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  sectionHint: { color: '#888', fontSize: 11, fontStyle: 'italic', marginBottom: 12 },
  empty: { color: '#7ec87e', fontSize: 13, padding: 12, textAlign: 'center' },

  itemCard: {
    backgroundColor: '#2a3e2a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#e74c3c',
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  itemBadge: {
    color: '#1a2e1a',
    backgroundColor: '#7ec87e',
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  itemBadgeRed: {
    color: '#fff',
    backgroundColor: '#e74c3c',
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  itemBadgeAmber: {
    color: '#1a2e1a',
    backgroundColor: '#d4a04a',
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  itemTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  itemMeta: { color: '#bbb', fontSize: 12, marginTop: 2 },
  itemMotif: { color: '#d4a04a', fontSize: 12, marginTop: 6, fontStyle: 'italic' },
});