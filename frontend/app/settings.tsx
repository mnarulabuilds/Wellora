import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useToast } from '@/components/Toast';
import { theme } from '@/constants/theme';
import { checkApiHealth, drainOfflineQueue } from '@/lib/api';
import {
  clearLocalData,
  getOfflineQueue,
  getUnitSystem,
  loadProfile,
  setUnitSystem,
} from '@/lib/storage';
import { UnitSystem } from '@/lib/types';

export default function SettingsScreen() {
  const router = useRouter();
  const { showToast } = useToast();

  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>('metric');
  const [offlineCount, setOfflineCount] = useState(0);
  const [syncingOffline, setSyncingOffline] = useState(false);

  useEffect(() => {
    checkConnection();
    getUnitSystem().then(setUnitSystemState);
    updateOfflineStatus();
  }, []);

  const checkConnection = async () => {
    setTestingConnection(true);
    const healthy = await checkApiHealth();
    setApiHealthy(healthy);
    setTestingConnection(false);
  };

  const updateOfflineStatus = async () => {
    const queue = await getOfflineQueue();
    setOfflineCount(queue.length);
  };

  const handleUnitToggle = async (metric: boolean) => {
    const system: UnitSystem = metric ? 'metric' : 'imperial';
    setUnitSystemState(system);
    await setUnitSystem(system);
    showToast(`Units set to ${system.toUpperCase()} (${metric ? 'kg, cm' : 'lbs, in'})`, 'success');
  };

  const handleManualSync = async () => {
    setSyncingOffline(true);
    try {
      const count = await drainOfflineQueue();
      await updateOfflineStatus();
      if (count > 0) {
        showToast(`Successfully synced ${count} item(s)!`, 'success');
      } else {
        showToast('All items are already synced.', 'info');
      }
    } catch {
      showToast('Sync failed. Server may still be offline.', 'error');
    } finally {
      setSyncingOffline(false);
    }
  };

  const handleExportData = async () => {
    const profile = await loadProfile();
    Alert.alert(
      'Exported Profile Data',
      JSON.stringify(profile, null, 2),
      [{ text: 'Done', style: 'default' }]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Local Data',
      'This will erase all locally cached profile metrics, goals, and chat conversation history. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All Data',
          style: 'destructive',
          onPress: async () => {
            await clearLocalData();
            showToast('All local data cleared', 'success');
            router.replace('/onboarding');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          <Text style={styles.backText}>Settings</Text>
        </TouchableOpacity>

        {/* Units Configuration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Measurement Units</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Metric Units (kg, cm, Liters)</Text>
              <Text style={styles.rowSub}>
                {unitSystem === 'metric' ? 'Active: Metric (kg, cm)' : 'Active: Imperial (lbs, in)'}
              </Text>
            </View>
            <Switch
              value={unitSystem === 'metric'}
              onValueChange={handleUnitToggle}
              trackColor={{ false: '#333', true: theme.colors.primary }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* Server & Connectivity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System & Connectivity</Text>

          <View style={styles.row}>
            <View>
              <Text style={styles.rowLabel}>API Status</Text>
              <Text style={styles.rowSub}>http://localhost:8000</Text>
            </View>
            <View style={styles.statusBadge}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      apiHealthy === true
                        ? theme.colors.success
                        : apiHealthy === false
                        ? theme.colors.error
                        : theme.colors.warning,
                  },
                ]}
              />
              <Text style={styles.statusText}>
                {testingConnection
                  ? 'Testing...'
                  : apiHealthy === true
                  ? 'Connected'
                  : 'Offline'}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.secondaryBtn} onPress={checkConnection}>
            <Ionicons name="pulse-outline" size={18} color={theme.colors.accent} />
            <Text style={styles.secondaryBtnText}>Test Server Connection</Text>
          </TouchableOpacity>

          {/* Offline Sync Status */}
          <View style={[styles.row, { marginTop: 14 }]}>
            <View>
              <Text style={styles.rowLabel}>Offline Queue</Text>
              <Text style={styles.rowSub}>
                {offlineCount > 0
                  ? `${offlineCount} pending action(s) to sync`
                  : 'All actions synchronized'}
              </Text>
            </View>
            {offlineCount > 0 && (
              <TouchableOpacity
                style={styles.syncBtn}
                onPress={handleManualSync}
                disabled={syncingOffline}
              >
                <Text style={styles.syncBtnText}>
                  {syncingOffline ? 'Syncing...' : 'Sync Now'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>

          <TouchableOpacity style={styles.actionRow} onPress={handleExportData}>
            <Ionicons name="download-outline" size={20} color={theme.colors.textSecondary} />
            <Text style={styles.actionRowText}>Export Profile Data (JSON)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, { borderBottomWidth: 0 }]}
            onPress={handleClearData}
          >
            <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
            <Text style={[styles.actionRowText, { color: theme.colors.error }]}>
              Clear All Local Data
            </Text>
          </TouchableOpacity>
        </View>

        {/* About App */}
        <View style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>Wellora AI Health Assistant</Text>
          <Text style={styles.aboutVersion}>Version 2.0.0 • Production Grade</Text>
          <Text style={styles.aboutDesc}>
            Built with Fast, Localized NLP, Mifflin-St Jeor Biometrics, and Dual Offline Sync.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    marginTop: 10,
  },
  backText: { fontSize: 24, fontWeight: '800', color: theme.colors.text },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.accent,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  rowLabel: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
  rowSub: { color: theme.colors.textMuted, fontSize: 12, marginTop: 3 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.surfaceSubtle,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: theme.colors.text, fontSize: 13, fontWeight: '600' },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.surfaceSubtle,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    marginTop: 14,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  secondaryBtnText: {
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  syncBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
  },
  syncBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceBorder,
  },
  actionRowText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  aboutCard: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  aboutTitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  aboutVersion: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  aboutDesc: {
    color: theme.colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 280,
  },
});
