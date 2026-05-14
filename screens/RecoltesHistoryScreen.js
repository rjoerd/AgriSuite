// ============================================================
// AgriSuite Madagascar — Phase 3 / Session 4 (corrigé)
// screens/RecoltesHistoryScreen.js
//
// CHANGEMENTS v2 :
//   - Logs de debug retirés
//   - Bandeau d'alerte si des récoltes sont en double rattachement
//     (anomalie de traçabilité BIO — détectable via nb_lots_rattaches)
//   - Affichage du lot rattaché sur chaque carte récolte
// ============================================================

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getAllSites } from '../database/db';

const formatKg = (kg) => {
  if (kg == null || isNaN(kg)) return '—';
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} t`;
  if (kg >= 100) return `${kg.toFixed(0)} kg`;
  return `${kg.toFixed(1)} kg`;
};

const formatDateGroupe = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
};

const DESTINATIONS = {
  autonomie:    { label: '🏠 Maison/Ouvriers', color: '#7ec87e' },
  ecole:        { label: '🏫 École',           color: '#7eaac8' },
  vente_locale: { label: '🛒 Vente locale',    color: '#d4c47e' },
  export:       { label: '📦 Export',          color: '#d4a04a' },
  perte:        { label: '❌ Perte',           color: '#c87e7e' },
};

const QUALITES = {
  excellente: '⭐',
  bonne:      '👍',
  moyenne:    '😐',
  mauvaise:   '👎',
};

const PERIODES = [
  { jours: 7,   label: '7 jours' },
  { jours: 30,  label: '30 jours' },
  { jours: 90,  label: '3 mois' },
  { jours: 365, label: '1 an' },
];

export default function RecoltesHistoryScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();

  const [filtreSiteId, setFiltreSiteId] = useState(route?.params?.siteId || null);
  const [filtrePeriode, setFiltrePeriode] = useState(30);
  const [recherche, setRecherche] = useState('');

  const [recoltes, setRecoltes] = useState([]);
  const [sites, setSites] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const charger = useCallback(() => {
    try {
      const data = getAllRecoltesMaraicheres
        ? getAllRecoltesMaraicheres(filtrePeriode)
        : [];
      setRecoltes(data);
      setSites(getAllSites ? getAllSites() : []);
    } catch (err) {
      console.error('[RecoltesHistory] Erreur chargement :', err);
      setRecoltes([]);
    }
  }, [filtrePeriode]);

  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    charger();
    setTimeout(() => setRefreshing(false), 400);
  }, [charger]);

  const recoltesFiltrees = useMemo(() => {
    return recoltes.filter((r) => {
      if (filtreSiteId && r.site_id !== filtreSiteId) return false;
      if (recherche.trim().length > 0) {
        const q = recherche.trim().toLowerCase();
        const cultureNom = (r.culture_nom || '').toLowerCase();
        const plancheNom = (r.planche_nom || '').toLowerCase();
        if (!cultureNom.includes(q) && !plancheNom.includes(q)) return false;
      }
      return true;
    });
  }, [recoltes, filtreSiteId, recherche]);

  const stats = useMemo(() => {
    const totalKg = recoltesFiltrees.reduce((s, r) => s + (r.quantite_kg || 0), 0);
    const parDestination = {};
    for (const r of recoltesFiltrees) {
      const dest = r.destination || 'autonomie';
      parDestination[dest] = (parDestination[dest] || 0) + (r.quantite_kg || 0);
    }
    return {
      nbRecoltes: recoltesFiltrees.length,
      totalKg,
      parDestination,
    };
  }, [recoltesFiltrees]);

  const anomaliesDoublons = useMemo(() => {
    return recoltesFiltrees.filter((r) => (r.nb_lots_rattaches || 0) > 1);
  }, [recoltesFiltrees]);

  const recoltesGroupees = useMemo(() => {
    const groupes = {};
    for (const r of recoltesFiltrees) {
      const dateKey = r.date_recolte;
      if (!groupes[dateKey]) groupes[dateKey] = [];
      groupes[dateKey].push(r);
    }
    return Object.entries(groupes)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, items]) => ({ date, items }));
  }, [recoltesFiltrees]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#1a2e1a" />

      <View style={styles.entete}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnRetour}>
          <Text style={styles.btnRetourTexte}>‹ Retour</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.titre}>📊 Historique des récoltes</Text>
          <Text style={styles.sousTitre}>
            {stats.nbRecoltes} récolte{stats.nbRecoltes > 1 ? 's' : ''} ·{' '}
            {formatKg(stats.totalKg)}
          </Text>
        </View>
      </View>

      <View style={styles.filtresZone}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcone}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={recherche}
            onChangeText={setRecherche}
            placeholder="Culture ou planche..."
            placeholderTextColor="#5a6a5a"
          />
          {recherche.length > 0 && (
            <TouchableOpacity onPress={() => setRecherche('')}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {PERIODES.map((p) => (
            <TouchableOpacity
              key={p.jours}
              style={[styles.chip, filtrePeriode === p.jours && styles.chipActif]}
              onPress={() => setFiltrePeriode(p.jours)}
            >
              <Text style={[
                styles.chipTexte,
                filtrePeriode === p.jours && styles.chipTexteActif,
              ]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          <TouchableOpacity
            style={[styles.chip, filtreSiteId === null && styles.chipActif]}
            onPress={() => setFiltreSiteId(null)}
          >
            <Text style={[
              styles.chipTexte,
              filtreSiteId === null && styles.chipTexteActif,
            ]}>
              Tous sites
            </Text>
          </TouchableOpacity>
          {sites.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.chip, filtreSiteId === s.id && styles.chipActif]}
              onPress={() => setFiltreSiteId(s.id)}
            >
              <Text style={[
                styles.chipTexte,
                filtreSiteId === s.id && styles.chipTexteActif,
              ]}>
                {s.code}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {anomaliesDoublons.length > 0 && (
        <View style={styles.alerteAnomalies}>
          <Text style={styles.alerteAnomaliesTitre}>
            ⚠️ {anomaliesDoublons.length} récolte{anomaliesDoublons.length > 1 ? 's' : ''} en double rattachement
          </Text>
          <Text style={styles.alerteAnomaliesTexte}>
            Une ou plusieurs récoltes sont rattachées à plusieurs lots export.
            Anomalie de traçabilité BIO à corriger via le mécanisme de
            rectification (Session 5).
          </Text>
        </View>
      )}

      {stats.nbRecoltes > 0 && (
        <View style={styles.statsBandeau}>
          {Object.entries(stats.parDestination).map(([dest, kg]) => {
            const info = DESTINATIONS[dest] || { label: dest, color: '#8a9a8a' };
            return (
              <View key={dest} style={[
                styles.statBlock,
                { borderLeftColor: info.color },
              ]}>
                <Text style={styles.statBlockKg}>{formatKg(kg)}</Text>
                <Text style={styles.statBlockLabel} numberOfLines={1}>{info.label}</Text>
              </View>
            );
          })}
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#7ec87e"
          />
        }
      >
        {recoltesGroupees.length === 0 ? (
          <EtatVide
            aFiltres={!!filtreSiteId || recherche.length > 0}
            onResetFiltres={() => {
              setFiltreSiteId(null);
              setRecherche('');
            }}
          />
        ) : (
          recoltesGroupees.map(({ date, items }) => (
            <View key={date} style={styles.groupeJour}>
              <Text style={styles.groupeJourTitre}>
                {formatDateGroupe(date)}
              </Text>
              <Text style={styles.groupeJourSousTitre}>
                {items.length} récolte{items.length > 1 ? 's' : ''} ·{' '}
                {formatKg(items.reduce((s, r) => s + (r.quantite_kg || 0), 0))}
              </Text>
              {items.map((r) => (
                <RecolteCard key={r.id} recolte={r} />
              ))}
            </View>
          ))
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

function RecolteCard({ recolte }) {
  const dest = DESTINATIONS[recolte.destination] || {
    label: recolte.destination, color: '#8a9a8a',
  };
  const qualiteIcone = QUALITES[recolte.qualite] || '';
  const nbLotsRattaches = recolte.nb_lots_rattaches || 0;
  const enAnomalie = nbLotsRattaches > 1;

  return (
    <View style={[styles.card, enAnomalie && styles.cardAnomalie]}>
      <View style={[styles.cardBande, { backgroundColor: dest.color }]} />
      <View style={styles.cardContent}>
        <View style={styles.cardLigne1}>
          <Text style={styles.cardCulture} numberOfLines={1}>
            {recolte.culture_nom || `Culture #${recolte.culture_id}`}
            {qualiteIcone ? ` ${qualiteIcone}` : ''}
          </Text>
          <Text style={styles.cardQte}>{formatKg(recolte.quantite_kg)}</Text>
        </View>
        <View style={styles.cardLigne2}>
          <Text style={styles.cardLieu}>
            📍 {recolte.site_code || '—'}
            {recolte.planche_nom ? ` · ${recolte.planche_nom}` : ''}
          </Text>
        </View>
        <View style={styles.cardLigne3}>
          <Text style={[styles.cardDest, { color: dest.color }]}>
            {dest.label}
          </Text>
          {recolte.prix_vente_ar && recolte.prix_vente_ar > 0 ? (
            <Text style={styles.cardPrix}>
              {recolte.prix_vente_ar.toLocaleString('fr-FR')} Ar
            </Text>
          ) : null}
        </View>

        {!!(recolte.est_rattachee_a_lot && recolte.lot_code) && (
          <View style={enAnomalie ? styles.lotBandeauAnomalie : styles.lotBandeau}>
            <Text style={enAnomalie ? styles.lotTexteAnomalie : styles.lotTexte}>
              📦 Lot export : {recolte.lot_code}
              {enAnomalie ? ` ⚠️ + ${nbLotsRattaches - 1} autre${nbLotsRattaches > 2 ? 's' : ''}` : ''}
            </Text>
          </View>
        )}

        {recolte.notes ? (
          <Text style={styles.cardNotes} numberOfLines={2}>
            📝 {recolte.notes}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function EtatVide({ aFiltres, onResetFiltres }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcone}>{aFiltres ? '🔎' : '🌱'}</Text>
      <Text style={styles.emptyTitre}>
        {aFiltres
          ? 'Aucune récolte ne correspond aux filtres'
          : 'Aucune récolte enregistrée sur cette période'}
      </Text>
      <Text style={styles.emptyTexte}>
        {aFiltres
          ? 'Élargis la période ou réinitialise les filtres.'
          : 'Les récoltes apparaîtront ici dès que des saisies seront effectuées.'}
      </Text>
      {aFiltres && (
        <TouchableOpacity style={styles.emptyBtn} onPress={onResetFiltres}>
          <Text style={styles.emptyBtnTexte}>Réinitialiser les filtres</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const COLORS = {
  bgDark: '#1a2e1a',
  bgCard: '#243524',
  bgInput: '#1f301f',
  border: '#2d4a2d',
  vert: '#7ec87e',
  vertFonce: '#4a9a4a',
  vertClair: '#a8d9a8',
  texte: '#e8f5e8',
  texteFaible: '#8fbc8f',
  texteMute: '#5a6a5a',
  ambre: '#d4a04a',
  ambreClair: '#e8be78',
  rouge: '#c87e7e',
  rougeFonce: '#3a1a1a',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },

  entete: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  btnRetour: { paddingRight: 12 },
  btnRetourTexte: { color: COLORS.vert, fontSize: 16 },
  titre: { color: COLORS.texte, fontSize: 17, fontWeight: 'bold' },
  sousTitre: { color: COLORS.texteFaible, fontSize: 12, marginTop: 2 },

  filtresZone: {
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgInput, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchIcone: { fontSize: 14, marginRight: 6, color: COLORS.texteFaible },
  searchInput: { flex: 1, color: COLORS.texte, fontSize: 14, padding: 0 },
  searchClear: { color: COLORS.texteFaible, fontSize: 16, paddingHorizontal: 6 },

  chipsScroll: { flexDirection: 'row', gap: 6, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6,
    backgroundColor: COLORS.bgInput, borderWidth: 1, borderColor: COLORS.border,
    marginRight: 6,
  },
  chipActif: { backgroundColor: COLORS.vertFonce, borderColor: COLORS.vert },
  chipTexte: { color: COLORS.texteFaible, fontSize: 12, fontWeight: '600' },
  chipTexteActif: { color: COLORS.texte },

  alerteAnomalies: {
    backgroundColor: COLORS.rougeFonce,
    marginHorizontal: 12,
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.rouge,
  },
  alerteAnomaliesTitre: {
    color: '#e8a8a8',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  alerteAnomaliesTexte: {
    color: COLORS.texteFaible,
    fontSize: 11,
    lineHeight: 15,
  },

  statsBandeau: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 12, paddingVertical: 8, gap: 6,
  },
  statBlock: {
    flex: 1, minWidth: 100, backgroundColor: COLORS.bgCard,
    paddingVertical: 8, paddingHorizontal: 10,
    borderRadius: 8, borderLeftWidth: 3,
  },
  statBlockKg: { color: COLORS.vertClair, fontSize: 14, fontWeight: '700' },
  statBlockLabel: { color: COLORS.texteFaible, fontSize: 10, marginTop: 2 },

  scroll: { flex: 1 },
  scrollContent: { paddingTop: 8, paddingHorizontal: 12 },

  groupeJour: { marginBottom: 16 },
  groupeJourTitre: {
    color: COLORS.vert, fontSize: 13, fontWeight: '700',
    textTransform: 'capitalize', marginBottom: 2,
  },
  groupeJourSousTitre: {
    color: COLORS.texteFaible, fontSize: 11, marginBottom: 8,
  },

  card: {
    flexDirection: 'row', backgroundColor: COLORS.bgCard,
    borderRadius: 10, overflow: 'hidden',
    marginBottom: 6, borderWidth: 1, borderColor: COLORS.border,
  },
  cardAnomalie: {
    borderColor: COLORS.rouge,
    borderWidth: 1.5,
  },
  cardBande: { width: 4 },
  cardContent: { flex: 1, padding: 12 },
  cardLigne1: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 4,
  },
  cardCulture: {
    color: COLORS.texte, fontSize: 14, fontWeight: '600',
    flex: 1, marginRight: 8,
  },
  cardQte: { color: COLORS.vertClair, fontSize: 16, fontWeight: '700' },
  cardLigne2: { marginBottom: 4 },
  cardLieu: { color: COLORS.texteFaible, fontSize: 12 },
  cardLigne3: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  cardDest: { fontSize: 12, fontWeight: '600' },
  cardPrix: { color: COLORS.vertClair, fontSize: 12, fontWeight: '600' },

  lotBandeau: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#2a2014',
    borderRadius: 6,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.ambre,
  },
  lotTexte: {
    color: COLORS.ambreClair,
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  lotBandeauAnomalie: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: COLORS.rougeFonce,
    borderRadius: 6,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.rouge,
  },
  lotTexteAnomalie: {
    color: '#e8a8a8',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'monospace',
  },

  cardNotes: {
    color: COLORS.texteFaible, fontSize: 11,
    marginTop: 6, fontStyle: 'italic', lineHeight: 15,
  },

  empty: {
    paddingVertical: 60, paddingHorizontal: 24, alignItems: 'center',
  },
  emptyIcone: { fontSize: 48, marginBottom: 16 },
  emptyTitre: {
    color: COLORS.vert, fontSize: 16, fontWeight: '600',
    textAlign: 'center', marginBottom: 8,
  },
  emptyTexte: {
    color: COLORS.texteFaible, fontSize: 13,
    textAlign: 'center', lineHeight: 18, marginBottom: 16,
  },
  emptyBtn: {
    backgroundColor: COLORS.vertFonce, paddingVertical: 10,
    paddingHorizontal: 18, borderRadius: 8,
  },
  emptyBtnTexte: { color: COLORS.texte, fontSize: 13, fontWeight: '600' },
});