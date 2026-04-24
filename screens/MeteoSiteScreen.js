import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('agrisuite.db');

function initMeteo() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS releves_meteo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id INTEGER NOT NULL,
      date_releve TEXT NOT NULL,
      temps TEXT,
      pluie_categorie TEXT,
      temperature_ressentie TEXT,
      temperature_celsius REAL,
      pluvio_mm REAL,
      vent TEXT,
      notes TEXT,
      source TEXT DEFAULT 'manuel',
      FOREIGN KEY (site_id) REFERENCES sites(id)
    );
  `);
}

function getReleves(siteId, limit = 14) {
  return db.getAllSync(
    `SELECT * FROM releves_meteo WHERE site_id = ? ORDER BY date_releve DESC LIMIT ?`,
    [siteId, limit]
  );
}

function getReleve(siteId, date) {
  return db.getFirstSync(
    `SELECT * FROM releves_meteo WHERE site_id = ? AND date_releve = ?`,
    [siteId, date]
  );
}

function insertReleve(releve) {
  db.runSync(
    `INSERT INTO releves_meteo (site_id, date_releve, temps, pluie_categorie, temperature_ressentie, temperature_celsius, pluvio_mm, vent, notes, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [releve.site_id, releve.date_releve, releve.temps, releve.pluie_categorie,
     releve.temperature_ressentie, releve.temperature_celsius || null,
     releve.pluvio_mm || null, releve.vent || '', releve.notes || '', releve.source || 'manuel']
  );
}

function updateReleve(id, releve) {
  db.runSync(
    `UPDATE releves_meteo SET temps=?, pluie_categorie=?, temperature_ressentie=?,
     temperature_celsius=?, pluvio_mm=?, vent=?, notes=? WHERE id=?`,
    [releve.temps, releve.pluie_categorie, releve.temperature_ressentie,
     releve.temperature_celsius || null, releve.pluvio_mm || null,
     releve.vent || '', releve.notes || '', id]
  );
}

const COORDS_SITES = {
  1: { lat: -18.8792, lon: 47.4467 },
  2: { lat: -18.7800, lon: 47.4800 },
  3: { lat: -18.8200, lon: 47.3200 },
  4: { lat: -18.9500, lon: 48.2000 },
};

const API_KEY = '8716069f86e58160d6be0d882a777641';

