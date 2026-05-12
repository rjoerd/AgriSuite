// screens/HaccpEtudeDetailScreen.js
// Phase 3 Session 10a-bis + 10a-bis2 — Détail d'une étude HACCP
//
// 10a-bis    : affichage dangers + CCP + limites
// 10a-bis2 : ajout section Mode opératoire détaillé par CCP

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  getEtudeById,
  getDangersByEtude,
  getCcpsByEtude,
  getLimitesByCcp,
  GRAVITE_LABELS,
  GRAVITE_COULEURS,
  PROBA_LABELS,
  CATEGORIE_DANGER_LABELS,
  STATUT_ETUDE_LABELS,
  STATUT_ETUDE_COULEURS,
} from '../database/haccp';

export default function HaccpEtudeDetailScreen({ route, navigation }) {
  const { etudeId } = route.params || {};
  const [etude, setEtude] = useState(null);
  const [dangers, setDangers] = useState([]);
  const [ccps, setCcps] = useState([]);
  const [limitesByCcp, setLimitesByCcp] = useState({});
  const [modeOpExpanded, setModeOpExpanded] = useState({});

  const loadData = useCallback(() => {
    if (!etudeId) return;
    try {
      setEtude(getEtudeById(etudeId));
      const dgs = getDangersByEtude(etudeId);
      setDangers(dgs || []);
      const ccpsData = getCcpsByEtude(etudeId);
      setCcps(ccpsData || []);
      const limitesMap = {};
      (ccpsData || []).forEach((ccp) => {
        limitesMap[ccp.id] = getLimitesByCcp(ccp.id) || [];
      });
      setLimitesByCcp(limitesMap);
    } catch (err) {
      console.error('[HaccpEtudeDetail] Erreur chargement:', err);
    }
  }, [etudeId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const toggleModeOp = (ccpId) => {
    setModeOpExpanded((prev) => ({ ...prev, [ccpId]: !prev[ccpId] }));
  };

  if (!etude) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loading}>Chargement…</Text>
      </View>
    );
  }

  const dangersParCategorie = dangers.reduce((acc, d) => {
    if (!acc[d.categorie]) acc[d.categorie] = [];
    acc[d.categorie].push(d);
    return acc;
  }, {});

  const ordreCategories = ['biologique', 'chimique', 'physique', 'allergenique'];
  const couleurStatut = STATUT_ETUDE_COULEURS[etude.statut] || '#7ec87e';
  const labelStatut = STATUT_ETUDE_LABELS[etude.statut] || etude.statut;
  const nbSignificatifs = dangers.filter((d) => d.significatif === 1).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* En-tête */}
      <View style={[styles.headerCard, { borderLeftColor: couleurStatut }]}>
        <View style={styles.headerTopRow}>
          <Text style={styles.produitNom}>🧪 {etude.produit_nom}</Text>
          <View style={[styles.statutBadge, { backgroundColor: couleurStatut }]}>
            <Text style={styles.statutText}>{labelStatut}</Text>
          </View>
        </View>
        <Text style={styles.etudeNom}>{etude.nom_etude}</Text>
        <Text style={styles.versionInfo}>
          Version {etude.version}
          {etude.date_validation && ` · validée ${etude.date_validation}`}
        </Text>
      </View>

      {/* Récap chiffré */}
      <View style={styles.recapBanner}>
        <View style={styles.recapCol}>
          <Text style={styles.recapNumber}>{dangers.length}</Text>
          <Text style={styles.recapLabel}>Dangers</Text>
        </View>
        <View style={styles.recapSeparator} />
        <View style={styles.recapCol}>
          <Text style={[styles.recapNumber, { color: '#e87e3a' }]}>{nbSignificatifs}</Text>
          <Text style={styles.recapLabel}>Significatifs</Text>
        </View>
        <View style={styles.recapSeparator} />
        <View style={styles.recapCol}>
          <Text style={[styles.recapNumber, { color: '#7ec87e' }]}>{ccps.length}</Text>
          <Text style={styles.recapLabel}>CCP</Text>
        </View>
      </View>

      {/* Description produit */}
      <Text style={styles.sectionTitle}>📋 Description produit</Text>
      <View style={styles.descCard}>
        {etude.description_produit && <DescRow label="Produit" value={etude.description_produit} />}
        {etude.destination_produit && <DescRow label="Destination" value={etude.destination_produit} />}
        {etude.population_cible && <DescRow label="Population cible" value={etude.population_cible} />}
        {etude.mode_consommation && <DescRow label="Mode de consommation" value={etude.mode_consommation} />}
        {etude.duree_conservation && <DescRow label="Durée de conservation" value={etude.duree_conservation} />}
        {etude.conditions_stockage && <DescRow label="Conditions de stockage" value={etude.conditions_stockage} />}
      </View>

      {/* Dangers */}
      <Text style={styles.sectionTitle}>🚨 Dangers identifiés</Text>
      {dangers.length === 0 ? (
        <View style={styles.emptyBlock}><Text style={styles.emptyText}>Aucun danger identifié.</Text></View>
      ) : (
        ordreCategories.map((cat) => {
          const dgs = dangersParCategorie[cat];
          if (!dgs || dgs.length === 0) return null;
          return (
            <View key={cat} style={styles.categorieBloc}>
              <Text style={styles.categorieTitre}>
                {CATEGORIE_DANGER_LABELS[cat] || cat} ({dgs.length})
              </Text>
              {dgs.map((d) => (
                <View key={d.id} style={[styles.dangerCard, d.significatif === 1 && styles.dangerCardSignif]}>
                  <View style={styles.dangerHeaderRow}>
                    <Text style={styles.dangerNom}>{d.nom_danger}</Text>
                    {d.significatif === 1 && (
                      <View style={styles.signifBadge}>
                        <Text style={styles.signifBadgeText}>SIGNIFICATIF</Text>
                      </View>
                    )}
                  </View>
                  {d.description && <Text style={styles.dangerDesc}>{d.description}</Text>}
                  <View style={styles.dangerBadgesRow}>
                    <View style={[styles.miniBadge, { backgroundColor: GRAVITE_COULEURS[d.gravite] || '#666' }]}>
                      <Text style={styles.miniBadgeText}>Gravité : {GRAVITE_LABELS[d.gravite] || d.gravite}</Text>
                    </View>
                    <View style={styles.miniBadgeNeutre}>
                      <Text style={styles.miniBadgeTextNeutre}>Proba : {PROBA_LABELS[d.probabilite] || d.probabilite}</Text>
                    </View>
                  </View>
                  {d.source && (
                    <Text style={styles.dangerSource}>
                      <Text style={styles.dangerLabel}>Source : </Text>{d.source}
                    </Text>
                  )}
                  {d.mesures_maitrise && (
                    <View style={styles.mesuresBox}>
                      <Text style={styles.mesuresLabel}>Mesures de maîtrise</Text>
                      <Text style={styles.mesuresText}>{d.mesures_maitrise}</Text>
                    </View>
                  )}
                  {d.reference_reglementaire && (
                    <Text style={styles.refRegle}>📜 {d.reference_reglementaire}</Text>
                  )}
                </View>
              ))}
            </View>
          );
        })
      )}

      {/* CCP */}
      <Text style={styles.sectionTitle}>🎯 CCP — Critical Control Points</Text>
      {ccps.length === 0 ? (
        <View style={styles.emptyBlock}><Text style={styles.emptyText}>Aucun CCP identifié.</Text></View>
      ) : (
        ccps.map((ccp) => {
          const limites = limitesByCcp[ccp.id] || [];
          const hasModeOp = ccp.procedure_mesure || ccp.plan_echantillonnage || ccp.calibration_equipement || ccp.formation_requise || ccp.document_enregistrement;
          const expanded = modeOpExpanded[ccp.id];

          return (
            <View key={ccp.id} style={styles.ccpCard}>
              <View style={styles.ccpHeaderRow}>
                <View style={styles.ccpNumeroBadge}>
                  <Text style={styles.ccpNumeroText}>{ccp.numero}</Text>
                </View>
                <Text style={styles.ccpNom}>{ccp.nom_ccp}</Text>
              </View>

              <Text style={styles.ccpEtape}>
                <Text style={styles.ccpLabel}>Étape : </Text>{ccp.etape_processus}
              </Text>
              {ccp.danger_nom && (
                <Text style={styles.ccpEtape}>
                  <Text style={styles.ccpLabel}>Danger maîtrisé : </Text>{ccp.danger_nom}
                </Text>
              )}
              {ccp.justification_ccp && (
                <View style={styles.justifBox}>
                  <Text style={styles.justifLabel}>Justification CCP</Text>
                  <Text style={styles.justifText}>{ccp.justification_ccp}</Text>
                </View>
              )}

              <View style={styles.ccpInfoRow}>
                {ccp.frequence_surveillance && (
                  <View style={styles.ccpInfoBlock}>
                    <Text style={styles.ccpInfoLabel}>Surveillance</Text>
                    <Text style={styles.ccpInfoValue}>
                      {FREQUENCE_LABELS[ccp.frequence_surveillance] || ccp.frequence_surveillance}
                    </Text>
                  </View>
                )}
                {ccp.responsable && (
                  <View style={styles.ccpInfoBlock}>
                    <Text style={styles.ccpInfoLabel}>Responsable</Text>
                    <Text style={styles.ccpInfoValue}>{ccp.responsable}</Text>
                  </View>
                )}
              </View>

              {/* Limites critiques */}
              {limites.length > 0 && (
                <View style={styles.limitesBloc}>
                  <Text style={styles.limitesTitle}>📏 Limites critiques</Text>
                  {limites.map((lim) => (
                    <View key={lim.id} style={styles.limiteRow}>
                      <Text style={styles.limiteParam}>{lim.parametre}</Text>
                      <View style={styles.limiteValeursRow}>
                        {lim.valeur_min !== null && lim.valeur_min !== undefined && (
                          <Text style={styles.limiteValeur}>
                            min: {lim.valeur_min}{lim.unite ? ` ${lim.unite}` : ''}
                          </Text>
                        )}
                        {lim.valeur_max !== null && lim.valeur_max !== undefined && (
                          <Text style={styles.limiteValeur}>
                            max: {lim.valeur_max}{lim.unite ? ` ${lim.unite}` : ''}
                          </Text>
                        )}
                        {lim.tolerance !== null && lim.tolerance !== undefined && (
                          <Text style={styles.limiteTolerance}>
                            ± {lim.tolerance}{lim.unite ? ` ${lim.unite}` : ''}
                          </Text>
                        )}
                      </View>
                      {lim.methode_mesure && (
                        <Text style={styles.limiteMethode}>
                          🔬 {lim.methode_mesure}{lim.equipement && ` · ${lim.equipement}`}
                        </Text>
                      )}
                      {lim.reference_reglementaire && (
                        <Text style={styles.limiteRef}>📜 {lim.reference_reglementaire}</Text>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* 🆕 10a-bis2 — Mode opératoire (accordéon) */}
              {hasModeOp && (
                <View style={styles.modeOpBloc}>
                  <TouchableOpacity
                    style={styles.modeOpToggle}
                    onPress={() => toggleModeOp(ccp.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modeOpToggleText}>
                      📋 Mode opératoire détaillé (responsable qualité)
                    </Text>
                    <Text style={styles.modeOpChevron}>
                      {expanded ? '▼' : '▶'}
                    </Text>
                  </TouchableOpacity>

                  {expanded && (
                    <View style={styles.modeOpContent}>
                      {ccp.procedure_mesure && (
                        <ModeOpSection
                          icon="🔬"
                          titre="Procédure de mesure pas à pas"
                          contenu={ccp.procedure_mesure}
                        />
                      )}
                      {ccp.plan_echantillonnage && (
                        <ModeOpSection
                          icon="📦"
                          titre="Plan d'échantillonnage"
                          contenu={ccp.plan_echantillonnage}
                        />
                      )}
                      {ccp.calibration_equipement && (
                        <ModeOpSection
                          icon="⚙️"
                          titre="Calibration équipement"
                          contenu={ccp.calibration_equipement}
                        />
                      )}
                      {ccp.formation_requise && (
                        <ModeOpSection
                          icon="🎓"
                          titre="Formation requise opérateur"
                          contenu={ccp.formation_requise}
                        />
                      )}
                      {ccp.document_enregistrement && (
                        <ModeOpSection
                          icon="📄"
                          titre="Document d'enregistrement"
                          contenu={ccp.document_enregistrement}
                        />
                      )}
                    </View>
                  )}
                </View>
              )}

              {/* 🆕 10b1 — Bouton faire un relevé */}
<TouchableOpacity
  style={{
    backgroundColor: '#7ec87e',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  }}
  onPress={() => navigation.navigate('ReleveCcpForm', { ccpId: ccp.id })}
>
  <Text style={{ color: '#1a2e1a', fontSize: 14, fontWeight: '700' }}>
    📏 Faire un relevé sur ce CCP
  </Text>
</TouchableOpacity>
{/* 🆕 10b1-bis — Bouton historique relevés */}
<TouchableOpacity
  style={{
    backgroundColor: '#243d24',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3a5a3a',
  }}
  onPress={() => navigation.navigate('RelevesCcpHistory', { ccpId: ccp.id })}
>
  <Text style={{ color: '#a8c8a8', fontSize: 13, fontWeight: '600' }}>
    📜 Voir l'historique des relevés
  </Text>
</TouchableOpacity>

              {/* Action corrective */}
              {ccp.action_corrective_default && (
                <View style={styles.actionCorrectiveBox}>
                  <Text style={styles.actionCorrectiveLabel}>⚡ Action corrective en cas de dépassement</Text>
                  <Text style={styles.actionCorrectiveText}>{ccp.action_corrective_default}</Text>
                </View>
              )}
            </View>
          );
        })
      )}

      {/* Note version */}
      <View style={styles.versionNote}>
        <Text style={styles.versionNoteText}>
          ℹ️ Vue lecture (Session 10a-bis2 — modes opératoires détaillés). L'édition,
          la saisie des relevés CCP quotidiens et les actions correctives concrètes
          arrivent en Session 10b.
        </Text>
      </View>

      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

// ============================================================
// COMPOSANTS
// ============================================================

const FREQUENCE_LABELS = {
  continu: 'Continu',
  horaire: 'Toutes les heures',
  quotidien: 'Quotidien',
  chaque_lot: 'Chaque lot',
  hebdomadaire: 'Hebdomadaire',
};

function DescRow({ label, value }) {
  return (
    <View style={styles.descRow}>
      <Text style={styles.descLabel}>{label}</Text>
      <Text style={styles.descValue}>{value}</Text>
    </View>
  );
}

function ModeOpSection({ icon, titre, contenu }) {
  return (
    <View style={styles.modeOpSection}>
      <Text style={styles.modeOpSectionTitre}>{icon} {titre}</Text>
      <Text style={styles.modeOpSectionContenu}>{contenu}</Text>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a2e1a' },
  content: { padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a2e1a' },
  loading: { color: '#7ec87e', fontSize: 16 },

  headerCard: {
    backgroundColor: '#243d24', borderRadius: 12, padding: 14,
    marginBottom: 12, borderLeftWidth: 5,
  },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  produitNom: { fontSize: 22, fontWeight: 'bold', color: '#fff', flex: 1 },
  statutBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statutText: { fontSize: 10, color: '#1a2e1a', fontWeight: '700' },
  etudeNom: { fontSize: 13, color: '#a8c8a8', fontStyle: 'italic', marginBottom: 4 },
  versionInfo: { fontSize: 11, color: '#7a9a7a' },

  recapBanner: {
    flexDirection: 'row', backgroundColor: '#243d24', borderRadius: 10,
    padding: 12, marginBottom: 16, alignItems: 'center',
  },
  recapCol: { flex: 1, alignItems: 'center' },
  recapNumber: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  recapLabel: { fontSize: 10, color: '#a8c8a8', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.4 },
  recapSeparator: { width: 1, height: 32, backgroundColor: '#3a5a3a' },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#7ec87e', marginTop: 16, marginBottom: 10 },

  descCard: { backgroundColor: '#243d24', borderRadius: 10, padding: 12, marginBottom: 8 },
  descRow: { marginBottom: 8 },
  descLabel: { fontSize: 11, color: '#7ec87e', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  descValue: { fontSize: 13, color: '#fff', lineHeight: 18 },

  categorieBloc: { marginBottom: 12 },
  categorieTitre: { fontSize: 13, fontWeight: '600', color: '#d4a04a', marginBottom: 6, paddingLeft: 4 },

  dangerCard: {
    backgroundColor: '#243d24', borderRadius: 8, padding: 11,
    marginBottom: 6, borderLeftWidth: 3, borderLeftColor: '#5a7a5a',
  },
  dangerCardSignif: { borderLeftColor: '#e87e3a' },
  dangerHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  dangerNom: { fontSize: 14, fontWeight: 'bold', color: '#fff', flex: 1, paddingRight: 6 },
  signifBadge: { backgroundColor: '#e87e3a', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  signifBadgeText: { fontSize: 9, color: '#1a2e1a', fontWeight: '700', letterSpacing: 0.4 },
  dangerDesc: { fontSize: 12, color: '#c8d8c8', lineHeight: 16, marginBottom: 6 },
  dangerBadgesRow: { flexDirection: 'row', gap: 6, marginVertical: 4, flexWrap: 'wrap' },
  miniBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  miniBadgeText: { fontSize: 10, color: '#1a2e1a', fontWeight: '600' },
  miniBadgeNeutre: { backgroundColor: '#3a5a3a', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  miniBadgeTextNeutre: { fontSize: 10, color: '#a8c8a8', fontWeight: '600' },
  dangerSource: { fontSize: 11, color: '#a8c8a8', marginTop: 4, fontStyle: 'italic' },
  dangerLabel: { color: '#7ec87e', fontWeight: '600', fontStyle: 'normal' },
  mesuresBox: { backgroundColor: '#1a2e1a', borderRadius: 6, padding: 8, marginTop: 6 },
  mesuresLabel: { fontSize: 10, color: '#7ec87e', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  mesuresText: { fontSize: 12, color: '#fff', lineHeight: 16 },
  refRegle: { fontSize: 10, color: '#d4a04a', marginTop: 6, fontStyle: 'italic' },

  ccpCard: {
    backgroundColor: '#243d24', borderRadius: 10, padding: 12,
    marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#7ec87e',
  },
  ccpHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  ccpNumeroBadge: { backgroundColor: '#7ec87e', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginRight: 10 },
  ccpNumeroText: { color: '#1a2e1a', fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  ccpNom: { fontSize: 15, fontWeight: 'bold', color: '#fff', flex: 1 },
  ccpEtape: { fontSize: 12, color: '#c8d8c8', marginBottom: 4, lineHeight: 16 },
  ccpLabel: { color: '#7ec87e', fontWeight: '600' },
  justifBox: { backgroundColor: '#1a2e1a', borderRadius: 6, padding: 8, marginTop: 6, marginBottom: 6 },
  justifLabel: { fontSize: 10, color: '#7ec87e', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  justifText: { fontSize: 12, color: '#fff', lineHeight: 16, fontStyle: 'italic' },
  ccpInfoRow: { flexDirection: 'row', gap: 10, marginTop: 6, flexWrap: 'wrap' },
  ccpInfoBlock: { backgroundColor: '#1a2e1a', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, flex: 1, minWidth: 120 },
  ccpInfoLabel: { fontSize: 9, color: '#a8c8a8', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 },
  ccpInfoValue: { fontSize: 12, color: '#fff', fontWeight: '600' },

  limitesBloc: { marginTop: 10, backgroundColor: '#1a2e1a', borderRadius: 8, padding: 10 },
  limitesTitle: { fontSize: 12, color: '#7ec87e', fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
  limiteRow: { backgroundColor: '#243d24', borderRadius: 6, padding: 8, marginBottom: 6 },
  limiteParam: { fontSize: 13, color: '#fff', fontWeight: '700', marginBottom: 4 },
  limiteValeursRow: { flexDirection: 'row', gap: 10, marginBottom: 4, flexWrap: 'wrap' },
  limiteValeur: { fontSize: 12, color: '#7ec87e', fontWeight: '600' },
  limiteTolerance: { fontSize: 11, color: '#a8c8a8', fontStyle: 'italic' },
  limiteMethode: { fontSize: 11, color: '#c8d8c8', marginTop: 2 },
  limiteRef: { fontSize: 10, color: '#d4a04a', marginTop: 4, fontStyle: 'italic' },

  // 🆕 10a-bis2 — Mode opératoire
  modeOpBloc: {
    marginTop: 10,
    backgroundColor: '#1a2e1a',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#3a5a3a',
  },
  modeOpToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#243d24',
  },
  modeOpToggleText: {
    fontSize: 12,
    color: '#d4a04a',
    fontWeight: '700',
    flex: 1,
  },
  modeOpChevron: {
    fontSize: 11,
    color: '#d4a04a',
    marginLeft: 8,
  },
  modeOpContent: {
    padding: 10,
  },
  modeOpSection: {
    backgroundColor: '#243d24',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#d4a04a',
  },
  modeOpSectionTitre: {
    fontSize: 12,
    color: '#d4a04a',
    fontWeight: '700',
    marginBottom: 6,
  },
  modeOpSectionContenu: {
    fontSize: 12,
    color: '#fff',
    lineHeight: 18,
  },

  actionCorrectiveBox: {
    marginTop: 10, backgroundColor: '#3d2424', borderRadius: 6, padding: 10,
    borderLeftWidth: 3, borderLeftColor: '#e87e3a',
  },
  actionCorrectiveLabel: { fontSize: 11, color: '#ffb87e', fontWeight: '700', marginBottom: 4 },
  actionCorrectiveText: { fontSize: 12, color: '#fff', lineHeight: 16 },

  emptyBlock: { backgroundColor: '#243d24', borderRadius: 8, padding: 16, alignItems: 'center', marginBottom: 8 },
  emptyText: { color: '#8aa88a', fontStyle: 'italic', fontSize: 13 },

  versionNote: { backgroundColor: '#1f2f1f', borderRadius: 8, padding: 12, marginTop: 16, borderLeftWidth: 3, borderLeftColor: '#d4a04a' },
  versionNoteText: { fontSize: 11, color: '#a8c8a8', lineHeight: 16, fontStyle: 'italic' },
});