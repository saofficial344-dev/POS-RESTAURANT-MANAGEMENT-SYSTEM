import mongoose from 'mongoose';

/**
 * Middleware factory — validates that req.params[paramName] is a valid MongoDB ObjectId.
 * Returns 400 immediately if invalid, preventing BSON CastError stack traces from
 * leaking through the global error handler.
 *
 * Usage: router.get('/:id', validateObjectId(), handler)
 *        router.get('/:userId', validateObjectId('userId'), handler)
 */
const validateObjectId = (paramName = 'id') => (req, res, next) => {
  const value = req.params[paramName];
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return res.status(400).json({ message: `Invalid ${paramName}: must be a valid ID` });
  }
  next();
};

export default validateObjectId;
