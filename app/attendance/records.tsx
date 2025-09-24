import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { router } from 'expo-router';
import { ArrowLeft, Filter, Search, Calendar, Clock, CircleCheck as CheckCircle, Circle as XCircle, TriangleAlert as AlertTriangle, MapPin, Import as SortAsc, Dessert as SortDesc, ChevronDown, Eye, MoveVertical as MoreVertical, ArrowUp, X } from 'lucide-react-native';
import Animated, {
  FadeInDown,
  FadeInRight,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchEmployeeAttendanceRecords } from '../../api/Api';
const { width } = Dimensions.get('window');


interface TransformedAttendanceRecord {
  id: number;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  checkOutDate: string;
  totalHours: number;
  status: 'present' | 'late' | 'absent' | 'half-day';
}


export default function AttendanceRecordsScreen() {
  const { theme } = useSelector((state: RootState) => state.auth);
  const isDark = theme === 'dark';
  const [filteredRecords, setFilteredRecords] = useState<TransformedAttendanceRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'hours' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [records, setRecords] = useState<TransformedAttendanceRecord[]>([]);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<any>(null);

  const itemsPerPage = 10;
  const flatListRef = useRef<FlatList>(null);
  const [showScrollToTop, setShowScrollToTop] = useState(false);

  const transformRecordStatus = (record: any): TransformedAttendanceRecord => {
    const punchIn = record.punchIn || '';
    const punchOut = record.punchOut || '';

    const [punchInDate, punchInTime, punchInMeridiem] = punchIn ? punchIn.split(' ') : ['N/A', '', ''];
    const [punchOutDate, punchOutTime, punchOutMeridiem] = punchOut ? punchOut.split(' ') : ['N/A', '', ''];

    const standardStartTime = punchInDate !== 'N/A' ? new Date(`${punchInDate} 09:00:00`) : null;
    const punchInTimeObj = punchIn ? new Date(punchIn) : null;
    const punchOutTimeObj = punchOut ? new Date(punchOut) : null;

    // ---- Duration handling ----
    let durationInHours = 0;
    let durationDisplay = '00:00'; // default safe value
    if (record.duration && typeof record.duration === 'string') {
      const parts = record.duration.split(':').map(Number);

      if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
        const [h, m, s] = parts;
        durationInHours = h + m / 60 + s / 3600;
        durationDisplay = `${h}:${m.toString().padStart(2, '0')}`;
      }
    } else if (punchInTimeObj && punchOutTimeObj) {
      // Fallback: calculate from punchIn and punchOut
      durationInHours = (punchOutTimeObj.getTime() - punchInTimeObj.getTime()) / (1000 * 60 * 60);

      if (durationInHours > 0) {
        const hours = Math.floor(durationInHours);
        const minutes = Math.floor((durationInHours - hours) * 60);
        durationDisplay = `${hours}:${minutes.toString().padStart(2, '0')}`;
      }
    }
  

    let status: 'present' | 'late' | 'half-day' | 'absent' = 'absent';

    if (punchInTimeObj) {
      if (durationInHours >= 8) {
        status = punchInTimeObj > standardStartTime ? 'late' : 'present';
      } else if (durationInHours >= 4) {
        status = 'half-day';
      } else if (durationInHours <= 3) {
        status = 'absent';
      }
    }

    return {
      id: String(record.id),
      date: punchInDate,
      checkIn: punchIn ? `${punchInTime} ${punchInMeridiem}` : null,
      checkOut: punchOut ? `${punchOutTime} ${punchOutMeridiem}` : null,
      checkOutDate: punchOutDate,
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
      'half-day': 'half',  // This is the key fix!
      'present': 'present',
      'late': 'late',
      'absent': 'absent'
    };
    return mapping[uiStatus] || uiStatus;
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

        // Prepare filters object with proper mapping
        const filters = {
          page: pageToFetch,
          per_page: itemsPerPage,
          ...(searchQuery.trim() && { search: searchQuery.trim() }),
          ...(statusFilter !== 'all' && { status: mapStatusFilterToAPI(statusFilter) }), // Use mapped value
          ...(sortBy && { sort: `${sortBy}:${sortOrder}` }),
        };

        console.log('Loading data with filters:', filters); // Debug log

        const response = await fetchEmployeeAttendanceRecords(employeeId, token, filters);

        console.log('API Response received:', response); // Debug log

        if (response && response.records) {
          const formatted = response.records.map(transformRecordStatus);
          console.log('Formatted records:', formatted.length); // Debug log

          if (resetData || !isNextPage) {
            setRecords(formatted);
            setPage(1);
          } else {
            setRecords((prev) => [...prev, ...formatted]);
            setPage(pageToFetch);
          }

          setHasMore(formatted.length === itemsPerPage);
          setAttendanceSummary(response.summary);
        } else {
          console.warn('No records in response:', response);
          if (resetData || !isNextPage) {
            setRecords([]);
            setAttendanceSummary(null);
          }
        }
      } catch (err) {
        console.error("Error in loadData:", err);

        // Show user-friendly error message
        Alert.alert(
          'Error',
          'Failed to load attendance records. Please try again.',
          [{ text: 'OK' }]
        );

        if (resetData || !isNextPage) {
          setRecords([]);
          setAttendanceSummary(null);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, hasMore, page, searchQuery, statusFilter, sortBy, sortOrder]
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
  }, [statusFilter, sortBy, sortOrder]);

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    await loadData(false, true);
    setRefreshing(false);
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
  };

  // Apply local filtering only for display purposes
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

  const clearFilters = () => {
    setStatusFilter('all');
    setSortBy('date');
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

  const hasActiveFilters = () => {
    return  statusFilter !== 'all' || sortBy !== 'date' || sortOrder !== 'desc';
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

  const renderFooter = () => {
    if (!isLoading) return null;
    return (
      <View style={styles.loadingFooter}>
        <Text style={[styles.loadingText, isDark && styles.darkSubText]}>Loading more records...</Text>
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
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Attendance Records</Text>
            <TouchableOpacity style={styles.viewButton}>
              <Eye size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerSubtitle}>
            {filteredRecords.length} records found
          </Text>
        </LinearGradient>
      </Animated.View>

      {/* Search and Filters */}
      <Animated.View entering={FadeInDown.delay(200)} style={styles.controlsContainer}>
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

      {/* Records List */}
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
                {searchQuery ? `No records found for "${searchQuery}"` : 'No attendance records found'}
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

          <View style={styles.modalContent}>
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
                      statusFilter === status && styles.activeFilterOption, // 👈 last, takes priority
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
                {['date', 'hours', 'status'].map((sort) => (
                  <TouchableOpacity
                    key={sort}
                    style={[
                      styles.filterOption,
                      isDark && styles.darkFilterOption,
                      sortBy  === sort && styles.activeFilterOption, // 👈 last, takes priority
                    ]}
                    onPress={() => setSortBy(sort as any)}
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
          </View>

          {/* Bottom Buttons */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.clearFiltersButton}
              onPress={() => {
                clearFilters();
              }}
            >
              <Text style={styles.clearFiltersText}>Clear Filters</Text>
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
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    width: 50,
    height: 50,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  viewButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
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
  filterButtonContainer: {
    position: 'relative',
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
  darkText: {
    color: '#FFFFFF',
  },
  darkSubText: {
    color: '#9CA3AF',
  },
  recordsList: {
    flex: 1,
  },
  recordsListContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
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
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
    flexDirection: 'column', // Make labels and values stack vertically
    flex: 1,
    gap: 4, // small gap between label and value
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
  approvalRow: {
    alignItems: 'flex-end',
  },
  approvalText: {
    fontSize: 12,
    color: '#6B7280',
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
  }, modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
  },
  clearFiltersButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 8,
    marginRight: 10,
    alignItems: 'center',
  },
  clearFiltersText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
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