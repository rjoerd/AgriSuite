// screens/ProducteurSCIDetailScreen.js
// Fiche détaillée producteur SCI — Phase 3 Session 9a
//
// Affiche :
//   - En-tête : nom, code, statut SCI, statut conversion BIO
//   - KPI : nb parcelles, superficie totale, engagements actifs
//   - Section info personnelle (CNI, genre, foyer)
//   - Section engagements : badges avec liens
//   - Section parcelles : liste avec GPS
//   - Section contrats : adhésion SCI + engagements
//   - Section inspections (placeholder Session 9b)
//
// Usage :
//   navigation.navigate('ProducteurSCIDetail', { fournisseurId: 5 })

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  getProducteurSCI,
  updateProducteurSCI,
  ajouterEngagementProducteur,
  retirerEngagementProducteur,
  getParcellesProducteur,
  supprimerParcelleProducteur,
  getContratsParProducteur,
  getStatutSCILabel,
  getStatutSCIColor,
  getStatutConversionLabel,
  getStatutConversionColor,
  getTypeContratLabel,
  STATUTS_SCI,
  STATUTS_CONVERSION_BIO,
} from '../database/sci';
import { getReferentiels } from '../database/certifTrack';

export default function ProducteurSCIDetailScreen({ route, navigation }) {
  const { fournisseurId } = route.params;

  const [producteur, setProducteur] = useState(null);
  const [parcelles, setParcelles] = useState([]);
  const [contrats, setContrats] = useState([]);
  const [referentiels, setReferentiels] = useState([]);

  const [showStatutModal, setShowStatutModal] = useState(false);
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [showEngagementModal, setShowEngagementModal] = useState(false);

  const loadData = () => {
    try {
      const p = getProducteurSCI(fournisseurId);
      setProducteur(p);
      setParcelles(getParcellesProducteur(fournisseurId));
      setContrats(getContratsParProducteur(fournisseurId));
      setReferentiels(getReferentiels(true));
    } catch (e) {
      console.error('Erreur load producteur SCI:', e);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, [fournisseurId]));

  if (!producteur) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Chargement…</Text>
      </View>
    );
  }

  const handleChangerStatut = (nouveauStatut) => {
    updateProducteurSCI(fournisseurId, { statut_sci: nouveauStatut });
    setShowStatutModal(false);
    loadData();
  };

  const handleChangerConversion = (nouveauStatut) => {
    const update = { statut_conversion_bio: nouveauStatut };
    if (nouveauStatut === 'C1' && !producteur.date_debut_conversion_bio) {
      update.date_debut_conversion_bio = new Date().toISOString().split('T')[0];
    }
    updateProducteurSCI(fournisseurId, update);
    setShowConversionModal(false);
    loadData();
  };

  const handleToggleEngagement = (refCode) => {
    const aDeja = (producteur.engagements_actifs_array || []).includes(refCode);
    if (aDeja) {
      retirerEngagementProducteur(fournisseurId, refCode);
    } else {
      ajouterEngagementProducteur(fournisseurId, refCode);
    }
    loadData();
  };

  const handleSupprimerParcelle = (parcelleId, nom) => {
    Alert.alert(
      'Supprimer parcelle',
      `Supprimer "${nom}" ? La parcelle sera désactivée mais reste en historique.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            supprimerParcelleProducteur(parcelleId);
            loadData();
          },
        },
      ]
    );
  };

  const superficieTotale = parcelles.reduce((s, p) => s + (p.superficie_ha || 0), 0);
  const engagements = producteur.engagements_actifs_array || [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* En-tête */}
      <View style={styles.headerCard}>
        <Text style={styles.code}>{producteur.code || `#${producteur.id}`}</Text>
        <Text style={styles.nom}>{producteur.nom}</Text>
        {producteur.contact_telephone && (
          <Text style={styles.contact}>📞 {producteur.contact_telephone}</Text>
        )}
        {producteur.zone_collecte_code && (
          <Text style={styles.contact}>📍 Zone {producteur.zone_collecte_code}</Text>
        )}
      </View>

      {/* Statuts */}
      <View style={styles.statutsRow}>
        <TouchableOpacity
          style={[styles.statutCard, { borderColor: getStatutSCIColor(producteur.statut_sci) }]}
          onPress={() => setShowStatutModal(true)}
        >
          <Text style={styles.statutLabel}>Statut SCI</Text>
          <Text style={[styles.statutValue, { color: getStatutSCIColor(producteur.statut_sci) }]}>
            {getStatutSCILabel(producteur.statut_sci || 'prospect')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statutCard, { borderColor: getStatutConversionColor(producteur.statut_conversion_bio) }]}
          onPress={() => setShowConversionModal(true)}
        >
          <Text style={styles.statutLabel}>Conversion BIO</Text>
          <Text style={[styles.statutValue, { color: getStatutConversionColor(producteur.statut_conversion_bio) }]}>
            {getStatutConversionLabel(producteur.statut_conversion_bio || 'non_engage')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* KPI */}
      <View style={styles.kpiBanner}>
        <View style={styles.kpiCol}>
          <Text style={styles.kpiNum}>{parcelles.length}</Text>
          <Text style={styles.kpiLabel}>Parcelles</Text>
        </View>
        <View style={styles.kpiSep} />
        <View style={styles.kpiCol}>
          <Text style={styles.kpiNum}>{superficieTotale.toFixed(1)}</Text>
          <Text style={styles.kpiLabel}>Hectares</Text>
        </View>
        <View style={styles.kpiSep} />
        <View style={styles.kpiCol}>
          <Text style={styles.kpiNum}>{engagements.length}</Text>
          <Text style={styles.kpiLabel}>Engagements</Text>
        </View>
        <View style={styles.kpiSep} />
        <View style={styles.kpiCol}>
          <Text style={styles.kpiNum}>{contrats.length}</Text>
          <Text style={styles.kpiLabel}>Contrats</Text>
        </View>
      </View>

      {/* Section informations personnelles */}
      <Text style={styles.sectionTitle}>👤 Informations producteur</Text>
      <View style={styles.card}>
        {producteur.cni_numero && (
          <Row label="N° CNI" value={producteur.cni_numero} />
        )}
        {producteur.date_naissance && (
          <Row label="Date naissance" value={producteur.date_naissance} />
        )}
        {producteur.genre && (
          <Row label="Genre" value={producteur.genre === 'F' ? '♀ Femme' : producteur.genre === 'M' ? '♂ Homme' : producteur.genre} />
        )}
        {producteur.nb_personnes_foyer && (
          <Row label="Foyer" value={`${producteur.nb_personnes_foyer} personnes`} />
        )}
        {producteur.date_adhesion_sci && (
          <Row label="Adhésion SCI" value={producteur.date_adhesion_sci} />
        )}
        {producteur.risque_evalue && (
          <Row label="Niveau risque" value={producteur.risque_evalue} />
        )}
        {producteur.inspecteur_referent && (
          <Row label="Inspecteur réf." value={producteur.inspecteur_referent} />
        )}
        <TouchableOpacity
          style={styles.btnEdit}
          onPress={() => navigation.navigate('FournisseurForm', { fournisseurId, modeSCI: true })}
        >
          <Text style={styles.btnEditText}>✏️ Modifier les informations</Text>
        </TouchableOpacity>
      </View>

      {/* Section engagements */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>🛡️ Engagements certification</Text>
        <TouchableOpacity onPress={() => setShowEngagementModal(true)}>
          <Text style={styles.btnAdd}>+ Gérer</Text>
        </TouchableOpacity>
      </View>
      {engagements.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Aucun engagement actif</Text>
        </View>
      ) : (
        <View style={styles.engBadgesRow}>
          {engagements.map((code) => {
            const ref = referentiels.find((r) => r.code === code);
            return (
              <View key={code} style={styles.engBadge}>
                <Text style={styles.engBadgeText}>
                  {ref?.nom_court || code}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Section parcelles */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>🗺️ Parcelles ({parcelles.length})</Text>
        <TouchableOpacity onPress={() => navigation.navigate('ParcelleProducteurForm', { fournisseurId })}>
          <Text style={styles.btnAdd}>+ Ajouter</Text>
        </TouchableOpacity>
      </View>
      {parcelles.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Aucune parcelle enregistrée</Text>
          <Text style={styles.emptyHint}>
            La cartographie GPS des parcelles est obligatoire pour BIO + Fairtrade + RA
          </Text>
        </View>
      ) : (
        parcelles.map((p) => (
  <View key={p.id} style={{ marginBottom: 12 }}>
    <TouchableOpacity
      style={styles.parcelleCard}
      onLongPress={() => handleSupprimerParcelle(p.id, p.nom_parcelle)}
      onPress={() => navigation.navigate('ParcelleProducteurForm', { parcelleId: p.id, fournisseurId })}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.parcelleNom}>{p.nom_parcelle}</Text>
        <Text style={styles.parcelleInfo}>
          {p.culture_principale || '—'} · {p.superficie_ha?.toFixed(2) || '?'} ha
        </Text>
        {p.latitude && p.longitude && (
          <Text style={styles.parcelleGps}>
            📍 {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}
          </Text>
        )}
        {p.zone_collecte_code && (
          <Text style={styles.parcelleZone}>Zone {p.zone_collecte_code}</Text>
        )}
      </View>
      {p.statut_conversion_bio && p.statut_conversion_bio !== 'non_engage' && (
        <View style={[styles.bioPastille, { backgroundColor: getStatutConversionColor(p.statut_conversion_bio) }]}>
          <Text style={styles.bioPastilleText}>
            {p.statut_conversion_bio}
          </Text>
        </View>
      )}
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={{
        backgroundColor: '#2d7a2d',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        marginTop: 6,
        alignSelf: 'flex-start',
      }}
      onPress={() => navigation.navigate('ParcelleConversion', { parcelleId: p.id })}
    >
      <Text style={{ color: '#fff', fontSize: 12 }}>
        🌱 Conversion BIO {p.statut_conversion_actuel ? `· ${p.statut_conversion_actuel}` : ''}
      </Text>
    </TouchableOpacity>
  </View>
))
      )}

      {/* Section contrats */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>📋 Contrats ({contrats.length})</Text>
        <TouchableOpacity onPress={() => navigation.navigate('ContratForm', { fournisseurId })}>
          <Text style={styles.btnAdd}>+ Nouveau</Text>
        </TouchableOpacity>
      </View>
      {contrats.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Aucun contrat enregistré</Text>
          <Text style={styles.emptyHint}>
            Le contrat d'adhésion SCI est obligatoire pour membre actif
          </Text>
        </View>
      ) : (
        contrats.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={styles.contratCard}
            onPress={() => navigation.navigate('ContratForm', { contratId: c.id, fournisseurId })}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.contratType}>{getTypeContratLabel(c.type_contrat)}</Text>
              <Text style={styles.contratObjet} numberOfLines={1}>{c.objet}</Text>
              <Text style={styles.contratDate}>
                Signé {c.date_signature}
                {c.signe_par_producteur === 1 && ' · ✓ producteur'}
                {c.signe_par_operateur === 1 && ' · ✓ opérateur'}
              </Text>
            </View>
            {c.actif === 1 && <View style={styles.actifDot} />}
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))
      )}

      {/* Section inspections (placeholder Session 9b) */}
      <Text style={styles.sectionTitle}>🔍 Inspections SCI</Text>
      <View style={styles.placeholderBox}>
        <Text style={styles.placeholderText}>
          Le module inspections (planning, grilles BIO/Fairtrade/RA, rapports signés, sanctions) arrive en Session 9b.
        </Text>
      </View>

      {/* Notes SCI */}
      {producteur.notes_sci && (
        <View style={styles.notesBox}>
          <Text style={styles.notesTitle}>📝 Notes SCI</Text>
          <Text style={styles.notesText}>{producteur.notes_sci}</Text>
        </View>
      )}

      <View style={{ height: 40 }} />

      {/* Modal statut SCI */}
      <Modal visible={showStatutModal} transparent animationType="slide" onRequestClose={() => setShowStatutModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Statut SCI</Text>
            {STATUTS_SCI.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.modalItem, producteur.statut_sci === s && styles.modalItemSelected]}
                onPress={() => handleChangerStatut(s)}
              >
                <View style={[styles.modalDot, { backgroundColor: getStatutSCIColor(s) }]} />
                <Text style={styles.modalItemText}>{getStatutSCILabel(s)}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.btnClose} onPress={() => setShowStatutModal(false)}>
              <Text style={styles.btnCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal conversion BIO */}
      <Modal visible={showConversionModal} transparent animationType="slide" onRequestClose={() => setShowConversionModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Statut conversion BIO</Text>
            {STATUTS_CONVERSION_BIO.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.modalItem, producteur.statut_conversion_bio === s && styles.modalItemSelected]}
                onPress={() => handleChangerConversion(s)}
              >
                <View style={[styles.modalDot, { backgroundColor: getStatutConversionColor(s) }]} />
                <Text style={styles.modalItemText}>{getStatutConversionLabel(s)}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.btnClose} onPress={() => setShowConversionModal(false)}>
              <Text style={styles.btnCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal engagements */}
      <Modal visible={showEngagementModal} transparent animationType="slide" onRequestClose={() => setShowEngagementModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Engagements certification</Text>
            <Text style={styles.modalHint}>
              Activer/désactiver les référentiels auxquels ce producteur s'engage
            </Text>
            {referentiels.map((r) => {
              const aDeja = engagements.includes(r.code);
              return (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.modalItem, aDeja && styles.modalItemSelected]}
                  onPress={() => handleToggleEngagement(r.code)}
                >
                  <Text style={styles.modalCheckbox}>{aDeja ? '☑' : '☐'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalItemText}>{r.nom_court}</Text>
                    <Text style={styles.modalItemHint}>{r.code}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.btnClose} onPress={() => setShowEngagementModal(false)}>
              <Text style={styles.btnCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a2e1a' },
  content: { padding: 16 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a2e1a' },
  loadingText: { color: '#a8c8a8' },

  // En-tête
  headerCard: {
    backgroundColor: '#243d24',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#7ec87e',
  },
  code: {
    fontSize: 11,
    color: '#7ec87e',
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  nom: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginVertical: 4,
  },
  contact: {
    fontSize: 13,
    color: '#a8c8a8',
    marginTop: 2,
  },

  // Statuts row
  statutsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statutCard: {
    flex: 1,
    backgroundColor: '#243d24',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
  },
  statutLabel: {
    fontSize: 10,
    color: '#7a9a7a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statutValue: {
    fontSize: 14,
    fontWeight: '600',
  },

  // KPI
  kpiBanner: {
    flexDirection: 'row',
    backgroundColor: '#243d24',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  kpiCol: { flex: 1, alignItems: 'center' },
  kpiSep: { width: 1, height: 24, backgroundColor: '#3a5a3a' },
  kpiNum: { fontSize: 20, fontWeight: 'bold', color: '#7ec87e' },
  kpiLabel: { fontSize: 10, color: '#a8c8a8', marginTop: 2 },

  // Sections
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#7ec87e',
    marginTop: 16,
    marginBottom: 8,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  btnAdd: {
    fontSize: 13,
    color: '#d4a04a',
    fontWeight: '600',
  },

  // Card
  card: {
    backgroundColor: '#243d24',
    borderRadius: 10,
    padding: 12,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#2d4a2d',
  },
  rowLabel: { width: 110, fontSize: 12, color: '#7a9a7a' },
  rowValue: { flex: 1, fontSize: 13, color: '#fff' },
  btnEdit: {
    marginTop: 10,
    padding: 8,
    alignItems: 'center',
    backgroundColor: '#1a2e1a',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3a5a3a',
  },
  btnEditText: { color: '#7ec87e', fontSize: 12, fontWeight: '600' },

  // Engagements
  engBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  engBadge: {
    backgroundColor: '#1f3a1f',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#7ec87e',
  },
  engBadgeText: { color: '#7ec87e', fontSize: 11, fontWeight: '600' },

  // Empty
  empty: {
    backgroundColor: '#1f2f1f',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2d4a2d',
    borderStyle: 'dashed',
  },
  emptyText: { color: '#a8c8a8', fontSize: 13 },
  emptyHint: { color: '#7a9a7a', fontSize: 11, fontStyle: 'italic', marginTop: 4, textAlign: 'center' },

  // Parcelles
  parcelleCard: {
    backgroundColor: '#243d24',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  parcelleNom: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 2 },
  parcelleInfo: { fontSize: 12, color: '#a8c8a8' },
  parcelleGps: { fontSize: 11, color: '#7ec87e', fontFamily: 'monospace', marginTop: 2 },
  parcelleZone: { fontSize: 10, color: '#7a9a7a', fontStyle: 'italic', marginTop: 2 },
  bioPastille: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  bioPastilleText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  chevron: { color: '#7ec87e', fontSize: 22 },

  // Contrats
  contratCard: {
    backgroundColor: '#243d24',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contratType: { fontSize: 13, fontWeight: '600', color: '#fff' },
  contratObjet: { fontSize: 12, color: '#a8c8a8', marginTop: 2 },
  contratDate: { fontSize: 11, color: '#7a9a7a', marginTop: 2 },
  actifDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#7ec87e' },

  // Placeholder
  placeholderBox: {
    backgroundColor: '#1f2c38',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#7eaac8',
  },
  placeholderText: { color: '#a8c8e8', fontSize: 12, lineHeight: 17 },

  // Notes
  notesBox: {
    backgroundColor: '#243d24',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#d4a04a',
  },
  notesTitle: { color: '#d4a04a', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  notesText: { color: '#fff', fontSize: 13, lineHeight: 18 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a2e1a',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7ec87e',
    marginBottom: 12,
  },
  modalHint: {
    fontSize: 12,
    color: '#a8c8a8',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#243d24',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    gap: 10,
  },
  modalItemSelected: {
    borderWidth: 2,
    borderColor: '#7ec87e',
  },
  modalDot: { width: 12, height: 12, borderRadius: 6 },
  modalCheckbox: { fontSize: 18, color: '#7ec87e' },
  modalItemText: { fontSize: 14, color: '#fff', fontWeight: '500' },
  modalItemHint: { fontSize: 11, color: '#7a9a7a', fontFamily: 'monospace' },
  btnClose: {
    marginTop: 12,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#3a5a3a',
    borderRadius: 8,
  },
  btnCloseText: { color: '#7ec87e', fontWeight: '600' },
});