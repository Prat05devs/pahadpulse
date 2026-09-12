/**
 * The areas feature's public surface. Other features import from here and nowhere else —
 * never from `./components`, which is enforced by an ESLint rule.
 */
export { useDistricts, useDistrictDetail, useDistrictList } from './hooks';
export { fetchDistricts, fetchDistrictDetail } from './services';
export { areaKeys } from './queries';
export {
  AreaSchema,
  DistrictSummarySchema,
  DistrictDetailSchema,
  type Area,
  type DistrictSummary,
  type DistrictDetail,
  type Tehsil,
} from './schemas';
export { DistrictsScreen } from './components/districts-screen';
export { DistrictDetailScreen } from './components/district-detail-screen';
export { DistrictCard } from './components/district-card';
