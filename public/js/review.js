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
  state = new State([...cards].slice(0, 5));
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

window.onkeydown = (e) => {
  if (current) {
    const back = current.querySelector('.back');
    if (getComputedStyle(back).display === 'none') {
      back.style.display = 'block';
    } else {
      if (e.code === 'ArrowLeft') {
        state.incorrect(current);
      } else if (e.code === 'ArrowRight') {
        state.correct(current);
      } else {
        return; // ignore key; don't change anything
      }
      back.style.display = 'none';
      next();
    }
  }
};

start();
