// src/api/leaveapi.tsx
import axios from 'axios';
import URLS from '../app/auth/base_url'; // Adjust the path if needed
import AsyncStorage from '@react-native-async-storage/async-storage';

export const loginUser = async (email: string, password: string) => {
  try {
    const response = await axios.post(`${URLS.BASE_URL}/auth/login`, {
      username: email,
      password,
    });

    const user_id = response.data.data?.user_id;
    const token = response.data.data?.access_token;
    const user_name = response.data.data?.username;
    const login_time = response.data.data?.login_time;
    const emp_number = response.data.data?.emp_number;

    console.log('user', user_id);
    if (token && user_id !== undefined && user_name) {
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('User_id', user_id.toString());
      await AsyncStorage.setItem('username', user_name);
      await AsyncStorage.setItem('login_time', login_time);
      await AsyncStorage.setItem('emp_number', emp_number.toString());
      emp_number
    } else {
      console.warn('Login successful but token, user_id, or username missing');
    }
    return response.data;

  } catch (error: any) {
    console.error('Login error:', error?.response?.data || error.message);
    throw error?.response?.data || { message: 'Something went wrong' };
  }
};

export const verifyTokenWithAPI = async (): Promise<boolean> => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('Authentication token not found');

    const response = await axios.get(`${URLS.BASE_URL}/leave/duration-types`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return response.status === 200;
  } catch (error: any) {
    console.log('Token verification failed:', error.message || error);
    return false;
  }
};

/* Dashboard */

export const getOrganizationInfo = async () => {
  try {
    const token = await AsyncStorage.getItem('token');

    const response = await axios.get(`${URLS.BASE_URL}/admin/organization-general-info`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data?.data;
  } catch (error: any) {
    console.error('Error fetching organization info:', error?.response?.data || error.message);
    throw error?.response?.data || { message: 'Failed to fetch organization info' };
  }
};

/* Leave */

export const getLeaveTypes = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    const response = await axios.get(`${URLS.BASE_URL}/leave/leave-types`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.data; // Return the array of leave types
  } catch (error) {
    console.error('Failed to fetch leave types', error);
    throw error; // Throw error to handle it in the component
  }
};

export const getDurationTypes = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      throw new Error('No token found in AsyncStorage');
    }

    const response = await axios.get(`${URLS.BASE_URL}/leave/duration-types`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data; // includes: status, message, data
  } catch (error: any) {
    console.error('Failed to fetch duration types:', error?.response?.data || error.message);
    throw error?.response?.data || { message: 'Something went wrong' };
  }
};

