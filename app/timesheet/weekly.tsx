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
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { addTimesheetEntry, clearTimesheetEntries, removeTimesheetEntry, updateTimesheetEntry } from '@/store/slices/timesheetSlice';
import { router } from 'expo-router';
import { ArrowLeft, CalendarRange, Clock, Plus, Save, ChevronDown, Building, Code, Bug, Users, MapPin, FileText, CreditCard as Edit3, ChevronLeft, ChevronRight, CreditCard as Edit, Trash2, X } from 'lucide-react-native';
import Animated, {
  FadeInDown,
  FadeInRight,
  SlideInRight,
} from 'react-native-reanimated';
import { fetchProjectsDropdown, fetchActivitiesDropdown, fetchTimesheet, saveTimesheetEntry, deleteTimesheetEntry, submitTimesheet } from '@/api/Api';
import AsyncStorage from '@react-native-async-storage/async-storage';
const { width } = Dimensions.get('window');
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { Calendar } from 'react-native-calendars';
interface TimesheetEntry {
  id: string;
  date: string;
  project: string;
  activity: string;
  hours: number;
  comment: string;
  projectId: number;
  activityId: number
  timesheet_item_id: number
}

const activities = [
  { value: 'development', label: 'Development', icon: Code, color: '#3B82F6' },
  { value: 'bug-fixes', label: 'Bug Fixes', icon: Bug, color: '#EF4444' },
  { value: 'meeting', label: 'Meeting', icon: Users, color: '#10B981' },
  { value: 'client-visit', label: 'Client Visit', icon: MapPin, color: '#F59E0B' },
  { value: 'documentation', label: 'Documentation', icon: FileText, color: '#8B5CF6' },
  { value: 'testing', label: 'Testing', icon: Building, color: '#06B6D4' },
];
const today = new Date().toISOString().split('T')[0];


export const activityIconMap: Record<string, { icon: any; color: string }> = {
  development: { icon: Code, color: '#3B82F6' },
  'bug-fixes': { icon: Bug, color: '#EF4444' },
  meeting: { icon: Users, color: '#10B981' },
  'client-visit': { icon: MapPin, color: '#F59E0B' },
  documentation: { icon: FileText, color: '#8B5CF6' },
  testing: { icon: Building, color: '#06B6D4' },
};

