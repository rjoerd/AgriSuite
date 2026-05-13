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
import { initParametresEntreprise } from './database/parametresEntreprise';
import { initCertifTrack } from './database/certifTrack';
import { seedCertifTrack } from './database/certifTrackData';
import { seedCertifTrackExigences } from './database/certifTrackExigences';
import { seedCertifTrackBioUe } from './database/certifTrackBioUe';
import { seedCertifTrackHaccp } from './database/certifTrackHaccp';
import { seedCertifTrackFairtrade } from './database/certifTrackFairtrade';
import { seedCertifTrackRainforest } from './database/certifTrackRainforest';
import { initSCI } from './database/sci';
import { initSciInspectionsTables } from './database/sciInspections';
import { initOperateur, migrateOperateurSchema, seedOperateur } from './database/operateur';
import { reclasserExigencesParNiveau, ajusterCasLimites } from './database/certifTrackNiveaux';
import { initHaccp } from './database/haccp';
import { seedHaccp } from './database/haccpData';
import { seedHaccpModesOperatoires } from './database/haccpModesOperatoires';
import { initHaccpSurveillance } from './database/haccpSurveillance';
import { initPRP, seedPRP } from './database/prp';
import { migrationStatutsExigencesAuto } from './database/migrationStatutsExigencesAuto';

// Screens — Phase 0a / 0b : Sites, parcelles, CropEngine
import SiteListScreen from './screens/SiteListScreen';
import SiteDetailScreen from './screens/SiteDetailScreen';
import SiteFormScreen from './screens/SiteFormScreen';
import ParcelleMapScreen from './screens/ParcelleMapScreen';
import CropEngineScreen from './screens/CropEngineScreen';

// Screens — Phase 1 : ForagePro + Météo
import TroupeauScreen from './screens/TroupeauScreen';
import SaisieJournaliereScreen from './screens/SaisieJournaliereScreen';
import StockFourrageScreen from './screens/StockFourrageScreen';
import ForageProHomeScreen from './screens/ForageProHomeScreen';
import MeteoSiteScreen from './screens/MeteoSiteScreen';

// Screens — Phase 2 : MaraîcherGuide
import MaraicherHomeScreen from './screens/MaraicherHomeScreen';
import PlancheListScreen from './screens/PlancheListScreen';
import PlancheFormScreen from './screens/PlancheFormScreen';
import CultureFormScreen from './screens/CultureFormScreen';
import SaisieRecolteScreen from './screens/SaisieRecolteScreen';

// Screens — Phase 3 : ExportTrack
import ExportTrackHomeScreen from './screens/ExportTrackHomeScreen';
import LotListScreen from './screens/LotListScreen';
import LotProductionFormScreen from './screens/LotProductionFormScreen';
import {
  AcheteurListScreen,
  ExpeditionListScreen,
} from './screens/ExportTrackPlaceholders';
import LotDetailScreen from './screens/LotDetailScreen';
import RecoltesHistoryScreen from './screens/RecoltesHistoryScreen';
import FournisseurListScreen from './screens/FournisseurListScreen';
   import FournisseurFormScreen from './screens/FournisseurFormScreen';
   import LotCollecteFormScreen from './screens/LotCollecteFormScreen';
