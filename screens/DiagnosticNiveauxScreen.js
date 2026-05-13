// screens/DiagnosticNiveauxScreen.js
// ⚠️ ÉCRAN TEMPORAIRE — À SUPPRIMER après Session 9d2-bis
//
// But : afficher les exigences classées 'operateur' qui contiennent des mots-clés
// "groupe de producteurs / SCI / membre / coopérative" — car ce sont probablement
// des exigences niveau FOURNISSEUR mal classées.
//
// Tu copies/captures la liste, tu m'envoies, je corrige les mots-clés.

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('certifpilot.db');

// Mots-clés qui DEVRAIENT pointer vers niveau fournisseur
const MOTS_CLES_SUSPECTS = [
  'groupe', 'membre', 'coopérat', 'organisation de producteur',
  'petits producteur', 'groupement', 'sci', 'inspection interne',
  'contrat producteur', 'visite producteur', 'fournisseur',
  'producteur tiers', 'producteur affilié', 'adhésion',
  'opérateur affilié', "groupe d'opérateurs", 'collecte',
];

export default function DiagnosticNiveauxScreen() {
  const [data, setData] = useState({ BIO_UE: [], FAIRTRADE_FLO: [], RAINFOREST: [], HACCP: [] });

  useEffect(() => {
    const codesRef = ['BIO_UE', 'FAIRTRADE_FLO', 'RAINFOREST', 'HACCP'];
    const result = {};

    for (const codeRef of codesRef) {
      const ref = db.getFirstSync(
        `SELECT id FROM referentiels WHERE code = ?`,
        [codeRef]
      );
      if (!ref) {
        result[codeRef] = [];
        continue;
      }

      // Récupère TOUTES les exigences du référentiel
      const exigences = db.getAllSync(
        `SELECT code_exigence, titre, niveau_application, categorie
         FROM exigences_referentiel
         WHERE referentiel_id = ?
         ORDER BY code_exigence`,
        [ref.id]
      );

      // Filtre celles qui parlent de producteurs/groupes mais NE sont PAS au niveau fournisseur
      const suspects = exigences.filter((ex) => {
        const texte = `${ex.code_exigence || ''} ${ex.titre || ''}`.toLowerCase();
        const matchSuspect = MOTS_CLES_SUSPECTS.some(m => texte.includes(m));
        const pasFournisseur = ex.niveau_application !== 'fournisseur';
        return matchSuspect && pasFournisseur;
      });

      result[codeRef] = suspects;
    }

    setData(result);
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.titre}>🔬 Diagnostic niveaux exigences</Text>
      <Text style={styles.sousTitre}>
        Exigences qui parlent de "groupe / producteur / SCI" mais ne sont PAS classées 'fournisseur'.
        Probablement mal classées.
      </Text>

      {Object.keys(data).map((codeRef) => (
        <View key={codeRef} style={styles.bloc}>
          <Text style={styles.refTitre}>
            {codeRef} — {data[codeRef].length} exigence{data[codeRef].length > 1 ? 's' : ''} suspecte{data[codeRef].length > 1 ? 's' : ''}
          </Text>

          {data[codeRef].length === 0 ? (
            <Text style={styles.vide}>(rien à signaler)</Text>
          ) : (
            data[codeRef].map((ex, i) => (
              <View key={i} style={styles.exigenceRow}>
                <Text style={styles.code}>{ex.code_exigence}</Text>
                <Text style={styles.niveau}>[niveau actuel : {ex.niveau_application}]</Text>
                <Text style={styles.titreEx}>{ex.titre}</Text>
              </View>
            ))
          )}
        </View>
      ))}

      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a2e1a' },
  content: { padding: 16 },
  titre: { fontSize: 18, fontWeight: 'bold', color: '#7ec87e', marginBottom: 4 },
  sousTitre: { fontSize: 12, color: '#a8c8a8', fontStyle: 'italic', marginBottom: 16 },
  bloc: {
    backgroundColor: '#243d24',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#d4a04a',
  },
  refTitre: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#d4a04a',
    marginBottom: 8,
  },
  vide: { color: '#8aa88a', fontSize: 12, fontStyle: 'italic' },
  exigenceRow: {
    backgroundColor: '#1a2e1a',
    padding: 8,
    borderRadius: 6,
    marginBottom: 6,
  },
  code: { color: '#7ec87e', fontSize: 11, fontWeight: 'bold' },
  niveau: { color: '#c87e7e', fontSize: 10, fontStyle: 'italic', marginBottom: 2 },
  titreEx: { color: '#fff', fontSize: 12 },
});