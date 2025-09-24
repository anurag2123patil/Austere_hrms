import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react-native';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  type?: AlertType;
  onClose: () => void;
  buttons?: {
    text: string;
    onPress: () => void;
    style?: 'default' | 'cancel' | 'destructive';
  }[];
}

const { width } = Dimensions.get('window');

const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  title,
  message,
  type = 'info',
  onClose,
  buttons = [{ text: 'OK', onPress: onClose }],
}) => {
  const { theme } = useSelector((state: RootState) => state.auth);
  const isDark = theme === 'dark';

  // Theme-based colors
  const themeColors = {
    light: {
      background: '#FFFFFF',
      text: '#111827',
      subText: '#6B7280',
      card: '#FFFFFF',
      border: '#E5E7EB',
    },
    dark: {
      background: '#1F2937',
      text: '#FFFFFF',
      subText: '#9CA3AF',
      card: '#374151',
      border: '#4B5563',
    },
  };

  const alertConfig = {
    success: {
      icon: CheckCircle,
      iconColor: '#10B981',
      gradient: ['#10B981', '#059669'],
      lightBg: '#ECFDF5',
      darkBg: '#064E3B',
    },
    error: {
      icon: AlertCircle,
      iconColor: '#EF4444',
      gradient: ['#EF4444', '#DC2626'],
      lightBg: '#FEF2F2',
      darkBg: '#7F1D1D',
    },
    warning: {
      icon: AlertTriangle,
      iconColor: '#F59E0B',
      gradient: ['#F59E0B', '#D97706'],
      lightBg: '#FFFBEB',
      darkBg: '#78350F',
    },
    info: {
      icon: Info,
      iconColor: '#3B82F6',
      gradient: ['#3B82F6', '#2563EB'],
      lightBg: '#EFF6FF',
      darkBg: '#1E3A8A',
    },
  };

  const config = alertConfig[type];
  const IconComponent = config.icon;

  const getBackgroundColor = () => {
    if (isDark) {
      return type === 'info' ? themeColors.dark.card : config.darkBg;
    }
    return type === 'info' ? themeColors.light.card : config.lightBg;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View 
          style={[
            styles.alertContainer,
            { 
              backgroundColor: getBackgroundColor(),
              borderColor: isDark ? themeColors.dark.border : themeColors.light.border,
            }
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <IconComponent size={24} color={config.iconColor} />
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={20} color={isDark ? themeColors.dark.subText : themeColors.light.subText} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={[
              styles.title,
              { color: isDark ? themeColors.dark.text : themeColors.light.text }
            ]}>
              {title}
            </Text>
            <Text style={[
              styles.message,
              { color: isDark ? themeColors.dark.subText : themeColors.light.subText }
            ]}>
              {message}
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  button.style === 'destructive' && styles.destructiveButton,
                  button.style === 'cancel' && styles.cancelButton,
                  index > 0 && styles.buttonSpacing,
                ]}
                onPress={() => {
                  button.onPress();
                  if (button.style !== 'cancel') {
                    onClose();
                  }
                }}
              >
                <Text style={[
                  styles.buttonText,
                  button.style === 'destructive' && styles.destructiveButtonText,
                  button.style === 'cancel' && styles.cancelButtonText,
                  { color: button.style === 'destructive' ? '#EF4444' : config.iconColor }
                ]}>
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertContainer: {
    width: '80%',
    borderRadius: 16,
    paddingHorizontal: 16, 
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    paddingBottom: 4, 
  },
  content: {
    paddingHorizontal: 12,
    paddingBottom: 12, 
  },
  title: {
    fontSize: 16, 
    fontWeight: '600',
    marginBottom: 4, 
  },
  message: {
    fontSize: 13, 
    lineHeight: 18, 
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 12, 
    paddingTop: 4, 
  },
  button: {
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 8,
    minWidth: 50, 
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default CustomAlert;