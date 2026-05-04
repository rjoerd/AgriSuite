// ============================================================
// AgriSuite Madagascar — Phase 3 / Session 6 livraison 1
// screens/PasseportPdfPreviewScreen.js
//
// Écran d'aperçu PDF du passeport lot.
// Workflow :
//   1. Réception du lotId depuis LotDetailScreen
//   2. Génération du PDF via genererPdfPasseport(lotId)
//   3. Aperçu via WebView qui affiche le HTML source (pour iOS/Android)
//   4. Actions : Partager / Imprimer / Enregistrer
//
// Note : on affiche le HTML source dans la WebView (pas le PDF lui-même)
// pour avoir un aperçu rapide. Le partage/impression utilisent le vrai PDF.
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Sharing from 'expo-sharing';
import {
  genererHtmlPasseport,
  genererPdfPasseport,
  imprimerPasseport,
} from '../services/pdfPasseport';
import { getLotById } from '../database/exportTrack';
import { getParametresEntreprise } from '../database/parametresEntreprise';

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function PasseportPdfPreviewScreen({ navigation, route }) {
  const lotId = route?.params?.lotId;

  const [lot, setLot] = useState(null);
  const [html, setHtml] = useState('');
  const [pdfUri, setPdfUri] = useState(null);
  const [generationEnCours, setGenerationEnCours] = useState(true);
  const [actionEnCours, setActionEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [langue, setLangue] = useState('fr');

  // ============================================================
  // GÉNÉRATION INITIALE
  // ============================================================

  // ─── Initialisation : récupère la langue par défaut depuis les paramètres ───
  useEffect(() => {
    try {
      const params = getParametresEntreprise();
      if (params && params.langue_pdf_defaut) {
        setLangue(params.langue_pdf_defaut);
      }
    } catch (e) {}
  }, []);

  // ─── Génération à chaque changement de lotId ou de langue ───
  useEffect(() => {
    let actif = true;
    setGenerationEnCours(true);
    setPdfUri(null);

    (async () => {
      try {
        const l = getLotById(lotId);
        if (!l) {
          setErreur('Lot introuvable');
          setGenerationEnCours(false);
          return;
        }
        if (actif) setLot(l);

        // Étape 1 : génération du HTML pour aperçu instantané
        const htmlPasseport = genererHtmlPasseport(lotId, langue);
        if (actif) setHtml(htmlPasseport);

        // Étape 2 : génération du PDF en arrière-plan
        const { uri } = await genererPdfPasseport(lotId, langue);
        if (actif) {
          setPdfUri(uri);
          setGenerationEnCours(false);
        }
      } catch (err) {
        console.error('[PasseportPdfPreview] Erreur génération :', err);
        if (actif) {
          setErreur(err.message || 'Erreur de génération du PDF');
          setGenerationEnCours(false);
        }
      }
    })();
    return () => { actif = false; };
  }, [lotId, langue]);

  // ============================================================
  // ACTIONS
  // ============================================================

  const partager = async () => {
    if (!pdfUri) {
      Alert.alert('PDF non prêt', 'Le PDF est encore en cours de génération, attends une seconde.');
      return;
    }
    setActionEnCours(true);
    try {
      const dispo = await Sharing.isAvailableAsync();
      if (!dispo) {
        Alert.alert(
          'Partage indisponible',
          'Le partage natif n\'est pas disponible sur cet appareil.'
        );
        return;
      }
      await Sharing.shareAsync(pdfUri, {
        UTI: 'com.adobe.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Passeport lot ${lot?.code_lot}`,
      });
    } catch (err) {
      console.error('[PasseportPdfPreview] Erreur partage :', err);
      Alert.alert('Erreur de partage', err.message || 'Impossible de partager le PDF.');
    } finally {
      setActionEnCours(false);
    }
  };

  const imprimer = async () => {
    setActionEnCours(true);
    try {
      await imprimerPasseport(lotId, langue);
    } catch (err) {
      console.error('[PasseportPdfPreview] Erreur impression :', err);
      // L'utilisateur a peut-être annulé la boîte d'impression — pas une vraie erreur
      if (!err.message?.toLowerCase().includes('cancel')) {
        Alert.alert('Erreur d\'impression', err.message || 'Impossible d\'imprimer.');
      }
    } finally {
      setActionEnCours(false);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  if (erreur) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0d1a0d" />
        <View style={styles.headerSimple}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.btnRetour}>‹ Retour</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitre}>Passeport PDF</Text>
        </View>
        <View style={styles.erreurBox}>
          <Text style={styles.erreurTitre}>⚠️ Erreur</Text>
          <Text style={styles.erreurTexte}>{erreur}</Text>
          <TouchableOpacity
            style={styles.btnRetourErreur}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.btnRetourErreurTexte}>Retour au lot</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d1a0d" />

      {/* En-tête */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.btnRetour}>‹ Retour</Text>
        </TouchableOpacity>
        <View style={styles.headerCentre}>
          <Text style={styles.headerTitre}>📄 Passeport PDF</Text>
          {lot && (
            <Text style={styles.headerSousTitre} numberOfLines={1}>
              {lot.code_lot}
            </Text>
          )}
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* Toggle langue FR / EN */}
      <View style={styles.langueBar}>
        <Text style={styles.langueLabel}>Langue :</Text>
        <View style={styles.langueToggle}>
          <TouchableOpacity
            style={[styles.langueBtn, langue === 'fr' && styles.langueBtnActif]}
            onPress={() => setLangue('fr')}
            disabled={generationEnCours || actionEnCours}
          >
            <Text style={[
              styles.langueBtnTexte,
              langue === 'fr' && styles.langueBtnTexteActif,
            ]}>
              🇫🇷 FR
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langueBtn, langue === 'en' && styles.langueBtnActif]}
            onPress={() => setLangue('en')}
            disabled={generationEnCours || actionEnCours}
          >
            <Text style={[
              styles.langueBtnTexte,
              langue === 'en' && styles.langueBtnTexteActif,
            ]}>
              🇬🇧 EN
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Aperçu WebView */}
      <View style={styles.previewContainer}>
        {html ? (
          <WebView
            source={{ html }}
            style={styles.webview}
            originWhitelist={['*']}
            scalesPageToFit={Platform.OS === 'android'}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.webviewLoading}>
                <ActivityIndicator size="large" color="#7ec87e" />
                <Text style={styles.loadingTexte}>Chargement de l'aperçu…</Text>
              </View>
            )}
          />
        ) : (
          <View style={styles.webviewLoading}>
            <ActivityIndicator size="large" color="#7ec87e" />
            <Text style={styles.loadingTexte}>Génération de l'aperçu…</Text>
          </View>
        )}
      </View>

      {/* Bandeau "génération PDF en cours" */}
      {generationEnCours && (
        <View style={styles.genBandeau}>
          <ActivityIndicator size="small" color="#d4a04a" />
          <Text style={styles.genBandeauTexte}>
            Génération du fichier PDF en arrière-plan…
          </Text>
        </View>
      )}

      {/* Barre d'actions */}
      <View style={styles.actionsBar}>
        <TouchableOpacity
          style={[styles.actionBtn, (!pdfUri || actionEnCours) && styles.actionBtnDisabled]}
          onPress={partager}
          disabled={!pdfUri || actionEnCours}
        >
          <Text style={styles.actionBtnIcon}>📤</Text>
          <Text style={styles.actionBtnTexte}>Partager / Enregistrer</Text>
          <Text style={styles.actionBtnSousTexte}>WhatsApp, email, Drive...</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, actionEnCours && styles.actionBtnDisabled]}
          onPress={imprimer}
          disabled={actionEnCours}
        >
          <Text style={styles.actionBtnIcon}>🖨️</Text>
          <Text style={styles.actionBtnTexte}>Imprimer</Text>
          <Text style={styles.actionBtnSousTexte}>Ou enregistrer en PDF</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const COLORS = {
  bgDark: '#0d1a0d',
  bgCard: '#1a2e1a',
  bgWeb: '#ffffff',
  border: '#2d4a2d',
  vert: '#7ec87e',
  vertClair: '#a8d9a8',
  ambre: '#d4a04a',
  texteDoux: '#c8d4c8',
  texteSecond: '#8a9a8a',
  rouge: '#c87e7e',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },

  // En-tête
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: 14,
    backgroundColor: COLORS.bgDark,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerSimple: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: 14,
  },
  headerCentre: { flex: 1, alignItems: 'center' },
  btnRetour: {
    color: COLORS.vert,
    fontSize: 14,
    width: 60,
  },
  headerTitre: {
    color: COLORS.ambre,
    fontSize: 16,
    fontWeight: '700',
  },
  headerSousTitre: {
    color: COLORS.texteSecond,
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 2,
  },

  // Toggle langue
  langueBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.bgDark,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  langueLabel: {
    color: COLORS.texteSecond,
    fontSize: 12,
    fontWeight: '500',
  },
  langueToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  langueBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  langueBtnActif: {
    backgroundColor: COLORS.ambre,
  },
  langueBtnTexte: {
    color: COLORS.texteSecond,
    fontSize: 13,
    fontWeight: '600',
  },
  langueBtnTexteActif: {
    color: '#0d1a0d',
  },

  // Aperçu
  previewContainer: {
    flex: 1,
    backgroundColor: COLORS.bgWeb,
    margin: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  webview: { flex: 1 },
  webviewLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bgWeb,
  },
  loadingTexte: {
    color: COLORS.texteSecond,
    fontSize: 12,
    marginTop: 10,
  },

  // Bandeau génération en cours
  genBandeau: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#2a2014',
    gap: 8,
  },
  genBandeauTexte: {
    color: COLORS.ambre,
    fontSize: 11,
    fontStyle: 'italic',
  },

  // Barre d'actions
  actionsBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionBtnDisabled: { opacity: 0.4 },
  actionBtnIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  actionBtnTexte: {
    color: COLORS.texteDoux,
    fontSize: 12,
    fontWeight: '600',
  },
  actionBtnSousTexte: {
    color: COLORS.texteSecond,
    fontSize: 9,
    marginTop: 2,
    fontStyle: 'italic',
  },

  // Erreur
  erreurBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  erreurTitre: {
    color: COLORS.rouge,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  erreurTexte: {
    color: COLORS.texteDoux,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  btnRetourErreur: {
    backgroundColor: COLORS.bgCard,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnRetourErreurTexte: {
    color: COLORS.vertClair,
    fontSize: 14,
    fontWeight: '600',
  },
});