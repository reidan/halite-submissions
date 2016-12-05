const {
  Move,
} = require('./hlt');
const Networking = require('./networking');

const network = new Networking('dan');
const MIN_STRENGTH_TO_MOVE = 25;
const MAX_DEPTH = 15;
const MAX_STRENGTH = 255;
const DEFAULT_ORDER = [1, 4, 2, 3];
const OPPOSITES = [0,3,4,1,2];
const SITTING_PRODUCTION = 2;

var startingLocation;


var evaluateAttack = function(gameMap, id, location, currentSite, newSite) {
    var value = currentSite.strength - newSite.strength;
    if(value > 0 || currentSite.strength >= MAX_STRENGTH) {
      value += newSite.production + 2000;
      // if(newSite.owner > 0) {
      //   value += newSite.strength;
      // }
    }

    return value;
};

var evaluateDefence = function(gameMap, id, location, currentSite, newSite, direction) {
  var value = (MAX_DEPTH - recurseFindBorder(gameMap, id, gameMap.getLocation(location, direction), direction, 1)) * 200;
  if( (currentSite.strength + newSite.strength) < MAX_STRENGTH ) {
    value += newSite.strength;
  } else {
    value += 1;
  }
  return value;
};

var recurseFindBorder = function(gameMap, id, location, direction, depth) {
  const site = gameMap.getSite(location, direction);
  if( site.owner !== id ) {
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

var getOrder = function( gameMap, currentLocation ) {
  var order = [];
  var other;
  var difY = Math.abs(startingLocation.y - currentLocation.y);
  var difX = Math.abs(startingLocation.x - currentLocation.x);
  if( startingLocation.y >= currentLocation.y && difY <= Math.round(gameMap.height / 2)) {
    order.push(3);
    other = 1
  } else {
    order.push(1);
    other = 3;
  }
  if(startingLocation.x >= currentLocation.x && difX <= Math.round(gameMap.width / 2)) {
    order.push(4);
    order.push(2);
    order.push(other);
  } else {
    order.push(2);
    order.push(4);
    order.push(other);
  }
  return order;
};

var getLocationKey = function(location) {
  return '' + location.x + ';' + location.y;
}

var getNewAllowedMovesArray = function() {
  return [true, true, true, true, true];
}

var getAllowedMovesFromMap = function(map, key) {
  var values = map[key];
  if(typeof values === 'undefined' || values === null) {
    values = getNewAllowedMovesArray();
    map[key] = values;
  }
  return values;
}

var mergeAllowedValues = function(map, key, array) {
  var values = getAllowedMovesFromMap(map, key);
  for(var i = 0; i < 5; i++) {
    values[i] = values[i] && array[i];
  }
}

var lastMoves = {};

network.on('map', (gameMap, id) => {
  const moves = [];
  var newLastMoves = {};
  for (let y = 0; y < gameMap.height; y++) {
    for (let x = 0; x < gameMap.width; x++) {
      const loc = { x, y };
      const site = gameMap.getSite(loc);
      if (site.owner === id) {
        var order;
        // if(typeof startingLocation === 'undefined' || startingLocation === null) {
          // startingLocation = loc;
          order = DEFAULT_ORDER;
        // } else {
          // order = getOrder(gameMap, loc);
        // }
        if(site.strength > MIN_STRENGTH_TO_MOVE) {
          var bestValue = 0;
          var bestMove = 0;
          var movesToEvaluate = [];
          var isAtBorder = false;
          for(var i = 0; i < 4; i++) {
            const dir = order[i];
            const newSite = gameMap.getSite(loc, dir);
            var value;
            if( newSite.owner !== id ) {
              isAtBorder = true;
              value = evaluateAttack(gameMap, id, loc, site, newSite);
              movesToEvaluate.push({isAttack: true, dir: dir, value: value});
            } else if(!isAtBorder) {
              value = evaluateDefence(gameMap, id, loc, site, newSite, dir);
              movesToEvaluate.push({isAttack: false, dir: dir, value: value});
            }
          }
          for(var i = 0; i < movesToEvaluate.length; i++) {
            var move = movesToEvaluate[i];
            if(move.value > 0 && move.value > bestValue && (!isAtBorder || move.isAttack)){//} || site.production < SITTING_PRODUCTION )) {
              bestValue = move.value;
              bestMove = move.dir;
              
              var newLocation = gameMap.getLocation(loc, bestMove);
              var newKey = getLocationKey(newLocation);
              var oldKey = getLocationKey(loc);
              var allowedValues = getAllowedMovesFromMap(lastMoves, oldKey);
              var newAllowedValues = getAllowedMovesFromMap(newLastMoves, newKey);

              if( bestMove > 0 && allowedValues[bestMove] ) {
                newAllowedValues[OPPOSITES[bestMove]] = false;
              } else {
                if(bestMove > 0) {
                  mergeAllowedValues(newLastMoves, oldKey, allowedValues);
                }
                bestMove = 0;
              }
            }
          }
          moves.push(new Move(loc, bestMove));
        } else {
          moves.push(new Move(loc, 0));
        }
      }
    }
  }
  lastMoves = newLastMoves;
  network.sendMoves(moves);
});
