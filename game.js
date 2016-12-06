// Settings
var CANVAS_WIDTH = 500;
var CANVAS_HEIGHT = 500;
var FPS = 30;
var MISSILE_SPEED = 10;
var EXPLOSION_SIZE = 24;
var LAUNCH_RATE = 50;
var UFO_SPEED = 3;
var PLANE_SPEED = 2;

// Scoring
var UFO_SCORE = 5;
var PLANE_SCORE = -5;
var MISSILE_SCORE = 2;
var REMAINING_MISSILE_SCORE = 1;
var REMAINING_BASE_SCORE = 2;
var REMAINING_CITY_SCORE = 5;

// Assets
var explosion_image = 'images/explosion.png';
var missile_image = 'images/missile_sprite.png';
var city_image = 'images/city.png';
var base_image = 'images/base.png';
var plane_image_east = 'images/planeeast.png';
var plane_image_west = 'images/planewest.png';
var ufo_image = 'images/ufo.png';
var ufo_image_inverse = 'images/ufo2.png';

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
  this.width = 35;
  // this.x = 65 + index*100 + this.width/2;
  if(index <= 1) {
    this.x = 55 + index*95 + this.width/2;
  } else {
    this.x = 90 + index*95 + this.width/2;
  }
  this.y = CANVAS_HEIGHT - ground.height - this.height;
};

var bases = [];

function Base(index) {
  this.destroyed = false;
  this.missiles = [];
  this.height = 31;
  this.width = 30;
  this.x = index*220 + this.width/2;
  this.y = CANVAS_HEIGHT - ground.height - this.height;
}

var firedMissiles = [];

var enemyMissiles = [];

var targets = [];

function Missile() {
  this.flying = false;
  this.height = 21;
  this.width = 6;
  this.travelUnit = {};
  this.destroyed = false;
  this.heading = 0;
};

var explosions = [];

function Explosion(object) {
  this.counter = 1;
  this.x = object.x;
  this.y = object.y;
  this.width = EXPLOSION_SIZE;
  this.height = EXPLOSION_SIZE;
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
        newMissile.y = base.y + 34;
        newMissile.x = base.x - 2 + (i*7);
      } else {
        newMissile.y = base.y + 54;
        newMissile.x = base.x - 2 + ((i-5)*7);
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
  // var ufoCount = Math.round(Math.random() * (game.level));
  // for(var i=0; i<ufoCount; i++) {
    ufos.push(new UFO());
  // }
}

function initPlanes() {
  // var planeCount = Math.round(Math.random() * (game.level));
  // for(var i=0; i<planeCount; i++) {
    planes.push(new Plane());
  // }
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

      // Calculate score
      var remainingCities = cities.length;
      var remainingMissiles = 0;
      var remainingBases = 0;
      for(var base in bases) {
        var base = bases[base];
        remainingBases += 1;
        remainingMissiles += base.missiles.length;
      }
      game.levelScore += remainingBases + remainingCities + remainingMissiles;
      game.totalScore += remainingBases + remainingCities + remainingMissiles;

      // Update overlay and clear everything out
      overlay.title = 'You beat level ' + game.level + '!';
      overlay.subTitle = 'Your score: ' + game.levelScore + ". (Press space to continue)";
      restartGame(true);


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
    game.levelScore = 0;
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
        addScore(MISSILE_SCORE);
      }      
    }
    // check collisions with cities
    for(var city in cities) {
      var city = cities[city];
      if(explosionCollided(explosion, city)) {
        explosions.push(new Explosion(city));
        city.destroyed = true;
      }
    }
    // check collisions with bases
    for(var base in bases) {
      var base = bases[base];
      if(explosionCollided(explosion, base)) {
        explosions.push(new Explosion(base));
        base.destroyed = true;
        base.missiles = [];
      }
    }

    // check collisions with UFOs
    for(var ufo in ufos) {
      var ufo = ufos[ufo];
      if(explosionCollided(explosion, ufo)) {
        explosions.push(new Explosion(ufo));
        ufo.destroyed = true;
        ufo.flying = false;
        addScore(UFO_SCORE);
      }
    }

    // check collisions with Planes
    for(var plane in planes) {
      var plane = planes[plane];
      if(explosionCollided(explosion, plane)) {
        explosions.push(new Explosion(plane));
        plane.destroyed = true;
        plane.flying = false;
        addScore(PLANE_SCORE);
      }
    }

    if(explosion.counter === 0) {
      index = explosions.indexOf(explosion);  
      explosions.splice(index, 1);
    } else {
      explosion.counter += 1;
      if(explosion.counter >= 60) {
        explosion.counter = 0;
      }
    } 
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

  // get vector to target
  missile.targetX = x;
  missile.targetY = y;
  var pathToTarget = new Vector(x - missile.x, y - missile.y);
  
  // get direction in degrees for missile angle and assign direction
  var radians = Math.atan2(pathToTarget.y, pathToTarget.x);
  var degrees = Math.round(radians * (180 / Math.PI));
  if(degrees <= 22.5 && degrees >= -22.5) {
    missile.direction = 'e';
  } else if (degrees < -22.5 && degrees >= -67.5) {
    missile.direction = 'ne';
  } else if (degrees < -67.5 && degrees >= -112.5) {
    missile.direction = 'n';
  } else if (degrees < -112.5 && degrees >= -157.5) {
    missile.direction = 'nw';
  } else if (degrees < -157.5 && degrees >= -190) {
    missile.direction = 'w';
  } else if (degrees < 157.5 && degrees >= 112.5) {
    missile.direction = 'sw';
  } else if (degrees < 112.5 && degrees >= 67.5) {
    missile.direction = 's';
  } else if (degrees < 67.5 && degrees >= 22.5) {
    missile.direction = 'se';
  }

  // get travel unit for updating position
  missile.travelUnit = Vector.normalize(pathToTarget);
  missile.flying = true;
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
  // Draw scores
  c.fillStyle = 'gray';
  c.font = "1em Arial";
  var levelScore = "Level Score: " + game.levelScore;
  c.fillText(levelScore, 30, 25);

  var totalScore = "Total Score: " + game.totalScore;
  c.fillText(totalScore, CANVAS_WIDTH - c.measureText(totalScore).width - 30, 25);

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
  for(var base in bases) {
    var base = bases[base];
    if(!base.destroyed) {
      baseImage = new Image();
      baseImage.src = base_image;   
      c.drawImage(baseImage, base.x, base.y, baseImage.width, baseImage.height);
    }
  }
  for(var base in bases) {
    var base = bases[base];
    if(!base.destroyed) {
      for(var missile in base.missiles) {
        var missile = base.missiles[missile];
        missileImage = new Image();
        missileImage.src = missile_image;   
        c.drawImage(
          missileImage, 
          0,0,6,21,
          missile.x, missile.y, missile.width, missile.height);
      }
    }
  }
}

