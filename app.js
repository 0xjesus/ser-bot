import primate from '@thewebchimp/primate';
import {router as defaultRoutes } from './routes/default.js';

await primate.setup();
await primate.start();

primate.app.use('/', defaultRoutes);
