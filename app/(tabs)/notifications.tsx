import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { markAsRead, markAllAsRead, removeNotification } from '@/store/slices/notificationSlice';
import { Bell, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, Info, X, Calendar, Users, FileText, Settings, CheckCheck } from 'lucide-react-native';
import Animated, {
  FadeInDown,
  FadeInRight,
  SlideOutRight,
} from 'react-native-reanimated';

export default function Notifications() {
  const dispatch = useDispatch();
  const { theme } = useSelector((state: RootState) => state.auth);
  const { notifications, unreadCount } = useSelector((state: RootState) => state.notification);

  const isDark = theme === 'dark';

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'error': return AlertTriangle;
      default: return Info;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success': return '#10B981';
      case 'warning': return '#F59E0B';
      case 'error': return '#EF4444';
      default: return '#3B82F6';
    }
  };

  const getNotificationActionIcon = (title: string) => {
    if (title.includes('Meeting')) return Calendar;
    if (title.includes('Team')) return Users;
    if (title.includes('Report') || title.includes('Review')) return FileText;
    return Settings;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return `${diffDays}d ago`;
    }
  };

  const handleMarkAsRead = (id: string) => {
    dispatch(markAsRead(id));
  };

  const handleMarkAllAsRead = () => {
    dispatch(markAllAsRead());
    Alert.alert('Success', 'All notifications marked as read');
  };

  const handleRemoveNotification = (id: string) => {
    dispatch(removeNotification(id));
  };

  const handleNotificationAction = (notification: any) => {
    if (notification.actionable) {
      Alert.alert(
        notification.actionText || 'Action',
        `This would handle: ${notification.title}`,
        [{ text: 'OK' }]
      );
    }
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
  };

  return (
    <View style={[{ flex: 1 }, isDark && styles.darkContainer]}>
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
        <LinearGradient
          colors={isDark ? ['#1F2937', '#374151'] : ['#F59E0B', '#D97706']}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Notifications</Text>
            <Text style={styles.headerSubtitle}>
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleMarkAllAsRead}
              disabled={unreadCount === 0}
            >
              <CheckCheck
                size={20}
                color={unreadCount > 0 ? '#FFFFFF' : 'rgba(255, 255, 255, 0.5)'}
              />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>
      <ScrollView style={[styles.container, isDark && styles.darkContainer]} showsVerticalScrollIndicator={false}>

        {/* Notification Stats */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.statsContainer}>
          <View style={[styles.statsCard, isDark && styles.darkCard]}>
            <View style={styles.statItem}>
              <Bell size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
              <Text style={[styles.statLabel, isDark && styles.darkSubText]}>Total</Text>
              <Text style={[styles.statValue, isDark && styles.darkText]}>{notifications.length}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <CheckCircle size={20} color="#10B981" />
              <Text style={[styles.statLabel, isDark && styles.darkSubText]}>Read</Text>
              <Text style={[styles.statValue, isDark && styles.darkText]}>
                {notifications.filter(n => n.read).length}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <AlertTriangle size={20} color="#F59E0B" />
              <Text style={[styles.statLabel, isDark && styles.darkSubText]}>Unread</Text>
              <Text style={[styles.statValue, isDark && styles.darkText]}>{unreadCount}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Notifications List */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.notificationsContainer}>
          <View style={[styles.notificationsCard, isDark && styles.darkCard]}>
            {notifications.length === 0 ? (
              <View style={styles.emptyState}>
                <Bell size={48} color={isDark ? '#4B5563' : '#D1D5DB'} />
                <Text style={[styles.emptyTitle, isDark && styles.darkText]}>No Notifications</Text>
                <Text style={[styles.emptySubtitle, isDark && styles.darkSubText]}>
                  You're all caught up! Check back later for updates.
                </Text>
              </View>
            ) : (
              notifications.map((notification, index) => {
                const NotificationIcon = getNotificationIcon(notification.type);
                const ActionIcon = getNotificationActionIcon(notification.title);
                const iconColor = getNotificationColor(notification.type);

                return (
                  <Animated.View
                    key={notification.id}
                    entering={FadeInRight.delay(400 + index * 100)}
                    exiting={SlideOutRight}
                    style={[
                      styles.notificationItem,
                      !notification.read && styles.unreadNotification,
                      isDark && !notification.read && styles.darkUnreadNotification,
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.notificationContent}
                      onPress={() => handleNotificationAction(notification)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.notificationLeft}>
                        <View style={[
                          styles.notificationIcon,
                          { backgroundColor: `${iconColor}20` }
                        ]}>
                          <NotificationIcon size={20} color={iconColor} />
                        </View>
                        <View style={styles.notificationInfo}>
                          <View style={styles.titleRow}>
                            <Text style={[
                              styles.notificationTitle,
                              isDark && styles.darkText,
                              !notification.read && styles.unreadTitle
                            ]}>
                              {notification.title}
                            </Text>
                            {!notification.read && <View style={styles.unreadDot} />}
                          </View>
                          <Text style={[
                            styles.notificationMessage,
                            isDark && styles.darkSubText
                          ]}>
                            {notification.message}
                          </Text>
                          <View style={styles.notificationMeta}>
                            <Text style={[
                              styles.notificationTime,
                              isDark && styles.darkSubText
                            ]}>
                              {formatTime(notification.timestamp)}
                            </Text>
                            {notification.actionable && (
                              <>
                                <View style={styles.metaDivider} />
                                <View style={styles.actionIndicator}>
                                  <ActionIcon size={12} color={isDark ? '#9CA3AF' : '#6B7280'} />
                                  <Text style={[
                                    styles.actionText,
                                    isDark && styles.darkSubText
                                  ]}>
                                    {notification.actionText}
                                  </Text>
                                </View>
                              </>
                            )}
                          </View>
                        </View>
                      </View>

                      <View style={styles.notificationActions}>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleRemoveNotification(notification.id)}
                        >
                          <X size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })
            )}
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View entering={FadeInDown.delay(500)} style={styles.quickActionsContainer}>
          <View style={[styles.quickActionsCard, isDark && styles.darkCard]}>
            <Text style={[styles.quickActionsTitle, isDark && styles.darkText]}>
              Notification Settings
            </Text>
            <View style={styles.actionsList}>
              <TouchableOpacity style={styles.settingItem}>
                <Bell size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                <Text style={[styles.settingText, isDark && styles.darkText]}>
                  Push Notifications
                </Text>
                <View style={styles.settingToggle}>
                  <View style={styles.toggleActive} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.settingItem}>
                <Calendar size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                <Text style={[styles.settingText, isDark && styles.darkText]}>
                  Meeting Reminders
                </Text>
                <View style={styles.settingToggle}>
                  <View style={styles.toggleActive} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.settingItem}>
                <FileText size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                <Text style={[styles.settingText, isDark && styles.darkText]}>
                  Leave Updates
                </Text>
                <View style={styles.settingToggle}>
                  <View style={styles.toggleActive} />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
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
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  darkCard: {
    backgroundColor: '#1F2937',
  },
  statItem: {
    alignItems: 'center',
    gap: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  darkSubText: {
    color: '#9CA3AF',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  darkText: {
    color: '#FFFFFF',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  notificationsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  notificationsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  notificationItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  unreadNotification: {
    backgroundColor: '#F0F9FF',
  },
  darkUnreadNotification: {
    backgroundColor: '#1E3A8A20',
  },
  notificationContent: {
    flexDirection: 'row',
    padding: 20,
  },
  notificationLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  notificationInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  metaDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 8,
  },
  actionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  notificationActions: {
    justifyContent: 'center',
    paddingLeft: 12,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 60,
    paddingBottom: 20
  },
  quickActionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 12
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  actionsList: {
    gap: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  settingToggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-end',
  },
});