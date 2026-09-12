import { Router } from 'express';

import alertRouter, { areaAlertsRouter } from './alerts.route.js';
import areaRouter from './areas.route.js';
import indicatorRouter, { areaIndicatorsRouter } from './indicators.route.js';
import connectivityRouter, { areaConnectivityRouter } from './connectivity.route.js';
import mapRouter from './map.route.js';
import projectRouter from './projects.route.js';
import roadRouter from './roads.route.js';
import seismicRouter from './seismic.route.js';
import sourceRouter from './sources.route.js';
import tourismRouter from './tourism.route.js';
import businessRouter from './business.route.js';
import { areaWeatherRouter, stateAirRouter, stateWeatherRouter } from './weather.route.js';

const apiRouter = Router();

apiRouter.use('/areas', areaRouter);
apiRouter.use('/areas', areaIndicatorsRouter);
apiRouter.use('/areas', areaAlertsRouter);
apiRouter.use('/areas', areaWeatherRouter);
apiRouter.use('/areas', areaConnectivityRouter);
apiRouter.use('/map', mapRouter);
apiRouter.use('/sources', sourceRouter);
apiRouter.use('/indicators', indicatorRouter);
apiRouter.use('/alerts', alertRouter);
apiRouter.use('/projects', projectRouter);
apiRouter.use('/roads', roadRouter);
apiRouter.use('/tourism', tourismRouter);
apiRouter.use('/business', businessRouter);
apiRouter.use('/connectivity', connectivityRouter);
apiRouter.use('/seismic', seismicRouter);
// Batch reads for the state-wide pages. Not under `/areas` — see weather.route.ts.
apiRouter.use('/weather', stateWeatherRouter);
apiRouter.use('/air-quality', stateAirRouter);

export default apiRouter;
