// ============================================================
// AgriSuite Madagascar — Phase 3 / Session 5 partie 1
// screens/LotDetailScreen.js
//
// VERSION v2 — affichage complet du cycle de vie d'un lot.
//
// Sections affichées :
//   1. Identité (code, filière, culture, dates, statut, créé par)
//   2. Origine (différente filière A vs B)
//   3. Étapes post-récolte (chronologiques, qty entrée → sortie → perte)
//   4. Analyses qualité (humidité, vanilline, taille...)
//   5. Conditionnements
//
// Actions disponibles :
//   - Bouton '+' à droite de chaque section pour ajouter
//   - Bouton 'Clôturer' bien visible en haut (danger explicite)
//   - Sections vides : placeholder cliquable pour ajout
//
// La plupart des actions de saisie (étape, analyse, conditionnement)
// pointent vers des écrans dédiés à venir (Session 5 partie 2).
// Pour l'instant, ces boutons affichent une alerte explicative.
// ============================================================

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Alert,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  getLotById,
  getEtapesByLot,
  getAnalysesByLot,
  getConditionnementsByLot,
  getBonsCollecteByLot,
  getFournisseurById,
  getQuantiteActuelleLot,
} from '../database/exportTrack';
import { getCultureById } from '../database/cropEngine';

import { getSiteById, getParcelleById } from '../database/db';
import { getEngagementsForCible, getStatutLabel, getStatutColor, getScoreEngagement, countExigencesByReferentiel } from '../database/certifTrack';

// ============================================================
// HELPERS
// ============================================================

