import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { toggleTheme } from '@/store/slices/authSlice';
import { router } from 'expo-router';
import { 
  ArrowLeft, 
  Bell, 
  Moon, 
  Sun, 
  Shield, 
  Globe, 
  Smartphone, 
  Volume2, 
  VolumeX, 
  Eye, 
  EyeOff,
  Lock,
  Database,
  Wifi,
  Download,
  Trash2,
  RefreshCw
} from 'lucide-react-native';
import Animated, { 
  FadeInDown, 
  FadeInRight,
} from 'react-native-reanimated';

export default function SettingsScreen() {
  const dispatch = useDispatch();
  const { theme } = useSelector((state: RootState) => state.auth);
  const isDark = theme === 'dark';

  // Settings state
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [wifiOnly, setWifiOnly] = useState(false);
  const [showSensitiveData, setShowSensitiveData] = useState(false);

  const handleThemeToggle = () => {
    dispatch(toggleTheme());
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => {
          Alert.alert('Success', 'Cache cleared successfully!');
        }}
      ]
    );
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'This will reset all settings to default values. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => {
          // Reset all settings to default
          setPushNotifications(true);
          setEmailNotifications(true);
          setSoundEnabled(true);
          setVibrationEnabled(true);
          setBiometricEnabled(false);
          setAutoSync(true);
          setWifiOnly(false);
          setShowSensitiveData(false);
          Alert.alert('Success', 'Settings reset to default values!');
        }}
      ]
    );
  };

  const settingSections = [
    {
      title: 'Notifications',
      items: [
        {
          icon: Bell,
          label: 'Push Notifications',
          description: 'Receive push notifications on your device',
          toggle: true,
          value: pushNotifications,
          onToggle: setPushNotifications,
        },
        {
          icon: Bell,
          label: 'Email Notifications',
          description: 'Receive notifications via email',
          toggle: true,
          value: emailNotifications,
          onToggle: setEmailNotifications,
        },
        {
          icon: soundEnabled ? Volume2 : VolumeX,
          label: 'Sound',
          description: 'Play sound for notifications',
          toggle: true,
          value: soundEnabled,
          onToggle: setSoundEnabled,
        },
        {
          icon: Smartphone,
          label: 'Vibration',
          description: 'Vibrate for notifications',
          toggle: true,
          value: vibrationEnabled,
          onToggle: setVibrationEnabled,
        },
      ],
    },
    {
      title: 'Appearance',
      items: [
        {
          icon: isDark ? Sun : Moon,
          label: 'Dark Mode',
          description: 'Switch between light and dark theme',
          toggle: true,
          value: isDark,
          onToggle: handleThemeToggle,
        },
        {
          icon: Globe,
          label: 'Language',
          description: 'English (US)',
          action: () => Alert.alert('Language', 'Language settings coming soon!'),
        },
      ],
    },
    {
      title: 'Security & Privacy',
      items: [
        {
          icon: Lock,
          label: 'Biometric Authentication',
          description: 'Use fingerprint or face ID to unlock',
          toggle: true,
          value: biometricEnabled,
          onToggle: setBiometricEnabled,
        },
        {
          icon: showSensitiveData ? Eye : EyeOff,
          label: 'Show Sensitive Data',
          description: 'Display sensitive information in previews',
          toggle: true,
          value: showSensitiveData,
          onToggle: setShowSensitiveData,
        },
        {
          icon: Shield,
          label: 'Privacy Policy',
          description: 'View our privacy policy',
          action: () => Alert.alert('Privacy Policy', 'Privacy policy coming soon!'),
        },
      ],
    },
    {
      title: 'Data & Storage',
      items: [
        {
          icon: RefreshCw,
          label: 'Auto Sync',
          description: 'Automatically sync data in background',
          toggle: true,
          value: autoSync,
          onToggle: setAutoSync,
        },
        {
          icon: Wifi,
          label: 'Sync on WiFi Only',
          description: 'Only sync when connected to WiFi',
          toggle: true,
          value: wifiOnly,
          onToggle: setWifiOnly,
        },
        {
          icon: Download,
          label: 'Download Quality',
          description: 'High Quality',
          action: () => Alert.alert('Download Quality', 'Quality settings coming soon!'),
        },
        {
          icon: Database,
          label: 'Storage Usage',
          description: 'View app storage usage',
          action: () => Alert.alert('Storage', 'Storage usage: 45.2 MB'),
        },
      ],
    },
    {
      title: 'Advanced',
      items: [
        {
          icon: Trash2,
          label: 'Clear Cache',
          description: 'Clear all cached data',
          action: handleClearCache,
          danger: true,
        },
        {
          icon: RefreshCw,
          label: 'Reset Settings',
          description: 'Reset all settings to default',
          action: handleResetSettings,
          danger: true,
        },
      ],
    },
  ];

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={[styles.container, isDark && styles.darkContainer]}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <LinearGradient
            colors={isDark ? ['#1F2937', '#374151'] : ['#f64137', '#f24637']}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <ArrowLeft size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Settings</Text>
              <View style={styles.placeholder} />
            </View>
          </LinearGradient>
        </Animated.View>

        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Settings Sections */}
          {settingSections.map((section, sectionIndex) => (
            <Animated.View 
              key={section.title} 
              entering={FadeInDown.delay(200 + sectionIndex * 100)} 
              style={styles.settingSection}
            >
              <Text style={[styles.sectionTitle, isDark && styles.darkText]}>{section.title}</Text>
              <View style={[styles.settingCard, isDark && styles.darkCard]}>
                {section.items.map((item, itemIndex) => (
                  <Animated.View
                    key={item.label}
                    entering={FadeInRight.delay(300 + sectionIndex * 100 + itemIndex * 50)}
                  >
                    <TouchableOpacity
                      style={[
                        styles.settingItem,
                        itemIndex < section.items.length - 1 && styles.settingItemBorder,
                      ]}
                      onPress={item.action}
                      disabled={item.toggle}
                      activeOpacity={item.toggle ? 1 : 0.7}
                    >
                      <View style={styles.settingItemLeft}>
                        <View style={[
                          styles.settingIcon,
                          item.danger && styles.dangerIcon,
                          { backgroundColor: item.danger ? '#FEE2E2' : (isDark ? '#374151' : '#F3F4F6') }
                        ]}>
                          <item.icon 
                            size={20} 
                            color={item.danger ? '#EF4444' : (isDark ? '#9CA3AF' : '#6B7280')} 
                          />
                        </View>
                        <View style={styles.settingContent}>
                          <Text style={[
                            styles.settingLabel,
                            item.danger && styles.dangerText,
                            isDark && styles.darkText,
                          ]}>
                            {item.label}
                          </Text>
                          <Text style={[styles.settingDescription, isDark && styles.darkSubText]}>
                            {item.description}
                          </Text>
                        </View>
                      </View>
                      
                      {item.toggle ? (
                        <Switch
                          value={item.value}
                          onValueChange={item.onToggle}
                          trackColor={{ false: isDark ? '#4B5563' : '#D1D5DB', true: '#f24637' }}
                          thumbColor={item.value ? '#FFFFFF' : '#FFFFFF'}
                        />
                      ) : null}
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>
            </Animated.View>
          ))}

          {/* App Info */}
          <Animated.View entering={FadeInDown.delay(800)} style={styles.appInfoContainer}>
            <View style={[styles.appInfoCard, isDark && styles.darkCard]}>
              <Text style={[styles.appInfoTitle, isDark && styles.darkText]}>App Information</Text>
              <View style={styles.appInfoItem}>
                <Text style={[styles.appInfoLabel, isDark && styles.darkSubText]}>Version</Text>
                <Text style={[styles.appInfoValue, isDark && styles.darkText]}>1.0.2</Text>
              </View>
              <View style={styles.appInfoItem}>
                <Text style={[styles.appInfoLabel, isDark && styles.darkSubText]}>Build</Text>
                <Text style={[styles.appInfoValue, isDark && styles.darkText]}>2024.01.15</Text>
              </View>
              <View style={styles.appInfoItem}>
                <Text style={[styles.appInfoLabel, isDark && styles.darkSubText]}>Developer</Text>
                <Text style={[styles.appInfoValue, isDark && styles.darkText]}>Austere Systems Limited</Text>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  darkContainer: {
    backgroundColor: '#111827',
  },
  header: {
    marginBottom: 24,
  },
  headerGradient: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  settingSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  darkText: {
    color: '#FFFFFF',
  },
  darkSubText: {
    color: '#9CA3AF',
  },
  settingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  darkCard: {
    backgroundColor: '#1F2937',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  settingItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  dangerIcon: {
    backgroundColor: '#FEE2E2',
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },
  dangerText: {
    color: '#EF4444',
  },
  appInfoContainer: {
    paddingHorizontal: 20,
    marginBottom: 100,
  },
  appInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  appInfoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  appInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  appInfoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  appInfoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
});