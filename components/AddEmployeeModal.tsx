import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { addEmployee } from '@/api/Api';
import { Eye, EyeOff } from 'lucide-react-native';
interface Props {
  visible: boolean;
  onClose: () => void;
  isDark: boolean;
}

const initialForm = {
  emp_firstname: '',
  emp_middle_name: '',
  emp_lastname: '',
  employee_id: '',
  user_name: '',
  password: '',
  confirmPassword: '',
  status: true,
};

const AddEmployeeModal: React.FC<Props> = ({ visible, onClose, isDark }) => {
  const [form, setForm] = useState(initialForm);
  const [image, setImage] = useState<any>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  useEffect(() => {
    if (visible) {
      resetForm();
    }
  }, [visible]);

  const resetForm = () => {
    setForm(initialForm);
    setImage(null);
  };

  const handleInputChange = (key: keyof typeof form, value: string | boolean) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleImagePick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Permission to access gallery is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: false,
    });

    if (!result.canceled && result.assets.length > 0) {
      setImage(result.assets[0]);
    }
  };


  const validateForm = () => {
    const {
      emp_firstname,
      emp_lastname,
      employee_id,
      user_name,
      password,
      confirmPassword,
    } = form;

    if (!employee_id.trim()) return 'Please enter Employee ID.';
    if (!emp_firstname.trim()) return 'Please enter First Name.';
    if (!emp_lastname.trim()) return 'Please enter Last Name.';
    if (!user_name.trim()) return 'Please enter Username.';
    if (!password.trim() || !confirmPassword.trim()) return 'Please enter and confirm your password.';

    const idRegex = /^[a-zA-Z0-9\-_.]+$/;
    if (!idRegex.test(employee_id)) return 'Employee ID can only contain letters, numbers, dashes, underscores, or dots.';

    const usernameRegex = /^[a-zA-Z0-9._]{4,}$/;
    if (!usernameRegex.test(user_name)) return 'Username must be at least 4 characters and can only contain letters, numbers, or underscores.';

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?#&])[A-Za-z\d@$!%*?#&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.';
    }

    if (password !== confirmPassword) return 'Passwords do not match.';

    return null;
  };

  const handleSubmit = async () => {
    const error = validateForm();
    if (error) {
      Alert.alert('Validation Error', error);
      return;
    }

    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      formData.append(key, value.toString());
    });

    if (image && image.uri) {
      const ext = image.uri.split('.').pop()?.toLowerCase();
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

      formData.append('profile_picture', {
        uri: image.uri,
        name: image.fileName || `profile.${ext}`,
        type: mimeType,
      } as any);
    }


    try {
      await addEmployee(formData);
      Alert.alert('Success', 'Employee added successfully!');
      onClose();
    } catch (err) {
      console.error('Add employee error:', err);
      Alert.alert('Error', 'Failed to add employee');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, isDark && styles.darkBackground]}>
          <Text style={[styles.title, isDark && styles.darkText]}>Add Employee</Text>

          {/* Image Picker */}
          <TouchableOpacity style={styles.avatarWrapper} onPress={handleImagePick}>
            {image ? (
              <Image source={{ uri: image.uri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>+</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Input Fields */}
          {[
            { key: 'employee_id', placeholder: 'Employee ID' },
            { key: 'emp_firstname', placeholder: 'First Name' },
            { key: 'emp_middle_name', placeholder: 'Middle Name' },
            { key: 'emp_lastname', placeholder: 'Last Name' },
            { key: 'user_name', placeholder: 'Username' },
          ].map(field => (
            <TextInput
              key={field.key}
              placeholder={field.placeholder}
              value={form[field.key as keyof typeof form] as string}
              onChangeText={text => handleInputChange(field.key as keyof typeof form, text)}
              placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
              style={[styles.input, isDark && styles.darkInput]}
            />
          ))}

          {/* Password Field */}
          <View style={[styles.passwordContainer, isDark && styles.darkInput]}>
            <TextInput
              placeholder="Password"
              secureTextEntry={!showPassword}
              value={form.password}
              onChangeText={text => handleInputChange('password', text)}
              placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
              style={[
                styles.passwordInput,
                { color: isDark ? '#FFFFFF' : '#111827' }, // ensure proper text color
              ]}
            />
            <TouchableOpacity onPress={() => setShowPassword(prev => !prev)}>
              {showPassword ? (
                <Eye color={isDark ? '#FFFFFF' : '#374151'} size={20} />
              ) : (
                <EyeOff color={isDark ? '#FFFFFF' : '#374151'} size={20} />
              )}
            </TouchableOpacity>
          </View>


          {/* Confirm Password Field */}
          <View style={[styles.passwordContainer, isDark && styles.darkInput]}>
            <TextInput
              placeholder="Confirm Password"
              secureTextEntry={!showConfirmPassword}
              value={form.confirmPassword}
              onChangeText={text => handleInputChange('confirmPassword', text)}
              placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
              style={[
                styles.passwordInput,
                { color: isDark ? '#FFFFFF' : '#111827' },
              ]}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(prev => !prev)}>
              {showConfirmPassword ? (
                <Eye color={isDark ? '#FFFFFF' : '#374151'} size={20} />
              ) : (
                <EyeOff color={isDark ? '#FFFFFF' : '#374151'} size={20} />
              )}
            </TouchableOpacity>
          </View>


          {/* Status Toggle */}
          <View style={styles.switchRow}>
            <Text style={[styles.label, isDark && styles.darkText]}>Status</Text>
            <Switch
              value={form.status}
              onValueChange={val => handleInputChange('status', val)}
            />
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
              <Text style={styles.submitText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default AddEmployeeModal;


const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  darkBackground: {
    backgroundColor: '#1F2937',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#111827',
  },
  darkText: {
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 14,
  },
  darkInput: {
    backgroundColor: '#374151',
    color: '#FFF',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  label: {
    fontSize: 14,
    color: '#111827',
  },
  avatarWrapper: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#374151',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 12,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cancelText: {
    color: '#6B7280',
    fontSize: 14,
  },
  submitBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  submitText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  passwordInput: {
    flex: 1,
    fontSize: 14,
  },

});
