// Configuración del canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 1024;
canvas.height = 576;

// Variables del juego
let score = 0;
let coins = 0;
let lives = 3;
let time = 400;
let gameRunning = true;
let gameOver = false;

// Constantes de física
const GRAVITY = 0.6;
const FRICTION = 0.8;
const MAX_SPEED = 6;
const JUMP_FORCE = -12;
const TILE_SIZE = 32;

// Controles
const keys = {
    right: false,
    left: false,
    up: false,
    space: false
};

// Clase Mario
class Mario {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 32;
        this.height = 32;
        this.velocityX = 0;
        this.velocityY = 0;
        this.jumping = false;
        this.grounded = false;
        this.direction = 1; // 1 = derecha, -1 = izquierda
        this.animation = 0;
        this.animationSpeed = 0;
        this.invincible = false;
        this.invincibleTimer = 0;
        this.big = false;
        this.dead = false;
    }

    update() {
        if (this.dead) {
            this.velocityY += GRAVITY;
            this.y += this.velocityY;
            return;
        }

        // Movimiento horizontal
        if (keys.right) {
            this.velocityX = MAX_SPEED;
            this.direction = 1;
            this.animationSpeed += 0.3;
        } else if (keys.left) {
            this.velocityX = -MAX_SPEED;
            this.direction = -1;
            this.animationSpeed += 0.3;
        } else {
            this.velocityX *= FRICTION;
        }

        // Salto
        if ((keys.up || keys.space) && this.grounded && !this.jumping) {
            this.velocityY = JUMP_FORCE;
            this.jumping = true;
            this.grounded = false;
        }

        // Reset del salto
        if (!(keys.up || keys.space)) {
            this.jumping = false;
        }

        // Aplicar gravedad
        this.velocityY += GRAVITY;

        // Límite de velocidad vertical
        if (this.velocityY > 15) this.velocityY = 15;

        // Actualizar posición
        this.x += this.velocityX;
        this.y += this.velocityY;

        // Límites del mundo
        if (this.x < 0) this.x = 0;
        if (this.x > levelWidth - this.width) {
            this.x = levelWidth - this.width;
        }

        // Muerte por caída
        if (this.y > canvas.height + 50) {
            this.die();
        }

        // Animación de caminar
        if (Math.abs(this.velocityX) > 0.5) {
            this.animation = Math.floor(this.animationSpeed / 5) % 3;
        } else {
            this.animation = 0;
            this.animationSpeed = 0;
        }

        // Invencibilidad temporal
        if (this.invincible) {
            this.invincibleTimer--;
            if (this.invincibleTimer <= 0) {
                this.invincible = false;
            }
        }

        this.grounded = false;
    }

    draw() {
        ctx.save();

        // Parpadeo cuando es invencible
        if (this.invincible && Math.floor(this.invincibleTimer / 5) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        // Dibujar Mario
        if (this.direction === -1) {
            ctx.translate(this.x + this.width, this.y);
            ctx.scale(-1, 1);
            this.drawMario(0, 0);
        } else {
            this.drawMario(this.x, this.y);
        }

        ctx.restore();
    }

    drawMario(x, y) {
        const offsetY = this.big ? -16 : 0;
        const height = this.big ? 48 : 32;

        // Cuerpo (rojo)
        ctx.fillStyle = '#e60000';
        ctx.fillRect(x + 8, y + 8 + offsetY, 16, 8);
        ctx.fillRect(x + 4, y + 16 + offsetY, 24, 8);

        // Overol (azul)
        ctx.fillStyle = '#0000ff';
        ctx.fillRect(x + 8, y + 24 + offsetY, 16, 8);

        // Piel (beige)
        ctx.fillStyle = '#ffcc99';
        ctx.fillRect(x + 8, y + 4 + offsetY, 16, 4);
        ctx.fillRect(x + 12, y + 16 + offsetY, 8, 4);

        // Cabello (marrón)
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(x + 8, y + offsetY, 16, 4);

        // Ojos
        ctx.fillStyle = '#000';
        ctx.fillRect(x + 10, y + 6 + offsetY, 3, 2);
        ctx.fillRect(x + 18, y + 6 + offsetY, 3, 2);

        // Gorra (roja)
        ctx.fillStyle = '#e60000';
        ctx.fillRect(x + 8, y + offsetY, 16, 4);

        // Zapatos
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(x + 4, y + height - 8, 8, 8);
        ctx.fillRect(x + 20, y + height - 8, 8, 8);
    }

    die() {
        if (this.dead) return;

        this.dead = true;
        this.velocityY = -10;
        lives--;
        updateHUD();

        setTimeout(() => {
            if (lives > 0) {
                resetLevel();
            } else {
                gameOver = true;
                gameRunning = false;
            }
        }, 2000);
    }

    takeDamage() {
        if (this.invincible) return;

        if (this.big) {
            this.big = false;
            this.height = 32;
            this.invincible = true;
            this.invincibleTimer = 120;
        } else {
            this.die();
        }
    }

    grow() {
        if (!this.big) {
            this.big = true;
            this.height = 48;
            this.y -= 16;
            score += 1000;
            updateHUD();
        }
    }
}

