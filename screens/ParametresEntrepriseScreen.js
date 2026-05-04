// ============================================================
// AgriSuite Madagascar — Phase 3 / Session 6 livraison 2
// screens/ParametresEntrepriseScreen.js
//
// Écran de configuration des paramètres entreprise utilisés pour
// personnaliser l'en-tête des documents PDF.
//
// Champs organisés en 4 sections :
//   1. Identité — nom commercial *, raison sociale, slogan
//   2. Adresse — ligne 1, ligne 2, CP, ville, pays
//   3. Contact — email, téléphone, site web
//   4. Identifiants fiscaux malgaches — NIF, statistique, RCS
//   5. Personnalisation PDF — couleur accent, langue par défaut, mention pied de page
// ============================================================

import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import {
  getParametresEntreprise,
  upsertParametresEntreprise,
} from '../database/parametresEntreprise';

// ============================================================
// CONSTANTES
// ============================================================

const COULEURS_ACCENT_PROPOSEES = [
  { code: '#1a5d2e', label: 'Vert AgriSuite' },
  { code: '#2e6a8e', label: 'Bleu marine' },
  { code: '#8e3a2e', label: 'Rouge brique' },
  { code: '#886612', label: 'Ambre' },
  { code: '#3a3a3a', label: 'Noir / Gris' },
];

