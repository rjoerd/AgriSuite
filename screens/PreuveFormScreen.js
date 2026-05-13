// screens/PreuveFormScreen.js
// Formulaire d'ajout de preuve typée à une exigence
// Phase 3 Session 8
//
// Usage :
//   navigation.navigate('PreuveForm', {
//     engagementId: 5,
//     exigenceId: 12,
//     exigenceTitre: 'Délai de conversion BIO respecté',
//     exigenceCode: 'BIO-CONV-01',
//   })
//
// Ce formulaire permet d'attacher une preuve à une exigence :
//   - Type de preuve (8 options)
//   - Si type lié à entité (analyse, étape, fournisseur, lot, parcelle) :
//       sélecteur dynamique parmi les entités existantes
//   - Si type document/attestation/observation : champs libres
//   - Pièce jointe préparée mais désactivée (Session 8f)

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
  creerPreuve,
  getPreuvesByExigence,
  supprimerPreuve,
  getTypePreuveLabel,
  TYPES_PREUVE,
} from '../database/certifTrack';
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('certifpilot.db');

// ============================================================
// HELPERS — récupération entités liées
// ============================================================

const getEntitesPourType = (type, engagementId) => {
  // Récupérer le lot/site/culture cible de l'engagement
  const eng = db.getFirstSync(
    'SELECT cible_type, cible_id FROM engagements_certif WHERE id = ?',
    [engagementId]
  );
  if (!eng) return [];

  try {
    switch (type) {
      case 'analyse_qualite':
        // Analyses qualité du lot lié (si engagement sur lot)
        if (eng.cible_type === 'lot') {
          return db.getAllSync(
            `SELECT id, type_analyse as label, valeur, unite, date_analyse,
                    laboratoire, conforme
             FROM analyses_qualite WHERE lot_id = ?
             ORDER BY date_analyse DESC`,
            [eng.cible_id]
          );
        }
        return [];

      case 'etape_lot':
        if (eng.cible_type === 'lot') {
          return db.getAllSync(
            `SELECT id, type_etape as label, ordre, date_debut, date_fin,
                    quantite_entree_kg, quantite_sortie_kg, operateur
             FROM etapes_post_recolte WHERE lot_id = ?
             ORDER BY ordre ASC`,
            [eng.cible_id]
          );
        }
        return [];

      case 'fournisseur':
        return db.getAllSync(
          `SELECT id, nom as label, code, zone_collecte_code
           FROM fournisseurs ORDER BY nom`
        );

      case 'lot':
        return db.getAllSync(
          `SELECT id, code_lot as label, filiere, est_cloture
           FROM lots ORDER BY id DESC LIMIT 50`
        );

      case 'parcelle':
        try {
          return db.getAllSync(
            `SELECT id, nom as label, superficie_m2
             FROM parcelles ORDER BY nom`
          );
        } catch (e) {
          return [];
        }

      default:
        return [];
    }
  } catch (e) {
    console.error('Erreur récupération entités:', e);
    return [];
  }
};

// Type de preuve = a-t-il besoin d'une entité liée ?
const typeNecessiteEntite = (type) => {
  return ['analyse_qualite', 'etape_lot', 'fournisseur', 'lot', 'parcelle'].includes(type);
};

// ============================================================
// COMPOSANT
// ============================================================

