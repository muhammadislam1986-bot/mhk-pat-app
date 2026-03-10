
(function(){
  function bindPrintButton(){
    const btn = document.getElementById('printLabelBtn');
    if(!btn || btn.dataset.boundPrintFix === '1') return;
    btn.dataset.boundPrintFix = '1';

    btn.onclick = function(){
      try{
        if(typeof window.renderLabel === 'function') window.renderLabel();
      }catch(e){}

      const w = ((document.getElementById('lblW') && document.getElementById('lblW').value) || '50') + 'mm';
      const h = ((document.getElementById('lblH') && document.getElementById('lblH').value) || '30') + 'mm';

      document.body.classList.add('print-label');

      let style = document.getElementById('labelPrintStyle');
      if(style) style.remove();
      style = document.createElement('style');
      style.id = 'labelPrintStyle';
      style.textContent = `
@page { size: ${w} ${h}; margin: 0; }
@media print {
  html, body {
    width: ${w} !important;
    height: ${h} !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
  }

  body.print-label * {
    visibility: hidden !important;
  }

  body.print-label #labelsView,
  body.print-label #labelsView * {
    visibility: visible !important;
  }

  body.print-label #labelsView {
    display: block !important;
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: ${w} !important;
    min-width: ${w} !important;
    max-width: ${w} !important;
    background: #fff !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  body.print-label #labelsView .card,
  body.print-label #labelsView .body {
    border: none !important;
    box-shadow: none !important;
    background: #fff !important;
    margin: 0 !important;
    padding: 0 !important;
    border-radius: 0 !important;
  }

  body.print-label #labelsView h2,
  body.print-label #labelsView .notice,
  body.print-label #labelsView .grid,
  body.print-label #labelsView .btns,
  body.print-label #labelsView .small.noprint {
    display: none !important;
  }

  body.print-label #labelArea {
    margin: 0 !important;
    padding: 0 !important;
    width: ${w} !important;
  }

  body.print-label .labelCard {
    width: ${w} !important;
    min-height: ${h} !important;
    margin: 0 !important;
    padding: 2mm !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
}`;
      document.head.appendChild(style);

      setTimeout(function(){ window.print(); }, 100);
    };
  }

  window.addEventListener('afterprint', function(){
    document.body.classList.remove('print-label');
    const style = document.getElementById('labelPrintStyle');
    if(style) style.remove();
  });

  window.addEventListener('load', bindPrintButton);
  document.addEventListener('click', function(e){
    const t = e.target;
    if(t && t.matches && (t.matches('[data-view="labelsView"]') || t.id === 'toLabelsBtn' || t.id === 'printLabelBtn')){
      setTimeout(bindPrintButton, 50);
    }
  });
  setInterval(bindPrintButton, 1000);
})();
