/* script.js
   Full behavior for the Climate page:
   - feedback submission (postJson)
   - quiz system (questions, scoring, localStorage)
   - leaderboard
   - daily login streak
   - smooth scroll + quick-nav highlight
*/

/* ========== Helper: postJson & server submission for feedback ========== */
async function postJson(url, payload) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch (err) {
    console.error('Request failed:', err);
    return false;
  }
}

async function sendFeedbackToServer(entry) {
  return await postJson('/api/feedback', entry);
}

/* ========== Feedback form wiring ========== */
document.addEventListener('DOMContentLoaded', () => {
  const fbForm = document.getElementById('feedback-form');
  const fbInfo = document.getElementById('feedback-info');
  if (!fbForm) return;

  fbForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(fbForm);
    const entry = {
      topic: 'climate',
      name: (formData.get('name') || '').trim(),
      email: (formData.get('email') || '').trim(),
      mood: (formData.get('mood') || '').trim(),
      message: (formData.get('message') || '').trim(),
      createdAt: new Date().toISOString()
    };

    if (!entry.message) {
      if (fbInfo) {
        fbInfo.textContent = 'Please write some feedback before sending.';
        fbInfo.style.display = 'inline';
        setTimeout(() => { fbInfo.style.display = 'none'; }, 3000);
      }
      return;
    }

    const ok = await sendFeedbackToServer(entry);
    if (fbInfo) {
      fbInfo.textContent = ok ? 'Feedback sent! 💚' : 'Could not send feedback. Please try again later.';
      fbInfo.style.display = 'inline';
      setTimeout(() => { fbInfo.style.display = 'none'; }, 4000);
    }
    if (ok) fbForm.reset();
  });
});

