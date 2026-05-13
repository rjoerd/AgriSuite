// screens/ReferentielDetailScreen.js
// Fiche détaillée d'un référentiel + liste de ses engagements
// Phase 3 Session 7

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  getReferentielById,
  getStatutLabel,
  getStatutColor,
  getTypeReferentielColor,
  getTypeReferentielLabel,
} from '../database/certifTrack';
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('certifpilot.db');

// Helper local : récupérer tous les engagements d'un référentiel
const getEngagementsByReferentiel = (referentielId) => {
  return db.getAllSync(
    `SELECT * FROM engagements_certif 
     WHERE referentiel_id = ? 
     ORDER BY created_at DESC`,
    [referentielId]
  );
};

export default function ReferentielDetailScreen({ route, navigation }) {
  const { referentielId } = route.params;
  const [referentiel, setReferentiel] = useState(null);
  const [engagements, setEngagements] = useState([]);

  const loadData = () => {
    try {
      const ref = getReferentielById(referentielId);
      setReferentiel(ref);
      setEngagements(getEngagementsByReferentiel(referentielId));
    } catch (error) {
      console.error('Erreur chargement référentiel:', error);
      Alert.alert('Erreur', 'Impossible de charger le référentiel');
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [referentielId])
  );

  if (!referentiel) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Chargement…</Text>
      </View>
    );
  }

  const handleOpenWebsite = () => {
    if (!referentiel.site_web) return;
    Linking.openURL(referentiel.site_web).catch(() =>
      Alert.alert('Erreur', 'Impossible d\'ouvrir le lien')
    );
  };

  const typeColor = getTypeReferentielColor(referentiel.type_referentiel);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* En-tête avec bandeau coloré type */}
      <View style={[styles.headerBanner, { backgroundColor: typeColor }]}>
        <Text style={styles.headerType}>{getTypeReferentielLabel(referentiel.type_referentiel)}</Text>
      </View>

      <View style={styles.headerCard}>
        <Text style={styles.code}>{referentiel.code}</Text>
        <Text style={styles.nomCourt}>{referentiel.nom_court}</Text>
        <Text style={styles.nomComplet}>{referentiel.nom_complet}</Text>
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Description</Text>
        <Text style={styles.description}>{referentiel.description}</Text>
      </View>

      {/* Métadonnées */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏛️ Référence</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Organisme émetteur</Text>
          <Text style={styles.infoValue}>{referentiel.organisme_emetteur}</Text>
        </View>

        {referentiel.version_reference && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version / règlement</Text>
            <Text style={styles.infoValue}>{referentiel.version_reference}</Text>
          </View>
        )}

        {referentiel.pays_origine && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Origine</Text>
            <Text style={styles.infoValue}>{referentiel.pays_origine}</Text>
          </View>
        )}

        {referentiel.perimetre_produits && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Périmètre produits</Text>
            <Text style={styles.infoValue}>{referentiel.perimetre_produits}</Text>
          </View>
        )}
      </View>

      {/* Conversion (si applicable) */}
      {(referentiel.duree_conversion_annuelles || referentiel.duree_conversion_perennes) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏳ Durée de conversion</Text>
          {referentiel.duree_conversion_annuelles && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Cultures annuelles</Text>
              <Text style={styles.infoValue}>{referentiel.duree_conversion_annuelles} mois</Text>
            </View>
          )}
          {referentiel.duree_conversion_perennes && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Cultures pérennes</Text>
              <Text style={styles.infoValue}>{referentiel.duree_conversion_perennes} mois</Text>
            </View>
          )}
        </View>
      )}

      {/* SCI obligatoire ? */}
      {referentiel.exige_sci === 1 && (
        <View style={[styles.section, styles.sciAlert]}>
          <Text style={styles.sciTitle}>⚠️ Système de Contrôle Interne (SCI) obligatoire</Text>
          <Text style={styles.sciText}>
            Ce référentiel exige la mise en place d'un SCI pour la certification de groupes de
            producteurs. Cartographie des parcelles, contrats individuels, inspections internes
            annuelles, registre des sanctions. Le module SCI complet arrive en CertifTrack v3
            (Session 9).
          </Text>
        </View>
      )}

      {/* Certificateurs et coût */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏢 Audit & coûts</Text>

        {referentiel.organismes_certificateurs && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Organismes certificateurs</Text>
            <Text style={styles.infoValue}>{referentiel.organismes_certificateurs}</Text>
          </View>
        )}

        {referentiel.cout_indicatif_eur && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Coût indicatif</Text>
            <Text style={styles.infoValue}>{referentiel.cout_indicatif_eur}</Text>
          </View>
        )}
      </View>

      {/* Site web */}
      {referentiel.site_web && (
        <TouchableOpacity style={styles.webButton} onPress={handleOpenWebsite}>
          <Text style={styles.webButtonText}>🌐 Site officiel</Text>
        </TouchableOpacity>
      )}

      {/* Engagements actifs */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          🎯 Engagements ({engagements.length})
        </Text>

        {engagements.length === 0 ? (
          <View style={styles.emptyEng}>
            <Text style={styles.emptyEngText}>
              Aucun lot, site ou culture n'est encore engagé sur ce référentiel.
            </Text>
            <Text style={styles.emptyEngHint}>
              Pour engager une cible, ouvre la fiche du lot, du site ou de la culture
              et utilise le bouton « Certifications visées ».
            </Text>
          </View>
        ) : (
          engagements.map((eng) => (
            <View key={eng.id} style={styles.engCard}>
              <View style={styles.engCardHeader}>
                <Text style={styles.engCible}>
                  {eng.cible_type === 'lot' && '📦 Lot'}
                  {eng.cible_type === 'site' && '🗺️ Site'}
                  {eng.cible_type === 'culture' && '🌱 Culture'}
                  {' #'}
                  {eng.cible_id}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatutColor(eng.statut) }]}>
                  <Text style={styles.statusText}>{getStatutLabel(eng.statut)}</Text>
                </View>
              </View>

              <Text style={styles.engDate}>Engagé le {eng.date_engagement}</Text>

              {eng.numero_certificat && (
                <Text style={styles.engCertificat}>📄 Certificat : {eng.numero_certificat}</Text>
              )}
              {eng.organisme_certificateur && (
                <Text style={styles.engOrganisme}>🏢 {eng.organisme_certificateur}</Text>
              )}
              {eng.notes && <Text style={styles.engNotes}>💬 {eng.notes}</Text>}
            </View>
          ))
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a2e1a',
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a2e1a',
  },
  loadingText: {
    color: '#a8c8a8',
    fontSize: 14,
  },

  // En-tête
  headerBanner: {
    height: 6,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  headerCard: {
    backgroundColor: '#243d24',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  code: {
    fontSize: 11,
    color: '#7ec87e',
    fontFamily: 'monospace',
    marginBottom: 4,
    letterSpacing: 1,
  },
  nomCourt: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  nomComplet: {
    fontSize: 13,
    color: '#a8c8a8',
    lineHeight: 18,
  },

  // Sections
  section: {
    backgroundColor: '#243d24',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#7ec87e',
    marginBottom: 10,
  },
  description: {
    fontSize: 13,
    color: '#d0d8d0',
    lineHeight: 19,
  },

  // Info rows
  infoRow: {
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 11,
    color: '#7a9a7a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    color: '#fff',
    lineHeight: 18,
  },

  // SCI alert
  sciAlert: {
    borderLeftWidth: 4,
    borderLeftColor: '#d4a04a',
  },
  sciTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#d4a04a',
    marginBottom: 6,
  },
  sciText: {
    fontSize: 12,
    color: '#d0d8d0',
    lineHeight: 17,
  },

  // Bouton site web
  webButton: {
    backgroundColor: '#3a5a3a',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  webButtonText: {
    fontSize: 14,
    color: '#7ec87e',
    fontWeight: '600',
  },

  // Engagements
  engCard: {
    backgroundColor: '#1f2f1f',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#7ec87e',
  },
  engCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  engCible: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  engDate: {
    fontSize: 11,
    color: '#a8c8a8',
    marginBottom: 4,
  },
  engCertificat: {
    fontSize: 12,
    color: '#7ec87e',
    marginTop: 2,
  },
  engOrganisme: {
    fontSize: 12,
    color: '#a8c8a8',
    marginTop: 2,
  },
  engNotes: {
    fontSize: 12,
    color: '#d0d8d0',
    fontStyle: 'italic',
    marginTop: 4,
  },

  emptyEng: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyEngText: {
    fontSize: 13,
    color: '#a8c8a8',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyEngHint: {
    fontSize: 11,
    color: '#7a9a7a',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 16,
  },
});