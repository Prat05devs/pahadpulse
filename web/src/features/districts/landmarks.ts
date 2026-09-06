/**
 * The landmark that identifies each district on sight.
 *
 * The point of the image is recognition: most people know Kedarnath long before they can
 * place Rudraprayag on a map, so the card leads with the place they already know and lets
 * the district name follow.
 *
 * Images are self-hosted from `web/public/districts`, never hotlinked: a remote URL is an
 * unlicensed asset and a dependency that breaks the page when it rots. Extensions differ
 * per file, so each path is spelled out rather than assumed from the slug.
 *
 * `credit` is still null on every entry. These photographs need their source and licence
 * recorded before public launch — every other figure on this platform names where it came
 * from, and an uncredited photo is the one place that rule is currently broken. The card
 * renders the credit as soon as it is filled in.
 */
export interface Landmark {
  /** The place people recognise. */
  name: string;
  nameHi: string;
  /** Served from `web/public`. Absent file falls back to the gradient. */
  image: string;
  /** Photographer and licence, shown on the card. Required once an image is added. */
  credit: string | null;
  /** Two stops for the fallback gradient, chosen to echo the landmark's setting. */
  gradient: [string, string];
}

export const DISTRICT_LANDMARKS: Record<string, Landmark> = {
  almora: {
    name: 'Kasar Devi Temple',
    nameHi: 'कसार देवी मंदिर',
    image: '/districts/almora.jpeg',
    credit: null,
    gradient: ['#4A6741', '#8FA37E'],
  },
  bageshwar: {
    name: 'Bagnath Temple',
    nameHi: 'बागनाथ मंदिर',
    image: '/districts/bageshwar.webp',
    credit: null,
    gradient: ['#3D5A6C', '#7E9BA8'],
  },
  chamoli: {
    name: 'Badrinath Temple',
    nameHi: 'बद्रीनाथ मंदिर',
    image: '/districts/chamoli.jpeg',
    credit: null,
    gradient: ['#8C3B2E', '#D08B62'],
  },
  champawat: {
    name: 'Baleshwar Temple',
    nameHi: 'बालेश्वर मंदिर',
    image: '/districts/champawat.jpg',
    credit: null,
    gradient: ['#5A4632', '#A08A6B'],
  },
  dehradun: {
    name: 'Ghanta Ghar',
    nameHi: 'घंटाघर',
    image: '/districts/dehradun.png',
    credit: null,
    gradient: ['#2F4858', '#7C9BAA'],
  },
  haridwar: {
    name: 'Har Ki Pauri',
    nameHi: 'हर की पौड़ी',
    image: '/districts/haridwar.jpeg',
    credit: null,
    gradient: ['#B5651D', '#E8B06A'],
  },
  nainital: {
    name: 'Naini Lake',
    nameHi: 'नैनी झील',
    image: '/districts/nainital.jpg',
    credit: null,
    gradient: ['#1F4E5F', '#6FA8B8'],
  },
  'pauri-garhwal': {
    name: 'Kandoliya Temple',
    nameHi: 'कंडोलिया मंदिर',
    image: '/districts/pauri.jpeg',
    credit: null,
    gradient: ['#3F5E4A', '#89A98C'],
  },
  pithoragarh: {
    name: 'Pithoragarh Fort',
    nameHi: 'पिथौरागढ़ किला',
    image: '/districts/pithoragarh.jpeg',
    credit: null,
    gradient: ['#5C4A5E', '#A08FA6'],
  },
  rudraprayag: {
    name: 'Kedarnath Temple',
    nameHi: 'केदारनाथ मंदिर',
    image: '/districts/rudraprayag.jpeg',
    credit: null,
    gradient: ['#42566B', '#9AAFC2'],
  },
  'tehri-garhwal': {
    name: 'Tehri Dam',
    nameHi: 'टिहरी बांध',
    image: '/districts/tehri.jpeg',
    credit: null,
    gradient: ['#1E5A6E', '#74AEC0'],
  },
  'udham-singh-nagar': {
    name: 'Nanak Sagar Dam',
    nameHi: 'नानक सागर बांध',
    image: '/districts/UdhamSinghNagar.jpeg',
    credit: null,
    gradient: ['#3E6B4F', '#8FBE9C'],
  },
  uttarkashi: {
    name: 'Gangotri Temple',
    nameHi: 'गंगोत्री मंदिर',
    image: '/districts/uttarkashi.jpeg',
    credit: null,
    gradient: ['#4A5D7E', '#9FB0CB'],
  },
};

/** Never throws on an unknown slug — a new district must render, not crash the page. */
export function landmarkFor(slug: string): Landmark {
  return (
    DISTRICT_LANDMARKS[slug] ?? {
      name: '',
      nameHi: '',
      image: '',
      credit: null,
      gradient: ['#41525F', '#8B9BA6'],
    }
  );
}
