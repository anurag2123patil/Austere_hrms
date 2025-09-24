import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface TimesheetEntry {
  id: string;
  date: string;
  project: string;
  activity: string;
  hours: number;
  comment: string;
}

interface TimesheetState {
  entries: TimesheetEntry[];
  loading: boolean;
}

const mockEntries: TimesheetEntry[] = [
  {
    id: '1',
    date: '2024-01-15',
    project: 'ASL Mobile App',
    activity: 'development',
    hours: 8,
    comment: 'Implemented user authentication and profile management features',
  },
  {
    id: '2',
    date: '2024-01-16',
    project: 'Client Portal',
    activity: 'bug-fixes',
    hours: 4,
    comment: 'Fixed login issues and improved error handling',
  },
  {
    id: '3',
    date: '2024-01-16',
    project: 'ASL Mobile App',
    activity: 'meeting',
    hours: 2,
    comment: 'Sprint planning and code review session',
  },
];

const initialState: TimesheetState = {
  entries: mockEntries,
  loading: false,
};

const timesheetSlice = createSlice({
  name: 'timesheet',
  initialState,
  reducers: {
    addTimesheetEntry: (state, action: PayloadAction<TimesheetEntry>) => {
      state.entries.push(action.payload);
    },
    updateTimesheetEntry: (state, action: PayloadAction<TimesheetEntry>) => {
      const index = state.entries.findIndex(entry => entry.id === action.payload.id);
      if (index !== -1) {
        state.entries[index] = action.payload;
      }
    },
    removeTimesheetEntry: (state, action: PayloadAction<string>) => {
      state.entries = state.entries.filter(entry => entry.id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    clearTimesheetEntries: (state) => {
      state.entries = [];
    },

  },
});

export const {
  addTimesheetEntry,
  updateTimesheetEntry,
  removeTimesheetEntry,
  setLoading,
  clearTimesheetEntries,
  
} = timesheetSlice.actions;
export default timesheetSlice.reducer;