// Clase Enemy (base para Goomba y Koopa)
class Enemy {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = 32;
        this.height = 32;
        this.velocityX = -1;
        this.velocityY = 0;
        this.type = type;
        this.dead = false;
        this.stomped = false;
        this.animation = 0;
    }

    update() {
        if (this.stomped) return;

        this.velocityY += GRAVITY;
        this.x += this.velocityX;
        this.y += this.velocityY;

        // Animación
        this.animation += 0.1;

        // Límites
        if (this.y > canvas.height) {
            this.dead = true;
        }
    }

    draw() {
        if (this.stomped) {
            this.drawStomped();
        } else if (this.type === 'goomba') {
            this.drawGoomba();
        } else if (this.type === 'koopa') {
            this.drawKoopa();
        }
    }

    drawGoomba() {
        // Cuerpo marrón
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(this.x + 4, this.y + 8, 24, 16);

        // Ojos
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x + 8, this.y + 12, 6, 6);
        ctx.fillRect(this.x + 18, this.y + 12, 6, 6);

        ctx.fillStyle = '#000';
        ctx.fillRect(this.x + 10, this.y + 14, 3, 3);
        ctx.fillRect(this.x + 20, this.y + 14, 3, 3);

        // Pies
        ctx.fillStyle = '#654321';
        ctx.fillRect(this.x + 4, this.y + 24, 10, 8);
        ctx.fillRect(this.x + 18, this.y + 24, 10, 8);

        // Cejas enojadas
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x + 8, this.y + 10, 6, 2);
        ctx.fillRect(this.x + 18, this.y + 10, 6, 2);
    }

    drawKoopa() {
        // Caparazón verde
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(this.x + 4, this.y + 12, 24, 16);

        // Detalles del caparazón
        ctx.fillStyle = '#darkgreen';
        ctx.fillRect(this.x + 8, this.y + 14, 16, 2);
        ctx.fillRect(this.x + 8, this.y + 20, 16, 2);

        // Cabeza
        ctx.fillStyle = '#ffff99';
        ctx.fillRect(this.x + 8, this.y + 4, 16, 8);

        // Ojos
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x + 10, this.y + 6, 3, 3);
        ctx.fillRect(this.x + 19, this.y + 6, 3, 3);

        // Pies
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(this.x + 4, this.y + 28, 8, 4);
        ctx.fillRect(this.x + 20, this.y + 28, 8, 4);
    }

    drawStomped() {
        ctx.fillStyle = '#654321';
        ctx.fillRect(this.x + 8, this.y + 24, 16, 8);
    }

    stomp() {
        this.stomped = true;
        this.velocityX = 0;
        score += 100;
        updateHUD();
        setTimeout(() => {
            this.dead = true;
        }, 500);
    }

    reverse() {
        this.velocityX *= -1;
    }
}

