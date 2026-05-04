// ============================================================
// AgriSuite Madagascar — Phase 3 / Session 5 partie 3 (livraison 2)
// screens/RectifierLotScreen.js
//
// Mécanisme de rectification d'un lot existant.
// Principe : on ne modifie JAMAIS la ligne d'origine. On crée une
// nouvelle ligne (rectificatif) qui remplace l'ancienne, et la ligne
// d'origine est marquée est_rectifie_par = id_rectificatif.
// La ligne d'origine reste en base pour l'audit mais devient invisible
// dans les vues normales (filtrées par WHERE est_rectifie_par IS NULL).
//
// Champs MODIFIABLES (critiques, peuvent être faux à la saisie) :
//   - Culture, variété
//   - Dates début / fin
//   - Quantité brute
//   - Protocole post-récolte
//   - Notes
//
// Champs FIGÉS (identité historique, jamais modifiables) :
//   - Code lot original (le rectificatif aura son propre nouveau code)
//   - Filière (production / collecte)
//   - Site / parcelle / zone (modifications de zone via rectif = trop risqué)
//   - Créateur original (cree_par, cree_le)
//
// Workflow :
//   1. Affichage du lot original en lecture seule (gauche)
//   2. Champs modifiables avec valeurs pré-remplies (droite)
//   3. Choix de la raison (liste + commentaire libre obligatoire)
//   4. Confirmation à 2 étapes : récap + tap "Rectifier"
//   5. Création du rectificatif + marquage de l'original
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
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
  getLotById,
  rectifierLot,
  getEtapesByLot,
  getAnalysesByLot,
  getConditionnementsByLot,
  getBonsCollecteByLot,
} from '../database/exportTrack';
import { getCultureById } from '../database/cropEngine';

// ============================================================
// HELPERS
// ============================================================

