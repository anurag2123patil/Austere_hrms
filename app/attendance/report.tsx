import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { router } from 'expo-router';
import { ArrowLeft, Filter, Search, Calendar, Download, ChartBar as BarChart3, TrendingUp, Clock, CircleCheck as CheckCircle, Circle as XCircle, TriangleAlert as AlertTriangle, ChevronDown, Import as SortAsc, Dessert as SortDesc, FileText, Target, Award, Activity, ArrowUp, MoveVertical as MoreVertical, Eye, X } from 'lucide-react-native';
import Animated, {
  FadeInDown,
  FadeInRight,
  SlideInRight,
} from 'react-native-reanimated';
import { fetchEmployeeAttendanceRecords } from '../../api/Api';
import AsyncStorage from '@react-native-async-storage/async-storage';
const { width } = Dimensions.get('window');

interface AttendanceReport {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  checkOutDate: string | null;
  totalHours: number;
  status: 'present' | 'absent' | 'late' | 'half-day';
  location?: string;
  overtime: number;
  breaks: number;
  productivity: number;
}
interface TransformedAttendanceRecord {
  id: number;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  checkOutDate: string;
  totalHours: number;
  status: 'present' | 'late' | 'absent' | 'half-day';
  daterange: 'week' | 'month' | 'quarter' | 'year'
}


