/**
 * PROJECT ROLE: Give React one shared way to send requests to Laravel.
 * App.tsx imports api for requests and prepareCsrf before signup or login.
 * Keeping these settings here avoids repeating them in each component.
 * Laravel, not this file, decides who may access protected data.
 */
import axios from 'axios';

// Axios sends HTTP requests. export lets other files import this instance.
export const api = axios.create({
  // Use the frontend origin; Vite forwards backend paths to Laravel.
  baseURL: '/',
  // Allow cookies on credentialed requests. Laravel uses a session cookie
  // to recognize the logged-in browser; we do not store a login token here.
  withCredentials: true,
  // Send the XSRF header using the CSRF cookie when available. Laravel checks
  // it to help prevent other websites from submitting unwanted actions.
  withXSRFToken: true,
  headers: {
    // Ask for JSON data, including JSON error responses.
    Accept: 'application/json',
  },
});

// Ask Laravel to set the CSRF cookie before submitting signup or login.
// async returns a Promise: the operation will finish later.
// await waits inside this function without freezing the browser screen.
export async function prepareCsrf() {
  await api.get('/sanctum/csrf-cookie');
}