export const getLeaveBalances = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    const userId = await AsyncStorage.getItem('User_id');

    if (!token || !userId) {
      throw new Error('Token or User ID not found in storage');
    }

    const response = await fetch(`${URLS.BASE_URL}/leave/leave-balance/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || 'Failed to fetch leave balances');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error fetching leave balances:', error.message || error);
    throw error;
  }
};


export const applyLeave = async (leavePayload: any) => {
  const token = await AsyncStorage.getItem('token');
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
  const response = await axios.post(
    `${URLS.BASE_URL}/leave/apply-leave`,
    leavePayload,
    config
  );
  return response.data;
};

export const getMyLeaves = async (token: string, empNumber: number, filters: any) => {
  try {
    const params: any = {
      empNumber, // Always included
    };

    // Add optional filters
    if (filters.fromDate) params.fromDate = filters.fromDate;
    if (filters.toDate) params.toDate = filters.toDate;
    if (filters.leaveTypeId && filters.leaveTypeId !== 0) params.leaveTypeId = filters.leaveTypeId;
    
    // Add pagination parameters
    if (filters.page) params.page = filters.page;
    if (filters.page_size) params.page_size = filters.page_size;
    
    if (filters.statuses && filters.statuses.length > 0) {
      params.statuses = `[${filters.statuses.join(',')}]`;
    }

    console.log('API Request params:', params); // Add this for debugging

    const response = await axios.get(`${URLS.BASE_URL}/leave/my-leave`, {
      params,
      headers: {
        Authorization: `Bearer ${token}`,
      }
    });

    console.log('API Response:', response.data); // Add this for debugging

    // Return the exact structure that matches your API response
    return {
      success: true,
      data: {
        data: response.data.data?.data || [],
        page: response.data.data?.page || 1,
        page_size: response.data.data?.page_size || 10,
        total: response.data.data?.total || 0,
        total_pages: response.data.data?.total_pages || 1
      }
    };
  } catch (error: any) {
    console.error('API Error:', error);

    if (error.response?.status === 500) {
      return {
        success: true,
        data: {
          data: [],
          page: 1,
          page_size: 10,
          total: 0,
          total_pages: 1
        }
      };
    }

    return {
      success: false,
      data: { data: [], page: 1, page_size: 10, total: 0, total_pages: 1 },
      error: error.message || 'Failed to fetch leaves'
    };
  }
};


export const getLeaveStatuses = async (token: string) => {
  try {
    const response = await axios.get(`${URLS.BASE_URL}/leave/leave-status`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.data; // this is the array of status objects
  } catch (error) {
    console.error('Error fetching leave statuses:', error);
    throw error;
  }
};

export const getLeaveList = async (fromDate: string, toDate: string, pageSize: number = 10) => {
  try {
    const token = await AsyncStorage.getItem('token');

    const response = await axios.get(
      `${URLS.BASE_URL}/leave/list`,
      {
        params: {
          fromDate,
          toDate,
          page_size: pageSize,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Leave list fetch error:', error?.response?.data || error.message);
    throw error?.response?.data || { message: 'Something went wrong while fetching leave list' };
  }
};

export const cancelLeave = async (leaveId: number) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('No token found');

    const response = await axios.put(
      `${URLS.BASE_URL}/leave/cancel/${leaveId}`,
      { action: 'cancel' },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Cancel leave error:', error?.response?.data || error.message);
    throw error?.response?.data || { message: 'Something went wrong' };
  }
};

/* Employee */

export const addEmployee = async (formData: FormData) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('Authentication token not found');

    const response = await fetch(`${URLS.BASE_URL}/pim/add-employees`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const contentType = response.headers.get('content-type');

    if (!response.ok) {
      const errorText = contentType?.includes('application/json')
        ? JSON.stringify(await response.json())
        : await response.text();
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }

    const responseData = contentType?.includes('application/json')
      ? await response.json()
      : await response.text();

    return responseData;
  } catch (error: any) {
    console.error('Add employee failed:', error.message || error);
    throw new Error(`Failed to add employee: ${error.message || 'Unknown error occurred'}`);
  }
};

export const fetchEmployeesApi = async (
  page = 1,
  pageSize = 100,
  filters: Record<string, string | number> = {}
) => {
  try {
    const token = await AsyncStorage.getItem('token');

    if (!token) {
      throw new Error('Authentication token not found');
    }

    const params = {
      page,
      page_size: pageSize,
      ...filters,
    };

    const response = await axios.get(`${URLS.BASE_URL}/pim/employees-list`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      params,
    });

    const responseData = response.data?.data;

    return {
      data: responseData?.data || [],              
      total_pages: responseData?.total_pages || 1, 
      employee_count: responseData?.employee_count || 0, 
    };
  } catch (error: any) {
    console.error('Error fetching employees list:', error?.response?.data || error.message);
    throw error?.response?.data || { message: 'Failed to fetch employees list' };
  }
};

export const fetchDepartmentOverviewApi = async () => {
  try {
    const token = await AsyncStorage.getItem('token');

    if (!token) {
      throw new Error('Authentication token not found');
    }

    const response = await axios.get(`${URLS.BASE_URL}/pim/department-overview`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data.data;
  } catch (error: any) {
    console.error('Error fetching department overview:', error?.response?.data || error.message);
    throw error?.response?.data || { message: 'Failed to fetch department overview' };
  }
};

export const fetchSubunits = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('Authentication token not found');

    const response = await axios.get(`${URLS.BASE_URL}/admin/subunits`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data.data;
  } catch (error) {
    console.error('Failed to fetch subunits:', error);
    throw error;
  }
};

export const fetchEmployeeShortlistApi = async (search: string) => {
  try {
    const token = await AsyncStorage.getItem('token');

    if (!token) {
      throw new Error('Authentication token not found');
    }

    const response = await fetch(`${URLS.BASE_URL}/admin/employees-short-list?search=${encodeURIComponent(search)}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch employee shortlist');
    }

    const json = await response.json();
    return json.data;
  } catch (error: any) {
    console.error('Error fetching employee shortlist:', error.message);
    throw new Error(error.message || 'An unexpected error occurred while fetching employee shortlist');
  }
};

