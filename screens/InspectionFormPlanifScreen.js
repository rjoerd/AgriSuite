// screens/InspectionFormPlanifScreen.js
// Formulaire création/édition inspection planifiée

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import * as SQLite from 'expo-sqlite';
import {
  creerInspectionPlanifiee,
  updateInspectionPlanifiee,
  supprimerInspectionPlanifiee,
  getInspectionPlanifiee,
} from '../database/sciInspections';

const db = SQLite.openDatabaseSync('certifpilot.db');

const COULEURS = {
  bg: '#1a2e1a',
  card: '#243824',
  cardAlt: '#2a4a2a',
  vert: '#7ec87e',
  amber: '#d4a04a',
  rouge: '#e74c3c',
  gris: '#9ca39c',
  blanc: '#ffffff',
};

const TYPES_INSPECTION = [
  { code: 'initiale', label: 'Initiale', desc: 'Entrée en conversion / 1ère inspection' },
  { code: 'annuelle', label: 'Annuelle', desc: 'Renouvellement obligatoire (≥1/an)' },
  { code: 'inopinee', label: 'Inopinée', desc: 'Visite surprise (≥10% des producteurs)' },
  { code: 'suivi_sanction', label: 'Suivi sanction', desc: 'Contrôle après sanction' },
];

const REFERENTIELS = [
  { code: 'BIO_UE', label: 'BIO UE 2018/848' },
  { code: 'FAIRTRADE_FLO', label: 'Fairtrade FLO' },
  { code: 'RAINFOREST', label: 'Rainforest Alliance' },
  { code: 'HACCP', label: 'HACCP' },
  { code: 'LABEL_VANILLE_MDG', label: 'Label Vanille MDG' },
];

const STATUTS = [
  { code: 'planifiee', label: 'Planifiée' },
  { code: 'realisee', label: 'Réalisée' },
  { code: 'reportee', label: 'Reportée' },
  { code: 'annulee', label: 'Annulée' },
];

