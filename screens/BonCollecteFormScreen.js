// ============================================================
// AgriSuite Madagascar — Phase 3 / Session 4B partie 2
// screens/BonCollecteFormScreen.js
//
// Saisie d'un bon de collecte (filière B).
// Workflow B — opérateur terrain : choisit fournisseur + lot,
// saisit qty + prix unitaire, total auto-calculé, valide.
//
// Navigation possible :
//   - Vide :                      navigation.navigate('BonCollecteForm')
//   - Pré-rempli fournisseur :   navigation.navigate('BonCollecteForm',
//                                  { fournisseurId: 5 })
//   - Pré-rempli lot :           navigation.navigate('BonCollecteForm',
//                                  { lotId: 12 })
//   - Retour création de lot :   navigation.navigate('BonCollecteForm',
//                                  { lotIdNouveau: 13 })
//
// Workflow après validation :
//   Modal de choix → Nouveau bon même fournisseur / Nouveau bon même lot / Retour
// ============================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  insertBonCollecte,
  genererNumeroBonCollecte,
  getAllFournisseurs,
  getFournisseurById,
  getAllLots,
  getLotById,
  getQuantiteActuelleLot,
} from '../database/exportTrack';
import { getCultureById } from '../database/cropEngine';

// ============================================================
// HELPERS
// ============================================================

