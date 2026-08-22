/**
 * Folder: src/middleware/
 * Description: Generic request parameter and body validation middleware powered by Zod.
 *
 * File: src/middleware/validate.js
 * Implementation details:
 * - validateQuery validates req.query against passed Zod schema and attaches validated params to req.validatedQuery.
 * - validateBody validates req.body against passed Zod schema and attaches validated body to req.validatedBody.
 * - Returns structured 400 Bad Request error response containing detailed validation issue details.
 */

/**
 * Middleware wrapper validating HTTP query parameters with a Zod schema.
 * @param {z.ZodSchema} schema - Zod validation schema
 * @returns {Function} Express middleware function
 */
export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        error: {
          message: 'Validation failed for query parameters',
          status: 400,
          path: req.path,
          details: result.error.flatten(),
          timestamp: new Date().toISOString()
        }
      });
    }
    req.validatedQuery = result.data;
    next();
  };
}

/**
 * Middleware wrapper validating HTTP request body with a Zod schema.
 * @param {z.ZodSchema} schema - Zod validation schema
 * @returns {Function} Express middleware function
 */
export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: {
          message: 'Validation failed for request body',
          status: 400,
          path: req.path,
          details: result.error.flatten(),
          timestamp: new Date().toISOString()
        }
      });
    }
    req.validatedBody = result.data;
    next();
  };
}
