// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
export type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'chevron.up': 'keyboard-arrow-up',
  'chevron.down': 'keyboard-arrow-down',
  'message.fill': 'message',
  'person.fill': 'person',
  'list.bullet': 'list',
  'arrow.left': 'arrow-back',
  'arrow.up.circle.fill': 'arrow-upward',
  'arrow.up': 'arrow-upward',
  'photo': 'photo',
  'checkmark.circle.fill': 'check-circle',
  'checkmark': 'check',
  'chevron.left': 'chevron-left',
  'plus.circle.fill': 'add-circle',
  'plus': 'add',
  'minus': 'remove',
  'location.fill': 'location-on',
  'person.2.fill': 'people',
  'person.2': 'people',
  'person.badge.plus.fill': 'person-add',
  'pencil': 'edit',
  'xmark': 'close',
  'xmark.circle.fill': 'cancel',
  'trash.fill': 'delete',
  'person.crop.circle.badge.questionmark': 'help-outline',
  'bubble.left.and.bubble.right': 'chat-bubble-outline',
  'message': 'message',
  'person.circle.fill': 'account-circle',
  'power': 'power-settings-new',
  'lock.fill': 'lock',
  'doc.text.magnifyingglass': 'description',
  'doc.text': 'description',
  'doc.text.fill': 'description',
  'slider.horizontal.3': 'tune',
  'bell.fill': 'notifications',
  'magnifyingglass': 'search',
  'creditcard.fill': 'credit-card',
  'hand.raised.fill': 'privacy-tip',
  'map': 'map',
  'map.fill': 'map',
  'briefcase.fill': 'work',
  'exclamationmark.triangle.fill': 'warning',
  'paperclip': 'attach-file',
  'doc': 'description',
  'clock.fill': 'access-time',
  'mappin': 'place',
  'envelope.fill': 'mail',
  'dollarsign.circle.fill': 'attach-money',
  'dollarsign.circle': 'attach-money',
  'info.circle.fill': 'info',
  'calendar': 'event',
  'calendar.badge.plus': 'event-available',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const iconName = MAPPING[name];
  if (!iconName) {
    console.warn(`Icon "${name}" not found in mapping`);
    return <MaterialIcons color={color} size={size} name="help-outline" style={style} />;
  }
  return <MaterialIcons color={color} size={size} name={iconName} style={style} />;
}
