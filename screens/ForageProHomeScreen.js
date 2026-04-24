import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  getAllAnimaux, getProductionJour, getStatsSoudure, getStocksBySite
} from '../database/foragePro';


export default function ForageProHomeScreen({ route, navigation }) {
  const { siteId, siteCode } = route.params;
  const insets = useSafeAreaInsets();
  const today = new Date().toISOString().split('T')[0];

  const [animaux, setAnimaux] = React.useState([]);
  const [productionJour, setProductionJour] = React.useState([]);
  const [soudure, setSoudure] = React.useState(null);
  const [stocks, setStocks] = React.useState([]);

  const charger = useCallback(() => {
 
  
    const tousAnimaux = getAllAnimaux(siteId);
    setAnimaux(tousAnimaux);
    setProductionJour(getProductionJour(siteId, today));
    setSoudure(getStatsSoudure(siteId));
    setStocks(getStocksBySite(siteId));
  }, [siteId, today]);

  useFocusEffect(charger);

  // Calculs production
  const lactantes = animaux.filter(a => a.categorie === 'vache_lactante');
  const totalLitresJour = productionJour.reduce(
    (acc, p) => acc + (p.litres_matin || 0) + (p.litres_soir || 0), 0
  );
  const dejaSaisi = productionJour.length > 0;
  const qualiteAnormale = productionJour.some(p => p.qualite === 'anormale');

  // Alerte soudure
  const getNiveauAlerte = (jours) => {
    if (jours === null) return null;
    if (jours <= 7)  return { couleur: '#e07070', label: 'CRITIQUE', emoji: '🔴' };
    if (jours <= 21) return { couleur: '#f0c060', label: 'ATTENTION', emoji: '🟡' };
    if (jours <= 45) return { couleur: '#f0d090', label: 'SURVEILLER', emoji: '🟠' };
    return { couleur: '#7ec87e', label: 'OK', emoji: '🟢' };
  };
  const alerte = soudure ? getNiveauAlerte(soudure.joursRestants) : null;

  const dateAffichee = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long'
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🌿 ForagePro — {siteCode}</Text>
        <Text style={styles.headerDate}>{dateAffichee}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Bloc production du jour */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🥛 Production du jour</Text>
          <View style={styles.kpiRow}>
            <View style={styles.kpi}>
              <Text style={styles.kpiVal}>{lactantes.length}</Text>
              <Text style={styles.kpiLbl}>Vaches lactantes</Text>
            </View>
            <View style={[styles.kpi, { borderLeftColor: dejaSaisi ? '#7ec87e' : '#f0c060' }]}>
              <Text style={[styles.kpiVal, { color: dejaSaisi ? '#7ec87e' : '#f0c060' }]}>
                {dejaSaisi ? `${totalLitresJour.toFixed(1)} L` : '—'}
              </Text>
              <Text style={styles.kpiLbl}>
                {dejaSaisi ? 'Litres aujourd\'hui' : 'Non saisi'}
              </Text>
            </View>
            {lactantes.length > 0 && dejaSaisi && (
              <View style={styles.kpi}>
                <Text style={styles.kpiVal}>
                  {(totalLitresJour / lactantes.length).toFixed(1)} L
                </Text>
                <Text style={styles.kpiLbl}>Moyenne / vache</Text>
              </View>
            )}
          </View>

          {qualiteAnormale && (
            <View style={styles.alerteBox}>
              <Text style={styles.alerteText}>
                ⚠️ Qualité anormale signalée aujourd'hui — vérifier le troupeau
              </Text>
            </View>
          )}

          {!dejaSaisi && lactantes.length > 0 && (
            <View style={styles.reminderBox}>
              <Text style={styles.reminderText}>
                📋 Traite du jour non encore saisie
              </Text>
            </View>
          )}
        </View>

        {/* Bloc alerte soudure */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌾 Stock fourrager</Text>
          {soudure && alerte ? (
            <View style={[styles.soudureCard, { borderColor: alerte.couleur }]}>
              <View style={styles.soudureTop}>
                <Text style={[styles.soudureEmoji]}>{alerte.emoji}</Text>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.soudureLabel, { color: alerte.couleur }]}>
                    {alerte.label}
                  </Text>
                  {soudure.joursRestants !== null ? (
                    <Text style={styles.soudureJours}>
                      {soudure.joursRestants} jours de fourrage restants
                    </Text>
                  ) : (
                    <Text style={styles.soudureJours}>
                      Aucune consommation enregistrée
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.soudureDetails}>
                <Text style={styles.soudureDetail}>
                  📦 Stock : {soudure.stockKg.toFixed(0)} kg
                </Text>
                <Text style={styles.soudureDetail}>
                  📉 Conso moy. : {soudure.consoJour.toFixed(1)} kg/j
                </Text>
              </View>
              {soudure.joursRestants !== null && soudure.joursRestants <= 21 && (
                <Text style={styles.soudureConseil}>
                  ⚡ Commandez ou récoltez du fourrage maintenant
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.reminderBox}>
              <Text style={styles.reminderText}>
                Aucun stock enregistré — ajoutez vos premiers stocks
              </Text>
            </View>
          )}

          {/* Top 3 stocks */}
          {stocks.length > 0 && (
            <View style={styles.stocksMini}>
              {stocks.slice(0, 3).map(s => (
                <View key={s.id} style={styles.stockMiniRow}>
                  <Text style={styles.stockMiniNom} numberOfLines={1}>{s.nom_fourrage}</Text>
                  <Text style={[
                    styles.stockMiniQte,
                    s.quantite_kg < 50 && { color: '#e07070' }
                  ]}>{s.quantite_kg} kg</Text>
                </View>
              ))}
              {stocks.length > 3 && (
                <Text style={styles.stockMiniPlus}>+{stocks.length - 3} autres espèces</Text>
              )}
            </View>
          )}
        </View>

        {/* Bloc troupeau résumé */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🐄 Troupeau</Text>
          <View style={styles.troupeauGrid}>
            {[
              { cat: 'vache_lactante', label: 'Lactantes', emoji: '🐄' },
              { cat: 'vache_tarie', label: 'Taries', emoji: '🐄' },
              { cat: 'genisse_pleine', label: 'Génisses pleines', emoji: '🐮' },
              { cat: 'genisse', label: 'Génisses', emoji: '🐮' },
              { cat: 'velle', label: 'Velles', emoji: '🐣' },
              { cat: 'veau', label: 'Veaux', emoji: '🐣' },
            ].map(item => {
              const n = animaux.filter(a => a.categorie === item.cat).length;
              if (n === 0) return null;
              return (
                <View key={item.cat} style={styles.troupeauItem}>
                  <Text style={styles.troupeauN}>{n}</Text>
                  <Text style={styles.troupeauLbl}>{item.emoji} {item.label}</Text>
                </View>
              );
            })}
          </View>
          <View style={styles.troupeauTotal}>
            <Text style={styles.troupeauTotalText}>Total : {animaux.length} tête{animaux.length > 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* Boutons d'accès rapide */}
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('SaisieJournaliere', { siteId, siteCode })}
          >
            <Text style={styles.actionEmoji}>🥛</Text>
            <Text style={styles.actionLabel}>Saisir traite</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Troupeau', { siteId, siteCode })}
          >
            <Text style={styles.actionEmoji}>🐄</Text>
            <Text style={styles.actionLabel}>Troupeau</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('StockFourrage', { siteId, siteCode })}
          >
            <Text style={styles.actionEmoji}>🌾</Text>
            <Text style={styles.actionLabel}>Stocks</Text>
          </TouchableOpacity>
          <TouchableOpacity
  style={styles.actionBtn}
  onPress={() => navigation.navigate('MeteoSite', { siteId, siteCode })}
>
  <Text style={styles.actionEmoji}>🌤</Text>
  <Text style={styles.actionLabel}>Météo</Text>
</TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a2e1a' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#2a4a2a' },
  headerTitle: { color: '#7ec87e', fontSize: 18, fontWeight: 'bold' },
  headerDate: { color: '#8aaa8a', fontSize: 13, marginTop: 4 },
  scroll: { padding: 12, paddingBottom: 40 },
  section: { backgroundColor: '#243824', borderRadius: 14, padding: 14, marginBottom: 12 },
  sectionTitle: { color: '#7ec87e', fontSize: 15, fontWeight: '700', marginBottom: 12 },
  kpiRow: { flexDirection: 'row', gap: 8 },
  kpi: { flex: 1, backgroundColor: '#1a2e1a', borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: '#7ec87e' },
  kpiVal: { color: '#7ec87e', fontSize: 20, fontWeight: 'bold' },
  kpiLbl: { color: '#6a8a6a', fontSize: 11, marginTop: 2 },
  alerteBox: { marginTop: 10, backgroundColor: '#4a2020', borderRadius: 10, padding: 10, borderLeftWidth: 3, borderLeftColor: '#e07070' },
  alerteText: { color: '#e07070', fontSize: 13 },
  reminderBox: { marginTop: 10, backgroundColor: '#3a3a20', borderRadius: 10, padding: 10 },
  reminderText: { color: '#f0c060', fontSize: 13 },
  soudureCard: { borderRadius: 10, borderWidth: 2, padding: 12, backgroundColor: '#1a2e1a' },
  soudureTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  soudureEmoji: { fontSize: 28 },
  soudureLabel: { fontSize: 16, fontWeight: 'bold' },
  soudureJours: { color: '#a0c0a0', fontSize: 13, marginTop: 2 },
  soudureDetails: { flexDirection: 'row', gap: 16, marginBottom: 4 },
  soudureDetail: { color: '#8aaa8a', fontSize: 13 },
  soudureConseil: { color: '#f0c060', fontSize: 12, marginTop: 6, fontStyle: 'italic' },
  stocksMini: { marginTop: 10, backgroundColor: '#1a2e1a', borderRadius: 10, padding: 10 },
  stockMiniRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#2a4a2a' },
  stockMiniNom: { color: '#c0d8c0', fontSize: 13, flex: 1 },
  stockMiniQte: { color: '#7ec87e', fontSize: 13, fontWeight: '600' },
  stockMiniPlus: { color: '#6a8a6a', fontSize: 12, marginTop: 6, textAlign: 'center' },
  troupeauGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  troupeauItem: { backgroundColor: '#1a2e1a', borderRadius: 10, padding: 10, minWidth: '30%', alignItems: 'center' },
  troupeauN: { color: '#e8f5e8', fontSize: 22, fontWeight: 'bold' },
  troupeauLbl: { color: '#6a8a6a', fontSize: 11, marginTop: 2, textAlign: 'center' },
  troupeauTotal: { marginTop: 10, alignItems: 'flex-end' },
  troupeauTotalText: { color: '#8aaa8a', fontSize: 13 },
  actionsGrid: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  actionBtn: { flex: 1, backgroundColor: '#243824', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#3a5a3a' },
  actionEmoji: { fontSize: 24, marginBottom: 6 },
  actionLabel: { color: '#7ec87e', fontSize: 12, fontWeight: '600', textAlign: 'center' },
});