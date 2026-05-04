// screens/SaisieRecolteScreen.js
// Phase 2 + Patch Phase 3 Session 4 — bouton "Créer lot export" sur cultures export (gingembre)
import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, ScrollView,
  TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getCulturesEnCoursBySite,
  insertRecolte,
} from '../database/maraicher';

const COULEURS = {
  fond: '#1a2e1a', carte: '#243524', bordure: '#2d4a2d',
  vert: '#7ec87e', vertFonce: '#4a9a4a',
  texte: '#e8f5e8', texteFaible: '#8fbc8f',
  orange: '#FFA726', rouge: '#EF5350', champ: '#1f301f',
  ambre: '#d4a04a', ambreClair: '#e8be78',  // accent export (Phase 3)
};

const OPTIONS_QUALITE = [
  { valeur: 'excellente', label: '⭐ Excellente' },
  { valeur: 'bonne', label: '👍 Bonne' },
  { valeur: 'moyenne', label: '😐 Moyenne' },
  { valeur: 'mauvaise', label: '👎 Mauvaise' },
];

const OPTIONS_DESTINATION = [
  { valeur: 'autonomie', label: '🏠 Maison/Ouvriers' },
  { valeur: 'ecole', label: '🏫 École' },
  { valeur: 'vente_locale', label: '🛒 Vente locale' },
  { valeur: 'export', label: '📦 Export' },
  { valeur: 'perte', label: '❌ Perte' },
];

// ─────────────────────────────────────────────
// Détection culture export (filière A)
// v0.9 : gingembre uniquement. Étendre selon cultures pérennes Site E.
// ─────────────────────────────────────────────
function estCultureExportFiliereA(culture) {
  if (!culture) return false;
  const nom = (culture.nom_fr || '').toLowerCase();
  return nom.includes('gingembre');
}

