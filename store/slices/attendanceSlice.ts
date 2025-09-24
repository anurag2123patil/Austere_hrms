import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { punchAttendance, getAttendanceStatus, getEmployeeDuration } from '@/api/Api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AttendanceRecord {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  totalHours: number;
  status: 'present' | 'absent' | 'late' | 'half-day';
  location?: string;
  // Keep this for backward compatibility but use API data as primary source
  accumulatedSeconds?: number;
  totalDuration?: string; // New field from API (HH:mm:ss format)
  total_duration_web?: string;
}

interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  totalHours: number;
  averageHours: number;
}

interface AttendanceState {
  records: AttendanceRecord[];
  stats: AttendanceStats;
  isCheckedIn: boolean;
  todayRecord: AttendanceRecord | null;
  loading: boolean;
  punchState: string | null;
  punchData?: any;
}

const initialState: AttendanceState = {
  stats: {
    totalDays: 22,
    presentDays: 18,
    absentDays: 2,
    lateDays: 2,
    totalHours: 162,
    averageHours: 8.1,
  },
  isCheckedIn: false,
  todayRecord: {
    id: 'today',
    date: new Date().toISOString().split('T')[0],
    checkIn: null,
    checkOut: null,
    totalHours: 0,
    status: 'present',
    accumulatedSeconds: 0,
    totalDuration: '00:00:00',
    total_duration_web: '00:00:00',
  },
  loading: false,
  punchState: null,
  records: []
};

// Utility function → HH:mm:ss
const formatTime = (date: Date) => {
  return date.toTimeString().split(' ')[0]; // "HH:mm:ss"
};

// Helper function to convert HH:mm:ss to seconds
const durationToSeconds = (duration: string): number => {
  try {
    const [hours, minutes, seconds] = duration.split(':').map(Number);
    return (hours * 3600) + (minutes * 60) + seconds;
  } catch (error) {
    console.error('Error converting duration to seconds:', error);
    return 0;
  }
};

// New thunk to get employee duration
export const getEmployeeDurationThunk = createAsyncThunk(
  'attendance/getEmployeeDuration',
  async (date?: string, { rejectWithValue }) => {
    try {
      const employeeId = Number(await AsyncStorage.getItem('User_id'));
      const token = await AsyncStorage.getItem('token');
      const targetDate = date || new Date().toISOString().split('T')[0];

      const response = await getEmployeeDuration(employeeId, targetDate, token);
      
      return {
        totalDuration: response.data.total_duration,
        isPunchedIn: response.data.is_punched_in,
        lastPunchIn: response.data.last_punch_in,
        lastPunchOut: response.data.last_punch_out,
        total_duration_web: response.data.total_duration_web,
        date: targetDate,
      };
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to fetch employee duration');
    }
  }
);

export const punchInThunk = createAsyncThunk(
  'attendance/punchIn',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const userId = await AsyncStorage.getItem('User_id');
      if (!userId) throw new Error('User ID not found');

      const now = new Date();
      const time = formatTime(now);

      const result = await punchAttendance({
        employee_id: Number(userId),
        time,
        note: 'Arrived at work',
      });

      // After punch in, get updated duration
      setTimeout(() => {
        dispatch(getEmployeeDurationThunk());
      }, 1000); // Small delay to ensure backend is updated

      return {
        time,
        location: 'Office',
        punchData: result.data.data,
        punchState: result.data?.data?.state?.id ?? null,
      };
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Punch In failed');
    }
  }
);

export const punchOutThunk = createAsyncThunk(
  'attendance/punchOut',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const userId = await AsyncStorage.getItem('User_id');
      if (!userId) throw new Error('User ID not found');

      const now = new Date();
      const time = formatTime(now);

      const result = await punchAttendance({
        employee_id: Number(userId),
        time,
        note: 'Left work',
      });

      // After punch out, get updated duration
      setTimeout(() => {
        dispatch(getEmployeeDurationThunk());
      }, 1000); // Small delay to ensure backend is updated

      return {
        time,
        punchData: result.data.data,
        punchState: result.data?.data?.state?.id ?? null,
      };
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Punch Out failed');
    }
  }
);

export const getAttendanceStatusThunk = createAsyncThunk(
  'attendance/getStatus',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const employeeId = Number(await AsyncStorage.getItem('User_id'));
      const token = await AsyncStorage.getItem('token');

      const response = await getAttendanceStatus(employeeId, token);
      const status = response?.data?.state?.id;

      // Also fetch duration data
      dispatch(getEmployeeDurationThunk());

      return {
        isCheckedIn: status === 'PUNCHED IN',
        punchState: status ?? null,
        punchData: response.data,
        checkInTime: response.data?.checkInTime,
        location: response.data?.location,
      };
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to fetch punch status');
    }
  }
);

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    updateStats: (state, action: PayloadAction<AttendanceStats>) => {
      state.stats = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(punchInThunk.fulfilled, (state, action) => {
        state.isCheckedIn = true;
        const { time, location, punchData, punchState } = action.payload;
        
        if (state.todayRecord) {
          state.todayRecord.checkIn = time;
          state.todayRecord.location = location;
        }
        
        state.punchData = punchData;
        state.punchState = punchState;
      })
      .addCase(punchOutThunk.fulfilled, (state, action) => {
        state.isCheckedIn = false;
        const { time, punchData, punchState } = action.payload;
        
        if (state.todayRecord) {
          state.todayRecord.checkOut = time;
        }
        
        state.punchData = punchData;
        state.punchState = punchState;
      })
      .addCase(getAttendanceStatusThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(getAttendanceStatusThunk.fulfilled, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.isCheckedIn = action.payload.isCheckedIn;
        state.punchState = action.payload.punchState;
        state.punchData = action.payload.punchData;

        // Update today's record with status data
        if (state.todayRecord) {
          state.todayRecord = {
            ...state.todayRecord,
            checkIn: action.payload.checkInTime || state.todayRecord.checkIn,
            location: action.payload.location || state.todayRecord.location,
            checkOut: state.todayRecord.checkOut || null,
          };
        }
      })
      .addCase(getAttendanceStatusThunk.rejected, (state, action) => {
        state.loading = false;
        console.error('Punch status fetch error:', action.payload);
      })
      // New case for duration API
      .addCase(getEmployeeDurationThunk.fulfilled, (state, action) => {
        const { totalDuration, isPunchedIn, lastPunchIn, lastPunchOut, date, total_duration_web } = action.payload;

        if (state.todayRecord && state.todayRecord.date === date) {
          state.todayRecord.totalDuration = totalDuration;
          state.todayRecord.total_duration_web = total_duration_web; // ✅ set new field
          state.todayRecord.accumulatedSeconds = durationToSeconds(totalDuration);
          state.todayRecord.totalHours = Math.round((durationToSeconds(totalDuration) / 3600) * 100) / 100;

          state.isCheckedIn = isPunchedIn;

          if (lastPunchIn) {
            const punchInTime = new Date(lastPunchIn);
            state.todayRecord.checkIn = punchInTime.toTimeString().split(' ')[0];
          }

          if (lastPunchOut && !isPunchedIn) {
            const punchOutTime = new Date(lastPunchOut);
            state.todayRecord.checkOut = punchOutTime.toTimeString().split(' ')[0];
          } else if (isPunchedIn) {
            state.todayRecord.checkOut = null;
          }
        }
      })
      .addCase(getEmployeeDurationThunk.rejected, (state, action) => {
        console.error('Duration fetch error:', action.payload);
      });
  }
});

export const { setLoading, updateStats } = attendanceSlice.actions;
export default attendanceSlice.reducer;