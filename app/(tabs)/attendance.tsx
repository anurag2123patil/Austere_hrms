import React, { useCallback, useEffect, useState } from 'react';
import { DatePickerModal } from "react-native-paper-dates";
import { useAlert } from '@/hooks/useAlert';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator, Modal, FlatList,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector, useDispatch } from 'react-redux';
import { AppDispatch, RootState } from '@/store/store';
import { punchInThunk, punchOutThunk, getAttendanceStatusThunk, getEmployeeDurationThunk } from '@/store/slices/attendanceSlice';
import { router } from 'expo-router';
import { Clock, MapPin, Calendar, TrendingUp, CircleCheck as CheckCircle, Circle as XCircle, TriangleAlert as AlertTriangle, Play, Square, FileText, ChartBar as BarChart3, Timer, Target, Award, ChevronRight, Activity, Zap } from 'lucide-react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeInRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  interpolate,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchEmployeeAttendanceRecords, fetchMonthlyAttendance, fetchWeeklyAttendance } from '@/api/Api';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from "@react-native-picker/picker";
import LiveClock from '../../components/LiveClock';
import { Svg, Circle } from 'react-native-svg';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import dayjs from 'dayjs';
import WheelPickerExpo from 'react-native-wheel-picker-expo';

dayjs.extend(customParseFormat);
const { width } = Dimensions.get('window');

interface TransformedAttendanceRecord {
  id: number;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  totalHours: string;
  status: 'present' | 'absent' | 'half-day';
  totalSeconds?: number;
}

