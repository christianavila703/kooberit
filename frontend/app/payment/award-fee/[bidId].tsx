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
import bidService from '@/services/bid';
import { useAppSelector } from '@/store/hooks';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import notification from '@/services/notification';
import { IconSymbol } from '@/components/ui/icon-symbol';
import api from '@/libs/api';
import endpoints from '@/constants/endpoints';

export default function AwardFeePaymentScreen() {
  const router = useRouter();
  const { bidId } = useLocalSearchParams<{ bidId: string }>();
  const { user } = useAppSelector((state) => state.auth);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { createPaymentMethod } = useStripe();
  const isHomeowner = user?.role === 'homeowner';

  const [cardholderName, setCardholderName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardDetails, setCardDetails] = useState<any>(null);
  const [bid, setBid] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (bidId) {
      loadBid();
    }
  }, [bidId]);

  const loadBid = async () => {
    try {
      const bidData = await bidService.getBidById(bidId);
      setBid(bidData);
    } catch (error: any) {
      notification.error('Error', 'Failed to load bid details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!cardDetails?.complete || !cardholderName) {
      notification.error('Payment Error', 'Please fill in all payment details');
      return;
    }

    if (!bidId || !user || !bid) {
      notification.error('Error', 'Missing required information');
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

      // Process award fee payment through backend
      const response = await api.post(endpoints.payments.processAwardFee, {
        bidId: bidId,
        paymentMethodId: paymentMethod.id,
        cardholderName,
      });

      if (response.data.success) {
        notification.success('Payment Successful', 'Award fee payment processed successfully!');
        router.back();
      } else {
        throw new Error(response.data.message || 'Payment failed');
      }
    } catch (error: any) {
      notification.error('Payment Failed', error.message || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const isDark = colorScheme === 'dark';

  if (loading || !bid) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Amount */}
        <View style={[styles.amountCard, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
          <Text style={[styles.amountLabel, { color: colors.icon }]}>Award Fee</Text>
          <Text style={[styles.amountValue, { color: colors.text }]}>${bid.awardFee.toFixed(2)}</Text>
          <Text style={[styles.amountDescription, { color: colors.icon }]}>
            2.5% of bid value (${bid.bidValue.toFixed(2)})
          </Text>
          {bid.passFeeToHomeowner && isHomeowner && (
            <View style={[styles.infoBox, { backgroundColor: isDark ? 'rgba(76, 175, 80, 0.15)' : 'rgba(76, 175, 80, 0.1)' }]}>
              <IconSymbol name="info.circle.fill" size={16} color="#4CAF50" />
              <Text style={[styles.infoText, { color: colors.text }]}>
                This fee is included in the bid amount. The contract amount already excludes this fee.
              </Text>
            </View>
          )}
        </View>

        {/* Bid Info */}
        <View style={[styles.infoCard, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>Bid Information</Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.icon }]}>Bid Value:</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>${bid.bidValue.toFixed(2)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.icon }]}>Project Due Date:</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {new Date(bid.projectDueDate).toLocaleDateString()}
            </Text>
          </View>
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
              <Text style={styles.payButtonText}>Pay ${bid.awardFee.toFixed(2)}</Text>
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    paddingTop: 20,
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
  infoCard: {
    borderRadius: 12,
    padding: 16,
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
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
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
  infoBox: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
});

