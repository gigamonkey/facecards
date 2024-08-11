import { $, $$ } from './dom.js';

$$('.card').forEach(card => {
  card.dataset.showing = 'front';
  const img = card.querySelector('img');
  const back = card.querySelector('.back');
  back.style.width = img.offsetWidth;

  card.onclick = () => {
    if (card.dataset.showing === 'front') {
      img.style.display = 'none';
      back.style.display = 'flex';
      card.dataset.showing = 'back';
    } else {
      img.style.display = 'block';
      back.style.display = 'none';
      card.dataset.showing = 'front';
    }
  };

});
