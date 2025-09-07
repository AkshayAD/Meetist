// Jest setup file
// Mock fetch for API calls
global.fetch = jest.fn();

// Silence console warnings during tests
const originalWarn = console.warn;
const originalError = console.error;
console.warn = jest.fn();
console.error = jest.fn();

// Basic timer setup
jest.setTimeout(30000);