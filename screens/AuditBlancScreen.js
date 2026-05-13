// screens/AuditBlancScreen.js
// Écran d'audit blanc — checklist exigences par engagement
// Phase 3 Session 8
//
// Usage :
//   navigation.navigate('AuditBlanc', { engagementId: 5 })
//
// Affiche :
//   - En-tête avec score (X conformes / Y total) + barre de progression
//   - Bouton "🔄 Évaluer auto" qui lance le moteur
//   - Bandeau alertes actives
//   - Liste des exigences groupées par catégorie
//   - Modal détail exigence avec actions

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  getStatutsByEngagement,
  setStatutExigence,
  getScoreEngagement,
  getAlertesActivesByEngagement,
  acquitterAlerte,
  resoudreAlerte,
  countPreuvesByExigence,
  getCategorieLabel,
  getCriticiteLabel,
  getCriticiteColor,
  getStatutExigenceLabel,
  getStatutExigenceColor,
  getStatutExigenceIcone,
  getSevereiteAlerteColor,
  getSevereiteAlerteIcone,
  STATUTS_EXIGENCE,
} from '../database/certifTrack';
import { evaluerEngagement, getRegleAutoLabel } from '../database/conformiteEngine';
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('certifpilot.db');

const getEngagementInfos = (engagementId) => {
  return db.getFirstSync(
    `SELECT e.*, r.nom_court as ref_nom_court, r.nom_complet as ref_nom_complet,
            r.code as ref_code
     FROM engagements_certif e
     JOIN referentiels r ON e.referentiel_id = r.id
     WHERE e.id = ?`,
    [engagementId]
  );
};

