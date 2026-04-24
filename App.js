import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { initDB, seedCropEngine } from './database/db';
import { initCropEngine } from './database/cropEngine';
import { initForagePro } from './database/foragePro';
import { seedForagePro } from './database/forageData';

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

// Initialisation synchrone avant tout rendu
initDB();
initCropEngine();
seedCropEngine();
initForagePro();
seedForagePro();

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
        <Stack.Screen
          name="SiteList"
          component={SiteListScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SiteDetail"
          component={SiteDetailScreen}
          options={{ title: 'Détail du site' }}
        />
        <Stack.Screen
          name="SiteForm"
          component={SiteFormScreen}
          options={({ route }) => ({
            title: route.params?.siteId ? 'Modifier le site' : 'Nouveau site',
          })}
        />
        <Stack.Screen
          name="ParcelleMap"
          component={ParcelleMapScreen}
          options={({ route }) => ({
            title: `📍 ${route.params?.siteCode || 'Carte'}`,
          })}
        />
        <Stack.Screen
          name="CropEngine"
          component={CropEngineScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Troupeau"
          component={TroupeauScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
  name="SaisieJournaliere"
  component={SaisieJournaliereScreen}
  options={{ headerShown: false }}
/>
<Stack.Screen
  name="StockFourrage"
  component={StockFourrageScreen}
  options={{ headerShown: false }}
/>

<Stack.Screen
  name="ForageProHome"
  component={ForageProHomeScreen}
  options={{ headerShown: false }}
/>
<Stack.Screen
  name="MeteoSite"
  component={MeteoSiteScreen}
  options={{ headerShown: false }}
/>
      </Stack.Navigator>
    </NavigationContainer>
  );
}