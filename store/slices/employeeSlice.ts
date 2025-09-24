// store/slices/employeeSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { fetchEmployeesApi, fetchDepartmentOverviewApi, fetchEmployeeShortlistApi, } from '../../api/Api';


export interface Employee {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  department: string;
  employeeId: string;
  joinDate: string;
  status: 'active' | 'inactive';
  phone: string;
  location: string;
  emp_number?: number;
  emp_firstname?: string;
  emp_lastname?: string;
  emp_middle_name?: string;
  emp_nick_name?: string;
  emp_smoker?: number;
  ethnic_race_code?: string | null;
  emp_birthday?: string | null;
  nation_code?: string | null;
  emp_gender?: string | null;
  emp_marital_status?: string | null;
  emp_ssn_num?: string | null;
  emp_sin_num?: string | null;
  emp_other_id?: string | null;
  emp_dri_lice_num?: string | null;
  emp_dri_lice_exp_date?: string | null;
  emp_military_service?: string | null;
  emp_status?: string | null;
  job_title_code?: string | null;
  eeo_cat_code?: string | null;
  work_station?: string | null;
  emp_street1?: string;
  emp_street2?: string;
  city_code?: string | null;
  coun_code?: string | null;
  provin_code?: string | null;
  emp_zipcode?: string | null;
  emp_hm_telephone?: string | null;
  emp_mobile?: string | null;
  emp_work_telephone?: string | null;
  emp_work_email?: string | null;
  sal_grd_code?: string | null;
  emp_oth_email?: string | null;
  termination_id?: string | null;
  custom1?: string | null;
  custom2?: string | null;
  custom3?: string | null;
  custom4?: string | null;
  custom5?: string | null;
  custom6?: string | null;
  custom7?: string | null;
  custom8?: string | null;
  custom9?: string | null;
  custom10?: string | null;
  employment_status?: any;
  job_title?: any;
  job_category?: any;
  subunit?: any;
  subunitId?: string | null;
  supervisor?: any;
}

interface EmployeeState {
  employees: Employee[];
  searchQuery: string;
  selectedDepartment: string;
  loading: boolean;
  page: number;
  hasMore: boolean;
  totalPages: number;
  employeeCount: number;
  departmentOverview: {
    id: number;
    name: string;
    employee_count: number;
  }[];
  employeeShortlist: {
    emp_number: number;
    employee_id: string;
    emp_firstname: string;
    emp_middle_name: string;
    emp_lastname: string;
    name: string;
  }[],
}

const initialState: EmployeeState = {
  employees: [],
  searchQuery: '',
  selectedDepartment: '',
  loading: false,
  page: 1,
  hasMore: true,
  totalPages: 1,
  employeeCount: 0,
  departmentOverview: [],
  employeeShortlist: [],
};

export const fetchDepartmentOverview = createAsyncThunk(
  'employee/fetchDepartmentOverview',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetchDepartmentOverviewApi();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch department overview');
    }
  }
);
export const fetchEmployees = createAsyncThunk(
  'employee/fetchEmployees',
  async (
    { page, filters }: { page: number; filters?: Record<string, string | number> },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetchEmployeesApi(page, 10, filters || {});
      const rawEmployees = response.data; // ✅ now this is an array
      const employeeCount = response.employee_count; // ✅ available now
      const totalPages = response.total_pages;

      const employees = rawEmployees.map((emp: any) => ({
        ...emp,
        id: emp.emp_number?.toString() || 'N/A',
        name: [emp.emp_firstname, emp.emp_middle_name, emp.emp_lastname].filter(Boolean).join(' ').trim(),
        firstname: emp.emp_firstname || 'N/A',
        lastname: emp.emp_lastname || 'N/A',
        email: emp.emp_work_email || 'N/A',
        avatar: `https://ui-avatars.com/api/?name=${emp.emp_firstname || 'N/A'}+${emp.emp_lastname || 'N/A'}`,
        role: typeof emp.job_title === 'string' ? emp.job_title : (emp.job_title?.job_title || 'N/A'),
        subunit: typeof emp.subunit === 'string' ? emp.subunit : emp.subunit?.name || 'N/A',
        subunitId: typeof emp.subunit === 'object' ? emp.subunit?.id : null,
        department: typeof emp.job_category === 'string' ? emp.job_category : emp.job_category?.name || 'N/A',
        employeeId: emp.employee_id || 'N/A',
        joinDate: emp.joined_date || 'N/A',
        status: 'active',
        phone: emp.emp_mobile || emp.emp_work_telephone || 'N/A',
        location: emp.city_code || 'N/A',
      }));

      return { employees, totalPages, employeeCount };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Unknown error');
    }
  }
);

export const fetchEmployeeShortlist = createAsyncThunk(
  'employee/fetchEmployeeShortlist',
  async (search: string, { rejectWithValue }) => {
    try {
      const data = await fetchEmployeeShortlistApi(search);
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Shortlist fetch failed');
    }
  }
);

const employeeSlice = createSlice({
  name: 'employee',
  initialState,
  reducers: {
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setSelectedDepartment: (state, action: PayloadAction<string>) => {
      state.selectedDepartment = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    resetEmployees: (state) => {
      state.employees = [];
      state.page = 1;
      state.hasMore = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmployees.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.loading = false;
        const { employees, totalPages, employeeCount } = action.payload;

        // ✅ Merge employees without duplicates
        const uniqueMap = new Map(state.employees.map(emp => [emp.id, emp]));
        for (const emp of employees) {
          if (!uniqueMap.has(emp.id)) {
            uniqueMap.set(emp.id, emp);
          }
        }

        state.employees = Array.from(uniqueMap.values());
        state.page += 1;
        state.totalPages = totalPages;
        state.hasMore = employees.length > 0;
        state.employeeCount = employeeCount; // ✅ set count
      })
      .addCase(fetchDepartmentOverview.fulfilled, (state, action) => {
        state.departmentOverview = action.payload.map((dept: any) => ({
          id: dept.id,
          name: dept.name,
          employee_count: dept.employee_count,
        }));
      })
      .addCase(fetchEmployeeShortlist.fulfilled, (state, action) => {
        state.employeeShortlist = action.payload;
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.loading = false;
        console.error('Fetch failed:', action.payload);
      });
  },
});

export const {
  setSearchQuery,
  setSelectedDepartment,
  setLoading,
  resetEmployees,
} = employeeSlice.actions;

export default employeeSlice.reducer;
