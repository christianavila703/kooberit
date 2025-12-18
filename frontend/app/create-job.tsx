import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { createJob } from '@/store/slices/jobSlice';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import notification from '@/services/notification';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Modal } from '@/components/ui/modal';
import { CONSTRUCTION_CATEGORIES } from '@/constants/config';
import { geocodeAddress, buildAddressString } from '@/utils/geocode';
import ProvinceSelect from '@/components/ProvinceSelect';


export default function CreateJobScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { currentJob } = useAppSelector((state) => state.job.homeowner);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [jobTitle, setJobTitle] = useState('');
  const [jobSize, setJobSize] = useState<'micro' | 'small' | 'big' | 'very_big' | ''>('');
  const [description, setDescription] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [contractorLimit, setContractorLimit] = useState(3);
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [streetNumber, setStreetNumber] = useState('');
  const [streetName, setStreetName] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [cityName, setCityName] = useState('');
  const [areaCode, setAreaCode] = useState('');
  const [province, setProvince] = useState<'ON' | 'AB' | 'BC' | 'MB' | 'NB' | 'NL' | 'NS' | 'PE' | 'QC' | 'SK' | 'NT' | 'NU' | 'YT'>('ON');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodedAddress, setGeocodedAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showPostJobPopup, setShowPostJobPopup] = useState(false);

  const handleGeocode = async () => {
    // Validate required fields
    if (!cityName.trim() || !province) {
      notification.error('Error', 'Please enter city name and select province');
      return;
    }

    setIsGeocoding(true);
    try {
      const result = await geocodeAddress({
        streetNumber: streetNumber.trim(),
        streetName: streetName.trim(),
        unitNumber: unitNumber.trim(),
        cityName: cityName.trim(),
        areaCode: areaCode.trim(),
        province: province,
      });

      if (result) {
        setLatitude(result.latitude);
        setLongitude(result.longitude);
        setAddress(result.address);
        setGeocodedAddress(result.address);
        if (errors.location) {
          setErrors({ ...errors, location: '' });
        }
        notification.success('Success', 'Location found successfully');
      } else {
        setLatitude(null);
        setLongitude(null);
        setAddress(buildAddressString({
          streetNumber: streetNumber.trim(),
          streetName: streetName.trim(),
          unitNumber: unitNumber.trim(),
          cityName: cityName.trim(),
          areaCode: areaCode.trim(),
          province: province,
        }));
        setGeocodedAddress('');
        notification.error('Error', 'Could not find location. Please check your address fields.');
      }
    } catch (error: any) {
      console.error('Geocoding error:', error);
      setLatitude(null);
      setLongitude(null);
      setGeocodedAddress('');
      const errorMessage = error?.message || 'Failed to get location. Please try again.';
      notification.error('Geocoding Error', errorMessage);
    } finally {
      setIsGeocoding(false);
    }
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!jobTitle.trim()) {
      newErrors.jobTitle = 'Project title is required';
    }

    if (!jobSize) {
      newErrors.jobSize = 'Job size is required';
    }

    if (description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    if (selectedCategories.length === 0) {
      newErrors.categories = 'Please select at least one category';
    }

    if (contractorLimit < 1) {
      newErrors.contractorLimit = 'Contractor limit must be at least 1';
    }

    if (!cityName.trim()) {
      newErrors.cityName = 'City name is required';
    }

    if (!province) {
      newErrors.province = 'Province is required';
    }

    if (latitude === null || longitude === null) {
      newErrors.location = 'Please ensure all address fields are filled correctly to get location';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    setIsLoading(true);
    try {
      const job = await dispatch(
        createJob({
          jobTitle: jobTitle.trim(),
          jobSize: jobSize as 'micro' | 'small' | 'big' | 'very_big',
          description: description.trim(),
          categories: selectedCategories,
          contractorLimit,
          location: {
            address: geocodedAddress || address.trim() || buildAddressString({
              streetNumber: streetNumber.trim(),
              streetName: streetName.trim(),
              unitNumber: unitNumber.trim(),
              cityName: cityName.trim(),
              areaCode: areaCode.trim(),
              province: province,
            }),
            coordinates: {
              latitude: latitude!,
              longitude: longitude!,
            },
            streetNumber: streetNumber.trim() || undefined,
            streetName: streetName.trim() || undefined,
            unitNumber: unitNumber.trim() || undefined,
            cityName: cityName.trim(),
            areaCode: areaCode.trim() || undefined,
            province: province,
          },
        })
      ).unwrap();

      // Show popup after successful job creation
      setShowPostJobPopup(true);
    } catch (error: any) {
      notification.error('Error', error.message || 'Failed to create job');
      setIsLoading(false);
    }
  };

  const handlePopupClose = () => {
    setShowPostJobPopup(false);
    setIsLoading(false);
    if (currentJob?.id) {
      router.replace(`/job/${currentJob.id}` as any);
    } else {
      router.back();
    }
  };

  const isDark = colorScheme === 'dark';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {/* Title */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Title</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5',
                color: colors.text,
                borderColor: errors.jobTitle ? '#FF3B30' : 'transparent',
              },
            ]}
            placeholder="Enter job title"
            placeholderTextColor={colors.icon}
            value={jobTitle}
            onChangeText={(text) => {
              setJobTitle(text);
              if (errors.jobTitle) {
                setErrors({ ...errors, jobTitle: '' });
              }
            }}
            editable={!isLoading}
          />
          {errors.jobTitle && (
            <Text style={styles.errorText}>{errors.jobTitle}</Text>
          )}
        </View>

        {/* Job Size */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Job Size</Text>
          <Text style={[styles.subLabel, { color: colors.icon }]}>
            Please select the estimated job size
          </Text>
          <View style={styles.jobSizeContainer}>
            {[
              { value: 'micro', label: 'Micro Job', range: '$0 - $2,500' },
              { value: 'small', label: 'Small Job', range: '$2,500 - $10,000' },
              { value: 'big', label: 'Big Job', range: '$10,000 - $50,000' },
              { value: 'very_big', label: 'Very Big Job', range: '$50,000+' },
            ].map((size) => (
              <TouchableOpacity
                key={size.value}
                style={[
                  styles.jobSizeButton,
                  {
                    backgroundColor:
                      jobSize === size.value
                        ? colors.tint
                        : isDark
                        ? '#1E1E1E'
                        : '#F5F5F5',
                    borderColor: jobSize === size.value ? colors.tint : isDark ? '#2E2E2E' : '#E0E0E0',
                  },
                ]}
                onPress={() => {
                  setJobSize(size.value as any);
                  if (errors.jobSize) {
                    setErrors({ ...errors, jobSize: '' });
                  }
                }}
                disabled={isLoading}>
                <Text
                  style={[
                    styles.jobSizeLabel,
                    {
                      color: jobSize === size.value ? '#FFFFFF' : colors.text,
                      fontWeight: jobSize === size.value ? '600' : '400',
                    },
                  ]}>
                  {size.label}
                </Text>
                <Text
                  style={[
                    styles.jobSizeRange,
                    {
                      color: jobSize === size.value ? '#FFFFFF' : colors.icon,
                    },
                  ]}>
                  {size.range}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.jobSize && <Text style={styles.errorText}>{errors.jobSize}</Text>}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Job Description</Text>
          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5',
                color: colors.text,
                borderColor: errors.description ? '#FF3B30' : 'transparent',
              },
            ]}
            placeholder="Tell us what needs to be done."
            placeholderTextColor={colors.icon}
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              if (errors.description) {
                setErrors({ ...errors, description: '' });
              }
            }}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            editable={!isLoading}
          />
          {errors.description && (
            <Text style={styles.errorText}>{errors.description}</Text>
          )}
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Construction Categories</Text>
          <Text style={[styles.subLabel, { color: colors.icon }]}>
            Please select all that apply
          </Text>
          <View style={styles.categoriesGrid}>
            {CONSTRUCTION_CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: selectedCategories.includes(category)
                      ? colors.tint
                      : isDark
                      ? '#1E1E1E'
                      : '#F5F5F5',
                    borderColor: selectedCategories.includes(category)
                      ? colors.tint
                      : isDark
                      ? '#2E2E2E'
                      : '#E0E0E0',
                  },
                ]}
                onPress={() => toggleCategory(category)}
                disabled={isLoading}>
                <Text
                  style={[
                    styles.categoryText,
                    {
                      color: selectedCategories.includes(category)
                        ? '#FFFFFF'
                        : colors.text,
                    },
                  ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.categories && (
            <Text style={styles.errorText}>{errors.categories}</Text>
          )}
        </View>

        {/* Contractor Limit */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Contractor Limit</Text>
          <Text style={[styles.subLabel, { color: colors.icon }]}>
            Please specify how many Contractors you would like to reach out to you.  We recommend three(3)
          </Text>
          <View style={styles.limitContainer}>
            <TouchableOpacity
              style={[
                styles.limitButton,
                {
                  backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5',
                  borderColor: errors.contractorLimit ? '#FF3B30' : 'transparent',
                },
              ]}
              onPress={() => setContractorLimit(Math.max(1, contractorLimit - 1))}
              disabled={isLoading || contractorLimit <= 1}>
              <IconSymbol name="minus" size={20} color={colors.text} />
            </TouchableOpacity>
            <TextInput
              style={[
                styles.limitInput,
                {
                  backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5',
                  color: colors.text,
                  borderColor: errors.contractorLimit ? '#FF3B30' : 'transparent',
                },
              ]}
              value={contractorLimit.toString()}
              onChangeText={(text) => {
                const num = parseInt(text) || 1;
                setContractorLimit(Math.max(1, num));
                if (errors.contractorLimit) {
                  setErrors({ ...errors, contractorLimit: '' });
                }
              }}
              keyboardType="number-pad"
              editable={!isLoading}
            />
            <TouchableOpacity
              style={[
                styles.limitButton,
                {
                  backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5',
                  borderColor: errors.contractorLimit ? '#FF3B30' : 'transparent',
                },
              ]}
              onPress={() => setContractorLimit(contractorLimit + 1)}
              disabled={isLoading}>
              <IconSymbol name="plus" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
          {errors.contractorLimit && (
            <Text style={styles.errorText}>{errors.contractorLimit}</Text>
          )}
        </View>

        {/* Address Fields */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Address</Text>
          
          {/* Row 1: Street Number | Street Name */}
          <View style={styles.addressRow}>
            <View style={styles.addressFieldHalf}>
              <Text style={[styles.subLabel, { color: colors.icon }]}>Street Number</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5',
                    color: colors.text,
                  },
                ]}
                placeholder="Enter street number"
                placeholderTextColor={colors.icon}
                value={streetNumber}
                onChangeText={setStreetNumber}
                editable={!isLoading}
              />
            </View>
            <View style={styles.addressFieldHalf}>
              <Text style={[styles.subLabel, { color: colors.icon }]}>Street Name</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5',
                    color: colors.text,
                  },
                ]}
                placeholder="Enter street name"
                placeholderTextColor={colors.icon}
                value={streetName}
                onChangeText={setStreetName}
                editable={!isLoading}
              />
            </View>
          </View>

          {/* Row 2: Unit Number | City Name */}
          <View style={styles.addressRow}>
            <View style={styles.addressFieldHalf}>
              <Text style={[styles.subLabel, { color: colors.icon, marginTop: 12 }]}>Unit Number (Optional)</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5',
                    color: colors.text,
                  },
                ]}
                placeholder="Enter unit number"
                placeholderTextColor={colors.icon}
                value={unitNumber}
                onChangeText={setUnitNumber}
                editable={!isLoading}
              />
            </View>
            <View style={styles.addressFieldHalf}>
              <Text style={[styles.subLabel, { color: colors.icon, marginTop: 12 }]}>City Name</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5',
                    color: colors.text,
                    borderColor: errors.cityName ? '#FF3B30' : 'transparent',
                  },
                ]}
                placeholder="Enter city name"
                placeholderTextColor={colors.icon}
                value={cityName}
                onChangeText={(text) => {
                  setCityName(text);
                  if (errors.cityName) {
                    setErrors({ ...errors, cityName: '' });
                  }
                }}
                editable={!isLoading}
              />
              {errors.cityName && <Text style={styles.errorText}>{errors.cityName}</Text>}
            </View>
          </View>

          {/* Row 3: Area Code */}
          <View style={styles.addressRow}>
            <View style={styles.addressFieldHalf}>
              <Text style={[styles.subLabel, { color: colors.icon, marginTop: 12 }]}>Area Code (Optional)</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5',
                    color: colors.text,
                  },
                ]}
                placeholder="Enter area code"
                placeholderTextColor={colors.icon}
                value={areaCode}
                onChangeText={setAreaCode}
                editable={!isLoading}
              />
            </View>
            <View style={styles.addressFieldHalf} />
          </View>

          {/* Province */}
          <View style={{ marginTop: 12 }}>
            <Text style={[styles.subLabel, { color: colors.icon }]}>Province</Text>
            <ProvinceSelect
              value={province}
              onValueChange={(value) => {
                setProvince(value);
                if (errors.province) {
                  setErrors({ ...errors, province: '' });
                }
              }}
              disabled={isLoading}
              error={!!errors.province}
            />
            {errors.province && <Text style={styles.errorText}>{errors.province}</Text>}
          </View>

          {/* Get Location Button */}
          <TouchableOpacity
            style={[
              styles.geocodeButton,
              {
                backgroundColor: colors.tint,
                opacity: isGeocoding ? 0.6 : 1,
              },
            ]}
            onPress={handleGeocode}
            disabled={isGeocoding || isLoading}>
            {isGeocoding ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.geocodeButtonText}>Getting Location...</Text>
              </>
            ) : (
              <>
                <IconSymbol name="location.fill" size={18} color="#FFFFFF" />
                <Text style={styles.geocodeButtonText}>Get Location</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Geocoded Location Display */}
          {(geocodedAddress || (latitude && longitude)) && !isGeocoding && (
            <View style={[styles.locationDisplay, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5', marginTop: 16 }]}>
              {latitude && longitude ? (
                <View style={styles.locationInfo}>
                  <IconSymbol name="checkmark.circle.fill" size={20} color={colors.tint} />
                  <View style={styles.locationDetails}>
                    <Text style={[styles.locationLabel, { color: colors.text }]}>Location Found</Text>
                    <Text style={[styles.locationAddress, { color: colors.icon }]} numberOfLines={2}>
                      {geocodedAddress || address}
                    </Text>
                    <Text style={[styles.locationCoords, { color: colors.icon }]}>
                      {latitude.toFixed(4)}, {longitude.toFixed(4)}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.locationError}>
                  <IconSymbol name="exclamationmark.triangle.fill" size={20} color="#FF3B30" />
                  <Text style={[styles.locationText, { color: '#FF3B30' }]}>
                    Could not find location. Please check your address fields.
                  </Text>
                </View>
              )}
            </View>
          )}
          {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: colors.tint },
            isLoading && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Create Job</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Post Job Popup */}
      <Modal visible={showPostJobPopup} onClose={handlePopupClose}>
        <View style={styles.popupContainer}>
          <View style={styles.popupHeader}>
            <Text style={[styles.popupTitle, { color: colors.text }]}>Job Posted Successfully</Text>
          </View>
          <View style={styles.popupContent}>
            <Text style={[styles.popupMessage, { color: colors.text }]}>
              Please note we are in initial stages of app deployment, it may take a few days for contractors to contact you. At full app deployment we expect instantaneous responses.
            </Text>
            {currentJob?.jobNumber && (
              <View style={[styles.jobNumberContainer, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5' }]}>
                <Text style={[styles.jobNumberLabel, { color: colors.icon }]}>Job Number</Text>
                <Text style={[styles.jobNumber, { color: colors.tint }]}>
                  {currentJob.jobNumber}
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={[styles.popupButton, { backgroundColor: colors.tint }]}
            onPress={handlePopupClose}>
            <Text style={styles.popupButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingTop: 20
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  subLabel: {
    fontSize: 13,
    marginBottom: 12,
  },
  textArea: {
    minHeight: 120,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  input: {
    height: 56,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  limitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  limitButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  limitInput: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    borderWidth: 1,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  submitButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  jobSizeContainer: {
    gap: 12,
  },
  jobSizeButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  jobSizeLabel: {
    fontSize: 16,
    marginBottom: 4,
  },
  jobSizeRange: {
    fontSize: 13,
  },
  popupContainer: {
    padding: 24,
  },
  popupHeader: {
    marginBottom: 20,
  },
  popupTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  popupContent: {
    marginBottom: 24,
  },
  popupMessage: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 20,
  },
  jobNumberContainer: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  jobNumberLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  jobNumber: {
    fontSize: 24,
    fontWeight: '700',
  },
  popupButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  addressRow: {
    flexDirection: 'row',
    gap: 12,
  },
  addressFieldHalf: {
    flex: 1,
  },
  locationDisplay: {
    borderRadius: 12,
    padding: 16,
  },
  locationLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  locationDetails: {
    flex: 1,
    gap: 4,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  locationAddress: {
    fontSize: 13,
    marginTop: 2,
  },
  locationCoords: {
    fontSize: 11,
    marginTop: 4,
    fontFamily: 'monospace',
  },
  locationError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationText: {
    flex: 1,
    fontSize: 13,
  },
  geocodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
    marginTop: 16,
  },
  geocodeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

