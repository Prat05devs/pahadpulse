import { Alert, Linking } from 'react-native';

import type { Translate } from '@/i18n';

import type { NotificationEnableResult } from './hooks';

/** One truthful recovery message shared by onboarding and Settings. */
export function showNotificationEnableFailure(
  result: NotificationEnableResult,
  t: Translate
): void {
  if (result.enabled) return;

  if (result.reason === 'denied') {
    Alert.alert(
      t('settings.notifications.blockedTitle'),
      t('settings.notifications.blockedBody'),
      [
        { text: t('common.close'), style: 'cancel' },
        {
          text: t('settings.notifications.openSettings'),
          onPress: () => void Linking.openSettings(),
        },
      ]
    );
    return;
  }

  const copy =
    result.reason === 'unavailable'
      ? {
          title: t('settings.notifications.unavailableTitle'),
          body: t('settings.notifications.unavailableBody'),
        }
      : result.reason === 'configuration'
        ? {
            title: t('settings.notifications.configurationTitle'),
            body: t('settings.notifications.configurationBody'),
          }
        : {
            title: t('settings.notifications.failedTitle'),
            body: t('settings.notifications.failedBody'),
          };

  Alert.alert(copy.title, copy.body, [{ text: t('common.close'), style: 'cancel' }]);
}
