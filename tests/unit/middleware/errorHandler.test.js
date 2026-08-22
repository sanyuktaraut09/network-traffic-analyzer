/**
 * Folder: tests/unit/middleware/
 * Description: Unit test suite for central errorHandler middleware.
 *
 * File: tests/unit/middleware/errorHandler.test.js
 * Implementation details:
 * - Mocks Express req, res, next parameters.
 * - Verifies correct HTTP status code formatting (custom status vs default 500).
 * - Ensures uniform JSON error response payload shape (error.message, status, path, timestamp).
 */

import { jest } from '@jest/globals';
import { errorHandler } from '../../../src/middleware/errorHandler.js';

describe('errorHandler Middleware — Unit Tests', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = { path: '/api/test-path' };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  test('should return status code and message provided by custom Error object', () => {
    const error = new Error('Bad request validation error');
    error.status = 400;

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: 'Bad request validation error',
        status: 400,
        path: '/api/test-path',
        timestamp: expect.any(String)
      }
    });
  });

  test('should default to status 500 Internal Server Error when status/message omitted', () => {
    const error = new Error();

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: 'Internal Server Error',
        status: 500,
        path: '/api/test-path',
        timestamp: expect.any(String)
      }
    });
  });
});
