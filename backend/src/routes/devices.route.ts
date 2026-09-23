import { type NextFunction, type Request, type Response, Router } from 'express';
import { z } from 'zod';

import { DeviceRepository } from '../repositories/device.repository.js';
import { validateRequest } from '../middleware/validate-request.middleware.js';
import { successResponse } from '../utils/response.js';

/**
 * Device registration for alert notifications.
 *
 * No account, and nothing that identifies a person: a device sends the push token the OS
 * gave it, and can delete it again. `accounts` is deferred (accounts.md §8) and a
 * notification does not need to know who anyone is.
 *
 * Expo's token format is checked rather than accepting any string — the token is sent
 * straight to Expo's API, and a registry full of junk is both a cost per dispatch and an
 * invitation to use this endpoint as a way to make this server post arbitrary strings
 * somewhere else.
 */
const EXPO_TOKEN = /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]{1,128}\]$/;

const SCHEMA = {
  REGISTER_BODY: z.object({
    token: z.string().regex(EXPO_TOKEN, 'expected an Expo push token'),
    platform: z.enum(['ios', 'android']),
    language: z.enum(['en', 'hi']).default('en'),
  }),
  UNREGISTER_BODY: z.object({
    token: z.string().regex(EXPO_TOKEN, 'expected an Expo push token'),
  }),
} as const;

const deviceRouter = Router();

deviceRouter.post(
  '/',
  validateRequest({ body: SCHEMA.REGISTER_BODY }),
  async (req: Request, res: Response, next: NextFunction) => {
    const body = req.validated.body as z.infer<typeof SCHEMA.REGISTER_BODY>;
    const result = await DeviceRepository.register(body);
    result.match(
      () => {
        res.status(201).json(successResponse(null, 'Device registered for alerts'));
      },
      (error) => {
        next(error);
      },
    );
  },
);

/**
 * POST rather than DELETE with the token in the path: a push token is long, contains
 * brackets, and belongs in a body rather than in a URL that ends up in access logs.
 */
deviceRouter.post(
  '/unregister',
  validateRequest({ body: SCHEMA.UNREGISTER_BODY }),
  async (req: Request, res: Response, next: NextFunction) => {
    const { token } = req.validated.body as z.infer<typeof SCHEMA.UNREGISTER_BODY>;
    const result = await DeviceRepository.unregister(token);
    result.match(
      () => {
        res.json(successResponse(null, 'Device removed'));
      },
      (error) => {
        next(error);
      },
    );
  },
);

export default deviceRouter;
