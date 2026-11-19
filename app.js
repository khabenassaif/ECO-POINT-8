// Express entrypoint for Vercel's automatic Express framework detection.
// Keep routing in the original server adapter and preserve the request path.
import express from 'express';
import ecoPoint from './render-server/index.js';
const app = express();
app.use(ecoPoint);
export default app;