// Clase Block
class Block {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = TILE_SIZE;
        this.height = TILE_SIZE;
        this.type = type; // 'brick', 'question', 'pipe', 'ground'
        this.hit = false;
        this.solid = true;
        this.coin = type === 'question';
    }

    draw() {
        switch(this.type) {
            case 'brick':
                this.drawBrick();
                break;
            case 'question':
                this.drawQuestion();
                break;
            case 'pipe':
                this.drawPipe();
                break;
            case 'ground':
                this.drawGround();
                break;
            case 'cloud':
                this.drawCloud();
                break;
            case 'bush':
                this.drawBush();
                break;
            case 'hill':
                this.drawHill();
                break;
        }
    }

    drawBrick() {
        ctx.fillStyle = '#b8734e';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Detalles de ladrillo
        ctx.fillStyle = '#8b5a3c';
        ctx.fillRect(this.x, this.y + this.height/2, this.width, 2);
        ctx.fillRect(this.x + this.width/2, this.y, 2, this.height/2);
        ctx.fillRect(this.x + this.width/4, this.y + this.height/2, 2, this.height/2);
        ctx.fillRect(this.x + 3*this.width/4, this.y + this.height/2, 2, this.height/2);
    }

    drawQuestion() {
        if (this.hit) {
            this.drawBrick();
            return;
        }

        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Signo de interrogación
        ctx.fillStyle = '#000';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', this.x + this.width/2, this.y + this.height/2);
    }

    drawPipe() {
        // Cuerpo de la tubería
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Borde de la tubería
        ctx.fillStyle = '#008800';
        ctx.fillRect(this.x, this.y, 4, this.height);
        ctx.fillRect(this.x + this.width - 4, this.y, 4, this.height);

        // Parte superior de la tubería
        if (this.y > 0) {
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(this.x - 4, this.y - 8, this.width + 8, 8);
            ctx.fillStyle = '#008800';
            ctx.fillRect(this.x - 4, this.y - 8, this.width + 8, 2);
        }
    }

    drawGround() {
        ctx.fillStyle = '#da8248';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Detalles de tierra
        ctx.fillStyle = '#b86930';
        ctx.fillRect(this.x, this.y, this.width, 4);

        // Pequeños cuadrados decorativos
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(this.x + i * 10, this.y + 8, 6, 6);
        }
    }

    drawCloud() {
        this.solid = false;
        ctx.fillStyle = '#fff';

        // Nubes pixeladas
        ctx.fillRect(this.x + 8, this.y, 16, 8);
        ctx.fillRect(this.x + 4, this.y + 4, 24, 8);
        ctx.fillRect(this.x, this.y + 8, 32, 8);
    }

    drawBush() {
        this.solid = false;
        ctx.fillStyle = '#00ff00';

        // Arbusto
        ctx.fillRect(this.x + 4, this.y + 16, 24, 16);
        ctx.fillRect(this.x + 8, this.y + 8, 16, 8);
    }

    drawHill() {
        this.solid = false;
        ctx.fillStyle = '#00aa00';

        // Colina simple
        ctx.beginPath();
        ctx.arc(this.x + this.width/2, this.y + this.height, this.width/2, 0, Math.PI, true);
        ctx.fill();
    }

    onHit() {
        if (this.type === 'question' && !this.hit) {
            this.hit = true;
            if (this.coin) {
                coins++;
                score += 200;
                updateHUD();

                // Animación de moneda
                createCoinAnimation(this.x + this.width/2, this.y);
            }
            return true;
        }
        return false;
    }
}

// Clase PowerUp
class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = 32;
        this.height = 32;
        this.type = type; // 'mushroom', 'flower'
        this.velocityX = 2;
        this.velocityY = 0;
        this.collected = false;
        this.emerging = true;
        this.emergingY = y;
    }

    update() {
        if (this.collected) return;

        if (this.emerging) {
            this.y -= 1;
            if (this.y <= this.emergingY - 32) {
                this.emerging = false;
            }
            return;
        }

        this.velocityY += GRAVITY;
        this.x += this.velocityX;
        this.y += this.velocityY;
    }

    draw() {
        if (this.collected) return;

        if (this.type === 'mushroom') {
            // Sombrero rojo con puntos blancos
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(this.x + 4, this.y + 8, 24, 16);

            // Puntos blancos
            ctx.fillStyle = '#fff';
            ctx.fillRect(this.x + 8, this.y + 12, 6, 6);
            ctx.fillRect(this.x + 18, this.y + 12, 6, 6);

            // Tallo blanco
            ctx.fillStyle = '#fff';
            ctx.fillRect(this.x + 8, this.y + 24, 16, 8);
        }
    }

    collect() {
        this.collected = true;
        score += 1000;
        updateHUD();
        return this.type;
    }
}

