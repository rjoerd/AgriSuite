// screens/RelevesCcpHistoryScreen.js
// Phase 3 Session 10b1-bis — Historique des relevés CCP
//
// Liste les relevés d'un CCP donné (dernière saisie → plus ancien).
// Permet validation immédiate par le responsable qualité.

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  getRelevesByCcp, getCcpAvecLimites, getActionsByReleve,
  TYPE_ACTION_LABELS,
} from '../database/haccpSurveillance';

export default function RelevesCcpHistoryScreen({ route, navigation }) {
  const { ccpId } = route.params || {};
  const [ccp, setCcp] = useState(null);
  const [releves, setReleves] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [actionsByReleve, setActionsByReleve] = useState({});

  const loadData = useCallback(() => {
    if (!ccpId) return;
    try {
      setCcp(getCcpAvecLimites(ccpId));
      const data = getRelevesByCcp(ccpId, 100) || [];
      setReleves(data);
    } catch (err) {
      console.error('[RelevesCcpHistory] Erreur:', err);
    }
  }, [ccpId]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    setTimeout(() => setRefreshing(false), 300);
  };

  const toggleExpand = (releveId) => {
    const next = !expanded[releveId];
    setExpanded((prev) => ({ ...prev, [releveId]: next }));
    if (next && !actionsByReleve[releveId]) {
      const actions = getActionsByReleve(releveId);
      setActionsByReleve((prev) => ({ ...prev, [releveId]: actions }));
    }
  };

  const parseValeurs = (json) => {
    try { return JSON.parse(json || '{}'); } catch { return {}; }
  };

  if (!ccp) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loading}>Chargement…</Text>
      </View>
    );
  }

  const total = releves.length;
  const conformes = releves.filter((r) => r.conforme === 1).length;
  const ncNonResolus = releves.filter((r) => r.conforme === 0 && r.action_corrective_resolue === 0).length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7ec87e" />}
    >
      {/* En-tête CCP */}
      <View style={styles.headerCard}>
        <View style={styles.ccpNumeroBadge}>
          <Text style={styles.ccpNumeroText}>{ccp.numero}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.ccpNom}>{ccp.nom_ccp}</Text>
          <Text style={styles.produitNom}>🧪 {ccp.produit_nom} · {ccp.etape_processus}</Text>
        </View>
      </View>

      {/* KPI */}
      <View style={styles.kpiBanner}>
        <View style={styles.kpiCol}>
          <Text style={styles.kpiNumber}>{total}</Text>
          <Text style={styles.kpiLabel}>Relevés</Text>
        </View>
        <View style={styles.kpiSeparator} />
        <View style={styles.kpiCol}>
          <Text style={[styles.kpiNumber, { color: '#7ec87e' }]}>{conformes}</Text>
          <Text style={styles.kpiLabel}>Conformes</Text>
        </View>
        <View style={styles.kpiSeparator} />
        <View style={styles.kpiCol}>
          <Text style={[styles.kpiNumber, { color: ncNonResolus > 0 ? '#e87e3a' : '#a8c8a8' }]}>
            {ncNonResolus}
          </Text>
          <Text style={styles.kpiLabel}>NC non résolus</Text>
        </View>
      </View>

      {/* Bouton nouveau relevé */}
      <TouchableOpacity
        style={styles.btnNouveau}
        onPress={() => navigation.navigate('ReleveCcpForm', { ccpId: ccp.id })}
      >
        <Text style={styles.btnNouveauText}>📏 Nouveau relevé</Text>
      </TouchableOpacity>

      {/* Liste des relevés */}
      <Text style={styles.sectionTitle}>📜 Historique</Text>

      {releves.length === 0 ? (
        <View style={styles.emptyBlock}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>Aucun relevé encore</Text>
          <Text style={styles.emptyText}>
            Tape sur "Nouveau relevé" pour commencer la surveillance opérationnelle de ce CCP.
          </Text>
        </View>
      ) : (
        releves.map((r) => {
          const valeurs = parseValeurs(r.valeurs_json);
          const isExpanded = expanded[r.id];
          const isNC = r.conforme === 0;
          const isResolu = r.action_corrective_resolue === 1;
          const actions = actionsByReleve[r.id] || [];

          return (
            <TouchableOpacity
              key={r.id}
              style={[styles.releveCard, isNC && (isResolu ? styles.releveCardNcResolu : styles.releveCardNc)]}
              onPress={() => toggleExpand(r.id)}
              activeOpacity={0.7}
            >
              <View style={styles.releveHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.releveDate}>
                    📅 {r.date_releve} {r.heure_releve && `· ${r.heure_releve}`}
                  </Text>
                  <Text style={styles.releveOperateur}>
                    👤 {r.operateur}{r.equipe && ` · ${r.equipe}`}
                  </Text>
                </View>
                <View style={styles.releveBadgeBloc}>
                  {isNC ? (
                    <View style={[styles.statutBadge, { backgroundColor: isResolu ? '#d4a04a' : '#e87e3a' }]}>
                      <Text style={styles.statutBadgeText}>
                        {isResolu ? '⚠ NC résolu' : '⚠ NC'}
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.statutBadge, { backgroundColor: '#7ec87e' }]}>
                      <Text style={styles.statutBadgeText}>✓ Conforme</Text>
                    </View>
                  )}
                </View>
              </View>

              {r.lot_code && (
                <Text style={styles.releveLot}>📦 {r.lot_code}</Text>
              )}

              {/* Valeurs résumées */}
              <View style={styles.valeursRow}>
                {Object.keys(valeurs).slice(0, isExpanded ? 99 : 2).map((k) => (
                  <View key={k} style={styles.valeurChip}>
                    <Text style={styles.valeurChipParam}>{k}</Text>
                    <Text style={styles.valeurChipValeur}>{valeurs[k]}</Text>
                  </View>
                ))}
                {!isExpanded && Object.keys(valeurs).length > 2 && (
                  <View style={styles.valeurChip}>
                    <Text style={styles.valeurChipParam}>+{Object.keys(valeurs).length - 2}</Text>
                  </View>
                )}
              </View>

              {isNC && r.motif_non_conforme && (
                <View style={styles.motifBox}>
                  <Text style={styles.motifText}>⚠ {r.motif_non_conforme}</Text>
                </View>
              )}

              {/* Détails étendus */}
              {isExpanded && (
                <View style={styles.expandedBloc}>
                  {r.observations && (
                    <View style={styles.obsBox}>
                      <Text style={styles.obsLabel}>Observations</Text>
                      <Text style={styles.obsText}>{r.observations}</Text>
                    </View>
                  )}

                  {isNC && (
                    <View style={styles.actionsBloc}>
                      <Text style={styles.actionsTitle}>
                        ⚡ Actions correctives ({actions.length})
                      </Text>
                      {actions.length === 0 ? (
                        <Text style={styles.emptyText}>
                          Aucune action enregistrée — à compléter sous 24h (ISO 22000).
                        </Text>
                      ) : (
                        actions.map((a) => (
                          <View key={a.id} style={styles.actionCard}>
                            <Text style={styles.actionType}>
                              {TYPE_ACTION_LABELS[a.type_action] || a.type_action}
                            </Text>
                            <Text style={styles.actionDesc}>{a.description}</Text>
                            <Text style={styles.actionMeta}>
                              {a.date_action}{a.responsable_decision && ` · ${a.responsable_decision}`}
                              {a.date_resolution ? ` · ✓ résolu ${a.date_resolution}` : ''}
                            </Text>
                          </View>
                        ))
                      )}
                    </View>
                  )}
                </View>
              )}

              <Text style={styles.expandHint}>
                {isExpanded ? '▼ Réduire' : '▶ Voir détails'}
              </Text>
            </TouchableOpacity>
          );
        })
      )}

      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a2e1a' },
  content: { padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a2e1a' },
  loading: { color: '#7ec87e', fontSize: 16 },

  headerCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#243d24', borderRadius: 12, padding: 14,
    marginBottom: 12, borderLeftWidth: 5, borderLeftColor: '#7ec87e',
  },
  ccpNumeroBadge: {
    backgroundColor: '#7ec87e', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 10, marginRight: 12,
  },
  ccpNumeroText: { color: '#1a2e1a', fontSize: 14, fontWeight: '800' },
  ccpNom: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  produitNom: { fontSize: 12, color: '#a8c8a8', marginTop: 2 },

  kpiBanner: {
    flexDirection: 'row', backgroundColor: '#243d24', borderRadius: 10,
    padding: 12, marginBottom: 12, alignItems: 'center',
  },
  kpiCol: { flex: 1, alignItems: 'center' },
  kpiNumber: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  kpiLabel: { fontSize: 10, color: '#a8c8a8', marginTop: 2, textTransform: 'uppercase' },
  kpiSeparator: { width: 1, height: 32, backgroundColor: '#3a5a3a' },

  btnNouveau: {
    backgroundColor: '#7ec87e', borderRadius: 10, padding: 12,
    alignItems: 'center', marginBottom: 16,
  },
  btnNouveauText: { color: '#1a2e1a', fontSize: 14, fontWeight: '700' },

  sectionTitle: {
    fontSize: 14, fontWeight: '700', color: '#7ec87e',
    marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.4,
  },

  releveCard: {
    backgroundColor: '#243d24', borderRadius: 10, padding: 12,
    marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#7ec87e',
  },
  releveCardNc: { borderLeftColor: '#e87e3a' },
  releveCardNcResolu: { borderLeftColor: '#d4a04a' },

  releveHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  releveDate: { fontSize: 13, color: '#fff', fontWeight: '600' },
  releveOperateur: { fontSize: 11, color: '#a8c8a8', marginTop: 2 },
  releveBadgeBloc: { alignItems: 'flex-end' },
  statutBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statutBadgeText: { fontSize: 10, color: '#1a2e1a', fontWeight: '700' },

  releveLot: {
    fontSize: 11, color: '#7ec87e', fontWeight: '600',
    marginBottom: 6, marginTop: 2,
  },

  valeursRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  valeurChip: {
    backgroundColor: '#1a2e1a', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  valeurChipParam: { fontSize: 10, color: '#a8c8a8' },
  valeurChipValeur: { fontSize: 12, color: '#fff', fontWeight: '700' },

  motifBox: {
    backgroundColor: '#3d2424', borderRadius: 6, padding: 8,
    marginTop: 6, borderLeftWidth: 3, borderLeftColor: '#e87e3a',
  },
  motifText: { color: '#ff9f9f', fontSize: 11, fontWeight: '600' },

  expandedBloc: { marginTop: 10 },
  obsBox: {
    backgroundColor: '#1a2e1a', borderRadius: 6, padding: 8,
    marginBottom: 8,
  },
  obsLabel: {
    fontSize: 10, color: '#7ec87e', fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3,
  },
  obsText: { fontSize: 12, color: '#fff', lineHeight: 16 },

  actionsBloc: {
    backgroundColor: '#1a2e1a', borderRadius: 6, padding: 8,
  },
  actionsTitle: {
    fontSize: 11, color: '#e87e3a', fontWeight: '700',
    marginBottom: 6, textTransform: 'uppercase',
  },
  actionCard: {
    backgroundColor: '#243d24', borderRadius: 6, padding: 8,
    marginBottom: 6,
  },
  actionType: { fontSize: 12, color: '#fff', fontWeight: '700' },
  actionDesc: { fontSize: 12, color: '#c8d8c8', marginTop: 3, lineHeight: 16 },
  actionMeta: { fontSize: 10, color: '#a8c8a8', marginTop: 4, fontStyle: 'italic' },

  expandHint: {
    fontSize: 10, color: '#a8c8a8',
    textAlign: 'center', marginTop: 6, fontStyle: 'italic',
  },

  emptyBlock: {
    backgroundColor: '#243d24', borderRadius: 10, padding: 24,
    alignItems: 'center', marginBottom: 8,
  },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#a8c8a8', marginBottom: 6 },
  emptyText: { fontSize: 12, color: '#7a9a7a', textAlign: 'center', lineHeight: 17 },
});