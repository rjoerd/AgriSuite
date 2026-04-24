import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, ScrollView, Modal, TextInput
} from 'react-native';
import MapView, { Polygon, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { insertParcelle, getParcellesBySite, deleteParcelle } from '../database/db';


// Calcul superficie polygone (formule de Shoelace en mètres)
function calculerSuperficie(coords) {
  if (coords.length < 3) return 0;
  const toRad = (deg) => deg * Math.PI / 180;
  const R = 6371000;

  let aire = 0;
  const n = coords.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;

    const xi = toRad(coords[i].longitude) * Math.cos(toRad(coords[i].latitude)) * R;
    const yi = toRad(coords[i].latitude) * R;
    const xj = toRad(coords[j].longitude) * Math.cos(toRad(coords[j].latitude)) * R;
    const yj = toRad(coords[j].latitude) * R;

    aire += (xi * yj) - (xj * yi);
  }

  return Math.abs(aire / 2);
}

function formatSuperficie(m2) {
  if (m2 < 1000) return `${Math.round(m2)} m²`;
  return `${(m2 / 10000).toFixed(4)} ha`;
}

export default function ParcelleMapScreen({ route }) {
  const { siteId, siteCode } = route.params;

  const [points, setPoints] = useState([]);
  const [mode, setMode] = useState('idle');
const [saisieMode, setSaisieMode] = useState(null); // 'gps' | 'bureau'// idle | releve | termine
  const [position, setPosition] = useState(null);
  const [parcelles, setParcelles] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [nomParcelle, setNomParcelle] = useState('');
  const [permissionOk, setPermissionOk] = useState(false);
  const mapRef = useRef(null);
  const locationSub = useRef(null);

  useEffect(() => {
    demanderPermission();
    chargerParcelles();
    return () => arreterSuivi();
  }, []);

  async function demanderPermission() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', "L'accès au GPS est nécessaire pour relever les parcelles.");
      return;
    }
    setPermissionOk(true);
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const pos = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    setPosition(pos);
    mapRef.current?.animateToRegion({
      ...pos,
      latitudeDelta: 0.002,
      longitudeDelta: 0.002,
    }, 1000);
  }

  function chargerParcelles() {
    setParcelles(getParcellesBySite(siteId).map(p => ({
      ...p,
      coordonnees: JSON.parse(p.coordonnees),
    })));
  }

  async function demarrerReleveGPS() {
  if (!permissionOk) { await demanderPermission(); return; }
  setPoints([]);
  setSaisieMode('gps');
  setMode('releve');
  locationSub.current = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 1 },
    (loc) => {
      setPosition({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    }
  );
}

function demarrerReleveBureau() {
  setPoints([]);
  setSaisieMode('bureau');
  setMode('releve');
}

  function ajouterPoint() {
    if (!position) return;
    setPoints(prev => [...prev, { ...position }]);
  }

  function annulerDernierPoint() {
    setPoints(prev => prev.slice(0, -1));
  }

  function arreterSuivi() {
    if (locationSub.current) {
      locationSub.current.remove();
      locationSub.current = null;
    }
  }

