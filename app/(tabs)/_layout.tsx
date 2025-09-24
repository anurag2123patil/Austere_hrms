import { Tabs } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { Chrome as Home, Clock, Calendar, Users, Bell } from 'lucide-react-native';
import { Platform, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LayoutDashboard } from 'lucide-react-native'; 

import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import React from 'react';

function AnimatedTabBarIcon({ 
  focused, 
  icon: Icon, 
  size, 
  color 
}: { 
  focused: boolean; 
  icon: any; 
  size: number; 
  color: string; 
}) {
  const scale = useSharedValue(focused ? 1.1 : 1);
  const translateY = useSharedValue(focused ? -2 : 0);

  React.useEffect(() => {
    scale.value = withSpring(focused ? 1.1 : 1, {
      damping: 15,
      stiffness: 200,
    });
    translateY.value = withSpring(focused ? -2 : 0, {
      damping: 15,
      stiffness: 200,
    });
  }, [focused]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }));

  const backgroundStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scale.value, [1, 1.1], [0, 0.15]),
    transform: [{ scale: interpolate(scale.value, [1, 1.1], [0.8, 1]) }],
  }));

  return (
    <View style={{ 
      alignItems: 'center', 
      justifyContent: 'center', 
      position: 'relative',
      width: 50,
      height: 50,
    }}>
      {/* Subtle background indicator */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#f24637',
          },
          backgroundStyle,
        ]}
      />
      <Animated.View style={animatedIconStyle}>
        <Icon 
          size={size} 
          color={color} 
          strokeWidth={focused ? 2.5 : 2} 
        />
      </Animated.View>
    </View>
  );
}

export default function TabLayout() {
  const unreadCount = useSelector((state: RootState) => state.notification.unreadCount);
  const theme = useSelector((state: RootState) => state.auth.theme);
  
  const isDark = theme === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          // bottom: Platform.OS === 'ios' ? 34 : 0,
          left: 30,
          right: 30,
          height: 68,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          paddingBottom: 0,
          paddingTop: 0,
          paddingHorizontal:Platform.OS === 'ios' ? 15 : 0,
        },
        tabBarBackground: () => (
          <View style={{
            flex: 1,
            backgroundColor: isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            // borderRadius: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: isDark ? 0.4 : 0.15,
            shadowRadius: 16,
            elevation: 12,
            borderColor: isDark ? 'rgba(75, 85, 99, 0.2)' : 'rgba(0, 0, 0, 0.05)',
            overflow: 'hidden',
          }}>
            {Platform.OS === 'ios' && (
              <BlurView
                intensity={100}
                tint={isDark ? 'dark' : 'light'}
                style={{
                  flex: 1,
                  borderRadius: 20,
                }}
              />
            )}
          </View>
        ),
        tabBarActiveTintColor: '#f24637',
        tabBarInactiveTintColor: isDark ? '#9CA3AF' : '#6B7280',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
          marginBottom: Platform.OS === 'ios' ? 4 : 8,
        },
        tabBarItemStyle: {
          paddingTop: 8,
          paddingBottom: 4,
          borderRadius: 16,
          marginHorizontal: 2,
        },
        tabBarHideOnKeyboard: true,
      }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ focused, size, color }) => (
              <AnimatedTabBarIcon
                focused={focused}
                icon={LayoutDashboard} // <-- updated icon
                size={size}
                color={color}
              />
            ),
          }}
        />

      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Attendance',
          tabBarIcon: ({ focused, size, color }) => (
            <AnimatedTabBarIcon
              focused={focused}
              icon={Clock}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="leave"
        options={{
          title: 'Leave',
          tabBarIcon: ({ focused, size, color }) => (
            <AnimatedTabBarIcon
              focused={focused}
              icon={Calendar}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="employees"
        options={{
          title: 'Employees',
          tabBarIcon: ({ focused, size, color }) => (
            <AnimatedTabBarIcon
              focused={focused}
              icon={Users}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ focused, size, color }) => (
            <View style={{ position: 'relative' }}>
              <AnimatedTabBarIcon
                focused={focused}
                icon={Bell}
                size={size}
                color={color}
              />
              {unreadCount > 0 && (
                <Animated.View
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    backgroundColor: '#EF4444',
                    borderRadius: 10,
                    minWidth: 20,
                    height: 20,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 2,
                    borderColor: isDark ? '#1F2937' : '#FFFFFF',
                    shadowColor: '#EF4444',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 4,
                  }}
                >
                  <Animated.Text
                    style={{
                      color: '#FFFFFF',
                      fontSize: 10,
                      fontWeight: 'bold',
                    }}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Animated.Text>
                </Animated.View>
              )}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}