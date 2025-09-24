import { configureStore } from '@reduxjs/toolkit';
import employeeReducer from './slices/employeeSlice';
import attendanceReducer from './slices/attendanceSlice';
import leaveReducer from './slices/leaveSlice';
import notificationReducer from './slices/notificationSlice';
import authReducer from './slices/authSlice';
import timesheetReducer from './slices/timesheetSlice';

export const store = configureStore({
  reducer: {
    employee: employeeReducer,
    attendance: attendanceReducer,
    leave: leaveReducer,
    notification: notificationReducer,
    auth: authReducer,
    timesheet: timesheetReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;