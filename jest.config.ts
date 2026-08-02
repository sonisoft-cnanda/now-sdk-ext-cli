import type { JestConfigWithTsJest } from "ts-jest";

const config: JestConfigWithTsJest = {
  collectCoverageFrom: [
    // .tsx must be listed explicitly — "src/**/*.ts" silently excludes it and
    // coverage would look healthy while measuring none of the UI.
    "src/**/*.{ts,tsx}",
    "!src/index.ts",
  ],
  coverageReporters: ["html", "text", "text-summary", "cobertura"],
  detectOpenHandles: true,
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  testMatch: ["**/*.test.js", "**/*.test.ts", "**/*.test.tsx"],
  testTimeout:50_000,
  transform: {
    // NOTE: the old pattern "^.+\\.ts?$" bound the ? to the s — it matched
    // .ts and .t but never .tsx. "tsx?" is the intended expression.
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
      },
    ],
  },
  verbose: true,
};

export default config;