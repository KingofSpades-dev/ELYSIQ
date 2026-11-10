import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const embedDir = path.join(rootDir, 'embed');
const publicWidgetDir = path.join(rootDir, 'public', 'widget');

console.log('[Widget Build] Starting Vite build for widget...');
execSync('npx vite build', { cwd: embedDir, stdio: 'inherit' });

console.log('[Widget Build] Copying files to public/widget...');
if (fs.existsSync(publicWidgetDir)) {
  fs.rmSync(publicWidgetDir, { recursive: true, force: true });
}
fs.mkdirSync(publicWidgetDir, { recursive: true });

// Copy embed/dist to public/widget
const distDir = path.join(embedDir, 'dist');
fs.cpSync(distDir, publicWidgetDir, { recursive: true });

// Copy embed/public/embed.js to public/widget/embed.js
const embedJsSource = path.join(embedDir, 'public', 'embed.js');
const embedJsDest = path.join(publicWidgetDir, 'embed.js');
fs.copyFileSync(embedJsSource, embedJsDest);

console.log('[Widget Build] Widget successfully bundled to Next.js public directory.');
