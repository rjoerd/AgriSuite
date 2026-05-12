// screens/PrpExportPdfScreen.js
// Phase 3 - Session 10c.5 - Export PDF registres PRP pour audit

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getPlanById, getTypePrpInfo } from '../database/prp';
import { genererPdfRegistresPrp, partagerPdf } from '../services/pdfRegistresPrp';

// Périodes pré-définies (raccourcis pratiques)
const PERIODES = [
  { code: '7j', label: '7 derniers jours', jours: 7 },
  { code: '30j', label: '30 derniers jours', jours: 30 },
  { code: '90j', label: '3 derniers mois', jours: 90 },
  { code: '365j', label: '12 derniers mois', jours: 365 },
];

function dateMoinsJours(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

export default function PrpExportPdfScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { planId } = route.params;

  const [plan, setPlan] = useState(null);
  const [periodeChoisie, setPeriodeChoisie] = useState('30j');
  const [dateDebut, setDateDebut] = useState(dateMoinsJours(30));
  const [dateFin, setDateFin] = useState(new Date().toISOString().split('T')[0]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    setPlan(getPlanById(planId));
  }, [planId]);

  const choisirPeriode = (code) => {
    setPeriodeChoisie(code);
    const p = PERIODES.find(x => x.code === code);
    if (p) {
      setDateDebut(dateMoinsJours(p.jours));
      setDateFin(new Date().toISOString().split('T')[0]);
    }
  };

  const generer = async () => {
    if (!dateDebut || !dateFin) {
      Alert.alert('Dates requises', 'Renseigne la date de début et de fin.');
      return;
    }
    if (dateDebut > dateFin) {
      Alert.alert('Dates invalides', 'La date de début doit être avant la date de fin.');
      return;
    }

    setGenerating(true);
    try {
      const uri = await genererPdfRegistresPrp(planId, dateDebut, dateFin);
      const nom = `Registre_PRP_${plan.type_prp}_${dateDebut}_${dateFin}.pdf`;
      await partagerPdf(uri, nom);
    } catch (e) {
      console.error('Erreur génération PDF:', e);
      Alert.alert('Erreur', e.message);
    } finally {
      setGenerating(false);
    }
  };

  if (!plan) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#7ec87e' }}>Chargement...</Text>
      </View>
    );
  }

  const info = getTypePrpInfo(plan.type_prp);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Export PDF — Registre PRP</Text>
        <Text style={styles.subtitle}>Format audit Ecocert / Bureau Veritas</Text>

        {/* PLAN */}
        <View style={styles.planCard}>
          <Text style={styles.planIcone}>{info?.icone}</Text>
          <Text style={styles.planNom}>{plan.nom}</Text>
          <Text style={styles.planRef}>{plan.reference_reglementaire}</Text>
        </View>

        {/* PÉRIODES PRÉDÉFINIES */}
        <Text style={styles.label}>Période rapide</Text>
        <View style={styles.periodesRow}>
          {PERIODES.map(p => (
            <TouchableOpacity
              key={p.code}
              style={[styles.periodeBtn, periodeChoisie === p.code && styles.periodeBtnActive]}
              onPress={() => choisirPeriode(p.code)}
            >
              <Text style={[styles.periodeText, periodeChoisie === p.code && styles.periodeTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* DATES CUSTOM */}
        <Text style={styles.label}>Ou période personnalisée</Text>
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.dateLabel}>Date début</Text>
            <TextInput
              style={styles.input}
              value={dateDebut}
              onChangeText={(v) => { setDateDebut(v); setPeriodeChoisie(''); }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#666"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.dateLabel}>Date fin</Text>
            <TextInput
              style={styles.input}
              value={dateFin}
              onChangeText={(v) => { setDateFin(v); setPeriodeChoisie(''); }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#666"
            />
          </View>
        </View>

        {/* INFO CONTENU PDF */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>📄 Contenu du PDF</Text>
          <Text style={styles.infoItem}>• En-tête : opérateur, plan, référence réglementaire, danger maîtrisé</Text>
          <Text style={styles.infoItem}>• Synthèse : nb registres, conformité, NC, observations</Text>
          <Text style={styles.infoItem}>• Tableau détaillé : date, heure, procédure, opérateur, résultat, valeurs</Text>
          <Text style={styles.infoItem}>• Actions correctives liées aux NC</Text>
          <Text style={styles.infoItem}>• Pied : horodatage, références Codex/ISO/UE</Text>
        </View>

        {/* INFO RÉGLEMENTAIRE */}
        <View style={styles.legalBox}>
          <Text style={styles.legalText}>
            ⚖️ Conservation obligatoire 5 ans minimum (UE 2018/848 art. 39).
            Ce document est horodaté et présentable en audit Ecocert, Bureau Veritas, SGS, FLOCERT.
          </Text>
        </View>

        {/* BOUTON GÉNÉRER */}
        <TouchableOpacity
          style={[styles.btnGenerer, generating && { opacity: 0.6 }]}
          onPress={generer}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator color="#1a2e1a" />
          ) : (
            <Text style={styles.btnGenererText}>📄 Générer et partager le PDF</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnAnnuler} onPress={() => navigation.goBack()}>
          <Text style={styles.btnAnnulerText}>Retour</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a2e1a' },
  content: { padding: 16, paddingBottom: 40 },
  title: { color: '#7ec87e', fontSize: 22, fontWeight: 'bold' },
  subtitle: { color: '#888', fontSize: 12, fontStyle: 'italic', marginBottom: 20 },

  planCard: {
    backgroundColor: '#243d24',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#7ec87e',
  },
  planIcone: { fontSize: 40, marginBottom: 6 },
  planNom: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  planRef: { color: '#a8c8a8', fontSize: 11, fontStyle: 'italic', marginTop: 4 },

  label: { color: '#7ec87e', fontSize: 14, fontWeight: 'bold', marginTop: 12, marginBottom: 8 },

  periodesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  periodeBtn: {
    backgroundColor: '#2a3e2a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3a5a3a',
  },
  periodeBtnActive: {
    backgroundColor: '#7ec87e',
    borderColor: '#7ec87e',
  },
  periodeText: { color: '#ccc', fontSize: 12, fontWeight: '500' },
  periodeTextActive: { color: '#1a2e1a', fontWeight: 'bold' },

  row: { flexDirection: 'row' },
  dateLabel: { color: '#aaa', fontSize: 11, marginBottom: 4 },
  input: {
    backgroundColor: '#2a3e2a',
    color: '#fff',
    padding: 12,
    borderRadius: 6,
    fontSize: 14,
  },

  infoBox: {
    backgroundColor: '#1f2c38',
    padding: 12,
    borderRadius: 6,
    marginTop: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#7eaac8',
  },
  infoTitle: { color: '#7eaac8', fontSize: 12, fontWeight: 'bold', marginBottom: 6 },
  infoItem: { color: '#a8c8e8', fontSize: 11, marginTop: 2 },

  legalBox: {
    backgroundColor: '#3a2a1a',
    padding: 10,
    borderRadius: 6,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#d4a04a',
  },
  legalText: { color: '#d4a04a', fontSize: 11, lineHeight: 16 },

  btnGenerer: {
    backgroundColor: '#7ec87e',
    padding: 16,
    borderRadius: 8,
    marginTop: 24,
    alignItems: 'center',
  },
  btnGenererText: { color: '#1a2e1a', fontSize: 15, fontWeight: 'bold' },

  btnAnnuler: { padding: 14, marginTop: 8, alignItems: 'center' },
  btnAnnulerText: { color: '#888', fontSize: 14 },
});