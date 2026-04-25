// screens/MaraicherHomeScreen.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  getDashboardMaraicher,
  getAllPlanches,
  getCulturesEnCoursBySite,
} from '../database/maraicher';

const COULEURS = {
  fond: '#1a2e1a',
  carte: '#243524',
  bordure: '#2d4a2d',
  vert: '#7ec87e',
  vertFonce: '#4a9a4a',
  texte: '#e8f5e8',
  texteFaible: '#8fbc8f',
  orange: '#FFA726',
  rouge: '#EF5350',
  jaune: '#FDD835',
};

// Couleur du taux de couverture
function couleurCouverture(taux) {
  if (taux === null) return COULEURS.texteFaible;
  if (taux >= 80) return COULEURS.vert;
  if (taux >= 40) return COULEURS.orange;
  return COULEURS.rouge;
}

// Badge niveau eau
function BadgeEau({ niveau }) {
  const config = {
    suffisant: { label: '💧 Eau suffisante', bg: '#1b3a2a', texte: COULEURS.vert },
    limite: { label: '💧 Eau limitée', bg: '#3a2a1b', texte: COULEURS.orange },
    aucune: { label: '🚫 Pas d\'eau', bg: '#3a1b1b', texte: COULEURS.rouge },
    inconnu: { label: '❓ Eau inconnue', bg: '#2a2a2a', texte: COULEURS.texteFaible },
  };
  const c = config[niveau] || config.inconnu;
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeTexte, { color: c.texte }]}>{c.label}</Text>
    </View>
  );
}

