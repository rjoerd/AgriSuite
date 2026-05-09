import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  creerVerificationLot,
  getVerificationLot,
  getAxesVerification,
  updateAxeVerification,
  calculerAxe1Tracabilite,
} from '../database/exportTrack';
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('agrisuite.db');

const AXES = [
  { num: 1, titre: 'Traçabilité ascendante', icone: '🔗',
    description: 'Le lot remonte-t-il à une parcelle (filière A) ou à un fournisseur avec parcelles déclarées (filière B) ?' },
  { num: 2, titre: 'Qualité physico-chimique', icone: '🧪',
    description: 'Analyses humidité, mycotoxines, métaux lourds, résidus pesticides conformes aux seuils.' },
  { num: 3, titre: 'Mass balance', icone: '⚖️',
    description: 'Quantité achetée = quantité reconstituée + pertes documentées (écart < 5%).' },
  { num: 4, titre: 'Test de rappel', icone: '🔍',
    description: 'Recall test ascendant : depuis un sachet final, peut-on remonter à la parcelle d\'origine ?' },
  { num: 5, titre: 'Cohérence référentielle', icone: '📋',
    description: 'Tous les acteurs amont (producteurs, fournisseurs) sont-ils bien certifiés au moment des opérations ?' },
];

const STATUT_BADGES = {
  na: { label: '⏳ Non testé', color: '#888', bg: '#2a2a2a' },
  conforme: { label: '✅ Conforme', color: '#7ec87e', bg: '#1a3a1a' },
  alerte: { label: '⚠ Alerte', color: '#d4a04a', bg: '#3a2e1a' },
  non_conforme: { label: '❌ Non conforme', color: '#e57373', bg: '#3a1a1a' },
};