const formatKg = (kg) => {
  if (kg == null || isNaN(kg)) return '—';
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} t`;
  return `${kg.toFixed(0)} kg`;
};

const formatAr = (ar) => {
  if (ar == null || isNaN(ar)) return '—';
  return ar.toLocaleString('fr-FR') + ' Ar';
};

const aujourdhui = () => new Date().toISOString().slice(0, 10);

const STATUTS_PAIEMENT = [
  { valeur: 'paye',         label: '✓ Payé',
    description: 'Paiement effectué au moment de la collecte' },
  { valeur: 'a_payer',      label: '⏳ À payer',
    description: 'Paiement différé (vendredi, fin de mois...)' },
  { valeur: 'avance',       label: '💰 Avance versée',
    description: 'Avance partielle, solde à régler' },
];

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function BonCollecteFormScreen({ navigation, route }) {
  const fournisseurIdInitial = route?.params?.fournisseurId || null;
  // lotId et lotIdNouveau sont équivalents — lotIdNouveau vient du retour
  // de LotCollecteFormScreen mode rapide
  const lotIdInitial = route?.params?.lotId || route?.params?.lotIdNouveau || null;

  // ---- Référentiels ----
  const [fournisseurs, setFournisseurs] = useState([]);
  const [lots, setLots] = useState([]);
  const [culturesIdx, setCulturesIdx] = useState({});

  // ---- Champs ----
  const [fournisseurId, setFournisseurId] = useState(fournisseurIdInitial);
  const [lotId, setLotId] = useState(lotIdInitial);
  const [dateCollecte, setDateCollecte] = useState(aujourdhui());
  const [quantiteKg, setQuantiteKg] = useState('');
  const [prixUnitaire, setPrixUnitaire] = useState('');
  const [paiementStatut, setPaiementStatut] = useState('paye');
  const [collecteur, setCollecteur] = useState('');
  const [lieuCollecte, setLieuCollecte] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [numeroCarnet, setNumeroCarnet] = useState('');
  const [notes, setNotes] = useState('');

  // ---- État UI ----
  const [enCours, setEnCours] = useState(false);
  const [erreurs, setErreurs] = useState({});
  const [modalOuvert, setModalOuvert] = useState(null);
  // 'fournisseur' | 'lot' | 'paiement'

  // ---- Modal de confirmation post-saisie ----
  const [confirmModal, setConfirmModal] = useState(null);
  // { numeroBon, prixTotal, fournisseur, lot } | null

  // ============================================================
  // CHARGEMENT INITIAL ET RECHARGE
  // ============================================================

  const charger = useCallback(() => {
    try {
      const fs = getAllFournisseurs('actif') || [];
      setFournisseurs(fs);

      // Lots collecte ouverts uniquement
      const tousLots = getAllLots({ filiere: 'collecte', statut: 'en_cours' }) || [];
      setLots(tousLots.filter((l) => !l.est_cloture));

      // Index des cultures pour résolution rapide nom
      const idx = {};
      const culturesUtilisees = new Set();
      for (const lot of tousLots) {
        if (lot.culture_id) culturesUtilisees.add(lot.culture_id);
      }
      for (const id of culturesUtilisees) {
        try {
          const c = getCultureById(id);
          if (c) idx[id] = c.nom_fr || c.nom;
        } catch (e) {
          // skip
        }
      }
      setCulturesIdx(idx);
    } catch (err) {
      console.error('[BonCollecteForm] Erreur chargement :', err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger])
  );

  // Si on revient avec un lotIdNouveau (création à la volée), on le sélectionne
  useEffect(() => {
    if (route?.params?.lotIdNouveau) {
      setLotId(route.params.lotIdNouveau);
    }
  }, [route?.params?.lotIdNouveau]);

  // ============================================================
  // RÉSOLUTION LIBELLÉS
  // ============================================================

  const fournisseur = useMemo(
    () => fournisseurs.find((f) => f.id === fournisseurId),
    [fournisseurs, fournisseurId]
  );

  const lot = useMemo(
    () => lots.find((l) => l.id === lotId),
    [lots, lotId]
  );

  const fournisseurLibelle = useMemo(() => {
    if (!fournisseur) return null;
    return `${fournisseur.nom} (${fournisseur.code})`;
  }, [fournisseur]);

  const lotLibelle = useMemo(() => {
    if (!lot) return null;
    const cultureNom = culturesIdx[lot.culture_id] || `#${lot.culture_id}`;
    return `${lot.code_lot} · ${cultureNom}`;
  }, [lot, culturesIdx]);

  const paiementLabel = useMemo(() => {
    return STATUTS_PAIEMENT.find((s) => s.valeur === paiementStatut)?.label
      || paiementStatut;
  }, [paiementStatut]);

  // ============================================================
  // CALCULS
  // ============================================================

  // Prix total auto-calculé (qty × prix unitaire)
  const prixTotal = useMemo(() => {
    const qty = parseFloat(quantiteKg);
    const pu = parseFloat(prixUnitaire);
    if (isNaN(qty) || isNaN(pu) || qty <= 0 || pu <= 0) return null;
    return Math.round(qty * pu);
  }, [quantiteKg, prixUnitaire]);

  // ============================================================
  // COHÉRENCE FOURNISSEUR / LOT
  // ============================================================

  // Si le fournisseur a une zone et que le lot a une zone différente,
  // on alerte (mais on ne bloque pas — cas légitime : un paysan peut
  // se déplacer pour livrer dans une autre zone).
  const incoherenceZone = useMemo(() => {
    if (!fournisseur || !lot) return null;
    if (!fournisseur.zone_collecte_code || !lot.zone_collecte_code) return null;
    if (fournisseur.zone_collecte_code !== lot.zone_collecte_code) {
      return {
        fournisseurZone: fournisseur.zone_collecte_code,
        lotZone: lot.zone_collecte_code,
      };
    }
    return null;
  }, [fournisseur, lot]);

  // ============================================================
  // VALIDATION
  // ============================================================

  const valider = () => {
    const errs = {};
    if (!fournisseurId) errs.fournisseurId = 'Fournisseur requis';
    if (!lotId) errs.lotId = 'Lot requis';
    if (!dateCollecte) errs.dateCollecte = 'Date requise';

    const qty = parseFloat(quantiteKg);
    if (!quantiteKg || isNaN(qty) || qty <= 0) {
      errs.quantiteKg = 'Quantité > 0 requise';
    }

    const pu = parseFloat(prixUnitaire);
    if (!prixUnitaire || isNaN(pu) || pu <= 0) {
      errs.prixUnitaire = 'Prix unitaire > 0 requis';
    }

    if (!collecteur.trim()) errs.collecteur = 'Identité du collecteur requise';

    // GPS validation
    if (latitude && (isNaN(parseFloat(latitude)) ||
        parseFloat(latitude) < -90 || parseFloat(latitude) > 90)) {
      errs.latitude = 'Latitude entre -90 et 90';
    }
    if (longitude && (isNaN(parseFloat(longitude)) ||
        parseFloat(longitude) < -180 || parseFloat(longitude) > 180)) {
      errs.longitude = 'Longitude entre -180 et 180';
    }
    if ((latitude && !longitude) || (!latitude && longitude)) {
      errs.latitude = 'Saisir lat ET lon (ou aucun)';
    }

    setErreurs(errs);
    return Object.keys(errs).length === 0;
  };

  // ============================================================
  // SAUVEGARDE
  // ============================================================

  const sauvegarder = useCallback(() => {
    if (!valider()) {
      Alert.alert(
        'Champs manquants',
        'Vérifie les champs marqués en rouge avant de continuer.'
      );
      return;
    }

    setEnCours(true);

    try {
      const numeroBon = genererNumeroBonCollecte();
      const qty = parseFloat(quantiteKg);
      const pu = parseFloat(prixUnitaire);

      // Notes finales : ajout n° carnet papier en mention si fourni
      let notesFinales = notes.trim();
      if (numeroCarnet.trim()) {
        const mention = `[N° carnet papier : ${numeroCarnet.trim()}]`;
        notesFinales = notesFinales ? `${mention}\n${notesFinales}` : mention;
      }

      const payload = {
        numero_bon: numeroBon,
        fournisseur_id: fournisseurId,
        lot_id: lotId,
        date_collecte: dateCollecte,
        quantite_kg: qty,
        prix_achat_unitaire: pu,
        prix_total: prixTotal,
        paiement_statut: paiementStatut,
        collecteur: collecteur.trim(),
        lieu_collecte: lieuCollecte.trim() || null,
        latitude_collecte: latitude ? parseFloat(latitude) : null,
        longitude_collecte: longitude ? parseFloat(longitude) : null,
        attestation_origine_photo: null, // Photo à venir Session 7
        notes: notesFinales || null,
      };

      const nouveauId = insertBonCollecte(payload);

      setEnCours(false);

      // Affichage modal de confirmation avec choix de continuation
      setConfirmModal({
        nouveauId,
        numeroBon,
        prixTotal,
        quantite: qty,
        fournisseur,
        lot,
      });
    } catch (err) {
      setEnCours(false);
      console.error('[BonCollecteForm] Erreur sauvegarde :', err);
      Alert.alert(
        'Erreur lors de l\'enregistrement',
        err.message || 'Impossible d\'enregistrer le bon. Vérifie les champs.'
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    fournisseurId, lotId, dateCollecte, quantiteKg, prixUnitaire,
    paiementStatut, collecteur, lieuCollecte, latitude, longitude,
    numeroCarnet, notes, prixTotal, fournisseur, lot,
  ]);

  // ============================================================
  // SUITE APRÈS CONFIRMATION
  // ============================================================

  const continuerMemeFournisseur = () => {
    setConfirmModal(null);
    // On garde fournisseurId et collecteur, on reset le reste
    setLotId(null);
    setDateCollecte(aujourdhui());
    setQuantiteKg('');
    setPrixUnitaire('');
    setPaiementStatut('paye');
    setLieuCollecte('');
    setLatitude('');
    setLongitude('');
    setNumeroCarnet('');
    setNotes('');
    setErreurs({});
    charger();
  };

  const continuerMemeLot = () => {
    setConfirmModal(null);
    // On garde lotId et collecteur, on reset le reste
    setFournisseurId(null);
    setDateCollecte(aujourdhui());
    setQuantiteKg('');
    setPrixUnitaire('');
    setPaiementStatut('paye');
    setLieuCollecte('');
    setLatitude('');
    setLongitude('');
    setNumeroCarnet('');
    setNotes('');
    setErreurs({});
    charger();
  };

  const retournerListe = () => {
    setConfirmModal(null);
    navigation.goBack();
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0d1a0d" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* En-tête */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.headerBack}>‹ Retour</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitre}>Nouveau bon de collecte</Text>
          <Text style={styles.headerSousTitre}>
            🤝 Filière B — saisie terrain
          </Text>
        </View>

        {/* Acteurs */}
        <Section titre="Acteurs">
          <Champ label="Fournisseur *" erreur={erreurs.fournisseurId}>
            <Selecteur
              valeur={fournisseurLibelle}
              placeholder={fournisseurs.length === 0
                ? 'Aucun fournisseur actif'
                : 'Choisir un fournisseur'}
              onPress={() => fournisseurs.length > 0 && setModalOuvert('fournisseur')}
              disabled={fournisseurs.length === 0}
            />
            {fournisseurs.length === 0 && (
              <TouchableOpacity
                style={styles.linkInline}
                onPress={() => navigation.navigate('FournisseurForm')}
              >
                <Text style={styles.linkInlineTexte}>
                  + Créer un fournisseur d'abord
                </Text>
              </TouchableOpacity>
            )}
          </Champ>

          <Champ label="Lot collecte *" erreur={erreurs.lotId}>
            <Selecteur
              valeur={lotLibelle}
              placeholder={lots.length === 0
                ? 'Aucun lot collecte ouvert'
                : 'Choisir ou créer un lot'}
              onPress={() => setModalOuvert('lot')}
            />
            {lots.length === 0 && (
              <Text style={styles.hint}>
                💡 Crée un lot via "Nouveau lot" dans le sélecteur ci-dessus.
              </Text>
            )}
          </Champ>

          {/* Alerte incohérence zone */}
          {incoherenceZone && (
            <View style={styles.alerteIncoh}>
              <Text style={styles.alerteIncohTexte}>
                ⚠️ Le fournisseur est en zone {incoherenceZone.fournisseurZone},
                le lot en zone {incoherenceZone.lotZone}. Cas possible mais
                inhabituel — vérifie ton choix.
              </Text>
            </View>
          )}
        </Section>

        {/* Quantité et prix */}
        <Section titre="Quantité & prix">
          <Champ label="Date de collecte *" erreur={erreurs.dateCollecte}>
            <TextInput
              style={styles.input}
              value={dateCollecte}
              onChangeText={setDateCollecte}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#5a6a5a"
              keyboardType="numbers-and-punctuation"
            />
          </Champ>

          <Champ label="Quantité (kg) *" erreur={erreurs.quantiteKg}>
            <View style={styles.inputAvecUnite}>
              <TextInput
                style={styles.inputQuantite}
                value={quantiteKg}
                onChangeText={setQuantiteKg}
                placeholder="0"
                placeholderTextColor="#5a6a5a"
                keyboardType="decimal-pad"
              />
              <Text style={styles.inputUnite}>kg</Text>
            </View>
          </Champ>

          <Champ label="Prix unitaire (Ar/kg) *" erreur={erreurs.prixUnitaire}>
            <View style={styles.inputAvecUnite}>
              <TextInput
                style={styles.inputQuantite}
                value={prixUnitaire}
                onChangeText={setPrixUnitaire}
                placeholder="0"
                placeholderTextColor="#5a6a5a"
                keyboardType="decimal-pad"
              />
              <Text style={styles.inputUnite}>Ar/kg</Text>
            </View>
          </Champ>

          {/* Total auto-calculé — affiché dans une carte mise en avant */}
          {prixTotal != null && (
            <View style={styles.totalBox}>
              <View style={styles.totalCalcul}>
                <Text style={styles.totalCalculTexte}>
                  {parseFloat(quantiteKg).toFixed(1)} kg × {parseFloat(prixUnitaire).toLocaleString('fr-FR')} Ar
                </Text>
              </View>
              <View style={styles.totalLigne}>
                <Text style={styles.totalLabel}>Total à payer</Text>
                <Text style={styles.totalValeur}>{formatAr(prixTotal)}</Text>
              </View>
            </View>
          )}

          <Champ label="Statut paiement *">
            <Selecteur
              valeur={paiementLabel}
              placeholder="Choisir un statut"
              onPress={() => setModalOuvert('paiement')}
            />
          </Champ>
        </Section>

        {/* Traçabilité collecte */}
        <Section titre="Traçabilité collecte">
          <Champ label="Collecteur *" erreur={erreurs.collecteur}>
            <TextInput
              style={styles.input}
              value={collecteur}
              onChangeText={setCollecteur}
              placeholder="Nom de la personne qui a collecté"
              placeholderTextColor="#5a6a5a"
              autoCapitalize="words"
            />
          </Champ>

          <Champ label="Lieu de collecte (optionnel)">
            <TextInput
              style={styles.input}
              value={lieuCollecte}
              onChangeText={setLieuCollecte}
              placeholder="Ex: marché de Sambava, hangar coopérative..."
              placeholderTextColor="#5a6a5a"
            />
          </Champ>

          <View style={styles.gpsRow}>
            <Champ label="Latitude" erreur={erreurs.latitude} style={{ flex: 1 }}>
              <TextInput
                style={styles.input}
                value={latitude}
                onChangeText={setLatitude}
                placeholder="-14.27"
                placeholderTextColor="#5a6a5a"
                keyboardType="numbers-and-punctuation"
              />
            </Champ>
            <View style={{ width: 10 }} />
            <Champ label="Longitude" erreur={erreurs.longitude} style={{ flex: 1 }}>
              <TextInput
                style={styles.input}
                value={longitude}
                onChangeText={setLongitude}
                placeholder="50.17"
                placeholderTextColor="#5a6a5a"
                keyboardType="numbers-and-punctuation"
              />
            </Champ>
          </View>

          <Champ label="N° carnet papier (optionnel)">
            <TextInput
              style={styles.input}
              value={numeroCarnet}
              onChangeText={setNumeroCarnet}
              placeholder="Numéro inscrit sur le carnet de bons"
              placeholderTextColor="#5a6a5a"
            />
            <Text style={styles.hint}>
              Si tu utilises un carnet papier en parallèle, saisis ici le numéro
              pour réconciliation audit.
            </Text>
          </Champ>

          <Champ label="Notes (optionnel)">
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Observations sur la qualité, conditions..."
              placeholderTextColor="#5a6a5a"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </Champ>
        </Section>

        {/* Boutons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.btnAnnuler}
            onPress={() => navigation.goBack()}
            disabled={enCours}
          >
            <Text style={styles.btnAnnulerTexte}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnPrincipal, enCours && styles.btnDisabled]}
            onPress={sauvegarder}
            disabled={enCours}
          >
            <Text style={styles.btnPrincipalTexte}>
              {enCours ? 'Enregistrement…' : '+ Enregistrer le bon'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Modal sélection */}
      <ModalSelection
        visible={modalOuvert !== null}
        onClose={() => setModalOuvert(null)}
        type={modalOuvert}
        fournisseurs={fournisseurs}
        lots={lots}
        culturesIdx={culturesIdx}
        onSelectFournisseur={(id) => { setFournisseurId(id); setModalOuvert(null); }}
        onSelectLot={(id) => { setLotId(id); setModalOuvert(null); }}
        onSelectPaiement={(s) => { setPaiementStatut(s); setModalOuvert(null); }}
        onCreerLot={() => {
          setModalOuvert(null);
          // On part en mode rapide ; au retour, le lot sera sélectionné
          // automatiquement via route.params.lotIdNouveau
          navigation.navigate('LotCollecteForm', {
            mode: 'rapide',
            // Si fournisseur déjà choisi, pré-remplit la zone
            zoneCodeInitiale: fournisseur?.zone_collecte_code || null,
          });
        }}
      />

      {/* Modal de confirmation post-saisie */}
      <ConfirmationModal
        visible={confirmModal !== null}
        info={confirmModal}
        onMemeFournisseur={continuerMemeFournisseur}
        onMemeLot={continuerMemeLot}
        onRetour={retournerListe}
      />
    </KeyboardAvoidingView>
  );
}

// ============================================================
// SOUS-COMPOSANTS
// ============================================================

function Section({ titre, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitre}>{titre}</Text>
      {children}
    </View>
  );
}

