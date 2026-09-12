import { Router } from 'express';
import * as businessController from '../controllers/business.controller.js';

const businessRouter = Router();

businessRouter.get('/scenarios', businessController.getScenarios);
businessRouter.get('/compare', businessController.compareDistricts);

export default businessRouter;

