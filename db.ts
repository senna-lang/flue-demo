/**
 * 永続化アダプタ。ローカル開発用にファイルベースのSQLiteを使う。
 * 本番運用時はPostgres等の他アダプタに差し替えられる。
 */
import { sqlite } from '@flue/runtime/node';

export default sqlite('./.flue/dev.db');
