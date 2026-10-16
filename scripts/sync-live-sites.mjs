const owner = 'ivyrecords11';
const apiHeaders = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
};

async function getJson(url) {
  const response = await fetch(url, { headers: apiHeaders });
  if (!response.ok) throw new Error(`GitHub API ${response.status} for ${url}`);
  return response.json();
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

const repos = await getJson(`https://api.github.com/users/${owner}/repos?per_page=100&sort=pushed`);
const published = [];
for (const repo of repos.filter(item => !item.private && !item.archived && !item.fork)) {
  const response = await fetch(`https://api.github.com/repos/${owner}/${encodeURIComponent(repo.name)}/pages`, { headers: apiHeaders });
  if (response.status === 404) continue;
  if (!response.ok) throw new Error(`GitHub Pages API ${response.status} for ${repo.full_name}`);
  const pages = await response.json();
  if (pages.status !== 'built' || !pages.html_url) continue;
  const title = repo.name.split(/[-_]+/).map(part => ({ '2d': '2D', mnist: 'MNIST', mlp: 'MLP', utau: 'UTAU', ustx: 'USTX' })[part.toLowerCase()] || part[0].toUpperCase() + part.slice(1)).join(' ');
  published.push({ name: title, description: repo.description || 'GitHub Pages에 공개된 프로젝트 사이트입니다.', url: pages.html_url });
}

published.sort((a, b) => a.name.localeCompare(b.name));
if (!published.length) throw new Error('No public, successfully built GitHub Pages sites found; current list left unchanged.');

const items = published.map((site, index) =>
  `  <li><a href="${escapeHtml(site.url)}" target="_blank" rel="noopener noreferrer"><span class="site-number">${String(index + 1).padStart(2, '0')} / WEB APP</span><span class="site-detail"><strong>${escapeHtml(site.name)}</strong><span>${escapeHtml(site.description)}</span></span><span class="site-arrow" aria-hidden="true">↗</span></a></li>`
).join('\n');
const newList = `<ul class="site-list">\n${items}\n</ul>`;
const indexPath = 'index.html';
const html = await (await import('node:fs/promises')).readFile(indexPath, 'utf8');
const start = html.indexOf('<ul class="site-list">');
const end = start < 0 ? -1 : html.indexOf('</ul>', start);
if (start < 0 || end < 0) throw new Error('Could not find .site-list in index.html.');
const oldList = html.slice(start, end + '</ul>'.length);
if (!oldList) throw new Error('Could not find .site-list in index.html.');
if (oldList === newList) {
  console.log(`Published site list already current (${published.length} sites).`);
} else {
  await (await import('node:fs/promises')).writeFile(indexPath, html.replace(oldList, newList), 'utf8');
  console.log(`Updated ${published.length} published site links.`);
}
