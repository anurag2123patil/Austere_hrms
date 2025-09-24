import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
    Image,
    Keyboard
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ShieldCheck, Clock, Building2 } from 'lucide-react-native';
import { router } from 'expo-router';
import Animated, {
    FadeInDown,
    FadeInUp,
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import { useLocalSearchParams } from 'expo-router';
import { forgotPassword, verifyForgotPassOtp } from '@/api/Api';

export default function OTPVerificationScreen() {
    const inputRef = useRef<TextInput>(null);
    const { email } = useLocalSearchParams();
    const [otp, setOtp] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const currentYear = new Date().getFullYear();
    const [timeLeft, setTimeLeft] = useState(60);
    const [isExpired, setIsExpired] = useState(false);
    const [empNumber, setEmpNumber] = useState<number | null>(null);
    const [isFocused, setIsFocused] = useState(false);

    const buttonScale = useSharedValue(1);

    useEffect(() => {
        // Auto focus on mount
        const timer = setTimeout(() => {
            inputRef.current?.focus();
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (timeLeft <= 0) {
            setIsExpired(true);
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft]);

    // Add keyboard event listeners for iOS
    useEffect(() => {
        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
            if (Platform.OS === 'ios') {
                setIsFocused(false);
            }
        });

        return () => {
            keyboardDidHideListener?.remove();
        };
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    };

    const handleOtpBoxPress = () => {
        if (Platform.OS === 'ios') {
            // For iOS, blur first then focus to ensure keyboard reopens
            inputRef.current?.blur();
            setTimeout(() => {
                inputRef.current?.focus();
                setIsFocused(true);
            }, 100);
        } else {
            inputRef.current?.focus();
            setIsFocused(true);
        }
    };

    const handleTextChange = (text: string) => {
        // Only allow numeric input
        const numericText = text.replace(/[^0-9]/g, '');
        setOtp(numericText);
    };

    const handleVerifyOTP = async () => {
        if (!email || typeof email !== 'string') {
            Alert.alert('Missing Email', 'Email not found. Please go back and try again.');
            return;
        }

        if (otp.length !== 6) {
            Alert.alert('Invalid OTP', 'Please enter a valid 6-digit code.');
            return;
        }

        // Dismiss keyboard before verification
        inputRef.current?.blur();
        setIsVerifying(true);
        buttonScale.value = withSpring(0.95);

        try {
            const response = await verifyForgotPassOtp(email, otp);

            buttonScale.value = withSpring(1);

            if (response.status === 'success') {
                const empNum = response.data?.emp_number;
                setEmpNumber(empNum);

                Alert.alert('Verified', response.message || 'OTP verified successfully!');

                router.replace({
                    pathname: '/auth/reset-password',
                    params: {
                        emp_number: empNum.toString(),
                    },
                });
            } else {
                Alert.alert('Error', response.message || 'OTP verification failed.');
                setOtp('');
                // Refocus after clearing
                setTimeout(() => handleOtpBoxPress(), 500);
            }
        } catch (error: any) {
            buttonScale.value = withSpring(1);
            Alert.alert('Error', error.message || 'OTP verification failed.');
            setOtp('');
            // Refocus after clearing
            setTimeout(() => handleOtpBoxPress(), 500);
        } finally {
            setIsVerifying(false);
        }
    };

    const handleResendOTP = async () => {
        if (!email || typeof email !== 'string') {
            Alert.alert('Missing Email', 'Email not found. Please go back and try again.');
            return;
        }

        try {
            const response = await forgotPassword(email);

            if (response.status === 'success') {
                Alert.alert('OTP Sent', response.message || 'A new OTP has been sent to your email.');
                setOtp('');
                setTimeLeft(60);
                setIsExpired(false);
                // Refocus after resend
                setTimeout(() => handleOtpBoxPress(), 500);
            } else {
                Alert.alert('Error', response.message || 'Failed to resend OTP.');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Something went wrong while resending OTP.');
        }
    };

    const buttonAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: buttonScale.value }],
    }));

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <LinearGradient colors={['#f64137', '#f24637']} style={styles.gradient}>
                <ScrollView 
                    contentContainerStyle={styles.scrollContent} 
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Back Button */}
                    <TouchableOpacity style={styles.backIcon} onPress={() => router.back()}>
                        <ArrowLeft size={24} color="#FFFFFF" />
                    </TouchableOpacity>

                    {/* Header */}
                    <Animated.View entering={FadeInDown.delay(200)} style={styles.header}>
                        <View style={styles.logoContainer}>
                            <Image
                                source={require('@/assets/images/Austerelogo.png')}
                                style={styles.logoImage}
                                resizeMode="contain" 
                            />
                        </View>
                        <Text style={styles.companyName}>Austere Systems</Text>
                        <Text style={styles.companySubtitle}>Limited</Text>
                    </Animated.View>

                    <Animated.View entering={FadeInUp.delay(400)} style={styles.formContainer}>
                        <View style={styles.formCard}>
                            <Text style={styles.formTitle}>OTP Verification</Text>
                            <Text style={styles.formSubtitle}>Enter the 6-digit code sent to your email</Text>
                            
                            <TouchableOpacity 
                                style={styles.otpBoxContainer} 
                                onPress={handleOtpBoxPress}
                                activeOpacity={1}
                            >
                                {[...Array(6)].map((_, index) => (
                                    <View 
                                        key={index} 
                                        style={[
                                            styles.otpBox, 
                                            (otp.length === index && isFocused) && styles.activeOtpBox,
                                            otp.length > index && styles.filledOtpBox
                                        ]}
                                    >
                                        <Text style={styles.otpBoxText}>{otp[index] || ''}</Text>
                                    </View>
                                ))}
                                <TextInput
                                    ref={inputRef}
                                    style={styles.hiddenInput}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                    value={otp}
                                    onChangeText={handleTextChange}
                                    onFocus={() => setIsFocused(true)}
                                    onBlur={() => setIsFocused(false)}
                                    returnKeyType="done"
                                    blurOnSubmit={false}
                                    caretHidden={true}
                                    contextMenuHidden={true}
                                    selectTextOnFocus={false}
                                />
                            </TouchableOpacity>

                            <Animated.View style={buttonAnimatedStyle}>
                                <TouchableOpacity
                                    style={[styles.verifyButton, isVerifying && styles.disabledButton]}
                                    onPress={handleVerifyOTP}
                                    disabled={isVerifying || otp.length !== 6}
                                >
                                    <LinearGradient
                                        colors={isVerifying ? ['#9CA3AF', '#6B7280'] : ['#f24637', '#DC2626']}
                                        style={styles.verifyGradient}
                                    >
                                        <Text style={styles.verifyText}>
                                            {isVerifying ? 'Verifying...' : 'Verify OTP'}
                                        </Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </Animated.View>

                            <View style={styles.timerContainer}>
                                <Clock size={16} color="#6B7280" />
                                <Text style={styles.timerText}>
                                    {isExpired ? 'Code expired' : `Code expires in ${formatTime(timeLeft)}`}
                                </Text>
                            </View>

                            <TouchableOpacity
                                onPress={handleResendOTP}
                                disabled={!isExpired}
                            >
                                <Text
                                    style={[
                                        styles.resendLink,
                                        { color: isExpired ? '#f24637' : '#9CA3AF' }
                                    ]}
                                >
                                    Didn't receive the code? Resend
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInUp.delay(600)} style={styles.footer}>
                        <Text style={styles.footerText}>© {currentYear} Austere Systems Limited</Text>
                        <Text style={styles.footerSubtext}>Secure • Reliable • Efficient</Text>
                    </Animated.View>
                </ScrollView>
            </LinearGradient>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gradient: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingVertical: 40,
    },
    header: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 30,
    },
    backIcon: {
        alignSelf: 'flex-start',
        marginBottom: 10,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    footer: {
        alignItems: 'center',
        marginTop: 10,
        bottom: 0
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
        marginTop: 16,
    },
    subtitle: {
        fontSize: 16,
        color: '#FFFFFF',
        textAlign: 'center',
        opacity: 0.9,
        marginTop: 4,
    },
    formCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
        marginBottom: 40,
    },
    formContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    otpBoxContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
        position: 'relative',
    },
    otpBox: {
        width: 48,
        height: 56,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#F9FAFB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeOtpBox: {
        borderColor: '#f24637',
        borderWidth: 2,
    },
    filledOtpBox: {
        borderColor: '#10B981',
        backgroundColor: '#ECFDF5',
    },
    otpBoxText: {
        fontSize: 20,
        color: '#111827',
        fontWeight: 'bold',
    },
    hiddenInput: {
        position: 'absolute',
        opacity: 0,
        width: '100%',
        height: '100%',
        color: 'transparent',
    },
    verifyButton: {
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#f24637',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
        marginBottom: 20,
    },
    disabledButton: {
        opacity: 0.7,
    },
    verifyGradient: {
        paddingVertical: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    verifyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    timerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        gap: 6,
    },
    timerText: {
        fontSize: 14,
        color: '#6B7280',
    },
    resendLink: {
        fontSize: 14,
        color: '#f24637',
        fontWeight: '500',
        textAlign: 'center',
    },
    footerText: {
        fontSize: 12,
        color: '#FFFFFF',
        opacity: 0.8,
    },
    footerSubtext: {
        fontSize: 10,
        color: '#FFFFFF',
        opacity: 0.6,
        marginTop: 4,
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    logoImage: {
        width: 80,
        height: 80,
    },
    companyName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    companySubtitle: {
        fontSize: 18,
        fontWeight: '300',
        color: '#FFFFFF',
        textAlign: 'center',
        marginTop: -5,
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
        lineHeight: 24,
    },
});