/* ========== Daily login streak + Quiz system (self-contained IIFE) ========== */
(function () {
  const LOGIN_KEY = "daily_login_last";
  const LOGIN_STREAK = "daily_login_streak";
  let lastLogin = localStorage.getItem(LOGIN_KEY);
  let streakLogin = parseInt(localStorage.getItem(LOGIN_STREAK)) || 0;
  let today = new Date().toDateString();
  let yesterday = new Date(Date.now() - 86400000).toDateString();

  if (lastLogin !== today) {
    if (lastLogin === yesterday) streakLogin += 1;
    else streakLogin = 1;
    localStorage.setItem(LOGIN_KEY, today);
    localStorage.setItem(LOGIN_STREAK, streakLogin);
  }

  const questions = [
    { q:"What is climate change?", opts:["Weather on one rainy day","Long-term shifts in temperature and weather patterns","Only the ozone hole","Just natural ice ages"], a:1, explain:"Climate change refers to long-term changes in averages of temperature and weather over decades or longer.[web:293][web:294][web:296]" },
    { q:"Which gas is the biggest driver of current warming?", opts:["Oxygen","Carbon dioxide from burning fossil fuels","Helium","Neon"], a:1, explain:"Rising CO₂ levels from coal, oil, and gas are the main cause of recent warming.[web:293][web:294][web:308]" },
    { q:"Which activity adds the MOST greenhouse gases?", opts:["Walking to school","Burning fossil fuels for electricity and transport","Drying clothes in the sun","Planting trees"], a:1, explain:"Energy and transport based on coal, oil, and gas dominate global emissions.[web:293][web:300][web:308]" },
    { q:"One clear effect of climate change on water is:", opts:["More stable sea level","Melting glaciers and rising seas","Instant snow everywhere","No more rainfall"], a:1, explain:"Warming melts land ice and expands seawater, which raises sea level.[web:293][web:296][web:306]" },
    { q:"Why is deforestation bad for the climate?", opts:["Trees make noise","Trees absorb CO₂, so cutting them adds greenhouse gases","Forests stop rainfall","Wood cannot be used"], a:1, explain:"Forests store carbon; when removed or burned, that carbon is released.[web:299][web:303][web:308]" },
    { q:"Which is a lower-carbon travel choice?", opts:["Short solo car rides every day","Walking, cycling, or public transport when possible","Frequent short flights","Leaving engines idling"], a:1, explain:"Active and shared transport reduce fuel use and emissions.[web:298][web:301][web:307]" },
    { q:"How can food choices help the climate?", opts:["Throwing away leftovers","Eating more plant-based meals and wasting less food","Always choosing air-freighted snacks","Ignoring expiry dates"], a:1, explain:"Plant-rich diets and less waste cut emissions from farming and land use.[web:298][web:301][web:309]" },
    { q:"What does \"net-zero\" emissions mean?", opts:["No electricity","Balancing remaining emissions with removals so the total added is zero","No factories","Only tree planting"], a:1, explain:"Net-zero means deep cuts plus removing the last bit of CO₂ we still emit.[web:294][web:299]" },
    { q:"Which home action helps fight climate change?", opts:["Leaving lights on","Using efficient LEDs and turning devices fully off","Keeping old leaky appliances","Ignoring energy bills"], a:1, explain:"Efficiency and switching off reduce power use and emissions.[web:301][web:304]" },
    { q:"Besides lifestyle changes, what else is powerful for climate action?", opts:["Doing nothing","Spreading myths","Supporting climate-friendly policies and community projects","Only blaming others"], a:2, explain:"Policies and collective projects can change whole systems quickly.[web:298][web:304][web:311]" }
  ];

  const STORAGE_POINTS = 'climate_quiz_points_glacier_v1';
  const STORAGE_STREAK = 'climate_quiz_streak_glacier_v1';
  const STORAGE_INDEX  = 'climate_quiz_index_glacier_v1';
  const STORAGE_ANSW   = 'climate_quiz_answered_glacier_v1';
  const STORAGE_LEADER = 'climate_quiz_leaderboard_glacier_v1';

  let points   = parseInt(localStorage.getItem(STORAGE_POINTS)) || 0;
  let streak   = parseInt(localStorage.getItem(STORAGE_STREAK)) || 0;
  let idx      = parseInt(localStorage.getItem(STORAGE_INDEX))  || 0;
  let answered = JSON.parse(localStorage.getItem(STORAGE_ANSW) || '{}');
  let quizStartTime = Date.now();

  const wrap       = document.getElementById('quiz-inner');
  const ptsEl      = document.getElementById('quiz-points');
  const streakEl   = document.getElementById('quiz-streak');
  const prevBtn    = document.getElementById('quiz-prev');
  const nextBtn    = document.getElementById('quiz-next');
  const restartBtn = document.getElementById('quiz-restart');
  const submitBtn  = document.getElementById('quiz-submit');
  const feedback   = document.getElementById('quiz-feedback');
  const summaryEl  = document.getElementById('quiz-summary');

  const lbModal    = document.getElementById('leaderboard-modal');
  const lbList     = document.getElementById('leaderboard-list');
  const lbClose    = document.getElementById('lb-close');
  const lbSaveBtn  = document.getElementById('lb-save');
  const lbNameInput= document.getElementById('lb-name');
  const openLbBtn  = document.getElementById('open-leaderboard');

  const explainModal = document.getElementById('explain-modal');
  const explainTitle = document.getElementById('explain-title');
  const explainBody  = document.getElementById('explain-body');
  const explainClose = document.getElementById('explain-close');
  const explainNext  = document.getElementById('explain-next');

  const replaceIconsBtn = document.getElementById('replace-nav-icons');

  (function renderDailyStreakBox() {
    try{
      const quizSection = document.getElementById('quiz-section');
      if(quizSection){
        const streakBox = document.createElement("div");
        streakBox.style.cssText="background:#020617;color:#f9fafb;padding:8px 12px;border-radius:8px;font-weight:700;margin-bottom:10px;text-align:center;";
        streakBox.textContent="🔥 Daily Login Streak: "+streakLogin+" day"+(streakLogin===1?"":"s");
        quizSection.prepend(streakBox);
      }
    }catch(e){console.error(e);}
  })();

  function saveState(){
    localStorage.setItem(STORAGE_POINTS,points);
    localStorage.setItem(STORAGE_STREAK,streak);
    localStorage.setItem(STORAGE_INDEX,idx);
    localStorage.setItem(STORAGE_ANSW,JSON.stringify(answered));
  }

  function renderScore(){
    ptsEl.textContent='Points: '+points;
    streakEl.textContent='Streak: '+streak;
  }

  function renderQuestion(i){
    const Q = questions[i];
    wrap.innerHTML='';
    if(!Q){wrap.textContent='No questions configured.';return;}

    const qBox=document.createElement('div');
    qBox.style.padding='0.8rem';
    const qTitle=document.createElement('div');
    qTitle.textContent=(i+1)+'. '+Q.q;
    qTitle.style.fontWeight='800';
    qTitle.style.marginBottom='0.8rem';
    qTitle.style.color='#071428';
    qTitle.style.fontSize='1.05rem';
    qTitle.style.lineHeight='1.35';
    qBox.appendChild(qTitle);

    const list=document.createElement('div');
    list.style.display='grid';
    list.style.gridTemplateColumns='1fr';
    list.style.gap='0.6rem';

    Q.opts.forEach((opt,j)=>{
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='quiz-opt';
      btn.textContent=opt;
      btn.dataset.opt=j;

      btn.style.textAlign='left';
      btn.style.padding='0.85rem';
      btn.style.borderRadius='10px';
      btn.style.border='1px solid rgba(148,163,184,0.9)';
      btn.style.background='#ffffff';
      btn.style.color='#071428';
      btn.style.cursor='pointer';
      btn.style.fontWeight=700;
      btn.style.fontSize='0.98rem';
      btn.style.boxShadow='0 6px 18px rgba(3,18,40,0.08)';
      btn.style.transition='transform .12s ease, box-shadow .12s ease';

      btn.addEventListener('mouseenter',()=>{
        btn.style.transform='translateY(-2px)';
        btn.style.boxShadow='0 10px 24px rgba(3,18,40,0.16)';
      });
      btn.addEventListener('mouseleave',()=>{
        btn.style.transform='none';
        btn.style.boxShadow='0 6px 18px rgba(3,18,40,0.08)';
      });

      btn.addEventListener('click',()=>onChoose(i,j));

      if(answered[i]!==undefined){
        btn.disabled=true;
        if(j===answered[i].chosen) btn.style.outline='3px solid rgba(59,130,246,0.6)';
        if(j===Q.a){
          btn.style.background='#dcfce7';
          btn.style.borderColor='#22c55e';
          btn.style.color='#064e3b';
        }
      }

      list.appendChild(btn);
    });

    qBox.appendChild(list);
    wrap.appendChild(qBox);
    feedback.textContent='';
  }

  function onChoose(i,chosen){
    const Q=questions[i];
    const opts=wrap.querySelectorAll('.quiz-opt');
    opts.forEach(o=>o.disabled=true);

    const correct=(chosen===Q.a);
    if(correct){
      points+=10;streak+=1;
      feedback.style.color='#166534';
      feedback.textContent='Correct! +10 points 🎉';
    }else{
      points=Math.max(0,points-5);streak=0;
      feedback.style.color='#7c2d12';
      feedback.textContent='Wrong! -5 points 😬';
    }

    opts.forEach(o=>{
      const j=parseInt(o.dataset.opt,10);
      if(j===Q.a){
        o.style.background='#dcfce7';
        o.style.borderColor='#22c55e';
      }else{
        o.style.opacity='0.85';
      }
      if(j===chosen && !correct){
        o.style.background='#fee2e2';
        o.style.borderColor='#ef4444';
        o.style.outline='2px solid rgba(239,68,68,0.2)';
      }
    });

    answered[i]={chosen,correct,time:Date.now()};
    saveState();
    renderScore();
    showExplanation(Q);
  }

  function showExplanation(Q){
    explainTitle.textContent='Why:';
    explainBody.textContent=Q.explain||'Short explanation not available.';
    explainModal.style.display='flex';
    explainNext.focus();
  }

  explainClose.addEventListener('click',()=>explainModal.style.display='none');
  explainNext.addEventListener('click',()=>{explainModal.style.display='none';nextBtn.click();});

  prevBtn.addEventListener('click',()=>{
    idx=(idx>0)?idx-1:0;
    localStorage.setItem(STORAGE_INDEX,idx);
    renderQuestion(idx);
  });
  nextBtn.addEventListener('click',()=>{
    idx=(idx<questions.length-1)?idx+1:questions.length-1;
    localStorage.setItem(STORAGE_INDEX,idx);
    renderQuestion(idx);
  });

  restartBtn.addEventListener('click',()=>{
    points=0;streak=0;idx=0;answered={};
    quizStartTime=Date.now();
    localStorage.removeItem(STORAGE_POINTS);
    localStorage.removeItem(STORAGE_STREAK);
    localStorage.removeItem(STORAGE_INDEX);
    localStorage.removeItem(STORAGE_ANSW);
    renderScore();
    renderQuestion(idx);
    summaryEl.style.display='none';
  });

  submitBtn.addEventListener('click',()=>{
    const total=questions.length;
    let correctCount=0;let attempted=0;
    for(let i=0;i<total;i++){
      if(answered[i]){
        attempted++;
        if(answered[i].correct) correctCount++;
      }
    }
    const wrongCount=total-correctCount;
    const percent=total?Math.round((correctCount/total)*100):0;

    const elapsedMs=Date.now()-quizStartTime;
    const seconds=Math.floor(elapsedMs/1000);
    const mins=Math.floor(seconds/60);
    const remSec=seconds%60;
    const timeStr=(mins>0?mins+" min ":"")+remSec+" sec";

    let msg='';
    if(percent<50){
      msg="You’ve started learning the basics—review the questions and try again.";
    }else{
      msg="🎉 Strong climate awareness! Use it to protect glaciers, water, and people.";
    }

    summaryEl.innerHTML =
      "<strong>Quiz Summary</strong><br>" +
      "Correct answers: <strong>"+correctCount+"</strong> / "+total+"<br>" +
      "Wrong answers: <strong>"+wrongCount+"</strong><br>" +
      "Score: <strong>"+percent+"%</strong><br>" +
      "Time taken: <strong>"+timeStr+"</strong><br><br>" +
      msg;
    summaryEl.style.display='block';
  });

  function renderLeaderboard(){
    const raw=localStorage.getItem(STORAGE_LEADER);
    let list=raw?JSON.parse(raw):[];
    list.sort((a,b)=>b.score-a.score);
    list=list.slice(0,3);
    lbList.innerHTML='';
    if(list.length===0){
      lbList.innerHTML='<li style="color:#666">No scores yet — be the first!</li>';
    }else{
      list.forEach(item=>{
        const li=document.createElement('li');
        li.textContent=item.name+' — '+item.score+' pts';
        lbList.appendChild(li);
      });
    }
  }

  function openLeaderboard(){
    renderLeaderboard();
    lbModal.style.display='flex';
    lbNameInput.focus();
  }

  openLbBtn.addEventListener('click',openLeaderboard);
  lbClose.addEventListener('click',()=>lbModal.style.display='none');

  lbSaveBtn.addEventListener('click',()=>{
    const name=lbNameInput.value.trim()||'Anonymous';
    const raw=localStorage.getItem(STORAGE_LEADER);
    let list=raw?JSON.parse(raw):[];
    list.push({name,score:points,date:Date.now()});
    list.sort((a,b)=>b.score-a.score);
    list=list.slice(0,10);
    localStorage.setItem(STORAGE_LEADER,JSON.stringify(list));
    renderLeaderboard();
    lbNameInput.value='';
  });

  replaceIconsBtn.addEventListener('click',()=>{
    const anyImgs=document.querySelectorAll('.nav-card img');
    if(anyImgs.length===0){
      feedback.style.color='#b45309';
      feedback.textContent='No nav images found to replace.';
      setTimeout(()=>feedback.textContent='',2000);
      return;
    }
    anyImgs.forEach(img=>{
      const parent=img.parentElement;
      if(!parent) return;
      const i=document.createElement('i');
      i.className='fas fa-globe-europe';
      i.style.fontSize='38px';
      i.style.color='#bfdbfe';
      i.style.padding='8px';
      i.style.borderRadius='8px';
      i.style.background='linear-gradient(180deg,rgba(255,255,255,0.08),rgba(0,0,0,0.18))';
      i.style.boxShadow='0 10px 30px rgba(3,18,40,0.45)';
      img.remove();
      parent.insertBefore(i,parent.firstChild);
    });
    feedback.style.color='#b45309';
    feedback.textContent='Nav images replaced with climate icons.';
    setTimeout(()=>feedback.textContent='',2000);
  });

  document.addEventListener('keydown',(e)=>{
    if(e.key==='n' || e.key==='N') nextBtn.click();
    if(e.key==='p' || e.key==='P') prevBtn.click();
    if(e.key==='r' || e.key==='R') restartBtn.click();
    if(e.key==='l' || e.key==='L') openLbBtn.click();
  });

  renderScore();
  renderQuestion(idx);

  window.addEventListener('click',(ev)=>{
    if(ev.target===lbModal) lbModal.style.display='none';
    if(ev.target===explainModal) explainModal.style.display='none';
  });
  window.addEventListener('keydown',(ev)=>{
    if(ev.key==='Escape'){
      lbModal.style.display='none';
      explainModal.style.display='none';
    }
  });

  /* ========== MISSING BEHAVIOR: SMOOTH SCROLL + QUICK-NAV HIGHLIGHT ========== */
  (function () {
    function smoothScrollTo(id){
      const el = document.getElementById(id);
      if(!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({top, behavior:'smooth'});
    }

    const openQuickNav = document.getElementById('open-quick-nav');
    if(openQuickNav){
      openQuickNav.addEventListener('click', ()=>{
        const strip = document.getElementById('quick-nav');
        if(strip){
          const top = strip.getBoundingClientRect().top + window.scrollY - 80;
          window.scrollTo({top, behavior:'smooth'});
        }
      });
    }

    const quickButtons = Array.from(document.querySelectorAll('.quick-nav-item'));
    quickButtons.forEach(btn=>{
      btn.addEventListener('click',()=>{
        const target = btn.getAttribute('data-target');
        if(target) smoothScrollTo(target);
      });
    });

    const sectionIds = ['basics-card','causes-card','glacier-card','solutions-card','actions-card','extra-actions-card','video-section','gallery-section','feedback-section','quiz-section'];
    const sectionMap = {};
    sectionIds.forEach(id=>{
      const el = document.getElementById(id);
      if(el) sectionMap[id] = el;
    });
    function onScrollHighlight(){
      const scrollPos = window.scrollY + 120;
      let currentId = null;
      for(const id in sectionMap){
        const rectTop = sectionMap[id].offsetTop;
        if(scrollPos >= rectTop) currentId = id;
      }
      if(!currentId) return;
      quickButtons.forEach(btn=>{
        const t = btn.getAttribute('data-target');
        if(t === currentId) btn.classList.add('active');
        else btn.classList.remove('active');
      });
    }
    window.addEventListener('scroll', onScrollHighlight, { passive: true });
    onScrollHighlight();

    document.addEventListener('keydown',(e)=>{
      if(e.key==='n' || e.key==='N') {
        const n = document.getElementById('quiz-next');
        if(n) n.click();
      }
      if(e.key==='p' || e.key==='P') {
        const p = document.getElementById('quiz-prev');
        if(p) p.click();
      }
      if(e.key==='r' || e.key==='R') {
        const r = document.getElementById('quiz-restart');
        if(r) r.click();
      }
      if(e.key==='l' || e.key==='L') {
        const l = document.getElementById('open-leaderboard');
        if(l) l.click();
      }
    });

    console.info('Smooth scroll + quick-nav highlight activated.');
  })();

})();
