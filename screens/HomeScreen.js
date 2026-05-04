// ============================================================
// AgriSuite Madagascar — Phase 3 / Session 6 finition UX
// screens/HomeScreen.js
//
// Nouvel écran d'accueil de l'app — hub de tous les modules.
//
// Structure :
//   1. Header compact : nom AgriSuite + nom entreprise (si configuré)
//   2. Bandeau d'alertes (conditionnel) : événements urgents
//   3. Section TERRAIN : grille 2x2 de cartes modules
//      - 📍 Sites · X sites
//      - 🌱 CropEngine · X cultures
//      - 📦 ExportTrack · X lots (mis en avant en ambre)
//      - (placeholder ForagePro futur, MaraîcherGuide futur)
//   4. Section CONFIGURATION (en bas) :
//      - ⚙️ Paramètres entreprise
//
// Compteurs chargés dynamiquement via useFocusEffect, pour rafraîchir
// quand on revient d'un autre écran (création de lot, etc.)
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getAllSites } from '../database/db';
import { getAllLots } from '../database/exportTrack';
import { getParametresEntreprise } from '../database/parametresEntreprise';

// Imports résilients (modules pas forcément exposés)
let _getAllCultures = null;
try {
  // eslint-disable-next-line global-require
  const cropEngine = require('../database/cropEngine');
  _getAllCultures = cropEngine.getAllCultures || null;
} catch (e) {}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  // Compteurs
  const [nbSites, setNbSites] = useState(0);
  const [nbLotsEnCours, setNbLotsEnCours] = useState(0);
  const [nbLotsCloture, setNbLotsCloture] = useState(0);
