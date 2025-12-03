import * as THREE from 'three';

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

// Three.js setup
let scene, camera, renderer;
let canvas;

// Configuración de la escena 3D
const CANVAS_WIDTH = 1024;
const CANVAS_HEIGHT = 576;

// Función para convertir coordenadas Y de Canvas 2D a Three.js
// En Canvas 2D: Y=0 arriba, Y=576 abajo
// En Three.js: Y=0 centro, Y+ arriba, Y- abajo
function toThreeY(canvasY) {
    return CANVAS_HEIGHT - canvasY;
}

function initThree() {
    // Crear escena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x5c94fc);

    // Crear cámara
    camera = new THREE.PerspectiveCamera(
        75,
        CANVAS_WIDTH / CANVAS_HEIGHT,
        0.1,
        3000
    );
    // Posicionar cámara para vista isométrica
    const centerY = toThreeY(CANVAS_HEIGHT / 2);
    camera.position.set(CANVAS_WIDTH / 2, centerY + 200, 400);
    camera.lookAt(CANVAS_WIDTH / 2, centerY, 0);

    // Crear renderer
    const container = document.getElementById('gameCanvas');
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(CANVAS_WIDTH, CANVAS_HEIGHT);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Iluminación
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    const centerY = toThreeY(CANVAS_HEIGHT / 2);
    directionalLight.position.set(100, centerY + 300, 200);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -500;
    directionalLight.shadow.camera.right = 500;
    directionalLight.shadow.camera.top = 500;
    directionalLight.shadow.camera.bottom = -500;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 1500;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Luz de relleno
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-100, 100, -100);
    scene.add(fillLight);
}

// Clase Mario
class Mario {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.z = 0; // Profundidad en 3D
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

