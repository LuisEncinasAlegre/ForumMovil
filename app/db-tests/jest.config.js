// Configuración de Jest solo para las pruebas de la base de datos.
// No usa jest-expo porque ese preset reemplaza fetch y las llamadas a Supabase fallarían.
module.exports = {
  rootDir: '..',
  testEnvironment: 'node',
  // todo va por la red al proyecto de Supabase: 5 s (el valor normal) se queda corto
  testTimeout: 30000,
  testMatch: ['<rootDir>/db-tests/**/*.test.ts'],
  transform: {
    '\.ts$': ['babel-jest', { presets: ['babel-preset-expo'] }],
  },
};