function SelecteurBoutons({ label, options, valeur, onChange }) {
  return (
    <View style={styles.champ}>
      <Text style={styles.champLabel}>{label}</Text>
      <View style={styles.optionsRangee}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.valeur}
            style={[styles.optionBtn, valeur === opt.valeur && styles.optionBtnActif]}
            onPress={() => onChange(opt.valeur)}
          >
            <Text style={[styles.optionTexte, valeur === opt.valeur && styles.optionTexteActif]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function SaisieRecolteScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { siteId, siteCode } = route.params;

  const [cultures, setCultures] = useState([]);
  const [cultureSelectee, setCultureSelectee] = useState(null);
  const [form, setForm] = useState({
    date_recolte: new Date().toISOString().split('T')[0],
    quantite_kg: '',
    qualite: 'bonne',
    destination: 'autonomie',
    prix_vente_ar: '',
    notes: '',
  });
  const [sauvegarde, setSauvegarde] = useState(false);

  // ─── Phase 3 Session 4 : suivi ID récolte créée + culture au moment du save ───
  // On garde une "snapshot" car le formulaire est reseté avant que l'utilisateur
  // ne tape sur "Créer lot export" — il faut retenir ce qui vient d'être saisi.
  const [recolteCreee, setRecolteCreee] = useState(null);
  // recolteCreee : { id, quantite_kg, culture, estExport }

  useEffect(() => {
    const data = getCulturesEnCoursBySite(siteId);
    setCultures(data);
    if (data.length === 1) setCultureSelectee(data[0]);
  }, [siteId]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const valider = () => {
    if (!cultureSelectee) {
      Alert.alert('Culture requise', 'Sélectionnez la culture récoltée.');
      return;
    }
    const qte = parseFloat(form.quantite_kg);
    if (!form.quantite_kg || isNaN(qte) || qte <= 0) {
      Alert.alert('Quantité invalide', 'Entrez la quantité récoltée en kg.');
      return;
    }

    // ─── Récupération de l'ID retourné par insertRecolte (Phase 3) ───
    const recolteId = insertRecolte({
      culture_en_cours_id: cultureSelectee.id,
      planche_id: cultureSelectee.planche_id,
      site_id: siteId,
      date_recolte: form.date_recolte,
      quantite_kg: qte,
      qualite: form.qualite,
      destination: form.destination,
      prix_vente_ar: form.destination === 'vente_locale' && form.prix_vente_ar
        ? parseFloat(form.prix_vente_ar)
        : 0,
      notes: form.notes.trim() || null,
      saisi_par: 'operateur',
    });

    // Snapshot pour le bouton "Créer lot export"
    const estExport = estCultureExportFiliereA(cultureSelectee);
    setRecolteCreee({
      id: recolteId,
      quantite_kg: qte,
      culture: cultureSelectee,
      estExport,
    });

    setSauvegarde(true);

    // ─── Auto-reset uniquement si culture NON export ───
    // Pour les cultures export, on laisse l'utilisateur décider :
    // soit créer un lot export, soit continuer la saisie (bouton manuel)
    if (!estExport) {
      setTimeout(() => {
        reinitialiserPourNouvelleSaisie();
      }, 1500);
    }
  };

  const reinitialiserPourNouvelleSaisie = () => {
    setForm({
      date_recolte: new Date().toISOString().split('T')[0],
      quantite_kg: '',
      qualite: 'bonne',
      destination: 'autonomie',
      prix_vente_ar: '',
      notes: '',
    });
    if (cultures.length > 1) setCultureSelectee(null);
    setRecolteCreee(null);
    setSauvegarde(false);
  };

  // ─── Phase 3 Session 4 : navigation vers création lot export ───
  const allerVersLotExport = () => {
    if (!recolteCreee) return;
    // On navigue d'abord, puis on prépare l'écran à reprendre une saisie
    // s'il y a un retour vers cet écran (replace empêcherait le retour).
    navigation.navigate('LotProductionForm', {
      recolteId: recolteCreee.id,
    });
    // Reset différé pour que l'écran soit propre si l'utilisateur revient
    setTimeout(() => reinitialiserPourNouvelleSaisie(), 300);
  };

  // ─── Écran de confirmation flash ───
  if (sauvegarde) {
    const cultureSauvegardee = recolteCreee?.culture;
    const qteSauvegardee = recolteCreee?.quantite_kg ?? parseFloat(form.quantite_kg || 0);
    const estExport = recolteCreee?.estExport ?? false;

    return (
      <View style={[styles.conteneur, styles.confirmation, { paddingTop: insets.top }]}>
        <Text style={styles.confirmationEmoji}>✅</Text>
        <Text style={styles.confirmationTexte}>Récolte enregistrée !</Text>
        <Text style={styles.confirmationDetail}>
          {qteSauvegardee.toFixed(1)} kg · {cultureSauvegardee?.nom_fr}
        </Text>

        {/* Bandeau export — uniquement si culture filière A */}
        {estExport && (
          <View style={styles.exportBandeau}>
            <Text style={styles.exportBandeauTitre}>
              🌍 Culture export détectée
            </Text>
            <Text style={styles.exportBandeauHint}>
              Cette récolte de {cultureSauvegardee?.nom_fr?.toLowerCase()} peut alimenter
              un lot export tracé. Pré-remplissage automatique de la parcelle, culture,
              quantité et date.
            </Text>

            <TouchableOpacity
              style={styles.exportBoutonPrincipal}
              onPress={allerVersLotExport}
              activeOpacity={0.8}
            >
              <Text style={styles.exportBoutonPrincipalTexte}>
                📤 Créer lot export depuis cette récolte
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.exportBoutonSecondaire}
              onPress={reinitialiserPourNouvelleSaisie}
              activeOpacity={0.7}
            >
              <Text style={styles.exportBoutonSecondaireTexte}>
                Continuer la saisie de récoltes
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.conteneur, { paddingTop: insets.top }]}>
      {/* En-tête */}
      <View style={styles.entete}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.boutonRetour}>
          <Text style={styles.texteRetour}>‹ Retour</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.titre}>🧺 Saisie récolte</Text>
          <Text style={styles.sousTitre}>{siteCode}</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* Sélection culture */}
        <View style={styles.section}>
          <Text style={styles.sectionTitre}>Quelle culture avez-vous récoltée ?</Text>

          {cultures.length === 0 ? (
            <View style={styles.vide}>
              <Text style={styles.videTexte}>Aucune culture en cours sur ce site</Text>
              <Text style={styles.videInfo}>
                Démarrez d'abord une culture depuis la liste des planches.
              </Text>
            </View>
          ) : (
            cultures.map((culture) => {
              const exportable = estCultureExportFiliereA(culture);
              return (
                <TouchableOpacity
                  key={culture.id}
                  style={[
                    styles.carteCultureChoix,
                    cultureSelectee?.id === culture.id && styles.carteCultureChoisie,
                  ]}
                  onPress={() => setCultureSelectee(culture)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.bandeCouleur,
                    { backgroundColor: culture.couleur_badge || COULEURS.vert }
                  ]} />
                  <View style={{ flex: 1, padding: 12 }}>
                    <View style={styles.cultureNomRangee}>
                      <Text style={styles.cultureNom}>{culture.nom_fr}</Text>
                      {exportable && (
                        <View style={styles.exportPastille}>
                          <Text style={styles.exportPastilleTexte}>EXPORT</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.cultureDetail}>
                      📍 {culture.planche_nom}
                      {culture.date_recolte_prevue
                        ? ` · Récolte prévue : ${culture.date_recolte_prevue}`
                        : ''}
                    </Text>
                  </View>
                  {cultureSelectee?.id === culture.id && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Formulaire récolte */}
        {cultureSelectee && (
          <View style={styles.section}>
            <Text style={styles.sectionTitre}>Détails de la récolte</Text>

            {/* Date */}
            <View style={styles.champ}>
              <Text style={styles.champLabel}>Date de récolte</Text>
              <TextInput
                style={styles.input}
                value={form.date_recolte}
                onChangeText={(v) => set('date_recolte', v)}
                placeholder="AAAA-MM-JJ"
                placeholderTextColor={COULEURS.texteFaible}
              />
            </View>

            {/* Quantité — champ principal, mis en avant */}
            <View style={styles.champ}>
              <Text style={styles.champLabel}>Quantité récoltée *</Text>
              <View style={styles.inputQuantiteConteneur}>
                <TextInput
                  style={styles.inputQuantite}
                  value={form.quantite_kg}
                  onChangeText={(v) => set('quantite_kg', v)}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={COULEURS.texteFaible}
                  autoFocus={true}
                />
                <Text style={styles.inputUnite}>kg</Text>
              </View>
            </View>

            {/* Qualité */}
            <SelecteurBoutons
              label="Qualité"
              options={OPTIONS_QUALITE}
              valeur={form.qualite}
              onChange={(v) => set('qualite', v)}
            />

            {/* Destination */}
            <SelecteurBoutons
              label="Destination"
              options={OPTIONS_DESTINATION}
              valeur={form.destination}
              onChange={(v) => set('destination', v)}
            />

            {/* Prix vente — affiché seulement si vente locale */}
            {form.destination === 'vente_locale' && (
              <View style={styles.champ}>
                <Text style={styles.champLabel}>Prix de vente (Ar) — optionnel</Text>
                <TextInput
                  style={styles.input}
                  value={form.prix_vente_ar}
                  onChangeText={(v) => set('prix_vente_ar', v)}
                  keyboardType="decimal-pad"
                  placeholder="Ex: 5000"
                  placeholderTextColor={COULEURS.texteFaible}
                />
              </View>
            )}

            {/* Notes */}
            <View style={styles.champ}>
              <Text style={styles.champLabel}>Observations (optionnel)</Text>
              <TextInput
                style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                value={form.notes}
                onChangeText={(v) => set('notes', v)}
                placeholder="Anomalies, ravageurs observés, conditions..."
                placeholderTextColor={COULEURS.texteFaible}
                multiline
              />
            </View>

            {/* Bouton enregistrer */}
            <TouchableOpacity
              style={styles.boutonEnregistrer}
              onPress={valider}
              activeOpacity={0.8}
            >
              <Text style={styles.boutonEnregistrerTexte}>
                Enregistrer la récolte
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: { flex: 1, backgroundColor: COULEURS.fond },
  entete: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COULEURS.bordure,
  },
  boutonRetour: { paddingRight: 12 },
  texteRetour: { color: COULEURS.vert, fontSize: 16 },
  titre: { color: COULEURS.texte, fontSize: 17, fontWeight: 'bold' },
  sousTitre: { color: COULEURS.texteFaible, fontSize: 12 },
  scroll: { flex: 1 },
  section: {
    margin: 12, marginBottom: 0,
    backgroundColor: COULEURS.carte,
    borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: COULEURS.bordure,
  },
  sectionTitre: {
    color: COULEURS.vert, fontSize: 13, fontWeight: '700',
    marginBottom: 12, textTransform: 'uppercase',
  },
  carteCultureChoix: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COULEURS.fond, borderRadius: 10,
    marginBottom: 6, overflow: 'hidden',
    borderWidth: 1, borderColor: COULEURS.bordure,
  },
  carteCultureChoisie: { borderColor: COULEURS.vert, borderWidth: 2 },
  bandeCouleur: { width: 4, alignSelf: 'stretch' },
  cultureNomRangee: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  cultureNom: { color: COULEURS.texte, fontSize: 15, fontWeight: '600' },
  cultureDetail: { color: COULEURS.texteFaible, fontSize: 12, marginTop: 2 },
  checkmark: { color: COULEURS.vert, fontSize: 20, paddingRight: 14, fontWeight: 'bold' },

  // Pastille EXPORT sur la carte culture (Phase 3)
  exportPastille: {
    backgroundColor: COULEURS.ambre,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  exportPastilleTexte: {
    color: '#0d1a0d',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  champ: { marginBottom: 18 },
  champLabel: { color: COULEURS.vert, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: {
    backgroundColor: COULEURS.champ,
    borderWidth: 1, borderColor: COULEURS.bordure,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    color: COULEURS.texte, fontSize: 15,
  },
  inputQuantiteConteneur: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COULEURS.champ,
    borderWidth: 2, borderColor: COULEURS.vert,
    borderRadius: 10, overflow: 'hidden',
  },
  inputQuantite: {
    flex: 1, paddingHorizontal: 16, paddingVertical: 16,
    color: COULEURS.texte, fontSize: 32, fontWeight: 'bold',
  },
  inputUnite: {
    color: COULEURS.vert, fontSize: 20,
    fontWeight: '700', paddingRight: 16,
  },
  optionsRangee: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionBtn: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1, borderColor: COULEURS.bordure,
    backgroundColor: COULEURS.champ,
  },
  optionBtnActif: { backgroundColor: COULEURS.vertFonce, borderColor: COULEURS.vert },
  optionTexte: { color: COULEURS.texteFaible, fontSize: 13 },
  optionTexteActif: { color: COULEURS.texte, fontWeight: '600' },
  boutonEnregistrer: {
    backgroundColor: COULEURS.vertFonce,
    borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
  },
  boutonEnregistrerTexte: { color: COULEURS.texte, fontSize: 17, fontWeight: 'bold' },
  vide: { alignItems: 'center', padding: 20 },
  videTexte: { color: COULEURS.texteFaible, fontSize: 15, fontWeight: '600' },
  videInfo: { color: COULEURS.texteFaible, fontSize: 12, textAlign: 'center', marginTop: 6 },
  confirmation: {
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 20,
  },
  confirmationEmoji: { fontSize: 64, marginBottom: 16 },
  confirmationTexte: { color: COULEURS.vert, fontSize: 24, fontWeight: 'bold' },
  confirmationDetail: { color: COULEURS.texteFaible, fontSize: 16, marginTop: 8 },

  // ─── Bandeau export sur écran de confirmation (Phase 3 Session 4) ───
  exportBandeau: {
    marginTop: 32,
    width: '100%',
    backgroundColor: '#2a2014',
    borderRadius: 14,
    padding: 18,
    borderLeftWidth: 4,
    borderLeftColor: COULEURS.ambre,
  },
  exportBandeauTitre: {
    color: COULEURS.ambreClair,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  exportBandeauHint: {
    color: COULEURS.texteFaible,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  exportBoutonPrincipal: {
    backgroundColor: COULEURS.ambre,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  exportBoutonPrincipalTexte: {
    color: '#0d1a0d',
    fontSize: 14,
    fontWeight: '700',
  },
  exportBoutonSecondaire: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  exportBoutonSecondaireTexte: {
    color: COULEURS.texteFaible,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});