export default function Attendance() {
  const today = new Date();
  const { showAlert, AlertComponent } = useAlert();

  const dispatch = useDispatch<AppDispatch>();
  const { theme } = useSelector((state: RootState) => state.auth);
  const { records, stats, isCheckedIn, todayRecord, loading } = useSelector((state: RootState) => state.attendance);
  const isDark = theme === 'dark';
  const [currentTime, setCurrentTime] = useState(new Date());
  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);
  const [record, setRecord] = useState<TransformedAttendanceRecord[]>([]);

  const currentYear = new Date().getFullYear();
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth()); // 0 = January
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const years = Array.from({ length: currentYear - 2019 + 1 }, (_, i) => 2020 + i);

  const [performanceMetrics, setPerformanceMetrics] = useState<
    { label: string; value: string; icon: any; color: string; trend: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [attendanceStats, setAttendanceStats] = useState({
    presentDays: 0,
    totalDays: 0,
    averageHours: 0,
    attendancePercent: 0,
    efficiency: 0,
    half_days: 0,
    absent_days: 0,
    total_hours: 0
  });

  // Animation effects
  React.useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withSpring(1.05, { damping: 15 }),
        withSpring(1, { damping: 15 })
      ),
      -1,
      true
    );

    glowOpacity.value = withRepeat(
      withSequence(
        withSpring(0.6, { duration: 1500 }),
        withSpring(0.3, { duration: 1500 })
      ),
      -1,
      true
    );
  }, []);

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: interpolate(glowOpacity.value, [0.3, 0.6], [1, 1.1]) }],
  }));

  // Load attendance data function
  const loadAttendance = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const empId = await AsyncStorage.getItem('User_id');

      if (token && empId) {
        const { records } = await fetchEmployeeAttendanceRecords(empId, token);
        const transformed = transformAttendanceRecords(records);
        setRecord(transformed);
      }
    } catch (error) {
      console.error('Failed to load attendance records:', error);
    }
  }, []);

  const fetchAttendanceAnalytics = useCallback(async (monthStart: string, monthEnd: string) => {
    try {
      const data = await fetchMonthlyAttendance(monthStart, monthEnd);
      const totalDays = dayjs(monthEnd).diff(dayjs(monthStart), 'day') + 1;
      const efficiency = totalDays > 0 ? Math.round((data.present_days / totalDays) * 100) : 0;

      setAttendanceStats({
        presentDays: data.present_days,
        totalDays: totalDays,
        averageHours: parseFloat(data.average_hours_per_day?.toFixed(1) || '0'),
        attendancePercent: Math.round(data.attendance_percent || 0),
        efficiency: efficiency,
        half_days: data.half_days,
        absent_days: data.absent_days,
        total_hours: data.total_hours
      });
    } catch (err) {
      console.error('Failed to fetch attendance data:', err);
    }
  }, []);

  // Load weekly metrics function
  const loadWeeklyMetrics = useCallback(async () => {
    try {
      const data = await fetchWeeklyAttendance();
      console.log('Weekly performance data:', data);

      const expectedHours = data.present_days * 8;
      const efficiency = expectedHours && data.total_hours
        ? ((parseFloat(data.total_hours) / expectedHours) * 100).toFixed(1)
        : '0';

      const rating = data.attendance_percent
        ? (data.attendance_percent / 20).toFixed(1)
        : '0';

      const updatedMetrics = [
        { label: 'This Week', value: `${data.total_hours ? parseFloat(data.total_hours).toFixed(1) : '0.0'}h`, icon: Timer, color: '#f24637', trend: '' },
        { label: 'Avg Daily', value: `${data.average_hours_per_day ? data.average_hours_per_day.toFixed(1) : '0.0'}h`, icon: Target, color: '#10B981', trend: '' },
        { label: 'Efficiency', value: `${efficiency}%`, icon: Zap, color: '#8B5CF6', trend: '' },
        { label: 'Rating', value: `${rating}`, icon: Award, color: '#F59E0B', trend: '' },
      ];

      setPerformanceMetrics(updatedMetrics);
    } catch (error) {
      console.warn('Failed to load performance metrics:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // MAIN INITIALIZATION EFFECT - RUNS ONCE WHEN COMPONENT MOUNTS
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Set current date
        const start = dayjs(today).startOf('month').format('YYYY-MM-DD');
        const end = dayjs(today).endOf('month').format('YYYY-MM-DD');

        // Load all data in parallel
        await Promise.all([
          fetchAttendanceAnalytics(start, end),
          loadAttendance(),
          loadWeeklyMetrics()
        ]);

        // Dispatch Redux actions
        dispatch(getAttendanceStatusThunk());
        dispatch(getEmployeeDurationThunk());

      } catch (error) {
        console.error('Failed to initialize attendance data:', error);
      }
    };

    initializeData();
  }, []); // Empty dependency array - runs only once on mount

  // Effect for auto-refresh when checked in
  useEffect(() => {
    const interval = setInterval(() => {
      if (isCheckedIn) {
        dispatch(getEmployeeDurationThunk());
      }
    }, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, [isCheckedIn, dispatch]);

  const handleCheckIn = async () => {
    try {
      await dispatch(punchInThunk()).unwrap();
      showAlert('Success', 'Punched In successfully!','success');
      dispatch(getAttendanceStatusThunk());
      loadAttendance();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Something went wrong while punching in.';
      showAlert('Error', message,'error');
    }
  };

  const handleCheckOut = async () => {
    try {
      await dispatch(punchOutThunk()).unwrap();
      showAlert('Success', 'Punched Out successfully!','success');
      // Refresh data after check-out
      dispatch(getAttendanceStatusThunk());
      loadAttendance();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Something went wrong while punching out.';
      showAlert('Error', message,'error');
    }
  };

  const handleMonthChange = () => {
    setShowDatePicker(false);

    // Create a date from the selected month and year
    const date = new Date(selectedYear, selectedMonth, 1);
    const start = dayjs(date).startOf('month').format('YYYY-MM-DD');
    const end = dayjs(date).endOf('month').format('YYYY-MM-DD');

    fetchAttendanceAnalytics(start, end);
  };

  // Rest of your helper functions (getStatusColor, getStatusIcon, formatDate, etc.)
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return '#10B981';
      case 'absent': return '#EF4444';
      case 'half-day': return '#8B5CF6';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return CheckCircle;
      case 'absent': return XCircle;
      case 'half-day': return Clock;
      default: return Clock;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    });
  };

  const convertDurationToSeconds = (duration: string): number => {
    if (!duration) return 0;
    const [hh, mm, ss] = duration.split(":").map(Number);
    return hh * 3600 + mm * 60 + ss;
  };

  const formatSecondsToHHMM = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  };

  const transformAttendanceRecords = (records: any[]): TransformedAttendanceRecord[] => {
    const groupedByDate: Record<string, TransformedAttendanceRecord> = {};

    records.forEach((record) => {
      const punchInDate = record.punchIn ? dayjs(record.punchIn, 'YYYY-MM-DD hh:mm A') : null;
      const punchOutDate = record.punchOut ? dayjs(record.punchOut, 'YYYY-MM-DD hh:mm A') : null;

      const date = punchInDate ? punchInDate.format('YYYY-MM-DD') : null;
      if (!date) return;

      if (!groupedByDate[date]) {
        groupedByDate[date] = {
          id: record.id,
          date,
          checkIn: punchInDate ? punchInDate.format('hh:mm A') : null,
          checkOut: punchOutDate ? punchOutDate.format('hh:mm A') : null,
          totalHours: '00:00',
          status: 'present',
        };
      } else {
        if (punchInDate && (!groupedByDate[date].checkIn ||
          punchInDate.isBefore(dayjs(`${date} ${groupedByDate[date].checkIn}`, 'YYYY-MM-DD hh:mm A')))) {
          groupedByDate[date].checkIn = punchInDate.format('hh:mm A');
        }

        if (punchOutDate && (!groupedByDate[date].checkOut ||
          punchOutDate.isAfter(dayjs(`${date} ${groupedByDate[date].checkOut}`, 'YYYY-MM-DD hh:mm A')))) {
          groupedByDate[date].checkOut = punchOutDate.format('hh:mm A');
        }
      }

      if (record.duration) {
        const seconds = convertDurationToSeconds(record.duration);
        groupedByDate[date].totalSeconds = (groupedByDate[date].totalSeconds || 0) + seconds;
      }
    });

    return Object.values(groupedByDate).map((entry) => {
      const totalSeconds = entry.totalSeconds || 0;
      const formattedHHMM = formatSecondsToHHMM(totalSeconds);
      const hoursOnly = totalSeconds / 3600;

      return {
        ...entry,
        totalHours: formattedHHMM,
        status:
          hoursOnly <= 3
            ? "absent"
            : hoursOnly >= 8
              ? "present"
              : hoursOnly >= 4
                ? "half-day"
                : "half-day",
      };
    });
  };

  const quickActions = [
    {
      title: 'Weekly Timesheet',
      subtitle: 'Track project hours',
      icon: FileText,
      color: '#10B981',
      action: () => router.push('/timesheet/weekly'),
    },
    {
      title: 'Attendance Report',
      subtitle: 'View detailed reports',
      icon: BarChart3,
      color: '#3B82F6',
      action: () => router.push('/attendance/report'),
    },
  ];


  return (
    <View style={[{ flex: 1 }, isDark && styles.darkContainer]}>
      {/* Enhanced Header */}
      <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
        <LinearGradient
          colors={isDark ? ['#1F2937', '#374151'] : ['#f65c5c', '#ed3a3a']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>Attendance</Text>
              <Text style={styles.headerSubtitle}>Track your work hours & productivity</Text>
            </View>
            <View style={styles.headerStats}>
              <View style={styles.headerStatItem}>
                <Activity size={16} color="#FFFFFF" />
                <Text style={styles.headerStatText}>Live</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
      <ScrollView style={[styles.container, isDark && styles.darkContainer]} showsVerticalScrollIndicator={false}>

        {/* Enhanced Clock & Check-in Section */}
        <Animated.View entering={FadeInUp.delay(200)} style={styles.clockContainer}>
          <View style={[styles.clockCard, isDark && styles.darkCard]}>
            {/* Live Time Display with API data */}
            <View style={styles.timeSection}>
              <LiveClock
                isDark={isDark}
                isCheckedIn={isCheckedIn}
                checkInTime={todayRecord?.checkIn}
                checkOutTime={todayRecord?.checkOut}
                accumulatedSeconds={todayRecord?.accumulatedSeconds || 0}
                totalDuration={todayRecord?.total_duration_web || '00:00:00'}
              />
            </View>

            {/* Enhanced Check-in/out Button */}
            <View style={styles.checkInOutContainer}>
              <>
                {loading ? (
                  <ActivityIndicator />
                ) : (
                  <>
                    {!isCheckedIn ? (
                      <View style={styles.checkInWrapper}>
                        <Animated.View style={[styles.glowEffect, animatedGlowStyle]}>
                          <View style={styles.glowCircle} />
                        </Animated.View>
                        <Animated.View style={animatedPulseStyle}>
                          <TouchableOpacity style={styles.checkInButton} onPress={handleCheckIn}>
                            <LinearGradient
                              colors={['#10B981', '#059669', '#047857']}
                              style={styles.checkInGradient}
                            >
                              <Play size={28} color="#FFFFFF" />
                              <Text style={styles.checkInText}>Check In</Text>
                            </LinearGradient>
                          </TouchableOpacity>
                        </Animated.View>
                      </View>
                    ) : (
                      <TouchableOpacity style={styles.checkOutButton} onPress={handleCheckOut}>
                        <LinearGradient
                          colors={['#EF4444', '#DC2626', '#B91C1C']}
                          style={styles.checkOutGradient}
                        >
                          <Square size={28} color="#FFFFFF" />
                          <Text style={styles.checkOutText}>Check Out</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </>
            </View>

            {/* Today's Status */}
            {todayRecord?.checkIn && (
              <Animated.View entering={FadeInUp.delay(300)} style={styles.todayStatus}>
                <View style={styles.statusRow}>
                  <View style={styles.statusItem}>
                    <MapPin size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
                    <Text style={[styles.statusText, isDark && styles.darkSubText]}>
                      {todayRecord.location || 'Office - New York'}
                    </Text>
                  </View>
                  <View style={styles.statusItem}>
                    <Clock size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
                    <Text style={[styles.statusText, isDark && styles.darkSubText]}>
                      Started at {todayRecord.checkIn}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            )}
          </View>
        </Animated.View>

        {/* Performance Metrics */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.metricsContainer}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Performance Metrics</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.metricsScroll}>
            {performanceMetrics.length === 0 ? (
              <Text style={{ padding: 16 }}>No performance data available.</Text>
            ) : (
              performanceMetrics.map((metric, index) => (
                <Animated.View
                  key={metric.label}
                  entering={FadeInRight.delay(400 + index * 100)}
                  style={[styles.metricCard, isDark && styles.darkCard]}
                >
                  <View style={[styles.metricIcon, { backgroundColor: `${metric.color}20` }]}>
                    <metric.icon size={24} color={metric.color} />
                  </View>
                  <Text style={[styles.metricValue, isDark && styles.darkText]}>{metric.value}</Text>
                  <Text style={[styles.metricLabel, isDark && styles.darkSubText]}>{metric.label}</Text>
                </Animated.View>
              ))
            )}
          </ScrollView>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View entering={FadeInDown.delay(400)} style={styles.actionsContainer}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action, index) => (
              <Animated.View
                key={action.title}
                entering={FadeInRight.delay(500 + index * 100)}
                style={styles.actionCardWrapper}
              >
                <TouchableOpacity
                  style={[styles.actionCard, isDark && styles.darkCard]}
                  onPress={action.action}
                >
                  <View style={[styles.actionIcon, { backgroundColor: `${action.color}20` }]}>
                    <action.icon size={28} color={action.color} />
                  </View>
                  <View style={styles.actionContent}>
                    <Text style={[styles.actionTitle, isDark && styles.darkText]}>{action.title}</Text>
                    <Text style={[styles.actionSubtitle, isDark && styles.darkSubText]}>{action.subtitle}</Text>
                  </View>
                  <ChevronRight size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Enhanced Stats Overview */}
        <Animated.View entering={FadeInDown.delay(500)} style={styles.statsContainer}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>This Month Overview</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, isDark && styles.darkCard]}>
              <View style={[styles.statIcon, { backgroundColor: '#10B98120' }]}>
                <CheckCircle size={28} color="#10B981" />
              </View>
              <Text style={[styles.statValue, isDark && styles.darkText]}>{attendanceStats.presentDays}</Text>
              <Text style={[styles.statLabel, isDark && styles.darkSubText]}>Present Days</Text>
              <View style={styles.statProgress}>
                <View style={[styles.statProgressFill, { width: `${(attendanceStats.presentDays / attendanceStats.totalDays) * 100}%`, backgroundColor: '#10B981' }]} />
              </View>
            </View>

            <View style={[styles.statCard, isDark && styles.darkCard]}>
              <View style={[styles.statIcon, { backgroundColor: '#EF444420' }]}>
                <XCircle size={28} color="#EF4444" />
              </View>
              <Text style={[styles.statValue, isDark && styles.darkText]}>{attendanceStats.absent_days}</Text>
              <Text style={[styles.statLabel, isDark && styles.darkSubText]}>Absent Days</Text>
              <View style={styles.statProgress}>
                <View style={[styles.statProgressFill, { width: `${(attendanceStats.absent_days / attendanceStats.totalDays) * 100}%`, backgroundColor: '#EF4444' }]} />
              </View>
            </View>

            <View style={[styles.statCard, isDark && styles.darkCard]}>
              <View style={[styles.statIcon, { backgroundColor: '#F59E0B20' }]}>
                <AlertTriangle size={28} color="#F59E0B" />
              </View>
              <Text style={[styles.statValue, isDark && styles.darkText]}>{attendanceStats.half_days}</Text>
              <Text style={[styles.statLabel, isDark && styles.darkSubText]}>Half Days</Text>
              <View style={styles.statProgress}>
                <View style={[styles.statProgressFill, { width: `${(attendanceStats.half_days / attendanceStats.totalDays) * 100}%`, backgroundColor: '#F59E0B' }]} />
              </View>
            </View>

            <View style={[styles.statCard, isDark && styles.darkCard]}>
              <View style={[styles.statIcon, { backgroundColor: '#3B82F620' }]}>
                <TrendingUp size={28} color="#3B82F6" />
              </View>
              <Text style={[styles.statValue, isDark && styles.darkText]}>{attendanceStats.total_hours}h</Text>
              <Text style={[styles.statLabel, isDark && styles.darkSubText]}>Total Hours</Text>
              <View style={styles.statProgress}>
                <View style={[styles.statProgressFill, { width: `${(attendanceStats.total_hours / 200) * 100}%`, backgroundColor: '#3B82F6' }]} />
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Enhanced Recent Records */}
        <Animated.View entering={FadeInDown.delay(600)} style={styles.recordsContainer}>
          <View style={styles.recordsHeader}>
            <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Recent Records</Text>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => router.push('/attendance/records')}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <ChevronRight size={16} color="#f24637" />
            </TouchableOpacity>
          </View>
          <View style={[styles.recordsCard, isDark && styles.darkCard]}>
            {record.slice(0, 5).map((record, index) => {
              const StatusIcon = getStatusIcon(record.status);
              const statusColor = getStatusColor(record.status);

              return (
                <Animated.View
                  key={record.id}
                  entering={FadeInRight.delay(700 + index * 100)}
                  style={styles.recordItem}
                >
                  <View style={styles.recordLeft}>
                    <View style={[styles.recordIcon, { backgroundColor: `${statusColor}20` }]}>
                      <StatusIcon size={18} color={statusColor} />
                    </View>
                    <View style={styles.recordInfo}>
                      <Text style={[styles.recordDate, isDark && styles.darkText]}>{formatDate(record.date)}</Text>
                      <Text style={[styles.recordStatus, { color: statusColor }]}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.recordRight}>
                    {record.checkIn && (
                      <View style={styles.timeInfo}>
                        <Text style={[styles.timeLabel, isDark && styles.darkSubText]}>In: {record.checkIn}</Text>
                        {record.checkOut && (
                          <Text style={[styles.timeLabel, isDark && styles.darkSubText]}>Out: {record.checkOut}</Text>
                        )}
                      </View>
                    )}
                    <View style={styles.hoursContainer}>
                      <Text style={[styles.totalHours, isDark && styles.darkText]}>{record.totalHours}h</Text>
                      <View style={[styles.hoursBadge, { backgroundColor: statusColor + '20' }]}>
                        <Text style={[styles.hoursBadgeText, { color: statusColor }]}>
                          {parseFloat(record.totalHours.split(':')[0]) >= 8 ? 'Full' : 'Partial'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Animated.View>
              );
            })}
          </View>
        </Animated.View>

        {/* Enhanced Performance Chart */}
        <Animated.View entering={FadeInDown.delay(700)} style={[
          styles.performanceContainer,
          Platform.OS === "ios" && { paddingBottom: 40 },
        ]}>
          <View style={[styles.performanceCard, isDark && styles.darkCard]}>
            <View style={styles.performanceHeader}>
              // Fix the performance title to show correct month and year
              <Text style={[styles.performanceTitle, isDark && styles.darkText]}>
                {dayjs(new Date(selectedYear, selectedMonth, 1)).format('MMMM YYYY')} Analytics
              </Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={{ padding: 8 }}
              >
                <BarChart3 size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
              </TouchableOpacity>
            </View>

            <View style={styles.performanceContent}>
              <View style={styles.circularProgressContainer}>
                {loading ? (
                  <ActivityIndicator size="large" />
                ) : (
                  <Svg height="120" width="120" viewBox="0 0 120 120">
                    <Circle
                      cx="60"
                      cy="60"
                      r="50"
                      stroke="#D4D4D4"
                      strokeWidth="10"
                      fill="none"
                    />
                    <Circle
                      cx="60"
                      cy="60"
                      r="50"
                      stroke="#f24637"
                      strokeWidth="10"
                      strokeDasharray={`${Math.PI * 100}`}
                      strokeDashoffset={`${Math.PI * 100 * (1 - attendanceStats.attendancePercent / 100)}`}
                      strokeLinecap="round"
                      fill="none"
                      rotation="-90"
                      origin="60,60"
                    />
                  </Svg>
                )}

                {!loading && (
                  <View style={styles.centeredText}>
                    <Text style={[styles.percentageText, isDark && styles.darkText]}>
                      {attendanceStats.attendancePercent}%
                    </Text>
                    <Text style={[styles.percentageLabel, isDark && styles.darkSubText]}>
                      Attendance
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.performanceDetails}>
                <View style={styles.performanceItem}>
                  <Text style={[styles.performanceValue, isDark && styles.darkText]}>
                    {attendanceStats.averageHours}h
                  </Text>
                  <Text style={[styles.performanceLabel, isDark && styles.darkSubText]}>
                    Avg. Daily
                  </Text>
                </View>
                <View style={styles.performanceItem}>
                  <Text style={[styles.performanceValue, isDark && styles.darkText]}>
                    {attendanceStats.presentDays}
                  </Text>
                  <Text style={[styles.performanceLabel, isDark && styles.darkSubText]}>
                    Working Days
                  </Text>
                </View>
                <View style={styles.performanceItem}>
                  <Text style={[styles.performanceValue, isDark && styles.darkText]}>
                    {attendanceStats.efficiency}%
                  </Text>
                  <Text style={[styles.performanceLabel, isDark && styles.darkSubText]}>
                    Efficiency
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {showDatePicker && (
        <Modal
          transparent
          visible={showDatePicker}
          animationType="fade"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{
              flex: 1,
              backgroundColor: '#00000088',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={() => setShowDatePicker(false)}
          >
            <View
              style={{
                backgroundColor: isDark ? '#1c2330ff' : '#f3f2f2ff',
                borderRadius: 10,
                padding: 10,
                margin: 5,
                width: 'auto',
                // height:300,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: 'bold',
                  marginBottom: 20,
                  marginTop: 20,
                  color: isDark ? '#fff' : '#000',
                  textAlign: 'center',
                }}
              >
                Select Date
              </Text>

              {/* Scroll Pickers */}
              <View style={{ padding: 5, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>

                {/* Month */}
                <WheelPickerExpo
                  height={150}
                  width={100}
                  backgroundColor={isDark ? '#000000' : '#ffffff'}
                  items={months.map((m, i) => ({ label: m, value: i }))}
                  selectedStyle={{
                    borderColor: '#3498db',
                    borderWidth: 2,
                    backgroundColor: isDark ? '#111111' : '#f0f0f0',
                    borderRadius: 8,
                  }}
                  itemTextStyle={{
                    color: isDark ? '#fff' : '#000',
                    fontWeight: '600',
                  }}
                  onChange={({ item }) => setSelectedMonth(item.value)}
                />

                {/* Year */}
                <WheelPickerExpo
                  height={150}
                  width={100}
                  backgroundColor={isDark ? '#000000' : '#ffffff'}
                  items={years.map(y => ({ label: `${y}`, value: y }))}
                  selectedStyle={{
                    borderColor: '#3498db',
                    borderWidth: 2,
                    backgroundColor: isDark ? '#111111' : '#f0f0f0',
                    borderRadius: 8,
                  }}
                  itemTextStyle={{
                    color: isDark ? '#fff' : '#000',
                    fontWeight: '600',
                  }}
                  onChange={({ item }) => setSelectedYear(item.value)}
                />
              </View>

              {/* Buttons */}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 15 }}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={{ marginRight: 20, color: '#999', fontSize: 15 }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    const today = new Date();
                    const year = selectedYear ?? today.getFullYear();
                    const month = selectedMonth ?? today.getMonth();

                    const date = new Date(year, month, 1); // 1st day of month
                    handleMonthChange(); // call only on Confirm
                  }}

                >
                  <Text style={{ color: '#3498db', fontWeight: 'bold', fontSize: 15 }}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

      )}
    <AlertComponent/>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingBottom: 100,
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
    paddingBottom: 30,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 4,
  },
  headerStats: {
    alignItems: 'center',
  },
  headerStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  headerStatText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  clockContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  clockCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  darkCard: {
    // backgroundColor: '#0058d4ff',
    backgroundColor: '#1F2937',
  },
  timeSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  currentTime: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#111827',
    letterSpacing: 2,
  },
  darkText: {
    color: '#FFFFFF',
  },
  darkSubText: {
    color: '#9CA3AF',
  },
  currentDate: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
    fontWeight: '500',
  },
  checkInOutContainer: {
    marginBottom: 24,
  },
  checkInWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowEffect: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 70,
    backgroundColor: '#10B981',
    opacity: 0.2,
  },
  checkInButton: {
    borderRadius: 60,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  checkInGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 20,
    gap: 12,
  },
  checkInText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  checkOutButton: {
    borderRadius: 60,
    overflow: 'hidden',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  checkOutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 20,
    gap: 12,
  },
  checkOutText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  todayStatus: {
    width: '100%',
  },
  statusRow: {
    gap: 16,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  metricsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  metricsScroll: {
    flexDirection: 'row',
  },
  metricCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginRight: 16,
    alignItems: 'center',
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 10,
    marginTop: 10
  },
  metricIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  metricTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricTrendText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  actionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  actionsGrid: {
    gap: 12,
  },
  actionCardWrapper: {
    width: '100%',
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: (width - 52) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  statIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 12,
  },
  statProgress: {
    width: '100%',
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  statProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  recordsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  recordsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    color: '#f24637',
    fontWeight: '600',
  },
  recordsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  recordItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  recordLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recordIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  recordInfo: {
    flex: 1,
  },
  recordDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  recordStatus: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  recordRight: {
    alignItems: 'flex-end',
  },
  timeInfo: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  timeLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
  hoursContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  totalHours: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  hoursBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  hoursBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  performanceContainer: {
    paddingHorizontal: 20,
    marginBottom: 40,
    paddingBottom: 30
  },
  performanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  performanceTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  performanceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  circularProgressContainer: {
    alignItems: 'center',
  },
  circularProgress: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 8,
    borderColor: '#f24637',
    borderTopColor: '#F3F4F6',
    borderRightColor: '#F3F4F6',
  },
  percentageText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  percentageLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  performanceDetails: {
    flex: 1,
    gap: 16,
  },
  performanceItem: {
    alignItems: 'center',
  },
  performanceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  performanceLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  centeredText: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionInfo: {
    marginTop: 8,
    alignItems: 'center',
  },
  sessionText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
});