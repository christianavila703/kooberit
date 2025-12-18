import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CardField, useStripe } from '@stripe/stripe-react-native';
import contractorContactService from '@/services/contact';
import { useAppSelector } from '@/store/hooks';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import notificationService from '@/services/notification';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Modal } from '@/components/ui/modal';
import jobService from '@/services/job';

export default function PaymentScreen() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const { user } = useAppSelector((state) => state.auth);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { createPaymentMethod } = useStripe();

  const [cardholderName, setCardholderName] = useState('');
  const [saveCard, setSaveCard] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardDetails, setCardDetails] = useState<any>(null);
  const [showContractorLimitPopup, setShowContractorLimitPopup] = useState(false);
  const [job, setJob] = useState<any>(null);

  // Load job to get contractor limit
  useEffect(() => {
    if (jobId) {
      loadJob();
    }
  }, [jobId]);

  const loadJob = async () => {
    try {
      const jobData = await jobService.getJobById(jobId);
      setJob(jobData);
    } catch (error: any) {
      notificationService.error('Error', 'Failed to load job details');
    }
  };

  const handlePayment = async () => {
    if (!cardDetails?.complete || !cardholderName) {
      notificationService.error('Payment Error', 'Please fill in all payment details');
      return;
    }

    if (!jobId || !user) {
      notificationService.error('Error', 'Missing required information');
      return;
    }

    // Show popup about contractor limit before processing payment
    if (job?.contractorLimit) {
      setShowContractorLimitPopup(true);
      return;
    }

    processPayment();
  };

  const processPayment = async () => {
    setIsProcessing(true);
    try {
      // Create payment method using Stripe
      const { paymentMethod, error: pmError } = await createPaymentMethod({
        paymentMethodType: 'Card',
        paymentMethodData: {
          billingDetails: {
            name: cardholderName,
          },
        },
      });

      if (pmError || !paymentMethod) {
        throw new Error(pmError?.message || 'Failed to create payment method');
      }

      // Process payment through backend with payment method ID
      const paymentResult = await contractorContactService.processPayment({
        jobId: jobId,
        paymentMethodId: paymentMethod.id,
        cardholderName,
        saveCard,
      });

      if (paymentResult.success) {
        notificationService.success('Payment Successful', 'Your payment has been processed successfully!');
        // Navigate to chat with homeowner
        if (paymentResult.chatId) {
          router.replace(`/chat/${paymentResult.chatId}` as any);
        } else {
          router.back();
        }
      } else {
        throw new Error(paymentResult.error || 'Payment failed');
      }
    } catch (error: any) {
      notificationService.error('Payment Failed', error.message || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const isDark = colorScheme === 'dark';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Amount */}
        <View style={[styles.amountCard, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
          <Text style={[styles.amountLabel, { color: colors.icon }]}>Amount to Pay</Text>
          <Text style={[styles.amountValue, { color: colors.text }]}>$19.99</Text>
          <Text style={[styles.amountDescription, { color: colors.icon }]}>
            One-time payment to contact homeowner
          </Text>
        </View>

        {/* Card Details */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Card Information</Text>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Card Details</Text>
            <View
              style={[
                styles.cardFieldContainer,
                {
                  backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5',
                },
              ]}>
              <CardField
                postalCodeEnabled={false}
                placeholders={{
                  number: '4242 4242 4242 4242',
                }}
                cardStyle={{
                  backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5',
                  textColor: colors.text,
                  borderColor: cardDetails?.complete ? '#4CAF50' : colors.icon,
                  borderWidth: 1,
                  borderRadius: 12,
                  fontSize: 16,
                  placeholderColor: colors.icon,
                }}
                style={styles.cardField}
                onCardChange={(cardDetails) => {
                  setCardDetails(cardDetails);
                }}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Cardholder Name</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5',
                  color: colors.text,
                },
              ]}
              placeholder="John Doe"
              placeholderTextColor={colors.icon}
              value={cardholderName}
              onChangeText={setCardholderName}
              editable={!isProcessing}
            />
          </View>
        </View>

        {/* Payment Button */}
        <TouchableOpacity
          style={[
            styles.payButton,
            { backgroundColor: colors.tint },
            isProcessing && styles.payButtonDisabled,
          ]}
          onPress={handlePayment}
          disabled={isProcessing}>
          {isProcessing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <IconSymbol name="lock.fill" size={20} color="#FFFFFF" />
              <Text style={styles.payButtonText}>Pay $19.99</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={[styles.securityText, { color: colors.icon }]}>
          🔒 Your payment is secure and encrypted
        </Text>
      </ScrollView>

      {/* Contractor Limit Popup */}
      <Modal visible={showContractorLimitPopup} onClose={() => setShowContractorLimitPopup(false)}>
        <View style={styles.popupContainer}>
          <View style={styles.popupHeader}>
            <Text style={[styles.popupTitle, { color: colors.text }]}>Important Notice</Text>
          </View>
          <View style={styles.popupContent}>
            <Text style={[styles.popupMessage, { color: colors.text }]}>
              Please note that the Homeowner has indicated that they would like {job?.contractorLimit || 'X'} contractors to contact them. We cannot guarantee their response as their circumstances might have changed since posting the job.
            </Text>
          </View>
          <View style={styles.popupButtons}>
            <TouchableOpacity
              style={[styles.popupButtonCancel, { borderColor: colors.tint }]}
              onPress={() => setShowContractorLimitPopup(false)}>
              <Text style={[styles.popupButtonCancelText, { color: colors.tint }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.popupButtonConfirm, { backgroundColor: colors.tint }]}
              onPress={() => {
                setShowContractorLimitPopup(false);
                processPayment();
              }}>
              <Text style={styles.popupButtonConfirmText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
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
  amountCard: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
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
  amountLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 8,
  },
  amountDescription: {
    fontSize: 13,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 56,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  cardFieldContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    padding: 4,
  },
  cardField: {
    width: '100%',
    height: 56,
  },
  row: {
    flexDirection: 'row',
  },
  saveCardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  saveCardText: {
    fontSize: 14,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  securityText: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 8,
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
  },
  popupButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  popupButtonCancel: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  popupButtonConfirm: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupButtonConfirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