export default function AuditBlancScreen({ route, navigation }) {
  const { engagementId, filtreNiveau = null, titreContexte = null } = route.params;

  const [engagement, setEngagement] = useState(null);
  const [exigences, setExigences] = useState([]);
  const [score, setScore] = useState(null);
  const [alertes, setAlertes] = useState([]);
  const [evaluating, setEvaluating] = useState(false);

  // Modal détail exigence
  const [exigenceSelectionnee, setExigenceSelectionnee] = useState(null);
  const [showExigenceModal, setShowExigenceModal] = useState(false);

  // Sections repliables
  const [sectionsRepliees, setSectionsRepliees] = useState({});

  const loadData = () => {
    try {
      const eng = getEngagementInfos(engagementId);
      setEngagement(eng);

      const exigencesData = getStatutsByEngagement(engagementId, filtreNiveau);

      // Pour chaque exigence, charger le nombre de preuves
      const exigencesAvecPreuves = exigencesData.map((ex) => ({
        ...ex,
        nb_preuves: countPreuvesByExigence(engagementId, ex.exigence_id),
      }));
      setExigences(exigencesAvecPreuves);

      setScore(getScoreEngagement(engagementId));
      setAlertes(getAlertesActivesByEngagement(engagementId));
    } catch (error) {
      console.error('Erreur chargement audit blanc:', error);
      Alert.alert('Erreur', 'Impossible de charger les données');
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [engagementId])
  );

  const handleEvaluerAuto = () => {
    setEvaluating(true);
    setTimeout(() => {
      try {
        const resultats = evaluerEngagement(engagementId);
        if (resultats) {
          loadData();
          Alert.alert(
            '🔍 Évaluation terminée',
            `${resultats.nb_evaluees} exigence(s) auto-évaluée(s)\n` +
            `✓ ${resultats.nb_conformes} conforme(s)\n` +
            `✗ ${resultats.nb_non_conformes} non conforme(s)\n` +
            `🚨 ${resultats.nb_alertes_creees} alerte(s) générée(s)`
          );
        }
      } catch (error) {
        console.error('Erreur évaluation:', error);
        Alert.alert('Erreur', 'L\'évaluation automatique a échoué');
      } finally {
        setEvaluating(false);
      }
    }, 100);
  };

  const handleSetStatut = (exigenceId, statut) => {
    try {
      setStatutExigence(engagementId, exigenceId, statut, {
        verifie_par: 'manuel',
        auto_genere: 0,
      });
      loadData();
      setShowExigenceModal(false);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de mettre à jour le statut');
    }
  };

  const handleAcquitterAlerte = (alerteId) => {
    Alert.alert(
      'Acquitter cette alerte ?',
      'L\'alerte sera marquée comme prise en compte. Elle reste visible dans l\'historique mais disparaît des alertes actives.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Acquitter',
          onPress: () => {
            acquitterAlerte(alerteId, 'manuel');
            loadData();
          },
        },
      ]
    );
  };

  const toggleSection = (categorie) => {
    setSectionsRepliees({
      ...sectionsRepliees,
      [categorie]: !sectionsRepliees[categorie],
    });
  };

  // Grouper les exigences par catégorie
  const exigencesParCategorie = exigences.reduce((acc, ex) => {
    if (!acc[ex.categorie]) acc[ex.categorie] = [];
    acc[ex.categorie].push(ex);
    return acc;
  }, {});

  if (!engagement || !score) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#7ec87e" />
      </View>
    );
  }

  // Calcul progression
  const totalEvaluees = score.nb_conformes + score.nb_non_conformes + score.nb_na;
  const pctEvaluees = score.total_exigences > 0
    ? (totalEvaluees / score.total_exigences) * 100
    : 0;
  const pctConformes = score.total_exigences > 0
    ? (score.nb_conformes / score.total_exigences) * 100
    : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* En-tête */}
      <View style={styles.headerCard}>
        {titreContexte && (
  <Text style={{ fontSize: 12, color: '#d4a04a', fontWeight: '600', marginTop: 2 }}>
    {titreContexte}
  </Text>
)}
        <Text style={styles.headerRef}>{engagement.ref_nom_court}</Text>
        <Text style={styles.headerCible}>
          {engagement.cible_type === 'lot' && '📦 '}
          {engagement.cible_type === 'site' && '🗺️ '}
          {engagement.cible_type === 'culture' && '🌱 '}
          {engagement.cible_type} #{engagement.cible_id}
        </Text>
      </View>

      {/* Score */}
      <View style={styles.scoreCard}>
        <View style={styles.scoreLine}>
          <Text style={styles.scoreNumber}>{score.nb_conformes}</Text>
          <Text style={styles.scoreSeparator}>/</Text>
          <Text style={styles.scoreTotal}>{score.total_exigences}</Text>
          <Text style={styles.scoreLabel}>exigences conformes</Text>
        </View>

        {/* Barre de progression double : conformes (vert) + évaluées (gris) */}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarBg]}>
            <View
              style={[
                styles.progressBarEvaluees,
                { width: `${pctEvaluees}%` },
              ]}
            />
            <View
              style={[
                styles.progressBarConformes,
                { width: `${pctConformes}%` },
              ]}
            />
          </View>
        </View>

        <View style={styles.scoreStatsRow}>
          <View style={styles.scoreStat}>
            <Text style={[styles.scoreStatNum, { color: '#7ec87e' }]}>
              {score.nb_conformes}
            </Text>
            <Text style={styles.scoreStatLabel}>Conformes</Text>
          </View>
          <View style={styles.scoreStat}>
            <Text style={[styles.scoreStatNum, { color: '#cc4444' }]}>
              {score.nb_non_conformes}
            </Text>
            <Text style={styles.scoreStatLabel}>Non conformes</Text>
          </View>
          <View style={styles.scoreStat}>
            <Text style={[styles.scoreStatNum, { color: '#8a9a8a' }]}>
              {score.nb_a_verifier}
            </Text>
            <Text style={styles.scoreStatLabel}>À vérifier</Text>
          </View>
          <View style={styles.scoreStat}>
            <Text style={[styles.scoreStatNum, { color: '#666' }]}>
              {score.nb_na}
            </Text>
            <Text style={styles.scoreStatLabel}>Non applic.</Text>
          </View>
        </View>

        {/* Non-conformités majeures */}
        {score.nb_nc_majeures > 0 && (
          <View style={styles.scoreAlerteMajeure}>
            <Text style={styles.scoreAlerteMajeureText}>
              🚨 {score.nb_nc_majeures} non-conformité{score.nb_nc_majeures > 1 ? 's' : ''} majeure{score.nb_nc_majeures > 1 ? 's' : ''} — bloquante{score.nb_nc_majeures > 1 ? 's' : ''} pour la certification
            </Text>
          </View>
        )}
      </View>

      {/* Bouton évaluation auto */}
      <TouchableOpacity
        style={styles.btnEvaluer}
        onPress={handleEvaluerAuto}
        disabled={evaluating}
      >
        {evaluating ? (
          <ActivityIndicator color="#1a2e1a" />
        ) : (
          <Text style={styles.btnEvaluerText}>
            🔄 Lancer l'évaluation automatique
          </Text>
        )}
      </TouchableOpacity>
      <Text style={styles.btnEvaluerHint}>
        Le moteur scanne les données ExportTrack et vérifie automatiquement les exigences éligibles
      </Text>

      {/* Bandeau alertes actives */}
      {alertes.length > 0 && (
        <View style={styles.alertesContainer}>
          <Text style={styles.sectionTitle}>
            🚨 Alertes actives ({alertes.length})
          </Text>
          {alertes.map((a) => (
            <View
              key={a.id}
              style={[
                styles.alerteCard,
                { borderLeftColor: getSevereiteAlerteColor(a.severite) },
              ]}
            >
              <View style={styles.alerteHeader}>
                <Text style={styles.alerteIcone}>
                  {getSevereiteAlerteIcone(a.severite)}
                </Text>
                <Text style={styles.alerteTitre}>{a.titre}</Text>
              </View>
              <Text style={styles.alerteMessage}>{a.message}</Text>
              <View style={styles.alerteFooter}>
                <Text style={styles.alerteRegle}>
                  {getRegleAutoLabel(a.regle_code)}
                </Text>
                <TouchableOpacity onPress={() => handleAcquitterAlerte(a.id)}>
                  <Text style={styles.alerteAcquitter}>Acquitter</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Liste exigences par catégorie */}
      <Text style={styles.sectionTitle}>📋 Exigences ({exigences.length})</Text>

      {exigences.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>
            Aucune exigence définie pour ce référentiel.
          </Text>
          <Text style={styles.emptyHint}>
            Le seed des exigences arrivera dans les prochaines sessions (8a-8d).
          </Text>
        </View>
      ) : (
        Object.keys(exigencesParCategorie).map((categorie) => {
          const exigencesCat = exigencesParCategorie[categorie];
          const repliee = sectionsRepliees[categorie];
          const nbConformes = exigencesCat.filter((e) => e.statut === 'conforme').length;

          return (
            <View key={categorie} style={styles.categorieGroup}>
              <TouchableOpacity
                style={styles.categorieHeader}
                onPress={() => toggleSection(categorie)}
              >
                <Text style={styles.categorieTitle}>
                  {getCategorieLabel(categorie)}
                </Text>
                <View style={styles.categorieStats}>
                  <Text style={styles.categorieStatsText}>
                    {nbConformes} / {exigencesCat.length}
                  </Text>
                  <Text style={styles.categorieChevron}>
                    {repliee ? '▸' : '▾'}
                  </Text>
                </View>
              </TouchableOpacity>

              {!repliee && exigencesCat.map((ex) => (
                <TouchableOpacity
                  key={ex.exigence_id}
                  style={styles.exigenceCard}
                  onPress={() => {
                    setExigenceSelectionnee(ex);
                    setShowExigenceModal(true);
                  }}
                >
                  <View
                    style={[
                      styles.statutCircle,
                      {
                        borderColor: getStatutExigenceColor(ex.statut || 'a_verifier'),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statutCircleText,
                        { color: getStatutExigenceColor(ex.statut || 'a_verifier') },
                      ]}
                    >
                      {getStatutExigenceIcone(ex.statut || 'a_verifier')}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.exigenceHeader}>
                      <Text style={styles.exigenceCode}>{ex.code_exigence}</Text>
                      <View
                        style={[
                          styles.criticiteBadge,
                          { backgroundColor: getCriticiteColor(ex.criticite) + '33', borderColor: getCriticiteColor(ex.criticite) },
                        ]}
                      >
                        <Text
                          style={[
                            styles.criticiteText,
                            { color: getCriticiteColor(ex.criticite) },
                          ]}
                        >
                          {getCriticiteLabel(ex.criticite)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.exigenceTitre} numberOfLines={2}>
                      {ex.titre}
                    </Text>
                    <View style={styles.exigenceFooter}>
                      {ex.auto_verifiable === 1 && (
                        <Text style={styles.exigenceAuto}>🤖 Auto</Text>
                      )}
                      <Text style={styles.exigencePreuves}>
                        📎 {ex.nb_preuves} preuve{ex.nb_preuves > 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          );
        })
      )}

      <View style={{ height: 40 }} />

      {/* Modal détail exigence */}
      <Modal
        visible={showExigenceModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowExigenceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              {exigenceSelectionnee && (
                <>
                  <View style={styles.modalHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalCode}>
                        {exigenceSelectionnee.code_exigence}
                      </Text>
                      <Text style={styles.modalTitle}>
                        {exigenceSelectionnee.titre}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setShowExigenceModal(false)}>
                      <Text style={styles.modalClose}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.modalBadgesRow}>
                    <View
                      style={[
                        styles.criticiteBadge,
                        {
                          backgroundColor: getCriticiteColor(exigenceSelectionnee.criticite) + '33',
                          borderColor: getCriticiteColor(exigenceSelectionnee.criticite),
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.criticiteText,
                          { color: getCriticiteColor(exigenceSelectionnee.criticite) },
                        ]}
                      >
                        {getCriticiteLabel(exigenceSelectionnee.criticite)}
                      </Text>
                    </View>
                    <Text style={styles.modalCategorieBadge}>
                      {getCategorieLabel(exigenceSelectionnee.categorie)}
                    </Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>📋 Description</Text>
                    <Text style={styles.modalText}>
                      {exigenceSelectionnee.description}
                    </Text>
                  </View>

                  {exigenceSelectionnee.preuve_attendue && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>🎯 Preuve attendue</Text>
                      <Text style={styles.modalText}>
                        {exigenceSelectionnee.preuve_attendue}
                      </Text>
                    </View>
                  )}

                  {exigenceSelectionnee.reference_officielle && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>📚 Référence officielle</Text>
                      <Text style={styles.modalReference}>
                        {exigenceSelectionnee.reference_officielle}
                      </Text>
                    </View>
                  )}

                  {exigenceSelectionnee.auto_verifiable === 1 && (
                    <View style={styles.modalAutoBox}>
                      <Text style={styles.modalAutoText}>
                        🤖 Cette exigence est auto-vérifiable par le moteur de conformité (règle : {getRegleAutoLabel(exigenceSelectionnee.regle_auto_code)}).
                      </Text>
                    </View>
                  )}

                  {/* Actions statut */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>
                      ✏️ Définir le statut
                    </Text>
                    <View style={styles.statutGrid}>
                      {STATUTS_EXIGENCE.map((s) => (
                        <TouchableOpacity
                          key={s}
                          style={[
                            styles.statutChip,
                            exigenceSelectionnee.statut === s && {
                              backgroundColor: getStatutExigenceColor(s),
                              borderColor: getStatutExigenceColor(s),
                            },
                          ]}
                          onPress={() => handleSetStatut(exigenceSelectionnee.exigence_id, s)}
                        >
                          <Text
                            style={[
                              styles.statutChipText,
                              exigenceSelectionnee.statut === s && styles.statutChipTextActive,
                            ]}
                          >
                            {getStatutExigenceIcone(s)} {getStatutExigenceLabel(s)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Bouton ajouter preuve */}
                  <TouchableOpacity
                    style={styles.btnPreuve}
                    onPress={() => {
                      setShowExigenceModal(false);
                      navigation.navigate('PreuveForm', {
                        engagementId,
                        exigenceId: exigenceSelectionnee.exigence_id,
                        exigenceTitre: exigenceSelectionnee.titre,
                        exigenceCode: exigenceSelectionnee.code_exigence,
                      });
                    }}
                  >
                    <Text style={styles.btnPreuveText}>
                      📎 Ajouter une preuve ({exigenceSelectionnee.nb_preuves} existante{exigenceSelectionnee.nb_preuves > 1 ? 's' : ''})
                    </Text>
                  </TouchableOpacity>

                  {exigenceSelectionnee.commentaire && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>💬 Dernier commentaire</Text>
                      <Text style={styles.modalText}>
                        {exigenceSelectionnee.commentaire}
                      </Text>
                      {exigenceSelectionnee.verifie_par && (
                        <Text style={styles.modalMeta}>
                          Par {exigenceSelectionnee.verifie_par}
                          {exigenceSelectionnee.date_verification && ` le ${exigenceSelectionnee.date_verification}`}
                          {exigenceSelectionnee.auto_genere === 1 && ' (auto)'}
                        </Text>
                      )}
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a2e1a' },
  content: { padding: 16 },
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#1a2e1a',
  },

  headerCard: {
    backgroundColor: '#243d24',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#7ec87e',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#7ec87e', marginBottom: 4 },
  headerRef: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 2 },
  headerCible: { fontSize: 13, color: '#a8c8a8' },

  // Score
  scoreCard: {
    backgroundColor: '#243d24',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  scoreLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  scoreNumber: { fontSize: 36, fontWeight: 'bold', color: '#7ec87e' },
  scoreSeparator: { fontSize: 24, color: '#a8c8a8', marginHorizontal: 4 },
  scoreTotal: { fontSize: 24, color: '#a8c8a8' },
  scoreLabel: { fontSize: 13, color: '#a8c8a8', marginLeft: 12, flex: 1 },

  progressBarContainer: { marginBottom: 12 },
  progressBarBg: {
    height: 8,
    backgroundColor: '#1a2e1a',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBarEvaluees: {
    position: 'absolute',
    top: 0, left: 0, bottom: 0,
    backgroundColor: '#3a5a3a',
  },
  progressBarConformes: {
    position: 'absolute',
    top: 0, left: 0, bottom: 0,
    backgroundColor: '#7ec87e',
  },

  scoreStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#3a5a3a',
  },
  scoreStat: { alignItems: 'center' },
  scoreStatNum: { fontSize: 18, fontWeight: 'bold' },
  scoreStatLabel: { fontSize: 10, color: '#a8c8a8', marginTop: 2 },

  scoreAlerteMajeure: {
    marginTop: 12,
    backgroundColor: '#3a1a1a',
    padding: 10,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#cc4444',
  },
  scoreAlerteMajeureText: {
    fontSize: 12,
    color: '#ff8888',
    fontWeight: '600',
  },

  // Bouton évaluer
  btnEvaluer: {
    backgroundColor: '#7ec87e',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 4,
  },
  btnEvaluerText: {
    fontSize: 15,
    color: '#1a2e1a',
    fontWeight: 'bold',
  },
  btnEvaluerHint: {
    fontSize: 11,
    color: '#7a9a7a',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 16,
  },

  // Sections
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#7ec87e',
    marginTop: 16,
    marginBottom: 8,
  },

  // Alertes
  alertesContainer: { marginBottom: 8 },
  alerteCard: {
    backgroundColor: '#243d24',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  alerteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  alerteIcone: { fontSize: 16 },
  alerteTitre: { flex: 1, fontSize: 14, fontWeight: '600', color: '#fff' },
  alerteMessage: { fontSize: 12, color: '#d0d8d0', lineHeight: 16 },
  alerteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  alerteRegle: { fontSize: 10, color: '#7a9a7a', fontStyle: 'italic' },
  alerteAcquitter: {
    fontSize: 12,
    color: '#7ec87e',
    fontWeight: '600',
  },

  // État vide
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#a8c8a8', textAlign: 'center' },
  emptyHint: { fontSize: 11, color: '#7a9a7a', fontStyle: 'italic', textAlign: 'center', marginTop: 8 },

  // Catégories
  categorieGroup: { marginBottom: 12 },
  categorieHeader: {
    backgroundColor: '#1f2f1f',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categorieTitle: { fontSize: 13, fontWeight: '600', color: '#a8c8a8' },
  categorieStats: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categorieStatsText: { fontSize: 12, color: '#7ec87e', fontWeight: '600' },
  categorieChevron: { fontSize: 14, color: '#7ec87e' },

  // Cards exigences
  exigenceCard: {
    backgroundColor: '#243d24',
    borderRadius: 8,
    padding: 12,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statutCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statutCircleText: { fontSize: 16, fontWeight: 'bold' },
  exigenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  exigenceCode: {
    fontSize: 10,
    color: '#7ec87e',
    fontFamily: 'monospace',
  },
  criticiteBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  criticiteText: { fontSize: 9, fontWeight: '700' },
  exigenceTitre: { fontSize: 13, color: '#fff', fontWeight: '500' },
  exigenceFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  exigenceAuto: { fontSize: 10, color: '#7eaac8' },
  exigencePreuves: { fontSize: 10, color: '#a8c8a8' },
  chevron: { fontSize: 22, color: '#7ec87e', fontWeight: '300' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a2e1a',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '90%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 12,
  },
  modalCode: {
    fontSize: 11,
    color: '#7ec87e',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    lineHeight: 24,
  },
  modalClose: {
    fontSize: 24,
    color: '#a8c8a8',
    paddingHorizontal: 8,
  },
  modalBadgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  modalCategorieBadge: {
    fontSize: 11,
    color: '#a8c8a8',
    fontStyle: 'italic',
  },
  modalSection: { marginBottom: 16 },
  modalSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7ec87e',
    marginBottom: 6,
  },
  modalText: {
    fontSize: 13,
    color: '#d0d8d0',
    lineHeight: 19,
  },
  modalReference: {
    fontSize: 12,
    color: '#a8c8a8',
    fontStyle: 'italic',
    fontFamily: 'monospace',
  },
  modalMeta: {
    fontSize: 11,
    color: '#7a9a7a',
    fontStyle: 'italic',
    marginTop: 4,
  },
  modalAutoBox: {
    backgroundColor: '#1f2c38',
    padding: 10,
    borderRadius: 6,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#7eaac8',
  },
  modalAutoText: {
    fontSize: 12,
    color: '#a8c8e8',
    lineHeight: 17,
  },

  statutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statutChip: {
    backgroundColor: '#243d24',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3a5a3a',
  },
  statutChipText: {
    fontSize: 12,
    color: '#a8c8a8',
    fontWeight: '500',
  },
  statutChipTextActive: { color: '#fff', fontWeight: '600' },

  btnPreuve: {
    backgroundColor: '#3a5a3a',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  btnPreuveText: {
    fontSize: 14,
    color: '#7ec87e',
    fontWeight: '600',
  },
});