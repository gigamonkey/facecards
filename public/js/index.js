import { $, $$ } from './dom.js';

$$('.card').forEach(card => {
  card.onclick = () => {
    const back = card.querySelector('.back');
    if (getComputedStyle(back).display === 'none') {
      back.style.display = 'block';
    } else {
      back.style.display = 'none';
    }
  }
});
