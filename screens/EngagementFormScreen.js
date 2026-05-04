// screens/EngagementFormScreen.js
// Formulaire de création/modification d'un engagement de certification
// Phase 3 Session 7
//
// Usage :
//   navigation.navigate('EngagementForm', { cibleType: 'lot', cibleId: 42, cibleLabel: 'MDG-2026-D-GIN-001' })
//   navigation.navigate('EngagementForm', { engagementId: 5 }) → mode édition

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
import {
  getReferentiels,
  getReferentielById,
  creerEngagement,
  updateEngagement,
  supprimerEngagement,
  getStatutLabel,
  getStatutColor,
} from '../database/certifTrack';
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('agrisuite.db');

const STATUTS = ['vise', 'en_conversion', 'certifie', 'suspendu', 'abandonne'];

// Helper pour récupérer un engagement existant
const getEngagementById = (id) => {
  return db.getFirstSync(
    `SELECT e.*, r.nom_court as ref_nom_court, r.nom_complet as ref_nom_complet
     FROM engagements_certif e
     JOIN referentiels r ON e.referentiel_id = r.id
     WHERE e.id = ?`,
    [id]
  );
};

export default function EngagementFormScreen({ route, navigation }) {
  // Mode création OU édition
  const { engagementId, cibleType, cibleId, cibleLabel } = route.params || {};
  const isEdition = !!engagementId;

  // États
  const [referentiels, setReferentiels] = useState([]);
  const [referentielId, setReferentielId] = useState(null);
  const [referentielSelectionne, setReferentielSelectionne] = useState(null);
  const [statut, setStatut] = useState('vise');
  const [dateEngagement, setDateEngagement] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [dateDebutConversion, setDateDebutConversion] = useState('');
  const [organismeCertificateur, setOrganismeCertificateur] = useState('');
  const [numeroCertificat, setNumeroCertificat] = useState('');
  const [notes, setNotes] = useState('');

  // Cible (uniquement utilisé en mode création)
  const [editCibleType, setEditCibleType] = useState(cibleType || 'lot');
  const [editCibleId, setEditCibleId] = useState(cibleId || null);
  const [editCibleLabel, setEditCibleLabel] = useState(cibleLabel || '');

  // Modal sélection référentiel
  const [showReferentielModal, setShowReferentielModal] = useState(false);

  useEffect(() => {
    // Charger la liste des référentiels actifs
    setReferentiels(getReferentiels(true));

    // Si édition, pré-remplir
    if (isEdition) {
      const eng = getEngagementById(engagementId);
      if (eng) {
        setReferentielId(eng.referentiel_id);
        setReferentielSelectionne({
          id: eng.referentiel_id,
          nom_court: eng.ref_nom_court,
          nom_complet: eng.ref_nom_complet,
        });
        setStatut(eng.statut);
        setDateEngagement(eng.date_engagement);
        setDateDebutConversion(eng.date_debut_conversion || '');
        setOrganismeCertificateur(eng.organisme_certificateur || '');
        setNumeroCertificat(eng.numero_certificat || '');
        setNotes(eng.notes || '');
        setEditCibleType(eng.cible_type);
        setEditCibleId(eng.cible_id);
      }
    }
  }, [engagementId]);

  const handleSelectReferentiel = (ref) => {
    setReferentielId(ref.id);
    setReferentielSelectionne(ref);
    setShowReferentielModal(false);
  };

  const validate = () => {
    if (!referentielId) {
      Alert.alert('Champ manquant', 'Sélectionne un référentiel');
      return false;
    }
    if (!editCibleId || !editCibleType) {
      Alert.alert('Cible manquante', 'Aucune cible (lot/site/culture) définie');
      return false;
    }
    if (!dateEngagement) {
      Alert.alert('Champ manquant', 'Date d\'engagement requise');
      return false;
    }
    // Format date YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateEngagement)) {
      Alert.alert('Format invalide', 'Date d\'engagement doit être au format AAAA-MM-JJ');
      return false;
    }
    if (dateDebutConversion && !dateRegex.test(dateDebutConversion)) {
      Alert.alert('Format invalide', 'Date de début de conversion doit être au format AAAA-MM-JJ');
      return false;
    }
    return true;
  };

  const handleSave = () => {
    if (!validate()) return;

    try {
      if (isEdition) {
        updateEngagement(engagementId, {
          referentiel_id: referentielId,
          statut,
          date_engagement: dateEngagement,
          date_debut_conversion: dateDebutConversion || null,
          organisme_certificateur: organismeCertificateur || null,
          numero_certificat: numeroCertificat || null,
          notes: notes || null,
        });
        Alert.alert('✅ Modifié', 'Engagement mis à jour');
      } else {
        creerEngagement({
          referentiel_id: referentielId,
          cible_type: editCibleType,
          cible_id: editCibleId,
          statut,
          date_engagement: dateEngagement,
          date_debut_conversion: dateDebutConversion || null,
          organisme_certificateur: organismeCertificateur || null,
          notes: notes || null,
        });
        // Si certificat fourni dès la création, on update derrière
        if (numeroCertificat) {
          // récupérer dernier id inséré et update
          const last = db.getFirstSync(
            'SELECT id FROM engagements_certif ORDER BY id DESC LIMIT 1'
          );
          if (last) {
            updateEngagement(last.id, { numero_certificat: numeroCertificat });
          }
        }
        Alert.alert('✅ Créé', 'Engagement enregistré');
      }
      navigation.goBack();
    } catch (error) {
      console.error('Erreur sauvegarde engagement:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder : ' + error.message);
    }
  };

  const handleDelete = () => {
    if (!isEdition) return;
    Alert.alert(
      'Supprimer l\'engagement ?',
      'Cette action est définitive. L\'engagement sera retiré de la traçabilité.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            try {
              supprimerEngagement(engagementId);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer');
            }
          },
        },
      ]
    );
  };

  const cibleAffichee = editCibleLabel || `${editCibleType} #${editCibleId}`;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>
        {isEdition ? '✏️ Modifier engagement' : '➕ Nouvel engagement'}
      </Text>

      {/* Cible (lecture seule) */}
      <View style={styles.cibleBanner}>
        <Text style={styles.cibleLabel}>Cible</Text>
        <Text style={styles.cibleValue}>
          {editCibleType === 'lot' && '📦 '}
          {editCibleType === 'site' && '🗺️ '}
          {editCibleType === 'culture' && '🌱 '}
          {cibleAffichee}
        </Text>
      </View>

      {/* Sélection référentiel */}
      <View style={styles.field}>
        <Text style={styles.label}>Référentiel *</Text>
        <TouchableOpacity
          style={styles.selectButton}
          onPress={() => setShowReferentielModal(true)}
        >
          {referentielSelectionne ? (
            <View>
              <Text style={styles.selectButtonValue}>{referentielSelectionne.nom_court}</Text>
              <Text style={styles.selectButtonHint}>{referentielSelectionne.nom_complet}</Text>
            </View>
          ) : (
            <Text style={styles.selectButtonPlaceholder}>Sélectionner un référentiel…</Text>
          )}
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Statut */}
      <View style={styles.field}>
        <Text style={styles.label}>Statut *</Text>
        <View style={styles.statutGrid}>
          {STATUTS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[
                styles.statutChip,
                statut === s && {
                  backgroundColor: getStatutColor(s),
                  borderColor: getStatutColor(s),
                },
              ]}
              onPress={() => setStatut(s)}
            >
              <Text
                style={[
                  styles.statutChipText,
                  statut === s && styles.statutChipTextActive,
                ]}
              >
                {getStatutLabel(s)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Date d'engagement */}
      <View style={styles.field}>
        <Text style={styles.label}>Date d'engagement *</Text>
        <TextInput
          style={styles.input}
          value={dateEngagement}
          onChangeText={setDateEngagement}
          placeholder="AAAA-MM-JJ"
          placeholderTextColor="#5a7a5a"
        />
      </View>

      {/* Date de début de conversion (si applicable) */}
      {(statut === 'en_conversion' || statut === 'certifie') && (
        <View style={styles.field}>
          <Text style={styles.label}>Date de début de conversion</Text>
          <TextInput
            style={styles.input}
            value={dateDebutConversion}
            onChangeText={setDateDebutConversion}
            placeholder="AAAA-MM-JJ"
            placeholderTextColor="#5a7a5a"
          />
          <Text style={styles.hint}>
            Pour BIO : 24 mois annuelles / 36 mois pérennes avant statut « certifié »
          </Text>
        </View>
      )}

      {/* Organisme certificateur */}
      <View style={styles.field}>
        <Text style={styles.label}>Organisme certificateur</Text>
        <TextInput
          style={styles.input}
          value={organismeCertificateur}
          onChangeText={setOrganismeCertificateur}
          placeholder="Ex : Ecocert, FLOCERT, Bureau Veritas…"
          placeholderTextColor="#5a7a5a"
        />
      </View>

      {/* Numéro de certificat (si certifié) */}
      {statut === 'certifie' && (
        <View style={styles.field}>
          <Text style={styles.label}>Numéro de certificat</Text>
          <TextInput
            style={styles.input}
            value={numeroCertificat}
            onChangeText={setNumeroCertificat}
            placeholder="Ex : ECO-MDG-2026-12345"
            placeholderTextColor="#5a7a5a"
          />
        </View>
      )}

      {/* Notes */}
      <View style={styles.field}>
        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Remarques, conditions particulières, contact auditeur…"
          placeholderTextColor="#5a7a5a"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Actions */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>
          {isEdition ? '💾 Enregistrer' : '➕ Créer engagement'}
        </Text>
      </TouchableOpacity>

      {isEdition && (
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>🗑️ Supprimer cet engagement</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 40 }} />

      {/* Modal sélection référentiel */}
      <Modal
        visible={showReferentielModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReferentielModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choisir un référentiel</Text>
              <TouchableOpacity onPress={() => setShowReferentielModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={referentiels}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.refItem,
                    referentielId === item.id && styles.refItemSelected,
                  ]}
                  onPress={() => handleSelectReferentiel(item)}
                >
                  <Text style={styles.refItemCode}>{item.code}</Text>
                  <Text style={styles.refItemNom}>{item.nom_court}</Text>
                  <Text style={styles.refItemComplet} numberOfLines={2}>
                    {item.nom_complet}
                  </Text>
                  {item.exige_sci === 1 && (
                    <Text style={styles.refItemSci}>⚠️ Exige SCI (groupes producteurs)</Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a2e1a',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#7ec87e',
    marginBottom: 16,
  },

  // Banner cible
  cibleBanner: {
    backgroundColor: '#243d24',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#7ec87e',
  },
  cibleLabel: {
    fontSize: 11,
    color: '#7a9a7a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cibleValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },

  // Champs
  field: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    color: '#a8c8a8',
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#243d24',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#3a5a3a',
  },
  textarea: {
    minHeight: 90,
  },
  hint: {
    fontSize: 11,
    color: '#7a9a7a',
    fontStyle: 'italic',
    marginTop: 4,
  },

  // Bouton sélection référentiel
  selectButton: {
    backgroundColor: '#243d24',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#3a5a3a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectButtonValue: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  selectButtonHint: {
    fontSize: 11,
    color: '#a8c8a8',
    marginTop: 2,
  },
  selectButtonPlaceholder: {
    fontSize: 14,
    color: '#5a7a5a',
  },
  chevron: {
    fontSize: 24,
    color: '#7ec87e',
  },

  // Statuts grid
  statutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statutChip: {
    backgroundColor: '#243d24',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3a5a3a',
  },
  statutChipText: {
    fontSize: 12,
    color: '#a8c8a8',
    fontWeight: '500',
  },
  statutChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },

  // Boutons
  saveButton: {
    backgroundColor: '#7ec87e',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 16,
    color: '#1a2e1a',
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: 'transparent',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#cc4444',
  },
  deleteButtonText: {
    fontSize: 14,
    color: '#cc4444',
    fontWeight: '600',
  },

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
    maxHeight: '80%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3a5a3a',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7ec87e',
  },
  modalClose: {
    fontSize: 24,
    color: '#a8c8a8',
    paddingHorizontal: 8,
  },
  refItem: {
    backgroundColor: '#243d24',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  refItemSelected: {
    borderWidth: 2,
    borderColor: '#7ec87e',
  },
  refItemCode: {
    fontSize: 10,
    color: '#7ec87e',
    fontFamily: 'monospace',
    letterSpacing: 1,
    marginBottom: 2,
  },
  refItemNom: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  refItemComplet: {
    fontSize: 12,
    color: '#a8c8a8',
    lineHeight: 16,
  },
  refItemSci: {
    fontSize: 11,
    color: '#d4a04a',
    marginTop: 6,
    fontStyle: 'italic',
  },
});