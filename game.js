// Settings
var CANVAS_WIDTH = 500;
var CANVAS_HEIGHT = 500;
var FPS = 30;
var MISSILE_SPEED = 10;
var EXPLOSION_SIZE = 30;
var LAUNCH_RATE = 50;
var UFO_SPEED = 3;
var PLANE_SPEED = 2;

// Assets
var missile_image = '';
var city_image = '';
var plane_image = '';
var ufo_image = '';
var crosshairs_image = '';

// Canvas
var $canvasElement = $("#canvas");
$canvasElement.attr('width', CANVAS_WIDTH);
$canvasElement.attr('height', CANVAS_HEIGHT);
var c = $canvasElement[0].getContext('2d');

// Game elements
var game = {
  state: 'start',
  level: 1,
  levelScore: 0,
  totalScore: 0,
  counter: 0
};

var keyboard = {

};

var crosshairs = {
  x: (CANVAS_WIDTH/2 - 15),
  y: (CANVAS_HEIGHT/2 - 15),
  radius: 10,
  fired: false
};

var player = {
  destroyedMissiles: []
};

var ground = {
  height: 100
}

var cities = [];

function City(index) {
  this.destroyed = false;
  this.height = 35;
  this.width = 25;
  this.x = 75 + index*100 + this.width/2;
  this.y = CANVAS_HEIGHT - ground.height - this.height;
};

var bases = [];

function Base(index) {
  this.destroyed = false;
  this.missiles = [];
  this.height = 20;
  this.width = 40;
  this.x = index*210 + this.width/2;
  this.y = CANVAS_HEIGHT - ground.height - this.height;
}

var firedMissiles = [];

var enemyMissiles = [];

var targets = [];

function Missile() {
  this.flying = false;
  this.height = 5;
  this.width = 2;
  this.travelUnit = {};
  this.destroyed = false;
};

var explosions = [];

function Explosion(object) {
  this.counter = 1;
  this.x = object.x;
  this.y = object.y;
  this.width = 0;
  this.height = 0;
}

var overlay = {
  title: 'Missile Command',
  subTitle: 'Press spacebar to start',
  flash: ''
};

var ufos = [];

function UFO() {
  this.flying = false;
  this.height = 20;
  this.width = 20;
  this.x = 0;
  this.y = 0;
}

var planes = [];

function Plane() {
  this.flying = false;
  this.height = 15;
  this.width = 35;
  this.x = 0;
  this.y = 0; 
}

// Setup 
function initCities() {
  for(var i=0; i<4; i++) {
    var newCity = new City(i);
    cities.push(newCity);
    targets.push(newCity);
  }
}

function initBases() {
  for(var i=0; i<3; i++) {
    var newBase = new Base(i);
    bases.push(newBase);
    targets.push(newBase);
  }
}

function initPlayerMissiles() {
  for(var base in bases) {
    var base = bases[base];
    for(var i=0; i<10; i++) {
      var newMissile = new Missile();
      base.missiles.push(newMissile);
      if(i<5) {
        newMissile.y = base.y + 3;
        newMissile.x = base.x + 5 + (i*7);
      } else {
        newMissile.y = base.y + 12;
        newMissile.x = base.x + 5 + ((i-5)*7);
      }
    }
  }
}

function initEnemyMissiles() {
  for(var i=0; i<10+game.level; i++) {
    var newMissile = new Missile();
    // randomly choose starting position
    newMissile.y = 0;
    newMissile.x = Math.floor(Math.random() * CANVAS_WIDTH) + 1;
    enemyMissiles.push(newMissile);
  }
}

function initUFOs() {
  var ufoCount = Math.round(Math.random() * (game.level));
  for(var i=0; i<ufoCount; i++) {
    ufos.push(new UFO());
  }
}

function initPlanes() {
  var planeCount = Math.round(Math.random() * (game.level));
  for(var i=0; i<planeCount; i++) {
    planes.push(new Plane());
  }
}