// Partículas y animaciones
class Particle {
    constructor(x, y, text) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.life = 60;
        this.velocityY = -2;
    }

    update() {
        this.y += this.velocityY;
        this.life--;
    }

    draw() {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.text, this.x, this.y);
    }
}

// Arrays del juego
let mario;
let enemies = [];
let blocks = [];
let powerUps = [];
let particles = [];

// Nivel
let levelWidth = 6400;
let cameraX = 0;

// Crear el nivel 1-1
function createLevel() {
    blocks = [];
    enemies = [];
    powerUps = [];
    particles = [];

    // Suelo
    for (let i = 0; i < levelWidth / TILE_SIZE; i++) {
        blocks.push(new Block(i * TILE_SIZE, canvas.height - TILE_SIZE, 'ground'));
        blocks.push(new Block(i * TILE_SIZE, canvas.height - TILE_SIZE * 2, 'ground'));
    }

    // Decoraciones - nubes
    blocks.push(new Block(200, 80, 'cloud'));
    blocks.push(new Block(400, 100, 'cloud'));
    blocks.push(new Block(700, 80, 'cloud'));
    blocks.push(new Block(1000, 100, 'cloud'));

    // Decoraciones - arbustos
    blocks.push(new Block(300, canvas.height - TILE_SIZE * 3, 'bush'));
    blocks.push(new Block(600, canvas.height - TILE_SIZE * 3, 'bush'));
    blocks.push(new Block(900, canvas.height - TILE_SIZE * 3, 'bush'));

    // Bloques de pregunta y ladrillos
    blocks.push(new Block(320, canvas.height - TILE_SIZE * 6, 'question'));
    blocks.push(new Block(384, canvas.height - TILE_SIZE * 6, 'brick'));
    blocks.push(new Block(416, canvas.height - TILE_SIZE * 6, 'question'));
    blocks.push(new Block(448, canvas.height - TILE_SIZE * 6, 'brick'));
    blocks.push(new Block(480, canvas.height - TILE_SIZE * 6, 'question'));
    blocks.push(new Block(512, canvas.height - TILE_SIZE * 6, 'brick'));
    blocks.push(new Block(544, canvas.height - TILE_SIZE * 6, 'question'));

    // Bloques flotantes
    blocks.push(new Block(640, canvas.height - TILE_SIZE * 10, 'brick'));
    blocks.push(new Block(672, canvas.height - TILE_SIZE * 10, 'brick'));
    blocks.push(new Block(704, canvas.height - TILE_SIZE * 10, 'brick'));
    blocks.push(new Block(736, canvas.height - TILE_SIZE * 10, 'question'));

    // Escalera de bloques
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j <= i; j++) {
            blocks.push(new Block(900 + i * TILE_SIZE, canvas.height - TILE_SIZE * (3 + j), 'brick'));
        }
    }

    // Tuberías
    blocks.push(new Block(800, canvas.height - TILE_SIZE * 3, 'pipe'));
    blocks.push(new Block(832, canvas.height - TILE_SIZE * 3, 'pipe'));
    blocks.push(new Block(800, canvas.height - TILE_SIZE * 4, 'pipe'));
    blocks.push(new Block(832, canvas.height - TILE_SIZE * 4, 'pipe'));

    blocks.push(new Block(1200, canvas.height - TILE_SIZE * 4, 'pipe'));
    blocks.push(new Block(1232, canvas.height - TILE_SIZE * 4, 'pipe'));
    blocks.push(new Block(1200, canvas.height - TILE_SIZE * 5, 'pipe'));
    blocks.push(new Block(1232, canvas.height - TILE_SIZE * 5, 'pipe'));
    blocks.push(new Block(1200, canvas.height - TILE_SIZE * 6, 'pipe'));
    blocks.push(new Block(1232, canvas.height - TILE_SIZE * 6, 'pipe'));

    // Más bloques de pregunta
    for (let i = 0; i < 3; i++) {
        blocks.push(new Block(1400 + i * 64, canvas.height - TILE_SIZE * 6, 'question'));
    }

    // Plataformas flotantes
    for (let i = 0; i < 5; i++) {
        blocks.push(new Block(1700 + i * TILE_SIZE, canvas.height - TILE_SIZE * 8, 'brick'));
    }

    // Enemigos - Goombas
    enemies.push(new Enemy(400, canvas.height - TILE_SIZE * 3, 'goomba'));
    enemies.push(new Enemy(500, canvas.height - TILE_SIZE * 3, 'goomba'));
    enemies.push(new Enemy(700, canvas.height - TILE_SIZE * 3, 'goomba'));
    enemies.push(new Enemy(1000, canvas.height - TILE_SIZE * 3, 'goomba'));
    enemies.push(new Enemy(1100, canvas.height - TILE_SIZE * 3, 'goomba'));
    enemies.push(new Enemy(1500, canvas.height - TILE_SIZE * 3, 'goomba'));

    // Enemigos - Koopas
    enemies.push(new Enemy(600, canvas.height - TILE_SIZE * 3, 'koopa'));
    enemies.push(new Enemy(950, canvas.height - TILE_SIZE * 3, 'koopa'));
    enemies.push(new Enemy(1300, canvas.height - TILE_SIZE * 3, 'koopa'));
    enemies.push(new Enemy(1800, canvas.height - TILE_SIZE * 3, 'koopa'));

    // Más enemigos a lo largo del nivel
    for (let i = 2000; i < levelWidth - 500; i += 300) {
        if (Math.random() > 0.5) {
            enemies.push(new Enemy(i, canvas.height - TILE_SIZE * 3, 'goomba'));
        } else {
            enemies.push(new Enemy(i, canvas.height - TILE_SIZE * 3, 'koopa'));
        }
    }
}

