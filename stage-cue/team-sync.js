(() => {
 const config = window.stageCueTeamConfig;
 const editor = window.stageCueEditor;
 if (!config || !editor) return;

 const $ = id => document.getElementById(id);
 const dialog = $('teamDialog');
 const button = document.createElement('button');
 button.textContent = '팀 프로젝트';
 document.querySelector('header .tools').append(button);
 const controls = [...dialog.querySelectorAll('button, input')];
 const adminName = '이가연';
 let community = {comments:[], activity:[]};
 const endpoint = new URL(config.api ?? '/api/team', location.href).href;
 const invite = new URLSearchParams(location.hash.slice(1)).get('team');
 let adminToken = '';
 try { adminToken = sessionStorage.getItem('stage-cue-admin-key') ?? ''; } catch {}
 let roomKey = '';
 try {
  roomKey = sessionStorage.getItem(endpoint) ?? '';
  if (invite && /^[a-f0-9]{64}$/.test(invite)) {
   roomKey = invite;
   sessionStorage.setItem(endpoint, invite);
   history.replaceState(null, '', location.pathname + location.search);
  }
 } catch {
  if (invite && /^[a-f0-9]{64}$/.test(invite)) roomKey = invite;
 }
 let editorName = '';
 let localProject;
 let workspace;
 let busy = false;

 function render() {
  $('teamJoin').hidden = !!workspace || !roomKey;
  $('teamIdentity').hidden = !workspace;
  $('teamIdentity').textContent = workspace ? '편집자 · ' + editorName + (editorName === adminName ? (adminToken ? ' · 관리자' : ' · 관리자 인증 필요') : '') : '';
  window.stageCueCanMoveAmp = () => editorName === adminName && !!adminToken;
  $('commentForm').hidden = !workspace;
  $('teamAdminUnlock').hidden = !workspace || editorName !== adminName || !!adminToken;
  $('teamSave').hidden = !workspace;
  $('teamReload').hidden = !workspace;
  $('teamLocal').hidden = !workspace;
  for (const control of controls) control.disabled = busy;
  $('teamSave').disabled = busy || !!workspace?.conflict;
 }

 function message(text) {
  $('teamStatus').textContent = text;
 }

 async function run(action, errorMessage) {
  if (busy) return;
  busy = true;
  render();
  try {
   await action();
  } catch (error) {
   if (error.status === 403) message(error.code === 'admin_required' ? '앰프 위치는 관리자만 바꿀 수 있어.' : error.code === 'admin_key' ? '관리자 확인 코드가 맞지 않아.' : '팀 초대 링크를 다시 열어 줘.');
   else if (error.status === 400 || error.status === 413) message('이름, 프로젝트 형식 또는 크기를 확인해 줘.');
   else message(errorMessage);
  } finally {
   busy = false;
   render();
  }
 }

 async function request(body) {
  const headers = {'Authorization': 'Bearer ' + roomKey};
  if (body) headers['Content-Type'] = 'application/json';
  const response = await fetch(endpoint, {
   method: body ? 'POST' : 'GET',
   headers,
   body: body ? JSON.stringify(body) : undefined
  });
  if (response.status === 409) return null;
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error('Team request failed'), {status: response.status, code: result.error});
  return result;
 }

 function sharedProject(project) {
  const {scope, speed, ...shared} = project;
  return {...shared, index: 0};
 }

 // JSONB can return object keys in a different order than the browser wrote them.
 function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  return '{' + Object.keys(value).sort().map(key =>
   JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
 }

 function fingerprint(project) {
  return canonical(sharedProject(project));
 }

 function dirty(project) {
  return workspace.conflict || fingerprint(project) !== workspace.baseline;
 }

 function persistDraft(project) {
  const changed = dirty(project);
  try {
   if (changed) {
    localStorage.setItem(workspace.draftKey, JSON.stringify({revision: workspace.revision, project}));
   } else {
    localStorage.removeItem(workspace.draftKey);
   }
  } catch {
   if (changed) {
    editor.status('브라우저에 임시 저장할 수 없어 · JSON으로 백업해 줘');
    return;
   }
  }
  editor.status(workspace.conflict ? '팀 저장 충돌 · 브라우저에 임시 저장' :
   changed ? '브라우저에 임시 저장 · 팀에 저장 필요' : '팀에 저장됨 · v' + workspace.revision);
 }

 function openLocal() {
  if (!workspace) return;
  workspace = null;
  editor.open(localProject, null);
  localProject = null;
 }

 function versionLabel(remote) {
  return '팀 프로젝트 v' + remote.revision + (remote.editor ? ' · 저장한 사람 ' + remote.editor : '');
 }

 async function openTeam() {
  const remote = await request();
  const draftKey = 'stage-cue-team:' + endpoint + ':' + editorName;
  localProject = editor.snapshot();
  const saved = remote.project === null ? null : editor.decode(remote.project);
  let project = saved ?? structuredClone(localProject);
  let revision = remote.revision;
  let conflict = false;
  let rawDraft = null;
  try { rawDraft = localStorage.getItem(draftKey); } catch {}
  if (rawDraft) {
   const draft = JSON.parse(rawDraft);
   project = editor.decode(draft.project);
   revision = draft.revision;
   conflict = revision !== remote.revision && (!saved || fingerprint(project) !== fingerprint(saved));
   if (!conflict) revision = remote.revision;
  }
  workspace = {draftKey, revision, conflict, baseline: saved && fingerprint(saved)};
  editor.open(project, persistDraft);
  await loadCommunity();
  message(conflict ? '다른 팀원이 먼저 저장했어. 현재 초안은 남아 있어. 필요하면 JSON으로 내려받고 최신 버전을 열어 줘.' :
   rawDraft ? '이 브라우저에 남아 있던 팀 초안을 열었어.' :
   saved ? versionLabel(remote) + ' · 열었어.' : '팀 프로젝트가 비어 있어. 지금 배치를 시작본으로 저장할 수 있어.');
 }

 button.onclick = () => {
  dialog.showModal();
  if (!roomKey) message('공유 프로젝트를 열려면 팀 초대 링크로 들어와 줘.');
  else if (workspace) message(workspace.conflict ? '저장 충돌이 있어. 초안을 보관한 뒤 최신 버전을 불러와 줘.' : '팀 프로젝트 v' + workspace.revision + ' 편집 중');
  else message('팀에서 사용할 이름을 입력해 줘.');
 };
 async function loadCommunity() {
  if (!roomKey) return;
  const response = await fetch(new URL('/api/community', endpoint), {headers:{'Authorization':'Bearer ' + roomKey}});
  if (!response.ok) throw Object.assign(new Error('Community request failed'), {status:response.status});
  community = await response.json();
  $('communityMeta').textContent = '관리자 · ' + (community.admin || adminName) + (window.stageCueCanMoveAmp() ? ' · 앰프 위치 편집 가능' : ' · 앰프 위치는 관리자만 편집 가능');
  const comments = $('commentList');
  comments.replaceChildren();
  if (!community.comments?.length) comments.innerHTML = '<li class="empty-community">아직 댓글이 없어.</li>';
  for (const item of community.comments ?? []) {
   const li = document.createElement('li'); li.className = 'community-item';
   const head = document.createElement('header');
   const author = document.createElement('strong'); author.textContent = item.author;
   if (item.author === community.admin) { const badge = document.createElement('span'); badge.className='admin-badge'; badge.textContent='관리자'; author.append(badge); }
   const date = document.createElement('small'); date.textContent = new Date(item.created_at).toLocaleString('ko-KR');
   const body = document.createElement('p'); body.textContent = item.body;
   head.append(author,date); li.append(head,body); comments.append(li);
  }
  const activity = $('activityList'); activity.replaceChildren();
  if (!community.activity?.length) activity.innerHTML = '<li class="empty-community">아직 편집 기록이 없어.</li>';
  for (const item of community.activity ?? []) {
   const li = document.createElement('li'); li.className = 'community-item';
   const head = document.createElement('header');
   const author = document.createElement('strong'); author.textContent = item.editor + ' · v' + item.revision;
   if (item.editor === community.admin) { const badge = document.createElement('span'); badge.className='admin-badge'; badge.textContent='관리자'; author.append(badge); }
   const date = document.createElement('small'); date.textContent = new Date(item.created_at).toLocaleString('ko-KR');
   const detail = document.createElement('p'); detail.textContent = item.details;
   head.append(author,date); li.append(head,detail); activity.append(li);
  }
 }
 $('commentsTab').onclick = () => { $('commentsTab').setAttribute('aria-pressed','true'); $('activityTab').setAttribute('aria-pressed','false'); $('commentsPane').hidden=false; $('activityList').hidden=true; };
 $('activityTab').onclick = () => { $('commentsTab').setAttribute('aria-pressed','false'); $('activityTab').setAttribute('aria-pressed','true'); $('commentsPane').hidden=true; $('activityList').hidden=false; };
 $('commentForm').onsubmit = event => {
  event.preventDefault();
  void run(async () => {
   const body = $('commentBody').value.trim();
   if (!body || !editorName) return;
   const response = await fetch(new URL('/api/comments', endpoint), {method:'POST',headers:{'Authorization':'Bearer '+roomKey,'Content-Type':'application/json'},body:JSON.stringify({author:editorName,body})});
   if (!response.ok) { const result=await response.json(); throw Object.assign(new Error('Comment request failed'), {status:response.status,code:result.error}); }
   $('commentBody').value=''; await loadCommunity(); message('댓글을 남겼어.');
  }, '댓글을 저장하지 못했어. 잠시 뒤 다시 시도해 줘.');
 };
 $('adminUnlock').onclick = () => void run(async () => {
  const candidate = $('teamAdminKey').value;
  const response = await fetch(new URL('/api/admin', endpoint), {method:'POST',headers:{'Authorization':'Bearer '+roomKey,'Content-Type':'application/json'},body:JSON.stringify({adminToken:candidate})});
  if (!response.ok) throw Object.assign(new Error('Admin verification failed'), {status:response.status,code:'admin_key'});
  adminToken = candidate;
  try { sessionStorage.setItem('stage-cue-admin-key', adminToken); } catch {}
  $('teamAdminKey').value='';
  render(); editor.refreshStage(); await loadCommunity(); message('관리자 권한을 확인했어. 앰프 위치를 옮길 수 있어.');
 }, '관리자 코드를 확인하지 못했어.');
 $('teamClose').onclick = () => dialog.close();
 dialog.oncancel = event => { if (busy) event.preventDefault(); };

 $('teamJoin').onsubmit = event => {
  event.preventDefault();
  editorName = $('teamName').value.trim();
  if (!editorName) {
   message('이름을 입력해 줘.');
   return;
  }
  try { localStorage.setItem('stage-cue-editor:' + endpoint, editorName); } catch {}
  void run(openTeam, '팀 프로젝트를 열지 못했어. 잠시 뒤 다시 시도해 줘.');
 };
 $('teamSave').onclick = () => void run(async () => {
  const target = workspace;
  const project = editor.decode(sharedProject(editor.snapshot()));
  if (!dirty(project)) {
   message('팀에 저장할 변경이 없어.');
   return;
  }
  const result = await request({revision: target.revision, project, editor: editorName, adminToken: window.stageCueCanMoveAmp() ? adminToken : ''});
  if (workspace !== target) return;
  if (result === null) {
   target.conflict = true;
   persistDraft(editor.snapshot());
   message('다른 팀원이 먼저 저장했어. 현재 초안을 JSON으로 내려받을 수 있어. 최신 버전을 열면 이 브라우저의 초안이 교체돼.');
   return;
  }
  target.revision = result.revision;
  target.baseline = fingerprint(project);
  editor.status('팀에 저장됨 · v' + target.revision);
  message(versionLabel(result) + ' · 저장했어.');
  persistDraft(editor.snapshot());
 }, '팀 저장 결과를 확인하지 못했어. 이 브라우저의 초안과 최신 버전을 확인해 줘.');

 $('teamReload').onclick = () => void run(async () => {
  if (dirty(editor.snapshot()) && !confirm('현재 팀 초안을 최신 버전으로 교체할까? 필요하면 먼저 JSON으로 내려받아 줘.')) return;
  const target = workspace;
  const remote = await request();
  if (workspace !== target) return;
  if (remote.project === null) {
   message('팀에 저장된 버전이 아직 없어.');
   return;
  }
  const project = editor.decode(remote.project);
  const view = editor.snapshot();
  project.index = Math.min(view.index, project.songs.length - 1);
  project.scope = view.scope;
  project.speed = view.speed;
  target.baseline = fingerprint(project);
  target.revision = remote.revision;
  target.conflict = false;
  editor.open(project, persistDraft);
  message(versionLabel(remote) + ' · 불러왔어.');
 }, '최신 버전을 불러오지 못했어.');

 $('teamLocal').onclick = () => {
  openLocal();
  message('로컬 프로젝트로 돌아왔어.');
  render();
 };
 try { $('teamName').value = localStorage.getItem('stage-cue-editor:' + endpoint) ?? ''; } catch {}
 render();
 setInterval(() => { if (workspace) loadCommunity().catch(() => {}); }, 30000);
 if (invite && roomKey) {
  const guide = $('guideDialog');
  if (guide?.open) guide.addEventListener('close', () => button.click(), {once:true});
  else button.click();
 }
})();
