import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';

const product = 'https://mental-model-studio.clever-flint-5576.chatgpt.site/workspace';
await mkdir('docs/demo', { recursive: true });
await mkdir('docs/workspace', { recursive: true });
await cp('public/marketing', 'docs/marketing', { recursive: true });
const landing = (await readFile('public/marketing/index.html', 'utf8'))
  .replace('<html lang="en">', '<html lang="en" data-workspace-url="./workspace/">')
  .replaceAll('"/marketing/', '"./marketing/')
  .replaceAll('href="/workspace?', 'href="./workspace/?')
  .replaceAll('href="/demo"', 'href="./demo/"');
await writeFile('docs/index.html', landing);
await cp('public/downloads/mental-model-demo.html', 'docs/demo/index.html');
await writeFile('docs/workspace/index.html', `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Open Ear to Mind</title><meta name="robots" content="noindex"><link rel="canonical" href="${product}">
<script>const destination=new URL(${JSON.stringify(product)});const view=new URLSearchParams(location.search).get('view');if(['overview','interview','quotes','statements','map','coaching','settings'].includes(view))destination.searchParams.set('view',view);location.replace(destination.href);</script>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:Arial,Helvetica,sans-serif;background:#f8f8f8;color:#242424}main{text-align:center;padding:32px}h1{font-size:28px;font-weight:500}a{display:inline-block;margin-top:12px;padding:14px 22px;border-radius:8px;background:#242424;color:white;text-decoration:none}a:focus-visible{outline:2px solid #777;outline-offset:4px}</style>
</head><body><main><h1>Your research workspace</h1><p>Continue to Ear to Mind and sign in to your account.</p><a href="${product}">Open Ear to Mind</a></main></body></html>`);
await writeFile('docs/.nojekyll', '');
console.log('GitHub Pages ready in docs/: website, demo, and hosted product entry.');
