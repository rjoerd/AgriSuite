// screens/SaisieRecolteScreen.js
import React, { useState, useEffect } from 'react';
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

    insertRecolte({
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

    setSauvegarde(true);

    // Reset pour permettre une nouvelle saisie immédiate
    setTimeout(() => {
      setForm({
        date_recolte: new Date().toISOString().split('T')[0],
        quantite_kg: '',
        qualite: 'bonne',
        destination: 'autonomie',
        prix_vente_ar: '',
        notes: '',
      });
      if (cultures.length > 1) setCultureSelectee(null);
      setSauvegarde(false);
    }, 1500);
  };

  // Écran de confirmation flash
  if (sauvegarde) {
    return (
      <View style={[styles.conteneur, styles.confirmation, { paddingTop: insets.top }]}>
        <Text style={styles.confirmationEmoji}>✅</Text>
        <Text style={styles.confirmationTexte}>Récolte enregistrée !</Text>
        <Text style={styles.confirmationDetail}>
          {parseFloat(form.quantite_kg || 0).toFixed(1)} kg · {cultureSelectee?.nom_fr}
        </Text>
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
            cultures.map((culture) => (
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
                  <Text style={styles.cultureNom}>{culture.nom_fr}</Text>
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
            ))
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
  cultureNom: { color: COULEURS.texte, fontSize: 15, fontWeight: '600' },
  cultureDetail: { color: COULEURS.texteFaible, fontSize: 12, marginTop: 2 },
  checkmark: { color: COULEURS.vert, fontSize: 20, paddingRight: 14, fontWeight: 'bold' },
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
  },
  confirmationEmoji: { fontSize: 64, marginBottom: 16 },
  confirmationTexte: { color: COULEURS.vert, fontSize: 24, fontWeight: 'bold' },
  confirmationDetail: { color: COULEURS.texteFaible, fontSize: 16, marginTop: 8 },
});