/**
 * File: server.js
 * Description: Server entry point for starting the HTTP network listener.
 *
 * Implementation details:
 * - Imports the pre-configured Express application from src/app.js.
 * - Binds port (default 3000 or process.env.PORT).
 * - Kept strictly under 10 lines to decouple app setup from server execution.
 */

import app from './src/app.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});