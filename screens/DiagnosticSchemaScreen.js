import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const db = SQLite.openDatabaseSync('agrisuite.db');

export default function DiagnosticSchemaScreen() {
  const insets = useSafeAreaInsets();
  const [info, setInfo] = useState('');

  useEffect(() => {
    try {
      let out = '';

      out += '=== COLONNES exigences_referentiel ===\n';
      const cols = db.getAllSync('PRAGMA table_info(exigences_referentiel)');
      cols.forEach(c => { out += `${c.name} (${c.type})\n`; });

      out += '\n=== EXIGENCES HACCP niveau operateur ===\n';
      const haccpOp = db.getAllSync(`
        SELECT ex.id, ex.code_exigence, ex.titre, ex.categorie,
               ex.auto_verifiable, ex.regle_auto_code, ex.niveau_application
        FROM exigences_referentiel ex
        JOIN referentiels r ON r.id = ex.referentiel_id
        WHERE r.code = 'HACCP'
          AND ex.niveau_application = 'operateur'
        ORDER BY ex.code_exigence
      `);
      out += `Total : ${haccpOp.length}\n\n`;
      haccpOp.forEach(e => {
        out += `[${e.code_exigence}] ${e.categorie}\n`;
        const t = e.titre || '';
        out += `  ${t.substring(0, 80)}${t.length > 80 ? '...' : ''}\n`;
        out += `  auto=${e.auto_verifiable}, regle=${e.regle_auto_code || '-'}\n\n`;
      });

      out += '=== REGLES regle_auto_code existantes ===\n';
      const regles = db.getAllSync(`
        SELECT DISTINCT regle_auto_code, COUNT(*) as n
        FROM exigences_referentiel
        WHERE regle_auto_code IS NOT NULL AND regle_auto_code != ''
        GROUP BY regle_auto_code
        ORDER BY regle_auto_code
      `);
      regles.forEach(r => { out += `${r.regle_auto_code} (${r.n} exigences)\n`; });

      out += '\n=== Categories HACCP (toutes) ===\n';
      const cats = db.getAllSync(`
        SELECT ex.categorie, COUNT(*) as n
        FROM exigences_referentiel ex
        JOIN referentiels r ON r.id = ex.referentiel_id
        WHERE r.code = 'HACCP'
        GROUP BY ex.categorie
        ORDER BY n DESC
      `);
      cats.forEach(c => { out += `${c.categorie}: ${c.n}\n`; });

      setInfo(out);
    } catch (e) {
      setInfo('ERREUR: ' + e.message);
    }
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Diagnostic HACCP/PRP</Text>
        <Text style={styles.code}>{info}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a2e1a' },
  content: { padding: 16, paddingBottom: 40 },
  title: { color: '#7ec87e', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  code: { color: '#fff', fontFamily: 'monospace', fontSize: 11 },
});