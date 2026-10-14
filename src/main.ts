import './style.css';
import { Experience } from './experience';
import { SKILLS } from './timeline';
import type { SkillId, Phase } from './timeline';

const icon = (paths:string, cls='') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const icons={
  infinity:icon('<path d="M12 12C3-1-7 25 12 12S31-1 12 12Z"/>'),
  eye:icon('<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>'),
  reset:icon('<path d="M3 10a9 9 0 1 1 1.2 7M3 4v6h6"/>'),
  sound:icon('<path d="m11 5-6 4H2v6h3l6 4V5Z"/><path d="m17 9 5 6m0-6-5 6"/>'),
  soundOn:icon('<path d="m11 5-6 4H2v6h3l6 4V5Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>'),
  settings:icon('<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2" fill="currentColor"/><circle cx="15" cy="17" r="2" fill="currentColor"/>'),
  expand:icon('<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>'),
  arrow:icon('<path d="M5 12h14m-5-5 5 5-5 5"/>'),
  orbit:icon('<ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-25 12 12)"/><path d="M12 2v3m0 14v3"/><circle cx="12" cy="12" r="2"/>'),
  close:icon('<path d="m6 6 12 12M6 18 18 6"/>'),
};

const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`
  <div class="experience" data-skill="idle">
    <div class="ambient-light" aria-hidden="true"></div>
    <header class="header">
      <a class="brand" href="./" aria-label="LIMITLESS 首页"><span class="brand-mark">${icons.infinity}</span><span>LIMITLESS<span class="brand-caption">JUJUTSU KAISEN · CHARACTER STUDY</span></span></a>
      <div class="header-right"><span class="edition"><i></i> INTERACTIVE EXPERIENCE <span class="edition-index">/ 01</span></span><button class="icon-button" id="help" aria-label="操作说明" title="操作说明">?</button></div>
    </header>

    <main>
      <section class="intro" aria-labelledby="character-name">
        <div class="eyebrow"><span class="tiny-line"></span> 特級呪術師 <span class="dot">·</span> SPECIAL GRADE</div>
        <h1 id="character-name">五条<span>悟</span><span class="name-en">SATORU GOJO</span></h1>
        <p class="quote">天上天下，唯我独尊。</p>
        <div class="intro-rule"></div>
        <div class="technique-label"><span class="label-index">01 —</span> 無下限呪術</div>
        <p class="intro-description">将无限，置于指尖。<br>以六眼洞察咒力，触碰无下限的边界。</p>
        <button class="eyes-button" id="eyes" aria-pressed="false" disabled>${icons.eye}<span id="eye-label">揭开眼罩</span><span class="eye-hint">SIX EYES</span>${icons.arrow}</button>
        <div class="character-facts"><span>术式<span>无下限</span></span><span>所属<span>东京都立咒术高专</span></span></div>
      </section>

      <section class="stage" aria-label="交互式角色展示">
        <div class="stage-watermark" aria-hidden="true">無限</div>
        <div id="viewport"></div>
        <div class="stage-coordinates" aria-hidden="true"><span>DOMAIN / 0.000</span><span>∞</span></div>
        <div class="load-panel" id="load-panel" role="status" aria-live="polite"><div class="loading-symbol">${icons.infinity}</div><span id="load-title">正在构筑无下限</span><div class="load-track"><i id="load-progress"></i></div><span id="load-detail">加载角色与术式</span><button id="retry" hidden>重新加载 ${icons.reset}</button></div>
        <div class="stage-status" id="stage-status"><span class="status-dot"></span><span id="stage-status-text">角色准备中</span><span class="status-separator"></span><span id="fps">— FPS</span></div>
        <div class="orbit-hint">${icons.orbit}<span>拖动旋转 <b>·</b> 滚轮缩放</span></div>
      </section>

      <div class="tools" aria-label="展示设置">
        <button class="tool-button" id="reset-camera" aria-label="镜头复位" title="镜头复位" disabled>${icons.reset}</button>
        <button class="tool-button" id="audio" aria-label="开启音效" aria-pressed="false" title="开启音效">${icons.sound}</button>
        <button class="tool-button" id="settings" aria-label="画质设置" aria-expanded="false" aria-controls="settings-panel" title="画质设置">${icons.settings}</button>
        <button class="tool-button" id="fullscreen" aria-label="进入全屏" title="全屏">${icons.expand}</button>
      </div>
      <div class="settings-panel" id="settings-panel" hidden>
        <div class="settings-heading">展示设置 <span>DISPLAY</span></div>
        <label class="setting-row" for="quality">画面质量<select id="quality"><option value="high">高画质</option><option value="low">流畅</option></select></label>
        <label class="setting-row" for="reduced"><span>减少动态效果<small>关闭震屏与强闪光</small></span><input type="checkbox" id="reduced" /></label>
      </div>

      <section class="techniques" aria-label="选择术式">
        <div class="techniques-heading"><span class="section-overline">CURSED TECHNIQUES</span><h2>术式展开</h2><span class="section-hint" id="section-hint">选择术式，释放咒力</span><button id="cancel" hidden>中止演出 <kbd>ESC</kbd></button></div>
        <div class="skill-list">
          ${(['blue','red','purple'] as SkillId[]).map((id,i)=>{
            const s=SKILLS[id];
            return `<button class="skill-card ${id}" data-id="${id}" aria-label="释放${s.title}" disabled>
              <span class="skill-art" aria-hidden="true"><span class="orb-core"></span><span class="orb-ring one"></span><span class="orb-ring two"></span><span class="orb-ring three"></span></span>
              <span class="skill-copy"><span class="skill-subtitle">${s.subtitle}</span><span class="skill-name">${s.title}<span>${s.english}</span></span><span class="skill-caption">${id==='blue'?'收束万象 · 引力':id==='red'?'逆转咒力 · 斥力':'苍与赫的交汇 · 湮灭'}</span></span>
              <span class="skill-key"><kbd>${i+1}</kbd><span class="skill-arrow">↗</span></span><span class="skill-progress"></span>
            </button>`;
          }).join('')}
        </div>
      </section>
    </main>
    <footer class="footer"><span>呪術廻戦 <i>/</i> FAN-MADE INTERACTIVE STUDY</span><span class="footer-right">探索无下限的可能 <span class="footer-infinity">∞</span></span></footer>
    <div class="announcement sr-only" aria-live="polite" id="announcement"></div>
    <div class="toast" id="toast" role="status" hidden></div>
  </div>
  <dialog id="help-dialog"><button class="dialog-close icon-button" id="close-help" aria-label="关闭说明">${icons.close}</button><span class="section-overline">THE LIMITLESS GUIDE</span><h2>触碰无下限</h2><p>旋转观察五条悟，或释放术式，进入一段完整的咒力演出。</p><dl><div><dt>观察角色</dt><dd>鼠标拖动 / 单指拖动</dd></div><div><dt>拉近与远离</dt><dd>鼠标滚轮 / 双指缩放</dd></div><div><dt>苍 · 赫 · 茈</dt><dd><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> 或点击术式</dd></div><div><dt>中止演出</dt><dd><kbd>ESC</kbd> 或中止按钮</dd></div></dl><p class="help-note">演出结束后会恢复你的观察视角。音效默认关闭，可通过右侧工具栏开启；在设置中可降低画质或减少动态效果。</p><button class="help-confirm" id="confirm-help">开始探索 ${icons.arrow}</button></dialog>
`;

