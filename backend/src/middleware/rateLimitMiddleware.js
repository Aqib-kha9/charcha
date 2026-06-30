import rateLimit from 'express-rate-limit';
import Issue from '../models/Issue.js';
import ApiError from '../utils/ApiError.js';
import { sendError } from '../utils/apiResponse.js';

/**
 * Rate Limiting Middleware
 * ─────────────────────────────────────────────────────────
 * Implements the spam-prevention rule from the doc edge case
 * "Malicious Mass Reporting & Defamation":
 *   "a citizen can only report 3 issues per day until they build a high
 *    Civic Trust Score."
 *
 *  - reportLimiter : per-user daily report cap (3/day, lifted for high trust)
 *  - authLimiter   : stricter limit on auth endpoints (brute-force protection)
 */

const DAILY_REPORT_LIMIT = 3;
const HIGH_TRUST_THRESHOLD = 75;

/**
 * Express middleware that enforces the daily report cap per user.
 * Must run after protect(). Checks today's report count for req.user.
 */
export const reportLimiter = async (req, res, next) => {
  try {
    if (!req.user) return next();

    // High-trust users are exempt from the daily cap.
    if (req.user.trustScore >= HIGH_TRUST_THRESHOLD) {
      return next();
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayCount = await Issue.countDocuments({
      reportedBy: req.user._id,
      createdAt: { $gte: startOfDay },
    });

    if (todayCount >= DAILY_REPORT_LIMIT) {
      return sendError(
        res,
        new ApiError(
          429,
          `Daily report limit (${DAILY_REPORT_LIMIT}) reached. Build your Civic Trust Score to report more.`
        )
      );
    }

    next();
  } catch (error) {
    return sendError(res, new ApiError(500, 'Rate limit check failed'));
  }
};

/**
 * Stricter rate limiter for auth endpoints (login/register).
 * Prevents brute-force attacks.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per IP per window
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
});

export default { reportLimiter, authLimiter };
