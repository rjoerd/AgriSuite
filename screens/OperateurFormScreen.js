// screens/OperateurFormScreen.js
// Phase 3 Session 9d1 + 9d2
//
// 9d1 : Formulaire CRUD identité opérateur
// 9d2 : Section "🔍 Engagements certifications" avec scoring audit par référentiel
//       + bouton "Engager un nouveau référentiel"
//       + bouton "Ouvrir l'audit blanc opérateur" sur chaque engagement

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  getOperateur,
  updateOperateur,
  getEngagementsOperateur,
  getReferentielsNonEngagesOperateur,
} from '../database/operateur';

export default function OperateurFormScreen({ navigation }) {
  const [operateur, setOperateur] = useState(null);
  const [form, setForm] = useState({});
  const [dirty, setDirty] = useState(false);
  const [engagements, setEngagements] = useState([]);
  const [showEngagerModal, setShowEngagerModal] = useState(false);
  const [referentielsDispo, setReferentielsDispo] = useState([]);

  useFocusEffect(
    useCallback(() => {
      const op = getOperateur();
      if (op) {
        setOperateur(op);
        setForm({
          nom_legal: op.nom_legal || '',
          nom_commercial: op.nom_commercial || '',
          forme_juridique: op.forme_juridique || '',
          nif: op.nif || '',
          stat: op.stat || '',
          rcs: op.rcs || '',
          adresse_siege: op.adresse_siege || '',
          ville: op.ville || '',
          pays: op.pays || 'Madagascar',
          telephone: op.telephone || '',
          email: op.email || '',
          site_web: op.site_web || '',
          responsable_qualite_nom: op.responsable_qualite_nom || '',
          responsable_qualite_telephone: op.responsable_qualite_telephone || '',
          responsable_qualite_email: op.responsable_qualite_email || '',
          date_creation_entreprise: op.date_creation_entreprise || '',
          effectif_total: op.effectif_total ? String(op.effectif_total) : '',
          effectif_permanent: op.effectif_permanent ? String(op.effectif_permanent) : '',
          effectif_saisonnier: op.effectif_saisonnier ? String(op.effectif_saisonnier) : '',
          activites_principales: op.activites_principales || '',
          marches_cibles: op.marches_cibles || '',
          notes: op.notes || '',
        });
        setDirty(false);

        // Engagements de l'opérateur
        try {
          setEngagements(getEngagementsOperateur(op.id));
        } catch (err) {
          console.log('Erreur chargement engagements:', err.message);
          setEngagements([]);
        }
      }
    }, [])
  );

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const save = () => {
    if (!form.nom_legal || !form.nom_legal.trim()) {
      Alert.alert('Champ obligatoire', 'Le nom légal est obligatoire.');
      return;
    }
    const updates = {
      nom_legal: form.nom_legal.trim(),
      nom_commercial: form.nom_commercial.trim() || null,
      forme_juridique: form.forme_juridique.trim() || null,
      nif: form.nif.trim() || null,
      stat: form.stat.trim() || null,
      rcs: form.rcs.trim() || null,
      adresse_siege: form.adresse_siege.trim() || null,
      ville: form.ville.trim() || null,
      pays: form.pays.trim() || 'Madagascar',
      telephone: form.telephone.trim() || null,
      email: form.email.trim() || null,
      site_web: form.site_web.trim() || null,
      responsable_qualite_nom: form.responsable_qualite_nom.trim() || null,
      responsable_qualite_telephone: form.responsable_qualite_telephone.trim() || null,
      responsable_qualite_email: form.responsable_qualite_email.trim() || null,
      date_creation_entreprise: form.date_creation_entreprise.trim() || null,
      effectif_total: form.effectif_total ? parseInt(form.effectif_total, 10) : null,
      effectif_permanent: form.effectif_permanent ? parseInt(form.effectif_permanent, 10) : null,
      effectif_saisonnier: form.effectif_saisonnier ? parseInt(form.effectif_saisonnier, 10) : null,
      activites_principales: form.activites_principales.trim() || null,
      marches_cibles: form.marches_cibles.trim() || null,
      notes: form.notes.trim() || null,
    };
    try {
      updateOperateur(operateur.id, updates);
      Alert.alert('✅ Enregistré', 'Informations opérateur sauvegardées.');
      setDirty(false);
    } catch (err) {
      Alert.alert('Erreur', String(err.message || err));
    }
  };

  const ouvrirModalEngager = () => {
    try {
      const dispo = getReferentielsNonEngagesOperateur(operateur.id);
      setReferentielsDispo(dispo);
      setShowEngagerModal(true);
    } catch (err) {
      Alert.alert('Erreur', String(err.message || err));
    }
  };

  const choisirReferentielAEngager = (ref) => {
    setShowEngagerModal(false);
    // Navigue vers EngagementFormScreen avec cible='operateur'
    navigation.navigate('EngagementForm', {
      cibleType: 'operateur',
      cibleId: operateur.id,
      cibleLabel: operateur.nom_legal,
      referentielPreSelectionne: ref.id,
    });
  };

  const ouvrirAuditOperateur = (engagement) => {
    navigation.navigate('AuditBlanc', {
      engagementId: engagement.id,
      filtreNiveau: 'operateur',
      titreContexte: '🏢 Audit opérateur',
    });
  };

  if (!operateur) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loading}>Chargement…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>🏢 Opérateur</Text>
        <Text style={styles.headerSubtitle}>
          L'entité auditée par les organismes de certification (Ecocert, FLOCERT, RA…).
        </Text>
      </View>

      {/* SECTION ENGAGEMENTS CERTIFICATIONS */}
      <Text style={styles.section}>🔍 Engagements certifications</Text>
      <Text style={styles.hint}>
        Référentiels que l'opérateur s'engage à respecter (BIO, HACCP, Fairtrade…).
        Chaque engagement déclenche un audit blanc filtré sur le niveau opérateur.
      </Text>

      {engagements.length === 0 ? (
        <View style={styles.emptyEngagements}>
          <Text style={styles.emptyText}>
            Aucun référentiel engagé pour l'instant.
          </Text>
        </View>
      ) : (
        engagements.map((eng) => {
          const total = eng.nb_exigences_operateur || 0;
          const conformes = eng.nb_conformes_operateur || 0;
          const nc = eng.nb_nc_majeures || 0;
          const pct = total > 0 ? Math.round((conformes / total) * 100) : 0;
          const couleurStatut = STATUT_COULEURS[eng.statut] || '#7ec87e';

          return (
            <TouchableOpacity
              key={eng.id}
              style={styles.engagementCard}
              onPress={() => ouvrirAuditOperateur(eng)}
            >
              <View style={styles.engagementHeader}>
                <Text style={styles.engagementNom}>{eng.ref_nom_court}</Text>
                <View style={[styles.statutBadge, { backgroundColor: couleurStatut }]}>
                  <Text style={styles.statutBadgeText}>
                    {STATUT_LABELS[eng.statut] || eng.statut}
                  </Text>
                </View>
              </View>

              <Text style={styles.engagementSousTitre} numberOfLines={1}>
                {eng.ref_nom_complet}
              </Text>

              {/* Barre progression score audit blanc */}
              <View style={styles.scoreRow}>
                <View style={styles.barOuter}>
                  <View
                    style={[
                      styles.barInner,
                      {
                        width: `${pct}%`,
                        backgroundColor: pct >= 80 ? '#7ec87e' : pct >= 50 ? '#d4a04a' : '#c87e7e',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.scoreText}>
                  {conformes}/{total} ({pct}%)
                </Text>
              </View>

              {nc > 0 && (
                <View style={styles.ncBanner}>
                  <Text style={styles.ncText}>
                    ⚠ {nc} non-conformité{nc > 1 ? 's' : ''} majeure{nc > 1 ? 's' : ''} bloquante{nc > 1 ? 's' : ''}
                  </Text>
                </View>
              )}

              <Text style={styles.engagementCta}>🔍 Ouvrir l'audit opérateur →</Text>
            </TouchableOpacity>
          );
        })
      )}

      <TouchableOpacity style={styles.btnEngager} onPress={ouvrirModalEngager}>
        <Text style={styles.btnEngagerText}>+ Engager un référentiel</Text>
      </TouchableOpacity>

      {/* IDENTITÉ LÉGALE */}
      <Text style={styles.section}>Identité légale</Text>
      <Field label="Nom légal *" value={form.nom_legal} onChange={(v) => setField('nom_legal', v)} placeholder="Ex : AgriSuite Madagascar SARL" />
      <Field label="Nom commercial" value={form.nom_commercial} onChange={(v) => setField('nom_commercial', v)} />
      <Field label="Forme juridique" value={form.forme_juridique} onChange={(v) => setField('forme_juridique', v)} placeholder="SARL, SA, EI…" />
      <View style={styles.row}>
        <View style={styles.col}>
          <Field label="NIF" value={form.nif} onChange={(v) => setField('nif', v)} />
        </View>
        <View style={styles.col}>
          <Field label="STAT" value={form.stat} onChange={(v) => setField('stat', v)} />
        </View>
      </View>
      <Field label="RCS / Registre du commerce" value={form.rcs} onChange={(v) => setField('rcs', v)} />
      <Field label="Date de création" value={form.date_creation_entreprise} onChange={(v) => setField('date_creation_entreprise', v)} placeholder="AAAA-MM-JJ" />

      {/* COORDONNÉES */}
      <Text style={styles.section}>Coordonnées siège</Text>
      <Field label="Adresse siège" value={form.adresse_siege} onChange={(v) => setField('adresse_siege', v)} multiline />
      <View style={styles.row}>
        <View style={styles.col}>
          <Field label="Ville" value={form.ville} onChange={(v) => setField('ville', v)} />
        </View>
        <View style={styles.col}>
          <Field label="Pays" value={form.pays} onChange={(v) => setField('pays', v)} />
        </View>
      </View>
      <Field label="Téléphone" value={form.telephone} onChange={(v) => setField('telephone', v)} keyboardType="phone-pad" />
      <Field label="Email" value={form.email} onChange={(v) => setField('email', v)} keyboardType="email-address" />
      <Field label="Site web" value={form.site_web} onChange={(v) => setField('site_web', v)} />

      {/* RESPONSABLE QUALITÉ */}
      <Text style={styles.section}>Responsable qualité</Text>
      <Text style={styles.hint}>Personne en charge des certifications, des audits, du HACCP.</Text>
      <Field label="Nom" value={form.responsable_qualite_nom} onChange={(v) => setField('responsable_qualite_nom', v)} />
      <Field label="Téléphone" value={form.responsable_qualite_telephone} onChange={(v) => setField('responsable_qualite_telephone', v)} keyboardType="phone-pad" />
      <Field label="Email" value={form.responsable_qualite_email} onChange={(v) => setField('responsable_qualite_email', v)} keyboardType="email-address" />

      {/* EFFECTIFS */}
      <Text style={styles.section}>Effectifs</Text>
      <View style={styles.row}>
        <View style={styles.col}>
          <Field label="Total" value={form.effectif_total} onChange={(v) => setField('effectif_total', v)} keyboardType="numeric" />
        </View>
        <View style={styles.col}>
          <Field label="Permanents" value={form.effectif_permanent} onChange={(v) => setField('effectif_permanent', v)} keyboardType="numeric" />
        </View>
        <View style={styles.col}>
          <Field label="Saisonniers" value={form.effectif_saisonnier} onChange={(v) => setField('effectif_saisonnier', v)} keyboardType="numeric" />
        </View>
      </View>

      {/* ACTIVITÉS */}
      <Text style={styles.section}>Activités & marchés</Text>
      <Field label="Activités principales" value={form.activites_principales} onChange={(v) => setField('activites_principales', v)} multiline />
      <Field label="Marchés cibles" value={form.marches_cibles} onChange={(v) => setField('marches_cibles', v)} multiline placeholder="UE, USA, Japon…" />

      {/* NOTES */}
      <Text style={styles.section}>Notes</Text>
      <Field label="Notes libres" value={form.notes} onChange={(v) => setField('notes', v)} multiline />

      <TouchableOpacity
        style={[styles.btnSave, !dirty && styles.btnSaveDisabled]}
        onPress={save}
        disabled={!dirty}
      >
        <Text style={styles.btnSaveText}>
          {dirty ? '💾 Enregistrer' : '✓ À jour'}
        </Text>
      </TouchableOpacity>

      <View style={{ height: 60 }} />

      {/* MODAL CHOIX RÉFÉRENTIEL */}
      <Modal
        visible={showEngagerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEngagerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Engager un référentiel</Text>

            {referentielsDispo.length === 0 ? (
              <Text style={styles.emptyText}>
                Tous les référentiels actifs sont déjà engagés.
              </Text>
            ) : (
              <FlatList
                data={referentielsDispo}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.refItem}
                    onPress={() => choisirReferentielAEngager(item)}
                  >
                    <Text style={styles.refNom}>{item.nom_court}</Text>
                    <Text style={styles.refDesc}>{item.nom_complet}</Text>
                    <Text style={styles.refType}>{item.type_referentiel}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
<TouchableOpacity
  style={{ backgroundColor: '#3d2424', padding: 8, borderRadius: 6, marginBottom: 8 }}
  onPress={() => navigation.navigate('DiagnosticNiveaux')}
>
  <Text style={{ color: '#d4a04a', fontSize: 11, textAlign: 'center' }}>🔬 Diagnostic niveaux (temp)</Text>
</TouchableOpacity>
            <TouchableOpacity
              style={styles.btnFermer}
              onPress={() => setShowEngagerModal(false)}
            >
              <Text style={styles.btnFermerText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// ============================================================
// CONSTANTS UI
// ============================================================

const STATUT_LABELS = {
  vise: 'Visé',
  en_conversion: 'En conversion',
  certifie: 'Certifié',
  suspendu: 'Suspendu',
  abandonne: 'Abandonné',
};

const STATUT_COULEURS = {
  vise: '#5a8aaa',
  en_conversion: '#d4a04a',
  certifie: '#7ec87e',
  suspendu: '#c87e7e',
  abandonne: '#888',
};

// ============================================================
// COMPOSANT FIELD
// ============================================================

function Field({ label, value, onChange, placeholder, multiline, keyboardType }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, multiline && styles.fieldInputMulti]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#5a7a5a"
        multiline={multiline}
        keyboardType={keyboardType}
      />
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a2e1a' },
  content: { padding: 16 },
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#1a2e1a',
  },
  loading: { color: '#7ec87e', fontSize: 16 },

  headerCard: {
    backgroundColor: '#243d24',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#7ec87e',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#7ec87e', marginBottom: 4 },
  headerSubtitle: { fontSize: 12, color: '#a8c8a8', lineHeight: 17 },

  section: {
    fontSize: 14, fontWeight: '700', color: '#7ec87e',
    marginTop: 18, marginBottom: 8,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  hint: { fontSize: 12, color: '#8aa88a', fontStyle: 'italic', marginBottom: 8 },

  // Engagements
  emptyEngagements: {
    backgroundColor: '#243d24', borderRadius: 8, padding: 16,
    alignItems: 'center', marginBottom: 8,
  },
  emptyText: { color: '#8aa88a', fontSize: 13, fontStyle: 'italic' },

  engagementCard: {
    backgroundColor: '#243d24',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#7ec87e',
  },
  engagementHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 4,
  },
  engagementNom: { fontSize: 15, fontWeight: 'bold', color: '#fff', flex: 1 },
  statutBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statutBadgeText: { fontSize: 10, fontWeight: '700', color: '#1a2e1a' },
  engagementSousTitre: { fontSize: 11, color: '#a8c8a8', marginBottom: 8 },

  scoreRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  barOuter: {
    flex: 1, height: 8, backgroundColor: '#1a2e1a',
    borderRadius: 4, marginRight: 8, overflow: 'hidden',
  },
  barInner: { height: 8, borderRadius: 4 },
  scoreText: { fontSize: 11, color: '#a8c8a8', minWidth: 80, textAlign: 'right' },

  ncBanner: {
    backgroundColor: '#3d2424',
    padding: 6, borderRadius: 6, marginTop: 4, marginBottom: 4,
  },
  ncText: { color: '#ff9f9f', fontSize: 11, fontWeight: '600' },

  engagementCta: {
    fontSize: 11, color: '#7ec87e', fontWeight: '600',
    marginTop: 4, textAlign: 'right',
  },

  btnEngager: {
    backgroundColor: '#3a5a3a', borderRadius: 8, padding: 12,
    alignItems: 'center', marginTop: 4, marginBottom: 8,
    borderWidth: 1, borderColor: '#7ec87e', borderStyle: 'dashed',
  },
  btnEngagerText: { color: '#7ec87e', fontSize: 13, fontWeight: '600' },

  // Form fields
  field: { marginBottom: 12 },
  fieldLabel: { fontSize: 13, color: '#a8c8a8', marginBottom: 4, fontWeight: '500' },
  fieldInput: {
    backgroundColor: '#243d24', borderRadius: 8, padding: 10,
    color: '#fff', fontSize: 14,
    borderWidth: 1, borderColor: '#3a5a3a',
  },
  fieldInputMulti: { minHeight: 70, textAlignVertical: 'top' },

  row: { flexDirection: 'row', gap: 8 },
  col: { flex: 1 },

  btnSave: {
    backgroundColor: '#7ec87e', borderRadius: 10, padding: 14,
    alignItems: 'center', marginTop: 20,
  },
  btnSaveDisabled: { backgroundColor: '#3a5a3a' },
  btnSaveText: { fontSize: 15, fontWeight: '700', color: '#1a2e1a' },

  // Modal engager
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a2e1a', borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: 16, maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 16, fontWeight: 'bold', color: '#7ec87e',
    marginBottom: 12, textAlign: 'center',
  },
  refItem: {
    backgroundColor: '#243d24', borderRadius: 8, padding: 12, marginBottom: 8,
  },
  refNom: { fontSize: 15, fontWeight: 'bold', color: '#fff' },
  refDesc: { fontSize: 12, color: '#a8c8a8', marginTop: 2 },
  refType: { fontSize: 10, color: '#7ec87e', marginTop: 4, textTransform: 'uppercase' },
  btnFermer: {
    backgroundColor: '#3a5a3a', borderRadius: 8, padding: 12,
    alignItems: 'center', marginTop: 8,
  },
  btnFermerText: { color: '#a8c8a8', fontSize: 14, fontWeight: '600' },
});