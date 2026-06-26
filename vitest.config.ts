import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Use forks pool instead of threads for Windows IPC compatibility.
    // The default thread pool can produce ERR_IPC_CHANNEL_CLOSED on
    // some Windows environments with tinypool.
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
