// screens/ParcelleProducteurFormScreen.js
// Formulaire création/édition parcelle producteur SCI — Phase 3 Session 9a
//
// Usage :
//   navigation.navigate('ParcelleProducteurForm', { fournisseurId: 5 })
//   navigation.navigate('ParcelleProducteurForm', { parcelleId: 12, fournisseurId: 5 })

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Modal,
} from 'react-native';
import * as Location from 'expo-location';
import {
  creerParcelleProducteur, updateParcelleProducteur, supprimerParcelleProducteur,
  getParcelleProducteur, getProducteurSCI,
  getStatutConversionLabel, getStatutConversionColor,
  STATUTS_CONVERSION_BIO,
} from '../database/sci';

export default function ParcelleProducteurFormScreen({ route, navigation }) {
  const { parcelleId, fournisseurId } = route.params;
  const isEdition = !!parcelleId;

  const [producteur, setProducteur] = useState(null);

  const [nomParcelle, setNomParcelle] = useState('');
  const [culturePrincipale, setCulturePrincipale] = useState('');
  const [superficieHa, setSuperficieHa] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [altitude, setAltitude] = useState('');
  const [zoneCode, setZoneCode] = useState('');
  const [commune, setCommune] = useState('');
  const [district, setDistrict] = useState('');
  const [region, setRegion] = useState('');
  const [anneePlantation, setAnneePlantation] = useState('');
  const [typeSol, setTypeSol] = useState('');
  const [accesEau, setAccesEau] = useState('');
  const [historiqueIntrants, setHistoriqueIntrants] = useState('');
  const [proximiteConv, setProximiteConv] = useState(false);
  const [distancePollution, setDistancePollution] = useState('');
  const [statutConversion, setStatutConversion] = useState('non_engage');
  const [dateDebutConversion, setDateDebutConversion] = useState('');
  const [notes, setNotes] = useState('');

  const [showConversionModal, setShowConversionModal] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  useEffect(() => {
    setProducteur(getProducteurSCI(fournisseurId));

    if (isEdition) {
      const p = getParcelleProducteur(parcelleId);
      if (p) {
        setNomParcelle(p.nom_parcelle || '');
        setCulturePrincipale(p.culture_principale || '');
        setSuperficieHa(p.superficie_ha?.toString() || '');
        setLatitude(p.latitude?.toString() || '');
        setLongitude(p.longitude?.toString() || '');
        setAltitude(p.altitude_m?.toString() || '');
        setZoneCode(p.zone_collecte_code || '');
        setCommune(p.commune || '');
        setDistrict(p.district || '');
        setRegion(p.region || '');
        setAnneePlantation(p.annee_plantation?.toString() || '');
        setTypeSol(p.type_sol || '');
        setAccesEau(p.acces_eau || '');
        setHistoriqueIntrants(p.historique_intrants || '');
        setProximiteConv(p.proximite_parcelle_conventionnelle === 1);
        setDistancePollution(p.distance_pollution_m?.toString() || '');
        setStatutConversion(p.statut_conversion_bio || 'non_engage');
        setDateDebutConversion(p.date_debut_conversion || '');
        setNotes(p.notes || '');
      }
    } else {
      // Pré-remplir zone depuis le producteur
      const p = getProducteurSCI(fournisseurId);
      if (p?.zone_collecte_code) {
        setZoneCode(p.zone_collecte_code);
      }
    }
  }, [parcelleId, fournisseurId]);

  const captureGPS = async () => {
    try {
      setGpsLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Active la géolocalisation pour capturer les coordonnées GPS.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLatitude(loc.coords.latitude.toFixed(6));
      setLongitude(loc.coords.longitude.toFixed(6));
      if (loc.coords.altitude) {
        setAltitude(Math.round(loc.coords.altitude).toString());
      }
      Alert.alert('✅ GPS capturé', `Lat ${loc.coords.latitude.toFixed(5)}, Lng ${loc.coords.longitude.toFixed(5)}`);
    } catch (e) {
      Alert.alert('Erreur GPS', 'Capture impossible : ' + e.message);
    } finally {
      setGpsLoading(false);
    }
  };

  const validate = () => {
    if (!nomParcelle.trim()) {
      Alert.alert('Champ manquant', 'Le nom de la parcelle est requis');
      return false;
    }
    if (latitude && isNaN(parseFloat(latitude))) {
      Alert.alert('Format invalide', 'Latitude doit être un nombre');
      return false;
    }
    if (longitude && isNaN(parseFloat(longitude))) {
      Alert.alert('Format invalide', 'Longitude doit être un nombre');
      return false;
    }
    if (superficieHa && isNaN(parseFloat(superficieHa))) {
      Alert.alert('Format invalide', 'Superficie doit être un nombre');
      return false;
    }
    return true;
  };

  const handleSave = () => {
    if (!validate()) return;
    try {
      const data = {
        nom_parcelle: nomParcelle.trim(),
        culture_principale: culturePrincipale.trim() || null,
        superficie_ha: superficieHa ? parseFloat(superficieHa) : null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        altitude_m: altitude ? parseInt(altitude) : null,
        zone_collecte_code: zoneCode.trim() || null,
        commune: commune.trim() || null,
        district: district.trim() || null,
        region: region.trim() || null,
        annee_plantation: anneePlantation ? parseInt(anneePlantation) : null,
        type_sol: typeSol.trim() || null,
        acces_eau: accesEau.trim() || null,
        historique_intrants: historiqueIntrants.trim() || null,
        proximite_parcelle_conventionnelle: proximiteConv ? 1 : 0,
        distance_pollution_m: distancePollution ? parseInt(distancePollution) : null,
        statut_conversion_bio: statutConversion,
        date_debut_conversion: dateDebutConversion || null,
        notes: notes.trim() || null,
      };

      if (isEdition) {
        updateParcelleProducteur(parcelleId, data);
        Alert.alert('✅ Modifié', 'Parcelle mise à jour');
      } else {
        creerParcelleProducteur({ fournisseur_id: fournisseurId, ...data });
        Alert.alert('✅ Créé', 'Parcelle enregistrée');
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Erreur', 'Sauvegarde échouée : ' + e.message);
    }
  };

  const handleDelete = () => {
    if (!isEdition) return;
    Alert.alert('Supprimer cette parcelle ?', 'La parcelle sera désactivée.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: () => { supprimerParcelleProducteur(parcelleId); navigation.goBack(); },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{isEdition ? '✏️ Modifier parcelle' : '➕ Nouvelle parcelle'}</Text>

      {producteur && (
        <View style={styles.banner}>
          <Text style={styles.bannerLabel}>Producteur</Text>
          <Text style={styles.bannerValue}>{producteur.nom}</Text>
        </View>
      )}

      <View style={styles.field}>
        <Text style={styles.label}>Nom de la parcelle *</Text>
        <TextInput
          style={styles.input}
          value={nomParcelle}
          onChangeText={setNomParcelle}
          placeholder="Ex : Vanilleraie Sud"
          placeholderTextColor="#5a7a5a"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Culture principale</Text>
        <TextInput
          style={styles.input}
          value={culturePrincipale}
          onChangeText={setCulturePrincipale}
          placeholder="Ex : Vanille, Café Arabica, Cacao"
          placeholderTextColor="#5a7a5a"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Superficie (hectares)</Text>
        <TextInput
          style={styles.input}
          value={superficieHa}
          onChangeText={setSuperficieHa}
          placeholder="Ex : 1.5"
          keyboardType="decimal-pad"
          placeholderTextColor="#5a7a5a"
        />
      </View>

      {/* GPS */}
      <Text style={styles.sectionTitle}>📍 Localisation GPS</Text>
      <Text style={styles.sectionHint}>Obligatoire pour BIO + Fairtrade + Rainforest Alliance</Text>

      <TouchableOpacity style={styles.btnGps} onPress={captureGPS} disabled={gpsLoading}>
        <Text style={styles.btnGpsText}>
          {gpsLoading ? '📡 Capture en cours…' : '📡 Capturer position actuelle'}
        </Text>
      </TouchableOpacity>

      <View style={styles.gpsRow}>
        <View style={styles.gpsCol}>
          <Text style={styles.label}>Latitude</Text>
          <TextInput
            style={styles.input}
            value={latitude}
            onChangeText={setLatitude}
            placeholder="-18.123456"
            keyboardType="default"
            placeholderTextColor="#5a7a5a"
          />
        </View>
        <View style={styles.gpsCol}>
          <Text style={styles.label}>Longitude</Text>
          <TextInput
            style={styles.input}
            value={longitude}
            onChangeText={setLongitude}
            placeholder="47.123456"
            keyboardType="default"
            placeholderTextColor="#5a7a5a"
          />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Altitude (m)</Text>
        <TextInput
          style={styles.input}
          value={altitude}
          onChangeText={setAltitude}
          placeholder="Ex : 850"
          keyboardType="number-pad"
          placeholderTextColor="#5a7a5a"
        />
      </View>

      {/* Localisation administrative */}
      <Text style={styles.sectionTitle}>🗺️ Localisation administrative</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Zone de collecte</Text>
        <TextInput
          style={styles.input}
          value={zoneCode}
          onChangeText={setZoneCode}
          placeholder="Ex : ANJ (Analanjirofo), SBR (Sambirano)"
          placeholderTextColor="#5a7a5a"
          autoCapitalize="characters"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Commune</Text>
        <TextInput style={styles.input} value={commune} onChangeText={setCommune} placeholderTextColor="#5a7a5a" />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>District</Text>
        <TextInput style={styles.input} value={district} onChangeText={setDistrict} placeholderTextColor="#5a7a5a" />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Région</Text>
        <TextInput style={styles.input} value={region} onChangeText={setRegion} placeholderTextColor="#5a7a5a" />
      </View>

      {/* Caractéristiques agronomiques */}
      <Text style={styles.sectionTitle}>🌱 Caractéristiques</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Année de plantation</Text>
        <TextInput
          style={styles.input}
          value={anneePlantation}
          onChangeText={setAnneePlantation}
          placeholder="Ex : 2018"
          keyboardType="number-pad"
          placeholderTextColor="#5a7a5a"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Type de sol</Text>
        <TextInput
          style={styles.input}
          value={typeSol}
          onChangeText={setTypeSol}
          placeholder="Ex : ferralitique, alluvial, tanety"
          placeholderTextColor="#5a7a5a"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Accès à l'eau</Text>
        <TextInput
          style={styles.input}
          value={accesEau}
          onChangeText={setAccesEau}
          placeholder="Pluvial, source, irrigation, bassin"
          placeholderTextColor="#5a7a5a"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Historique intrants (avant SCI)</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={historiqueIntrants}
          onChangeText={setHistoriqueIntrants}
          placeholder="Pesticides utilisés avant adhésion, dates dernière application…"
          placeholderTextColor="#5a7a5a"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* Évaluation des risques */}
      <Text style={styles.sectionTitle}>⚠️ Évaluation des risques</Text>

      <TouchableOpacity style={styles.checkbox} onPress={() => setProximiteConv(!proximiteConv)}>
        <Text style={styles.checkboxIcon}>{proximiteConv ? '☑' : '☐'}</Text>
        <Text style={styles.checkboxLabel}>Parcelle conventionnelle voisine (risque dérive)</Text>
      </TouchableOpacity>

      {proximiteConv && (
        <View style={styles.field}>
          <Text style={styles.label}>Distance source pollution (m)</Text>
          <TextInput
            style={styles.input}
            value={distancePollution}
            onChangeText={setDistancePollution}
            placeholder="Ex : 50"
            keyboardType="number-pad"
            placeholderTextColor="#5a7a5a"
          />
          <Text style={styles.hint}>
            Bandes tampons recommandées : 5m mini BIO, 30m près cours d'eau
          </Text>
        </View>
      )}

      {/* Conversion BIO */}
      <Text style={styles.sectionTitle}>🌱 Statut conversion BIO</Text>

      <TouchableOpacity
        style={[styles.selector, { borderLeftColor: getStatutConversionColor(statutConversion), borderLeftWidth: 3 }]}
        onPress={() => setShowConversionModal(true)}
      >
        <Text style={[styles.selectorValue, { color: getStatutConversionColor(statutConversion) }]}>
          {getStatutConversionLabel(statutConversion)}
        </Text>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      {(statutConversion !== 'non_engage' && statutConversion !== 'sortie') && (
        <View style={[styles.field, { marginTop: 12 }]}>
          <Text style={styles.label}>Date de début de conversion</Text>
          <TextInput
            style={styles.input}
            value={dateDebutConversion}
            onChangeText={setDateDebutConversion}
            placeholder="AAAA-MM-JJ"
            placeholderTextColor="#5a7a5a"
          />
          <Text style={styles.hint}>
            Délais BIO : 24 mois cultures annuelles · 36 mois cultures pérennes
          </Text>
        </View>
      )}

      {/* Notes */}
      <View style={styles.field}>
        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Observations, contexte particulier…"
          placeholderTextColor="#5a7a5a"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* Actions */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>{isEdition ? '💾 Enregistrer' : '➕ Créer la parcelle'}</Text>
      </TouchableOpacity>

      {isEdition && (
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>🗑️ Supprimer</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 40 }} />

      {/* Modal conversion */}
      <Modal visible={showConversionModal} transparent animationType="slide" onRequestClose={() => setShowConversionModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Statut conversion BIO</Text>
            {STATUTS_CONVERSION_BIO.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.modalItem, statutConversion === s && styles.modalItemSelected]}
                onPress={() => { setStatutConversion(s); setShowConversionModal(false); }}
              >
                <View style={[styles.modalDot, { backgroundColor: getStatutConversionColor(s) }]} />
                <Text style={styles.modalItemText}>{getStatutConversionLabel(s)}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.btnClose} onPress={() => setShowConversionModal(false)}>
              <Text style={styles.btnCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a2e1a' },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#7ec87e', marginBottom: 16 },

  banner: {
    backgroundColor: '#243d24',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#7ec87e',
  },
  bannerLabel: { fontSize: 11, color: '#7a9a7a', textTransform: 'uppercase', marginBottom: 4 },
  bannerValue: { fontSize: 16, color: '#fff', fontWeight: '600' },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7ec87e',
    marginTop: 20,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 11,
    color: '#7a9a7a',
    fontStyle: 'italic',
    marginBottom: 8,
  },

  field: { marginBottom: 14 },
  label: { fontSize: 13, color: '#a8c8a8', fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: '#243d24',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#3a5a3a',
  },
  textarea: { minHeight: 70 },
  hint: {
    fontSize: 11,
    color: '#7a9a7a',
    fontStyle: 'italic',
    marginTop: 4,
  },

  // GPS
  btnGps: {
    backgroundColor: '#1f3a1f',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#7ec87e',
  },
  btnGpsText: { color: '#7ec87e', fontWeight: '600' },
  gpsRow: { flexDirection: 'row', gap: 8 },
  gpsCol: { flex: 1 },

  // Selector
  selector: {
    backgroundColor: '#243d24',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#3a5a3a',
  },
  selectorValue: { fontSize: 15, fontWeight: '600' },
  chevron: { fontSize: 22, color: '#7ec87e' },

  // Checkbox
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
    marginBottom: 4,
  },
  checkboxIcon: { fontSize: 22, color: '#7ec87e' },
  checkboxLabel: { fontSize: 14, color: '#fff', flex: 1 },

  // Buttons
  saveButton: {
    backgroundColor: '#7ec87e',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: { fontSize: 16, color: '#1a2e1a', fontWeight: 'bold' },
  deleteButton: {
    backgroundColor: 'transparent',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#cc4444',
  },
  deleteButtonText: { fontSize: 14, color: '#cc4444', fontWeight: '600' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a2e1a',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '80%',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#7ec87e', marginBottom: 12 },
  modalItem: {
    backgroundColor: '#243d24',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalItemSelected: { borderWidth: 2, borderColor: '#7ec87e' },
  modalDot: { width: 12, height: 12, borderRadius: 6 },
  modalItemText: { fontSize: 14, color: '#fff', fontWeight: '500' },
  btnClose: {
    marginTop: 12,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#3a5a3a',
    borderRadius: 8,
  },
  btnCloseText: { color: '#7ec87e', fontWeight: '600' },
});