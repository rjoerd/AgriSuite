// screens/InspectionDetailScreen.js
// Détail inspection clôturée — consultation + PDF + sanction

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as SQLite from 'expo-sqlite';
import { genererEtPartager } from '../services/pdfRapportInspection';
import { getSanctionsParInspection, getTypeSanctionLabel, getTypeSanctionColor, getTypeSanctionIcon } from '../database/sciSanctions';

const db = SQLite.openDatabaseSync('certifpilot.db');

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

const REF_LABELS = {
  BIO_UE: 'BIO UE 2018/848',
  HACCP: 'HACCP Codex',
  FAIRTRADE_FLO: 'Fairtrade FLO',
  RAINFOREST: 'Rainforest Alliance',
  LABEL_VANILLE_MDG: 'Label Vanille MDG',
};

const TYPE_LABELS = {
  initiale: 'Initiale',
  annuelle: 'Annuelle',
  inopinee: 'Inopinée',
  suivi_sanction: 'Suivi sanction',
};

const CONCLUSION_COLORS = {
  conforme: '#2e7d32',
  non_conforme_mineure: '#d4a04a',
  non_conforme_majeure: '#e67e22',
  non_conforme_critique: '#cc4444',
};

const CONCLUSION_LABELS = {
  conforme: '✓ CONFORME',
  non_conforme_mineure: '⚠ NC mineure',
  non_conforme_majeure: '⚠ NC majeure',
  non_conforme_critique: '🚨 NC critique',
};

