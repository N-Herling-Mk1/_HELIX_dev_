/* ═══════════════════════════════════════════════════════════
   HELIX — GANTT ENGINE   js/views/gantt.js
   Port of the FORGE gantt renderer, light-themed (CSS lives in
   documentation.css). Data-driven: fetches content JSON live.
   Exposes  HelixGantt.render(containerEl).
   Paths resolve relative to documentation.html (in /views/) →
   '../content/…'  reaches the repo-root /content/ folder.
   ═══════════════════════════════════════════════════════════ */
window.HelixGantt = (function(){
  "use strict";
  const UPLOAD_URL = "https://uarizona.co1.qualtrics.com/jfe/form/SV_6FLtz2X1GPXvVuC?Q_CHL=qr";
  const DATA = "../content/gantt.json";
  const TODOS = "../content/weekly_todos.json";

  async function fetchJSON(path){
    const r = await fetch(path);
    if(!r.ok) throw new Error(path + " → " + r.status + " " + r.statusText);
    return r.json();
  }

  const PHASE = {
    "Intro":{cls:"fg-intro",group:"Intro / Planning"},"Planning":{cls:"fg-intro",group:"Intro / Planning"},
    "Design / Impl":{cls:"fg-design",group:"Design / Implementation"},"Testing":{cls:"fg-testing",group:"Testing"},
    "Write-up":{cls:"fg-writeup",group:"Write-up"},"Deliverables":{cls:"fg-deliver",group:"Deliverables"}
  };
  const LEGEND=[["fg-intro","Intro / Planning"],["fg-design","Design / Implementation"],["fg-testing","Testing"],["fg-writeup","Write-up"],["fg-deliver","Deliverables"]];
  const STATUS_KEY=[["is-planned","Planned"],["is-progress","In progress"],["is-done","Done"]];

  function row(x){var r=document.createElement("div");r.className="fg-row"+(x?" "+x:"");return r;}
  function labelCell(t){var d=document.createElement("div");d.className="fg-label";if(typeof t==="string"){d.textContent=t;d.title=t;}return d;}
  function trackCell(){var d=document.createElement("div");d.className="fg-track";return d;}
  function statusClass(s){return "is-"+(s||"planned").replace("in_progress","progress");}
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c];});}
  function todayFraction(w0s,n){if(!w0s)return null;var w0=new Date(w0s+"T00:00:00");if(isNaN(w0))return null;var w=(Date.now()-w0.getTime())/(6048e5);if(w<0||w>n)return null;return w;}

  function buildChart(data){
    var tasks=data.tasks||[],n=data.num_weeks||(tasks.reduce(function(m,t){return Math.max(m,(t.end!=null?t.end:t.start)||0);},0)+1);
    var chart=document.createElement("div");chart.className="fg-chart";chart.style.setProperty("--fg-cols",n);
    var head=row("fg-head");head.appendChild(labelCell("Phase / Task"));var ht=trackCell();
    for(var w=0;w<n;w++){var c=document.createElement("div");c.className="fg-wk";c.textContent="W"+w;ht.appendChild(c);}
    head.appendChild(ht);chart.appendChild(head);
    var order=[],groups={};
    tasks.forEach(function(t){var m=PHASE[t.phase]||{cls:"",group:t.phase||"\u2014"};if(!groups[m.group]){groups[m.group]={cls:m.cls,items:[]};order.push(m.group);}groups[m.group].items.push(t);});
    order.forEach(function(g){var G=groups[g];var gh=row("fg-grouphead");var gl=labelCell();var sw=document.createElement("i");sw.className=G.cls;var tx=document.createElement("span");tx.textContent=g;
      gl.appendChild(sw);gl.appendChild(tx);gl.title=g;gh.appendChild(gl);gh.appendChild(trackCell());chart.appendChild(gh);
      G.items.forEach(function(t){var r=row();r.appendChild(labelCell(t.name));var tk=trackCell();var s=t.start||0,e=(t.end!=null?t.end:s);
        var bar=document.createElement("div");bar.className="fg-bar "+(PHASE[t.phase]?PHASE[t.phase].cls:"")+" "+statusClass(t.status);
        bar.style.gridColumn=(s+1)+" / "+(e+2);bar.title=t.name+" ("+(e===s?"W"+s:"W"+s+"\u2013W"+e)+") \u2014 click for week details";
        bar.dataset.week=String(s);bar.setAttribute("role","button");bar.tabIndex=0;tk.appendChild(bar);r.appendChild(tk);chart.appendChild(r);});});
    var ms=data.milestones||[];
    if(ms.length){var mr=row();mr.appendChild(labelCell("Milestones"));var mt=trackCell();
      ms.forEach(function(m,i){var d=document.createElement("div");d.className="fg-ms";d.style.gridColumn=String(m.week+1);d.title="M"+(i+1)+": "+m.label+" (W"+m.week+")";
        var b=document.createElement("b");b.textContent=String(i+1);d.appendChild(b);mt.appendChild(d);});mr.appendChild(mt);chart.appendChild(mr);}
    var frac=todayFraction(data.week0_start,n);
    if(frac!=null){var tl=document.createElement("div");tl.className="fg-today";
      tl.title="Today \u2014 "+new Date().toLocaleDateString("en-US",{weekday:"short",year:"numeric",month:"short",day:"numeric"});
      tl.style.left="calc(var(--fg-label) + (100% - var(--fg-label)) * "+(frac/n)+")";chart.appendChild(tl);}
    return chart;
  }
  function buildLegend(){var w=document.createElement("div");w.className="fg-legend";
    LEGEND.forEach(function(p){var li=document.createElement("span");li.className="li";var i=document.createElement("i");i.className=p[0];var t=document.createElement("span");t.textContent=p[1];li.appendChild(i);li.appendChild(t);w.appendChild(li);});
    var mli=document.createElement("span");mli.className="li";var md=document.createElement("span");md.style.cssText="width:12px;height:12px;display:inline-block;background:#0e2236;transform:rotate(45deg)";
    var mt=document.createElement("span");mt.textContent="Milestone";mli.appendChild(md);mli.appendChild(mt);w.appendChild(mli);
    var tli=document.createElement("span");tli.className="li";var tk=document.createElement("span");tk.style.cssText="width:3px;height:14px;display:inline-block;background:#ff6a00";
    var tt=document.createElement("span");tt.textContent="Today";tli.appendChild(tk);tli.appendChild(tt);w.appendChild(tli);return w;}
  function buildStatusKey(){var w=document.createElement("div");w.className="fg-statuskey";var intro=document.createElement("span");intro.textContent="Bar fill:";w.appendChild(intro);
    STATUS_KEY.forEach(function(p){var li=document.createElement("span");li.className="li";var bar=document.createElement("span");bar.className="fg-bar fg-design "+p[0];
      bar.style.cssText="display:inline-block;width:26px;height:13px;margin:0;border-radius:4px";var t=document.createElement("span");t.textContent=p[1];li.appendChild(bar);li.appendChild(t);w.appendChild(li);});return w;}
  function buildMsKey(data){var ms=data.milestones||[];if(!ms.length)return null;var ol=document.createElement("ol");ol.className="fg-mskey";
    ms.forEach(function(m){var li=document.createElement("li");li.textContent=m.label+" \u2014 Week "+m.week;ol.appendChild(li);});return ol;}
  function buildDetailPanel(){var d=document.createElement("aside");d.className="fg-detail";
    d.innerHTML="<h3>Week details</h3><p class=\"fg-detail-sub\">Tasks &amp; status</p><p class=\"fg-hint\">Click any colored bar to load that week's task list here.</p>";return d;}
  function renderWeekDetail(panel,week,todos){var wk=todos&&todos.weeks?todos.weeks[String(week)]:null;
    var head="<h3>Week "+week+"</h3><p class=\"fg-detail-sub\">"+((wk&&wk.label)?esc(wk.label):"Tasks &amp; status")+"</p>";
    if(!wk||!Array.isArray(wk.tasks)||!wk.tasks.length){panel.innerHTML=head+"<p class=\"fg-hint\">No tasks recorded for this week yet. Add them to <code>content/weekly_todos.json</code> under week \""+week+"\".</p>";return;}
    var rows="";wk.tasks.forEach(function(t){var done=(t.status||"").toLowerCase()==="done";rows+="<tr class=\""+(done?"is-done":"")+"\"><td class=\"fg-task-col\">"+esc(t.name||"")+"</td><td class=\"fg-st-col\"><span class=\"fg-pill "+(done?"done":"todo")+"\">"+(done?"done":"todo")+"</span></td></tr>";});
    panel.innerHTML=head+"<table class=\"fg-todo\"><thead><tr><th class=\"fg-task-col\">Task</th><th class=\"fg-st-col\">Status</th></tr></thead><tbody>"+rows+"</tbody></table>";}
  function ensureHtml2Canvas(){if(window.html2canvas)return Promise.resolve();return new Promise(function(res,rej){var s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";s.crossOrigin="anonymous";s.onload=function(){res();};s.onerror=function(){rej(new Error("could not load screenshot library"));};document.head.appendChild(s);});}
  async function downloadPng(cap,btn){var orig=btn.textContent;btn.disabled=true;btn.textContent="Rendering\u2026";var scroll=cap.querySelector(".fg-scroll"),pv=scroll?scroll.style.overflow:null,pw=cap.style.width;var detail=cap.querySelector(".fg-detail"),pd=detail?detail.style.display:null;if(detail)detail.style.display="none";
    try{await ensureHtml2Canvas();var chart=cap.querySelector(".fg-chart");var needed=chart?chart.scrollWidth:cap.scrollWidth,target=Math.max(cap.clientWidth,needed)+4;if(scroll)scroll.style.overflow="visible";cap.style.width=target+"px";
      var bg=getComputedStyle(document.body).backgroundColor;if(!bg||bg==="rgba(0, 0, 0, 0)"||bg==="transparent")bg="#ffffff";
      var canvas=await window.html2canvas(cap,{backgroundColor:bg,scale:2,width:target,windowWidth:target,scrollX:0,scrollY:-window.scrollY});
      var stamp=new Date().toISOString().slice(0,10);var a=document.createElement("a");a.download="helix-gantt-"+stamp+".png";a.href=canvas.toDataURL("image/png");document.body.appendChild(a);a.click();a.remove();
    }catch(e){alert("Could not generate PNG: "+(e&&e.message?e.message:e));}finally{if(scroll)scroll.style.overflow=pv;cap.style.width=pw;if(detail)detail.style.display=pd;btn.disabled=false;btn.textContent=orig;}}

  async function render(container){
    container.innerHTML="";container.classList.add("helix-gantt");
    try{
      var data=await fetchJSON(DATA);
      var todos=null;try{todos=await fetchJSON(TODOS);}catch(e){todos=null;}
      var header=document.createElement("div");header.className="fg-header";var h2=document.createElement("div");h2.className="fg-h2";h2.textContent="Project Gantt";
      var actions=document.createElement("div");actions.className="fg-actions";var dlBtn=document.createElement("button");dlBtn.type="button";dlBtn.className="fg-btn";dlBtn.textContent="\u2B07 Download PNG";dlBtn.title="Save a PNG of the current chart";
      var up=document.createElement("a");up.className="fg-btn fg-btn-accent";up.href=UPLOAD_URL;up.target="_blank";up.rel="noopener noreferrer";up.textContent="Weekly upload \u2197";
      actions.appendChild(dlBtn);actions.appendChild(up);header.appendChild(h2);header.appendChild(actions);container.appendChild(header);
      var cap=document.createElement("div");cap.className="fg-capture";var ct=document.createElement("p");ct.className="fg-cap-title";
      ct.innerHTML="HELIX \u2014 Project Gantt <span class=\"stamp\">snapshot "+new Date().toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"})+"</span>";cap.appendChild(ct);
      cap.appendChild(buildLegend());cap.appendChild(buildStatusKey());
      var body=document.createElement("div");body.className="fg-body";var col=document.createElement("div");col.className="fg-chart-col";
      var sc=document.createElement("div");sc.className="fg-scroll";sc.appendChild(buildChart(data));col.appendChild(sc);body.appendChild(col);
      var detail=buildDetailPanel();body.appendChild(detail);cap.appendChild(body);
      function selectWeek(bar){var wk=parseInt(bar.dataset.week,10);col.querySelectorAll(".fg-bar.is-selected").forEach(function(b){b.classList.remove("is-selected");});bar.classList.add("is-selected");renderWeekDetail(detail,wk,todos);}
      col.querySelectorAll(".fg-bar").forEach(function(bar){bar.addEventListener("click",function(){selectWeek(bar);});bar.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();selectWeek(bar);}});});
      var msKey=buildMsKey(data);if(msKey){var h3=document.createElement("div");h3.style.cssText="font-family:'Orbitron';font-weight:700;font-size:12px;letter-spacing:.04em;color:#0e2236;margin-top:18px";h3.textContent="MILESTONES";cap.appendChild(h3);cap.appendChild(msKey);}
      var meta=document.createElement("div");meta.className="gantt-meta";meta.innerHTML="<strong>Last updated:</strong> "+(data.last_updated||"\u2014")+" &nbsp;|&nbsp; <strong>Source:</strong> <code>content/gantt.json</code> &nbsp;|&nbsp; edit JSON \u00b7 commit \u00b7 push";
      cap.appendChild(meta);container.appendChild(cap);dlBtn.addEventListener("click",function(){downloadPng(cap,dlBtn);});
    }catch(err){container.innerHTML="<div class='panel-error'>Could not load Gantt data<br><span>"+err.message+"</span></div>";}
  }
  return { render: render };
})();
