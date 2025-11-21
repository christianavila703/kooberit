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
import { useAppDispatch } from '@/store/hooks';
import { createJobPost } from '@/store/slices/jobPostSlice';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import notificationService from '@/services/notification';
import { IconSymbol } from '@/components/ui/icon-symbol';
import LocationPicker from '@/components/LocationPicker';

const CONSTRUCTION_CATEGORIES = [
  'roof',
  'eavestrough',
  'sofit',
  'siding',
  'brickwork',
  'windows',
  'doors',
  'foundation',
  'exterior stairs',
  'attic',
  'ceiling',
  'interior stairs',
  'interior walls',
  'bedroom',
  'living room',
  'kitchen',
  'washroom',
  'basement',
  'plumbing',
  'heating',
  'cooling',
  'electrical',
];

export default function CreateJobPostScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [description, setDescription] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [contractorLimit, setContractorLimit] = useState(3);
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    if (selectedCategories.length === 0) {
      newErrors.categories = 'Please select at least one category';
    }

    if (contractorLimit < 1) {
      newErrors.contractorLimit = 'Contractor limit must be at least 1';
    }

    if (!address.trim()) {
      newErrors.address = 'Address is required';
    }

    if (latitude === null || longitude === null) {
      newErrors.location = 'Please select a location on the map';
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
      const jobPost = await dispatch(
        createJobPost({
          description: description.trim(),
          categories: selectedCategories,
          contractorLimit,
          location: {
            address: address.trim(),
            coordinates: {
              latitude: latitude!,
              longitude: longitude!,
            },
          },
        })
      ).unwrap();

      notificationService.success('Success', 'Job post created successfully');
      router.replace(`/job-post/${jobPost.id}` as any);
    } catch (error: any) {
      notificationService.error('Error', error || 'Failed to create job post');
    } finally {
      setIsLoading(false);
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
            Select all that apply
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
            Minimum: 3 (suggested)
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

        {/* Location */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Location</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5',
                color: colors.text,
                borderColor: errors.address ? '#FF3B30' : 'transparent',
              },
            ]}
            placeholder="Enter address"
            placeholderTextColor={colors.icon}
            value={address}
            onChangeText={(text) => {
              setAddress(text);
              if (errors.address) {
                setErrors({ ...errors, address: '' });
              }
            }}
            editable={!isLoading}
          />
          {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
          
          <LocationPicker
            address={address}
            latitude={latitude}
            longitude={longitude}
            onLocationChange={(addr, lat, lng) => {
              setAddress(addr);
              setLatitude(lat);
              setLongitude(lng);
              if (errors.location || errors.address) {
                setErrors({ ...errors, location: '', address: '' });
              }
            }}
          />
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
            <Text style={styles.submitButtonText}>Create Job Post</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
});