export default function VerifLotScreen({ route, navigation }) {
  const { lotId, lotCode } = route.params;
  const [verificationId, setVerificationId] = useState(null);
  const [verification, setVerification] = useState(null);
  const [axes, setAxes] = useState([]);
  const [axeOuvert, setAxeOuvert] = useState(null);

  useFocusEffect(
    React.useCallback(() => {
      initOuCharger();
    }, [])
  );

  const initOuCharger = () => {
    // Cherche une vérif en cours pour ce lot, sinon en crée une
    const enCours = db.getFirstSync(
      `SELECT * FROM verifications_lots WHERE lot_id = ? AND statut_global = 'en_cours'
       ORDER BY date_verification DESC LIMIT 1`,
      [lotId]
    );
    let id = enCours?.id;
    if (!id) {
      id = creerVerificationLot(lotId, 'Auditeur interne');
    }
    setVerificationId(id);
    setVerification(getVerificationLot(id));
    setAxes(getAxesVerification(id));
  };

  const lancerAxe1 = () => {
    const resultat = calculerAxe1Tracabilite(lotId);
    updateAxeVerification(verificationId, 1, resultat.statut, resultat.details, null);
    setAxes(getAxesVerification(verificationId));
    setVerification(getVerificationLot(verificationId));
    Alert.alert(
      'Axe 1 calculé',
      `Statut : ${STATUT_BADGES[resultat.statut].label}\n\n${resultat.details.problemes?.join('\n') || 'Aucun problème détecté.'}`
    );
  };

const renderDetailsAxe1 = (axe) => {
  if (!axe.details_json) return null;
  let d;
  try { d = JSON.parse(axe.details_json); } catch { return null; }
  return (
    <View style={styles.detailsBox}>
      <Text style={styles.detailLabel}>Filière : {d.filiere || '?'}</Text>
      {d.sources?.map((s, i) => (
        <View key={i} style={styles.sourceLine}>
          {d.filiere === 'B' ? (
            <View>
              <Text style={styles.detailText}>
                • {s.fournisseur} (zone {s.zone})
              </Text>
              <Text style={styles.detailSub}>
                  {s.nb_bons} bon(s) · {s.quantite_totale_kg?.toFixed(1)} kg · {s.nb_parcelles} parcelle(s) ({s.parcelles_avec_gps} avec GPS)
              </Text>
            </View>
          ) : (
            <Text style={styles.detailText}>
              • Récolte #{s.recolte_id} (planche {s.planche_id}, {s.date_recolte})
            </Text>
          )}
        </View>
      ))}
      {d.problemes?.length > 0 && (
        <View style={styles.problemesBox}>
          <Text style={styles.problemesTitre}>⚠ Problèmes détectés :</Text>
          {d.problemes.map((p, i) => (
            <Text key={i} style={styles.problemeItem}>• {p}</Text>
          ))}
        </View>
      )}
    </View>
  );
};

  if (!verification) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Chargement…</Text>
      </View>
    );
  }

  const badgeGlobal = STATUT_BADGES[verification.statut_global] || STATUT_BADGES.na;
  const nbConformes = axes.filter(a => a.statut === 'conforme').length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.titre}>🔍 Vérification du lot</Text>
        <Text style={styles.lotCode}>{lotCode || `Lot #${lotId}`}</Text>
        <View style={[styles.badgeGlobal, { backgroundColor: badgeGlobal.bg }]}>
          <Text style={[styles.badgeGlobalText, { color: badgeGlobal.color }]}>
            {badgeGlobal.label} — {nbConformes}/5 axes OK
          </Text>
        </View>
        <Text style={styles.dateVerif}>
          Démarrée le {verification.date_verification?.slice(0, 16) || '—'}
        </Text>
      </View>

      {/* 5 AXES */}
      {AXES.map(axeDef => {
        const axe = axes.find(a => a.axe === axeDef.num) || { statut: 'na' };
        const badge = STATUT_BADGES[axe.statut];
        const ouvert = axeOuvert === axeDef.num;

        return (
          <View key={axeDef.num} style={styles.axeBox}>
            <TouchableOpacity
              style={styles.axeHeader}
              onPress={() => setAxeOuvert(ouvert ? null : axeDef.num)}
            >
              <Text style={styles.axeFleche}>{ouvert ? '▼' : '▶'}</Text>
              <Text style={styles.axeIcone}>{axeDef.icone}</Text>
              <View style={styles.axeTitreBox}>
                <Text style={styles.axeNum}>Axe {axeDef.num}</Text>
                <Text style={styles.axeTitre}>{axeDef.titre}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.badgeText, { color: badge.color }]}>
                  {badge.label}
                </Text>
              </View>
            </TouchableOpacity>

            {ouvert && (
              <View style={styles.axeContenu}>
                <Text style={styles.axeDescription}>📖 {axeDef.description}</Text>

                {axeDef.num === 1 ? (
                  <>
                    {renderDetailsAxe1(axe)}
                    <TouchableOpacity style={styles.btnAction} onPress={lancerAxe1}>
                      <Text style={styles.btnActionText}>
                        {axe.statut === 'na' ? '🔄 Lancer la vérification' : '🔄 Recalculer'}
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={styles.placeholderBox}>
                    <Text style={styles.placeholderText}>
                      🚧 Axe {axeDef.num} — implémentation prévue Session 9c-conceptuel-suite
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        );
      })}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a2e1a' },
  content: { padding: 16, paddingBottom: 80 },
  loading: { color: '#fff', textAlign: 'center', marginTop: 40 },
  header: { marginBottom: 20 },
  titre: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  lotCode: { color: '#7ec87e', fontSize: 16, marginTop: 4, fontFamily: 'monospace' },
  badgeGlobal: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginTop: 12, alignSelf: 'flex-start' },
  badgeGlobalText: { fontSize: 14, fontWeight: '600' },
  dateVerif: { color: '#888', fontSize: 12, marginTop: 8 },

  axeBox: { backgroundColor: '#243524', borderRadius: 8, marginBottom: 10, overflow: 'hidden' },
  axeHeader: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  axeFleche: { color: '#7ec87e', fontSize: 14, marginRight: 8 },
  axeIcone: { fontSize: 20, marginRight: 10 },
  axeTitreBox: { flex: 1 },
  axeNum: { color: '#888', fontSize: 11 },
  axeTitre: { color: '#fff', fontSize: 14, fontWeight: '600' },
  badge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '600' },

  axeContenu: { padding: 14, paddingTop: 0, borderTopWidth: 1, borderTopColor: '#1a2e1a' },
  axeDescription: { color: '#bbb', fontSize: 13, lineHeight: 18, marginVertical: 12, fontStyle: 'italic' },

  detailsBox: { backgroundColor: '#1a2e1a', padding: 12, borderRadius: 6, marginBottom: 12 },
  detailLabel: { color: '#7ec87e', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  sourceLine: { marginBottom: 4 },
  detailText: { color: '#ddd', fontSize: 12 },
  detailSub: { color: '#a8c8a8', fontSize: 11, marginLeft: 12, marginTop: 2 },
  problemesBox: { backgroundColor: '#3a1a1a', padding: 10, borderRadius: 6, marginTop: 10 },
  problemesTitre: { color: '#e57373', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  problemeItem: { color: '#f5b5b5', fontSize: 12, marginLeft: 4 },

  btnAction: { backgroundColor: '#d4a04a', padding: 12, borderRadius: 6, alignItems: 'center' },
  btnActionText: { color: '#1a2e1a', fontWeight: '600', fontSize: 14 },

  placeholderBox: { backgroundColor: '#2a2a1a', padding: 12, borderRadius: 6, borderLeftWidth: 3, borderLeftColor: '#d4a04a' },
  placeholderText: { color: '#d4a04a', fontSize: 12, fontStyle: 'italic' },
});