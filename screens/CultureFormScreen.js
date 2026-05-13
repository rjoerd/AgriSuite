// screens/CultureFormScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView,
  TouchableOpacity, StyleSheet, Alert, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SQLite from 'expo-sqlite';
import { insertCultureEnCours } from '../database/maraicher';

const db = SQLite.openDatabaseSync('certifpilot.db');

const COULEURS = {
  fond: '#1a2e1a', carte: '#243524', bordure: '#2d4a2d',
  vert: '#7ec87e', vertFonce: '#4a9a4a',
  texte: '#e8f5e8', texteFaible: '#8fbc8f',
  orange: '#FFA726', rouge: '#EF5350', champ: '#1f301f',
};

const DESTINATIONS = [
  { valeur: 'autonomie', label: '🏠 Consommation maison/ouvriers' },
  { valeur: 'ecole', label: '🏫 Repas scolaires' },
  { valeur: 'vente_locale', label: '🛒 Vente locale' },
  { valeur: 'export', label: '📦 Export' },
];

const STADES_INITIAUX = [
  { valeur: 'semis', label: '🌱 Semis' },
  { valeur: 'repiquage', label: '🌿 Repiquage (déjà en pépinière)' },
  { valeur: 'croissance', label: '🌾 Croissance (déjà planté)' },
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

// Carte culture dans la liste de sélection
function CarteCultureChoix({ culture, selectionne, onPress }) {
  // Warning eau si culture exige eau et planche niveau inconnu/aucune
  const needsEau = culture.condition_eau === 'suffisant';
  return (
    <TouchableOpacity
      style={[styles.carteCultureChoix, selectionne && styles.carteCultureChoisie]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.bandeCouleurCulture, { backgroundColor: culture.couleur_badge || COULEURS.vert }]} />
      <View style={{ flex: 1, padding: 12 }}>
        <Text style={styles.cultureChoixNom}>{culture.nom_fr}</Text>
        <Text style={styles.cultureChoixDetail}>
          {culture.cycle_jours ? `${culture.cycle_jours}j` : '—'}
          {' · '}Sécheresse : {culture.tolerance_secheresse}
          {needsEau ? ' · ⚠️ Eau requise' : ''}
        </Text>
        {culture.rendement_ref_kg_m2 && (
          <Text style={styles.cultureChoixRendement}>
            ~{culture.rendement_ref_kg_m2} kg/m² attendus
          </Text>
        )}
      </View>
      {selectionne && <Text style={styles.checkmark}>✓</Text>}
    </TouchableOpacity>
  );
}

