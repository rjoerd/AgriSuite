// screens/ReleveCcpFormScreen.js
// Phase 3 Session 10b1 + 10b1-bis — Formulaire de saisie d'un relevé CCP
//
// 10b1     : Saisie initiale + détection conformité auto + modal action corrective
// 10b1-bis :
//   - Picker lots (depuis ExportTrack) + saisie manuelle de secours
//   - UX modal renforcée : sélection visible (bordure épaisse + ✓ + fond actif)
//   - Alerte succès explicite après enregistrement action corrective

import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, Modal, FlatList,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  getCcpAvecLimites, creerReleve, creerActionCorrective,
  TYPE_ACTION_LABELS, TYPE_ACTION_DESCRIPTIONS,
} from '../database/haccpSurveillance';
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('agrisuite.db');

// Récupère les lots actifs ExportTrack (non clôturés)
const getLotsActifs = () => {
  try {
    return db.getAllSync(
      `SELECT l.id, l.code_lot, l.filiere, c.nom_fr as culture_nom, l.statut
       FROM lots l
       LEFT JOIN cultures c ON l.culture_id = c.id
       WHERE l.est_cloture = 0
       ORDER BY l.cree_le DESC
       LIMIT 50`
    );
  } catch (err) {
    console.log('[ReleveCcpForm] Lecture lots impossible:', err.message);
    return [];
  }
};

