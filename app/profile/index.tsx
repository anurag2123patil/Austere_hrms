import React, { useEffect, useState, useCallback } from 'react';
import { useAlert } from '@/hooks/useAlert';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { toggleTheme, logout } from '@/store/slices/authSlice';
import { router } from 'expo-router';
import { User, Mail, Phone, MapPin, Calendar, Settings, Bell, Shield, CircleHelp as HelpCircle, LogOut, Moon, Sun, CreditCard as Edit, Award, Target, TrendingUp, ChevronRight, FileText, ArrowLeft } from 'lucide-react-native';
import Animated, {
  FadeInDown,
  FadeInRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLeaveBalances, getLeaveList, getAttendanceStatus, getOrganizationInfo, fetchEmployeesApi } from '@/api/Api';
import { useFocusEffect } from '@react-navigation/native';
export default function Profile() {
  const dispatch = useDispatch();
  const { user, theme } = useSelector((state: RootState) => state.auth);
  const { stats } = useSelector((state: RootState) => state.attendance);
  const { showAlert, AlertComponent } = useAlert();

  const isDark = theme === 'dark';
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const scale = useSharedValue(1);
  const currentYear = new Date().getFullYear();
  const [username, setUsername] = useState<string | null>(null);
  const [employeeInfo, setEmployeeInfo] = useState<any>(null);
  const [loadingEmployeeInfo, setLoadingEmployeeInfo] = useState(true);
  const [orgName, setOrgName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobCategory, setJobCategory] = useState('');
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleThemeToggle = () => {
    scale.value = withSpring(0.95, {}, () => {
      scale.value = withSpring(1);
    });
    dispatch(toggleTheme());
  };

  const handleLogout = () => {
    showAlert(
      'Logout',
      'Are you sure you want to logout?',
      'warning', 
      [
        
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              dispatch(logout());
              router.replace('/auth/login');
            } catch (error) {
              console.error('Error clearing AsyncStorage on logout:', error);
            }
          }
        },
      ]
    );
  };

  useEffect(() => {
    const fetchOrgName = async () => {
      try {
        const data = await getOrganizationInfo();
        setOrgName(data?.name || ''); // Fallback to empty string if name missing
      } catch (err) {
        console.warn('Could not load organization name');
      }
    };

    fetchOrgName();
  }, []);


  useFocusEffect(
    useCallback(() => {
      const fetchEmployeeDetails = async () => {
        setLoadingEmployeeInfo(true);
        const empNumber = await AsyncStorage.getItem('emp_number');
        if (!empNumber) {
          setLoadingEmployeeInfo(false);
          return;
        }

        try {
          const { data } = await fetchEmployeesApi(1, 1, { emp_number: empNumber });
          if (data.length > 0) {
            const emp = data[0];
            setEmployeeInfo(emp);
            setJobTitle(emp?.job_title?.job_title || '');
            setJobCategory(emp?.job_category?.name || '');
          }
        } catch (error) {
          console.error('Failed to fetch employee details:', error);
        } finally {
          setLoadingEmployeeInfo(false);
        }
      };

      fetchEmployeeDetails();
    }, [])
  );



  const profileStats = [
    { label: 'Attendance Rate', value: '94%', icon: TrendingUp, color: '#10B981' },
    { label: 'Projects Completed', value: '12', icon: Target, color: '#f24637' },
    { label: 'Team Rating', value: '4.8', icon: Award, color: '#F59E0B' },
  ];

  const menuSections = [
    {
      title: 'Account',
      items: [
        { icon: Edit, label: 'Edit Profile', action: () => router.push('/profile/edit') },
        { icon: FileText, label: 'Weekly Timesheet', action: () => router.push('/timesheet/weekly') },
        // { icon: Settings, label: 'Settings', action: () => router.push('/profile/settings') },
      ]
    },
    {
      title: 'Preferences',
      items: [
        { icon: Bell, label: 'Notifications', toggle: true, value: notificationsEnabled, onToggle: setNotificationsEnabled },
        { icon: isDark ? Sun : Moon, label: 'Theme', toggle: true, value: isDark, onToggle: handleThemeToggle },
      ]
    },
  
    {
      title: 'Account Actions',
      items: [
        { icon: LogOut, label: 'Logout', action: handleLogout, danger: true },
      ]
    }
  ];

  // Fallback image URL if user avatar is not available
  const base64Image = employeeInfo?.profile_picture?.picture_base64;
  const profileImageUrl = base64Image
    ? `data:image/jpeg;base64,${base64Image}`
    : '';

  const maxLength = 35;
  const fullName = `${employeeInfo?.emp_firstname || ''} ${employeeInfo?.emp_lastname || ''}`.trim();
  const displayName = fullName.length > maxLength
    ? fullName.substring(0, maxLength - 3) + '...'
    : fullName;

  return (
    <ScrollView style={[styles.container, isDark && styles.darkContainer]} showsVerticalScrollIndicator={false}>
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
            <Text style={styles.headerTitle}>Profile</Text>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.profileSection}>
            <Animated.View style={animatedStyle}>
              {profileImageUrl ? (
                <Image
                  source={{ uri: profileImageUrl }}
                  style={styles.avatar}
                />
              ) : (
                <Image
                  source={require('../../assets/images/userImage.png')} // your fallback image/Users/apple/Documents/ASL-hrms/asl-hrms-app/assets/images/userImage.png
                  style={styles.avatar}
                />
              )}
            </Animated.View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {displayName}
              </Text>
              <Text style={styles.profileRole}>{employeeInfo?.job_title?.job_title || 'Job Title'}</Text>
              <Text style={styles.profileDepartment}>{employeeInfo?.job_category?.name || 'Department'}</Text>
              <Text style={styles.companyName}>{orgName || 'Organization'}</Text>
            </View>

          </View>
        </LinearGradient>
      </Animated.View>

      {/* User Details Card */}
      <Animated.View entering={FadeInDown.delay(200)} style={styles.detailsContainer}>
        {loadingEmployeeInfo ? (
          <View style={[styles.detailsCard, isDark && styles.darkCard, { alignItems: 'center', padding: 20 }]}>
            <ActivityIndicator size="large" color={isDark ? '#fff' : '#000'} />
            <Text style={[styles.loadingText, isDark && styles.darkText]}>Loading employee details...</Text>
          </View>
        ) : (
          <View style={[styles.detailsCard, isDark && styles.darkCard]}>
            <Text style={[styles.cardTitle, isDark && styles.darkText]}>Personal Information</Text>
            <View style={styles.detailsList}>
              <View style={styles.detailItem}>
                <Mail size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, isDark && styles.darkSubText]}> Work Email</Text>
                  <Text style={[styles.detailValue, isDark && styles.darkText]}>
                    {employeeInfo?.emp_work_email || 'Not available'}
                  </Text>
                </View>
              </View>

              <View style={styles.detailItem}>
                <User size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, isDark && styles.darkSubText]}>Employee ID</Text>
                  <Text style={[styles.detailValue, isDark && styles.darkText]}>
                    {employeeInfo?.employee_id || 'Not available'}
                  </Text>
                </View>
              </View>

              <View style={styles.detailItem}>
                <Calendar size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, isDark && styles.darkSubText]}>Join Date</Text>
                  <Text style={[styles.detailValue, isDark && styles.darkText]}>
                    {employeeInfo?.joined_date}
                  </Text>
                </View>
              </View>

              <View style={styles.detailItem}>
                <MapPin size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, isDark && styles.darkSubText]}>Location</Text>
                  <Text style={[styles.detailValue, isDark && styles.darkText]}>
                    {employeeInfo?.location?.name || 'Not available'}
                  </Text>
                </View>
              </View>
            </View>

          </View>)}
      </Animated.View>

      {/* Performance Stats */}
      {/* <Animated.View entering={FadeInDown.delay(300)} style={styles.statsContainer}>
        <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Performance Overview</Text>
        <View style={styles.statsGrid}>
          {profileStats.map((stat, index) => (
            <Animated.View
              key={stat.label}
              entering={FadeInRight.delay(400 + index * 100)}
              style={[styles.statCard, isDark && styles.darkCard]}
            >
              <View style={[styles.statIcon, { backgroundColor: `${stat.color}20` }]}>
                <stat.icon size={24} color={stat.color} />
              </View>
              <Text style={[styles.statValue, isDark && styles.darkText]}>{stat.value}</Text>
              <Text style={[styles.statLabel, isDark && styles.darkSubText]}>{stat.label}</Text>
            </Animated.View>
          ))}
        </View>
      </Animated.View> */}

      {/* Menu Sections */}
      {menuSections.map((section, sectionIndex) => (
        <Animated.View
          key={section.title}
          entering={FadeInDown.delay(500 + sectionIndex * 100)}
          style={styles.menuSection}
        >
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>{section.title}</Text>
          <View style={[styles.menuCard, isDark && styles.darkCard]}>
            {section.items.map((item, itemIndex) => (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.menuItem,
                  itemIndex < section.items.length - 1 && styles.menuItemBorder,
                ]}
                onPress={item.action}
                disabled={item.toggle}
              >
                <View style={styles.menuItemLeft}>
                  <View style={[
                    styles.menuIcon,
                    item.danger && styles.dangerIcon,
                    { backgroundColor: item.danger ? '#FEE2E2' : (isDark ? '#374151' : '#F3F4F6') }
                  ]}>
                    <item.icon
                      size={20}
                      color={item.danger ? '#EF4444' : (isDark ? '#9CA3AF' : '#6B7280')}
                    />
                  </View>
                  <Text style={[
                    styles.menuLabel,
                    item.danger && styles.dangerText,
                    isDark && styles.darkText,
                  ]}>
                    {item.label}
                  </Text>
                </View>

                {item.toggle ? (
                  <Switch
                    value={item.value}
                    onValueChange={item.onToggle}
                    trackColor={{ false: '#D1D5DB', true: '#f24637' }}
                    thumbColor={item.value ? '#FFFFFF' : '#FFFFFF'}
                  />
                ) : (
                  <ChevronRight
                    size={20}
                    color={isDark ? '#9CA3AF' : '#6B7280'}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      ))}

      {/* App Version */}
      <Animated.View entering={FadeInDown.delay(800)} style={styles.versionContainer}>
        <Text style={[styles.versionText, isDark && styles.darkSubText]}>
          ASL HRMS v1.0.2
        </Text>
        <Text style={[styles.copyrightText, isDark && styles.darkSubText]}>
          © {currentYear} Austere Systems Limited
        </Text>
      </Animated.View>
      <AlertComponent />

    </ScrollView>
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
    paddingBottom: 40,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
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
  profileSection: {
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    marginBottom: 16,
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 2,
  },
  profileDepartment: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 4,
  },
  companyName: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.7,
    fontWeight: '500',
  },
  detailsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  darkCard: {
    backgroundColor: '#1F2937',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  darkText: {
    color: '#FFFFFF',
  },
  darkSubText: {
    color: '#9CA3AF',
  },
  detailsList: {
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  menuSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
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
  menuLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  dangerText: {
    color: '#EF4444',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 100,
  },
  versionText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  copyrightText: {
    fontSize: 10,
    color: '#6B7280',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280', // gray-500 (for light mode)
  },

});