const formatKg = (kg) => {
  if (kg == null || isNaN(kg)) return '—';
  if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t`;
  return `${kg.toFixed(1)} kg`;
};

const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
};

const aujourdhui = () => new Date().toISOString().slice(0, 10);

// ============================================================
// CONSTANTES
// ============================================================

const RAISONS_RECTIFICATION = [
  {
    code: 'erreur_saisie',
    label: '✏️ Erreur de saisie initiale',
    description: 'Typo, mauvaise unité, mauvais champ rempli au départ',
  },
  {
    code: 'correction_audit',
    label: '🔍 Correction post-audit',
    description: 'Demandée par l\'auditeur (BIO, Fairtrade, etc.)',
  },
  {
    code: 'changement_classification',
    label: '🔄 Changement de classification',
    description: 'Le lot doit être reclassé (ex: gourmet → black)',
  },
  {
    code: 'mise_a_jour_reglementaire',
    label: '📋 Mise à jour réglementaire',
    description: 'Un seuil ou une norme a changé',
  },
  {
    code: 'autre',
    label: '📝 Autre',
    description: 'Détailler dans le commentaire libre',
  },
];

const PROTOCOLES = [
  { code: 'sechage_solaire',    label: 'Séchage solaire' },
  { code: 'sechage_mecanique',  label: 'Séchoir mécanique' },
  { code: 'sechage_ombre',      label: 'Séchage à l\'ombre' },
  { code: 'fermentation',       label: 'Fermentation' },
  { code: 'echaudage',          label: 'Échaudage (vanille)' },
  { code: 'aucun',              label: 'Aucun (frais)' },
];

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function RectifierLotScreen({ navigation, route }) {
  const lotId = route?.params?.lotId;

  // ---- Référentiel ----
  const [lotOriginal, setLotOriginal] = useState(null);
  const [cultureOriginale, setCultureOriginale] = useState(null);

  // ---- Champs modifiables (pré-remplis avec valeurs originales) ----
  const [variete, setVariete] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [quantiteBruteKg, setQuantiteBruteKg] = useState('');
  const [protocolePost, setProtocolePost] = useState('aucun');
  const [notes, setNotes] = useState('');

  // ---- Métadonnées rectification ----
  const [raisonCode, setRaisonCode] = useState(null);
  const [raisonLibre, setRaisonLibre] = useState('');
  const [rectificateur, setRectificateur] = useState('');

  // ---- Compteurs éléments liés du lot original ----
  const [nbEtapes, setNbEtapes] = useState(0);
  const [nbAnalyses, setNbAnalyses] = useState(0);
  const [nbConditionnements, setNbConditionnements] = useState(0);
  const [nbBons, setNbBons] = useState(0);

  // ---- Options de copie (par défaut : tout copier sans re-vérification
  //      car le cas le plus fréquent est la rectification simple) ----
  const [copierEtapes, setCopierEtapes] = useState(true);
  const [copierAnalyses, setCopierAnalyses] = useState(true);
  const [copierConditionnements, setCopierConditionnements] = useState(true);
  const [copierBons, setCopierBons] = useState(true);
  const [marquerAReVerifier, setMarquerAReVerifier] = useState(false);

  // ---- État UI ----
  const [enCours, setEnCours] = useState(false);
  const [erreurs, setErreurs] = useState({});
  const [modalOuvert, setModalOuvert] = useState(null);

  // ============================================================
  // CHARGEMENT
  // ============================================================

  useEffect(() => {
    try {
      const l = getLotById(lotId);
      if (!l) {
        Alert.alert(
          'Lot introuvable',
          'Ce lot n\'existe pas ou a été supprimé.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }
      if (l.est_rectifie_par) {
        Alert.alert(
          'Lot déjà rectifié',
          `Ce lot a déjà été rectifié. Tu ne peux pas rectifier une rectification.\n\n` +
          `Si tu as besoin de modifier le rectificatif, ouvre-le directement.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      setLotOriginal(l);
      try { setCultureOriginale(getCultureById(l.culture_id)); } catch (e) {}

      // Pré-remplit les champs modifiables avec les valeurs actuelles
      setVariete(l.variete || '');
      setDateDebut(l.date_debut || '');
      setDateFin(l.date_fin || '');
      setQuantiteBruteKg(l.quantite_brute_kg != null ? String(l.quantite_brute_kg) : '');
      setProtocolePost(l.protocole_post_recolte || 'aucun');
      setNotes(l.notes || '');

      // Compte les éléments liés (pour la section copie sélective)
      try { setNbEtapes((getEtapesByLot(lotId) || []).length); } catch (e) {}
      try { setNbAnalyses((getAnalysesByLot(lotId) || []).length); } catch (e) {}
      try { setNbConditionnements((getConditionnementsByLot(lotId) || []).length); } catch (e) {}
      if (l.filiere === 'collecte') {
        try { setNbBons((getBonsCollecteByLot(lotId) || []).length); } catch (e) {}
      }
    } catch (err) {
      console.error('[RectifierLot] Erreur chargement :', err);
      Alert.alert('Erreur', 'Impossible de charger le lot.');
    }
  }, [lotId, navigation]);

  // ============================================================
  // VARIABLES DÉRIVÉES
  // ============================================================

  const cultureNom = cultureOriginale
    ? (cultureOriginale.nom_fr || cultureOriginale.nom)
    : `Culture #${lotOriginal?.culture_id}`;

  const raisonInfo = useMemo(() => {
    return RAISONS_RECTIFICATION.find((r) => r.code === raisonCode);
  }, [raisonCode]);

  const protocoleLabel = useMemo(() => {
    return PROTOCOLES.find((p) => p.code === protocolePost)?.label || protocolePost;
  }, [protocolePost]);

  // Détection des changements (pour récap)
  const changements = useMemo(() => {
    if (!lotOriginal) return [];
    const c = [];

    if ((lotOriginal.variete || '') !== variete.trim()) {
      c.push({
        champ: 'Variété',
        avant: lotOriginal.variete || '—',
        apres: variete.trim() || '—',
      });
    }
    if (lotOriginal.date_debut !== dateDebut) {
      c.push({
        champ: 'Date début',
        avant: formatDate(lotOriginal.date_debut),
        apres: formatDate(dateDebut),
      });
    }
    if ((lotOriginal.date_fin || '') !== dateFin) {
      c.push({
        champ: 'Date fin',
        avant: lotOriginal.date_fin ? formatDate(lotOriginal.date_fin) : '—',
        apres: dateFin ? formatDate(dateFin) : '—',
      });
    }
    const qteOrig = lotOriginal.quantite_brute_kg;
    const qteNew = quantiteBruteKg ? parseFloat(quantiteBruteKg) : null;
    if (qteOrig !== qteNew) {
      c.push({
        champ: 'Quantité brute',
        avant: qteOrig != null ? formatKg(qteOrig) : '—',
        apres: qteNew != null ? formatKg(qteNew) : '—',
      });
    }
    if ((lotOriginal.protocole_post_recolte || 'aucun') !== protocolePost) {
      const orig = PROTOCOLES.find((p) => p.code === lotOriginal.protocole_post_recolte);
      c.push({
        champ: 'Protocole',
        avant: orig?.label || lotOriginal.protocole_post_recolte || '—',
        apres: protocoleLabel,
      });
    }
    if ((lotOriginal.notes || '').trim() !== notes.trim()) {
      c.push({
        champ: 'Notes',
        avant: lotOriginal.notes ? '(différentes)' : '—',
        apres: notes.trim() ? '(modifiées)' : '—',
      });
    }
    return c;
  }, [lotOriginal, variete, dateDebut, dateFin, quantiteBruteKg, protocolePost, notes, protocoleLabel]);

  // ============================================================
  // VALIDATION
  // ============================================================

  const valider = () => {
    const errs = {};

    if (!dateDebut) errs.dateDebut = 'Date de début requise';
    if (dateFin && dateDebut && new Date(dateFin) < new Date(dateDebut)) {
      errs.dateFin = 'Date fin antérieure à date début';
    }
    if (quantiteBruteKg && (isNaN(parseFloat(quantiteBruteKg)) ||
        parseFloat(quantiteBruteKg) < 0)) {
      errs.quantiteBruteKg = 'Quantité ≥ 0';
    }
    if (!raisonCode) errs.raisonCode = 'Raison de rectification requise';
    if (!raisonLibre.trim() || raisonLibre.trim().length < 10) {
      errs.raisonLibre = 'Commentaire détaillé requis (min 10 caractères)';
    }
    if (!rectificateur.trim()) errs.rectificateur = 'Identité du rectificateur requise';

    if (changements.length === 0) {
      errs.global = 'Aucune modification détectée. Modifie au moins un champ pour rectifier.';
    }

    setErreurs(errs);
    return Object.keys(errs).length === 0;
  };

  // ============================================================
  // RECTIFICATION
  // ============================================================

  const rectifier = () => {
    if (!valider()) {
      Alert.alert(
        erreurs.global || 'Champs manquants',
        erreurs.global
          ? 'Tu n\'as modifié aucun champ. Si rien ne change, il n\'y a rien à rectifier.'
          : 'Vérifie les champs marqués en rouge avant de continuer.'
      );
      return;
    }

    // Confirmation à 2 niveaux : récap + tap rectifier
    const recapChangements = changements
      .map((c) => `• ${c.champ} : ${c.avant} → ${c.apres}`)
      .join('\n');

    Alert.alert(
      '🔄 Confirmer la rectification',
      `Lot original : ${lotOriginal.code_lot}\n\n` +
      `MODIFICATIONS :\n${recapChangements}\n\n` +
      `Raison : ${raisonInfo?.label}\n` +
      `Rectificateur : ${rectificateur.trim()}\n\n` +
      `Le lot original sera marqué comme rectifié et un nouveau lot sera ` +
      `créé avec un nouveau code. Cette action est définitive et trace une ` +
      `entrée d'audit.\n\n` +
      `Confirmer la rectification ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Rectifier',
          style: 'destructive',
          onPress: () => commitRectification(),
        },
      ]
    );
  };

  const commitRectification = () => {
    setEnCours(true);

    try {
      // Construction des notes finales du rectificatif avec mention complète
      const horodatage = new Date().toISOString();
      const recapChangements = changements
        .map((c) => `  • ${c.champ} : ${c.avant} → ${c.apres}`)
        .join('\n');

      const blocRectif =
        `[RECTIFICATIF du lot ${lotOriginal.code_lot}]\n` +
        `Date : ${horodatage}\n` +
        `Rectificateur : ${rectificateur.trim()}\n` +
        `Raison : ${raisonInfo?.label}\n` +
        `Détail : ${raisonLibre.trim()}\n` +
        `Modifications :\n${recapChangements}`;

      const notesFinales = notes.trim()
        ? `${blocRectif}\n\n--- Notes du lot ---\n${notes.trim()}`
        : blocRectif;

      // Construction de l'objet "lotCorrige" — uniquement les champs modifiables
      const lotCorrige = {
        variete: variete.trim() || null,
        date_debut: dateDebut,
        date_fin: dateFin || null,
        quantite_brute_kg: quantiteBruteKg ? parseFloat(quantiteBruteKg) : null,
        protocole_post_recolte: protocolePost,
        notes: notesFinales,
        // Le rectificatif démarre en statut "en_cours" non clôturé
        // L'utilisateur pourra le clôturer après vérification
        est_cloture: false,
        statut: 'en_cours',
        valide_par: null,
        valide_le: null,
        // cree_par = rectificateur (signature de la rectification)
        cree_par: rectificateur.trim(),
      };

      const optionsCopie = {
        copierEtapes,
        copierAnalyses,
        copierConditionnements,
        copierBons,
        marquerAReVerifier,
      };

      const nouveauLotId = rectifierLot(lotId, lotCorrige, optionsCopie);
      const nouveauLot = getLotById(nouveauLotId);
      setEnCours(false);

      // Calcul des éléments effectivement copiés pour le message
      const elementsCopies = [];
      if (copierEtapes && nbEtapes > 0) elementsCopies.push(`${nbEtapes} étape(s)`);
      if (copierAnalyses && nbAnalyses > 0) elementsCopies.push(`${nbAnalyses} analyse(s)`);
      if (copierConditionnements && nbConditionnements > 0) elementsCopies.push(`${nbConditionnements} conditionnement(s)`);
      if (copierBons && nbBons > 0) elementsCopies.push(`${nbBons} bon(s) collecte`);
      const messageCopie = elementsCopies.length > 0
        ? `\n\nÉléments copiés : ${elementsCopies.join(', ')}${marquerAReVerifier ? ' (marqués à re-vérifier)' : ''}.`
        : '';

      Alert.alert(
        '✅ Lot rectifié',
        `Lot original ${lotOriginal.code_lot} marqué comme rectifié.\n\n` +
        `Nouveau lot rectificatif : ${nouveauLot?.code_lot}` +
        messageCopie,
        [
          {
            text: 'Ouvrir le rectificatif',
            onPress: () => navigation.replace('LotDetail', { lotId: nouveauLotId }),
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
      console.error('[RectifierLot] Erreur :', err);
      Alert.alert(
        'Erreur lors de la rectification',
        err.message || 'Impossible de rectifier le lot.'
      );
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  if (!lotOriginal) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0d1a0d" />
        <View style={styles.loadingBox}>
          <Text style={styles.loadingTexte}>Chargement…</Text>
        </View>
      </View>
    );
  }

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
            <Text style={styles.btnRetour}>‹ Retour</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitre}>🔄 Rectifier le lot</Text>
          <Text style={styles.headerSousTitre}>
            Mécanisme audit — pas de modification destructive
          </Text>
        </View>

        {/* Encart pédagogique */}
        <View style={styles.cardExplain}>
          <Text style={styles.cardExplainTitre}>
            ℹ️ Comment fonctionne la rectification
          </Text>
          <Text style={styles.cardExplainTexte}>
            • Le lot original sera <Text style={{ fontWeight: '700' }}>conservé en base</Text>{'\n'}
            • Un nouveau lot rectificatif sera créé avec un nouveau code{'\n'}
            • Le lot original sera marqué "rectifié" et n'apparaîtra plus dans les vues normales{'\n'}
            • La traçabilité audit est préservée — l'auditeur peut toujours voir l'historique
          </Text>
        </View>

        {/* Lot original — lecture seule */}
        <View style={styles.cardOriginal}>
          <Text style={styles.cardOriginalTitre}>📋 Lot original (lecture seule)</Text>
          <Text style={styles.cardOriginalCode}>{lotOriginal.code_lot}</Text>
          <View style={styles.origLignes}>
            <OrigLigne label="Filière" valeur={
              lotOriginal.filiere === 'production' ? '🏡 Production' : '🤝 Collecte'
            } />
            <OrigLigne label="Culture" valeur={cultureNom} />
            <OrigLigne label="Variété" valeur={lotOriginal.variete || '—'} />
            <OrigLigne label="Date début" valeur={formatDate(lotOriginal.date_debut)} />
            <OrigLigne label="Date fin" valeur={
              lotOriginal.date_fin ? formatDate(lotOriginal.date_fin) : '—'
            } />
            <OrigLigne label="Quantité brute" valeur={
              lotOriginal.quantite_brute_kg != null
                ? formatKg(lotOriginal.quantite_brute_kg)
                : '—'
            } />
            <OrigLigne label="Saisi par" valeur={lotOriginal.cree_par} />
            <OrigLigne label="Saisi le" valeur={
              lotOriginal.cree_le ? new Date(lotOriginal.cree_le).toLocaleDateString('fr-FR') : '—'
            } />
          </View>
        </View>

        {/* Champs modifiables */}
        <Section titre="Champs modifiables">
          <Text style={styles.sectionExplain}>
            Modifie ci-dessous les champs à corriger. Les valeurs originales
            sont pré-remplies. Les champs identité (filière, code, créateur)
            ne sont pas modifiables.
          </Text>

          <Champ label="Variété">
            <TextInput
              style={styles.input}
              value={variete}
              onChangeText={setVariete}
              placeholder="Variété ou cultivar"
              placeholderTextColor="#5a6a5a"
            />
          </Champ>

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

          <Champ label="Date de fin" erreur={erreurs.dateFin}>
            <TextInput
              style={styles.input}
              value={dateFin}
              onChangeText={setDateFin}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#5a6a5a"
              keyboardType="numbers-and-punctuation"
            />
          </Champ>

          <Champ label="Quantité brute (kg)" erreur={erreurs.quantiteBruteKg}>
            <View style={styles.inputAvecUnite}>
              <TextInput
                style={styles.inputQte}
                value={quantiteBruteKg}
                onChangeText={setQuantiteBruteKg}
                placeholder="0"
                placeholderTextColor="#5a6a5a"
                keyboardType="decimal-pad"
              />
              <Text style={styles.inputUnite}>kg</Text>
            </View>
          </Champ>

          <Champ label="Protocole post-récolte">
            <Selecteur
              valeur={protocoleLabel}
              placeholder="Choisir un protocole"
              onPress={() => setModalOuvert('protocole')}
            />
          </Champ>

          <Champ label="Notes">
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Notes du lot (modifiables)"
              placeholderTextColor="#5a6a5a"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <Text style={styles.hint}>
              Une mention de rectification sera automatiquement ajoutée en
              en-tête lors de la sauvegarde.
            </Text>
          </Champ>
        </Section>

        {/* Récap des changements */}
        {changements.length > 0 && (
          <View style={styles.cardChangements}>
            <Text style={styles.cardChangementsTitre}>
              📝 Modifications détectées ({changements.length})
            </Text>
            {changements.map((c, i) => (
              <View key={i} style={styles.changementLigne}>
                <Text style={styles.changementChamp}>{c.champ}</Text>
                <View style={styles.changementValeurs}>
                  <Text style={styles.changementAvant} numberOfLines={1}>
                    {c.avant}
                  </Text>
                  <Text style={styles.changementFleche}>→</Text>
                  <Text style={styles.changementApres} numberOfLines={1}>
                    {c.apres}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {changements.length === 0 && (
          <View style={styles.cardAucunChangement}>
            <Text style={styles.cardAucunChangementTexte}>
              ⓘ Aucune modification détectée. Modifie au moins un champ
              pour pouvoir rectifier.
            </Text>
          </View>
        )}

        {/* Section copie sélective des éléments liés */}
        {(nbEtapes > 0 || nbAnalyses > 0 || nbConditionnements > 0 || nbBons > 0) && (
          <Section titre="Éléments liés du lot original">
            <Text style={styles.sectionExplain}>
              Le lot original contient des éléments rattachés (étapes, analyses,
              conditionnements). Choisis ceux à reporter sur le rectificatif.
            </Text>

            {nbEtapes > 0 && (
              <Cocheable
                label={`Copier les ${nbEtapes} étape(s) post-récolte`}
                description="Tri, séchage, calibrage, fermentation..."
                checked={copierEtapes}
                onToggle={() => setCopierEtapes(!copierEtapes)}
              />
            )}

            {nbAnalyses > 0 && (
              <Cocheable
                label={`Copier les ${nbAnalyses} analyse(s) qualité`}
                description="Humidité, vanilline, aflatoxines..."
                checked={copierAnalyses}
                onToggle={() => setCopierAnalyses(!copierAnalyses)}
              />
            )}

            {nbConditionnements > 0 && (
              <Cocheable
                label={`Copier les ${nbConditionnements} conditionnement(s)`}
                description="Sacs, palettes, sachets, étiquetage..."
                checked={copierConditionnements}
                onToggle={() => setCopierConditionnements(!copierConditionnements)}
              />
            )}

            {nbBons > 0 && (
              <Cocheable
                label={`Copier les ${nbBons} bon(s) de collecte`}
                description="Achats fournisseurs (filière B)"
                checked={copierBons}
                onToggle={() => setCopierBons(!copierBons)}
              />
            )}

            {/* Marquer à re-vérifier */}
            <View style={styles.separateurFin} />
            <Cocheable
              label="Marquer les éléments copiés comme « à re-vérifier »"
              description="Ajoute une mention dans les notes pour signaler à l'équipe QA que ces éléments doivent être validés sur le rectificatif"
              checked={marquerAReVerifier}
              onToggle={() => setMarquerAReVerifier(!marquerAReVerifier)}
              variant="warning"
            />

            {/* Hint stratégique */}
            <View style={styles.hintBox}>
              <Text style={styles.hintTitre}>💡 Conseil expert audit</Text>
              <Text style={styles.hintTexte}>
                • Si tu rectifies <Text style={styles.hintFort}>uniquement la quantité</Text> (recompte) : copier
                tout, sans re-vérification{'\n'}
                • Si tu rectifies <Text style={styles.hintFort}>la culture ou les dates</Text> : ne pas copier les
                analyses (les seuils ne s'appliquent plus){'\n'}
                • Si tu rectifies <Text style={styles.hintFort}>le protocole post-récolte</Text> : ne pas copier les
                étapes (elles ne reflètent plus la réalité)
              </Text>
            </View>
          </Section>
        )}

        {/* Raison */}
        <Section titre="Raison de la rectification">
          <Champ label="Catégorie *" erreur={erreurs.raisonCode}>
            <Selecteur
              valeur={raisonInfo?.label}
              placeholder="Choisir une raison"
              onPress={() => setModalOuvert('raison')}
            />
            {raisonInfo?.description && (
              <Text style={styles.hint}>{raisonInfo.description}</Text>
            )}
          </Champ>

          <Champ label="Commentaire détaillé *" erreur={erreurs.raisonLibre}>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={raisonLibre}
              onChangeText={setRaisonLibre}
              placeholder="Décris précisément ce qui a été corrigé et pourquoi (min 10 caractères)"
              placeholderTextColor="#5a6a5a"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text style={styles.hint}>
              Sera intégré au bloc "RECTIFICATIF" dans les notes du nouveau lot.
            </Text>
          </Champ>

          <Champ label="Rectificateur *" erreur={erreurs.rectificateur}>
            <TextInput
              style={styles.input}
              value={rectificateur}
              onChangeText={setRectificateur}
              placeholder="Nom complet de la personne qui rectifie"
              placeholderTextColor="#5a6a5a"
              autoCapitalize="words"
            />
            <Text style={styles.hint}>
              Cette signature est horodatée et figée définitivement.
            </Text>
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
            style={[
              styles.btnPrincipal,
              (changements.length === 0 || enCours) && styles.btnDisabled,
            ]}
            onPress={rectifier}
            disabled={changements.length === 0 || enCours}
          >
            <Text style={styles.btnPrincipalTexte}>
              {enCours ? 'Rectification…' : '🔄 Rectifier le lot'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Modal */}
      <ModalSelection
        visible={modalOuvert !== null}
        onClose={() => setModalOuvert(null)}
        type={modalOuvert}
        onSelectRaison={(c) => { setRaisonCode(c); setModalOuvert(null); }}
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

function OrigLigne({ label, valeur }) {
  return (
    <View style={styles.origLigne}>
      <Text style={styles.origLigneLabel}>{label}</Text>
      <Text style={styles.origLigneValeur}>{valeur}</Text>
    </View>
  );
}

function Cocheable({ label, description, checked, onToggle, variant }) {
  return (
    <TouchableOpacity
      style={[
        styles.cocheable,
        checked && styles.cocheableChecked,
        variant === 'warning' && checked && styles.cocheableWarning,
      ]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={[
        styles.cocheableBox,
        checked && styles.cocheableBoxChecked,
        variant === 'warning' && checked && styles.cocheableBoxWarning,
      ]}>
        {checked && <Text style={styles.cocheableCheck}>✓</Text>}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cocheableLabel}>{label}</Text>
        {description && (
          <Text style={styles.cocheableDescription}>{description}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function ModalSelection({
  visible, onClose, type,
  onSelectRaison, onSelectProtocole,
}) {
  let titre = '';
  let items = [];
  let onSelect = () => {};

  if (type === 'raison') {
    titre = 'Raison de la rectification';
    items = RAISONS_RECTIFICATION.map((r) => ({
      id: r.code,
      label: r.label,
      sub: r.description,
    }));
    onSelect = onSelectRaison;
  } else if (type === 'protocole') {
    titre = 'Protocole post-récolte';
    items = PROTOCOLES.map((p) => ({ id: p.code, label: p.label }));
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
            {items.map((it) => (
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
            ))}
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
  jaune: '#d4c47e',
  bleuClair: '#7eaac8',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  scrollContent: { padding: 16, paddingBottom: 32 },

  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingTexte: { color: COLORS.texteSecond, fontSize: 14 },

  header: { marginBottom: 12 },
  btnRetour: { color: COLORS.vert, fontSize: 14, marginBottom: 8 },
  headerTitre: { color: COLORS.bleuClair, fontSize: 22, fontWeight: '700' },
  headerSousTitre: { color: COLORS.texteSecond, fontSize: 13, marginTop: 4 },

  // Encart pédagogique
  cardExplain: {
    backgroundColor: '#1f2c38',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.bleuClair,
  },
  cardExplainTitre: {
    color: COLORS.bleuClair,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardExplainTexte: {
    color: COLORS.texteSecond,
    fontSize: 11,
    lineHeight: 17,
  },

  // Lot original
  cardOriginal: {
    backgroundColor: COLORS.bgCard,
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.texteMute,
  },
  cardOriginalTitre: {
    color: COLORS.texteSecond,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardOriginalCode: {
    color: COLORS.ambreClair,
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  origLignes: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  origLigne: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  origLigneLabel: {
    color: COLORS.texteSecond,
    fontSize: 11,
    width: 110,
  },
  origLigneValeur: {
    flex: 1,
    color: COLORS.texteDoux,
    fontSize: 12,
  },

  // Section
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
  sectionExplain: {
    color: COLORS.texteSecond,
    fontSize: 11,
    fontStyle: 'italic',
    marginBottom: 12,
    lineHeight: 16,
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
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputAvecUnite: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  inputQte: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.texteDoux,
    fontSize: 14,
  },
  inputUnite: {
    color: COLORS.ambreClair,
    fontSize: 12,
    fontWeight: '700',
    paddingRight: 12,
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

  // ─── Cocheable (cases à cocher pour copie sélective) ───
  cocheable: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: COLORS.bgInput,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cocheableChecked: {
    borderColor: COLORS.vert,
    backgroundColor: '#1f2c1f',
  },
  cocheableWarning: {
    borderColor: COLORS.jaune,
    backgroundColor: '#2a2614',
  },
  cocheableBox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: COLORS.texteSecond,
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  cocheableBoxChecked: {
    backgroundColor: COLORS.vert,
    borderColor: COLORS.vert,
  },
  cocheableBoxWarning: {
    backgroundColor: COLORS.jaune,
    borderColor: COLORS.jaune,
  },
  cocheableCheck: {
    color: '#0d1a0d',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cocheableLabel: {
    color: COLORS.texteDoux,
    fontSize: 13,
    fontWeight: '600',
  },
  cocheableDescription: {
    color: COLORS.texteSecond,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },

  separateurFin: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },

  // Hint expert
  hintBox: {
    backgroundColor: '#1f2c38',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.bleuClair,
  },
  hintTitre: {
    color: COLORS.bleuClair,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  hintTexte: {
    color: COLORS.texteSecond,
    fontSize: 11,
    lineHeight: 16,
  },
  hintFort: {
    fontWeight: '700',
    color: COLORS.texteDoux,
  },

  // Récap changements
  cardChangements: {
    backgroundColor: '#2a2014',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.ambre,
  },
  cardChangementsTitre: {
    color: COLORS.ambreClair,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  changementLigne: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  changementChamp: {
    color: COLORS.texteDoux,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  changementValeurs: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  changementAvant: {
    color: COLORS.rouge,
    fontSize: 11,
    fontStyle: 'italic',
    flex: 1,
    minWidth: 80,
  },
  changementFleche: {
    color: COLORS.texteSecond,
    fontSize: 14,
    paddingHorizontal: 8,
  },
  changementApres: {
    color: COLORS.vertClair,
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    minWidth: 80,
    textAlign: 'right',
  },

  cardAucunChangement: {
    backgroundColor: '#2a2614',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.jaune,
  },
  cardAucunChangementTexte: {
    color: COLORS.jaune,
    fontSize: 12,
    lineHeight: 16,
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
    backgroundColor: COLORS.bleuClair,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
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
});