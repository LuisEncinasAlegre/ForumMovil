// Configuración de Jest solo para las pruebas de la base de datos.
// No usa jest-expo porque ese preset reemplaza fetch y las llamadas a Supabase fallarían.
module.exports = {
  rootDir: '..',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/db-tests/**/*.test.ts'],
  transform: {
    '\.ts$': ['babel-jest', { presets: ['babel-preset-expo'] }],
  },
};
