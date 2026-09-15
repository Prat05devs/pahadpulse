import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

/**
 * Open a source link in the in-app browser, falling back to the system browser.
 *
 * In-app rather than leaving the app: the reader is mid-task, and a source link is a detour,
 * not a destination.
 *
 * The fallback is for Android. `openBrowserAsync` needs a browser that supports Custom Tabs,
 * and some devices have none — a de-Googled phone, a work profile, a browser the reader
 * disabled — so the call rejects and the tap does nothing. iOS always has
 * SFSafariViewController, so there it never fires.
 */
export async function openExternal(url: string): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    // A link that cannot open at all has no better recovery than doing nothing.
    await Linking.openURL(url).catch(() => undefined);
  }
}
