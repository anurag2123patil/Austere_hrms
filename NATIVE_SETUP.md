# Running ASL HRMS on Native Android and iOS

This guide will help you set up and run the ASL HRMS app natively on Android and iOS devices without using Expo.

## Prerequisites

### For Both Platforms
- Node.js (v18 or later)
- Git
- A physical device or emulator/simulator

### For Android Development
- **Android Studio** (latest version)
- **Android SDK** (API level 33 or higher)
- **Java Development Kit (JDK)** 11 or higher
- **Android device** with USB debugging enabled OR **Android emulator**

### For iOS Development (macOS only)
- **Xcode** (latest version from Mac App Store)
- **iOS Simulator** (included with Xcode)
- **CocoaPods** (`sudo gem install cocoapods`)
- **iOS device** with developer mode enabled (optional)

## Step 1: Eject from Expo Managed Workflow

⚠️ **Warning**: This process is irreversible. Make sure to backup your project first.

```bash
# Navigate to your project directory
cd asl-hrms-mobile

# Create a backup
cp -r . ../asl-hrms-backup

# Eject from Expo (choose "bare workflow")
npx expo eject
```

When prompted:
- Choose **"Bare workflow"**
- Keep the existing bundle identifier
- Confirm the eject process

## Step 2: Install Dependencies

```bash
# Install all dependencies
npm install

# For iOS only (macOS required)
cd ios && pod install && cd ..
```

## Step 3: Android Setup

### Install Android Studio
1. Download and install [Android Studio](https://developer.android.com/studio)
2. Open Android Studio and go through the setup wizard
3. Install the Android SDK (API level 33+)
4. Create an Android Virtual Device (AVD) or connect a physical device

### Configure Environment Variables
Add these to your `~/.bashrc`, `~/.zshrc`, or equivalent:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
# export ANDROID_HOME=$HOME/Android/Sdk        # Linux
# export ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk  # Windows

export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### Run on Android
```bash
# Start Metro bundler
npx react-native start

# In a new terminal, run on Android
npx react-native run-android

# Or specify a device
npx react-native run-android --device "Your Device Name"
```

## Step 4: iOS Setup (macOS only)

### Install Xcode
1. Install Xcode from the Mac App Store
2. Open Xcode and accept the license agreement
3. Install additional components when prompted

### Install CocoaPods
```bash
sudo gem install cocoapods
```

### Run on iOS
```bash
# Install iOS dependencies
cd ios && pod install && cd ..

# Start Metro bundler
npx react-native start

# In a new terminal, run on iOS
npx react-native run-ios

# Or specify a simulator
npx react-native run-ios --simulator="iPhone 15 Pro"

# Or run on a physical device
npx react-native run-ios --device "Your iPhone Name"
```

## Step 5: Development Workflow

### Starting the Development Server
```bash
# Start Metro bundler (required for both platforms)
npx react-native start

# Clear cache if needed
npx react-native start --reset-cache
```

### Building for Production

#### Android Production Build
```bash
# Generate signed APK
cd android
./gradlew assembleRelease

# Generate AAB for Play Store
./gradlew bundleRelease
```

#### iOS Production Build
1. Open `ios/ASLHRMSMobile.xcworkspace` in Xcode
2. Select your team and signing certificate
3. Choose "Generic iOS Device" or your connected device
4. Product → Archive
5. Follow the export wizard

## Step 6: Debugging

### React Native Debugger
```bash
# Install React Native Debugger
npm install -g react-native-debugger

# Start debugger
react-native-debugger
```

### Flipper (Meta's debugging platform)
1. Download [Flipper](https://fbflipper.com/)
2. Install and run Flipper
3. Your app should automatically connect when running in debug mode

### Chrome DevTools
1. Run your app in debug mode
2. Shake the device or press `Cmd+D` (iOS) / `Cmd+M` (Android)
3. Select "Debug with Chrome"

## Troubleshooting

### Common Android Issues

**Metro bundler not starting:**
```bash
npx react-native start --reset-cache
```

**Build failures:**
```bash
cd android
./gradlew clean
cd ..
npx react-native run-android
```

**Device not detected:**
```bash
adb devices
adb kill-server
adb start-server
```

### Common iOS Issues

**Pod install failures:**
```bash
cd ios
pod deintegrate
pod install
cd ..
```

**Build failures in Xcode:**
1. Clean build folder: Product → Clean Build Folder
2. Delete derived data: Xcode → Preferences → Locations → Derived Data → Delete
3. Restart Xcode

**Simulator issues:**
```bash
# Reset simulator
xcrun simctl erase all
```

## Performance Optimization

### Android
- Enable Proguard for release builds
- Use APK Analyzer to check app size
- Test on various Android versions and devices

### iOS
- Use Xcode Instruments for performance profiling
- Test on various iOS versions and devices
- Optimize images and assets

## Useful Commands

```bash
# Check React Native environment
npx react-native doctor

# List available devices
# Android
adb devices

# iOS
xcrun simctl list devices

# Clean everything and reinstall
rm -rf node_modules
npm install
cd ios && pod install && cd ..  # iOS only

# Reset Metro cache
npx react-native start --reset-cache
```

## Additional Resources

- [React Native Documentation](https://reactnative.dev/docs/environment-setup)
- [Android Developer Guide](https://developer.android.com/guide)
- [iOS Developer Guide](https://developer.apple.com/documentation/)
- [React Native Troubleshooting](https://reactnative.dev/docs/troubleshooting)

## Notes

- **Development builds** include debugging tools and are larger
- **Release builds** are optimized and smaller
- Always test on physical devices before releasing
- Keep your development environment updated
- Use version control to track changes after ejecting