// Funciones de utilidad
function createCoinAnimation(x, y) {
    particles.push(new Particle(x, y, '+200'));
}

function createPowerUp(x, y, type) {
    powerUps.push(new PowerUp(x, y, type));
}

function updateHUD() {
    document.getElementById('score').textContent = String(score).padStart(6, '0');
    document.getElementById('coins').textContent = 'x' + String(coins).padStart(2, '0');
    document.getElementById('lives').textContent = 'x' + lives;
}

// Colisiones
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function handleBlockCollisions() {
    blocks.forEach(block => {
        if (!block.solid) return;

        if (checkCollision(mario, block)) {
            // Colisión desde arriba
            if (mario.velocityY > 0 && mario.y + mario.height - mario.velocityY <= block.y) {
                mario.y = block.y - mario.height;
                mario.velocityY = 0;
                mario.grounded = true;
            }
            // Colisión desde abajo
            else if (mario.velocityY < 0 && mario.y - mario.velocityY >= block.y + block.height) {
                mario.y = block.y + block.height;
                mario.velocityY = 0;

                // Golpear bloque
                if (block.onHit()) {
                    // Posibilidad de aparecer power-up
                    if (Math.random() > 0.7 && !mario.big) {
                        createPowerUp(block.x, block.y, 'mushroom');
                    }
                }
            }
            // Colisión lateral
            else {
                if (mario.x < block.x) {
                    mario.x = block.x - mario.width;
                } else {
                    mario.x = block.x + block.width;
                }
                mario.velocityX = 0;
            }
        }
    });
}

function handleEnemyCollisions() {
    enemies.forEach(enemy => {
        if (enemy.dead || enemy.stomped) return;

        if (checkCollision(mario, enemy)) {
            // Saltar sobre el enemigo
            if (mario.velocityY > 0 && mario.y + mario.height - 10 < enemy.y + enemy.height / 2) {
                enemy.stomp();
                mario.velocityY = -8;
            } else {
                // Mario recibe daño
                mario.takeDamage();
            }
        }

        // Colisión enemigo con bloques
        blocks.forEach(block => {
            if (!block.solid) return;

            if (checkCollision(enemy, block)) {
                // Colisión desde arriba
                if (enemy.velocityY > 0 && enemy.y + enemy.height - enemy.velocityY <= block.y) {
                    enemy.y = block.y - enemy.height;
                    enemy.velocityY = 0;
                }
                // Colisión lateral
                else if (enemy.x < block.x || enemy.x > block.x) {
                    enemy.reverse();
                }
            }
        });
    });

    // Colisiones entre enemigos
    for (let i = 0; i < enemies.length; i++) {
        for (let j = i + 1; j < enemies.length; j++) {
            if (checkCollision(enemies[i], enemies[j])) {
                enemies[i].reverse();
                enemies[j].reverse();
            }
        }
    }
}

