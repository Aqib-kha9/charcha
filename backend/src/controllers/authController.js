import crypto from 'crypto';
import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import ApiError from '../utils/ApiError.js';
import { resolveAreaName } from '../utils/geoUtils.js';

/**
 * Auth Controller (doc §5.1.1)
 * ─────────────────────────────────────────────────────────
 * Handles registration, login, and profile retrieval for both citizens
 * and authorities. Authority accounts carry governance fields
 * (department, ward, designation) per doc §5.1.11.1.
 */

/**
 * Register a new user (citizen or authority).
 * POST /api/auth/register
 */
export const register = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      role = 'citizen',
      department,
      ward,
      zone,
      designation,
      latitude,
      longitude,
      areaName,
    } = req.body;

    // Check for existing user.
    const existing = await User.findOne({ email: email?.toLowerCase() });
    if (existing) {
      throw new ApiError(409, 'Email is already registered');
    }

    // Authority accounts require department + designation.
    if (role !== 'citizen') {
      if (!department) {
        throw new ApiError(400, 'Authority accounts require a department');
      }
      if (!designation) {
        throw new ApiError(400, 'Authority accounts require a designation');
      }
    }

    // Resolve area name from coordinates if not provided.
    let resolvedArea = areaName || '';
    if (!resolvedArea && latitude && longitude) {
      resolvedArea = resolveAreaName(latitude, longitude);
    }

    const user = await User.create({
      name,
      email,
      password,
      phone,
      role,
      department: role !== 'citizen' ? department : null,
      ward: role === 'ward_officer' ? ward : null,
      zone: role !== 'citizen' ? zone : null,
      designation: role !== 'citizen' ? designation : null,
      // Authority accounts are pre-verified for the hackathon demo.
      isVerifiedAuthority: role !== 'citizen',
      location: latitude && longitude
        ? {
            type: 'Point',
            coordinates: [longitude, latitude],
            areaName: resolvedArea,
          }
        : undefined,
    });

    const token = generateToken(user._id, user.role);

    return sendSuccess(res, 201, 'Account created successfully', {
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    if (error instanceof ApiError) return sendError(res, error);
    return sendError(res, new ApiError(500, error.message));
  }
};

/**
 * Login a user and return a JWT.
 * POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ApiError(400, 'Please provide email and password');
    }

    // Explicitly select the password field.
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      '+password'
    );

    if (!user || !(await user.matchPassword(password))) {
      throw new ApiError(401, 'Invalid credentials');
    }

    if (!user.isActive) {
      throw new ApiError(401, 'Account is deactivated');
    }

    const token = generateToken(user._id, user.role);

    return sendSuccess(res, 200, 'Login successful', {
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    if (error instanceof ApiError) return sendError(res, error);
    return sendError(res, new ApiError(500, error.message));
  }
};

/**
 * Get the current logged-in user's profile.
 * GET /api/auth/me
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    return sendSuccess(res, 200, 'Profile retrieved', {
      user: sanitizeUser(user),
    });
  } catch (error) {
    if (error instanceof ApiError) return sendError(res, error);
    return sendError(res, new ApiError(500, error.message));
  }
};

/**
 * Update the current user's profile (name, phone, avatar, location).
 * PUT /api/auth/me
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, avatarUrl, latitude, longitude, areaName } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) throw new ApiError(404, 'User not found');

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    if (latitude && longitude) {
      user.location = {
        type: 'Point',
        coordinates: [longitude, latitude],
        areaName: areaName || resolveAreaName(latitude, longitude),
      };
    }

    await user.save();

    return sendSuccess(res, 200, 'Profile updated', {
      user: sanitizeUser(user),
    });
  } catch (error) {
    if (error instanceof ApiError) return sendError(res, error);
    return sendError(res, new ApiError(500, error.message));
  }
};

/**
 * Strip sensitive fields before sending the user to the client.
 */
const sanitizeUser = (user) => {
  const obj = user.toObject({ virtuals: true });
  delete obj.password;
  return obj;
};

export default { register, login, getMe, updateProfile };