function listen() { 
  $(document).bind('keydown', 'space', function(e) {
    keyboard[e.data.keys] = true;
  });
  $(document).bind('keyup', 'space', function(e) {
    keyboard[e.data.keys] = false;
  });
  var prevPos = [];
  $('#canvas').on('mousemove', function(e) {
    crosshairs.x = e.offsetX;
    crosshairs.y = e.offsetY;
    if(e.offsetX < 0 || e.offsetX > CANVAS_WIDTH) {
      crosshairs.x = prevPos[0] || (CANVAS_WIDTH/2 - 15);
      crosshairs.y = prevPos[1] || (CANVAS_HEIGHT/2 - 15);
    }
    if(e.offsetY < 0 || e.offsetY > (CANVAS_HEIGHT - ground.height - (new City()).height - 15)) {
      crosshairs.x = prevPos[0] || (CANVAS_WIDTH/2 - 15);
      crosshairs.y = prevPos[1] || (CANVAS_HEIGHT/2 - 15);
    }
    prevPos = [crosshairs.x, crosshairs.y];
  });
  $('#canvas').on('click', function(e) {
    if(game.state === 'playing') {
      firePlayerMissile(crosshairs.x, crosshairs.y);
    } else if (game.state === 'start' || game.state === 'paused') {
      console.log("starting game");
      game.state = 'playing';
    }
  });
}

// Game Loop
function updateGame() {
  // Winning
  if(game.state === 'next' && game.level === 10) {
    overlay.title = 'You Won!';
    overlay.subtitle = '10 levels beaten with a score of ' + game.totalScore;
    game.state = 'start';
  }

  // When in playing state
  if(game.state === 'playing')  {
    // Losing
    if(!cities.length || !bases.length) {
      overlay.title = 'You lost';
      overlay.subTitle = 'Press spacebar to start again';
      game.state = 'lost';
      restartGame(true);

    // Going to next level
    } else if(!firedMissiles.length 
          && !enemyMissiles.length && !explosions.length) {
      game.state = 'next';
      overlay.title = 'You beat level ' + game.level + '!';
      overlay.subTitle = 'Your score: ' + game.levelScore;
      planes = [];
      ufos = [];
      game.levelScore = 0;

    // Pause game
    } else if(keyboard.space) {
      console.log("pausing game");
      keyboard = {};
      game.state = 'paused';

    // By default fire enemy missiles at random targets
    } else {
      overlay.title = '';
      overlay.subTitle = '';
      game.counter += 1;
      if(game.counter % LAUNCH_RATE === 0 && enemyMissiles.length) {
        console.log("launching an enemy missile");
        var target = targets[Math.floor(Math.random() * targets.length)];
        var x = target.x + (target.width / 2);
        var y = target.y;
        fireEnemyMissile(x, y);
      }
    }
  }

  // Restarting from next state
  if(game.state === 'next' && keyboard.space) {
    keyboard = {};
    game.level += 1;
    setup();
    game.state = 'playing';
  }
  // Begin game from start state
  if((game.state === 'start' || game.state === 'lost') && keyboard.space) {
    console.log("starting game");
    restartGame();
    keyboard = {};
  }
  // Unpause game
  if(game.state === 'paused' && keyboard.space) {
    console.log("resuming game");
    game.state = 'playing';
    keyboard = {};
  }
}

function updatePlayer() {

};

function updatePlanes() {
  if(planes.length && game.counter != 0 && game.counter % 250 === 0) {
    launchPlane();
  }

  for(var plane in planes) {
    var plane = planes[plane];
    if(plane.flying && plane.direction === 'east') {
      plane.x += PLANE_SPEED;
    } else if (plane.flying && plane.direction === 'west') {
      plane.x -= PLANE_SPEED;
    } else if (plane.destroyed) {
      var index = planes.indexOf(plane);
      planes.splice(index, 1);
    }
  }
};

function updateUFOs() {
  if(ufos.length && game.counter != 0 && game.counter % 150 === 0) {
    launchUFO();
  }

  for(var ufo in ufos) {
    var ufo = ufos[ufo];
    if(ufo.flying && ufo.direction === 'east') {
      ufo.x += UFO_SPEED;
    } else if (ufo.flying && ufo.direction === 'west') {
      ufo.x -= UFO_SPEED;
    } else if (ufo.destroyed) {
      var index = ufos.indexOf(ufo);
      ufos.splice(index, 1);
    }
  }
};

