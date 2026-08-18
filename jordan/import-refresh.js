// Refresh all application sections after external data import without deleting local data.
(function(){
  'use strict';
  document.addEventListener('click',function(event){
    const save=event.target.closest('[data-excel-save]');
    if(!save) return;
    setTimeout(function(){
      window.dispatchEvent(new CustomEvent('qamoosi-data-imported'));
    },450);
  },true);

  window.addEventListener('storage',function(event){
    if(event.key==='qamoosi_school_pwa_v2') location.reload();
  });
})();
