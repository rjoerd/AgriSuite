// screens/ProducteurParcelleFormScreen.js
// Saisie d'une parcelle producteur (filière B SCI)
// Champs minimum + GPS automatique ou manuel

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import * as SQLite from 'expo-sqlite';
import * as Location from 'expo-location';

const db = SQLite.openDatabaseSync('certifpilot.db');

export default function ProducteurParcelleFormScreen({ route, navigation }) {
  const { fournisseurId, parcelleId } = route.params;
  const isEdit = !!parcelleId;

  const [nomParcelle, setNomParcelle] = useState('');
  const [superficieHa, setSuperficieHa] = useState('');
  const [culturePrincipale, setCulturePrincipale] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [zoneCollecteCode, setZoneCollecteCode] = useState('');
  const [notes, setNotes] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);

  useEffect(() => {
    if (isEdit) loadParcelle();
    else loadFournisseurZone();
  }, []);

  function loadParcelle() {
    const p = db.getFirstSync(
      'SELECT * FROM parcelles_producteur WHERE id = ?',
      [parcelleId]
    );
    if (p) {
      setNomParcelle(p.nom_parcelle || '');
      setSuperficieHa(p.superficie_ha?.toString() || '');
      setCulturePrincipale(p.culture_principale || '');
      setLatitude(p.latitude?.toString() || '');
      setLongitude(p.longitude?.toString() || '');
      setZoneCollecteCode(p.zone_collecte_code || '');
      setNotes(p.notes || '');
    }
  }

  function loadFournisseurZone() {
    // Pré-remplir la zone collecte depuis le fournisseur
    const f = db.getFirstSync(
      'SELECT zone_collecte_code FROM fournisseurs WHERE id = ?',
      [fournisseurId]
    );
    if (f?.zone_collecte_code) setZoneCollecteCode(f.zone_collecte_code);
  }

  async function captureGPS() {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('❌', 'Permission GPS refusée');
        setGpsLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLatitude(loc.coords.latitude.toFixed(6));
      setLongitude(loc.coords.longitude.toFixed(6));
      Alert.alert('✅ GPS', `Position capturée\n±${Math.round(loc.coords.accuracy)} m`);
    } catch (e) {
      Alert.alert('❌ GPS', e.message);
    } finally {
      setGpsLoading(false);
    }
  }

  function handleSave() {
    if (!nomParcelle.trim()) {
      Alert.alert('Erreur', 'Nom de parcelle requis');
      return;
    }

    const lat = latitude ? parseFloat(latitude) : null;
    const lon = longitude ? parseFloat(longitude) : null;
    const surf = superficieHa ? parseFloat(superficieHa) : null;

    // Validation GPS
    if (lat !== null && (isNaN(lat) || lat < -90 || lat > 90)) {
      Alert.alert('Erreur', 'Latitude invalide (-90 à 90)');
      return;
    }
    if (lon !== null && (isNaN(lon) || lon < -180 || lon > 180)) {
      Alert.alert('Erreur', 'Longitude invalide (-180 à 180)');
      return;
    }

    try {
      if (isEdit) {
        db.runSync(
          `UPDATE parcelles_producteur 
           SET nom_parcelle = ?, superficie_ha = ?, culture_principale = ?,
               latitude = ?, longitude = ?, zone_collecte_code = ?, notes = ?
           WHERE id = ?`,
          [nomParcelle.trim(), surf, culturePrincipale.trim() || null,
           lat, lon, zoneCollecteCode || null, notes.trim() || null, parcelleId]
        );
      } else {
        db.runSync(
          `INSERT INTO parcelles_producteur 
           (fournisseur_id, nom_parcelle, superficie_ha, culture_principale,
            latitude, longitude, zone_collecte_code, notes, statut_conversion_bio)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'non_engage')`,
          [fournisseurId, nomParcelle.trim(), surf, culturePrincipale.trim() || null,
           lat, lon, zoneCollecteCode || null, notes.trim() || null]
        );
      }
      Alert.alert('✅', isEdit ? 'Parcelle modifiée' : 'Parcelle créée');
      navigation.goBack();
    } catch (e) {
      Alert.alert('❌ Erreur', e.message);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Identité</Text>

        <Text style={styles.label}>Nom de la parcelle *</Text>
        <TextInput
          style={styles.input}
          value={nomParcelle}
          onChangeText={setNomParcelle}
          placeholder="Ex: Parcelle Nord, Tanim-bary 1..."
          placeholderTextColor="#5a6a5a"
        />

        <Text style={styles.label}>Superficie (ha)</Text>
        <TextInput
          style={styles.input}
          value={superficieHa}
          onChangeText={setSuperficieHa}
          placeholder="0.5"
          placeholderTextColor="#5a6a5a"
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>Culture principale</Text>
        <TextInput
          style={styles.input}
          value={culturePrincipale}
          onChangeText={setCulturePrincipale}
          placeholder="Ex: vanille, girofle, café..."
          placeholderTextColor="#5a6a5a"
        />

        <Text style={styles.label}>Zone de collecte</Text>
        <TextInput
          style={styles.input}
          value={zoneCollecteCode}
          onChangeText={setZoneCollecteCode}
          placeholder="Ex: ATS, ANJ, SBR..."
          placeholderTextColor="#5a6a5a"
          autoCapitalize="characters"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📍 Géolocalisation</Text>

        <TouchableOpacity
          style={styles.btnGPS}
          onPress={captureGPS}
          disabled={gpsLoading}
        >
          {gpsLoading ? (
            <ActivityIndicator color="#1a2e1a" />
          ) : (
            <Text style={styles.btnGPSText}>📍 Capturer position actuelle</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.hintText}>Ou saisie manuelle :</Text>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Latitude</Text>
            <TextInput
              style={styles.input}
              value={latitude}
              onChangeText={setLatitude}
              placeholder="-14.27"
              placeholderTextColor="#5a6a5a"
              keyboardType="numbers-and-punctuation"
            />
          </View>
          <View style={{ width: 8 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Longitude</Text>
            <TextInput
              style={styles.input}
              value={longitude}
              onChangeText={setLongitude}
              placeholder="50.17"
              placeholderTextColor="#5a6a5a"
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notes</Text>
        <TextInput
          style={[styles.input, { height: 80 }]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Voisinage, accès eau, observations..."
          placeholderTextColor="#5a6a5a"
          multiline
        />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.btnCancel} onPress={() => navigation.goBack()}>
          <Text style={styles.btnCancelText}>Annuler</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSave} onPress={handleSave}>
          <Text style={styles.btnSaveText}>{isEdit ? 'Enregistrer' : '+ Créer'}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a2e1a' },
  section: {
    backgroundColor: '#243d24', padding: 16, margin: 12, borderRadius: 8,
  },
  sectionTitle: { color: '#7ec87e', fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
  label: { color: '#c8d4c8', fontSize: 12, marginTop: 10, marginBottom: 4 },
  input: {
    backgroundColor: '#0f1f0f', color: '#fff', padding: 12, borderRadius: 6,
    borderWidth: 1, borderColor: '#3a5a3a',
  },
  row: { flexDirection: 'row' },
  btnGPS: {
    backgroundColor: '#7ec87e', padding: 14, borderRadius: 8,
    alignItems: 'center', marginVertical: 8,
  },
  btnGPSText: { color: '#1a2e1a', fontWeight: 'bold' },
  hintText: { color: '#8a9a8a', fontSize: 11, marginTop: 8, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, marginTop: 8 },
  btnCancel: {
    flex: 1, padding: 14, borderRadius: 8, alignItems: 'center',
    borderWidth: 1, borderColor: '#5a5a5a',
  },
  btnCancelText: { color: '#aaa' },
  btnSave: {
    flex: 2, backgroundColor: '#d4a04a', padding: 14, borderRadius: 8, alignItems: 'center',
  },
  btnSaveText: { color: '#1a2e1a', fontWeight: 'bold' },
});