// screens/PlanificationInspectionsScreen.js
// Écran calendrier inspections SCI — sections par urgence (logique audit)

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
  getInspectionsEnRetard,
  getInspectionsAVenir30j,
  getInspectionsPlusTard,
  getInspectionsRealiseesRecentes,
  getInspectionsReporteesAnnulees,
  getKpiInspections,
} from '../database/sciInspections';

const COULEURS = {
  bg: '#1a2e1a',
  card: '#243824',
  cardAlt: '#2a4a2a',
  vert: '#7ec87e',
  amber: '#d4a04a',
  rouge: '#e74c3c',
  gris: '#9ca39c',
  blanc: '#ffffff',
};

const LIBELLES_TYPE = {
  initiale: 'Initiale',
  annuelle: 'Annuelle',
  inopinee: 'Inopinée',
  suivi_sanction: 'Suivi sanction',
};

const LIBELLES_REF = {
  BIO_UE: 'BIO UE',
  HACCP: 'HACCP',
  FAIRTRADE_FLO: 'Fairtrade',
  RAINFOREST: 'Rainforest',
  LABEL_VANILLE_MDG: 'Label Vanille',
};

export default function PlanificationInspectionsScreen({ navigation }) {
  const [enRetard, setEnRetard] = useState([]);
  const [aVenir30j, setAVenir30j] = useState([]);
  const [plusTard, setPlusTard] = useState([]);
  const [realisees, setRealisees] = useState([]);
  const [reporteesAnnulees, setReporteesAnnulees] = useState([]);
  const [kpi, setKpi] = useState({ en_retard: 0, a_venir_30j: 0, realisees_12mois: 0, fournisseurs_actifs: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [showRealisees, setShowRealisees] = useState(false);
  const [showReporteesAnnulees, setShowReporteesAnnulees] = useState(false);

  const charger = useCallback(() => {
    try {
      setEnRetard(getInspectionsEnRetard());
      setAVenir30j(getInspectionsAVenir30j());
      setPlusTard(getInspectionsPlusTard());
      setRealisees(getInspectionsRealiseesRecentes());
      setReporteesAnnulees(getInspectionsReporteesAnnulees());
      setKpi(getKpiInspections());
    } catch (e) {
      console.error('[PlanificationInspections] Erreur chargement:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    charger();
    setRefreshing(false);
  }, [charger]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const renderInspection = (insp, options = {}) => (
    <TouchableOpacity
      key={insp.id}
      style={[styles.card, options.urgent && styles.cardUrgent]}
      onPress={() => navigation.navigate('InspectionFormPlanif', { inspectionId: insp.id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardFournisseur}>{insp.fournisseur_code} · {insp.fournisseur_nom}</Text>
        <View style={[styles.badge, { backgroundColor: COULEURS.cardAlt }]}>
          <Text style={styles.badgeText}>{LIBELLES_REF[insp.referentiel_code] || insp.referentiel_code}</Text>
        </View>
      </View>
      <View style={styles.cardLine}>
        <Text style={styles.cardType}>{LIBELLES_TYPE[insp.type_inspection]}</Text>
        <Text style={[styles.cardDate, options.urgent && styles.textUrgent]}>
          {formatDate(insp.date_prevue)}
          {insp.jours_retard !== undefined && (
            <Text style={styles.textUrgent}>  ⚠ {insp.jours_retard}j retard</Text>
          )}
          {insp.jours_restants !== undefined && (
            <Text style={styles.textInfo}>  · J-{insp.jours_restants}</Text>
          )}
        </Text>
      </View>
      {!!insp.inspecteur_prevu && (
        <Text style={styles.cardSub}>👤 {insp.inspecteur_prevu}</Text>
      )}
      {!!insp.motif && (
        <Text style={styles.cardSub} numberOfLines={1}>📝 {insp.motif}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COULEURS.vert} />}
      >
        {/* KPI Banner */}
        <View style={styles.kpiBanner}>
          <View style={styles.kpiItem}>
            <Text style={[styles.kpiValue, kpi.en_retard > 0 && styles.kpiValueAlert]}>{kpi.en_retard}</Text>
            <Text style={styles.kpiLabel}>En retard</Text>
          </View>
          <View style={styles.kpiSep} />
          <View style={styles.kpiItem}>
            <Text style={styles.kpiValue}>{kpi.a_venir_30j}</Text>
            <Text style={styles.kpiLabel}>30 jours</Text>
          </View>
          <View style={styles.kpiSep} />
          <View style={styles.kpiItem}>
            <Text style={styles.kpiValue}>{kpi.realisees_12mois}</Text>
            <Text style={styles.kpiLabel}>Réalisées 12m</Text>
          </View>
          <View style={styles.kpiSep} />
          <View style={styles.kpiItem}>
            <Text style={styles.kpiValue}>{kpi.fournisseurs_actifs}</Text>
            <Text style={styles.kpiLabel}>Fournisseurs</Text>
          </View>
        </View>

        {/* Bouton ajouter */}
        <TouchableOpacity
          style={styles.btnAjouter}
          onPress={() => navigation.navigate('InspectionFormPlanif', { inspectionId: null })}
        >
          <Text style={styles.btnAjouterText}>+ Planifier une inspection</Text>
        </TouchableOpacity>

        {/* SECTION : EN RETARD */}
        {enRetard.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderUrgent}>
              <Text style={styles.sectionTitleUrgent}>⚠ EN RETARD ({enRetard.length})</Text>
            </View>
            <Text style={styles.sectionWarning}>
              Inspections passées non-réalisées — risque non-conformité audit
            </Text>
            {enRetard.map((insp) => renderInspection(insp, { urgent: true }))}
          </View>
        )}

        {/* SECTION : À VENIR 30 JOURS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📅 À venir — 30 jours ({aVenir30j.length})</Text>
          </View>
          {aVenir30j.length === 0 ? (
            <Text style={styles.emptyText}>Aucune inspection planifiée dans les 30 prochains jours</Text>
          ) : (
            aVenir30j.map((insp) => renderInspection(insp))
          )}
        </View>

        {/* SECTION : PLUS TARD */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🗓 Plus tard ({plusTard.length})</Text>
          </View>
          {plusTard.length === 0 ? (
            <Text style={styles.emptyText}>Aucune inspection planifiée au-delà de 30 jours</Text>
          ) : (
            plusTard.map((insp) => renderInspection(insp))
          )}
        </View>

        {/* SECTION : RÉALISÉES (repliable) */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeaderToggle}
            onPress={() => setShowRealisees(!showRealisees)}
          >
            <Text style={styles.sectionTitle}>
              ✓ Réalisées récentes ({realisees.length}) {showRealisees ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>
          {showRealisees && (
            realisees.length === 0 ? (
              <Text style={styles.emptyText}>Aucune inspection réalisée</Text>
            ) : (
              realisees.map((insp) => renderInspection(insp))
            )
          )}
        </View>

        {/* SECTION : REPORTÉES / ANNULÉES (repliable) */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeaderToggle}
            onPress={() => setShowReporteesAnnulees(!showReporteesAnnulees)}
          >
            <Text style={styles.sectionTitle}>
              ↻ Reportées / annulées ({reporteesAnnulees.length}) {showReporteesAnnulees ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>
          {showReporteesAnnulees && (
            reporteesAnnulees.length === 0 ? (
              <Text style={styles.emptyText}>Aucune inspection reportée ou annulée</Text>
            ) : (
              reporteesAnnulees.map((insp) => renderInspection(insp))
            )
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COULEURS.bg,
  },
  scrollContent: {
    padding: 16,
  },
  kpiBanner: {
    flexDirection: 'row',
    backgroundColor: COULEURS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  kpiItem: {
    flex: 1,
    alignItems: 'center',
  },
  kpiSep: {
    width: 1,
    height: 32,
    backgroundColor: COULEURS.cardAlt,
  },
  kpiValue: {
    color: COULEURS.vert,
    fontSize: 22,
    fontWeight: '700',
  },
  kpiValueAlert: {
    color: COULEURS.rouge,
  },
  kpiLabel: {
    color: COULEURS.gris,
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  btnAjouter: {
    backgroundColor: COULEURS.vert,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  btnAjouterText: {
    color: COULEURS.bg,
    fontSize: 15,
    fontWeight: '700',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  sectionHeaderUrgent: {
    backgroundColor: COULEURS.rouge,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 6,
  },
  sectionHeaderToggle: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  sectionTitle: {
    color: COULEURS.vert,
    fontSize: 15,
    fontWeight: '700',
  },
  sectionTitleUrgent: {
    color: COULEURS.blanc,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sectionWarning: {
    color: COULEURS.rouge,
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: COULEURS.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: COULEURS.cardAlt,
  },
  cardUrgent: {
    borderLeftColor: COULEURS.rouge,
    borderLeftWidth: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardFournisseur: {
    color: COULEURS.blanc,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    marginLeft: 6,
  },
  badgeText: {
    color: COULEURS.amber,
    fontSize: 11,
    fontWeight: '600',
  },
  cardLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  cardType: {
    color: COULEURS.vert,
    fontSize: 13,
    fontWeight: '500',
  },
  cardDate: {
    color: COULEURS.gris,
    fontSize: 12,
  },
  cardSub: {
    color: COULEURS.gris,
    fontSize: 11,
    marginTop: 4,
  },
  textUrgent: {
    color: COULEURS.rouge,
    fontWeight: '700',
  },
  textInfo: {
    color: COULEURS.amber,
  },
  emptyText: {
    color: COULEURS.gris,
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
});