export default function InspectionDetailScreen({ route, navigation }) {
  const inspectionRealiseeId = route.params?.inspectionRealiseeId;

  const [inspection, setInspection] = useState(null);
  const [stats, setStats] = useState(null);
  const [nonConformes, setNonConformes] = useState([]);
  const [sanctions, setSanctions] = useState([]);
  const [generating, setGenerating] = useState(false);

  const charger = useCallback(() => {
    try {
      const ir = db.getFirstSync(
        `SELECT ir.*, f.nom as fournisseur_nom, f.code as fournisseur_code
         FROM inspections_realisees ir
         JOIN fournisseurs f ON f.id = ir.fournisseur_id
         WHERE ir.id = ?`,
        [inspectionRealiseeId]
      );
      if (!ir) {
        Alert.alert('Erreur', 'Inspection introuvable');
        navigation.goBack();
        return;
      }
      setInspection(ir);

      const reponses = db.getAllSync(
        `SELECT * FROM inspections_reponses WHERE inspection_id = ?`,
        [inspectionRealiseeId]
      );
      const conf = reponses.filter((r) => r.reponse === 'conforme').length;
      const nc = reponses.filter((r) => r.reponse === 'non_conforme');
      const naCount = reponses.filter((r) => r.reponse === 'non_applicable').length;
      const aRevoir = reponses.filter((r) => r.reponse === 'a_revoir').length;

      setStats({
        total: reponses.length,
        conforme: conf,
        non_conforme: nc.length,
        non_applicable: naCount,
        a_revoir: aRevoir,
      });

      // Détail NC avec exigences
      const ncDetail = db.getAllSync(
        `SELECT ir.*, ex.code_exigence, ex.titre, ex.criticite
         FROM inspections_reponses ir
         JOIN exigences_referentiel ex ON ex.id = ir.exigence_id
         WHERE ir.inspection_id = ? AND ir.reponse = 'non_conforme'
         ORDER BY 
           CASE ir.gravite WHEN 'critique' THEN 1 WHEN 'majeure' THEN 2 ELSE 3 END`,
        [inspectionRealiseeId]
      );
      setNonConformes(ncDetail);

      // Sanctions liées à cette inspection
      setSanctions(getSanctionsParInspection(inspectionRealiseeId));
    } catch (e) {
      console.error('[InspectionDetail] Erreur:', e);
      Alert.alert('Erreur', e.message);
    }
  }, [inspectionRealiseeId, navigation]);

  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger])
  );

  const formatDate = (str) => {
    if (!str) return '—';
    const d = new Date(str);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handlePDF = async () => {
    setGenerating(true);
    try {
      await genererEtPartager(inspectionRealiseeId);
    } catch (e) {
      console.error('[InspectionDetail] PDF erreur:', e);
      Alert.alert('Erreur PDF', e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSanction = () => {
    navigation.navigate('SanctionForm', {
      fournisseurId: inspection.fournisseur_id,
      referentielCode: inspection.referentiel_code,
      inspectionId: inspectionRealiseeId,
    });
  };

  if (!inspection || !stats) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={COULEURS.vert} style={{ marginTop: 60 }} />
      </View>
    );
  }

  const conclusionColor = CONCLUSION_COLORS[inspection.conclusion] || COULEURS.gris;
  const conclusionLabel = CONCLUSION_LABELS[inspection.conclusion] || '—';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Bandeau conclusion */}
        <View style={[styles.conclusionBanner, { backgroundColor: conclusionColor }]}>
          <Text style={styles.conclusionText}>{conclusionLabel}</Text>
        </View>

        {/* Infos générales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Inspection</Text>
          <Row label="Producteur" value={`${inspection.fournisseur_code} · ${inspection.fournisseur_nom}`} />
          <Row label="Référentiel" value={REF_LABELS[inspection.referentiel_code] || inspection.referentiel_code} />
          <Row label="Type" value={TYPE_LABELS[inspection.type_inspection] || inspection.type_inspection} />
          <Row label="Date" value={formatDate(inspection.date_realisee)} />
          <Row label="Inspecteur" value={inspection.inspecteur_nom} />
          {inspection.duree_minutes && <Row label="Durée" value={`${inspection.duree_minutes} min`} />}
          <Row label="Clôturée le" value={formatDate(inspection.date_cloture)} />
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Synthèse</Text>
          <View style={styles.statsGrid}>
            <Stat n={stats.conforme} l="Conformes" c={COULEURS.vert} />
            <Stat n={stats.non_conforme} l="Non conf." c={COULEURS.rouge} />
            <Stat n={stats.non_applicable} l="N/A" c={COULEURS.gris} />
            <Stat n={stats.a_revoir} l="À revoir" c={COULEURS.amber} />
          </View>
          <Text style={styles.statsTotal}>Total : {stats.total} exigences contrôlées</Text>
        </View>

        {/* Non-conformités */}
        {nonConformes.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: COULEURS.rouge }]}>
              ⚠ Non-conformités ({nonConformes.length})
            </Text>
            {nonConformes.map((nc) => (
              <View key={nc.id} style={[styles.ncCard, getNcStyle(nc.gravite)]}>
                <View style={styles.ncHeader}>
                  <Text style={styles.ncCode}>{nc.code_exigence}</Text>
                  <View style={[styles.ncBadge, getNcBadgeStyle(nc.gravite)]}>
                    <Text style={styles.ncBadgeText}>{(nc.gravite || 'mineure').toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.ncTitre}>{nc.titre}</Text>
                {!!nc.observation && (
                  <Text style={styles.ncObs}>💬 {nc.observation}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Notes générales */}
        {!!inspection.notes_generales && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Observations finales</Text>
            <View style={styles.notesBlock}>
              <Text style={styles.notesText}>{inspection.notes_generales}</Text>
            </View>
          </View>
        )}

        {/* Sanctions liées */}
        {sanctions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🚫 Sanctions liées</Text>
            {sanctions.map((s) => (
              <TouchableOpacity 
                key={s.id} 
                style={styles.sanctionCard}
                onPress={() => navigation.navigate('SanctionForm', { sanctionId: s.id })}
              >
                <Text style={[styles.sanctionType, { color: getTypeSanctionColor(s.type_sanction) }]}>
                  {getTypeSanctionIcon(s.type_sanction)} {getTypeSanctionLabel(s.type_sanction)}
                </Text>
                <Text style={styles.sanctionMotif} numberOfLines={2}>{s.motif}</Text>
                <Text style={styles.sanctionDate}>{formatDate(s.date_sanction)} · {s.decideur}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Actions */}
        <TouchableOpacity 
          style={[styles.btnAction, generating && styles.btnDisabled]} 
          onPress={handlePDF}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator color={COULEURS.bg} />
          ) : (
            <Text style={styles.btnActionText}>📄 Générer PDF & partager</Text>
          )}
        </TouchableOpacity>

        {inspection.conclusion !== 'conforme' && sanctions.length === 0 && (
          <TouchableOpacity 
            style={[styles.btnAction, styles.btnSanction]} 
            onPress={handleSanction}
          >
            <Text style={styles.btnActionText}>🚫 Déclencher une sanction</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const Row = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

const Stat = ({ n, l, c }) => (
  <View style={styles.statBox}>
    <Text style={[styles.statN, { color: c }]}>{n}</Text>
    <Text style={styles.statL}>{l}</Text>
  </View>
);

const getNcStyle = (gravite) => {
  if (gravite === 'critique') return { borderLeftColor: '#cc4444' };
  if (gravite === 'majeure') return { borderLeftColor: '#e67e22' };
  return { borderLeftColor: '#d4a04a' };
};

const getNcBadgeStyle = (gravite) => {
  if (gravite === 'critique') return { backgroundColor: '#cc4444' };
  if (gravite === 'majeure') return { backgroundColor: '#e67e22' };
  return { backgroundColor: '#d4a04a' };
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COULEURS.bg },
  content: { padding: 16 },

  conclusionBanner: {
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  conclusionText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  section: {
    backgroundColor: COULEURS.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  sectionTitle: {
    color: COULEURS.amber,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COULEURS.cardAlt,
  },
  rowLabel: { color: COULEURS.gris, fontSize: 12, flex: 1 },
  rowValue: { color: COULEURS.blanc, fontSize: 13, flex: 2, textAlign: 'right', fontWeight: '500' },

  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COULEURS.cardAlt,
    paddingVertical: 12,
    marginHorizontal: 3,
    borderRadius: 8,
  },
  statN: { fontSize: 22, fontWeight: '800' },
  statL: { color: COULEURS.gris, fontSize: 10, marginTop: 4 },
  statsTotal: {
    color: COULEURS.gris,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
    fontStyle: 'italic',
  },

  ncCard: {
    backgroundColor: COULEURS.cardAlt,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  ncHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  ncCode: { color: COULEURS.vert, fontWeight: '700', fontSize: 12 },
  ncBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  ncBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  ncTitre: { color: COULEURS.blanc, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  ncObs: { color: COULEURS.gris, fontSize: 11, marginTop: 6, fontStyle: 'italic' },

  notesBlock: {
    backgroundColor: COULEURS.cardAlt,
    padding: 12,
    borderRadius: 8,
  },
  notesText: { color: COULEURS.blanc, fontSize: 13, lineHeight: 18 },

  sanctionCard: {
    backgroundColor: COULEURS.cardAlt,
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
  },
  sanctionType: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  sanctionMotif: { color: COULEURS.blanc, fontSize: 12, marginBottom: 4 },
  sanctionDate: { color: COULEURS.gris, fontSize: 11 },

  btnAction: {
    backgroundColor: COULEURS.vert,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  btnSanction: { backgroundColor: COULEURS.amber },
  btnDisabled: { opacity: 0.5 },
  btnActionText: { color: COULEURS.bg, fontWeight: '700', fontSize: 14 },
});