// screens/PrpDashboardScreen.js
// Phase 3 - Session 10c.4 - Dashboard surveillance PRP responsable qualité
// Pattern aligné HaccpDashboardScreen (10b2)

import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TYPES_PRP, getTypePrpInfo } from '../database/prp';

const db = SQLite.openDatabaseSync('certifpilot.db');

// Conversion fréquence texte → nb jours max entre exécutions
function frequenceEnJours(freq) {
  if (!freq) return 30;
  const f = freq.toLowerCase();
  if (f.includes('quotidien') || f.includes('chaque') || f.includes('jour')) return 1;
  if (f.includes('hebdo') || f.includes('semaine')) return 7;
  if (f.includes('mensuel') || f.includes('mois')) return 30;
  if (f.includes('trimestriel')) return 90;
  if (f.includes('semestriel')) return 180;
  if (f.includes('annuel') || f.includes('an')) return 365;
  if (f.includes('demande') || f.includes('reception')) return 9999; // ponctuel
  return 30;
}

function joursDepuis(dateStr) {
  if (!dateStr) return Infinity;
  return Math.floor((new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24));
}

export default function PrpDashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [kpi, setKpi] = useState({ registres7j: 0, tauxConf30j: null, ncOuvertes: 0, procRetard: 0 });
  const [prpRetard, setPrpRetard] = useState([]);
  const [ncOuvertes, setNcOuvertes] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const charger = useCallback(() => {
    try {
      // KPI 1 — registres 7j
      const r7 = db.getFirstSync(
        `SELECT COUNT(*) as n FROM prp_registres WHERE date(date_execution) >= date('now','-7 days')`
      )?.n || 0;

      // KPI 2 — taux conformité 30j
      const conf30 = db.getFirstSync(
        `SELECT
           SUM(CASE WHEN resultat = 'conforme' THEN 1 ELSE 0 END) as ok,
           COUNT(*) as total
         FROM prp_registres
         WHERE date(date_execution) >= date('now','-30 days')`
      );
      const taux = conf30.total > 0 ? Math.round((conf30.ok / conf30.total) * 100) : null;

      // KPI 3 — NC ouvertes (toutes confondues, PRP)
      const nc = db.getFirstSync(
        `SELECT COUNT(*) as n FROM prp_registres
         WHERE necessite_action_corrective = 1
           AND COALESCE(action_corrective_resolue, 0) = 0`
      )?.n || 0;

      // Liste détaillée NC ouvertes
      const ncList = db.getAllSync(
        `SELECT r.id, r.date_execution, r.heure_execution, r.operateur, r.lieu,
                r.observations, r.valeurs_json, r.resultat,
                p.titre as procedure_titre,
                pl.nom as plan_nom, pl.type_prp
         FROM prp_registres r
         LEFT JOIN prp_procedures p ON p.id = r.prp_procedure_id
         LEFT JOIN prp_plans pl ON pl.id = r.prp_plan_id
         WHERE r.necessite_action_corrective = 1
           AND COALESCE(r.action_corrective_resolue, 0) = 0
         ORDER BY r.date_execution ASC`
      );

      // KPI 4 + liste — Procédures en retard
      const procs = db.getAllSync(
        `SELECT p.id, p.titre, p.frequence_execution, p.responsable_execution,
                pl.id as plan_id, pl.nom as plan_nom, pl.type_prp,
                (SELECT MAX(date_execution) FROM prp_registres
                 WHERE prp_procedure_id = p.id) as derniere_exec
         FROM prp_procedures p
         LEFT JOIN prp_plans pl ON pl.id = p.prp_plan_id
         WHERE COALESCE(p.desactive, 0) = 0`
      );

      const retard = procs
        .map(p => {
          const maxJ = frequenceEnJours(p.frequence_execution);
          if (maxJ >= 9999) return null; // ponctuel = pas de retard
          const depuis = joursDepuis(p.derniere_exec);
          return { ...p, max_jours: maxJ, jours_depuis: depuis, retard: depuis - maxJ };
        })
        .filter(p => p && (p.retard > 0 || p.derniere_exec === null))
        .sort((a, b) => b.retard - a.retard);

      setKpi({
        registres7j: r7,
        tauxConf30j: taux,
        ncOuvertes: nc,
        procRetard: retard.length,
      });
      setPrpRetard(retard);
      setNcOuvertes(ncList);
    } catch (e) {
      console.error('PrpDashboard error:', e);
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
        <Text style={styles.title}>Dashboard Surveillance PRP</Text>
        <Text style={styles.subtitle}>Codex CXC 1-1969 + ISO 22000 §8.2</Text>

        {/* KPI BANDEAU */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{kpi.registres7j}</Text>
            <Text style={styles.kpiLabel}>Registres{'\n'}7 derniers j.</Text>
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
            <Text style={[styles.kpiValue, { color: kpi.procRetard > 0 ? '#e74c3c' : '#7ec87e' }]}>
              {kpi.procRetard}
            </Text>
            <Text style={styles.kpiLabel}>Procédures{'\n'}en retard</Text>
          </View>
        </View>

        {/* BLOC PROCÉDURES EN RETARD */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏰ Procédures PRP en retard</Text>
          <Text style={styles.sectionHint}>
            Codex CXC 1-1969 §IX : une procédure PRP non exécutée selon son rythme
            documenté est considérée comme non implémentée.
          </Text>
          {prpRetard.length === 0 ? (
            <Text style={styles.empty}>✅ Toutes les procédures sont à jour</Text>
          ) : (
            prpRetard.map(p => {
              const info = getTypePrpInfo(p.type_prp);
              return (
                <TouchableOpacity
                  key={p.id}
                  style={styles.itemCard}
                  onPress={() => navigation.navigate('PrpRegistreForm', {
                    planId: p.plan_id,
                    procedureId: p.id,
                    procedureTitre: p.titre,
                  })}
                >
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemBadge}>{info?.icone} {p.plan_nom}</Text>
                    <Text style={styles.itemBadgeRed}>
                      {p.derniere_exec === null ? 'JAMAIS' : `+${p.retard} j`}
                    </Text>
                  </View>
                  <Text style={styles.itemTitle}>{p.titre}</Text>
                  <Text style={styles.itemMeta}>
                    Fréquence requise : {p.frequence_execution} (max {p.max_jours} j)
                  </Text>
                  <Text style={styles.itemMeta}>
                    Dernière exécution : {p.derniere_exec || 'aucune'}
                  </Text>
                  {p.responsable_execution && (
                    <Text style={styles.itemMeta}>Responsable : {p.responsable_execution}</Text>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* BLOC NC OUVERTES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚨 Non-conformités PRP ouvertes</Text>
          <Text style={styles.sectionHint}>
            ISO 22000 §8.9.2 : toute NC doit être clôturée par une action corrective documentée.
          </Text>
          {ncOuvertes.length === 0 ? (
            <Text style={styles.empty}>✅ Aucune NC PRP ouverte</Text>
          ) : (
            ncOuvertes.map(n => {
              const info = getTypePrpInfo(n.type_prp);
              return (
                <TouchableOpacity
                  key={n.id}
                  style={styles.itemCard}
                  onPress={() => navigation.navigate('PrpActionCorrective', { registreId: n.id })}
                >
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemBadge}>{info?.icone} {n.plan_nom}</Text>
                    <Text style={styles.itemBadgeAmber}>
                      +{joursDepuis(n.date_execution)} j
                    </Text>
                  </View>
                  <Text style={styles.itemTitle}>{n.procedure_titre || '(libre)'}</Text>
                  <Text style={styles.itemMeta}>Date : {n.date_execution} {n.heure_execution || ''}</Text>
                  <Text style={styles.itemMeta}>Opérateur : {n.operateur}</Text>
                  {n.lieu && <Text style={styles.itemMeta}>Lieu : {n.lieu}</Text>}
                  {n.observations && (
                    <Text style={styles.itemMotif}>{n.observations}</Text>
                  )}
                  {n.valeurs_json && (
                    <Text style={styles.itemMotif}>Valeurs : {n.valeurs_json}</Text>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={{ height: 20 }} />
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
    flex: 1, backgroundColor: '#2a3e2a', borderRadius: 8,
    padding: 10, marginHorizontal: 3, alignItems: 'center',
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
    color: '#1a2e1a', backgroundColor: '#7ec87e',
    fontSize: 11, fontWeight: 'bold',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4,
  },
  itemBadgeRed: {
    color: '#fff', backgroundColor: '#e74c3c',
    fontSize: 11, fontWeight: 'bold',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4,
  },
  itemBadgeAmber: {
    color: '#1a2e1a', backgroundColor: '#d4a04a',
    fontSize: 11, fontWeight: 'bold',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4,
  },
  itemTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  itemMeta: { color: '#bbb', fontSize: 12, marginTop: 2 },
  itemMotif: { color: '#d4a04a', fontSize: 12, marginTop: 6, fontStyle: 'italic' },
});