const LANGUES = [
  { code: 'fr', label: '🇫🇷 Français' },
  { code: 'en', label: '🇬🇧 English' },
];

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function ParametresEntrepriseScreen({ navigation }) {
  // Tous les champs
  const [nomCommercial, setNomCommercial] = useState('');
  const [raisonSociale, setRaisonSociale] = useState('');
  const [slogan, setSlogan] = useState('');
  const [adresseLigne1, setAdresseLigne1] = useState('');
  const [adresseLigne2, setAdresseLigne2] = useState('');
  const [codePostal, setCodePostal] = useState('');
  const [ville, setVille] = useState('');
  const [pays, setPays] = useState('Madagascar');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [siteWeb, setSiteWeb] = useState('');
  const [nif, setNif] = useState('');
  const [statFiscale, setStatFiscale] = useState('');
  const [numeroRcs, setNumeroRcs] = useState('');
  const [couleurAccent, setCouleurAccent] = useState('#1a5d2e');
  const [langueDefaut, setLangueDefaut] = useState('fr');
  const [mentionPiedPage, setMentionPiedPage] = useState('');

  // État UI
  const [enCours, setEnCours] = useState(false);
  const [erreurs, setErreurs] = useState({});

  // ============================================================
  // CHARGEMENT
  // ============================================================

  useEffect(() => {
    try {
      const p = getParametresEntreprise();
      if (p) {
        setNomCommercial(p.nom_commercial || '');
        setRaisonSociale(p.raison_sociale || '');
        setSlogan(p.slogan || '');
        setAdresseLigne1(p.adresse_ligne1 || '');
        setAdresseLigne2(p.adresse_ligne2 || '');
        setCodePostal(p.code_postal || '');
        setVille(p.ville || '');
        setPays(p.pays || 'Madagascar');
        setEmail(p.email || '');
        setTelephone(p.telephone || '');
        setSiteWeb(p.site_web || '');
        setNif(p.nif || '');
        setStatFiscale(p.stat_fiscale || '');
        setNumeroRcs(p.numero_rcs || '');
        setCouleurAccent(p.couleur_accent || '#1a5d2e');
        setLangueDefaut(p.langue_pdf_defaut || 'fr');
        setMentionPiedPage(p.mention_pied_page || '');
      }
    } catch (err) {
      console.error('[ParametresEntreprise] Erreur chargement :', err);
    }
  }, []);

  // ============================================================
  // VALIDATION
  // ============================================================

  const valider = () => {
    const errs = {};
    if (!nomCommercial.trim()) {
      errs.nomCommercial = 'Nom commercial requis';
    }
    if (email && !email.includes('@')) {
      errs.email = 'Email invalide';
    }
    setErreurs(errs);
    return Object.keys(errs).length === 0;
  };

  // ============================================================
  // SAUVEGARDE
  // ============================================================

  const sauvegarder = () => {
    if (!valider()) {
      Alert.alert(
        'Champs manquants',
        'Vérifie les champs marqués en rouge avant de continuer.'
      );
      return;
    }

    setEnCours(true);

    try {
      upsertParametresEntreprise({
        nom_commercial: nomCommercial.trim(),
        raison_sociale: raisonSociale.trim() || null,
        slogan: slogan.trim() || null,
        adresse_ligne1: adresseLigne1.trim() || null,
        adresse_ligne2: adresseLigne2.trim() || null,
        code_postal: codePostal.trim() || null,
        ville: ville.trim() || null,
        pays: pays.trim() || 'Madagascar',
        email: email.trim() || null,
        telephone: telephone.trim() || null,
        site_web: siteWeb.trim() || null,
        nif: nif.trim() || null,
        stat_fiscale: statFiscale.trim() || null,
        numero_rcs: numeroRcs.trim() || null,
        couleur_accent: couleurAccent,
        langue_pdf_defaut: langueDefaut,
        mention_pied_page: mentionPiedPage.trim() || null,
      });

      setEnCours(false);

      Alert.alert(
        '✅ Paramètres enregistrés',
        `Les paramètres de "${nomCommercial.trim()}" sont sauvegardés.\n\n` +
        `Ils seront utilisés dans tous les documents PDF générés.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      setEnCours(false);
      console.error('[ParametresEntreprise] Erreur sauvegarde :', err);
      Alert.alert(
        'Erreur',
        err.message || 'Impossible de sauvegarder les paramètres.'
      );
    }
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
            <Text style={styles.btnRetour}>‹ Retour</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitre}>⚙️ Paramètres entreprise</Text>
          <Text style={styles.headerSousTitre}>
            Personnalise les en-têtes des documents PDF
          </Text>
        </View>

        {/* Aperçu rapide */}
        {nomCommercial.trim() && (
          <View style={[styles.apercu, { borderLeftColor: couleurAccent }]}>
            <Text style={[styles.apercuNom, { color: couleurAccent }]}>
              {nomCommercial.trim()}
            </Text>
            {slogan.trim() && (
              <Text style={styles.apercuSlogan}>{slogan.trim()}</Text>
            )}
            {(adresseLigne1 || ville) && (
              <Text style={styles.apercuAdresse}>
                {[adresseLigne1, [codePostal, ville].filter(Boolean).join(' ')]
                  .filter(Boolean).join(' · ')}
              </Text>
            )}
            {(email || telephone) && (
              <Text style={styles.apercuContact}>
                {[email, telephone].filter(Boolean).join(' · ')}
              </Text>
            )}
            <Text style={styles.apercuLabel}>Aperçu en-tête PDF</Text>
          </View>
        )}

        {/* Section 1 — Identité */}
        <Section titre="1. Identité">
          <Champ label="Nom commercial *" erreur={erreurs.nomCommercial}>
            <TextInput
              style={styles.input}
              value={nomCommercial}
              onChangeText={setNomCommercial}
              placeholder="Ex: AgroExport Madagascar"
              placeholderTextColor="#5a6a5a"
              autoCapitalize="words"
            />
            <Text style={styles.hint}>
              Affiché en grand dans l'en-tête du PDF.
            </Text>
          </Champ>

          <Champ label="Raison sociale (légal)">
            <TextInput
              style={styles.input}
              value={raisonSociale}
              onChangeText={setRaisonSociale}
              placeholder="Ex: AgroExport Madagascar SARL"
              placeholderTextColor="#5a6a5a"
              autoCapitalize="words"
            />
          </Champ>

          <Champ label="Slogan / accroche">
            <TextInput
              style={styles.input}
              value={slogan}
              onChangeText={setSlogan}
              placeholder="Ex: Vanille bourbon premium - Origin Sambava"
              placeholderTextColor="#5a6a5a"
            />
            <Text style={styles.hint}>
              Petite phrase sous le nom de l'entreprise (facultatif).
            </Text>
          </Champ>
        </Section>

        {/* Section 2 — Adresse */}
        <Section titre="2. Adresse">
          <Champ label="Adresse — ligne 1">
            <TextInput
              style={styles.input}
              value={adresseLigne1}
              onChangeText={setAdresseLigne1}
              placeholder="Ex: Lot II J 145"
              placeholderTextColor="#5a6a5a"
            />
          </Champ>

          <Champ label="Adresse — ligne 2 (optionnel)">
            <TextInput
              style={styles.input}
              value={adresseLigne2}
              onChangeText={setAdresseLigne2}
              placeholder="Ex: Ankadifotsy"
              placeholderTextColor="#5a6a5a"
            />
          </Champ>

          <View style={styles.row2}>
            <Champ label="Code postal" style={{ flex: 1 }}>
              <TextInput
                style={styles.input}
                value={codePostal}
                onChangeText={setCodePostal}
                placeholder="101"
                placeholderTextColor="#5a6a5a"
                keyboardType="number-pad"
              />
            </Champ>
            <View style={{ width: 10 }} />
            <Champ label="Ville" style={{ flex: 2 }}>
              <TextInput
                style={styles.input}
                value={ville}
                onChangeText={setVille}
                placeholder="Antananarivo"
                placeholderTextColor="#5a6a5a"
                autoCapitalize="words"
              />
            </Champ>
          </View>

          <Champ label="Pays">
            <TextInput
              style={styles.input}
              value={pays}
              onChangeText={setPays}
              placeholder="Madagascar"
              placeholderTextColor="#5a6a5a"
              autoCapitalize="words"
            />
          </Champ>
        </Section>

        {/* Section 3 — Contact */}
        <Section titre="3. Contact">
          <Champ label="Email" erreur={erreurs.email}>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="contact@agroexport.mg"
              placeholderTextColor="#5a6a5a"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </Champ>

          <Champ label="Téléphone">
            <TextInput
              style={styles.input}
              value={telephone}
              onChangeText={setTelephone}
              placeholder="+261 34 12 345 67"
              placeholderTextColor="#5a6a5a"
              keyboardType="phone-pad"
            />
          </Champ>

          <Champ label="Site web (optionnel)">
            <TextInput
              style={styles.input}
              value={siteWeb}
              onChangeText={setSiteWeb}
              placeholder="https://www.agroexport.mg"
              placeholderTextColor="#5a6a5a"
              keyboardType="url"
              autoCapitalize="none"
            />
          </Champ>
        </Section>

        {/* Section 4 — Identifiants fiscaux malgaches */}
        <Section titre="4. Identifiants fiscaux (Madagascar)">
          <Text style={styles.sectionExplain}>
            Identifiants requis pour exporter depuis Madagascar.
            Apparaîtront sur les documents officiels.
          </Text>

          <Champ label="NIF (Numéro d'Identification Fiscale)">
            <TextInput
              style={styles.input}
              value={nif}
              onChangeText={setNif}
              placeholder="Ex: 1234567890"
              placeholderTextColor="#5a6a5a"
              keyboardType="number-pad"
            />
          </Champ>

          <Champ label="Statistique fiscale">
            <TextInput
              style={styles.input}
              value={statFiscale}
              onChangeText={setStatFiscale}
              placeholder="Ex: 12345 11 2026 0 12345"
              placeholderTextColor="#5a6a5a"
            />
          </Champ>

          <Champ label="Numéro RCS">
            <TextInput
              style={styles.input}
              value={numeroRcs}
              onChangeText={setNumeroRcs}
              placeholder="Ex: 2026 B 12345"
              placeholderTextColor="#5a6a5a"
            />
          </Champ>
        </Section>

        {/* Section 5 — Personnalisation PDF */}
        <Section titre="5. Personnalisation PDF">
          <Champ label="Couleur d'accent">
            <View style={styles.couleursRow}>
              {COULEURS_ACCENT_PROPOSEES.map((c) => (
                <TouchableOpacity
                  key={c.code}
                  style={[
                    styles.couleurChoix,
                    { backgroundColor: c.code },
                    couleurAccent === c.code && styles.couleurChoixActif,
                  ]}
                  onPress={() => setCouleurAccent(c.code)}
                >
                  {couleurAccent === c.code && (
                    <Text style={styles.couleurCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.hint}>
              {COULEURS_ACCENT_PROPOSEES.find((c) => c.code === couleurAccent)?.label}
            </Text>
          </Champ>

          <Champ label="Langue PDF par défaut">
            <View style={styles.languesRow}>
              {LANGUES.map((l) => (
                <TouchableOpacity
                  key={l.code}
                  style={[
                    styles.langueChoix,
                    langueDefaut === l.code && styles.langueChoixActif,
                  ]}
                  onPress={() => setLangueDefaut(l.code)}
                >
                  <Text style={[
                    styles.langueChoixTexte,
                    langueDefaut === l.code && styles.langueChoixTexteActif,
                  ]}>
                    {l.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.hint}>
              Tu peux toujours changer la langue à la génération du PDF.
            </Text>
          </Champ>

          <Champ label="Mention pied de page (optionnel)">
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={mentionPiedPage}
              onChangeText={setMentionPiedPage}
              placeholder="Ex: Document confidentiel · Reproduction interdite"
              placeholderTextColor="#5a6a5a"
              multiline
              numberOfLines={2}
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
              {enCours ? 'Enregistrement…' : '💾 Enregistrer'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
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

  header: { marginBottom: 12 },
  btnRetour: { color: COLORS.vert, fontSize: 14, marginBottom: 8 },
  headerTitre: { color: COLORS.ambre, fontSize: 22, fontWeight: '700' },
  headerSousTitre: { color: COLORS.texteSecond, fontSize: 13, marginTop: 4 },

  // Aperçu en-tête
  apercu: {
    backgroundColor: '#fafafa',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  apercuNom: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  apercuSlogan: {
    color: '#666',
    fontSize: 11,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  apercuAdresse: {
    color: '#444',
    fontSize: 11,
  },
  apercuContact: {
    color: '#444',
    fontSize: 11,
  },
  apercuLabel: {
    color: '#999',
    fontSize: 9,
    fontStyle: 'italic',
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    minHeight: 60,
    textAlignVertical: 'top',
  },

  hint: {
    color: COLORS.texteMute,
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },

  row2: {
    flexDirection: 'row',
  },

  // Couleur accent
  couleursRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  couleurChoix: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  couleurChoixActif: {
    borderColor: COLORS.texteDoux,
    transform: [{ scale: 1.1 }],
  },
  couleurCheck: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Langue
  languesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  langueChoix: {
    flex: 1,
    backgroundColor: COLORS.bgInput,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  langueChoixActif: {
    borderColor: COLORS.ambre,
    backgroundColor: '#2a2014',
  },
  langueChoixTexte: {
    color: COLORS.texteSecond,
    fontSize: 14,
    fontWeight: '600',
  },
  langueChoixTexteActif: {
    color: COLORS.ambreClair,
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
});