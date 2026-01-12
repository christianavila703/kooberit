import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Modal } from '@/components/ui/modal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import bidService from '@/services/bid';
import notification from '@/services/notification';
import type { IBid, IExtensionRequest, IExtensionRequestType } from '@/types';
import { useSelector } from 'react-redux';
import type { IRootState } from '@/store';

type ProjectMilestoneActionsProps = {
  bid: IBid | null | undefined;
  role: 'contractor' | 'homeowner';
  /**
   * If true, hides all milestone actions (extension, budget change, completion prompts/sections).
   * Note: We also treat `bid.completionPrompted === true` as completed.
   */
  isJobCompleted?: boolean;
  /**
   * - card: full card with its own container styling (default)
   * - embedded: render without outer card container (for placing inside existing cards/sections)
   * - modalsOnly: render nothing visible, but still provides the modals driven by initialAction
   */
  renderMode?: 'card' | 'embedded' | 'modalsOnly';
  /**
   * Optional: pre-open a specific action modal (useful when user taps a system prompt message in chat).
   */
  initialAction?: 'date_extension' | 'budget_change' | 'completion' | null;
  isShow?: boolean;
  onInitialActionConsumed?: () => void;
  /**
   * Callbacks so parent can refresh bid/job state after changes are applied server-side.
   */
  onBidShouldRefresh?: () => Promise<void> | void;
  onJobShouldRefresh?: () => Promise<void> | void;
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default function ProjectMilestoneActions({
  bid,
  role,
  isJobCompleted = false,
  renderMode = 'card',
  isShow = true,
  initialAction = null,
  onInitialActionConsumed,
  onBidShouldRefresh,
  onJobShouldRefresh,
}: ProjectMilestoneActionsProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const { isAuthenticated } = useSelector((state: IRootState) => state.auth);

  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<IExtensionRequest[]>([]);

  // Extension modal state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestType, setRequestType] = useState<IExtensionRequestType>('date_extension');
  const [newDateText, setNewDateText] = useState('');
  const [newBudgetText, setNewBudgetText] = useState('');
  const [explanation, setExplanation] = useState('');

  // Completion modal state
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completedOnTime, setCompletedOnTime] = useState<boolean | null>(null);
  const [completedWithinBudget, setCompletedWithinBudget] = useState<boolean | null>(null);

  const jobCompleted = useMemo(() => {
    return Boolean(isJobCompleted || bid?.completionPrompted);
  }, [isJobCompleted, bid?.completionPrompted]);

  const awardedAndReady = useMemo(() => {
    if (!bid) return false;
    return bid.bidStatus === 'awarded' && bid.awardFeeStatus === 'completed';
  }, [bid]);

  const dueDateInfo = useMemo(() => {
    if (!bid?.projectDueDate) return null;
    const due = new Date(bid.projectDueDate);
    const today = startOfDay(new Date());
    const dueDay = startOfDay(due);
    const oneDayAfterDue = new Date(dueDay);
    oneDayAfterDue.setDate(oneDayAfterDue.getDate() + 1);
    return {
      due,
      dueDay,
      today,
      isDueOrPast: today.getTime() >= dueDay.getTime(),
      isPastOneDay: today.getTime() >= startOfDay(oneDayAfterDue).getTime(),
    };
  }, [bid?.projectDueDate]);

  const needsCompletionResponse = useMemo(() => {
    if (!bid || role !== 'homeowner') return false;
    if (!awardedAndReady) return false;
    if (jobCompleted) return false;
    if (!dueDateInfo) return false;
    return dueDateInfo.isPastOneDay && !bid.completionPrompted;
  }, [bid, role, awardedAndReady, dueDateInfo, jobCompleted]);

  const canRequestChanges = useMemo(() => {
    if (!bid || role !== 'contractor') return false;
    if (!awardedAndReady) return false;
    if (jobCompleted) return false;
    if (!dueDateInfo) return false;
    return dueDateInfo.isDueOrPast;
  }, [bid, role, awardedAndReady, dueDateInfo, jobCompleted]);

  const pendingRequestsForBid = useMemo(() => {
    if (!bid) return [];
    return requests.filter((r) => r.bidId === bid.id && r.status === 'pending');
  }, [requests, bid]);

  const refreshRequests = async () => {
    if (!bid?.id) return;
    if (!isAuthenticated) return;
    
    try {
      const r = await bidService.getExtensionRequestsByBid(bid.id);
      setRequests(r);
    } catch (e: any) {
      // Non-blocking
    }
  };

  const refreshParent = async () => {
    try {
      await onBidShouldRefresh?.();
    } catch {}
    try {
      await onJobShouldRefresh?.();
    } catch {}
  };

  useEffect(() => {
    if (!bid?.id || !isShow) return;
    refreshRequests();
  }, [bid?.id, isShow]);

  // If parent wants us to open a modal (chat system prompt), do it once.
  useEffect(() => {
    if (!bid?.id) return;
    if (!initialAction) return;

    if (jobCompleted) {
      notification.error('Not Available', 'This job has been completed.');
      onInitialActionConsumed?.();
      return;
    }

    if (initialAction === 'completion') {
      if (needsCompletionResponse) {
        setShowCompletionModal(true);
      } else {
        notification.error('Not Available', 'Completion response is not currently required for this project.');
      }
      onInitialActionConsumed?.();
      return;
    }

    if (role !== 'contractor') {
      notification.error('Not Available', 'Only the contractor can request changes.');
      onInitialActionConsumed?.();
      return;
    }

    if (!canRequestChanges) {
      notification.error('Not Available', 'Change requests are only available once the project due date is reached.');
      onInitialActionConsumed?.();
      return;
    }

    setRequestType(initialAction);
    setShowRequestModal(true);
    onInitialActionConsumed?.();
  }, [initialAction, bid?.id, role, canRequestChanges, needsCompletionResponse, onInitialActionConsumed, jobCompleted]);

  if (!bid || bid.bidStatus !== 'awarded') {
    // Still render modalsOnly if we need to consume initialAction and show a helpful error.
    if (renderMode !== 'modalsOnly') return null;
  }

  const openRequestModal = (type: IExtensionRequestType) => {
    setRequestType(type);
    setNewDateText('');
    setNewBudgetText('');
    setExplanation('');
    setShowRequestModal(true);
  };

  const submitRequest = async () => {
    if (!bid?.id) return;

    if (bid.awardFeeStatus !== 'completed') {
      notification.error('Not Available', 'This action is available once the award fee is paid.');
      return;
    }

    if (!explanation.trim() || explanation.trim().length < 10) {
      notification.error('Error', 'Explanation must be at least 10 characters.');
      return;
    }

    let newDate: string | undefined;
    let newBudget: number | undefined;

    if (requestType === 'date_extension') {
      const d = new Date(newDateText);
      if (!newDateText.trim() || isNaN(d.getTime())) {
        notification.error('Error', 'Please enter a valid date (YYYY-MM-DD).');
        return;
      }
      
      // Normalize dates to midnight for date-only comparison
      const newDateNormalized = new Date(d);
      newDateNormalized.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Extension date must be in the future (after today)
      if (newDateNormalized.getTime() <= today.getTime()) {
        notification.error('Error', 'Extension date must be a future date.');
        return;
      }
      newDate = d.toISOString();
    } else {
      const b = parseFloat(newBudgetText);
      if (!newBudgetText.trim() || isNaN(b) || b <= 0) {
        notification.error('Error', 'Please enter a valid new bid value.');
        return;
      }
      newBudget = b;
    }

    setLoading(true);
    try {
      await bidService.createExtensionRequest({
        bidId: bid.id,
        requestType,
        newDate,
        newBudget,
        explanation: explanation.trim(),
      });
      notification.success('Sent', 'Request sent to homeowner.');
      setShowRequestModal(false);
      await refreshRequests();
    } catch (e: any) {
      notification.error('Error', e.message || 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  const respondToRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    if (!bid?.id) return;
    setLoading(true);
    try {
      await bidService.respondToExtensionRequest(requestId, { status });
      notification.success('Updated', `Request ${status}.`);
      await refreshRequests();
      await refreshParent();
    } catch (e: any) {
      notification.error('Error', e.message || 'Failed to respond to request');
    } finally {
      setLoading(false);
    }
  };

  const submitCompletion = async () => {
    if (!bid?.id) return;
    if (bid.awardFeeStatus !== 'completed') {
      notification.error('Not Available', 'Completion status can be updated once the award fee is paid.');
      return;
    }
    if (completedOnTime === null || completedWithinBudget === null) {
      notification.error('Error', 'Please answer both questions.');
      return;
    }

    setLoading(true);
    try {
      await bidService.updateCompletionStatus(bid.id, {
        completedOnTime,
        completedWithinBudget,
      });
      notification.success('Saved', 'Completion status updated and efficiency points allocated.');
      setShowCompletionModal(false);
      await refreshParent();
    } catch (e: any) {
      notification.error('Error', e.message || 'Failed to update completion status');
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <>
        {isShow && !jobCompleted && (
        <>

            {/* Contractor: request changes */}
            {role === 'contractor' && canRequestChanges && (
                <View style={{ marginTop: 12 }}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Change Requests</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.icon }]}>
                    Available once the project due date is reached.
                </Text>

                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={[
                            styles.actionButton,
                            { backgroundColor: colors.tint },
                            (!canRequestChanges || loading) && styles.actionButtonDisabled,
                        ]}
                        onPress={() => openRequestModal('date_extension')}
                        disabled={!canRequestChanges || loading}
                        >
                        <IconSymbol name="calendar.badge.plus" size={18} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Request Extension</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={[
                            styles.actionButton,
                            { backgroundColor: '#4CAF50' },
                            (!canRequestChanges || loading) && styles.actionButtonDisabled,
                        ]}
                        onPress={() => openRequestModal('budget_change')}
                        disabled={!canRequestChanges || loading}
                        >
                        <IconSymbol name="dollarsign.circle.fill" size={18} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Request Budget Change</Text>
                    </TouchableOpacity>
                </View>

                {pendingRequestsForBid.length > 0 && (
                    <View style={[styles.pendingBox, { borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }]}>
                    <Text style={[styles.pendingTitle, { color: colors.text }]}>Pending Requests</Text>
                    {pendingRequestsForBid.map((r) => (
                        <View key={r.id} style={styles.pendingItem}>
                        <Text style={[styles.pendingItemTitle, { color: colors.text }]}>
                            {r.requestType === 'date_extension'
                            ? `New Due Date: ${r.newDate ? new Date(r.newDate).toLocaleDateString() : '-'}`
                            : `New Bid Value: ${typeof r.newBudget === 'number' ? `$${r.newBudget.toFixed(2)}` : '-'}`}
                        </Text>
                        <Text style={[styles.pendingItemText, { color: colors.icon }]} numberOfLines={3}>
                            {r.explanation}
                        </Text>
                        </View>
                    ))}
                    </View>
                )}
                </View>
            )}

            {/* Homeowner: approve/reject */}
            {role === 'homeowner' && pendingRequestsForBid.length > 0 && (
                <View style={{ marginTop: 12 }}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Requests From Contractor</Text>
                  {pendingRequestsForBid.length === 0 ? (
                      <Text style={[styles.sectionSubtitle, { color: colors.icon }]}>No pending requests.</Text>
                  ) : (
                      pendingRequestsForBid.map((r) => (
                      <View
                          key={r.id}
                          style={[
                          styles.requestCard,
                          { borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' },
                          ]}
                      >
                          <Text style={[styles.requestTitle, { color: colors.text }]}>
                              {r.requestType === 'date_extension' ? 'Due Date Extension Request' : 'Bid Value Change Request'}
                          </Text>
                          <Text style={[styles.requestMeta, { color: colors.icon }]}>
                              {r.requestType === 'date_extension'
                                  ? `Requested new due date: ${r.newDate ? new Date(r.newDate).toLocaleDateString() : '-'}`
                                  : `Requested new bid value: ${typeof r.newBudget === 'number' ? `$${r.newBudget.toFixed(2)}` : '-'}`}
                          </Text>
                          <Text style={[styles.requestExplanation, { color: colors.text }]}>{r.explanation}</Text>

                          <View style={styles.requestActions}>
                              <TouchableOpacity
                                  style={[styles.smallButton, { backgroundColor: '#FF3B30' }]}
                                  onPress={() => respondToRequest(r.id, 'rejected')}
                                  disabled={loading}
                              >
                                  <Text style={styles.smallButtonText}>Reject</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                  style={[styles.smallButton, { backgroundColor: colors.tint }]}
                                  onPress={() => respondToRequest(r.id, 'approved')}
                                  disabled={loading}
                              >
                                  <Text style={styles.smallButtonText}>Approve</Text>
                              </TouchableOpacity>
                          </View>
                      </View>
                      ))
                  )}
                </View>
            )}

        </>
        )}

        {/* Request Modal */}
        <Modal visible={showRequestModal} onClose={() => setShowRequestModal(false)}>
            <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                {requestType === 'date_extension' ? 'Request Due Date Extension' : 'Request Bid Value Change'}
                </Text>
                <TouchableOpacity onPress={() => setShowRequestModal(false)} disabled={loading}>
                <IconSymbol name="xmark.circle.fill" size={24} color={colors.icon} />
                </TouchableOpacity>
            </View>

            {requestType === 'date_extension' ? (
                <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>New Project Due Date</Text>
                    <TextInput
                        style={[
                        styles.input,
                        { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5', color: colors.text },
                        ]}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={colors.icon}
                        value={newDateText}
                        onChangeText={setNewDateText}
                        editable={!loading}
                    />
                    <Text style={[styles.hint, { color: colors.icon }]}>Format: YYYY-MM-DD (e.g., 2026-01-31)</Text>
                </View>
            ) : (
                <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>New Value of Bid</Text>
                    <TextInput
                        style={[
                        styles.input,
                        { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5', color: colors.text },
                        ]}
                        placeholder="0.00"
                        placeholderTextColor={colors.icon}
                        value={newBudgetText}
                        onChangeText={setNewBudgetText}
                        keyboardType="decimal-pad"
                        editable={!loading}
                    />
                </View>
            )}

            <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                    Explanation - reason(s) for {requestType === 'date_extension' ? 'delay' : 'budget change'} due to unforeseen circumstances or otherwise
                </Text>
                <TextInput
                    style={[
                        styles.textArea,
                        { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5', color: colors.text },
                    ]}
                    placeholder="Enter explanation..."
                    placeholderTextColor={colors.icon}
                    value={explanation}
                    onChangeText={setExplanation}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                    editable={!loading}
                    maxLength={1000}
                />
            </View>

            <View style={styles.modalActions}>
                <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonCancel]}
                    onPress={() => setShowRequestModal(false)}
                    disabled={loading}
                    >
                    <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                    style={[
                        styles.modalButton,
                        styles.modalButtonPrimary,
                        { backgroundColor: colors.tint },
                        (loading || !explanation.trim()) && styles.modalButtonDisabled,
                    ]}
                    onPress={submitRequest}
                    disabled={loading || !explanation.trim()}
                >
                    {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalButtonTextPrimary}>Send</Text>}
                </TouchableOpacity>
            </View>
            </View>
        </Modal>

        {/* Completion Modal */}
        <Modal visible={showCompletionModal} onClose={() => setShowCompletionModal(false)}>
            <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Completion Questions</Text>
                <TouchableOpacity onPress={() => setShowCompletionModal(false)} disabled={loading}>
                <IconSymbol name="xmark.circle.fill" size={24} color={colors.icon} />
                </TouchableOpacity>
            </View>

            <View style={styles.questionBlock}>
                <Text style={[styles.question, { color: colors.text }]}>
                Has the Contractor completed the work by the project due date?
                </Text>
                <View style={styles.binaryRow}>
                <TouchableOpacity
                    style={[
                    styles.binaryButton,
                    { backgroundColor: completedOnTime === true ? colors.tint : isDark ? '#1E1E1E' : '#F5F5F5' },
                    ]}
                    onPress={() => setCompletedOnTime(true)}
                    disabled={loading}
                >
                    <Text style={[styles.binaryText, { color: completedOnTime === true ? '#FFFFFF' : colors.text }]}>Yes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                    styles.binaryButton,
                    { backgroundColor: completedOnTime === false ? '#FF3B30' : isDark ? '#1E1E1E' : '#F5F5F5' },
                    ]}
                    onPress={() => setCompletedOnTime(false)}
                    disabled={loading}
                >
                    <Text style={[styles.binaryText, { color: completedOnTime === false ? '#FFFFFF' : colors.text }]}>No</Text>
                </TouchableOpacity>
                </View>
            </View>

            <View style={styles.questionBlock}>
                <Text style={[styles.question, { color: colors.text }]}>
                    Has the Contractor completed the work within value of bid?
                </Text>
                <View style={styles.binaryRow}>
                    <TouchableOpacity
                        style={[
                        styles.binaryButton,
                        { backgroundColor: completedWithinBudget === true ? colors.tint : isDark ? '#1E1E1E' : '#F5F5F5' },
                        ]}
                        onPress={() => setCompletedWithinBudget(true)}
                        disabled={loading}
                    >
                        <Text style={[styles.binaryText, { color: completedWithinBudget === true ? '#FFFFFF' : colors.text }]}>Yes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                        styles.binaryButton,
                        { backgroundColor: completedWithinBudget === false ? '#FF3B30' : isDark ? '#1E1E1E' : '#F5F5F5' },
                        ]}
                        onPress={() => setCompletedWithinBudget(false)}
                        disabled={loading}
                    >
                        <Text style={[styles.binaryText, { color: completedWithinBudget === false ? '#FFFFFF' : colors.text }]}>No</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.modalActions}>
                <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonCancel]}
                    onPress={() => setShowCompletionModal(false)}
                    disabled={loading}
                    >
                    <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.modalButton,
                        styles.modalButtonPrimary,
                        { backgroundColor: colors.tint },
                        (loading || completedOnTime === null || completedWithinBudget === null) && styles.modalButtonDisabled,
                    ]}
                    onPress={submitCompletion}
                    disabled={loading || completedOnTime === null || completedWithinBudget === null}
                    >
                    {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalButtonTextPrimary}>Submit</Text>}
                </TouchableOpacity>
            </View>
            </View>
        </Modal>
    </>
  );

  // modalsOnly renders no visible UI, but still supports driven modals.
  if (renderMode === 'modalsOnly') {
    return content;
  }

  if (!bid || bid.bidStatus !== 'awarded') {
    return null;
  }

  if (renderMode === 'embedded') {
    return <View style={[styles.embeddedContainer]}>{content}</View>;
  }

  return (
    <View >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  embeddedContainer: {
    paddingTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  kLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  kValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginBottom: 8,
  },
  actionRow: {
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  infoBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  pendingBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  pendingTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  pendingItem: {
    marginBottom: 10,
  },
  pendingItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  pendingItemText: {
    fontSize: 12,
    lineHeight: 16,
  },
  requestCard: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  requestTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  requestMeta: {
    fontSize: 12,
    marginBottom: 8,
  },
  requestExplanation: {
    fontSize: 13,
    lineHeight: 18,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  smallButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalContainer: {
    padding: 24,
    marginBottom: 100,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 16,
  },
  textArea: {
    borderRadius: 12,
    padding: 16,
    minHeight: 120,
    fontSize: 14,
  },
  hint: {
    marginTop: 6,
    fontSize: 12,
    fontStyle: 'italic',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F5F5F5',
  },
  modalButtonPrimary: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalButtonTextPrimary: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  questionBlock: {
    marginBottom: 18,
  },
  question: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  binaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  binaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  binaryText: {
    fontSize: 14,
    fontWeight: '800',
  },
});