function drawCities(c) {
  for(var city in cities) {
    var city = cities[city];
    if(!city.destroyed) {
      cityImage = new Image();
      cityImage.src = city_image; 
      c.drawImage(cityImage, city.x, city.y, cityImage.width, cityImage.height);
    }
  }
}

function drawFiredMissiles(c) {
  for(var missile in firedMissiles) {
    var missile = firedMissiles[missile];
    if(missile.direction === 'n') {
      var x = 0;
      var w = 10;
    } else if (missile.direction === 'ne') {
      var x = 21;
      var w = 17;
    } else if (missile.direction === 'e') {
      var x = 42;
      var w = 21;
    } else if (missile.direction === 'se') {
      var x = 63;
      var w = 17;
    } else if (missile.direction === 's') {
      var x = 84;
      var w = 10;
    } else if (missile.direction === 'sw') {
      var x = 105;
      var w = 17;
    } else if (missile.direction === 'w') {
      var x = 126;
      var w = 21;
    } else if (missile.direction === 'nw') {
      var x = 147      
      var w = 17;
    }
    if(missile.flying) {
      missileImage = new Image();
      missileImage.src = missile_image;   
      c.drawImage(
      missileImage, 
      x,0,21,21,
      missile.x, missile.y, w, 21);
    }
  }
}

function drawExplosions(c) {
  for(var explosion in explosions) {
    var explosion = explosions[explosion];
    var i = explosion.counter;
    var explosionImage = new Image();
    explosionImage.src = explosion_image;
    c.drawImage(
    explosionImage, 
    (i%9)*25,Math.floor(i/9)*25,25,24,
    explosion.x, explosion.y, 25, 24);
  }
}

function drawUFOs(c) {
  for(var ufo in ufos) {
    var ufo = ufos[ufo];
    if(ufo.flying) {
      ufoImage = new Image();
      if(game.counter % 10 === 0) {
        ufoImage.src = ufo_image; 
      } else {
        ufoImage.src = ufo_image_inverse; 
      }
      c.drawImage(ufoImage, ufo.x, ufo.y, ufoImage.width, ufoImage.height);
    }
  }
}

function drawPlanes(c) {
  for(var plane in planes) {
    var plane = planes[plane];
    if(plane.flying) {
      planeImage = new Image();
      if(plane.direction === 'east') {
        planeImage.src = plane_image_east; 
      } else {
        planeImage.src = plane_image_west; 
      }
      c.drawImage(planeImage, plane.x, plane.y, planeImage.width, planeImage.height);
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

function addScore(score) {
  game.levelScore += score;
  game.totalScore += score;
}