// Carte culture en cours
function CarteCulture({ culture, onPress }) {
  const joursRestants = culture.date_recolte_prevue
    ? Math.ceil((new Date(culture.date_recolte_prevue) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const urgence = joursRestants !== null && joursRestants <= 7;

  return (
    <TouchableOpacity style={styles.carteCulture} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.bandeCouleur, { backgroundColor: culture.couleur_badge || COULEURS.vert }]} />
      <View style={styles.carteCultureCorps}>
        <Text style={styles.carteCultureNom}>{culture.nom_fr}</Text>
        <Text style={styles.carteCulturePlanche}>📍 {culture.planche_nom}</Text>
        <Text style={styles.carteCultureStade}>
          {LABELS_STADE[culture.stade_actuel] || culture.stade_actuel}
        </Text>
      </View>
      {joursRestants !== null && (
        <View style={[styles.badgeJours, { backgroundColor: urgence ? '#3a1b1b' : '#1b2a3a' }]}>
          <Text style={[styles.badgeJoursNb, { color: urgence ? COULEURS.rouge : COULEURS.vert }]}>
            {joursRestants > 0 ? `J-${joursRestants}` : 'Récolte!'}
          </Text>
          <Text style={styles.badgeJoursLabel}>récolte</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const LABELS_STADE = {
  semis: '🌱 Semis',
  germination: '🌿 Germination',
  croissance: '🌾 Croissance',
  floraison: '🌸 Floraison',
  fructification: '🍅 Fructification',
  maturite: '✅ Maturité',
  recolte: '🧺 Récolte',
};

export default function MaraicherHomeScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { siteId, siteCode } = route.params;

  const [dashboard, setDashboard] = useState(null);
  const [cultures, setCultures] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const charger = useCallback(() => {
    const data = getDashboardMaraicher(siteId);
    const culturesData = getCulturesEnCoursBySite(siteId);
    setDashboard(data);
    setCultures(culturesData);
  }, [siteId]);

  useFocusEffect(useCallback(() => {
    charger();
  }, [charger]));

  const onRefresh = () => {
    setRefreshing(true);
    charger();
    setRefreshing(false);
  };

  if (!dashboard) return null;

  const { besoin_journalier, fumure_disponible, taux_couverture_pct,
    nb_planches, superficie_totale_m2, prochaines_recoltes } = dashboard;

  return (
    <View style={[styles.conteneur, { paddingTop: insets.top }]}>
      {/* En-tête */}
      <View style={styles.entete}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.boutonRetour}>
          <Text style={styles.texteRetour}>‹ Retour</Text>
        </TouchableOpacity>
        <View style={styles.enteteTexte}>
          <Text style={styles.titre}>🥬 MaraîcherGuide</Text>
          <Text style={styles.sousTitre}>{siteCode}</Text>
        </View>
        <TouchableOpacity
          style={styles.boutonAjouter}
          onPress={() => navigation.navigate('PlancheList', { siteId, siteCode })}
        >
          <Text style={styles.boutonAjouterTexte}>Planches</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COULEURS.vert} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Bloc couverture alimentaire */}
        <View style={styles.section}>
          <Text style={styles.sectionTitre}>Couverture alimentaire</Text>
          <View style={styles.rangee}>
            {/* Taux couverture */}
            <View style={[styles.carteMetrique, { flex: 1 }]}>
              <Text style={styles.metriqueLabel}>Taux couverture</Text>
              <Text style={[styles.metriqueValeur, { color: couleurCouverture(taux_couverture_pct), fontSize: 28 }]}>
                {taux_couverture_pct !== null ? `${taux_couverture_pct}%` : '—'}
              </Text>
              <Text style={styles.metriqueUnite}>moy. 7 derniers jours</Text>
            </View>
            {/* Besoin journalier */}
            <View style={[styles.carteMetrique, { flex: 1 }]}>
              <Text style={styles.metriqueLabel}>Besoin/jour</Text>
              <Text style={[styles.metriqueValeur, { fontSize: 22 }]}>
                {besoin_journalier.besoin_kg_jour.toFixed(1)} kg
              </Text>
              <Text style={styles.metriqueUnite}>
                {besoin_journalier.total_personnes} pers.
                {besoin_journalier.dont_eleves > 0 && ` dont ${besoin_journalier.dont_eleves} élèves`}
              </Text>
            </View>
          </View>
          {/* Barre de progression */}
          {taux_couverture_pct !== null && (
            <View style={styles.barreConteneur}>
              <View style={[
                styles.barreRemplissage,
                {
                  width: `${Math.min(100, taux_couverture_pct)}%`,
                  backgroundColor: couleurCouverture(taux_couverture_pct),
                }
              ]} />
            </View>
          )}
          {taux_couverture_pct === null && (
            <Text style={styles.texteInfo}>
              ℹ️ Commencez à saisir des récoltes pour voir le taux de couverture
            </Text>
          )}
        </View>

        {/* Bloc fumure organique */}
        <View style={styles.section}>
          <Text style={styles.sectionTitre}>Fumure organique disponible</Text>
          <View style={styles.rangee}>
            <View style={[styles.carteMetrique, { flex: 1 }]}>
              <Text style={styles.metriqueLabel}>Production troupeau</Text>
              <Text style={styles.metriqueValeur}>
                {fumure_disponible.production_journaliere_kg} kg/j
              </Text>
              <Text style={styles.metriqueUnite}>fumier brut estimé</Text>
            </View>
            <View style={[styles.carteMetrique, { flex: 1 }]}>
              <Text style={styles.metriqueLabel}>Disponible (30j)</Text>
              <Text style={[styles.metriqueValeur, {
                color: fumure_disponible.disponible_kg > 0 ? COULEURS.vert : COULEURS.orange
              }]}>
                {Math.round(fumure_disponible.disponible_kg)} kg
              </Text>
              <Text style={styles.metriqueUnite}>
                utilisé: {Math.round(fumure_disponible.utilise_30j_kg)} kg
              </Text>
            </View>
          </View>
          {fumure_disponible.production_journaliere_kg === 0 && (
            <Text style={styles.texteInfo}>
              ℹ️ Ajoutez des animaux dans ForagePro pour calculer le fumier disponible
            </Text>
          )}
        </View>

        {/* Bloc planches */}
        <View style={styles.section}>
          <Text style={styles.sectionTitre}>Planches actives</Text>
          <View style={styles.rangee}>
            <View style={[styles.carteMetrique, { flex: 1 }]}>
              <Text style={styles.metriqueLabel}>Nombre de planches</Text>
              <Text style={styles.metriqueValeur}>{nb_planches}</Text>
            </View>
            <View style={[styles.carteMetrique, { flex: 1 }]}>
              <Text style={styles.metriqueLabel}>Surface cultivée</Text>
              <Text style={styles.metriqueValeur}>{superficie_totale_m2} m²</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.boutonSection}
            onPress={() => navigation.navigate('PlancheList', { siteId, siteCode })}
          >
            <Text style={styles.boutonSectionTexte}>Gérer les planches →</Text>
          </TouchableOpacity>
        </View>

        {/* Bloc cultures en cours */}
        <View style={styles.section}>
          <View style={styles.rangeeEntete}>
            <Text style={styles.sectionTitre}>
              Cultures en cours ({cultures.length})
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('PlancheList', { siteId, siteCode })}>
              <Text style={styles.lienVert}>+ Nouvelle culture</Text>
            </TouchableOpacity>
          </View>

          {cultures.length === 0 ? (
            <View style={styles.vide}>
              <Text style={styles.videTexte}>Aucune culture en cours</Text>
              <Text style={styles.videInfo}>
                Créez une planche et démarrez votre première culture
              </Text>
              <TouchableOpacity
                style={styles.boutonVide}
                onPress={() => navigation.navigate('PlancheList', { siteId, siteCode })}
              >
                <Text style={styles.boutonVideTexte}>Créer une planche</Text>
              </TouchableOpacity>
            </View>
          ) : (
            cultures.map((culture) => (
              <CarteCulture
                key={culture.id}
                culture={culture}
                onPress={() => navigation.navigate('PlancheList', { siteId, siteCode })}
              />
            ))
          )}
        </View>

        {/* Prochaines récoltes urgentes */}
        {prochaines_recoltes.length > 0 && (
          <View style={[styles.section, styles.sectionAlerte]}>
            <Text style={[styles.sectionTitre, { color: COULEURS.orange }]}>
              ⚠️ Récoltes dans 14 jours ({prochaines_recoltes.length})
            </Text>
            {prochaines_recoltes.map((c) => (
              <Text key={c.id} style={styles.alerteItem}>
                • {c.nom_fr} — {c.planche_nom} → {c.date_recolte_prevue}
              </Text>
            ))}
          </View>
        )}

        {/* Bouton saisie récolte */}
        {cultures.length > 0 && (
          <TouchableOpacity
            style={styles.boutonPrincipal}
            onPress={() => navigation.navigate('SaisieRecolte', { siteId, siteCode })}
            activeOpacity={0.8}
          >
            <Text style={styles.boutonPrincipalTexte}>🧺 Saisir une récolte</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: { flex: 1, backgroundColor: COULEURS.fond },
  entete: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COULEURS.bordure,
  },
  boutonRetour: { paddingRight: 12 },
  texteRetour: { color: COULEURS.vert, fontSize: 16 },
  enteteTexte: { flex: 1 },
  titre: { color: COULEURS.texte, fontSize: 18, fontWeight: 'bold' },
  sousTitre: { color: COULEURS.texteFaible, fontSize: 13 },
  boutonAjouter: {
    backgroundColor: COULEURS.vertFonce,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  boutonAjouterTexte: { color: COULEURS.texte, fontSize: 13, fontWeight: '600' },
  scroll: { flex: 1 },
  section: {
    margin: 12, marginBottom: 0,
    backgroundColor: COULEURS.carte,
    borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: COULEURS.bordure,
  },
  sectionAlerte: { borderColor: COULEURS.orange },
  sectionTitre: {
    color: COULEURS.vert, fontSize: 14,
    fontWeight: '700', marginBottom: 12,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  rangee: { flexDirection: 'row', gap: 10 },
  rangeeEntete: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  carteMetrique: {
    backgroundColor: COULEURS.fond,
    borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: COULEURS.bordure,
  },
  metriqueLabel: { color: COULEURS.texteFaible, fontSize: 11, marginBottom: 4 },
  metriqueValeur: { color: COULEURS.texte, fontSize: 24, fontWeight: 'bold' },
  metriqueUnite: { color: COULEURS.texteFaible, fontSize: 11, marginTop: 2 },
  barreConteneur: {
    height: 8, backgroundColor: COULEURS.fond,
    borderRadius: 4, marginTop: 12, overflow: 'hidden',
  },
  barreRemplissage: { height: '100%', borderRadius: 4 },
  badge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  badgeTexte: { fontSize: 12, fontWeight: '600' },
  texteInfo: { color: COULEURS.texteFaible, fontSize: 12, marginTop: 10, fontStyle: 'italic' },
  boutonSection: {
    marginTop: 12, paddingVertical: 10,
    borderRadius: 8, borderWidth: 1, borderColor: COULEURS.bordure,
    alignItems: 'center',
  },
  boutonSectionTexte: { color: COULEURS.vert, fontSize: 14 },
  lienVert: { color: COULEURS.vert, fontSize: 13 },
  carteCulture: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COULEURS.fond, borderRadius: 10,
    marginBottom: 8, overflow: 'hidden',
    borderWidth: 1, borderColor: COULEURS.bordure,
  },
  bandeCouleur: { width: 4, alignSelf: 'stretch' },
  carteCultureCorps: { flex: 1, padding: 12 },
  carteCultureNom: { color: COULEURS.texte, fontSize: 15, fontWeight: '600' },
  carteCulturePlanche: { color: COULEURS.texteFaible, fontSize: 12, marginTop: 2 },
  carteCultureStade: { color: COULEURS.vert, fontSize: 12, marginTop: 2 },
  badgeJours: { padding: 12, alignItems: 'center', minWidth: 60 },
  badgeJoursNb: { fontSize: 16, fontWeight: 'bold' },
  badgeJoursLabel: { color: COULEURS.texteFaible, fontSize: 10 },
  alerteItem: { color: COULEURS.orange, fontSize: 13, marginBottom: 4 },
  vide: { alignItems: 'center', padding: 20 },
  videTexte: { color: COULEURS.texteFaible, fontSize: 15, fontWeight: '600' },
  videInfo: { color: COULEURS.texteFaible, fontSize: 12, textAlign: 'center', marginTop: 6 },
  boutonVide: {
    marginTop: 14, backgroundColor: COULEURS.vertFonce,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8,
  },
  boutonVideTexte: { color: COULEURS.texte, fontWeight: '600' },
  boutonPrincipal: {
    margin: 12, backgroundColor: COULEURS.vertFonce,
    borderRadius: 12, paddingVertical: 16, alignItems: 'center',
  },
  boutonPrincipalTexte: { color: COULEURS.texte, fontSize: 16, fontWeight: 'bold' },
});