export default function AttendanceReportScreen() {
  const { theme } = useSelector((state: RootState) => state.auth);
  const isDark = theme === 'dark';

  const [reportData, setReportData] = useState<AttendanceReport[]>([]);
  const [filteredData, setFilteredData] = useState<AttendanceReport[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'hours' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [records, setRecords] = useState<TransformedAttendanceRecord[]>([]);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<any>(null);
  const itemsPerPage = 10;
  const [filteredRecords, setFilteredRecords] = useState<TransformedAttendanceRecord[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [stats, setStats] = useState({
    totalDays: 0,
    attendanceRate: 0,
    totalHours: 0,
    avgDaily: 0,
  });

  // Add state for back button navigation
  const [isNavigatingBack, setIsNavigatingBack] = useState(false);

  const transformRecordStatus = (record: any): TransformedAttendanceRecord => {
    const punchIn = record.punchIn || '';
    const punchOut = record.punchOut || '';

    const [punchInDate, punchInTime, punchInMeridiem] = punchIn ? punchIn.split(' ') : ['N/A', '', ''];
    const [punchOutDate, punchOutTime, punchOutMeridiem] = punchOut ? punchOut.split(' ') : ['N/A', '', ''];

    const standardStartTime = punchInDate !== 'N/A' ? new Date(`${punchInDate} 09:00:00`) : null;
    const punchInTimeObj = punchIn ? new Date(punchIn) : null;
    const punchOutTimeObj = punchOut ? new Date(punchOut) : null;

    // Convert duration to display format (H:MM)
    let durationDisplay = '00:00';
    let durationInHours = 0;
    if (record.duration) {
      const [h, m, s] = record.duration.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        durationInHours = h + (m / 60) + (s / 3600);  // For status calculation
        durationDisplay = `${h}:${m.toString().padStart(2, '0')}`;
      }
    }

    let status: 'present' | 'late' | 'half-day' | 'absent' = 'absent';

    if (punchInTimeObj) {
      if (punchOutTimeObj) {
        // Full record available
        if (durationInHours >= 8) {
          status = punchInTimeObj > (standardStartTime || punchInTimeObj) ? 'late' : 'present';
        } else if (durationInHours >= 4) {
          status = 'half-day';
        } else if (durationInHours <= 3) {
          status = 'absent';
        }
      } else {
        const now = new Date();
        const workingHoursSoFar = (now.getTime() - punchInTimeObj.getTime()) / (1000 * 60 * 60);

        if (workingHoursSoFar >= 8) {
          status = punchInTimeObj > (standardStartTime || punchInTimeObj) ? 'late' : 'present';
        } else if (workingHoursSoFar >= 4) {
          status = 'half-day';
        } else if (workingHoursSoFar <= 3) {
          status = 'absent';
        } else {
          status = 'present';
        }
      }
    }

    return {
      id: String(record.id),
      date: punchInDate || 'N/A',
      checkIn: punchIn ? `${punchInTime} ${punchInMeridiem}` : null,
      checkOut: punchOut ? `${punchOutTime} ${punchOutMeridiem}` : null,
      checkOutDate: punchOutDate || 'N/A',
      totalHours: durationDisplay,
      status,
      location: record.location || 'N/A',
      notes: record.punchInNote || undefined,
      approvedBy: undefined,
    };
  };

  // Map UI status filter values to API values
  const mapStatusFilterToAPI = (uiStatus: string) => {
    const mapping: { [key: string]: string } = {
      'half-day': 'half',
      'present': 'present',
      'late': 'late',
      'absent': 'absent'
    };
    return mapping[uiStatus] || uiStatus;
  };

  // Map UI date range values to API values
  const mapDateRangeToAPI = (uiRange: string) => {
    const mapping: { [key: string]: string } = {
      'week': 'weekly',
      'month': 'monthly',
      'quarter': 'quarterly',
      'year': 'yearly'
    };
    return mapping[uiRange] || uiRange;
  };

  const loadData = useCallback(
    async (isNextPage = false, resetData = false) => {
      if (isLoading || (!hasMore && isNextPage)) return;
      setIsLoading(true);

      try {
        const token = await AsyncStorage.getItem("token");
        const employeeId = await AsyncStorage.getItem("User_id");
        if (!token || !employeeId) {
          console.warn('Missing token or employeeId');
          setIsLoading(false);
          return;
        }

        const pageToFetch = isNextPage ? page + 1 : 1;

        // Prepare filters object
        const filters = {
          page: pageToFetch,
          per_page: itemsPerPage,
          ...(searchQuery.trim() && { search: searchQuery.trim() }),
          ...(statusFilter !== 'all' && { status: mapStatusFilterToAPI(statusFilter) }), // Use mapped value
          ...(dateRange !== 'all' && { date_range: mapDateRangeToAPI(dateRange) }),
          ...(sortBy && { sort: `${sortBy}:${sortOrder}` }),
        };

        console.log('Loading report data with filters:', filters); // Debug log

        const response = await fetchEmployeeAttendanceRecords(employeeId, token, filters);

        console.log('Report API Response received:', response); // Debug log

        if (response && response.records) {
          const formattedRecords = response.records.map(transformRecordStatus);
          console.log('Formatted report records:', formattedRecords.length); // Debug log

          if (resetData || !isNextPage) {
            setRecords(formattedRecords);
            setPage(1);
          } else {
            setRecords((prev) => [...prev, ...formattedRecords]);
            setPage(pageToFetch);
          }

          setHasMore(formattedRecords.length === itemsPerPage);
          setAttendanceSummary(response.summary);

          // Update stats from API summary
          if (response.summary) {
            const totalHoursFromWeekly = Object.values(response.summary.weeklyHours || {})
              .map(Number)
              .reduce((sum, hrs) => sum + hrs, 0);

            setStats({
              totalDays: (response.summary.present_days || 0) + (response.summary.absent_days || 0),
              attendanceRate: Number((response.summary.attendance_percent || 0).toFixed(2)),
              totalHours: Number(totalHoursFromWeekly.toFixed(2)),
              avgDaily: Number((response.summary.average_hours_per_day || 0).toFixed(2)),
            });
          } else {
            // Reset stats if no summary
            setStats({ totalDays: 0, attendanceRate: 0, totalHours: 0, avgDaily: 0 });
          }
        } else {
          console.warn('No records in report response:', response);
          if (resetData || !isNextPage) {
            setRecords([]);
            setAttendanceSummary(null);
            setStats({ totalDays: 0, attendanceRate: 0, totalHours: 0, avgDaily: 0 });
          }
        }
      } catch (err) {
        console.error("Error in report loadData:", err);

        // Show user-friendly error message
        Alert.alert(
          'Error',
          'Failed to load attendance report. Please try again.',
          [{ text: 'OK' }]
        );

        if (resetData || !isNextPage) {
          setRecords([]);
          setAttendanceSummary(null);
          setStats({ totalDays: 0, attendanceRate: 0, totalHours: 0, avgDaily: 0 });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, hasMore, page, searchQuery, statusFilter, dateRange, sortBy, sortOrder]
  );

  // Initial load
  useEffect(() => {
    loadData(false, true);
  }, []);

  // Handle search with debouncing
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      setPage(1);
      setHasMore(true);
      loadData(false, true);
    }, 500); // 500ms debounce

    setSearchTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [searchQuery]);

  // Handle filter changes
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    loadData(false, true);
  }, [statusFilter, dateRange, sortBy, sortOrder]);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    await loadData(false, true);
    setRefreshing(false);
  };

  // Apply local filtering only for display purposes (API should handle most filtering)
  const applyLocalFilters = useCallback(() => {
    let filtered = [...records];

    // Local sorting if needed (API should handle this, but keeping as fallback)
    filtered.sort((a, b) => {
      let comp = 0;
      switch (sortBy) {
        case "date":
          comp = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case "hours":
          comp = a.totalHours - b.totalHours;
          break;
        case "status":
          comp = a.status.localeCompare(b.status);
          break;
      }
      return sortOrder === "asc" ? comp : -comp;
    });

    setFilteredRecords(filtered);
  }, [records, sortBy, sortOrder]);

  useEffect(() => {
    applyLocalFilters();
  }, [applyLocalFilters]);

  // Add back button handler with proper debouncing
  const handleBackPress = useCallback(() => {
    if (isNavigatingBack) return;

    setIsNavigatingBack(true);
    router.back();

    // Reset after navigation would complete
    setTimeout(() => setIsNavigatingBack(false), 500);
  }, [isNavigatingBack]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return '#10B981';
      case 'late': return '#F59E0B';
      case 'absent': return '#EF4444';
      case 'half-day': return '#8B5CF6';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return CheckCircle;
      case 'late': return AlertTriangle;
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
      year: 'numeric',
      weekday: 'short'
    });
  };

  const renderFooter = () => {
    if (!isLoading) return null;
    return (
      <View style={styles.loadingFooter}>
        <Text style={[styles.loadingText, isDark && styles.darkSubText]}>Loading more...</Text>
      </View>
    );
  };
  const clearFilters = () => {
    setDateRange('all');
    setStatusFilter('all');
    setSortBy('date');
  };

  const hasActiveFilters = () => {
    return dateRange !== 'all' || statusFilter !== 'all' || sortBy !== 'date' || sortOrder !== 'desc';
  };

  const renderRecordItem = ({ item, index }: { item: TransformedAttendanceRecord; index: number }) => {
    const StatusIcon = getStatusIcon(item.status);
    const statusColor = getStatusColor(item.status);

    return (
      <Animated.View
        entering={FadeInRight.delay(index * 50)}
        style={[styles.recordItem, isDark && styles.darkRecordItem]}
      >
        <View style={styles.recordHeader}>
          <View style={styles.recordLeft}>
            <View style={[styles.statusIcon, { backgroundColor: `${statusColor}20` }]}>
              <StatusIcon size={20} color={statusColor} />
            </View>
            <View style={styles.recordInfo}>
              <Text style={[styles.recordDate, isDark && styles.darkText]}>
                {formatDate(item.date)}
              </Text>
              <Text style={[styles.recordStatus, { color: statusColor }]}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
          </View>
          <View style={styles.recordRight}>
            <Text style={[styles.recordHours, isDark && styles.darkText]}>
              {item.totalHours}h
            </Text>
            <TouchableOpacity style={styles.moreButton}>
              <MoreVertical size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.recordDetails}>
          <View style={styles.timeRow}>
            {/* Column 1: In Date & In Time */}
            <View style={styles.timeColumn}>
              <Text style={[styles.timeLabel, isDark && styles.darkSubText]}>In Date:</Text>
              <Text style={[styles.timeValue, isDark && styles.darkText]}>
                {item.date || 'N/A'}
              </Text>

              <Text style={[styles.timeLabel, isDark && styles.darkSubText]}>In Time:</Text>
              <Text style={[styles.timeValue, isDark && styles.darkText]}>
                {item.checkIn || 'N/A'}
              </Text>
            </View>

            {/* Column 2: Out Date & Out Time */}
            <View style={styles.timeColumn}>
              <Text style={[styles.timeLabel, isDark && styles.darkSubText]}>Out Date:-</Text>
              <Text style={[styles.timeValue, isDark && styles.darkText]}>
                {item.checkOutDate || 'N/A'}
              </Text>

              <Text style={[styles.timeLabel, isDark && styles.darkSubText]}>Out Time:-</Text>
              <Text style={[styles.timeValue, isDark && styles.darkText]}>
                {item.checkOut || 'N/A'}
              </Text>
            </View>
          </View>

          {item.notes && (
            <View style={styles.notesRow}>
              <Text style={[styles.notesText, isDark && styles.darkSubText]}>
                {item.notes}
              </Text>
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  const renderStatsCard = (icon: any, value: string | number, label: string, color: string) => {
    const IconComponent = icon;
    return (
      <View style={[styles.statCard, isDark && styles.darkCard]}>
        <IconComponent size={24} color={color} />
        <Text style={[styles.statValue, isDark && styles.darkText]}>{value}</Text>
        <Text style={[styles.statLabel, isDark && styles.darkSubText]}>{label}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, isDark && styles.darkContainer]}>
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
        <LinearGradient
          colors={isDark ? ['#1F2937', '#374151'] : ['#f64137', '#f24637']}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackPress}
              disabled={isNavigatingBack}
              activeOpacity={0.7}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <ArrowLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Attendance Report</Text>
            <View style={styles.placeholder} />
            {/* <TouchableOpacity style={styles.downloadButton}>
              <Download size={20} color="#FFFFFF" />
            </TouchableOpacity> */}
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Stats Overview */}
      <Animated.View entering={FadeInDown.delay(200)} style={styles.statsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
          {renderStatsCard(BarChart3, stats.totalDays, 'Total Days', '#3B82F6')}
          {renderStatsCard(CheckCircle, `${stats.attendanceRate}%`, 'Attendance', '#10B981')}
          {renderStatsCard(Clock, `${stats.totalHours}h`, 'Total Hours', '#f24637')}
          {renderStatsCard(Target, `${stats.avgDaily}h`, 'Avg Daily', '#8B5CF6')}
        </ScrollView>
      </Animated.View>

      {/* Search and Filters */}
      <Animated.View entering={FadeInDown.delay(300)} style={styles.controlsContainer}>
        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, isDark && styles.darkSearchBar]}>
            <Search size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
            <TextInput
              style={[styles.searchInput, isDark && styles.darkText]}
              placeholder="Search by month (jul, may, aug)..."
              placeholderTextColor={isDark ? '#9CA3AF' : '#9CA3AF'}
              value={searchQuery}
              onChangeText={handleSearchChange}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearSearchButton}
              >
                <X size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.filterButtonContainer}>
            <TouchableOpacity
              style={[styles.filterButton, isDark && styles.darkFilterButton]}
              onPress={() => setShowFilters(true)}
            >
              <Filter size={20} color={isDark ? '#FFFFFF' : '#6B7280'} />
            </TouchableOpacity>

            {/* Red dot indicator */}
            {hasActiveFilters() && (
              <View style={styles.filterIndicatorDot} />
            )}
          </View>

        </View>

        {/* Sort Controls */}
        <View style={styles.sortContainer}>
          <TouchableOpacity
            style={[styles.sortButton, isDark && styles.darkSortButton]}
            onPress={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? (
              <SortAsc size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
            ) : (
              <SortDesc size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
            )}
            <Text style={[styles.sortText, isDark && styles.darkSubText]}>
              Sort by {sortBy}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Report List */}
      <FlatList
        ref={flatListRef}
        data={filteredRecords}
        renderItem={renderRecordItem}
        keyExtractor={(item) => String(item.id)}
        style={styles.recordsList}
        contentContainerStyle={styles.recordsListContent}
        showsVerticalScrollIndicator={false}
        onEndReached={() => loadData(true)}
        onEndReachedThreshold={0.1}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? '#9CA3AF' : '#6B7280'}
          />
        }
        onScroll={(event) => {
          const yOffset = event.nativeEvent.contentOffset.y;
          setShowScrollToTop(yOffset > 200);
        }}
        scrollEventThrottle={16}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, isDark && styles.darkSubText]}>
                {searchQuery ? `No reports found for "${searchQuery}"` : 'No attendance reports found'}
              </Text>
            </View>
          ) : null
        }
      />

      {showScrollToTop && (
        <TouchableOpacity
          onPress={() => {
            flatListRef.current?.scrollToOffset({ animated: true, offset: 0 });
          }}
          style={styles.scrollToTopButton}
        >
          <ArrowUp size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={[styles.modalContainer, isDark && styles.darkModalContainer]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, isDark && styles.darkText]}>Filters & Sort</Text>
            <TouchableOpacity
              style={styles.filtercloseButton}
              onPress={() => {
                setShowFilters(false);
              }}
            >
              <X size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.modalContent}>
            {/* Date Range Filter */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterTitle, isDark && styles.darkText]}>Date Range</Text>
              <View style={styles.filterOptions}>
                {['all', 'week', 'month', 'quarter', 'year'].map((range) => (
                  <TouchableOpacity
                    key={range}
                    style={[
                      styles.filterOption,
                      isDark && styles.darkFilterOption,
                      dateRange === range && styles.activeFilterOption,
                    ]}
                    onPress={() => setDateRange(range)}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        dateRange === range && styles.activeFilterOptionText,
                        isDark && styles.darkText,
                      ]}
                    >
                      {range.charAt(0).toUpperCase() + range.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Status Filter */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterTitle, isDark && styles.darkText]}>Status</Text>
              <View style={styles.filterOptions}>
                {['all', 'present', 'absent', 'half-day'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.filterOption,
                      isDark && styles.darkFilterOption,
                      statusFilter === status && styles.activeFilterOption,
                    ]}
                    onPress={() => setStatusFilter(status)}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        statusFilter === status && styles.activeFilterOptionText,
                        isDark && styles.darkText,
                      ]}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Sort By */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterTitle, isDark && styles.darkText]}>Sort By</Text>
              <View style={styles.filterOptions}>
                {['date', 'status'].map((sort) => (
                // {['date', 'hours', 'status'].map((sort) => (
                  <TouchableOpacity
                    key={sort}
                    style={[
                      styles.filterOption,
                      isDark && styles.darkFilterOption,
                      sortBy === sort && styles.activeFilterOption,
                    ]}
                    onPress={() => setSortBy(sort)}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        sortBy === sort && styles.activeFilterOptionText,
                        isDark && styles.darkText,
                      ]}
                    >
                      {sort.charAt(0).toUpperCase() + sort.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Bottom Buttons */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.clearFiltersButton}
              onPress={() => {
                clearFilters();
              }}
            >
              <Text style={styles.clearFiltersText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.applyText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
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
    marginBottom: 20,
  },
  headerGradient: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    position: 'relative',
    marginBottom: 16,
  },
  backButton: {
    width: 50,
    height: 50,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  downloadButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,

  },
  statsScroll: {
    flexDirection: 'row',
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    minWidth: 100,
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
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  darkText: {
    color: '#FFFFFF',
  },
  darkSubText: {
    color: '#9CA3AF',
  },
  controlsContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 5,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  darkSearchBar: {
    backgroundColor: '#1F2937',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  filterButton: {
    paddingVertical: 5,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    height: 50

  },
  filterButtonContainer: {
    position: 'relative',
  },

  filterIndicatorDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 10,
    backgroundColor: '#EF4444', // Red color
    zIndex: 1,
  },
  darkFilterButton: {
    backgroundColor: '#1F2937',
  },
  sortContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  darkSortButton: {
    backgroundColor: '#1F2937',
  },
  sortText: {
    fontSize: 14,
    color: '#6B7280',
  },
  reportList: {
    flex: 1,
  },
  reportListContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  reportItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  darkReportItem: {
    backgroundColor: '#1F2937',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reportLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reportInfo: {
    flex: 1,
  },
  reportDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  reportStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  reportRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  reportHours: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  productivityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  productivityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reportDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
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
    fontSize: 16,
    color: '#f24637',
    fontWeight: '500',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  filterSection: {
    marginBottom: 32,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  darkFilterOption: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
  },
  activeFilterOption: {
    backgroundColor: '#f24637',
    borderColor: '#f24637',
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeFilterOptionText: {
    color: '#FFFFFF',
  },
  recordItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  darkRecordItem: {
    backgroundColor: '#1F2937',
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  recordLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recordInfo: {
    flex: 1,
  },
  recordDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  recordStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  recordRight: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 12,
  },
  recordHours: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  moreButton: {
    padding: 4,
  },
  recordDetails: {
    gap: 12,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeColumn: {
    flexDirection: 'column',
    flex: 1,
    gap: 4,
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  timeValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#111827',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#6B7280',
  },
  notesRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  notesText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  scrollToTopButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#f24637',
    padding: 12,
    borderRadius: 30,
    elevation: 5,
    zIndex: 10,
  },
  recordsList: {
    flex: 1,
  },
  recordsListContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  clearSearchButton: {
    padding: 4,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
  },
  clearFiltersButton: {
    flex: 1,
    backgroundColor: '#ed3a3a',
    paddingVertical: 14,
    borderRadius: 8,
    marginRight: 10,
    alignItems: 'center',
  },
  clearFiltersText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#f24637',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  filtercloseButton: {
    padding: 4,
  },

});