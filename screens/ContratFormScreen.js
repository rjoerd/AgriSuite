// screens/ContratFormScreen.js
// Formulaire création/édition contrat producteur SCI — Phase 3 Session 9a
//
// Usage :
//   navigation.navigate('ContratForm', { fournisseurId: 5 })
//   navigation.navigate('ContratForm', { contratId: 12, fournisseurId: 5 })

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Modal,
} from 'react-native';
import {
  creerContrat, updateContrat, supprimerContrat, getProducteurSCI,
  getTypeContratLabel, TYPES_CONTRAT,
} from '../database/sci';
import { getReferentiels } from '../database/certifTrack';
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('agrisuite.db');

const getContratById = (id) => db.getFirstSync('SELECT * FROM contrats_producteur WHERE id = ?', [id]);

export default function ContratFormScreen({ route, navigation }) {
  const { contratId, fournisseurId } = route.params;
  const isEdition = !!contratId;

  const [producteur, setProducteur] = useState(null);
  const [referentiels, setReferentiels] = useState([]);

  const [typeContrat, setTypeContrat] = useState('adhesion_sci');
  const [referenceReferentiel, setReferenceReferentiel] = useState('');
  const [numeroContrat, setNumeroContrat] = useState('');
  const [dateSignature, setDateSignature] = useState(new Date().toISOString().split('T')[0]);
  const [dateDebut, setDateDebut] = useState(new Date().toISOString().split('T')[0]);
  const [dateFin, setDateFin] = useState('');
  const [objet, setObjet] = useState('');
  const [contenu, setContenu] = useState('');
  const [signeProducteur, setSigneProducteur] = useState(false);
  const [signeOperateur, setSigneOperateur] = useState(false);
  const [signataireOperateur, setSignataireOperateur] = useState('');
  const [notes, setNotes] = useState('');
  const [actif, setActif] = useState(true);

  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showRefModal, setShowRefModal] = useState(false);

  useEffect(() => {
    setProducteur(getProducteurSCI(fournisseurId));
    setReferentiels(getReferentiels(true));

    if (isEdition) {
      const c = getContratById(contratId);
      if (c) {
        setTypeContrat(c.type_contrat);
        setReferenceReferentiel(c.reference_referentiel || '');
        setNumeroContrat(c.numero_contrat || '');
        setDateSignature(c.date_signature);
        setDateDebut(c.date_debut);
        setDateFin(c.date_fin || '');
        setObjet(c.objet);
        setContenu(c.contenu || '');
        setSigneProducteur(c.signe_par_producteur === 1);
        setSigneOperateur(c.signe_par_operateur === 1);
        setSignataireOperateur(c.signataire_operateur || '');
        setNotes(c.notes || '');
        setActif(c.actif === 1);
      }
    }
  }, [contratId, fournisseurId]);

  const validate = () => {
    if (!objet || objet.trim().length === 0) {
      Alert.alert('Champ manquant', 'L\'objet du contrat est requis');
      return false;
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateSignature)) {
      Alert.alert('Format invalide', 'Date signature : AAAA-MM-JJ');
      return false;
    }
    if (!dateRegex.test(dateDebut)) {
      Alert.alert('Format invalide', 'Date début : AAAA-MM-JJ');
      return false;
    }
    if (dateFin && !dateRegex.test(dateFin)) {
      Alert.alert('Format invalide', 'Date fin : AAAA-MM-JJ');
      return false;
    }
    return true;
  };

  const handleSave = () => {
    if (!validate()) return;
    try {
      const data = {
        type_contrat: typeContrat,
        reference_referentiel: referenceReferentiel || null,
        numero_contrat: numeroContrat || null,
        date_signature: dateSignature,
        date_debut: dateDebut,
        date_fin: dateFin || null,
        objet: objet.trim(),
        contenu: contenu.trim() || null,
        signe_par_producteur: signeProducteur ? 1 : 0,
        signe_par_operateur: signeOperateur ? 1 : 0,
        signataire_operateur: signataireOperateur.trim() || null,
        notes: notes.trim() || null,
      };

      if (isEdition) {
        updateContrat(contratId, { ...data, actif: actif ? 1 : 0 });
        Alert.alert('✅ Modifié', 'Contrat mis à jour');
      } else {
        creerContrat({ fournisseur_id: fournisseurId, ...data });
        Alert.alert('✅ Créé', 'Contrat enregistré');
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Erreur', 'Sauvegarde échouée : ' + e.message);
    }
  };

  const handleDelete = () => {
    if (!isEdition) return;
    Alert.alert('Supprimer ce contrat ?', 'Action définitive.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: () => { supprimerContrat(contratId); navigation.goBack(); },
      },
    ]);
  };

  // Auto-suggestion d'objet selon type
  useEffect(() => {
    if (!isEdition && !objet) {
      const suggestions = {
        adhesion_sci: `Adhésion au SCI de l'organisation${producteur?.nom ? ` - ${producteur.nom}` : ''}`,
        engagement_bio: 'Engagement à respecter le cahier des charges BIO UE 2018/848',
        engagement_ft: 'Engagement à respecter le standard Fairtrade SPO 2024',
        engagement_ra: 'Engagement à respecter Rainforest Alliance Standard 2020',
        engagement_haccp: 'Engagement à respecter les bonnes pratiques HACCP Codex',
        avenant: 'Avenant au contrat existant',
        fin_engagement: 'Fin d\'engagement',
      };
      if (suggestions[typeContrat]) setObjet(suggestions[typeContrat]);
    }
  }, [typeContrat, producteur]);

  const refsFiltres = referentiels.filter((r) => {
    if (typeContrat === 'engagement_bio') return r.code === 'BIO_UE';
    if (typeContrat === 'engagement_ft') return r.code === 'FAIRTRADE_FLO';
    if (typeContrat === 'engagement_ra') return r.code === 'RAINFOREST';
    if (typeContrat === 'engagement_haccp') return r.code === 'HACCP';
    return true;
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{isEdition ? '✏️ Modifier contrat' : '➕ Nouveau contrat'}</Text>

      {producteur && (
        <View style={styles.banner}>
          <Text style={styles.bannerLabel}>Producteur</Text>
          <Text style={styles.bannerValue}>{producteur.nom}</Text>
          <Text style={styles.bannerHint}>{producteur.code || `#${producteur.id}`}</Text>
        </View>
      )}

      {/* Type contrat */}
      <View style={styles.field}>
        <Text style={styles.label}>Type de contrat *</Text>
        <TouchableOpacity style={styles.selector} onPress={() => setShowTypeModal(true)}>
          <Text style={styles.selectorValue}>{getTypeContratLabel(typeContrat)}</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Référentiel cible (si engagement) */}
      {typeContrat.startsWith('engagement_') && (
        <View style={styles.field}>
          <Text style={styles.label}>Référentiel cible</Text>
          <TouchableOpacity style={styles.selector} onPress={() => setShowRefModal(true)}>
            <Text style={referenceReferentiel ? styles.selectorValue : styles.selectorPlaceholder}>
              {referenceReferentiel || 'Choisir un référentiel…'}
            </Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* N° contrat */}
      <View style={styles.field}>
        <Text style={styles.label}>N° de contrat (interne)</Text>
        <TextInput
          style={styles.input}
          value={numeroContrat}
          onChangeText={setNumeroContrat}
          placeholder="Ex : SCI-2026-001"
          placeholderTextColor="#5a7a5a"
        />
      </View>

      {/* Dates */}
      <View style={styles.field}>
        <Text style={styles.label}>Date de signature *</Text>
        <TextInput style={styles.input} value={dateSignature} onChangeText={setDateSignature} placeholder="AAAA-MM-JJ" placeholderTextColor="#5a7a5a" />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Date de début *</Text>
        <TextInput style={styles.input} value={dateDebut} onChangeText={setDateDebut} placeholder="AAAA-MM-JJ" placeholderTextColor="#5a7a5a" />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Date de fin (si à durée déterminée)</Text>
        <TextInput style={styles.input} value={dateFin} onChangeText={setDateFin} placeholder="AAAA-MM-JJ (optionnel)" placeholderTextColor="#5a7a5a" />
      </View>

      {/* Objet */}
      <View style={styles.field}>
        <Text style={styles.label}>Objet du contrat *</Text>
        <TextInput
          style={styles.input}
          value={objet}
          onChangeText={setObjet}
          placeholder="Ex : Adhésion au SCI de l'organisation"
          placeholderTextColor="#5a7a5a"
        />
      </View>

      {/* Contenu */}
      <View style={styles.field}>
        <Text style={styles.label}>Contenu / clauses principales</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={contenu}
          onChangeText={setContenu}
          placeholder="Engagements détaillés, obligations, sanctions…"
          placeholderTextColor="#5a7a5a"
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />
      </View>

      {/* Signatures */}
      <Text style={styles.sectionTitle}>✍️ Signatures</Text>
      <TouchableOpacity style={styles.checkbox} onPress={() => setSigneProducteur(!signeProducteur)}>
        <Text style={styles.checkboxIcon}>{signeProducteur ? '☑' : '☐'}</Text>
        <Text style={styles.checkboxLabel}>Signé par le producteur</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.checkbox} onPress={() => setSigneOperateur(!signeOperateur)}>
        <Text style={styles.checkboxIcon}>{signeOperateur ? '☑' : '☐'}</Text>
        <Text style={styles.checkboxLabel}>Signé par l'opérateur</Text>
      </TouchableOpacity>

      {signeOperateur && (
        <View style={styles.field}>
          <Text style={styles.label}>Nom du signataire opérateur</Text>
          <TextInput
            style={styles.input}
            value={signataireOperateur}
            onChangeText={setSignataireOperateur}
            placeholder="Nom, fonction"
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
          placeholder="Conditions particulières, points d'attention…"
          placeholderTextColor="#5a7a5a"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* Statut actif (édition uniquement) */}
      {isEdition && (
        <TouchableOpacity style={styles.checkbox} onPress={() => setActif(!actif)}>
          <Text style={styles.checkboxIcon}>{actif ? '☑' : '☐'}</Text>
          <Text style={styles.checkboxLabel}>Contrat actif</Text>
        </TouchableOpacity>
      )}

      {/* Note Session 9b */}
      <View style={styles.noteBox}>
        <Text style={styles.noteText}>
          💡 Génération PDF du contrat (template) arrive en Session 9c.
          En attendant, conserve une copie papier signée.
        </Text>
      </View>

      {/* Actions */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>{isEdition ? '💾 Enregistrer' : '➕ Créer le contrat'}</Text>
      </TouchableOpacity>

      {isEdition && (
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>🗑️ Supprimer</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 40 }} />

      {/* Modal type */}
      <Modal visible={showTypeModal} transparent animationType="slide" onRequestClose={() => setShowTypeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Type de contrat</Text>
            <ScrollView>
              {TYPES_CONTRAT.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.modalItem, typeContrat === t && styles.modalItemSelected]}
                  onPress={() => { setTypeContrat(t); setShowTypeModal(false); }}
                >
                  <Text style={styles.modalItemText}>{getTypeContratLabel(t)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.btnClose} onPress={() => setShowTypeModal(false)}>
              <Text style={styles.btnCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal référentiel */}
      <Modal visible={showRefModal} transparent animationType="slide" onRequestClose={() => setShowRefModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Référentiel cible</Text>
            <ScrollView>
              {refsFiltres.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.modalItem, referenceReferentiel === r.code && styles.modalItemSelected]}
                  onPress={() => { setReferenceReferentiel(r.code); setShowRefModal(false); }}
                >
                  <Text style={styles.modalItemText}>{r.nom_court}</Text>
                  <Text style={styles.modalItemHint}>{r.code}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.btnClose} onPress={() => setShowRefModal(false)}>
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
  bannerHint: { fontSize: 11, color: '#a8c8a8', fontFamily: 'monospace', marginTop: 2 },

  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#7ec87e', marginTop: 12, marginBottom: 8 },

  field: { marginBottom: 16 },
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
  textarea: { minHeight: 80 },

  selector: {
    backgroundColor: '#243d24',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#3a5a3a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorValue: { fontSize: 14, color: '#fff', fontWeight: '500' },
  selectorPlaceholder: { fontSize: 14, color: '#5a7a5a' },
  chevron: { fontSize: 22, color: '#7ec87e' },

  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  checkboxIcon: { fontSize: 22, color: '#7ec87e' },
  checkboxLabel: { fontSize: 14, color: '#fff' },

  noteBox: {
    backgroundColor: '#1f2c38',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#7eaac8',
  },
  noteText: { color: '#a8c8e8', fontSize: 11, lineHeight: 16 },

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
  },
  modalItemSelected: { borderWidth: 2, borderColor: '#7ec87e' },
  modalItemText: { fontSize: 14, color: '#fff', fontWeight: '500' },
  modalItemHint: { fontSize: 11, color: '#7a9a7a', fontFamily: 'monospace', marginTop: 2 },
  btnClose: {
    marginTop: 12,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#3a5a3a',
    borderRadius: 8,
  },
  btnCloseText: { color: '#7ec87e', fontWeight: '600' },
});