        this.createMesh();
    }

    createMesh() {
        this.mesh = new THREE.Group();

        const height = this.big ? 48 : 32;
        const offsetY = this.big ? -16 : 0;

        // Cuerpo (rojo)
        const bodyGeometry = new THREE.BoxGeometry(16, 8, 20);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xe60000 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.set(0, 8 + offsetY, 0);
        body.castShadow = true;
        this.mesh.add(body);

        const body2Geometry = new THREE.BoxGeometry(24, 8, 20);
        const body2 = new THREE.Mesh(body2Geometry, bodyMaterial);
        body2.position.set(0, 16 + offsetY, 0);
        body2.castShadow = true;
        this.mesh.add(body2);

        // Overol (azul)
        const overolGeometry = new THREE.BoxGeometry(16, 8, 20);
        const overolMaterial = new THREE.MeshLambertMaterial({ color: 0x0000ff });
        const overol = new THREE.Mesh(overolGeometry, overolMaterial);
        overol.position.set(0, 24 + offsetY, 0);
        overol.castShadow = true;
        this.mesh.add(overol);

        // Piel (beige)
        const skinGeometry = new THREE.BoxGeometry(16, 4, 18);
        const skinMaterial = new THREE.MeshLambertMaterial({ color: 0xffcc99 });
        const skin = new THREE.Mesh(skinGeometry, skinMaterial);
        skin.position.set(0, 4 + offsetY, 0);
        skin.castShadow = true;
        this.mesh.add(skin);

        // Cabello (marrón)
        const hairGeometry = new THREE.BoxGeometry(16, 4, 18);
        const hairMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
        const hair = new THREE.Mesh(hairGeometry, hairMaterial);
        hair.position.set(0, 0 + offsetY, 0);
        hair.castShadow = true;
        this.mesh.add(hair);

        // Ojos
        const eyeGeometry = new THREE.BoxGeometry(3, 2, 1);
        const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-6, 6 + offsetY, 10);
        this.mesh.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(6, 6 + offsetY, 10);
        this.mesh.add(rightEye);

        // Gorra (roja)
        const capGeometry = new THREE.BoxGeometry(16, 4, 18);
        const capMaterial = new THREE.MeshLambertMaterial({ color: 0xe60000 });
        const cap = new THREE.Mesh(capGeometry, capMaterial);
        cap.position.set(0, 0 + offsetY, 0);
        cap.castShadow = true;
        this.mesh.add(cap);

        // Zapatos
        const shoeGeometry = new THREE.BoxGeometry(8, 8, 12);
        const shoeMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
        const leftShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
        leftShoe.position.set(-8, height - 8, 0);
        leftShoe.castShadow = true;
        this.mesh.add(leftShoe);

        const rightShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
        rightShoe.position.set(8, height - 8, 0);
        rightShoe.castShadow = true;
        this.mesh.add(rightShoe);

        // Convertir coordenadas Y de Canvas 2D a Three.js
        const threeY = toThreeY(this.y + height / 2);
        this.mesh.position.set(this.x, threeY, this.z);
        scene.add(this.mesh);
    }

    update() {
        if (this.dead) {
            this.velocityY += GRAVITY;
            this.y += this.velocityY;
            this.updateMeshPosition();
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
        if (this.y > CANVAS_HEIGHT + 50) {
            this.die();
        }

        // Animación de caminar
        if (Math.abs(this.velocityX) > 0.5) {
            this.animation = Math.floor(this.animationSpeed / 5) % 3;
            // Pequeña rotación al caminar
            this.mesh.rotation.z = Math.sin(this.animationSpeed * 0.5) * 0.05;
        } else {
            this.animation = 0;
            this.animationSpeed = 0;
            this.mesh.rotation.z = 0;
        }

        // Invencibilidad temporal
        if (this.invincible) {
            this.invincibleTimer--;
            if (this.invincibleTimer <= 0) {
                this.invincible = false;
                this.mesh.traverse((child) => {
                    if (child.material) {
                        child.material.opacity = 1;
                        child.material.transparent = false;
                    }
                });
            } else {
                // Parpadeo
                const visible = Math.floor(this.invincibleTimer / 5) % 2 === 0;
                this.mesh.traverse((child) => {
                    if (child.material) {
                        child.material.opacity = visible ? 0.5 : 1;
                        child.material.transparent = true;
                    }
                });
            }
        }

        this.grounded = false;
        this.updateMeshPosition();
    }

    updateMeshPosition() {
        const height = this.big ? 48 : 32;
        // Convertir coordenadas Y de Canvas 2D a Three.js
        const threeY = toThreeY(this.y + height / 2);
        this.mesh.position.set(this.x, threeY, this.z);

        // Rotar según dirección
        if (this.direction === -1) {
            this.mesh.rotation.y = Math.PI;
        } else {
            this.mesh.rotation.y = 0;
        }
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
            this.recreateMesh();
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
            this.recreateMesh();
        }
    }

    recreateMesh() {
        scene.remove(this.mesh);
        this.createMesh();
    }

    destroy() {
        scene.remove(this.mesh);
    }
}

// Clase Enemy
class Enemy {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.z = 0;
        this.width = 32;
        this.height = 32;
        this.velocityX = -1;
        this.velocityY = 0;
        this.type = type;
        this.dead = false;
        this.stomped = false;
        this.animation = 0;

