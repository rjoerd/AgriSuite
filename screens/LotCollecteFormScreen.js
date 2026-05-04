// ============================================================
// AgriSuite Madagascar — Phase 3 / Session 4B partie 2
// screens/LotCollecteFormScreen.js
//
// Création / édition d'un lot filière B (collecte externe).
// Workflow A — gérant : crée un lot vide qui sera alimenté par
// des bons de collecte. La quantité brute totale est calculée
// automatiquement à partir des bons (pas saisie ici).
//
// Navigation :
//   - Création :       navigation.navigate('LotCollecteForm')
//   - Création rapide : navigation.navigate('LotCollecteForm', {
//                         mode: 'rapide',
//                         zoneCodeInitiale: 'SAV',
//                         cultureIdInitiale: 49
//                       })
//   - Édition :        navigation.navigate('LotCollecteForm', { lotId: 5 })
//
// Mode "rapide" : version épurée pour création à la volée depuis
// BonCollecteForm. Affiche uniquement zone + culture + date_debut.
// Le reste (notes, protocole) sera complété plus tard.
//
// Le code lot est auto-généré : MDG-AAAA-{CODE_ZONE}-{CODE_CULTURE}-NNN
// Exemple : MDG-2026-SAV-VAN-001
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
  insertLotCollecte,
  cloturerLot,
  genererCodeLot,
  CODE_CULTURE,
  getLotById,
  getAllZonesCollecte,
} from '../database/exportTrack';
import { getAllCultures } from '../database/cropEngine';

// ============================================================
// HELPERS
// ============================================================

const codeCultureDepuis = (culture) => {
  if (!culture) return '???';
  const nom = (culture.nom_fr || culture.nom || '').toLowerCase().trim();
  for (const [key, code] of Object.entries(CODE_CULTURE)) {
    if (nom.includes(key.replace('_', ' ')) || nom.includes(key)) {
      return code;
    }
  }
  return nom.slice(0, 3).toUpperCase().padEnd(3, 'X');
};

