(function(){var ID=114270102;function g(n){try{if(window.ym)ym(ID,'reachGoal',n)}catch(e){}}
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href^="tel:"]');if(a)g('phone_click')},true);
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href*="vk.ru/sudpomoshni"]');if(a)g('vk_click')},true);
document.addEventListener('calc:used',function(){g('calc_used')});})();
