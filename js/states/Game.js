// http://vps17786.inmotionhosting.com/~newportns

var Achicken = Achicken || {}

Achicken.GameState = {

  init: function(currentLevel) {
    //constants
    this.MAX_DISTANCE_SHOOT = 190
    this.MAX_SPEED_SHOOT = 1000
    this.SHOOT_FACTOR = 12
    this.KILL_DIFF = 25

    //keep track of the current level
    this.currentLevel = currentLevel ? currentLevel : 'level1'

    //gravity
    this.game.physics.p2.gravity.y = 1000

    // collision groups
    this.blocksCollisionGroup = this.game.physics.p2.createCollisionGroup()
    this.enemiesCollisionGroup = this.game.physics.p2.createCollisionGroup()
    this.chickensCollisionGroup = this.game.physics.p2.createCollisionGroup()
  },
  create: function() {

    //sky background
    this.sky = this.add.tileSprite(0, 0, this.game.world.width, this.game.world.height, 'sky')
    this.game.world.sendToBack(this.sky)

    this.chickenHUD = this.add.group()

    //enemies
    this.enemies = this.add.group()
    this.enemies.enableBody = true
    this.enemies.physicsBodyType = Phaser.Physics.P2JS

    //blocks
    this.blocks = this.add.group()
    this.blocks.enableBody = true
    this.blocks.physicsBodyType = Phaser.Physics.P2JS

    // bodies in p2 -> they get their anchor points set to 0.5
    this.floor = this.add.tileSprite(this.game.world.width / 2, this.game.world.height - 24, this.game.world.width, 48, 'floor')
    this.blocks.add(this.floor)

    this.floor.body.setCollisionGroup(this.blocksCollisionGroup)
    this.floor.body.collides([this.blocksCollisionGroup, this.enemiesCollisionGroup, this.chickensCollisionGroup])
    this.floor.body.static = true

    //load level info
    this.loadLevel()

    // init chicken shooting
    this.pole = this.add.sprite(180, 500, 'pole')
    this.pole.anchor.setTo(0.5, 0)

    this.game.input.onDown.add(this.prepareShot, this)

    //prepare first chicken
    this.setupChicken()
  },
  hitEnemy: function(bodyB, shapeA, shapeB, equation) {
    // 'this' refers to enemy, not game.

    var velocityDiff = Phaser.Point.distance(
      new Phaser.Point(equation[0].bodyA.velocity[0], equation[0].bodyA.velocity[1]),
      new Phaser.Point(equation[0].bodyB.velocity[0], equation[0].bodyB.velocity[1])
    )

    if (velocityDiff > Achicken.GameState.KILL_DIFF) {
      this.kill()

      //update dead enemies
      Achicken.GameState.updateDeadCount()
    }
  },
  update: function() {
    if (this.isPreparingShot) {
      // make chicken follow user input pointer
      this.chicken.x = this.game.input.activePointer.position.x
      this.chicken.y = this.game.input.activePointer.position.y

      // if too far away stop shoot preperation
      var distance = Phaser.Point.distance(this.chicken.position, this.pole.position)

      if (distance > this.MAX_DISTANCE_SHOOT) {
        this.isPreparingShot = false
        this.isChickenReady = true

        this.chicken.x = this.pole.x
        this.chicken.y = this.pole.y
      }

      // shoot when releasing
      if(this.game.input.activePointer.isUp) {
        this.isPreparingShot = false

        this.throwChicken()
      }
    }
  },
  gameOver: function() {
    this.game.state.start('Game', true, false, this.currentLevel)
  },
  loadLevel: function() {
    this.levelData = JSON.parse(this.game.cache.getText(this.currentLevel))

    this.levelData.blocks.forEach(function(block) {
      this.createBlock(block)
    }, this)

    this.levelData.enemies.forEach(function(enemy) {
      this.createEnemy(enemy)
    }, this)

    this.countDeadEnemies = 0
    this.totalNumEnemies = this.levelData.enemies.length
    this.numChickens = 3
  },
  createBlock: function(data) {
    var block = new Phaser.Sprite(this.game, data.x, data.y, data.asset)

    this.blocks.add(block)
    block.body.mass = data.mass
    // set collision group
    block.body.setCollisionGroup(this.blocksCollisionGroup)

    //they will collide with
    block.body.collides([this.blocksCollisionGroup, this.enemiesCollisionGroup, this.chickensCollisionGroup])

    return block
  },
  createEnemy: function(data) {
    var enemy = new Phaser.Sprite(this.game, data.x, data.y, data.asset)
    this.enemies.add(enemy)
    // set collision group
    enemy.body.setCollisionGroup(this.enemiesCollisionGroup)

    //they will collide with
    enemy.body.collides([this.blocksCollisionGroup, this.enemiesCollisionGroup, this.chickensCollisionGroup])

    // call hitEnemy when enemies hit something
    enemy.body.onBeginContact.add(this.hitEnemy, enemy)

    return enemy
  },
  prepareShot: function(event) {
    if (this.isChickenReady) {
      this.isPreparingShot = true

    }
  },
  setupChicken: function() {
    // add chicken to starting position
    this.chicken = this.add.sprite(this.pole.x, this.pole.y, 'chicken')
    this.chicken.anchor.setTo(0.5)
    this.isChickenReady = true
    this.refreshStats()
  },
  throwChicken: function() {
    // enable physics
    this.game.physics.p2.enable(this.chicken)
    // set collision group
    this.chicken.body.setCollisionGroup(this.chickensCollisionGroup)
    // what will it collide with
    this.chicken.body.collides([this.blocksCollisionGroup, this.enemiesCollisionGroup, this.chickensCollisionGroup])

    // calculate differente between current position and top of pole
    var diff = Phaser.Point.subtract(this.pole.position, this.chicken.position)

    // set chicken velocity according to difference vector
    this.chicken.body.velocity.x = Math.abs(diff.x * this.SHOOT_FACTOR)/(diff.x * this.SHOOT_FACTOR) * Math.min(Math.abs(diff.x * this.SHOOT_FACTOR), this.MAX_SPEED_SHOOT)
    this.chicken.body.velocity.y = Math.abs(diff.y * this.SHOOT_FACTOR)/(diff.y * this.SHOOT_FACTOR) * Math.min(Math.abs(diff.y * this.SHOOT_FACTOR), this.MAX_SPEED_SHOOT)

    this.endTurn()
  },
  updateDeadCount: function() {
    this.countDeadEnemies++
    if (this.countDeadEnemies == this.totalNumEnemies) {
      alert('You won!')
      this.gameOver()
    }
  },
  endTurn: function() {
    this.numChickens--

    this.game.time.events.add(3 * Phaser.Timer.SECOND, function() {
      this.chicken.kill()

      // show a new chicken 1 second later
      this.game.time.events.add(Phaser.Timer.SECOND, function() {
        // if there are no more chickens, game over
        if (this.numChickens > 0) {
          this.setupChicken()
        } else {
          alert('Out of chickens!')
          this.gameOver()
        }
      }, this)
    }, this)
  },
  refreshStats: function() {
    this.chickenHUD.removeAll()

    var i = 0
    while(i < this.numChickens) {
      i++
      this.chickenHUD.create(this.game.width - 100 - i * 80, 30, 'chicken')
    }
  }
}
