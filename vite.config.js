import { defineConfig } from 'vite';
import magicBus from './api/magic-bus.js';

function mountMagicBus(server) {
  server.middlewares.use('/api/magic-bus', magicBus);
}

export default defineConfig({
  plugins:[{
    name:'homebase-magic-bus',
    configureServer:mountMagicBus,
    configurePreviewServer:mountMagicBus
  }]
});
