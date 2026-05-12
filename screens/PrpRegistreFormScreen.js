// screens/PrpRegistreFormScreen.js
// Phase 3 - Session 10c.3 - Formulaire opérateur : enregistrement exécution PRP

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SQLite from 'expo-sqlite';
import {
  getPlanById,
  createRegistre,
  getTypePrpInfo,
} from '../database/prp';

const db = SQLite.openDatabaseSync('agrisuite.db');

const RESULTATS = [
  {
    code: 'conforme',
    label: '✅ Conforme',
    desc: 'Procédure exécutée comme prévu, aucun écart',
    color: '#7ec87e',
  },
  {
    code: 'observation',
    label: '⚠️ Observation',
    desc: 'Procédure exécutée mais point à surveiller (pas une NC)',
    color: '#d4a04a',
  },
  {
    code: 'non_conforme',
    label: '❌ Non conforme',
    desc: 'Écart détecté → action corrective obligatoire',
    color: '#e74c3c',
  },
];

export default function PrpRegistreFormScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { planId, procedureId, procedureTitre } = route.params;

  const [plan, setPlan] = useState(null);
  const [procedure, setProcedure] = useState(null);
  const [valeursAttendues, setValeursAttendues] = useState(null);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [heure, setHeure] = useState(
    new Date().toTimeString().slice(0, 5)
  );
  const [operateur, setOperateur] = useState('');
  const [lieu, setLieu] = useState('');
  const [resultat, setResultat] = useState('');
  const [valeursForm, setValeursForm] = useState({});
  const [observations, setObservations] = useState('');

  useEffect(() => {
    try {
      const p = getPlanById(planId);
      setPlan(p);

      if (procedureId) {
        const proc = db.getFirstSync(
          'SELECT * FROM prp_procedures WHERE id = ?',
          [procedureId]
        );
        setProcedure(proc);

        if (proc?.valeurs_attendues_json) {
          const va = JSON.parse(proc.valeurs_attendues_json);
          setValeursAttendues(va);
        }
      }
    } catch (e) {
      console.error('Chargement procedure:', e);
    }
  }, [planId, procedureId]);

  // Détection auto conformité si valeurs numériques min/max définies
  const detecterConformiteAuto = () => {
    if (!valeursAttendues) return null;

    // Cas valeur unique numérique avec min/max (ex : chlore, T°)
    const numeric = Object.entries(valeursForm).filter(([k, v]) => v !== '' && !isNaN(parseFloat(v)));
    if (numeric.length === 0) return null;

    let toutConforme = true;
    let motif = '';

    for (const [k, v] of numeric) {
      const valNum = parseFloat(v);
      if (valeursAttendues.min !== undefined && valNum < valeursAttendues.min) {
        toutConforme = false;
        motif = `${k} = ${v} < min ${valeursAttendues.min}`;
        break;
      }
      if (valeursAttendues.max !== undefined && valNum > valeursAttendues.max) {
        toutConforme = false;
        motif = `${k} = ${v} > max ${valeursAttendues.max}`;
        break;
      }
      if (valeursAttendues.temp_max_c !== undefined && k.toLowerCase().includes('temp') && valNum > valeursAttendues.temp_max_c) {
        toutConforme = false;
        motif = `T° ${v}°C > max ${valeursAttendues.temp_max_c}°C`;
        break;
      }
      if (valeursAttendues.hr_max_pct !== undefined && k.toLowerCase().includes('hr') && valNum > valeursAttendues.hr_max_pct) {
        toutConforme = false;
        motif = `HR ${v}% > max ${valeursAttendues.hr_max_pct}%`;
        break;
      }
      if (valeursAttendues.seuil_max_rlu !== undefined && k.toLowerCase().includes('rlu') && valNum > valeursAttendues.seuil_max_rlu) {
        toutConforme = false;
        motif = `${v} RLU > seuil ${valeursAttendues.seuil_max_rlu}`;
        break;
      }
    }

    return { conforme: toutConforme, motif };
  };

  const valider = () => {
    if (!operateur.trim()) {
      Alert.alert('Opérateur requis', 'Qui a exécuté cette procédure ?');
      return;
    }
    if (!resultat) {
      Alert.alert('Résultat requis', 'Conforme, observation, ou non conforme ?');
      return;
    }

    try {
      const valeursJson = Object.keys(valeursForm).length > 0
        ? JSON.stringify(valeursForm)
        : null;

      const registreId = createRegistre({
        prp_plan_id: planId,
        prp_procedure_id: procedureId || null,
        date_execution: date,
        heure_execution: heure,
        operateur: operateur.trim(),
        lieu: lieu.trim() || null,
        resultat,
        valeurs_json: valeursJson,
        observations: observations.trim() || null,
      });

      if (resultat === 'non_conforme') {
        Alert.alert(
          '🚨 Non-conformité enregistrée',
          'Une action corrective est obligatoire selon ISO 22000 §8.9.2. Tu peux la créer maintenant ou plus tard depuis le détail du PRP.',
          [
            {
              text: 'Plus tard',
              style: 'cancel',
              onPress: () => navigation.goBack(),
            },
            {
              text: 'Action corrective maintenant',
              onPress: () => navigation.replace('PrpActionCorrective', { registreId }),
            },
          ]
        );
      } else {
        Alert.alert(
          '✅ Registre enregistré',
          'Preuve d\'exécution conservée pour audit.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (e) {
      console.error('Sauvegarde registre:', e);
      Alert.alert('Erreur', e.message);
    }
  };

  const handleValeurChange = (key, val) => {
    setValeursForm({ ...valeursForm, [key]: val });
  };

  const auto = detecterConformiteAuto();
  const info = plan ? getTypePrpInfo(plan.type_prp) : null;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Enregistrer une exécution</Text>
          <Text style={styles.subtitle}>
            {info?.icone} {plan?.nom}
          </Text>

          {/* PROCÉDURE */}
          {procedure && (
            <View style={styles.procCard}>
              <Text style={styles.procLabel}>Procédure</Text>
              <Text style={styles.procTitre}>{procedure.titre}</Text>
              <Text style={styles.procFreq}>⏱ {procedure.frequence_execution}</Text>
              {procedure.contenu_detaille && (
                <Text style={styles.procContenu} numberOfLines={3}>
                  {procedure.contenu_detaille}
                </Text>
              )}
            </View>
          )}

          {/* DATE + HEURE */}
          <View style={styles.row}>
            <View style={{ flex: 2, marginRight: 8 }}>
              <Text style={styles.label}>Date *</Text>
              <TextInput
                style={styles.input}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#666"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Heure</Text>
              <TextInput
                style={styles.input}
                value={heure}
                onChangeText={setHeure}
                placeholder="HH:MM"
                placeholderTextColor="#666"
              />
            </View>
          </View>

          {/* OPÉRATEUR */}
          <Text style={styles.label}>Opérateur *</Text>
          <TextInput
            style={styles.input}
            value={operateur}
            onChangeText={setOperateur}
            placeholder="Qui a exécuté ?"
            placeholderTextColor="#666"
          />

          {/* LIEU */}
          <Text style={styles.label}>Lieu</Text>
          <TextInput
            style={styles.input}
            value={lieu}
            onChangeText={setLieu}
            placeholder="Ex : Atelier séchage Site D, Zone stockage..."
            placeholderTextColor="#666"
          />

          {/* VALEURS MESURÉES (si procédure définit des valeurs attendues) */}
          {valeursAttendues && (
            <>
              <Text style={styles.label}>Valeurs mesurées</Text>

              {/* Affichage limites attendues */}
              <View style={styles.limitesBox}>
                <Text style={styles.limitesTitle}>📏 Limites attendues</Text>
                {Object.entries(valeursAttendues).map(([k, v]) => (
                  <Text key={k} style={styles.limitesItem}>
                    • {k} : {Array.isArray(v) ? v.join(', ') : v}
                  </Text>
                ))}
              </View>

              {/* Champs de saisie selon valeurs attendues */}
              {valeursAttendues.min !== undefined || valeursAttendues.max !== undefined ? (
                <TextInput
                  style={styles.input}
                  value={valeursForm.valeur || ''}
                  onChangeText={(v) => handleValeurChange('valeur', v)}
                  placeholder={`Valeur mesurée${valeursAttendues.unite ? ` (${valeursAttendues.unite})` : ''}`}
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                />
              ) : valeursAttendues.temp_max_c !== undefined ? (
                <>
                  <TextInput
                    style={styles.input}
                    value={valeursForm.temperature || ''}
                    onChangeText={(v) => handleValeurChange('temperature', v)}
                    placeholder={`Température (°C) — max ${valeursAttendues.temp_max_c}`}
                    placeholderTextColor="#666"
                    keyboardType="numeric"
                  />
                  {valeursAttendues.hr_max_pct !== undefined && (
                    <TextInput
                      style={[styles.input, { marginTop: 8 }]}
                      value={valeursForm.hr || ''}
                      onChangeText={(v) => handleValeurChange('hr', v)}
                      placeholder={`Humidité relative (%) — max ${valeursAttendues.hr_max_pct}`}
                      placeholderTextColor="#666"
                      keyboardType="numeric"
                    />
                  )}
                </>
              ) : valeursAttendues.seuil_max_rlu !== undefined ? (
                <TextInput
                  style={styles.input}
                  value={valeursForm.rlu || ''}
                  onChangeText={(v) => handleValeurChange('rlu', v)}
                  placeholder={`Mesure ATP (RLU) — seuil ${valeursAttendues.seuil_max_rlu}`}
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                />
              ) : (
                <TextInput
                  style={styles.input}
                  value={valeursForm.commentaire || ''}
                  onChangeText={(v) => handleValeurChange('commentaire', v)}
                  placeholder="Saisie libre"
                  placeholderTextColor="#666"
                />
              )}

              {/* Détection auto */}
              {auto && (
                <View style={[
                  styles.autoBox,
                  { backgroundColor: auto.conforme ? '#1a3a1a' : '#3a1a1a' }
                ]}>
                  <Text style={[
                    styles.autoText,
                    { color: auto.conforme ? '#7ec87e' : '#e74c3c' }
                  ]}>
                    {auto.conforme
                      ? '✅ Détection auto : valeur dans les limites'
                      : `❌ Détection auto : ${auto.motif}`}
                  </Text>
                </View>
              )}
            </>
          )}

          {/* RÉSULTAT */}
          <Text style={styles.label}>Résultat *</Text>
          <Text style={styles.hint}>Évaluation globale de l'exécution</Text>
          {RESULTATS.map(r => (
            <TouchableOpacity
              key={r.code}
              style={[
                styles.resultCard,
                resultat === r.code && {
                  borderColor: r.color,
                  backgroundColor: r.color + '22',
                },
              ]}
              onPress={() => setResultat(r.code)}
            >
              <View style={[styles.radio, resultat === r.code && { backgroundColor: r.color, borderColor: r.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.resultLabel, resultat === r.code && { color: r.color }]}>
                  {r.label}
                </Text>
                <Text style={styles.resultDesc}>{r.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}

          {/* OBSERVATIONS */}
          <Text style={styles.label}>Observations</Text>
          <TextInput
            style={styles.textarea}
            value={observations}
            onChangeText={setObservations}
            placeholder="Notes libres : contexte, anomalies mineures, recommandations..."
            placeholderTextColor="#666"
            multiline
            numberOfLines={3}
          />

          {/* BOUTONS */}
          <TouchableOpacity style={styles.btnValider} onPress={valider}>
            <Text style={styles.btnValiderText}>Enregistrer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnAnnuler} onPress={() => navigation.goBack()}>
            <Text style={styles.btnAnnulerText}>Annuler</Text>
          </TouchableOpacity>

          <Text style={styles.footer}>
            💡 Le registre est horodaté et conservé 5 ans (UE 2018/848 art. 39).
          </Text>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a2e1a' },
  content: { padding: 16, paddingBottom: 60 },
  title: { color: '#7ec87e', fontSize: 22, fontWeight: 'bold' },
  subtitle: { color: '#aaa', fontSize: 13, marginBottom: 20 },

  procCard: {
    backgroundColor: '#1f2c38',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#7eaac8',
  },
  procLabel: { color: '#7eaac8', fontSize: 11, fontWeight: 'bold' },
  procTitre: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginTop: 4 },
  procFreq: { color: '#a8c8e8', fontSize: 12, marginTop: 4 },
  procContenu: { color: '#bbb', fontSize: 11, marginTop: 6, fontStyle: 'italic' },

  row: { flexDirection: 'row' },
  label: { color: '#7ec87e', fontSize: 13, fontWeight: 'bold', marginTop: 12, marginBottom: 4 },
  hint: { color: '#888', fontSize: 11, fontStyle: 'italic', marginBottom: 6 },

  input: {
    backgroundColor: '#2a3e2a',
    color: '#fff',
    padding: 12,
    borderRadius: 6,
    fontSize: 14,
  },
  textarea: {
    backgroundColor: '#2a3e2a',
    color: '#fff',
    padding: 12,
    borderRadius: 6,
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 70,
  },

  limitesBox: {
    backgroundColor: '#1f2c38',
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  limitesTitle: { color: '#7eaac8', fontSize: 11, fontWeight: 'bold', marginBottom: 4 },
  limitesItem: { color: '#a8c8e8', fontSize: 11, fontFamily: 'monospace' },

  autoBox: {
    padding: 10,
    borderRadius: 6,
    marginTop: 8,
  },
  autoText: { fontSize: 12, fontWeight: 'bold' },

  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a3e2a',
    padding: 12,
    borderRadius: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  radio: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: '#7ec87e',
    marginRight: 12,
  },
  resultLabel: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  resultDesc: { color: '#888', fontSize: 11, marginTop: 2 },

  btnValider: {
    backgroundColor: '#7ec87e',
    padding: 16,
    borderRadius: 8,
    marginTop: 24,
    alignItems: 'center',
  },
  btnValiderText: { color: '#1a2e1a', fontSize: 15, fontWeight: 'bold' },

  btnAnnuler: { padding: 14, marginTop: 8, alignItems: 'center' },
  btnAnnulerText: { color: '#888', fontSize: 14 },

  footer: { color: '#666', fontSize: 11, fontStyle: 'italic', marginTop: 16, textAlign: 'center' },
});