function updateCities() {
  for(var city in cities) {
    var city = cities[city];
    if(city.destroyed) {
      var index = cities.indexOf(city);
      cities.splice(index, 1);
    }
  }
}

function updateBases() {
  for(var base in bases) {
    var base = bases[base];
    if(base.destroyed) {
      var index = bases.indexOf(base);
      bases.splice(index, 1);
    }
  }
}

function updateFiredMissiles() {
  if(firedMissiles.length) {
    for(var missile in firedMissiles) {
      var missile = firedMissiles[missile];
      var pathToTarget = new Vector(missile.targetX - Math.round(missile.x), missile.targetY - Math.round(missile.y));
      var distance = Math.floor(Vector.vectorLength(pathToTarget));
      if(distance <= MISSILE_SPEED || missile.destroyed) {
        if(missile.destroyed && missile.owner === 'enemy') {
          player.destroyedMissiles.push(missile);
        } else {
          // account for the MISSILE_SPEED offset
          missile.x = missile.targetX;
          missile.y = missile.targetY;
        }
        // blow it up
        missile.flying = false;
        explosions.push(new Explosion(missile));
        index = firedMissiles.indexOf(missile);  
        firedMissiles.splice(index, 1);
      } else {
        if(missile.owner === 'player') {
          missile.x += missile.travelUnit.x * MISSILE_SPEED;
          missile.y += missile.travelUnit.y * MISSILE_SPEED;
        } else {
          missile.x += missile.travelUnit.x * (MISSILE_SPEED / 7);
          missile.y += missile.travelUnit.y * (MISSILE_SPEED / 7);
        }
      }
    }
  }
}

function updateExplosions() {
  for(var explosion in explosions) {
    var explosion = explosions[explosion];

    // check collisions with missiles
    for(var missile in firedMissiles) {
      var missile = firedMissiles[missile];
      if(explosionCollided(explosion, missile)) {
        missile.destroyed = true;
      }      
    }
    // check collisions with cities
    for(var city in cities) {
      var city = cities[city];
      if(explosionCollided(explosion, city)) {
        city.destroyed = true;
      }
    }
    // check collisions with bases
    for(var base in bases) {
      var base = bases[base];
      if(explosionCollided(explosion, base)) {
        base.destroyed = true;
        base.missiles = [];
      }
    }

    // check collisions with UFOs
    for(var ufo in ufos) {
      var ufo = ufos[ufo];
      if(explosionCollided(explosion, ufo)) {
        ufo.destroyed = true;
        ufo.flying = false;
      }
    }

    // check collisions with Planes
    for(var plane in planes) {
      var plane = planes[plane];
      if(explosionCollided(explosion, plane)) {
        plane.destroyed = true;
        plane.flying = false;
      }
    }

    if(explosion.counter === 0) {
      index = explosions.indexOf(explosion);  
      explosions.splice(index, 1);
    } else if(!explosion.shrinking) {
      explosion.counter += 2;
      if(explosion.counter >= EXPLOSION_SIZE) {
        explosion.shrinking = true;
      }
    } else if(explosion.shrinking) {
      explosion.counter -= 4;
      if(explosion.counter <= 0) {
        explosion.counter = 0;
      }
    }
    explosion.height = explosion.width = explosion.counter * 2;
  }
}


// Acting
function firePlayerMissile(x,y) {
  // get missile from base and launch it
  var base = findNearestBase(x);
  if(base) {
    var missile = base.missiles.splice([base.missiles.length-1], 1)[0];
    // set starting coords to nearest base
    missile.x = base.x + (base.width/2);
    missile.y = CANVAS_HEIGHT 
          - (ground.height+base.height) - (crosshairs.radius/2);
    missile.owner = 'player';
    fireMissile(missile,x,y);
  } else {
    console.log("All out of missiles");
    overlay.flash = "All out of missiles";
  }
}

function fireEnemyMissile(x,y) {
  // get last enemyMissile and launch it
  var missile = enemyMissiles.splice(enemyMissiles.length - 1)[0];
  missile.owner = 'enemy';
  fireMissile(missile,x,y);
}

function fireMissile(missile,x,y) {
  firedMissiles.push(missile);
  missile.targetX = x;
  missile.targetY = y;
  var pathToTarget = new Vector(x - missile.x, y - missile.y);
  missile.travelUnit = Vector.normalize(pathToTarget);
  missile.flying = true;
  // shrink missile to head
  missile.height = 2;
  missile.width = 2;
}

