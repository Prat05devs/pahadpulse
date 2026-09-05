import { Router } from 'express';

import alertRouter, { areaAlertsRouter } from './alerts.route.js';
import areaRouter from './areas.route.js';
import indicatorRouter, { areaIndicatorsRouter } from './indicators.route.js';
import mapRouter from './map.route.js';
import roadRouter from './roads.route.js';
import sourceRouter from './sources.route.js';

const apiRouter = Router();

apiRouter.use('/areas', areaRouter);
apiRouter.use('/areas', areaIndicatorsRouter);
apiRouter.use('/areas', areaAlertsRouter);
apiRouter.use('/map', mapRouter);
apiRouter.use('/sources', sourceRouter);
apiRouter.use('/indicators', indicatorRouter);
apiRouter.use('/alerts', alertRouter);
apiRouter.use('/roads', roadRouter);

export default apiRouter;