async function fetchMeteoAPI(siteId) {
  const coords = COORDS_SITES[siteId];
  if (!coords) return null;
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lon}&appid=${API_KEY}&units=metric&lang=fr`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();

    const id = data.weather[0].id;
    let temps = 'ensoleille';
    if (id >= 200 && id < 300) temps = 'orage';
    else if (id >= 300 && id < 400) temps = 'pluie_legere';
    else if (id >= 500 && id < 510) temps = id <= 501 ? 'pluie_legere' : 'pluie_forte';
    else if (id >= 511 && id < 600) temps = 'pluie_forte';
    else if (id >= 700 && id < 800) temps = 'brume';
    else if (id === 800) temps = 'ensoleille';
    else if (id > 800) temps = id <= 802 ? 'nuageux' : 'couvert';

    const tempC = Math.round(data.main.temp);
    let temperature_ressentie = 'normal';
    if (tempC < 12) temperature_ressentie = 'froid';
    else if (tempC < 18) temperature_ressentie = 'frais';
    else if (tempC < 24) temperature_ressentie = 'normal';
    else if (tempC < 28) temperature_ressentie = 'chaud';
    else temperature_ressentie = 'tres_chaud';

    const rain = data.rain?.['1h'] || 0;
    let pluie_categorie = 'aucune';
    if (rain > 0 && rain <= 2) pluie_categorie = 'legere';
    else if (rain > 2 && rain <= 7) pluie_categorie = 'moderee';
    else if (rain > 7) pluie_categorie = 'forte';

    const windSpeed = data.wind?.speed || 0;
    let vent = 'calme';
    if (windSpeed > 3 && windSpeed <= 8) vent = 'leger';
    else if (windSpeed > 8) vent = 'fort';

    return {
      temps,
      temperature_ressentie,
      temperature_celsius: tempC,
      pluie_categorie,
      vent,
      notes: `API: ${data.weather[0].description}, ${tempC}°C, vent ${windSpeed} m/s`,
      source: 'api'
    };
  } catch (e) {
    return null;
  }
}

const TEMPS_OPTIONS = [
  { value: 'ensoleille', label: '☀️ Ensoleillé' },
  { value: 'nuageux', label: '⛅ Nuageux' },
  { value: 'couvert', label: '☁️ Couvert' },
  { value: 'pluie_legere', label: '🌦 Pluie légère' },
  { value: 'pluie_forte', label: '🌧 Pluie forte' },
  { value: 'orage', label: '⛈ Orage' },
  { value: 'brume', label: '🌫 Brume' },
];

const PLUIE_OPTIONS = [
  { value: 'aucune', label: '🔵 Aucune' },
  { value: 'legere', label: '💧 Légère' },
  { value: 'moderee', label: '💧💧 Modérée' },
  { value: 'forte', label: '💧💧💧 Forte' },
];

const TEMP_OPTIONS = [
  { value: 'froid', label: '🥶 Froid (< 12°C)' },
  { value: 'frais', label: '🌡 Frais (12-18°C)' },
  { value: 'normal', label: '😊 Normal (18-24°C)' },
  { value: 'chaud', label: '🌡 Chaud (24-28°C)' },
  { value: 'tres_chaud', label: '🔥 Très chaud (> 28°C)' },
];

const VENT_OPTIONS = [
  { value: 'calme', label: '🍃 Calme' },
  { value: 'leger', label: '💨 Léger' },
  { value: 'fort', label: '🌬 Fort' },
];

function Selecteur({ options, valeur, onChange }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt.value}
          style={[styles.chip, valeur === opt.value && styles.chipActif]}
          onPress={() => onChange(opt.value)}
        >
          <Text style={[styles.chipText, valeur === opt.value && styles.chipTextActif]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

export default function MeteoSiteScreen({ route }) {
  const { siteId, siteCode } = route.params;
  const insets = useSafeAreaInsets();
  const today = new Date().toISOString().split('T')[0];

  const [releves, setReleves] = useState([]);
  const [form, setForm] = useState({
    temps: 'ensoleille',
    pluie_categorie: 'aucune',
    temperature_ressentie: 'normal',
    vent: 'calme',
    notes: ''
  });
  const [releveIdExistant, setReleveIdExistant] = useState(null);
  const [sauvegarde, setSauvegarde] = useState(false);

  const charger = useCallback(() => {
    initMeteo();
    const data = getReleves(siteId);
    setReleves(data);
    const existant = getReleve(siteId, today);
    if (existant) {
      setReleveIdExistant(existant.id);
      setForm({
        temps: existant.temps || 'ensoleille',
        pluie_categorie: existant.pluie_categorie || 'aucune',
        temperature_ressentie: existant.temperature_ressentie || 'normal',
        vent: existant.vent || 'calme',
        notes: existant.notes || ''
      });
    } else {
      fetchMeteoAPI(siteId).then(meteoApi => {
        if (meteoApi) {
          setForm({
            temps: meteoApi.temps,
            pluie_categorie: meteoApi.pluie_categorie,
            temperature_ressentie: meteoApi.temperature_ressentie,
            vent: meteoApi.vent,
            notes: meteoApi.notes
          });
          insertReleve({
            site_id: siteId,
            date_releve: today,
            ...meteoApi
          });
          const nouveau = getReleve(siteId, today);
          if (nouveau) setReleveIdExistant(nouveau.id);
          setReleves(getReleves(siteId));
        }
      });
    }
  }, [siteId, today]);

  useFocusEffect(charger);

  const set = (champ, val) => setForm(f => ({ ...f, [champ]: val }));

  const sauvegarder = () => {
    const data = {
      site_id: siteId,
      date_releve: today,
      ...form,
      source: 'manuel'
    };
    if (releveIdExistant) {
      updateReleve(releveIdExistant, data);
    } else {
      insertReleve(data);
      const nouveau = getReleve(siteId, today);
      if (nouveau) setReleveIdExistant(nouveau.id);
    }
    setSauvegarde(true);
    setTimeout(() => setSauvegarde(false), 2500);
    setReleves(getReleves(siteId));
  };

  const emojiTemps = (t) => {
    const map = {
      ensoleille: '☀️', nuageux: '⛅', couvert: '☁️',
      pluie_legere: '🌦', pluie_forte: '🌧', orage: '⛈', brume: '🌫'
    };
    return map[t] || '—';
  };

  const labelTemp = (t) => {
    const found = TEMP_OPTIONS.find(o => o.value === t);
    return found ? found.label : t;
  };

  const dateAffichee = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long'
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🌤 Météo — {siteCode}</Text>
        <Text style={styles.headerDate}>{dateAffichee}</Text>
        <View style={styles.apiNotice}>
          <Text style={styles.apiNoticeText}>
            📡 Données météo automatiques — OpenWeatherMap
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        <View style={styles.card}>
          <Text style={styles.cardTitre}>
            {`📋 Relevé du jour${releveIdExistant ? ' — ✓ déjà saisi' : ''}`}
          </Text>

          <Text style={styles.fieldLabel}>Temps observé</Text>
          <Selecteur options={TEMPS_OPTIONS} valeur={form.temps} onChange={v => set('temps', v)} />

          <Text style={styles.fieldLabel}>Pluie</Text>
          <Selecteur options={PLUIE_OPTIONS} valeur={form.pluie_categorie} onChange={v => set('pluie_categorie', v)} />

          <Text style={styles.fieldLabel}>Température ressentie</Text>
          <Selecteur options={TEMP_OPTIONS} valeur={form.temperature_ressentie} onChange={v => set('temperature_ressentie', v)} />

          <Text style={styles.fieldLabel}>Vent</Text>
          <Selecteur options={VENT_OPTIONS} valeur={form.vent} onChange={v => set('vent', v)} />

          <Text style={styles.fieldLabel}>Notes (optionnel)</Text>
          <TextInput
            style={styles.notesInput}
            value={form.notes}
            onChangeText={v => set('notes', v)}
            placeholder="Gel, brouillard matinal, vent inhabituel..."
            placeholderTextColor="#5a8a5a"
            multiline
          />

          <TouchableOpacity
            style={[styles.btnSave, sauvegarde && styles.btnSaveDone]}
            onPress={sauvegarder}
          >
            <Text style={styles.btnSaveText}>
              {sauvegarde ? '✓ Enregistré !' : releveIdExistant ? '🔄 Mettre à jour' : '💾 Enregistrer'}
            </Text>
          </TouchableOpacity>
        </View>

        {releves.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitre}>📅 Historique — 14 derniers jours</Text>
            {releves.map(r => {
              const dateStr = new Date(r.date_releve).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
              const emoji = emojiTemps(r.temps);
              const temp = labelTemp(r.temperature_ressentie);
              const pluie = r.pluie_categorie && r.pluie_categorie !== 'aucune' ? r.pluie_categorie : null;
              return (
                <View key={r.id} style={styles.releveRow}>
                  <Text style={styles.releveDate}>{dateStr}</Text>
                  <Text style={styles.releveEmoji}>{emoji}</Text>
                  <Text style={styles.releveTemp}>{temp}</Text>
                  {pluie ? <Text style={styles.relevePluie}>{`💧 ${pluie}`}</Text> : null}
                </View>
              );
            })}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a2e1a' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#2a4a2a' },
  headerTitle: { color: '#7ec87e', fontSize: 18, fontWeight: 'bold' },
  headerDate: { color: '#8aaa8a', fontSize: 13, marginTop: 4 },
  apiNotice: { marginTop: 8, backgroundColor: '#2a3a2a', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  apiNoticeText: { color: '#6a9a6a', fontSize: 12 },
  scroll: { padding: 12, paddingBottom: 40 },
  card: { backgroundColor: '#243824', borderRadius: 14, padding: 14, marginBottom: 12 },
  cardTitre: { color: '#7ec87e', fontSize: 15, fontWeight: '700', marginBottom: 12 },
  fieldLabel: { color: '#8aaa8a', fontSize: 12, marginBottom: 6, marginTop: 10 },
  chip: { backgroundColor: '#1a2e1a', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#3a5a3a' },
  chipActif: { backgroundColor: '#7ec87e', borderColor: '#7ec87e' },
  chipText: { color: '#6a8a6a', fontSize: 13 },
  chipTextActif: { color: '#1a2e1a', fontWeight: '600' },
  notesInput: { backgroundColor: '#1a2e1a', color: '#e8f5e8', borderRadius: 8, padding: 10, fontSize: 13, borderWidth: 1, borderColor: '#3a5a3a', minHeight: 60, textAlignVertical: 'top', marginTop: 4 },
  btnSave: { backgroundColor: '#7ec87e', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16 },
  btnSaveDone: { backgroundColor: '#4a8a4a' },
  btnSaveText: { color: '#1a2e1a', fontWeight: 'bold', fontSize: 15 },
  releveRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#2a4a2a', gap: 8 },
  releveDate: { color: '#8aaa8a', fontSize: 13, width: 55 },
  releveEmoji: { fontSize: 18, width: 28 },
  releveTemp: { color: '#c0d8c0', fontSize: 12, flex: 1 },
  relevePluie: { color: '#7ec8e8', fontSize: 12 },
});