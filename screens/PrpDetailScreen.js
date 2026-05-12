// screens/PrpDetailScreen.js
// Phase 3 - Session 10c.2 - Détail d'un PRP : plan + procédures + registres récents

import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getPlanById,
  getProceduresByPlan,
  getRegistresByPlan,
  getStatsPlan,
  getTypePrpInfo,
  getStatutLabel,
  getStatutColor,
  getResultatColor,
  getResultatLabel,
  updatePlan,
} from '../database/prp';

export default function PrpDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { planId } = route.params;

  const [plan, setPlan] = useState(null);
  const [procedures, setProcedures] = useState([]);
  const [registres, setRegistres] = useState([]);
  const [stats, setStats] = useState({});
  const [expandedProc, setExpandedProc] = useState(null);

  const charger = useCallback(() => {
    try {
      const p = getPlanById(planId);
      setPlan(p);
      setProcedures(getProceduresByPlan(planId));
      setRegistres(getRegistresByPlan(planId, 10));
      setStats(getStatsPlan(planId));
    } catch (e) {
      console.error('PrpDetail error:', e);
    }
  }, [planId]);

  useFocusEffect(useCallback(() => { charger(); }, [charger]));

  const validerPlan = () => {
    Alert.alert(
      'Valider le plan ?',
      'Le plan passera du statut "Brouillon" à "Validé". Il pourra ensuite être présenté à un auditeur. Tu pourras toujours le modifier ensuite.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Valider',
          onPress: () => {
            updatePlan(planId, {
              statut: 'valide',
              derniere_revision: new Date().toISOString().split('T')[0],
            });
            charger();
          },
        },
      ]
    );
  };

  if (!plan) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#7ec87e' }}>Chargement...</Text>
      </View>
    );
  }

  const info = getTypePrpInfo(plan.type_prp);
  const couleurTaux = stats.taux_conformite === null ? '#888'
    : stats.taux_conformite >= 95 ? '#7ec87e'
    : stats.taux_conformite >= 85 ? '#d4a04a' : '#e74c3c';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.icone}>{info?.icone}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.nom}>{plan.nom}</Text>
            <View style={[styles.statutBadge, { backgroundColor: getStatutColor(plan.statut) + '33', borderColor: getStatutColor(plan.statut) }]}>
              <Text style={[styles.statutText, { color: getStatutColor(plan.statut) }]}>
                {getStatutLabel(plan.statut)}
              </Text>
            </View>
          </View>
        </View>

        {/* STATS */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total_30j || 0}</Text>
            <Text style={styles.statLabel}>Registres 30j</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: couleurTaux }]}>
              {stats.taux_conformite === null ? '—' : `${stats.taux_conformite}%`}
            </Text>
            <Text style={styles.statLabel}>Conformité</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: stats.nc_ouvertes > 0 ? '#e74c3c' : '#7ec87e' }]}>
              {stats.nc_ouvertes || 0}
            </Text>
            <Text style={styles.statLabel}>NC ouvertes</Text>
          </View>
        </View>

        {/* PLAN — Cahier des charges */}
        <Text style={styles.sectionTitle}>📋 Cahier des charges</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Description</Text>
          <Text style={styles.value}>{plan.description}</Text>

          <Text style={styles.label}>Danger maîtrisé</Text>
          <Text style={styles.value}>{plan.danger_maitrise}</Text>

          <Text style={styles.label}>Référence réglementaire</Text>
          <Text style={styles.valueRef}>{plan.reference_reglementaire}</Text>

          <Text style={styles.label}>Responsable</Text>
          <Text style={styles.value}>{plan.responsable || '—'}</Text>

          <Text style={styles.label}>Révision</Text>
          <Text style={styles.value}>
            Fréquence : {plan.frequence_revision || '—'}
            {plan.derniere_revision && ` · Dernière : ${plan.derniere_revision}`}
          </Text>

          {plan.statut === 'brouillon' && (
            <TouchableOpacity style={styles.btnValider} onPress={validerPlan}>
              <Text style={styles.btnValiderText}>✅ Valider ce plan</Text>
            </TouchableOpacity>
          )}
        </View>