import BonCollecteFormScreen from './screens/BonCollecteFormScreen';
import LotClotureScreen from './screens/LotClotureScreen';
import EtapeFormScreen from './screens/EtapeFormScreen';
import AnalyseQualiteFormScreen from './screens/AnalyseQualiteFormScreen';
import ConditionnementFormScreen from './screens/ConditionnementFormScreen';
import RectifierLotScreen from './screens/RectifierLotScreen';
import PasseportPdfPreviewScreen from './screens/PasseportPdfPreviewScreen';
import ParametresEntrepriseScreen from './screens/ParametresEntrepriseScreen';
import HomeScreen from './screens/HomeScreen';
import CertifTrackHomeScreen from './screens/CertifTrackHomeScreen';
import ReferentielDetailScreen from './screens/ReferentielDetailScreen';
import EngagementFormScreen from './screens/EngagementFormScreen';
import AuditBlancScreen from './screens/AuditBlancScreen';
import PreuveFormScreen from './screens/PreuveFormScreen';
import ProducteurSCIDetailScreen from './screens/ProducteurSCIDetailScreen';
import ContratFormScreen from './screens/ContratFormScreen';
import ParcelleProducteurFormScreen from './screens/ParcelleProducteurFormScreen';
import PlanificationInspectionsScreen from './screens/PlanificationInspectionsScreen';
import InspectionFormPlanifScreen from './screens/InspectionFormPlanifScreen';
import InspectionTerrainScreen from './screens/InspectionTerrainScreen';
import InspectionSignaturesScreen from './screens/InspectionSignaturesScreen';
import InspectionDetailScreen from './screens/InspectionDetailScreen';
import SanctionFormScreen from './screens/SanctionFormScreen';
import ParcelleConversionScreen from './screens/ParcelleConversionScreen';
import ProducteurParcelleFormScreen from './screens/ProducteurParcelleFormScreen';
import ProducteurParcellesScreen from './screens/ProducteurParcellesScreen';
import VerifLotScreen from './screens/VerifLotScreen';
import OperateurFormScreen from './screens/OperateurFormScreen';
import DiagnosticNiveauxScreen from './screens/DiagnosticNiveauxScreen';
import HaccpHomeScreen from './screens/HaccpHomeScreen';
import HaccpEtudeDetailScreen from './screens/HaccpEtudeDetailScreen';
import ReleveCcpFormScreen from './screens/ReleveCcpFormScreen';
import RelevesCcpHistoryScreen from './screens/RelevesCcpHistoryScreen';
import DiagnosticSchemaScreen from './screens/DiagnosticSchemaScreen';
import HaccpDashboardScreen from './screens/HaccpDashboardScreen';
import ActionCorrectiveFormScreen from './screens/ActionCorrectiveFormScreen';
import PrpHomeScreen from './screens/PrpHomeScreen';
import PrpDetailScreen from './screens/PrpDetailScreen';
import PrpRegistreFormScreen from './screens/PrpRegistreFormScreen';
import PrpActionCorrectiveScreen from './screens/PrpActionCorrectiveScreen';
import PrpDashboardScreen from './screens/PrpDashboardScreen';
import PrpTachesJourScreen from './screens/PrpTachesJourScreen';
import PrpExportPdfScreen from './screens/PrpExportPdfScreen';
import ConformitePrpHaccpScreen from './screens/ConformitePrpHaccpScreen';

