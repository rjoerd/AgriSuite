// screens/CertifTrackHomeScreen.js
// Écran d'accueil CertifTrack — Dashboard catalogue + engagements
// Phase 3 Session 7 + 8 + 9d3 (carte Opérateur)

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
import { getOperateur, getEngagementsOperateur } from '../database/operateur';

export default function CertifTrackHomeScreen({ navigation }) {
  const [kpi, setKpi] = useState(null);
  const [referentielsStats, setReferentielsStats] = useState([]);
  const [derniersEngagements, setDerniersEngagements] = useState([]);
  const [alertesKpi, setAlertesKpi] = useState({ total: 0, critiques: 0, avertissements: 0 });
  const [alertesActives, setAlertesActives] = useState([]);
  const [operateurInfo, setOperateurInfo] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = () => {
    try {
      setKpi(getKpiCertifTrack());
      setReferentielsStats(getStatsEngagementsParReferentiel());
      const all = getAllEngagements();
      setDerniersEngagements(all.slice(0, 5)); // 5 plus récents

      // Session 8 : alertes globales
      try {
        setAlertesKpi(countAlertesActives());
        const allAlertes = getToutesAlertesActives() || [];
        setAlertesActives(allAlertes.slice(0, 3));
      } catch (e) {
        setAlertesKpi({ total: 0, critiques: 0, avertissements: 0 });
        setAlertesActives([]);
      }

      // 🆕 Session 9d3 : bloc Opérateur
      try {
        const op = getOperateur();
        if (op) {
          const engagements = getEngagementsOperateur(op.id);
          let totalExigences = 0;
          let totalConformes = 0;
          let totalNcMajeures = 0;
          engagements.forEach((eng) => {
            totalExigences += eng.nb_exigences_operateur || 0;
            totalConformes += eng.nb_conformes_operateur || 0;
            totalNcMajeures += eng.nb_nc_majeures || 0;
          });
          setOperateurInfo({
            operateur: op,
            nb_engagements: engagements.length,
            total_exigences: totalExigences,
            total_conformes: totalConformes,
            pct_conformite: totalExigences > 0 ? Math.round((totalConformes / totalExigences) * 100) : 0,
            nc_majeures: totalNcMajeures,
          });
        }
      } catch (err) {
        console.log('[CertifTrackHome] Erreur chargement opérateur:', err.message);
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

      {/* 🆕 Session 9d3 — Carte Opérateur (audit système qualité global) */}
      {operateurInfo && (
        <TouchableOpacity
          style={styles.operateurCard}
          onPress={() => navigation.navigate('OperateurForm')}
          activeOpacity={0.7}
        >
          <View style={styles.operateurHeader}>
            <Text style={styles.operateurIcone}>🏢</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.operateurTitre}>{operateurInfo.operateur.nom_legal}</Text>
              <Text style={styles.operateurSousTitre}>Opérateur — système qualité global</Text>
            </View>
            <Text style={styles.operateurChevron}>›</Text>
          </View>

          {operateurInfo.nb_engagements === 0 ? (
            <View style={styles.operateurEmpty}>
              <Text style={styles.operateurEmptyText}>
                Aucun référentiel engagé. Tapez pour en activer un.
              </Text>
            </View>
          ) : (
            <View style={styles.operateurStats}>
              <View style={styles.operateurScoreRow}>
                <View style={styles.operateurBarOuter}>
                  <View
                    style={[
                      styles.operateurBarInner,
                      {
                        width: `${operateurInfo.pct_conformite}%`,
                        backgroundColor:
                          operateurInfo.pct_conformite >= 80
                            ? '#7ec87e'
                            : operateurInfo.pct_conformite >= 50
                            ? '#d4a04a'
                            : '#c87e7e',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.operateurScoreText}>
                  {operateurInfo.total_conformes}/{operateurInfo.total_exigences} ({operateurInfo.pct_conformite}%)
                </Text>
              </View>

              <View style={styles.operateurFooter}>
                <Text style={styles.operateurFooterTexte}>
                  🔍 {operateurInfo.nb_engagements} référentiel{operateurInfo.nb_engagements > 1 ? 's' : ''} engagé{operateurInfo.nb_engagements > 1 ? 's' : ''}
                </Text>
                {operateurInfo.nc_majeures > 0 && (
                  <Text style={styles.operateurNcMajeure}>
                    ⚠ {operateurInfo.nc_majeures} NC majeure{operateurInfo.nc_majeures > 1 ? 's' : ''}
                  </Text>
                )}
              </View>
            </View>
          )}
        </TouchableOpacity>
        
      )}

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

      {/* Session 8 — Bandeau alertes conformité globales */}
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

      <TouchableOpacity
  style={{ backgroundColor: '#243d24', borderRadius: 10, padding: 14, marginVertical: 8, borderLeftWidth: 4, borderLeftColor: '#7ec87e' }}
  onPress={() => navigation.navigate('HaccpHome')}
>
  <Text style={{ color: '#7ec87e', fontSize: 15, fontWeight: 'bold' }}>🧪 HACCP — Études</Text>
  <Text style={{ color: '#a8c8a8', fontSize: 11, marginTop: 4 }}>Sécurité alimentaire par produit</Text>
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
                {eng.cible_type === 'fournisseur' && '👤 Fournisseur'}
                {eng.cible_type === 'operateur' && '🏢 Opérateur'}
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

  // 🆕 Session 9d3 — Carte Opérateur
  operateurCard: {
    backgroundColor: '#243d24',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 5,
    borderLeftColor: '#7ec87e',
  },
  operateurHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  operateurIcone: {
    fontSize: 28,
    marginRight: 10,
  },
  operateurTitre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  operateurSousTitre: {
    fontSize: 11,
    color: '#a8c8a8',
    marginTop: 2,
    fontStyle: 'italic',
  },
  operateurChevron: {
    fontSize: 22,
    color: '#7ec87e',
    marginLeft: 8,
  },
  operateurEmpty: {
    backgroundColor: '#1a2e1a',
    borderRadius: 6,
    padding: 8,
    marginTop: 4,
  },
  operateurEmptyText: {
    color: '#8aa88a',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  operateurStats: {
    marginTop: 4,
  },
  operateurScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  operateurBarOuter: {
    flex: 1,
    height: 10,
    backgroundColor: '#1a2e1a',
    borderRadius: 5,
    marginRight: 10,
    overflow: 'hidden',
  },
  operateurBarInner: {
    height: 10,
    borderRadius: 5,
  },
  operateurScoreText: {
    fontSize: 12,
    color: '#a8c8a8',
    fontWeight: '600',
    minWidth: 90,
    textAlign: 'right',
  },
  operateurFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  operateurFooterTexte: {
    fontSize: 12,
    color: '#7ec87e',
    fontWeight: '500',
  },
  operateurNcMajeure: {
    fontSize: 11,
    color: '#ff9f9f',
    fontWeight: '700',
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

  // Alertes globales
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

  // Bouton SCI
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