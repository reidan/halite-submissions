const {
  Move,
} = require('./hlt');
const Networking = require('./networking');

const network = new Networking('the-flapper');
const MIN_STRENGTH_TO_MOVE = 25;
const MAX_DEFENCE_SIZE = 200;
const MAX_DEPTH = 5;

var order = [1, 4, 2, 3];

var evaluateAttack = function(gameMap, id, location, currentSite, newSite) {
    var value = currentSite.strength > newSite.strength;
    if(value > 0) {
      value += newSite.production + 1000;
    }
    return value;
};

var evaluateDefence = function(gameMap, id, location, currentSite, newSite, direction) {
    if( (newSite.strength + currentSite.strength) >= 255 && newSite.strength > currentSite.strength ) {
      return -1;
    } else {
      var value = 1000;
      value -= (recurseFindBorder(gameMap, id, location, direction, 0) * 150 );
      value -= newSite.strength;
      return value;
    }
};

var recurseFindBorder = function(gameMap, id, location, direction, depth) {
  const owner = gameMap.getSite(location, direction);
  if( owner !== id ) {
    return depth;
  } else {
    depth += 1;
    if( depth < MAX_DEPTH ) {
      return recurseFindBorder(gameMap, id, gameMap.getLocation(location, direction), direction, depth);
    } else {
      return depth;
    }
  }
}

network.on('map', (gameMap, id) => {
  const moves = [];

  for (let y = 0; y < gameMap.height; y++) {
    for (let x = 0; x < gameMap.width; x++) {
      const loc = { x, y };
      const site = gameMap.getSite(loc);
      if (site.owner === id) {
        if(site.strength > MIN_STRENGTH_TO_MOVE) {
          var bestValue = 0;
          var bestMove = 0;
          for(var i = 0; i < 4; i++) {
            const dir = order[i];
            const newSite = gameMap.getSite(loc, dir);
            var value;
            if( newSite.owner !== id ) {
              value = evaluateAttack(gameMap, id, loc, site, newSite);
            } else {
              value = evaluateDefence(gameMap, id, loc, site, newSite, dir);
            }
            if(value > 0 && value > bestValue) {
              bestValue = value;
              bestMove = dir;
            }
          }
          moves.push(new Move(loc, bestMove));
        } else {
          moves.push(new Move(loc, 0));
        }
      }
    }
  }

  network.sendMoves(moves);
});