        this.createMesh();
    }

    createMesh() {
        this.mesh = new THREE.Group();

        if (this.type === 'goomba') {
            // Cuerpo marrón
            const bodyGeometry = new THREE.BoxGeometry(24, 16, 24);
            const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
            const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
            body.position.set(0, 8, 0);
            body.castShadow = true;
            this.mesh.add(body);

            // Ojos
            const eyeWhiteGeometry = new THREE.BoxGeometry(6, 6, 1);
            const eyeWhiteMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
            const leftEyeWhite = new THREE.Mesh(eyeWhiteGeometry, eyeWhiteMaterial);
            leftEyeWhite.position.set(-6, 12, 13);
            this.mesh.add(leftEyeWhite);

            const rightEyeWhite = new THREE.Mesh(eyeWhiteGeometry, eyeWhiteMaterial);
            rightEyeWhite.position.set(6, 12, 13);
            this.mesh.add(rightEyeWhite);

            const eyeBlackGeometry = new THREE.BoxGeometry(3, 3, 1);
            const eyeBlackMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
            const leftEyeBlack = new THREE.Mesh(eyeBlackGeometry, eyeBlackMaterial);
            leftEyeBlack.position.set(-6, 12, 14);
            this.mesh.add(leftEyeBlack);

            const rightEyeBlack = new THREE.Mesh(eyeBlackGeometry, eyeBlackMaterial);
            rightEyeBlack.position.set(6, 12, 14);
            this.mesh.add(rightEyeBlack);

            // Pies
            const footGeometry = new THREE.BoxGeometry(10, 8, 12);
            const footMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
            const leftFoot = new THREE.Mesh(footGeometry, footMaterial);
            leftFoot.position.set(-7, 24, 0);
            leftFoot.castShadow = true;
            this.mesh.add(leftFoot);

            const rightFoot = new THREE.Mesh(footGeometry, footMaterial);
            rightFoot.position.set(7, 24, 0);
            rightFoot.castShadow = true;
            this.mesh.add(rightFoot);
        } else if (this.type === 'koopa') {
            // Caparazón verde
            const shellGeometry = new THREE.BoxGeometry(24, 16, 24);
            const shellMaterial = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
            const shell = new THREE.Mesh(shellGeometry, shellMaterial);
            shell.position.set(0, 12, 0);
            shell.castShadow = true;
            this.mesh.add(shell);

            // Detalles del caparazón
            const detailGeometry = new THREE.BoxGeometry(16, 2, 24);
            const detailMaterial = new THREE.MeshLambertMaterial({ color: 0x006400 });
            const detail1 = new THREE.Mesh(detailGeometry, detailMaterial);
            detail1.position.set(0, 14, 0);
            this.mesh.add(detail1);

            const detail2 = new THREE.Mesh(detailGeometry, detailMaterial);
            detail2.position.set(0, 20, 0);
            this.mesh.add(detail2);

            // Cabeza
            const headGeometry = new THREE.BoxGeometry(16, 8, 16);
            const headMaterial = new THREE.MeshLambertMaterial({ color: 0xffff99 });
            const head = new THREE.Mesh(headGeometry, headMaterial);
            head.position.set(0, 4, 0);
            head.castShadow = true;
            this.mesh.add(head);

            // Ojos
            const eyeGeometry = new THREE.BoxGeometry(3, 3, 1);
            const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
            const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
            leftEye.position.set(-5, 4, 9);
            this.mesh.add(leftEye);

            const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
            rightEye.position.set(5, 4, 9);
            this.mesh.add(rightEye);

            // Pies
            const footGeometry = new THREE.BoxGeometry(8, 4, 8);
            const footMaterial = new THREE.MeshLambertMaterial({ color: 0xffcc00 });
            const leftFoot = new THREE.Mesh(footGeometry, footMaterial);
            leftFoot.position.set(-8, 28, 0);
            leftFoot.castShadow = true;
            this.mesh.add(leftFoot);

            const rightFoot = new THREE.Mesh(footGeometry, footMaterial);
            rightFoot.position.set(8, 28, 0);
            rightFoot.castShadow = true;
            this.mesh.add(rightFoot);
        }

        // Convertir coordenadas Y de Canvas 2D a Three.js
        const threeY = toThreeY(this.y + this.height / 2);
        this.mesh.position.set(this.x, threeY, this.z);
        scene.add(this.mesh);
    }

    update() {
        if (this.stomped) return;

        this.velocityY += GRAVITY;
        this.x += this.velocityX;
        this.y += this.velocityY;

        // Animación
        this.animation += 0.1;
        if (!this.stomped) {
            this.mesh.rotation.y += 0.02 * Math.sign(this.velocityX);
        }

        // Límites
        if (this.y > CANVAS_HEIGHT) {
            this.dead = true;
        }

        this.updateMeshPosition();
    }

    updateMeshPosition() {
        // Convertir coordenadas Y de Canvas 2D a Three.js
        const threeY = toThreeY(this.y + this.height / 2);
        this.mesh.position.set(this.x, threeY, this.z);
    }

    stomp() {
        this.stomped = true;
        this.velocityX = 0;
        score += 100;
        updateHUD();

        // Aplastar visualmente
        this.mesh.scale.y = 0.3;
        // Convertir coordenadas Y de Canvas 2D a Three.js
        const threeY = toThreeY(this.y + 4);
        this.mesh.position.y = threeY;

        setTimeout(() => {
            this.dead = true;
        }, 500);
    }

    reverse() {
        this.velocityX *= -1;
    }

    destroy() {
        scene.remove(this.mesh);
    }
}

