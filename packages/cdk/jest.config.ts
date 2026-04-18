export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  snapshotSerializers: ['<rootDir>/test/snapshot-plugin.ts'],
  testPathIgnorePatterns: ['/node_modules/', 'e2e.test.ts'],
};
