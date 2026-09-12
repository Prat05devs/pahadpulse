/**
 * The map feature's public surface. Other features import from here and nowhere else —
 * never from `./components`, which is enforced by an ESLint rule.
 */
export { useDistrictFeatures, useAlertFeatures } from './hooks';
export { fetchDistrictFeatures, fetchAlertFeatures } from './services';
export { mapKeys } from './queries';
export {
  DistrictCollectionSchema,
  AlertCollectionSchema,
  MapMessageSchema,
  type DistrictCollection,
  type AlertCollection,
  type MapMessage,
} from './schemas';
export { MapScreen } from './components/map-screen';