// Clase Block
class Block {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.z = 0;
        this.width = TILE_SIZE;
        this.height = TILE_SIZE;
        this.depth = TILE_SIZE;
        this.type = type;
        this.hit = false;
        this.solid = true;
        this.coin = type === 'question';

        this.createMesh();
    }

    createMesh() {
        switch(this.type) {
            case 'brick':
                this.createBrickMesh();
                break;
            case 'question':
                this.createQuestionMesh();
                break;
            case 'pipe':
                this.createPipeMesh();
                break;
            case 'ground':
                this.createGroundMesh();
                break;
            case 'cloud':
                this.createCloudMesh();
                break;
            case 'bush':
                this.createBushMesh();
                break;
            case 'hill':
                this.createHillMesh();
                break;
        }

        if (this.mesh) {
            // Convertir coordenadas Y de Canvas 2D a Three.js
            const threeY = toThreeY(this.y);
            this.mesh.position.set(this.x, threeY, this.z);
            scene.add(this.mesh);
        }
    }

    createBrickMesh() {
        const geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
        const material = new THREE.MeshLambertMaterial({ color: 0xb8734e });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        // Agregar detalles
        const detailGeometry = new THREE.BoxGeometry(this.width, 2, this.depth);
        const detailMaterial = new THREE.MeshLambertMaterial({ color: 0x8b5a3c });
        const detail = new THREE.Mesh(detailGeometry, detailMaterial);
        detail.position.y = 0;
        this.mesh.add(detail);
    }

    createQuestionMesh() {
        if (this.hit) {
            this.createBrickMesh();
            return;
        }

        const geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
        const material = new THREE.MeshLambertMaterial({ color: 0xffaa00 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        // Agregar signo de interrogación usando un plano
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', 32, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(20, 20, 1);
        sprite.position.set(0, 0, this.depth / 2 + 1);
        this.mesh.add(sprite);

        // Animación de rebote
        this.mesh.userData.bounceSpeed = 0.05;
        this.mesh.userData.bounceAmount = 0;
    }

    createPipeMesh() {
        this.mesh = new THREE.Group();

        // Cuerpo de la tubería
        const bodyGeometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.castShadow = true;
        body.receiveShadow = true;
        this.mesh.add(body);

        // Bordes
        const borderGeometry = new THREE.BoxGeometry(4, this.height, this.depth);
        const borderMaterial = new THREE.MeshLambertMaterial({ color: 0x008800 });
        const leftBorder = new THREE.Mesh(borderGeometry, borderMaterial);
        leftBorder.position.x = -this.width / 2 + 2;
        this.mesh.add(leftBorder);

        const rightBorder = new THREE.Mesh(borderGeometry, borderMaterial);
        rightBorder.position.x = this.width / 2 - 2;
        this.mesh.add(rightBorder);

        // Parte superior
        const topGeometry = new THREE.BoxGeometry(this.width + 8, 8, this.depth + 8);
        const topMaterial = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
        const top = new THREE.Mesh(topGeometry, topMaterial);
        top.position.y = -this.height / 2 - 4;
        top.castShadow = true;
        this.mesh.add(top);
    }

    createGroundMesh() {
        const geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
        const material = new THREE.MeshLambertMaterial({ color: 0xda8248 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        // Detalles de tierra
        const detailGeometry = new THREE.BoxGeometry(this.width, 4, this.depth);
        const detailMaterial = new THREE.MeshLambertMaterial({ color: 0xb86930 });
        const detail = new THREE.Mesh(detailGeometry, detailMaterial);
        detail.position.y = -this.height / 2 + 2;
        this.mesh.add(detail);
    }

    createCloudMesh() {
        this.solid = false;
        this.mesh = new THREE.Group();

        // Crear nube con esferas
        const sphereGeometry = new THREE.SphereGeometry(8, 8, 8);
        const sphereMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });

        const sphere1 = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere1.position.set(-8, 0, 0);
        this.mesh.add(sphere1);

        const sphere2 = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere2.position.set(0, 2, 0);
        sphere2.scale.set(1.2, 1.2, 1.2);
        this.mesh.add(sphere2);

        const sphere3 = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere3.position.set(8, 0, 0);
        this.mesh.add(sphere3);
    }

    createBushMesh() {
        this.solid = false;
        this.mesh = new THREE.Group();

        // Crear arbusto con esferas
        const sphereGeometry = new THREE.SphereGeometry(8, 8, 8);
        const sphereMaterial = new THREE.MeshLambertMaterial({ color: 0x00ff00 });

        for (let i = 0; i < 3; i++) {
            const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
            sphere.position.set((i - 1) * 8, 16, 0);
            this.mesh.add(sphere);
        }
    }

    createHillMesh() {
        this.solid = false;
        const geometry = new THREE.SphereGeometry(this.width / 2, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const material = new THREE.MeshLambertMaterial({ color: 0x00aa00 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.rotation.x = Math.PI;
        this.mesh.position.y = this.height;
    }

    update() {
        if (this.type === 'question' && !this.hit && this.mesh.userData.bounceSpeed) {
            this.mesh.userData.bounceAmount += this.mesh.userData.bounceSpeed;
            // Convertir coordenadas Y de Canvas 2D a Three.js
            const bounce = Math.sin(this.mesh.userData.bounceAmount) * 3;
            const threeY = toThreeY(this.y - bounce);
            this.mesh.position.y = threeY;
        }
    }

    onHit() {
        if (this.type === 'question' && !this.hit) {
            this.hit = true;
            if (this.coin) {
                coins++;
                score += 200;
                updateHUD();

                // Animación de moneda
                createCoinAnimation(this.x, this.y);
            }

            // Recrear mesh como ladrillo
            scene.remove(this.mesh);
            this.createMesh();
            return true;
        }
        return false;
    }

    destroy() {
        scene.remove(this.mesh);
    }
}

// Clase PowerUp
class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.z = 0;
        this.width = 32;
        this.height = 32;
        this.type = type;
        this.velocityX = 2;
        this.velocityY = 0;
        this.collected = false;
        this.emerging = true;
        this.emergingY = y;

        this.createMesh();
    }

    createMesh() {
        this.mesh = new THREE.Group();

        if (this.type === 'mushroom') {
            // Sombrero rojo
            const capGeometry = new THREE.CylinderGeometry(12, 14, 16, 16);
            const capMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
            const cap = new THREE.Mesh(capGeometry, capMaterial);
            cap.position.set(0, 8, 0);
            cap.castShadow = true;
            this.mesh.add(cap);

            // Puntos blancos
            const spotGeometry = new THREE.SphereGeometry(3, 8, 8);
            const spotMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });

            const spot1 = new THREE.Mesh(spotGeometry, spotMaterial);
            spot1.position.set(-5, 10, 8);
            this.mesh.add(spot1);

            const spot2 = new THREE.Mesh(spotGeometry, spotMaterial);
            spot2.position.set(5, 10, 8);
            this.mesh.add(spot2);

            // Tallo blanco
            const stemGeometry = new THREE.CylinderGeometry(8, 8, 8, 16);
            const stemMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
            const stem = new THREE.Mesh(stemGeometry, stemMaterial);
            stem.position.set(0, 24, 0);
            stem.castShadow = true;
            this.mesh.add(stem);
        }

        // Convertir coordenadas Y de Canvas 2D a Three.js
        const threeY = toThreeY(this.y + this.height / 2);
        this.mesh.position.set(this.x, threeY, this.z);
        scene.add(this.mesh);
    }

    update() {
        if (this.collected) return;

        if (this.emerging) {
            this.y -= 1;
            if (this.y <= this.emergingY - 32) {
                this.emerging = false;
            }
            this.updateMeshPosition();
            return;
        }

        this.velocityY += GRAVITY;
        this.x += this.velocityX;
        this.y += this.velocityY;

        // Rotación
        this.mesh.rotation.y += 0.05;

        this.updateMeshPosition();
    }

    updateMeshPosition() {
        // Convertir coordenadas Y de Canvas 2D a Three.js
        const threeY = toThreeY(this.y + this.height / 2);
        this.mesh.position.set(this.x, threeY, this.z);
    }

    collect() {
        this.collected = true;
        scene.remove(this.mesh);
        score += 1000;
        updateHUD();
        return this.type;
    }

    destroy() {
        scene.remove(this.mesh);
    }
}

