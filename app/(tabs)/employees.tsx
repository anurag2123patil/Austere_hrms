// screens/Employees.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Dimensions, FlatList, ActivityIndicator, Alert, RefreshControl, } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { Search, Filter, Users, Mail, Phone, MapPin, Calendar, ChevronRight } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInRight, SlideInRight } from 'react-native-reanimated';
import AddEmployeeModal from '@/components/AddEmployeeModal';
import EmployeeDetailsModal from '@/components/EmployeeDetailsModal';
import { fetchSubunits } from '@/api/Api';
import { AppDispatch } from '@/store/store';
import { setSearchQuery, setSelectedDepartment, fetchEmployees, resetEmployees, fetchDepartmentOverview, Employee, fetchEmployeeShortlist, } from '@/store/slices/employeeSlice';
const { width } = Dimensions.get('window');


export default function Employees() {
  const dispatch = useDispatch<AppDispatch>();
  const { theme } = useSelector((state: RootState) => state.auth);
const {
  employees,
  searchQuery,
  selectedDepartment,
  loading,
  hasMore,
  employeeCount // ✅ add this
} = useSelector((state: RootState) => state.employee);


  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const { departmentOverview } = useSelector((state: RootState) => state.employee);
  const [subunits, setSubunits] = useState<{ id: number; name: string }[]>([{ id: 0, name: 'All Units' }]);
  const { employeeShortlist } = useSelector((state: RootState) => state.employee);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, string | number>>({});
  const [selectedSubunitId, setSelectedSubunitId] = useState<number>(0); // 0 means 'All Units'
  const [page, setPage] = useState(1); // Keep track of current page for infinite scroll

  useEffect(() => {
    const loadSubunits = async () => {
      try {
        const data = await fetchSubunits();
        const subunitList = data.map((unit: any) => ({
          id: unit.id,
          name: unit.name,
        }));
        setSubunits([{ id: 0, name: 'All Units' }, ...subunitList]);
      } catch (error) {
        console.error('Failed to load subunits:', error);
      }
    };
    loadSubunits();
  }, []);

  useEffect(() => {
    dispatch(fetchDepartmentOverview());
  }, []);

  useEffect(() => {
    dispatch(resetEmployees());
    dispatch(fetchEmployees({ page: 1 }));
    setPage(1);
  }, [searchQuery, selectedDepartment]);

  const isDark = theme === 'dark';

  const filteredEmployees = searchQuery.length > 0 && !showSuggestions
    ? employees.filter((employee) => {
      const matchesSearch =
        employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.role.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDepartment =
        selectedDepartment === '' ||
        selectedDepartment === 'All Departments' ||
        employee.department === selectedDepartment;

      const matchesSubunit =
        selectedSubunitId === 0 || employee.subunit === selectedSubunitId;
      return matchesSearch && matchesDepartment && matchesSubunit;
    })
    : employees;

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      dispatch(fetchEmployees({ page: nextPage, filters: activeFilters }));
      setPage(nextPage);
    }
  };

  const handleOpenDetails = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowDetailsModal(true);
  };

  const hasActiveFilter = selectedSubunitId !== 0;

  const renderEmployeeItem = ({ item }: any) => (
    <View style={[styles.employeesCard, isDark && styles.darkCard]}>
      <Animated.View
        key={item.id}
        entering={FadeInRight}
        style={styles.employeeItem}
      >

        <TouchableOpacity style={styles.employeeContent} onPress={() => handleOpenDetails(item)}>
          <View style={styles.employeeLeft}>
            <Image source={{ uri: item.avatar }} style={styles.employeeAvatar} />
            <View style={styles.employeeInfo}>
              <Text style={[styles.employeeName, isDark && styles.darkText]}>{item.firstname} {item.lastname} </Text>
              <Text style={[styles.metaText, isDark && styles.darkSubText]}>{item.role}</Text>
              <View style={styles.employeeMeta}>
                <View style={styles.metaItem}>
                  <MapPin size={12} color={isDark ? '#9CA3AF' : '#6B7280'} />
                  <Text style={[styles.metaText, isDark && styles.darkSubText]}>{item.location}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Mail size={12} color={isDark ? '#9CA3AF' : '#6B7280'} />
                  <Text style={[styles.metaText, isDark && styles.darkSubText]}>{item.email}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.employeeRight}>
            <View style={[styles.departmentBadge, isDark && styles.darkDepartmentBadge]}>
              <Text style={[styles.departmentText, isDark && styles.darkText]}>{item.department}</Text>
            </View>
            <View style={styles.employeeDetails}>
              <View style={styles.detailItem}>
                <Calendar size={12} color={isDark ? '#9CA3AF' : '#6B7280'} />
                <Text style={[styles.detailText, isDark && styles.darkSubText]}>
                  Joined:{item.joinDate}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Phone size={12} color={isDark ? '#9CA3AF' : '#6B7280'} />
                <Text style={[styles.detailText, isDark && styles.darkSubText]}>{item.phone}</Text>
              </View>
            </View>
            <ChevronRight size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );

  return (
    <>
      <View style={[{ flex: 1 }, isDark && styles.darkContainer]}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <LinearGradient
            colors={isDark ? ['#1F2937', '#374151'] : ['#10B981', '#059669']}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Employees</Text>
           <Text style={styles.headerSubtitle}>{employeeCount} team members</Text>

            </View>
            <View style={styles.headerStats}>
              <View style={styles.statItem}>
                <Users size={20} color="#FFFFFF" />
                <Text style={styles.statText}>{employees.length}</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
        {/* Suggestions Dropdown */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, isDark && styles.darkSearchBar]}>
            <Search size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />

            <TextInput
              style={[styles.searchInput, isDark && styles.darkText]}
              placeholder="Search employees..."
              placeholderTextColor={isDark ? '#9CA3AF' : '#9CA3AF'}
              value={searchQuery}
              onChangeText={async (text) => {
                dispatch(setSearchQuery(text));
                if (text.length > 0) {
                  setShowSuggestions(true);
                  dispatch(fetchEmployeeShortlist(text));
                } else {
                  setShowSuggestions(false);
                  dispatch(resetEmployees());
                  dispatch(fetchEmployees({ page: 1 }));
                }
              }}

            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  dispatch(setSearchQuery(''));
                  setShowSuggestions(false);
                }}
                style={{ paddingHorizontal: 6 }}
              >
                <Text style={{ color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 18 }}>×</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.filterButtonContainer}>
            <TouchableOpacity
              style={[styles.filterButton, isDark && styles.darkFilterButton]}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Filter size={20} color={isDark ? '#FFFFFF' : '#6B7280'} />
            </TouchableOpacity>

            {/* Red dot indicator */}
            {hasActiveFilter && (
              <View style={styles.filterIndicatorDot} />
            )}
          </View>
        </View>
        {showSuggestions && employeeShortlist.length > 0 && (
          <View style={[styles.suggestionsBox, isDark && styles.darkSuggestionsBox]}>
            <FlatList
              data={employeeShortlist}
              keyExtractor={(emp) => emp.emp_number.toString()}
              renderItem={({ item: emp }) => (
                <TouchableOpacity
                  key={emp.emp_number}
                  style={styles.suggestionItem}
                  onPress={() => {
                    dispatch(setSearchQuery(emp.name));
                    setShowSuggestions(false);
                    dispatch(resetEmployees());
                    dispatch(fetchEmployees({ page: 1, filters: { employee_id: emp.employee_id } }));
                  }}
                >
                  <Text style={[styles.suggestionText, isDark && styles.darkText]}>
                    {emp.name}
                  </Text>
                </TouchableOpacity>
              )}
              keyboardShouldPersistTaps="always"
              style={{ maxHeight: 200 }}
            />
          </View>
        )}
        {/* Search and Filter */}
        <FlatList
          data={filteredEmployees}
          keyExtractor={(item) => item.id}
          renderItem={renderEmployeeItem}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.2}
          ListHeaderComponent={
            <>
              {/* Filters */}
              {showFilters && (
                <Animated.View entering={SlideInRight} style={styles.filtersContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
                    {subunits.map((unit) => (
                      <TouchableOpacity
                        key={unit.id}
                        style={[
                          styles.filterChip,
                          isDark && styles.darkFilterChip,
                          selectedSubunitId === unit.id && styles.activeFilterChip,
                        ]}
                        onPress={() => {
                          setSelectedSubunitId(unit.id);
                          const filters = { subunit: unit.id };
                          setActiveFilters(filters);
                          dispatch(resetEmployees());
                          dispatch(fetchEmployees({ page: 1, filters }));

                        }}
                      >
                        <Text style={[
                          styles.filterText,
                          isDark && styles.darkText,
                          selectedSubunitId === unit.id && styles.activeFilterText,
                        ]}>
                          {unit.name}
                        </Text>
                      </TouchableOpacity>
                    ))}


                  </ScrollView>
                </Animated.View>
              )}

              {/* Department Overview */}
              <Animated.View entering={FadeInDown.delay(300)} style={styles.overviewContainer}>
                <View style={styles.overviewHeader}>
                  <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Department Overview</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setActiveFilters({});
                      dispatch(setSelectedDepartment(''));
                      dispatch(resetEmployees());
                      dispatch(fetchEmployees({ page: 1 }));

                    }}
                  >
                    <Text style={[styles.clearText, isDark && styles.darkSubText]}>Clear</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.overviewScroll}>
                  {departmentOverview.map((dept, index) => {
                    const isSelected = activeFilters?.job_category === dept.id;

                    return (
                      <TouchableOpacity
                        key={dept.id}
                        onPress={() => {
                          const filters = { job_category: dept.id };
                          setActiveFilters(filters);
                          dispatch(resetEmployees());
                          dispatch(fetchEmployees({ page: 1, filters }));

                        }}
                      >
                        <Animated.View
                          entering={SlideInRight.delay(400 + index * 100)}
                        >
                          {isSelected ? (
                            <LinearGradient
                              colors={isDark ? ['#10B981', '#059669'] : ['#10B981', '#059669']}
                              style={[styles.overviewCard, isDark && styles.darkCard]}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                            >
                              <Text style={[styles.deptCount, { color: '#fff' }]}>{dept.employee_count}</Text>
                              <Text style={[styles.deptName, { color: '#E5E7EB' }]}>{dept.name}</Text>
                            </LinearGradient>
                          ) : (
                            <View style={[styles.overviewCard, isDark && styles.darkCard]}>
                              <Text style={[styles.deptCount, isDark && styles.darkText]}>{dept.employee_count}</Text>
                              <Text style={[styles.deptName, isDark && styles.darkSubText]}>{dept.name}</Text>
                            </View>
                          )}
                        </Animated.View>
                      </TouchableOpacity>
                    );
                  })}

                </ScrollView>
              </Animated.View>
              {/* Employee List */}
              <Animated.View entering={FadeInDown.delay(500)} style={styles.employeesContainer}>
