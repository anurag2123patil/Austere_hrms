import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Platform,
  ScrollView,
  Alert,
  Image,
  Keyboard,
  BackHandler
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {

  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  User,
} from 'lucide-react-native';
import { useDispatch } from 'react-redux';
import { login } from '@/store/slices/authSlice';
import { router, usePathname } from 'expo-router';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { loginUser } from '@/api/Api';
import BackgroundCurves from '@/components/BackgroundCurves';
export default function LoginScreen() {
  const dispatch = useDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const currentYear = new Date().getFullYear();
  const buttonScale = useSharedValue(1);
  const pathname = usePathname();

  
  useEffect(() => {
    const backAction = () => {
      if (pathname === '/auth/login') {
        BackHandler.exitApp();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [pathname]);
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Information', 'Please fill in all fields');
      return;
    }

    try {
      setIsLoading(true);
      buttonScale.value = withSpring(0.95);

      const data = await loginUser(email, password);

      if (data?.status === 'success') {
        buttonScale.value = withSpring(1);
        setIsLoading(false);
        router.replace('/(tabs)');
      } else {
        setIsLoading(false);
        Alert.alert('Login Failed', data?.message ?? 'Login failed, try again.');
      }
    } catch (error: any) {
      setIsLoading(false);
      buttonScale.value = withSpring(1);
      Alert.alert('Login Failed', error?.message ?? 'Something went wrong');
        // router.replace('/(tabs)');

    }
  };


  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        <BackgroundCurves />
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={true}
            scrollEnabled={true}
            style={{ flex: 1 }}
          >
            {/* Header */}
            <Animated.View entering={FadeInDown.delay(200)} style={styles.header}>
              <View style={styles.logoContainer}>
                <Image
                  source={require('@/assets/images/Austerelogo.png')}
                  style={styles.logoImage}
                  resizeMode="contain" 
                />
              </View>
              <View style={styles.companyheader}>
                <Text style={styles.companyName}>Austere</Text>
                <Text style={styles.companylast}>Systems</Text>
              </View>
              <Text style={styles.companySubtitle}>Limited</Text>
              <Text style={styles.welcomeText}>Welcome back to ASL HRMS</Text>
            </Animated.View>

            {/* Login Form */}
            <Animated.View entering={FadeInUp.delay(400)} style={styles.formContainer}>
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Sign In</Text>
                <Text style={styles.formSubtitle}>Access your workspace</Text>

                {/* Email */}
                <View style={styles.inputContainer}>
                  <View style={styles.inputWrapper}>
                    <User size={20} color="#f24637" />
                    <TextInput
                      style={styles.input}
                      placeholder="User Name"
                      placeholderTextColor="#9CA3AF"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false} 
                    />
                  </View>
                </View>

                {/* Password */}
                <View style={styles.inputContainer}>
                  <View style={styles.inputWrapper}>
                    <Lock size={20} color="#f24637" />
                    <TextInput
                      style={styles.input}
                      placeholder="Password"
                      placeholderTextColor="#9CA3AF"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false} 
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      {showPassword ? (
                        <EyeOff size={20} color="#9CA3AF" />
                      ) : (
                        <Eye size={20} color="#9CA3AF" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Forgot Password */}
                <TouchableOpacity
                  style={styles.forgotPassword}
                  onPress={() => router.push('/auth/forgot-password')}
                >
                  <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
                </TouchableOpacity>

                {/* Login Button */}
                <Animated.View style={buttonAnimatedStyle}>
                  <TouchableOpacity
                    style={[
                      styles.loginButton,
                      isLoading && styles.loginButtonDisabled,
                    ]}
                    onPress={handleLogin}
                    disabled={isLoading}
                  >
                    <LinearGradient
                      colors={isLoading ? ['#9CA3AF', '#6B7280'] : ['#f24637', '#DC2626']}
                      style={styles.loginGradient}
                    >
                      <Text style={styles.loginButtonText}>
                        {isLoading ? 'Signing In…' : 'Sign In'}
                      </Text>
                      {!isLoading && <ArrowRight size={20} color="#FFFFFF" />}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </Animated.View>

            {/* Footer */}
            <Animated.View entering={FadeInUp.delay(600)} style={styles.footer}>
              <Text style={styles.footerText}>© {currentYear} Austere Systems Limited</Text>
              <Text style={styles.footerSubtext}>Secure • Reliable • Efficient</Text>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    position: 'relative', 
  },
  scrollContainer: {
    flexGrow: 1,
    minHeight: '100%',
  },
  header: {
    flex: 0.9,
    justifyContent: 'center',
    paddingHorizontal: 20,
    alignItems: 'center',
    minHeight: 300, // Ensure minimum height for header
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    margin: 30
  },
  companyName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#E74C3C',
    textAlign: 'center',
  },
  companylast: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0B0C42',
    textAlign: 'center',
    paddingHorizontal: 10
  },
  companySubtitle: {
    fontSize: 18,
    fontWeight: '400',
    color: '#0B0C42',
    textAlign: 'center',
    marginTop: 2,
  },
  welcomeText: {
    fontSize: 16,
    color: '#4F4D4D',
    textAlign: 'center',
    marginTop: 10,
    opacity: 0.9,
  },
  formContainer: { 
    paddingHorizontal: 20, 
    justifyContent: 'center',
    paddingBottom: 30, // Add some bottom padding
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 30,
  },
  inputContainer: { 
    marginBottom: 15 
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  input: { 
    flex: 1, 
    fontSize: 16, 
    color: '#111827',
    paddingVertical: 12, // Add vertical padding for better touch area
  },
  forgotPassword: { 
    alignSelf: 'flex-end', 
    marginBottom: 30 
  },
  forgotPasswordText: { 
    fontSize: 14, 
    color: '#f24637', 
    fontWeight: '500' 
  },
  loginButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#f24637',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  loginButtonDisabled: { 
    opacity: 0.7 
  },
  loginGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: { 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingVertical: 30,
    minHeight: 10, 
   
  },
  footerText: { 
    fontSize: 12, 
    color: '#E74C3C', 
    opacity: 0.8 
  },
  footerSubtext: { 
    fontSize: 10, 
    color: '#020552', 
    opacity: 0.6, 
    marginTop: 4 
  },
  logoImage: {
    width: 80,
    height: 80,
  },
  companyheader: {
    display: 'flex',
    flexDirection: 'row'
  }
});