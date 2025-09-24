import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Image, } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Building2, Clock, Users } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { useDispatch } from 'react-redux';
import { finishLoading } from '@/store/slices/authSlice';
import { Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const dispatch = useDispatch();
  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);
  const iconScale = useSharedValue(0);
  const progressWidth = useSharedValue(0);
  const currentYear = new Date().getFullYear();
  const finishSplash = () => {
    dispatch(finishLoading());
  };

  useEffect(() => {
    // Logo animation
    logoScale.value = withSpring(1, { damping: 15, stiffness: 150 });
    logoOpacity.value = withSpring(1);

    // Title animation
    titleOpacity.value = withDelay(500, withSpring(1));

    // Subtitle animation
    subtitleOpacity.value = withDelay(800, withSpring(1));

    // Icons animation
    iconScale.value = withDelay(1000, withSpring(1, { damping: 12 }));

    // Progress bar animation
    progressWidth.value = withDelay(1200,
      withSequence(
        withSpring(100, { duration: 2000 }),
        withSpring(100, { duration: 500 }, () => {
          runOnJS(finishSplash)();
        })
      )
    );
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  const subtitleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <LinearGradient
        colors={['#FC4B05', '#ed3a3a']}
        style={styles.container}
      >
        <View style={styles.content}>
          {/* Logo */}
          <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
            <View style={styles.logoCircle}>
              <Image
                source={require('../assets/images/Austerelogo.png')}
                style={styles.logoImage}
                resizeMode="contain" />
            </View>
          </Animated.View>

          {/* Company Name */}
          <Animated.View style={titleAnimatedStyle}>
            <Text style={styles.companyName}>Austere Systems</Text>
            <Text style={styles.companyNameSub}>Limited</Text>
          </Animated.View>

          {/* Tagline */}
          <Animated.View style={subtitleAnimatedStyle}>
            <Text style={styles.tagline}>Human Resource Management System</Text>
          </Animated.View>

          {/* Feature Icons */}
          <Animated.View style={[styles.featuresContainer, iconAnimatedStyle]}>
            <View style={styles.featureItem}>
              <Clock size={24} color="#FFFFFF" />
              <Text style={styles.featureText}>Attendance</Text>
            </View>
            <View style={styles.featureItem}>
              <Users size={24} color="#FFFFFF" />
              <Text style={styles.featureText}>Team</Text>
            </View>
            <View style={styles.featureItem}>
              <Building2 size={24} color="#FFFFFF" />
              <Text style={styles.featureText}>Management</Text>
            </View>
          </Animated.View>

          {/* Loading Progress */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBackground}>
              <Animated.View style={[styles.progressFill, progressAnimatedStyle]} />
            </View>
            <Text style={styles.loadingText}>Loading your workspace...</Text>
          </View>
        </View>

        {/* Bottom Branding */}
        <View style={styles.bottomContainer}>
          <Text style={styles.versionText}>ASL HRMS v1.0.2</Text>
          <Text style={styles.copyrightText}>© {currentYear} Austere Systems Limited</Text>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    marginBottom: 40,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  companyName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 1,
  },
  companyNameSub: {
    fontSize: 24,
    fontWeight: '300',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: -5,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 20,
    opacity: 0.9,
    fontWeight: '500',
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 60,
    marginBottom: 80,
  },
  featureItem: {
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 50 : 24,
  },
  progressBackground: {
    width: '80%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  loadingText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 16,
    opacity: 0.8,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 20 : 40,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.7,
  },
  copyrightText: {
    fontSize: 10,
    color: '#FFFFFF',
    opacity: 0.6,
    marginTop: 4,
  },
  logoImage: {
    width: 80,
    height: 80,
  },
});