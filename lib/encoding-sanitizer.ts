/**
 * Utilitário de Sanitização Global de Encoding
 * 
 * Usado para normalizar entradas de usuário e strings dinâmicas do banco de dados,
 * evitando a reintrodução de "mojibake" ou caracteres corrompidos.
 */

export function sanitizeEncoding(text: string): string {
  if (!text || typeof text !== 'string') return text;

  // Mapa de caracteres corrompidos comuns
  const mojibakeMap: Record<string, string> = {
    'Ã¡': 'á', 'Ã©': 'é', 'Ã­': 'í', 'Ã³': 'ó', 'Ãº': 'ú',
    'Ã¢': 'â', 'Ãª': 'ê', 'Ã®': 'î', 'Ã´': 'ô', 'Ã»': 'û',
    'Ã£': 'ã', 'Ãµ': 'õ',
    'Ã§': 'ç',
    'Ã ': 'à',
    'Ã\x81': 'Á', 'Ã\x89': 'É', 'Ã\x8D': 'Í', 'Ã\x93': 'Ó', 'Ã\x9A': 'Ú',
    'Ã\x82': 'Â', 'Ã\x8A': 'Ê', 'Ã\x8E': 'Î', 'Ã\x94': 'Ô', 'Ã\x9B': 'Û',
    'Ã\x83': 'Ã', 'Ã\x95': 'Õ',
    'Ã\x87': 'Ç',
    'Ã\x80': 'À',
    'Ã“': 'Ó', 'Ã‰': 'É', 'Ãš': 'Ú', 'Ã‡': 'Ç',
    'Âº': 'º', 'Âª': 'ª', 'Â°': '°',
    'â€“': '–', 'â€”': '—',
  };

  let sanitized = text;

  // Substituição preventiva rápida
  for (const [corrupted, fixed] of Object.entries(mojibakeMap)) {
    if (sanitized.includes(corrupted)) {
      sanitized = sanitized.split(corrupted).join(fixed);
    }
  }

  // Se o texto ainda contiver o caractere de reposição universal (),
  // ele não pode ser totalmente recuperado, mas podemos tentar limpar.
  if (sanitized.includes('')) {
    console.warn('SanitizeEncoding: Caractere irrecuperável detectado na string.');
    // sanitized = sanitized.replace(//g, ''); // Opcional: remover lixo
  }

  // Normalização NFD/NFC para garantir que caracteres acentuados usem o mesmo padrão de bytes
  return sanitized.normalize('NFC');
}
