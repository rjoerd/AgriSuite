// screens/PlancheListScreen.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  getAllPlanches,
  getCulturesEnCoursByPlanche,
  deletePlanche,
  cloturerCulture,
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
};

const LABELS_EAU = {
  suffisant: { label: '💧 Suffisant', couleur: '#7ec87e' },
  limite: { label: '💧 Limité', couleur: '#FFA726' },
  aucune: { label: '🚫 Aucune', couleur: '#EF5350' },
  inconnu: { label: '❓ Inconnu', couleur: '#8fbc8f' },
};

const LABELS_STADE = {
  semis: '🌱 Semis',
  germination: '🌿 Germination',
  croissance: '🌾 Croissance',
  floraison: '🌸 Floraison',
  fructification: '🍅 Fructification',
  maturite: '✅ Maturité',
  recolte: '🧺 Récolte',
};

function CartePlanche({ planche, onModifier, onSupprimer, onDemarrerCulture, onCloturerCulture }) {
  const [cultures, setCultures] = useState([]);
  const [expanded, setExpanded] = useState(false);

  useFocusEffect(useCallback(() => {
    const data = getCulturesEnCoursByPlanche(planche.id);
    setCultures(data);
  }, [planche.id]));

  const eau = LABELS_EAU[planche.niveau_eau] || LABELS_EAU.inconnu;
  const aCulture = cultures.length > 0;

  return (
    <View style={styles.cartePlanche}>
      {/* En-tête planche */}
      <TouchableOpacity
        style={styles.cartePlancheEntete}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.cartePlancheGauche}>
          <Text style={styles.cartePlancheNom}>{planche.nom}</Text>
          <Text style={styles.cartePlancheInfo}>
            {planche.superficie_m2} m²
            {planche.type_sol ? ` · ${planche.type_sol}` : ''}
          </Text>
          <View style={styles.rangee}>
            <Text style={[styles.badgeEau, { color: eau.couleur }]}>{eau.label}</Text>
            {aCulture && (
              <Text style={styles.badgeCulture}>
                🌱 {cultures.length} culture{cultures.length > 1 ? 's' : ''}
              </Text>
            )}
          </View>
        </View>
        <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {/* Corps étendu */}
      {expanded && (
        <View style={styles.cartePlancheCorps}>
          {/* Cultures en cours */}
          {cultures.length > 0 ? (
            <>
              <Text style={styles.sousTitre}>Cultures en cours</Text>
              {cultures.map((culture) => {
                const joursRestants = culture.date_recolte_prevue
                  ? Math.ceil((new Date(culture.date_recolte_prevue) - new Date()) / (1000 * 60 * 60 * 24))
                  : null;
                return (
                  <View key={culture.id} style={styles.carteCultureCompacte}>
                    <View style={[styles.pointCouleur, { backgroundColor: culture.couleur_badge || COULEURS.vert }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cultureNom}>{culture.nom_fr}</Text>
                      <Text style={styles.cultureDetail}>
                        Semis : {culture.date_semis}
                        {joursRestants !== null && (
                          <Text style={{ color: joursRestants <= 7 ? COULEURS.rouge : COULEURS.texteFaible }}>
                            {' '}· Récolte dans {joursRestants}j
                          </Text>
                        )}
                      </Text>
                      <Text style={styles.cultureStade}>
                        {LABELS_STADE[culture.stade_actuel] || culture.stade_actuel}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => onCloturerCulture(culture)}
                      style={styles.boutonCloturer}
                    >
                      <Text style={styles.boutonCloturerTexte}>Clôturer</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </>
          ) : (
            <Text style={styles.texteVide}>Aucune culture en cours sur cette planche</Text>
          )}

          {/* Notes */}
          {planche.notes ? (
            <Text style={styles.notes}>📝 {planche.notes}</Text>
          ) : null}

          {/* Actions */}
          <View style={styles.actionsRangee}>
            <TouchableOpacity
              style={styles.boutonAction}
              onPress={() => onDemarrerCulture(planche)}
            >
              <Text style={styles.boutonActionTexte}>🌱 Nouvelle culture</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.boutonAction}
              onPress={() => onModifier(planche)}
            >
              <Text style={styles.boutonActionTexte}>✏️ Modifier</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.boutonAction, styles.boutonDanger]}
              onPress={() => onSupprimer(planche)}
            >
              <Text style={[styles.boutonActionTexte, { color: COULEURS.rouge }]}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

export default function PlancheListScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { siteId, siteCode } = route.params;
  const [planches, setPlanches] = useState([]);

  const charger = useCallback(() => {
    setPlanches(getAllPlanches(siteId));
  }, [siteId]);

  useFocusEffect(useCallback(() => {
    charger();
  }, [charger]));

  const handleSupprimer = (planche) => {
    Alert.alert(
      'Supprimer la planche',
      `Supprimer "${planche.nom}" et toutes ses données ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            deletePlanche(planche.id);
            charger();
          },
        },
      ]
    );
  };

  const handleCloturerCulture = (culture) => {
    Alert.alert(
      'Clôturer la culture',
      `Marquer "${culture.nom_fr}" comme récoltée/terminée ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Récoltée ✅',
          onPress: () => { cloturerCulture(culture.id, 'recolte'); charger(); },
        },
        {
          text: 'Abandonnée',
          style: 'destructive',
          onPress: () => { cloturerCulture(culture.id, 'abandonne'); charger(); },
        },
      ]
    );
  };

  const superficieTotale = planches.reduce((s, p) => s + p.superficie_m2, 0);

  return (
    <View style={[styles.conteneur, { paddingTop: insets.top }]}>
      {/* En-tête */}
      <View style={styles.entete}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.boutonRetour}>
          <Text style={styles.texteRetour}>‹ Retour</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.titre}>Planches maraîchères</Text>
          <Text style={styles.sousTitreEntete}>
            {siteCode} · {planches.length} planche{planches.length > 1 ? 's' : ''} · {superficieTotale} m²
          </Text>
        </View>
        <TouchableOpacity
          style={styles.boutonAjouter}
          onPress={() => navigation.navigate('PlancheForm', { siteId, siteCode })}
        >
          <Text style={styles.boutonAjouterTexte}>+ Planche</Text>
        </TouchableOpacity>
      </View>

      {/* Liste */}
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {planches.length === 0 ? (
          <View style={styles.vide}>
            <Text style={styles.videEmoji}>🌱</Text>
            <Text style={styles.videTexte}>Aucune planche créée</Text>
            <Text style={styles.videInfo}>
              Une planche est une zone délimitée sur le terrain où vous cultivez.
              {'\n'}Ex: "Planche Nord", "Carré tomates", "Rang gingembre"
            </Text>
            <TouchableOpacity
              style={styles.boutonVide}
              onPress={() => navigation.navigate('PlancheForm', { siteId, siteCode })}
            >
              <Text style={styles.boutonVideTexte}>Créer la première planche</Text>
            </TouchableOpacity>
          </View>
        ) : (
          planches.map((planche) => (
            <CartePlanche
              key={planche.id}
              planche={planche}
              onModifier={(p) => navigation.navigate('PlancheForm', { siteId, siteCode, plancheId: p.id })}
              onSupprimer={handleSupprimer}
              onDemarrerCulture={(p) => navigation.navigate('CultureForm', { siteId, siteCode, plancheId: p.id, plancheNom: p.nom })}
              onCloturerCulture={handleCloturerCulture}
            />
          ))
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
  titre: { color: COULEURS.texte, fontSize: 17, fontWeight: 'bold' },
  sousTitreEntete: { color: COULEURS.texteFaible, fontSize: 12 },
  boutonAjouter: {
    backgroundColor: COULEURS.vertFonce,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  boutonAjouterTexte: { color: COULEURS.texte, fontSize: 13, fontWeight: '600' },
  scroll: { flex: 1, padding: 12 },
  cartePlanche: {
    backgroundColor: COULEURS.carte,
    borderRadius: 12, marginBottom: 10,
    borderWidth: 1, borderColor: COULEURS.bordure,
    overflow: 'hidden',
  },
  cartePlancheEntete: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14,
  },
  cartePlancheGauche: { flex: 1 },
  cartePlancheNom: { color: COULEURS.texte, fontSize: 16, fontWeight: '700' },
  cartePlancheInfo: { color: COULEURS.texteFaible, fontSize: 12, marginTop: 2 },
  rangee: { flexDirection: 'row', gap: 8, marginTop: 6 },
  badgeEau: { fontSize: 12, fontWeight: '600' },
  badgeCulture: { color: COULEURS.vert, fontSize: 12 },
  chevron: { color: COULEURS.texteFaible, fontSize: 16 },
  cartePlancheCorps: {
    borderTopWidth: 1, borderTopColor: COULEURS.bordure,
    padding: 14,
  },
  sousTitre: {
    color: COULEURS.vert, fontSize: 12,
    fontWeight: '700', marginBottom: 8,
    textTransform: 'uppercase',
  },
  carteCultureCompacte: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COULEURS.fond, borderRadius: 8,
    padding: 10, marginBottom: 6,
    borderWidth: 1, borderColor: COULEURS.bordure,
  },
  pointCouleur: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  cultureNom: { color: COULEURS.texte, fontSize: 14, fontWeight: '600' },
  cultureDetail: { color: COULEURS.texteFaible, fontSize: 12, marginTop: 1 },
  cultureStade: { color: COULEURS.vert, fontSize: 11, marginTop: 1 },
  boutonCloturer: {
    backgroundColor: '#1b2a1b', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: COULEURS.bordure,
  },
  boutonCloturerTexte: { color: COULEURS.texteFaible, fontSize: 11 },
  texteVide: { color: COULEURS.texteFaible, fontSize: 13, fontStyle: 'italic', marginBottom: 10 },
  notes: { color: COULEURS.texteFaible, fontSize: 12, marginTop: 8, fontStyle: 'italic' },
  actionsRangee: { flexDirection: 'row', gap: 8, marginTop: 12 },
  boutonAction: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: COULEURS.bordure,
    alignItems: 'center',
  },
  boutonDanger: { flex: 0, paddingHorizontal: 14 },
  boutonActionTexte: { color: COULEURS.vert, fontSize: 13 },
  vide: {
    alignItems: 'center', padding: 40,
    marginTop: 20,
  },
  videEmoji: { fontSize: 48, marginBottom: 16 },
  videTexte: { color: COULEURS.texte, fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  videInfo: {
    color: COULEURS.texteFaible, fontSize: 13,
    textAlign: 'center', lineHeight: 20,
  },
  boutonVide: {
    marginTop: 20, backgroundColor: COULEURS.vertFonce,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10,
  },
  boutonVideTexte: { color: COULEURS.texte, fontSize: 15, fontWeight: '600' },
});