// Partículas y animaciones
class Particle {
    constructor(x, y, text) {
        this.x = x;
        this.y = y;
        this.z = 0;
        this.text = text;
        this.life = 60;
        this.velocityY = -2;

        this.createSprite();
    }

    createSprite() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.text, 64, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        this.sprite = new THREE.Sprite(material);
        this.sprite.scale.set(60, 30, 1);
        // Convertir coordenadas Y de Canvas 2D a Three.js
        const threeY = toThreeY(this.y);
        this.sprite.position.set(this.x, threeY, this.z);
        scene.add(this.sprite);
    }

    update() {
        this.y += this.velocityY;
        this.life--;
        // Convertir coordenadas Y de Canvas 2D a Three.js
        const threeY = toThreeY(this.y);
        this.sprite.position.set(this.x, threeY, this.z);
        this.sprite.material.opacity = this.life / 60;
    }

    destroy() {
        scene.remove(this.sprite);
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
    // Limpiar objetos anteriores
    blocks.forEach(block => block.destroy());
    enemies.forEach(enemy => enemy.destroy());
    powerUps.forEach(powerUp => powerUp.destroy());
    particles.forEach(particle => particle.destroy());

    blocks = [];
    enemies = [];
    powerUps = [];
    particles = [];

    // Suelo
    for (let i = 0; i < levelWidth / TILE_SIZE; i++) {
        blocks.push(new Block(i * TILE_SIZE, CANVAS_HEIGHT - TILE_SIZE, 'ground'));
        blocks.push(new Block(i * TILE_SIZE, CANVAS_HEIGHT - TILE_SIZE * 2, 'ground'));
    }

    // Decoraciones - nubes
    blocks.push(new Block(200, 80, 'cloud'));
    blocks.push(new Block(400, 100, 'cloud'));
    blocks.push(new Block(700, 80, 'cloud'));
    blocks.push(new Block(1000, 100, 'cloud'));

    // Decoraciones - arbustos
    blocks.push(new Block(300, CANVAS_HEIGHT - TILE_SIZE * 3, 'bush'));
    blocks.push(new Block(600, CANVAS_HEIGHT - TILE_SIZE * 3, 'bush'));
    blocks.push(new Block(900, CANVAS_HEIGHT - TILE_SIZE * 3, 'bush'));

    // Bloques de pregunta y ladrillos
    blocks.push(new Block(320, CANVAS_HEIGHT - TILE_SIZE * 6, 'question'));
    blocks.push(new Block(384, CANVAS_HEIGHT - TILE_SIZE * 6, 'brick'));
    blocks.push(new Block(416, CANVAS_HEIGHT - TILE_SIZE * 6, 'question'));
    blocks.push(new Block(448, CANVAS_HEIGHT - TILE_SIZE * 6, 'brick'));
    blocks.push(new Block(480, CANVAS_HEIGHT - TILE_SIZE * 6, 'question'));
    blocks.push(new Block(512, CANVAS_HEIGHT - TILE_SIZE * 6, 'brick'));
    blocks.push(new Block(544, CANVAS_HEIGHT - TILE_SIZE * 6, 'question'));

    // Bloques flotantes
    blocks.push(new Block(640, CANVAS_HEIGHT - TILE_SIZE * 10, 'brick'));
    blocks.push(new Block(672, CANVAS_HEIGHT - TILE_SIZE * 10, 'brick'));
    blocks.push(new Block(704, CANVAS_HEIGHT - TILE_SIZE * 10, 'brick'));
    blocks.push(new Block(736, CANVAS_HEIGHT - TILE_SIZE * 10, 'question'));

    // Escalera de bloques
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j <= i; j++) {
            blocks.push(new Block(900 + i * TILE_SIZE, CANVAS_HEIGHT - TILE_SIZE * (3 + j), 'brick'));
        }
    }

    // Tuberías
    blocks.push(new Block(800, CANVAS_HEIGHT - TILE_SIZE * 3, 'pipe'));
    blocks.push(new Block(832, CANVAS_HEIGHT - TILE_SIZE * 3, 'pipe'));
    blocks.push(new Block(800, CANVAS_HEIGHT - TILE_SIZE * 4, 'pipe'));
    blocks.push(new Block(832, CANVAS_HEIGHT - TILE_SIZE * 4, 'pipe'));

    blocks.push(new Block(1200, CANVAS_HEIGHT - TILE_SIZE * 4, 'pipe'));
    blocks.push(new Block(1232, CANVAS_HEIGHT - TILE_SIZE * 4, 'pipe'));
    blocks.push(new Block(1200, CANVAS_HEIGHT - TILE_SIZE * 5, 'pipe'));
    blocks.push(new Block(1232, CANVAS_HEIGHT - TILE_SIZE * 5, 'pipe'));
    blocks.push(new Block(1200, CANVAS_HEIGHT - TILE_SIZE * 6, 'pipe'));
    blocks.push(new Block(1232, CANVAS_HEIGHT - TILE_SIZE * 6, 'pipe'));

    // Más bloques de pregunta
    for (let i = 0; i < 3; i++) {
        blocks.push(new Block(1400 + i * 64, CANVAS_HEIGHT - TILE_SIZE * 6, 'question'));
    }

    // Plataformas flotantes
    for (let i = 0; i < 5; i++) {
        blocks.push(new Block(1700 + i * TILE_SIZE, CANVAS_HEIGHT - TILE_SIZE * 8, 'brick'));
    }

    // Enemigos - Goombas
    enemies.push(new Enemy(400, CANVAS_HEIGHT - TILE_SIZE * 3, 'goomba'));
    enemies.push(new Enemy(500, CANVAS_HEIGHT - TILE_SIZE * 3, 'goomba'));
    enemies.push(new Enemy(700, CANVAS_HEIGHT - TILE_SIZE * 3, 'goomba'));
    enemies.push(new Enemy(1000, CANVAS_HEIGHT - TILE_SIZE * 3, 'goomba'));
    enemies.push(new Enemy(1100, CANVAS_HEIGHT - TILE_SIZE * 3, 'goomba'));
    enemies.push(new Enemy(1500, CANVAS_HEIGHT - TILE_SIZE * 3, 'goomba'));

    // Enemigos - Koopas
    enemies.push(new Enemy(600, CANVAS_HEIGHT - TILE_SIZE * 3, 'koopa'));
    enemies.push(new Enemy(950, CANVAS_HEIGHT - TILE_SIZE * 3, 'koopa'));
    enemies.push(new Enemy(1300, CANVAS_HEIGHT - TILE_SIZE * 3, 'koopa'));
    enemies.push(new Enemy(1800, CANVAS_HEIGHT - TILE_SIZE * 3, 'koopa'));

    // Más enemigos a lo largo del nivel
    for (let i = 2000; i < levelWidth - 500; i += 300) {
        if (Math.random() > 0.5) {
            enemies.push(new Enemy(i, CANVAS_HEIGHT - TILE_SIZE * 3, 'goomba'));
        } else {
            enemies.push(new Enemy(i, CANVAS_HEIGHT - TILE_SIZE * 3, 'koopa'));
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
    const targetX = mario.x - CANVAS_WIDTH / 3;
    cameraX = Math.max(0, Math.min(targetX, levelWidth - CANVAS_WIDTH));

    // Actualizar posición de la cámara en 3D
    // La cámara mira hacia el centro del mundo en coordenadas Three.js
    const centerY = toThreeY(CANVAS_HEIGHT / 2);
    camera.position.x = cameraX + CANVAS_WIDTH / 2;
    camera.position.y = centerY + 200;
    camera.position.z = 400;
    camera.lookAt(cameraX + CANVAS_WIDTH / 2, centerY, 0);
}

// Temporizador
let timerInterval;
function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
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
    if (mario) mario.destroy();
    mario = new Mario(100, 100);
    enemies.forEach(enemy => enemy.destroy());
    powerUps.forEach(powerUp => powerUp.destroy());
    particles.forEach(particle => particle.destroy());
    enemies = [];
    powerUps = [];
    particles = [];
    createLevel();
    cameraX = 0;
    time = 400;
    gameRunning = true;
    updateHUD();
}

