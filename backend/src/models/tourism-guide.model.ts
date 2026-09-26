export interface TourismGuidePlace {
  slug: string;
  name: string;
  district: string;
  imageUrl: string;
  officialUrl: string;
  mapDestination: string;
  lat: number;
  lng: number;
}

export interface CharDhamPlace extends TourismGuidePlace {
  nameHi: string;
  altitudeM: number;
  bestSeason: string;
  access: string;
  imageAlt: string;
}

export interface TourismDestination extends TourismGuidePlace {
  category: string;
  summary: string;
}

export interface TourismOfficialLink {
  label: string;
  description: string;
  url: string;
  kind: 'primary' | 'guide' | 'map';
}

export interface TourismGuide {
  verifiedOn: string;
  sourceUrl: string;
  charDham: CharDhamPlace[];
  pilgrimages: TourismDestination[];
  destinations: TourismDestination[];
  officialLinks: TourismOfficialLink[];
  guidelines: string[];
  helplines: { yatra: string[]; emergency: string };
}
