// ============================================================
// AgriSuite Madagascar — Phase 3 / Session 4B partie 1
// screens/FournisseurListScreen.js
//
// Liste filtrable des fournisseurs (paysans, coopératives, GIE) qui
// alimentent la filière collecte. Affichage par carte avec :
//   - Nom + code + type (badge)
//   - Zone de collecte + commune/fokontany
//   - Téléphone si renseigné
//   - Statut (actif/inactif)
//   - Stats rapides : nb bons, kg total collectés (si dispo)
//
// Filtres : segmenté Type (Tous/Individuel/Coopérative/GIE),
// chips Zone de collecte (toutes les zones avec fournisseurs),
// toggle "Actifs uniquement", recherche texte.
//
// Action : + Nouveau fournisseur
// Tap sur carte : ouvre FournisseurFormScreen en mode édition
//
// Palette : alignée sur ExportTrack — vert + ambre filière B
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
  getAllFournisseurs,
  getAllZonesCollecte,
  getBonsCollecteByFournisseur,
} from '../database/exportTrack';

// ============================================================
// HELPERS
// ============================================================

const formatKg = (kg) => {
  if (kg == null || isNaN(kg) || kg === 0) return '—';
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} t`;
  return `${kg.toFixed(0)} kg`;
};

const TYPES_FOURNISSEUR = {
  individuel:  { label: '👤 Paysan',     color: '#7ec87e' },
  cooperative: { label: '🤝 Coopérative', color: '#d4a04a' },
  gie:         { label: '🏛 GIE',         color: '#7eaac8' },
};

const STATUTS = {
  actif:    { label: 'Actif',    color: '#7ec87e' },
  inactif:  { label: 'Inactif',  color: '#8a9a8a' },
  suspendu: { label: 'Suspendu', color: '#c87e7e' },
};

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function FournisseurListScreen({ navigation }) {
  const [fournisseurs, setFournisseurs] = useState([]);
  const [zones, setZones] = useState([]);
  const [statsParFournisseur, setStatsParFournisseur] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  // Filtres
  const [filtreType, setFiltreType] = useState('tous');
  const [filtreZone, setFiltreZone] = useState(null);
  const [actifsOnly, setActifsOnly] = useState(true);
  const [recherche, setRecherche] = useState('');

  const recharger = useCallback(() => {
    try {
      const tous = getAllFournisseurs();
      setFournisseurs(tous);
      setZones(getAllZonesCollecte ? getAllZonesCollecte() : []);

      // Calcul stats par fournisseur (nb bons + kg total)
      const stats = {};
      for (const f of tous) {
        try {
          const bons = getBonsCollecteByFournisseur(f.id) || [];
          stats[f.id] = {
            nbBons: bons.length,
            totalKg: bons.reduce((s, b) => s + (b.quantite_kg || 0), 0),
          };
        } catch (e) {
          stats[f.id] = { nbBons: 0, totalKg: 0 };
        }
      }
      setStatsParFournisseur(stats);
    } catch (err) {
      console.error('[FournisseurList] Erreur chargement :', err);
      setFournisseurs([]);
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

  // Zones uniquement celles ayant au moins un fournisseur
  const zonesAvecFournisseurs = useMemo(() => {
    const codesUtilises = new Set(fournisseurs.map((f) => f.zone_collecte_code));
    return zones.filter((z) => codesUtilises.has(z.code));
  }, [zones, fournisseurs]);

  const fournisseursFiltres = useMemo(() => {
    return fournisseurs.filter((f) => {
      if (filtreType !== 'tous' && f.type !== filtreType) return false;
      if (filtreZone && f.zone_collecte_code !== filtreZone) return false;
      if (actifsOnly && f.statut !== 'actif') return false;
      if (recherche.trim().length > 0) {
        const q = recherche.trim().toLowerCase();
        const nom = (f.nom || '').toLowerCase();
        const code = (f.code || '').toLowerCase();
        const commune = (f.commune || '').toLowerCase();
        if (!nom.includes(q) && !code.includes(q) && !commune.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [fournisseurs, filtreType, filtreZone, actifsOnly, recherche]);

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
            <Text style={styles.headerTitle}>Fournisseurs</Text>
            <Text style={styles.headerSubtitle}>
              {fournisseursFiltres.length} sur {fournisseurs.length} fournisseur{fournisseurs.length > 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.btnNouveau}
            onPress={() => navigation.navigate('FournisseurForm')}
          >
            <Text style={styles.btnNouveauTexte}>+ Nouveau</Text>
          </TouchableOpacity>
        </View>

        {/* Recherche */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={recherche}
            onChangeText={setRecherche}
            placeholder="Nom, code ou commune..."
            placeholderTextColor="#5a6a5a"
          />
          {recherche.length > 0 && (
            <TouchableOpacity onPress={() => setRecherche('')}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Segmenté type */}
        <View style={styles.segmentedRow}>
          {[
            { key: 'tous',        label: 'Tous' },
            { key: 'individuel',  label: '👤 Paysan' },
            { key: 'cooperative', label: '🤝 Coop.' },
            { key: 'gie',         label: '🏛 GIE' },
          ].map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.segmentBtn,
                filtreType === opt.key && styles.segmentBtnActif,
              ]}
              onPress={() => setFiltreType(opt.key)}
            >
              <Text style={[
                styles.segmentTexte,
                filtreType === opt.key && styles.segmentTexteActif,
              ]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Toggle actifs + chips zones */}
        <View style={styles.filtresRow}>
          <TouchableOpacity
            style={[styles.toggleActifs, actifsOnly && styles.toggleActifsActif]}
            onPress={() => setActifsOnly((v) => !v)}
          >
            <Text style={styles.toggleIcone}>{actifsOnly ? '☑' : '☐'}</Text>
            <Text style={[
              styles.toggleTexte,
              actifsOnly && styles.toggleTexteActif,
            ]}>
              Actifs uniquement
            </Text>
          </TouchableOpacity>

          {zonesAvecFournisseurs.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.zonesScroll}
            >
              <TouchableOpacity
                style={[styles.zoneChip, filtreZone === null && styles.zoneChipActif]}
                onPress={() => setFiltreZone(null)}
              >
                <Text style={[
                  styles.zoneChipTexte,
                  filtreZone === null && styles.zoneChipTexteActif,
                ]}>
                  Toutes
                </Text>
              </TouchableOpacity>
              {zonesAvecFournisseurs.map((z) => (
                <TouchableOpacity
                  key={z.code}
                  style={[styles.zoneChip, filtreZone === z.code && styles.zoneChipActif]}
                  onPress={() => setFiltreZone(z.code)}
                >
                  <Text style={[
                    styles.zoneChipTexte,
                    filtreZone === z.code && styles.zoneChipTexteActif,
                  ]}>
                    {z.code}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
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
        {fournisseursFiltres.length === 0 ? (
          <EtatVide
            tousCount={fournisseurs.length}
            onCreer={() => navigation.navigate('FournisseurForm')}
            onResetFiltres={() => {
              setFiltreType('tous');
              setFiltreZone(null);
              setActifsOnly(false);
              setRecherche('');
            }}
          />
        ) : (
          fournisseursFiltres.map((f) => (
            <FournisseurCard
              key={f.id}
              fournisseur={f}
              zone={zones.find((z) => z.code === f.zone_collecte_code)}
              stats={statsParFournisseur[f.id] || { nbBons: 0, totalKg: 0 }}
              onPress={() =>
                navigation.navigate('FournisseurForm', { fournisseurId: f.id })
              }
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

function FournisseurCard({ fournisseur, zone, stats, onPress }) {
  const typeInfo = TYPES_FOURNISSEUR[fournisseur.type] || TYPES_FOURNISSEUR.individuel;
  const statutInfo = STATUTS[fournisseur.statut] || STATUTS.actif;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {/* Ligne 1 : nom + statut */}
      <View style={styles.cardLigne1}>
        <Text style={styles.cardNom} numberOfLines={1}>
          {fournisseur.nom}
        </Text>
        <View style={[styles.statutPastille, { backgroundColor: statutInfo.color }]}>
          <Text style={styles.statutTexte}>{statutInfo.label}</Text>
        </View>
      </View>

      {/* Ligne 2 : code + type */}
      <View style={styles.cardLigne2}>
        <Text style={styles.cardCode}>{fournisseur.code}</Text>
        <View style={[styles.typeBadge, { borderColor: typeInfo.color }]}>
          <Text style={[styles.typeBadgeTexte, { color: typeInfo.color }]}>
            {typeInfo.label}
          </Text>
        </View>
      </View>

      {/* Ligne 3 : zone + commune */}
      <View style={styles.cardLigne3}>
        <Text style={styles.cardZone} numberOfLines={1}>
          📍 {zone?.nom || fournisseur.zone_collecte_code}
          {fournisseur.commune ? ` · ${fournisseur.commune}` : ''}
          {fournisseur.fokontany ? ` · ${fournisseur.fokontany}` : ''}
        </Text>
      </View>

      {/* Ligne 4 : tél + stats */}
      <View style={styles.cardLigne4}>
        <Text style={styles.cardTel}>
          {fournisseur.telephone ? `📞 ${fournisseur.telephone}` : '—'}
        </Text>
        {stats.nbBons > 0 ? (
          <Text style={styles.cardStats}>
            {stats.nbBons} bon{stats.nbBons > 1 ? 's' : ''} · {formatKg(stats.totalKg)}
          </Text>
        ) : (
          <Text style={styles.cardStatsVide}>Aucun bon</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function EtatVide({ tousCount, onCreer, onResetFiltres }) {
  if (tousCount === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcone}>🤝</Text>
        <Text style={styles.emptyTitre}>Aucun fournisseur enregistré</Text>
        <Text style={styles.emptyTexte}>
          Démarre la filière collecte en ajoutant ton premier fournisseur
          (paysan, coopérative ou GIE).
        </Text>
        <TouchableOpacity style={styles.emptyBtn} onPress={onCreer}>
          <Text style={styles.emptyBtnTexte}>+ Créer un fournisseur</Text>
        </TouchableOpacity>
      </View>
    );
  }
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcone}>🔎</Text>
      <Text style={styles.emptyTitre}>Aucun fournisseur ne correspond aux filtres</Text>
      <Text style={styles.emptyTexte}>
        Ajuste les filtres ou réinitialise pour voir tous les fournisseurs.
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

  // En-tête
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

  // Segmenté type
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
    fontSize: 11,
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
  toggleActifs: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: COLORS.bgInput,
  },
  toggleActifsActif: {
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
  zonesScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingRight: 6,
  },
  zoneChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: COLORS.bgInput,
  },
  zoneChipActif: {
    backgroundColor: COLORS.ambre,
  },
  zoneChipTexte: {
    color: COLORS.texteSecond,
    fontSize: 12,
    fontWeight: '600',
  },
  zoneChipTexteActif: {
    color: '#0d1a0d',
  },

  // Liste
  listContent: {
    padding: 12,
    paddingBottom: 32,
  },

  // Carte fournisseur
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
    marginBottom: 6,
  },
  cardNom: {
    color: COLORS.texteDoux,
    fontSize: 16,
    fontWeight: '700',
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
    gap: 10,
    marginBottom: 8,
  },
  cardCode: {
    color: COLORS.ambreClair,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  typeBadgeTexte: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  cardLigne3: {
    marginBottom: 8,
  },
  cardZone: {
    color: COLORS.texteSecond,
    fontSize: 12,
  },

  cardLigne4: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cardTel: {
    color: COLORS.texteSecond,
    fontSize: 12,
  },
  cardStats: {
    color: COLORS.vertClair,
    fontSize: 12,
    fontWeight: '600',
  },
  cardStatsVide: {
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