// Initialisation synchrone avant tout rendu
initDB();
initCropEngine();
initForagePro();
initMaraicher();
seedCropEngine();
seedForagePro();
seedMaraicher();
seedExportTrack();
initParametresEntreprise();
initCertifTrack();
seedCertifTrack();
seedCertifTrackExigences();
seedCertifTrackBioUe();
seedCertifTrackHaccp();
seedCertifTrackFairtrade();
seedCertifTrackRainforest();
initSCI();
initSciInspectionsTables();
initOperateur();
migrateOperateurSchema();
seedOperateur();
reclasserExigencesParNiveau();
ajusterCasLimites();
initHaccp();
seedHaccp();
seedHaccpModesOperatoires();
initHaccpSurveillance();
initPRP();
seedPRP();
migrationStatutsExigencesAuto();

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
              {/* ─── Phase 0a / 0b ─── */}
        <Stack.Navigator screenOptions={{ headerShown: false }}>
  {/* NOUVEAU : HomeScreen en premier (route par défaut) */}
  <Stack.Screen name="Home" component={HomeScreen} />

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

        {/* ─── Phase 1 — ForagePro + Météo ─── */}
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

        {/* ─── Phase 2 — MaraîcherGuide ─── */}
        <Stack.Screen
          name="MaraicherHome"
          component={MaraicherHomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PlancheList"
          component={PlancheListScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PlancheForm"
          component={PlancheFormScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="CultureForm"
          component={CultureFormScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SaisieRecolte"
          component={SaisieRecolteScreen}
          options={{ headerShown: false }}
        />

        {/* ─── Phase 3 — ExportTrack ─── */}
        <Stack.Screen
          name="ExportTrackHome"
          component={ExportTrackHomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="LotList"
          component={LotListScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="LotProductionForm"
          component={LotProductionFormScreen}
          options={{ headerShown: false }}
        />
                <Stack.Screen
          name="AcheteurList"
          component={AcheteurListScreen}
          options={{
            title: 'Acheteurs',
            headerStyle: { backgroundColor: '#1a2e1a' },
            headerTintColor: '#7ec87e',
          }}
        />
        <Stack.Screen
          name="ExpeditionList"
          component={ExpeditionListScreen}
          options={{
            title: 'Expéditions',
            headerStyle: { backgroundColor: '#1a2e1a' },
            headerTintColor: '#7ec87e',
          }}
        />
        <Stack.Screen
  name="BonCollecteForm"
  component={BonCollecteFormScreen}
  options={{ headerShown: false }}
/>
       <Stack.Screen
  name="LotDetail"
  component={LotDetailScreen}
  options={{ headerShown: false }}
/>
<Stack.Screen
  name="LotCloture"
  component={LotClotureScreen}
  options={{ headerShown: false }}
/>
<Stack.Screen
  name="RecoltesHistory"
  component={RecoltesHistoryScreen}
  options={{ headerShown: false }}
/>
<Stack.Screen
          name="FournisseurList"
          component={FournisseurListScreen}
          options={{headerShown: false
          }}
        />
<Stack.Screen
     name="FournisseurForm"
     component={FournisseurFormScreen}
     options={{ headerShown: false }}
   />
   <Stack.Screen
  name="LotCollecteForm"
  component={LotCollecteFormScreen}
  options={{ headerShown: false }}
/>
<Stack.Screen
  name="EtapeForm"
  component={EtapeFormScreen}
  options={{ headerShown: false }}
/>
<Stack.Screen
  name="AnalyseQualiteForm"
  component={AnalyseQualiteFormScreen}
  options={{ headerShown: false }}
/>
<Stack.Screen
  name="ConditionnementForm"
  component={ConditionnementFormScreen}
  options={{ headerShown: false }}
/>
<Stack.Screen
  name="RectifierLot"
  component={RectifierLotScreen}
  options={{ headerShown: false }}
/>
<Stack.Screen
  name="PasseportPdfPreview"
  component={PasseportPdfPreviewScreen}
  options={{ headerShown: false }}
/>
<Stack.Screen
  name="ParametresEntreprise"
  component={ParametresEntrepriseScreen}
  options={{ headerShown: false }}
/>
<Stack.Screen
  name="CertifTrackHome"
  component={CertifTrackHomeScreen}
  options={{ title: '🛡️ CertifTrack' }}
/>
<Stack.Screen
  name="ReferentielDetail"
  component={ReferentielDetailScreen}
  options={{ title: 'Détail référentiel' }}
/>
<Stack.Screen
  name="EngagementForm"
  component={EngagementFormScreen}
  options={{ title: 'Engagement certification' }}
/>
<Stack.Screen
  name="AuditBlanc"
  component={AuditBlancScreen}
  options={{ title: '🔍 Audit blanc' }}
/>
<Stack.Screen
  name="PreuveForm"
  component={PreuveFormScreen}
  options={{ title: '📎 Ajouter une preuve' }}
/>
<Stack.Screen name="ProducteurSCIDetail" component={ProducteurSCIDetailScreen} options={{ title: 'Producteur SCI' }} />
<Stack.Screen name="ContratForm" component={ContratFormScreen} options={{ title: 'Contrat' }} />
<Stack.Screen name="ParcelleProducteurForm" component={ParcelleProducteurFormScreen} options={{ title: 'Parcelle' }} />
<Stack.Screen 
  name="PlanificationInspections" 
  component={PlanificationInspectionsScreen}
  options={{ title: 'Inspections SCI', headerStyle: { backgroundColor: '#1a2e1a' }, headerTintColor: '#7ec87e' }}
/>
<Stack.Screen 
  name="InspectionFormPlanif" 
  component={InspectionFormPlanifScreen}
  options={{ title: 'Planification', headerStyle: { backgroundColor: '#1a2e1a' }, headerTintColor: '#7ec87e' }}
/>
<Stack.Screen 
  name="InspectionTerrain" 
  component={InspectionTerrainScreen}
  options={{ headerShown: false }}
/>
<Stack.Screen 
  name="InspectionSignatures" 
  component={InspectionSignaturesScreen}
  options={{ title: 'Signatures', headerStyle: { backgroundColor: '#1a2e1a' }, headerTintColor: '#7ec87e' }}
/>
<Stack.Screen 
  name="InspectionDetail" 
  component={InspectionDetailScreen}
  options={{ title: 'Détail inspection', headerStyle: { backgroundColor: '#1a2e1a' }, headerTintColor: '#7ec87e' }}
/>
<Stack.Screen 
  name="SanctionForm" 
  component={SanctionFormScreen}
  options={{ title: 'Sanction SCI', headerStyle: { backgroundColor: '#1a2e1a' }, headerTintColor: '#7ec87e' }}
/>
<Stack.Screen
  name="ParcelleConversion"
  component={ParcelleConversionScreen}
  options={{ title: 'Conversion BIO', headerStyle: { backgroundColor: '#1a2e1a' }, headerTintColor: '#fff' }}
/>
<Stack.Screen
  name="ProducteurParcelleForm"
  component={ProducteurParcelleFormScreen}
  options={{ title: 'Parcelle producteur', headerStyle: { backgroundColor: '#1a2e1a' }, headerTintColor: '#fff' }}
/>
<Stack.Screen
  name="ProducteurParcelles"
  component={ProducteurParcellesScreen}
  options={{ title: 'Parcelles producteur', headerStyle: { backgroundColor: '#1a2e1a' }, headerTintColor: '#fff' }}
/>
<Stack.Screen
  name="VerifLot"
  component={VerifLotScreen}
  options={{ title: 'Vérification lot', headerStyle: { backgroundColor: '#1a2e1a' }, headerTintColor: '#fff' }}
/>
<Stack.Screen name="OperateurForm" component={OperateurFormScreen} options={{ title: '🏢 Opérateur' }} />
<Stack.Screen name="DiagnosticNiveaux" component={DiagnosticNiveauxScreen} options={{ title: '🔬 Diagnostic' }} />
<Stack.Screen 
  name="HaccpHome" 
  component={HaccpHomeScreen} 
  options={{ title: '🧪 HACCP', headerStyle: { backgroundColor: '#1a2e1a' }, headerTintColor: '#7ec87e' }} 
/>
<Stack.Screen 
  name="HaccpEtudeDetail" 
  component={HaccpEtudeDetailScreen} 
  options={{ title: 'Étude HACCP', headerStyle: { backgroundColor: '#1a2e1a' }, headerTintColor: '#7ec87e' }} 
/>
<Stack.Screen 
  name="ReleveCcpForm" 
  component={ReleveCcpFormScreen} 
  options={{ title: '📏 Nouveau relevé CCP', headerStyle: { backgroundColor: '#1a2e1a' }, headerTintColor: '#7ec87e' }} 
/>
<Stack.Screen
  name="RelevesCcpHistory"
  component={RelevesCcpHistoryScreen}
  options={{ title: '📜 Historique relevés', headerStyle: { backgroundColor: '#1a2e1a' }, headerTintColor: '#7ec87e' }}
/>
<Stack.Screen name="DiagnosticSchema" component={DiagnosticSchemaScreen} options={{ title: 'Diagnostic' }} />
<Stack.Screen name="HaccpDashboard" component={HaccpDashboardScreen} options={{ title: 'Surveillance HACCP' }} />
<Stack.Screen name="ActionCorrectiveForm" component={ActionCorrectiveFormScreen} options={{ title: 'Action corrective', headerShown: false }} />
<Stack.Screen name="PrpHome" component={PrpHomeScreen} options={{ title: 'PRP', headerShown: false }} />
<Stack.Screen name="PrpDetail" component={PrpDetailScreen} options={{ title: 'Détail PRP', headerShown: false }} />
<Stack.Screen name="PrpRegistreForm" component={PrpRegistreFormScreen} options={{ headerShown: false }} />
<Stack.Screen name="PrpActionCorrective" component={PrpActionCorrectiveScreen} options={{ headerShown: false }} />
<Stack.Screen name="PrpDashboard" component={PrpDashboardScreen} options={{ headerShown: false }} />
<Stack.Screen name="PrpTachesJour" component={PrpTachesJourScreen} options={{ headerShown: false }} />
<Stack.Screen name="PrpExportPdf" component={PrpExportPdfScreen} options={{ headerShown: false }} />
<Stack.Screen 
  name="ConformitePrpHaccp" 
  component={ConformitePrpHaccpScreen}
  options={{ headerShown: false }}
/>
      </Stack.Navigator>
    </NavigationContainer>
  );
}