export default function PreuveFormScreen({ route, navigation }) {
  const { engagementId, exigenceId, exigenceTitre, exigenceCode } = route.params;

  // États formulaire
  const [typePreuve, setTypePreuve] = useState(null);
  const [entiteSelectionnee, setEntiteSelectionnee] = useState(null);
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [urlExterne, setUrlExterne] = useState('');
  const [saisiPar, setSaisiPar] = useState('');
  const [datePreuve, setDatePreuve] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Modals
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showEntiteModal, setShowEntiteModal] = useState(false);
  const [entites, setEntites] = useState([]);

  // Liste preuves existantes
  const [preuvesExistantes, setPreuvesExistantes] = useState([]);

  useEffect(() => {
    loadPreuvesExistantes();
  }, []);

  useEffect(() => {
    // Recharger les entités quand le type change
    if (typePreuve && typeNecessiteEntite(typePreuve)) {
      const ent = getEntitesPourType(typePreuve, engagementId);
      setEntites(ent);
      setEntiteSelectionnee(null);
    }
  }, [typePreuve]);

  const loadPreuvesExistantes = () => {
    try {
      const preuves = getPreuvesByExigence(engagementId, exigenceId);
      setPreuvesExistantes(preuves);
    } catch (e) {
      console.error('Erreur load preuves:', e);
    }
  };

  const handleSelectType = (type) => {
    setTypePreuve(type);
    setShowTypeModal(false);
  };

  const handleSelectEntite = (entite) => {
    setEntiteSelectionnee(entite);
    // Auto-remplir le titre
    if (!titre) {
      setTitre(`${getTypePreuveLabel(typePreuve)} — ${entite.label || `#${entite.id}`}`);
    }
    setShowEntiteModal(false);
  };

  const validate = () => {
    if (!typePreuve) {
      Alert.alert('Champ manquant', 'Sélectionne un type de preuve');
      return false;
    }
    if (typeNecessiteEntite(typePreuve) && !entiteSelectionnee) {
      Alert.alert(
        'Référence manquante',
        `Pour une preuve de type "${getTypePreuveLabel(typePreuve)}", il faut sélectionner une entité existante.`
      );
      return false;
    }
    if (!titre || titre.trim().length === 0) {
      Alert.alert('Champ manquant', 'Le titre de la preuve est requis');
      return false;
    }
    return true;
  };

  const handleSave = () => {
    if (!validate()) return;

    try {
      creerPreuve({
        engagement_id: engagementId,
        exigence_id: exigenceId,
        type_preuve: typePreuve,
        reference_id: entiteSelectionnee?.id || null,
        titre: titre.trim(),
        description: description.trim() || null,
        url_externe: urlExterne.trim() || null,
        chemin_fichier: null, // Réservé Session 8f
        saisi_par: saisiPar.trim() || null,
        date_preuve: datePreuve || null,
      });

      Alert.alert('✅ Preuve enregistrée', 'La preuve a été ajoutée à cette exigence');
      navigation.goBack();
    } catch (error) {
      console.error('Erreur sauvegarde preuve:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la preuve : ' + error.message);
    }
  };

  const handleDeletePreuve = (preuveId) => {
    Alert.alert(
      'Supprimer cette preuve ?',
      'Cette action est définitive.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            supprimerPreuve(preuveId);
            loadPreuvesExistantes();
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* En-tête : exigence concernée */}
      <View style={styles.exigenceBanner}>
        <Text style={styles.bannerLabel}>Preuve pour l'exigence</Text>
        <Text style={styles.bannerCode}>{exigenceCode}</Text>
        <Text style={styles.bannerTitre}>{exigenceTitre}</Text>
      </View>

      {/* Preuves existantes */}
      {preuvesExistantes.length > 0 && (
        <View style={styles.preuvesBox}>
          <Text style={styles.preuvesBoxTitre}>
            📎 Preuves déjà enregistrées ({preuvesExistantes.length})
          </Text>
          {preuvesExistantes.map((p) => (
            <View key={p.id} style={styles.preuveItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.preuveItemType}>
                  {getTypePreuveLabel(p.type_preuve)}
                </Text>
                <Text style={styles.preuveItemTitre} numberOfLines={2}>
                  {p.titre}
                </Text>
                {p.date_preuve && (
                  <Text style={styles.preuveItemDate}>📅 {p.date_preuve}</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.preuveItemDelete}
                onPress={() => handleDeletePreuve(p.id)}
              >
                <Text style={styles.preuveItemDeleteText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.sectionTitle}>➕ Ajouter une nouvelle preuve</Text>

      {/* Type de preuve */}
      <View style={styles.field}>
        <Text style={styles.label}>Type de preuve *</Text>
        <TouchableOpacity
          style={styles.selectButton}
          onPress={() => setShowTypeModal(true)}
        >
          <Text
            style={typePreuve ? styles.selectButtonValue : styles.selectButtonPlaceholder}
          >
            {typePreuve ? getTypePreuveLabel(typePreuve) : 'Sélectionner un type…'}
          </Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Entité liée (si applicable) */}
      {typePreuve && typeNecessiteEntite(typePreuve) && (
        <View style={styles.field}>
          <Text style={styles.label}>Référence vers l'entité *</Text>
          {entites.length === 0 ? (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                ⚠️ Aucune {typePreuve === 'analyse_qualite' ? 'analyse qualité' : typePreuve === 'etape_lot' ? 'étape post-récolte' : typePreuve}
                {' '}existante pour cet engagement.
              </Text>
              <Text style={styles.warningHint}>
                Crée d'abord cette entité dans le module concerné, puis reviens ici.
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowEntiteModal(true)}
            >
              {entiteSelectionnee ? (
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectButtonValue}>
                    {entiteSelectionnee.label || `#${entiteSelectionnee.id}`}
                  </Text>
                  {entiteSelectionnee.date_analyse && (
                    <Text style={styles.selectButtonHint}>
                      {entiteSelectionnee.date_analyse}
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={styles.selectButtonPlaceholder}>
                  Choisir parmi {entites.length} {typePreuve}
                  {entites.length > 1 ? 's' : ''}…
                </Text>
              )}
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Titre */}
      <View style={styles.field}>
        <Text style={styles.label}>Titre de la preuve *</Text>
        <TextInput
          style={styles.input}
          value={titre}
          onChangeText={setTitre}
          placeholder="Ex : Bulletin analyse vanilline 22/04/2026"
          placeholderTextColor="#5a7a5a"
        />
      </View>

      {/* Description */}
      <View style={styles.field}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Détails additionnels, contexte, conclusions…"
          placeholderTextColor="#5a7a5a"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* URL externe (si document) */}
      {(typePreuve === 'document_externe' || typePreuve === 'attestation') && (
        <View style={styles.field}>
          <Text style={styles.label}>URL externe</Text>
          <TextInput
            style={styles.input}
            value={urlExterne}
            onChangeText={setUrlExterne}
            placeholder="https://… (lien vers document partagé)"
            placeholderTextColor="#5a7a5a"
            autoCapitalize="none"
            keyboardType="url"
          />
          <Text style={styles.hint}>
            Lien Google Drive, Dropbox, ou tout système de stockage partagé
          </Text>
        </View>
      )}

      {/* Saisi par */}
      <View style={styles.field}>
        <Text style={styles.label}>Saisi par</Text>
        <TextInput
          style={styles.input}
          value={saisiPar}
          onChangeText={setSaisiPar}
          placeholder="Nom du Propriétaire ou Gérant"
          placeholderTextColor="#5a7a5a"
        />
      </View>

      {/* Date preuve */}
      <View style={styles.field}>
        <Text style={styles.label}>Date de la preuve</Text>
        <TextInput
          style={styles.input}
          value={datePreuve}
          onChangeText={setDatePreuve}
          placeholder="AAAA-MM-JJ"
          placeholderTextColor="#5a7a5a"
        />
      </View>

      {/* Note Session 8f */}
      <View style={styles.session8fBox}>
        <Text style={styles.session8fTitre}>📷 Pièces jointes (photos / PDF)</Text>
        <Text style={styles.session8fText}>
          Les pièces jointes avec horodatage GPS, watermark anti-falsification et
          hash SHA-256 arriveront en Session 8f.
          En attendant, utilise le champ « URL externe » pour pointer vers un fichier
          partagé sur Google Drive ou Dropbox.
        </Text>
      </View>

      {/* Bouton enregistrer */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>💾 Enregistrer la preuve</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />

      {/* Modal sélection type */}
      <Modal
        visible={showTypeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTypeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Type de preuve</Text>
              <TouchableOpacity onPress={() => setShowTypeModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              {TYPES_PREUVE.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.modalItem,
                    typePreuve === t && styles.modalItemSelected,
                  ]}
                  onPress={() => handleSelectType(t)}
                >
                  <Text style={styles.modalItemLabel}>{getTypePreuveLabel(t)}</Text>
                  {typeNecessiteEntite(t) ? (
                    <Text style={styles.modalItemHint}>
                      Lien vers une entité existante
                    </Text>
                  ) : (
                    <Text style={styles.modalItemHint}>
                      Texte libre + URL optionnelle
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal sélection entité */}
      <Modal
        visible={showEntiteModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEntiteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Choisir une {typePreuve}
              </Text>
              <TouchableOpacity onPress={() => setShowEntiteModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={entites}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    entiteSelectionnee?.id === item.id && styles.modalItemSelected,
                  ]}
                  onPress={() => handleSelectEntite(item)}
                >
                  <Text style={styles.modalItemLabel}>
                    {item.label || `#${item.id}`}
                  </Text>
                  {/* Métadonnées spécifiques par type */}
                  {typePreuve === 'analyse_qualite' && (
                    <Text style={styles.modalItemHint}>
                      {item.valeur != null ? `${item.valeur} ${item.unite || ''}` : ''}
                      {item.date_analyse ? ` · ${item.date_analyse}` : ''}
                      {item.conforme === 1 ? ' · ✓' : item.conforme === 0 ? ' · ✗' : ''}
                    </Text>
                  )}
                  {typePreuve === 'etape_lot' && (
                    <Text style={styles.modalItemHint}>
                      Ordre {item.ordre} · {item.date_debut || '-'} → {item.date_fin || 'en cours'}
                      {item.operateur ? ` · ${item.operateur}` : ''}
                    </Text>
                  )}
                  {typePreuve === 'fournisseur' && (
                    <Text style={styles.modalItemHint}>
                      {item.code} · zone {item.zone_collecte_code}
                    </Text>
                  )}
                  {typePreuve === 'lot' && (
                    <Text style={styles.modalItemHint}>
                      {item.filiere} {item.est_cloture ? '· clôturé' : '· en cours'}
                    </Text>
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
  container: { flex: 1, backgroundColor: '#1a2e1a' },
  content: { padding: 16 },

  // Banner exigence
  exigenceBanner: {
    backgroundColor: '#243d24',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#7ec87e',
  },
  bannerLabel: {
    fontSize: 11,
    color: '#7a9a7a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  bannerCode: {
    fontSize: 11,
    color: '#7ec87e',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  bannerTitre: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
    lineHeight: 20,
  },

  // Preuves existantes
  preuvesBox: {
    backgroundColor: '#1f2f1f',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  preuvesBoxTitre: {
    fontSize: 13,
    fontWeight: '600',
    color: '#a8c8a8',
    marginBottom: 8,
  },
  preuveItem: {
    backgroundColor: '#243d24',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  preuveItemType: {
    fontSize: 11,
    color: '#7ec87e',
    marginBottom: 2,
  },
  preuveItemTitre: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '500',
  },
  preuveItemDate: {
    fontSize: 11,
    color: '#a8c8a8',
    marginTop: 2,
  },
  preuveItemDelete: {
    padding: 6,
  },
  preuveItemDeleteText: {
    fontSize: 18,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7ec87e',
    marginBottom: 12,
    marginTop: 8,
  },

  // Champs
  field: { marginBottom: 16 },
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
    minHeight: 80,
  },
  hint: {
    fontSize: 11,
    color: '#7a9a7a',
    fontStyle: 'italic',
    marginTop: 4,
  },

  // Bouton sélecteur
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
    fontSize: 22,
    color: '#7ec87e',
  },

  // Warning entités vides
  warningBox: {
    backgroundColor: '#2a2014',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#d4a04a',
  },
  warningText: {
    fontSize: 13,
    color: '#e8be78',
    fontWeight: '500',
    marginBottom: 4,
  },
  warningHint: {
    fontSize: 11,
    color: '#a8c8a8',
    fontStyle: 'italic',
  },

  // Note Session 8f
  session8fBox: {
    backgroundColor: '#1f2c38',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#7eaac8',
  },
  session8fTitre: {
    fontSize: 13,
    fontWeight: '600',
    color: '#a8c8e8',
    marginBottom: 6,
  },
  session8fText: {
    fontSize: 12,
    color: '#d0d8d0',
    lineHeight: 17,
  },

  // Bouton enregistrer
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

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a2e1a',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#3a5a3a',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#7ec87e',
  },
  modalClose: {
    fontSize: 24,
    color: '#a8c8a8',
    paddingHorizontal: 8,
  },
  modalItem: {
    backgroundColor: '#243d24',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
  },
  modalItemSelected: {
    borderWidth: 2,
    borderColor: '#7ec87e',
  },
  modalItemLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  modalItemHint: {
    fontSize: 11,
    color: '#a8c8a8',
    marginTop: 3,
    fontStyle: 'italic',
  },
});