/**
 * Decide when a two-column card grid no longer has enough reliable room.
 *
 * Width protects compact Android devices and split-screen windows. Font scale protects
 * accessibility text: once it reaches 1.3, two readable cards are more useful than two
 * cramped cards with clipped labels.
 */
export function shouldStackCardGrid(width: number, fontScale: number): boolean {
  return width < 360 || fontScale >= 1.3;
}
