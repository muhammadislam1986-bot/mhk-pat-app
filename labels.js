function renderLabel(){
  const job = activeJob(); if(!job){$('labelArea').innerHTML='<div class="small">No active job.</div>'; return}
  const item = job.items.find(x=>x.id===state.lastLabelItemId) || job.items[0];
  if(!item){$('labelArea').innerHTML='<div class="small">No items to label yet.</div>'; return}

  const isFail = item.result === 'FAIL';
  const headColor = isFail ? '#c62828' : '#14894c';
  const resultColor = isFail ? '#c62828' : '#14894c';
  const warningHtml = isFail
    ? `<div style="margin-top:6px;color:#c62828;font-weight:900;font-size:14px;letter-spacing:.2px">⚠ DO NOT USE</div>`
    : '';

  $('labelArea').innerHTML = `<div class="small noprint">Selected appliance: ${esc(item.asset)} · ${esc(item.appliance)}</div><div class="labelCard" style="margin-top:10px;border-color:${headColor}">
    <div class="labelHead" style="background:${headColor}">${esc(state.company.name)}<br>PAT TEST</div>
    <div style="padding:8px 4px;font-size:13px;line-height:1.35">
      <div><b>Asset:</b> ${esc(item.asset)}</div>
      <div><b>Appliance:</b> ${esc(item.appliance)}</div>
      <div style="margin-top:4px"><b>Result:</b> <span style="color:${resultColor};font-weight:900;font-size:14px">${esc(item.result)}</span></div>
      ${warningHtml}
      <div style="margin-top:6px"><b>Tested:</b> ${fmtDateDMY(job.date)}</div>
      <div><b>Retest:</b> ${esc(nextTest(job))}</div>
    </div>
  </div>`;
}