// Overlay para Game Over y Victoria
let overlayDiv;
function createOverlay() {
    if (!overlayDiv) {
        overlayDiv = document.createElement('div');
        overlayDiv.style.position = 'absolute';
        overlayDiv.style.top = '0';
        overlayDiv.style.left = '0';
        overlayDiv.style.width = '1024px';
        overlayDiv.style.height = '576px';
        overlayDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        overlayDiv.style.display = 'none';
        overlayDiv.style.justifyContent = 'center';
        overlayDiv.style.alignItems = 'center';
        overlayDiv.style.flexDirection = 'column';
        overlayDiv.style.color = 'white';
        overlayDiv.style.fontFamily = '"Press Start 2P", monospace';
        overlayDiv.style.zIndex = '1000';
        overlayDiv.style.pointerEvents = 'none';
        document.querySelector('.game-container').appendChild(overlayDiv);
    }
    return overlayDiv;
}

function showOverlay(title, subtitle) {
    const overlay = createOverlay();
    overlay.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 20px;">${title}</div>
        <div style="font-size: 24px;">${subtitle}</div>
    `;
    overlay.style.display = 'flex';
}

function hideOverlay() {
    if (overlayDiv) {
        overlayDiv.style.display = 'none';
    }
}

// Game Loop
function gameLoop() {
    // Actualizar
    if (gameRunning) {
        mario.update();

        enemies = enemies.filter(enemy => {
            if (enemy.dead) {
                enemy.destroy();
                return false;
            }
            return true;
        });
        enemies.forEach(enemy => enemy.update());

        powerUps = powerUps.filter(powerUp => {
            if (powerUp.collected && !powerUp.emerging) {
                return false;
            }
            return true;
        });
        powerUps.forEach(powerUp => powerUp.update());

        particles = particles.filter(particle => {
            if (particle.life <= 0) {
                particle.destroy();
                return false;
            }
            return true;
        });
        particles.forEach(particle => particle.update());

        // Actualizar bloques (para animación)
        blocks.forEach(block => {
            if (block.update) block.update();
        });

        handleBlockCollisions();
        handleEnemyCollisions();
        handlePowerUpCollisions();

        updateCamera();
    }

    // Game Over
    if (gameOver) {
        showOverlay('GAME OVER', 'Presiona R para reiniciar');
    }

    // Victoria
    if (mario.x > levelWidth - 200 && !mario.dead) {
        showOverlay('¡VICTORIA!', 'Stage 1-1 Completado');
        gameRunning = false;
    }

    // Renderizar
    renderer.render(scene, camera);
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
        hideOverlay();
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
initThree();
mario = new Mario(100, 100);
createLevel();
startTimer();
updateHUD();
gameLoop();