const [nbCultures, setNbCultures] = useState(0);
  const [nbEngagements, setNbEngagements] = useState(0);
  const [nomEntreprise, setNomEntreprise] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Alertes calculées
  const [alertes, setAlertes] = useState([]);

  // ============================================================
  // CHARGEMENT
  // ============================================================

  const charger = useCallback(() => {
    try {
      // Sites
      const sites = getAllSites() || [];
      setNbSites(sites.length);

      // Lots
      const lotsEnCours = getAllLots({ statut: 'en_cours' }) || [];
      const lotsCloture = getAllLots({ statut: 'cloture' }) || [];
      setNbLotsEnCours(lotsEnCours.length);
      setNbLotsCloture(lotsCloture.length);

      // Cultures (si module dispo)
      if (_getAllCultures) {
        try {
          const cultures = _getAllCultures() || [];
          setNbCultures(cultures.length);
        } catch (e) { setNbCultures(0); }
      }

      // Engagements certifications (si module dispo)
      try {
        // eslint-disable-next-line global-require
        const certifTrack = require('../database/certifTrack');
        const kpi = certifTrack.getKpiCertifTrack();
        setNbEngagements(kpi?.total_engagements || 0);
      } catch (e) { setNbEngagements(0); }

      // Paramètres entreprise
      try {
        const params = getParametresEntreprise();
        setNomEntreprise(params?.nom_commercial || null);
      } catch (e) { setNomEntreprise(null); }

      // Calcul alertes
      const nouvellesAlertes = [];
      if (lotsEnCours.length > 0) {
        nouvellesAlertes.push({
          icone: '📦',
          texte: `${lotsEnCours.length} lot${lotsEnCours.length > 1 ? 's' : ''} en cours`,
          action: () => navigation.navigate('ExportTrackHome'),
        });
      }
      // Futur : ajouter ici les alertes critiques (récolte dans 7j, etc.)
      setAlertes(nouvellesAlertes);
    } catch (err) {
      console.error('[HomeScreen] Erreur chargement :', err);
    }
  }, [navigation]);

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

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0d1a0d" />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#7ec87e"
            colors={['#7ec87e']}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitre}>🌿 AgriSuite Madagascar</Text>
          {nomEntreprise && (
            <Text style={styles.headerEntreprise}>{nomEntreprise}</Text>
          )}
        </View>

        {/* Bandeau alertes (conditionnel) */}
        {alertes.length > 0 && (
          <View style={styles.alertesBox}>
            <Text style={styles.alertesTitre}>📢 Tableau de bord</Text>
            {alertes.map((a, i) => (
              <TouchableOpacity
                key={i}
                style={styles.alerteLigne}
                onPress={a.action}
              >
                <Text style={styles.alerteIcone}>{a.icone}</Text>
                <Text style={styles.alerteTexte}>{a.texte}</Text>
                <Text style={styles.alerteChevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Section TERRAIN — grille 2x2 */}
        <Text style={styles.sectionTitre}>TERRAIN</Text>
        <View style={styles.grille}>
          {/* Carte Sites */}
          <CarteModule
            icone="📍"
            titre="Sites"
            compteur={`${nbSites} ${nbSites > 1 ? 'sites' : 'site'}`}
            description="Gestion parcelles et cartographie"
            couleur="#7ec87e"
            onPress={() => navigation.navigate('SiteList')}
          />

          {/* Carte CropEngine */}
          <CarteModule
            icone="🌱"
            titre="CropEngine"
            compteur={`${nbCultures} cultures`}
            description="Itinéraires techniques agronomiques"
            couleur="#7ec87e"
            onPress={() => navigation.navigate('CropEngine')}
          />

          {/* Carte ExportTrack — couleur ambre, mise en avant */}
          <CarteModule
            icone="📦"
            titre="ExportTrack"
            compteur={`${nbLotsEnCours + nbLotsCloture} lot${nbLotsEnCours + nbLotsCloture > 1 ? 's' : ''}`}
            description="Traçabilité production + collecte export"
            couleur="#d4a04a"
            badge={nbLotsEnCours > 0 ? `${nbLotsEnCours} en cours` : null}
            onPress={() => navigation.navigate('ExportTrackHome')}
          />

          {/* Carte CertifTrack — vert, certification & audit */}
          <CarteModule
            icone="🛡️"
            titre="CertifTrack"
            compteur={`${nbEngagements} engagement${nbEngagements > 1 ? 's' : ''}`}
            description="Certifications BIO, Fairtrade, HACCP, RA"
            couleur="#7ec87e"
            badge={nbEngagements > 0 ? 'actif' : null}
            onPress={() => navigation.navigate('CertifTrackHome')}
          />
        </View>

        {/* Section CONFIGURATION */}
        <Text style={[styles.sectionTitre, { marginTop: 8 }]}>
          CONFIGURATION
        </Text>
        <View style={styles.configSection}>
          <CarteConfig
            icone="⚙️"
            titre="Paramètres entreprise"
            description={nomEntreprise
              ? 'Modifier les paramètres'
              : 'Configurer le nom et les contacts'}
            etat={nomEntreprise ? 'configure' : 'non_configure'}
            onPress={() => navigation.navigate('ParametresEntreprise')}
          />
        </View>
      </ScrollView>
    </View>
  );
}

// ============================================================
// SOUS-COMPOSANTS
// ============================================================

function CarteModule({
  icone, titre, compteur, description, couleur,
  badge, sousTexte, onPress, disabled,
}) {
  return (
    <TouchableOpacity
      style={[
        styles.carte,
        { borderColor: couleur + '55' },
        disabled && styles.carteDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={styles.carteHeader}>
        <Text style={styles.carteIcone}>{icone}</Text>
        {badge && (
          <View style={[styles.carteBadge, { backgroundColor: couleur }]}>
            <Text style={styles.carteBadgeTexte}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.carteTitre, { color: couleur }]}>{titre}</Text>
      <Text style={styles.carteCompteur}>{compteur}</Text>
      <Text style={styles.carteDescription} numberOfLines={2}>
        {description}
      </Text>
      {sousTexte && (
        <Text style={styles.carteSousTexte}>{sousTexte}</Text>
      )}
    </TouchableOpacity>
  );
}

function CarteConfig({ icone, titre, description, etat, onPress }) {
  return (
    <TouchableOpacity
      style={styles.carteConfig}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.configIcone}>{icone}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.configTitre}>{titre}</Text>
        <Text style={styles.configDescription}>{description}</Text>
      </View>
      {etat === 'non_configure' && (
        <View style={styles.configBadge}>
          <Text style={styles.configBadgeTexte}>À configurer</Text>
        </View>
      )}
      <Text style={styles.configChevron}>›</Text>
    </TouchableOpacity>
  );
}

// ============================================================
// STYLES
// ============================================================

const COLORS = {
  bgDark: '#0d1a0d',
  bgCarte: '#1a2e1a',
  bgCarteHover: '#243d24',
  border: '#2d4a2d',
  vert: '#7ec87e',
  vertClair: '#a8d9a8',
  vertSombre: '#5a8a5a',
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
  scrollContent: {
    padding: 16,
  },

  // Header
  header: {
    marginBottom: 16,
    paddingTop: 8,
  },
  headerTitre: {
    color: COLORS.vert,
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerEntreprise: {
    color: COLORS.ambre,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },

  // Bandeau alertes
  alertesBox: {
    backgroundColor: COLORS.bgCarte,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.ambre,
  },
  alertesTitre: {
    color: COLORS.ambreClair,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  alerteLigne: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 10,
  },
  alerteIcone: {
    fontSize: 16,
  },
  alerteTexte: {
    flex: 1,
    color: COLORS.texteDoux,
    fontSize: 13,
  },
  alerteChevron: {
    color: COLORS.texteSecond,
    fontSize: 18,
    fontWeight: '300',
  },

  // Sections
  sectionTitre: {
    color: COLORS.texteSecond,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },

  // Grille modules
  grille: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  carte: {
    width: '48.5%',
    backgroundColor: COLORS.bgCarte,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    minHeight: 130,
  },
  carteDisabled: {
    opacity: 0.5,
  },
  carteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  carteIcone: {
    fontSize: 28,
  },
  carteBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  carteBadgeTexte: {
    color: '#0d1a0d',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  carteTitre: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  carteCompteur: {
    color: COLORS.texteDoux,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  carteDescription: {
    color: COLORS.texteSecond,
    fontSize: 11,
    lineHeight: 14,
  },
  carteSousTexte: {
    color: COLORS.texteMute,
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 4,
  },

  // Section configuration
  configSection: {
    backgroundColor: COLORS.bgCarte,
    borderRadius: 12,
    overflow: 'hidden',
  },
  carteConfig: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  configIcone: {
    fontSize: 24,
  },
  configTitre: {
    color: COLORS.texteDoux,
    fontSize: 14,
    fontWeight: '600',
  },
  configDescription: {
    color: COLORS.texteSecond,
    fontSize: 11,
    marginTop: 2,
  },
  configBadge: {
    backgroundColor: '#2a2014',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.ambre,
  },
  configBadgeTexte: {
    color: COLORS.ambre,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  configChevron: {
    color: COLORS.texteSecond,
    fontSize: 22,
    fontWeight: '300',
  },
});