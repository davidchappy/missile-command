// Settings
var CANVAS_WIDTH = 500;
var CANVAS_HEIGHT = 500;
var FPS = 30;
var MISSILE_SPEED = 10;
var EXPLOSION_SIZE = 24;
var LAUNCH_RATE = 50;
var UFO_SPEED = 3;
var PLANE_SPEED = 2;
var FADE_RATE = 15;

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
  counter: 0,
  sound: true
};

var keyboard = {

};

var crosshairs = {
  x: CANVAS_WIDTH/2 - 15,
  y: CANVAS_HEIGHT/2 - 15,
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
  flash: [],
  counter: -1,
  addFlash: function(message, x, y, duration) {
    this.flash[0] = message;
    this.flash[1] = x;
    this.flash[2] = y;
    this.counter = duration;
  }
};

var ufos = [];

function UFO() {
  this.destroyed = false;
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
  cities = initialize(City, cities, 4, true);
}

function initBases() {
  bases = initialize(Base, bases, 3, true);
}

function initPlayerMissiles() {
  for(var base in bases) {
    var base = bases[base]; 
    base.missiles = initialize(Missile, [], 10);
    for(var missile in base.missiles) {
      var missile = base.missiles[missile];
      var i = base.missiles.indexOf(missile);
      if(i<5) {
        // row 1 of missiles
        missile.y = base.y + 34;
        missile.x = base.x - 2 + (i*7);
      } else {
        // row 2 of missiles
        missile.y = base.y + 54;
        missile.x = base.x - 2 + ((i-5)*7);
      }
    }
  }
}

function initEnemyMissiles() {
  enemyMissiles = initialize(Missile, enemyMissiles, 10+game.level);
  for(var missile in enemyMissiles) {
    var missile = enemyMissiles[missile];
    missile.y = 0;
    missile.x = Math.floor(Math.random() * CANVAS_WIDTH) + 1;
  }
}

function initUFOs() {
  var ufoCount = Math.round(Math.random() * (game.level));
  ufos = initialize(UFO, ufos, ufoCount);
}

function initPlanes() {
  var planeCount = Math.round(Math.random() * (game.level));
  planes = initialize(Plane, planes, planeCount);
}

function initialize(gameElement, array, count, target) {
  for(var i=0; i<count; i++) {
    var newElement = new gameElement(i); 
    array.push(newElement);
    if(target) targets.push(newElement);
  }
  return array;
}

