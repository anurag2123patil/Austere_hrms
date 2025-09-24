import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface LeaveRequest {
  id: string;
  type: 'vacation' | 'sick' | 'personal' | 'maternity' | 'bereavement';
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedDate: string;
  approver?: string;
}

interface LeaveBalance {
  type: string;
  total: number;
  used: number;
  remaining: number;
}

interface LeaveState {
  requests: LeaveRequest[];
  balances: LeaveBalance[];
  loading: boolean;
}

const mockRequests: LeaveRequest[] = [
  {
    id: '1',
    type: 'vacation',
    startDate: '2024-02-15',
    endDate: '2024-02-19',
    days: 5,
    reason: 'Family vacation to Hawaii',
    status: 'approved',
    appliedDate: '2024-01-20',
    approver: 'Lisa Thompson',
  },
  {
    id: '2',
    type: 'sick',
    startDate: '2024-01-10',
    endDate: '2024-01-10',
    days: 1,
    reason: 'Flu symptoms',
    status: 'approved',
    appliedDate: '2024-01-10',
    approver: 'Lisa Thompson',
  },
  {
    id: '3',
    type: 'personal',
    startDate: '2024-03-05',
    endDate: '2024-03-05',
    days: 1,
    reason: 'Personal appointment',
    status: 'pending',
    appliedDate: '2024-01-15',
  },
];

const mockBalances: LeaveBalance[] = [
  { type: 'Vacation', total: 20, used: 5, remaining: 15 },
  { type: 'Sick', total: 10, used: 1, remaining: 9 },
  { type: 'Personal', total: 5, used: 0, remaining: 5 },
  { type: 'Maternity', total: 60, used: 0, remaining: 60 },
];

const initialState: LeaveState = {
  requests: mockRequests,
  balances: mockBalances,
  loading: false,
};

const leaveSlice = createSlice({
  name: 'leave',
  initialState,
  reducers: {
    addLeaveRequest: (state, action: PayloadAction<LeaveRequest>) => {
      state.requests.unshift(action.payload);
    },
    updateLeaveRequest: (state, action: PayloadAction<LeaveRequest>) => {
      const index = state.requests.findIndex(req => req.id === action.payload.id);
      if (index !== -1) {
        state.requests[index] = action.payload;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    updateBalances: (state, action: PayloadAction<LeaveBalance[]>) => {
      state.balances = action.payload;
    },
  },
});

export const {
  addLeaveRequest,
  updateLeaveRequest,
  setLoading,
  updateBalances,
} = leaveSlice.actions;
export default leaveSlice.reducer;