function Champ({ label, erreur, children, style }) {
  return (
    <View style={[styles.champ, style]}>
      <Text style={styles.champLabel}>{label}</Text>
      {children}
      {erreur ? <Text style={styles.champErreur}>⚠ {erreur}</Text> : null}
    </View>
  );
}

function Selecteur({ valeur, placeholder, onPress, disabled }) {
  return (
    <TouchableOpacity
      style={[styles.selecteur, disabled && styles.selecteurDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.selecteurValeur,
        !valeur && styles.selecteurPlaceholder,
      ]}>
        {valeur || placeholder}
      </Text>
      <Text style={styles.selecteurChevron}>›</Text>
    </TouchableOpacity>
  );
}

function ModalSelection({
  visible, onClose, type,
  fournisseurs, lots, culturesIdx,
  onSelectFournisseur, onSelectLot, onSelectPaiement, onCreerLot,
}) {
  let titre = '';
  let items = [];
  let onSelect = () => {};
  let footerCustom = null;

  if (type === 'fournisseur') {
    titre = 'Choisir un fournisseur';
    items = fournisseurs.map((f) => ({
      id: f.id,
      label: f.nom,
      sub: `${f.code} · ${f.zone_collecte_code}${f.commune ? ` · ${f.commune}` : ''}`,
    }));
    onSelect = onSelectFournisseur;
  } else if (type === 'lot') {
    titre = 'Choisir un lot collecte';
    items = lots.map((l) => {
      const cultureNom = culturesIdx[l.culture_id] || `culture #${l.culture_id}`;
      return {
        id: l.id,
        label: l.code_lot,
        sub: `${cultureNom} · ${l.zone_collecte_code} · début ${l.date_debut}`,
      };
    });
    onSelect = onSelectLot;
    // Bouton "Créer un nouveau lot" en bas du modal
    footerCustom = (
      <TouchableOpacity
        style={styles.modalFooterBtn}
        onPress={onCreerLot}
      >
        <Text style={styles.modalFooterBtnTexte}>
          + Créer un nouveau lot
        </Text>
      </TouchableOpacity>
    );
  } else if (type === 'paiement') {
    titre = 'Statut paiement';
    items = STATUTS_PAIEMENT.map((s) => ({
      id: s.valeur,
      label: s.label,
      sub: s.description,
    }));
    onSelect = onSelectPaiement;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitre}>{titre}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalFermer}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalListe}>
            {items.length === 0 ? (
              <View style={styles.modalVide}>
                <Text style={styles.modalVideTexte}>
                  {type === 'lot'
                    ? 'Aucun lot collecte ouvert. Crée un lot avec le bouton ci-dessous.'
                    : 'Aucun élément.'}
                </Text>
              </View>
            ) : (
              items.map((it) => (
                <TouchableOpacity
                  key={String(it.id)}
                  style={styles.modalItem}
                  onPress={() => onSelect(it.id)}
                >
                  <Text style={styles.modalItemLabel}>{it.label}</Text>
                  {it.sub ? (
                    <Text style={styles.modalItemSub}>{it.sub}</Text>
                  ) : null}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
          {footerCustom}
        </View>
      </View>
    </Modal>
  );
}

function ConfirmationModal({ visible, info, onMemeFournisseur, onMemeLot, onRetour }) {
  if (!info) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onRetour}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.confirmContent}>
          <Text style={styles.confirmEmoji}>✅</Text>
          <Text style={styles.confirmTitre}>Bon enregistré</Text>
          <Text style={styles.confirmNumero}>{info.numeroBon}</Text>

          <View style={styles.confirmDetails}>
            <View style={styles.confirmDetail}>
              <Text style={styles.confirmDetailLabel}>Quantité</Text>
              <Text style={styles.confirmDetailValeur}>
                {formatKg(info.quantite)}
              </Text>
            </View>
            <View style={styles.confirmDetail}>
              <Text style={styles.confirmDetailLabel}>Total</Text>
              <Text style={styles.confirmDetailValeur}>
                {formatAr(info.prixTotal)}
              </Text>
            </View>
          </View>

          <Text style={styles.confirmContexte}>
            👤 {info.fournisseur?.nom}
            {'\n'}
            📦 {info.lot?.code_lot}
          </Text>

          <Text style={styles.confirmQuestion}>Que souhaites-tu faire ?</Text>

          <TouchableOpacity
            style={[styles.confirmBtn, styles.confirmBtnPrincipal]}
            onPress={onMemeFournisseur}
          >
            <Text style={styles.confirmBtnPrincipalTexte}>
              ➕ Nouveau bon — même fournisseur
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.confirmBtn, styles.confirmBtnSecondaire]}
            onPress={onMemeLot}
          >
            <Text style={styles.confirmBtnSecondaireTexte}>
              ➕ Nouveau bon — même lot
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.confirmBtnRetour}
            onPress={onRetour}
          >
            <Text style={styles.confirmBtnRetourTexte}>
              Retour à la liste
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================
// STYLES
// ============================================================

