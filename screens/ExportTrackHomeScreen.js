// ============================================================
// AgriSuite Madagascar — Phase 3 / Session 3
// screens/ExportTrackHomeScreen.js
//
// Dashboard d'entrée du module M4 ExportTrack.
// Affiche : stats globales, alertes, répartition filières A/B,
// navigation principale (Lots, Fournisseurs, Acheteurs, Expéditions)
// + raccourci action rapide (Nouveau bon de collecte).
//
// Palette : vert AgriSuite (#1a2e1a / #7ec87e) + accent ambre export (#d4a04a)
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  getAllLots,
  getAllFournisseurs,
  getAllAcheteurs,
  getAllExpeditions,
  getQuantiteActuelleLot,
  getBonsCollecteByLot,
} from '../database/exportTrack';

// ============================================================
// HELPERS DE CALCUL DES KPI ET ALERTES
// ============================================================

/**
 * Calcule les indicateurs globaux du module.
 * Retourne : { nbLotsOuverts, kgEnCours, valeurEstimeeAr,
 *              nbLotsProduction, kgProduction,
 *              nbLotsCollecte, kgCollecte,
 *              nbFournisseurs, nbAcheteurs }
 */
const calculerKPI = () => {
  const lotsOuverts = getAllLots({ statut: 'en_cours' });
  let kgEnCours = 0;
  let kgProduction = 0;
  let kgCollecte = 0;
  let valeurAr = 0;
  let nbProd = 0;
  let nbColl = 0;

  for (const lot of lotsOuverts) {
    const qte = getQuantiteActuelleLot(lot.id);
    kgEnCours += qte;
    if (lot.filiere === 'production') {
      kgProduction += qte;
      nbProd += 1;
    } else if (lot.filiere === 'collecte') {
      kgCollecte += qte;
      nbColl += 1;
      // Valeur estimée des lots collecte = somme prix_total des bons
      const bons = getBonsCollecteByLot(lot.id);
      for (const bon of bons) {
        valeurAr += bon.prix_total || 0;
      }
    }
  }

  const fournisseurs = getAllFournisseurs('actif');
  const acheteurs = getAllAcheteurs();

  return {
    nbLotsOuverts: lotsOuverts.length,
    kgEnCours,
    valeurEstimeeAr: valeurAr,
    nbLotsProduction: nbProd,
    kgProduction,
    nbLotsCollecte: nbColl,
    kgCollecte,
    nbFournisseurs: fournisseurs.length,
    nbAcheteurs: acheteurs.length,
  };
};

/**
 * Détecte les alertes actionnables.
 * Retourne un tableau [{ niveau, icone, titre, detail }, ...]
 */
const calculerAlertes = () => {
  const alertes = [];
  const today = new Date();
  const trenteJoursMs = 30 * 24 * 60 * 60 * 1000;
  const septJoursMs = 7 * 24 * 60 * 60 * 1000;

  // Alerte 1 : lots ouverts depuis > 30j sans clôture
  const lotsOuverts = getAllLots({ statut: 'en_cours' });
  const lotsAClôturer = lotsOuverts.filter((lot) => {
    if (lot.est_cloture) return false;
    const debut = new Date(lot.date_debut);
    return today - debut > trenteJoursMs;
  });
  if (lotsAClôturer.length > 0) {
    alertes.push({
      niveau: 'critique',
      icone: '🔴',
      titre: `${lotsAClôturer.length} lot${lotsAClôturer.length > 1 ? 's' : ''} à clôturer`,
      detail: 'Ouverts depuis plus de 30 jours',
    });
  }

  // Alerte 2 : expéditions en préparation avec départ dans 7j
  const expeditionsPrep = getAllExpeditions('preparation');
  const expeditionsUrgentes = expeditionsPrep.filter((exp) => {
    if (!exp.date_depart_prevue) return false;
    const depart = new Date(exp.date_depart_prevue);
    return depart - today < septJoursMs && depart - today > 0;
  });
  if (expeditionsUrgentes.length > 0) {
    alertes.push({
      niveau: 'warning',
      icone: '🟡',
      titre: `${expeditionsUrgentes.length} expédition${expeditionsUrgentes.length > 1 ? 's' : ''} à préparer`,
      detail: 'Départ prévu dans moins de 7 jours',
    });
  }

  // Alerte 3 : aucun fournisseur actif (cas démarrage)
  const fournisseurs = getAllFournisseurs('actif');
  if (fournisseurs.length === 0) {
    alertes.push({
      niveau: 'info',
      icone: '💡',
      titre: 'Aucun fournisseur enregistré',
      detail: 'Démarrer la filière collecte en ajoutant un fournisseur',
    });
  }

  return alertes;
};

// ============================================================
// FORMATAGE
// ============================================================

