import React, { useState, useEffect } from 'react';
import { useAlert } from '@/hooks/useAlert';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Dimensions,
  ActivityIndicator,
  FlatList,
  TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { addLeaveRequest } from '@/store/slices/leaveSlice';
import { CalendarRange, Plus, Clock, CircleCheck as CheckCircle, Circle as XCircle, CircleAlert as AlertCircle, User, FileText, X, Filter, ChevronLeft } from 'lucide-react-native';
import Animated, {
  FadeInDown,
  FadeInRight,
  SlideInRight,
} from 'react-native-reanimated';
import WheelPickerExpo from 'react-native-wheel-picker-expo';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDurationTypes, getLeaveTypes, applyLeave, getMyLeaves, getLeaveStatuses, getLeaveBalances, cancelLeave } from '@/api/Api';
import { Calendar } from 'react-native-calendars';
const { width } = Dimensions.get('window');
interface LeaveRequest {
  id: number;
  leaveType?: {
    name: string;
  };
  leaveBreakdown?: {
    name: string;
  }[];
  lastComment?: {
    comment: string;
  };
  dates?: {
    fromDate: string;
    toDate?: string;
  };
  type?: string;
  noOfDays: number;
  status?: number;
}
interface LeaveBalance {
  leave_type_id: number;
  leave_type_name: string;
  total_days: number;
  days_used: number;
  remaining_days: number;
}
type DurationType = {
  id: number;
  duration_name: string;
  length_hours: number;
  start_time: string;
  end_time: string;
  length_days: number;
};


