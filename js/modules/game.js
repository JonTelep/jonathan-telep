// Game state
let gameLoop;
let isGameActive = false;
let score = 0;
let dino = { y: 0, velocity: 0 };
let obstacles = [];
let gameSpeed = 2;
let gameStartTime;

export function startGame() {
    const modal = document.getElementById('gameModal');
    modal.classList.add('active');
    
    // Reset game state
    isGameActive = true;
    score = 0;
    dino.y = 0;
    dino.velocity = 0;
    obstacles = [];
    gameSpeed = 2;
    gameStartTime = Date.now();
    
    document.getElementById('score').textContent = 'Score: 0';
    document.addEventListener('keydown', handleJump);
    document.getElementById('closeGame').addEventListener('click', closeGame);
    
    gameLoop = setInterval(updateGame, 20);
}

function closeGame() {
    if (isGameActive) {
        endGame();
    } else {
        const modal = document.getElementById('gameModal');
        modal.classList.remove('active');
    }
}

function handleJump(event) {
    if (event.code === 'Space' && dino.y === 0 && isGameActive) {
        dino.velocity = 20;
        event.preventDefault();
    }
}

function updateGame() {
    if (!isGameActive) return;

    dino.y += dino.velocity;
    dino.velocity -= 1.5;
    if (dino.y < 0) {
        dino.y = 0;
        dino.velocity = 0;
    }
    
    const timeSinceStart = Date.now() - gameStartTime;
    if (timeSinceStart > 2000) {
        if (Math.random() < (score < 5 ? 0.01 : 0.02)) {
            obstacles.push({ x: 100 });
        }
    }
    
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= gameSpeed;
        
        if (obstacles[i].x < -10) {
            obstacles.splice(i, 1);
            score++;
            if (score % 5 === 0) {
                gameSpeed += 0.25;
            }
        } else if (obstacles[i].x < 20 && obstacles[i].x > 0 && dino.y < 50) {
            endGame();
            return;
        }
    }
    
    const dinoElem = document.getElementById('dino');
    const scoreElem = document.getElementById('score');
    
    if (dinoElem && scoreElem) {
        dinoElem.style.bottom = dino.y + 'px';
        scoreElem.textContent = `Score: ${score}`;
        
        document.querySelectorAll('.obstacle').forEach(obs => obs.remove());
        const gameDiv = document.getElementById('game');
        if (gameDiv) {
            obstacles.forEach(obs => {
                const obsElem = document.createElement('div');
                obsElem.className = 'obstacle';
                obsElem.style.left = obs.x + '%';
                gameDiv.appendChild(obsElem);
            });
        }
    }
}

function endGame() {
    isGameActive = false;
    clearInterval(gameLoop);
    document.removeEventListener('keydown', handleJump);
    
    const output = document.getElementById('output');
    output.innerHTML += `Game Over! Final Score: ${score}\n`;
    
    setTimeout(() => {
        const modal = document.getElementById('gameModal');
        modal.classList.remove('active');
        window.addNewPrompt();
    }, 1500);
} 