function handleMapPress(e) {
  if (mode !== 'releve' || saisieMode !== 'bureau') return;
  // Extraire la coordonnée immédiatement avant que React recycle l'événement
  const coordinate = e?.nativeEvent?.coordinate;
  if (!coordinate) return;
  const point = { latitude: coordinate.latitude, longitude: coordinate.longitude };
  setPoints(prev => [...prev, point]);
}

  function terminerReleve() {
    if (points.length < 3) {
      Alert.alert('Minimum 3 points', 'Enregistrez au moins 3 points pour délimiter une parcelle.');
      return;
    }
    arreterSuivi();
    setMode('termine');
  }

  function sauvegarderParcelle() {
    const superficie = calculerSuperficie(points);
    const nom = nomParcelle.trim() || `Parcelle ${parcelles.length + 1}`;
    insertParcelle({
      site_id: siteId,
      nom,
      coordonnees: points,
      superficie_m2: superficie,
      date_releve: new Date().toISOString().split('T')[0],
    });
    chargerParcelles();
    setPoints([]);
    setMode('idle');
    setModalVisible(false);
    setNomParcelle('');
  }

  function annulerReleve() {
    arreterSuivi();
    setPoints([]);
    setMode('idle');
  }

  function supprimerParcelle(id, nom) {
    Alert.alert(
      'Supprimer la parcelle',
      `Supprimer "${nom}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => {
          deleteParcelle(id);
          chargerParcelles();
        }},
      ]
    );
  }

  const superficie = calculerSuperficie(points);

  return (
    <SafeAreaView style={styles.container}>
      {/* Carte */}
      <MapView
  ref={mapRef}
  style={styles.map}
  provider={PROVIDER_GOOGLE}
  mapType="satellite"
  showsUserLocation={true}
  onPress={handleMapPress}
  initialRegion={{
    latitude: position?.latitude || -18.9,
    longitude: position?.longitude || 47.5,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  }}
>
        {/* Parcelles sauvegardées */}
        {parcelles.map((p, i) => (
          <Polygon
            key={p.id}
            coordinates={p.coordonnees}
            fillColor="rgba(126,200,126,0.25)"
            strokeColor="#7ec87e"
            strokeWidth={2}
          />
        ))}

        {/* Relevé en cours */}
        {points.length >= 3 && (
          <Polygon
            coordinates={points}
            fillColor="rgba(255,200,50,0.25)"
            strokeColor="#ffc832"
            strokeWidth={2}
          />
        )}
        {points.map((pt, i) => (
          <Marker
            key={i}
            coordinate={pt}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.pointMarker}>
              <Text style={styles.pointMarkerText}>{i + 1}</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Panneau bas */}
      <View style={styles.panel}>

        {/* IDLE */}
        {mode === 'idle' && (
  <>
    <View style={styles.releveButtons}>
      <TouchableOpacity style={styles.btnModeGPS} onPress={demarrerReleveGPS}>
        <Text style={styles.btnPrimaryText}>📍 Mode terrain</Text>
        <Text style={styles.btnModeSubtitle}>GPS en marchant</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btnModeBureau} onPress={demarrerReleveBureau}>
        <Text style={styles.btnPrimaryText}>🖱️ Mode bureau</Text>
        <Text style={styles.btnModeSubtitle}>Tap sur la carte</Text>
      </TouchableOpacity>
    </View>

    {parcelles.length > 0 && (
      <ScrollView style={styles.parcellesList}>
        {parcelles.map(p => (
          <View key={p.id} style={styles.parcelleRow}>
            <View>
              <Text style={styles.parcelleName}>{p.nom}</Text>
              <Text style={styles.parcelleMeta}>
                {formatSuperficie(p.superficie_m2)} · {p.date_releve} · {p.coordonnees.length} points
              </Text>
            </View>
            <TouchableOpacity onPress={() => supprimerParcelle(p.id, p.nom)}>
              <Text style={styles.deleteIcon}>🗑️</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    )}

    {parcelles.length === 0 && (
      <Text style={styles.emptyText}>Aucune parcelle relevée pour {siteCode}</Text>
    )}
  </>
)}

        {/* RELEVÉ EN COURS */}
        {mode === 'releve' && (
  <>
    <View style={styles.releveHeader}>
      <Text style={styles.releveTitle}>
        {saisieMode === 'bureau' ? '🖱️' : '📍'} {points.length} point{points.length > 1 ? 's' : ''}
      </Text>
      {points.length >= 3 && (
        <Text style={styles.superficieText}>≈ {formatSuperficie(superficie)}</Text>
      )}
    </View>
    <Text style={styles.releveInstruction}>
      {saisieMode === 'bureau'
        ? 'Tapez sur la carte pour poser les points du périmètre.'
        : 'Déplacez-vous jusqu\'au prochain angle, puis tapez "Ajouter point".'}
    </Text>
    <View style={styles.releveButtons}>
      <TouchableOpacity
        style={styles.btnSecondary}
        onPress={annulerDernierPoint}
        disabled={points.length === 0}
      >
        <Text style={[styles.btnSecondaryText, points.length === 0 && { opacity: 0.4 }]}>↩ Annuler</Text>
      </TouchableOpacity>
      {saisieMode === 'gps' && (
        <TouchableOpacity style={styles.btnPrimary} onPress={ajouterPoint}>
          <Text style={styles.btnPrimaryText}>+ Ajouter point</Text>
        </TouchableOpacity>
      )}
    </View>
    <View style={styles.releveButtons}>
      <TouchableOpacity style={styles.btnDanger} onPress={annulerReleve}>
        <Text style={styles.btnDangerText}>✕ Annuler tout</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.btnSuccess, points.length < 3 && { opacity: 0.4 }]}
        onPress={terminerReleve}
        disabled={points.length < 3}
      >
        <Text style={styles.btnSuccessText}>✓ Terminer</Text>
      </TouchableOpacity>
    </View>
  </>
)}

        {/* TERMINÉ — confirmation */}
        {mode === 'termine' && (
          <>
            <Text style={styles.releveTitle}>
              ✅ Parcelle relevée — {points.length} points — {formatSuperficie(superficie)}
            </Text>
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.btnPrimaryText}>💾 Sauvegarder cette parcelle</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnDanger} onPress={annulerReleve}>
              <Text style={styles.btnDangerText}>✕ Recommencer</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Modal nom de parcelle */}
      <Modal visible={modalVisible} transparent animationType="slide">
  <View style={styles.modalOverlay}>
    <View style={styles.modalBox}>
      <Text style={styles.modalTitle}>Nom de la parcelle</Text>
      <Text style={styles.modalSub}>{formatSuperficie(superficie)} · {points.length} points</Text>
      <TextInput
        style={styles.modalTextInput}
        placeholder={`Parcelle ${parcelles.length + 1}`}
        placeholderTextColor="#5a7a5a"
        value={nomParcelle}
        onChangeText={setNomParcelle}
        autoFocus
      />
      <TouchableOpacity
        style={styles.btnPrimary}
        onPress={sauvegarderParcelle}
      >
        <Text style={styles.btnPrimaryText}>✅ Enregistrer</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.btnDanger}
        onPress={() => setModalVisible(false)}
      >
        <Text style={styles.btnDangerText}>Annuler</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a2e1a' },
  map: { flex: 1 },
  panel: {
    backgroundColor: '#1a2e1a',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#3a5a3a',
    maxHeight: 280,
  },
  btnModeGPS: { flex: 1, backgroundColor: '#7ec87e', borderRadius: 10, padding: 12, alignItems: 'center', marginRight: 8 },
btnModeBureau: { flex: 1, backgroundColor: '#4a7a8a', borderRadius: 10, padding: 12, alignItems: 'center' },
btnModeSubtitle: { color: '#1a2e1a', fontSize: 11, marginTop: 2, opacity: 0.8 },
  btnPrimary: { backgroundColor: '#7ec87e', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 8 },
  btnPrimaryText: { color: '#1a2e1a', fontWeight: 'bold', fontSize: 15 },
  btnSecondary: { flex: 1, borderWidth: 1, borderColor: '#7ec87e', borderRadius: 10, padding: 12, alignItems: 'center', marginRight: 8 },
  btnSecondaryText: { color: '#7ec87e', fontSize: 14 },
  btnDanger: { flex: 1, borderWidth: 1, borderColor: '#8b2020', borderRadius: 10, padding: 12, alignItems: 'center' },
  btnDangerText: { color: '#e07070', fontSize: 14 },
  btnSuccess: { flex: 1, backgroundColor: '#2d7a2d', borderRadius: 10, padding: 12, alignItems: 'center', marginLeft: 8 },
  btnSuccessText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  releveHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  releveTitle: { color: '#7ec87e', fontWeight: 'bold', fontSize: 15, marginBottom: 6 },
  superficieText: { color: '#ffc832', fontWeight: 'bold', fontSize: 15 },
  releveInstruction: { color: '#8aaa8a', fontSize: 13, marginBottom: 10 },
  releveButtons: { flexDirection: 'row', marginBottom: 8 },
  parcellesList: { marginTop: 8 },
  parcelleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#3a5a3a' },
  parcelleName: { color: '#c8e6c8', fontWeight: '600', fontSize: 14 },
  parcelleMeta: { color: '#7a9a7a', fontSize: 12, marginTop: 2 },
  deleteIcon: { fontSize: 18 },
  emptyText: { color: '#5a7a5a', textAlign: 'center', marginTop: 12, fontSize: 14 },
  pointMarker: { backgroundColor: '#ffc832', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  pointMarkerText: { color: '#1a2e1a', fontWeight: 'bold', fontSize: 11 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#243d24', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { color: '#7ec87e', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  modalSub: { color: '#8aaa8a', fontSize: 14, marginBottom: 20 },
  modalTextInput: {
  backgroundColor: '#1a2e1a',
  borderRadius: 10,
  borderWidth: 1,
  borderColor: '#3a5a3a',
  color: '#c8e6c8',
  padding: 12,
  fontSize: 15,
  marginBottom: 16,
},
});