// screens/CertifTrackHomeScreen.js
// Écran d'accueil CertifTrack — Dashboard catalogue + engagements
// Phase 3 Session 7

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  getStatsEngagementsParReferentiel,
  getKpiCertifTrack,
  getAllEngagements,
  getStatutLabel,
  getStatutColor,
  getTypeReferentielColor,
  getTypeReferentielLabel,
  countAlertesActives,
  getToutesAlertesActives,
} from '../database/certifTrack';

export default function CertifTrackHomeScreen({ navigation }) {
const [kpi, setKpi] = useState(null);
  const [referentielsStats, setReferentielsStats] = useState([]);
  const [derniersEngagements, setDerniersEngagements] = useState([]);
  const [alertesKpi, setAlertesKpi] = useState({ total: 0, critiques: 0, avertissements: 0 });
  const [alertesActives, setAlertesActives] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = () => {
    try {
setKpi(getKpiCertifTrack());
      setReferentielsStats(getStatsEngagementsParReferentiel());
      const all = getAllEngagements();
      setDerniersEngagements(all.slice(0, 5)); // 5 plus récents

      // NOUVEAU Session 8 : charger les alertes globales
      try {
        setAlertesKpi(countAlertesActives());
        const allAlertes = getToutesAlertesActives() || [];
        setAlertesActives(allAlertes.slice(0, 3)); // top 3
      } catch (e) {
        setAlertesKpi({ total: 0, critiques: 0, avertissements: 0 });
        setAlertesActives([]);
      }
    } catch (error) {
      console.error('Erreur chargement CertifTrack:', error);
      Alert.alert('Erreur', 'Impossible de charger les données CertifTrack');
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    setRefreshing(false);
  };

  const handleReferentielPress = (referentiel) => {
    navigation.navigate('ReferentielDetail', { referentielId: referentiel.referentiel_id });
  };

  const groupedReferentiels = referentielsStats.reduce((acc, ref) => {
    if (!acc[ref.type_referentiel]) acc[ref.type_referentiel] = [];
    acc[ref.type_referentiel].push(ref);
    return acc;
  }, {});



  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7ec87e" />}
    >
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.title}>🛡️ CertifTrack</Text>
        <Text style={styles.subtitle}>Catalogue référentiels & engagements</Text>
      </View>

      {/* KPI Banner */}
      {kpi && (
        <View style={styles.kpiBanner}>
          <View style={styles.kpiCol}>
            <Text style={styles.kpiNumber}>{kpi.total_engagements || 0}</Text>
            <Text style={styles.kpiLabel}>Engagements</Text>
          </View>
          <View style={styles.kpiSeparator} />
          <View style={styles.kpiCol}>
            <Text style={[styles.kpiNumber, { color: '#d4a04a' }]}>{kpi.total_vises || 0}</Text>
            <Text style={styles.kpiLabel}>Visés</Text>
          </View>
          <View style={styles.kpiSeparator} />
          <View style={styles.kpiCol}>
            <Text style={[styles.kpiNumber, { color: '#7ec87e' }]}>{kpi.total_conversion || 0}</Text>
            <Text style={styles.kpiLabel}>Conversion</Text>
          </View>
          <View style={styles.kpiSeparator} />
          <View style={styles.kpiCol}>
            <Text style={[styles.kpiNumber, { color: '#2e7d32' }]}>{kpi.total_certifies || 0}</Text>
            <Text style={styles.kpiLabel}>Certifiés</Text>
          </View>
        </View>
      )}
{/* NOUVEAU Session 8 : Bandeau alertes conformité globales */}
      {alertesKpi.total > 0 && (
        <View style={styles.alertesGlobales}>
          <View style={styles.alertesGlobalesHeader}>
            <Text style={styles.alertesGlobalesTitre}>
              🚨 Alertes conformité actives
            </Text>
            <View style={styles.alertesGlobalesStats}>
              {alertesKpi.critiques > 0 && (
                <Text style={styles.alertesGlobalesCritiques}>
                  {alertesKpi.critiques} critique{alertesKpi.critiques > 1 ? 's' : ''}
                </Text>
              )}
              {alertesKpi.avertissements > 0 && (
                <Text style={styles.alertesGlobalesAvertissements}>
                  {alertesKpi.avertissements} avert.
                </Text>
              )}
            </View>
          </View>

          {alertesActives.map((a) => (
            <View key={a.id} style={styles.alerteApercu}>
              <Text style={styles.alerteApercuTitre} numberOfLines={1}>
                {a.severite === 'critique' ? '🚨 ' : '⚠️ '}
                {a.titre}
              </Text>
              <Text style={styles.alerteApercuRef}>
                {a.ref_nom_court} · {a.cible_type} #{a.cible_id}
              </Text>
            </View>
          ))}

          {alertesKpi.total > 3 && (
            <Text style={styles.alertesGlobalesPlus}>
              + {alertesKpi.total - 3} autre{alertesKpi.total - 3 > 1 ? 's' : ''} alerte{alertesKpi.total - 3 > 1 ? 's' : ''}
            </Text>
          )}
        </View>
      )}
      {/* Sous-banner cibles */}
      {kpi && (kpi.lots_engages > 0 || kpi.sites_engages > 0 || kpi.cultures_engagees > 0) && (
        <View style={styles.ciblesBanner}>
          <Text style={styles.ciblesText}>
            📦 {kpi.lots_engages} lot{kpi.lots_engages > 1 ? 's' : ''} · 🗺️ {kpi.sites_engages} site{kpi.sites_engages > 1 ? 's' : ''} · 🌱 {kpi.cultures_engagees} culture{kpi.cultures_engagees > 1 ? 's' : ''}
          </Text>
        </View>
      )}
{/* Bouton accès SCI Inspections */}
<TouchableOpacity
  style={styles.btnSciAccess}
  onPress={() => navigation.navigate('PlanificationInspections')}
>
  <Text style={styles.btnSciAccessIcon}>🛡</Text>
  <View style={styles.btnSciAccessTextWrap}>
    <Text style={styles.btnSciAccessTitle}>Inspections SCI</Text>
    <Text style={styles.btnSciAccessSub}>Planification, terrain, sanctions producteurs</Text>
  </View>
  <Text style={styles.btnSciAccessChevron}>›</Text>
</TouchableOpacity>
      {/* Catalogue référentiels par type */}
      <Text style={styles.sectionTitle}>📚 Catalogue référentiels</Text>

      {Object.keys(groupedReferentiels).map((type) => (
        <View key={type} style={styles.typeGroup}>
          <View style={styles.typeHeader}>
            <View style={[styles.typeDot, { backgroundColor: getTypeReferentielColor(type) }]} />
            <Text style={styles.typeTitle}>{getTypeReferentielLabel(type)}</Text>
          </View>

          {groupedReferentiels[type].map((ref) => (
            <TouchableOpacity
              key={ref.referentiel_id}
              style={styles.referentielCard}
              onPress={() => handleReferentielPress(ref)}
              activeOpacity={0.7}
            >
              <View style={styles.refCardLeft}>
                <Text style={styles.refNomCourt}>{ref.nom_court}</Text>
                <Text style={styles.refNomComplet} numberOfLines={1}>
                  {ref.nom_complet}
                </Text>
              </View>

              <View style={styles.refCardRight}>
                {ref.nb_engagements > 0 ? (
                  <View style={styles.refStats}>
                    <Text style={styles.refStatsNumber}>{ref.nb_engagements}</Text>
                    <Text style={styles.refStatsLabel}>
                      engagement{ref.nb_engagements > 1 ? 's' : ''}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.refNoEngagement}>Aucun engagement</Text>
                )}
                <Text style={styles.refChevron}>›</Text>
              </View>
            </TouchableOpacity>
          ))}
          
        </View>
      ))}

      {/* Derniers engagements */}
      {derniersEngagements.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>🕒 Derniers engagements</Text>
          {derniersEngagements.map((eng) => (
            <View key={eng.id} style={styles.engagementCard}>
              <View style={styles.engCardHeader}>
                <Text style={styles.engRefName}>{eng.ref_nom_court}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatutColor(eng.statut) },
                  ]}
                >
                  <Text style={styles.statusText}>{getStatutLabel(eng.statut)}</Text>
                </View>
              </View>
              <Text style={styles.engCible}>
                {eng.cible_type === 'lot' && '📦 Lot'}
                {eng.cible_type === 'site' && '🗺️ Site'}
                {eng.cible_type === 'culture' && '🌱 Culture'}
                {' · '}#{eng.cible_id}
              </Text>
              <Text style={styles.engDate}>Engagé le {eng.date_engagement}</Text>
            </View>
          ))}
        </>
      )}

      {/* État vide */}
      {kpi && kpi.total_engagements === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🎯</Text>
          <Text style={styles.emptyTitle}>Aucun engagement encore</Text>
          <Text style={styles.emptyText}>
            Pour engager un lot, un site ou une culture sur un référentiel,
            ouvre la fiche concernée et utilise le bouton « Certifications visées ».
          </Text>
        </View>
      )}

      {/* Note v1 */}
      <View style={styles.versionNote}>
        <Text style={styles.versionNoteText}>
          ℹ️ CertifTrack v1 — Catalogue + engagement déclaratif. Le moteur de conformité
          (exigences atomiques + alertes auto) arrive en v2. Le Système de Contrôle
          Interne (SCI) pour la filière collecte arrive en v3.
        </Text>
      </View>
