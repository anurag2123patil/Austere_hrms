import React from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { X } from 'lucide-react-native';
import Employee from '@/store/slices/employeeSlice';
import { TextInput } from 'react-native';
import { User, Info, Home, Briefcase, Shield, IdCardLanyard } from 'lucide-react-native';
import { fetchNationalities } from '@/api/Api'
interface Props {
  visible: boolean;
  employee: Employee | null;
  onClose: () => void;
  isDark: boolean;
}

const EmployeeDetailsModal: React.FC<Props> = ({ visible, employee, onClose, isDark }) => {
  const [activeSection, setActiveSection] = React.useState<'basic' | 'personal' | 'address' | 'other'>('basic');
  const [nationalities, setNationalities] = React.useState<{ id: number; name: string }[]>([]);


  React.useEffect(() => {
    const loadNationalities = async () => {
      const data = await fetchNationalities();
      setNationalities(data);
    };

    if (visible) {
      loadNationalities();
    }
  }, [visible]);

  if (!employee) return null;

  const renderField = (label: string, value: any) => {
    const displayValue =
      typeof value === 'object' && value !== null
        ? JSON.stringify(value)
        : value ?? '—';



    return (
      <View style={styles.fieldRow}>
        <Text style={[styles.label, isDark && styles.darkText]}>{label}</Text>
        <TextInput
          value={String(displayValue)}
          editable={false}
          multiline
          style={[
            styles.inputBox,
            isDark ? styles.inputBoxDark : styles.inputBoxLight,
          ]}
          placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
        />
      </View>
    );
  };

  const renderSection = (
    title: string,
    content: React.ReactNode,
    IconComponent: React.ElementType
  ) => (
    <View style={[styles.sectionContainer, isDark && styles.darkSection]}>
      <View style={styles.sectionHeader}>
        <IconComponent size={16} color={isDark ? '#F9FAFB' : '#111827'} />
        <Text style={[styles.sectionTitle, isDark && styles.darkText]}>{title}</Text>
      </View>
      <View style={styles.divider} />
      {content}
    </View>
  );

  const getNationalityName = (id: number | undefined | null) => {
    if (!id) return '—';
    const match = nationalities.find(n => n.id === id);
    return match ? match.name : '—';
  };

  const getGenderLabel = (genderId: number | string | null | undefined) => {
    switch (Number(genderId)) {
      case 1:
        return 'Male';
      case 2:
        return 'Female';
      case 3:
        return 'Other';
      default:
        return '—';
    }
  };


  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, isDark && styles.darkModal]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={[styles.title, isDark && styles.darkText]}>{employee.name}</Text>
            <TouchableOpacity onPress={onClose}>
              <X color={isDark ? '#fff' : '#000'} />
            </TouchableOpacity>
          </View>


          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Profile Image */}
            <View style={styles.imageWrapper}>
              <Image
                source={{ uri: employee.avatar }}
                style={styles.image}
                resizeMode="cover"
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.overviewScroll}>
              <View style={styles.tabContainer}>
                {[
                  // { key: 'basic', icon: IdCardLanyard, label: 'Basic' },
                  // { key: 'personal', icon: User, label: 'Personal' },
                  // { key: 'address', icon: Home, label: 'Address' },
                  // { key: 'other', icon: Shield, label: 'Other' },
                ].map(({ key, icon: Icon, label }) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.tabButton,
                      activeSection === key && (isDark ? styles.tabActiveDark : styles.tabActiveLight),
                    ]}
                    onPress={() => setActiveSection(key as any)}
                  >
                    <Icon size={18} color={activeSection === key ? '#fff' : isDark ? '#D1D5DB' : '#4B5563'} />
                    <Text
                      style={[
                        styles.tabLabel,
                        { color: activeSection === key ? '#fff' : isDark ? '#D1D5DB' : '#4B5563' },
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            {activeSection === 'basic' &&
              renderSection('Basic Information', (
                <>
                  {renderField('Employee ID', employee.employee_id)}
                  {renderField('Email', employee.emp_work_email || employee.email)}
                  {renderField('Phone', employee.emp_mobile || employee.phone)}
                  {renderField('Department', employee.department)}
                  {renderField('Job Title', employee.role)}
                  {renderField('Join Date', employee.joined_date)}
                  {renderField('Location', employee.city_code)}
                </>
              ), IdCardLanyard)}

            {/* {activeSection === 'personal' &&
              renderSection('Personal Info', (
                <>
                  {renderField('Personal Email', employee.emp_oth_email)}
                  {renderField('Gender', getGenderLabel(employee.emp_gender))}
                  {renderField('Birthday', employee.emp_birthday)}
                  {renderField('Marital Status', employee.emp_marital_status)}
                  {renderField('Nationality', getNationalityName(employee.nation_code))}
                  {renderField('SSN', employee.emp_ssn_num)}
                  {renderField('Military Service', employee.emp_military_service)}
                </>
              ), User)} */}
{/* 
            {activeSection === 'address' &&
              renderSection('Address', (
                <>
                  {renderField('Street 1', employee.emp_street1)}
                  {renderField('Street 2', employee.emp_street2)}
                  {renderField('City', employee.city_code)}
                  {renderField('Province', employee.provin_code)}
                  {renderField('Zip Code', employee.emp_zipcode)}
                  {renderField('Country', employee.coun_code)}
                </>
              ), Home)} */}

            {/* {activeSection === 'other' &&
              renderSection('Other Details', (
                <>
                  {renderField('Smoker', employee.emp_smoker ? 'Yes' : 'No')}
                  {renderField('Driving License', employee.emp_dri_lice_num)}
                  {renderField('License Expiry', employee.emp_dri_lice_exp_date)}
                  {renderField('Workstation', employee.work_station)}
                  {renderField(
                    'Supervisor',
                    employee.supervisor
                      ? `${employee.supervisor.emp_firstname || ''} ${employee.supervisor.emp_lastname || ''}`.trim()
                      : '—'
                  )}
                </>
              ), Shield)} */}


          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    maxHeight: '90%',
  },
  darkModal: {
    backgroundColor: '#111827',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  body: {
    marginTop: 12,
  },
  imageWrapper: {
    alignItems: 'center',
    marginVertical: 16,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#4B5563',
  },
  sectionContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  darkSection: {
    backgroundColor: '#1F2937',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#D1D5DB',
    marginBottom: 8,
  },
  fieldRow: {
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  value: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 2,
  },
  darkText: {
    color: '#F9FAFB',
  },
  darkSubText: {
    color: '#9CA3AF',
  },
  inputBox: {
    borderWidth: 1,
    borderRadius: 5,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    marginTop: 4,
    textAlignVertical: 'top',
  },

  inputBoxLight: {
    backgroundColor: '#FCFCFC',
    borderColor: '#D1D5DB',
    color: '#111827',
  },

  inputBoxDark: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
    color: '#F9FAFB',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
  },

  tabButton: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
  },

  tabActiveLight: {
    backgroundColor: '#059669',
  },

  tabActiveDark: {
    backgroundColor: '#F9FAFB',
  },

  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  overviewScroll: {
    flexDirection: 'row',
  },

});

export default EmployeeDetailsModal;
