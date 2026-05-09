// ============================================================
// AgriSuite Madagascar — Phase 3 / Session 4B partie 1
// screens/FournisseurFormScreen.js
//
// Création / édition d'un fournisseur filière B (collecte).
//
// Navigation :
//   - Mode création : navigation.navigate('FournisseurForm') sans params
//   - Mode édition  : navigation.navigate('FournisseurForm', { fournisseurId: 5 })
//
// Champs :
//   - Code unique (auto-suggéré : F-ZONE-NNN, modifiable)
//   - Nom *
//   - Type * (individuel/coopérative/GIE)
//   - Zone de collecte * (sélecteur depuis zones_collecte seedées)
//   - Commune, fokontany (optionnels)
//   - Latitude, longitude (optionnels — saisie manuelle pour l'instant,
//     géolocalisation native à ajouter plus tard)
//   - Téléphone (optionnel)
//   - CNAPS / NIF (optionnel — important pour traçabilité fiscale
//     coopératives)
//   - Date premier contact (auto = aujourd'hui)
//   - Statut * (actif/inactif/suspendu)
//   - Notes (libre)
//
// Actions :
//   - Enregistrer
//   - Annuler
//   - Supprimer (mode édition seulement, avec confirmation)
//
// Validation :
//   - Code unique en base (sauf si édition du même fournisseur)
//   - Nom non vide
//   - Zone valide
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
import {
  getAllZonesCollecte,
  getFournisseurById,
  insertFournisseur,
  updateFournisseur,
  deleteFournisseur,
  getAllFournisseurs,
} from '../database/exportTrack';

// ============================================================
// CONSTANTES
// ============================================================

const TYPES_FOURNISSEUR = [
  { valeur: 'individuel',  label: '👤 Paysan individuel',
    description: 'Producteur autonome, vente directe' },
  { valeur: 'cooperative', label: '🤝 Coopérative',
    description: 'Groupement de paysans avec gestion collective' },
  { valeur: 'gie',         label: '🏛 GIE',
    description: 'Groupement d\'intérêt économique enregistré' },
];

const STATUTS = [
  { valeur: 'actif',    label: '✓ Actif',
    description: 'Collabore actuellement' },
  { valeur: 'inactif',  label: '⏸ Inactif',
    description: 'Pas de collaboration en cours, peut reprendre' },
  { valeur: 'suspendu', label: '⛔ Suspendu',
    description: 'Collaboration arrêtée (qualité, fiabilité, etc.)' },
];

// ============================================================
// HELPERS
// ============================================================

const aujourdhui = () => new Date().toISOString().slice(0, 10);

/**
 * Génère un code fournisseur auto à partir de la zone et du nom.
 * Format : F-{CODE_ZONE}-{NNN} où NNN est le prochain numéro libre
 * pour cette zone.
 */
