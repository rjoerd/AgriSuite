// ============================================================
// AgriSuite Madagascar — Phase 3 / Session 4
// screens/LotListScreen.js
//
// Liste filtrable des lots (filière A production + filière B collecte).
// - Carte riche : code lot, badge filière, culture, quantité, statut, dates
// - Filtres : segmenté Filière (Tous/Production/Collecte), toggle "En cours
//   uniquement" (actif par défaut), sélecteur Année, recherche par code
// - Tri par défaut : cree_le DESC
// - Action principale : bouton "+ Nouveau lot production" (filière B sera
//   ajoutée Session 4 partie 2 via BonCollecteForm)
//
// Palette : alignée sur ExportTrackHomeScreen.js — vert + ambre export
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
import {
  getAllLots,
  getQuantiteActuelleLot,
} from '../database/exportTrack';
// getAllCultures ajouté dans cropEngine.js (Session 4 — voir patch cropEngine_PATCH.md)
import { getAllCultures } from '../database/cropEngine';

// ============================================================
// HELPERS
// ============================================================

const formatKg = (kg) => {
  if (kg == null || isNaN(kg)) return '—';
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} t`;
  return `${kg.toFixed(0)} kg`;
};

const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

/**
 * Indexe les cultures par id pour résolution rapide nom culture.
 */
const indexerCultures = () => {
  const cultures = getAllCultures ? getAllCultures() : [];
  const idx = {};
  for (const c of cultures) {
    idx[c.id] = c.nom_fr || c.nom || `Culture #${c.id}`;
  }
  return idx;
};

/**
 * Extrait l'année d'un code lot (segment 2 : MDG-AAAA-...).
 */
const anneeDuCodeLot = (codeLot) => {
  if (!codeLot) return null;
  const parts = codeLot.split('-');
  if (parts.length < 2) return null;
  const an = parseInt(parts[1], 10);
  return isNaN(an) ? null : an;
};

/**
 * Statut affichable + couleur.
 */
const STATUT_STYLES = {
  en_cours:    { label: 'En cours',  color: '#7eaac8' },
  cloture:     { label: 'Clôturé',   color: '#d4c47e' },
  expedie:     { label: 'Expédié',   color: '#7ec87e' },
  annule:      { label: 'Annulé',    color: '#c87e7e' },
};

