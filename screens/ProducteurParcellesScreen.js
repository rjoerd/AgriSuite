// screens/ProducteurParcellesScreen.js
// Liste des parcelles d'un fournisseur producteur (filière B SCI)
// + bouton "+ Ajouter parcelle"
// + bouton "🌱 Conversion BIO" sur chaque parcelle

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as SQLite from 'expo-sqlite';
import { COULEURS_STATUT, LIBELLES_STATUT } from '../database/conversionBio';

const db = SQLite.openDatabaseSync('certifpilot.db');

export default function ProducteurParcellesScreen({ route, navigation }) {
  const { fournisseurId } = route.params;
  const [fournisseur, setFournisseur] = useState(null);
  const [parcelles, setParcelles] = useState([]);

  const charger = useCallback(() => {
    const f = db.getFirstSync(
      'SELECT * FROM fournisseurs WHERE id = ?',
      [fournisseurId]
    );
    setFournisseur(f);

    const ps = db.getAllSync(
      'SELECT * FROM parcelles_producteur WHERE fournisseur_id = ? ORDER BY nom_parcelle',
      [fournisseurId]
    );
    setParcelles(ps);
  }, [fournisseurId]);

  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger])
  );

  function handleSupprimer(parcelleId, nom) {
    Alert.alert(
      '⚠️ Supprimer parcelle ?',
      `Supprimer définitivement "${nom}" ?\nCette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            try {
              db.runSync('DELETE FROM parcelles_producteur WHERE id = ?', [parcelleId]);
              charger();
            } catch (e) {
              Alert.alert('❌', e.message);
            }
          },
        },
      ]
    );
  }

  if (!fournisseur) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header fournisseur */}
      <View style={styles.headerCard}>
        <Text style={styles.fournisseurNom}>{fournisseur.nom}</Text>
        <Text style={styles.fournisseurInfo}>
          {fournisseur.code} · {fournisseur.zone_collecte_code || '—'}
        </Text>
      </View>

      {/* Bouton ajouter */}
      <TouchableOpacity
        style={styles.btnAjouter}
        onPress={() => navigation.navigate('ProducteurParcelleForm', { fournisseurId })}
      >
        <Text style={styles.btnAjouterText}>+ Ajouter une parcelle</Text>
      </TouchableOpacity>

      {/* Section titre */}
      <Text style={styles.sectionTitle}>
        🌾 PARCELLES ({parcelles.length})
      </Text>

      {/* Liste */}
      {parcelles.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            Aucune parcelle enregistrée pour ce producteur.
          </Text>
          <Text style={styles.emptyHint}>
            Cliquer sur "+ Ajouter une parcelle" pour commencer.
          </Text>
        </View>
      ) : (
        parcelles.map((p) => {
          const statut = p.statut_conversion_bio || 'non_engage';
          const couleur = COULEURS_STATUT[statut] || '#888';
          const libelle = LIBELLES_STATUT[statut] || statut;
          return (
            <View key={p.id} style={styles.parcelleCard}>
              {/* Bloc info */}
              <TouchableOpacity
                onLongPress={() => handleSupprimer(p.id, p.nom_parcelle)}
                onPress={() => navigation.navigate('ProducteurParcelleForm', {
                  parcelleId: p.id, fournisseurId,
                })}
              >
                <View style={styles.parcelleHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.parcelleNom}>{p.nom_parcelle}</Text>
                    <Text style={styles.parcelleInfo}>
                      {p.culture_principale || '—'} · {p.superficie_ha?.toFixed(2) || '?'} ha
                    </Text>
                    {p.latitude && p.longitude && (
                      <Text style={styles.parcelleGps}>
                        📍 {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.bioPastille, { backgroundColor: couleur }]}>
                    <Text style={styles.bioPastilleText}>{libelle}</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Bouton conversion BIO */}
              <TouchableOpacity
                style={styles.btnConversion}
                onPress={() => navigation.navigate('ParcelleConversion', { parcelleId: p.id })}
              >
                <Text style={styles.btnConversionText}>
                  🌱 Gérer conversion BIO
                </Text>
              </TouchableOpacity>
            </View>
          );
        })
      )}

      <Text style={styles.hintBottom}>
        💡 Appui long sur une parcelle pour la supprimer
      </Text>

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1a0d' },
  loading: { color: '#fff', textAlign: 'center', marginTop: 40 },
  headerCard: {
    backgroundColor: '#1a2e1a', padding: 16, margin: 12, borderRadius: 8,
  },
  fournisseurNom: { color: '#d4a04a', fontSize: 18, fontWeight: 'bold' },
  fournisseurInfo: { color: '#8a9a8a', marginTop: 4 },
  btnAjouter: {
    backgroundColor: '#7ec87e', padding: 14, marginHorizontal: 12, borderRadius: 8,
    alignItems: 'center', marginBottom: 12,
  },
  btnAjouterText: { color: '#0d1a0d', fontWeight: 'bold' },
  sectionTitle: {
    color: '#a8d9a8', fontSize: 12, fontWeight: 'bold',
    marginHorizontal: 16, marginTop: 8, marginBottom: 8, letterSpacing: 1,
  },
  emptyCard: {
    backgroundColor: '#1a2e1a', padding: 24, marginHorizontal: 12, borderRadius: 8,
    alignItems: 'center',
  },
  emptyText: { color: '#c8d4c8', textAlign: 'center' },
  emptyHint: { color: '#8a9a8a', fontSize: 12, marginTop: 8, textAlign: 'center' },
  parcelleCard: {
    backgroundColor: '#1a2e1a', padding: 12, marginHorizontal: 12, marginBottom: 8,
    borderRadius: 8,
  },
  parcelleHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  parcelleNom: { color: '#fff', fontSize: 15, fontWeight: '600' },
  parcelleInfo: { color: '#c8d4c8', fontSize: 13, marginTop: 2 },
  parcelleGps: { color: '#8a9a8a', fontSize: 11, marginTop: 2 },
  bioPastille: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginLeft: 8,
  },
  bioPastilleText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  btnConversion: {
    backgroundColor: '#2d7a2d', padding: 10, borderRadius: 6,
    alignItems: 'center', marginTop: 10,
  },
  btnConversionText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  hintBottom: {
    color: '#5a6a5a', fontSize: 11, textAlign: 'center',
    marginTop: 16, marginHorizontal: 16, fontStyle: 'italic',
  },
});