const genererCodeFournisseur = (zoneCode, fournisseursExistants) => {
  if (!zoneCode) return '';
  const prefixe = `F-${zoneCode}-`;
  const memeZone = fournisseursExistants.filter((f) =>
    f.code && f.code.startsWith(prefixe)
  );
  let max = 0;
  for (const f of memeZone) {
    const num = parseInt(f.code.split('-').pop(), 10);
    if (!isNaN(num) && num > max) max = num;
  }
  return `${prefixe}${String(max + 1).padStart(3, '0')}`;
};

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function FournisseurFormScreen({ navigation, route }) {
  const fournisseurId = route?.params?.fournisseurId || null;
  const isEdition = !!fournisseurId;

  // ---- Données de référence ----
  const [zones, setZones] = useState([]);
  const [tousFournisseurs, setTousFournisseurs] = useState([]);

  // ---- Champs ----
  const [code, setCode] = useState('');
  const [codeAutoSuggere, setCodeAutoSuggere] = useState(true);
  const [nom, setNom] = useState('');
  const [type, setType] = useState('individuel');
  const [zoneCode, setZoneCode] = useState(null);
  const [commune, setCommune] = useState('');
  const [fokontany, setFokontany] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [telephone, setTelephone] = useState('');
  const [cnapsNif, setCnapsNif] = useState('');
  const [datePremierContact, setDatePremierContact] = useState(aujourdhui());
  const [statut, setStatut] = useState('actif');
  const [notes, setNotes] = useState('');

  // ---- État UI ----
  const [enCours, setEnCours] = useState(false);
  const [erreurs, setErreurs] = useState({});
  const [modalOuvert, setModalOuvert] = useState(null); // 'zone'|'type'|'statut'

  // ============================================================
  // CHARGEMENT INITIAL
  // ============================================================

  useEffect(() => {
    try {
      const z = getAllZonesCollecte ? getAllZonesCollecte() : [];
      setZones(z);
      const tous = getAllFournisseurs() || [];
      setTousFournisseurs(tous);

      if (isEdition) {
        const f = getFournisseurById(fournisseurId);
        if (!f) {
          Alert.alert(
            'Fournisseur introuvable',
            'Ce fournisseur n\'existe pas ou a été supprimé.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
          return;
        }
        // Pré-remplissage
        setCode(f.code || '');
        setCodeAutoSuggere(false); // édition : on ne touche pas au code auto
        setNom(f.nom || '');
        setType(f.type || 'individuel');
        setZoneCode(f.zone_collecte_code || null);
        setCommune(f.commune || '');
        setFokontany(f.fokontany || '');
        setLatitude(f.latitude != null ? String(f.latitude) : '');
        setLongitude(f.longitude != null ? String(f.longitude) : '');
        setTelephone(f.telephone || '');
        setCnapsNif(f.cnaps_nif || '');
        setDatePremierContact(f.date_premier_contact || aujourdhui());
        setStatut(f.statut || 'actif');
        setNotes(f.notes || '');
      }
    } catch (err) {
      console.error('[FournisseurForm] Erreur chargement :', err);
      Alert.alert('Erreur', 'Impossible de charger les données de référence.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fournisseurId]);

  // ============================================================
  // CODE AUTO-GÉNÉRÉ
  // ============================================================

  // En mode création, le code se génère automatiquement quand la zone change,
  // sauf si l'utilisateur a déjà tapé manuellement dans le champ code.
  useEffect(() => {
    if (isEdition || !codeAutoSuggere) return;
    if (zoneCode) {
      const codeAuto = genererCodeFournisseur(zoneCode, tousFournisseurs);
      setCode(codeAuto);
    }
  }, [zoneCode, tousFournisseurs, isEdition, codeAutoSuggere]);

  const handleCodeChange = (val) => {
    setCode(val);
    setCodeAutoSuggere(false); // user a touché : on désactive l'auto
  };

  // ============================================================
  // RÉSOLUTION LIBELLÉS
  // ============================================================

  const zoneNom = useMemo(() => {
    const z = zones.find((x) => x.code === zoneCode);
    return z ? `${z.nom} (${z.code})` : null;
  }, [zones, zoneCode]);

  const typeLabel = useMemo(() => {
    return TYPES_FOURNISSEUR.find((t) => t.valeur === type)?.label || type;
  }, [type]);

  const statutLabel = useMemo(() => {
    return STATUTS.find((s) => s.valeur === statut)?.label || statut;
  }, [statut]);

  // ============================================================
  // VALIDATION
  // ============================================================

  const valider = () => {
    const errs = {};
    if (!nom.trim()) errs.nom = 'Nom requis';
    if (!code.trim()) errs.code = 'Code requis';
    if (!zoneCode) errs.zoneCode = 'Zone de collecte requise';

    // Vérification unicité du code (sauf si même fournisseur en édition)
    if (code.trim()) {
      const conflit = tousFournisseurs.find(
        (f) => f.code === code.trim() && f.id !== fournisseurId
      );
      if (conflit) {
        errs.code = `Code déjà utilisé par "${conflit.nom}"`;
      }
    }

    // Validation GPS si saisis
    if (latitude && (isNaN(parseFloat(latitude)) ||
        parseFloat(latitude) < -90 || parseFloat(latitude) > 90)) {
      errs.latitude = 'Latitude entre -90 et 90';
    }
    if (longitude && (isNaN(parseFloat(longitude)) ||
        parseFloat(longitude) < -180 || parseFloat(longitude) > 180)) {
      errs.longitude = 'Longitude entre -180 et 180';
    }
    // Couple GPS : les deux ou aucun
    if ((latitude && !longitude) || (!latitude && longitude)) {
      errs.latitude = 'Saisir latitude ET longitude (ou aucun des deux)';
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
        'Champs invalides',
        'Vérifie les champs marqués en rouge avant de continuer.'
      );
      return;
    }

    setEnCours(true);

    try {
      const payload = {
        code: code.trim(),
        nom: nom.trim(),
        type,
        zone_collecte_code: zoneCode,
        commune: commune.trim() || null,
        fokontany: fokontany.trim() || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        telephone: telephone.trim() || null,
        cnaps_nif: cnapsNif.trim() || null,
        date_premier_contact: datePremierContact || null,
        statut,
        notes: notes.trim() || null,
      };

      if (isEdition) {
        updateFournisseur(fournisseurId, payload);
        setEnCours(false);
        Alert.alert(
          '✅ Fournisseur modifié',
          `${payload.nom} (${payload.code}) — modifications enregistrées.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        const nouveauId = insertFournisseur(payload);
        setEnCours(false);
        Alert.alert(
          '✅ Fournisseur créé',
          `${payload.nom} (${payload.code}) — ajouté à la filière collecte.`,
          [
            {
              text: 'Saisir un bon de collecte',
              onPress: () => navigation.replace('BonCollecteForm', {
                fournisseurId: nouveauId,
              }),
            },
            {
              text: 'Retour à la liste',
              style: 'cancel',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (err) {
      setEnCours(false);
      console.error('[FournisseurForm] Erreur sauvegarde :', err);
      // Détection erreur SQLite UNIQUE constraint sur code
      const isCodeDuplique = err.message?.toLowerCase().includes('unique') ||
                             err.message?.toLowerCase().includes('constraint');
      Alert.alert(
        isCodeDuplique
          ? '🚫 Code déjà utilisé'
          : 'Erreur lors de l\'enregistrement',
        isCodeDuplique
          ? 'Le code que tu as saisi existe déjà. Modifie-le et réessaie.'
          : (err.message || 'Erreur inconnue. Vérifie tes saisies.')
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isEdition, fournisseurId, code, nom, type, zoneCode,
    commune, fokontany, latitude, longitude, telephone,
    cnapsNif, datePremierContact, statut, notes, navigation,
  ]);

  // ============================================================
  // SUPPRESSION (édition uniquement)
  // ============================================================

  const supprimer = () => {
    Alert.alert(
      '⚠️ Supprimer ce fournisseur ?',
      `Cette action est définitive. Toutes les références à ${nom} ` +
      `(bons de collecte, lots) seront orphelines.\n\n` +
      `Pour préserver l'historique, préfère le passer en statut "Inactif" ` +
      `ou "Suspendu".`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Passer en Inactif',
          onPress: () => {
            setStatut('inactif');
            // L'utilisateur devra encore valider via Enregistrer
          },
        },
        {
          text: 'Supprimer définitivement',
          style: 'destructive',
          onPress: () => {
            try {
              deleteFournisseur(fournisseurId);
              navigation.goBack();
            } catch (err) {
              Alert.alert(
                'Erreur',
                'Impossible de supprimer. Le fournisseur a peut-être des bons de collecte rattachés.'
              );
            }
          },
        },
      ]
    );
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
          <Text style={styles.headerTitre}>
            {isEdition ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
          </Text>
          <Text style={styles.headerSousTitre}>
            🤝 Filière B — collecte externe
          </Text>
        </View>

        {/* Identité */}
        <Section titre="Identité">
          <Champ label="Nom *" erreur={erreurs.nom}>
            <TextInput
              style={styles.input}
              value={nom}
              onChangeText={setNom}
              placeholder="Ex: Coopérative Vanille Sambava ou Rakoto Jean"
              placeholderTextColor="#5a6a5a"
              autoCapitalize="words"
            />
          </Champ>

          <Champ label="Type *">
            <Selecteur
              valeur={typeLabel}
              placeholder="Choisir un type"
              onPress={() => setModalOuvert('type')}
            />
          </Champ>

          <Champ label="Code *" erreur={erreurs.code}>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={handleCodeChange}
              placeholder="Auto-généré quand zone choisie"
              placeholderTextColor="#5a6a5a"
              autoCapitalize="characters"
            />
            {!isEdition && codeAutoSuggere && zoneCode ? (
              <Text style={styles.hint}>
                Code auto-généré. Tu peux le modifier si besoin.
              </Text>
            ) : null}
          </Champ>
        </Section>

        {/* Localisation */}
        <Section titre="Localisation">
          <Champ label="Zone de collecte *" erreur={erreurs.zoneCode}>
            <Selecteur
              valeur={zoneNom}
              placeholder="Choisir une zone"
              onPress={() => setModalOuvert('zone')}
            />
          </Champ>

          <Champ label="Commune">
            <TextInput
              style={styles.input}
              value={commune}
              onChangeText={setCommune}
              placeholder="Ex: Sambava, Antalaha"
              placeholderTextColor="#5a6a5a"
              autoCapitalize="words"
            />
          </Champ>

          <Champ label="Fokontany">
            <TextInput
              style={styles.input}
              value={fokontany}
              onChangeText={setFokontany}
              placeholder="Ex: Andranonkoditra"
              placeholderTextColor="#5a6a5a"
              autoCapitalize="words"
            />
          </Champ>

          <View style={styles.gpsRow}>
            <Champ label="Latitude" erreur={erreurs.latitude} style={{ flex: 1 }}>
              <TextInput
                style={styles.input}
                value={latitude}
                onChangeText={setLatitude}
                placeholder="-14.2667"
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
                placeholder="50.1667"
                placeholderTextColor="#5a6a5a"
                keyboardType="numbers-and-punctuation"
              />
            </Champ>
          </View>
          <Text style={styles.hint}>
            GPS optionnel. Géolocalisation auto à venir Session 7.
          </Text>
        </Section>

        {/* Contact */}
        <Section titre="Contact & administratif">
          <Champ label="Téléphone">
            <TextInput
              style={styles.input}
              value={telephone}
              onChangeText={setTelephone}
              placeholder="Ex: 034 12 345 67"
              placeholderTextColor="#5a6a5a"
              keyboardType="phone-pad"
            />
          </Champ>

          <Champ label="CNAPS / NIF (coopératives)">
            <TextInput
              style={styles.input}
              value={cnapsNif}
              onChangeText={setCnapsNif}
              placeholder="Numéro fiscal"
              placeholderTextColor="#5a6a5a"
              autoCapitalize="characters"
            />
            <Text style={styles.hint}>
              Important pour audit fiscal (coopératives & GIE).
            </Text>
          </Champ>

          <Champ label="Date premier contact">
            <TextInput
              style={styles.input}
              value={datePremierContact}
              onChangeText={setDatePremierContact}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#5a6a5a"
              keyboardType="numbers-and-punctuation"
            />
          </Champ>
        </Section>

        {/* Statut & notes */}
        <Section titre="Statut">
          <Champ label="Statut *">
            <Selecteur
              valeur={statutLabel}
              placeholder="Choisir un statut"
              onPress={() => setModalOuvert('statut')}
            />
          </Champ>

          <Champ label="Notes (libre)">
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Spécialités, conditions de paiement, certifications, observations..."
              placeholderTextColor="#5a6a5a"
              multiline
              numberOfLines={4}
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
              {enCours
                ? 'Enregistrement…'
                : isEdition ? '✓ Enregistrer' : '+ Créer le fournisseur'}
            </Text>
          </TouchableOpacity>
        </View>
{/* Bouton parcelles (édition uniquement) */}
        {isEdition && (
          <TouchableOpacity
            style={{
              marginTop: 16,
              backgroundColor: '#1a2e1a',
              borderWidth: 1,
              borderColor: '#7ec87e',
              paddingVertical: 14,
              borderRadius: 10,
              alignItems: 'center',
            }}
            onPress={() => navigation.navigate('ProducteurParcelles', { fournisseurId })}
            disabled={enCours}
          >
            <Text style={{ color: '#7ec87e', fontSize: 14, fontWeight: '600' }}>
              🌾 Voir les parcelles & conversion BIO
            </Text>
          </TouchableOpacity>
        )}
        {/* Bouton supprimer (édition uniquement) */}
        {isEdition && (
          <TouchableOpacity
            style={styles.btnSupprimer}
            onPress={supprimer}
            disabled={enCours}
          >
            <Text style={styles.btnSupprimerTexte}>🗑️ Supprimer ce fournisseur</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Modal sélection */}
      <ModalSelection
        visible={modalOuvert !== null}
        onClose={() => setModalOuvert(null)}
        type={modalOuvert}
        zones={zones}
        onSelectZone={(c) => { setZoneCode(c); setModalOuvert(null); }}
        onSelectType={(t) => { setType(t); setModalOuvert(null); }}
        onSelectStatut={(s) => { setStatut(s); setModalOuvert(null); }}
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

function Selecteur({ valeur, placeholder, onPress }) {
  return (
    <TouchableOpacity
      style={styles.selecteur}
      onPress={onPress}
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
  zones, onSelectZone, onSelectType, onSelectStatut,
}) {
  let titre = '';
  let items = [];
  let onSelect = () => {};

  if (type === 'zone') {
    titre = 'Choisir une zone de collecte';
    items = zones.map((z) => ({
      id: z.code,
      label: z.nom,
      sub: `${z.code} · ${z.region}`,
      cultures: z.cultures_principales,
    }));
    onSelect = onSelectZone;
  } else if (type === 'type') {
    titre = 'Type de fournisseur';
    items = TYPES_FOURNISSEUR.map((t) => ({
      id: t.valeur,
      label: t.label,
      sub: t.description,
    }));
    onSelect = onSelectType;
  } else if (type === 'statut') {
    titre = 'Statut';
    items = STATUTS.map((s) => ({
      id: s.valeur,
      label: s.label,
      sub: s.description,
    }));
    onSelect = onSelectStatut;
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
                <Text style={styles.modalVideTexte}>Aucun élément.</Text>
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
  rougeFonce: '#3a1a1a',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  scrollContent: { padding: 16, paddingBottom: 32 },

  // En-tête
  header: { marginBottom: 16 },
  headerBack: {
    color: COLORS.vert,
    fontSize: 14,
    marginBottom: 8,
  },
  headerTitre: {
    color: COLORS.ambre,
    fontSize: 22,
    fontWeight: '700',
  },
  headerSousTitre: {
    color: COLORS.texteSecond,
    fontSize: 13,
    marginTop: 4,
  },

  // Sections
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

  // Champ
  champ: { marginBottom: 12 },
  champLabel: {
    color: COLORS.texteDoux,
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '500',
  },
  champErreur: {
    color: COLORS.rouge,
    fontSize: 11,
    marginTop: 4,
  },

  // Input
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
  inputMulti: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // Hint
  hint: {
    color: COLORS.texteMute,
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },

  // GPS row
  gpsRow: {
    flexDirection: 'row',
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
  selecteurValeur: {
    flex: 1,
    color: COLORS.texteDoux,
    fontSize: 14,
  },
  selecteurPlaceholder: {
    color: COLORS.texteMute,
  },
  selecteurChevron: {
    color: COLORS.texteSecond,
    fontSize: 20,
    fontWeight: '300',
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  btnAnnuler: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnAnnulerTexte: {
    color: COLORS.texteSecond,
    fontSize: 14,
    fontWeight: '600',
  },
  btnPrincipal: {
    flex: 2,
    backgroundColor: COLORS.ambre,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnPrincipalTexte: {
    color: '#0d1a0d',
    fontSize: 14,
    fontWeight: '700',
  },

  // Bouton supprimer
  btnSupprimer: {
    marginTop: 16,
    backgroundColor: COLORS.rougeFonce,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.rouge,
  },
  btnSupprimerTexte: {
    color: COLORS.rouge,
    fontSize: 13,
    fontWeight: '600',
  },

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
  modalTitre: {
    color: COLORS.ambreClair,
    fontSize: 16,
    fontWeight: '700',
  },
  modalFermer: {
    color: COLORS.texteSecond,
    fontSize: 22,
    paddingHorizontal: 8,
  },
  modalListe: { paddingVertical: 8 },
  modalItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalItemLabel: {
    color: COLORS.texteDoux,
    fontSize: 14,
    fontWeight: '500',
  },
  modalItemSub: {
    color: COLORS.texteSecond,
    fontSize: 12,
    marginTop: 3,
  },
  modalVide: { padding: 24, alignItems: 'center' },
  modalVideTexte: {
    color: COLORS.texteSecond,
    fontSize: 14,
  },
});