const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const surface=app.querySelector<HTMLElement>('.experience')!;
const skillButtons=[...app.querySelectorAll<HTMLButtonElement>('.skill-card')];
let experience:Experience|undefined;
let eyesVisible=false, previousState='', disposed=false;
let toastTimer:number|undefined;
function toast(text:string){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=window.setTimeout(()=>$('toast').hidden=true,2600);}
const phaseNames:Record<Phase,string>={charge:'咒力凝聚',fusion:'苍赫融合',release:'术式释放',recover:'咒力消散'};

function updateState(id:SkillId|null,phase:Phase|null,progress:number,activity:string|null=null):void {
  const key=`${id}-${phase}-${activity}`;
  surface.style.setProperty('--progress',`${progress*100}%`);
  if(id){
    const remaining=app.querySelector<HTMLElement>(`.skill-card.${id} .skill-arrow`);
    if(remaining)remaining.textContent=`${Math.max(1,Math.ceil(SKILLS[id].duration*(1-progress)))}s`;
  }
  if(key===previousState)return;previousState=key;
  surface.dataset.skill=id??'idle';
  skillButtons.forEach(button=>{button.disabled=!!id||!!activity||!experience?.ready;button.classList.toggle('active',button.dataset.id===id);if(button.dataset.id!==id)button.querySelector('.skill-arrow')!.textContent='↗';});
  $<HTMLButtonElement>('eyes').disabled=!!id||!!activity||!experience?.ready;
  $('cancel').hidden=!id&&!activity;
  $('section-hint').hidden=!!id||!!activity;
  $('stage-status-text').textContent=activity?({reveal:'六眼 · 揭开眼罩',cover:'六眼 · 戴上眼罩',return:'收招 · 恢复视角'}[activity]??activity):id&&phase?`${SKILLS[id].subtitle}「${SKILLS[id].title}」 · ${phaseNames[phase]}`:'无下限 · 待机';
  $('announcement').textContent=id&&phase?`${SKILLS[id].title}，${phaseNames[phase]}`:'演出结束，可继续观察或选择术式';
}

