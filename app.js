'use strict';
(() => {
  const $ = (selector) => document.querySelector(selector);
  const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const storageKey = 'spi-showcase-v1';
  const blank = () => ({ questions: [], words: [], attempts: [], seen: {}, imported: false });
  let model = blank(), screen = 'home', answerIndex = null, questionIndex = 0, cardIndex = 0, revealed = false;
  const validQuestion = (q) => q && Number.isInteger(q.id) && ['combination','blank'].includes(q.format) && typeof q.base === 'string' && typeof q.prompt === 'string' && typeof q.explanation === 'string' && Array.isArray(q.choices) && q.choices.length === (q.format === 'combination' ? 6 : 5) && q.choices.every(v=>typeof v==='string') && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.choices.length && Array.isArray(q.candidates);
  const validWord = (w) => w && Number.isInteger(w.id) && typeof w.example === 'string' && typeof w.meaning === 'string' && typeof w.reading === 'string';
  function save(){ try{ localStorage.setItem(storageKey,JSON.stringify(model)); }catch { notify('この端末に保存できません。プライベートモード等を確認してください。'); }}
  function notify(s){ const t=$('#toast'); t.textContent=s; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),3500); }
  function restore(){ try{ const raw=localStorage.getItem(storageKey); if(!raw)return false;const data=JSON.parse(raw); if(!Array.isArray(data.questions)||!Array.isArray(data.words)||!data.questions.every(validQuestion)||!data.words.every(validWord)) return false; model={...blank(), ...data, attempts:Array.isArray(data.attempts)?data.attempts:[],seen:data.seen&&typeof data.seen==='object'?data.seen:{}}; return true; }catch{return false;} }
  async function initialize(){
    if(!restore()){
      try { const [q,w]=await Promise.all([fetch('./sample-questions.json').then(r=>r.json()),fetch('./sample-words.json').then(r=>r.json())]); if(!q.every(validQuestion)||!w.every(validWord))throw Error('サンプル形式が不正');model.questions=q;model.words=w;save(); }
      catch { $('#main').innerHTML='<div class="card"><h2>データの読み込みに失敗しました</h2><p>GitHub PagesまたはローカルWebサーバーで開いてください。</p></div>';return; }
    }
    navigate('home');
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }
  function heading(title,description){ return `<div class="eyebrow">PUBLIC DEMO · ORIGINAL SAMPLE CONTENT</div><h1 class="page-title">${title}</h1><p class="lead">${description}</p>`; }
  function navigate(page){screen=page;answerIndex=null;revealed=false;document.querySelectorAll('[data-go]').forEach(b=>b.classList.toggle('active',b.dataset.go===screen));render();}
  function render(){
    if(screen==='home') home();
    if(screen==='relations') relations();
    if(screen==='words') words();
    if(screen==='manage') manage();
    $('#main').querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>action(b.dataset.action,b.dataset.index)));
    $('#main').querySelectorAll('[data-goto]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.goto)));
  }
  function home(){ const attempts=model.attempts.length,correct=model.attempts.filter(a=>a.correct).length;
    $('#main').innerHTML=heading('小さな学びを、続けやすく。','SPIの語句と二語の関係を練習できる、個人制作の学習アプリです。')+`
      <div class="hero"><div><div class="eyebrow" style="color:#dcd6ff">WEB APP PORTFOLIO</div><h2>ことばを、得点力に。</h2><p>クイズ・単語カード・学習記録。自分が必要だと感じた機能を形にしました。公開版には自作サンプル問題のみを収録しています。</p><button class="button" data-goto="relations">クイズを試す →</button></div><div class="hero-icon">✦</div></div>
      <div class="grid"><div class="stat"><span class="stat-label">登録された二語の問題</span><strong>${model.questions.length}<small> 問</small></strong></div><div class="stat"><span class="stat-label">回答した回数</span><strong>${attempts}<small> 回</small></strong></div><div class="stat"><span class="stat-label">正答率</span><strong>${attempts?Math.round(correct/attempts*100):0}<small> %</small></strong></div></div>
      <section class="section"><h2>学習メニュー</h2><div class="modegrid"><button class="mode" data-goto="relations"><span class="symbol">⇄</span><b>二語の関係</b><p>5択・6択の問題に挑戦。解説と回答履歴も確認できます。</p></button><button class="mode" data-goto="words"><span class="symbol">▤</span><b>単語カード</b><p>例文から意味を確認。覚えた単語を端末内に記録します。</p></button></div></section>
      <p class="notice">この公開版は、開発機能の紹介用デモです。書籍の設問は収録していません。読み込んだデータや学習記録はこの端末にのみ保存され、サーバーへ送信されません。</p>`;
  }
  function relations(){if(!model.questions.length){$('#main').innerHTML=heading('二語の関係','問題がまだありません。')+'<button class="button" data-goto="manage">問題を読み込む</button>';return;}
    questionIndex=((questionIndex%model.questions.length)+model.questions.length)%model.questions.length;
    const q=model.questions[questionIndex]; const answered=answerIndex!==null;
    const candidates=q.format==='combination'?`<div class="candidates">${q.candidates.map((c,i)=>`<div>${'アイウ'[i]}：${escapeHTML(c)}</div>`).join('')}</div>`:'';
    const choices=q.choices.map((v,i)=>`<button class="choice ${answered?(i===q.answer?'correct':i===answerIndex?'incorrect':''):''}" data-action="choice" data-index="${i}" ${answered?'disabled':''}><span class="mark">${String.fromCharCode(65+i)}</span>${escapeHTML(v)}</button>`).join('');
    const detail=answered?`<div class="answer ${answerIndex===q.answer?'good':'bad'}"><h3>${answerIndex===q.answer?'正解！':'不正解'}</h3><strong>正解：${String.fromCharCode(65+q.answer)}. ${escapeHTML(q.choices[q.answer])}</strong><div>${escapeHTML(q.explanation)}</div></div>`:'';
    $('#main').innerHTML=heading('二語の関係','同じ関係を持つ組を選ぶ練習です。')+`<div class="card study-card"><div class="meta"><span>${questionIndex+1} / ${model.questions.length} 問</span><span class="badge">${escapeHTML(q.category||'二語の関係')} · ${q.choices.length}択</span></div><div class="question">${escapeHTML(q.prompt)}</div><div class="question-base">${escapeHTML(q.base)}</div>${candidates}<div class="choices">${choices}</div>${detail}<div class="button-row"><button class="button outline" data-action="previous">← 前の問題</button><button class="button" data-action="next">次の問題 →</button></div></div><p class="notice">公開用の自作サンプルです。実際のSPI出題内容や正答を保証するものではありません。</p>`;
  }
  function words(){if(!model.words.length){$('#main').innerHTML=heading('単語カード','単語がまだありません。')+'<button class="button" data-goto="manage">単語を読み込む</button>';return;}
    cardIndex=((cardIndex%model.words.length)+model.words.length)%model.words.length;const w=model.words[cardIndex];
    $('#main').innerHTML=heading('単語カード','タップして意味を確認。知識を少しずつ積み重ねよう。')+`<div class="card study-card"><div class="meta"><span>${cardIndex+1} / ${model.words.length} 語</span><span class="badge">${model.seen[w.id]?'学習済み':'未学習'}</span></div><button class="flash" data-action="flip">${revealed?`<span>${escapeHTML(w.meaning)}<br><small>読み方：${escapeHTML(w.reading)}</small></span>`:`<span>${escapeHTML(w.example)}<br><small>タップして意味を表示</small></span>`}</button><div class="button-row"><button class="button outline" data-action="wordprev">← 前へ</button><button class="button secondary" data-action="learned">✓ 覚えた</button><button class="button" data-action="wordnext">次へ →</button></div></div>`;
  }
  function manage(){ $('#main').innerHTML=heading('問題データ管理','公開デモには自作の見本だけを入れています。自分の端末内だけで問題データを追加できます。')+`
    <div class="manage-grid"><div class="card"><h2>二語の関係を読み込む</h2><p>JSON配列形式（id、format、base、prompt、choices、answer、explanation、candidates）。最大300問。読み込み内容はブラウザ内のみで扱われます。</p><div class="file-row"><input type="file" id="questions-file" accept=".json,application/json" aria-label="二語の問題JSON"></div><div class="button-row"><button class="button" data-action="import-questions">問題JSONを読み込む</button><a class="button outline" href="sample-questions.json" download>見本を保存</a></div></div>
    <div class="card"><h2>単語を読み込む</h2><p>JSON配列形式（id、example、meaning、reading）。最大210語。</p><div class="file-row"><input type="file" id="words-file" accept=".json,application/json" aria-label="単語JSON"></div><div class="button-row"><button class="button" data-action="import-words">単語JSONを読み込む</button><a class="button outline" href="sample-words.json" download>見本を保存</a></div></div></div>
    <p class="notice">公開リポジトリ内に書籍由来の問題ファイルを置かないでください。ここから自分の端末で読み込んだJSONは、GitHubにはアップロードされません。</p>
    <div class="button-row"><button class="button negative" data-action="reset">この端末のデータを初期化</button></div>`;
  }
  async function readData(id,validator,max){ const input=$(id);if(!input.files?.length){notify('JSONファイルを選択してください');return null;}const file=input.files[0]; if(file.size>3_000_000){notify('ファイルは3MB以内にしてください');return null;} try {const data=JSON.parse(await file.text());const rows=Array.isArray(data)?data:(Array.isArray(data.questions)?data.questions:null);if(!rows||rows.length>max||!rows.every(validator)||new Set(rows.map(x=>x.id)).size!==rows.length)throw Error();return rows;}catch{notify('JSON形式または内容を確認してください');return null;} }
  async function action(name,index){
    if(name==='choice'&&answerIndex===null){ answerIndex=Number(index);const q=model.questions[questionIndex];model.attempts.push({id:q.id,correct:answerIndex===q.answer,at:new Date().toISOString()});save();render();}
    if(name==='next'||name==='previous'){questionIndex=(questionIndex+(name==='next'?1:-1)+model.questions.length)%model.questions.length;answerIndex=null;render();}
    if(name==='flip'){revealed=!revealed;render();}
    if(name==='wordnext'||name==='wordprev'){cardIndex=(cardIndex+(name==='wordnext'?1:-1)+model.words.length)%model.words.length;revealed=false;render();}
    if(name==='learned'){model.seen[model.words[cardIndex].id]=true;save();notify('学習済みに登録しました');render();}
    if(name==='import-questions'){const rows=await readData('#questions-file',validQuestion,300);if(rows){model.questions=rows;model.attempts=[];questionIndex=0;save();notify(`${rows.length}問を読み込みました`);navigate('relations');}}
    if(name==='import-words'){const rows=await readData('#words-file',validWord,210);if(rows){model.words=rows;model.seen={};cardIndex=0;save();notify(`${rows.length}語を読み込みました`);navigate('words');}}
    if(name==='reset'){ if(confirm('この端末の問題と学習記録を初期化しますか？')){localStorage.removeItem(storageKey);model=blank();initialize();} }
  }
  document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.go)));
  initialize();
})();
