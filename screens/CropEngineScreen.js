import React, { useState, useEffect, useCallback } from 'react';
// Ajouter l'import en haut
import { View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as SQLite from 'expo-sqlite';



const db = SQLite.openDatabaseSync('certifpilot.db');

// ─── Constantes ──────────────────────────────────────────────
const TYPES = [
  { value: 'fourrage_graminee',    label: 'Graminée fourragère' },
  { value: 'fourrage_legumineuse', label: 'Légumineuse fourragère' },
  { value: 'maraicher',            label: 'Maraîchage' },
  { value: 'export_perenne',       label: 'Export pérenne' },
  { value: 'export_annuel',        label: 'Export annuel' },
];

const ZONES = [
  { value: 'hautes_terres', label: 'Hautes Terres' },
  { value: 'cote_est',      label: 'Côte Est' },
  { value: 'moyen_ouest',   label: 'Moyen Ouest' },
  { value: 'nord',          label: 'Nord' },
  { value: 'sud',           label: 'Sud' },
];

const TOLERANCES = ['faible', 'moyenne', 'bonne', 'excellente'];

// ─── Composant principal ──────────────────────────────────────
export default function CropEngineScreen() {
  const [cultures, setCultures] = useState([]);
  const [filtre, setFiltre] = useState('');
  const [filtreType, setFiltreType] = useState(null);

  // Modals
  const [modalDetail, setModalDetail] = useState(null);    // culture sélectionnée
  const [modalForm, setModalForm]   = useState(false);     // ajout/modif
  const [modeEdition, setModeEdition] = useState(null);    // null = ajout, objet = édition

  // Formulaire
  const [form, setForm] = useState(emptyForm());

  // Génération IA
  const [iaLoading, setIaLoading] = useState(false);
  const [iaPrompt, setIaPrompt]   = useState('');
  const insets = useSafeAreaInsets();

  // ─── Chargement ────────────────────────────────────────────
  const chargerCultures = useCallback(() => {
    const rows = db.getAllSync(
      'SELECT * FROM cultures WHERE actif = 1 ORDER BY type, nom_fr'
    );
    setCultures(rows);
  }, []);

  useFocusEffect(chargerCultures);

  // ─── Filtrage ───────────────────────────────────────────────
  const culturesFiltrees = cultures.filter(c => {
    const matchTexte = c.nom_fr.toLowerCase().includes(filtre.toLowerCase()) ||
                       (c.nom_local || '').toLowerCase().includes(filtre.toLowerCase()) ||
                       (c.nom_scientifique || '').toLowerCase().includes(filtre.toLowerCase());
    const matchType  = filtreType ? c.type === filtreType : true;
    return matchTexte && matchType;
  });

  // ─── Sauvegarde (ajout ou modification) ────────────────────
  const sauvegarder = () => {
    if (!form.code.trim() || !form.nom_fr.trim()) {
      Alert.alert('Champs requis', 'Le code et le nom français sont obligatoires.');
      return;
    }

    const zonesJson = JSON.stringify(form.zones_adaptees);

    if (modeEdition) {
      db.runSync(`
        UPDATE cultures SET
          nom_fr=?, nom_local=?, nom_scientifique=?, famille=?, type=?,
          cycle_jours=?, zones_adaptees=?, altitude_min=?, altitude_max=?,
          temp_min=?, temp_max=?, pluvio_min=?, pluvio_optimale=?,
          tolerance_secheresse=?, type_sol_prefere=?, notes=?
        WHERE id=?`,
        [
          form.nom_fr, form.nom_local, form.nom_scientifique, form.famille, form.type,
          form.cycle_jours ? parseInt(form.cycle_jours) : null,
          zonesJson,
          form.altitude_min ? parseInt(form.altitude_min) : null,
          form.altitude_max ? parseInt(form.altitude_max) : null,
          form.temp_min ? parseFloat(form.temp_min) : null,
          form.temp_max ? parseFloat(form.temp_max) : null,
          form.pluvio_min ? parseInt(form.pluvio_min) : null,
          form.pluvio_optimale ? parseInt(form.pluvio_optimale) : null,
          form.tolerance_secheresse, form.type_sol_prefere, form.notes,
          modeEdition.id,
        ]
      );
    } else {
      db.runSync(`
        INSERT INTO cultures (
          code, nom_fr, nom_local, nom_scientifique, famille, type,
          cycle_jours, zones_adaptees, altitude_min, altitude_max,
          temp_min, temp_max, pluvio_min, pluvio_optimale,
          tolerance_secheresse, type_sol_prefere, notes, actif
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`,
        [
          form.code, form.nom_fr, form.nom_local, form.nom_scientifique,
          form.famille, form.type,
          form.cycle_jours ? parseInt(form.cycle_jours) : null,
          zonesJson,
          form.altitude_min ? parseInt(form.altitude_min) : null,
          form.altitude_max ? parseInt(form.altitude_max) : null,
          form.temp_min ? parseFloat(form.temp_min) : null,
          form.temp_max ? parseFloat(form.temp_max) : null,
          form.pluvio_min ? parseInt(form.pluvio_min) : null,
          form.pluvio_optimale ? parseInt(form.pluvio_optimale) : null,
          form.tolerance_secheresse, form.type_sol_prefere, form.notes,
        ]
      );
    }

    fermerForm();
    chargerCultures();
    Alert.alert('✅ Enregistré', `${form.nom_fr} sauvegardé avec succès.`);
  };

  // ─── Désactiver une culture (soft delete) ──────────────────
  const desactiver = (culture) => {
    Alert.alert(
      'Désactiver cette culture ?',
      `${culture.nom_fr} ne sera plus proposée dans les nouvelles plantations. Les données existantes sont conservées.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Désactiver', style: 'destructive',
          onPress: () => {
            db.runSync('UPDATE cultures SET actif = 0 WHERE id = ?', [culture.id]);
            setModalDetail(null);
            chargerCultures();
          }
        }
      ]
    );
  };

  // ─── Génération IA d'un itinéraire ─────────────────────────
  const genererParIA = async () => {
    if (!iaPrompt.trim()) return;
    setIaLoading(true);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `Tu es un agronome spécialisé Madagascar. Génère un itinéraire technique pour : "${iaPrompt}".

Réponds UNIQUEMENT en JSON valide, sans commentaires ni backticks, avec exactement ces champs :
{
  "code": "snake_case_unique",
  "nom_fr": "Nom français",
  "nom_local": "Nom malgache si connu",
  "nom_scientifique": "Nom scientifique",
  "famille": "Famille botanique",
  "type": "fourrage_graminee|fourrage_legumineuse|maraicher|export_perenne|export_annuel",
  "cycle_jours": 90,
  "zones_adaptees": ["hautes_terres","cote_est"],
  "altitude_min": 0,
  "altitude_max": 1800,
  "temp_min": 15,
  "temp_max": 35,
  "pluvio_min": 800,
  "pluvio_optimale": 1200,
  "tolerance_secheresse": "bonne",
  "type_sol_prefere": "description du sol",
  "notes": "Notes agronomiques contextualisées Madagascar. Max 200 caractères."
}`
          }]
        })
      });

      const data = await response.json();
      const texte = data.content?.find(b => b.type === 'text')?.text || '';

      // Nettoyage et parsing JSON
      const cleaned = texte.replace(/```json|```/g, '').trim();
      const generated = JSON.parse(cleaned);

      // Remplir le formulaire avec les données générées
      setForm({
        code:                generated.code || '',
        nom_fr:              generated.nom_fr || '',
        nom_local:           generated.nom_local || '',
        nom_scientifique:    generated.nom_scientifique || '',
        famille:             generated.famille || '',
        type:                generated.type || 'fourrage_graminee',
        cycle_jours:         generated.cycle_jours?.toString() || '',
        zones_adaptees:      Array.isArray(generated.zones_adaptees) ? generated.zones_adaptees : [],
        altitude_min:        generated.altitude_min?.toString() || '',
        altitude_max:        generated.altitude_max?.toString() || '',
        temp_min:            generated.temp_min?.toString() || '',
        temp_max:            generated.temp_max?.toString() || '',
        pluvio_min:          generated.pluvio_min?.toString() || '',
        pluvio_optimale:     generated.pluvio_optimale?.toString() || '',
        tolerance_secheresse: generated.tolerance_secheresse || 'moyenne',
        type_sol_prefere:    generated.type_sol_prefere || '',
        notes:               generated.notes || '',
      });

      setIaPrompt('');
    } catch (e) {
      Alert.alert('Erreur IA', `Impossible de générer : ${e.message}`);
    } finally {
      setIaLoading(false);
    }
  };

  // ─── Ouvrir formulaire en mode édition ─────────────────────
  const ouvrirEdition = (culture) => {
    setModeEdition(culture);
    let zones = [];
    try { zones = JSON.parse(culture.zones_adaptees || '[]'); } catch {}
    setForm({
      code:                culture.code,
      nom_fr:              culture.nom_fr || '',
      nom_local:           culture.nom_local || '',
      nom_scientifique:    culture.nom_scientifique || '',
      famille:             culture.famille || '',
      type:                culture.type || 'fourrage_graminee',
      cycle_jours:         culture.cycle_jours?.toString() || '',
      zones_adaptees:      zones,
      altitude_min:        culture.altitude_min?.toString() || '',
      altitude_max:        culture.altitude_max?.toString() || '',
      temp_min:            culture.temp_min?.toString() || '',
      temp_max:            culture.temp_max?.toString() || '',
      pluvio_min:          culture.pluvio_min?.toString() || '',
      pluvio_optimale:     culture.pluvio_optimale?.toString() || '',
      tolerance_secheresse: culture.tolerance_secheresse || 'moyenne',
      type_sol_prefere:    culture.type_sol_prefere || '',
      notes:               culture.notes || '',
    });
    setModalDetail(null);
    setModalForm(true);
  };

  const fermerForm = () => {
    setModalForm(false);
    setModeEdition(null);
    setForm(emptyForm());
    setIaPrompt('');
  };

  // ─── Toggle zone dans le formulaire ────────────────────────
  const toggleZone = (zoneValue) => {
    setForm(f => ({
      ...f,
      zones_adaptees: f.zones_adaptees.includes(zoneValue)
        ? f.zones_adaptees.filter(z => z !== zoneValue)
        : [...f.zones_adaptees, zoneValue],
    }));
  };

  // ─── Rendu carte culture ────────────────────────────────────
  const renderCulture = ({ item }) => {
    let zones = [];
    try { zones = JSON.parse(item.zones_adaptees || '[]'); } catch {}
    const typeInfo = TYPES.find(t => t.value === item.type);

    return (
      <TouchableOpacity style={styles.card} onPress={() => setModalDetail(item)}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardNom}>{item.nom_fr}</Text>
          <View style={[styles.badge, styles[`badge_${item.type}`] || styles.badge_default]}>
            <Text style={styles.badgeText}>{typeInfo?.label.split(' ')[0] || item.type}</Text>
          </View>
        </View>
        {item.nom_scientifique ? (
          <Text style={styles.cardScientifique}>{item.nom_scientifique}</Text>
        ) : null}
        <View style={styles.cardMeta}>
          {item.cycle_jours ? (
            <Text style={styles.metaChip}>🔄 {item.cycle_jours}j</Text>
          ) : null}
          {item.tolerance_secheresse ? (
            <Text style={styles.metaChip}>☀️ {item.tolerance_secheresse}</Text>
          ) : null}
          {zones.slice(0, 2).map(z => {
            const zi = ZONES.find(x => x.value === z);
            return <Text key={z} style={styles.metaChip}>📍 {zi?.label || z}</Text>;
          })}
        </View>
      </TouchableOpacity>
    );
  };

  // ─── Modal détail ───────────────────────────────────────────
  const renderModalDetail = () => {
    if (!modalDetail) return null;
    let zones = [];
    try { zones = JSON.parse(modalDetail.zones_adaptees || '[]'); } catch {}

    return (
      <Modal visible animationType="slide" onRequestClose={() => setModalDetail(null)}>
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalDetail(null)} style={styles.btnRetour}>
              <Text style={styles.btnRetourText}>← Retour</Text>
            </TouchableOpacity>
            <View style={styles.modalHeaderActions}>
              <TouchableOpacity
                style={styles.btnEditer}
                onPress={() => ouvrirEdition(modalDetail)}
              >
                <Text style={styles.btnEditerText}>✏️ Modifier</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnDesactiver}
                onPress={() => desactiver(modalDetail)}
              >
                <Text style={styles.btnDesactiverText}>🚫</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
            <Text style={styles.detailTitre}>{modalDetail.nom_fr}</Text>
            {modalDetail.nom_local ? (
              <Text style={styles.detailLocal}>« {modalDetail.nom_local} »</Text>
            ) : null}
            {modalDetail.nom_scientifique ? (
              <Text style={styles.detailScientifique}>{modalDetail.nom_scientifique}</Text>
            ) : null}

            <Section titre="Identité">
              <Ligne label="Famille" valeur={modalDetail.famille} />
              <Ligne label="Type" valeur={TYPES.find(t => t.value === modalDetail.type)?.label} />
              <Ligne label="Cycle" valeur={modalDetail.cycle_jours ? `${modalDetail.cycle_jours} jours` : '—'} />
            </Section>

            <Section titre="Zones adaptées">
              <View style={styles.zonesRow}>
                {zones.map(z => {
                  const zi = ZONES.find(x => x.value === z);
                  return (
                    <View key={z} style={styles.zoneTag}>
                      <Text style={styles.zoneTagText}>{zi?.label || z}</Text>
                    </View>
                  );
                })}
              </View>
            </Section>

            <Section titre="Exigences pédoclimatiques">
              <Ligne label="Altitude" valeur={
                modalDetail.altitude_min != null
                  ? `${modalDetail.altitude_min} – ${modalDetail.altitude_max} m`
                  : '—'
              } />
              <Ligne label="Température" valeur={
                modalDetail.temp_min != null
                  ? `${modalDetail.temp_min} – ${modalDetail.temp_max} °C`
                  : '—'
              } />
              <Ligne label="Pluviométrie" valeur={
                modalDetail.pluvio_min != null
                  ? `min ${modalDetail.pluvio_min} mm/an, optimum ${modalDetail.pluvio_optimale} mm/an`
                  : '—'
              } />
              <Ligne label="Tolérance sécheresse" valeur={modalDetail.tolerance_secheresse} />
              <Ligne label="Sol" valeur={modalDetail.type_sol_prefere} />
            </Section>

            {modalDetail.notes ? (
              <Section titre="Notes agronomiques">
                <Text style={styles.notes}>{modalDetail.notes}</Text>
              </Section>
            ) : null}
          </ScrollView>
        </View>
      </Modal>
    );
  };

  // ─── Modal formulaire ajout/modification ───────────────────
  const renderModalForm = () => (
    <Modal visible={modalForm} animationType="slide" onRequestClose={fermerForm}>
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={fermerForm} style={styles.btnRetour}>
            <Text style={styles.btnRetourText}>← Annuler</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitre}>
            {modeEdition ? 'Modifier la culture' : 'Ajouter une culture'}
          </Text>
          <TouchableOpacity onPress={sauvegarder} style={styles.btnSauvegarder}>
            <Text style={styles.btnSauvegarderText}>Enregistrer</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">

          {/* ── Bloc génération IA (uniquement en mode ajout) ── */}
          {!modeEdition && (
            <View style={styles.iaBloc}>
              <Text style={styles.iaTitre}>🤖 Générer par IA</Text>
              <Text style={styles.iaSousTitre}>
                Décrivez la culture — l'IA remplit le formulaire, vous validez.
              </Text>
              <TextInput
                style={styles.iaInput}
                placeholder="ex: Brachiaria mulato II, Stylosanthes guianensis, Maïs fourrager DK8031..."
                placeholderTextColor="#666"
                value={iaPrompt}
                onChangeText={setIaPrompt}
                multiline
              />
              <TouchableOpacity
                style={[styles.btnIA, iaLoading && styles.btnIALoading]}
                onPress={genererParIA}
                disabled={iaLoading}
              >
                {iaLoading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnIAText}>Générer l'itinéraire</Text>
                }
              </TouchableOpacity>
              <View style={styles.separateur}>
                <View style={styles.separateurLine} />
                <Text style={styles.separateurTexte}>ou remplir manuellement</Text>
                <View style={styles.separateurLine} />
              </View>
            </View>
          )}

          {/* ── Champs identité ── */}
          <Text style={styles.sectionLabel}>IDENTITÉ</Text>

          {!modeEdition && (
            <ChampTexte
              label="Code unique *"
              value={form.code}
              onChangeText={v => setForm(f => ({ ...f, code: v.toLowerCase().replace(/\s/g, '_') }))}
              placeholder="ex: brachiaria_mulato"
            />
          )}

          <ChampTexte label="Nom français *" value={form.nom_fr}
            onChangeText={v => setForm(f => ({ ...f, nom_fr: v }))} />
          <ChampTexte label="Nom local (malgache)" value={form.nom_local}
            onChangeText={v => setForm(f => ({ ...f, nom_local: v }))} />
          <ChampTexte label="Nom scientifique" value={form.nom_scientifique}
            onChangeText={v => setForm(f => ({ ...f, nom_scientifique: v }))} />
          <ChampTexte label="Famille botanique" value={form.famille}
            onChangeText={v => setForm(f => ({ ...f, famille: v }))} />
          <ChampTexte label="Cycle (jours)" value={form.cycle_jours}
            onChangeText={v => setForm(f => ({ ...f, cycle_jours: v }))}
            keyboardType="numeric" />

          {/* ── Sélecteur type ── */}
          <Text style={styles.champLabel}>Type de culture</Text>
          <View style={styles.choixRow}>
            {TYPES.map(t => (
              <TouchableOpacity
                key={t.value}
                style={[styles.choixChip, form.type === t.value && styles.choixChipActif]}
                onPress={() => setForm(f => ({ ...f, type: t.value }))}
              >
                <Text style={[styles.choixChipText, form.type === t.value && styles.choixChipTextActif]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Zones ── */}
          <Text style={styles.champLabel}>Zones adaptées</Text>
          <View style={styles.choixRow}>
            {ZONES.map(z => (
              <TouchableOpacity
                key={z.value}
                style={[styles.choixChip, form.zones_adaptees.includes(z.value) && styles.choixChipActif]}
                onPress={() => toggleZone(z.value)}
              >
                <Text style={[styles.choixChipText, form.zones_adaptees.includes(z.value) && styles.choixChipTextActif]}>
                  {z.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Pédoclimat ── */}
          <Text style={styles.sectionLabel}>PÉDOCLIMAT</Text>
          <View style={styles.row2col}>
            <ChampTexte label="Altitude min (m)" value={form.altitude_min}
              onChangeText={v => setForm(f => ({ ...f, altitude_min: v }))}
              keyboardType="numeric" style={styles.demiChamp} />
            <ChampTexte label="Altitude max (m)" value={form.altitude_max}
              onChangeText={v => setForm(f => ({ ...f, altitude_max: v }))}
              keyboardType="numeric" style={styles.demiChamp} />
          </View>
          <View style={styles.row2col}>
            <ChampTexte label="Temp. min (°C)" value={form.temp_min}
              onChangeText={v => setForm(f => ({ ...f, temp_min: v }))}
              keyboardType="numeric" style={styles.demiChamp} />
            <ChampTexte label="Temp. max (°C)" value={form.temp_max}
              onChangeText={v => setForm(f => ({ ...f, temp_max: v }))}
              keyboardType="numeric" style={styles.demiChamp} />
          </View>
          <View style={styles.row2col}>
            <ChampTexte label="Pluvio. min (mm/an)" value={form.pluvio_min}
              onChangeText={v => setForm(f => ({ ...f, pluvio_min: v }))}
              keyboardType="numeric" style={styles.demiChamp} />
            <ChampTexte label="Pluvio. optimale" value={form.pluvio_optimale}
              onChangeText={v => setForm(f => ({ ...f, pluvio_optimale: v }))}
              keyboardType="numeric" style={styles.demiChamp} />
          </View>

          {/* ── Tolérance sécheresse ── */}
          <Text style={styles.champLabel}>Tolérance à la sécheresse</Text>
          <View style={styles.choixRow}>
            {TOLERANCES.map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.choixChip, form.tolerance_secheresse === t && styles.choixChipActif]}
                onPress={() => setForm(f => ({ ...f, tolerance_secheresse: t }))}
              >
                <Text style={[styles.choixChipText, form.tolerance_secheresse === t && styles.choixChipTextActif]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ChampTexte label="Type de sol préféré" value={form.type_sol_prefere}
            onChangeText={v => setForm(f => ({ ...f, type_sol_prefere: v }))} multiline />

          {/* ── Notes ── */}
          <Text style={styles.sectionLabel}>NOTES AGRONOMIQUES</Text>
          <ChampTexte label="Notes" value={form.notes}
            onChangeText={v => setForm(f => ({ ...f, notes: v }))}
            multiline numberOfLines={4} />

          <View style={{ height: 40 }} />
        </ScrollView>
     </View>
    </Modal>
  );

  // ─── Rendu principal ────────────────────────────────────────
  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.titre}>🌱 CropEngine</Text>
        <Text style={styles.sousTitre}>{cultures.length} cultures en base</Text>
      </View>

      {/* Barre de recherche */}
      <View style={styles.rechercheRow}>
        <TextInput
          style={styles.rechercheInput}
          placeholder="Rechercher une culture..."
          placeholderTextColor="#666"
          value={filtre}
          onChangeText={setFiltre}
        />
        <TouchableOpacity
          style={styles.btnAjouter}
          onPress={() => { setModeEdition(null); setForm(emptyForm()); setModalForm(true); }}
        >
          <Text style={styles.btnAjouterText}>+ Ajouter</Text>
        </TouchableOpacity>
      </View>

      {/* Filtres par type */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtresRow}>
        <TouchableOpacity
          style={[styles.filtreChip, filtreType === null && styles.filtreChipActif]}
          onPress={() => setFiltreType(null)}
        >
          <Text style={[styles.filtreChipText, filtreType === null && styles.filtreChipTextActif]}>
            Toutes
          </Text>
        </TouchableOpacity>
        {TYPES.map(t => (
          <TouchableOpacity
            key={t.value}
            style={[styles.filtreChip, filtreType === t.value && styles.filtreChipActif]}
            onPress={() => setFiltreType(filtreType === t.value ? null : t.value)}
          >
            <Text style={[styles.filtreChipText, filtreType === t.value && styles.filtreChipTextActif]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Liste */}
      <FlatList
        data={culturesFiltrees}
        keyExtractor={item => item.id.toString()}
        renderItem={renderCulture}
        contentContainerStyle={styles.liste}
        ListEmptyComponent={
          <Text style={styles.vide}>Aucune culture trouvée.</Text>
        }
      />

      {renderModalDetail()}
      {renderModalForm()}
    </View>
  );
}

// ─── Composants utilitaires ───────────────────────────────────

function Section({ titre, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitre}>{titre}</Text>
      {children}
    </View>
  );
}

function Ligne({ label, valeur }) {
  return (
    <View style={styles.ligneDetail}>
      <Text style={styles.ligneLabel}>{label}</Text>
      <Text style={styles.ligneValeur}>{valeur || '—'}</Text>
    </View>
  );
}

function ChampTexte({ label, value, onChangeText, placeholder, keyboardType, multiline, numberOfLines, style }) {
  return (
    <View style={[styles.champContainer, style]}>
      <Text style={styles.champLabel}>{label}</Text>
      <TextInput
        style={[styles.champInput, multiline && styles.champInputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || ''}
        placeholderTextColor="#555"
        keyboardType={keyboardType || 'default'}
        multiline={multiline}
        numberOfLines={numberOfLines}
      />
    </View>
  );
}

// ─── Formulaire vide ──────────────────────────────────────────
function emptyForm() {
  return {
    code: '', nom_fr: '', nom_local: '', nom_scientifique: '',
    famille: '', type: 'fourrage_graminee', cycle_jours: '',
    zones_adaptees: [], altitude_min: '', altitude_max: '',
    temp_min: '', temp_max: '', pluvio_min: '', pluvio_optimale: '',
    tolerance_secheresse: 'moyenne', type_sol_prefere: '', notes: '',
  };
}

// ─── Styles ───────────────────────────────────────────────────
const C = {
  fond:       '#0f1a0f',
  surface:    '#1a2e1a',
  surfaceAlt: '#223322',
  vert:       '#7ec87e',
  vertFonce:  '#4a8a4a',
  texte:      '#e8f5e8',
  texteMuted: '#8aaa8a',
  border:     '#2a4a2a',
  rouge:      '#c44',
};

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.fond },
  header: { paddingTop: 12, paddingHorizontal: 16, paddingBottom: 12 },

  titre:        { fontSize: 24, fontWeight: '700', color: C.texte },
  sousTitre:    { fontSize: 13, color: C.texteMuted, marginTop: 2 },

  rechercheRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 10, gap: 10 },
  rechercheInput: {
    flex: 1, backgroundColor: C.surface, color: C.texte,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, borderWidth: 1, borderColor: C.border,
  },
  btnAjouter: {
    backgroundColor: C.vert, borderRadius: 10,
    paddingHorizontal: 16, justifyContent: 'center',
  },
  btnAjouterText: { color: C.fond, fontWeight: '700', fontSize: 14 },

 filtresRow: { paddingLeft: 16, paddingBottom: 4, marginBottom: 10, flexGrow: 0, height: 46 },
  filtreChip: {
    marginRight: 8, paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border,
  },
  filtreChipActif:     { backgroundColor: C.vert, borderColor: C.vert },
  filtreChipText:      { color: C.texteMuted, fontSize: 12 },
  filtreChipTextActif: { color: C.fond, fontWeight: '700' },

  liste:  { paddingHorizontal: 16, paddingBottom: 120 },
  vide:         { color: C.texteMuted, textAlign: 'center', marginTop: 40, fontSize: 14 },

  card: {
    backgroundColor: C.surface, borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: C.border,
  },
  cardHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardNom:         { fontSize: 16, fontWeight: '700', color: C.texte, flex: 1, marginRight: 8 },
  cardScientifique:{ fontSize: 12, color: C.texteMuted, fontStyle: 'italic', marginTop: 2 },
  cardMeta:        { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 6 },
  metaChip:        { fontSize: 11, color: C.texteMuted, backgroundColor: C.fond, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },

  badge:           { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText:       { fontSize: 11, fontWeight: '600', color: C.fond },
  badge_fourrage_graminee:    { backgroundColor: '#7ec87e' },
  badge_fourrage_legumineuse: { backgroundColor: '#a8d87e' },
  badge_maraicher:            { backgroundColor: '#7ec8c8' },
  badge_export_perenne:       { backgroundColor: '#c8a87e' },
  badge_export_annuel:        { backgroundColor: '#c8c87e' },
  badge_default:              { backgroundColor: C.texteMuted },

  // Modal
  modalContainer:  { flex: 1, backgroundColor: C.fond },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 8, paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  modalTitre:      { color: C.texte, fontWeight: '700', fontSize: 15 },
  modalHeaderActions: { flexDirection: 'row', gap: 8 },
  btnRetour:       { paddingVertical: 6, paddingHorizontal: 4 },
  btnRetourText:   { color: C.vert, fontSize: 15 },
  btnEditer:       { backgroundColor: C.vertFonce, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  btnEditerText:   { color: C.texte, fontSize: 13, fontWeight: '600' },
  btnDesactiver:   { backgroundColor: '#441a1a', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  btnDesactiverText:{ fontSize: 14 },
  btnSauvegarder:  { backgroundColor: C.vert, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  btnSauvegarderText:{ color: C.fond, fontWeight: '700', fontSize: 14 },
  modalScroll:     { flex: 1 },
  modalContent:    { padding: 20, paddingBottom: 40 },

  // Détail
  detailTitre:     { fontSize: 22, fontWeight: '700', color: C.texte, marginBottom: 4 },
  detailLocal:     { fontSize: 15, color: C.vert, fontStyle: 'italic', marginBottom: 2 },
  detailScientifique:{ fontSize: 13, color: C.texteMuted, fontStyle: 'italic', marginBottom: 16 },
  section:         { marginBottom: 20 },
  sectionTitre:    { fontSize: 11, fontWeight: '700', color: C.vert, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 4 },
  ligneDetail:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border },
  ligneLabel:      { color: C.texteMuted, fontSize: 13, flex: 1 },
  ligneValeur:     { color: C.texte, fontSize: 13, flex: 2, textAlign: 'right' },
  zonesRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  zoneTag:         { backgroundColor: C.surfaceAlt, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  zoneTagText:     { color: C.vert, fontSize: 12 },
  notes:           { color: C.texte, fontSize: 13, lineHeight: 20 },

  // Formulaire
  sectionLabel:    { fontSize: 11, fontWeight: '700', color: C.vert, letterSpacing: 1.5, marginTop: 20, marginBottom: 10, marginHorizontal: 16 },
  champContainer:  { marginHorizontal: 16, marginBottom: 14 },
  champLabel:      { fontSize: 12, color: C.texteMuted, marginBottom: 6, marginHorizontal: 16 },
  champInput: {
    backgroundColor: C.surface, color: C.texte,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, borderWidth: 1, borderColor: C.border,
  },
  champInputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  row2col:         { flexDirection: 'row', gap: 0 },
  demiChamp:       { flex: 1 },
  choixRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginHorizontal: 16, marginBottom: 14 },
  choixChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
  },
  choixChipActif:     { backgroundColor: C.vert, borderColor: C.vert },
  choixChipText:      { color: C.texteMuted, fontSize: 12 },
  choixChipTextActif: { color: C.fond, fontWeight: '700' },

  // Bloc IA
  iaBloc: {
    margin: 16, padding: 16, backgroundColor: '#0d1f2d',
    borderRadius: 12, borderWidth: 1, borderColor: '#1a4060',
  },
  iaTitre:         { color: '#7ec8ff', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  iaSousTitre:     { color: '#6090a8', fontSize: 12, marginBottom: 12 },
  iaInput: {
    backgroundColor: '#0a1520', color: '#e0f0ff',
    borderRadius: 8, padding: 12, fontSize: 13,
    borderWidth: 1, borderColor: '#1a3050', minHeight: 60,
    textAlignVertical: 'top',
  },
  btnIA: {
    backgroundColor: '#1a5080', borderRadius: 8, padding: 12,
    alignItems: 'center', marginTop: 10,
  },
  btnIALoading:    { opacity: 0.6 },
  btnIAText:       { color: '#7ec8ff', fontWeight: '700', fontSize: 14 },
  separateur:      { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 10 },
  separateurLine:  { flex: 1, height: 1, backgroundColor: C.border },
  separateurTexte: { color: C.texteMuted, fontSize: 11 },
});