const formatDateISO = (d) => {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const aujourdhui = () => formatDateISO(new Date());

const LIBELLES_PROTOCOLE = {
  sechage_solaire:    'Séchage solaire',
  sechage_mecanique:  'Séchoir mécanique',
  sechage_ombre:      'Séchage à l\'ombre',
  fermentation:       'Fermentation (vanille, cacao)',
  echaudage:          'Échaudage (vanille verte)',
  aucun:              'Aucun (frais / brut)',
};

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function LotCollecteFormScreen({ navigation, route }) {
  const lotId = route?.params?.lotId || null;
  const isEdition = !!lotId;
  const modeRapide = route?.params?.mode === 'rapide';

  // ---- Référentiels ----
  const [zones, setZones] = useState([]);
  const [cultures, setCultures] = useState([]);

  // ---- Champs ----
  const [zoneCode, setZoneCode] = useState(route?.params?.zoneCodeInitiale || null);
  const [cultureId, setCultureId] = useState(route?.params?.cultureIdInitiale || null);
  const [variete, setVariete] = useState('');
  const [dateDebut, setDateDebut] = useState(aujourdhui());
  const [dateFin, setDateFin] = useState('');
  const [protocolePost, setProtocolePost] = useState('aucun');
  const [creePar, setCreePar] = useState('');
  const [notes, setNotes] = useState('');

  // ---- État UI ----
  const [enCours, setEnCours] = useState(false);
  const [erreurs, setErreurs] = useState({});
  const [modalOuvert, setModalOuvert] = useState(null); // 'zone'|'culture'|'protocole'

  // ============================================================
  // CHARGEMENT INITIAL
  // ============================================================

  useEffect(() => {
    try {
      setZones(getAllZonesCollecte ? getAllZonesCollecte() : []);
      setCultures(getAllCultures ? getAllCultures() : []);

      if (isEdition) {
        const lot = getLotById(lotId);
        if (!lot) {
          Alert.alert(
            'Lot introuvable',
            'Ce lot n\'existe pas ou a été supprimé.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
          return;
        }
        if (lot.filiere !== 'collecte') {
          Alert.alert(
            'Lot incompatible',
            'Ce lot est de la filière production. Utilise LotProductionForm.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
          return;
        }
        setZoneCode(lot.zone_collecte_code);
        setCultureId(lot.culture_id);
        setVariete(lot.variete || '');
        setDateDebut(lot.date_debut || aujourdhui());
        setDateFin(lot.date_fin || '');
        setProtocolePost(lot.protocole_post_recolte || 'aucun');
        setCreePar(lot.cree_par || '');
        setNotes(lot.notes || '');
      }
    } catch (err) {
      console.error('[LotCollecteForm] Erreur chargement :', err);
      Alert.alert('Erreur', 'Impossible de charger les données de référence.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lotId]);

  // ============================================================
  // PREVIEW CODE LOT
  // ============================================================

  const previewCodeLot = useMemo(() => {
    if (!zoneCode || !cultureId) return null;
    const culture = cultures.find((c) => c.id === cultureId);
    if (!culture) return null;

    const codeCulture = codeCultureDepuis(culture);
    const annee = (() => {
      const d = new Date(dateDebut || aujourdhui());
      return isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
    })();

    try {
      return genererCodeLot(zoneCode, codeCulture, annee);
    } catch (err) {
      return `MDG-${annee}-${zoneCode}-${codeCulture}-???`;
    }
  }, [zoneCode, cultureId, dateDebut, cultures]);

  // ============================================================
  // RÉSOLUTION LIBELLÉS
  // ============================================================

  const zoneNom = useMemo(() => {
    const z = zones.find((x) => x.code === zoneCode);
    return z ? `${z.nom} (${z.code})` : null;
  }, [zones, zoneCode]);

  const cultureNom = useMemo(() => {
    const c = cultures.find((x) => x.id === cultureId);
    return c ? (c.nom_fr || c.nom) : null;
  }, [cultures, cultureId]);

  // ============================================================
  // VALIDATION
  // ============================================================

  const valider = () => {
    const errs = {};
    if (!zoneCode) errs.zoneCode = 'Zone de collecte requise';
    if (!cultureId) errs.cultureId = 'Culture requise';
    if (!dateDebut) errs.dateDebut = 'Date de début requise';
    if (!modeRapide && !creePar.trim()) errs.creePar = 'Identité du saisisseur requise';
    if (dateFin && dateDebut && new Date(dateFin) < new Date(dateDebut)) {
      errs.dateFin = 'Date de fin postérieure à date de début';
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
      const culture = cultures.find((c) => c.id === cultureId);
      const codeCulture = codeCultureDepuis(culture);
      const annee = new Date(dateDebut).getFullYear();
      const codeLot = isEdition
        ? null // pas de re-génération en édition
        : genererCodeLot(zoneCode, codeCulture, annee);

      // Mode rapide : on prend "opérateur" par défaut si pas saisi
      const saisisseur = creePar.trim() || (modeRapide ? 'opérateur' : '');

      const lotPayload = {
        code_lot: codeLot,
        fournisseur_id: null, // les fournisseurs viendront via les bons
        zone_collecte_code: zoneCode,
        culture_id: cultureId,
        variete: variete.trim() || null,
        date_debut: dateDebut,
        date_fin: dateFin || null,
        est_cloture: false,
        quantite_brute_kg: null, // calculée à partir des bons
        protocole_post_recolte: protocolePost,
        statut: 'en_cours',
        cree_par: saisisseur,
        notes: notes.trim() || null,
      };

      let nouveauId;
      if (isEdition) {
        // Pour l'instant en édition on ne touche pas au code_lot. À implémenter Session 5
        // si vraiment besoin (mécanisme de rectification).
        Alert.alert(
          'Édition limitée',
          'L\'édition complète d\'un lot collecte est limitée en v0.9. ' +
          'Pour modifier les champs critiques (zone, culture), utilise le ' +
          'mécanisme de rectification (à venir Session 5).',
          [{ text: 'OK' }]
        );
        setEnCours(false);
        return;
      } else {
        nouveauId = insertLotCollecte(lotPayload);
      }

      const lotCree = getLotById(nouveauId);
      setEnCours(false);

      if (modeRapide) {
        // Création à la volée : retour direct avec le lot créé
        navigation.navigate({
          name: 'BonCollecteForm',
          params: { lotIdNouveau: nouveauId },
          merge: true,
        });
        return;
      }

      Alert.alert(
        '✅ Lot collecte créé',
        `Code : ${lotCree?.code_lot || codeLot}\n` +
        `Statut : ouvert (en attente de bons de collecte)\n` +
        `Zone : ${zoneNom}`,
        [
          {
            text: 'Saisir un bon',
            onPress: () => navigation.replace('BonCollecteForm', {
              lotId: nouveauId,
            }),
          },
          {
            text: 'Voir le lot',
            onPress: () => navigation.replace('LotDetail', { lotId: nouveauId }),
          },
          {
            text: 'Retour',
            style: 'cancel',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (err) {
      setEnCours(false);
      console.error('[LotCollecteForm] Erreur sauvegarde :', err);
      Alert.alert(
        'Erreur lors de la création',
        err.message || 'Impossible de créer le lot. Vérifie les champs et réessaie.'
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isEdition, modeRapide, zoneCode, cultureId, variete,
    dateDebut, dateFin, protocolePost, creePar, notes,
    cultures, zoneNom, navigation,
  ]);

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
          {!modeRapide && (
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.headerBack}>‹ Retour</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitre}>
            {isEdition
              ? 'Modifier le lot collecte'
              : modeRapide
                ? 'Création rapide de lot'
                : 'Nouveau lot · Collecte'}
          </Text>
          <Text style={styles.headerSousTitre}>
            🤝 Filière B — origine collecte externe
          </Text>
        </View>

        {modeRapide && (
          <View style={styles.rapideBox}>
            <Text style={styles.rapideTexte}>
              ⚡ Mode rapide : zone + culture suffisent. Tu pourras enrichir
              le lot plus tard depuis sa fiche.
            </Text>
          </View>
        )}

        {/* Origine */}
        <Section titre="Origine">
          <Champ label="Zone de collecte *" erreur={erreurs.zoneCode}>
            <Selecteur
              valeur={zoneNom}
              placeholder="Choisir une zone"
              onPress={() => setModalOuvert('zone')}
            />
            <Text style={styles.hint}>
              Région où s'effectue la collecte (ex: SAVA pour vanille).
            </Text>
          </Champ>
        </Section>

        {/* Produit */}
        <Section titre="Produit">
          <Champ label="Culture *" erreur={erreurs.cultureId}>
            <Selecteur
              valeur={cultureNom}
              placeholder="Choisir une culture"
              onPress={() => setModalOuvert('culture')}
            />
          </Champ>
          {!modeRapide && (
            <Champ label="Variété (optionnel)">
              <TextInput
                style={styles.input}
                value={variete}
                onChangeText={setVariete}
                placeholder="ex: vanille planifolia, gousses noires"
                placeholderTextColor="#5a6a5a"
              />
            </Champ>
          )}
        </Section>

        {/* Code lot prévu */}
        {previewCodeLot && (
          <View style={styles.previewBox}>
            <Text style={styles.previewLabel}>📋 Code lot qui sera attribué</Text>
            <Text style={styles.previewCode}>{previewCodeLot}</Text>
            <Text style={styles.previewHint}>
              Format : MDG-Année-Zone-Culture-N° séquentiel
            </Text>
          </View>
        )}

        {/* Fenêtre temporelle */}
        <Section titre="Fenêtre de collecte">
          <Champ label="Date de début *" erreur={erreurs.dateDebut}>
            <TextInput
              style={styles.input}
              value={dateDebut}
              onChangeText={setDateDebut}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#5a6a5a"
              keyboardType="numbers-and-punctuation"
            />
          </Champ>
          {!modeRapide && (
            <Champ label="Date de fin prévue (optionnel)" erreur={erreurs.dateFin}>
              <TextInput
                style={styles.input}
                value={dateFin}
                onChangeText={setDateFin}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#5a6a5a"
                keyboardType="numbers-and-punctuation"
              />
              <Text style={styles.hint}>
                Indicative. La date de clôture définitive sera capturée à la
                fermeture du lot.
              </Text>
            </Champ>
          )}
        </Section>

        {/* Champs étendus — masqués en mode rapide */}
        {!modeRapide && (
          <>
            <Section titre="Protocole post-récolte">
              <Champ label="Protocole prévu">
                <Selecteur
                  valeur={LIBELLES_PROTOCOLE[protocolePost] || protocolePost}
                  placeholder="Choisir un protocole"
                  onPress={() => setModalOuvert('protocole')}
                />
                <Text style={styles.hint}>
                  Modifiable plus tard. Important pour vanille (échaudage),
                  cacao (fermentation), gingembre/épices (séchage).
                </Text>
              </Champ>
            </Section>

            <Section titre="Validation">
              <Champ label="Saisi par *" erreur={erreurs.creePar}>
                <TextInput
                  style={styles.input}
                  value={creePar}
                  onChangeText={setCreePar}
                  placeholder="Nom du gérant ou opérateur"
                  placeholderTextColor="#5a6a5a"
                  autoCapitalize="words"
                />
              </Champ>
              <Champ label="Notes (optionnel)">
                <TextInput
                  style={[styles.input, styles.inputMulti]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Conditions de la campagne, attentes qualité, contexte météo..."
                  placeholderTextColor="#5a6a5a"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </Champ>
            </Section>
          </>
        )}

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
                : isEdition
                  ? '✓ Enregistrer'
                  : modeRapide
                    ? '⚡ Créer et continuer'
                    : '+ Créer le lot collecte'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      <ModalSelection
        visible={modalOuvert !== null}
        onClose={() => setModalOuvert(null)}
        type={modalOuvert}
        zones={zones}
        cultures={cultures}
        onSelectZone={(c) => { setZoneCode(c); setModalOuvert(null); }}
        onSelectCulture={(id) => { setCultureId(id); setModalOuvert(null); }}
        onSelectProtocole={(p) => { setProtocolePost(p); setModalOuvert(null); }}
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
  zones, cultures,
  onSelectZone, onSelectCulture, onSelectProtocole,
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
    }));
    onSelect = onSelectZone;
  } else if (type === 'culture') {
    titre = 'Choisir une culture';
    items = cultures.map((c) => ({
      id: c.id,
      label: c.nom_fr || c.nom,
      sub: c.cycle_jours ? `Cycle ${c.cycle_jours}j` : null,
    }));
    onSelect = onSelectCulture;
  } else if (type === 'protocole') {
    titre = 'Protocole post-récolte';
    items = Object.entries(LIBELLES_PROTOCOLE).map(([k, v]) => ({
      id: k,
      label: v,
    }));
    onSelect = onSelectProtocole;
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
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  scrollContent: { padding: 16, paddingBottom: 32 },

  header: { marginBottom: 16 },
  headerBack: { color: COLORS.vert, fontSize: 14, marginBottom: 8 },
  headerTitre: { color: COLORS.ambre, fontSize: 22, fontWeight: '700' },
  headerSousTitre: { color: COLORS.texteSecond, fontSize: 13, marginTop: 4 },

  rapideBox: {
    backgroundColor: '#2a2014',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.ambre,
  },
  rapideTexte: {
    color: COLORS.ambreClair,
    fontSize: 12,
    lineHeight: 17,
  },

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
  inputMulti: {
    minHeight: 70,
    textAlignVertical: 'top',
  },

  hint: {
    color: COLORS.texteMute,
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },

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
  selecteurValeur: { flex: 1, color: COLORS.texteDoux, fontSize: 14 },
  selecteurPlaceholder: { color: COLORS.texteMute },
  selecteurChevron: { color: COLORS.texteSecond, fontSize: 20, fontWeight: '300' },

  previewBox: {
    backgroundColor: '#2a2014',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.ambre,
  },
  previewLabel: {
    color: COLORS.ambreClair,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  previewCode: {
    color: COLORS.ambre,
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'monospace',
    marginTop: 6,
    marginBottom: 4,
  },
  previewHint: { color: COLORS.texteSecond, fontSize: 10, fontStyle: 'italic' },

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
  modalVideTexte: { color: COLORS.texteSecond, fontSize: 14 },
});