export default function ReleveCcpFormScreen({ route, navigation }) {
  const { ccpId, lotId, lotCode } = route.params || {};
  const [ccp, setCcp] = useState(null);
  const [valeurs, setValeurs] = useState({});
  const [operateur, setOperateur] = useState('');
  const [equipe, setEquipe] = useState('');
  const [observations, setObservations] = useState('');
  const [lotIdInput, setLotIdInput] = useState(lotId || null);
  const [lotCodeInput, setLotCodeInput] = useState(lotCode || '');
  const [showLotPicker, setShowLotPicker] = useState(false);
  const [lotsActifs, setLotsActifs] = useState([]);
  const [saisieManuelleLot, setSaisieManuelleLot] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [releveCreated, setReleveCreated] = useState(null);
  const [typeAction, setTypeAction] = useState('isoler');
  const [descAction, setDescAction] = useState('');
  const [respDecision, setRespDecision] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (!ccpId) return;
      const c = getCcpAvecLimites(ccpId);
      if (c) {
        setCcp(c);
        if (c.action_corrective_default) setDescAction(c.action_corrective_default);
      }
    }, [ccpId])
  );

  const ouvrirLotPicker = () => {
    const lots = getLotsActifs();
    setLotsActifs(lots);
    setShowLotPicker(true);
  };

  const choisirLot = (lot) => {
    setLotIdInput(lot.id);
    setLotCodeInput(lot.code_lot);
    setShowLotPicker(false);
    setSaisieManuelleLot(false);
  };

  const activerSaisieManuelle = () => {
    setShowLotPicker(false);
    setSaisieManuelleLot(true);
    setLotIdInput(null);
  };

  const resetLot = () => {
    setLotIdInput(null);
    setLotCodeInput('');
    setSaisieManuelleLot(false);
  };

  if (!ccp) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loading}>Chargement…</Text>
      </View>
    );
  }

  const setValeur = (param, val) => {
    setValeurs((prev) => ({ ...prev, [param]: val }));
  };

  const submitReleve = () => {
    if (!operateur.trim()) {
      Alert.alert('Champ requis', "Le nom de l'opérateur est obligatoire.");
      return;
    }
    if (ccp.lot_obligatoire === 1 && !lotCodeInput.trim()) {
      Alert.alert('Lot requis', 'Ce CCP exige un rattachement à un lot.');
      return;
    }
    const valeursSaisies = Object.keys(valeurs).filter((k) => valeurs[k] !== '');
    if (valeursSaisies.length === 0) {
      Alert.alert('Aucune valeur', 'Au moins une mesure doit être saisie.');
      return;
    }

    const now = new Date();
    const date_releve = now.toISOString().slice(0, 10);
    const heure_releve = now.toTimeString().slice(0, 5);

    try {
      const result = creerReleve({
        ccp_id: ccp.id,
        lot_id: lotIdInput,
        lot_code: lotCodeInput.trim() || null,
        date_releve,
        heure_releve,
        operateur: operateur.trim(),
        equipe: equipe.trim() || null,
        valeurs,
        observations: observations.trim() || null,
      });

      if (result.conforme === 0) {
        setReleveCreated(result);
        setShowActionModal(true);
      } else {
        Alert.alert(
          '✅ Relevé conforme',
          'Toutes les valeurs sont dans les limites critiques.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (err) {
      Alert.alert('Erreur', String(err.message || err));
    }
  };

  const submitActionCorrective = () => {
    if (!descAction.trim()) {
      Alert.alert('Champ requis', "La description de l'action est obligatoire.");
      return;
    }
    try {
      creerActionCorrective({
        releve_id: releveCreated.id,
        type_action: typeAction,
        description: descAction.trim(),
        responsable_decision: respDecision.trim() || null,
        date_action: new Date().toISOString().slice(0, 10),
      });
      setShowActionModal(false);
      Alert.alert(
        '✅ Action corrective enregistrée',
        `Type : ${TYPE_ACTION_LABELS[typeAction]}\n\nLe relevé non conforme et son action corrective sont tracés. Le responsable qualité peut suivre la résolution depuis le dashboard.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert('Erreur', String(err.message || err));
    }
  };

  const skipActionCorrective = () => {
    Alert.alert(
      'Action corrective différée',
      "Tu peux compléter l'action corrective plus tard depuis le dashboard. Attention : ISO 22000 exige documentation sous 24h.",
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', onPress: () => { setShowActionModal(false); navigation.goBack(); } },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* En-tête CCP */}
      <View style={styles.headerCard}>
        <View style={styles.ccpNumeroBadge}>
          <Text style={styles.ccpNumeroText}>{ccp.numero}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.ccpNom}>{ccp.nom_ccp}</Text>
          <Text style={styles.produitNom}>🧪 {ccp.produit_nom} · {ccp.etape_processus}</Text>
        </View>
      </View>

      {/* Opérateur */}
      <Text style={styles.sectionTitle}>👤 Opérateur</Text>
      <Field label="Nom opérateur *" value={operateur} onChange={setOperateur} placeholder="Ex : Rakoto" />
      <Field label="Équipe (optionnel)" value={equipe} onChange={setEquipe} placeholder="Équipe matin / soir / nuit" />

      {/* Lot — Picker + saisie manuelle de secours */}
      <Text style={styles.sectionTitle}>
        📦 Lot {ccp.lot_obligatoire === 1 ? '*' : '(optionnel)'}
      </Text>

      {!lotCodeInput && !saisieManuelleLot && (
        <View style={styles.lotChoixBloc}>
          <TouchableOpacity style={styles.btnLotPrimary} onPress={ouvrirLotPicker}>
            <Text style={styles.btnLotPrimaryText}>📋 Choisir un lot existant</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnLotSecondary} onPress={activerSaisieManuelle}>
            <Text style={styles.btnLotSecondaryText}>✏️ Saisie manuelle (lot non créé)</Text>
          </TouchableOpacity>
        </View>
      )}

      {lotCodeInput && !saisieManuelleLot && (
        <View style={styles.lotSelectedCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.lotSelectedLabel}>Lot sélectionné</Text>
            <Text style={styles.lotSelectedCode}>{lotCodeInput}</Text>
          </View>
          <TouchableOpacity onPress={resetLot}>
            <Text style={styles.lotChangerText}>Changer</Text>
          </TouchableOpacity>
        </View>
      )}

      {saisieManuelleLot && (
        <View>
          <Field
            label="Code lot (saisie manuelle)"
            value={lotCodeInput}
            onChange={setLotCodeInput}
            placeholder="Ex : MDG-2026-D-GIN-001"
          />
          <TouchableOpacity onPress={resetLot}>
            <Text style={styles.lotChangerText}>← Revenir au picker</Text>
          </TouchableOpacity>
        </View>
      )}

      {ccp.lot_obligatoire === 0 && (
        <Text style={styles.hint}>
          Ce CCP est ambiant — peut être saisi sans lot (ex : qualité eau, hygiène).
        </Text>
      )}

      {/* Mesures */}
      <Text style={styles.sectionTitle}>📏 Mesures</Text>
      {ccp.limites && ccp.limites.length > 0 ? (
        ccp.limites.map((lim) => (
          <View key={lim.id} style={styles.limiteBloc}>
            <Text style={styles.limiteLabel}>{lim.parametre}</Text>
            <View style={styles.limiteRappelRow}>
              {lim.valeur_min !== null && (
                <Text style={styles.limiteRappel}>
                  min: {lim.valeur_min}{lim.unite ? ' ' + lim.unite : ''}
                </Text>
              )}
              {lim.valeur_max !== null && (
                <Text style={styles.limiteRappel}>
                  max: {lim.valeur_max}{lim.unite ? ' ' + lim.unite : ''}
                </Text>
              )}
            </View>
            <TextInput
              style={styles.limiteInput}
              value={valeurs[lim.parametre] || ''}
              onChangeText={(v) => setValeur(lim.parametre, v)}
              placeholder={`Valeur ${lim.unite ? '(' + lim.unite + ')' : ''}`}
              placeholderTextColor="#5a7a5a"
              keyboardType="decimal-pad"
            />
            {lim.methode_mesure && (
              <Text style={styles.limiteMethode}>🔬 {lim.methode_mesure}</Text>
            )}
          </View>
        ))
      ) : (
        <View style={styles.emptyBlock}>
          <Text style={styles.emptyText}>Aucune limite critique définie pour ce CCP.</Text>
        </View>
      )}

      {/* Observations */}
      <Text style={styles.sectionTitle}>📝 Observations</Text>
      <TextInput
        style={[styles.fieldInput, { minHeight: 80, textAlignVertical: 'top' }]}
        value={observations}
        onChangeText={setObservations}
        placeholder="Conditions ambiantes, anomalies, remarques…"
        placeholderTextColor="#5a7a5a"
        multiline
      />

      <TouchableOpacity style={styles.btnValider} onPress={submitReleve}>
        <Text style={styles.btnValiderText}>✓ Valider le relevé</Text>
      </TouchableOpacity>

      <View style={{ height: 50 }} />

      {/* Modal picker lot */}
      <Modal visible={showLotPicker} transparent animationType="slide" onRequestClose={() => setShowLotPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📦 Choisir un lot</Text>

            {lotsActifs.length === 0 ? (
              <View style={styles.emptyBlock}>
                <Text style={styles.emptyText}>
                  Aucun lot actif en base ExportTrack. Utilise la saisie manuelle.
                </Text>
              </View>
            ) : (
              <FlatList
                data={lotsActifs}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.lotItem} onPress={() => choisirLot(item)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lotItemCode}>{item.code_lot}</Text>
                      <Text style={styles.lotItemMeta}>
                        {item.filiere === 'production' ? '🌱 Production' : '🤝 Collecte'} ·
                        {item.culture_nom ? ` ${item.culture_nom}` : ''} ·
                        {' '}{item.statut}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}

            <TouchableOpacity style={styles.btnLotSecondary} onPress={activerSaisieManuelle}>
              <Text style={styles.btnLotSecondaryText}>✏️ Saisie manuelle plutôt</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnFermer} onPress={() => setShowLotPicker(false)}>
              <Text style={styles.btnFermerText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal action corrective */}
      <Modal visible={showActionModal} transparent animationType="slide" onRequestClose={() => {}}>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalTitle}>⚠ Relevé non conforme</Text>
            <Text style={styles.modalMotifs}>{releveCreated?.motifs}</Text>
            <Text style={styles.modalInfo}>
              ISO 22000 exige une action corrective documentée. Choisis le type
              d'action immédiate :
            </Text>

            {Object.keys(TYPE_ACTION_LABELS).map((key) => {
              const active = typeAction === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.typeActionOption,
                    active && styles.typeActionOptionActive,
                  ]}
                  onPress={() => setTypeAction(key)}
                >
                  <View style={styles.typeActionHeader}>
                    {active && <Text style={styles.typeActionCheck}>✓ </Text>}
                    <Text style={[
                      styles.typeActionLabel,
                      active && styles.typeActionLabelActive,
                    ]}>
                      {TYPE_ACTION_LABELS[key]}
                    </Text>
                  </View>
                  <Text style={styles.typeActionDesc}>
                    {TYPE_ACTION_DESCRIPTIONS[key]}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <Text style={styles.fieldLabel}>Description de l'action *</Text>
            <TextInput
              style={[styles.fieldInput, { minHeight: 80, textAlignVertical: 'top' }]}
              value={descAction}
              onChangeText={setDescAction}
              placeholder="Décris précisément ce qui est fait..."
              placeholderTextColor="#5a7a5a"
              multiline
            />

            <Text style={styles.fieldLabel}>Responsable de la décision</Text>
            <TextInput
              style={styles.fieldInput}
              value={respDecision}
              onChangeText={setRespDecision}
              placeholder="Nom du responsable qualité"
              placeholderTextColor="#5a7a5a"
            />

            <TouchableOpacity style={styles.btnValider} onPress={submitActionCorrective}>
              <Text style={styles.btnValiderText}>💾 Enregistrer action</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnSkip} onPress={skipActionCorrective}>
              <Text style={styles.btnSkipText}>{'Différer (< 24h)'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#5a7a5a"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a2e1a' },
  content: { padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a2e1a' },
  loading: { color: '#7ec87e', fontSize: 16 },

  headerCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#243d24', borderRadius: 12, padding: 14,
    marginBottom: 16, borderLeftWidth: 5, borderLeftColor: '#7ec87e',
  },
  ccpNumeroBadge: {
    backgroundColor: '#7ec87e', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 10, marginRight: 12,
  },
  ccpNumeroText: { color: '#1a2e1a', fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  ccpNom: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  produitNom: { fontSize: 12, color: '#a8c8a8', marginTop: 2 },

  sectionTitle: {
    fontSize: 14, fontWeight: '700', color: '#7ec87e',
    marginTop: 18, marginBottom: 8,
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  hint: { fontSize: 11, color: '#8aa88a', fontStyle: 'italic', marginTop: 4, marginBottom: 4 },

  field: { marginBottom: 10 },
  fieldLabel: { fontSize: 12, color: '#a8c8a8', marginBottom: 4, fontWeight: '500' },
  fieldInput: {
    backgroundColor: '#243d24', borderRadius: 8, padding: 10,
    color: '#fff', fontSize: 14,
    borderWidth: 1, borderColor: '#3a5a3a',
  },

  // Lot choix
  lotChoixBloc: { marginBottom: 10 },
  btnLotPrimary: {
    backgroundColor: '#7ec87e', borderRadius: 8, padding: 12,
    alignItems: 'center', marginBottom: 8,
  },
  btnLotPrimaryText: { color: '#1a2e1a', fontSize: 14, fontWeight: '700' },
  btnLotSecondary: {
    backgroundColor: '#243d24', borderRadius: 8, padding: 10,
    alignItems: 'center',
    borderWidth: 1, borderColor: '#3a5a3a', borderStyle: 'dashed',
  },
  btnLotSecondaryText: { color: '#a8c8a8', fontSize: 13 },

  lotSelectedCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#243d24', borderRadius: 8, padding: 12,
    borderLeftWidth: 3, borderLeftColor: '#7ec87e',
    marginBottom: 8,
  },
  lotSelectedLabel: { fontSize: 10, color: '#a8c8a8', textTransform: 'uppercase' },
  lotSelectedCode: { fontSize: 14, color: '#fff', fontWeight: '700', marginTop: 2 },
  lotChangerText: { color: '#7ec87e', fontSize: 12, fontWeight: '600' },

  lotItem: {
    backgroundColor: '#243d24', borderRadius: 8, padding: 12,
    marginBottom: 6, flexDirection: 'row', alignItems: 'center',
  },
  lotItemCode: { fontSize: 13, color: '#fff', fontWeight: '700' },
  lotItemMeta: { fontSize: 11, color: '#a8c8a8', marginTop: 3 },

  limiteBloc: {
    backgroundColor: '#243d24', borderRadius: 8, padding: 10,
    marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#d4a04a',
  },
  limiteLabel: { fontSize: 13, color: '#fff', fontWeight: '700', marginBottom: 4 },
  limiteRappelRow: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  limiteRappel: { fontSize: 11, color: '#7ec87e', fontWeight: '600' },
  limiteInput: {
    backgroundColor: '#1a2e1a', borderRadius: 6, padding: 10,
    color: '#fff', fontSize: 16, fontWeight: '600',
    borderWidth: 1, borderColor: '#3a5a3a',
  },
  limiteMethode: { fontSize: 10, color: '#a8c8a8', marginTop: 4, fontStyle: 'italic' },

  emptyBlock: {
    backgroundColor: '#243d24', borderRadius: 8, padding: 16,
    alignItems: 'center', marginBottom: 8,
  },
  emptyText: { color: '#8aa88a', fontStyle: 'italic', fontSize: 13, textAlign: 'center' },

  btnValider: {
    backgroundColor: '#7ec87e', borderRadius: 10, padding: 14,
    alignItems: 'center', marginTop: 20,
  },
  btnValiderText: { fontSize: 15, fontWeight: '700', color: '#1a2e1a' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#1a2e1a',
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: 16, maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 18, fontWeight: 'bold', color: '#e87e3a',
    marginBottom: 8, textAlign: 'center',
  },
  modalMotifs: {
    backgroundColor: '#3d2424', borderRadius: 6, padding: 10,
    color: '#ff9f9f', fontSize: 13, marginBottom: 10,
    borderLeftWidth: 3, borderLeftColor: '#e87e3a',
  },
  modalInfo: {
    fontSize: 12, color: '#a8c8a8', marginBottom: 12,
    fontStyle: 'italic', lineHeight: 17,
  },

  // 🆕 Type action option — UX renforcée
  typeActionOption: {
    backgroundColor: '#243d24', borderRadius: 8, padding: 12,
    marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#3a5a3a',
    borderWidth: 1, borderColor: 'transparent',
  },
  typeActionOptionActive: {
    backgroundColor: '#2e5a2e',
    borderLeftColor: '#7ec87e',
    borderWidth: 1, borderColor: '#7ec87e',
  },
  typeActionHeader: { flexDirection: 'row', alignItems: 'center' },
  typeActionCheck: { color: '#7ec87e', fontSize: 16, fontWeight: 'bold' },
  typeActionLabel: { fontSize: 13, color: '#fff', fontWeight: '600' },
  typeActionLabelActive: { color: '#fff', fontWeight: '800' },
  typeActionDesc: { fontSize: 11, color: '#a8c8a8', marginTop: 4 },

  btnSkip: {
    backgroundColor: '#3a5a3a', borderRadius: 8, padding: 12,
    alignItems: 'center', marginTop: 8, marginBottom: 12,
  },
  btnSkipText: { color: '#a8c8a8', fontSize: 13, fontWeight: '600' },

  btnFermer: {
    backgroundColor: '#3a5a3a', borderRadius: 8, padding: 12,
    alignItems: 'center', marginTop: 8,
  },
  btnFermerText: { color: '#a8c8a8', fontSize: 13, fontWeight: '600' },
});