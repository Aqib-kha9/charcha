import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { sendError } from '../utils/apiResponse.js';

/**
 * Auth Middleware — RBAC for CHARCHA (doc §5.1.11.1)
 * ─────────────────────────────────────────────────────────
 * Role hierarchy: citizen → ward_officer → department_head → super_admin
 *
 *  - protect()           : verifies JWT, loads full user doc onto req.user
 *  - authorize(...roles) : restricts a route to specific roles
 *  - optionalAuth()      : attaches user if token present, else continues
 */

/**
 * Protects routes by verifying the JWT token and loading the full user.
 * Attaches the user document to req.user (with password excluded).
 */
const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new ApiError(401, 'Not authorized, no token provided');
    }

    const decoded = jwt.verify(token, config.jwtSecret);

    // Load the full user document so RBAC + governance fields are available.
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new ApiError(401, 'User no longer exists');
    }
    if (!user.isActive) {
      throw new ApiError(401, 'Account is deactivated');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      return sendError(res, error);
    }
    return sendError(res, new ApiError(401, 'Not authorized, token failed'));
  }
};

/**
 * Optional auth — attaches the user if a valid token is present,
 * but does not fail when absent. Useful for public feeds that personalize
 * when logged in (e.g. "hasSupported" flags).
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = jwt.verify(token, config.jwtSecret);
      const user = await User.findById(decoded.id);
      if (user && user.isActive) {
        req.user = user;
      }
    }
  } catch {
    // Ignore token errors in optional auth.
  }
  next();
};

/**
 * Restricts access to specific roles. Must be used after protect().
 * @param  {...string} roles - allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, new ApiError(401, 'Not authorized, no user found'));
    }
    if (!roles.includes(req.user.role)) {
      return sendError(
        res,
        new ApiError(
          403,
          `Role '${req.user.role}' is not authorized to access this resource`
        )
      );
    }
    next();
  };
};

/**
 * Restricts access to authority roles only (ward_officer and above).
 */
const authorizeAuthority = (req, res, next) => {
  const authorityRoles = ['ward_officer', 'department_head', 'super_admin'];
  if (!req.user) {
    return sendError(res, new ApiError(401, 'Not authorized, no user found'));
  }
  if (!authorityRoles.includes(req.user.role)) {
    return sendError(
      res,
      new ApiError(403, 'Only authority accounts can access this resource')
    );
  }
  next();
};

export { protect, optionalAuth, authorize, authorizeAuthority };