const formatKg = (kg) => {
  if (kg == null || isNaN(kg)) return '—';
  if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t`;
  if (kg >= 100) return `${kg.toFixed(0)} kg`;
  return `${kg.toFixed(1)} kg`;
};

const formatPct = (pct) => {
  if (pct == null || isNaN(pct)) return '—';
  return `${pct.toFixed(1)} %`;
};

const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  });
};

const STATUTS = {
  en_cours:  { label: 'En cours',  color: '#7eaac8', bg: '#1f2c38' },
  cloture:   { label: 'Clôturé',   color: '#7ec87e', bg: '#1f2e1f' },
  rectifie:  { label: 'Rectifié',  color: '#c87e7e', bg: '#2c1f1f' },
};

const TYPES_ETAPE = {
  tri:           { label: '🌾 Tri',           color: '#d4c47e' },
  sechage:       { label: '☀️ Séchage',       color: '#d4a04a' },
  calibrage:     { label: '⚖️ Calibrage',    color: '#7eaac8' },
  fermentation:  { label: '🧪 Fermentation', color: '#c8a07e' },
  echaudage:     { label: '♨️ Échaudage',    color: '#e07e7e' },
  decorticage:   { label: '🥥 Décorticage',   color: '#a8a07e' },
  torrefaction:  { label: '☕ Torréfaction',  color: '#8b5a3c' },
  broyage:       { label: '🌀 Broyage',       color: '#9b8a7e' },
  autre:         { label: '⚙️ Autre',         color: '#8a9a8a' },
};

const TYPES_ANALYSE = {
  humidite:      { label: '💧 Humidité',     unite_def: '%' },
  vanilline:     { label: '🌿 Vanilline',    unite_def: '%' },
  taille:        { label: '📏 Taille',       unite_def: 'cm' },
  couleur:       { label: '🎨 Couleur',      unite_def: '' },
  aflatoxine:    { label: '⚠️ Aflatoxine',   unite_def: 'µg/kg' },
  ochratoxine:   { label: '⚠️ Ochratoxine A', unite_def: 'µg/kg' },
  pesticides:    { label: '🧪 Pesticides',   unite_def: '' },
  microbiologie: { label: '🦠 Microbiologie', unite_def: '' },
  metaux:        { label: '⚗️ Métaux lourds', unite_def: 'mg/kg' },
  organoleptique: { label: '👃 Organoleptique', unite_def: '' },
  autre:         { label: '🔬 Autre',        unite_def: '' },
};

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function LotDetailScreen({ navigation, route }) {
  const lotId = route?.params?.lotId;

  const [lot, setLot] = useState(null);
  const [culture, setCulture] = useState(null);
  const [site, setSite] = useState(null);
  const [parcelle, setParcelle] = useState(null);
  const [recolteSource, setRecolteSource] = useState(null);
  const [bonsCollecte, setBonsCollecte] = useState([]);
  const [fournisseursIdx, setFournisseursIdx] = useState({});
  const [etapes, setEtapes] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [conditionnements, setConditionnements] = useState([]);
  const [engagements, setEngagements] = useState([]);
  const [quantiteActuelle, setQuantiteActuelle] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [menuOuvert, setMenuOuvert] = useState(false);

  const charger = useCallback(() => {
    try {
      const l = getLotById(lotId);
      if (!l) {
        Alert.alert(
          'Lot introuvable',
          'Ce lot n\'existe pas ou a été supprimé.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }
      setLot(l);

      // Culture
      try { setCulture(getCultureById(l.culture_id)); } catch (e) {}

      // Origine filière A
      if (l.filiere === 'production') {
        if (l.site_id) {
          try { setSite(getSiteById(l.site_id)); } catch (e) {}
        }
        if (l.parcelle_id) {
          try { setParcelle(getParcelleById(l.parcelle_id)); } catch (e) {}
        }
        if (l.recolte_maraichere_id) {
          try { setRecolteSource(getRecolteById(l.recolte_maraichere_id)); } catch (e) {}
        }
      }

      // Origine filière B
      if (l.filiere === 'collecte') {
        const bons = getBonsCollecteByLot(lotId) || [];
        setBonsCollecte(bons);

        // Index fournisseurs
        const fIds = [...new Set(bons.map((b) => b.fournisseur_id))];
        const idx = {};
        for (const fid of fIds) {
          try {
            const f = getFournisseurById(fid);
            if (f) idx[fid] = f;
          } catch (e) {}
        }
        setFournisseursIdx(idx);
      }

// Traçabilité
      setEtapes(getEtapesByLot(lotId) || []);
      setAnalyses(getAnalysesByLot(lotId) || []);
      setConditionnements(getConditionnementsByLot(lotId) || []);

// Engagements certifications + score audit pour chaque
      try {
        const engs = getEngagementsForCible('lot', lotId) || [];
        const engsAvecScore = engs.map((eng) => {
          let score = null;
          let nbExigences = 0;
          try { score = getScoreEngagement(eng.id); } catch (e) {}
          try {
            // récupérer ref_id depuis l'engagement (champ referentiel_id)
            nbExigences = countExigencesByReferentiel(eng.referentiel_id);
          } catch (e) {}
          return { ...eng, _score: score, _nbExigences: nbExigences };
        });
        setEngagements(engsAvecScore);
      } catch (e) { setEngagements([]); }

      // Quantité actuelle (via dernière étape ou somme bons)
      try { setQuantiteActuelle(getQuantiteActuelleLot(lotId)); }
      catch (e) { setQuantiteActuelle(0); }
    } catch (err) {
      console.error('[LotDetail] Erreur chargement :', err);
    }
  }, [lotId, navigation]);

  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    charger();
    setTimeout(() => setRefreshing(false), 400);
  }, [charger]);

  // ============================================================
  // VARIABLES DÉRIVÉES
  // ============================================================

  const isCloture = !!lot?.est_cloture;
  const isRectifie = !!lot?.est_rectifie_par;
  const statutInfo = lot?.est_rectifie_par
    ? STATUTS.rectifie
    : (isCloture ? STATUTS.cloture : STATUTS.en_cours);

  const cultureNom = useMemo(() => {
    return culture ? (culture.nom_fr || culture.nom) : `Culture #${lot?.culture_id}`;
  }, [culture, lot]);

  const fournisseursDistincts = useMemo(() => {
    return Object.values(fournisseursIdx);
  }, [fournisseursIdx]);

  // Quantité brute initiale (du lot ou somme bons)
  const quantiteInitiale = useMemo(() => {
    if (lot?.quantite_brute_kg) return lot.quantite_brute_kg;
    if (lot?.filiere === 'collecte' && bonsCollecte.length > 0) {
      return bonsCollecte.reduce((s, b) => s + (b.quantite_kg || 0), 0);
    }
    return 0;
  }, [lot, bonsCollecte]);

  const totalPerte = useMemo(() => {
    return etapes.reduce((s, e) => s + (e.perte_kg || 0), 0);
  }, [etapes]);

  // ============================================================
  // ACTIONS
  // ============================================================

  const ouvrirCloture = () => {
    navigation.navigate('LotCloture', { lotId });
  };

  const ouvrirEtape = () => {
    navigation.navigate('EtapeForm', { lotId });
  };

  const ouvrirAnalyse = () => {
    navigation.navigate('AnalyseQualiteForm', { lotId });
  };

  const ouvrirConditionnement = () => {
    navigation.navigate('ConditionnementForm', { lotId });
  };

  const voirRecolteSource = () => {
    Alert.alert(
      '🌱 Récolte source',
      `Cette récolte de ${recolteSource?.quantite_kg} kg de ${recolteSource?.culture_nom || cultureNom} a été saisie dans MaraîcherGuide le ${formatDate(recolteSource?.date_recolte)}.\n\nOuverture détaillée à venir.`,
      [{ text: 'OK' }]
    );
    // À activer plus tard si on crée une route RecolteDetail
  };

  // ============================================================
  // RENDER
  // ============================================================

  if (!lot) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0d1a0d" />
        <View style={styles.loadingBox}>
          <Text style={styles.loadingTexte}>Chargement…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d1a0d" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#7ec87e"
          />
        }
      >
        {/* En-tête avec bouton retour + menu actions */}
        <View style={styles.headerNav}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.btnRetour}>‹ Retour</Text>
          </TouchableOpacity>
          {/* Menu "..." — visible seulement pour les lots non rectifiés */}
          {!isRectifie && (
            <TouchableOpacity
              style={styles.btnMenu}
              onPress={() => setMenuOuvert(true)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.btnMenuTexte}>⋯</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* CARTE IDENTITÉ — code lot en grand */}
        <View style={styles.cardIdentite}>
          <View style={styles.identiteLigne1}>
            <View style={[styles.statutPastille, { backgroundColor: statutInfo.bg, borderColor: statutInfo.color }]}>
              <Text style={[styles.statutTexte, { color: statutInfo.color }]}>
                {statutInfo.label}
              </Text>
            </View>
            <View style={[styles.filiereBadge, lot.filiere === 'collecte' && styles.filiereBadgeCollecte]}>
              <Text style={[styles.filiereBadgeTexte, lot.filiere === 'collecte' && styles.filiereBadgeTexteCollecte]}>
                {lot.filiere === 'production' ? '🏡 PRODUCTION' : '🤝 COLLECTE'}
              </Text>
            </View>
          </View>
          <Text style={styles.codeLotGrand}>{lot.code_lot}</Text>
          <Text style={styles.cultureLotNom}>{cultureNom}{lot.variete ? ` · ${lot.variete}` : ''}</Text>
        </View>

        {/* QUANTITÉS */}
        <View style={styles.cardQuantites}>
          <View style={styles.quantiteBloc}>
            <Text style={styles.quantiteLabel}>Brut initial</Text>
            <Text style={styles.quantiteValeur}>{formatKg(quantiteInitiale)}</Text>
          </View>
          <View style={styles.quantiteSep} />
          <View style={styles.quantiteBloc}>
            <Text style={styles.quantiteLabel}>Actuel</Text>
            <Text style={[styles.quantiteValeur, styles.quantiteValeurFort]}>
              {formatKg(quantiteActuelle || quantiteInitiale)}
            </Text>
          </View>
          {totalPerte > 0 && (
            <>
              <View style={styles.quantiteSep} />
              <View style={styles.quantiteBloc}>
                <Text style={styles.quantiteLabel}>Perte</Text>
                <Text style={[styles.quantiteValeur, styles.quantiteValeurPerte]}>
                  -{formatKg(totalPerte)}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* BOUTON CLÔTURER — visible si en cours */}
        {!isCloture && !isRectifie && (
          <TouchableOpacity style={styles.btnCloturer} onPress={ouvrirCloture}>
            <Text style={styles.btnCloturerIcone}>🔒</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.btnCloturerTitre}>Clôturer le lot</Text>
              <Text style={styles.btnCloturerSous}>
                Action définitive — le lot devient officiel
              </Text>
            </View>
            <Text style={styles.btnCloturerChevron}>›</Text>
          </TouchableOpacity>
        )}

        {/* BOUTON PASSEPORT PDF — toujours disponible */}
        <TouchableOpacity
          style={styles.btnPdf}
          onPress={() => navigation.navigate('PasseportPdfPreview', { lotId })}
        >
          <Text style={styles.btnPdfIcone}>📄</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.btnPdfTitre}>Passeport PDF</Text>
            <Text style={styles.btnPdfSous}>
              Document de traçabilité — partage / impression
            </Text>
          </View>
          <Text style={styles.btnPdfChevron}>›</Text>
        </TouchableOpacity>

        {/* Mention rectifié */}
        {isRectifie && (
          <View style={styles.cardRectifie}>
            <Text style={styles.cardRectifieTitre}>
              ⚠ Lot rectifié
            </Text>
            <Text style={styles.cardRectifieTexte}>
              Ce lot a été remplacé par un nouveau lot rectificatif. Cette
              version reste en base pour l'audit, mais ne doit plus être utilisée.
            </Text>
          </View>
        )}