export default function Leave() {
  const dispatch = useDispatch();
  const { showAlert, AlertComponent } = useAlert();
  const { theme } = useSelector((state: RootState) => state.auth);
  const { requests, balances } = useSelector((state: RootState) => state.leave);
  const [apiLeaveTypes, setApiLeaveTypes] = useState<{ id: number; name: string }[]>([]); // ✅ dynamic leave types
  const isDark = theme === 'dark';
  const [isStartDatePickerVisible, setStartDatePickerVisibility] = useState(false);
  const [isEndDatePickerVisible, setEndDatePickerVisibility] = useState(false);
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const showStartDatePicker = () => setStartDatePickerVisibility(true);
  const hideStartDatePicker = () => setStartDatePickerVisibility(false);
  const showEndDatePicker = () => setEndDatePickerVisibility(true);
  const hideEndDatePicker = () => setEndDatePickerVisibility(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [myLeaves, setMyLeaves] = useState<LeaveRequest[]>([]);
  const currentYear = new Date().getFullYear();
  const [filters, setFilters] = useState({
    fromDate: `${currentYear}-01-01`,
    toDate: `${currentYear}-12-31`,
    statuses: [], // E.g. [0, 1, 2]
    leaveTypeId: 0,
  });
  const [yearRangeStart, setYearRangeStart] = useState(new Date().getFullYear() - 6);
  const [hour, setHour] = useState('12');
  const [minute, setMinute] = useState('00');
  const [ampm, setAmpm] = useState('AM');

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [durationTypes, setDurationTypes] = useState<DurationType[]>([]);
  const [selectedDurationId, setSelectedDurationId] = useState<number | null>(null);
  const [leaveStatuses, setLeaveStatuses] = useState<{ status: number; name: string }[]>([]);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [endDateError, setEndDateError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const isWeekend = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDay();
    return day === 0 || day === 6;
  };
  const [calendarKey, setCalendarKey] = useState(0);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    type: 'vacation',
    startDate: '',
    endDate: '',
    reason: '',
    durationId: null,
    fromTime: '',
    toTime: '',
    calculatedDuration: 0,
  });

  const isFilterActive =
    filters.fromDate !== `${currentYear}-01-01` ||
    filters.toDate !== `${currentYear}-12-31` ||
    filters.statuses.length > 0 ||
    filters.leaveTypeId !== 0;

  const getLeaveTypeColorByName = (name: string) => {
    const colorMap: Record<string, string> = {
      'Annual Leave': '#3B82F6',
      'Medical Leave': '#EF4444',
      'Comp Off': '#8B5CF6',
      'Leave Without Pay': '#F59E0B',
      'Work From Home': '#10B981',
      'Carry Forward Leave': '#d746fe',
      'Maternity Leave': '#A855F7',
      'Emergancy Leave': '#3B82F6',
      'Family Medical Leave': '#EF4444',
      'Medical Emergancy Leave': '#8B5CF6',
      'Holiday Leave': '#F59E0B',

    };
    return colorMap[name.trim()] || '#6B7280';
  };

  // const handleConfirm = (key: 'startDate' | 'endDate', date: Date) => {
  //   const formatted = date.toISOString().split('T')[0];
  //   setLeaveForm((prev) => ({ ...prev, [key]: formatted }));
  //   key === 'startDate' ? hideStartDatePicker() : hideEndDatePicker();
  // };

  const getStatusColor = (status: string) => {
    const normalized = status.toUpperCase();
    switch (normalized) {
      case 'PENDING APPROVAL':
        return '#F59E0B'; // yellow
      case 'SCHEDULED':
        return '#3B82F6'; // blue
      case 'TAKEN':
        return '#10B981'; // green
      case 'REJECTED':
        return '#EF4444'; // red
      case 'CANCELD': // assuming it's a typo from API
        return '#9CA3AF'; // grayish
      default:
        return '#6B7280'; // fallback gray
    }
  };


  const getStatusIcon = (status: string) => {
    const normalized = status.toUpperCase();
    switch (normalized) {
      case 'PENDING APPROVAL':
        return Clock;
      case 'SCHEDULED':
        return CalendarRange;
      case 'TAKEN':
        return CheckCircle;
      case 'REJECTED':
        return XCircle;
      case 'CANCELD':
        return XCircle;
      default:
        return AlertCircle;
    }
  };

  const fetchLeaveBalances = async () => {
    try {
      const res = await getLeaveBalances();
      console.log('Leave Balances API Response:', res);
      setLeaveBalances(res.data);
    } catch (error) {
      console.error('Error fetching leave balances:', error);
    }
  };
  // Filter leave types that exist in leaveBalances
  const filteredLeaveTypes = apiLeaveTypes.filter(type =>
    (leaveBalances ?? []).some(lb => lb.leave_type_name === type.name)
  );


  useEffect(() => {
    fetchLeaveBalances();
  }, []);


  useEffect(() => {
    const fetchLeaveTypesAndStatuses = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) return;

        const statusesRes = await getLeaveStatuses(token);
        const leaveTypesRes = await getLeaveTypes();

        setLeaveStatuses(statusesRes); // Set dynamically from API

        // Sort leave types by ID in ascending order before setting
        const sortedLeaveTypes = leaveTypesRes.data.data.sort((a: { id: number; }, b: { id: number; }) => a.id - b.id);
        setApiLeaveTypes(sortedLeaveTypes);

      } catch (error) {
        console.error('Error loading leave data:', error);
      }
    };

    fetchLeaveTypesAndStatuses();
  }, []);

  useEffect(() => {
    const fetchLeaveTypesAndDurations = async () => {
      try {
        const [leaveRes, durationRes] = await Promise.all([
          getLeaveTypes(),
          getDurationTypes(),
        ]);

        const sortedLeaveTypes = leaveRes.data.sort((a, b) => a.id - b.id);

        setApiLeaveTypes(sortedLeaveTypes);
        setDurationTypes(durationRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchLeaveTypesAndDurations();
  }, []);

  const isSpecifyTimeSelected = () => {
    if (!Array.isArray(durationTypes)) return false;
    const selected = durationTypes.find((d) => d.id === leaveForm.durationId);
    return selected?.duration_name === 'Specify Time';
  };

  const convertTo24HourFormat = (time12h: string): string => {
    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');

    let h = parseInt(hours, 10);

    if (modifier === 'PM' && h < 12) {
      h += 12;
    }
    if (modifier === 'AM' && h === 12) {
      h = 0;
    }

    return `${h.toString().padStart(2, '0')}:${minutes}`;
  };

  const handleSubmitLeave = async () => {

    const EmpNumber = await AsyncStorage.getItem('emp_number');
    if (!EmpNumber) return;

    if (!leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason || !leaveForm.durationId) {
      showAlert('Error', 'Please fill in all required fields.','error');
      return;
    }

    const selectedDuration = durationTypes.find(d => d.id === leaveForm.durationId);

    if (
      selectedDuration?.duration_name === 'Specify Time' &&
      (!leaveForm.fromTime || !leaveForm.toTime || leaveForm.calculatedDuration === 0)
    ) {
      showAlert('Error', 'Please provide valid From and To time.','error');
      return;
    }

    try {
      const selectedLeaveType = apiLeaveTypes.find(type => type.name === leaveForm.type);
      if (!selectedLeaveType) {
        showAlert('Error', 'Please select leave type.','error');
        return;
      }

      // Dynamically build duration payload
      const durationPayload: any[] = [];

      if (selectedDuration?.duration_name === 'Specify Time') {
        const numDays = calculateDays(leaveForm.startDate, leaveForm.endDate);

        for (let i = 0; i < numDays; i++) {
          durationPayload.push({
            type: 'Specify Time',
            fromTime: convertTo24HourFormat(leaveForm.fromTime),
            toTime: convertTo24HourFormat(leaveForm.toTime),
          });
        }
      } else {
        const numDays = calculateDays(leaveForm.startDate, leaveForm.endDate);

        for (let i = 0; i < numDays; i++) {
          durationPayload.push({
            type: selectedDuration?.duration_name || 'Full Day',
            length_hours: selectedDuration?.length_hours,
            length_days: selectedDuration?.length_days,
          });
        }
      }


      const payload = {
        leaveTypeId: selectedLeaveType.id,
        fromDate: leaveForm.startDate,
        toDate: leaveForm.endDate,
        comment: leaveForm.reason || ' ',
        duration: durationPayload,
        emp_number: EmpNumber,
      };

      const response = await applyLeave(payload);

      if (response.status === 'success') {
        showAlert('Success', response.message || 'Leave applied successfully','success');
        setShowModal(false);
        setLeaveForm({
          type: selectedLeaveType.name,
          startDate: '',
          endDate: '',
          reason: '',
          durationId: null,
          fromTime: '',
          toTime: '',
          calculatedDuration: 0,
        });
        fetchLeaves();
        fetchLeaveBalances();
        resetLeaveForm();
      } else {
        showAlert('Failed', response.message || 'Something went wrong','error');
      }
    } catch (error: any) {
      console.error('Apply Leave Error:', error);
      showAlert('Error', error?.response?.data?.message || 'Failed to apply for leave','error');
    }
  };

  const fetchLeaves = async (page = 1, resetList = false) => {
    if (page === 1) {
      setIsLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError('');

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('No token found');
        setError('Authentication required');
        return;
      }

      const empNumber = await AsyncStorage.getItem('emp_number');
      if (!empNumber) {
        console.log('No employee number found');
        setError('Employee number not found');
        return;
      }

      console.log('Fetching leaves for empNumber:', empNumber, 'with filters:', filters, 'page:', page);

      // Add page parameter to your API call
      const paginatedFilters = {
        ...filters,
        page: page,
        page_size: 10
      };

      const response = await getMyLeaves(token, parseInt(empNumber), paginatedFilters);

      console.log('Fetch response:', response); // Add for debugging

      if (response.success && response.data) {
        const newLeaves = response.data.data || [];

        if (resetList || page === 1) {
          setMyLeaves(newLeaves);
        } else {
          setMyLeaves(prevLeaves => [...prevLeaves, ...newLeaves]);
        }

        // Update pagination state
        setCurrentPage(response.data.page || page);
        setHasMorePages((response.data.page || page) < (response.data.total_pages || 1));

        console.log('Updated pagination state:', {
          currentPage: response.data.page || page,
          hasMorePages: (response.data.page || page) < (response.data.total_pages || 1),
          totalPages: response.data.total_pages || 1
        });
      } else {
        setError(response.error || 'Failed to load leave requests');
        if (page === 1) {
          setMyLeaves([]);
        }
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message || 'Failed to load leave requests');
      if (page === 1) {
        setMyLeaves([]);
      }
    } finally {
      setIsLoading(false);
      setLoadingMore(false);
    }
  };




  useEffect(() => {
    fetchLeaves();
  }, [filters]);

  const loadMoreLeaves = () => {
    if (!loadingMore && hasMorePages) {
      fetchLeaves(currentPage + 1, false);
    }
  };

  // Update your useEffect to reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
    setHasMorePages(true);
    fetchLeaves(1, true);
  }, [filters]);

  const resetLeaveForm = () => {
    setLeaveForm({
      type: '',
      startDate: '',
      endDate: '',
      durationId: null,
      fromTime: '',
      toTime: '',
      calculatedDuration: 0,
      reason: '',
    });
    setEndDateError('');
    setShowStartCalendar(false);
    setShowEndCalendar(false);
    setShowFromPicker(false);
    setShowToPicker(false);
  };

  const handleScroll = (event) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20; // How far from bottom to trigger load more

    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      loadMoreLeaves();
    }
  };

  const calculateDays = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  const formatTime = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour = hours % 12 || 12;
    return `${hour.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')} ${ampm}`;
  };

  const calculateDuration = (from: string, to: string) => {
    const parse = (t: string) => {
      const [_, h, m, p] = t.match(/(\d+):(\d+) (AM|PM)/) || [];
      let hours = parseInt(h);
      if (p === 'PM' && hours < 12) hours += 12;
      if (p === 'AM' && hours === 12) hours = 0;
      return hours * 60 + parseInt(m);
    };

    const fromMin = parse(from);
    const toMin = parse(to);
    const diff = (toMin - fromMin) / 60;
    return diff > 0 ? diff : 0;
  };

  const handleTimeConfirm = (field: 'fromTime' | 'toTime', timeString: string) => {
    const formatted = timeString; // Already formatted
    setLeaveForm((prev) => {
      const updated = { ...prev, [field]: formatted };

      if (updated.fromTime && updated.toTime) {
        updated.calculatedDuration = calculateDuration(updated.fromTime, updated.toTime);
      }

      return updated;
    });

    if (field === 'fromTime') setShowFromPicker(false);
    if (field === 'toTime') setShowToPicker(false);
  };


  // const getLeaveTypeColor = (type: string) => {
  //   const leaveType = leaveTypes.find(t => t.value === type);
  //   return leaveType?.color || '#6B7280';
  // };

  const handleCancel = async (leaveId: number) => {
    Alert.alert(
      "Cancel Leave Request",
      "Are you sure you want to cancel this leave request?",
      [
        {
          text: "No",
          style: "cancel"
        },
        {
          text: "Yes",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await cancelLeave(leaveId);
              console.log(result.message);

              fetchLeaves();
              fetchLeaveBalances();

              // Optional: Show success message
              Alert.alert(
                "Success",
                "Leave request has been cancelled successfully.",
                [{ text: "OK" }]
              );
            } catch (err) {
              console.error('Cancel failed:', err);

            }
          }
        }
      ]
    );
  };

  return (
    <>
      <View style={[{ flex: 1 }, isDark && styles.darkContainer]}>

        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <LinearGradient
            colors={isDark ? ['#1F2937', '#374151'] : ['#8B5CF6', '#7C3AED']}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Leave</Text>
              <Text style={styles.headerSubtitle}>Manage your time off</Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowModal(true)}
            >
              <Plus size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
        <ScrollView style={[styles.container, isDark && styles.darkContainer]}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
        >
          {/* Leave Balances */}
          <Animated.View entering={FadeInDown.delay(200)} style={styles.balancesContainer}>
            <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Leave Balances</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.balancesScroll}>

              {(leaveBalances ?? []).map((balance, index) => (
                <Animated.View
                  key={balance.leave_type_id}
                  entering={SlideInRight.delay(300 + index * 100)}
                  style={[styles.balanceCard, isDark && styles.darkCard]}
                >
                  <Text style={[styles.balanceType, isDark && styles.darkText]}>
                    {balance.leave_type_name}
                  </Text>
                  <View style={styles.balanceProgress}>
                    <View style={styles.progressBackground}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${(balance.remaining_days / balance.total_days) * 100}%`,
                            backgroundColor: getLeaveTypeColorByName(balance.leave_type_name),
                          }
                        ]}
                      />
                    </View>
                  </View>
                  <View style={styles.balanceInfo}>
                    <Text style={[styles.remainingDays, isDark && styles.darkText]}>
                      {balance.remaining_days.toFixed(1)}
                    </Text>
                    <Text style={[styles.totalDays, isDark && styles.darkSubText]}>
                      / {balance.total_days} days
                    </Text>
                  </View>
                </Animated.View>
              ))}
            </ScrollView>
          </Animated.View>

          {/* Recent Requests */}
          <Animated.View entering={FadeInDown.delay(400)} style={styles.requestsContainer}>
            <View style={styles.headerRow}>
              <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Recent Requests</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowFilterModal(true),
                    setFilters({
                      fromDate: `${currentYear}-01-01`,
                      toDate: `${currentYear}-12-31`,
                      statuses: [],
                      leaveTypeId: 0,
                    });
                }}
                style={[styles.filterButton, isDark && styles.darkFilterButton]}
              >
                <View style={{ position: 'relative' }}>
                  <Filter color={isDark ? '#FFFFFF' : '#6B7280'} size={20} />
                  {isFilterActive && (
                    <View style={styles.redDot} />
                  )}
                </View>
              </TouchableOpacity>
            </View>

            <View style={[styles.requestsCard, isDark && styles.darkCard]}>
              {isLoading && currentPage === 1 ? (
                <ActivityIndicator size="large" style={styles.loader} />
              ) : error ? (
                <Text style={[styles.errorText, isDark && styles.darkText]}>{error}</Text>
              ) : !Array.isArray(myLeaves) || myLeaves.length === 0 ? (
                <Text style={[styles.emptyText, isDark && styles.darkSubText]}>
                  No leave requests found
                </Text>
              ) : (
                <>
                  {myLeaves.map((request, index) => {
                    // Your existing request rendering code
                    const rawStatus = request.leaveBreakdown?.[0]?.name || 'PENDING APPROVAL';
                    const statusName = rawStatus.toUpperCase();
                    const statusColor = getStatusColor(statusName);
                    const StatusIcon = getStatusIcon(statusName);
                    const typeColor = getLeaveTypeColorByName(request.leaveType?.name || '');
                    const reason = request.lastComment?.comment || 'No reason provided';
                    const startDate = request.dates?.fromDate;
                    const endDate = request.dates?.toDate || startDate;

                    return (
                      <Animated.View
                        key={`${request.id}-${index}`} // Use composite key to avoid conflicts
                        entering={FadeInRight.delay(500 + index * 100)}
                        style={styles.requestItem}
                      >
                        {/* Your existing request item JSX */}
                        <View style={styles.requestHeader}>
                          <View style={styles.requestLeft}>
                            <View style={[styles.typeIndicator, { backgroundColor: typeColor }]} />
                            <View style={styles.requestInfo}>
                              <Text style={[styles.requestType, isDark && styles.darkText]}>
                                {request.leaveType?.name || 'Leave'}
                              </Text>
                              <Text style={[styles.requestDates, isDark && styles.darkSubText]}>
                                {formatDate(startDate)} - {formatDate(endDate)}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.requestRight}>
                            {request.leaveBreakdown?.map((statusObj, idx) => {
                              const statusName = statusObj.name.toUpperCase();
                              const statusColor = getStatusColor(statusName);
                              const StatusIcon = getStatusIcon(statusName);

                              return (
                                <View
                                  key={`${request.id}-status-${idx}`}
                                  style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}
                                >
                                  <StatusIcon size={12} color={statusColor} />
                                  <Text style={[styles.statusText, { color: statusColor }]}>
                                    {statusName}
                                  </Text>
                                  <Text style={[styles.statusText, { color: statusColor, marginLeft: 4 }]}>
                                    ({statusObj.lengthDays})
                                  </Text>
                                </View>
                              );
                            })}
                          </View>
                        </View>

                        <View style={styles.requestDetails}>
                          <View style={styles.requestMeta}>
                            <CalendarRange size={14} color={isDark ? '#9CA3AF' : '#6B7280'} />
                            <Text style={[styles.requestDays, isDark && styles.darkSubText]}>
                              {request.noOfDays} day{request.noOfDays > 1 ? 's' : ''}
                            </Text>
                          </View>

                          <View style={styles.requestMeta}>
                            <User size={14} color={isDark ? '#9CA3AF' : '#6B7280'} />
                            <Text style={[styles.approverText, isDark && styles.darkSubText]}>
                              Approved by :
                            </Text>
                          </View>
                        </View>

                        <View style={styles.reasonContainer}>
                          <FileText size={14} color={isDark ? '#9CA3AF' : '#6B7280'} />
                          <Text style={[styles.reasonText, isDark && styles.darkSubText]}>
                            {reason}
                          </Text>
                        </View>

                        {statusName !== 'TAKEN' && statusName !== 'CANCELLED' && statusName !== 'REJECTED' && (
                          <View style={styles.buttonRow}>
                            <TouchableOpacity
                              onPress={() => handleCancel(request.id)}
                              style={styles.cancelleaveButton}
                            >
                              <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </Animated.View>
                    );
                  })}

                  {/* Loading more indicator */}
                  {loadingMore && (
                    <View style={styles.loadingMoreContainer}>
                      <ActivityIndicator size="small" color={isDark ? '#FFFFFF' : '#6B7280'} />
                      <Text style={[styles.loadingMoreText, isDark && styles.darkSubText]}>
                        Loading more...
                      </Text>
                    </View>
                  )}

                  {/* End of list indicator */}
                  {!hasMorePages && myLeaves.length > 0 && (
                    <View style={styles.endOfListContainer}>
                      <Text style={[styles.endOfListText, isDark && styles.darkSubText]}>
                        You've reached the end of your leave requests
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </Animated.View>

        </ScrollView>

        {/*filter Modal */}
        <Modal
          visible={showFilterModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowFilterModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.filtermodalContainer, isDark && styles.darkCard]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, isDark && styles.darkText]}>Filter Leave Requests </Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowFilterModal(false)}
                >
                  <X size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
                </TouchableOpacity>
              </View>
              <View style={styles.filterGroup}>
                {/* From Date */}
                <View style={styles.datecontainer}>

                  {/* From Date */}
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.filterLabel, isDark && styles.darkText]}>From</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setShowFromPicker(true);
                        setShowMonthPicker(false);
                        setShowYearPicker(false);
                      }}
                      style={[styles.datePicker, isDark && styles.darkDatePicker]}
                    >
                      <Text style={{ color: filters.fromDate ? (isDark ? '#fff' : '#000') : '#9CA3AF' }}>
                        {filters.fromDate || 'YYYY-MM-DD'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* To Date */}
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={[styles.filterLabel, isDark && styles.darkText]}>To</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setShowToPicker(true);
                        setShowMonthPicker(false);
                        setShowYearPicker(false);
                      }}
                      style={[styles.datePicker, isDark && styles.darkDatePicker]}
                    >
                      <Text style={{ color: filters.toDate ? (isDark ? '#fff' : '#000') : '#9CA3AF' }}>
                        {filters.toDate || 'YYYY-MM-DD'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>









                {/* FROM DATE CALENDAR MODAL */}
                <Modal
                  transparent
                  visible={showFromPicker}
                  animationType="fade"
                  onRequestClose={() => setShowFromPicker(false)}
                >
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor: "rgba(0,0,0,0.3)",
                    }}
                    activeOpacity={1}
                    onPress={() => setShowFromPicker(false)}
                  >
                    <TouchableOpacity
                      style={[
                        styles.calendarModal,
                        {
                          alignSelf: "center",
                          borderRadius: 12,
                          padding: 10,
                          backgroundColor: isDark ? "#1F2937" : "#fff",
                        },
                      ]}
                      activeOpacity={1}
                      onPress={(e) => e.stopPropagation()}
                    >
                      <Calendar
                        key={currentMonth.toISOString()}
                        current={currentMonth.toISOString().split("T")[0]}
                        onMonthChange={(month) => setCurrentMonth(new Date(month.dateString))}
                        renderHeader={(date) => (
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between", // Changed to space-between
                              alignItems: "center",
                              paddingHorizontal: 10, // Add some padding
                            }}
                          >
                            {/* Left Arrow for Previous Month */}
                            <TouchableOpacity
                              onPress={() => {
                                const prevMonth = new Date(currentMonth);
                                prevMonth.setMonth(prevMonth.getMonth() - 1);
                                setCurrentMonth(prevMonth);
                              }}
                              style={{ padding: 10 }}
                            >
                              <Text style={{ color: isDark ? "#9CA3AF" : "#000", fontSize: 20 }}>‹</Text>
                            </TouchableOpacity>

                            {/* Month and Year Display (Non-clickable) */}
                            <View style={{ flexDirection: "row", alignItems: "center" }}>
                              {/* Month Picker Toggle */}
                              <TouchableOpacity
                                onPress={() => setShowMonthPicker((prev) => !prev)}
                              >
                                <Text
                                  style={{
                                    fontSize: 18,
                                    fontWeight: "bold",
                                    color: isDark ? "#fff" : "#000",
                                    padding: 10,
                                    marginRight: 5,
                                  }}
                                >
                                  {date.toString("MMMM")}
                                </Text>
                              </TouchableOpacity>

                              {/* Year Picker Toggle */}
                              <TouchableOpacity
                                onPress={() => setShowYearPicker((prev) => !prev)}
                              >
                                <Text
                                  style={{
                                    fontSize: 18,
                                    fontWeight: "bold",
                                    color: isDark ? "#fff" : "#000",
                                    padding: 10,
                                    marginLeft: 5,
                                  }}
                                >
                                  {date.toString("yyyy")}
                                </Text>
                              </TouchableOpacity>
                            </View>

                            {/* Right Arrow for Next Month */}
                            <TouchableOpacity
                              onPress={() => {
                                const nextMonth = new Date(currentMonth);
                                nextMonth.setMonth(nextMonth.getMonth() + 1);
                                setCurrentMonth(nextMonth);
                              }}
                              style={{ padding: 10 }}
                            >
                              <Text style={{ color: isDark ? "#9CA3AF" : "#000", fontSize: 20 }}>›</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        hideArrows={true}
                        hideDayNames={showMonthPicker || showYearPicker}

                        onDayPress={(day) => {
                          console.log('onDayPress triggered:', day.dateString);
                          setFilters((prev) => ({ ...prev, fromDate: day.dateString }));
                          setShowFromPicker(false);
                        }}
                        markedDates={{
                          ...(filters.fromDate && {
                            [filters.fromDate]: {
                              selected: true,
                              selectedColor: "#ed3a3a",
                              selectedTextColor: "#fff",
                            },
                          }),
                        }}
                        dayComponent={({ date, state }) => {
                          if (showMonthPicker || showYearPicker) return null;

                          const isSelected = date.dateString === filters.fromDate;
                          const isCurrentMonth =
                            new Date(date.dateString).getMonth() === currentMonth.getMonth() &&
                            new Date(date.dateString).getFullYear() === currentMonth.getFullYear();

                          let textColor;
                          if (!isCurrentMonth) textColor = "#9CA3AF";
                          else if (isSelected) textColor = "#fff";
                          else if (state === "disabled") textColor = "#D1D5DB";
                          else textColor = isDark ? "#fff" : "#000";

                          return (
                            <TouchableWithoutFeedback
                              disabled={!isCurrentMonth}
                              onPress={() => {
                                setFilters((prev) => ({ ...prev, fromDate: date.dateString }));
                                setShowFromPicker(false);
                              }}
                            >
                              <LinearGradient
                                colors={isSelected ? ["#f65c5c", "#ed3a3a"] : ["transparent", "transparent"]}
                                style={{
                                  borderRadius: 20,
                                  width: 36,
                                  height: 36,
                                  alignItems: "center",
                                  justifyContent: "center",
                                  margin: 2,
                                }}
                              >
                                <Text style={{ color: textColor }}>{date.day}</Text>
                              </LinearGradient>
                            </TouchableWithoutFeedback>
                          );
                        }}
                        theme={{
                          calendarBackground: isDark ? "#1F2937" : "#fff",
                          dayTextColor: isDark ? "#fff" : "#000",
                          textSectionTitleColor: isDark ? "#9CA3AF" : "#6B7280",
                          selectedDayBackgroundColor: "#3B82F6",
                          todayTextColor: "#10B981",
                          arrowColor: isDark ? "#9CA3AF" : "#000",
                          monthTextColor: isDark ? "#fff" : "#000",
                          textMonthFontWeight: "bold",
                        }}
                      />

                      {/* Month Picker Overlay */}
                      {showMonthPicker && (
                        <View
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: [{ translateX: -154 }, { translateY: -180 }],
                            width: 325,
                            backgroundColor: isDark ? "#1F2937" : "#fff",
                            borderRadius: 12,
                            padding: 15,
                            zIndex: 1000,
                            elevation: 5,
                          }}
                        >
                          <Text
                            style={{
                              color: isDark ? "#fff" : "#000",
                              fontWeight: "bold",
                              marginBottom: 10,
                              textAlign: "center",
                            }}
                          >
                            Select Month
                          </Text>
                          <FlatList
                            data={Array.from({ length: 12 }, (_, i) => i)}
                            keyExtractor={(item) => item.toString()}
                            numColumns={3}
                            renderItem={({ item }) => (
                              <TouchableOpacity
                                style={{
                                  flex: 1,
                                  padding: 12,
                                  margin: 5,
                                  alignItems: "center",
                                  borderRadius: 20,
                                }}
                                onPress={() => {
                                  const newDate = new Date(currentMonth);
                                  newDate.setMonth(item);
                                  setCurrentMonth(newDate);
                                  setShowMonthPicker(false);
                                }}
                              >
                                <LinearGradient
                                  colors={currentMonth.getMonth() === item ? ["#f65c5c", "#ed3a3a"] : ["transparent", "transparent"]}
                                  style={{
                                    borderRadius: 20,
                                    paddingVertical: 8,
                                    paddingHorizontal: 12,
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <Text
                                    style={{
                                      color: currentMonth.getMonth() === item ? "#fff" : isDark ? "#fff" : "#000",
                                      fontWeight: "500",
                                      fontSize: 14,
                                    }}
                                  >
                                    {new Date(2023, item, 1).toLocaleString("default", { month: "short" })}
                                  </Text>
                                </LinearGradient>
                              </TouchableOpacity>
                            )}
                          />
                        </View>
                      )}

                      {/* Year Picker Overlay */}
                      {showYearPicker && (
                        <View
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: [{ translateX: -154 }, { translateY: -180 }],
                            width: 326,
                            backgroundColor: isDark ? "#1F2937" : "#fff",
                            borderRadius: 12,
                            padding: 15,
                            zIndex: 1000,
                            elevation: 5,
                          }}
                        >
                          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                            <TouchableOpacity onPress={() => setYearRangeStart((prev) => prev - 12)} style={{ padding: 5 }}>
                              <Text style={{ fontSize: 18, color: isDark ? "#fff" : "#000" }}>‹</Text>
                            </TouchableOpacity>

                            <Text style={{ color: isDark ? "#fff" : "#000", fontWeight: "bold", fontSize: 16 }}>
                              {yearRangeStart} - {yearRangeStart + 11}
                            </Text>

                            <TouchableOpacity onPress={() => setYearRangeStart((prev) => prev + 12)} style={{ padding: 5 }}>
                              <Text style={{ fontSize: 18, color: isDark ? "#fff" : "#000" }}>›</Text>
                            </TouchableOpacity>
                          </View>

                          <FlatList
                            data={Array.from({ length: 12 }, (_, i) => yearRangeStart + i)}
                            keyExtractor={(item) => item.toString()}
                            numColumns={3}
                            columnWrapperStyle={{ justifyContent: "space-around", marginBottom: 10 }}
                            renderItem={({ item }) => (
                              <TouchableOpacity
                                style={{
                                  flex: 1,
                                  padding: 15,
                                  margin: 5,
                                  backgroundColor: currentMonth.getFullYear() === item ? "#ed3a3a" : isDark ? "#374151" : "#f3f4f6",
                                  borderRadius: 8,
                                  alignItems: "center",
                                }}
                                onPress={() => {
                                  const newDate = new Date(currentMonth);
                                  newDate.setFullYear(item);
                                  setCurrentMonth(newDate);
                                  setShowYearPicker(false);
                                }}
                              >
                                <Text style={{ color: currentMonth.getFullYear() === item ? "#fff" : isDark ? "#fff" : "#000", fontWeight: "500", fontSize: 14 }}>
                                  {item}
                                </Text>
                              </TouchableOpacity>
                            )}
                          />
                        </View>
                      )}
                    </TouchableOpacity>
                  </TouchableOpacity>
                </Modal>












                {/* TO DATE CALENDAR MODAL */}
                <Modal
                  transparent
                  visible={showToPicker}
                  animationType="fade"
                  onRequestClose={() => setShowToPicker(false)}
                >
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor: "rgba(0,0,0,0.3)",
                    }}
                    activeOpacity={1}
                    onPress={() => setShowToPicker(false)}
                  >
                    <TouchableOpacity
                      style={[
                        styles.calendarModal,
                        {
                          alignSelf: "center",
                          borderRadius: 12,
                          padding: 10,
                          backgroundColor: isDark ? "#1F2937" : "#fff",
                        },
                      ]}
                      activeOpacity={1}
                      onPress={(e) => e.stopPropagation()}
                    >
                      <Calendar
                        key={currentMonth.toISOString()}
                        current={currentMonth.toISOString().split("T")[0]}
                        minDate={filters.fromDate || undefined}
                        onMonthChange={(month) => setCurrentMonth(new Date(month.dateString))}
                        renderHeader={(date) => (
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between", // Changed to space-between
                              alignItems: "center",
                              paddingHorizontal: 10, // Add some padding
                            }}
                          >
                            {/* Left Arrow for Previous Month */}
                            <TouchableOpacity
                              onPress={() => {
                                const prevMonth = new Date(currentMonth);
                                prevMonth.setMonth(prevMonth.getMonth() - 1);
                                setCurrentMonth(prevMonth);
                              }}
                              style={{ padding: 10 }}
                            >
                              <Text style={{ color: isDark ? "#9CA3AF" : "#000", fontSize: 20 }}>‹</Text>
                            </TouchableOpacity>

                            {/* Month and Year Display (Non-clickable) */}
                            <View style={{ flexDirection: "row", alignItems: "center" }}>
                              {/* Month Picker Toggle */}
                              <TouchableOpacity
                                onPress={() => setShowMonthPicker((prev) => !prev)}
                              >
                                <Text
                                  style={{
                                    fontSize: 18,
                                    fontWeight: "bold",
                                    color: isDark ? "#fff" : "#000",
                                    padding: 10,
                                    marginRight: 5,
                                  }}
                                >
                                  {date.toString("MMMM")}
                                </Text>
                              </TouchableOpacity>

                              {/* Year Picker Toggle */}
                              <TouchableOpacity
                                onPress={() => setShowYearPicker((prev) => !prev)}
                              >
                                <Text
                                  style={{
                                    fontSize: 18,
                                    fontWeight: "bold",
                                    color: isDark ? "#fff" : "#000",
                                    padding: 10,
                                    marginLeft: 5,
                                  }}
                                >
                                  {date.toString("yyyy")}
                                </Text>
                              </TouchableOpacity>
                            </View>

                            {/* Right Arrow for Next Month */}
                            <TouchableOpacity
                              onPress={() => {
                                const nextMonth = new Date(currentMonth);
                                nextMonth.setMonth(nextMonth.getMonth() + 1);
                                setCurrentMonth(nextMonth);
                              }}
                              style={{ padding: 10 }}
                            >
                              <Text style={{ color: isDark ? "#9CA3AF" : "#000", fontSize: 20 }}>›</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        hideArrows={true}
                        hideDayNames={showMonthPicker || showYearPicker}

                        onDayPress={(day) => {
                          if (filters.fromDate && day.dateString < filters.fromDate) return;
                          setFilters((prev) => ({ ...prev, toDate: day.dateString }));
                          setShowToPicker(false);
                        }}
                        markedDates={{
                          ...(filters.toDate && {
                            [filters.toDate]: {
                              selected: true,
                              selectedColor: "#ed3a3a",
                            },
                          }),
                        }}
                        dayComponent={({ date, state }) => {
                          if (showMonthPicker || showYearPicker) return null;

                          const isSelected = date.dateString === filters.toDate;
                          const isCurrentMonth =
                            new Date(date.dateString).getMonth() === currentMonth.getMonth() &&
                            new Date(date.dateString).getFullYear() === currentMonth.getFullYear();

                          let textColor;
                          if (!isCurrentMonth) textColor = "#9CA3AF";
                          else if (isSelected) textColor = "#fff";
                          else if (state === "disabled") textColor = "#D1D5DB";
                          else textColor = isDark ? "#fff" : "#000";

                          return (
                            <TouchableWithoutFeedback
                              disabled={!isCurrentMonth || (filters.fromDate && date.dateString < filters.fromDate)}
                              onPress={() => {
                                if (!filters.fromDate || date.dateString >= filters.fromDate) {
                                  setFilters((prev) => ({ ...prev, toDate: date.dateString }));
                                  setShowToPicker(false);
                                }
                              }}
                            >
                              <LinearGradient
                                colors={isSelected ? ["#f65c5c", "#ed3a3a"] : ["transparent", "transparent"]}
                                style={{
                                  borderRadius: 20,
                                  width: 36,
                                  height: 36,
                                  alignItems: "center",
                                  justifyContent: "center",
                                  margin: 2,
                                }}
                              >
                                <Text style={{ color: textColor }}>{date.day}</Text>
                              </LinearGradient>
                            </TouchableWithoutFeedback>
                          );
                        }}
                        theme={{
                          calendarBackground: isDark ? "#1F2937" : "#fff",
                          dayTextColor: isDark ? "#fff" : "#000",
                          textSectionTitleColor: isDark ? "#9CA3AF" : "#6B7280",
                          selectedDayBackgroundColor: "#ed3a3a",
                          todayTextColor: "#10B981",
                          arrowColor: isDark ? "#9CA3AF" : "#000",
                          monthTextColor: isDark ? "#fff" : "#000",
                          textMonthFontWeight: "bold",
                        }}
                      />

                      {/* Month Picker Overlay */}
                      {showMonthPicker && (
                        <View
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: [{ translateX: -154 }, { translateY: -180 }],
                            width: 325,
                            backgroundColor: isDark ? "#1F2937" : "#fff",
                            borderRadius: 12,
                            padding: 15,
                            zIndex: 1000,
                            elevation: 5,
                          }}
                        >
                          <Text
                            style={{
                              color: isDark ? "#fff" : "#000",
                              fontWeight: "bold",
                              marginBottom: 10,
                              textAlign: "center",
                            }}
                          >
                            Select Month
                          </Text>
                          <FlatList
                            data={Array.from({ length: 12 }, (_, i) => i)}
                            keyExtractor={(item) => item.toString()}
                            numColumns={3}
                            renderItem={({ item }) => (
                              <TouchableOpacity
                                style={{
                                  flex: 1,
                                  padding: 12,
                                  margin: 5,
                                  alignItems: "center",
                                  borderRadius: 20,
                                }}
                                onPress={() => {
                                  const newDate = new Date(currentMonth);
                                  newDate.setMonth(item);
                                  setCurrentMonth(newDate);
                                  setShowMonthPicker(false);
                                }}
                              >
                                <LinearGradient
                                  colors={currentMonth.getMonth() === item ? ["#f65c5c", "#ed3a3a"] : ["transparent", "transparent"]}
                                  style={{
                                    borderRadius: 20,
                                    paddingVertical: 8,
                                    paddingHorizontal: 12,
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <Text
                                    style={{
                                      color: currentMonth.getMonth() === item ? "#fff" : isDark ? "#fff" : "#000",
                                      fontWeight: "500",
                                      fontSize: 14,
                                    }}
                                  >
                                    {new Date(2023, item, 1).toLocaleString("default", { month: "short" })}
                                  </Text>
                                </LinearGradient>
                              </TouchableOpacity>
                            )}
                          />
                        </View>
                      )}

                      {/* Year Picker Overlay */}
                      {showYearPicker && (
                        <View
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: [{ translateX: -154 }, { translateY: -180 }],
                            width: 326,
                            backgroundColor: isDark ? "#1F2937" : "#fff",
                            borderRadius: 12,
                            padding: 15,
                            zIndex: 1000,
                            elevation: 5,
                          }}
                        >
                          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                            <TouchableOpacity onPress={() => setYearRangeStart((prev) => prev - 12)} style={{ padding: 5 }}>
                              <Text style={{ fontSize: 18, color: isDark ? "#fff" : "#000" }}>‹</Text>
                            </TouchableOpacity>

                            <Text style={{ color: isDark ? "#fff" : "#000", fontWeight: "bold", fontSize: 16 }}>
                              {yearRangeStart} - {yearRangeStart + 11}
                            </Text>

                            <TouchableOpacity onPress={() => setYearRangeStart((prev) => prev + 12)} style={{ padding: 5 }}>
                              <Text style={{ fontSize: 18, color: isDark ? "#fff" : "#000" }}>›</Text>
                            </TouchableOpacity>
                          </View>

                          <FlatList
                            data={Array.from({ length: 12 }, (_, i) => yearRangeStart + i)}
                            keyExtractor={(item) => item.toString()}
                            numColumns={3}
                            columnWrapperStyle={{ justifyContent: "space-around", marginBottom: 10 }}
                            renderItem={({ item }) => (
                              <TouchableOpacity
                                style={{
                                  flex: 1,
                                  padding: 15,
                                  margin: 5,
                                  backgroundColor: currentMonth.getFullYear() === item ? "#ed3a3a" : isDark ? "#374151" : "#f3f4f6",
                                  borderRadius: 8,
                                  alignItems: "center",
                                }}
                                onPress={() => {
                                  const newDate = new Date(currentMonth);
                                  newDate.setFullYear(item);
                                  setCurrentMonth(newDate);
                                  setShowYearPicker(false);
                                }}
                              >
                                <Text style={{ color: currentMonth.getFullYear() === item ? "#fff" : isDark ? "#fff" : "#000", fontWeight: "500", fontSize: 14 }}>
                                  {item}
                                </Text>
                              </TouchableOpacity>
                            )}
                          />
                        </View>
                      )}
                    </TouchableOpacity>
                  </TouchableOpacity>
                </Modal>


                {/* Status Filter */}
                <Text style={[styles.filterLabel, isDark && styles.darkText]}>Status</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusFilterRow}>
                  {leaveStatuses.map(({ status, name }) => {
                    const isSelected = filters.statuses.includes(status);
                    const bgColor = getStatusColor(name);
                    const StatusIcon = getStatusIcon(name);

                    return (
                      <TouchableOpacity
                        key={status}
                        onPress={() => {
                          const updated = isSelected
                            ? filters.statuses.filter((s) => s !== status)
                            : [...filters.statuses, status];
                          setFilters((prev) => ({ ...prev, statuses: updated }));
                        }}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: isSelected
                              ? bgColor
                              : isDark
                                ? '#374151' // dark gray background for unselected chip
                                : '#F3F4F6',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                          },
                        ]}

                      >
                        {/* <StatusIcon size={12} color={isSelected ? '#fff' : bgColor} /> */}
                        <Text style={{ color: isSelected ? '#fff' : isDark ? '#D1D5DB' : '#000', fontSize: 12 }}>
                          {name}
                        </Text>

                      </TouchableOpacity>
                    );
                  })}

                </ScrollView>

                {/* Leave Type Dropdown */}
                <Text style={[styles.filterLabel, isDark && styles.darkText]}>Leave Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusFilterRow}>
                  <TouchableOpacity
                    onPress={() => setFilters(prev => ({ ...prev, leaveTypeId: 0 }))}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: filters.leaveTypeId === 0
                          ? '#ed3a3a'
                          : isDark
                            ? '#ed3a3a'
                            : '#F3F4F6',

                      },
                    ]}
                  >
                    <Text style={{ color: filters.leaveTypeId === 0 ? '#fff' : isDark ? '#D1D5DB' : '#000' }}>All</Text>
                  </TouchableOpacity>


                  {apiLeaveTypes.map((type) => {
                    const isSelected = filters.leaveTypeId === type.id;
                    const bgColor = getLeaveTypeColorByName(type.name);

                    return (
                      <TouchableOpacity
                        key={type.id}
                        onPress={() => setFilters(prev => ({ ...prev, leaveTypeId: type.id }))}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: isSelected
                              ? bgColor
                              : isDark
                                ? '#374151'
                                : '#F3F4F6',
                          },
                        ]}

                      >
                        <Text style={{ color: isSelected ? '#fff' : isDark ? '#D1D5DB' : '#000' }}>
                          {type.name}
                        </Text>

                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Apply and Close Buttons */}
              <View style={[styles.modalActions, { padding: 1, marginTop: 12 }]}>

                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setFilters({
                      fromDate: `${currentYear}-01-01`,
                      toDate: `${currentYear}-12-31`,
                      statuses: [],
                      leaveTypeId: 0,
                    });

                  }}
                >
                  <Text style={styles.modalButtonText}>Clear</Text>

                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setShowFilterModal(false)}
                >
                  <Text style={styles.modalButtonText}>Apply</Text>
                </TouchableOpacity>
              </View>

            </View>
          </View>
        </Modal>

        {/* Apply Leave Modal */}
        <Modal
          visible={showModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => {
            setShowModal(false);
            resetLeaveForm();
          }}
        >
          <View style={[styles.modalContainer, isDark && styles.darkModalContainer]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDark && styles.darkText]}>Apply for Leave</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowModal(false);
                  resetLeaveForm();
                }}
              >
                <X size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}

              // style={styles.scrollView}
              // contentContainerStyle={styles.scrollContent}
              // showsVerticalScrollIndicator={false}
              bounces={true}
              alwaysBounceVertical={true}
              scrollEventThrottle={16}
              decelerationRate="normal"
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              nestedScrollEnabled={false}
              scrollEnabled={true}
              directionalLockEnabled={true}
            >
              {/* Leave Type Selection */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, isDark && styles.darkText]}>Leave Type<Text style={{ color: 'red', fontWeight: 'bold' }}> *</Text></Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeSelector}>
                  {filteredLeaveTypes.map((type) => (
                    <TouchableOpacity
                      key={type.id}
                      style={[
                        styles.typeOption,
                        isDark && leaveForm.type !== type.name && styles.darkTypeOption,
                        leaveForm.type === type.name && { backgroundColor: getLeaveTypeColorByName(type.name) },
                      ]}
                      onPress={() => setLeaveForm({ ...leaveForm, type: type.name })}
                    >
                      <Text
                        style={[
                          styles.typeText,
                          isDark && styles.darkText,
                          leaveForm.type === type.name && styles.selectedTypeText,
                        ]}
                      >
                        {type.name}
                      </Text>
                    </TouchableOpacity>
                  ))}


                </ScrollView>
              </View>
              {/* Date Inputs */}
              <View style={styles.dateRow}>
                <View style={styles.dateGroup}>
                  <Text style={[styles.formLabel, isDark && styles.darkText]}>Start Date<Text style={{ color: 'red', fontWeight: 'bold' }}> *</Text></Text>
                  <TouchableOpacity
                    onPress={() => {
                      setShowStartCalendar(true);
                      setShowMonthPicker(false);
                      setShowYearPicker(false);
                    }}

                    style={[styles.dateInput, isDark && styles.darkInput, { justifyContent: 'center' }]}
                  >
                    <Text style={{ color: isDark ? '#fff' : '#000' }}>
                      {leaveForm.startDate || 'YYYY-MM-DD'}
                    </Text>
                  </TouchableOpacity>

                  {/* Start Calendar Modal */}
                  <Modal
                    transparent
                    visible={showStartCalendar}
                    animationType="fade"
                    onRequestClose={() => setShowStartCalendar(false)}
                  >
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        justifyContent: "center",
                        alignItems: "center",
                        backgroundColor: "rgba(0, 0, 0, 0.3)",
                      }}
                      activeOpacity={1}
                      onPress={() => setShowStartCalendar(false)}
                    >
                      <TouchableOpacity
                        style={[
                          styles.calendarModal,
                          {
                            alignSelf: "center",
                            borderRadius: 12,
                            padding: 10,
                            backgroundColor: isDark ? "#1F2937" : "#fff",
                          },
                        ]}
                        activeOpacity={1}
                        onPress={(e) => e.stopPropagation()} // Prevent click from bubbling to parent
                      >
                        <Calendar
                          key={currentMonth.toISOString()}
                          current={currentMonth.toISOString().split("T")[0]}
                          onMonthChange={(month) => {
                            setCurrentMonth(new Date(month.dateString));
                          }}
                          renderHeader={(date) => (
                            <View
                              style={{
                                flexDirection: "row",
                                justifyContent: "space-between", // Changed to space-between
                                alignItems: "center",
                                paddingHorizontal: 10, // Add some padding
                              }}
                            >
                              {/* Left Arrow for Previous Month */}
                              <TouchableOpacity
                                onPress={() => {
                                  const prevMonth = new Date(currentMonth);
                                  prevMonth.setMonth(prevMonth.getMonth() - 1);
                                  setCurrentMonth(prevMonth);
                                }}
                                style={{ padding: 10 }}
                              >
                                <Text style={{ color: isDark ? "#9CA3AF" : "#000", fontSize: 20 }}>‹</Text>
                              </TouchableOpacity>

                              {/* Month and Year Display (Non-clickable) */}
                              <View style={{ flexDirection: "row", alignItems: "center" }}>
                                {/* Month Picker Toggle */}
                                <TouchableOpacity
                                  onPress={() => setShowMonthPicker((prev) => !prev)}
                                >
                                  <Text
                                    style={{
                                      fontSize: 18,
                                      fontWeight: "bold",
                                      color: isDark ? "#fff" : "#000",
                                      padding: 10,
                                      marginRight: 5,
                                    }}
                                  >
                                    {date.toString("MMMM")}
                                  </Text>
                                </TouchableOpacity>

                                {/* Year Picker Toggle */}
                                <TouchableOpacity
                                  onPress={() => setShowYearPicker((prev) => !prev)}
                                >
                                  <Text
                                    style={{
                                      fontSize: 18,
                                      fontWeight: "bold",
                                      color: isDark ? "#fff" : "#000",
                                      padding: 10,
                                      marginLeft: 5,
                                    }}
                                  >
                                    {date.toString("yyyy")}
                                  </Text>
                                </TouchableOpacity>
                              </View>

                              {/* Right Arrow for Next Month */}
                              <TouchableOpacity
                                onPress={() => {
                                  const nextMonth = new Date(currentMonth);
                                  nextMonth.setMonth(nextMonth.getMonth() + 1);
                                  setCurrentMonth(nextMonth);
                                }}
                                style={{ padding: 10 }}
                              >
                                <Text style={{ color: isDark ? "#9CA3AF" : "#000", fontSize: 20 }}>›</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                          hideArrows={true}
                          hideDayNames={showMonthPicker || showYearPicker}

                          onDayPress={(day) => {
                            if (!isWeekend(day.dateString)) {
                              setLeaveForm((prev) => {
                                const updated = { ...prev, startDate: day.dateString };
                                if (
                                  !prev.endDate ||
                                  new Date(prev.endDate) < new Date(day.dateString)
                                ) {
                                  updated.endDate = day.dateString;
                                }
                                return updated;
                              });
                              setShowStartCalendar(false);
                            }
                          }}
                          markedDates={{
                            ...(leaveForm.startDate
                              ? {
                                [leaveForm.startDate]: {
                                  selected: true,
                                  selectedColor: "#3B82F6",
                                },
                              }
                              : {}),
                          }}
                          dayComponent={({ date, state }) => {
                            if (showMonthPicker || showYearPicker) return null;

                            const isSelected = date.dateString === leaveForm.startDate;
                            const isWknd = isWeekend(date.dateString);

                            const isCurrentMonth = new Date(date.dateString).getMonth() === currentMonth.getMonth() &&
                              new Date(date.dateString).getFullYear() === currentMonth.getFullYear();

                            const gradientColors = isDark
                              ? ["#f65c5c", "#ed3a3a"]
                              : ["#f65c5c", "#ed3a3a"];

                            let textColor;
                            if (!isCurrentMonth) {
                              textColor = "#9CA3AF"; // Grey for previous/next month dates
                            } else if (isWknd) {
                              textColor = "#9CA3AF"; // Grey for weekends
                            } else if (isSelected) {
                              textColor = "#fff"; // White for selected dates
                            } else if (state === "disabled") {
                              textColor = "#D1D5DB"; // Light grey for disabled dates
                            } else {
                              textColor = isDark ? "#fff" : "#000"; // Default color
                            }

                            return (
                              <TouchableOpacity
                                disabled={isWknd || !isCurrentMonth}
                                onPress={() => {
                                  if (!isWknd) {
                                    setLeaveForm((prev) => ({
                                      ...prev,
                                      startDate: date.dateString,
                                    }));
                                    setShowStartCalendar(false);
                                  }
                                }}
                              >
                                <LinearGradient
                                  colors={isSelected ? gradientColors : ["transparent", "transparent"]}
                                  style={{
                                    borderRadius: 20,
                                    width: 36,
                                    height: 36,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    margin: 2,
                                  }}
                                >
                                  <Text style={{ color: textColor }}>{date.day}</Text>
                                </LinearGradient>
                              </TouchableOpacity>
                            );
                          }}
                          theme={{
                            calendarBackground: isDark ? "#1F2937" : "#fff",
                            dayTextColor: isDark ? "#fff" : "#000",
                            textSectionTitleColor: isDark ? "#9CA3AF" : "#6B7280",
                            selectedDayBackgroundColor: "#3B82F6",
                            todayTextColor: "#10B981",
                            arrowColor: isDark ? "#9CA3AF" : "#000",
                            monthTextColor: isDark ? "#fff" : "#000",
                            textMonthFontWeight: "bold",
                          }}
                        />

                        {/* Month Picker Overlay */}
                        {showMonthPicker && (
                          <View
                            style={{
                              position: "absolute",
                              top: "50%",
                              left: "50%",
                              transform: [{ translateX: -154 }, { translateY: -180 }], // half of width & height
                              width: 325,
                              backgroundColor: isDark ? "#1F2937" : "#fff",
                              borderRadius: 12,
                              padding: 15,
                              zIndex: 1000,
                              elevation: 5,
                            }}
                          >
                            <Text
                              style={{
                                color: isDark ? "#fff" : "#000",
                                fontWeight: "bold",
                                marginBottom: 10,
                                textAlign: "center",
                              }}
                            >
                              Select Month
                            </Text>
                            <FlatList
                              data={Array.from({ length: 12 }, (_, i) => i)}
                              keyExtractor={(item) => item.toString()}
                              numColumns={3}
                              renderItem={({ item }) => (
                                <TouchableOpacity
                                  style={{
                                    flex: 1,
                                    padding: 12,
                                    margin: 5,
                                    backgroundColor: "transparent",
                                    borderRadius: 20,
                                    alignItems: "center",
                                  }}
                                  onPress={() => {
                                    const newDate = new Date(currentMonth);
                                    newDate.setMonth(item);
                                    newDate.setDate(1);
                                    setCurrentMonth(newDate);
                                    setShowMonthPicker(false);
                                  }}
                                >
                                  {currentMonth.getMonth() === item ? (
                                    <LinearGradient
                                      colors={isDark ? ["#f65c5c", "#ed3a3a"] : ["#f65c5c", "#ed3a3a"]}
                                      style={{
                                        borderRadius: 20,
                                        paddingVertical: 8,
                                        paddingHorizontal: 12,
                                        alignItems: "center",
                                        justifyContent: "center",
                                      }}
                                    >
                                      <Text style={{ color: "#fff", fontWeight: "500", fontSize: 14 }}>
                                        {new Date(2023, item, 1).toLocaleString("default", { month: "short" })}
                                      </Text>
                                    </LinearGradient>
                                  ) : (
                                    <Text style={{
                                      color: isDark ? "#fff" : "#000",
                                      fontWeight: "500",
                                      fontSize: 14,
                                      paddingVertical: 8,
                                      paddingHorizontal: 12,
                                    }}>
                                      {new Date(2023, item, 1).toLocaleString("default", { month: "short" })}
                                    </Text>
                                  )}
                                </TouchableOpacity>
                              )}
                            />
                          </View>
                        )}

                        {/* Year Picker Overlay */}
                        {showYearPicker && (
                          <View
                            style={{
                              position: "absolute",
                              top: "50%",
                              left: "50%",
                              transform: [{ translateX: -154 }, { translateY: -180 }],
                              width: 326,
                              backgroundColor: isDark ? "#1F2937" : "#fff",
                              borderRadius: 12,
                              padding: 15,
                              zIndex: 1000,
                              elevation: 5,
                            }}
                          >
                            {/* Header with arrows */}
                            <View
                              style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 10,
                              }}
                            >
                              <TouchableOpacity
                                onPress={() => setYearRangeStart((prev) => prev - 12)}
                                style={{ padding: 5 }}
                              >
                                <Text style={{ fontSize: 18, color: isDark ? "#fff" : "#000" }}>‹</Text>
                              </TouchableOpacity>

                              <Text
                                style={{
                                  color: isDark ? "#fff" : "#000",
                                  fontWeight: "bold",
                                  fontSize: 16,
                                }}
                              >
                                {yearRangeStart} - {yearRangeStart + 11}
                              </Text>

                              <TouchableOpacity
                                onPress={() => setYearRangeStart((prev) => prev + 12)}
                                style={{ padding: 5 }}
                              >
                                <Text style={{ fontSize: 18, color: isDark ? "#fff" : "#000" }}>›</Text>
                              </TouchableOpacity>
                            </View>

                            {/* Grid of years */}
                            <FlatList
                              data={Array.from({ length: 12 }, (_, i) => yearRangeStart + i)}
                              keyExtractor={(item) => item.toString()}
                              numColumns={3}
                              columnWrapperStyle={{ justifyContent: "space-around", marginBottom: 10 }}
                              renderItem={({ item }) => (
                                <TouchableOpacity
                                  style={{
                                    flex: 1,
                                    padding: 15,
                                    margin: 5,
                                    backgroundColor:
                                      currentMonth.getFullYear() === item
                                        ? "#ed3a3a"
                                        : isDark
                                          ? "#374151"
                                          : "#f3f4f6",
                                    borderRadius: 8,
                                    alignItems: "center",
                                  }}
                                  onPress={() => {
                                    const newDate = new Date(currentMonth);
                                    newDate.setFullYear(item);
                                    newDate.setDate(1);
                                    setCurrentMonth(newDate);
                                    setShowYearPicker(false);
                                  }}
                                >
                                  <Text
                                    style={{
                                      color:
                                        currentMonth.getFullYear() === item
                                          ? "#fff"
                                          : isDark
                                            ? "#fff"
                                            : "#000",
                                      fontWeight: "500",
                                      fontSize: 14,
                                    }}
                                  >
                                    {item}
                                  </Text>
                                </TouchableOpacity>
                              )}
                              showsVerticalScrollIndicator={false}
                            />
                          </View>
                        )}
                      </TouchableOpacity>
                    </TouchableOpacity>
                  </Modal>

                </View>








                <View style={styles.dateGroup}>
                  <Text style={[styles.formLabel, isDark && styles.darkText]}>
                    End Date
                    <Text style={{ color: "red", fontWeight: "bold" }}> *</Text>
                  </Text>

                  <TouchableOpacity
                    onPress={() => {
                      if (!leaveForm.startDate) {
                        setEndDateError("Please select Start Date");
                        setTimeout(() => setEndDateError(""), 3000); // auto-clear after 3s
                      } else {
                        setShowEndCalendar(true);
                        setShowMonthPicker(false);
                        setShowYearPicker(false);
                      }
                    }}
                    style={[styles.dateInput, isDark && styles.darkInput, { justifyContent: "center" }]}
                  >
                    <Text style={{ color: isDark ? "#fff" : "#000" }}>
                      {leaveForm.endDate || "YYYY-MM-DD"}
                    </Text>
                  </TouchableOpacity>

                  {leaveForm.startDate && (
                    <Modal
                      transparent
                      visible={showEndCalendar}
                      animationType="fade"
                      onRequestClose={() => setShowEndCalendar(false)}
                    >
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          justifyContent: "center",
                          alignItems: "center",
                          backgroundColor: "rgba(0,0,0,0.3)",
                        }}
                        activeOpacity={1}
                        onPress={() => setShowEndCalendar(false)}
                      >
                        <TouchableOpacity
                          style={[
                            styles.calendarModal,
                            {
                              alignSelf: "center",
                              borderRadius: 12,
                              padding: 10,
                              backgroundColor: isDark ? "#1F2937" : "#fff",
                            },
                          ]}
                          activeOpacity={1}
                          onPress={(e) => e.stopPropagation()}
                        >
                          <Calendar
                            key={currentMonth.toISOString()}
                            current={currentMonth.toISOString().split("T")[0]}
                            onMonthChange={(month) => {
                              setCurrentMonth(new Date(month.dateString));
                            }}
                            renderHeader={(date) => (
                              <View
                                style={{
                                  flexDirection: "row",
                                  justifyContent: "space-between", // Changed to space-between
                                  alignItems: "center",
                                  paddingHorizontal: 10, // Add some padding
                                }}
                              >
                                {/* Left Arrow for Previous Month */}
                                <TouchableOpacity
                                  onPress={() => {
                                    const prevMonth = new Date(currentMonth);
                                    prevMonth.setMonth(prevMonth.getMonth() - 1);
                                    setCurrentMonth(prevMonth);
                                  }}
                                  style={{ padding: 10 }}
                                >
                                  <Text style={{ color: isDark ? "#9CA3AF" : "#000", fontSize: 20 }}>‹</Text>
                                </TouchableOpacity>

                                {/* Month and Year Display (Non-clickable) */}
                                <View style={{ flexDirection: "row", alignItems: "center" }}>
                                  {/* Month Picker Toggle */}
                                  <TouchableOpacity
                                    onPress={() => setShowMonthPicker((prev) => !prev)}
                                  >
                                    <Text
                                      style={{
                                        fontSize: 18,
                                        fontWeight: "bold",
                                        color: isDark ? "#fff" : "#000",
                                        padding: 10,
                                        marginRight: 5,
                                      }}
                                    >
                                      {date.toString("MMMM")}
                                    </Text>
                                  </TouchableOpacity>

                                  {/* Year Picker Toggle */}
                                  <TouchableOpacity
                                    onPress={() => setShowYearPicker((prev) => !prev)}
                                  >
                                    <Text
                                      style={{
                                        fontSize: 18,
                                        fontWeight: "bold",
                                        color: isDark ? "#fff" : "#000",
                                        padding: 10,
                                        marginLeft: 5,
                                      }}
                                    >
                                      {date.toString("yyyy")}
                                    </Text>
                                  </TouchableOpacity>
                                </View>

                                {/* Right Arrow for Next Month */}
                                <TouchableOpacity
                                  onPress={() => {
                                    const nextMonth = new Date(currentMonth);
                                    nextMonth.setMonth(nextMonth.getMonth() + 1);
                                    setCurrentMonth(nextMonth);
                                  }}
                                  style={{ padding: 10 }}
                                >
                                  <Text style={{ color: isDark ? "#9CA3AF" : "#000", fontSize: 20 }}>›</Text>
                                </TouchableOpacity>
                              </View>
                            )}
                            hideArrows={true}
                            hideDayNames={showMonthPicker || showYearPicker}

                            onDayPress={(day) => {
                              if (!isWeekend(day.dateString)) {
                                const selectedEndDate = new Date(day.dateString);
                                const startDate = new Date(leaveForm.startDate);

                                const finalEndDate =
                                  selectedEndDate < startDate ? leaveForm.startDate : day.dateString;

                                setLeaveForm((prev) => ({
                                  ...prev,
                                  endDate: finalEndDate,
                                }));

                                setShowEndCalendar(false);
                              }
                            }}
                            markedDates={{
                              ...(!leaveForm.endDate && {
                                [leaveForm.startDate]: {
                                  selected: true,
                                  selectedColor: "#3B82F6",
                                  selectedTextColor: "#fff",
                                },
                              }),
                              ...(leaveForm.endDate && {
                                [leaveForm.endDate]: {
                                  selected: true,
                                  selectedColor: "#ed3a3a",
                                  selectedTextColor: "#fff",
                                },
                              }),
                            }}
                            dayComponent={({ date, state }) => {
                              if (showMonthPicker || showYearPicker) return null;

                              const isStartDate = date.dateString === leaveForm.startDate;
                              const isEndDate = date.dateString === leaveForm.endDate;
                              const isSelected = isEndDate || (isStartDate && !leaveForm.endDate);
                              const isWknd = isWeekend(date.dateString);

                              const isCurrentMonth = new Date(date.dateString).getMonth() === currentMonth.getMonth() &&
                                new Date(date.dateString).getFullYear() === currentMonth.getFullYear();

                              const gradientColors = isStartDate
                                ? (isDark ? ["#3B82F6", "#2563EB"] : ["#3B82F6", "#2563EB"]) // Blue for start date
                                : (isDark ? ["#f65c5c", "#ed3a3a"] : ["#f65c5c", "#ed3a3a"]); // Red for end date

                              let textColor;
                              if (!isCurrentMonth) {
                                textColor = "#9CA3AF";
                              } else if (isWknd) {
                                textColor = "#9CA3AF";
                              } else if (isSelected) {
                                textColor = "#fff";
                              } else if (state === "disabled") {
                                textColor = "#D1D5DB";
                              } else {
                                textColor = isDark ? "#fff" : "#000";
                              }

                              return (
                                <TouchableOpacity
                                  disabled={isWknd || !isCurrentMonth}
                                  onPress={() => {
                                    if (!isWknd) {
                                      const selectedEndDate = new Date(date.dateString);
                                      const startDate = new Date(leaveForm.startDate);

                                      const finalEndDate =
                                        selectedEndDate < startDate ? leaveForm.startDate : date.dateString;
                                      setLeaveForm((prev) => ({
                                        ...prev,
                                        endDate: finalEndDate,
                                      }));
                                      setShowEndCalendar(false);
                                    }
                                  }}
                                >
                                  <LinearGradient
                                    colors={isSelected ? gradientColors : ["transparent", "transparent"]}
                                    style={{
                                      borderRadius: 20,
                                      width: 36,
                                      height: 36,
                                      alignItems: "center",
                                      justifyContent: "center",
                                      margin: 2,
                                    }}
                                  >
                                    <Text style={{ color: textColor }}>{date.day}</Text>
                                  </LinearGradient>
                                </TouchableOpacity>
                              );
                            }}
                            theme={{
                              calendarBackground: isDark ? "#1F2937" : "#fff",
                              dayTextColor: isDark ? "#fff" : "#000",
                              textSectionTitleColor: isDark ? "#9CA3AF" : "#6B7280",
                              selectedDayBackgroundColor: "#ed3a3a",
                              todayTextColor: "#10B981",
                              arrowColor: isDark ? "#9CA3AF" : "#000",
                              monthTextColor: isDark ? "#fff" : "#000",
                              textMonthFontWeight: "bold",
                            }}
                          />

                          {showMonthPicker && (
                            <View
                              style={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                transform: [{ translateX: -154 }, { translateY: -180 }],
                                width: 326,
                                backgroundColor: isDark ? "#1F2937" : "#fff",
                                borderRadius: 12,
                                padding: 15,
                                zIndex: 1000,
                                elevation: 5,
                              }}
                            >
                              <Text
                                style={{
                                  color: isDark ? "#fff" : "#000",
                                  fontWeight: "bold",
                                  marginBottom: 10,
                                  textAlign: "center",
                                }}
                              >
                                Select Month
                              </Text>
                              <FlatList
                                data={Array.from({ length: 12 }, (_, i) => i)}
                                keyExtractor={(item) => item.toString()}
                                numColumns={3}
                                renderItem={({ item }) => (
                                  <TouchableOpacity
                                    style={{
                                      flex: 1,
                                      padding: 12,
                                      margin: 5,
                                      backgroundColor: "transparent",
                                      borderRadius: 20,
                                      alignItems: "center",
                                    }}
                                    onPress={() => {
                                      const newDate = new Date(currentMonth);
                                      newDate.setMonth(item);
                                      newDate.setDate(1);
                                      setCurrentMonth(newDate);
                                      setShowMonthPicker(false);
                                    }}
                                  >
                                    {currentMonth.getMonth() === item ? (
                                      <LinearGradient
                                        colors={isDark ? ["#f65c5c", "#ed3a3a"] : ["#f65c5c", "#ed3a3a"]}
                                        style={{
                                          borderRadius: 20,
                                          paddingVertical: 8,
                                          paddingHorizontal: 12,
                                          alignItems: "center",
                                          justifyContent: "center",
                                        }}
                                      >
                                        <Text style={{ color: "#fff", fontWeight: "500", fontSize: 14 }}>
                                          {new Date(2023, item, 1).toLocaleString("default", { month: "short" })}
                                        </Text>
                                      </LinearGradient>
                                    ) : (
                                      <Text style={{
                                        color: isDark ? "#fff" : "#000",
                                        fontWeight: "500",
                                        fontSize: 14,
                                        paddingVertical: 8,
                                        paddingHorizontal: 12,
                                      }}>
                                        {new Date(2023, item, 1).toLocaleString("default", { month: "short" })}
                                      </Text>
                                    )}
                                  </TouchableOpacity>
                                )}
                              />
                            </View>
                          )}

                          {/* Year Picker Overlay */}
                          {showYearPicker && (
                            <View
                              style={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                transform: [{ translateX: -154 }, { translateY: -180 }],
                                width: 326,
                                backgroundColor: isDark ? "#1F2937" : "#fff",
                                borderRadius: 12,
                                padding: 15,
                                zIndex: 1000,
                                elevation: 5,
                              }}
                            >
                              <View
                                style={{
                                  flexDirection: "row",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  marginBottom: 10,
                                }}
                              >
                                <TouchableOpacity
                                  onPress={() => setYearRangeStart((prev) => prev - 12)}
                                  style={{ padding: 5 }}
                                >
                                  <Text style={{ fontSize: 18, color: isDark ? "#fff" : "#000" }}>‹</Text>
                                </TouchableOpacity>

                                <Text
                                  style={{
                                    color: isDark ? "#fff" : "#000",
                                    fontWeight: "bold",
                                    fontSize: 16,
                                  }}
                                >
                                  {yearRangeStart} - {yearRangeStart + 11}
                                </Text>

                                <TouchableOpacity
                                  onPress={() => setYearRangeStart((prev) => prev + 12)}
                                  style={{ padding: 5 }}
                                >
                                  <Text style={{ fontSize: 18, color: isDark ? "#fff" : "#000" }}>›</Text>
                                </TouchableOpacity>
                              </View>

                              <FlatList
                                data={Array.from({ length: 12 }, (_, i) => yearRangeStart + i)}
                                keyExtractor={(item) => item.toString()}
                                numColumns={3}
                                columnWrapperStyle={{ justifyContent: "space-around", marginBottom: 10 }}
                                renderItem={({ item }) => (
                                  <TouchableOpacity
                                    style={{
                                      flex: 1,
                                      padding: 15,
                                      margin: 5,
                                      backgroundColor:
                                        currentMonth.getFullYear() === item
                                          ? "#ed3a3a"
                                          : isDark
                                            ? "#374151"
                                            : "#f3f4f6",
                                      borderRadius: 8,
                                      alignItems: "center",
                                    }}
                                    onPress={() => {
                                      const newDate = new Date(currentMonth);
                                      newDate.setFullYear(item);
                                      newDate.setDate(1);
                                      setCurrentMonth(newDate);
                                      setShowYearPicker(false);
                                    }}
                                  >
                                    <Text
                                      style={{
                                        color:
                                          currentMonth.getFullYear() === item
                                            ? "#fff"
                                            : isDark
                                              ? "#fff"
                                              : "#000",
                                        fontWeight: "500",
                                        fontSize: 14,
                                      }}
                                    >
                                      {item}
                                    </Text>
                                  </TouchableOpacity>
                                )}
                                showsVerticalScrollIndicator={false}
                              />
                            </View>
                          )}
                        </TouchableOpacity>
                      </TouchableOpacity>
                    </Modal>
                  )}
                </View>

              </View>

              {endDateError !== '' && (
                <Text style={{ color: '#DC2626', margin: 4 }}>{endDateError}</Text>
              )}
              {/*Duration Input */}
              {leaveForm.startDate && leaveForm.endDate && (
                <>
                  {/* Duration Input */}
                  <View style={styles.formGroup}>
                    <Text style={[styles.formLabel, isDark && styles.darkText]}>Duration<Text style={{ color: 'red', fontWeight: 'bold' }}> *</Text></Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeSelector}>
                      {durationTypes?.map((duration) => (
                        <TouchableOpacity
                          key={duration.id}
                          style={[
                            styles.typeOption,
                            isDark && styles.darkTypeOption,
                            leaveForm.durationId === duration.id && { backgroundColor: '#3B82F6' },
                          ]}
                          onPress={() => {
                            setLeaveForm({ ...leaveForm, durationId: duration.id });

                            // Reset time & duration if "Specify Time" not selected
                            if (duration.duration_name !== 'Specify Time') {
                              setLeaveForm(prev => ({
                                ...prev,
                                fromTime: '',
                                toTime: '',
                                calculatedDuration: 0,
                              }));
                            }
                          }}
                        >
                          <Text
                            style={[
                              styles.typeText,
                              isDark && styles.darkText,
                              leaveForm.durationId === duration.id && styles.selectedTypeText,
                            ]}
                          >
                            {duration.duration_name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>





                  {/* Specify Time Section */}
                  {isSpecifyTimeSelected() && (
                    <View style={styles.timeRow}>
                      {/* From Time Picker */}
                      <View style={styles.timeGroup}>
                        <Text style={[styles.formLabel, isDark && styles.darkText]}>
                          From<Text style={{ color: 'red', fontWeight: 'bold' }}> *</Text>
                        </Text>

                        {/* Trigger */}
                        <TouchableOpacity
                          onPress={() => setShowFromPicker(true)}
                          style={[styles.timeInput, isDark && styles.darkInput]}
                        >
                          <Text style={{ color: isDark ? '#fff' : '#000' }}>
                            {leaveForm.fromTime || 'HH:MM AM/PM'}
                          </Text>
                        </TouchableOpacity>

                        {/* Custom Scroll Modal */}
                        <Modal
                          transparent
                          visible={showFromPicker}
                          animationType="fade"
                          onRequestClose={() => setShowFromPicker(false)}
                        >
                          <TouchableOpacity
                            activeOpacity={1}
                            style={{
                              flex: 1,
                              backgroundColor: '#00000088',
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}
                            onPress={() => setShowFromPicker(false)}
                          >
                            <View
                              style={{
                                backgroundColor: isDark ? '#1c2330ff' : '#f3f2f2ff',
                                borderRadius: 10,
                                padding: 10,
                                margin: 5,
                                width: 'auto',
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 16,
                                  fontWeight: 'bold',
                                  marginBottom: 10,
                                  color: isDark ? '#fff' : '#000',
                                  textAlign: 'center',
                                }}
                              >
                                Select Time
                              </Text>

                              {/* Scroll Pickers */}
                              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                                {/* Hour */}

                                <View
                                  style={{
                                    backgroundColor: isDark ? '#000000' : '#ffffff', // modal box background
                                    borderRadius: 16, // rounded corners
                                    padding: 5,
                                    margin: 5,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <WheelPickerExpo
                                    height={150}
                                    width={80}
                                    backgroundColor={isDark ? '#000000' : '#ffffff'}
                                    items={Array.from({ length: 12 }, (_, i) => ({
                                      label: String(i + 1).padStart(2, '0'),
                                      value: String(i + 1).padStart(2, '0'),
                                    }))}
                                    selectedStyle={{
                                      borderColor: '#3498db',
                                      borderWidth: 2,
                                      backgroundColor: isDark ? '#111111' : '#f0f0f0', // slightly different for selected
                                      borderRadius: 8, // rounded selected item
                                    }}
                                    itemTextStyle={{
                                      color: isDark ? '#ffffff' : '#000000',
                                      fontWeight: '600',
                                    }}
                                    onChange={({ item }) => setHour(item.value)}
                                  />
                                </View>




                                {/* Minute */}
                                <View
                                  style={{
                                    backgroundColor: isDark ? '#000000' : '#ffffff', // modal box background
                                    borderRadius: 16, // rounded corners
                                    padding: 5,
                                    margin: 5,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <WheelPickerExpo
                                    height={150}
                                    width={80}
                                    backgroundColor={isDark ? '#000000' : '#ffffffff'}
                                    containerStyle={{ backgroundColor: '#000000' }}
                                    items={Array.from({ length: 60 }, (_, i) => ({
                                      label: String(i).padStart(2, '0'),
                                      value: String(i).padStart(2, '0'),
                                    }))}
                                    selectedStyle={{
                                      borderColor: '#3498db',
                                      borderWidth: 2,
                                      backgroundColor: isDark ? '#000000' : '#ffffffff',
                                    }}
                                    initialPickerStyle={{ backgroundColor: isDark ? '#000000' : '#ffffffff' }}
                                    onChange={({ item }) => setMinute(item.value)}
                                  />
                                </View>

                                {/* AM/PM */}
                                <View
                                  style={{
                                    backgroundColor: isDark ? '#000000' : '#ffffff', // modal box background
                                    borderRadius: 16, // rounded corners
                                    padding: 5,
                                    margin: 5,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <WheelPickerExpo
                                    height={150}
                                    width={80}
                                    backgroundColor={isDark ? '#000000' : '#ffffffff'}
                                    containerStyle={{ backgroundColor: '#000000' }}
                                    items={[
                                      { label: 'AM', value: 'AM' },
                                      { label: 'PM', value: 'PM' },
                                    ]}
                                    selectedStyle={{
                                      borderColor: '#3498db',
                                      borderWidth: 2,
                                      backgroundColor: isDark ? '#000000' : '#ffffffff',
                                    }}
                                    initialPickerStyle={{ backgroundColor: isDark ? '#000000' : '#ffffffff' }}
                                    onChange={({ item }) => setAmpm(item.value)}
                                  />
                                </View>
                              </View>

                              {/* Buttons */}
                              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 15 }}>
                                <TouchableOpacity onPress={() => setShowFromPicker(false)}>
                                  <Text style={{ marginRight: 20, color: '#999', fontSize: 15 }}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => {
                                    const formatted = `${hour}:${minute} ${ampm}`;
                                    handleTimeConfirm('fromTime', formatted);
                                    setShowFromPicker(false);
                                  }}
                                >
                                  <Text style={{ color: '#3498db', fontWeight: 'bold', fontSize: 15 }}>Confirm</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </TouchableOpacity>
                        </Modal>
                      </View>





                      {/* To Time Picker */}
                      <View style={styles.timeGroup}>
                        <Text style={[styles.formLabel, isDark && styles.darkText]}>
                          To<Text style={{ color: 'red', fontWeight: 'bold' }}> *</Text>
                        </Text>

                        {/* Trigger */}
                        <TouchableOpacity
                          onPress={() => setShowToPicker(true)}
                          style={[styles.timeInput, isDark && styles.darkInput]}
                        >
                          <Text style={{ color: isDark ? '#fff' : '#000' }}>
                            {leaveForm.toTime || 'HH:MM AM/PM'}
                          </Text>
                        </TouchableOpacity>

                        {/* Custom Scroll Modal */}
                        <Modal
                          transparent
                          visible={showToPicker}
                          animationType="fade"
                          onRequestClose={() => setShowToPicker(false)}
                        >
                          <TouchableOpacity
                            activeOpacity={1}
                            style={{
                              flex: 1,
                              backgroundColor: '#00000088',
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}
                            onPress={() => setShowToPicker(false)}
                          >
                            <View
                              style={{
                                backgroundColor: isDark ? '#1c2330ff' : '#f3f2f2ff',
                                borderRadius: 10,
                                padding: 10,
                                margin: 5,
                                width: 'auto',
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 16,
                                  fontWeight: 'bold',
                                  marginBottom: 10,
                                  color: isDark ? '#fff' : '#000',
                                  textAlign: 'center',
                                }}
                              >
                                Select Time
                              </Text>

                              {/* Scroll Pickers */}
                              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                                {/* Hour */}
                                <View
                                  style={{
                                    backgroundColor: isDark ? '#000000' : '#ffffff',
                                    borderRadius: 16,
                                    padding: 5,
                                    margin: 5,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <WheelPickerExpo
                                    height={150}
                                    width={80}
                                    backgroundColor={isDark ? '#000000' : '#ffffff'}
                                    items={Array.from({ length: 12 }, (_, i) => ({
                                      label: String(i + 1).padStart(2, '0'),
                                      value: String(i + 1).padStart(2, '0'),
                                    }))}
                                    selectedStyle={{
                                      borderColor: '#3498db',
                                      borderWidth: 2,
                                      backgroundColor: isDark ? '#111111' : '#f0f0f0',
                                      borderRadius: 8,
                                    }}
                                    itemTextStyle={{
                                      color: isDark ? '#ffffff' : '#000000',
                                      fontWeight: '600',
                                    }}
                                    onChange={({ item }) => setHour(item.value)}
                                  />
                                </View>

                                {/* Minute */}
                                <View
                                  style={{
                                    backgroundColor: isDark ? '#000000' : '#ffffff',
                                    borderRadius: 16,
                                    padding: 5,
                                    margin: 5,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <WheelPickerExpo
                                    height={150}
                                    width={80}
                                    backgroundColor={isDark ? '#000000' : '#ffffff'}
                                    items={Array.from({ length: 60 }, (_, i) => ({
                                      label: String(i).padStart(2, '0'),
                                      value: String(i).padStart(2, '0'),
                                    }))}
                                    selectedStyle={{
                                      borderColor: '#3498db',
                                      borderWidth: 2,
                                      backgroundColor: isDark ? '#000000' : '#ffffff',
                                    }}
                                    onChange={({ item }) => setMinute(item.value)}
                                  />
                                </View>

                                {/* AM/PM */}
                                <View
                                  style={{
                                    backgroundColor: isDark ? '#000000' : '#ffffff',
                                    borderRadius: 16,
                                    padding: 5,
                                    margin: 5,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <WheelPickerExpo
                                    height={150}
                                    width={80}
                                    backgroundColor={isDark ? '#000000' : '#ffffff'}
                                    items={[
                                      { label: 'AM', value: 'AM' },
                                      { label: 'PM', value: 'PM' },
                                    ]}
                                    selectedStyle={{
                                      borderColor: '#3498db',
                                      borderWidth: 2,
                                      backgroundColor: isDark ? '#000000' : '#ffffff',
                                    }}
                                    onChange={({ item }) => setAmpm(item.value)}
                                  />
                                </View>
                              </View>

                              {/* Buttons */}
                              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 15 }}>
                                <TouchableOpacity onPress={() => setShowToPicker(false)}>
                                  <Text style={{ marginRight: 20, color: '#999', fontSize: 15 }}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => {
                                    const formatted = `${hour}:${minute} ${ampm}`;
                                    handleTimeConfirm('toTime', formatted);
                                    setShowToPicker(false);
                                  }}
                                >
                                  <Text style={{ color: '#3498db', fontWeight: 'bold', fontSize: 15 }}>Confirm</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </TouchableOpacity>
                        </Modal>
                      </View>



                      {/* Calculated Duration */}
                      {leaveForm.calculatedDuration > 0 && (
                        <>
                          <View style={{ marginTop: 8 }}>
                            <Text style={[styles.formLabel, isDark && styles.darkText]}>
                              Duration
                            </Text>
                            <Text style={{ color: isDark ? '#fff' : '#000', marginTop: 4 }}>
                              {leaveForm.calculatedDuration.toFixed(2)} hour{leaveForm.calculatedDuration > 1 ? 's' : ''}
                            </Text>
                          </View>
                        </>
                      )}
                    </View>
                  )}
                </>
              )}
              {/* Reason Input */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, isDark && styles.darkText]}>Reason<Text style={{ color: 'red', fontWeight: 'bold' }}> *</Text></Text>
                <TextInput
                  style={[styles.reasonInput, isDark && styles.darkInput]}
                  placeholder="Please provide a reason for your leave request..."
                  placeholderTextColor={isDark ? '#9CA3AF' : '#9CA3AF'}
                  value={leaveForm.reason}
                  onChangeText={(text) => setLeaveForm({ ...leaveForm, reason: text })}
                  multiline
                  numberOfLines={4}
                  maxLength={200}
                  textAlignVertical="top"
                />
                <Text style={{ alignSelf: "flex-end", color: isDark ? "#fff" : "#333", marginTop: 4 }}>
                  {leaveForm.reason.length}/200
                </Text>
              </View>

              {/* Submit Button */}
              <TouchableOpacity style={styles.submitButton} onPress={handleSubmitLeave}>
                <LinearGradient
                  colors={['#f65c5c', '#ed3a3a']}
                  style={styles.submitGradient}
                >
                  <Text style={styles.submitText}>Submit Request</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Modal>
      </View>
      <AlertComponent/>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingBottom: 120, // Add padding for floating tab bar
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerContent: {
    flex: 1,
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
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  balancesContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  darkText: {
    color: '#FFFFFF',
  },
  darkSubText: {
    color: '#9CA3AF',
  },
  balancesScroll: {
    flexDirection: 'row',
  },
  balanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginRight: 16,
    width: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 10,
    marginTop: 10
  },
  darkCard: {
    backgroundColor: '#1F2937',
  },
  balanceType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  balanceProgress: {
    marginBottom: 12,
  },
  progressBackground: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  balanceInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  remainingDays: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  totalDays: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  requestsContainer: {
    paddingHorizontal: 20,
    marginBottom: 40,
    paddingBottom: 10
  },
  requestsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  requestItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  requestLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  requestInfo: {
    flex: 1,
  },
  requestType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  requestDates: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  requestRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginVertical: 2

  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    paddingTop: 2
  },
  requestDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
    paddingLeft: 16,
  },
  requestMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  requestDays: {
    fontSize: 12,
    color: '#6B7280',
  },
  approverText: {
    fontSize: 12,
    color: '#6B7280',
  },
  reasonContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingLeft: 16,
  },
  reasonText: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },

  cancelleaveButton: {
    backgroundColor: '#FF0303',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },

  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },


  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  darkModalContainer: {
    backgroundColor: '#111827',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  formGroup: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  typeSelector: {
    flexDirection: 'row',
  },
  typeOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  darkTypeOption: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
  },
  typeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  selectedTypeText: {
    color: '#FFFFFF',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  dateGroup: {
    flex: 1,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  darkInput: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
    color: '#FFFFFF',
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    height: 100,
  },
  submitButton: {
    marginTop: 32,
    marginBottom: 40,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  submitGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 10,
  },
  timeGroup: {
    flex: 1,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    marginTop: 10,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  filterButtonText: {
    color: '#dedede',
    fontWeight: '600',
    fontSize: 14,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  darkFilterButton: {
    backgroundColor: '#1F2937',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  filtermodalContainer: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 20,
    height: '90%',
  },
  filterGroup: {
    marginTop: 20
  },
  filtermodalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 10,

  },
  statusFilterRow: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingVertical: 10
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',

  },
  selectedChip: {
    backgroundColor: '#ed3a3a',
    borderColor: '#ed3a3a',
  },
  chipText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
  selectedChipText: {
    color: '#fff',
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    // paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderColor: "#ddd",
  },

  modalButton: {
    // flex: 1,
    padding: 10,
    width: 150,
    backgroundColor: "#ed3a3a",
    paddingVertical: 14,
    // marginHorizontal: 1,  
    borderRadius: 10,
    alignItems: "center",
  },

  cancelButton: {
    backgroundColor: "#EF4444",
  },

  modalButtonText: {
    color: "#fff",
    fontSize: 18,   // ⬅️ slightly bigger text
    fontWeight: "600",
  },

  datePicker: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    backgroundColor: '#F9FAFB',
  },

  dateText: {
    fontSize: 14,
    color: '#111827', // dark gray text
  },
  darkChip: {
    backgroundColor: '#374151',
  },
  loader: {
    marginVertical: 20,
  },
  errorText: {
    color: '#EF4444',
    textAlign: 'center',
    marginVertical: 20,
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 20,
    color: '#666',
  },

  redDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444', // Tailwind red-500
  },

  filterheaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12
  },
  backButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  calendarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarModal: {
    borderRadius: 12,
    padding: 10,
    elevation: 10,
    width: '90%',
    maxWidth: 350,
  },
  modalCloseBtn: {
    marginTop: 10,
    alignSelf: 'flex-end',
  },
  darkDatePicker: {
    backgroundColor: '#374151',
    color: '#ffffff'
  },
  datecontainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 14,
    color: '#6B7280',
  },
  endOfListContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 16,
  },
  endOfListText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});