import { type NextFunction, type Request, type Response, Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

import { CACHE_TTL } from '../config/constants.js';
import * as assistantController from '../controllers/assistant.controller.js';
import { cacheMiddleware } from '../middleware/cache.middleware.js';
import { validateRequest } from '../middleware/validate-request.middleware.js';
import { ERRORS } from '../utils/errors.js';
import { successResponse } from '../utils/response.js';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const Lang = z.enum(['en', 'hi']).default('en');

const SCHEMA = {
  CATALOGUE_QUERY: z.object({ lang: Lang }),
  ANSWER_BODY: z.object({
    questionId: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[a-z]+\.[a-z]+$/),
    district: z.string().min(1).max(128).regex(SLUG).optional(),
    place: z.string().min(1).max(128).regex(SLUG).optional(),
    lang: Lang,
  }),
  MATCH_BODY: z.object({
    text: z.string().trim().min(1).max(200),
    lang: Lang,
  }),
} as const;

/**
 * Free text is the one input a script could hammer cheaply, so it gets its own, tighter
 * limit on top of the API-wide one (§4.5).
 */
const matchLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(ERRORS.RATE_LIMITED);
  },
});

const assistantRouter = Router();

assistantRouter.get(
  '/catalogue',
  cacheMiddleware(CACHE_TTL.STATIC),
  validateRequest({ query: SCHEMA.CATALOGUE_QUERY }),
  async (req: Request, res: Response, next: NextFunction) => {
    const { lang } = req.validated.query as z.infer<typeof SCHEMA.CATALOGUE_QUERY>;
    const result = await assistantController.getCatalogue(lang);
    result.match(
      (data) => {
        res.json(successResponse(data, 'Assistant catalogue fetched successfully'));
      },
      (error) => {
        next(error);
      },
    );
  },
);

/**
 * POST, not GET: a question and its district are harmless, but keeping every assistant
 * input out of URLs keeps it out of proxy logs and CDN keys too (AST-7). Answers are cached
 * inside the controller instead, per question.
 */
assistantRouter.post(
  '/answer',
  validateRequest({ body: SCHEMA.ANSWER_BODY }),
  async (req: Request, res: Response, next: NextFunction) => {
    const body = req.validated.body as z.infer<typeof SCHEMA.ANSWER_BODY>;
    const result = await assistantController.answer(body);
    result.match(
      (data) => {
        res.json(successResponse(data, 'Answer composed successfully'));
      },
      (error) => {
        next(error);
      },
    );
  },
);

assistantRouter.post(
  '/match',
  matchLimiter,
  validateRequest({ body: SCHEMA.MATCH_BODY }),
  async (req: Request, res: Response, next: NextFunction) => {
    const body = req.validated.body as z.infer<typeof SCHEMA.MATCH_BODY>;
    const result = await assistantController.matchText(body);
    result.match(
      (data) => {
        res.json(successResponse(data, 'Question matched successfully'));
      },
      (error) => {
        next(error);
      },
    );
  },
);

export default assistantRouter;