export default function CultureFormScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { siteId, siteCode, plancheId, plancheNom, niveauEauPlanche } = route.params;

  const [cultures, setCultures] = useState([]);
  const [filtreRecherche, setFiltreRecherche] = useState('');
  const [cultureSelectee, setCultureSelectee] = useState(null);
  const [form, setForm] = useState({
    date_semis: new Date().toISOString().split('T')[0],
    stade_actuel: 'semis',
    destination: 'autonomie',
    rendement_prevu_kg: '',
    notes: '',
  });

  useEffect(() => {
    // Charger les cultures maraîchères actives depuis le CropEngine.
    // Note : la table `cultures` utilise `actif` (sans 'e') — colonne définie
    // dans cropEngine.js. Les colonnes `categorie` et `priorite_ecole` sont
    // ajoutées en migration ALTER TABLE par seedMaraicher() (Phase 2).
    try {
      const data = db.getAllSync(
        `SELECT * FROM cultures
         WHERE categorie = 'maraichage' AND actif = 1
         ORDER BY priorite_ecole ASC, nom_fr ASC`
      );
      setCultures(data);
    } catch (err) {
      console.error('[CultureForm] Erreur chargement cultures :', err);
      // Fallback : si une colonne de tri (priorite_ecole) manque, on retente
      // sans le tri, juste pour ne pas bloquer l'écran complètement.
      try {
        const data = db.getAllSync(
          `SELECT * FROM cultures
           WHERE categorie = 'maraichage' AND actif = 1
           ORDER BY nom_fr ASC`
        );
        setCultures(data);
      } catch (err2) {
        console.error('[CultureForm] Fallback échoué :', err2);
        Alert.alert(
          'Erreur de base de données',
          'Impossible de charger la liste des cultures. Détail : ' + err2.message
        );
        setCultures([]);
      }
    }
  }, []);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const culturesFiltrees = cultures.filter((c) =>
    c.nom_fr.toLowerCase().includes(filtreRecherche.toLowerCase())
  );

  // Calcul rendement prévu automatique si culture sélectionnée
  const calcRendementAuto = () => {
    if (!cultureSelectee?.rendement_ref_kg_m2) return null;
    // On n'a pas la superficie ici — on la calcule depuis la planche si disponible
    return null; // Sera calculé dans la planche
  };

  const valider = () => {
    if (!cultureSelectee) {
      Alert.alert('Culture requise', 'Sélectionnez une culture à planter.');
      return;
    }
    if (!form.date_semis) {
      Alert.alert('Date requise', 'Indiquez la date de semis.');
      return;
    }

    // Warning eau
    if (
      cultureSelectee.condition_eau === 'suffisant' &&
      (niveauEauPlanche === 'aucune' || niveauEauPlanche === 'inconnu')
    ) {
      Alert.alert(
        '⚠️ Attention eau',
        `${cultureSelectee.nom_fr} nécessite un accès eau suffisant. Le niveau eau de cette planche est "${niveauEauPlanche}". Continuer quand même ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Continuer', onPress: () => sauvegarder() },
        ]
      );
      return;
    }
    sauvegarder();
  };

  const sauvegarder = () => {
    insertCultureEnCours({
      planche_id: plancheId,
      culture_id: cultureSelectee.id,
      date_semis: form.date_semis,
      stade_actuel: form.stade_actuel,
      destination: form.destination,
      cycle_jours: cultureSelectee.cycle_jours,
      rendement_prevu_kg: form.rendement_prevu_kg
        ? parseFloat(form.rendement_prevu_kg)
        : null,
      notes: form.notes.trim() || null,
    });
    navigation.goBack();
  };

  return (
    <View style={[styles.conteneur, { paddingTop: insets.top }]}>
      {/* En-tête */}
      <View style={styles.entete}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.boutonRetour}>
          <Text style={styles.texteRetour}>✕ Annuler</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.titre}>Nouvelle culture</Text>
          <Text style={styles.sousTitre}>{plancheNom} · {siteCode}</Text>
        </View>
        <TouchableOpacity onPress={valider} style={styles.boutonSauver}>
          <Text style={styles.boutonSauverTexte}>Planter ✓</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Sélection de la culture */}
        <View style={styles.section}>
          <Text style={styles.sectionTitre}>Quelle culture ?</Text>
          <TextInput
            style={styles.recherche}
            value={filtreRecherche}
            onChangeText={setFiltreRecherche}
            placeholder="Rechercher une culture..."
            placeholderTextColor={COULEURS.texteFaible}
          />
          {culturesFiltrees.map((culture) => (
            <CarteCultureChoix
              key={culture.id}
              culture={culture}
              selectionne={cultureSelectee?.id === culture.id}
              onPress={() => setCultureSelectee(culture)}
            />
          ))}
        </View>

        {/* Détails si culture sélectionnée */}
        {cultureSelectee && (
          <View style={styles.section}>
            <Text style={styles.sectionTitre}>Paramètres de culture</Text>

            {/* Date semis */}
            <View style={styles.champ}>
              <Text style={styles.champLabel}>Date de semis / plantation</Text>
              <TextInput
                style={styles.input}
                value={form.date_semis}
                onChangeText={(v) => set('date_semis', v)}
                placeholder="AAAA-MM-JJ"
                placeholderTextColor={COULEURS.texteFaible}
              />
              {cultureSelectee.cycle_jours && form.date_semis && (
                <Text style={styles.champAide}>
                  📅 Récolte prévue : {(() => {
                    try {
                      const d = new Date(form.date_semis);
                      d.setDate(d.getDate() + cultureSelectee.cycle_jours);
                      return d.toISOString().split('T')[0];
                    } catch { return '—'; }
                  })()}
                  {' '}(J+{cultureSelectee.cycle_jours})
                </Text>
              )}
            </View>

            {/* Stade actuel */}
            <SelecteurBoutons
              label="Stade actuel"
              options={STADES_INITIAUX}
              valeur={form.stade_actuel}
              onChange={(v) => set('stade_actuel', v)}
            />

            {/* Destination */}
            <SelecteurBoutons
              label="Destination de la récolte"
              options={DESTINATIONS}
              valeur={form.destination}
              onChange={(v) => set('destination', v)}
            />

            {/* Rendement prévu */}
            <View style={styles.champ}>
              <Text style={styles.champLabel}>Rendement prévu (kg) — optionnel</Text>
              <TextInput
                style={styles.input}
                value={form.rendement_prevu_kg}
                onChangeText={(v) => set('rendement_prevu_kg', v)}
                keyboardType="decimal-pad"
                placeholder={
                  cultureSelectee.rendement_ref_kg_m2
                    ? `Référence : ${cultureSelectee.rendement_ref_kg_m2} kg/m²`
                    : 'Ex: 30'
                }
                placeholderTextColor={COULEURS.texteFaible}
              />
            </View>

            {/* Notes */}
            <View style={styles.champ}>
              <Text style={styles.champLabel}>Notes (optionnel)</Text>
              <TextInput
                style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                value={form.notes}
                onChangeText={(v) => set('notes', v)}
                placeholder="Observations, variété utilisée..."
                placeholderTextColor={COULEURS.texteFaible}
                multiline
              />
            </View>

            {/* Résumé info culture */}
            <View style={styles.encadreInfo}>
              <Text style={styles.encadreInfoTitre}>📋 {cultureSelectee.nom_fr}</Text>
              <Text style={styles.encadreInfoTexte}>
                {cultureSelectee.notes?.slice(0, 200)}
                {cultureSelectee.notes?.length > 200 ? '…' : ''}
              </Text>
            </View>
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
  texteRetour: { color: COULEURS.rouge, fontSize: 14 },
  titre: { color: COULEURS.texte, fontSize: 16, fontWeight: 'bold' },
  sousTitre: { color: COULEURS.texteFaible, fontSize: 12 },
  boutonSauver: {
    backgroundColor: COULEURS.vertFonce,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
  },
  boutonSauverTexte: { color: COULEURS.texte, fontWeight: '700' },
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
  recherche: {
    backgroundColor: COULEURS.champ,
    borderWidth: 1, borderColor: COULEURS.bordure,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    color: COULEURS.texte, fontSize: 14, marginBottom: 10,
  },
  carteCultureChoix: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COULEURS.fond, borderRadius: 10,
    marginBottom: 6, overflow: 'hidden',
    borderWidth: 1, borderColor: COULEURS.bordure,
  },
  carteCultureChoisie: { borderColor: COULEURS.vert, borderWidth: 2 },
  bandeCouleurCulture: { width: 4, alignSelf: 'stretch' },
  cultureChoixNom: { color: COULEURS.texte, fontSize: 15, fontWeight: '600' },
  cultureChoixDetail: { color: COULEURS.texteFaible, fontSize: 12, marginTop: 2 },
  cultureChoixRendement: { color: COULEURS.vert, fontSize: 11, marginTop: 2 },
  checkmark: { color: COULEURS.vert, fontSize: 20, paddingRight: 14, fontWeight: 'bold' },
  champ: { marginBottom: 18 },
  champLabel: { color: COULEURS.vert, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: {
    backgroundColor: COULEURS.champ,
    borderWidth: 1, borderColor: COULEURS.bordure,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    color: COULEURS.texte, fontSize: 15,
  },
  champAide: { color: COULEURS.vert, fontSize: 12, marginTop: 6 },
  optionsRangee: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionBtn: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1, borderColor: COULEURS.bordure,
    backgroundColor: COULEURS.champ,
  },
  optionBtnActif: { backgroundColor: COULEURS.vertFonce, borderColor: COULEURS.vert },
  optionTexte: { color: COULEURS.texteFaible, fontSize: 13 },
  optionTexteActif: { color: COULEURS.texte, fontWeight: '600' },
  encadreInfo: {
    backgroundColor: COULEURS.fond, borderRadius: 8, padding: 12,
    borderWidth: 1, borderColor: COULEURS.bordure, marginTop: 8,
  },
  encadreInfoTitre: { color: COULEURS.vert, fontWeight: '700', marginBottom: 6 },
  encadreInfoTexte: { color: COULEURS.texteFaible, fontSize: 12, lineHeight: 18 },
});