const getStatutDisplay = (lot) => {
  // Si flag est_cloture activé mais statut encore en_cours, on remonte cloture
  const key = lot.est_cloture && lot.statut === 'en_cours' ? 'cloture' : lot.statut;
  return STATUT_STYLES[key] || { label: lot.statut, color: '#8a9a8a' };
};

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function LotListScreen({ navigation }) {
  const [lots, setLots] = useState([]);
  const [culturesIdx, setCulturesIdx] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  // Filtres
  const [filtreFiliere, setFiltreFiliere] = useState('tous'); // tous|production|collecte
  const [enCoursOnly, setEnCoursOnly] = useState(true);
  const [filtreAnnee, setFiltreAnnee] = useState(null); // null = toutes
  const [recherche, setRecherche] = useState('');

  const recharger = useCallback(() => {
    try {
      const tousLots = getAllLots(); // pas de filtre BD : on filtre côté JS pour réactivité
      setLots(tousLots);
      setCulturesIdx(indexerCultures());
    } catch (err) {
      console.error('[LotList] Erreur chargement :', err);
      setLots([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      recharger();
    }, [recharger])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    recharger();
    setTimeout(() => setRefreshing(false), 400);
  }, [recharger]);

  // Liste des années disponibles dans les lots, pour le sélecteur
  const anneesDispo = useMemo(() => {
    const set = new Set();
    for (const l of lots) {
      const a = anneeDuCodeLot(l.code_lot);
      if (a) set.add(a);
    }
    return [...set].sort((a, b) => b - a); // desc
  }, [lots]);

  // Filtrage côté JS
  const lotsFiltres = useMemo(() => {
    return lots.filter((lot) => {
      if (filtreFiliere !== 'tous' && lot.filiere !== filtreFiliere) return false;
      if (enCoursOnly && (lot.est_cloture || lot.statut !== 'en_cours')) return false;
      if (filtreAnnee && anneeDuCodeLot(lot.code_lot) !== filtreAnnee) return false;
      if (recherche.trim().length > 0) {
        const q = recherche.trim().toLowerCase();
        if (!lot.code_lot.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [lots, filtreFiliere, enCoursOnly, filtreAnnee, recherche]);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d1a0d" />

      {/* En-tête fixe */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Lots</Text>
            <Text style={styles.headerSubtitle}>
              {lotsFiltres.length} sur {lots.length} lot{lots.length > 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.btnNouveau}
            onPress={() => navigation.navigate('LotProductionForm')}
          >
            <Text style={styles.btnNouveauTexte}>+ Nouveau lot</Text>
          </TouchableOpacity>
        </View>

        {/* Recherche */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={recherche}
            onChangeText={setRecherche}
            placeholder="Code lot (ex: MDG-2026-D-GIN-001)"
            placeholderTextColor="#5a6a5a"
            autoCapitalize="characters"
            autoCorrect={false}
          />
          {recherche.length > 0 && (
            <TouchableOpacity onPress={() => setRecherche('')}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Segmenté filière */}
        <View style={styles.segmentedRow}>
          {[
            { key: 'tous',       label: 'Tous' },
            { key: 'production', label: '🏡 Production' },
            { key: 'collecte',   label: '🤝 Collecte' },
          ].map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.segmentBtn,
                filtreFiliere === opt.key && styles.segmentBtnActif,
              ]}
              onPress={() => setFiltreFiliere(opt.key)}
            >
              <Text style={[
                styles.segmentTexte,
                filtreFiliere === opt.key && styles.segmentTexteActif,
              ]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Toggle en cours + années */}
        <View style={styles.filtresRow}>
          <TouchableOpacity
            style={[styles.toggleEnCours, enCoursOnly && styles.toggleEnCoursActif]}
            onPress={() => setEnCoursOnly((v) => !v)}
          >
            <Text style={styles.toggleIcone}>{enCoursOnly ? '☑' : '☐'}</Text>
            <Text style={[
              styles.toggleTexte,
              enCoursOnly && styles.toggleTexteActif,
            ]}>
              En cours uniquement
            </Text>
          </TouchableOpacity>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.anneesScroll}
          >
            <TouchableOpacity
              style={[styles.anneeChip, filtreAnnee === null && styles.anneeChipActif]}
              onPress={() => setFiltreAnnee(null)}
            >
              <Text style={[
                styles.anneeChipTexte,
                filtreAnnee === null && styles.anneeChipTexteActif,
              ]}>
                Toutes
              </Text>
            </TouchableOpacity>
            {anneesDispo.map((a) => (
              <TouchableOpacity
                key={a}
                style={[styles.anneeChip, filtreAnnee === a && styles.anneeChipActif]}
                onPress={() => setFiltreAnnee(a)}
              >
                <Text style={[
                  styles.anneeChipTexte,
                  filtreAnnee === a && styles.anneeChipTexteActif,
                ]}>
                  {a}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Liste */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#7ec87e"
          />
        }
      >
        {lotsFiltres.length === 0 ? (
          <EtatVide
            tousLotsCount={lots.length}
            onCreer={() => navigation.navigate('LotProductionForm')}
            onResetFiltres={() => {
              setFiltreFiliere('tous');
              setEnCoursOnly(false);
              setFiltreAnnee(null);
              setRecherche('');
            }}
          />
        ) : (
          lotsFiltres.map((lot) => (
            <LotCard
              key={lot.id}
              lot={lot}
              cultureNom={culturesIdx[lot.culture_id] || `Culture #${lot.culture_id}`}
              onPress={() => navigation.navigate('LotDetail', { lotId: lot.id })}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ============================================================
// SOUS-COMPOSANTS
// ============================================================

function LotCard({ lot, cultureNom, onPress }) {
  const statut = getStatutDisplay(lot);
  const qteActuelle = getQuantiteActuelleLot(lot.id);
  const isProduction = lot.filiere === 'production';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {/* Ligne 1 : code + statut */}
      <View style={styles.cardLigne1}>
        <Text style={styles.cardCode} numberOfLines={1}>{lot.code_lot}</Text>
        <View style={[styles.statutPastille, { backgroundColor: statut.color }]}>
          <Text style={styles.statutTexte}>{statut.label}</Text>
        </View>
      </View>

      {/* Ligne 2 : badge filière + culture + variété */}
      <View style={styles.cardLigne2}>
        <View style={[
          styles.filiereBadge,
          isProduction ? styles.filiereProd : styles.filiereColl,
        ]}>
          <Text style={styles.filiereBadgeTexte}>
            {isProduction ? '🏡 PRODUCTION' : '🤝 COLLECTE'}
          </Text>
        </View>
        <Text style={styles.cardCulture} numberOfLines={1}>
          {cultureNom}{lot.variete ? ` · ${lot.variete}` : ''}
        </Text>
      </View>

      {/* Ligne 3 : quantité (proéminent) + composite éventuel */}
      <View style={styles.cardLigne3}>
        <View>
          <Text style={styles.cardQteValue}>{formatKg(qteActuelle)}</Text>
          <Text style={styles.cardQteLabel}>quantité actuelle</Text>
        </View>
        {lot.est_composite ? (
          <View style={styles.compositeBadge}>
            <Text style={styles.compositeTexte}>⚙ COMPOSITE</Text>
          </View>
        ) : null}
      </View>

      {/* Ligne 4 : dates discrètes */}
      <View style={styles.cardLigne4}>
        <Text style={styles.cardDates}>
          📅 {formatDate(lot.date_debut)}
          {lot.date_fin ? ` → ${formatDate(lot.date_fin)}` : ' → en cours'}
        </Text>
        {lot.cree_par ? (
          <Text style={styles.cardCreePar}>par {lot.cree_par}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function EtatVide({ tousLotsCount, onCreer, onResetFiltres }) {
  // Cas 1 : aucun lot du tout en base
  if (tousLotsCount === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcone}>📦</Text>
        <Text style={styles.emptyTitre}>Aucun lot enregistré</Text>
        <Text style={styles.emptyTexte}>
          Crée ton premier lot de production pour démarrer la traçabilité export.
        </Text>
        <TouchableOpacity style={styles.emptyBtn} onPress={onCreer}>
          <Text style={styles.emptyBtnTexte}>+ Créer un lot production</Text>
        </TouchableOpacity>
      </View>
    );
  }
  // Cas 2 : il y a des lots mais les filtres masquent tout
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcone}>🔎</Text>
      <Text style={styles.emptyTitre}>Aucun lot ne correspond aux filtres</Text>
      <Text style={styles.emptyTexte}>
        Ajuste les filtres ou réinitialise pour voir tous les lots.
      </Text>
      <TouchableOpacity style={styles.emptyBtn} onPress={onResetFiltres}>
        <Text style={styles.emptyBtnTexte}>Réinitialiser les filtres</Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const COLORS = {
  bgDark: '#0d1a0d',
  bgCard: '#1a2e1a',
  bgInput: '#0f1f0f',
  border: '#2d4a2d',
  borderActive: '#7ec87e',
  vert: '#7ec87e',
  vertClair: '#a8d9a8',
  ambre: '#d4a04a',
  ambreClair: '#e8be78',
  texteDoux: '#c8d4c8',
  texteSecond: '#8a9a8a',
  texteMute: '#5a6a5a',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },

  // En-tête fixe
  header: {
    backgroundColor: COLORS.bgDark,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    color: COLORS.ambre,
    fontSize: 22,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: COLORS.texteSecond,
    fontSize: 12,
    marginTop: 2,
  },
  btnNouveau: {
    backgroundColor: COLORS.ambre,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnNouveauTexte: {
    color: '#0d1a0d',
    fontSize: 13,
    fontWeight: '700',
  },

  // Recherche
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgInput,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
    color: COLORS.texteSecond,
  },
  searchInput: {
    flex: 1,
    color: COLORS.texteDoux,
    fontSize: 14,
    padding: 0,
  },
  searchClear: {
    color: COLORS.texteSecond,
    fontSize: 16,
    paddingHorizontal: 6,
  },

  // Segmenté filière
  segmentedRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgInput,
    borderRadius: 8,
    padding: 3,
    marginBottom: 10,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentBtnActif: {
    backgroundColor: COLORS.bgCard,
  },
  segmentTexte: {
    color: COLORS.texteSecond,
    fontSize: 12,
    fontWeight: '600',
  },
  segmentTexteActif: {
    color: COLORS.ambreClair,
  },

  // Filtres ligne 2
  filtresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toggleEnCours: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: COLORS.bgInput,
  },
  toggleEnCoursActif: {
    backgroundColor: '#1f3a1f',
  },
  toggleIcone: {
    color: COLORS.vert,
    fontSize: 14,
    marginRight: 6,
  },
  toggleTexte: {
    color: COLORS.texteSecond,
    fontSize: 12,
  },
  toggleTexteActif: {
    color: COLORS.vertClair,
    fontWeight: '600',
  },
  anneesScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingRight: 6,
  },
  anneeChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: COLORS.bgInput,
  },
  anneeChipActif: {
    backgroundColor: COLORS.ambre,
  },
  anneeChipTexte: {
    color: COLORS.texteSecond,
    fontSize: 12,
    fontWeight: '600',
  },
  anneeChipTexteActif: {
    color: '#0d1a0d',
  },

  // Liste
  listContent: {
    padding: 12,
    paddingBottom: 32,
  },

  // Carte lot
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.ambre,
  },
  cardLigne1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardCode: {
    color: COLORS.ambreClair,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'monospace',
    flex: 1,
    marginRight: 8,
  },
  statutPastille: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statutTexte: {
    color: '#0d1a0d',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  cardLigne2: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  filiereBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  filiereProd: {
    backgroundColor: '#1f3a1f',
    borderWidth: 1,
    borderColor: COLORS.vert,
  },
  filiereColl: {
    backgroundColor: '#3a2f1a',
    borderWidth: 1,
    borderColor: COLORS.ambre,
  },
  filiereBadgeTexte: {
    color: COLORS.texteDoux,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardCulture: {
    color: COLORS.texteDoux,
    fontSize: 13,
    flex: 1,
  },

  cardLigne3: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardQteValue: {
    color: COLORS.vertClair,
    fontSize: 20,
    fontWeight: '700',
  },
  cardQteLabel: {
    color: COLORS.texteSecond,
    fontSize: 10,
    marginTop: -2,
  },
  compositeBadge: {
    backgroundColor: '#3a2a1a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  compositeTexte: {
    color: COLORS.ambreClair,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },

  cardLigne4: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cardDates: {
    color: COLORS.texteSecond,
    fontSize: 11,
  },
  cardCreePar: {
    color: COLORS.texteMute,
    fontSize: 11,
    fontStyle: 'italic',
  },

  // État vide
  empty: {
    paddingVertical: 60,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyIcone: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitre: {
    color: COLORS.vertClair,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyTexte: {
    color: COLORS.texteSecond,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  emptyBtn: {
    backgroundColor: COLORS.ambre,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  emptyBtnTexte: {
    color: '#0d1a0d',
    fontSize: 14,
    fontWeight: '700',
  },
});