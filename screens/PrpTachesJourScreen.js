// screens/PrpTachesJourScreen.js
// Phase 3 - Session 10c.5 - "Mes tâches PRP du jour"
// Liste toutes les procédures à exécuter aujourd'hui ou en retard

import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTypePrpInfo } from '../database/prp';

const db = SQLite.openDatabaseSync('agrisuite.db');

function frequenceEnJours(freq) {
  if (!freq) return 30;
  const f = freq.toLowerCase();
  if (f.includes('quotidien') || f.includes('chaque') || f.includes('jour')) return 1;
  if (f.includes('hebdo') || f.includes('semaine')) return 7;
  if (f.includes('mensuel') || f.includes('mois')) return 30;
  if (f.includes('trimestriel')) return 90;
  if (f.includes('semestriel')) return 180;
  if (f.includes('annuel') || f.includes('an')) return 365;
  if (f.includes('demande') || f.includes('reception')) return 9999;
  return 30;
}

function joursDepuis(dateStr) {
  if (!dateStr) return Infinity;
  return Math.floor((new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24));
}

export default function PrpTachesJourScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [taches, setTaches] = useState({ retard: [], aujourdhui: [], cetteSemaine: [] });
  const [refreshing, setRefreshing] = useState(false);

  const charger = useCallback(() => {
    try {
      const procs = db.getAllSync(
        `SELECT p.id, p.titre, p.frequence_execution, p.responsable_execution,
                p.valeurs_attendues_json,
                pl.id as plan_id, pl.nom as plan_nom, pl.type_prp,
                (SELECT MAX(date_execution) FROM prp_registres
                 WHERE prp_procedure_id = p.id) as derniere_exec,
                (SELECT date_execution FROM prp_registres
                 WHERE prp_procedure_id = p.id
                   AND date(date_execution) = date('now')
                 ORDER BY id DESC LIMIT 1) as exec_aujourdhui
         FROM prp_procedures p
         LEFT JOIN prp_plans pl ON pl.id = p.prp_plan_id
         WHERE COALESCE(p.desactive, 0) = 0`
      );

      const retard = [];
      const aujourdhui = [];
      const cetteSemaine = [];

      procs.forEach(p => {
        const maxJ = frequenceEnJours(p.frequence_execution);
        if (maxJ >= 9999) return; // ponctuel

        const depuis = joursDepuis(p.derniere_exec);
        const item = {
          ...p,
          max_jours: maxJ,
          jours_depuis: depuis,
          fait_aujourdhui: p.exec_aujourdhui !== null,
        };

        // Quotidien : toujours dû aujourd'hui sauf si déjà fait
        if (maxJ === 1) {
          if (item.fait_aujourdhui) return; // déjà fait, on n'affiche pas
          if (depuis === Infinity || depuis >= 1) {
            if (depuis > 1) retard.push({ ...item, retard: depuis - 1 });
            else aujourdhui.push(item);
          }
        }
        // Hebdo, mensuel, etc. : en retard si depuis > max
        else {
          if (depuis === Infinity) {
            retard.push({ ...item, retard: 999 });
          } else if (depuis > maxJ) {
            retard.push({ ...item, retard: depuis - maxJ });
          } else if (depuis >= maxJ - Math.ceil(maxJ * 0.1)) {
            // proche échéance (90% du cycle écoulé)
            cetteSemaine.push(item);
          }
        }
      });

      retard.sort((a, b) => b.retard - a.retard);
      aujourdhui.sort((a, b) => a.plan_nom.localeCompare(b.plan_nom));
      cetteSemaine.sort((a, b) => b.jours_depuis - a.jours_depuis);

      setTaches({ retard, aujourdhui, cetteSemaine });
    } catch (e) {
      console.error('PrpTachesJour error:', e);
    }
  }, []);

  useFocusEffect(useCallback(() => { charger(); }, [charger]));

  const onRefresh = () => {
    setRefreshing(true);
    charger();
    setTimeout(() => setRefreshing(false), 400);
  };

  const renderTache = (t, type) => {
    const info = getTypePrpInfo(t.type_prp);
    const couleurBordure = type === 'retard' ? '#e74c3c' : type === 'aujourdhui' ? '#7ec87e' : '#d4a04a';

    return (
      <TouchableOpacity
        key={t.id}
        style={[styles.tacheCard, { borderLeftColor: couleurBordure }]}
        onPress={() => navigation.navigate('PrpRegistreForm', {
          planId: t.plan_id,
          procedureId: t.id,
          procedureTitre: t.titre,
        })}
      >
        <View style={styles.tacheHeader}>
          <Text style={styles.tacheBadge}>{info?.icone} {t.plan_nom}</Text>
          {type === 'retard' && (
            <Text style={styles.badgeRouge}>
              {t.retard >= 999 ? 'JAMAIS' : `+${t.retard} j`}
            </Text>
          )}
          {type === 'aujourdhui' && (
            <Text style={styles.badgeVert}>AUJOURD'HUI</Text>
          )}
          {type === 'semaine' && (
            <Text style={styles.badgeAmbre}>BIENTÔT</Text>
          )}
        </View>
        <Text style={styles.tacheTitre}>{t.titre}</Text>
        <View style={styles.tacheFooter}>
          <Text style={styles.tacheFreq}>⏱ {t.frequence_execution}</Text>
          {t.responsable_execution && (
            <Text style={styles.tacheResp}>👤 {t.responsable_execution}</Text>
          )}
        </View>
        <Text style={styles.tachePrompt}>📝 Tape pour enregistrer →</Text>
      </TouchableOpacity>
    );
  };

  const totalTaches = taches.retard.length + taches.aujourdhui.length;
  const dateAuj = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7ec87e" />}
      >
        <Text style={styles.title}>Tâches PRP du jour</Text>
        <Text style={styles.subtitle}>{dateAuj}</Text>

        {/* HEADER MOTIVATIONNEL */}
        <View style={[styles.headerBox, { borderLeftColor: totalTaches === 0 ? '#7ec87e' : '#d4a04a' }]}>
          {totalTaches === 0 ? (
            <Text style={styles.headerTextOk}>
              ✅ Toutes les tâches du jour sont à jour. Bon travail !
            </Text>
          ) : (
            <Text style={styles.headerTextWarn}>
              {totalTaches} tâche{totalTaches > 1 ? 's' : ''} à faire aujourd'hui
              {taches.retard.length > 0 && ` (dont ${taches.retard.length} en retard)`}
            </Text>
          )}
        </View>

        {/* EN RETARD */}
        {taches.retard.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🚨 En retard ({taches.retard.length})</Text>
            <Text style={styles.sectionHint}>À rattraper en priorité — risque NC audit</Text>
            {taches.retard.map(t => renderTache(t, 'retard'))}
          </View>
        )}

        {/* AUJOURD'HUI */}
        {taches.aujourdhui.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅 À faire aujourd'hui ({taches.aujourdhui.length})</Text>
            <Text style={styles.sectionHint}>Procédures quotidiennes pas encore enregistrées</Text>
            {taches.aujourdhui.map(t => renderTache(t, 'aujourdhui'))}
          </View>
        )}

        {/* CETTE SEMAINE */}
        {taches.cetteSemaine.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⏳ Bientôt dû ({taches.cetteSemaine.length})</Text>
            <Text style={styles.sectionHint}>À prévoir dans les prochains jours</Text>
            {taches.cetteSemaine.map(t => renderTache(t, 'semaine'))}
          </View>
        )}

        {totalTaches === 0 && taches.cetteSemaine.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={styles.emptyText}>
              Aucune tâche urgente. Profite pour faire de l'avance sur les contrôles hebdo ou mensuels.
            </Text>
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a2e1a' },
  content: { padding: 16, paddingBottom: 40 },
  title: { color: '#7ec87e', fontSize: 22, fontWeight: 'bold' },
  subtitle: { color: '#aaa', fontSize: 13, marginBottom: 16, textTransform: 'capitalize' },

  headerBox: {
    backgroundColor: '#243d24',
    padding: 14,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
  },
  headerTextOk: { color: '#7ec87e', fontSize: 14, fontWeight: 'bold' },
  headerTextWarn: { color: '#d4a04a', fontSize: 14, fontWeight: 'bold' },

  section: { marginBottom: 20 },
  sectionTitle: { color: '#7ec87e', fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  sectionHint: { color: '#888', fontSize: 11, fontStyle: 'italic', marginBottom: 10 },

  tacheCard: {
    backgroundColor: '#2a3e2a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  tacheHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  tacheBadge: { color: '#a8c8a8', fontSize: 11, fontWeight: '600', flex: 1 },
  badgeRouge: {
    color: '#fff', backgroundColor: '#e74c3c',
    fontSize: 10, fontWeight: 'bold',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4,
  },
  badgeVert: {
    color: '#1a2e1a', backgroundColor: '#7ec87e',
    fontSize: 10, fontWeight: 'bold',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4,
  },
  badgeAmbre: {
    color: '#1a2e1a', backgroundColor: '#d4a04a',
    fontSize: 10, fontWeight: 'bold',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4,
  },

  tacheTitre: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 6 },
  tacheFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tacheFreq: { color: '#bbb', fontSize: 11 },
  tacheResp: { color: '#bbb', fontSize: 11 },
  tachePrompt: { color: '#7ec87e', fontSize: 11, fontStyle: 'italic', marginTop: 8, textAlign: 'right' },

  emptyBox: { alignItems: 'center', padding: 30 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { color: '#a8c8a8', fontSize: 13, textAlign: 'center', lineHeight: 19 },
});