<Text style={[styles.sectionTitle, isDark && styles.darkText]}>
  Team Members ({employeeCount})
</Text>

              </Animated.View>
            </>
          }
          ListFooterComponent={
            <>
              {loading && page > 1 && (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color={isDark ? '#10B981' : '#059669'} />
                  <Text style={[styles.loadingMoreText, isDark && styles.darkText]}>
                    Loading more employees...
                  </Text>
                </View>
              )}
              {/* Add empty space if needed */}
              <View style={{ height: 50 }} />
            </>
          }
          refreshControl={
            <RefreshControl
              refreshing={loading && page === 1}
              onRefresh={() => {
                dispatch(resetEmployees());
                dispatch(fetchEmployees({ page: 1 }));

              }}
              colors={isDark ? ['#10B981'] : ['#059669']}
              tintColor={isDark ? '#10B981' : '#059669'}
            />
          }
        />
        <EmployeeDetailsModal
          visible={showDetailsModal}
          employee={selectedEmployee}
          onClose={() => setShowDetailsModal(false)}
          isDark={isDark}
        />

      </View>
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
  headerStats: {
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  statText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 10,
    position: 'relative',

  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
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
  darkText: {
    color: '#FFFFFF',
  },
  darkSubText: {
    color: '#9CA3AF',
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
  darkFilterButton: {
    backgroundColor: '#1F2937',
  },
  filtersContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filtersScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  darkFilterChip: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
  },
  activeFilterChip: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  darkActiveFilterChip: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  overviewContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  overviewScroll: {
    flexDirection: 'row',
  },
  overviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginRight: 16,
    alignItems: 'center',
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 10,
    marginTop: 5
  },
  darkCard: {
    backgroundColor: '#1F2937',
  },
  deptCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  deptName: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  employeesContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  employeesCard: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginHorizontal: 20,

  },
  employeeItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  employeeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  employeeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  employeeAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  employeeRole: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  employeeMeta: {
    gap: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  employeeRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  departmentBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  darkDepartmentBadge: {
    backgroundColor: '#374151',
  },
  departmentText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#3B82F6',
  },
  employeeDetails: {
    alignItems: 'flex-end',
    gap: 2,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
  },
  actionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  actionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  actionsList: {
    flexDirection: 'row',
    gap: 12,
  },
  actionItem: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 17,
    gap: 5,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  pageButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: '#D1D5DB',
  },
  pageButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  pageNumberText: {
    fontSize: 16,
    fontWeight: '600',
  },
  paginationWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 50,
    marginHorizontal: 20,
    gap: 8,
    bottom: 20
  },
  pageCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activePage: {
    backgroundColor: '#03b3ff',
  },
  activePageText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  disabledCircle: {
    opacity: 0.3,
  },
  pageText: {
    fontSize: 14,
    color: '#ccc',
  },
  ellipsis: {
    fontSize: 18,
    paddingHorizontal: 6,
  },
  arrowText: {
    fontSize: 16,
    color: '#ccc',
  },
  darkCircle: {
    borderColor: '#555',
  },

  searchWrapper: {
    position: 'relative',
    marginBottom: 16,

  },
  suggestionsBox: {
    position: 'relative',
    left: 20,
    right: 20,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
    maxHeight: 200,
    zIndex: 1000,
    width: '90%'
  },

  darkSuggestionsBox: {
    backgroundColor: '#1F2937',
  },

  suggestionItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },

  suggestionText: {
    fontSize: 16,
    color: '#111827',
  },



  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },

  scrollContent: {
    flex: 1,

  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 16,
  },

  clearText: {
    fontSize: 16,
    color: '#EF4444', // Red-500
    fontWeight: '500',
    paddingBottom: 15,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingMoreText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
  },
});