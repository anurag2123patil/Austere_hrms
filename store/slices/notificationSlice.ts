import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
  actionable?: boolean;
  actionText?: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Leave Request Approved',
    message: 'Your vacation leave from Feb 15-19 has been approved.',
    type: 'success',
    timestamp: '2024-01-20T10:30:00Z',
    read: false,
  },
  {
    id: '2',
    title: 'Team Meeting Reminder',
    message: 'Weekly team sync meeting in 30 minutes.',
    type: 'info',
    timestamp: '2024-01-15T14:30:00Z',
    read: false,
    actionable: true,
    actionText: 'Join Meeting',
  },
  {
    id: '3',
    title: 'Expense Report Due',
    message: 'Please submit your December expense report by EOD.',
    type: 'warning',
    timestamp: '2024-01-14T09:00:00Z',
    read: true,
    actionable: true,
    actionText: 'Submit Report',
  },
  {
    id: '4',
    title: 'Performance Review',
    message: 'Your Q4 performance review is ready for review.',
    type: 'info',
    timestamp: '2024-01-12T16:45:00Z',
    read: true,
    actionable: true,
    actionText: 'View Review',
  },
  {
    id: '5',
    title: 'System Maintenance',
    message: 'HRMS will be under maintenance tonight from 11 PM to 1 AM.',
    type: 'warning',
    timestamp: '2024-01-10T08:00:00Z',
    read: true,
  },
];

const initialState: NotificationState = {
  notifications: mockNotifications,
  unreadCount: mockNotifications.filter(n => !n.read).length,
};

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<Notification>) => {
      state.notifications.unshift(action.payload);
      if (!action.payload.read) {
        state.unreadCount += 1;
      }
    },
    markAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification && !notification.read) {
        notification.read = true;
        state.unreadCount -= 1;
      }
    },
    markAllAsRead: (state) => {
      state.notifications.forEach(n => n.read = true);
      state.unreadCount = 0;
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      const index = state.notifications.findIndex(n => n.id === action.payload);
      if (index !== -1) {
        const notification = state.notifications[index];
        if (!notification.read) {
          state.unreadCount -= 1;
        }
        state.notifications.splice(index, 1);
      }
    },
  },
});

export const {
  addNotification,
  markAsRead,
  markAllAsRead,
  removeNotification,
} = notificationSlice.actions;
export default notificationSlice.reducer;