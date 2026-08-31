/**
 * resolveGithubToken の公開APIを検証する。
 * プレースホルダと空文字は未設定、実トークンだけ通す。
 */
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { githubCliEnv, resolveGithubToken } from './github-auth.ts';

const originalGithub = process.env.GITHUB_TOKEN;
const originalGh = process.env.GH_TOKEN;

afterEach(() => {
  if (originalGithub === undefined) delete process.env.GITHUB_TOKEN;
  else process.env.GITHUB_TOKEN = originalGithub;
  if (originalGh === undefined) delete process.env.GH_TOKEN;
  else process.env.GH_TOKEN = originalGh;
});
describe('resolveGithubToken', () => {
  it('treats missing token as unset', () => {
    delete process.env.GITHUB_TOKEN;
    assert.equal(resolveGithubToken(), undefined);
  });

  it('treats ellipsis placeholder as unset', () => {
    process.env.GITHUB_TOKEN = '...';
    assert.equal(resolveGithubToken(), undefined);
  });

  it('treats example suffix placeholder as unset', () => {
    process.env.GITHUB_TOKEN = 'sk-ant-...';
    assert.equal(resolveGithubToken(), undefined);
  });

  it('returns a real token', () => {
    process.env.GITHUB_TOKEN = 'gho_real_token_value';
    assert.equal(resolveGithubToken(), 'gho_real_token_value');
  });

  it('drops placeholder from gh env so keyring can be used', () => {
    process.env.GITHUB_TOKEN = '...';
    process.env.GH_TOKEN = '...';
    const env = githubCliEnv();
    assert.equal(env.GITHUB_TOKEN, undefined);
    assert.equal(env.GH_TOKEN, undefined);
  });
});
