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

    // 0. If there is only one row and it is not full, there is no next as
    // we've moved everything into a sufficiently large row and are done.

    if (this.deck.length === 0 && this.rows.length === 1 && !this.currentRow().isOverfull()) {
      return null;
    }

    // 1. We are in the middle of moving up, having just added a correct
    // answer to some non-zero row. In that case, if that row is now overfull,
    // we take the card from that row. Otherwise we revert to the default case
    if (this.currentRow().isOverfull()) {
      return this.currentRow().next();
    }

    // 2. Either we got one wrong and just added put a card back at the front
    // of row zero or we promoted a card until a not-full row and therefore
    // are back at zero.
    //
    // In either case where row is zero, if it is overfull, pop the next card
    // from the row. If it is not and the if the deck is not empty, put a card
    // from the deck into row zero and try again. If the deck is empty, remove
    // row zero from rows and make it the deck and try again.

    if (this.firstRow().isOverfull()) {
      return this.currentRow().next();
    } else {
      if (this.deck.length > 0) {
        this.firstRow().add(this.deck.pop());
      } else {
        this.deck = this.rows.shift();
      }
      return this.next();
    }
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
  //$('#progress').innerText = `${state.togo()} of ${state.steps}`;
  if (current === null) {
    alert('done');
  } else {
    $('#current').replaceChildren(current);
  }
  console.log(state.summary());
}

console.log(`Deck is ${state.deck.length} cards`);

next();

window.onkeydown = (e) => {
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
};
