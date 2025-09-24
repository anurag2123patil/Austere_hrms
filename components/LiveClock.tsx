// components/LiveClock.tsx
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

interface Props {
  isDark: boolean;
  isCheckedIn: boolean;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  accumulatedSeconds?: number; // From API duration converted to seconds
  totalDuration?: string; // Direct from API in HH:mm:ss format
}

const LiveClock: React.FC<Props> = ({ 
  isDark, 
  isCheckedIn, 
  checkInTime, 
  checkOutTime, 
  accumulatedSeconds = 0,
  totalDuration = '00:00:00'
}) => {
  const [elapsedTime, setElapsedTime] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [currentDate] = useState(new Date());

  // Debug logging
  console.log('=== LIVE CLOCK DEBUG ===');
  console.log('isCheckedIn:', isCheckedIn);
  console.log('checkInTime:', checkInTime);
  console.log('checkOutTime:', checkOutTime);
  console.log('accumulatedSeconds:', accumulatedSeconds);
  console.log('totalDuration (from API):', totalDuration);
  console.log('========================');

  // Helper function to convert seconds to time object
  const secondsToTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return { hours: hrs, minutes: mins, seconds: secs };
  };

  // Helper function to parse HH:mm:ss string to time object
  const parseTimeString = (timeStr: string) => {
    try {
      const [hours, minutes, seconds] = timeStr.split(':').map(Number);
      return { hours: hours || 0, minutes: minutes || 0, seconds: seconds || 0 };
    } catch (error) {
      console.error('Error parsing time string:', timeStr, error);
      return { hours: 0, minutes: 0, seconds: 0 };
    }
  };

  // Helper function to convert HH:mm:ss to total seconds
  const timeStringToSeconds = (timeStr: string): number => {
    try {
      const [hours, minutes, seconds] = timeStr.split(':').map(Number);
      return (hours * 3600) + (minutes * 60) + seconds;
    } catch (error) {
      return 0;
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isCheckedIn && checkInTime) {
      console.log('Starting timer - User is checked in');
      console.log('Base duration from API:', totalDuration);

      // Get the base time from API (accumulated from all previous sessions)
      const baseTotalSeconds = timeStringToSeconds(totalDuration);
      console.log('Base total seconds from API:', baseTotalSeconds);

      timer = setInterval(() => {
        try {
          const now = new Date();
          let checkInDate = new Date();
          
          // Parse the current session's check-in time
          if (checkInTime.includes('T')) {
            checkInDate = new Date(checkInTime);
          } else if (checkInTime.includes(':')) {
            const today = new Date();
            const timeParts = checkInTime.split(':');
            const hours = parseInt(timeParts[0], 10);
            const minutes = parseInt(timeParts[1], 10);
            const seconds = timeParts[2] ? parseInt(timeParts[2], 10) : 0;

            checkInDate.setFullYear(today.getFullYear(), today.getMonth(), today.getDate());
            checkInDate.setHours(hours, minutes, seconds, 0);
          } else if (checkInTime.includes('.')) {
            const today = new Date();
            const timeParts = checkInTime.split('.');
            const hours = parseInt(timeParts[0], 10);
            const minutes = parseInt(timeParts[1], 10);

            checkInDate.setFullYear(today.getFullYear(), today.getMonth(), today.getDate());
            checkInDate.setHours(hours, minutes, 0, 0);
          }

          // Calculate current session elapsed time
          const diffMs = now.getTime() - checkInDate.getTime();
          
          if (diffMs >= 0) {
            const currentSessionSeconds = Math.floor(diffMs / 1000);
            
            // Add current session time to the base total from API
            const totalCurrentSeconds = baseTotalSeconds + currentSessionSeconds;
            
            console.log('Current session seconds:', currentSessionSeconds);
            console.log('Total display seconds:', totalCurrentSeconds);
            
            const timeObj = secondsToTime(totalCurrentSeconds);
            setElapsedTime(timeObj);
          } else {
            // Fallback to API time if calculation fails
            setElapsedTime(parseTimeString(totalDuration));
          }
        } catch (error) {
          console.error('Error calculating elapsed time:', error);
          // Fallback to API duration
          setElapsedTime(parseTimeString(totalDuration));
        }
      }, 1000);

    } else {
      console.log('Not checked in - showing total duration from API');
      // User is not checked in, show the total duration from API
      setElapsedTime(parseTimeString(totalDuration));
    }

    return () => {
      if (timer) {
        console.log('Clearing timer');
        clearInterval(timer);
      }
    };
  }, [isCheckedIn, checkInTime, checkOutTime, totalDuration, accumulatedSeconds]);

  const formatTime = (time: number): string => {
    return time.toString().padStart(2, '0');
  };

  return (
    <View style={{ alignItems: 'center', marginBottom: 15 }}>
      <Text style={[{ fontSize: 34, fontWeight: 'bold' }, isDark && { color: '#fff' }]}>
        {formatTime(elapsedTime.hours)}:{formatTime(elapsedTime.minutes)}:{formatTime(elapsedTime.seconds)}
      </Text>
      <Text style={[{ fontSize: 15 }, isDark && { color: '#ccc' }]}>
        {isCheckedIn ? 'Work Session Active' : 'Ready to Start'}
      </Text>
      <Text style={[{ fontSize: 12, marginTop: 4 }, isDark && { color: '#999' }]}>
        {currentDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </Text>

    </View>
  );
};

export default React.memo(LiveClock);