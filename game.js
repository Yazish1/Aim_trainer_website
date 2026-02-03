const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
let height, width;
function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}

resizeCanvas();
window.addEventListener("resize",resizeCanvas)

const scorebar_height = 40;
const target_padding = 20;
const score_threshold = 30;

const levels = {
    1: { hp: 50, timer: 700, maxSize: 32, growthRate: 0.2 },
    2: { hp: 40, timer: 650, maxSize: 30, growthRate: 0.3 },
    3: { hp: 30, timer: 550, maxSize: 28, growthRate: 0.4 },
    4: { hp: 20, timer: 500, maxSize: 26, growthRate: 0.5 }
}

const state = {
    level_select: "level_select",
    playing: "playing",
    game_over: "game_over"
}

let gameState = state.level_select;
let currentlvl = 1;
let levelData = null;

let targets = []
let score = 0
let clicks = 0
let miss = 0
let startTime = null;
let spawnTimer = null;
let gameWon = false;
let endTime = null;
class Target  {
    constructor(x, y, level) {
        this.x = x;
        this.y = y;
        this.size = 0;
        this.grow = true;
        this.maxSize = level.maxSize;
        this.growthRate = level.growthRate;
    }
    update_target() {
        if (this.size>=this.maxSize) {
            this.grow = false;
        }
        if (this.grow) {
            this.size += this.growthRate
        } else {
            this.size -= this.growthRate
        }
    }

    dead() {
        return this.size <= 0;
    }
    
    collide(mx, my) {
        const distanceX = this.x - mx;
        const distanceY = this.y - my;
        return Math.sqrt((distanceX)**2 + (distanceY)**2) <= this.size;
    }

    draw() {
        ctx.beginPath();
        ctx.fillStyle = "red";
        ctx.arc(this.x, this.y, this.size, 0, Math.PI*2)
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = "white";
        ctx.arc(this.x, this.y, this.size * 0.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = "red";
        ctx.arc(this.x, this.y, this.size * 0.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = "white";
        ctx.arc(this.x, this.y, this.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
    }
}
function elapsedTime() {
    const end = (gameState === state.game_over && endTime) ? endTime : Date.now()
    return Math.floor((end - startTime) / 1000);
}

//--Screen--
function clearScreen(color) {
    ctx.fillStyle = color;
    ctx.fillRect(0,0,width, height);
}


function drawLevelSelect() {
    clearScreen("#0f172a");

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "#e5e7eb";
    ctx.font = "48px Arial";
    ctx.fillText("Select Level", width / 2, 120);

    // Level button drawing
    ctx.font = "20px Arial";
    for (let i = 1; i <= 4; i++) {
        const x = width / 2 - 50;
        const y = height / 2 - 100 + (i - 1) * 70;

        ctx.fillStyle = "#1e293b";
        ctx.fillRect(x, y, 100, 50);

        ctx.fillStyle = "#cbd5f5";
        ctx.fillText(`LEVEL ${i}`, width / 2, y + 25);
    }

    ctx.font = "16px Arial";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("Press ESC to exit", width / 2, height - 30);
}

function drawScorecard() {
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 0, width, scorebar_height);

    ctx.fillStyle = "#b7c9d4";
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const spaceX = width/3;
    const centerY = scorebar_height/2

    ctx.fillText(`Time: ${elapsedTime()}s`, spaceX*0.5, centerY);
    ctx.fillText(`Score: ${score}`, spaceX*1.5, centerY);
    ctx.fillText(`HP: ${levelData.hp - miss}`, spaceX*2.5, centerY);
}

function drawGameOver() {
    clearScreen("#0f172a");
    ctx.textAlign = "center";
    ctx.font = "48px Arial";
    ctx.fillStyle = "#e5e7eb";

    ctx.fillText(gameWon ? "CONGRATULATIONS" : "GAME OVER", width / 2, 180);

    ctx.font = "22px Arial";
    ctx.fillStyle = "#cbd5f5";
    const accuracy = clicks ? ((score / clicks) * 100).toFixed(1) : 0;

    ctx.fillText(`Score: ${score}`, width / 2, 260);
    ctx.fillText(`Accuracy: ${accuracy}%`, width / 2, 295);
    ctx.fillText(`Time: ${elapsedTime()}s`, width / 2, 330);
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("Click to return to level select", width / 2, 380);
    ctx.fillText("ESC to exit", width / 2, 410);
}


function spawnTarget() {
    const margin = levelData.maxSize + target_padding;
    const x = Math.random() * (width-margin*2)+margin;
    const y = Math.random() * (height-margin*2-scorebar_height)+margin+scorebar_height;
    targets.push(new Target(x, y, levelData))
}

function updateGame() {
    const now = Date.now()
    if (now - lastSpawn >= levelData.timer) {
        spawnTarget();
        lastSpawn = now;
    }

    for (let i = targets.length-1; i>=0; i--) {
        targets[i].update_target();
        if (targets[i].dead()) {
            targets.splice(i, 1);
            miss++;
        }
    }

    if (miss >= levelData.hp) {
        gameWon = false;
        endTime = Date.now();
        gameState = state.game_over;
    }
    if (score>=score_threshold) {
        gameWon = true;
        endTime = Date.now();
        gameState = state.game_over;
    }
}

function resetGame(chosen_level) {
    currentlvl = chosen_level;
    levelData = levels[currentlvl];
    targets = [];
    score = 0;
    clicks = 0
    miss = 0
    startTime = Date.now();
    endTime = null;
    lastSpawn = Date.now();
    gameState = state.playing;
}

function handleClick(mx, my) {
    clicks++;
    for (let i = targets.length-1; i>=0;i--) {
        if (targets[i].collide(mx,my)) {
            targets.splice(i,1);
            score++;
            return;
        }
    }
}

// Event listeners
canvas.addEventListener("click", e => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (gameState == state.level_select) {
        for (let i = 1; i<=4;i++) {
            const x = width/2 - 50;
            const y = height/2 - 100 + (i - 1) * 70;
        if (mx >= x && mx <= x + 100 && my >= y && my <= y + 50) {
            resetGame(i);
            return;
        }
        }
    }

    if (gameState == state.playing) {
        handleClick(mx,my);
    }
    if (gameState == state.game_over) {
        gameState = state.level_select;
    }
});

// Keyboard controls
document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
        if (gameState === state.playing) {
            gameState = state.level_select;
        } else {
            window.close()
        }
    }
});
document.addEventListener("keydown", e => {
    if (e.key === "f") {
        if (!document.fullscreenElement) {
            canvas.requestFullscreen();
        }
    }
});

// Main game loop
function gameLoop() {
    requestAnimationFrame(gameLoop);
    if (gameState === state.level_select) {
        drawLevelSelect();
        return;
    }
    if (gameState === state.playing) {
        clearScreen();
        updateGame();
        targets.forEach(t => t.draw());
        drawScorecard();
        return;
    }

    if (gameState === state.game_over) {
        drawGameOver();
    }
}

gameLoop();