<TouchableOpacity
  style={{
    backgroundColor: '#d4a04a',
    padding: 14,
    borderRadius: 8,
    marginVertical: 8,
    alignItems: 'center',
  }}
  onPress={() => navigation.navigate('VerifLot', {
    lotId: lot.id,
    lotCode: lot.code_lot,
  })}
>
  <Text style={{ color: '#1a2e1a', fontWeight: '600', fontSize: 15 }}>
    🔍 Vérifier la traçabilité
  </Text>
</TouchableOpacity>
        {/* Mention clôturé */}
        {isCloture && !isRectifie && (
          <View style={styles.cardCloture}>
            <Text style={styles.cardClotureTitre}>
              ✓ Lot clôturé{lot.valide_par ? ` par ${lot.valide_par}` : ''}
            </Text>
            <Text style={styles.cardClotureTexte}>
              Clôturé le {formatDate(lot.valide_le || lot.date_fin)}.
              Les ajouts restent possibles pour rectification audit.
            </Text>
          </View>
        )}

        {/* SECTION — Origine */}
        <SectionHeader titre="🌍 Origine" />
        {lot.filiere === 'production' ? (
          <View style={styles.card}>
            <CardLigne label="Site" valeur={site?.code || `#${lot.site_id}`} />
            <CardLigne label="Parcelle" valeur={parcelle?.nom || `#${lot.parcelle_id}`} />
            {parcelle?.superficie_m2 && (
              <CardLigne
                label="Superficie"
                valeur={`${parcelle.superficie_m2.toFixed(0)} m²`}
              />
            )}
            <CardLigne
              label="Date début"
              valeur={formatDate(lot.date_debut)}
            />
            {lot.date_fin && (
              <CardLigne
                label="Date fin"
                valeur={formatDate(lot.date_fin)}
              />
            )}
            {lot.protocole_post_recolte && (
              <CardLigne
                label="Protocole prévu"
                valeur={lot.protocole_post_recolte.replace(/_/g, ' ')}
              />
            )}
            <CardLigne label="Saisi par" valeur={lot.cree_par} />

            {recolteSource && (
              <TouchableOpacity
                style={styles.recolteSourceBtn}
                onPress={voirRecolteSource}
              >
                <Text style={styles.recolteSourceIcone}>🌱</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recolteSourceTitre}>
                    Récolte source MaraîcherGuide
                  </Text>
                  <Text style={styles.recolteSourceSous}>
                    {formatDate(recolteSource.date_recolte)} · {recolteSource.quantite_kg} kg
                  </Text>
                </View>
                <Text style={styles.recolteSourceChevron}>›</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.card}>
            <CardLigne label="Zone collecte" valeur={lot.zone_collecte_code} />
            <CardLigne
              label="Date début"
              valeur={formatDate(lot.date_debut)}
            />
            {lot.date_fin && (
              <CardLigne
                label="Date fin"
                valeur={formatDate(lot.date_fin)}
              />
            )}
            <CardLigne label="Saisi par" valeur={lot.cree_par} />
            <View style={styles.bonsHeader}>
              <Text style={styles.bonsHeaderTitre}>
                {bonsCollecte.length} bon{bonsCollecte.length > 1 ? 's' : ''} de collecte
              </Text>
              {fournisseursDistincts.length > 0 && (
                <Text style={styles.bonsHeaderSous}>
                  {fournisseursDistincts.length} fournisseur{fournisseursDistincts.length > 1 ? 's' : ''} distinct{fournisseursDistincts.length > 1 ? 's' : ''}
                </Text>
              )}
            </View>
            {bonsCollecte.length === 0 ? (
              <Text style={styles.bonsVide}>
                Aucun bon enregistré.{' '}
                <Text
                  style={styles.bonsLien}
                  onPress={() => navigation.navigate('BonCollecteForm', { lotId })}
                >
                  + Saisir un bon
                </Text>
              </Text>
            ) : (
              <>
                {bonsCollecte.slice(0, 5).map((b) => (
                  <View key={b.id} style={styles.bonLigne}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bonNumero}>{b.numero_bon}</Text>
                      <Text style={styles.bonFournisseur}>
                        {fournisseursIdx[b.fournisseur_id]?.nom || `Fournisseur #${b.fournisseur_id}`}
                      </Text>
                    </View>
                    <View style={styles.bonStats}>
                      <Text style={styles.bonQte}>{formatKg(b.quantite_kg)}</Text>
                      <Text style={styles.bonDate}>{formatDate(b.date_collecte)}</Text>
                    </View>
                  </View>
                ))}
                {bonsCollecte.length > 5 && (
                  <Text style={styles.bonsPlusieurs}>
                    + {bonsCollecte.length - 5} autre{bonsCollecte.length - 5 > 1 ? 's' : ''} bon{bonsCollecte.length - 5 > 1 ? 's' : ''}
                  </Text>
                )}
                {!isCloture && (
                  <TouchableOpacity
                    style={styles.bonAjouter}
                    onPress={() => navigation.navigate('BonCollecteForm', { lotId })}
                  >
                    <Text style={styles.bonAjouterTexte}>+ Ajouter un bon</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}
{/* SECTION — Certifications visées */}
        <SectionHeader
          titre="🛡️ Certifications visées"
          compteur={engagements.length}
          onAdd={() => navigation.navigate('EngagementForm', {
            cibleType: 'lot',
            cibleId: lotId,
            cibleLabel: lot.code_lot,
          })}
        />
        {engagements.length === 0 ? (
          <SectionVide
            icone="🛡️"
            texte="Aucune certification visée"
            cta="+ Engager une certification"
            onPress={() => navigation.navigate('EngagementForm', {
              cibleType: 'lot',
              cibleId: lotId,
              cibleLabel: lot.code_lot,
            })}
          />
        ) : (
          <View style={styles.card}>
            {engagements.map((eng, i) => {
              const aScore = eng._score && eng._nbExigences > 0;
              const pct = aScore && eng._score.total_exigences > 0
                ? Math.round((eng._score.nb_conformes / eng._score.total_exigences) * 100)
                : 0;
              const aNcMajeures = aScore && eng._score.nb_nc_majeures > 0;
              return (
                <TouchableOpacity
                  key={eng.id}
                  style={[styles.engagementLigne, i < engagements.length - 1 && styles.engagementLigneSep]}
                  onPress={() => navigation.navigate('EngagementForm', { engagementId: eng.id })}
                >
                  <View style={[styles.engagementBadgeStatut, { backgroundColor: getStatutColor(eng.statut) }]}>
                    <Text style={styles.engagementBadgeTexte}>{getStatutLabel(eng.statut)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.engagementNom}>{eng.ref_nom_court}</Text>
                    <Text style={styles.engagementComplet} numberOfLines={1}>
                      {eng.ref_nom_complet}
                    </Text>
                    {eng.numero_certificat && (
                      <Text style={styles.engagementCertif}>
                        📄 {eng.numero_certificat}
                      </Text>
                    )}
                    {aScore && (
                      <View style={styles.engagementScoreRow}>
                        <Text style={styles.engagementScoreText}>
                          🔍 {eng._score.nb_conformes}/{eng._score.total_exigences} conformes ({pct}%)
                        </Text>
                        {aNcMajeures && (
                          <Text style={styles.engagementScoreNcMajeure}>
                            🚨 {eng._score.nb_nc_majeures} NC maj.
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                  <Text style={styles.engagementChevron}>›</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        {/* SECTION — Étapes post-récolte */}
        <SectionHeader
          titre="🔄 Étapes post-récolte"
          compteur={etapes.length}
          onAdd={ouvrirEtape}
        />
        {etapes.length === 0 ? (
          <SectionVide
            icone="🔄"
            texte="Aucune étape enregistrée"
            cta="+ Ajouter la première étape"
            onPress={ouvrirEtape}
          />
        ) : (
          <View style={styles.card}>
            {etapes.map((e, i) => (
              <EtapeLigne
                key={e.id}
                etape={e}
                isLast={i === etapes.length - 1}
              />
            ))}
          </View>
        )}

        {/* SECTION — Analyses qualité */}
        <SectionHeader
          titre="🔬 Analyses qualité"
          compteur={analyses.length}
          onAdd={ouvrirAnalyse}
        />
        {analyses.length === 0 ? (
          <SectionVide
            icone="🔬"
            texte="Aucune analyse enregistrée"
            cta="+ Saisir une analyse"
            onPress={ouvrirAnalyse}
          />
        ) : (
          <View style={styles.card}>
            {analyses.map((a, i) => (
              <AnalyseLigne
                key={a.id}
                analyse={a}
                isLast={i === analyses.length - 1}
              />
            ))}
          </View>
        )}

        {/* SECTION — Conditionnements */}
        <SectionHeader
          titre="📦 Conditionnements"
          compteur={conditionnements.length}
          onAdd={ouvrirConditionnement}
        />
        {conditionnements.length === 0 ? (
          <SectionVide
            icone="📦"
            texte="Aucun conditionnement enregistré"
            cta="+ Conditionner le lot"
            onPress={ouvrirConditionnement}
          />
        ) : (
          <View style={styles.card}>
            {conditionnements.map((c, i) => (
              <ConditionnementLigne
                key={c.id}
                conditionnement={c}
                isLast={i === conditionnements.length - 1}
              />
            ))}
          </View>
        )}

        {/* Notes */}
        {lot.notes && (
          <View style={styles.cardNotes}>
            <Text style={styles.cardNotesTitre}>📝 Notes</Text>
            <Text style={styles.cardNotesTexte}>{lot.notes}</Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Menu actions — accessible via bouton "..." en haut */}
      <MenuActions
        visible={menuOuvert}
        onClose={() => setMenuOuvert(false)}
        isCloture={isCloture}
        isRectifie={isRectifie}
        onRectifier={() => {
          setMenuOuvert(false);
          navigation.navigate('RectifierLot', { lotId });
        }}
      />
    </View>
  );
}

// ============================================================
// SOUS-COMPOSANTS
// ============================================================

function MenuActions({ visible, onClose, isCloture, isRectifie, onRectifier }) {
  if (!visible) return null;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.menuOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.menuContent}>
          {!isCloture && (
            <View style={styles.menuItemDisabled}>
              <Text style={styles.menuItemDisabledTexte}>
                ✏️ Modifier (à venir)
              </Text>
              <Text style={styles.menuItemHint}>
                Édition directe à implémenter dans une prochaine session
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.menuItem} onPress={onRectifier}>
            <Text style={styles.menuItemTexte}>🔄 Rectifier ce lot</Text>
            <Text style={styles.menuItemHint}>
              {isCloture
                ? 'Mécanisme audit — créer un rectificatif'
                : 'Créer un rectificatif (action sensible)'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

function SectionHeader({ titre, compteur, onAdd }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionHeaderTitre}>
        {titre}
        {typeof compteur === 'number' && compteur > 0 && (
          <Text style={styles.sectionHeaderCompteur}>  ({compteur})</Text>
        )}
      </Text>
      {onAdd && (
        <TouchableOpacity style={styles.sectionAddBtn} onPress={onAdd}>
          <Text style={styles.sectionAddBtnTexte}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function CardLigne({ label, valeur }) {
  return (
    <View style={styles.cardLigne}>
      <Text style={styles.cardLigneLabel}>{label}</Text>
      <Text style={styles.cardLigneValeur}>{valeur}</Text>
    </View>
  );
}

function SectionVide({ icone, texte, cta, onPress }) {
  return (
    <TouchableOpacity style={styles.sectionVide} onPress={onPress}>
      <Text style={styles.sectionVideIcone}>{icone}</Text>
      <Text style={styles.sectionVideTexte}>{texte}</Text>
      <Text style={styles.sectionVideCta}>{cta}</Text>
    </TouchableOpacity>
  );
}

function EtapeLigne({ etape, isLast }) {
  const typeInfo = TYPES_ETAPE[etape.type_etape] || TYPES_ETAPE.autre;
  // Détection si l'étape a été copiée lors d'une rectification
  const estCopiee = etape.notes && etape.notes.includes('[COPIÉ depuis lot rectifié');
  const aReVerifier = etape.notes && etape.notes.includes('à RE-VÉRIFIER');

  return (
    <View style={[styles.etapeLigne, !isLast && styles.etapeLigneSep]}>
      <View style={styles.etapeOrdre}>
        <Text style={styles.etapeOrdreTexte}>{etape.ordre}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.etapeTypeRow}>
          <Text style={[styles.etapeType, { color: typeInfo.color }]}>
            {typeInfo.label}
          </Text>
          {estCopiee && (
            <View style={[styles.badgeCopie, aReVerifier && styles.badgeReVerifier]}>
              <Text style={[styles.badgeCopieTexte, aReVerifier && styles.badgeReVerifierTexte]}>
                {aReVerifier ? '⚠ À RE-VÉRIFIER' : '📋 COPIÉ'}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.etapeDate}>
          {formatDate(etape.date_debut)}
          {etape.date_fin ? ` → ${formatDate(etape.date_fin)}` : ' (en cours)'}
        </Text>
        <View style={styles.etapeQtes}>
          <Text style={styles.etapeQte}>
            {formatKg(etape.quantite_entree_kg)} → {formatKg(etape.quantite_sortie_kg)}
          </Text>
          {etape.taux_perte_pct != null && etape.taux_perte_pct > 0 && (
            <Text style={styles.etapePerte}>
              -{formatPct(etape.taux_perte_pct)}
            </Text>
          )}
        </View>
        {etape.operateur && (
          <Text style={styles.etapeOperateur}>par {etape.operateur}</Text>
        )}
      </View>
    </View>
  );
}

function AnalyseLigne({ analyse, isLast }) {
  const typeInfo = TYPES_ANALYSE[analyse.type_analyse] || TYPES_ANALYSE.autre;
  const conformeIcone = analyse.conforme === 1 ? '✓' :
                        analyse.conforme === 0 ? '✗' : '—';
  const conformeColor = analyse.conforme === 1 ? '#7ec87e' :
                        analyse.conforme === 0 ? '#c87e7e' : '#8a9a8a';

  // Détection copie/rectification
  const estCopiee = analyse.notes && analyse.notes.includes('[COPIÉ depuis lot rectifié');
  const aReVerifier = analyse.notes && analyse.notes.includes('à RE-VÉRIFIER');

  return (
    <View style={[styles.analyseLigne, !isLast && styles.analyseLigneSep]}>
      <View style={[styles.analyseConforme, { borderColor: conformeColor }]}>
        <Text style={[styles.analyseConformeTexte, { color: conformeColor }]}>
          {conformeIcone}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.etapeTypeRow}>
          <Text style={styles.analyseType}>{typeInfo.label}</Text>
          {estCopiee && (
            <View style={[styles.badgeCopie, aReVerifier && styles.badgeReVerifier]}>
              <Text style={[styles.badgeCopieTexte, aReVerifier && styles.badgeReVerifierTexte]}>
                {aReVerifier ? '⚠ À RE-VÉRIFIER' : '📋 COPIÉ'}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.analyseDate}>
          {formatDate(analyse.date_analyse)}
          {analyse.laboratoire ? ` · ${analyse.laboratoire}` : ''}
        </Text>
        <Text style={styles.analyseValeur}>
          {analyse.valeur != null ? `${analyse.valeur} ${analyse.unite || ''}` : analyse.valeur_texte || '—'}
          {analyse.seuil_max != null && (
            <Text style={styles.analyseSeuil}>
              {' '}(seuil ≤ {analyse.seuil_max})
            </Text>
          )}
        </Text>
      </View>
    </View>
  );
}

function ConditionnementLigne({ conditionnement, isLast }) {
  const verso = conditionnement.etiquette_verso || '';
  const estCopiee = verso.includes('[COPIÉ depuis lot rectifié');
  const aReVerifier = verso.includes('à RE-VÉRIFIER');

  return (
    <View style={[styles.condLigne, !isLast && styles.condLigneSep]}>
      <Text style={styles.condIcone}>📦</Text>
      <View style={{ flex: 1 }}>
        <View style={styles.etapeTypeRow}>
          <Text style={styles.condTitre}>
            {conditionnement.nombre_unites} × {conditionnement.unite_taille}
            {' '}{conditionnement.type_emballage}
          </Text>
          {estCopiee && (
            <View style={[styles.badgeCopie, aReVerifier && styles.badgeReVerifier]}>
              <Text style={[styles.badgeCopieTexte, aReVerifier && styles.badgeReVerifierTexte]}>
                {aReVerifier ? '⚠ À RE-VÉRIFIER' : '📋 COPIÉ'}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.condDate}>
          {formatDate(conditionnement.date_conditionnement)}
          {' · '}{formatKg(conditionnement.poids_total_kg)}
        </Text>
        {conditionnement.lieu_stockage && (
          <Text style={styles.condLieu}>📍 {conditionnement.lieu_stockage}</Text>
        )}
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
  bgInput: '#0f1f0f',
  border: '#2d4a2d',
  vert: '#7ec87e',
  vertClair: '#a8d9a8',
  ambre: '#d4a04a',
  ambreClair: '#e8be78',
  texteDoux: '#c8d4c8',
  texteSecond: '#8a9a8a',
  texteMute: '#5a6a5a',
  rouge: '#c87e7e',
  rougeFonce: '#3a1a1a',
  jaune: '#d4c47e',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  scrollContent: { padding: 16, paddingBottom: 32 },

  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingTexte: { color: COLORS.texteSecond, fontSize: 14 },

  headerNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  btnRetour: { color: COLORS.vert, fontSize: 14 },
  btnMenu: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  btnMenuTexte: {
    color: COLORS.texteDoux,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 2,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    paddingTop: 60,
    paddingHorizontal: 16,
    alignItems: 'flex-end',
  },
  menuContent: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 10,
    paddingVertical: 4,
    width: 260,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuItemDisabled: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    opacity: 0.5,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuItemTexte: {
    color: COLORS.texteDoux,
    fontSize: 14,
    fontWeight: '600',
  },
  menuItemDisabledTexte: {
    color: COLORS.texteMute,
    fontSize: 14,
    fontWeight: '500',
  },
  menuItemHint: {
    color: COLORS.texteSecond,
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
  },

  // Carte identité
  cardIdentite: {
    backgroundColor: COLORS.bgCard,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.ambre,
  },
  identiteLigne1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statutPastille: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statutTexte: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  filiereBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#1f3a1f',
    borderWidth: 1,
    borderColor: COLORS.vert,
  },
  filiereBadgeCollecte: {
    backgroundColor: '#3a2a1f',
    borderColor: COLORS.ambre,
  },
  filiereBadgeTexte: {
    color: COLORS.vert,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  filiereBadgeTexteCollecte: {
    color: COLORS.ambre,
  },
  codeLotGrand: {
    color: COLORS.ambre,
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  cultureLotNom: {
    color: COLORS.texteDoux,
    fontSize: 16,
    fontWeight: '500',
  },

  // Quantités
  cardQuantites: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 12,
  },
  quantiteBloc: {
    flex: 1,
    alignItems: 'center',
  },
  quantiteSep: {
    width: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  quantiteLabel: {
    color: COLORS.texteSecond,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  quantiteValeur: {
    color: COLORS.texteDoux,
    fontSize: 16,
    fontWeight: '700',
  },
  quantiteValeurFort: {
    color: COLORS.vertClair,
    fontSize: 18,
  },
  quantiteValeurPerte: {
    color: COLORS.rouge,
  },

  // Bouton clôturer (proéminent)
  btnCloturer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.rougeFonce,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: COLORS.rouge,
  },
  btnCloturerIcone: {
    fontSize: 24,
    marginRight: 12,
  },
  btnCloturerTitre: {
    color: COLORS.rouge,
    fontSize: 15,
    fontWeight: '700',
  },
  btnCloturerSous: {
    color: COLORS.texteSecond,
    fontSize: 11,
    marginTop: 2,
  },
  btnCloturerChevron: {
    color: COLORS.rouge,
    fontSize: 24,
    fontWeight: '300',
  },

  // Bouton Passeport PDF (style ambre, action neutre/positive)
  btnPdf: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2c14',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.ambre,
    gap: 10,
  },
  btnPdfIcone: { fontSize: 24 },
  btnPdfTitre: {
    color: COLORS.ambre,
    fontSize: 15,
    fontWeight: '700',
  },
  btnPdfSous: {
    color: COLORS.texteSecond,
    fontSize: 11,
    marginTop: 2,
  },
  btnPdfChevron: {
    color: COLORS.ambre,
    fontSize: 24,
    fontWeight: '300',
  },

  // Carte rectifié
  cardRectifie: {
    backgroundColor: COLORS.rougeFonce,
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.rouge,
  },
  cardRectifieTitre: {
    color: COLORS.rouge,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardRectifieTexte: {
    color: COLORS.texteSecond,
    fontSize: 11,
    lineHeight: 15,
  },

  // Carte clôturé
  cardCloture: {
    backgroundColor: '#1f2e1f',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.vert,
  },
  cardClotureTitre: {
    color: COLORS.vert,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardClotureTexte: {
    color: COLORS.texteSecond,
    fontSize: 11,
    lineHeight: 15,
  },

  // Section header
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
    marginTop: 4,
    marginBottom: 6,
  },
  sectionHeaderTitre: {
    color: COLORS.vertClair,
    fontSize: 14,
    fontWeight: '700',
  },
  sectionHeaderCompteur: {
    color: COLORS.texteSecond,
    fontWeight: '500',
  },
  sectionAddBtn: {
    backgroundColor: COLORS.ambre,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionAddBtnTexte: {
    color: '#0d1a0d',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },

  // Card générique
  card: {
    backgroundColor: COLORS.bgCard,
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
  },
  cardLigne: {
    flexDirection: 'row',
    paddingVertical: 6,
  },
  cardLigneLabel: {
    color: COLORS.texteSecond,
    fontSize: 12,
    width: 110,
  },
  cardLigneValeur: {
    flex: 1,
    color: COLORS.texteDoux,
    fontSize: 13,
    fontWeight: '500',
  },

  // Récolte source
  recolteSourceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#1f2e1f',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.vert,
  },
  recolteSourceIcone: {
    fontSize: 20,
    marginRight: 10,
  },
  recolteSourceTitre: {
    color: COLORS.vertClair,
    fontSize: 12,
    fontWeight: '600',
  },
  recolteSourceSous: {
    color: COLORS.texteSecond,
    fontSize: 11,
    marginTop: 1,
  },
  recolteSourceChevron: {
    color: COLORS.vert,
    fontSize: 20,
  },

  // Bons (filière B)
  bonsHeader: {
    paddingTop: 10,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  bonsHeaderTitre: {
    color: COLORS.ambreClair,
    fontSize: 13,
    fontWeight: '700',
  },
  bonsHeaderSous: {
    color: COLORS.texteSecond,
    fontSize: 11,
    marginTop: 2,
  },
  bonsVide: {
    color: COLORS.texteSecond,
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  bonsLien: {
    color: COLORS.ambre,
    fontWeight: '600',
    fontStyle: 'normal',
  },
  bonLigne: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  bonNumero: {
    color: COLORS.ambreClair,
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  bonFournisseur: {
    color: COLORS.texteDoux,
    fontSize: 13,
    marginTop: 2,
  },
  bonStats: {
    alignItems: 'flex-end',
  },
  bonQte: {
    color: COLORS.vertClair,
    fontSize: 13,
    fontWeight: '700',
  },
  bonDate: {
    color: COLORS.texteSecond,
    fontSize: 10,
    marginTop: 2,
  },
  bonsPlusieurs: {
    color: COLORS.texteMute,
    fontSize: 11,
    fontStyle: 'italic',
    paddingVertical: 8,
    textAlign: 'center',
  },
  bonAjouter: {
    marginTop: 10,
    paddingVertical: 10,
    backgroundColor: '#2a2014',
    borderRadius: 6,
    alignItems: 'center',
  },
  bonAjouterTexte: {
    color: COLORS.ambreClair,
    fontSize: 12,
    fontWeight: '600',
  },

  // Section vide
  sectionVide: {
    backgroundColor: COLORS.bgCard,
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  sectionVideIcone: {
    fontSize: 28,
    marginBottom: 8,
    opacity: 0.4,
  },
  sectionVideTexte: {
    color: COLORS.texteSecond,
    fontSize: 12,
    marginBottom: 6,
  },
  sectionVideCta: {
    color: COLORS.ambre,
    fontSize: 13,
    fontWeight: '600',
  },

  // Étape
  etapeLigne: {
    flexDirection: 'row',
    paddingVertical: 10,
  },
  etapeLigneSep: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  etapeOrdre: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.bgInput,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  etapeOrdreTexte: {
    color: COLORS.vertClair,
    fontSize: 12,
    fontWeight: '700',
  },
  etapeType: {
    fontSize: 13,
    fontWeight: '600',
  },
  etapeDate: {
    color: COLORS.texteSecond,
    fontSize: 11,
    marginTop: 2,
  },
  etapeQtes: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  etapeQte: {
    color: COLORS.texteDoux,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  etapePerte: {
    color: COLORS.rouge,
    fontSize: 11,
    fontWeight: '600',
  },
  etapeOperateur: {
    color: COLORS.texteMute,
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 2,
  },

  // Ligne titre + badge (étape, analyse, conditionnement)
  etapeTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 2,
  },
  badgeCopie: {
    backgroundColor: '#1f2c38',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#7eaac8',
  },
  badgeCopieTexte: {
    color: '#7eaac8',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  badgeReVerifier: {
    backgroundColor: '#2a2614',
    borderColor: '#d4c47e',
  },
  badgeReVerifierTexte: {
    color: '#d4c47e',
  },

  // Analyse
  analyseLigne: {
    flexDirection: 'row',
    paddingVertical: 10,
    alignItems: 'flex-start',
  },
  analyseLigneSep: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  analyseConforme: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  analyseConformeTexte: {
    fontSize: 14,
    fontWeight: '700',
  },
  analyseType: {
    color: COLORS.texteDoux,
    fontSize: 13,
    fontWeight: '600',
  },
  analyseDate: {
    color: COLORS.texteSecond,
    fontSize: 11,
    marginTop: 2,
  },
  analyseValeur: {
    color: COLORS.vertClair,
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
  },
  analyseSeuil: {
    color: COLORS.texteMute,
    fontSize: 11,
    fontWeight: '400',
  },

  // Conditionnement
  condLigne: {
    flexDirection: 'row',
    paddingVertical: 10,
    alignItems: 'flex-start',
  },
  condLigneSep: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  condIcone: {
    fontSize: 20,
    marginRight: 12,
  },
  condTitre: {
    color: COLORS.texteDoux,
    fontSize: 13,
    fontWeight: '600',
  },
  condDate: {
    color: COLORS.texteSecond,
    fontSize: 11,
    marginTop: 2,
  },
  condLieu: {
    color: COLORS.texteSecond,
    fontSize: 11,
    marginTop: 2,
  },

  // Engagements certif
  engagementLigne: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  engagementLigneSep: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  engagementBadgeStatut: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  engagementBadgeTexte: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  engagementNom: {
    color: COLORS.texteDoux,
    fontSize: 13,
    fontWeight: '600',
  },
  engagementComplet: {
    color: COLORS.texteSecond,
    fontSize: 11,
    marginTop: 1,
  },
engagementCertif: {
    color: COLORS.vertClair,
    fontSize: 11,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  engagementScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  engagementScoreText: {
    color: '#d4a04a',
    fontSize: 11,
    fontWeight: '600',
  },
  engagementScoreNcMajeure: {
    color: '#ff8888',
    fontSize: 10,
    fontWeight: '700',
  },
  engagementChevron: {
    color: COLORS.vert,
    fontSize: 22,
    fontWeight: '300',
  },
  // Notes
  cardNotes: {
    backgroundColor: COLORS.bgCard,
    padding: 14,
    borderRadius: 10,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.vertClair,
  },
  cardNotesTitre: {
    color: COLORS.vertClair,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardNotesTexte: {
    color: COLORS.texteDoux,
    fontSize: 12,
    lineHeight: 17,
  },
});