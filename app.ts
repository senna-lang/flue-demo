/**
 * アプリケーションのルートマップ。
 *
 * PrReview エージェントを /agents/pr-review にHTTP公開しつつ、
 * GitHub Webhookの検証済み受け口を /channels/github にマウントする。
 * pull_request イベントが届くと channels/github.ts が PrReview へ dispatch する。
 */
import { createAgentRouter } from '@flue/runtime/routing';
import { Hono } from 'hono';
import { PrReview } from './agents/pr-review.ts';
import { channel as github } from './channels/github.ts';

const app = new Hono();

app.route('/agents/pr-review', createAgentRouter(PrReview));
app.route('/channels/github', github.route());

export default app;
