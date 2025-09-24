import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { router } from 'expo-router';
import { Clock, Calendar, Users, TrendingUp, CircleCheck as CheckCircle, CircleAlert as AlertCircle, ChartBar as BarChart3, Target, CreditCard as Edit, FileText, Activity, Zap, Timer, Award, CalendarClock, Info } from 'lucide-react-native';
import Animated, {
  FadeInDown,
  FadeInRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLeaveBalances, getLeaveList, getAttendanceStatus, getOrganizationInfo, fetchEmployeesApi, getPimStats, fetchMonthlyAttendance, getTimesheetDashboard } from '@/api/Api';
import { DateTime } from 'luxon';
import dayjs from 'dayjs';
import { useFocusEffect } from '@react-navigation/native';
const { width } = Dimensions.get('window');
type LeaveItem = {
  id: string | number;
  employee: {
    firstName: string;
    lastName: string;
  };
  leaveType: {
    name: string;
  };
  dates: {
    fromDate: string;
    toDate?: string;
  };
  leaveBreakdown: {
    id: string | number;
    name: string;
  }[];
};


export default function Dashboard() {
  const { user, theme } = useSelector((state: RootState) => state.auth);
  const { stats } = useSelector((state: RootState) => state.attendance);
  const { balances } = useSelector((state: RootState) => state.leave);
  const { unreadCount } = useSelector((state: RootState) => state.notification);
  const [username, setUsername] = useState<string | null>(null);
  const isDark = theme === 'dark';
  const pulseScale = useSharedValue(1);
  const [leaveList, setLeaveList] = useState([]);
  const [leaveLoading, setLeaveLoading] = useState(true);
  const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
  const [hoursToday, setHoursToday] = useState('0h');
  const [orgName, setOrgName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobCategory, setJobCategory] = useState('');
  const [employeeInfo, setEmployeeInfo] = useState<any>(null);
  const [teamMemberCount, setTeamMemberCount] = useState<number | null>(null);
  const [checkInTime, setCheckInTime] = useState('');
  const [attendanceData, setAttendanceData] = useState({
    present_days: 0,
    total_hours: 0,
    attendance_percent: 0,
  });
  const [timesheetValue, setTimesheetValue] = useState('');
  const [isTimesheetModalVisible, setIsTimesheetModalVisible] = useState(false);
  const [timesheetData, setTimesheetData] = useState(null);

  React.useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withSpring(1.05),
        withSpring(1)
      ),
      -1,
      true
    );
  }, []);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];

    const fetchLeaveList = async () => {
      try {
        const data = await getLeaveList(today, today);

        // Filter out rejected or cancelled leaves
        const filteredData = (data?.data?.data || []).filter((leave) => {
          return !leave.leaveBreakdown.some((status) =>
            ["REJECTED", "CANCELLED"].includes(status.name?.toUpperCase())
          );
        });

        setLeaveList(filteredData);
      } catch (err) {
        console.warn('Failed to fetch leave list:', err.message);
      } finally {
        setLeaveLoading(false);
      }
    };

    fetchLeaveList();
  }, []);




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


  useEffect(() => {
    const fetchData = async () => {
      try {

        const res = await getTimesheetDashboard();

        if (res.status === 'success') {
          const { week_start, week_end, total_duration } = res.data;

          const startDate = new Date(week_start);
          const endDate = new Date(week_end);

          const safeDuration = total_duration ?? 0;
          const roundedDuration = parseFloat(safeDuration.toFixed(2));

          const weekLabel = `${startDate.getDate()}-${endDate.getDate()} ${startDate.toLocaleString('en-US', { month: 'short' })}`;
          setTimesheetValue(`${weekLabel}: ${roundedDuration}/40`);
        }


      } catch (error) {
        console.error('Failed to load timesheet:', error);
      }
    };

    fetchData();
  }, []);




  useFocusEffect(
    useCallback(() => {
      const fetchEmployeeDetails = async () => {
        const empNumber = await AsyncStorage.getItem('emp_number');
        if (!empNumber) return;

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
        }
      };

      fetchEmployeeDetails();
    }, [])
  );

  const parseTime = (timeStr, zone) => {
    if (!timeStr) return null;

    const normalizeHHmm = (t) => {
      const [h, m] = t.split(':');
      const hh = h.padStart(2, '0');
      const mm = (m || '00').padStart(2, '0');
      return `${hh}:${mm}`;
    };

    let dt;
    if (timeStr.includes('T')) {

      try {
        dt = DateTime.fromISO(timeStr, { zone });
        if (!dt.isValid) throw new Error();
      } catch {
        dt = DateTime.fromISO(timeStr);
      }
    } else {
      // Just time
      const normTime = normalizeHHmm(timeStr);
      try {
        dt = DateTime.fromFormat(normTime, 'HH:mm', { zone });
        if (!dt.isValid) throw new Error();
      } catch {
        dt = DateTime.fromFormat(normTime, 'HH:mm');
      }
    }

    return dt;
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchHours = async () => {
      try {
        const employeeId = await AsyncStorage.getItem('User_id');
        const token = await AsyncStorage.getItem('token');
        if (!employeeId || !token) return;

        const res = await getAttendanceStatus(Number(employeeId), token);

        const checkInDateStr = res?.data?.punchInDate; // e.g., "2025-08-19"
        const checkInTimeStr = res?.data?.checkInTime; // e.g., "11:41"
        const checkOutTimeStr = res?.data?.checkOutTime || null;
        const stateName = (res?.data?.state?.name || '').toUpperCase();
        const timeZone = res?.data?.location || 'Asia/Kolkata';

        if (!checkInDateStr || !checkInTimeStr || !stateName) {
          setCheckInTime(null);
          setHoursToday('0m');
          return;
        }

        // Combine punchInDate + checkInTime
        const checkIn = DateTime.fromFormat(
          `${checkInDateStr} ${checkInTimeStr}`,
          'yyyy-MM-dd HH:mm',
          { zone: timeZone }
        );

        if (!checkIn.isValid) {
          setCheckInTime(null);
          setHoursToday('0m');
          return;
        }

        setCheckInTime(checkIn.toFormat('HH:mm'));

        let durationMinutes = 0;

        if (stateName.includes('PUNCHED OUT') && checkOutTimeStr) {
          const checkOut = DateTime.fromFormat(
            `${checkInDateStr} ${checkOutTimeStr}`,
            'yyyy-MM-dd HH:mm',
            { zone: timeZone }
          );
          if (!checkOut.isValid) return;
          durationMinutes = checkOut.diff(checkIn, 'minutes').minutes;
        } else if (stateName.includes('PUNCHED IN')) {
          const now = DateTime.now().setZone(timeZone);
          durationMinutes = now.diff(checkIn, 'minutes').minutes;
        }

        if (durationMinutes <= 0 || isNaN(durationMinutes)) {
          setHoursToday('0m');
          return;
        }

        // Convert to days, hours, and minutes
        const days = Math.floor(durationMinutes / (60 * 24));
        const hours = Math.floor((durationMinutes % (60 * 24)) / 60);
        const minutes = Math.floor(durationMinutes % 60);

        let formattedDuration = '';
        if (days > 0) formattedDuration += `${days}d `;
        if (hours > 0) formattedDuration += `${hours}h `;
        formattedDuration += `${minutes}m`;

        setHoursToday(formattedDuration.trim());
      } catch (error) {
        console.error('Error calculating hoursToday:', error);
        setCheckInTime(null);
        setHoursToday('0m');
      }
    };

    fetchHours();
    intervalId = setInterval(fetchHours, 10000);

    return () => clearInterval(intervalId);
  }, []);






  useEffect(() => {
    const fetchStats = async () => {
      try {
        const stats = await getPimStats();
        setTeamMemberCount(stats.total_active_employees); // or any other field you want
      } catch (error) {
        console.warn('Error loading stats:', error.message);
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');
      const monthEnd = dayjs().endOf('month').format('YYYY-MM-DD');

      try {
        const data = await fetchMonthlyAttendance(monthStart, monthEnd);
        setAttendanceData({
          present_days: data.present_days,
          total_hours: data.total_hours,
          attendance_percent: Math.round(data.attendance_percent),
        });
      } catch (error) {
        console.error('Failed to load attendance data', error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchLeaveData = async () => {
      try {
        const response = await getLeaveBalances();
        setLeaveBalances(response.data);
      } catch (error) {
        console.error('Failed to fetch leave balances:', error);
      }
    };

    fetchLeaveData();
  }, []);

const totalLeaveRemaining = Number(
  (leaveBalances ?? [])
    .reduce((sum, leave) => sum + (leave?.remaining_days || 0), 0)
    .toFixed(1)
);

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  // Fixed navigation functions with proper error handling
  const handleEditProfile = useCallback(() => {
    console.log('Navigating to Edit Profile...');
    try {
      router.push('/profile/edit');
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }, []);

  const handleWeeklyTimesheet = useCallback(() => {
    console.log('Navigating to Weekly Timesheet...');
    try {
      router.push('/timesheet/weekly');
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }, []);

  const handleAttendance = useCallback(() => {
    console.log('Navigating to Attendance...');
    try {
      router.push('/(tabs)/attendance');
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }, []);

  const handleLeaveRequest = useCallback(() => {
    console.log('Navigating to Leave Request...');
    try {
      router.push('/(tabs)/leave');
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }, []);

  const quickStats = [
    { title: 'Login Hours ', value: hoursToday, icon: Clock, color: '#f24637' },
    { title: 'Leave Balance', value: `${totalLeaveRemaining} days`, icon: Calendar, color: '#10B981' },
    { title: 'Team Members', value: `${teamMemberCount}`, icon: Users, color: '#F59E0B' },
    { title: 'Timesheet', value: timesheetValue, icon: CalendarClock, navigation: Info, color: '#DC2626' },
  ];

  const quickActions = [
    {
      title: 'Edit Profile',
      icon: Edit,
      color: '#f24637',
      onPress: handleEditProfile
    },
    {
      title: 'Weekly Timesheet',
      icon: FileText,
      color: '#10B981',
      onPress: handleWeeklyTimesheet
    },
    {
      title: 'Attendance',
      icon: Activity,
      color: '#3B82F6',
      onPress: handleAttendance
    },
    {
      title: 'Leave Request',
      icon: Calendar,
      color: '#8B5CF6',
      onPress: handleLeaveRequest
    },
  ];

  const recentActivities = [
    { id: '1', title: `Checked in at ${checkInTime}`, time: 'Today', type: 'check-in' },
    // { id: '2', title: 'Leave request approved', time: '2 hours ago', type: 'success' },
    // { id: '3', title: 'Team meeting scheduled', time: '1 day ago', type: 'info' },
    // { id: '4', title: 'Performance review completed', time: '3 days ago', type: 'success' },
  ];

  const getTimeBasedGreeting = () => {
    const currentHour = new Date().getHours();
    if (currentHour < 12) return 'Good Morning!';
    else if (currentHour < 18) return 'Good Afternoon!';
    else return 'Good Evening!';
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING APPROVAL':
        return 'rgba(245, 158, 11, 0.2)'; // Amber soft
      case 'CANCELLED':
        return 'rgba(107, 114, 128, 0.2)'; // Gray soft
      case 'TAKEN':
        return 'rgba(16, 185, 129, 0.2)'; // Green soft
      default:
        return 'rgba(107, 114, 128, 0.2)';
    }
  };

  const getTextColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING APPROVAL':
        return '#F59E0B';
      case 'CANCELLED':
        return '#6B7280';
      case 'TAKEN':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  const getProgressColor = (percent) => {
    if (percent >= 90) return '#4CAF50';
    if (percent >= 75) return '#FFC107';
    return '#F44336';
  };

  const base64Image = employeeInfo?.profile_picture?.picture_base64;
  const profileImageUrl = base64Image
    ? `data:image/jpeg;base64,${base64Image}`
    : '';

  const maxLength = 20;
  const fullName = `${employeeInfo?.emp_firstname || ''} ${employeeInfo?.emp_lastname || ''}`.trim();
  const displayName = fullName.length > maxLength
    ? fullName.substring(0, maxLength - 3) + '...'
    : fullName;


  return (
    <View style={[{ flex: 1 }, isDark && styles.darkContainer]}>
      {/* Header Section */}
      <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
        <LinearGradient
          colors={isDark ? ['#1F2937', '#374151'] : ['#F21500', '#f24637']}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>{getTimeBasedGreeting()}</Text>
              <Text style={styles.userName}>
                {displayName}
              </Text>
              {jobTitle ? (
                <Text style={styles.userRole}> {jobTitle} </Text>
              ) : (
                <Text style={styles.userRole}> ...</Text>
              )}

              {orgName ? (
                <Text style={styles.companyName}>{orgName}</Text>
              ) : (
                <Text style={styles.companyName}>...</Text>
              )}
            </View>
            <TouchableOpacity onPress={() => router.push('/profile')}>
              <Animated.View >
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
            </TouchableOpacity>

          </View>
        </LinearGradient>
      </Animated.View>

      <ScrollView
        style={[styles.container, isDark && styles.darkContainer]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        nestedScrollEnabled={true}

      >
        {/* Quick Stats */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.statsContainer}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Quick Overview</Text>
          <View style={styles.statsGrid}>
            {quickStats.map((stat, index) => (
              <Animated.View
                key={stat.title}
                entering={FadeInRight.delay(300 + index * 100)}
                style={[styles.statCard, isDark && styles.darkCard]}
              >
                {/* Top-right info icon for Timesheet only */}
                {stat.navigation && (
                  <TouchableOpacity
                    style={styles.infoIconContainer}
                    activeOpacity={0.7}
                    onPress={async () => {
                      try {
                        const empNumber = await AsyncStorage.getItem('emp_number');
                        if (!empNumber) return;
                        const res = await getTimesheetDashboard();
                        if (res.status === 'success') {
                          setTimesheetData(res.data);
                          setIsTimesheetModalVisible(true);
                        }
                      } catch (err) {
                        console.error('Error loading timesheet info', err);
                      }
                    }}
                  >
                    <stat.navigation size={18} color={stat.color} />
                  </TouchableOpacity>

                )}


                {/* Main icon */}
                <View style={[styles.statIcon, { backgroundColor: `${stat.color}20` }]}>
                  <stat.icon size={24} color={stat.color} />
                </View>

                <Text style={[styles.statValue, isDark && styles.darkText]}>{stat.value}</Text>
                <Text style={[styles.statLabel, isDark && styles.darkSubText]}>{stat.title}</Text>
              </Animated.View>

            ))}
          </View>
        </Animated.View>

        <Modal
          visible={isTimesheetModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setIsTimesheetModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, isDark && styles.modalContainerDark]}>
              {/* Close Button */}
              <TouchableOpacity
                style={[styles.closeButton, isDark && styles.closeButtonDark]}
                onPress={() => setIsTimesheetModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.closeButtonText, isDark && styles.darkText]}>×</Text>
              </TouchableOpacity>

              {/* Week Summary */}
              {timesheetData && (
                <>
                  <Text style={[styles.modalTitle, isDark && styles.modalTitleDark]}>
                    Week Summary
                  </Text>
                  <View style={[styles.progressview, isDark && styles.progressviewDark]}>
                    <Text style={[styles.weekHours, isDark && styles.weekHoursDark]}>
                      {parseFloat((timesheetData?.total_duration ?? 0).toFixed(2))}h of 40 hours logged
                    </Text>

                    <View style={styles.timesheetprogressBar}>
                      <View
                        style={[
                          styles.timesheetprogressFill,
                          { width: `${(timesheetData.total_duration / 40) * 100}%` },
                        ]}
                      />
                    </View>
                  </View>

                  {/* Daily Entries */}
                  <ScrollView style={{ marginTop: 15 }}>
                    {timesheetData.timesheet_data.map((item, index) => {
                      // Format date nicely
                      const formattedDate = new Date(item.date).toLocaleDateString("en-US", {
                        weekday: "short", // Mon, Tue
                        month: "short",   // Aug
                        day: "numeric",   // 19
                      });

                      return (
                        <View
                          key={index}
                          style={[styles.entryCard, isDark && styles.entryCardDark]}
                        >
                          {/* Date */}
                          <Text style={[styles.entryDate, isDark && styles.entryDateDark]}>
                            {formattedDate}
                          </Text>

                          {/* Project Name */}
                          <Text style={[styles.entryProject, isDark && styles.entryProjectDark]}>
                            {item.project_name}
                          </Text>

                          {/* Duration */}
                          <Text style={[styles.entryHours, isDark && styles.entryHoursDark]}>
                            {item.duration}h
                          </Text>
                        </View>
                      );
                    })}
                  </ScrollView>


                  {/* Go to Timesheet Button */}
                  <Pressable
                    style={styles.goButton}
                    onPress={() => {
                      setIsTimesheetModalVisible(false);
                      router.push('/timesheet/weekly');
                    }}
                  >
                    <Text style={styles.goButtonText}>Go to Timesheet</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </Modal>


        {/* Quick Actions */}
        <Animated.View entering={FadeInDown.delay(400)} style={styles.actionsContainer}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={action.title}
                style={[styles.actionCard, isDark && styles.darkCard]}
                onPress={action.onPress}
                activeOpacity={0.8}
                delayPressIn={50}
              >
                <LinearGradient
                  colors={[action.color, action.color + 'DD']}
                  style={styles.actionGradient}
                >
                  <action.icon size={28} color="#FFFFFF" />
                  <Text style={styles.actionText}>{action.title}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Performance Chart */}
        <Animated.View entering={FadeInDown.delay(500)} style={styles.chartContainer}>
          <View style={[styles.chartCard, isDark && styles.darkCard]}>
            <View style={styles.chartHeader}>
              <Text style={[styles.chartTitle, isDark && styles.darkText]}>This Month's Performance</Text>
            </View>

            <View style={styles.chartContent}>
              <View style={styles.performanceMetrics}>
                <View style={styles.metric}>
                  <Text style={[styles.metricValue, isDark && styles.darkText]}>
                    {attendanceData.present_days}
                  </Text>
                  <Text style={[styles.metricLabel, isDark && styles.darkSubText]}>Present Days</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={[styles.metricValue, isDark && styles.darkText]}>
                    {attendanceData.total_hours}h
                  </Text>
                  <Text style={[styles.metricLabel, isDark && styles.darkSubText]}>Total Hours</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={[styles.metricValue, isDark && styles.darkText]}>
                    {attendanceData.attendance_percent}%
                  </Text>
                  <Text style={[styles.metricLabel, isDark && styles.darkSubText]}>Attendance</Text>
                </View>
              </View>

              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(attendanceData.attendance_percent || 0, 100)}%`,
                      backgroundColor: getProgressColor(attendanceData.attendance_percent),
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        </Animated.View>


        {/* Recent Activities */}
        <Animated.View entering={FadeInDown.delay(600)} style={styles.activitiesContainer}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Recent Activities</Text>
          <View style={[styles.activitiesCard, isDark && styles.darkCard]}>
            {recentActivities.map((activity, index) => (
              <Animated.View
                key={activity.id}
                entering={FadeInRight.delay(700 + index * 100)}
                style={styles.activityItem}
              >
                <View style={[
                  styles.activityIcon,
                  {
                    backgroundColor: activity.type === 'success' ? '#10B98120' :
                      activity.type === 'check-in' ? '#f2463720' : '#F59E0B20'
                  }
                ]}>
                  {activity.type === 'success' ? (
                    <CheckCircle size={16} color="#10B981" />
                  ) : activity.type === 'check-in' ? (
                    <Clock size={16} color="#f24637" />
                  ) : (
                    <AlertCircle size={16} color="#F59E0B" />
                  )}
                </View>
                <View style={styles.activityContent}>
                  <Text style={[styles.activityTitle, isDark && styles.darkText]}>{activity.title}</Text>
                  <Text style={[styles.activityTime, isDark && styles.darkSubText]}>{activity.time}</Text>
                </View>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Leave List */}
        <Animated.View entering={FadeInDown.delay(700)} style={styles.leaveContainer}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Employees on Leave Today</Text>

          <View style={[styles.activitiesCard, isDark && styles.darkCard]}>
            {leaveLoading ? (
              <Text style={[styles.activityTitle, isDark && styles.darkText]}>Loading...</Text>
            ) : leaveList.length === 0 ? (
              <Text style={[styles.activityTitle, isDark && styles.darkText]}>No leave records for today.</Text>
            ) : (
              leaveList.map((leave, index) => (
                <Animated.View
                  key={leave.id}
                  entering={FadeInRight.delay(800 + index * 100)}
                  style={[styles.leaveCard, isDark && styles.darkCard]}
                >
                  <View style={styles.leaveRow}>
                    {/* Icon */}
                    <View style={[styles.activityIcon, { backgroundColor: '#8B5CF620' }]}>
                      <Calendar size={16} color="#8B5CF6" />
                    </View>

                    {/* Leave Info */}
                    <View style={styles.leaveInfo}>
                      <Text style={[styles.leaveName, isDark && styles.darkText]}>
                        {leave.employee.firstName} {leave.employee.lastName}
                      </Text>
                      <Text style={[styles.leaveTypeText, isDark && styles.darkText]}>
                        {leave.leaveType?.name?.trim()}
                      </Text>
                      <Text style={[styles.leaveDateRange, isDark && styles.darkSubText]}>
                        {leave.dates.fromDate}
                        {leave.dates.toDate && leave.dates.toDate !== leave.dates.fromDate
                          ? ` → ${leave.dates.toDate}`
                          : ''}
                      </Text>
                    </View>

                    {/* Status Badges */}
                    {/* <View style={styles.requestRight}>
                      {leave.leaveBreakdown.map((status, i) => (
                        <View
                          key={`${status.id}-${i}`}
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor: getStatusColor(status.name),
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              { color: getTextColor(status.name) },
                            ]}
                          >
                            {status.name}
                          </Text>
                        </View>
                      ))}
                    </View> */}

                  </View>
                </Animated.View>
              ))
            )}
          </View>
        </Animated.View>


        {/* Goals Section */}
        {/* <Animated.View entering={FadeInDown.delay(700)} style={styles.goalsContainer}>
        <View style={[styles.goalsCard, isDark && styles.darkCard]}>
          <View style={styles.goalsHeader}>
            <Text style={[styles.goalsTitle, isDark && styles.darkText]}>Monthly Goals</Text>
            <Target size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
          </View>
          <View style={styles.goalsList}>
            <View style={styles.goalItem}>
              <Text style={[styles.goalText, isDark && styles.darkText]}>Complete Q1 Project</Text>
              <View style={styles.goalProgress}>
                <View style={[styles.goalProgressFill, { width: '75%' }]} />
              </View>
              <Text style={[styles.goalPercentage, isDark && styles.darkSubText]}>75%</Text>
            </View>
            <View style={styles.goalItem}>
              <Text style={[styles.goalText, isDark && styles.darkText]}>Team Collaboration</Text>
              <View style={styles.goalProgress}>
                <View style={[styles.goalProgressFill, { width: '90%' }]} />
              </View>
              <Text style={[styles.goalPercentage, isDark && styles.darkSubText]}>90%</Text>
            </View>
          </View>
        </View>
      </Animated.View> */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingBottom: 100, // Add padding for floating tab bar
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
    alignItems: 'center',
  },
  greeting: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  userRole: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 2,
  },
  companyName: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.7,
    marginTop: 4,
    fontWeight: '500',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#FFFFFF',
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
  infoIconContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
    borderRadius: 20,
    backgroundColor: 'transparent',
    zIndex: 1,
  },

  darkText: {
    color: '#FFFFFF',
  },
  darkSubText: {
    color: '#9CA3AF',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: (width - 52) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
  },
  darkCard: {
    backgroundColor: '#1F2937',
    shadowColor: '#000',
    shadowOpacity: 0.3,
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
    fontSize: 14,
    color: '#6B7280',
  },
  actionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: (width - 52) / 2,
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 12,
  },
  actionGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 8,
    textAlign: 'center',
  },
  chartContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  chartContent: {
    paddingTop: 10,
  },
  performanceMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  metric: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#f24637',
    borderRadius: 4,
  },
  activitiesContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,

  },
  activitiesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  activityTime: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  goalsContainer: {
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  goalsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  goalsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  goalsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  goalsList: {
    gap: 16,
  },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  goalText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  goalProgress: {
    width: 80,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    backgroundColor: '#f24637',
    borderRadius: 3,
  },
  goalPercentage: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    width: 30,
    textAlign: 'right',
  },
  leaveContainer: {
    paddingHorizontal: 20,
    marginBottom: 40,
    paddingBottom: 30
  },
  leaveCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  leaveRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  leaveInfo: {
    flex: 1,
  },
  leaveName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  leaveTypeText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  leaveDateRange: {
    fontSize: 12,
    color: '#666',
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-end',
    marginVertical: 2
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  requestRight: {
    alignItems: 'flex-end',

  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    width: '100%',
    height: '100%',
    alignSelf: 'center',

  },
  modalContainerDark: {
    backgroundColor: '#111827',
    shadowColor: '#000',
    shadowOpacity: 0.3,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    paddingVertical: 30,

  },
  modalTitleDark: {
    color: '#FFFFFF',
  },
  weekHours: {
    fontSize: 14,
    color: '#6B7280',
  },
  weekHoursDark: {
    color: '#9CA3AF',
  },
  timesheetprogressBar: {
    height: 6,
    backgroundColor: '#eee',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 20,
  },
  timesheetprogressFill: {
    height: '100%',
    backgroundColor: '#f24637',
  },
  entryCard: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  entryCardDark: {
    backgroundColor: '#374151',
  },

  // Day (Monday, Tuesday…)
  entryDay: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  entryDayDark: {
    color: '#E5E7EB',
  },

  // Row for Date + Hours
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },

  entryDateDark: {
    color: '#bbb',
  },

  // Hours (15h)
  entryHours: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f24637',
  },
  entryHoursDark: {
    color: '#f87171',
  },

  // Project Name
  entryProject: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  entryProjectDark: {
    color: '#FFFFFF',
  },



  goButton: {
    backgroundColor: '#f24637',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 15,
  },
  goButtonText: {
    textAlign: 'center',
    color: '#fff',
    fontWeight: 'bold',
  },

  closeButton: {
    position: 'absolute',
    top: 50,
    right: 10,
    zIndex: 1,
    backgroundColor: '#eee',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',

  },
  closeButtonDark: {
    backgroundColor: '#374151',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#333',
    fontWeight: 'bold',
  },
  progressview: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  progressviewDark: {
    backgroundColor: '#374151', // same dark card color as quick stats
    shadowColor: '#000',
    shadowOpacity: 0.3,
  },
  entryDate: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
    marginBottom: 4,
  },

});