function listen() { 
  $(document).on('click', '#sound-control', function(e) {
    e.preventDefault();
    if(game.sound) {
      game.sound = false;
      $(this).text('Turn on sound');
    } else {
      game.sound = true;
      $(this).text('Turn off sound');[]
    }
  });
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
      overlay.subTitle = 'Press space to continue to level ' + (game.level + 1);
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
      if(overlay.counter != -1) overlay.counter -= 1;
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

function updatePlanes() {
  updateFlyBys(planes, 250, launchPlane, PLANE_SPEED);
};

function updateUFOs() {
  updateFlyBys(ufos, 150, launchUFO, UFO_SPEED);
};

function updateFlyBys(flyByArray, rate, func, speed) {
  if(flyByArray.length && game.counter != 0 && game.counter % rate === 0) {
    func();
  }
  for(var flyBy in flyByArray) {
    var flyBy = flyByArray[flyBy];
    if(flyBy.flying && flyBy.direction === 'east') {
      flyBy.x += speed;
    } else if (flyBy.flying && flyBy.direction === 'west') {
      flyBy.x -= speed;
    } else if (flyBy.destroyed) {
      var index = flyByArray.indexOf(flyBy);
      flyByArray.splice(index, 1);
    }
  }
}

function updateCities() {
  updateStructures(cities);
}

function updateBases() {
  updateStructures(bases, bases.missiles);
}

function updateStructures(structureArray, dependent) {
  for(var structure in structureArray) {
    var structure = structureArray[structure];
    if(structure.destroyed) {
      if(dependent) structureArray.dependent = null;
      var index = structureArray.indexOf(structure);
      structureArray.splice(index, 1);
    }
  }
}

function updateFiredMissiles() {
  if(firedMissiles.length) {
    for(var missile in firedMissiles) {
      var missile = firedMissiles[missile];
      var pathToTarget = new Vector(
          missile.targetX - Math.round(missile.x), 
          missile.targetY - Math.round(missile.y));
      var distance = Math.floor(Vector.vectorLength(pathToTarget));
      if(distance <= MISSILE_SPEED || missile.destroyed) {
        if(missile.destroyed && missile.owner === 'enemy') {
          player.destroyedMissiles.push(missile);
        } else {
          // account for the MISSILE_SPEED offset and "jump" missile to target coords
          missile.x = missile.targetX;
          missile.y = missile.targetY;
        }
        // blow up the missile
        missile.flying = false;
        explosions.push(new Explosion(missile));
        playSound('explosion.wav');
        index = firedMissiles.indexOf(missile);  
        firedMissiles.splice(index, 1);
      } else {
        // otherwise keep moving
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

function checkForExplosions(elementArray, explosion, score, flyer) {
  for(var element in elementArray) {
    var element = elementArray[element];
    
    if(explosionCollided(explosion, element)) {
      element.destroyed = true;
      if(flyer) element.flying = false;
      if(score) addScore(score);
    }      
  }
}

function updateExplosions() {
  for(var explosion in explosions) {
    var explosion = explosions[explosion];
    checkForExplosions(firedMissiles, explosion, MISSILE_SCORE);
    checkForExplosions(cities, explosion);
    checkForExplosions(bases, explosion);
    checkForExplosions(ufos, explosion, UFO_SCORE, true);
    checkForExplosions(planes, explosion, PLANE_SCORE, true);

    // remove explosion if counter is at 0
    if(explosion.counter === 0) {
      index = explosions.indexOf(explosion);  
      explosions.splice(index, 1);
    // otherwise advance counter or reset to 0 if limit reached
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
  if(game.sound) playSound('shoot.wav');
  var base = findNearestBase(x);
  if(base) {
    var missile = base.missiles.splice([base.missiles.length-1], 1)[0];
    // set starting coords to nearest base
    missile.x = base.x + (base.width/2);
    missile.y = CANVAS_HEIGHT 
          - (ground.height+base.height) - (crosshairs.radius/2);
    missile.owner = 'player';
    fireMissile(missile,x,y);
  }
  if(base && !base.missiles.length) {
    overlay.addFlash("OUT", base.x, base.y+50, 70);
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

function launchFlyBy(flyByArray, yOffset) {
  var flyBy = flyByArray[flyByArray.length-1];
  flyBy.flying = true;
  var directions = ['east', 'west'];
  var random = Math.floor(Math.random() * 2);
  flyBy.direction = directions[random];
  flyBy.x = flyBy.direction === 'east' ? flyBy.x = 0 - (flyBy.width + 5) : flyBy.x = CANVAS_WIDTH + 5;
  flyBy.y = CANVAS_HEIGHT - yOffset;
}

function launchUFO() {
  launchFlyBy(ufos, 400);
}

function launchPlane() {
  launchFlyBy(planes, 350);
}


// Drawing
function drawBackground(c) {
  // Clear canvas every frame
  c.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Sky
  c.fillStyle = 'black';
  c.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT-ground.height);

  // Ground
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
  var levelScoreText = "Level Score: " + game.levelScore;
  drawText(c, levelScoreText, "1em Arial", "gray", 25, 30);
  var totalScoreText = "Level Score: " + game.totalScore;
  drawText(c, totalScoreText, "1em Arial", "gray", 25, 
    CANVAS_WIDTH - c.measureText(totalScoreText).width - 30);

  // Draw text elements
  if(overlay.title) drawText(c, overlay.title, "3em Arial", "white", 150);
  if(overlay.subTitle) drawText(c, overlay.subTitle, "1.5em Arial", "white", 200);
  if(overlay.counter >= 0) {
    drawText(c, overlay.flash[0], "1em Arial", "white", overlay.flash[2], overlay.flash[1]);
  }
}

function drawText(c, elementText, font, color, y, x) {
  c.fillStyle = color;
  c.font = font;
  var halfSize = c.measureText(elementText).width / 2;
  // centered by default
  if(!x) {
    x = CANVAS_WIDTH / 2 - halfSize;
  }
  c.fillText(elementText, x, y);    
  c.fillStyle = '';
}

function drawStructure(c, structureArray, asset) {
  for(var structure in structureArray) {
    var structure = structureArray[structure];
    if(!structure.destroyed) {
      structureImage = new Image();
      structureImage.src = asset;   
      c.drawImage(
        structureImage, 
        structure.x, structure.y, structureImage.width, structureImage.height);
    }
  }
}

function drawBases(c) {
  drawStructure(c, bases, base_image);
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
  drawStructure(c, cities, city_image);
}

function drawFiredMissiles(c) {
  for(var missile in firedMissiles) {
    var missile = firedMissiles[missile];

    // choose sprite image based on missile.direction
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
function playSound(soundFile) {
  var snd = new Audio('sounds/' + soundFile);
  snd.play();
}

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

// MDN
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
  if(!cleanupOnly) {
    game.level = 1;    
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