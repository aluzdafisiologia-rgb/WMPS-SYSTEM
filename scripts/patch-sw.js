#!/usr/bin/env node
/**
 * patch-sw.js
 *
 * Script pós-build que remove o handler "start-url" problemático do sw.js.
 * O handler usa `_async_to_generator` + `_ts_generator` que não estão disponíveis
 * no contexto do service worker, causando:
 *   ReferenceError: _async_to_generator is not defined
 */

const fs = require('fs');
const path = require('path');

const swPath = path.join(process.cwd(), 'public', 'sw.js');

if (!fs.existsSync(swPath)) {
  console.log('[patch-sw] sw.js não encontrado, pulando patch.');
  process.exit(0);
}

let content = fs.readFileSync(swPath, 'utf8');
const before = content;

// Abordagem: encontrar e remover o bloco registerRoute para a rota "/"
// que contém o handler cacheWillUpdate com _async_to_generator.
// O padrão é: e.registerRoute("/",new e.NetworkFirst({cacheName:"start-url",...}),"GET"),
// Usamos indexOf para encontrar o trecho exato e removê-lo via string slicing

const START_MARKER = 'e.registerRoute("/",new e.NetworkFirst({cacheName:"start-url"';
const END_SUFFIX = '),"GET"),';

const startIdx = content.indexOf(START_MARKER);
if (startIdx === -1) {
  console.warn('[patch-sw] ⚠️  Marcador start-url não encontrado. O sw.js pode não ter o handler, ou o formato mudou.');
} else {
  // Encontra o fim do bloco: busca o próximo "),"GET")," após o início
  const searchFrom = startIdx + START_MARKER.length;
  const endIdx = content.indexOf(END_SUFFIX, searchFrom);

  if (endIdx === -1) {
    console.warn('[patch-sw] ⚠️  Não foi possível encontrar o fim do bloco start-url.');
  } else {
    const fullEnd = endIdx + END_SUFFIX.length;
    content = content.slice(0, startIdx) + content.slice(fullEnd);
    fs.writeFileSync(swPath, content, 'utf8');
    console.log('[patch-sw] ✅ Handler start-url removido com sucesso do sw.js');
  }
}

// Verifica se ainda contém _async_to_generator
if (content.includes('_async_to_generator')) {
  console.warn('[patch-sw] ⚠️  _async_to_generator ainda detectado no sw.js! Patch pode ter falhado.');
  process.exit(1);
} else {
  console.log('[patch-sw] ✅ sw.js está limpo de _async_to_generator');
}
