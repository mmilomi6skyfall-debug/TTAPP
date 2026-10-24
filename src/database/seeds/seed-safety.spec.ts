import { assertSeedEnvironment, requireSeedAdminCredentials } from './seed-safety';

describe('seed safety', () => {
  it('allows ordinary seed only in development or test', () => {
    expect(() => assertSeedEnvironment({ NODE_ENV: 'development' })).not.toThrow();
    expect(() => assertSeedEnvironment({ NODE_ENV: 'test' })).not.toThrow();
  });
  it.each(['production', 'staging'])('blocks seed in %s', (NODE_ENV) => {
    expect(() => assertSeedEnvironment({ NODE_ENV })).toThrow(/blocked/);
  });
  it('requires explicit opt-in for placeholder data in development only', () => {
    expect(() => assertSeedEnvironment({ NODE_ENV: 'development' }, { allowPlaceholderData: true })).toThrow(/SEED_ALLOW_PLACEHOLDER_DATA/);
    expect(() => assertSeedEnvironment({ NODE_ENV: 'development', SEED_ALLOW_PLACEHOLDER_DATA: 'true' }, { allowPlaceholderData: true })).not.toThrow();
    expect(() => assertSeedEnvironment({ NODE_ENV: 'staging', SEED_ALLOW_PLACEHOLDER_DATA: 'true' }, { allowPlaceholderData: true })).toThrow();
  });
  it('requires explicit non-placeholder admin credentials', () => {
    expect(() => requireSeedAdminCredentials({})).toThrow(/SEED_ADMIN_EMAIL/);
    expect(() => requireSeedAdminCredentials({ SEED_ADMIN_EMAIL: 'admin@example.test', SEED_ADMIN_PASSWORD: 'change_me_password_123' })).toThrow(/placeholder/);
    expect(() => requireSeedAdminCredentials({ SEED_ADMIN_EMAIL: 'local-admin@local.test', SEED_ADMIN_PASSWORD: 'REPLACE_WITH_LOCAL_RANDOM_PASSPHRASE_AT_LEAST_16_CHARS' })).toThrow(/placeholder/);
    expect(() => requireSeedAdminCredentials({ SEED_ADMIN_EMAIL: 'local-admin@local.test', SEED_ADMIN_PASSWORD: 'local-only-strong-passphrase-938' })).not.toThrow();
  });
});