<TouchableOpacity
  style={{
    backgroundColor: '#243d24',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#7ec87e',
  }}
  onPress={() => navigation.navigate('OperateurForm')}
>
  <Text style={{ color: '#7ec87e', fontSize: 15, fontWeight: 'bold' }}>
    🏢 Opérateur (test 9d1)
  </Text>
  <Text style={{ color: '#a8c8a8', fontSize: 12, marginTop: 4 }}>
    Saisir/modifier les infos de l'exportateur
  </Text>
</TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>

    
  );
}

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
    fontSize: 14,
    color: '#a8c8a8',
    marginTop: 4,
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
    fontSize: 24,
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

  // NOUVEAU Session 8 — Alertes globales
  alertesGlobales: {
    backgroundColor: '#2a2014',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#cc4444',
  },
  alertesGlobalesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertesGlobalesTitre: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e8be78',
  },
  alertesGlobalesStats: {
    flexDirection: 'row',
    gap: 8,
  },
  alertesGlobalesCritiques: {
    fontSize: 11,
    color: '#ff8888',
    fontWeight: '700',
  },
  alertesGlobalesAvertissements: {
    fontSize: 11,
    color: '#e8be78',
    fontWeight: '600',
  },
  alerteApercu: {
    backgroundColor: '#1a2e1a',
    borderRadius: 6,
    padding: 8,
    marginBottom: 4,
  },
  alerteApercuTitre: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  alerteApercuRef: {
    fontSize: 10,
    color: '#a8c8a8',
    marginTop: 2,
    fontStyle: 'italic',
  },
  alertesGlobalesPlus: {
    fontSize: 11,
    color: '#7a9a7a',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
  
  ciblesBanner: {
    backgroundColor: '#243d24',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    alignItems: 'center',
  },
  ciblesText: {
    fontSize: 13,
    color: '#a8c8a8',
  },

  // Sections
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7ec87e',
    marginTop: 24,
    marginBottom: 12,
  },

  // Groupes de type
  typeGroup: {
    marginBottom: 16,
  },
  typeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  typeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  typeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a8c8a8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Cards référentiels
  referentielCard: {
    backgroundColor: '#243d24',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#7ec87e',
  },
  refCardLeft: {
    flex: 1,
  },
  refNomCourt: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  refNomComplet: {
    fontSize: 12,
    color: '#a8c8a8',
  },
  refCardRight: {
    alignItems: 'flex-end',
    flexDirection: 'row',
  },
  refStats: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  refStatsNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7ec87e',
  },
  refStatsLabel: {
    fontSize: 10,
    color: '#a8c8a8',
  },
  refNoEngagement: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
    marginRight: 8,
  },
  refChevron: {
    fontSize: 24,
    color: '#7ec87e',
    fontWeight: '300',
  },

  // Cards engagements
  engagementCard: {
    backgroundColor: '#243d24',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  engCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  engRefName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  engCible: {
    fontSize: 13,
    color: '#a8c8a8',
    marginBottom: 2,
  },
  engDate: {
    fontSize: 11,
    color: '#666',
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
  btnSciAccess: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#243d24',
  borderRadius: 10,
  padding: 14,
  marginTop: 12,
  marginBottom: 8,
  borderLeftWidth: 4,
  borderLeftColor: '#d4a04a',
},
btnSciAccessIcon: {
  fontSize: 26,
  marginRight: 12,
},
btnSciAccessTextWrap: {
  flex: 1,
},
btnSciAccessTitle: {
  fontSize: 15,
  fontWeight: '700',
  color: '#fff',
},
btnSciAccessSub: {
  fontSize: 11,
  color: '#a8c8a8',
  marginTop: 2,
},
btnSciAccessChevron: {
  fontSize: 26,
  color: '#d4a04a',
  fontWeight: '300',
},
});