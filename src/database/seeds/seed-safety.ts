export interface SeedSafetyOptions {
  allowPlaceholderData?: boolean;
}

export function assertSeedEnvironment(env: NodeJS.ProcessEnv, options: SeedSafetyOptions = {}): void {
  const nodeEnv = (env.NODE_ENV || 'development').toLowerCase();
  if (!['development', 'test'].includes(nodeEnv)) {
    throw new Error('Seeds are blocked outside development/test environments.');
  }
  if (options.allowPlaceholderData) {
    if (nodeEnv !== 'development') throw new Error('Placeholder pilot data is allowed only in development.');
    if (env.SEED_ALLOW_PLACEHOLDER_DATA !== 'true') {
      throw new Error('Set SEED_ALLOW_PLACEHOLDER_DATA=true to seed placeholder pilot data locally.');
    }
  }
}

export function requireSeedAdminCredentials(env: NodeJS.ProcessEnv): { email: string; password: string } {
  const email = env.SEED_ADMIN_EMAIL?.trim();
  const password = env.SEED_ADMIN_PASSWORD;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('SEED_ADMIN_EMAIL must contain an explicit valid email.');
  }
  if (/@(?:example\.(?:com|test)|example|localhost)$/i.test(email)) {
    throw new Error('SEED_ADMIN_EMAIL cannot use a placeholder domain.');
  }
  if (!password || password.length < 16) {
    throw new Error('SEED_ADMIN_PASSWORD must be set and at least 16 characters.');
  }
  const normalized = password.toLowerCase();
  const forbidden = ['password', 'changeme', 'change_me', 'placeholder', 'admin123', 'example', 'test', 'replace_with', 'your_password'];
  if (forbidden.some((part) => normalized.includes(part))) {
    throw new Error('SEED_ADMIN_PASSWORD cannot be a placeholder or example value.');
  }
  return { email, password };
}
