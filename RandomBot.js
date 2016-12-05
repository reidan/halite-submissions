const {
  Move,
} = require('./hlt');
const Networking = require('./networking');

const network = new Networking('rando');

network.on('map', (gameMap, id) => {
  const moves = [];

  for (let y = 0; y < gameMap.height; y++) {
    for (let x = 0; x < gameMap.width; x++) {
      const loc = { x, y };
      const site = gameMap.getSite(loc);
      if (site.owner === id) {
        if(site.strength > 100) {
          moves.push(new Move(loc, Math.floor(Math.random() * 5)));
        } else {
          moves.push(new Move(loc, 0));
        }
      }
    }
  }

  network.sendMoves(moves);
});
