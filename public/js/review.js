import { $, $$ } from './dom.js';
import { shuffled } from './random.js';

class State {

  constructor(cards) {
    this.deck = shuffled(cards);
    this.missed = [];
    this.done = [];
    this.numberMissed = 0;
  }

  summary() {
    return `In deck: ${this.deck.length}\nMissed: ${this.missed.length}\nDone: ${this.done.length}`;
  }

  next() {

    if (this.deck.length === 0 && this.missed.length > 0) {
      console.log(`Moving missed to deck`);
      this.deck = this.missed;
      this.missed = [];
    }

    if (this.deck.length > 0) {
      return this.deck.pop();
    } else {
      return null;
    }
  }

  correct(card) {
    this.done.push(card);
  }

  incorrect(card) {
    this.missed.push(card);
    this.numberMissed++;
  }
}

const cards = $('#cards').querySelectorAll('div.card');

let current = null;
let state = null;

const start = () => {
  state = new State(cards);
  console.log(`Deck is ${state.deck.length} cards`);
  next();
}

const next = () => {
  current = state.next();
  if (current === null) {
    $('#current').innerText = `Done!${state.numberMissed === 0 ? ' Perfect run!' : ''}`;
  } else {
    $('#current').replaceChildren(current);
  }
  console.log(state.summary());
}

let touchStart = undefined;

document.body.ontouchstart = (e) => {
  touchStart = e.touches[0].clientX;
};

document.body.ontouchend = (e) => {
  const touchEnd = e.changedTouches[0].clientX;
  const d = Math.abs(touchEnd - touchStart);
  if (d > 50) {
    if (touchEnd > touchStart) {
      handleEvent('right');
    } else {
      handleEvent('left');
    }
  } else {
    handleEvent('none');
  }
};

// Suppress scrolling.
document.addEventListener('touchmove', (e) =>  { e.preventDefault(); }, { passive: false });

window.onkeydown = (e) => {
  let direction;
  if (e.code === 'ArrowLeft') {
    direction = 'left';
  } else if (e.code === 'ArrowRight') {
    direction = 'right';
  } else {
    direction = 'none';
  }
  handleEvent(direction);
};


const handleEvent = (direction) => {
  if (current) {
    const back = current.querySelector('.back');
    if (getComputedStyle(back).display === 'none') {
      back.style.display = 'block';
    } else {
      if (direction === 'left') {
        state.incorrect(current);
      } else if (direction === 'right') {
        state.correct(current);
      } else {
        return; // ignore; don't change anything
      }
      back.style.display = 'none';
      next();
    }
  }
};

start();
