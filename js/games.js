/* ============================================
   GAMES MODULE - Memory Game
   ============================================ */

const Games = (() => {
  let memoryState = { cards: [], flipped: [], matched: [], moves: 0, started: false };

  const emojis = ['&#128150;', '&#128151;', '&#128152;', '&#128153;', '&#128154;', '&#128155;', '&#128156;', '&#128157;', '&#128158;', '&#128159;', '&#127800;', '&#127801;', '&#127802;', '&#127803;', '&#127804;'];

  // --- MEMORY GAME ---
  function initMemoryGame() {
    document.getElementById('memory-start').addEventListener('click', startMemoryGame);
  }

  function startMemoryGame() {
    const numPairs = 8; // 8 pairs = 16 cards
    const selectedEmojis = shuffle([...emojis]).slice(0, numPairs);

    // Create pairs
    let cards = [];
    selectedEmojis.forEach((emoji, i) => {
      cards.push({ id: i * 2, emoji, pairId: i });
      cards.push({ id: i * 2 + 1, emoji, pairId: i });
    });
    cards = shuffle(cards);

    memoryState = { cards, flipped: [], matched: [], moves: 0, started: true };

    document.getElementById('memory-moves').textContent = '0';
    document.getElementById('memory-pairs').textContent = '0';
    document.getElementById('memory-total-pairs').textContent = numPairs;

    renderMemoryCards();
  }

  function renderMemoryCards() {
    const container = document.getElementById('memory-cards');
    container.innerHTML = memoryState.cards.map(card => `
      <div class="memory-card" data-id="${card.id}" onclick="Games.flipCard(${card.id})">
        <div class="memory-card-inner">
          <div class="memory-card-front">&#10084;</div>
          <div class="memory-card-back">${card.emoji}</div>
        </div>
      </div>
    `).join('');
  }

  function flipCard(id) {
    if (!memoryState.started) return;
    if (memoryState.flipped.length >= 2) return;

    const card = memoryState.cards.find(c => c.id === id);
    if (!card || memoryState.matched.includes(card.pairId)) return;
    if (memoryState.flipped.find(f => f.id === id)) return;

    const cardEl = document.querySelector(`[data-id="${id}"]`);
    if (cardEl) cardEl.classList.add('flipped');

    memoryState.flipped.push(card);

    if (memoryState.flipped.length === 2) {
      memoryState.moves++;
      document.getElementById('memory-moves').textContent = memoryState.moves;

      const [first, second] = memoryState.flipped;

      if (first.pairId === second.pairId) {
        // Match!
        memoryState.matched.push(first.pairId);
        document.getElementById('memory-pairs').textContent = memoryState.matched.length;

        setTimeout(() => {
          memoryState.flipped = [];
          // Check win
          if (memoryState.matched.length === memoryState.cards.length / 2) {
            setTimeout(() => {
              alert('Congratulations! You completed the memory game in ' + memoryState.moves + ' moves!');
            }, 500);
          }
        }, 500);
      } else {
        // No match - flip back
        setTimeout(() => {
          const el1 = document.querySelector(`[data-id="${first.id}"]`);
          const el2 = document.querySelector(`[data-id="${second.id}"]`);
          if (el1) el1.classList.remove('flipped');
          if (el2) el2.classList.remove('flipped');
          memoryState.flipped = [];
        }, 1000);
      }
    }
  }

  // --- HELPERS ---
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function init() {
    initMemoryGame();
  }

  return { init, flipCard };
})();
