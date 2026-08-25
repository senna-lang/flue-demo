import { defineConfig } from 'vite';
import { flue } from '@flue/vite';

// flue() プラグインが 'use agent' ディレクティブを持つファイルをスキャンし、
// エージェントの登録・ビルドを自動化する。
export default defineConfig({
  plugins: [flue()],
});