export default function WeeklyTimesheetScreen() {
  const dispatch = useDispatch();
  const { theme } = useSelector((state: RootState) => state.auth);
  const { entries } = useSelector((state: RootState) => state.timesheet);
  const { showAlert, AlertComponent } = useAlert();

  const isDark = theme === 'dark';
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showActivityDropdown, setShowActivityDropdown] = useState(false);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [editingEntry, setEditingEntry] = useState<TimesheetEntry | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [activityList, setActivityList] = useState<{ activity_id: number; name: string }[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [timesheetMap, setTimesheetMap] = useState<{ [key: string]: number }>({});
  const [isCalendarVisible, setCalendarVisible] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [timesheetStatus, setTimesheetStatus] = useState('');
  const [isReadOnly, setIsReadOnly] = useState(false);
  const showCalendar = () => {
    setCalendarVisible(true);
    setShowMonthPickerWeek(false);
    setShowMonthPickerWeek(false);

  };
  const hideCalendar = () => setCalendarVisible(false);
  const [currentWeekMonth, setCurrentWeekMonth] = useState(new Date());
  const [showMonthPickerWeek, setShowMonthPickerWeek] = useState(false);
  const [showYearPickerWeek, setShowYearPickerWeek] = useState(false);
  const [yearRangeStartWeek, setYearRangeStartWeek] = useState(
    new Date().getFullYear() - 6 // example: 6 years back
  );


  const [entryForm, setEntryForm] = useState({
    project: '',
    activity: '',
    hours: '',
    comment: '',
    projectId: null,
    activityId: null,

  });
  const [projectList, setProjectList] = useState<{ project_id: number; name: string }[]>([]);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [hoursError, setHoursError] = useState('');

  useEffect(() => {
    const loadProjects = async () => {
      setLoadingProjects(true);
      try {
        const data = await fetchProjectsDropdown();
        setProjectList(data);
      } catch (err) {
        showAlert('Error', 'Failed to load projects', 'error');
      } finally {
        setLoadingProjects(false);
      }
    };

    loadProjects();

  }, []);

  const filteredProjectList = projectList.filter((project) =>
    project.name.toLowerCase().includes(projectSearchQuery.toLowerCase())
  );

  const loadActivities = async (projectId: number) => {
    setLoadingActivities(true);
    try {
      const data = await fetchActivitiesDropdown(projectId);
      setActivityList(data);
    } catch (err) {
      showAlert('Error', 'Failed to load activities', 'error');
    } finally {
      setLoadingActivities(false);
    }
  };

  const formatHours = (hours: number) => {
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;

    if (m === 0) return `${h}h`;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  };

  useEffect(() => {
    loadTimesheetData();
  }, [currentWeekOffset]);

  const loadTimesheetData = async () => {
    try {
      setLoading(true);
      const userId = await AsyncStorage.getItem('User_id');
      if (!userId) return;

      dispatch(clearTimesheetEntries());

      const fromDate = weekDates[0].date;
      const toDate = weekDates[6].date;

      const data = await fetchTimesheet(fromDate, toDate, parseInt(userId));

      // Set timesheet status and read-only mode
      setTimesheetStatus(data.status || '');
      setIsReadOnly(data.status === 'APPROVED');

      const timesheetIdMap: { [key: string]: number } = {};
      data.rows.forEach((row: any) => {
        const key = `${row.project_id}-${row.activity_id}`;
        timesheetIdMap[key] = row.timesheet_id;
      });
      setTimesheetMap(timesheetIdMap);

      const transformedEntries = data.rows.flatMap((row: any) =>
        row.entries
          .map((entry: any) => {
            return {
              id: `${row.project_id}-${row.activity_id}-${entry.date}`,
              date: entry.date,
              project: row.project_name,
              activity: row.activity_name,
              hours: entry.hours,
              comment: entry.comment,
              projectId: row.project_id,
              activityId: row.activity_id,
              timesheet_item_id: entry.timesheet_item_id
            };
          })
          .filter(entry => entry.hours !== "00:00")
      );

      transformedEntries.forEach(entry => {
        dispatch(addTimesheetEntry(entry));
      });
    } catch (error) {
      showAlert('Error', 'Failed to fetch timesheet data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Add this helper function to get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED':
        return '#10B981'; // Green
      case 'SUBMITTED':
        return '#F59E0B'; // Amber
      case 'REJECTED':
        return '#EF4444'; // Red
      default:
        return '#6B7280'; // Gray
    }
  };



  const getWeekDates = (weekOffset: number = 0) => {
    const today = new Date();
    const currentDay = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - currentDay + 1 + (weekOffset * 7));

    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      weekDates.push({
        date: date.toISOString().split('T')[0],
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: date.getDate(),
      });
    }
    return weekDates;
  };

  const weekDates = getWeekDates(currentWeekOffset);

  const getEntriesForDate = (date: string) => {
    return entries.filter(entry => entry.date === date);
  };

  const parseHHMMToHours = (hhmm: string): number => {
    if (!hhmm || !hhmm.includes(":")) return parseFloat(hhmm) || 0;
    const [h, m] = hhmm.split(":").map(Number);
    return h + m / 60;
  };

  const getTotalHoursForDate = (date: string) => {
    return getEntriesForDate(date).reduce(
      (total, entry) => total + parseHHMMToHours(entry.hours),
      0
    );
  };

  const getTotalWeekHours = () => {
    return weekDates.reduce(
      (total, { date }) => total + getTotalHoursForDate(date),
      0
    );
  };


  const formatHoursToHHMM = (hoursString: string) => {
    if (!hoursString) return "00:00";

    const [hourPart, minPart] = hoursString.split(".");
    const hours = parseInt(hourPart, 10) || 0;

    let minutes = 0;
    if (minPart) {
      minutes = parseInt(minPart.padEnd(2, "0").slice(0, 2), 10);
      if (minutes >= 60) minutes = 59;
    }

    const paddedH = String(hours).padStart(2, "0");
    const paddedM = String(minutes).padStart(2, "0");
    return `${paddedH}:${paddedM}`;
  };


  const handleAddEntry = async () => {
    try {
      if (!entryForm.projectId || !entryForm.activityId || !entryForm.hours || !selectedDate) {
        showAlert('Validation Error', 'Please fill all required fields.', 'error');
        return;
      }

      const rawHours = parseFloat(entryForm.hours);
      if (isNaN(rawHours) || rawHours <= 0 || rawHours > 24) {
        showAlert('Invalid Hours', 'Hours must be between 0 and 24.', 'error');
        return;
      }
      const dayEntries = getEntriesForDate(selectedDate);

      const totalSoFar = dayEntries
        .filter(e => !editingEntry || e.timesheet_item_id !== editingEntry.timesheet_item_id)
        .reduce((sum, e) => sum + parseFloat(e.hours || 0), 0);

      if (totalSoFar + rawHours > 24) {
        showAlert(
          'Invalid Hours',
          `You already logged ${totalSoFar}h on ${new Date(selectedDate).toDateString()}. Total cannot exceed 24h.`,
          'error'
        );
        return;
      }

      const formattedHours = formatHoursToHHMM(entryForm.hours);
      const weekStart = weekDates[0].date;
      const weekEnd = weekDates[6].date;

      const payload = {
        weekStart,
        weekEnd,
        rows: [
          {
            project_id: parseInt(entryForm.projectId, 10),
            activity_id: parseInt(entryForm.activityId, 10),
            entries: [
              {
                date: selectedDate,
                hours: formattedHours,
                comment: entryForm.comment || '',
                ...(editingEntry?.timesheet_item_id && { timesheet_item_id: editingEntry.timesheet_item_id }),
              },
            ],
          },
        ],
      };

      console.log('Final timesheet payload:', payload);
      await saveTimesheetEntry(payload);
      await loadTimesheetData();
      showAlert('Success', editingEntry ? 'Entry updated.' : 'Entry added.', 'success');
      resetEntryForm();
      // Reset form state
      setEntryForm({ project: '', projectId: null, activity: '', activityId: null, hours: '', comment: '' });
      setEditingEntry(null);
      setShowModal(false);
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to save timesheet.', 'error');
    }
  };

  const handleEditEntry = (entry: TimesheetEntry) => {
    setEditingEntry({ ...entry, timesheet_item_id: entry.timesheet_item_id });
    setSelectedDate(entry.date);
    setEntryForm({
      project: entry.project,
      activity: entry.activity,
      hours: entry.hours.toString(),
      comment: entry.comment,
      projectId: entry.projectId,
      activityId: entry.activityId,
    });
    setShowModal(true);


    if (entry.projectId) {
      loadActivities(entry.projectId);
    }
  };

  const handledeleteEntry = async (entry: any) => {
    showAlert(
      "Confirm Delete",
      "Are you sure you want to delete this entry?",
      'warning',
      [
        {
          text: "Cancel",
          onPress: () => { },
          style: "cancel",
        },
        {
          text: "Delete",
          onPress: async () => {
            try {
              if (!entry.timesheet_item_id) {
                showAlert("Error", "Cannot delete entry: No timesheet item ID found", 'error');
                return;
              }
              await deleteTimesheetEntry(entry.timesheet_item_id);
              dispatch(removeTimesheetEntry(entry.id));
              showAlert("Success", "Entry deleted successfully", 'success');
            } catch (error: any) {
              showAlert("Error", error.message || "Failed to delete entry", 'error');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleSubmitTimesheet = async () => {
    try {
      const uniqueTimesheetIds = [...new Set(Object.values(timesheetMap))];

      if (uniqueTimesheetIds.length === 0) {
        showAlert('No Timesheet', 'No timesheet entries to submit.', 'warning');

        return;
      }

      const timesheetIdToSubmit = uniqueTimesheetIds[0]; // Adjust logic if needed

      const result = await submitTimesheet(timesheetIdToSubmit);

      if (result.status === 'success') {
        showAlert('Success', 'Timesheet submitted successfully.', 'success');
        loadTimesheetData(); // Refresh data if needed
      } else {
        showAlert('Error', result.message || 'Failed to submit timesheet.', 'error');
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'An unexpected error occurred.', 'error');
    }
  };

  const openAddModal = (date: string) => {
    setEditingEntry(null);
    setSelectedDate(date);
    setEntryForm({
      project: '', activity: '', hours: '', comment: '', activityId: null,
      projectId: null,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingEntry(null);
    setEntryForm({
      project: '', activity: '', hours: '', comment: '', activityId: null,
      projectId: null,
    });
    setSelectedDate('');
    setShowProjectDropdown(false);
    setShowActivityDropdown(false);
    Keyboard.dismiss();
    resetEntryForm();
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeekOffset(prev => {
      if (direction === 'next') {
        return Math.min(prev + 1, 0);
      } else {
        return prev - 1;
      }
    });
  };
  // const navigateWeek = (direction: 'prev' | 'next') => 
  // { setCurrentWeekOffset(prev => direction === 'prev' ? prev - 1 : prev + 1); };

  const getWeekRange = () => {
    const startDate = weekDates[0];
    const endDate = weekDates[6];
    const startMonth = new Date(startDate.date).toLocaleDateString('en-US', { month: 'short' });
    const endMonth = new Date(endDate.date).toLocaleDateString('en-US', { month: 'short' });
    const year = new Date(startDate.date).getFullYear();

    if (startMonth === endMonth) {
      return `${startDate.dayNumber} - ${endDate.dayNumber} ${startMonth} ${year}`;
    } else {
      return `${startDate.dayNumber} ${startMonth} - ${endDate.dayNumber} ${endMonth} ${year}`;
    }
  };

  const getActivityIcon = (activityValue: string) => {
    const activity = activities.find(a => a.value === activityValue);
    return activity ? activity.icon : Code;
  };

  const getActivityColor = (activityValue: string) => {
    const activity = activities.find(a => a.value === activityValue);
    return activity ? activity.color : '#3B82F6';
  };

  const getActivityLabel = (activityValue: string) => {
    const activity = activities.find(a => a.value === activityValue);
    return activity ? activity.label : activityValue;
  };

  const handleDatePicked = (date: Date) => {
    setSelectedWeek(date);
    const mondayOfPickedDate = getStartOfWeek(date);
    const mondayOfToday = getStartOfWeek(new Date());

    const diffInWeeks = getWeekDifference(mondayOfToday, mondayOfPickedDate);
    setCurrentWeekOffset(diffInWeeks);
    hideCalendar();
  };

  const getStartOfWeek = (date: Date) => {
    const day = date.getDay(); // Sunday = 0, Monday = 1, ...
    const diff = (day === 0 ? -6 : 1) - day;
    const monday = new Date(date);
    monday.setDate(date.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const getWeekDifference = (from: Date, to: Date) => {
    const msInWeek = 7 * 24 * 60 * 60 * 1000;
    return Math.round((to.getTime() - from.getTime()) / msInWeek);
  };

  const resetEntryForm = () => {
    setEntryForm({
      project: '',
      projectId: null,
      activity: '',
      activityId: null,
      hours: '',
      comment: '',
    });
    setHoursError('');
    setProjectSearchQuery('');
    setActivityList([]);
  };

  return (
    <>
      {/* <TouchableWithoutFeedback onPress={Keyboard.dismiss}> */}
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
              <Text style={styles.headerTitle}>Weekly Timesheet</Text>
              <View style={styles.placeholder} />
            </View>

            {/* Week Navigation */}
            <View style={styles.weekNavigation}>
              <TouchableOpacity style={styles.weekNavButton} onPress={() => navigateWeek('prev')}>
                <ChevronLeft size={20} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.weekInfo}><TouchableOpacity onPress={(showCalendar)}>
                <CalendarRange size={20} color="#FFFFFF" /></TouchableOpacity>
                <Text style={styles.weekText}>{getWeekRange()}</Text>
              </View>
              <TouchableOpacity style={styles.weekNavButton} onPress={() => navigateWeek('next')}>
                <ChevronRight size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
        <Modal
          transparent
          visible={isCalendarVisible}
          animationType="fade"
          onRequestClose={hideCalendar}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.calendarOverlay}
            onPress={hideCalendar} // Fixed: added proper function call
          >
            <TouchableOpacity
              style={[styles.calendarModal, isDark && { backgroundColor: '#1F2937' }]}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()} // Prevent click from bubbling to parent
            >
              <Calendar
                key={currentWeekMonth.toISOString()}
                current={currentWeekMonth.toISOString().split("T")[0]}
                onMonthChange={(month) => setCurrentWeekMonth(new Date(month.dateString))}
                hideArrows={true}
                renderHeader={(date) => (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingHorizontal: 10,
                    }}
                  >
                    {/* Left Arrow for Previous Month */}
                    <TouchableOpacity
                      onPress={() => {
                        const prevMonth = new Date(currentWeekMonth);
                        prevMonth.setMonth(prevMonth.getMonth() - 1);
                        setCurrentWeekMonth(prevMonth);
                      }}
                      style={{ padding: 10 }}
                    >
                      <Text style={{ color: isDark ? "#9CA3AF" : "#000", fontSize: 20 }}>‹</Text>
                    </TouchableOpacity>

                    {/* Month and Year Display */}
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      {/* Month Picker Toggle */}
                      <TouchableOpacity
                        onPress={() => setShowMonthPickerWeek((prev) => !prev)}
                      >
                        <Text style={{
                          fontSize: 18,
                          fontWeight: "bold",
                          color: isDark ? "#fff" : "#000",
                          padding: 10,
                          marginRight: 5,
                        }}>
                          {date.toString("MMMM")}
                        </Text>
                      </TouchableOpacity>

                      {/* Year Picker Toggle */}
                      <TouchableOpacity
                        onPress={() => setShowYearPickerWeek((prev) => !prev)}
                      >
                        <Text style={{
                          fontSize: 18,
                          fontWeight: "bold",
                          color: isDark ? "#fff" : "#000",
                          padding: 10,
                          marginLeft: 5,
                        }}>
                          {date.toString("yyyy")}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Right Arrow for Next Month */}
                    <TouchableOpacity
                      onPress={() => {
                        const nextMonth = new Date(currentWeekMonth);
                        nextMonth.setMonth(nextMonth.getMonth() + 1);
                        setCurrentWeekMonth(nextMonth);
                      }}
                      style={{ padding: 10 }}
                    >
                      <Text style={{ color: isDark ? "#9CA3AF" : "#000", fontSize: 20 }}>›</Text>
                    </TouchableOpacity>
                  </View>
                )}


                // hideArrows={showMonthPickerWeek || showYearPickerWeek}
                hideDayNames={showMonthPickerWeek || showYearPickerWeek}
                onDayPress={(day) => {
                  handleDatePicked(new Date(day.dateString));
                  hideCalendar();
                }}
                markedDates={{
                  ...(selectedWeek ? {
                    [selectedWeek.toISOString().split('T')[0]]: {
                      selected: true,
                      selectedColor: '#f64137'
                    }
                  } : {})
                }}
                maxDate={today}
                theme={{
                  calendarBackground: isDark ? '#1F2937' : '#fff',
                  dayTextColor: isDark ? '#fff' : '#000',
                  textSectionTitleColor: isDark ? '#9CA3AF' : '#6B7280',
                  selectedDayBackgroundColor: '#f64137',
                  todayTextColor: '#10B981',
                  arrowColor: isDark ? '#9CA3AF' : '#000',
                  textDisabledColor: isDark ? '#6a6a6bff' : '#D1D5DB'
                }}
              />

              {/* Month Picker Overlay */}
              {showMonthPickerWeek && (
                <View
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: [{ translateX: -154 }, { translateY: -180 }],
                    width: 325,
                    backgroundColor: isDark ? '#1F2937' : '#fff',
                    borderRadius: 12,
                    padding: 15,
                    zIndex: 1000,
                    elevation: 5,
                  }}
                >
                  <Text
                    style={{
                      color: isDark ? '#fff' : '#000',
                      fontWeight: 'bold',
                      marginBottom: 10,
                      textAlign: 'center',
                    }}
                  >
                    Select Month
                  </Text>
                  <FlatList
                    data={Array.from({ length: 12 }, (_, i) => i)}
                    keyExtractor={(item) => item.toString()}
                    numColumns={3}
                    renderItem={({ item }) => {
                      const isSelected = currentWeekMonth.getMonth() === item;
                      return (
                        <TouchableOpacity
                          style={{
                            flex: 1,
                            padding: 5,
                            margin: 5,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          onPress={() => {
                            const newDate = new Date(currentWeekMonth);
                            newDate.setMonth(item);
                            newDate.setDate(1);
                            setCurrentWeekMonth(newDate);
                            setShowMonthPickerWeek(false);
                          }}
                        >
                          <View
                            style={{
                              width: 50,
                              height: 50,
                              borderRadius: 25, // circular shape
                              backgroundColor: isSelected ? '#f64137' : 'transparent',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Text
                              style={{
                                color: isSelected ? '#fff' : isDark ? '#fff' : '#000',
                                fontWeight: '500',
                                fontSize: 14,
                              }}
                            >
                              {new Date(2023, item, 1).toLocaleString('default', { month: 'short' })}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    }}
                  />
                </View>
              )}


              {/* Year Picker Overlay */}
              {showYearPickerWeek && (
                <View
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: [{ translateX: -154 }, { translateY: -180 }],
                    width: 326,
                    backgroundColor: isDark ? '#1F2937' : '#fff',
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
                      onPress={() => setYearRangeStartWeek(prev => prev - 12)}
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
                      {yearRangeStartWeek} - {yearRangeStartWeek + 11}
                    </Text>

                    <TouchableOpacity
                      onPress={() => setYearRangeStartWeek(prev => prev + 12)}
                      style={{ padding: 5 }}
                    >
                      <Text style={{ fontSize: 18, color: isDark ? "#fff" : "#000" }}>›</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Grid of years */}
                  <FlatList
                    data={Array.from({ length: 12 }, (_, i) => yearRangeStartWeek + i)}
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
                            currentWeekMonth.getFullYear() === item
                              ? "#f64137"
                              : isDark
                                ? "#374151"
                                : "#f3f4f6",
                          borderRadius: 8,
                          alignItems: "center",
                        }}
                        onPress={() => {
                          const newDate = new Date(currentWeekMonth);
                          newDate.setFullYear(item);
                          newDate.setDate(1);
                          setCurrentWeekMonth(newDate);
                          setShowYearPickerWeek(false);
                        }}
                      >
                        <Text
                          style={{
                            color:
                              currentWeekMonth.getFullYear() === item
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





        {/* Week Summary */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.summaryContainer}>
          <View style={[styles.summaryCard, isDark && styles.darkCard]}>
            <View style={styles.summaryHeader}>
              <Text style={[styles.summaryTitle, isDark && styles.darkText]}>Week Summary</Text>
              <View style={styles.totalHours}>
                <Clock size={20} color="#f24637" />
                <Text style={[styles.totalHoursText, isDark && styles.darkText]}>
                  {formatHours(getTotalWeekHours())}
                </Text>

              </View>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.min((getTotalWeekHours() / 40) * 100, 100)}%` }]} />
            </View>
            <Text style={[styles.progressText, isDark && styles.darkSubText]}>
              {formatHours(getTotalWeekHours())} of 40h logged
            </Text>

          </View>
        </Animated.View>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}

        >
          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#f24637" />
              <Text style={[styles.loadingText, isDark && styles.darkSubText]}>
                Loading timesheet data...
              </Text>
            </View>
          ) : (
            <>
              {/* Daily Entries */}
              <Animated.View entering={FadeInDown.delay(300)} style={styles.entriesContainer}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Daily Entries</Text>
                  {timesheetStatus && (
                    <View style={[
                      styles.statusBadge,
                      {
                        backgroundColor: `${getStatusColor(timesheetStatus)}20`,
                        borderColor: getStatusColor(timesheetStatus)
                      }
                    ]}>
                      <Text style={[styles.statusText, { color: getStatusColor(timesheetStatus) }]}>
                        {timesheetStatus}
                      </Text>
                    </View>
                  )}
                </View>

                {weekDates.map((dayInfo, index) => {
                  const dayEntries = getEntriesForDate(dayInfo.date);
                  const dayTotal = getTotalHoursForDate(dayInfo.date);

                  return (
                    <Animated.View
                      key={dayInfo.date}
                      entering={FadeInRight.delay(400 + index * 100)}
                      style={[styles.dayCard, isDark && styles.darkCard]}
                    >
                      <View style={styles.dayHeader}>
                        <View style={styles.dayInfo}>
                          <Text style={[styles.dayName, isDark && styles.darkText]}>
                            {dayInfo.day}
                          </Text>
                          <Text style={[styles.dayNumber, isDark && styles.darkSubText]}>
                            {dayInfo.dayNumber}
                          </Text>
                        </View>
                        <View style={styles.dayActions}>
                          <View style={[styles.dayHours, isDark && styles.darkdayHours]}>
                            <Text style={[styles.dayHoursText, isDark && styles.darkText]}>
                              {formatHours(getTotalHoursForDate(dayInfo.date))}
                            </Text>
                          </View>
                          {/* Conditionally render Add button */}
                          {!isReadOnly && (
                            <TouchableOpacity
                              style={styles.addButton}
                              onPress={() => openAddModal(dayInfo.date)}
                            >
                              <Plus size={16} color="#FFFFFF" />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>

                      {dayEntries.map((entry, entryIndex) => {
                        const ActivityIcon = getActivityIcon(entry.activity);
                        const activityColor = getActivityColor(entry.activity);

                        return (
                          <View key={entry.id || entryIndex} style={styles.entryItem}>
                            <View style={[styles.entryIcon, { backgroundColor: `${activityColor}20` }]}>
                              <ActivityIcon size={16} color={activityColor} />
                            </View>
                            <View style={styles.entryContent}>
                              <View style={[styles.entryHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                                <Text
                                  style={[styles.entryProject, isDark && styles.darkText, { flex: 1 }]}
                                  numberOfLines={1}
                                  ellipsizeMode="tail"
                                >
                                  {entry.project}
                                </Text>
                                {/* Conditionally render Edit and Delete buttons */}
                                {!isReadOnly && (
                                  <View style={{ flexDirection: 'row', marginLeft: 8 }}>
                                    <TouchableOpacity onPress={() => handleEditEntry(entry)} style={styles.iconButton}>
                                      <Edit size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handledeleteEntry(entry)} style={styles.iconButton}>
                                      <Trash2 size={20} color={isDark ? '#EF4444' : '#DC2626'} />
                                    </TouchableOpacity>
                                  </View>
                                )}
                              </View>
                              <Text style={[styles.entryActivity, isDark && styles.darkSubText]}>
                                {getActivityLabel(entry.activity)} • {formatHours(parseHHMMToHours(entry.hours))}
                              </Text>

                              {entry.comment && (
                                <Text style={[styles.entryComment, isDark && styles.darkSubText]}>
                                  {entry.comment}
                                </Text>
                              )}
                            </View>
                          </View>
                        );
                      })}

                      {dayEntries.length === 0 && (
                        <View style={styles.emptyDay}>
                          <Text style={[styles.emptyDayText, isDark && styles.darkSubText]}>
                            No entries for this day
                          </Text>
                        </View>
                      )}
                    </Animated.View>
                  );
                })}
              </Animated.View>

              {!isReadOnly && (
                <Animated.View entering={FadeInDown.delay(600)} style={styles.submitContainer}>
                  <TouchableOpacity style={styles.submitButton} onPress={() => handleSubmitTimesheet()}>
                    <LinearGradient
                      colors={['#f24637', '#DC2626']}
                      style={styles.submitGradient}
                    >
                      <Save size={20} color="#FFFFFF" />
                      <Text style={styles.submitButtonText}>Submit Timesheet</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              )}
            </>)}
        </ScrollView>
      </View>
      {/* </TouchableWithoutFeedback> */}

      {/* Add/Edit Entry Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            style={[styles.modalContainer, isDark && styles.darkModalContainer]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDark && styles.darkText]}>
                {editingEntry ? 'Edit Entry' : 'Add Entry'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeModal}
              >
                <Text style={styles.closeButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalScrollContent}
            >
              {/* Date Display */}
              <View style={[styles.dateDisplay, isDark && styles.darkdateDisplay]}>
                <CalendarRange size={20} color="#f24637" />
                <Text style={[styles.dateText, isDark && styles.darkText]}>
                  {selectedDate && new Date(selectedDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
              </View>

              {/* Project Selection */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, isDark && styles.darkText]}>Project <Text style={{ color: 'red', fontWeight: 'bold' }}> *</Text></Text>
                <TouchableOpacity
                  style={[styles.dropdown, isDark && styles.darkDropdown]}
                  onPress={() => {
                    setShowProjectDropdown(!showProjectDropdown);
                    setShowActivityDropdown(false);
                  }}
                >
                  <Building size={20} color="#f24637" />
                  <Text style={[styles.dropdownText, isDark && styles.darkText, !entryForm.project && styles.placeholderText]}>
                    {entryForm.project || 'Select project'}
                  </Text>
                  <ChevronDown size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                </TouchableOpacity>

                {(showProjectDropdown || showActivityDropdown) && (
                  <TouchableWithoutFeedback
                    onPress={() => {
                      setShowProjectDropdown(false);
                      setShowActivityDropdown(false);
                    }}
                  >
                    <View style={StyleSheet.absoluteFill} />
                  </TouchableWithoutFeedback>
                )}

                {showProjectDropdown && (
                  <View
                    style={[
                      styles.dropdownList,
                      isDark && styles.darkDropdownList,
                      { maxHeight: 300, paddingHorizontal: 8, paddingVertical: 4 }
                    ]}
                  >
                    <View style={[styles.searchinputWrapper, isDark && styles.darkInputWrapper]}>
                      <TextInput
                        style={[styles.input, isDark && styles.darkText]}
                        placeholder="Search project..."
                        placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                        value={projectSearchQuery}
                        onChangeText={setProjectSearchQuery}
                        autoFocus
                      />

                      {projectSearchQuery?.length > 0 && (
                        <TouchableOpacity onPress={() => setProjectSearchQuery("")}>
                          <X size={20} color={isDark ? "#9CA3AF" : "#6B7280"} />
                        </TouchableOpacity>
                      )}
                    </View>
                    <ScrollView
                      keyboardShouldPersistTaps="handled"
                      nestedScrollEnabled={true}
                    >
                      {filteredProjectList.length === 0 ? (
                        <Text style={{ padding: 10, textAlign: 'center', color: isDark ? '#ccc' : '#333' }}>
                          No matching projects.
                        </Text>
                      ) : (
                        filteredProjectList.map((project) => (
                          <TouchableOpacity
                            key={project.project_id}
                            style={styles.dropdownItem}
                            onPress={() => {
                              setEntryForm({
                                ...entryForm,
                                project: project.name,
                                projectId: project.project_id,
                                activity: ''
                              });
                              setShowProjectDropdown(false);
                              setProjectSearchQuery('');
                              loadActivities(project.project_id);
                            }}
                          >
                            <Text style={[styles.dropdownItemText, isDark && styles.darkText]}>
                              {project.name}
                            </Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>
                  </View>
                )}

              </View>

              {/* Activity Selection */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, isDark && styles.darkText]}>Activity <Text style={{ color: 'red', fontWeight: 'bold' }}> *</Text></Text>
                <TouchableOpacity
                  style={[styles.dropdown, isDark && styles.darkDropdown]}
                  onPress={() => {
                    setShowActivityDropdown(!showActivityDropdown);
                    setShowProjectDropdown(false);
                  }}
                >
                  {entryForm.activity ? (
                    <>
                      {React.createElement(getActivityIcon(entryForm.activity), {
                        size: 20,
                        color: getActivityColor(entryForm.activity)
                      })}
                      <Text style={[styles.dropdownText, isDark && styles.darkText]}>
                        {getActivityLabel(entryForm.activity)}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Code size={20} color="#f24637" />
                      <Text style={[styles.dropdownText, styles.placeholderText]}>
                        Select activity
                      </Text>
                    </>
                  )}
                  <ChevronDown size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                </TouchableOpacity>


                {showActivityDropdown && (
                  <View style={[styles.dropdownList, isDark && styles.darkDropdownList, { maxHeight: 200 }]}>
                    <ScrollView
                      keyboardShouldPersistTaps="handled"
                      nestedScrollEnabled={true}
                    >
                      {loadingActivities ? (
                        <Text style={{ padding: 10, textAlign: 'center', color: isDark ? '#ccc' : '#333' }}>
                          Loading...
                        </Text>
                      ) : activityList.length === 0 ? (
                        <Text style={{ padding: 10, textAlign: 'center', color: isDark ? '#ccc' : '#333' }}>
                          No activities found.
                        </Text>
                      ) : (
                        activityList.map((activity) => (

                          <TouchableOpacity
                            key={activity.activity_id}
                            style={styles.dropdownItem}
                            onPress={() => {
                              setEntryForm({ ...entryForm, activity: activity.name, activityId: activity.activity_id });
                              setShowActivityDropdown(false);
                            }}
                          >
                            <Text style={[styles.dropdownItemText, isDark && styles.darkText]}>
                              {activity.name}
                            </Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>
                  </View>
                )}

              </View>


              {/* Hours Input */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, isDark && styles.darkText]}>Hours <Text style={{ color: 'red', fontWeight: 'bold' }}> *</Text></Text>
                {hoursError !== '' && (
                  <Text style={{ color: 'red', marginTop: 4, fontSize: 12 }}>
                    {hoursError}
                  </Text>
                )}
                <View style={[styles.inputWrapper, isDark && styles.darkInputWrapper]}>
                  <Clock size={20} color="#f24637" />
                  <TextInput
                    style={[styles.input, isDark && styles.darkText]}
                    placeholder="0.0"
                    placeholderTextColor={isDark ? '#9CA3AF' : '#9CA3AF'}
                    value={entryForm.hours}
                    onChangeText={(text) => {
                      const numericValue = parseFloat(text);
                      if (isNaN(numericValue) || numericValue <= 24) {
                        setEntryForm({ ...entryForm, hours: text });
                        setHoursError('');
                      } else {
                        setHoursError('Working hours should not be greater than 24 for a Day');
                      }
                    }}
                    keyboardType="decimal-pad"
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* Comment Input */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, isDark && styles.darkText]}>Comment</Text>
                <View style={[styles.textAreaWrapper, isDark && styles.darkInputWrapper]}>
                  <Edit3 size={20} color="#f24637" style={styles.textAreaIcon} />
                  <TextInput
                    style={[styles.textArea, isDark && styles.darkText]}
                    placeholder="Add any additional notes..."
                    placeholderTextColor={isDark ? '#9CA3AF' : '#9CA3AF'}
                    value={entryForm.comment}
                    onChangeText={(text) => setEntryForm({ ...entryForm, comment: text })}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    returnKeyType="done"
                    blurOnSubmit={true}
                  />
                </View>
              </View>
              {(showProjectDropdown || showActivityDropdown) && (
                <TouchableWithoutFeedback
                  onPress={() => {
                    setShowProjectDropdown(false);
                    setShowActivityDropdown(false);
                  }}
                >
                  <View style={StyleSheet.absoluteFill} />
                </TouchableWithoutFeedback>
              )}


              {/* Save Button */}
              <TouchableOpacity style={styles.addEntryButton} onPress={handleAddEntry}>
                <LinearGradient
                  colors={['#f24637', '#DC2626']}
                  style={styles.addEntryGradient}
                >
                  <Save size={20} color="#FFFFFF" />
                  <Text style={styles.addEntryButtonText}>
                    {editingEntry ? 'Update Entry' : 'Add Entry'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>

          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
      <AlertComponent />
    </>
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
    marginBottom: 16,
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
  weekNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekNavButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  weekText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  summaryContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  summaryCard: {
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
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  darkText: {
    color: '#FFFFFF',
  },
  darkSubText: {
    color: '#9CA3AF',
  },
  totalHours: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  totalHoursText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#f24637',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
  },
  entriesContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  dayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dayInfo: {
    alignItems: 'center',
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  dayNumber: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  dayActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dayHours: {
    backgroundColor: '#FEF3F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  darkdayHours: {
    backgroundColor: '#f24637',
  },
  dayHoursText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f24637',
    justifyContent: 'center',
    alignItems: 'center',
  },
  entriesList: {
    gap: 12,
  },
  entryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  entryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  entryContent: {
    flex: 1,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  entryProject: {
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
  entryActivity: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  entryComment: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  emptyDay: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyDayText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  submitContainer: {
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#f24637',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
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
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#f24637',
    fontWeight: '500',
  },
  modalContent: {
    flex: 1,
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#FEF3F2',
    borderRadius: 12,
  },
  darkdateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f24637',
    borderRadius: 12,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  formGroup: {
    marginBottom: 24,
    position: 'relative',
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  darkDropdown: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
  },
  dropdownText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
    maxHeight: 200,
    marginTop: 4,
    paddingVertical: 4,


  },
  darkDropdownList: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#111827',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  searchinputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,

    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  darkInputWrapper: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  textAreaWrapper: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'flex-start',
    gap: 12,
  },
  textAreaIcon: {
    marginTop: 2,
  },
  textArea: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  addEntryButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 32,
    shadowColor: '#f24637',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  addEntryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  addEntryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  iconButton: {
    padding: 10,
  },
  calendarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    elevation: 10,
    width: '90%',
    maxWidth: 350,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,

  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});