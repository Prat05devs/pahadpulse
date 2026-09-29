import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

/**
 * Open a source link in the in-app browser, falling back to the system browser.
 *
 * In-app rather than leaving the app: the reader is mid-task, and a source link is a detour,
 * not a destination.
 *
 * The fallback is for Android. `openBrowserAsync` needs a browser that supports Custom Tabs,
 * and some devices have none - a de-Googled phone, a work profile, a browser the reader
 * disabled - so the call rejects and the tap does nothing. iOS always has
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

/** Dial a helpline. Punctuation in published numbers ("0135-3520100") is stripped first. */
export async function callNumber(number: string): Promise<void> {
  await Linking.openURL(`tel:${number.replace(/[^\d+]/g, '')}`).catch(() => undefined);
}

/**
 * Driving directions from wherever the reader is. Opens Google Maps (app or web) rather than
 * an in-app browser, because navigation is the destination here, not a detour.
 */
export async function openDirections(destination: string): Promise<void> {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;
  await Linking.openURL(url).catch(() => undefined);
}