export const fetchNationalities = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    const response = await axios.get(`${URLS.BASE_URL}/admin/nationalities`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.data; // This will be the array of nationalities
  } catch (error) {
    console.error('Error fetching nationalities:', error);
    return [];
  }
};

/* Attendence */

export const punchAttendance = async ({
  employee_id,
  time,
  note,
}: {
  employee_id: number;
  time: string;
  note: string;
}) => {
  const date = new Date().toISOString().split('T')[0];
  const token = await AsyncStorage.getItem('token');

  const payload = {
    employee_id,
    date,
    time,
    note,
    timezoneOffset: 5.5,
    timezoneName: 'Asia/Kolkata',
  };

  const response = await axios.post(
    `${URLS.BASE_URL}/time/attendance/punch`,
    payload, // 👉 send as second argument
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  console.log('punch responce', response.data)
  return response.data;
};


export const getAttendanceStatus = async (employeeId: number, token: string) => {
  try {
    const response = await fetch(
      `${URLS.BASE_URL}/time/attendance/status?employee_id=${employeeId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch attendance status');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('getAttendanceStatus error:', error);
    throw error;
  }
};

export const fetchEmployeeAttendanceRecords = async (
  employeeId: string | number,
  token: string,
  filters: {
    status?: string;
    date_range?: string;
    sort?: string;
    page?: number;
    per_page?: number;
    search?: string;
  } = {}
) => {
  try {
    const queryParams = new URLSearchParams({
      employee_id: String(employeeId),
      ...(filters.status && { status: filters.status }),
      ...(filters.date_range && { date_range: filters.date_range }),
      ...(filters.sort && { sort: filters.sort }),
      ...(filters.page && { page: String(filters.page) }),
      ...(filters.per_page && { per_page: String(filters.per_page) }),
      ...(filters.search && { search: filters.search }),
    });

    const url = `${URLS.BASE_URL}/time/employee-attendance-records?${queryParams.toString()}`;
    
    console.log('API URL:', url); // Debug log
    console.log('Filters:', filters); // Debug log

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP error! Status: ${response.status}, Response:`, errorText);
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const json = await response.json();
    console.log('API Response:', json); // Debug log

    // Handle different possible response structures
    let records = [];
    let summary = null;

    // Check for different possible response structures
    if (json?.data?.data) {
      // Structure: { data: { data: [...], summary: {...} } }
      records = json.data.data;
      summary = {
        date_start: json.data.date_start,
        date_end: json.data.date_end,
        present_days: json.data.present_days || 0,
        absent_days: json.data.absent_days || 0,
        average_hours_per_day: json.data.average_hours_per_day || 0,
        attendance_percent: json.data.attendance_percent || 0,
        half_days: json.data.half_days || 0,
        weeklyHours: json.data.weeklyHours || {}
      };
    } else if (json?.data && Array.isArray(json.data)) {
      // Structure: { data: [...] }
      records = json.data;
      summary = {
        date_start: json.date_start || null,
        date_end: json.date_end || null,
        present_days: json.present_days || 0,
        absent_days: json.absent_days || 0,
        average_hours_per_day: json.average_hours_per_day || 0,
        attendance_percent: json.attendance_percent || 0,
        half_days: json.half_days || 0,
        weeklyHours: json.weeklyHours || {}
      };
    } else if (Array.isArray(json)) {
      // Structure: [...]
      records = json;
      summary = null;
    } else if (json?.records) {
      // Structure: { records: [...], summary: {...} }
      records = json.records;
      summary = json.summary || null;
    } else {
      // Log the actual structure for debugging
      console.warn('Unexpected response structure:', json);
      
      // Try to find records in any nested structure
      const findRecords = (obj: any): any[] => {
        if (Array.isArray(obj)) return obj;
        if (typeof obj === 'object' && obj !== null) {
          for (const key in obj) {
            if (Array.isArray(obj[key])) return obj[key];
            if (typeof obj[key] === 'object') {
              const nested = findRecords(obj[key]);
              if (nested.length > 0) return nested;
            }
          }
        }
        return [];
      };
      
      records = findRecords(json);
      summary = null;
    }

    // Ensure records is always an array
    if (!Array.isArray(records)) {
      console.warn('Records is not an array:', records);
      records = [];
    }

    console.log('Parsed records:', records.length); // Debug log
    console.log('Parsed summary:', summary); // Debug log

    return {
      summary,
      records,
    };
  } catch (error) {
    console.error('Error fetching employee attendance records:', error);
    
    // Return empty data instead of throwing
    return { 
      summary: {
        date_start: null,
        date_end: null,
        present_days: 0,
        absent_days: 0,
        average_hours_per_day: 0,
        attendance_percent: 0,
        half_days: 0,
        weeklyHours: {}
      }, 
      records: [] 
    };
  }
};





/*TimeSheet */

export const fetchProjectsDropdown = async () => {
  const token = await AsyncStorage.getItem('token');
  try {
    const response = await axios.get(`${URLS.BASE_URL}/time/projects-dropdown`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.data;
  } catch (error: any) {
    console.error('Failed to fetch projects dropdown:', error?.response?.data || error.message);
    throw error?.response?.data || { message: 'Something went wrong while fetching projects' };
  }
};

export const fetchActivitiesDropdown = async (projectId: number) => {
  try {
    const token = await AsyncStorage.getItem('token'); // if authenticated API
    const response = await fetch(
      `${URLS.BASE_URL}/time/activities-dropdown?project_id=${projectId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      }
    );

    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.detail || 'Failed to fetch activities');
    }

    return json.data; // expected to be array of activities
  } catch (error) {
    console.error('fetchActivitiesDropdown error:', error);
    throw error;
  }
};


export const fetchTimesheet = async (
  from_date: string,
  to_date: string,
  employee_id: number,
  limit = 10,
  offset = 0
) => {
  try {
    const token = await AsyncStorage.getItem('token');

    const response = await axios.get(
      `${URLS.BASE_URL}/time/timesheet/full-list`,
      {
        params: {
          from_date,
          to_date,
          employee_id,
          limit,
          offset,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    console.log('Timesheet Data', response.data.data)
    return response.data.data;
  } catch (error: any) {
    console.error('Fetch Timesheet error:', error?.response?.data || error.message);
    throw error?.response?.data || { message: 'Failed to fetch timesheet' };
  }
};

export const saveTimesheetEntry = async (payload: any) => {
  const token = await AsyncStorage.getItem('token');

  const response = await fetch(`${URLS.BASE_URL}/time/timesheet`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const json = await response.json();
  console.log('final responce', json)
  if (!response.ok) {
    console.log('Backend error:', json); // Add this for debugging
    throw new Error(json.message || 'Failed to save timesheet');
  }

  return json;
};

export const deleteTimesheetEntry = async (timesheetItemId: number) => {
  try {
    const token = await AsyncStorage.getItem('token');

    const response = await axios.delete(
      `${URLS.BASE_URL}/time/delete_timesheet_item_by_id`,
      {
        params: {
          timesheet_item_id: timesheetItemId,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Delete Timesheet error:', error?.response?.data || error.message);
    throw error?.response?.data || { message: 'Failed to delete timesheet entry' };
  }
};

// Submit timesheet action log
export const submitTimesheet = async (timesheetId: number) => {
  try {
    const token = await AsyncStorage.getItem('token');

    const response = await axios.post(
      `${URLS.BASE_URL}/time/timesheet-action-log`,
      {
        action: 'SUBMITTED',
        timesheet_id: timesheetId,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Submit timesheet error:', error?.response?.data || error.message);
    throw error?.response?.data || { message: 'Something went wrong' };
  }
};

/* forgot password */

export const forgotPassword = async (email: string) => {
  try {
    const response = await axios.post(`${URLS.BASE_URL}/auth/forgot_password`, {
      email,
    });

    return response.data;
  } catch (error: any) {
    console.error('Forgot password error:', error?.response?.data || error.message);
    throw error?.response?.data || { message: 'Something went wrong' };
  }
};

export const verifyForgotPassOtp = async (email: string, otp: string) => {
  try {
    const response = await axios.post(`${URLS.BASE_URL}/auth/verify_forgot_pass_otp`, {
      email,
      otp: Number(otp),
    });

    const empNumber = response.data?.data?.emp_number;
    if (empNumber) {
      await AsyncStorage.setItem('emp_number', empNumber.toString());
    }

    return response.data;
  } catch (error: any) {
    console.error('OTP Verification error:', error?.response?.data || error.message);
    throw error?.response?.data || { message: 'Something went wrong' };
  }
};


export const resetPassword = async (emp_number: number, new_password: string) => {
  try {
    const response = await axios.post(`${URLS.BASE_URL}/auth/reset_password`, {
      emp_number,
      new_password,
    });

    return response.data;
  } catch (error: any) {
    console.error('Reset password error:', error?.response?.data || error.message);
    throw error?.response?.data || { message: 'Something went wrong' };
  }
};


/*Dashboard */
export const getPimStats = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    const response = await axios.get(`${URLS.BASE_URL}/pim/pim-stats`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.data;
  } catch (error: any) {
    console.error('Failed to fetch PIM stats:', error?.response?.data || error.message);
    throw error?.response?.data || { message: 'Something went wrong' };
  }
};


export const getTimesheetDashboard = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    const empNumber = await AsyncStorage.getItem('emp_number');
    const response = await axios.get(
      `${URLS.BASE_URL}/time/get_timesheet_dashboard?emp_id=${empNumber}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Error fetching timesheet dashboard:', error?.response?.data || error.message);
    throw error?.response?.data || { message: 'Something went wrong' };
  }
};


/*Attendence */
export const fetchWeeklyAttendance = async () => {
  try {
     const empNumber = await AsyncStorage.getItem('emp_number');
    const response = await axios.get(`${URLS.BASE_URL}/time/attendance/weekly/${empNumber}`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching weekly attendance:', error?.response?.data || error.message);
    throw error?.response?.data || { message: 'Something went wrong' };
  }
};

export const fetchMonthlyAttendance = async (
  monthStart: string,
  monthEnd: string
) => {
  try {
    const token = await AsyncStorage.getItem('token');
    const empNumber = await AsyncStorage.getItem('emp_number');
    const response = await axios.get(
      `${URLS.BASE_URL}/time/attendance/monthly/${empNumber}?month_start=${monthStart}&month_end=${monthEnd}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error('Attendance fetch error:', error?.response?.data || error.message);
    throw error?.response?.data || { message: 'Something went wrong' };
  }
};
/*Edit info */
export const fetchEmployeeBasicInfo = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    const response = await axios.get(`${URLS.BASE_URL}/pim/employee-basic-info`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data.data;
  } catch (error: any) {
    console.error('Fetch employee info error:', error?.response?.data || error.message);
    throw error?.response?.data || { message: 'Something went wrong' };
  }
}

export const updateEmployeeBasicInfo = async (formData: any) => {
  try {
    const token = await AsyncStorage.getItem('token');

    const data = new FormData();
    data.append('emp_firstname', formData.firstName);
    data.append('emp_middle_name', formData.middleName);
    data.append('emp_lastname', formData.lastName);
    data.append('emp_mobile', formData.phone);
    data.append('emp_work_email', formData.email);
    data.append('location_id', formData.location);

    if (formData.isPictureRemoved) {
      data.append('is_picture_removed', 'true');
    } else {
      data.append('is_picture_removed', 'false');
      if (formData.profile && formData.profile !== 'null' && typeof formData.profile !== 'string') {
        data.append('profile_picture', {
          uri: formData.profile.uri,
          type: formData.profile.type || 'image/jpeg',
          name: formData.profile.fileName || 'profile.jpg',
        });
      }
    }

    const response = await axios.put(`${URLS.BASE_URL}/pim/employee-basic-info`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error: any) {
    console.error('Update profile error:', error?.response?.data || error.message);
    throw error?.response?.data || { message: 'Something went wrong' };
  }
};

// src/api/leaveapi.tsx
export const fetchLocations = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    const response = await axios.get(`${URLS.BASE_URL}/leave/locations`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data.data;
  } catch (error: any) {
    console.error('Error fetching locations:', error?.response?.data || error.message);
    throw error?.response?.data || { message: 'Something went wrong while fetching locations' };
  }
};


export const getEmployeeDuration = async (empId: number, date: string, token?: string | null) => {
  try {
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    };

    const response = await axios.get(
      `${URLS.BASE_URL}/time/get_employee_duration?emp_id=${empId}&date=${date}`,
      config
    );

    console.log('Employee Duration API Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching employee duration:', error);
    throw error;
  }
};