<TouchableOpacity
  style={{ backgroundColor: '#2a3e2a', padding: 12, borderRadius: 8, marginTop: 12, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#d4a04a', flexDirection: 'row', alignItems: 'center' }}
  onPress={() => navigation.navigate('PrpExportPdf', { planId })}
>
  <Text style={{ fontSize: 20, marginRight: 10 }}>📄</Text>
  <View style={{ flex: 1 }}>
    <Text style={{ color: '#d4a04a', fontSize: 14, fontWeight: 'bold' }}>Exporter en PDF</Text>
    <Text style={{ color: '#888', fontSize: 11 }}>Registre prêt audit Ecocert / BV / SGS</Text>
  </View>
</TouchableOpacity>
        {/* PROCÉDURES */}
        <Text style={styles.sectionTitle}>
          📑 Procédures ({procedures.length})
        </Text>
        <Text style={styles.hint}>Tape une procédure pour voir son détail</Text>

        {procedures.map(p => (
          <TouchableOpacity
            key={p.id}
            style={styles.procCard}
            onPress={() => setExpandedProc(expandedProc === p.id ? null : p.id)}
          >
            <View style={styles.procHeader}>
              <Text style={styles.procOrdre}>{p.ordre}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.procTitre}>{p.titre}</Text>
                <Text style={styles.procFreq}>⏱ {p.frequence_execution}</Text>
              </View>
              <Text style={styles.chevron}>{expandedProc === p.id ? '▼' : '▶'}</Text>
            </View>

            {expandedProc === p.id && (
              <View style={styles.procBody}>
                <Text style={styles.procContent}>{p.contenu_detaille}</Text>
                {p.responsable_execution && (
                  <Text style={styles.procMeta}>👤 Responsable : {p.responsable_execution}</Text>
                )}
                {p.valeurs_attendues_json && (
                  <View style={styles.valeursBox}>
                    <Text style={styles.valeursLabel}>Valeurs/limites attendues :</Text>
                    <Text style={styles.valeursContent}>
                      {Object.entries(JSON.parse(p.valeurs_attendues_json))
                        .map(([k, v]) => `• ${k} : ${Array.isArray(v) ? v.join(', ') : v}`)
                        .join('\n')}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.btnRegistre}
                  onPress={() => navigation.navigate('PrpRegistreForm', {
                    planId,
                    procedureId: p.id,
                    procedureTitre: p.titre,
                  })}
                >
                  <Text style={styles.btnRegistreText}>📝 Enregistrer une exécution</Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        ))}

        {/* REGISTRES RÉCENTS */}
        <Text style={styles.sectionTitle}>📝 Derniers registres ({registres.length})</Text>

        {registres.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Aucun registre enregistré.</Text>
            <Text style={styles.emptyHint}>
              Tape une procédure ci-dessus puis "Enregistrer une exécution".
            </Text>
          </View>
        ) : (
          registres.map(r => (
            <TouchableOpacity
              key={r.id}
              style={[styles.registreCard, { borderLeftColor: getResultatColor(r.resultat) }]}
              onPress={() => {
                if (r.necessite_action_corrective && !r.action_corrective_resolue) {
                  navigation.navigate('PrpActionCorrective', { registreId: r.id });
                }
              }}
            >
              <View style={styles.registreHeader}>
                <Text style={styles.registreDate}>{r.date_execution} {r.heure_execution || ''}</Text>
                <Text style={[styles.registreResultat, { color: getResultatColor(r.resultat) }]}>
                  {getResultatLabel(r.resultat)}
                </Text>
              </View>
              <Text style={styles.registreProc}>{r.procedure_titre || '(libre)'}</Text>
              <Text style={styles.registreMeta}>
                👤 {r.operateur}
                {r.lieu && ` · 📍 ${r.lieu}`}
              </Text>
              {r.observations && (
                <Text style={styles.registreObs} numberOfLines={2}>{r.observations}</Text>
              )}
              {r.necessite_action_corrective === 1 && r.action_corrective_resolue === 0 && (
                <Text style={styles.registreNc}>🚨 NC à clôturer → tape pour traiter</Text>
              )}
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a2e1a' },
  content: { padding: 16, paddingBottom: 40 },

  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  icone: { fontSize: 40, marginRight: 12 },
  nom: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 6 },
  statutBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  statutText: { fontSize: 11, fontWeight: 'bold' },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#2a3e2a', padding: 12, borderRadius: 6, marginHorizontal: 3, alignItems: 'center' },
  statValue: { color: '#7ec87e', fontSize: 20, fontWeight: 'bold' },
  statLabel: { color: '#aaa', fontSize: 10, marginTop: 2 },

  sectionTitle: { color: '#7ec87e', fontSize: 16, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  hint: { color: '#888', fontSize: 11, fontStyle: 'italic', marginBottom: 8 },

  card: { backgroundColor: '#243d24', padding: 12, borderRadius: 8, marginBottom: 8 },
  label: { color: '#7ec87e', fontSize: 11, fontWeight: 'bold', marginTop: 8 },
  value: { color: '#fff', fontSize: 13, marginTop: 2 },
  valueRef: { color: '#a8c8a8', fontSize: 12, fontStyle: 'italic', marginTop: 2 },

  btnValider: {
    backgroundColor: '#7ec87e',
    padding: 12,
    borderRadius: 6,
    marginTop: 16,
    alignItems: 'center',
  },
  btnValiderText: { color: '#1a2e1a', fontSize: 14, fontWeight: 'bold' },

  procCard: { backgroundColor: '#243d24', borderRadius: 8, marginBottom: 8 },
  procHeader: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  procOrdre: {
    color: '#1a2e1a',
    backgroundColor: '#7ec87e',
    width: 28, height: 28, borderRadius: 14,
    textAlign: 'center', textAlignVertical: 'center',
    fontWeight: 'bold', fontSize: 13, marginRight: 12,
    lineHeight: 28,
  },
  procTitre: { color: '#fff', fontSize: 14, fontWeight: '600' },
  procFreq: { color: '#a8c8a8', fontSize: 11, marginTop: 2 },
  chevron: { color: '#7ec87e', fontSize: 14, marginLeft: 8 },

  procBody: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#3a5a3a',
  },
  procContent: { color: '#d0d8d0', fontSize: 12, lineHeight: 18 },
  procMeta: { color: '#a8c8a8', fontSize: 11, marginTop: 8 },

  valeursBox: {
    backgroundColor: '#1f2f1f',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  valeursLabel: { color: '#7ec87e', fontSize: 11, fontWeight: 'bold', marginBottom: 4 },
  valeursContent: { color: '#bbb', fontSize: 11, fontFamily: 'monospace', lineHeight: 16 },

  btnRegistre: {
    backgroundColor: '#3a5a3a',
    padding: 10,
    borderRadius: 6,
    marginTop: 12,
    alignItems: 'center',
  },
  btnRegistreText: { color: '#7ec87e', fontSize: 13, fontWeight: 'bold' },

  emptyBox: { padding: 20, alignItems: 'center' },
  emptyText: { color: '#888', fontSize: 13 },
  emptyHint: { color: '#666', fontSize: 11, fontStyle: 'italic', marginTop: 4, textAlign: 'center' },

  registreCard: {
    backgroundColor: '#243d24',
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
    borderLeftWidth: 3,
  },
  registreHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  registreDate: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  registreResultat: { fontSize: 11, fontWeight: 'bold' },
  registreProc: { color: '#a8c8a8', fontSize: 12, marginTop: 2 },
  registreMeta: { color: '#888', fontSize: 11, marginTop: 4 },
  registreObs: { color: '#bbb', fontSize: 11, fontStyle: 'italic', marginTop: 4 },
  registreNc: { color: '#e74c3c', fontSize: 11, fontWeight: 'bold', marginTop: 6 },
});