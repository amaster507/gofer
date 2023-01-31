import type { Config } from 'jest'

const config: Config = {
  roots: ['<rootDir>'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      './config/fileTransformer.js',
  },
  globals: {
    transform: {
      '^.+\\.(ts|tsx)$': ['ts-jest', 'tsconfig.json'],
    },
  },
  fakeTimers: {
    enableGlobally: true,
    now: new Date('2023-01-11T00:15:27.216Z').getTime(),
  },
}

export default config
