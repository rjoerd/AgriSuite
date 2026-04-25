// ============================================================
// AgriSuite Madagascar — Phase 3
// screens/ExportTrackPlaceholders.js
//
// Écrans placeholder pour la navigation ExportTrack.
// À remplacer au fur et à mesure des sessions :
//   - LotListScreen → Session 4
//   - FournisseurListScreen → Session 5
//   - AcheteurListScreen → Session 7
//   - ExpeditionListScreen → Session 8
//   - BonCollecteFormScreen → Session 5
// ============================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const PlaceholderBase = ({ titre, sessionPrevue, navigation }) => (
  <View style={styles.container}>
    <View style={styles.card}>
      <Text style={styles.icone}>🚧</Text>
      <Text style={styles.titre}>{titre}</Text>
      <Text style={styles.sousTitre}>Écran à venir</Text>
      <Text style={styles.session}>{sessionPrevue}</Text>

      <TouchableOpacity
        style={styles.bouton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.boutonTexte}>← Retour</Text>
      </TouchableOpacity>
    </View>
  </View>
);

export const LotListScreen = ({ navigation }) => (
  <PlaceholderBase
    titre="Liste des lots"
    sessionPrevue="Phase 3 · Session 4"
    navigation={navigation}
  />
);

export const FournisseurListScreen = ({ navigation }) => (
  <PlaceholderBase
    titre="Fournisseurs (filière collecte)"
    sessionPrevue="Phase 3 · Session 5"
    navigation={navigation}
  />
);

export const AcheteurListScreen = ({ navigation }) => (
  <PlaceholderBase
    titre="Acheteurs internationaux"
    sessionPrevue="Phase 3 · Session 7"
    navigation={navigation}
  />
);

export const ExpeditionListScreen = ({ navigation }) => (
  <PlaceholderBase
    titre="Expéditions export"
    sessionPrevue="Phase 3 · Session 8"
    navigation={navigation}
  />
);

export const BonCollecteFormScreen = ({ navigation }) => (
  <PlaceholderBase
    titre="Nouveau bon de collecte"
    sessionPrevue="Phase 3 · Session 5"
    navigation={navigation}
  />
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1a0d',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#1a2e1a',
    padding: 32,
    borderRadius: 14,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: '#2d4a2d',
  },
  icone: {
    fontSize: 48,
    marginBottom: 12,
  },
  titre: {
    color: '#a8d9a8',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  sousTitre: {
    color: '#c8d4c8',
    fontSize: 14,
    marginBottom: 4,
  },
  session: {
    color: '#d4a04a',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 24,
  },
  bouton: {
    backgroundColor: '#243a24',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#7ec87e',
  },
  boutonTexte: {
    color: '#7ec87e',
    fontSize: 14,
    fontWeight: '600',
  },
});