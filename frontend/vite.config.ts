/**
 * PROJECT ROLE: Configure the tool that runs our React app during development.
 * Vite serves React on port 5173. Laravel runs separately on port 8000.
 * The proxy forwards backend requests from React to Laravel.
 * Example: React requests /login -> Vite forwards it to localhost:8000/login.
 * These proxy settings are for development, not production hosting.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// defineConfig helps our editor check and explain Vite settings.
export default defineConfig({
  // Enable React support, including quick updates when we save a component.
  plugins: [react()],
  server: {
    port: 5173,
    // Stop if this port is busy instead of silently using a different port.
    // Our Laravel session configuration expects the frontend on port 5173.
    strictPort: true,
    proxy: {
      // Forward URLs beginning with these paths to the Laravel backend.
      '/api': 'http://localhost:8000', // Protected data, such as /api/user.
      '/sanctum': 'http://localhost:8000', // Get the CSRF protection cookie.
      '/login': 'http://localhost:8000', // Sign in to an existing account.
      '/register': 'http://localhost:8000', // Create an account.
      '/logout': 'http://localhost:8000', // End the current session.
    },
  },
});
