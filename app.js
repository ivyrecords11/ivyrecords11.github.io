const projects = [
  {name:'Kaisei Visualizer',repo:'kaisei-visualizer',category:'sound',language:'TypeScript',description:'USTX 악보와 오디오로 합창 파트와 피치가 보이는 영상을 만드는 웹 도구.',live:'https://ivyrecords11.github.io/kaisei-visualizer/'},
  {name:'2D Todo Tierlist',repo:'2d-todo-tierlist',category:'tools',language:'JavaScript',description:'중요도와 긴급도, 두 축 위에 할 일과 목표를 배치하는 보드.',live:'https://ivyrecords11.github.io/2d-todo-tierlist/'},
  {name:'OpenUtau LEAP',repo:'openutau-LEAP',category:'sound',language:'C#',description:'한글·일본어·영어 가사를 연결하는 OpenUtau 다국어 포네마이저.'},
  {name:'UTAU IV Voicebank',repo:'UTAU-IV-VB',category:'sound',language:'UTAU',description:'iv=p의 UTAU 보이스뱅크 프로젝트.'},
  {name:'MNIST MLP Accelerator',repo:'MNIST-MLP-Accelerator',category:'research',language:'Verilog',description:'디지털 시스템 설계 수업에서 만든 MNIST MLP 하드웨어 가속기.'},
  {name:'Cerebellum Controller',repo:'Controller-of-balancing-ball-on-plane-inspired-by-cerebellum',category:'research',language:'Python',description:'소뇌에서 영감을 얻은 평면 위 공의 균형 제어 프로젝트.'},
  {name:'Winter Scarf',repo:'winter-scarf-pilot-write',category:'research',language:'Jupyter Notebook',description:'PyTorch, SpikingJelly, MuJoCo를 활용한 스파이킹 신경망 강화학습 실험.'},
  {name:'Discord ChatTAU Bot',repo:'discord-ChatTAU-bot',category:'tools',language:'시작 단계',description:'앞으로 자라날 작은 Discord 봇 프로젝트.'}
];
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
let activeFilter='all';
const grid=document.querySelector('#grid'), search=document.querySelector('#search');
function render(){
  const query=search.value.trim().toLocaleLowerCase();
  const visible=projects.filter(project=>(activeFilter==='all'||project.category===activeFilter)&&`${project.name} ${project.description} ${project.language}`.toLocaleLowerCase().includes(query));
  grid.innerHTML=visible.map(project=>`<article class="project"><h3>${escapeHtml(project.name)}</h3><p>${escapeHtml(project.description)}</p><p class="meta">${escapeHtml(project.language)}</p><p class="project-links">${project.live?`<a href="${escapeHtml(project.live)}" target="_blank" rel="noopener noreferrer">사이트 열기</a><span aria-hidden="true"> · </span>`:''}<a href="https://github.com/ivyrecords11/${encodeURIComponent(project.repo)}" target="_blank" rel="noopener noreferrer">GitHub 저장소</a></p></article>`).join('');
  document.querySelector('#result').textContent=`${visible.length}개 프로젝트`;
  document.querySelector('#empty').hidden=visible.length>0;
}
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
  activeFilter=button.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
  render();
}));
search.addEventListener('input',render);
render();