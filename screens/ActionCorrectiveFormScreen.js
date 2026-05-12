import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as SQLite from 'expo-sqlite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const db = SQLite.openDatabaseSync('agrisuite.db');

// 5 types d'action corrective selon ISO 22000 §8.9.2 + Codex CXC 1-1969
// 5 types d'action corrective selon ISO 22000 §8.9.2 + Codex CXC 1-1969
const TYPES_ACTION = [
  {
    code: 'isoler',
    label: 'Isoler le lot',
    desc: 'Mise en quarantaine immédiate — empêche toute commercialisation tant que la décision finale n\'est pas prise',
  },
  {
    code: 'retraiter',
    label: 'Retraitement',
    desc: 'Procédure refaite pour ramener le lot à conformité (ex : remettre au séchoir, refermentation)',
  },
  {
    code: 'declasser',
    label: 'Déclassement qualité',
    desc: 'Lot reclassé en qualité inférieure (ex : Grade A → B) — usage marché local possible',
  },
  {
    code: 'detruire',
    label: 'Destruction / rebut',
    desc: 'Lot retiré définitivement de la chaîne (perte sèche documentée pour audit)',
  },
  {
    code: 'autre',
    label: 'Autre (à justifier)',
    desc: 'Décision dérogatoire — exige justification écrite détaillée. Risqué en audit BIO/HACCP.',
  },
];

