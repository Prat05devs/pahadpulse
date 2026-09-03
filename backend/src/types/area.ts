/**
 * The geographic hierarchy. Every domain row in the platform attaches to an area id.
 *
 * Values must match the MySQL ENUM in `001-create-areas.sql` character for character.
 */
export enum AreaType {
  State = 'state',
  District = 'district',
  Tehsil = 'tehsil',
  Village = 'village',
}

/**
 * Uttarakhand's two administrative divisions. Districts belong to exactly one.
 * Only meaningful for `AreaType.District`.
 */
export enum Division {
  Garhwal = 'garhwal',
  Kumaon = 'kumaon',
}
