export async function loadJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Failed to load ${url}: ${response.status}`);
  return response.json();
}

export async function loadPatternLibrary(manifestUrl = './data/patterns-manifest.json') {
  const manifest = await loadJson(manifestUrl);
  const base = new URL(manifestUrl, window.location.href);
  const patternLists = await Promise.all((manifest.packs || []).map(async pack => {
    const url = new URL(pack.src, base).href;
    const data = await loadJson(url);
    return data.patterns || [];
  }));
  return { manifest, patterns: patternLists.flat() };
}