export default function ActionCorrectiveFormScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { releveId } = route.params;

  const [releve, setReleve] = useState(null);
  const [ccp, setCcp] = useState(null);
  const [relevesVerification, setRelevesVerification] = useState([]);

  const [typeAction, setTypeAction] = useState('');
  const [description, setDescription] = useState('');
  const [responsable, setResponsable] = useState('');
  const [dateAction, setDateAction] = useState(new Date().toISOString().split('T')[0]);
  const [methodeVerif, setMethodeVerif] = useState('');
  const [releveVerifId, setReleveVerifId] = useState(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    try {
      // Charger le relevé NC + son CCP
      const r = db.getAllSync(
        `SELECT r.*, c.nom_ccp, c.numero, c.action_corrective_default, e.produit_nom
         FROM releves_ccp r
         LEFT JOIN ccp_haccp c ON c.id = r.ccp_id
         LEFT JOIN etudes_haccp e ON e.id = c.etude_id
         WHERE r.id = ?`,
        [releveId]
      )[0];
      setReleve(r);
      setCcp({ id: r.ccp_id, nom: r.nom_ccp, numero: r.numero });

      // Pré-remplir méthode vérification si action corrective par défaut existe
      if (r.action_corrective_default) {
        setDescription(r.action_corrective_default);
      }

      // Charger les relevés POSTÉRIEURS du même CCP (candidats pour vérification)
      const rv = db.getAllSync(
        `SELECT id, date_releve, heure_releve, conforme, valeurs_json, lot_code
         FROM releves_ccp
         WHERE ccp_id = ? AND id != ? AND date(date_releve) >= date(?)
         ORDER BY date_releve DESC, heure_releve DESC`,
        [r.ccp_id, releveId, r.date_releve]
      );
      setRelevesVerification(rv);
    } catch (e) {
      console.error('Chargement releve NC:', e);
      Alert.alert('Erreur', e.message);
    }
  }, [releveId]);

  const valider = () => {
    if (!typeAction) {
      Alert.alert('Type d\'action requis', 'Sélectionne le type d\'action corrective (ISO 22000 §8.9.2).');
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      Alert.alert('Description insuffisante', 'Détaille l\'action corrective (min. 10 caractères). Un auditeur doit comprendre ce qui a été fait.');
      return;
    }
    if (!responsable.trim()) {
      Alert.alert('Responsable requis', 'Qui a pris la décision de cette action ?');
      return;
    }

    // Warning métier sur "acceptation en l'état"
    if (typeAction === 'autre') {
      Alert.alert(
        '⚠ Acceptation en l\'état',
        'Cette option est risquée en audit BIO/HACCP. Le lot ne pourra pas être commercialisé sous référentiel export. La justification doit être documentée. Confirmer ?',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Confirmer', style: 'destructive', onPress: () => sauvegarder() },
        ]
      );
      return;
    }

    sauvegarder();
  };

  const sauvegarder = () => {
    try {
      const now = new Date().toISOString();
      const efficaciteVerifiee = releveVerifId ? 1 : 0;

      // INSERT dans actions_correctives
      db.runSync(
        `INSERT INTO actions_correctives 
         (releve_id, type_action, description, responsable_decision, date_action,
          date_resolution, efficacite_verifiee, methode_verification, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          releveId,
          typeAction,
          description.trim(),
          responsable.trim(),
          dateAction,
          efficaciteVerifiee ? dateAction : null,
          efficaciteVerifiee,
          methodeVerif.trim() || null,
          notes.trim() || null,
          now,
        ]
      );

      // UPDATE relevé : marquer NC comme résolue
      db.runSync(
        `UPDATE releves_ccp SET action_corrective_resolue = 1 WHERE id = ?`,
        [releveId]
      );

      Alert.alert(
        '✅ Action corrective enregistrée',
        `NC clôturée pour ${ccp.nom}.\n\nLa traçabilité ISO 22000 §8.9.2 est préservée : relevé NC conservé + action corrective + résolution datée.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e) {
      console.error('Sauvegarde action corrective:', e);
      Alert.alert('Erreur', e.message);
    }
  };

  if (!releve) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#7ec87e' }}>Chargement...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Action corrective</Text>
          <Text style={styles.subtitle}>ISO 22000 §8.9.2 + Codex CXC 1-1969</Text>

          {/* RAPPEL NC */}
          <View style={styles.ncCard}>
            <Text style={styles.ncBadge}>NC OUVERTE</Text>
            <Text style={styles.ncTitle}>CCP {ccp.numero} — {ccp.nom}</Text>
            <Text style={styles.ncMeta}>Produit : {releve.produit_nom || '—'}</Text>
            <Text style={styles.ncMeta}>Lot : {releve.lot_code || '—'}</Text>
            <Text style={styles.ncMeta}>Date relevé : {releve.date_releve} {releve.heure_releve || ''}</Text>
            <Text style={styles.ncMeta}>Opérateur : {releve.operateur}</Text>
            <Text style={styles.ncMotif}>{releve.motif_non_conforme}</Text>
          </View>

          {/* TYPE D'ACTION */}
          <Text style={styles.label}>Type d'action *</Text>
          <Text style={styles.hint}>Choix ISO 22000 §8.9.2</Text>
          {TYPES_ACTION.map(t => (
            <TouchableOpacity
              key={t.code}
              style={[styles.typeCard, typeAction === t.code && styles.typeCardSelected]}
              onPress={() => setTypeAction(t.code)}
            >
              <View style={styles.typeHeader}>
                <View style={[styles.radio, typeAction === t.code && styles.radioSelected]} />
                <Text style={[styles.typeLabel, typeAction === t.code && styles.typeLabelSelected]}>
                  {t.label}
                </Text>
              </View>
              <Text style={styles.typeDesc}>{t.desc}</Text>
            </TouchableOpacity>
          ))}

          {/* DESCRIPTION */}
          <Text style={styles.label}>Description de l'action *</Text>
          <Text style={styles.hint}>Ce qu'un auditeur doit pouvoir comprendre</Text>
          <TextInput
            style={styles.textarea}
            value={description}
            onChangeText={setDescription}
            placeholder="Ex : Lot remis au séchoir solaire pendant 6h supplémentaires. Surveillance horaire par J. Rakoto. Cible humidité ≤ 12%."
            placeholderTextColor="#666"
            multiline
            numberOfLines={4}
          />

          {/* RESPONSABLE */}
          <Text style={styles.label}>Responsable de la décision *</Text>
          <TextInput
            style={styles.input}
            value={responsable}
            onChangeText={setResponsable}
            placeholder="Nom du responsable qualité / gérant"
            placeholderTextColor="#666"
          />

          {/* DATE ACTION */}
          <Text style={styles.label}>Date de l'action *</Text>
          <TextInput
            style={styles.input}
            value={dateAction}
            onChangeText={setDateAction}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#666"
          />

          {/* MÉTHODE VÉRIFICATION */}
          <Text style={styles.label}>Méthode de vérification</Text>
          <Text style={styles.hint}>Comment prouver que l'action a fonctionné ?</Text>
          <TextInput
            style={styles.input}
            value={methodeVerif}
            onChangeText={setMethodeVerif}
            placeholder="Ex : Nouveau relevé d'humidité après séchage"
            placeholderTextColor="#666"
          />

          {/* RELEVÉ DE VÉRIFICATION (optionnel) */}
          <Text style={styles.label}>Relevé de vérification</Text>
          <Text style={styles.hint}>
            Lie un relevé conforme postérieur — preuve que l'action a corrigé la NC
          </Text>
          {relevesVerification.length === 0 ? (
            <Text style={styles.empty}>
              Aucun relevé postérieur sur ce CCP. Fais un nouveau relevé après l'action et reviens clôturer.
            </Text>
          ) : (
            relevesVerification.map(rv => {
              const valeurs = rv.valeurs_json ? JSON.parse(rv.valeurs_json) : {};
              const valStr = Object.entries(valeurs).map(([k, v]) => `${k}: ${v}`).join(', ');
              return (
                <TouchableOpacity
                  key={rv.id}
                  style={[styles.releveCard, releveVerifId === rv.id && styles.releveCardSelected]}
                  onPress={() => setReleveVerifId(releveVerifId === rv.id ? null : rv.id)}
                >
                  <View style={styles.releveHeader}>
                    <Text style={styles.releveDate}>{rv.date_releve} {rv.heure_releve || ''}</Text>
                    <Text style={rv.conforme ? styles.badgeOk : styles.badgeNc}>
                      {rv.conforme ? '✅ Conforme' : '❌ NC'}
                    </Text>
                  </View>
                  <Text style={styles.releveMeta}>{valStr}</Text>
                  {rv.lot_code && <Text style={styles.releveMeta}>Lot : {rv.lot_code}</Text>}
                </TouchableOpacity>
              );
            })
          )}

          {/* NOTES */}
          <Text style={styles.label}>Notes additionnelles</Text>
          <TextInput
            style={styles.textarea}
            value={notes}
            onChangeText={setNotes}
            placeholder="Cause racine identifiée, mesures préventives à venir, etc."
            placeholderTextColor="#666"
            multiline
            numberOfLines={3}
          />

          {/* BOUTON VALIDER */}
          <TouchableOpacity style={styles.btnValider} onPress={valider}>
            <Text style={styles.btnValiderText}>✅ Enregistrer et clôturer la NC</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnAnnuler} onPress={() => navigation.goBack()}>
            <Text style={styles.btnAnnulerText}>Annuler</Text>
          </TouchableOpacity>

          <Text style={styles.footer}>
            💡 Le relevé NC original sera conservé tel quel (horodatage infalsifiable).
            L'action corrective est ajoutée en complément avec sa propre date.
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
  subtitle: { color: '#888', fontSize: 12, fontStyle: 'italic', marginBottom: 20 },

  ncCard: {
    backgroundColor: '#3a2a2a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: '#e74c3c',
  },
  ncBadge: {
    color: '#fff',
    backgroundColor: '#e74c3c',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  ncTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold', marginBottom: 6 },
  ncMeta: { color: '#bbb', fontSize: 12, marginTop: 2 },
  ncMotif: { color: '#d4a04a', fontSize: 13, marginTop: 8, fontStyle: 'italic' },

  label: { color: '#7ec87e', fontSize: 14, fontWeight: 'bold', marginTop: 16, marginBottom: 4 },
  hint: { color: '#888', fontSize: 11, fontStyle: 'italic', marginBottom: 8 },

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
    minHeight: 80,
  },

  typeCard: {
    backgroundColor: '#2a3e2a',
    borderRadius: 6,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  typeCardSelected: {
    borderColor: '#7ec87e',
    backgroundColor: '#2e4a2e',
  },
  typeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  radio: {
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 2, borderColor: '#7ec87e',
    marginRight: 10,
  },
  radioSelected: { backgroundColor: '#7ec87e' },
  typeLabel: { color: '#ccc', fontSize: 14, fontWeight: 'bold' },
  typeLabelSelected: { color: '#7ec87e' },
  typeDesc: { color: '#888', fontSize: 11, marginLeft: 26 },

  empty: {
    color: '#d4a04a',
    fontSize: 12,
    padding: 12,
    fontStyle: 'italic',
    backgroundColor: '#2a3e2a',
    borderRadius: 6,
  },
  releveCard: {
    backgroundColor: '#2a3e2a',
    borderRadius: 6,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  releveCardSelected: {
    borderColor: '#7ec87e',
    backgroundColor: '#2e4a2e',
  },
  releveHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  releveDate: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  releveMeta: { color: '#bbb', fontSize: 11, marginTop: 2 },
  badgeOk: {
    color: '#1a2e1a', backgroundColor: '#7ec87e',
    fontSize: 10, fontWeight: 'bold',
    paddingHorizontal: 6, paddingVertical: 1, borderRadius: 3,
  },
  badgeNc: {
    color: '#fff', backgroundColor: '#e74c3c',
    fontSize: 10, fontWeight: 'bold',
    paddingHorizontal: 6, paddingVertical: 1, borderRadius: 3,
  },

  btnValider: {
    backgroundColor: '#7ec87e',
    padding: 16,
    borderRadius: 8,
    marginTop: 24,
    alignItems: 'center',
  },
  btnValiderText: { color: '#1a2e1a', fontSize: 15, fontWeight: 'bold' },

  btnAnnuler: {
    padding: 14,
    marginTop: 8,
    alignItems: 'center',
  },
  btnAnnulerText: { color: '#888', fontSize: 14 },

  footer: {
    color: '#888',
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 16,
    textAlign: 'center',
  },
});