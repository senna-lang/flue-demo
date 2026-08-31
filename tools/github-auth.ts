/**
 * GitHub 認証トークンの解決。
 *
 * `.env.example` 由来のプレースホルダは未設定として扱う。
 * 未設定時は gh が keyring を使い、コメント投稿は dry-run になる。
 */
export function resolveGithubToken(): string | undefined {
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token || token === '...' || token.endsWith('...')) return undefined;
  return token;
}

export function githubCliEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  if (!resolveGithubToken()) {
    delete env.GITHUB_TOKEN;
    delete env.GH_TOKEN;
  }
  return env;
}
