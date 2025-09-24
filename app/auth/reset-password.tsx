import React, { useState } from 'react';
import { useAlert } from '@/hooks/useAlert';
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
    Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock, ArrowLeft, ShieldCheck, Building2, Eye, EyeOff } from 'lucide-react-native';
import { router } from 'expo-router';
import Animated, {
    FadeInDown,
    FadeInUp,
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import { useLocalSearchParams } from 'expo-router';
import { resetPassword } from '@/api/Api';
export default function ResetPasswordScreen() {
    const { showAlert, AlertComponent } = useAlert();

    const { emp_number } = useLocalSearchParams();
    console.log('Emp Number:', emp_number);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const currentYear = new Date().getFullYear();
    const buttonScale = useSharedValue(1);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);


    const handleReset = async () => {
        if (!password || !confirmPassword) {
            showAlert('Missing Fields', 'Please enter and confirm your new password.','info');
            return;
        }

        // Strong password validation
        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

        if (!strongPasswordRegex.test(password)) {
            showAlert(
                'Weak Password',
                'Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
                'warning'
            );
            return;
        }

        if (password !== confirmPassword) {
            showAlert('Password Mismatch', 'Both passwords must match.','error');
            return;
        }

        try {
            setIsSubmitting(true);
            buttonScale.value = withSpring(0.95);

            const response = await resetPassword(Number(emp_number), password);
            console.log('Reset Response:', response);

            if (response.status === 'success') {
                showAlert('Success', 'Your password has been reset successfully.','success');
                router.replace('/auth/login');
            } else {
                // Handle specific backend message for old == new password
                if (response.message === 'Old password cannot be new password') {
                    showAlert('Invalid Password', 'Your new password must be different from the previous one.','error');
                } else {
                    showAlert('Error', response.message || 'Password reset failed.','error');
                }
            }
        } catch (error: any) {
            showAlert('Error', error?.message || 'Something went wrong.','error');
        } finally {
            buttonScale.value = withSpring(1);
            setIsSubmitting(false);
        }

    };



    const buttonAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: buttonScale.value }],
    }));

    return (
        <KeyboardAvoidingView
            style={styles.container}
        >
            <LinearGradient colors={['#f64137', '#f24637']} style={styles.gradient}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <TouchableOpacity style={styles.backIcon} onPress={() => router.back()}>
                        <ArrowLeft size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    {/* Header */}
                    <Animated.View entering={FadeInDown.delay(200)} style={styles.header}>

                        <View style={styles.logoContainer}>
                            <Image
                                source={require('@/assets/images/Austerelogo.png')}
                                style={styles.logoImage}
                                resizeMode="contain" />
                        </View>
                        <Text style={styles.companyName}>Austere Systems</Text>
                        <Text style={styles.companySubtitle}>Limited</Text>
                    </Animated.View>

                    <Animated.View entering={FadeInUp.delay(400)} style={styles.formContainer}>
                        <View style={styles.formCard}>
                            <Text style={styles.formTitle}>Reset Your Password</Text>
                            <Text style={styles.formSubtitle}>Create a strong, secure password</Text>

                            {/* Password */}
                            <View style={styles.inputWrapper}>
                                <Lock size={20} color="#f24637" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="New Password"
                                    placeholderTextColor="#9CA3AF"
                                    secureTextEntry={!showPassword}
                                    value={password}
                                    onChangeText={setPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    {showPassword ? (
                                        <EyeOff size={20} color="#6B7280" />
                                    ) : (
                                        <Eye size={20} color="#6B7280" />
                                    )}
                                </TouchableOpacity>
                            </View>


                            {/* Confirm Password */}
                            <View style={styles.inputWrapper}>
                                <Lock size={20} color="#f24637" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Confirm Password"
                                    placeholderTextColor="#9CA3AF"
                                    secureTextEntry={!showConfirmPassword}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                />
                                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                    {showConfirmPassword ? (
                                        <EyeOff size={20} color="#6B7280" />
                                    ) : (
                                        <Eye size={20} color="#6B7280" />
                                    )}
                                </TouchableOpacity>
                            </View>


                            {/* Submit Button */}
                            <Animated.View style={buttonAnimatedStyle}>
                                <TouchableOpacity
                                    style={[styles.resetButton, isSubmitting && styles.resetButtonDisabled]}
                                    onPress={handleReset}
                                    disabled={isSubmitting}
                                >
                                    <LinearGradient
                                        colors={isSubmitting ? ['#9CA3AF', '#6B7280'] : ['#f24637', '#DC2626']}
                                        style={styles.resetGradient}
                                    >
                                        <Text style={styles.resetButtonText}>
                                            {isSubmitting ? 'Submitting...' : 'Reset Password'}
                                        </Text>
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
            </LinearGradient>
            <AlertComponent/>
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
        marginBottom: 30,
        position: 'relative',
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
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginTop: 16,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#FFFFFF',
        textAlign: 'center',
        opacity: 0.9,
        marginTop: 4,
    },
    formContainer: {
        flex: 1,
        justifyContent: 'center',
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
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        gap: 12,
        marginBottom: 20,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#111827',
    },
    resetButton: {
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#f24637',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
        marginBottom: 20,
    },
    resetButtonDisabled: {
        opacity: 0.7,
    },
    resetGradient: {
        paddingVertical: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    resetButtonText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    footer: {
        alignItems: 'center',
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
});