const formatKg = (kg) => {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} t`;
  return `${kg.toFixed(0)} kg`;
};

const formatAr = (ar) => {
  if (ar >= 1_000_000) return `${(ar / 1_000_000).toFixed(1)} M Ar`;
  if (ar >= 1_000) return `${(ar / 1_000).toFixed(0)} k Ar`;
  return `${ar.toFixed(0)} Ar`;
};

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function ExportTrackHomeScreen({ navigation }) {
  const [kpi, setKpi] = useState(null);
  const [alertes, setAlertes] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const recharger = useCallback(() => {
    try {
      setKpi(calculerKPI());
      setAlertes(calculerAlertes());
    } catch (err) {
      console.error('[ExportTrackHome] Erreur calcul KPI :', err);
    }
  }, []);

  // Recharge à chaque retour sur l'écran (création de lot, etc.)
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

  if (!kpi) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>Chargement…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d1a0d" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#7ec87e"
          />
        }
      >
        {/* En-tête */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>ExportTrack</Text>
          <Text style={styles.headerSubtitle}>
            Filière export · Production & Collecte
          </Text>
        </View>

        {/* Bandeau stats — 3 KPI */}
        <View style={styles.statsBandeau}>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{kpi.nbLotsOuverts}</Text>
            <Text style={styles.statLabel}>📦 Lots ouverts</Text>
          </View>
          <View style={[styles.statBlock, styles.statBlockBorder]}>
            <Text style={styles.statValue}>{formatKg(kpi.kgEnCours)}</Text>
            <Text style={styles.statLabel}>⚖️ En cours</Text>
          </View>
          <View style={styles.statBlock}>
            <Text style={[styles.statValue, styles.statValueAmbre]}>
              {formatAr(kpi.valeurEstimeeAr)}
            </Text>
            <Text style={styles.statLabel}>💰 Valeur est.</Text>
          </View>
        </View>

        {/* Alertes */}
        {alertes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚡ Alertes</Text>
            {alertes.map((alerte, idx) => (
              <View
                key={idx}
                style={[
                  styles.alerteCard,
                  alerte.niveau === 'critique' && styles.alerteCritique,
                  alerte.niveau === 'warning' && styles.alerteWarning,
                  alerte.niveau === 'info' && styles.alerteInfo,
                ]}
              >
                <Text style={styles.alerteIcone}>{alerte.icone}</Text>
                <View style={styles.alerteTexte}>
                  <Text style={styles.alerteTitre}>{alerte.titre}</Text>
                  <Text style={styles.alerteDetail}>{alerte.detail}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Répartition filières A et B */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌾 Répartition par filière</Text>
          <View style={styles.filieresRow}>
            <View style={styles.filiereCard}>
              <Text style={styles.filiereIcone}>🏡</Text>
              <Text style={styles.filiereLabel}>Production</Text>
              <Text style={styles.filiereValue}>
                {kpi.nbLotsProduction} lot{kpi.nbLotsProduction > 1 ? 's' : ''}
              </Text>
              <Text style={styles.filiereDetail}>
                {formatKg(kpi.kgProduction)}
              </Text>
              <Text style={styles.filiereSource}>Sites propres</Text>
            </View>

            <View style={[styles.filiereCard, styles.filiereCardCollecte]}>
              <Text style={styles.filiereIcone}>🤝</Text>
              <Text style={styles.filiereLabel}>Collecte</Text>
              <Text style={styles.filiereValue}>
                {kpi.nbLotsCollecte} lot{kpi.nbLotsCollecte > 1 ? 's' : ''}
              </Text>
              <Text style={styles.filiereDetail}>
                {formatKg(kpi.kgCollecte)}
              </Text>
              <Text style={styles.filiereSource}>
                {kpi.nbFournisseurs} fournisseur{kpi.nbFournisseurs > 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Navigation principale — 4 boutons grille 2x2 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📂 Modules</Text>
          <View style={styles.navGrid}>
            <TouchableOpacity
              style={styles.navCard}
              onPress={() => navigation.navigate('LotList')}
            >
              <Text style={styles.navIcone}>📋</Text>
              <Text style={styles.navLabel}>Lots</Text>
              <Text style={styles.navBadge}>{kpi.nbLotsOuverts}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navCard}
              onPress={() => navigation.navigate('FournisseurList')}
            >
              <Text style={styles.navIcone}>🤝</Text>
              <Text style={styles.navLabel}>Fournisseurs</Text>
              <Text style={styles.navBadge}>{kpi.nbFournisseurs}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navCard}
              onPress={() => navigation.navigate('AcheteurList')}
            >
              <Text style={styles.navIcone}>🏢</Text>
              <Text style={styles.navLabel}>Acheteurs</Text>
              <Text style={styles.navBadge}>{kpi.nbAcheteurs}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navCard}
              onPress={() => navigation.navigate('ExpeditionList')}
            >
              <Text style={styles.navIcone}>🚢</Text>
              <Text style={styles.navLabel}>Expéditions</Text>
              <Text style={styles.navBadge}>—</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Raccourci action rapide */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.actionRapide}
            onPress={() => navigation.navigate('BonCollecteForm')}
          >
            <Text style={styles.actionRapideIcone}>➕</Text>
            <View style={styles.actionRapideTexte}>
              <Text style={styles.actionRapideLabel}>Nouveau bon de collecte</Text>
              <Text style={styles.actionRapideHint}>
                Saisie rapide opérateur · filière B
              </Text>
            </View>
            <Text style={styles.actionRapideChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Pied de page */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            AgriSuite · Module M4 ExportTrack · v0.9
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const COLORS = {
  bgDark: '#0d1a0d',
  bgCard: '#1a2e1a',
  bgCardHover: '#243a24',
  border: '#2d4a2d',
  vert: '#7ec87e',
  vertClair: '#a8d9a8',
  ambre: '#d4a04a',
  ambreClair: '#e8be78',
  texteDoux: '#c8d4c8',
  texteSecond: '#8a9a8a',
  rouge: '#c87e7e',
  jaune: '#d4c47e',
  bleu: '#7eaac8',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.vert,
    fontSize: 16,
  },
  scrollContent: {
    paddingBottom: 32,
  },

  // En-tête
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    color: COLORS.ambre,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: COLORS.texteSecond,
    fontSize: 13,
    marginTop: 2,
  },

  // Bandeau stats
  statsBandeau: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    marginHorizontal: 16,
    borderRadius: 12,
    paddingVertical: 18,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.ambre,
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
  },
  statBlockBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: {
    color: COLORS.vertClair,
    fontSize: 22,
    fontWeight: '700',
  },
  statValueAmbre: {
    color: COLORS.ambreClair,
  },
  statLabel: {
    color: COLORS.texteSecond,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },

  // Sections
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    color: COLORS.vertClair,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 0.3,
  },

  // Alertes
  alerteCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    alignItems: 'center',
    borderLeftWidth: 3,
  },
  alerteCritique: {
    borderLeftColor: COLORS.rouge,
  },
  alerteWarning: {
    borderLeftColor: COLORS.jaune,
  },
  alerteInfo: {
    borderLeftColor: COLORS.bleu,
  },
  alerteIcone: {
    fontSize: 20,
    marginRight: 12,
  },
  alerteTexte: {
    flex: 1,
  },
  alerteTitre: {
    color: COLORS.texteDoux,
    fontSize: 14,
    fontWeight: '600',
  },
  alerteDetail: {
    color: COLORS.texteSecond,
    fontSize: 12,
    marginTop: 2,
  },

  // Filières
  filieresRow: {
    flexDirection: 'row',
    gap: 10,
  },
  filiereCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderTopWidth: 2,
    borderTopColor: COLORS.vert,
  },
  filiereCardCollecte: {
    borderTopColor: COLORS.ambre,
  },
  filiereIcone: {
    fontSize: 28,
    marginBottom: 4,
  },
  filiereLabel: {
    color: COLORS.texteSecond,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  filiereValue: {
    color: COLORS.vertClair,
    fontSize: 18,
    fontWeight: '700',
  },
  filiereDetail: {
    color: COLORS.texteDoux,
    fontSize: 13,
    marginTop: 2,
  },
  filiereSource: {
    color: COLORS.texteSecond,
    fontSize: 11,
    marginTop: 6,
  },

  // Navigation
  navGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  navCard: {
    width: '48.5%',
    backgroundColor: COLORS.bgCard,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    minHeight: 92,
    justifyContent: 'center',
  },
  navIcone: {
    fontSize: 26,
    marginBottom: 6,
  },
  navLabel: {
    color: COLORS.texteDoux,
    fontSize: 13,
    fontWeight: '600',
  },
  navBadge: {
    color: COLORS.ambre,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },

  // Action rapide
  actionRapide: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.ambre,
  },
  actionRapideIcone: {
    fontSize: 22,
    marginRight: 12,
    color: COLORS.ambre,
  },
  actionRapideTexte: {
    flex: 1,
  },
  actionRapideLabel: {
    color: COLORS.ambreClair,
    fontSize: 14,
    fontWeight: '600',
  },
  actionRapideHint: {
    color: COLORS.texteSecond,
    fontSize: 11,
    marginTop: 2,
  },
  actionRapideChevron: {
    color: COLORS.ambre,
    fontSize: 24,
    fontWeight: '300',
  },

  // Pied de page
  footer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    alignItems: 'center',
  },
  footerText: {
    color: COLORS.texteSecond,
    fontSize: 11,
  },
});