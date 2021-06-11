const FPS = 30;

function pausePiece(piece) {
    const aniMixer = piece.components['animation-mixer'];
    if (aniMixer && aniMixer.mixer._actions[0]) {
        piece.components["animation-mixer"].mixer.setTime(0);
        aniMixer.mixer._actions[0].paused = true;
    }
}

function doHeld(piece, type) {
    if (piece.components["animation-mixer"]) {
        const startTime = getHeldStart(type || piece.metadata.type);
        const elapsedTime = getHeldElapsed(type || piece.metadata.type);
        piece.components["animation-mixer"].mixer._actions[0].paused = false;
        piece.components["animation-mixer"].mixer.setTime(startTime);
        setTimeout(() => {
            piece.components["animation-mixer"].mixer.setTime(0);
            piece.components["animation-mixer"].mixer._actions[0].paused = true;
        }, elapsedTime);
    }
}

function getHeldStart(type) {
    switch (type) {
        case "b":
            return 1000 * FPS;
        case "p":
            return 175 * FPS;
        case "r":
            return 1300 * FPS;
        case "n": 
            return 800 * FPS;
        case "k":
            return 615 * FPS;
        case "q":
            return 1370 * FPS; 
    }
}
function getHeldElapsed(type) {
    switch (type) {
        case "b":
            return 1173 * FPS - getHeldStart(type);
        case "p":
            return 205 * FPS - getHeldStart(type);
        case "r":
            return 1400 * FPS - getHeldStart(type);
        case "n":
            return 900 * FPS - getHeldStart(type);
        case "k":
            return 735 * FPS - getHeldStart(type);
        case "q":
            return 1505 * FPS - getHeldStart(type);
    }
}

function doMoved(piece, type) {
    if (piece.components["animation-mixer"]) {
        const startTime = getActionStart(type || piece.metadata.type);
        const elapsedTime = getActionElapsed(type || piece.metadata.type);
        piece.components["animation-mixer"].mixer._actions[0].paused = false;
        piece.components["animation-mixer"].mixer.setTime(startTime);
        setTimeout(() => {
            piece.components["animation-mixer"].mixer.setTime(0);
            setTimeout(() => {
                piece.components["animation-mixer"].mixer._actions[0].paused = true;
            }, elapsedTime);
        }, 900); 
    }
}

function getActionStart(type) {
    switch (type) {
        case "b":
            return 270 * FPS;
        case "p":
            return 300 * FPS;
        case "r":
            return 200 * FPS;
        case "n": 
            return 410 * FPS;
        case "k":
            return 400 * FPS;
        case "q":
            return 375 * FPS; 
    }
}
function getActionElapsed(type) {
    switch (type) {
        case "b":
            return 325 * FPS - getHeldStart(type);
        case "p":
            return 550 * FPS - getHeldStart(type);
        case "r":
            return 325 * FPS - getHeldStart(type);
        case "n":
            return 490 * FPS - getHeldStart(type);
        case "k":
            return 470 * FPS - getHeldStart(type);
        case "q":
            return 550 * FPS - getHeldStart(type);
    }
}

function doIdle(piece, type) {
    if (piece.components["animation-mixer"]) {
        const startTime = getIdleStart(type || piece.metadata.type);
        const elapsedTime = getIdleElapsed(type || piece.metadata.type);
        piece.components["animation-mixer"].mixer._actions[0].paused = false;
        piece.components["animation-mixer"].mixer.setTime(startTime);
        setTimeout(() => {
            piece.components["animation-mixer"].mixer.setTime(0);
            setTimeout(() => {
                piece.components["animation-mixer"].mixer._actions[0].paused = true;
            }, 1000);
        }, elapsedTime); 
    }
}

function getIdleStart(type) {
    switch (type) {
        case "b":
            return 70 * FPS;
        case "p":
            return 25 * FPS;
        case "r":
            return 20 * FPS;
        case "n": 
            return 100 * FPS;
        case "k":
            return 121 * FPS;
        case "q":
            return 0 * FPS; 
    }
}
function getIdleElapsed(type) {
    switch (type) {
        case "b":
            return 100 * FPS - getHeldStart(type);
        case "p":
            return 100 * FPS - getHeldStart(type);
        case "r":
            return 100 * FPS - getHeldStart(type);
        case "n":
            return 140 * FPS - getHeldStart(type);
        case "k":
            return 200 * FPS - getHeldStart(type);
        case "q":
            return 90 * FPS - getHeldStart(type);
    }
}

export { pausePiece, doHeld, doMoved, doIdle };