function launchUFO() {
  var ufo = ufos[ufos.length-1];
  ufo.flying = true;
  var directions = ['east', 'west'];
  var random = Math.floor(Math.random() * 2);
  ufo.direction = directions[random];
  ufo.x = ufo.direction === 'east' ? ufo.x = 0 - (ufo.width + 5) : ufo.x = CANVAS_WIDTH + 5;
  ufo.y = CANVAS_HEIGHT - 400;
}

function launchPlane() {
  var plane = planes[planes.length-1];
  plane.flying = true;
  var directions = ['east', 'west'];
  var random = Math.floor(Math.random() * 2);
  plane.direction = directions[random];
  plane.x = plane.direction === 'east' ? plane.x = 0 - (plane.width + 5) : plane.x = CANVAS_WIDTH + 5;
  plane.y = CANVAS_HEIGHT - 350;
}


// Drawing
function drawBackground(c) {
  c.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  c.fillStyle = 'black';
  c.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT-ground.height);
  c.fillStyle = 'brown';
  c.fillRect(0, CANVAS_HEIGHT-ground.height, CANVAS_WIDTH, ground.height);
}

function drawCrosshairs(c) {
  c.beginPath();

  // Circle alternative for crosshairs
  // c.arc(crosshairs.x, crosshairs.y, crosshairs.radius, 0, Math.PI*2, false);

  // Crosshairs as a cross
  c.moveTo(crosshairs.x, crosshairs.y);
  c.lineTo(crosshairs.x + crosshairs.radius, crosshairs.y);
  c.moveTo(crosshairs.x, crosshairs.y);
  c.lineTo(crosshairs.x, crosshairs.y + crosshairs.radius);
  c.moveTo(crosshairs.x, crosshairs.y);
  c.lineTo(crosshairs.x - crosshairs.radius, crosshairs.y);
  c.moveTo(crosshairs.x, crosshairs.y);
  c.lineTo(crosshairs.x, crosshairs.y - crosshairs.radius);
  c.moveTo(crosshairs.x, crosshairs.y);

  c.closePath();
  c.strokeStyle = 'white';
  c.stroke();
}

function drawOverlay(c) {
  if(overlay.title) {
    c.fillStyle = 'white';
    c.font = "3em Arial";
    var titleHalf = c.measureText(overlay.title).width / 2;
    c.fillText(overlay.title, (CANVAS_WIDTH / 2) - titleHalf, 150);
  }
 
  if(overlay.subTitle) {
    c.fillstyle = 'gray';
    c.font = "1.5em Arial";
    var subTitleHalf = c.measureText(overlay.subTitle).width / 2;
    c.fillText(overlay.subTitle, (CANVAS_WIDTH / 2) - subTitleHalf, 200);
  }
}

function drawBases(c) {
  c.fillStyle = 'green';
  for(var base in bases) {
    var base = bases[base];
    if(!base.destroyed) {
      c.fillRect(base.x, base.y, base.width, base.height);
    }
  }
  c.fillStyle = 'purple';
  for(var base in bases) {
    var base = bases[base];
    if(!base.destroyed) {
      for(var missile in base.missiles) {
        var missile = base.missiles[missile];
        c.fillRect(missile.x, missile.y, missile.width, missile.height);
      }
    }
  }
}

function drawCities(c) {
  for(var city in cities) {
    var city = cities[city];
    if(!city.destroyed) {
      c.fillStyle = 'gray';
      c.fillRect(city.x, city.y, city.width, city.height);
    }
  }
}

function drawFiredMissiles(c) {
  for(var missile in firedMissiles) {
    var missile = firedMissiles[missile];
    if(missile.owner === 'enemy') {
      c.fillStyle = 'red';
    } else {
      c.fillStyle = 'white';
    }
    if(missile.flying) {
      c.fillRect(missile.x, missile.y, missile.width, missile.height);

      // can't get rotate to work 
      // if(missile.direction === 'east') { 
      //   c.save();
      //   c.translate(missile.x, missile.y + (missile.height/2));
      //   c.rotate(Math.PI / 4);
      //   c.fillRect(missile.x, missile.y, missile.width, missile.height);
      //   c.restore();
      // } else if(missile.direction === 'west') {
      //   c.save();
      //   c.translate(missile.x, missile.y + (missile.height/2));
      //   c.rotate(Math.PI / 2);
      //   c.fillRect(missile.x, missile.y, missile.width, missile.height);
      //   c.restore();
      // } else {
      //   c.fillRect(missile.x, missile.y, missile.width, missile.height);
      // }
    }
  }
}

