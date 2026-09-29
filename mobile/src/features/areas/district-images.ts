/**
 * A representative, locally bundled image for each district.
 *
 * These images provide geographic atmosphere; they are deliberately not labelled as specific
 * landmarks because the photograph may not show the named place. Static requires let Metro
 * include the assets in release builds and catch a missing file during development.
 */
export const DISTRICT_IMAGES: Record<string, number> = {
  almora: require('../../../assets/images/districts/almora.webp'),
  bageshwar: require('../../../assets/images/districts/bageshwar.webp'),
  chamoli: require('../../../assets/images/districts/chamoli.webp'),
  champawat: require('../../../assets/images/districts/champawat.webp'),
  dehradun: require('../../../assets/images/districts/dehradun.webp'),
  haridwar: require('../../../assets/images/districts/haridwar.webp'),
  nainital: require('../../../assets/images/districts/nainital.webp'),
  'pauri-garhwal': require('../../../assets/images/districts/pauri-garhwal.webp'),
  pithoragarh: require('../../../assets/images/districts/pithoragarh.webp'),
  rudraprayag: require('../../../assets/images/districts/rudraprayag.webp'),
  'tehri-garhwal': require('../../../assets/images/districts/tehri-garhwal.webp'),
  'udham-singh-nagar': require('../../../assets/images/districts/udham-singh-nagar.webp'),
  uttarkashi: require('../../../assets/images/districts/uttarkashi.webp'),
};
