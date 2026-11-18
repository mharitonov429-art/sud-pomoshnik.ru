(function(){var s=document.getElementById('d');if(!s)return;
s.addEventListener('change',function(){var v=s.value;
document.querySelectorAll('[data-d]').forEach(function(n){n.hidden=!!v&&n.getAttribute('data-d')!==v});
if(v)document.dispatchEvent(new Event('calc:used'))});})();
