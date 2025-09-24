import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ToastAndroid,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { updateProfile } from '@/store/slices/authSlice';
import { router } from 'expo-router';
import { ArrowLeft, Camera, User, Mail, Phone, MapPin, Building, Save, CreditCard as Edit3 } from 'lucide-react-native';
import Animated, {
  FadeInDown,
  FadeInRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { fetchEmployeeBasicInfo, updateEmployeeBasicInfo, fetchLocations } from '@/api/Api';
import * as ImagePicker from 'expo-image-picker';
import DropDownPicker from 'react-native-dropdown-picker';
import { Eye, X } from 'lucide-react-native';
import { Modal } from 'react-native';
type ProfileImage = {
  uri: string;
  type: string;
  name: string;
};

type FormData = {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  profile: string | ProfileImage;
};
export default function EditProfileScreen() {
  const dispatch = useDispatch();
  const { user, theme } = useSelector((state: RootState) => state.auth);
  const isDark = theme === 'dark';

  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    profile: '',
  });

  const [locations, setLocations] = useState([]);
  const [locationItems, setLocationItems] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationOpen, setLocationOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  // Separate state for current profile image URI
  const [currentProfileImage, setCurrentProfileImage] = useState(null);
  // Add flag to track if image should be removed
  const [isPictureRemoved, setIsPictureRemoved] = useState(false);
  const [isImageViewModalVisible, setIsImageViewModalVisible] = useState(false);

  const buttonScale = useSharedValue(1);
  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    phone: '',
    location: '',
  });

  useEffect(() => {
    const loadEmployeeData = async () => {
      try {
        setIsProfileLoading(true);
        const data = await fetchEmployeeBasicInfo();

        const base64String = data.profile_picture?.picture_base64;
        const imageUri = base64String ? `data:image/jpeg;base64,${base64String}` : '';

        setFormData({
          firstName: data.emp_firstname || '',
          middleName: data.emp_middle_name || '',
          lastName: data.emp_lastname || '',
          email: data.emp_work_email || '',
          phone: data.emp_mobile || '',
          location: data.location?.id || '',
          profile: imageUri || '',
        });

        // Set the current profile image
        setCurrentProfileImage(imageUri);
        setSelectedLocation(data.location?.id || null);
        // Reset the remove flag when loading data
        setIsPictureRemoved(false);
      } catch (error) {
        console.error('Failed to load employee info:', error);
        Alert.alert('Error', 'Unable to fetch profile data.');
      } finally {
        setIsProfileLoading(false);
      }
    };

    loadEmployeeData();
  }, []);

  useEffect(() => {
    const loadLocations = async () => {
      setIsLoading(true);
      try {
        const data = await fetchLocations();
        setLocations(data);
        setLocationItems(
          data.map((item) => ({
            label: item.name,
            value: item.id,
          }))
        );
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    loadLocations();
  }, []);

  const handleSave = async () => {
    Keyboard.dismiss();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9]{10}$/;

    let newErrors = {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      location: '',
    };

    let hasError = false;

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
      hasError = true;
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
      hasError = true;
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
      hasError = true;
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email';
      hasError = true;
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
      hasError = true;
    } else if (!phoneRegex.test(formData.phone.trim())) {
      newErrors.phone = 'Phone number must be exactly 10 digits';
      hasError = true;
    }

    if (!formData.location) {
      newErrors.location = 'Location is required';
      hasError = true;
    }

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    // No errors
    setErrors({ firstName: '', lastName: '', middleName: '', email: '', phone: '', location: '' });

    // Continue saving
    setIsLoading(true);
    buttonScale.value = withSpring(0.95);

    try {
      // Create the payload with the isPictureRemoved flag
      const payload = {
        ...formData,
        isPictureRemoved: isPictureRemoved,
      };
      
      await updateEmployeeBasicInfo(payload);
      buttonScale.value = withSpring(1);
      setIsLoading(false);
      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Error', error?.message || 'Failed to update profile');
    }
  };

  const pickImage = async () => {
    Alert.alert(
      'Select Image Source',
      'Choose the source for your profile photo.',
      [
        { text: 'Camera', onPress: openCamera },
        { text: 'Gallery', onPress: openGallery },
        {
          text: 'Remove Photo',
          onPress: () => {
            // Set the remove flag to true
            setIsPictureRemoved(true);
            // Clear the current images
            setCurrentProfileImage(null);
            setFormData(prev => ({
              ...prev,
              profile: '', 
            }));
          },
          style: 'destructive',
        },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera access is required to take a photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    handleImageResult(result);
  };

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Media library access is required to select a photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    handleImageResult(result);
  };

  const handleImageResult = (result) => {
    if (!result.canceled && result.assets?.length > 0) {
      const selectedImage = result.assets[0];

      const uriParts = selectedImage.uri.split('.');
      const ext = uriParts[uriParts.length - 1];
      const type = selectedImage.mimeType || `image/${ext}`;
      const name = selectedImage.fileName || `profile.${ext}`;

      const profileImageObject = {
        uri: selectedImage.uri,
        type,
        name,
      };

      setFormData((prev) => ({
        ...prev,
        profile: profileImageObject,
      }));

      // Update the current profile image for immediate display
      setCurrentProfileImage(selectedImage.uri);
      // Reset the remove flag since user is adding a new image
      setIsPictureRemoved(false);
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage('');
    }, 3000);
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  // Fixed image source logic
  const getProfileImageSource = () => {
    // If image is marked for removal, show default image
    if (isPictureRemoved) {
      return require('../../assets/images/userImage.png');
    }

    // Priority: currentProfileImage > formData.profile
    if (currentProfileImage) {
      return { uri: currentProfileImage };
    }

    if (formData.profile) {
      if (typeof formData.profile === 'string' && formData.profile !== '') {
        return { uri: formData.profile };
      } else if (typeof formData.profile === 'object' && formData.profile.uri) {
        return { uri: formData.profile.uri };
      }
    }

    // Fallback to default image
    return require('../../assets/images/userImage.png');
  };

  // Check if user has a profile image to view
  const hasProfileImage = () => {
    if (isPictureRemoved) return false;

    if (currentProfileImage && currentProfileImage !== '') return true;

    if (formData.profile) {
      if (typeof formData.profile === 'string' && formData.profile !== '') return true;
      if (typeof formData.profile === 'object' && formData.profile.uri) return true;
    }

    return false;
  };

  // Get the image source for the modal view
  const getViewableImageSource = () => {
    if (currentProfileImage && currentProfileImage !== '') {
      return { uri: currentProfileImage };
    }

    if (formData.profile) {
      if (typeof formData.profile === 'string' && formData.profile !== '') {
        return { uri: formData.profile };
      } else if (typeof formData.profile === 'object' && formData.profile.uri) {
        return { uri: formData.profile.uri };
      }
    }

    return null;
  };

  if (isProfileLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }, isDark && styles.darkContainer]}>
        <Text style={{ color: isDark ? '#fff' : '#000', fontSize: 16, marginBottom: 10 }}>
          Loading profile...
        </Text>
        <ActivityIndicator size="large" color="#f24637" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, isDark && styles.darkContainer]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <Pressable
        style={{ flex: 1 }}
        onPress={() => {
          Keyboard.dismiss();
          if (locationOpen) setLocationOpen(false);
        }}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <LinearGradient
            colors={isDark ? ['#1F2937', '#374151'] : ['#f64137', '#f24637']}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <ArrowLeft size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Edit Profile</Text>
              <View style={styles.placeholder} />
            </View>
          </LinearGradient>
        </Animated.View>
        {toastMessage !== '' && (
          <Text style={{ color: 'red', marginTop: 4, fontSize: 12 }}>{toastMessage}</Text>
        )}

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          nestedScrollEnabled={true}
          onScrollBeginDrag={() => setLocationOpen(false)}
        >
          <Pressable
            style={{ flex: 1 }}
            onPress={() => {
              if (locationOpen) setLocationOpen(false);
              Keyboard.dismiss();
            }}
            accessible={false}
          >
            <View pointerEvents="box-none">
              {/* Profile Photo Section */}
              <Animated.View entering={FadeInDown.delay(200)} style={styles.photoSection}>
                <View style={[styles.photoCard, isDark && styles.darkCard]}>
                  <View style={styles.photoContainer}>
                    {/* Make the profile image clickable */}
                    <TouchableOpacity
                      style={styles.avatarTouchable}
                      onPress={() => {
                        if (hasProfileImage()) {
                          setIsImageViewModalVisible(true);
                        }
                      }}
                      activeOpacity={hasProfileImage() ? 0.8 : 1}
                    >
                      <Image
                        source={getProfileImageSource()}
                        style={styles.avatar}
                        key={currentProfileImage || formData.profile || isPictureRemoved}
                        onError={(error) => {
                          console.log('Image load error:', error);
                        }}
                        onLoad={() => {
                          console.log('Image loaded successfully');
                        }}
                      />
                      {/* Show a subtle overlay if image exists to indicate it's clickable */}
                      {hasProfileImage() && (
                        <View style={styles.imageOverlay}>
                          <Eye size={20} color="#FFFFFF" opacity={0.8} />
                        </View>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.cameraButton} onPress={pickImage}>
                      <Camera size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>

                  {/* Keep the existing View Profile Button as alternative option */}
                  {hasProfileImage() && (
                        <Text style={[styles.photoText, isDark && styles.darkText]}>Tap to View photo</Text>

                  )}
                </View>
              </Animated.View>

              {/* Form Section - Rest of the component remains the same */}
              <Animated.View entering={FadeInDown.delay(300)} style={styles.formSection}>
                <View style={[styles.formCard, isDark && styles.darkCard]}>
                  <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Personal Information</Text>

              {/* Name */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, isDark && styles.darkSubText]}>First Name</Text>
                {errors.firstName !== '' && (
                  <Text style={{ color: 'red', marginTop: 4, fontSize: 12 }}>{errors.firstName}</Text>
                )}
                <View style={[styles.inputWrapper, isDark && styles.darkInputWrapper]}>
                  <User size={20} color="#f24637" />
                  <TextInput
                    style={[styles.input, isDark && styles.darkText]}
                    value={formData.firstName}
                    onChangeText={(text) => {
                      setFormData({ ...formData, firstName: text });
                      setErrors((prev) => ({ ...prev, firstName: '' }));
                    }}
                    placeholder="Enter your first name"
                    placeholderTextColor={isDark ? '#9CA3AF' : '#9CA3AF'}
                    returnKeyType="next"
                  />
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, isDark && styles.darkSubText]}>Middle Name</Text>
                {errors.middleName !== '' && (
                  <Text style={{ color: 'red', marginTop: 4, fontSize: 12 }}>{errors.middleName}</Text>
                )}
                <View style={[styles.inputWrapper, isDark && styles.darkInputWrapper]}>
                  <User size={20} color="#f24637" />
                  <TextInput
                    style={[styles.input, isDark && styles.darkText]}
                    value={formData.middleName}
                    onChangeText={(text) => {
                      setFormData({ ...formData, middleName: text });
                      setErrors((prev) => ({ ...prev, middleName: '' }));
                    }} placeholder="Enter your middle name"
                    placeholderTextColor={isDark ? '#9CA3AF' : '#9CA3AF'}
                    returnKeyType="next"
                  />
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, isDark && styles.darkSubText]}>Last Name</Text>
                {errors.lastName !== '' && (
                  <Text style={{ color: 'red', marginTop: 4, fontSize: 12 }}>{errors.lastName}</Text>
                )}
                <View style={[styles.inputWrapper, isDark && styles.darkInputWrapper]}>
                  <User size={20} color="#f24637" />
                  <TextInput
                    style={[styles.input, isDark && styles.darkText]}
                    value={formData.lastName}
                    onChangeText={(text) => {
                      setFormData({ ...formData, lastName: text });
                      setErrors((prev) => ({ ...prev, lastName: '' }));
                    }}
                    placeholder="Enter your last name"
                    placeholderTextColor={isDark ? '#9CA3AF' : '#9CA3AF'}
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, isDark && styles.darkSubText]}>Email Address</Text>
                {errors.email !== '' && (
                  <Text style={{ color: 'red', marginTop: 4, fontSize: 12 }}>{errors.email}</Text>
                )}
                <View style={[styles.inputWrapper, isDark && styles.darkInputWrapper]}>
                  <Mail size={20} color="#f24637" />
                  <TextInput
                    style={[styles.input, isDark && styles.darkText]}
                    value={formData.email}
                    onChangeText={(text) => {
                      setFormData({ ...formData, email: text });
                      setErrors((prev) => ({ ...prev, email: '' }));
                    }}
                    placeholder="Enter your email"
                    placeholderTextColor={isDark ? '#9CA3AF' : '#9CA3AF'}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* Phone */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, isDark && styles.darkSubText]}>Phone Number</Text>
                {errors.phone !== '' && (
                  <Text style={{ color: 'red', marginTop: 4, fontSize: 12 }}>{errors.phone}</Text>
                )}
                <View style={[styles.inputWrapper, isDark && styles.darkInputWrapper]}>
                  <Phone size={20} color="#f24637" />
                  <TextInput
                    style={[styles.input, isDark && styles.darkText]}
                    value={formData.phone}
                    onChangeText={(text) => {
                      setFormData({ ...formData, phone: text });
                      setErrors((prev) => ({ ...prev, phone: '' }));
                    }}
                    placeholder="Enter your phone number"
                    placeholderTextColor={isDark ? '#9CA3AF' : '#9CA3AF'}
                    keyboardType="numeric"
                    returnKeyType="next"
                  />
                </View>
              </View>
              {/* Location */}
              {Platform.OS === 'android' ? (
                <View style={{ zIndex: 1000 }}>
                  <View style={{ marginBottom: locationOpen ? 200 : 20 }}>
                    <Text style={[styles.inputLabel, isDark && styles.darkSubText]}>Location</Text>
                    {errors.location !== '' && (
                      <Text style={{ color: 'red', marginTop: 4, fontSize: 12 }}>{errors.location}</Text>
                    )}
                    <DropDownPicker
                      open={locationOpen}
                      value={selectedLocation}
                      items={locationItems}
                      setOpen={setLocationOpen}
                      setValue={setSelectedLocation}
                      setItems={setLocationItems}
                      placeholder="Select location"
                      listMode="SCROLLVIEW"
                      scrollViewProps={{
                        nestedScrollEnabled: true,
                      }}
                      style={{
                        borderRadius: 12,
                        borderWidth: 1,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderColor: '#E5E7EB',
                        backgroundColor: isDark ? '#374151' : '#F9FAFB',
                        zIndex: 1000,
                      }}
                      dropDownContainerStyle={{
                        borderRadius: 12,
                        borderColor: '#E5E7EB',
                        backgroundColor: isDark ? '#374151' : '#FFFFFF',
                        maxHeight: 150,
                        zIndex: 1000,
                      }}
                      textStyle={{
                        fontSize: 16,
                        color: isDark ? '#FFFFFF' : '#111827',
                      }}
                      labelStyle={{
                        color: isDark ? '#FFFFFF' : '#111827',
                      }}
                      placeholderStyle={{
                        color: isDark ? '#9CA3AF' : '#9CA3AF',
                      }}
                      onChangeValue={(val) => {
                        setSelectedLocation(val);
                        setFormData((prev) => ({ ...prev, location: val }));
                        setErrors((prev) => ({ ...prev, location: '' }));
                      }}
                    />
                  </View>
                </View>
              ) : (
                <View style={{ marginBottom: locationOpen ? 200 : 20 }}>
                  <Text style={[styles.inputLabel, isDark && styles.darkSubText]}>Location</Text>
                  {errors.location !== '' && (
                    <Text style={{ color: 'red', marginTop: 4, fontSize: 12 }}>{errors.location}</Text>
                  )}
                  <DropDownPicker
                    open={locationOpen}
                    value={selectedLocation}
                    items={locationItems}
                    setOpen={setLocationOpen}
                    setValue={setSelectedLocation}
                    setItems={setLocationItems}
                    placeholder="Select location"
                    listMode="SCROLLVIEW"
                    scrollViewProps={{
                      nestedScrollEnabled: true,
                    }}
                    style={{
                      borderRadius: 12,
                      borderWidth: 1,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderColor: '#E5E7EB',
                      backgroundColor: isDark ? '#374151' : '#F9FAFB',
                      zIndex: 1000,
                    }}
                    dropDownContainerStyle={{
                      borderRadius: 12,
                      borderColor: '#E5E7EB',
                      backgroundColor: isDark ? '#374151' : '#FFFFFF',
                      maxHeight: 150,
                      zIndex: 1000,
                    }}
                    textStyle={{
                      fontSize: 16,
                      color: isDark ? '#FFFFFF' : '#111827',
                    }}
                    labelStyle={{
                      color: isDark ? '#FFFFFF' : '#111827',
                    }}
                    placeholderStyle={{
                      color: isDark ? '#9CA3AF' : '#9CA3AF',
                    }}
                    onChangeValue={(val) => {
                      setSelectedLocation(val);
                      setFormData((prev) => ({ ...prev, location: val }));
                      setErrors((prev) => ({ ...prev, location: '' }));
                    }}

                  />
                </View>
              )}
            </View>
          </Animated.View>

              {/* Save Button */}
              <Animated.View entering={FadeInRight.delay(500)} style={styles.saveSection}>
                <Animated.View style={buttonAnimatedStyle}>
                  <TouchableOpacity
                    style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={isLoading}
                  >
                    <LinearGradient
                      colors={isLoading ? ['#9CA3AF', '#6B7280'] : ['#f24637', '#DC2626']}
                      style={styles.saveGradient}
                    >
                      <Save size={20} color="#FFFFFF" />
                      <Text style={styles.saveButtonText}>
                        {isLoading ? 'Saving...' : 'Save Changes'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              </Animated.View>
            </View>
          </Pressable>
        </ScrollView>
      </Pressable>

      {/* Image View Modal */}
      <Modal
        visible={isImageViewModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsImageViewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setIsImageViewModalVisible(false)}
          >
            <View style={styles.modalContent}>
              {/* Close button with X */}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsImageViewModalVisible(false)}
              >
                <X size={28} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Full screen image */}
              {getViewableImageSource() && (
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={(e) => e.stopPropagation()} // Prevent modal close when tapping image
                >
                  <Image
                    source={getViewableImageSource()}
                    style={styles.fullScreenImage}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              )}

              
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
    flexGrow: 1,
  },
  photoSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  photoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 10
  },
  darkCard: {
    backgroundColor: '#1F2937',
  },
  photoContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#f24637',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f24637',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  photoText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  darkText: {
    color: '#FFFFFF',
  },
  darkSubText: {
    color: '#9CA3AF',
  },
  formSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  darkInputWrapper: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  textAreaWrapper: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'flex-start',
    gap: 12,
  },
  textAreaIcon: {
    marginTop: 4,
  },
  textArea: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveSection: {
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#f24637',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  toastContainer: {
    position: 'absolute',
    top: 150,
    right: 16,
    backgroundColor: '#F73939',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    zIndex: 999,
    maxWidth: '80%',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  avatar: {
    width: 100, // Changed from 60 to match profilePhoto style
    height: 100, // Changed from 60 to match profilePhoto style
    borderRadius: 50, // Changed from 30 to match profilePhoto style
    borderWidth: 4, // Changed from 3 to match profilePhoto style
    borderColor: '#f24637', // Changed from #FFFFFF to match profilePhoto style
  },
  avatarTouchable: {
    position: 'relative',
    borderRadius: 60,
    overflow: 'hidden',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 60,
    opacity: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: -50,
    right: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  fullScreenImage: {
    width: 350,
    height: 350,
    borderRadius: 10,
    
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
  },
  
});