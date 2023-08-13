import { $, $$ } from './dom.js';
import { shuffled } from './random.js';

class Row {
  constructor(size) {
    this.size = size;
    this.cards = [];
  }

  isOverfull() {
    return this.cards.length > this.size;
  }

  next() {
    return this.cards.pop();
  }

  add(card) {
    this.cards.unshift(card);
  }

}

class State {

  constructor(cards) {
    this.deck = shuffled(cards);
    this.row = 0;
    this.rows = [];

    let a = 0;
    let b = 1;
    while (a < this.deck.length) {
      this.rows.push(new Row(a));
      [ a, b ] = [ b, a + b ];
    }
    this.rows.push(new Row(a));

    this.steps = this.deck.length * this.rows.length;
  }

  done() {
    return (this.deck.length * this.rows.length)
      + this.rows.reduce((acc, row, i) => acc + ((this.rows.length - (i + 1)) * row.cards.length), 0)
      + this.rows.length - this.row;

  }

  togo() { return this.steps - this.done(); }

  firstRow() {
    return this.rows[0];
  }

  currentRow() {
    return this.rows[this.row];
  }

  summary() {
    let s = `Rows: ${this.rows.length}\nIn deck: ${this.deck.length}\nCurrent row: ${this.row}\n`;
    this.rows.forEach((r, i) => {
      s += `  [${i}]: size: ${r.size}; cards: ${r.cards.length}\n`;
    });
    return s;
  }

  next() {

    // If we've emptied the deck and there is only one row left and it is not
    // full, there is no next as we've moved everything into a sufficiently
    // large row and are done.

    if (this.deck.length === 0 &&
        this.rows.length === 1 &&
        !this.currentRow().isOverfull())
    {
      return null;
    }

    // We are either in the middle of moving up, having just added a correct
    // answer to some non-zero row or we added an incorrect answer to the zeroth
    // row and reset this.row.
    if (this.currentRow().isOverfull()) {
      return this.currentRow().next();
    }

    // If we get here, it's because we are back at the zeroth row and it is not
    // overfull. In that case we need to fill it from the deck. If the deck is
    // empty we make the zeroth row the deck
    if (this.deck.length > 0) {
      this.firstRow().add(this.deck.pop());
    } else {
      this.deck = this.rows.shift().cards;
    }
    return this.next();
  }

  correct(card) {
    this.row++;
    this.currentRow().add(card);
    if (!this.currentRow().isOverfull()) {
      this.row = 0;
    }
  }

  incorrect(card) {
    this.row = 0;
    this.deck.push(card);
  }
}


const cards = $('#cards').querySelectorAll('div.card');

let current = null;
let state = new State(cards);

const next = () => {
  current = state.next();
  if (current === null) {
    $('#current').innerText = 'Done!';
  } else {
    $('#current').replaceChildren(current);
  }
  console.log(state.summary());
}

console.log(`Deck is ${state.deck.length} cards`);

next();

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