async function init():Promise<void> {
  if(disposed)return;
  $('retry').hidden=true;$('load-panel').hidden=false;$('load-title').textContent='正在构筑无下限';$('load-detail').textContent='加载角色与术式';$('load-progress').style.width='0%';
  skillButtons.forEach(b=>b.disabled=true);$<HTMLButtonElement>('eyes').disabled=true;$<HTMLButtonElement>('reset-camera').disabled=true;
  try {
    experience?.dispose();
    experience=undefined;
    experience=new Experience($('viewport'),{
      state:updateState,
      eyes:visible=>{eyesVisible=visible;$('eyes').setAttribute('aria-pressed',String(visible));$('eye-label').textContent=visible?'戴上眼罩':'揭开眼罩';},
      fps:value=>$('fps').textContent=`${value} FPS`,
      contextLost:()=>{
        $('load-panel').hidden=false;$('load-title').textContent='图形连接已中断';$('load-detail').textContent='重新加载以恢复角色展示';$('retry').hidden=false;
        skillButtons.forEach(b=>b.disabled=true);
      },
    });
    experience.setQuality($<HTMLSelectElement>('quality').value as 'high'|'low');
    $<HTMLInputElement>('reduced').checked=experience.reducedMotion;
    await experience.load(percent=>{$('load-progress').style.width=`${percent}%`;$('load-detail').textContent=`角色加载 ${Math.round(percent)}%`;});
    $('load-panel').hidden=true;
    $<HTMLButtonElement>('eyes').disabled=false;$<HTMLButtonElement>('reset-camera').disabled=false;
    experience.setEyes(eyesVisible,false);
    previousState='';updateState(null,null,0);
  } catch(error) {
    console.error('LIMITLESS initialization:',error);
    $('load-title').textContent=experience?'角色加载失败':'此浏览器暂时无法开启 3D';
    $('load-detail').textContent=experience?'请检查本地服务与模型文件，然后重试。':'请使用支持 WebGL 2 的新版 Chrome 或 Edge，并开启硬件加速。';
    $('retry').hidden=false;
  }
}

function cast(id:SkillId):void {experience?.start(id);}
skillButtons.forEach(button=>button.addEventListener('click',()=>cast(button.dataset.id as SkillId)));
$('cancel').addEventListener('click',()=>experience?.stop());
$('retry').addEventListener('click',()=>void init());
$('eyes').addEventListener('click',()=>{
  experience?.setEyes(!eyesVisible);
});
$('reset-camera').addEventListener('click',()=>experience?.resetView());
$('audio').addEventListener('click',async()=>{
  const audio=experience?.audio;if(!audio)return;
  if(audio.muted){if(!await audio.unlock()){toast('浏览器未允许音频播放，请重试。');return;}audio.muted=false;if(experience?.timeline.active)audio.start(experience.timeline.active);}else{audio.muted=true;audio.stop();}
  $('audio').innerHTML=audio.muted?icons.sound:icons.soundOn;
  $('audio').setAttribute('aria-pressed',String(!audio.muted));$('audio').setAttribute('aria-label',audio.muted?'开启音效':'关闭音效');$('audio').title=audio.muted?'开启音效':'关闭音效';
  toast(audio.muted?'音效已关闭':'音效已开启');
});
$('settings').addEventListener('click',()=>{
  const hidden=!$('settings-panel').hidden;$('settings-panel').hidden=hidden;$('settings').setAttribute('aria-expanded',String(!hidden));
});
document.addEventListener('pointerdown',event=>{
  if(!(event.target as Element).closest('#settings-panel, #settings')){$('settings-panel').hidden=true;$('settings').setAttribute('aria-expanded','false');}
});
$('quality').addEventListener('change',()=>experience?.setQuality($<HTMLSelectElement>('quality').value as 'high'|'low'));
$('reduced').addEventListener('change',()=>experience?.setReduced($<HTMLInputElement>('reduced').checked));
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await app.requestFullscreen();}catch{toast('当前浏览器未开放全屏，可手动最大化窗口。');}});
const dialog=$<HTMLDialogElement>('help-dialog');
$('help').addEventListener('click',()=>dialog.showModal());
$('close-help').addEventListener('click',()=>dialog.close());$('confirm-help').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
window.addEventListener('keydown',event=>{
  const target=event.target as HTMLElement;
  if(dialog.open)return;
  if(event.key==='Escape'){experience?.stop();$('settings-panel').hidden=true;$('settings').setAttribute('aria-expanded','false');return;}
  if(target.matches('input,select,textarea')||event.altKey||event.ctrlKey||event.metaKey)return;
  if(!event.repeat&&['1','2','3'].includes(event.key)){event.preventDefault();cast((['blue','red','purple'] as SkillId[])[Number(event.key)-1]);}
});
// Read-only diagnostics for manual QA and performance recording.
Object.defineProperty(window,'__LIMITLESS__',{configurable:true,get:()=>experience?.diagnostics});
window.addEventListener('pagehide',()=>{disposed=true;experience?.dispose();});
void init();
