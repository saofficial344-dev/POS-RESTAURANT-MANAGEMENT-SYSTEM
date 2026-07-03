const REQUIRED = [
  'MONGO_URI',
  'JWT_SECRET',
  'JWT_SECRET_PLATFORM',
];

export const validateEnv = () => {
  const missing = REQUIRED.filter((v) => !process.env[v]);
  if (missing.length) {
    console.error(
      `[Env] FATAL — missing required environment variables:\n  ${missing.join('\n  ')}`
    );
    process.exit(1);
  }
};
