import React, { useLayoutEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { CardField, useStripe } from '@stripe/stripe-react-native';
import contractorContactService from '@/services/contractorContact';
import { useAppSelector } from '@/store/hooks';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import notificationService from '@/services/notification';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function PaymentScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { jobPostId } = useLocalSearchParams<{ jobPostId: string }>();
  const { user } = useAppSelector((state) => state.auth);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { createPaymentMethod } = useStripe();

  const [cardholderName, setCardholderName] = useState('');
  const [saveCard, setSaveCard] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardDetails, setCardDetails] = useState<any>(null);

  // Set header title
  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Payment',
    });
  }, [navigation]);

  const handlePayment = async () => {
    if (!cardDetails?.complete || !cardholderName) {
      notificationService.error('Payment Error', 'Please fill in all payment details');
      return;
    }

    if (!jobPostId || !user) {
      notificationService.error('Error', 'Missing required information');
      return;
    }

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
        jobPostId: jobPostId,
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

          <TouchableOpacity
            style={styles.saveCardContainer}
            onPress={() => setSaveCard(!saveCard)}
            disabled={isProcessing}>
            <View
              style={[
                styles.checkbox,
                {
                  backgroundColor: saveCard ? colors.tint : 'transparent',
                  borderColor: colors.tint,
                },
              ]}>
              {saveCard && <IconSymbol name="checkmark" size={16} color="#FFFFFF" />}
            </View>
            <Text style={[styles.saveCardText, { color: colors.text }]}>Save card for future use</Text>
          </TouchableOpacity>
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
});

