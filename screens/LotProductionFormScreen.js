// ============================================================
// AgriSuite Madagascar — Phase 3 / Session 4 (révisé après bug double-rattachement)
// screens/LotProductionFormScreen.js
//
// CHANGEMENTS v2 par rapport à v1 :
//   - Le sélecteur de récolte source filtre par défaut les récoltes
//     déjà rattachées à un lot (toggle pour tout voir si besoin)
//   - Affichage d'une mention sur les récoltes déjà utilisées
//   - Catch propre de l'erreur "récolte déjà rattachée" au moment de
//     la sauvegarde (filet de sécurité côté BDD aussi)
//   - Si la récolte arrive pré-remplie depuis SaisieRecolteScreen et
//     est déjà rattachée, on alerte l'utilisateur
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
  insertLotProduction,
  cloturerLot,
  genererCodeLot,
  CODE_CULTURE,
  getLotById,
} from '../database/exportTrack';
import { getAllSites, getParcellesBySite } from '../database/db';
import { getAllCultures } from '../database/cropEngine';
import { getAllRecoltesMaraicheres, getRecolteById } from '../database/maraicher';

// ============================================================
// HELPERS
// ============================================================

const codeSiteDepuisNom = (nomSite) => {
  if (!nomSite) return '?';
  const m = nomSite.match(/site\s+([A-Z])/i);
  if (m && m[1]) return m[1].toUpperCase();
  return nomSite.trim().charAt(0).toUpperCase();
};

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

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function LotProductionFormScreen({ navigation, route }) {
  const recolteIdInitial = route?.params?.recolteId || null;

  const [sites, setSites] = useState([]);
  const [cultures, setCultures] = useState([]);
  const [recoltes, setRecoltes] = useState([]);
  const [parcelles, setParcelles] = useState([]);

  const [siteId, setSiteId] = useState(null);
  const [parcelleId, setParcelleId] = useState(null);
  const [cultureId, setCultureId] = useState(null);
  const [variete, setVariete] = useState('');
  const [recolteSourceId, setRecolteSourceId] = useState(recolteIdInitial);
  const [dateDebut, setDateDebut] = useState(aujourdhui());
  const [dateFin, setDateFin] = useState('');
  const [quantiteBruteKg, setQuantiteBruteKg] = useState('');
  const [protocolePost, setProtocolePost] = useState('sechage_solaire');
  const [creePar, setCreePar] = useState('');
  const [notes, setNotes] = useState('');

  const [retroactif, setRetroactif] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreurs, setErreurs] = useState({});
  const [modalOuvert, setModalOuvert] = useState(null);

  // v2 : toggle pour afficher les récoltes déjà rattachées (caché par défaut)
  const [montrerRecoltesUtilisees, setMontrerRecoltesUtilisees] = useState(false);

  // ============================================================
  // CHARGEMENT INITIAL
  // ============================================================

  useEffect(() => {
    try {
      setSites(getAllSites ? getAllSites() : []);
      setCultures(getAllCultures ? getAllCultures() : []);

      const recentes = getAllRecoltesMaraicheres
        ? getAllRecoltesMaraicheres(60)
        : [];
      setRecoltes(recentes);
    } catch (err) {
      console.error('[LotProductionForm] Erreur chargement référentiels :', err);
      Alert.alert(
        'Erreur',
        'Impossible de charger les données de référence (sites, cultures, récoltes).'
      );
    }
  }, []);

  // ============================================================
  // PRÉ-REMPLISSAGE DEPUIS RÉCOLTE SOURCE
  // ============================================================

  useEffect(() => {
    if (!recolteSourceId) return;
    try {
      const recolte = getRecolteById ? getRecolteById(recolteSourceId) : null;
      if (!recolte) return;

      // v2 : avertir si la récolte est déjà rattachée à un autre lot
      if (recolte.est_rattachee_a_lot && recolte.lot_code) {
        Alert.alert(
          '⚠️ Récolte déjà rattachée',
          `Cette récolte est déjà liée au lot ${recolte.lot_code}.\n\n` +
          `Une récolte ne peut alimenter qu'un seul lot export ` +
          `(traçabilité BIO/Fairtrade). La sauvegarde sera refusée.\n\n` +
          `Pour rectifier le lot existant, utilise le mécanisme de ` +
          `rectification (à venir Session 5).`,
          [
            {
              text: 'Détacher cette récolte',
              onPress: () => setRecolteSourceId(null),
              style: 'destructive',
            },
            { text: 'OK', style: 'cancel' },
          ]
        );
        return;
      }

      if (recolte.site_id) setSiteId(recolte.site_id);
      if (recolte.parcelle_id) setParcelleId(recolte.parcelle_id);
      if (recolte.culture_id) setCultureId(recolte.culture_id);
      if (recolte.date_recolte) setDateDebut(recolte.date_recolte);
      if (recolte.quantite_kg) setQuantiteBruteKg(String(recolte.quantite_kg));
    } catch (err) {
      console.error('[LotProductionForm] Erreur pré-remplissage récolte :', err);
    }
  }, [recolteSourceId]);

  // ============================================================
  // CHARGEMENT DES PARCELLES DU SITE
  // ============================================================

  useEffect(() => {
    if (!siteId) {
      setParcelles([]);
      return;
    }
    try {
      const ps = getParcellesBySite ? getParcellesBySite(siteId) : [];
      setParcelles(ps);
      if (parcelleId && !ps.find((p) => p.id === parcelleId)) {
        setParcelleId(null);
      }
    } catch (err) {
      console.error('[LotProductionForm] Erreur chargement parcelles :', err);
      setParcelles([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  // ============================================================
  // PREVIEW CODE LOT
  // ============================================================

  const previewCodeLot = useMemo(() => {
    if (!siteId || !cultureId) return null;
    const site = sites.find((s) => s.id === siteId);
    const culture = cultures.find((c) => c.id === cultureId);
    if (!site || !culture) return null;

    const codeSite = codeSiteDepuisNom(site.code);
    const codeCulture = codeCultureDepuis(culture);
    const annee = (() => {
      const d = new Date(dateDebut || aujourdhui());
      return isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
    })();

    try {
      return genererCodeLot(codeSite, codeCulture, annee);
    } catch (err) {
      console.warn('[LotProductionForm] preview code lot impossible :', err);
      return `MDG-${annee}-${codeSite}-${codeCulture}-???`;
    }
  }, [siteId, cultureId, dateDebut, sites, cultures]);

  // ============================================================
  // RÉCOLTES FILTRÉES POUR LE SÉLECTEUR
  // ============================================================

  const recoltesAffichables = useMemo(() => {
    if (montrerRecoltesUtilisees) return recoltes;
    return recoltes.filter((r) => !r.est_rattachee_a_lot);
  }, [recoltes, montrerRecoltesUtilisees]);

  // ============================================================
  // HELPERS RÉSOLUTION LIBELLÉ
  // ============================================================

  const siteNom = useMemo(
    () => sites.find((s) => s.id === siteId)?.code || null,
    [sites, siteId]
  );
  const parcelleNom = useMemo(
    () => parcelles.find((p) => p.id === parcelleId)?.nom || null,
    [parcelles, parcelleId]
  );
  const cultureNom = useMemo(
    () => cultures.find((c) => c.id === cultureId)?.nom_fr ||
          cultures.find((c) => c.id === cultureId)?.nom || null,
    [cultures, cultureId]
  );
  const recolteSourceLibelle = useMemo(() => {
    if (!recolteSourceId) return null;
    const r = recoltes.find((x) => x.id === recolteSourceId);
    if (!r) return `Récolte #${recolteSourceId}`;
    const culture = r.culture_nom || '';
    const suffix = r.est_rattachee_a_lot
      ? ` ⚠️ (déjà liée à ${r.lot_code || 'un lot'})`
      : '';
    return `${formatDateISO(r.date_recolte)} · ${culture ? culture + ' · ' : ''}${r.quantite_kg} kg${suffix}`;
  }, [recoltes, recolteSourceId]);

  // ============================================================
  // VALIDATION
  // ============================================================

  const valider = () => {
    const errs = {};
    if (!siteId) errs.siteId = 'Site requis';
    if (!parcelleId) errs.parcelleId = 'Parcelle requise';
    if (!cultureId) errs.cultureId = 'Culture requise';
    if (!dateDebut) errs.dateDebut = 'Date de début requise';
    if (retroactif && !dateFin) errs.dateFin = 'Date de fin requise en saisie rétroactive';
    if (retroactif && dateFin && dateDebut && new Date(dateFin) < new Date(dateDebut)) {
      errs.dateFin = 'La date de fin doit être après la date de début';
    }
    if (!quantiteBruteKg || isNaN(parseFloat(quantiteBruteKg)) || parseFloat(quantiteBruteKg) <= 0) {
      errs.quantiteBruteKg = 'Quantité brute > 0 requise';
    }
    if (!creePar.trim()) errs.creePar = 'Identité du saisisseur requise';

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
      const site = sites.find((s) => s.id === siteId);
      const culture = cultures.find((c) => c.id === cultureId);
      const codeSite = codeSiteDepuisNom(site.code);
      const codeCulture = codeCultureDepuis(culture);
      const annee = new Date(dateDebut).getFullYear();
      const codeLot = genererCodeLot(codeSite, codeCulture, annee);

      let notesFinales = notes.trim();
      if (retroactif) {
        const mention = `[Saisie rétroactive le ${aujourdhui()} par ${creePar.trim()}]`;
        notesFinales = notesFinales ? `${mention}\n${notesFinales}` : mention;
      }

      const lotPayload = {
        code_lot: codeLot,
        parcelle_id: parcelleId,
        site_id: siteId,
        culture_id: cultureId,
        variete: variete.trim() || null,
        recolte_maraichere_id: recolteSourceId || null,
        date_debut: dateDebut,
        date_fin: retroactif ? dateFin : null,
        est_cloture: false,
        quantite_brute_kg: parseFloat(quantiteBruteKg),
        protocole_post_recolte: protocolePost,
        statut: 'en_cours',
        cree_par: creePar.trim(),
        notes: notesFinales || null,
      };

      // v2 : insertLotProduction throw si récolte déjà rattachée
      const nouveauId = insertLotProduction(lotPayload);

      if (retroactif) {
        cloturerLot(nouveauId, creePar.trim());
      }

      const lotCree = getLotById(nouveauId);

      setEnCours(false);

      Alert.alert(
        retroactif ? '✅ Lot créé et clôturé' : '✅ Lot créé',
        `Code : ${lotCree?.code_lot || codeLot}\n` +
        `${retroactif ? 'Statut : clôturé (saisie rétroactive)' : 'Statut : ouvert'}\n` +
        `Quantité brute : ${quantiteBruteKg} kg`,
        [
          {
            text: 'Voir le lot',
            onPress: () =>
              navigation.replace('LotDetail', { lotId: nouveauId }),
          },
          {
            text: 'Retour à la liste',
            onPress: () => navigation.goBack(),
            style: 'cancel',
          },
        ]
      );
    } catch (err) {
      setEnCours(false);
      console.error('[LotProductionForm] Erreur sauvegarde :', err);
      const isDoubleRattachement = err.message?.includes('déjà rattachée');
      Alert.alert(
        isDoubleRattachement
          ? '🚫 Récolte déjà utilisée'
          : 'Erreur lors de la création',
        err.message || 'Impossible de créer le lot. Vérifie les champs et réessaie.'
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    siteId, parcelleId, cultureId, variete, recolteSourceId,
    dateDebut, dateFin, quantiteBruteKg, protocolePost, creePar, notes,
    retroactif, sites, cultures, navigation,
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
        <View style={styles.header}>
          <Text style={styles.headerTitre}>Nouveau lot · Production</Text>
          <Text style={styles.headerSousTitre}>
            🏡 Filière A — origine parcelle propre
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.retroToggle, retroactif && styles.retroToggleActif]}
          onPress={() => setRetroactif((v) => !v)}
        >
          <View style={styles.retroToggleLeft}>
            <Text style={styles.retroIcone}>{retroactif ? '☑' : '☐'}</Text>
            <View>
              <Text style={[styles.retroLabel, retroactif && styles.retroLabelActif]}>
                Saisie rétroactive
              </Text>
              <Text style={styles.retroHint}>
                {retroactif
                  ? 'Lot historique — sera créé déjà clôturé'
                  : 'Cocher pour saisir un lot déjà terminé'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <Section titre="Récolte source (optionnel)">
          <Champ label="Récolte MaraîcherGuide à rattacher">
            <Selecteur
              valeur={recolteSourceLibelle || 'Aucune (lot saisi à la main)'}
              placeholder="Choisir une récolte récente"
              onPress={() => setModalOuvert('recolte')}
              effacable={!!recolteSourceId}
              onEffacer={() => setRecolteSourceId(null)}
            />
            <Text style={styles.hint}>
              {recolteSourceId
                ? `Le lot sera lié à cette récolte (recolte_maraichere_id=${recolteSourceId})`
                : 'Si la récolte est listée, le formulaire est pré-rempli automatiquement'}
            </Text>
          </Champ>
        </Section>

        <Section titre="Origine">
          <Champ label="Site *" erreur={erreurs.siteId}>
            <Selecteur
              valeur={siteNom}
              placeholder="Choisir un site"
              onPress={() => setModalOuvert('site')}
            />
          </Champ>
          <Champ label="Parcelle *" erreur={erreurs.parcelleId}>
            <Selecteur
              valeur={parcelleNom}
              placeholder={siteId ? 'Choisir une parcelle' : 'Choisir un site d\'abord'}
              onPress={() => siteId && setModalOuvert('parcelle')}
              disabled={!siteId}
            />
          </Champ>
        </Section>

        <Section titre="Produit">
          <Champ label="Culture *" erreur={erreurs.cultureId}>
            <Selecteur
              valeur={cultureNom}
              placeholder="Choisir une culture"
              onPress={() => setModalOuvert('culture')}
            />
          </Champ>
          <Champ label="Variété (optionnel)">
            <TextInput
              style={styles.input}
              value={variete}
              onChangeText={setVariete}
              placeholder="ex: gingembre rouge local"
              placeholderTextColor="#5a6a5a"
            />
          </Champ>
        </Section>

        {previewCodeLot && (
          <View style={styles.previewBox}>
            <Text style={styles.previewLabel}>📋 Code lot qui sera attribué</Text>
            <Text style={styles.previewCode}>{previewCodeLot}</Text>
            <Text style={styles.previewHint}>
              Format : MDG-Année-Site-Culture-N° séquentiel · Définitif à la sauvegarde
            </Text>
          </View>
        )}

        <Section titre="Fenêtre temporelle">
          <Champ label="Date de début (1ère récolte) *" erreur={erreurs.dateDebut}>
            <TextInput
              style={styles.input}
              value={dateDebut}
              onChangeText={setDateDebut}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#5a6a5a"
              keyboardType="numbers-and-punctuation"
            />
          </Champ>
          {retroactif && (
            <Champ label="Date de fin *" erreur={erreurs.dateFin}>
              <TextInput
                style={styles.input}
                value={dateFin}
                onChangeText={setDateFin}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#5a6a5a"
                keyboardType="numbers-and-punctuation"
              />
            </Champ>
          )}
        </Section>

        <Section titre="Mesure & protocole">
          <Champ label="Quantité brute (kg) *" erreur={erreurs.quantiteBruteKg}>
            <TextInput
              style={styles.input}
              value={quantiteBruteKg}
              onChangeText={setQuantiteBruteKg}
              placeholder="ex: 450.0"
              placeholderTextColor="#5a6a5a"
              keyboardType="decimal-pad"
            />
          </Champ>
          <Champ label="Protocole post-récolte">
            <Selecteur
              valeur={LIBELLES_PROTOCOLE[protocolePost] || protocolePost}
              placeholder="Choisir un protocole"
              onPress={() => setModalOuvert('protocole')}
            />
          </Champ>
        </Section>

        <Section titre="Validation">
          <Champ label="Saisi par *" erreur={erreurs.creePar}>
            <TextInput
              style={styles.input}
              value={creePar}
              onChangeText={setCreePar}
              placeholder="Nom de l'opérateur ou gérant"
              placeholderTextColor="#5a6a5a"
              autoCapitalize="words"
            />
          </Champ>
          <Champ label="Notes (optionnel)">
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Observations, conditions de récolte, qualité visuelle…"
              placeholderTextColor="#5a6a5a"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </Champ>
        </Section>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.btnAnnuler}
            onPress={() => navigation.goBack()}
            disabled={enCours}
          >
            <Text style={styles.btnAnnulerTexte}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.btnPrincipal,
              retroactif && styles.btnRetro,
              enCours && styles.btnDisabled,
            ]}
            onPress={sauvegarder}
            disabled={enCours}
          >
            <Text style={styles.btnPrincipalTexte}>
              {enCours
                ? 'Enregistrement…'
                : retroactif
                  ? '✓ Créer et clôturer'
                  : '+ Créer le lot (ouvert)'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      <ModalSelection
        visible={modalOuvert !== null}
        onClose={() => setModalOuvert(null)}
        type={modalOuvert}
        sites={sites}
        parcelles={parcelles}
        cultures={cultures}
        recoltes={recoltesAffichables}
        recoltesTotal={recoltes.length}
        montrerRecoltesUtilisees={montrerRecoltesUtilisees}
        onToggleMontrerUtilisees={() => setMontrerRecoltesUtilisees(v => !v)}
        onSelectSite={(id) => { setSiteId(id); setModalOuvert(null); }}
        onSelectParcelle={(id) => { setParcelleId(id); setModalOuvert(null); }}
        onSelectCulture={(id) => { setCultureId(id); setModalOuvert(null); }}
        onSelectRecolte={(id) => { setRecolteSourceId(id); setModalOuvert(null); }}
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

function Champ({ label, erreur, children }) {
  return (
    <View style={styles.champ}>
      <Text style={styles.champLabel}>{label}</Text>
      {children}
      {erreur ? <Text style={styles.champErreur}>⚠ {erreur}</Text> : null}
    </View>
  );
}

function Selecteur({ valeur, placeholder, onPress, disabled, effacable, onEffacer }) {
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
      {effacable && valeur ? (
        <TouchableOpacity onPress={onEffacer} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.selecteurEffacer}>✕</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.selecteurChevron}>›</Text>
      )}
    </TouchableOpacity>
  );
}

const LIBELLES_PROTOCOLE = {
  sechage_solaire:    'Séchage solaire',
  sechage_mecanique:  'Séchoir mécanique',
  sechage_ombre:      'Séchage à l\'ombre',
  fermentation:       'Fermentation',
  echaudage:          'Échaudage (vanille)',
  aucun:              'Aucun (frais)',
};

function ModalSelection({
  visible, onClose, type,
  sites, parcelles, cultures, recoltes,
  recoltesTotal, montrerRecoltesUtilisees, onToggleMontrerUtilisees,
  onSelectSite, onSelectParcelle, onSelectCulture, onSelectRecolte, onSelectProtocole,
}) {
  let titre = '';
  let items = [];
  let onSelect = () => {};
  let toggleHeader = null;

  if (type === 'site') {
    titre = 'Choisir un site';
    items = sites.map((s) => ({ id: s.id, label: s.code, sub: s.region || null }));
    onSelect = onSelectSite;
  } else if (type === 'parcelle') {
    titre = 'Choisir une parcelle';
    items = parcelles.map((p) => ({
      id: p.id,
      label: p.nom,
      sub: p.superficie_m2 ? `${p.superficie_m2.toFixed(0)} m²` : null,
    }));
    onSelect = onSelectParcelle;
  } else if (type === 'culture') {
    titre = 'Choisir une culture';
    items = cultures.map((c) => ({
      id: c.id,
      label: c.nom_fr || c.nom,
      sub: c.cycle_jours ? `Cycle ${c.cycle_jours}j` : null,
    }));
    onSelect = onSelectCulture;
  } else if (type === 'recolte') {
    titre = 'Choisir une récolte source';
    items = recoltes.map((r) => {
      const dateLabel = formatDateISO(r.date_recolte);
      const cultureLabel = r.culture_nom || `Culture #${r.culture_id}`;
      const siteLabel = r.site_code ? ` · ${r.site_code}` : '';
      const plancheLabel = r.planche_nom ? ` · ${r.planche_nom}` : '';
      const rattacheeMarker = r.est_rattachee_a_lot ? ' ⚠️' : '';
      return {
        id: r.id,
        label: `${dateLabel} · ${cultureLabel} · ${r.quantite_kg} kg${rattacheeMarker}`,
        sub: `${siteLabel}${plancheLabel}${r.qualite ? ` · qualité ${r.qualite}` : ''}`.replace(/^ · /, '')
          + (r.est_rattachee_a_lot && r.lot_code ? ` · DÉJÀ LIÉE À ${r.lot_code}` : ''),
        disabled: !!r.est_rattachee_a_lot,
      };
    });
    onSelect = onSelectRecolte;

    const nbCachees = (recoltesTotal || 0) - recoltes.length;
    if (nbCachees > 0 || montrerRecoltesUtilisees) {
      toggleHeader = (
        <TouchableOpacity
          style={styles.modalToggle}
          onPress={onToggleMontrerUtilisees}
        >
          <Text style={styles.modalToggleTexte}>
            {montrerRecoltesUtilisees
              ? '🔍 Cacher les récoltes déjà rattachées'
              : `🔍 Afficher aussi les ${nbCachees} récolte${nbCachees > 1 ? 's' : ''} déjà rattachée${nbCachees > 1 ? 's' : ''}`}
          </Text>
        </TouchableOpacity>
      );
    }
  } else if (type === 'protocole') {
    titre = 'Choisir un protocole post-récolte';
    items = Object.entries(LIBELLES_PROTOCOLE).map(([k, v]) => ({ id: k, label: v }));
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
          {toggleHeader}
          <ScrollView style={styles.modalListe}>
            {items.length === 0 ? (
              <View style={styles.modalVide}>
                <Text style={styles.modalVideTexte}>
                  Aucun élément disponible.
                </Text>
                {type === 'recolte' && (
                  <Text style={styles.modalVideHint}>
                    {montrerRecoltesUtilisees
                      ? 'Aucune récolte des 60 derniers jours dans MaraîcherGuide.'
                      : 'Toutes les récoltes récentes sont déjà rattachées à un lot. Active le toggle ci-dessus pour les voir.'}
                  </Text>
                )}
                {type === 'parcelle' && (
                  <Text style={styles.modalVideHint}>
                    Aucune parcelle enregistrée pour ce site.
                  </Text>
                )}
              </View>
            ) : (
              items.map((it) => (
                <TouchableOpacity
                  key={String(it.id)}
                  style={[
                    styles.modalItem,
                    it.disabled && styles.modalItemDisabled,
                  ]}
                  onPress={() => !it.disabled && onSelect(it.id)}
                  disabled={it.disabled}
                >
                  <Text style={[
                    styles.modalItemLabel,
                    it.disabled && styles.modalItemLabelDisabled,
                  ]}>
                    {it.label}
                  </Text>
                  {it.sub ? (
                    <Text style={[
                      styles.modalItemSub,
                      it.disabled && styles.modalItemSubDisabled,
                    ]}>
                      {it.sub}
                    </Text>
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
  borderActive: '#7ec87e',
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
  headerTitre: { color: COLORS.ambre, fontSize: 22, fontWeight: '700' },
  headerSousTitre: { color: COLORS.texteSecond, fontSize: 13, marginTop: 4 },

  retroToggle: {
    flexDirection: 'row', backgroundColor: COLORS.bgCard,
    padding: 14, borderRadius: 10, marginBottom: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  retroToggleActif: { borderColor: COLORS.jaune, backgroundColor: '#2a2a14' },
  retroToggleLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  retroIcone: { color: COLORS.jaune, fontSize: 20, marginRight: 12 },
  retroLabel: { color: COLORS.texteDoux, fontSize: 14, fontWeight: '600' },
  retroLabelActif: { color: COLORS.jaune },
  retroHint: { color: COLORS.texteSecond, fontSize: 11, marginTop: 2 },

  section: {
    backgroundColor: COLORS.bgCard, padding: 14,
    borderRadius: 10, marginBottom: 12,
  },
  sectionTitre: {
    color: COLORS.vertClair, fontSize: 13, fontWeight: '600',
    marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5,
  },

  champ: { marginBottom: 12 },
  champLabel: {
    color: COLORS.texteDoux, fontSize: 12,
    marginBottom: 6, fontWeight: '500',
  },
  champErreur: { color: COLORS.rouge, fontSize: 11, marginTop: 4 },

  input: {
    backgroundColor: COLORS.bgInput, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    color: COLORS.texteDoux, fontSize: 14,
  },
  inputMulti: { minHeight: 70, textAlignVertical: 'top' },

  hint: {
    color: COLORS.texteMute, fontSize: 11,
    marginTop: 4, fontStyle: 'italic',
  },

  selecteur: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgInput, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12,
  },
  selecteurDisabled: { opacity: 0.4 },
  selecteurValeur: { flex: 1, color: COLORS.texteDoux, fontSize: 14 },
  selecteurPlaceholder: { color: COLORS.texteMute },
  selecteurChevron: { color: COLORS.texteSecond, fontSize: 20, fontWeight: '300' },
  selecteurEffacer: { color: COLORS.rouge, fontSize: 14, paddingHorizontal: 4 },

  previewBox: {
    backgroundColor: '#2a2014', padding: 14, borderRadius: 10,
    marginBottom: 12, borderLeftWidth: 3, borderLeftColor: COLORS.ambre,
  },
  previewLabel: {
    color: COLORS.ambreClair, fontSize: 11,
    fontWeight: '600', letterSpacing: 0.5,
  },
  previewCode: {
    color: COLORS.ambre, fontSize: 18, fontWeight: '700',
    fontFamily: 'monospace', marginTop: 6, marginBottom: 4,
  },
  previewHint: { color: COLORS.texteSecond, fontSize: 10, fontStyle: 'italic' },

  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btnAnnuler: {
    flex: 1, backgroundColor: COLORS.bgCard,
    paddingVertical: 14, borderRadius: 10, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  btnAnnulerTexte: { color: COLORS.texteSecond, fontSize: 14, fontWeight: '600' },
  btnPrincipal: {
    flex: 2, backgroundColor: COLORS.ambre,
    paddingVertical: 14, borderRadius: 10, alignItems: 'center',
  },
  btnRetro: { backgroundColor: COLORS.jaune },
  btnDisabled: { opacity: 0.5 },
  btnPrincipalTexte: { color: '#0d1a0d', fontSize: 14, fontWeight: '700' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalTitre: { color: COLORS.ambreClair, fontSize: 16, fontWeight: '700' },
  modalFermer: { color: COLORS.texteSecond, fontSize: 22, paddingHorizontal: 8 },

  modalToggle: {
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: COLORS.bgInput,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalToggleTexte: {
    color: COLORS.ambreClair, fontSize: 12, fontWeight: '500',
  },

  modalListe: { paddingVertical: 8 },
  modalItem: {
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalItemDisabled: {
    backgroundColor: '#0a0a0a',
    opacity: 0.5,
  },
  modalItemLabel: { color: COLORS.texteDoux, fontSize: 14, fontWeight: '500' },
  modalItemLabelDisabled: { color: COLORS.texteMute, fontStyle: 'italic' },
  modalItemSub: { color: COLORS.texteSecond, fontSize: 12, marginTop: 3 },
  modalItemSubDisabled: { color: COLORS.rouge },
  modalVide: { padding: 24, alignItems: 'center' },
  modalVideTexte: { color: COLORS.texteSecond, fontSize: 14, textAlign: 'center' },
  modalVideHint: {
    color: COLORS.texteMute, fontSize: 12,
    textAlign: 'center', marginTop: 8, fontStyle: 'italic',
  },
});