import Toast from 'react-native-toast-message';
import type { INotificationType, INotificationOptions } from '@/types';

/**
 * Notification Service
 * Provides a simple interface for showing toast notifications
 */
class NotificationService {
  /**
   * Show a notification
   */
  show(options: INotificationOptions): void {
    Toast.show({
      type: options.type,
      text1: options.text1,
      text2: options.text2,
      position: options.position || 'top',
      visibilityTime: options.visibilityTime || 4000,
      autoHide: options.autoHide !== false,
    });
  }

  /**
   * Show success notification
   */
  success(text1: string, text2?: string): void {
    this.show({
      type: 'success',
      text1,
      text2,
    });
  }

  /**
   * Show error notification
   */
  error(text1: string, text2?: string): void {
    this.show({
      type: 'error',
      text1,
      text2,
    });
  }

  /**
   * Show info notification
   */
  info(text1: string, text2?: string): void {
    this.show({
      type: 'info',
      text1,
      text2,
    });
  }

  /**
   * Hide current notification
   */
  hide(): void {
    Toast.hide();
  }
}

export default new NotificationService();