function handlePowerUpCollisions() {
    powerUps.forEach(powerUp => {
        if (powerUp.collected || powerUp.emerging) return;

        if (checkCollision(mario, powerUp)) {
            const type = powerUp.collect();
            if (type === 'mushroom') {
                mario.grow();
            }
        }

        // Colisión powerUp con bloques
        blocks.forEach(block => {
            if (!block.solid) return;

            if (checkCollision(powerUp, block)) {
                if (powerUp.velocityY > 0 && powerUp.y + powerUp.height - powerUp.velocityY <= block.y) {
                    powerUp.y = block.y - powerUp.height;
                    powerUp.velocityY = 0;
                } else {
                    powerUp.velocityX *= -1;
                }
            }
        });
    });
}

// Cámara
function updateCamera() {
    cameraX = mario.x - canvas.width / 3;

    if (cameraX < 0) cameraX = 0;
    if (cameraX > levelWidth - canvas.width) {
        cameraX = levelWidth - canvas.width;
    }
}

// Temporizador
let timerInterval;
function startTimer() {
    timerInterval = setInterval(() => {
        if (gameRunning && !mario.dead) {
            time--;
            document.getElementById('time').textContent = time;

            if (time <= 0) {
                mario.die();
            }
        }
    }, 1000);
}

// Reset del nivel
function resetLevel() {
    mario = new Mario(100, 100);
    enemies = [];
    powerUps = [];
    particles = [];
    createLevel();
    cameraX = 0;
    time = 400;
    gameRunning = true;
    updateHUD();
}

// Game Loop
function gameLoop() {
    // Limpiar canvas
    ctx.fillStyle = '#5c94fc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-cameraX, 0);

    // Actualizar
    if (gameRunning) {
        mario.update();

        enemies = enemies.filter(enemy => !enemy.dead);
        enemies.forEach(enemy => enemy.update());

        powerUps = powerUps.filter(powerUp => !powerUp.collected || powerUp.emerging);
        powerUps.forEach(powerUp => powerUp.update());

        particles = particles.filter(particle => particle.life > 0);
        particles.forEach(particle => particle.update());

        handleBlockCollisions();
        handleEnemyCollisions();
        handlePowerUpCollisions();

        updateCamera();
    }

    // Dibujar
    blocks.forEach(block => block.draw());
    enemies.forEach(enemy => enemy.draw());
    powerUps.forEach(powerUp => powerUp.draw());
    mario.draw();
    particles.forEach(particle => particle.draw());

    ctx.restore();

    // Game Over
    if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
        ctx.font = 'bold 24px Arial';
        ctx.fillText('Presiona R para reiniciar', canvas.width / 2, canvas.height / 2 + 50);
    }

    // Victoria
    if (mario.x > levelWidth - 200 && !mario.dead) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('¡VICTORIA!', canvas.width / 2, canvas.height / 2);
        ctx.font = 'bold 24px Arial';
        ctx.fillText('Stage 1-1 Completado', canvas.width / 2, canvas.height / 2 + 50);
        gameRunning = false;
    }

    requestAnimationFrame(gameLoop);
}

// Controles
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
    if (e.key === 'ArrowUp' || e.key === 'w') keys.up = true;
    if (e.key === ' ') {
        keys.space = true;
        e.preventDefault();
    }
    if (e.key === 'r' || e.key === 'R') {
        lives = 3;
        score = 0;
        coins = 0;
        gameOver = false;
        resetLevel();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
    if (e.key === 'ArrowUp' || e.key === 'w') keys.up = false;
    if (e.key === ' ') keys.space = false;
});

// Inicializar juego
mario = new Mario(100, 100);
createLevel();
startTimer();
updateHUD();
gameLoop();
