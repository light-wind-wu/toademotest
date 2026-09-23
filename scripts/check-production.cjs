const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const net = require('node:net');

async function main() {
  const socket = net.createServer();
  socket.listen(0, '127.0.0.1');
  await once(socket, 'listening');
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));

  const server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(port)], {
    env: { ...process.env, NODE_ENV: 'production' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  server.stdout.on('data', (chunk) => { output += chunk; });
  server.stderr.on('data', (chunk) => { output += chunk; });
  const origin = `http://127.0.0.1:${port}`;
  async function get(path) {
    return fetch(`${origin}${path}`, { redirect: 'manual', signal: AbortSignal.timeout(10000) });
  }

  try {
    let ready = false;
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      assert.equal(server.exitCode, null, `Production server stopped:\n${output}`);
      try { ready = (await get('/')).status === 200; } catch {}
      if (ready) break;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assert.ok(ready, `Production server did not become ready:\n${output}`);
    for (const path of ['/catlog', '/apply/dashboard', '/apply/profile', '/apply/settings', '/apply/education', '/apply/contact-us']) {
      const response = await get(path);
      assert.equal(response.status, 200, `${path} returned ${response.status}`);
      const html = await response.text();
      assert.match(html, /<html/i, `${path} did not return HTML`);
      const assets = [...html.matchAll(/(?:src|href)="([^" ]*\/_next\/static\/[^" ]+)"/g)].map((match) => match[1].replaceAll('&amp;', '&'));
      for (const extension of ['.js', '.css']) {
        const asset = assets.find((url) => url.split('?')[0].endsWith(extension));
        assert.ok(asset, `${path} is missing ${extension} assets`);
        assert.equal((await get(asset)).status, 200, `Missing asset: ${asset}`);
      }
      console.log(`PASS ${path} and production assets`);
    }
    const config = await get('/api/cloud-config');
    assert.equal(config.status, 200);
    assert.equal(typeof (await config.json()).configured, 'boolean');
    console.log('PASS /api/cloud-config');
  } catch (error) {
    console.error(output);
    throw error;
  } finally {
    if (server.exitCode === null) {
      const stopped = once(server, 'exit');
      server.kill('SIGTERM');
      const timer = setTimeout(() => server.kill('SIGKILL'), 5000);
      await stopped;
      clearTimeout(timer);
    }
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