function drawExplosions(c) {
  for(var explosion in explosions) {
    var explosion = explosions[explosion];
    if(explosion.counter >= EXPLOSION_SIZE) {
      continue;
    } else {
      c.fillStyle = 'orange';    
      c.moveTo(explosion.x, explosion.y);
      c.beginPath();
      c.arc(explosion.x, explosion.y, explosion.counter, 0, Math.PI*2);
      c.fill();
    }
  }
}

function drawUFOs(c) {
  for(var ufo in ufos) {
    var ufo = ufos[ufo];
    if(ufo.flying) {
      c.fillStyle = 'yellow';
      c.fillRect(ufo.x, ufo.y, ufo.width, ufo.height);
    }
  }
}

function drawPlanes(c) {
  for(var plane in planes) {
    var plane = planes[plane];
    if(plane.flying) {
      c.fillStyle = 'green';
      c.fillRect(plane.x, plane.y, plane.width, plane.height);
    }
  }
}

// Helpers
function findNearestBase(x) {
  var third = x/CANVAS_WIDTH;
  if(bases[0] && third > 0 && third < 0.33 && bases[0].missiles.length) {
    return bases[0];
  } else if (bases[1] && third >= 0.33 && third < 0.66 && bases[1].missiles.length && !bases[1].destroyed) {
    return bases[1];
  } else if (bases[2] && third >= 0.66 && third <= 1 && bases[2].missiles.length && !bases[2].destroyed) {
    return bases[2];
  } else {
    for(var i=0; i<bases.length; i++) {
      if(bases[i].missiles.length && !bases[i].destroyed) {
        return bases[i];
      } 
    }
  }
}

// Thanks to http://joshondesign.com/p/books/canvasdeepdive
function collided(a, b) {
    //check for horz collision
    if(b.x + b.width >= a.x && b.x < a.x + a.width) {
        //check for vert collision
        if(b.y + b.height >= a.y && b.y < a.y + a.height) {
            return true;
        }
    }
    //check a inside b
    if(b.x <= a.x && b.x + b.width >= a.x+a.width) {
        if(b.y <= a.y && b.y + b.height >= a.y + a.height) {
            return true;
        }
    }
    //check b inside a
    if(a.x <= b.x && a.x + a.width >= b.x+b.width) {
        if(a.y <= b.y && a.y + a.height >= b.y+b.height) {
            return true;
        }
    }
    return false;
}

function explosionCollided(explosion, object) {
  object.radius = object.width / 2 || 1;
  explosion.radius = explosion.width / 2;
  var dx = explosion.x - object.x;
  var dy = explosion.y - object.y;
  var distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < explosion.radius + object.radius) {
    return true;
  }
  return false;
}

// Thanks to https://www.smashingmagazine.com/2015/09/principles-of-html5-game-design/ 
//  for helping me understand the basic trig needed for this 
//  and for the skeleton of these functions
function Vector(x, y) {
  this.x = x;
  this.y = y;
}
Vector.vectorLength = function(vector) { 
  return Math.sqrt(vector.x*vector.x + vector.y*vector.y); 
};
Vector.normalize = function(vector) {
  var length = Vector.vectorLength(vector);

  if (length > 0) {
    vector.x /= length;
    vector.y /= length;
    return vector;
  } else {
    return vector;
  }
};

function restartGame(cleanupOnly) {
    cities = [];
    bases = [];
    planes = [];
    ufos = [];
    enemyMissiles = [];
    firedMissiles = [];
    explosions = [];
    game.counter = 0;
    game.level = 1;    
    if(!cleanupOnly) {
      game.levelScore = 0;
      game.totalScore = 0;
      setup();
      game.state = 'playing';
    }
}

