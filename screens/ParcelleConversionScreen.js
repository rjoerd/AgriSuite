// screens/ParcelleConversionScreen.js
// Gestion conversion BIO d'une parcelle producteur

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, Modal,
} from 'react-native';
import * as SQLite from 'expo-sqlite';
import {
  calculerStatutConversion, demarrerConversion, certifierParcelle,
  annulerConversion, COULEURS_STATUT, LIBELLES_STATUT,
} from '../database/conversionBio';

const db = SQLite.openDatabaseSync('agrisuite.db');

export default function ParcelleConversionScreen({ route, navigation }) {
  const { parcelleId } = route.params;
  const [parcelle, setParcelle] = useState(null);
  const [calc, setCalc] = useState(null);
  const [modalDemarrer, setModalDemarrer] = useState(false);
  const [modalCertifier, setModalCertifier] = useState(false);
  const [modalIntrant, setModalIntrant] = useState(false);

  // Form démarrage
  const [dateDebut, setDateDebut] = useState(new Date().toISOString().split('T')[0]);
  const [typeCulture, setTypeCulture] = useState('annuelle');
  const [notes, setNotes] = useState('');

  // Form certification
  const [dateCertif, setDateCertif] = useState(new Date().toISOString().split('T')[0]);
  const [organisme, setOrganisme] = useState('Ecocert');
  const [numeroCertif, setNumeroCertif] = useState('');

  // Form intrant interdit
  const [dateIntrantInterdit, setDateIntrantInterdit] = useState('');

  useEffect(() => { loadParcelle(); }, []);

  function loadParcelle() {
    const p = db.getFirstSync(
      'SELECT * FROM parcelles_producteur WHERE id = ?',
      [parcelleId]
    );
    if (p) {
      setParcelle(p);
      const c = calculerStatutConversion(p.date_debut_conversion, p.type_culture_aac);
      setCalc(c);
    }
  }

  function handleDemarrer() {
    if (!dateDebut) {
      Alert.alert('Erreur', 'Date de début requise');
      return;
    }
    const result = demarrerConversion(parcelleId, dateDebut, typeCulture, notes);
    if (result.success) {
      Alert.alert('✅ Conversion démarrée', `Statut : ${LIBELLES_STATUT[result.statut]}`);
      setModalDemarrer(false);
      loadParcelle();
    } else {
      Alert.alert('❌ Refusé', result.error);
    }
  }

  function handleCertifier() {
    if (!numeroCertif.trim()) {
      Alert.alert('Erreur', 'Numéro de certificat requis');
      return;
    }
    Alert.alert(
      '✓ Confirmer certification',
      `Marquer cette parcelle comme CERTIFIÉE BIO ?\n\nOrganisme : ${organisme}\nN° : ${numeroCertif}\nDate : ${dateCertif}`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Certifier',
          onPress: () => {
            certifierParcelle(parcelleId, dateCertif, organisme, numeroCertif);
            setModalCertifier(false);
            loadParcelle();
            Alert.alert('✅', 'Parcelle certifiée BIO');
          },
        },
      ]
    );
  }

  function handleAnnuler() {
    Alert.alert(
      '⚠️ Annuler conversion',
      'Cette action remet la parcelle en statut conventionnel. Confirmer ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: () => {
            annulerConversion(parcelleId, 'Annulation manuelle');
            loadParcelle();
          },
        },
      ]
    );
  }

  function handleSaveIntrantInterdit() {
    if (!dateIntrantInterdit) {
      Alert.alert('Erreur', 'Date requise');
      return;
    }
    db.runSync(
      'UPDATE parcelles_producteur SET date_dernier_intrant_interdit = ? WHERE id = ?',
      [dateIntrantInterdit, parcelleId]
    );
    setModalIntrant(false);
    loadParcelle();
    Alert.alert('✅', 'Date enregistrée');
  }

  if (!parcelle || !calc) {
    return <View style={styles.container}><Text style={styles.loading}>Chargement...</Text></View>;
  }

  const couleur = COULEURS_STATUT[calc.statut];
  const libelle = LIBELLES_STATUT[calc.statut];
  const enConversion = calc.statut !== 'non_engage';
  const certifie = calc.statut === 'certifie';
  const dureeRequise = parcelle.type_culture_aac === 'perenne' ? 36 : 24;

  return (
    <ScrollView style={styles.container}>
      {/* Header parcelle */}
      <View style={styles.headerCard}>
        <Text style={styles.parcelleNom}>{parcelle.nom_parcelle || `Parcelle #${parcelle.id}`}</Text>
        <Text style={styles.parcelleInfo}>
          {parcelle.superficie_ha?.toFixed(2) || '?'} ha · {parcelle.culture_principale || 'Culture non définie'}
        </Text>
      </View>

      {/* Statut actuel */}
      <View style={[styles.statutCard, { borderLeftColor: couleur, borderLeftWidth: 6 }]}>
        <Text style={styles.statutLabel}>STATUT CONVERSION BIO</Text>
        <Text style={[styles.statutValue, { color: couleur }]}>{libelle}</Text>

        {enConversion && !certifie && (
          <View style={styles.progressBlock}>
            <Text style={styles.progressText}>
              📅 {calc.moisEcoules} mois écoulés / {dureeRequise} mois requis
            </Text>
            <Text style={styles.progressText}>
              ⏳ {calc.moisRestants} mois restants
            </Text>
            <Text style={styles.progressText}>
              🎯 Certification prévue : {calc.dateCertificationPrevue}
            </Text>
          </View>
        )}

        {certifie && (
          <View style={styles.progressBlock}>
            <Text style={styles.progressText}>📜 Certifiée le : {parcelle.date_certification_bio}</Text>
            <Text style={styles.progressText}>🏛️ Organisme : {parcelle.organisme_certificateur}</Text>
            <Text style={styles.progressText}>🔢 N° : {parcelle.numero_certificat_bio}</Text>
          </View>
        )}
      </View>

      {/* Antécédents intrants */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚫 Antécédents intrants interdits</Text>
        <Text style={styles.sectionInfo}>
          Règlement UE 2018/848 art. 10 : conversion BIO ne peut démarrer qu'à partir de la date du dernier intrant interdit.
        </Text>
        {parcelle.date_dernier_intrant_interdit ? (
          <View style={styles.intrantBlock}>
            <Text style={styles.intrantText}>
              ⚠️ Dernier intrant interdit : {parcelle.date_dernier_intrant_interdit}
            </Text>
            <TouchableOpacity onPress={() => { setDateIntrantInterdit(parcelle.date_dernier_intrant_interdit); setModalIntrant(true); }}>
              <Text style={styles.linkText}>Modifier</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.btnGhost} onPress={() => setModalIntrant(true)}>
            <Text style={styles.btnGhostText}>+ Déclarer un antécédent</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>

        {!enConversion && (
          <TouchableOpacity style={styles.btnPrimary} onPress={() => setModalDemarrer(true)}>
            <Text style={styles.btnPrimaryText}>▶ Démarrer la conversion BIO</Text>
          </TouchableOpacity>
        )}

        {enConversion && !certifie && calc.statut === 'c3' && calc.moisRestants === 0 && (
          <TouchableOpacity style={styles.btnSuccess} onPress={() => setModalCertifier(true)}>
            <Text style={styles.btnPrimaryText}>✓ Marquer certifiée BIO (audit externe validé)</Text>
          </TouchableOpacity>
        )}

        {enConversion && !certifie && calc.statut !== 'c3' && (
          <View style={styles.infoBlock}>
            <Text style={styles.infoText}>
              ℹ️ Certification possible uniquement après {dureeRequise} mois (statut C3 → Certifié)
            </Text>
          </View>
        )}

        {/* Cas C2 annuelle (24 mois requis seulement) - certifiable directement */}
        {enConversion && !certifie && calc.statut === 'c2' && parcelle.type_culture_aac === 'annuelle' && calc.moisRestants === 0 && (
          <TouchableOpacity style={styles.btnSuccess} onPress={() => setModalCertifier(true)}>
            <Text style={styles.btnPrimaryText}>✓ Marquer certifiée BIO (audit externe validé)</Text>
          </TouchableOpacity>
        )}

        {enConversion && (
          <TouchableOpacity style={styles.btnDanger} onPress={handleAnnuler}>
            <Text style={styles.btnDangerText}>⊘ Annuler la conversion</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notes */}
      {parcelle.notes_conversion && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Notes</Text>
          <Text style={styles.notesText}>{parcelle.notes_conversion}</Text>
        </View>
      )}

      {/* MODAL DÉMARRER */}
      <Modal visible={modalDemarrer} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Démarrer conversion BIO</Text>

            <Text style={styles.label}>Date de début (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} value={dateDebut} onChangeText={setDateDebut} placeholder="2026-05-08" />

            <Text style={styles.label}>Type culture</Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.choiceBtn, typeCulture === 'annuelle' && styles.choiceBtnActive]}
                onPress={() => setTypeCulture('annuelle')}
              >
                <Text style={typeCulture === 'annuelle' ? styles.choiceTextActive : styles.choiceText}>
                  Annuelle (24 mois)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.choiceBtn, typeCulture === 'perenne' && styles.choiceBtnActive]}
                onPress={() => setTypeCulture('perenne')}
              >
                <Text style={typeCulture === 'perenne' ? styles.choiceTextActive : styles.choiceText}>
                  Pérenne (36 mois)
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Notes (optionnel)</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder="Engagement producteur, parcelles voisines, etc."
            />

            <View style={styles.modalRow}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setModalDemarrer(false)}>
                <Text style={styles.btnCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnPrimary} onPress={handleDemarrer}>
                <Text style={styles.btnPrimaryText}>Démarrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL CERTIFIER */}
      <Modal visible={modalCertifier} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Certification BIO finale</Text>

            <Text style={styles.label}>Date certification</Text>
            <TextInput style={styles.input} value={dateCertif} onChangeText={setDateCertif} />

            <Text style={styles.label}>Organisme certificateur</Text>
            <TextInput style={styles.input} value={organisme} onChangeText={setOrganisme} />

            <Text style={styles.label}>N° certificat</Text>
            <TextInput style={styles.input} value={numeroCertif} onChangeText={setNumeroCertif} placeholder="Ex: FR-BIO-01-XXXXXX" />

            <View style={styles.modalRow}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setModalCertifier(false)}>
                <Text style={styles.btnCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSuccess} onPress={handleCertifier}>
                <Text style={styles.btnPrimaryText}>Certifier</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL INTRANT INTERDIT */}
      <Modal visible={modalIntrant} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Date dernier intrant interdit</Text>
            <Text style={styles.modalInfo}>
              Cette date borne le démarrage possible de la conversion. Pesticide synthèse, OGM, irradiation, etc.
            </Text>

            <TextInput
              style={styles.input}
              value={dateIntrantInterdit}
              onChangeText={setDateIntrantInterdit}
              placeholder="YYYY-MM-DD"
            />

            <View style={styles.modalRow}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setModalIntrant(false)}>
                <Text style={styles.btnCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnPrimary} onPress={handleSaveIntrantInterdit}>
                <Text style={styles.btnPrimaryText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a2e1a' },
  loading: { color: '#fff', textAlign: 'center', marginTop: 40 },
  headerCard: { backgroundColor: '#243d24', padding: 16, margin: 12, borderRadius: 8 },
  parcelleNom: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  parcelleInfo: { color: '#aaa', marginTop: 4 },
  statutCard: {
    backgroundColor: '#243d24', padding: 16, marginHorizontal: 12, marginBottom: 12, borderRadius: 8,
  },
  statutLabel: { color: '#aaa', fontSize: 11, letterSpacing: 1 },
  statutValue: { fontSize: 22, fontWeight: 'bold', marginTop: 4, marginBottom: 8 },
  progressBlock: { marginTop: 8 },
  progressText: { color: '#ddd', marginVertical: 2 },
  section: {
    backgroundColor: '#243d24', padding: 16, marginHorizontal: 12, marginBottom: 12, borderRadius: 8,
  },
  sectionTitle: { color: '#7ec87e', fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  sectionInfo: { color: '#888', fontSize: 12, marginBottom: 12, fontStyle: 'italic' },
  intrantBlock: {
    backgroundColor: '#3d2424', padding: 10, borderRadius: 6,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  intrantText: { color: '#d4a04a', flex: 1 },
  linkText: { color: '#7ec87e', textDecorationLine: 'underline' },
  btnPrimary: {
    backgroundColor: '#7ec87e', padding: 14, borderRadius: 6, alignItems: 'center', marginTop: 8,
  },
  btnPrimaryText: { color: '#1a2e1a', fontWeight: 'bold' },
  btnSuccess: {
    backgroundColor: '#2d7a2d', padding: 14, borderRadius: 6, alignItems: 'center', marginTop: 8,
  },
  btnDanger: {
    backgroundColor: '#5a2a2a', padding: 14, borderRadius: 6, alignItems: 'center', marginTop: 8,
  },
  btnDangerText: { color: '#ff8888', fontWeight: 'bold' },
  btnGhost: {
    borderColor: '#7ec87e', borderWidth: 1, padding: 12, borderRadius: 6, alignItems: 'center',
  },
  btnGhostText: { color: '#7ec87e' },
  infoBlock: { backgroundColor: '#1a3a4a', padding: 10, borderRadius: 6, marginVertical: 6 },
  infoText: { color: '#88c8d4', fontSize: 12 },
  notesText: { color: '#ddd' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20,
  },
  modalContent: { backgroundColor: '#243d24', borderRadius: 8, padding: 20 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  modalInfo: { color: '#aaa', fontSize: 12, marginBottom: 12, fontStyle: 'italic' },
  label: { color: '#7ec87e', marginTop: 12, marginBottom: 4, fontSize: 12 },
  input: {
    backgroundColor: '#1a2e1a', color: '#fff', padding: 12, borderRadius: 6,
    borderWidth: 1, borderColor: '#3a5a3a',
  },
  row: { flexDirection: 'row', gap: 8 },
  choiceBtn: {
    flex: 1, padding: 12, borderRadius: 6, borderWidth: 1, borderColor: '#3a5a3a',
    alignItems: 'center', backgroundColor: '#1a2e1a',
  },
  choiceBtnActive: { backgroundColor: '#7ec87e', borderColor: '#7ec87e' },
  choiceText: { color: '#aaa' },
  choiceTextActive: { color: '#1a2e1a', fontWeight: 'bold' },
  modalRow: { flexDirection: 'row', gap: 8, marginTop: 20 },
  btnCancel: {
    flex: 1, padding: 14, borderRadius: 6, alignItems: 'center',
    borderWidth: 1, borderColor: '#5a5a5a',
  },
  btnCancelText: { color: '#aaa' },
});