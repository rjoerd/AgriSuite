// screens/ConformitePrpHaccpScreen.js
// Session 10c.6 — Preview + application règles PRP↔HACCP
// Fix Hermes : db lazy via getDb()

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SQLite from 'expo-sqlite';
import {
  evaluerReglesPrpHaccp,
  appliquerReglesPrpHaccp,
} from '../database/conformiteEnginePrpHaccp';

// Lazy DB — évite les soucis de scope Hermes au chargement du module
let _db = null;
function getDb() {
  if (!_db) {
    _db = SQLite.openDatabaseSync('agrisuite.db');
  }
  return _db;
}

const COULEURS = {
  conforme: '#7ec87e',
  non_conforme: '#d44a4a',
  a_verifier: '#d4a04a',
};

const LABELS = {
  conforme: '✅ Conforme',
  non_conforme: '❌ Non conforme',
  a_verifier: '⚠ À vérifier',
};

export default function ConformitePrpHaccpScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const [sites, setSites] = useState([]);
  const [siteId, setSiteId] = useState(route?.params?.siteId || null);
  const [resultats, setResultats] = useState([]);
  const [loading, setLoading] = useState(false);

  // Chargement initial des sites — détection auto colonne nom
  useEffect(() => {
    try {
      const db = getDb();
      const cols = db.getAllSync(`PRAGMA table_info(sites)`);
      console.log('[ConformitePrpHaccp] Colonnes sites:', cols.map(c => c.name));

      const candidats = ['nom', 'nom_site', 'name', 'libelle', 'titre', 'code', 'code_site'];
      let colNom = null;
      for (const c of candidats) {
        if (cols.find(col => col.name === c)) {
          colNom = c;
          break;
        }
      }
      if (!colNom) {
        const colTrouvee = cols.find(col => col.name.toLowerCase().includes('nom'));
        colNom = colTrouvee?.name || 'id';
      }

      const s = db.getAllSync(`SELECT id, ${colNom} as nom FROM sites ORDER BY ${colNom}`);
      setSites(s);
      if (s.length > 0) {
        setSiteId((prev) => prev || s[0].id);
      }
    } catch (e) {
      console.warn('Erreur chargement sites:', e.message);
    }
  }, []);

  // Évaluation à chaque changement de site
  useEffect(() => {
    if (siteId) {
      evaluer(siteId);
    }
  }, [siteId]);

  const evaluer = (currentSiteId) => {
    const id = currentSiteId || siteId;
    if (!id) return;
    setLoading(true);
    try {
      const r = evaluerReglesPrpHaccp(id);
      setResultats(r);
    } catch (e) {
      Alert.alert('Erreur', e.message);
    }
    setLoading(false);
  };

  const appliquer = () => {
    if (!siteId) return;
    Alert.alert(
      'Appliquer aux engagements HACCP ?',
      'Les statuts seront mis à jour dans tous les audits HACCP actifs de ce site.\n\nLes statuts forcés manuellement ne seront pas écrasés.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Appliquer',
          onPress: () => {
            setLoading(true);
            try {
              const res = appliquerReglesPrpHaccp(siteId);
              Alert.alert(
                'Application terminée',
                `✅ Appliqués : ${res.appliques}\n` +
                `⏭ Ignorés (override manuel) : ${res.ignores}\n` +
                `⚠ Erreurs : ${res.erreurs}\n` +
                `📋 Engagements HACCP : ${res.engagements || 0}` +
                (res.message ? `\n\n${res.message}` : '')
              );
            } catch (e) {
              Alert.alert('Erreur', e.message);
            }
            setLoading(false);
          },
        },
      ]
    );
  };

  const counts = resultats.reduce(
    (acc, r) => {
      acc[r.statut] = (acc[r.statut] || 0) + 1;
      return acc;
    },
    { conforme: 0, non_conforme: 0, a_verifier: 0 }
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Conformité PRP → HACCP</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}>
        <View style={styles.sitePicker}>
          <Text style={styles.label}>Site :</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {sites.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[
                  styles.sitePill,
                  siteId === s.id && styles.sitePillActive,
                ]}
                onPress={() => setSiteId(s.id)}
              >
                <Text
                  style={[
                    styles.sitePillText,
                    siteId === s.id && styles.sitePillTextActive,
                  ]}
                >
                  {s.nom}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.kpiRow}>
          <View style={[styles.kpi, { backgroundColor: COULEURS.conforme }]}>
            <Text style={styles.kpiValue}>{counts.conforme}</Text>
            <Text style={styles.kpiLabel}>Conforme</Text>
          </View>
          <View style={[styles.kpi, { backgroundColor: COULEURS.non_conforme }]}>
            <Text style={styles.kpiValue}>{counts.non_conforme}</Text>
            <Text style={styles.kpiLabel}>Non conf.</Text>
          </View>
          <View style={[styles.kpi, { backgroundColor: COULEURS.a_verifier }]}>
            <Text style={styles.kpiValue}>{counts.a_verifier}</Text>
            <Text style={styles.kpiLabel}>À vérif.</Text>
          </View>
        </View>

        <Text style={styles.intro}>
          Aperçu de l'évaluation auto. Les règles ci-dessous se basent sur les
          registres PRP du site. Cliquez sur "Appliquer" pour reporter ces
          statuts dans les audits HACCP actifs.
        </Text>

        {loading && <ActivityIndicator size="large" color="#7ec87e" style={{ marginTop: 20 }} />}

        {resultats.map((r) => (
          <View key={r.code_exigence} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.code}>{r.code_exigence}</Text>
              <Text style={[styles.statut, { color: COULEURS[r.statut] }]}>
                {LABELS[r.statut]}
              </Text>
            </View>
            <Text style={styles.libelle}>{r.libelle}</Text>
            <Text style={styles.preuve}>{r.preuve}</Text>
            {r.details?.regle && (
              <Text style={styles.regle}>Règle : {r.details.regle}</Text>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={styles.btnRefresh}
          onPress={() => evaluer()}
          disabled={loading || !siteId}
        >
          <Text style={styles.btnRefreshText}>🔄 Réévaluer</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btnAppliquer, (!siteId || loading) && styles.btnDisabled]}
          onPress={appliquer}
          disabled={loading || !siteId}
        >
          <Text style={styles.btnAppliquerText}>✓ Appliquer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a2e1a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0d1f0d',
  },
  back: { color: '#7ec87e', fontSize: 28, marginRight: 12 },
  title: { color: '#fff', fontSize: 18, fontWeight: '600' },
  sitePicker: { padding: 12 },
  label: { color: '#aaa', fontSize: 12, marginBottom: 6 },
  sitePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#2a3f2a',
    marginRight: 8,
  },
  sitePillActive: { backgroundColor: '#7ec87e' },
  sitePillText: { color: '#ccc', fontSize: 13 },
  sitePillTextActive: { color: '#0d1f0d', fontWeight: '700' },
  kpiRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8 },
  kpi: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  kpiValue: { fontSize: 24, fontWeight: '700', color: '#fff' },
  kpiLabel: { fontSize: 11, color: '#fff', marginTop: 2 },
  intro: {
    color: '#aaa',
    fontSize: 12,
    fontStyle: 'italic',
    padding: 12,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#2a3f2a',
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#7ec87e',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  code: { color: '#7ec87e', fontSize: 12, fontWeight: '700' },
  statut: { fontSize: 12, fontWeight: '600' },
  libelle: { color: '#fff', fontSize: 14, marginBottom: 6, fontWeight: '500' },
  preuve: { color: '#ddd', fontSize: 12, lineHeight: 17 },
  regle: { color: '#888', fontSize: 10, marginTop: 4, fontStyle: 'italic' },
  footer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#0d1f0d',
    borderTopWidth: 1,
    borderTopColor: '#2a3f2a',
    gap: 8,
  },
  btnRefresh: {
    flex: 1,
    padding: 12,
    backgroundColor: '#2a3f2a',
    borderRadius: 8,
    alignItems: 'center',
  },
  btnRefreshText: { color: '#7ec87e', fontWeight: '600' },
  btnAppliquer: {
    flex: 2,
    padding: 12,
    backgroundColor: '#7ec87e',
    borderRadius: 8,
    alignItems: 'center',
  },
  btnAppliquerText: { color: '#0d1f0d', fontWeight: '700' },
  btnDisabled: { opacity: 0.4 },
});