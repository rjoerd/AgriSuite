import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

// Database
import { initDB, seedCropEngine } from './database/db';
import { seedMaraicher } from './database/maraicherData';
import { initCropEngine } from './database/cropEngine';
import { initForagePro } from './database/foragePro';
import { seedForagePro } from './database/forageData';
import { initMaraicher } from './database/maraicher';
import { seedExportTrack } from './database/exportTrack';

// Screens — existants
import SiteListScreen from './screens/SiteListScreen';
import SiteDetailScreen from './screens/SiteDetailScreen';
import SiteFormScreen from './screens/SiteFormScreen';
import ParcelleMapScreen from './screens/ParcelleMapScreen';
import CropEngineScreen from './screens/CropEngineScreen';
import TroupeauScreen from './screens/TroupeauScreen';
import SaisieJournaliereScreen from './screens/SaisieJournaliereScreen';
import StockFourrageScreen from './screens/StockFourrageScreen';
import ForageProHomeScreen from './screens/ForageProHomeScreen';
import MeteoSiteScreen from './screens/MeteoSiteScreen';
// Imports à ajouter
import MaraicherHomeScreen from './screens/MaraicherHomeScreen';
import PlancheListScreen from './screens/PlancheListScreen';
import PlancheFormScreen from './screens/PlancheFormScreen';
import CultureFormScreen from './screens/CultureFormScreen';
import SaisieRecolteScreen from './screens/SaisieRecolteScreen';
// Phase 3 — ExportTrack
import ExportTrackHomeScreen from './screens/ExportTrackHomeScreen';
import {
  LotListScreen,
  FournisseurListScreen,
  AcheteurListScreen,
  ExpeditionListScreen,
  BonCollecteFormScreen,
} from './screens/ExportTrackPlaceholders';

// Initialisation synchrone avant tout rendu
initDB();
initCropEngine();
initForagePro();
initMaraicher();    // ← nouveau : crée les tables maraîchage
seedCropEngine();
seedForagePro();
seedMaraicher();    // ← nouveau : peuple cultures maraîchères + objectifs sites
seedExportTrack();

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#1a2e1a' },
          headerTintColor: '#7ec87e',
          headerTitleStyle: { fontWeight: 'bold' },
          contentStyle: { backgroundColor: '#1a2e1a' },
        }}
      >
        <Stack.Screen name="SiteList" component={SiteListScreen}
          options={{ headerShown: false }} />
        <Stack.Screen name="SiteDetail" component={SiteDetailScreen}
          options={{ title: 'Détail du site' }} />
        <Stack.Screen name="SiteForm" component={SiteFormScreen}
          options={({ route }) => ({
            title: route.params?.siteId ? 'Modifier le site' : 'Nouveau site',
          })} />
        <Stack.Screen name="ParcelleMap" component={ParcelleMapScreen}
          options={({ route }) => ({
            title: `📍 ${route.params?.siteCode || 'Carte'}`,
          })} />
        <Stack.Screen name="CropEngine" component={CropEngineScreen}
          options={{ headerShown: false }} />
        <Stack.Screen name="Troupeau" component={TroupeauScreen}
          options={{ headerShown: false }} />
        <Stack.Screen name="SaisieJournaliere" component={SaisieJournaliereScreen}
          options={{ headerShown: false }} />
        <Stack.Screen name="StockFourrage" component={StockFourrageScreen}
          options={{ headerShown: false }} />
        <Stack.Screen name="ForageProHome" component={ForageProHomeScreen}
          options={{ headerShown: false }} />
        <Stack.Screen name="MeteoSite" component={MeteoSiteScreen}
          options={{ headerShown: false }} />
          {/* MaraîcherGuide */}
        <Stack.Screen name="MaraicherHome" component={MaraicherHomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="PlancheList" component={PlancheListScreen} options={{ headerShown: false }} />
        <Stack.Screen name="PlancheForm" component={PlancheFormScreen} options={{ headerShown: false }} />
        <Stack.Screen name="CultureForm" component={CultureFormScreen} options={{ headerShown: false }} />
        <Stack.Screen name="SaisieRecolte" component={SaisieRecolteScreen} options={{ headerShown: false }} />
        {/* MaraîcherGuide — à ajouter en Session 2 */}
        <Stack.Screen
  name="ExportTrackHome"
  component={ExportTrackHomeScreen}
  options={{ title: 'ExportTrack', headerShown: false }}
/>
<Stack.Screen
  name="LotList"
  component={LotListScreen}
  options={{ title: 'Lots', headerStyle: { backgroundColor: '#1a2e1a' }, headerTintColor: '#7ec87e' }}
/>
<Stack.Screen
  name="FournisseurList"
  component={FournisseurListScreen}
  options={{ title: 'Fournisseurs', headerStyle: { backgroundColor: '#1a2e1a' }, headerTintColor: '#7ec87e' }}
/>
<Stack.Screen
  name="AcheteurList"
  component={AcheteurListScreen}
  options={{ title: 'Acheteurs', headerStyle: { backgroundColor: '#1a2e1a' }, headerTintColor: '#7ec87e' }}
/>
<Stack.Screen
  name="ExpeditionList"
  component={ExpeditionListScreen}
  options={{ title: 'Expéditions', headerStyle: { backgroundColor: '#1a2e1a' }, headerTintColor: '#7ec87e' }}
/>
<Stack.Screen
  name="BonCollecteForm"
  component={BonCollecteFormScreen}
  options={{ title: 'Bon de collecte', headerStyle: { backgroundColor: '#1a2e1a' }, headerTintColor: '#7ec87e' }}
/>
      </Stack.Navigator>
    </NavigationContainer>
  );
}