export default function InspectionFormPlanifScreen({ route, navigation }) {
  const inspectionId = route.params?.inspectionId || null;
  const fournisseurIdInit = route.params?.fournisseurId || null;
  const isEdit = !!inspectionId;

  const [fournisseurs, setFournisseurs] = useState([]);
  const [showFournisseurModal, setShowFournisseurModal] = useState(false);
  const [showRefModal, setShowRefModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showStatutModal, setShowStatutModal] = useState(false);

  const [fournisseurId, setFournisseurId] = useState(fournisseurIdInit);
  const [fournisseurLabel, setFournisseurLabel] = useState('');
  const [referentielCode, setReferentielCode] = useState('BIO_UE');
  const [typeInspection, setTypeInspection] = useState('annuelle');
  const [datePrevue, setDatePrevue] = useState('');
  const [motif, setMotif] = useState('');
  const [inspecteurPrevu, setInspecteurPrevu] = useState('');
  const [statut, setStatut] = useState('planifiee');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    // Charger fournisseurs actifs
    try {
      const rows = db.getAllSync(
       `SELECT id, code, nom, zone_collecte_code FROM fournisseurs WHERE statut = 'actif' ORDER BY nom ASC`
      );
      setFournisseurs(rows);
    } catch (e) {
      console.error('[InspectionFormPlanif] Erreur fournisseurs:', e);
    }

    if (isEdit) {
      const insp = getInspectionPlanifiee(inspectionId);
      if (insp) {
        setFournisseurId(insp.fournisseur_id);
        setFournisseurLabel(`${insp.fournisseur_code} · ${insp.fournisseur_nom}`);
        setReferentielCode(insp.referentiel_code);
        setTypeInspection(insp.type_inspection);
        setDatePrevue(insp.date_prevue);
        setMotif(insp.motif || '');
        setInspecteurPrevu(insp.inspecteur_prevu || '');
        setStatut(insp.statut);
        setNotes(insp.notes || '');
      }
    } else if (fournisseurIdInit) {
      // Pré-sélection du fournisseur si on vient d'une fiche producteur
      const f = db.getFirstSync(
        `SELECT id, code, nom FROM fournisseurs WHERE id = ?`,
        [fournisseurIdInit]
      );
      if (f) setFournisseurLabel(`${f.code} · ${f.nom}`);
    }
  }, [inspectionId, fournisseurIdInit, isEdit]);

  const validerDate = (str) => {
    // Format attendu YYYY-MM-DD
    return /^\d{4}-\d{2}-\d{2}$/.test(str);
  };

  const handleSave = () => {
    if (!fournisseurId) {
      Alert.alert('Champ manquant', 'Sélectionnez un producteur/fournisseur');
      return;
    }
    if (!validerDate(datePrevue)) {
      Alert.alert('Date invalide', 'Format attendu : AAAA-MM-JJ (ex: 2026-06-15)');
      return;
    }

    const data = {
      fournisseur_id: fournisseurId,
      referentiel_code: referentielCode,
      type_inspection: typeInspection,
      date_prevue: datePrevue,
      motif: motif.trim() || null,
      inspecteur_prevu: inspecteurPrevu.trim() || null,
      statut: statut,
      notes: notes.trim() || null,
    };

    try {
      if (isEdit) {
        updateInspectionPlanifiee(inspectionId, data);
        console.log('[InspectionFormPlanif] Inspection mise à jour:', inspectionId);
      } else {
        const newId = creerInspectionPlanifiee(data);
        console.log('[InspectionFormPlanif] Inspection créée:', newId);
      }
      navigation.goBack();
    } catch (e) {
      console.error('[InspectionFormPlanif] Erreur save:', e);
      Alert.alert('Erreur', 'Sauvegarde impossible : ' + e.message);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Supprimer cette planification ?',
      'L\'inspection planifiée sera supprimée. Action irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            try {
              supprimerInspectionPlanifiee(inspectionId);
              navigation.goBack();
            } catch (e) {
              Alert.alert('Erreur', e.message);
            }
          },
        },
      ]
    );
  };

  const refLabel = REFERENTIELS.find((r) => r.code === referentielCode)?.label || referentielCode;
  const typeLabel = TYPES_INSPECTION.find((t) => t.code === typeInspection)?.label || typeInspection;
  const typeDesc = TYPES_INSPECTION.find((t) => t.code === typeInspection)?.desc || '';
  const statutLabel = STATUTS.find((s) => s.code === statut)?.label || statut;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>
          {isEdit ? 'Modifier inspection' : 'Planifier une inspection'}
        </Text>

        {/* Fournisseur */}
        <Text style={styles.label}>Producteur / Fournisseur *</Text>
        <TouchableOpacity
          style={styles.selector}
          onPress={() => setShowFournisseurModal(true)}
        >
          <Text style={fournisseurLabel ? styles.selectorText : styles.selectorPlaceholder}>
            {fournisseurLabel || 'Sélectionner...'}
          </Text>
        </TouchableOpacity>

        {/* Référentiel */}
        <Text style={styles.label}>Référentiel *</Text>
        <TouchableOpacity style={styles.selector} onPress={() => setShowRefModal(true)}>
          <Text style={styles.selectorText}>{refLabel}</Text>
        </TouchableOpacity>

        {/* Type inspection */}
        <Text style={styles.label}>Type d'inspection *</Text>
        <TouchableOpacity style={styles.selector} onPress={() => setShowTypeModal(true)}>
          <Text style={styles.selectorText}>{typeLabel}</Text>
        </TouchableOpacity>
        {!!typeDesc && <Text style={styles.hint}>{typeDesc}</Text>}

        {/* Date prévue */}
        <Text style={styles.label}>Date prévue * (AAAA-MM-JJ)</Text>
        <TextInput
          style={styles.input}
          value={datePrevue}
          onChangeText={setDatePrevue}
          placeholder="2026-06-15"
          placeholderTextColor={COULEURS.gris}
          keyboardType="numbers-and-punctuation"
        />

        {/* Inspecteur prévu */}
        <Text style={styles.label}>Inspecteur prévu</Text>
        <TextInput
          style={styles.input}
          value={inspecteurPrevu}
          onChangeText={setInspecteurPrevu}
          placeholder="Ex: Jean Rakoto (interne)"
          placeholderTextColor={COULEURS.gris}
        />

        {/* Motif */}
        <Text style={styles.label}>Motif / objectif</Text>
        <TextInput
          style={[styles.input, styles.inputMulti]}
          value={motif}
          onChangeText={setMotif}
          placeholder="Ex: Contrôle annuel BIO + vérification absence pesticides"
          placeholderTextColor={COULEURS.gris}
          multiline
          numberOfLines={3}
        />

        {/* Statut (édition seulement) */}
        {isEdit && (
          <>
            <Text style={styles.label}>Statut</Text>
            <TouchableOpacity style={styles.selector} onPress={() => setShowStatutModal(true)}>
              <Text style={styles.selectorText}>{statutLabel}</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Notes */}
        <Text style={styles.label}>Notes internes</Text>
        <TextInput
          style={[styles.input, styles.inputMulti]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Notes pour l'inspecteur..."
          placeholderTextColor={COULEURS.gris}
          multiline
          numberOfLines={3}
        />

        {/* Boutons */}
        <TouchableOpacity style={styles.btnSave} onPress={handleSave}>
          <Text style={styles.btnSaveText}>{isEdit ? '💾 Enregistrer' : '+ Créer la planification'}</Text>
        </TouchableOpacity>
{isEdit && statut === 'planifiee' && (
  <TouchableOpacity 
    style={[styles.btnSave, { backgroundColor: COULEURS.amber, marginTop: 12 }]}
    onPress={() => navigation.navigate('InspectionTerrain', { planificationId: inspectionId })}
  >
    <Text style={styles.btnSaveText}>▶ Démarrer l'inspection terrain</Text>
  </TouchableOpacity>
)}
{isEdit && statut === 'realisee' && (
  <TouchableOpacity 
    style={[styles.btnSave, { backgroundColor: '#5b9bd5', marginTop: 12 }]}
    onPress={() => {
      try {
        const real = db.getFirstSync(
          `SELECT id FROM inspections_realisees WHERE planification_id = ? AND cloture = 1 LIMIT 1`,
          [inspectionId]
        );
        if (real) {
          navigation.navigate('InspectionDetail', { inspectionRealiseeId: real.id });
        } else {
          Alert.alert('Aucune inspection clôturée trouvée pour cette planification');
        }
      } catch (e) {
        Alert.alert('Erreur', e.message);
      }
    }}
  >
    <Text style={styles.btnSaveText}>📋 Voir le détail</Text>
  </TouchableOpacity>
)}
        {isEdit && (
          <TouchableOpacity style={styles.btnDelete} onPress={handleDelete}>
            <Text style={styles.btnDeleteText}>🗑 Supprimer</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal Fournisseurs */}
      <Modal visible={showFournisseurModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sélectionner producteur</Text>
            <FlatList
              data={fournisseurs}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setFournisseurId(item.id);
                    setFournisseurLabel(`${item.code} · ${item.nom}`);
                    setShowFournisseurModal(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item.code} · {item.nom}</Text>
                  <Text style={styles.modalItemSub}>{item.zone_collecte_code || '—'}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.modalEmpty}>Aucun fournisseur actif</Text>}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowFournisseurModal(false)}>
              <Text style={styles.modalCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Référentiels */}
      <Modal visible={showRefModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choisir un référentiel</Text>
            {REFERENTIELS.map((r) => (
              <TouchableOpacity
                key={r.code}
                style={styles.modalItem}
                onPress={() => {
                  setReferentielCode(r.code);
                  setShowRefModal(false);
                }}
              >
                <Text style={styles.modalItemText}>{r.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowRefModal(false)}>
              <Text style={styles.modalCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Types inspection */}
      <Modal visible={showTypeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Type d'inspection</Text>
            {TYPES_INSPECTION.map((t) => (
              <TouchableOpacity
                key={t.code}
                style={styles.modalItem}
                onPress={() => {
                  setTypeInspection(t.code);
                  setShowTypeModal(false);
                }}
              >
                <Text style={styles.modalItemText}>{t.label}</Text>
                <Text style={styles.modalItemSub}>{t.desc}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowTypeModal(false)}>
              <Text style={styles.modalCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Statut */}
      <Modal visible={showStatutModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Statut</Text>
            {STATUTS.map((s) => (
              <TouchableOpacity
                key={s.code}
                style={styles.modalItem}
                onPress={() => {
                  setStatut(s.code);
                  setShowStatutModal(false);
                }}
              >
                <Text style={styles.modalItemText}>{s.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowStatutModal(false)}>
              <Text style={styles.modalCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COULEURS.bg,
  },
  scrollContent: {
    padding: 16,
  },
  title: {
    color: COULEURS.vert,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
  label: {
    color: COULEURS.amber,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 6,
  },
  hint: {
    color: COULEURS.gris,
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
  },
  input: {
    backgroundColor: COULEURS.card,
    color: COULEURS.blanc,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  inputMulti: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  selector: {
    backgroundColor: COULEURS.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selectorText: {
    color: COULEURS.blanc,
    fontSize: 14,
  },
  selectorPlaceholder: {
    color: COULEURS.gris,
    fontSize: 14,
  },
  btnSave: {
    backgroundColor: COULEURS.vert,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  btnSaveText: {
    color: COULEURS.bg,
    fontSize: 15,
    fontWeight: '700',
  },
  btnDelete: {
    backgroundColor: COULEURS.rouge,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  btnDeleteText: {
    color: COULEURS.blanc,
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COULEURS.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: {
    color: COULEURS.vert,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COULEURS.cardAlt,
  },
  modalItemText: {
    color: COULEURS.blanc,
    fontSize: 15,
  },
  modalItemSub: {
    color: COULEURS.gris,
    fontSize: 12,
    marginTop: 3,
  },
  modalEmpty: {
    color: COULEURS.gris,
    textAlign: 'center',
    padding: 20,
  },
  modalClose: {
    backgroundColor: COULEURS.cardAlt,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  modalCloseText: {
    color: COULEURS.blanc,
    fontWeight: '600',
  },
});