const COLORS = {
  bgDark: '#0d1a0d',
  bgCard: '#1a2e1a',
  bgInput: '#0f1f0f',
  border: '#2d4a2d',
  vert: '#7ec87e',
  vertClair: '#a8d9a8',
  ambre: '#d4a04a',
  ambreClair: '#e8be78',
  texteDoux: '#c8d4c8',
  texteSecond: '#8a9a8a',
  texteMute: '#5a6a5a',
  rouge: '#c87e7e',
  jaune: '#d4c47e',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  scrollContent: { padding: 16, paddingBottom: 32 },

  header: { marginBottom: 16 },
  headerBack: { color: COLORS.vert, fontSize: 14, marginBottom: 8 },
  headerTitre: { color: COLORS.ambre, fontSize: 22, fontWeight: '700' },
  headerSousTitre: { color: COLORS.texteSecond, fontSize: 13, marginTop: 4 },

  section: {
    backgroundColor: COLORS.bgCard,
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  sectionTitre: {
    color: COLORS.vertClair,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  champ: { marginBottom: 12 },
  champLabel: {
    color: COLORS.texteDoux,
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '500',
  },
  champErreur: { color: COLORS.rouge, fontSize: 11, marginTop: 4 },

  input: {
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.texteDoux,
    fontSize: 14,
  },
  inputMulti: { minHeight: 70, textAlignVertical: 'top' },

  // Input avec unité (qty kg, prix Ar/kg)
  inputAvecUnite: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgInput,
    borderWidth: 1.5,
    borderColor: COLORS.ambre,
    borderRadius: 8,
    overflow: 'hidden',
  },
  inputQuantite: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: COLORS.texteDoux,
    fontSize: 22,
    fontWeight: 'bold',
  },
  inputUnite: {
    color: COLORS.ambreClair,
    fontSize: 14,
    fontWeight: '700',
    paddingRight: 14,
  },

  // Box total
  totalBox: {
    backgroundColor: '#2a2014',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.ambre,
  },
  totalCalcul: {
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 8,
  },
  totalCalculTexte: {
    color: COLORS.texteSecond,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  totalLigne: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    color: COLORS.ambreClair,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalValeur: {
    color: COLORS.ambre,
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'monospace',
  },

  hint: {
    color: COLORS.texteMute,
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },

  // Sélecteur
  selecteur: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selecteurDisabled: { opacity: 0.5 },
  selecteurValeur: { flex: 1, color: COLORS.texteDoux, fontSize: 14 },
  selecteurPlaceholder: { color: COLORS.texteMute },
  selecteurChevron: { color: COLORS.texteSecond, fontSize: 20, fontWeight: '300' },

  // Lien inline
  linkInline: {
    paddingVertical: 6,
    marginTop: 6,
  },
  linkInlineTexte: {
    color: COLORS.ambre,
    fontSize: 12,
    fontWeight: '600',
  },

  // GPS row
  gpsRow: { flexDirection: 'row' },

  // Alerte incohérence
  alerteIncoh: {
    backgroundColor: '#2a2614',
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.jaune,
  },
  alerteIncohTexte: {
    color: COLORS.jaune,
    fontSize: 11,
    lineHeight: 15,
  },

  // Actions
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btnAnnuler: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnAnnulerTexte: { color: COLORS.texteSecond, fontSize: 14, fontWeight: '600' },
  btnPrincipal: {
    flex: 2,
    backgroundColor: COLORS.ambre,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnPrincipalTexte: { color: '#0d1a0d', fontSize: 14, fontWeight: '700' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitre: { color: COLORS.ambreClair, fontSize: 16, fontWeight: '700' },
  modalFermer: { color: COLORS.texteSecond, fontSize: 22, paddingHorizontal: 8 },
  modalListe: { paddingVertical: 8 },
  modalItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalItemLabel: { color: COLORS.texteDoux, fontSize: 14, fontWeight: '500' },
  modalItemSub: { color: COLORS.texteSecond, fontSize: 12, marginTop: 3 },
  modalVide: { padding: 24, alignItems: 'center' },
  modalVideTexte: {
    color: COLORS.texteSecond,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 12,
  },

  // Footer modal "Créer un lot"
  modalFooterBtn: {
    backgroundColor: COLORS.ambre,
    paddingVertical: 14,
    margin: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalFooterBtnTexte: {
    color: '#0d1a0d',
    fontSize: 14,
    fontWeight: '700',
  },

  // Modal de confirmation post-saisie
  confirmContent: {
    backgroundColor: COLORS.bgCard,
    margin: 24,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  confirmEmoji: { fontSize: 48, marginBottom: 8 },
  confirmTitre: {
    color: COLORS.vertClair,
    fontSize: 18,
    fontWeight: '700',
  },
  confirmNumero: {
    color: COLORS.ambreClair,
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: '600',
    marginTop: 4,
  },
  confirmDetails: {
    flexDirection: 'row',
    gap: 24,
    marginVertical: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: COLORS.bgInput,
    borderRadius: 10,
  },
  confirmDetail: {
    alignItems: 'center',
  },
  confirmDetailLabel: {
    color: COLORS.texteSecond,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  confirmDetailValeur: {
    color: COLORS.vertClair,
    fontSize: 16,
    fontWeight: '700',
  },
  confirmContexte: {
    color: COLORS.texteSecond,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  confirmQuestion: {
    color: COLORS.texteDoux,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  confirmBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  confirmBtnPrincipal: {
    backgroundColor: COLORS.ambre,
  },
  confirmBtnPrincipalTexte: {
    color: '#0d1a0d',
    fontSize: 13,
    fontWeight: '700',
  },
  confirmBtnSecondaire: {
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.ambre,
  },
  confirmBtnSecondaireTexte: {
    color: COLORS.ambreClair,
    fontSize: 13,
    fontWeight: '600',
  },
  confirmBtnRetour: {
    paddingVertical: 10,
    marginTop: 4,
  },
  confirmBtnRetourTexte: {
    color: COLORS.texteSecond,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});