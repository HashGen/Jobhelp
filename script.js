const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const state = { photo:null, signature:null, thumb:null, declaration:null, image:null, pdf:[] };

function toast(msg){ const t=$("#toast"); t.textContent=msg; t.classList.add("show"); clearTimeout(window.__toast); window.__toast=setTimeout(()=>t.classList.remove("show"),2200); }
function route(name){
  $$(".page").forEach(p=>p.classList.toggle("active-page",p.id===name));
  $$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.route===name));
  $("#sidebar").classList.remove("open");
  window.scrollTo({top:0,behavior:"smooth"});
}
function applyRoute(){ const name=(location.hash||"#home").slice(1); route(document.getElementById(name)?name:"home"); }
window.addEventListener("hashchange",applyRoute);
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-route]");
  if(b){ location.hash=b.dataset.route; }
});
$("#menuBtn").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
$("#year").textContent=new Date().getFullYear();

function bindDropzone(box){
  const id=box.dataset.input, input=$("#"+id);
  box.addEventListener("click",e=>{ if(e.target.closest("button") || e.target===input) return; input.click(); });
  box.querySelector("button")?.addEventListener("click",e=>{e.stopPropagation();input.click()});
  ["dragenter","dragover"].forEach(ev=>box.addEventListener(ev,e=>{e.preventDefault();box.classList.add("drag")}));
  ["dragleave","drop"].forEach(ev=>box.addEventListener(ev,e=>{e.preventDefault();box.classList.remove("drag")}));
  box.addEventListener("drop",e=>{if(e.dataTransfer.files?.[0]){input.files=e.dataTransfer.files;input.dispatchEvent(new Event("change"));}});
}
$$(".dropzone[data-input]").forEach(bindDropzone);

function loadImage(file){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=URL.createObjectURL(file);});}
function bytesLabel(n){return n<1024?`${n} B`:`${(n/1024).toFixed(1)} KB`;}
function canvasBlob(canvas,mime,quality){return new Promise(r=>canvas.toBlob(r,mime,quality));}
async function exportTarget(img,w,h,maxKB,mime,opts={}){
  const c=document.createElement("canvas"); c.width=Math.max(1,Math.round(w)); c.height=Math.max(1,Math.round(h));
  const ctx=c.getContext("2d",{willReadFrequently:false});
  if(opts.grayscale){ctx.filter="grayscale(1)";}
  ctx.fillStyle="#fff"; ctx.fillRect(0,0,c.width,c.height);
  ctx.drawImage(img,0,0,c.width,c.height);
  let q=mime==="image/png"?1:.92, blob=await canvasBlob(c,mime,q);
  const max=maxKB*1024;
  if(mime!=="image/png"){
    while(blob.size>max && q>0.08){q-=.06;blob=await canvasBlob(c,mime,q);}
  }
  if(blob.size>max && (mime==="image/jpeg"||mime==="image/webp")){
    let cw=c.width,ch=c.height;
    while(blob.size>max && (cw>120||ch>120)){
      cw=Math.max(120,Math.round(cw*.9));ch=Math.max(120,Math.round(ch*.9));c.width=cw;c.height=ch;ctx.fillStyle="#fff";ctx.fillRect(0,0,cw,ch);ctx.drawImage(img,0,0,cw,ch);
      blob=await canvasBlob(c,mime,Math.max(q,.08));
    }
  }
  return {blob,url:URL.createObjectURL(blob),width:c.width,height:c.height};
}
function downloadBlob(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),800);}
function showResult(sel,res,name){
  const el=$(sel);el.classList.remove("hidden");
  el.innerHTML=`<div class="result-row"><div class="result-preview"><img src="${res.url}" alt="Processed preview"></div><div class="result-info"><strong>${name}</strong><small>${res.width} × ${res.height}px • ${bytesLabel(res.blob.size)}</small><div style="margin-top:9px"><button class="btn primary" id="${sel.slice(1)}Download">Download</button></div></div></div>`;
  $("#"+sel.slice(1)+"Download").onclick=()=>downloadBlob(res.blob,name);
}
async function processTool(cfg){
  const file=state[cfg.stateKey];
  if(!file){toast("Please choose a file first.");return;}
  try{
    toast("Processing…");
    const img=await loadImage(file);
    const w=Number($(cfg.w).value)||img.width, h=Number($(cfg.h).value)||img.height, kb=Number($(cfg.kb).value)||100, mime=$(cfg.format).value;
    const r=await exportTarget(img,w,h,kb,mime,{grayscale:cfg.gray?$(cfg.gray).checked:false});
    showResult(cfg.result,r,`formkit-${cfg.stateKey}.${mime==="image/png"?"png":mime==="image/webp"?"webp":"jpg"}`);
    toast("Ready to download.");
  }catch(err){console.error(err);toast("Could not process that file.");}
}
function inputFile(id,key){$("#"+id).addEventListener("change",e=>{state[key]=e.target.files?.[0]||null;});}
inputFile("photoInput","photo"); inputFile("signatureInput","signature"); inputFile("thumbInput","thumb"); inputFile("declInput","declaration");

