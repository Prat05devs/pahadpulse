import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

import { openExternal } from './external-link';

describe('openExternal', () => {
  const openURL = jest.spyOn(Linking, 'openURL');

  beforeEach(() => {
    openURL.mockReset().mockResolvedValue(true);
    (WebBrowser.openBrowserAsync as jest.Mock).mockReset();
  });

  it('opens the link in the in-app browser when one is available', async () => {
    (WebBrowser.openBrowserAsync as jest.Mock).mockResolvedValue({ type: 'opened' });

    await openExternal('https://example.gov.in/notice');

    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith('https://example.gov.in/notice');
    expect(openURL).not.toHaveBeenCalled();
  });

  it('falls back to the system browser on an Android device with no Custom Tabs browser', async () => {
    (WebBrowser.openBrowserAsync as jest.Mock).mockRejectedValue(
      new Error('No matching browser activity found')
    );

    await openExternal('https://example.gov.in/notice');

    expect(openURL).toHaveBeenCalledWith('https://example.gov.in/notice');
  });

  it('does not throw when the link cannot be opened at all', async () => {
    (WebBrowser.openBrowserAsync as jest.Mock).mockRejectedValue(new Error('no browser'));
    openURL.mockRejectedValue(new Error('no handler'));

    await expect(openExternal('https://example.gov.in/notice')).resolves.toBeUndefined();
  });
});
