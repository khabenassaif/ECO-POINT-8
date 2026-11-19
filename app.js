// Vercel detects this Express entrypoint and serves it as a Node.js Function.
// The original Render server continues to listen only outside Vercel.
import app from './render-server/index.js';
export default app;