$("#photoProcess").onclick=()=>processTool({stateKey:"photo",w:"#photoW",h:"#photoH",kb:"#photoKB",format:"#photoFormat",result:"#photoResult"});
$("#sigProcess").onclick=()=>processTool({stateKey:"signature",w:"#sigW",h:"#sigH",kb:"#sigKB",format:"#sigFormat",result:"#sigResult"});
$("#thumbProcess").onclick=()=>processTool({stateKey:"thumb",w:"#thumbW",h:"#thumbH",kb:"#thumbKB",format:"#thumbFormat",result:"#thumbResult"});
$("#declProcess").onclick=()=>processTool({stateKey:"declaration",w:"#declW",h:"#declH",kb:"#declKB",format:"#declFormat",gray:"#declGrayscale",result:"#declResult"});

function lockAspect(inputW,inputH,lockId){
  const w=$(inputW),h=$(inputH),lock=$(lockId); let ratio=null;
  [w,h].forEach(inp=>inp.addEventListener("input",()=>{
    if(!lock.checked)return;
    if(!ratio){ const a=Number(w.value),b=Number(h.value); if(a&&b)ratio=a/b; }
    if(ratio){ if(inp===w&&Number(w.value))h.value=Math.max(1,Math.round(Number(w.value)/ratio)); else if(inp===h&&Number(h.value))w.value=Math.max(1,Math.round(Number(h.value)*ratio));}
  }));
  lock.addEventListener("change",()=>{ratio=null;});
}
lockAspect("#photoW","#photoH","#photoLock"); lockAspect("#sigW","#sigH","#sigLock");

let imageFile=null;
$("#imageChoose").onclick=()=>$("#imageInput").click();
$("#imageInput").addEventListener("change",e=>{imageFile=e.target.files?.[0]||null;$("#imageName").textContent=imageFile?imageFile.name:"No image selected";});
$("#imageQuality").addEventListener("input",()=>$("#qualityVal").textContent=$("#imageQuality").value+"%");
$("#imageProcess").onclick=async()=>{
  if(!imageFile){toast("Please choose an image first.");return;}
  try{const img=await loadImage(imageFile);const w=Number($("#imageW").value)||img.width,h=Number($("#imageH").value)||img.height,mime=$("#imageFormat").value;const r=await exportTarget(img,w,h,10240,mime,{});showResult("#imageResult",r,"formkit-image."+mime.split("/")[1].replace("jpeg","jpg"));toast("Image ready.");}catch(e){toast("Could not process that image.");}
};

const pdfInput=$("#pdfInput");
pdfInput.addEventListener("change",()=>{state.pdf=[...pdfInput.files];renderPdfList();});
$("#clearPdf").onclick=()=>{state.pdf=[];pdfInput.value="";renderPdfList();};
function renderPdfList(){const box=$("#pdfList");box.innerHTML=state.pdf.map((f,i)=>`<div class="file-chip"><span>${i+1}. ${f.name}</span><span>${bytesLabel(f.size)}</span></div>`).join("");}
$("#makePdf").onclick=async()=>{
  if(!state.pdf.length){toast("Select at least one image.");return;}
  if(!window.PDFLib){toast("PDF library is not available.");return;}
  try{
    toast("Creating PDF…");
    const {PDFDocument}=PDFLib, pdf=await PDFDocument.create();
    for(const f of state.pdf){
      const bytes=new Uint8Array(await f.arrayBuffer());
      let img;
      if(f.type==="image/jpeg") img=await pdf.embedJpg(bytes);
      else img=await pdf.embedPng(bytes);
      const scale=Math.min(1,560/Math.max(img.width,img.height));
      const w=img.width*scale,h=img.height*scale;
      const page=pdf.addPage([w+60,h+60]); page.drawImage(img,{x:30,y:30,width:w,height:h});
    }
    const out=await pdf.save();downloadBlob(new Blob([out],{type:"application/pdf"}),"formkit-images.pdf");toast("PDF downloaded.");
  }catch(e){console.error(e);toast("Could not create the PDF.");}
};
applyRoute();
