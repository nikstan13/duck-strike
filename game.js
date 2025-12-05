/**
 * ============================================
 * DUCK STRIKE - SOCCER POOL GAME
 * ============================================
 * 
 * Modular JavaScript game με Canvas API
 * 
 * Δομή:
 * 1. Configuration & Constants
 * 2. Utility Functions
 * 3. Ball Class
 * 4. Player Class
 * 5. Game Class
 * 6. Initialization
 */

'use strict'; // Strict mode για καλύτερο error handling

// ============================================
// 1. CONFIGURATION & CONSTANTS
// ============================================

const CONFIG = {
    // Canvas διαστάσεις
    CANVAS_WIDTH: 1600,
    CANVAS_HEIGHT: 900,
    
    // Γήπεδο margins
    SIDE_MARGIN: 240,
    TOP_MARGIN: 180,
    BOTTOM_MARGIN: 80,
    
    // Physics
    MAX_SPEED: 25,           // Μέγιστη ταχύτητα shot (μειωμένη για mobile)
    MAX_DRAG_DISTANCE: 200,  // Μέγιστη απόσταση drag
    BALL_FRICTION: 0.97,
    PLAYER_FRICTION: 0.95,
    RESTITUTION: 0.85,       // Ελαστικότητα σύγκρουσης
    
    // Game objects
    BALL_RADIUS: 15,
    PLAYER_RADIUS: 30,
    GOAL_POST_RADIUS: 8,
    
    // Goal
    GOAL_HEIGHT: 180,
    GOAL_DEPTH: 60,
    GOAL_DELAY: 500,         // ms πριν εμφανιστεί το μήνυμα γκολ
    
    // Collision detection
    SUBSTEPS: 5,             // Sub-steps για καλύτερο collision detection
    COLLISION_COOLDOWN: 30,  // ms cooldown μεταξύ collisions
    
    // Animation
    RELOCATION_DURATION: 800, // ms για animation μετακίνησης παίκτη
};

// Χρώματα (ξεχωριστό object για ευκολία)
const COLORS = {
    green: '#00C853',        // Ζωντανό πράσινο γηπέδου
    white: '#ffffff',
    black: '#000000',
    red: '#f44336',
    blue: '#2196f3',
    cyan: '#00e5ff',
    orange: '#ffa797',       // Background
    darkGrey: '#424242',
    lightBlue: '#64b5f6',
    lightRed: '#ff8a80',
    // Goal post colors
    postBlue: '#2745e1',     // Αριστερό τέρμα
    postRed: '#ff3420',      // Δεξί τέρμα
    fieldBorder: '#8a8a8a',  // Γκρι περίγραμμα
};

// ============================================
// 2. UTILITY FUNCTIONS
// ============================================

/**
 * Υπολογίζει την απόσταση μεταξύ δύο σημείων
 */
function distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Μετατρέπει mouse/touch event σε canvas coordinates
 * Λαμβάνει υπόψη το CSS scaling
 */
function getCanvasCoordinates(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY
    };
}

/**
 * Δημιουργεί ένα mock mouse event από touch event
 */
function touchToMouseEvent(touch) {
    return {
        clientX: touch.clientX,
        clientY: touch.clientY,
        preventDefault: () => {}
    };
}

// ============================================
// 3. BALL CLASS
// ============================================

class Ball {
    constructor() {
        this.radius = CONFIG.BALL_RADIUS;
        this.friction = CONFIG.BALL_FRICTION;
        this.reset();
    }
    
    /**
     * Reset ball στο κέντρο του γηπέδου
     */
    reset() {
        const centerX = CONFIG.CANVAS_WIDTH / 2;
        const centerY = (CONFIG.TOP_MARGIN + (CONFIG.CANVAS_HEIGHT - CONFIG.BOTTOM_MARGIN)) / 2;
        
        this.x = centerX;
        this.y = centerY;
        this.vx = 0;
        this.vy = 0;
        this.moving = false;
        
        // Goal tracking
        this.firstShotAfterReset = true;  // Flag για foul detection
        this.inGoal = false;
        this.goalType = null;
        this.goalTime = 0;
    }
    
    /**
     * Update ball position με physics
     */
    update() {
        if (!this.moving) return null;
        
        // Sub-stepping για καλύτερο collision detection
        // Χωρίζουμε την κίνηση σε μικρότερα βήματα
        for (let i = 0; i < CONFIG.SUBSTEPS; i++) {
            this.x += this.vx / CONFIG.SUBSTEPS;
            this.y += this.vy / CONFIG.SUBSTEPS;
            this.checkBoundaries();
        }
        
        // Αν η μπάλα είναι στο τέρμα, σταδιακή επιβράδυνση
        if (this.inGoal) {
            this.vx *= 0.75;
            this.vy *= 0.75;
            
            // Delay πριν εμφανιστεί το μήνυμα γκολ
            if (Date.now() - this.goalTime >= CONFIG.GOAL_DELAY) {
                return this.goalType;
            }
            return null;
        }
        
        // Exponential decay για smooth slowdown
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        
        if (speed > 0.5) {
            const decayFactor = Math.pow(this.friction, 1.2);
            this.vx *= decayFactor;
            this.vy *= decayFactor;
        } else {
            // Πλήρης στάση
            this.vx = 0;
            this.vy = 0;
            this.moving = false;
        }
        
        return null;
    }
    
    /**
     * Έλεγχος ορίων γηπέδου και τερμάτων
     */
    checkBoundaries() {
        const centerY = (CONFIG.TOP_MARGIN + (CONFIG.CANVAS_HEIGHT - CONFIG.BOTTOM_MARGIN)) / 2;
        const goalTop = centerY - CONFIG.GOAL_HEIGHT / 2;
        const goalBottom = centerY + CONFIG.GOAL_HEIGHT / 2;
        
        // ΑΡΙΣΤΕΡΟ ΤΕΡΜΑ (Player goal)
        if (this.x - this.radius < CONFIG.SIDE_MARGIN) {
            if (this.y > goalTop && this.y < goalBottom) {
                // Μέσα στο τέρμα
                if (!this.inGoal) {
                    this.inGoal = true;
                    this.goalTime = Date.now();
                    // Foul αν είναι το πρώτο shot μετά από reset
                    this.goalType = this.firstShotAfterReset ? 'foul_player_goal' : 'player_goal';
                }
                
                // Πίσω γραμμή τέρματος
                const backLine = CONFIG.SIDE_MARGIN - CONFIG.GOAL_DEPTH;
                if (this.x - this.radius <= backLine) {
                    this.x = backLine + this.radius;
                    this.vx = 0;
                    this.vy = 0;
                }
                
                // Δοκάρια (πάνω-κάτω)
                if (this.y - this.radius < goalTop) {
                    this.y = goalTop + this.radius;
                    this.vy *= -0.7;
                }
                if (this.y + this.radius > goalBottom) {
                    this.y = goalBottom - this.radius;
                    this.vy *= -0.7;
                }
            } else {
                // Εκτός τέρματος - bounce
                this.x = CONFIG.SIDE_MARGIN + this.radius;
                this.vx *= -0.7;
            }
        }
        
        // ΔΕΞΙ ΤΕΡΜΑ (Bot goal)
        if (this.x + this.radius > CONFIG.CANVAS_WIDTH - CONFIG.SIDE_MARGIN) {
            if (this.y > goalTop && this.y < goalBottom) {
                // Μέσα στο τέρμα
                if (!this.inGoal) {
                    this.inGoal = true;
                    this.goalTime = Date.now();
                    this.goalType = this.firstShotAfterReset ? 'foul_bot_goal' : 'bot_goal';
                }
                
                // Πίσω γραμμή τέρματος
                const backLine = CONFIG.CANVAS_WIDTH - CONFIG.SIDE_MARGIN + CONFIG.GOAL_DEPTH;
                if (this.x + this.radius >= backLine) {
                    this.x = backLine - this.radius;
                    this.vx = 0;
                    this.vy = 0;
                }
                
                // Δοκάρια
                if (this.y - this.radius < goalTop) {
                    this.y = goalTop + this.radius;
                    this.vy *= -0.7;
                }
                if (this.y + this.radius > goalBottom) {
                    this.y = goalBottom - this.radius;
                    this.vy *= -0.7;
                }
            } else {
                // Εκτός τέρματος - bounce
                this.x = CONFIG.CANVAS_WIDTH - CONFIG.SIDE_MARGIN - this.radius;
                this.vx *= -0.7;
            }
        }
        
        // ΠΑΝΩ-ΚΑΤΩ ΟΡΙΑ
        if (this.y - this.radius < CONFIG.TOP_MARGIN) {
            this.y = CONFIG.TOP_MARGIN + this.radius;
            this.vy *= -0.7;
        }
        if (this.y + this.radius > CONFIG.CANVAS_HEIGHT - CONFIG.BOTTOM_MARGIN) {
            this.y = CONFIG.CANVAS_HEIGHT - CONFIG.BOTTOM_MARGIN - this.radius;
            this.vy *= -0.7;
        }
    }
    
    /**
     * Σύγκρουση με παίκτη (impulse-based collision)
     */
    collide(player) {
        const dx = this.x - player.x;
        const dy = this.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDistance = this.radius + player.radius;
        
        if (dist < minDistance && dist > 0) {
            // Normalize direction
            const nx = dx / dist;
            const ny = dy / dist;
            
            // Separate objects (αποφυγή overlap)
            const overlap = minDistance - dist;
            const separationX = nx * (overlap / 2 + 1);
            const separationY = ny * (overlap / 2 + 1);
            
            this.x += separationX;
            this.y += separationY;
            player.x -= separationX * 0.5;
            player.y -= separationY * 0.5;
            
            // Relative velocity
            const dvx = this.vx - player.vx;
            const dvy = this.vy - player.vy;
            const dotProduct = dvx * nx + dvy * ny;
            
            // Αν απομακρύνονται, skip collision
            if (dotProduct > 0) return;
            
            // Impulse calculation
            const impulse = -(1 + CONFIG.RESTITUTION) * dotProduct / 2;
            
            this.vx += impulse * nx;
            this.vy += impulse * ny;
            player.vx -= impulse * nx * 0.8;
            player.vy -= impulse * ny * 0.8;
            
            // Set moving flags
            this.moving = true;
            if (Math.abs(player.vx) > 0.5 || Math.abs(player.vy) > 0.5) {
                player.moving = true;
            }
            
            // Clear foul flag (μετά το πρώτο χτύπημα)
            this.firstShotAfterReset = false;
        }
    }
    
    /**
     * Draw ball
     */
    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.black;
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius - 3, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.white;
        ctx.fill();
    }
}

// ============================================
// 4. PLAYER CLASS
// ============================================

class Player {
    constructor(x, y, isBot = false) {
        this.x = x;
        this.y = y;
        this.startX = x;  // Αρχική θέση για reset
        this.startY = y;
        this.radius = CONFIG.PLAYER_RADIUS;
        this.isBot = isBot;
        this.selected = false;
        this.vx = 0;
        this.vy = 0;
        this.friction = CONFIG.PLAYER_FRICTION;
        this.moving = false;
        
        // Collision cooldown tracking
        this.collisionCooldown = {};
        this.ballCollisionTime = 0;
        
        // Relocation animation
        this.isRelocating = false;
        this.relocateTarget = null;
        this.relocateStartTime = 0;
        this.relocateStartPos = null;
    }
    
    /**
     * Update player position
     */
    update() {
        // Relocation animation (όταν βγαίνει από τέρμα)
        if (this.isRelocating) {
            const elapsed = Date.now() - this.relocateStartTime;
            const progress = Math.min(elapsed / CONFIG.RELOCATION_DURATION, 1);
            
            // Smooth easing (ease-in-out)
            const eased = progress < 0.5 
                ? 2 * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            
            // Interpolate position
            this.x = this.relocateStartPos.x + (this.relocateTarget.x - this.relocateStartPos.x) * eased;
            this.y = this.relocateStartPos.y + (this.relocateTarget.y - this.relocateStartPos.y) * eased;
            
            if (progress >= 1) {
                this.x = this.relocateTarget.x;
                this.y = this.relocateTarget.y;
                this.isRelocating = false;
                this.relocateTarget = null;
            }
            
            return; // Skip normal movement κατά τη διάρκεια animation
        }
        
        if (this.moving) {
            this.x += this.vx;
            this.y += this.vy;
            
            // Exponential decay
            const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            
            if (speed > 0.5) {
                const decayFactor = Math.pow(this.friction, 1.15);
                this.vx *= decayFactor;
                this.vy *= decayFactor;
            } else {
                this.vx = 0;
                this.vy = 0;
                this.moving = false;
            }
            
            this.checkBoundaries();
        }
    }
    
    /**
     * Έλεγχος ορίων - επιτρέπει είσοδο στα τέρματα
     */
    checkBoundaries() {
        const centerY = (CONFIG.TOP_MARGIN + (CONFIG.CANVAS_HEIGHT - CONFIG.BOTTOM_MARGIN)) / 2;
        const goalHeight = CONFIG.GOAL_HEIGHT;
        const goalTop = centerY - goalHeight / 2;
        const goalBottom = centerY + goalHeight / 2;
        
        // ΑΡΙΣΤΕΡΟ ΟΡΙΟ
        if (this.x - this.radius < CONFIG.SIDE_MARGIN) {
            if (this.y < goalTop || this.y > goalBottom) {
                // Εκτός τέρματος - bounce
                this.x = CONFIG.SIDE_MARGIN + this.radius;
                this.vx *= -0.5;
            } else {
                // Μέσα στο τέρμα - όριο πίσω γραμμής
                const backLine = CONFIG.SIDE_MARGIN - CONFIG.GOAL_DEPTH;
                if (this.x - this.radius < backLine) {
                    this.x = backLine + this.radius;
                    this.vx = 0;
                    this.vy *= 0.7;
                }
                // Δοκάρια
                if (this.y - this.radius < goalTop) {
                    this.y = goalTop + this.radius;
                    this.vy = 0;
                }
                if (this.y + this.radius > goalBottom) {
                    this.y = goalBottom - this.radius;
                    this.vy = 0;
                }
            }
        }
        
        // ΔΕΞΙ ΟΡΙΟ
        if (this.x + this.radius > CONFIG.CANVAS_WIDTH - CONFIG.SIDE_MARGIN) {
            if (this.y < goalTop || this.y > goalBottom) {
                this.x = CONFIG.CANVAS_WIDTH - CONFIG.SIDE_MARGIN - this.radius;
                this.vx *= -0.5;
            } else {
                const backLine = CONFIG.CANVAS_WIDTH - CONFIG.SIDE_MARGIN + CONFIG.GOAL_DEPTH;
                if (this.x + this.radius > backLine) {
                    this.x = backLine - this.radius;
                    this.vx = 0;
                    this.vy *= 0.7;
                }
                if (this.y - this.radius < goalTop) {
                    this.y = goalTop + this.radius;
                    this.vy = 0;
                }
                if (this.y + this.radius > goalBottom) {
                    this.y = goalBottom - this.radius;
                    this.vy = 0;
                }
            }
        }
        
        // ΠΑΝΩ-ΚΑΤΩ ΟΡΙΑ
        if (this.y - this.radius < CONFIG.TOP_MARGIN) {
            this.y = CONFIG.TOP_MARGIN + this.radius;
            this.vy *= -0.5;
        }
        if (this.y + this.radius > CONFIG.CANVAS_HEIGHT - CONFIG.BOTTOM_MARGIN) {
            this.y = CONFIG.CANVAS_HEIGHT - CONFIG.BOTTOM_MARGIN - this.radius;
            this.vy *= -0.5;
        }
    }
    
    /**
     * Σύγκρουση player-player
     */
    collideWithPlayer(otherPlayer) {
        // Cooldown check
        const now = Date.now();
        if (this.collisionCooldown[otherPlayer] && 
            now - this.collisionCooldown[otherPlayer] < CONFIG.COLLISION_COOLDOWN) {
            return;
        }
        
        const dx = otherPlayer.x - this.x;
        const dy = otherPlayer.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDistance = this.radius + otherPlayer.radius;
        
        if (dist < minDistance && dist > 0) {
            // Normalize
            const nx = dx / dist;
            const ny = dy / dist;
            
            // Separate
            const overlap = minDistance - dist;
            const separationX = nx * (overlap / 2 + 2);
            const separationY = ny * (overlap / 2 + 2);
            
            this.x -= separationX;
            this.y -= separationY;
            otherPlayer.x += separationX;
            otherPlayer.y += separationY;
            
            // Impulse
            const dvx = otherPlayer.vx - this.vx;
            const dvy = otherPlayer.vy - this.vy;
            const dotProduct = dvx * nx + dvy * ny;
            
            if (dotProduct < 0) return;
            
            const impulse = -(1 + 0.7) * dotProduct / 2;
            const impulseX = impulse * nx;
            const impulseY = impulse * ny;
            
            this.vx -= impulseX;
            this.vy -= impulseY;
            otherPlayer.vx += impulseX;
            otherPlayer.vy += impulseY;
            
            // Update moving flags
            if (Math.abs(this.vx) > 0.5 || Math.abs(this.vy) > 0.5) {
                this.moving = true;
            }
            if (Math.abs(otherPlayer.vx) > 0.5 || Math.abs(otherPlayer.vy) > 0.5) {
                otherPlayer.moving = true;
            }
            
            // Set cooldown
            this.collisionCooldown[otherPlayer] = now;
        }
    }
    
    /**
     * Shoot (slingshot mechanics)
     */
    shoot(dragX, dragY) {
        const dragDistance = Math.sqrt(dragX * dragX + dragY * dragY);
        
        // Περιορισμός απόστασης
        let limitedDragX = dragX;
        let limitedDragY = dragY;
        
        if (dragDistance > CONFIG.MAX_DRAG_DISTANCE) {
            const ratio = CONFIG.MAX_DRAG_DISTANCE / dragDistance;
            limitedDragX = dragX * ratio;
            limitedDragY = dragY * ratio;
        }
        
        // Αντίστροφη κατεύθυνση (slingshot effect)
        this.vx = -limitedDragX * (CONFIG.MAX_SPEED / CONFIG.MAX_DRAG_DISTANCE);
        this.vy = -limitedDragY * (CONFIG.MAX_SPEED / CONFIG.MAX_DRAG_DISTANCE);
        
        this.moving = true;
    }
    
    /**
     * Check if player is clicked
     */
    isClicked(x, y) {
        return distance(x, y, this.x, this.y) < this.radius;
    }
    
    /**
     * Draw player (με duck sprites)
     */
    draw(ctx, images) {
        // Selection ring
        if (this.selected) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 8, 0, Math.PI * 2);
            ctx.strokeStyle = '#FFD700'; // Χρυσό
            ctx.lineWidth = 5;
            ctx.stroke();
        }
        
        // Duck image (ανάποδα χρώματα: bot=red duck, player=blue duck)
        const image = this.isBot ? images.duckRed : images.duckBlue;
        const size = this.radius * 2;
        
        // Fallback αν η εικόνα δεν έχει φορτώσει
        if (image.complete && image.naturalWidth > 0) {
            ctx.drawImage(image, this.x - this.radius, this.y - this.radius, size, size);
        } else {
            // Draw colored circle
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.isBot ? COLORS.postRed : COLORS.postBlue;
            ctx.fill();
            ctx.strokeStyle = COLORS.white;
            ctx.lineWidth = 3;
            ctx.stroke();
        }
    }
}

// Συνεχίζεται στο επόμενο μέρος...

// ============================================
// 5. GAME CLASS - Κύρια λογική παιχνιδιού
// ============================================

class Game {
    constructor(canvas, ctx, images) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.images = images;
        
        // Game objects
        this.ball = new Ball();
        this.playerTeam = [];
        this.botTeam = [];
        this.goalPosts = [];
        
        // Game state
        this.currentTurn = 'player';
        this.turnComplete = true;
        this.playerScore = 0;
        this.botScore = 0;
        
        // Input handling
        this.selectedPlayer = null;
        this.dragStart = null;
        this.currentDrag = null;
        
        // Bot AI
        this.botThinkingTime = null;
        
        // Initialize
        this.initializeTeams();
        this.initializeGoalPosts();
        this.setupEvents();
        this.storeInitialPositions();
    }
    
    /**
     * Δημιουργία ομάδων παικτών
     */
    initializeTeams() {
        const centerY = (CONFIG.TOP_MARGIN + (CONFIG.CANVAS_HEIGHT - CONFIG.BOTTOM_MARGIN)) / 2;
        
        // Player team (red) - Δεξιά
        const playerX = CONFIG.CANVAS_WIDTH - CONFIG.SIDE_MARGIN - 200;
        this.playerTeam = [
            new Player(playerX, centerY - 180, false),      // Πάνω
            new Player(playerX - 150, centerY - 90, false), // Μεσαίος
            new Player(playerX - 100, centerY, false),      // Κέντρο
            new Player(playerX - 150, centerY + 90, false), // Μεσαίος
            new Player(playerX, centerY + 180, false),      // Κάτω
        ];
        
        // Bot team (blue) - Αριστερά
        const botX = CONFIG.SIDE_MARGIN + 200;
        this.botTeam = [
            new Player(botX, centerY - 180, true),
            new Player(botX + 150, centerY - 90, true),
            new Player(botX + 100, centerY, true),
            new Player(botX + 150, centerY + 90, true),
            new Player(botX, centerY + 180, true),
        ];
    }
    
    /**
     * Δημιουργία δοκαριών
     */
    initializeGoalPosts() {
        const centerY = (CONFIG.TOP_MARGIN + (CONFIG.CANVAS_HEIGHT - CONFIG.BOTTOM_MARGIN)) / 2;
        
        this.goalPosts = [
            // Αριστερό τέρμα (μπλε)
            { x: CONFIG.SIDE_MARGIN, y: centerY - 90, radius: CONFIG.GOAL_POST_RADIUS, color: COLORS.postBlue },
            { x: CONFIG.SIDE_MARGIN, y: centerY + 90, radius: CONFIG.GOAL_POST_RADIUS, color: COLORS.postBlue },
            // Δεξί τέρμα (κόκκινο)
            { x: CONFIG.CANVAS_WIDTH - CONFIG.SIDE_MARGIN, y: centerY - 90, radius: CONFIG.GOAL_POST_RADIUS, color: COLORS.postRed },
            { x: CONFIG.CANVAS_WIDTH - CONFIG.SIDE_MARGIN, y: centerY + 90, radius: CONFIG.GOAL_POST_RADIUS, color: COLORS.postRed },
        ];
    }
    
    /**
     * Αποθήκευση αρχικών θέσεων για reset
     */
    storeInitialPositions() {
        this.initialPositions = {
            player: this.playerTeam.map(p => ({ x: p.x, y: p.y })),
            bot: this.botTeam.map(p => ({ x: p.x, y: p.y }))
        };
    }
    
    /**
     * Setup event listeners
     */
    setupEvents() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        
        // Touch events για mobile
        this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
    }
    
    // ========================================
    // INPUT HANDLING
    // ========================================
    
    onMouseDown(e) {
        if (this.currentTurn !== 'player' || !this.turnComplete) return;
        
        const pos = getCanvasCoordinates(this.canvas, e);
        
        // Check if clicked on player
        for (let player of this.playerTeam) {
            if (player.isClicked(pos.x, pos.y)) {
                this.selectedPlayer = player;
                player.selected = true;
                this.dragStart = { x: player.x, y: player.y };
                console.log('Selected player at:', player.x, player.y);
                break;
            }
        }
    }
    
    onMouseMove(e) {
        if (this.selectedPlayer && this.dragStart) {
            const pos = getCanvasCoordinates(this.canvas, e);
            this.currentDrag = pos;
        }
    }
    
    onMouseUp(e) {
        if (!this.selectedPlayer || !this.dragStart) return;
        
        // Get final drag position
        let pos;
        if (e && e.clientX !== undefined && e.clientY !== undefined) {
            pos = getCanvasCoordinates(this.canvas, e);
        } else if (this.currentDrag) {
            pos = this.currentDrag;
        } else {
            pos = this.dragStart;
        }
        
        const dragX = pos.x - this.dragStart.x;
        const dragY = pos.y - this.dragStart.y;
        const dragDistance = Math.sqrt(dragX * dragX + dragY * dragY);
        
        console.log('Drag distance:', dragDistance);
        
        // Minimum drag threshold (αποφυγή accidental taps)
        if (dragDistance < 5) {
            console.log('Drag too small, canceling');
            this.selectedPlayer.selected = false;
            this.selectedPlayer = null;
            this.dragStart = null;
            this.currentDrag = null;
            return;
        }
        
        // Shoot!
        this.selectedPlayer.shoot(dragX, dragY);
        
        // Start turn
        this.turnComplete = false;
        
        // Cleanup
        this.selectedPlayer.selected = false;
        this.selectedPlayer = null;
        this.dragStart = null;
        this.currentDrag = null;
    }
    
    onTouchStart(e) {
        e.preventDefault();
        e.stopPropagation();
        const touch = e.touches[0];
        this.onMouseDown(touchToMouseEvent(touch));
    }
    
    onTouchMove(e) {
        e.preventDefault();
        e.stopPropagation();
        const touch = e.touches[0];
        this.onMouseMove(touchToMouseEvent(touch));
    }
    
    onTouchEnd(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (e.changedTouches && e.changedTouches.length > 0) {
            const touch = e.changedTouches[0];
            this.onMouseUp(touchToMouseEvent(touch));
        } else {
            this.onMouseUp({});
        }
    }
    
    // ========================================
    // GAME LOGIC
    // ========================================
    
    /**
     * Main update loop
     */
    update() {
        // Update ball
        const goalResult = this.ball.update();
        
        // Handle goal
        if (goalResult) {
            this.handleGoal(goalResult);
            return;
        }
        
        // Update players
        [...this.playerTeam, ...this.botTeam].forEach(player => player.update());
        
        // Check collisions
        this.checkCollisions();
        
        // Check if turn is complete
        if (!this.turnComplete && this.isEverythingStopped()) {
            this.completeTurn();
        }
        
        // Bot AI
        if (this.currentTurn === 'bot' && this.turnComplete) {
            this.botMove();
        }
    }
    
    /**
     * Check all collisions
     */
    checkCollisions() {
        const allPlayers = [...this.playerTeam, ...this.botTeam];
        
        // Ball vs Players
        allPlayers.forEach(player => {
            this.ball.collide(player);
        });
        
        // Ball vs Goal Posts
        this.goalPosts.forEach(post => {
            this.checkBallGoalPostCollision(post);
        });
        
        // Players vs Goal Posts
        allPlayers.forEach(player => {
            this.goalPosts.forEach(post => {
                this.checkPlayerGoalPostCollision(player, post);
            });
        });
        
        // Player vs Player
        for (let i = 0; i < allPlayers.length; i++) {
            for (let j = i + 1; j < allPlayers.length; j++) {
                allPlayers[i].collideWithPlayer(allPlayers[j]);
            }
        }
    }
    
    /**
     * Ball collision με δοκάρι
     */
    checkBallGoalPostCollision(post) {
        const dx = this.ball.x - post.x;
        const dy = this.ball.y - post.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDistance = this.ball.radius + post.radius;
        
        if (dist < minDistance && dist > 0) {
            // Normalize
            const angle = Math.atan2(dy, dx);
            
            // Separate
            const overlap = minDistance - dist;
            this.ball.x += Math.cos(angle) * (overlap + 2);
            this.ball.y += Math.sin(angle) * (overlap + 2);
            
            // Bounce (elastic collision)
            const relVelocity = this.ball.vx * Math.cos(angle) + this.ball.vy * Math.sin(angle);
            if (relVelocity < 0) {
                this.ball.vx -= 1.5 * relVelocity * Math.cos(angle);
                this.ball.vy -= 1.5 * relVelocity * Math.sin(angle);
            }
            
            this.ball.firstShotAfterReset = false;
        }
    }
    
    /**
     * Player collision με δοκάρι
     */
    checkPlayerGoalPostCollision(player, post) {
        const dx = player.x - post.x;
        const dy = player.y - post.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDistance = player.radius + post.radius;
        
        if (dist < minDistance && dist > 0) {
            const angle = Math.atan2(dy, dx);
            const overlap = minDistance - dist;
            
            player.x += Math.cos(angle) * (overlap + 2);
            player.y += Math.sin(angle) * (overlap + 2);
            
            const relVelocity = player.vx * Math.cos(angle) + player.vy * Math.sin(angle);
            if (relVelocity < 0) {
                player.vx -= 1.5 * relVelocity * Math.cos(angle);
                player.vy -= 1.5 * relVelocity * Math.sin(angle);
            }
        }
    }
    
    /**
     * Check if everything has stopped
     */
    isEverythingStopped() {
        if (this.ball.moving) return false;
        
        const allPlayers = [...this.playerTeam, ...this.botTeam];
        for (let player of allPlayers) {
            if (player.moving || player.isRelocating) return false;
        }
        
        return true;
    }
    
    /**
     * Complete turn - switch sides
     */
    completeTurn() {
        this.turnComplete = true;
        
        // Check and relocate players in goals
        this.checkPlayersInGoal();
        
        // Switch turn
        this.currentTurn = this.currentTurn === 'player' ? 'bot' : 'player';
    }
    
    /**
     * Check if players are too far inside goals
     */
    checkPlayersInGoal() {
        const centerY = (CONFIG.TOP_MARGIN + (CONFIG.CANVAS_HEIGHT - CONFIG.BOTTOM_MARGIN)) / 2;
        const goalTop = centerY - CONFIG.GOAL_HEIGHT / 2;
        const goalBottom = centerY + CONFIG.GOAL_HEIGHT / 2;
        const penaltyBoxHeight = 240;
        
        const allPlayers = [...this.playerTeam, ...this.botTeam];
        
        allPlayers.forEach(player => {
            if (player.isRelocating) return;
            
            let insidePercentage = 0;
            let targetX, targetY;
            
            // Check left goal
            if (player.x < CONFIG.SIDE_MARGIN && player.y > goalTop && player.y < goalBottom) {
                const distanceInside = CONFIG.SIDE_MARGIN - player.x;
                insidePercentage = (distanceInside / player.radius) * 100;
                
                if (insidePercentage > 70) {
                    const penaltyBoxWidth = 150;
                    targetX = CONFIG.SIDE_MARGIN + penaltyBoxWidth;
                    targetY = centerY - penaltyBoxHeight / 2 + Math.random() * penaltyBoxHeight;
                }
            }
            
            // Check right goal
            if (player.x > CONFIG.CANVAS_WIDTH - CONFIG.SIDE_MARGIN && player.y > goalTop && player.y < goalBottom) {
                const distanceInside = player.x - (CONFIG.CANVAS_WIDTH - CONFIG.SIDE_MARGIN);
                insidePercentage = (distanceInside / player.radius) * 100;
                
                if (insidePercentage > 70) {
                    const penaltyBoxWidth = 150;
                    targetX = CONFIG.CANVAS_WIDTH - CONFIG.SIDE_MARGIN - penaltyBoxWidth;
                    targetY = centerY - penaltyBoxHeight / 2 + Math.random() * penaltyBoxHeight;
                }
            }
            
            // Start relocation animation
            if (insidePercentage > 70) {
                player.isRelocating = true;
                player.relocateTarget = { x: targetX, y: targetY };
                player.relocateStartTime = Date.now();
                player.relocateStartPos = { x: player.x, y: player.y };
                player.vx = 0;
                player.vy = 0;
                player.moving = false;
            }
        });
    }
    
    /**
     * Handle goal scoring
     */
    handleGoal(goalType) {
        if (goalType === 'player_goal') {
            this.playerScore++;
        } else if (goalType === 'bot_goal') {
            this.botScore++;
        }
        
        // Reset positions
        this.resetPositions();
        this.currentTurn = 'player';
        this.turnComplete = true;
    }
    
    /**
     * Reset all positions
     */
    resetPositions() {
        // Reset players
        this.playerTeam.forEach((player, i) => {
            player.x = this.initialPositions.player[i].x;
            player.y = this.initialPositions.player[i].y;
            player.vx = 0;
            player.vy = 0;
            player.moving = false;
            player.isRelocating = false;
        });
        
        this.botTeam.forEach((player, i) => {
            player.x = this.initialPositions.bot[i].x;
            player.y = this.initialPositions.bot[i].y;
            player.vx = 0;
            player.vy = 0;
            player.moving = false;
            player.isRelocating = false;
        });
        
        // Reset ball
        this.ball.reset();
    }
    
    /**
     * Bot AI - Simple but effective
     */
    botMove() {
        if (!this.botThinkingTime) {
            this.botThinkingTime = Date.now();
        }
        
        // "Thinking" delay
        if (Date.now() - this.botThinkingTime < 1000) return;
        
        this.botThinkingTime = null;
        
        // Target: Player goal (αριστερά)
        const goalX = CONFIG.SIDE_MARGIN - 30;
        const centerY = (CONFIG.TOP_MARGIN + (CONFIG.CANVAS_HEIGHT - CONFIG.BOTTOM_MARGIN)) / 2;
        
        // Find best bot player (closest to ball)
        let bestBot = null;
        let minDist = Infinity;
        
        this.botTeam.forEach(bot => {
            const dist = distance(bot.x, bot.y, this.ball.x, this.ball.y);
            if (dist < minDist) {
                minDist = dist;
                bestBot = bot;
            }
        });
        
        if (!bestBot) return;
        
        // Calculate shot direction
        const targetX = goalX;
        const targetY = centerY + (Math.random() - 0.5) * 100; // Random variation
        
        // Direction from ball to goal
        const dx = targetX - this.ball.x;
        const dy = targetY - this.ball.y;
        
        // Direction from bot to ball
        const toBallX = this.ball.x - bestBot.x;
        const toBallY = this.ball.y - bestBot.y;
        const toBallDist = Math.sqrt(toBallX * toBallX + toBallY * toBallY);
        
        // Drag (opposite direction for slingshot)
        const dragX = -toBallX / toBallDist * 150; // 150 = drag distance
        const dragY = -toBallY / toBallDist * 150;
        
        // Add human-like error (12%)
        const errorAngle = (Math.random() - 0.5) * 0.2; // ±10 degrees
        const errorPower = 0.88 + Math.random() * 0.24; // ±12% power
        
        const finalDragX = (dragX * Math.cos(errorAngle) - dragY * Math.sin(errorAngle)) * errorPower;
        const finalDragY = (dragX * Math.sin(errorAngle) + dragY * Math.cos(errorAngle)) * errorPower;
        
        // Shoot!
        bestBot.shoot(finalDragX, finalDragY);
        this.turnComplete = false;
    }
    
    // ========================================
    // RENDERING
    // ========================================
    
    /**
     * Main draw method
     */
    draw() {
        // Clear canvas
        this.ctx.fillStyle = COLORS.orange;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw scoreboard
        this.drawScoreboard();
        
        // Draw field
        this.drawField();
        
        // Draw slingshot line
        if (this.selectedPlayer && this.dragStart && this.currentDrag) {
            this.drawSlingshotLine();
        }
        
        // Draw players
        this.botTeam.forEach(p => p.draw(this.ctx, this.images));
        this.playerTeam.forEach(p => p.draw(this.ctx, this.images));
        
        // Draw ball
        this.ball.draw(this.ctx);
        
        // Draw goal posts (on top)
        this.drawGoalPosts();
        
        // Draw goal message
        if (this.ball.inGoal && Date.now() - this.ball.goalTime >= CONFIG.GOAL_DELAY) {
            this.drawGoalMessage();
        }
    }
    
    /**
     * Draw soccer field
     */
    drawField() {
        const ctx = this.ctx;
        const centerY = (CONFIG.TOP_MARGIN + (CONFIG.CANVAS_HEIGHT - CONFIG.BOTTOM_MARGIN)) / 2;
        const cornerRadius = 30;
        const borderWidth = 45;
        
        // Gray border
        ctx.fillStyle = COLORS.fieldBorder;
        ctx.beginPath();
        ctx.roundRect(
            CONFIG.SIDE_MARGIN - borderWidth,
            CONFIG.TOP_MARGIN - borderWidth,
            CONFIG.CANVAS_WIDTH - (CONFIG.SIDE_MARGIN * 2) + (borderWidth * 2),
            CONFIG.CANVAS_HEIGHT - CONFIG.TOP_MARGIN - CONFIG.BOTTOM_MARGIN + (borderWidth * 2),
            cornerRadius + 5
        );
        ctx.fill();
        
        // Green field
        ctx.fillStyle = COLORS.green;
        ctx.beginPath();
        ctx.roundRect(
            CONFIG.SIDE_MARGIN,
            CONFIG.TOP_MARGIN,
            CONFIG.CANVAS_WIDTH - (CONFIG.SIDE_MARGIN * 2),
            CONFIG.CANVAS_HEIGHT - CONFIG.TOP_MARGIN - CONFIG.BOTTOM_MARGIN,
            cornerRadius
        );
        ctx.fill();
        
        // White outline
        ctx.strokeStyle = COLORS.white;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.roundRect(
            CONFIG.SIDE_MARGIN,
            CONFIG.TOP_MARGIN,
            CONFIG.CANVAS_WIDTH - (CONFIG.SIDE_MARGIN * 2),
            CONFIG.CANVAS_HEIGHT - CONFIG.TOP_MARGIN - CONFIG.BOTTOM_MARGIN,
            cornerRadius
        );
        ctx.stroke();
        
        // Center line
        ctx.beginPath();
        ctx.moveTo(CONFIG.CANVAS_WIDTH / 2, CONFIG.TOP_MARGIN);
        ctx.lineTo(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT - CONFIG.BOTTOM_MARGIN);
        ctx.stroke();
        
        // Center circle
        ctx.beginPath();
        ctx.arc(CONFIG.CANVAS_WIDTH / 2, centerY, 105, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(CONFIG.CANVAS_WIDTH / 2, centerY, 8, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.black;
        ctx.fill();
        
        // Penalty areas
        ctx.strokeRect(CONFIG.SIDE_MARGIN, centerY - 195, 150, 390);
        ctx.strokeRect(CONFIG.SIDE_MARGIN, centerY - 120, 75, 240);
        ctx.strokeRect(CONFIG.CANVAS_WIDTH - CONFIG.SIDE_MARGIN - 150, centerY - 195, 150, 390);
        ctx.strokeRect(CONFIG.CANVAS_WIDTH - CONFIG.SIDE_MARGIN - 75, centerY - 120, 75, 240);
        
        // Penalty arcs
        ctx.beginPath();
        ctx.arc(CONFIG.SIDE_MARGIN + 150, centerY, 60, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(CONFIG.CANVAS_WIDTH - CONFIG.SIDE_MARGIN - 150, centerY, 60, Math.PI / 2, Math.PI * 1.5);
        ctx.stroke();
        
        // Corner arcs
        const cornerRadius2 = 40;
        ctx.beginPath();
        ctx.arc(CONFIG.SIDE_MARGIN, CONFIG.TOP_MARGIN, cornerRadius2, 0, Math.PI / 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(CONFIG.CANVAS_WIDTH - CONFIG.SIDE_MARGIN, CONFIG.TOP_MARGIN, cornerRadius2, Math.PI / 2, Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(CONFIG.SIDE_MARGIN, CONFIG.CANVAS_HEIGHT - CONFIG.BOTTOM_MARGIN, cornerRadius2, Math.PI * 1.5, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(CONFIG.CANVAS_WIDTH - CONFIG.SIDE_MARGIN, CONFIG.CANVAS_HEIGHT - CONFIG.BOTTOM_MARGIN, cornerRadius2, Math.PI, Math.PI * 1.5);
        ctx.stroke();
        
        // Goals
        ctx.fillStyle = COLORS.white;
        ctx.fillRect(CONFIG.SIDE_MARGIN - 55, centerY - 90, 55, 180);
        ctx.strokeStyle = COLORS.white;
        ctx.lineWidth = 6;
        ctx.strokeRect(CONFIG.SIDE_MARGIN - 55, centerY - 90, 55, 180);
        
        ctx.fillStyle = COLORS.white;
        ctx.fillRect(CONFIG.CANVAS_WIDTH - CONFIG.SIDE_MARGIN, centerY - 90, 55, 180);
        ctx.strokeRect(CONFIG.CANVAS_WIDTH - CONFIG.SIDE_MARGIN, centerY - 90, 55, 180);
        
        // Goal nets
        this.drawGoalNet(CONFIG.SIDE_MARGIN - 55, centerY - 90, 55, 180);
        this.drawGoalNet(CONFIG.CANVAS_WIDTH - CONFIG.SIDE_MARGIN, centerY - 90, 55, 180);
    }
    
    /**
     * Draw goal net pattern
     */
    drawGoalNet(x, y, width, height) {
        const ctx = this.ctx;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.5;
        
        const gridSize = 15;
        
        // Vertical lines
        for (let i = gridSize; i < width; i += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x + i, y);
            ctx.lineTo(x + i, y + height);
            ctx.stroke();
        }
        
        // Horizontal lines
        for (let j = gridSize; j < height; j += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, y + j);
            ctx.lineTo(x + width, y + j);
            ctx.stroke();
        }
        
        // Diagonal lines for realism
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < width; i += gridSize) {
            for (let j = 0; j < height; j += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x + i, y + j);
                ctx.lineTo(x + i + gridSize, y + j + gridSize);
                ctx.stroke();
            }
        }
    }
    
    /**
     * Draw goal posts (δοκάρια)
     */
    drawGoalPosts() {
        this.goalPosts.forEach(post => {
            this.ctx.beginPath();
            this.ctx.arc(post.x, post.y, post.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = post.color;
            this.ctx.fill();
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        });
    }
    
    /**
     * Draw scoreboard
     */
    drawScoreboard() {
        const ctx = this.ctx;
        const width = 400;
        const height = 100;
        const x = CONFIG.CANVAS_WIDTH / 2 - width / 2;
        const y = 20;
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, 15);
        ctx.fill();
        
        // Outline
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Scores
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        
        // Player score (left, blue)
        ctx.fillStyle = COLORS.postBlue;
        ctx.fillText(this.playerScore, x + 70, y + 65);
        
        // Divider
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = 'bold 40px Arial';
        ctx.fillText(':', CONFIG.CANVAS_WIDTH / 2, y + 63);
        
        // Bot score (right, red)
        ctx.fillStyle = COLORS.postRed;
        ctx.font = 'bold 48px Arial';
        ctx.fillText(this.botScore, x + width - 70, y + 65);
        
        ctx.textAlign = 'left';
    }
    
    /**
     * Draw slingshot aiming line
     */
    drawSlingshotLine() {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.moveTo(this.dragStart.x, this.dragStart.y);
        ctx.lineTo(this.currentDrag.x, this.currentDrag.y);
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
        ctx.lineWidth = 4;
        ctx.setLineDash([10, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw power indicator
        const dragX = this.currentDrag.x - this.dragStart.x;
        const dragY = this.currentDrag.y - this.dragStart.y;
        const dragDist = Math.sqrt(dragX * dragX + dragY * dragY);
        const power = Math.min(dragDist / CONFIG.MAX_DRAG_DISTANCE, 1);
        
        ctx.font = 'bold 20px Arial';
        ctx.fillStyle = COLORS.white;
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(power * 100)}%`, this.currentDrag.x, this.currentDrag.y - 20);
        ctx.textAlign = 'left';
    }
    
    /**
     * Draw goal message
     */
    drawGoalMessage() {
        const ctx = this.ctx;
        
        let message = '';
        let color = '';
        
        if (this.ball.goalType === 'player_goal') {
            message = 'ΓΚΟΛ!';
            color = COLORS.postBlue;
        } else if (this.ball.goalType === 'bot_goal') {
            message = 'ΓΚΟΛ BOT!';
            color = COLORS.postRed;
        } else if (this.ball.goalType === 'foul_player_goal' || this.ball.goalType === 'foul_bot_goal') {
            message = 'ΦΑΟΥΛ!';
            color = COLORS.red;
        }
        
        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        
        // Message
        ctx.font = 'bold 120px Arial';
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.fillText(message, CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2);
        ctx.textAlign = 'left';
    }
}

// ============================================
// 6. INITIALIZATION & GAME LOOP
// ============================================

/**
 * Main initialization function
 */
function initGame() {
    console.log('Initializing Duck Strike...');
    
    // Get canvas and context
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    if (!canvas || !ctx) {
        console.error('Failed to get canvas or context');
        return;
    }
    
    console.log('Canvas initialized:', canvas.width, 'x', canvas.height);
    
    // Load images
    const images = {
        duckRed: new Image(),
        duckBlue: new Image()
    };
    
    images.duckRed.src = './assets/duck_red.png';
    images.duckBlue.src = './assets/duck_blue.png';
    
    let imagesLoaded = 0;
    const totalImages = 2;
    
    /**
     * Start game when images are loaded
     */
    function startGame() {
        console.log('All images loaded, starting game...');
        
        // Create game instance
        const game = new Game(canvas, ctx, images);
        
        // Setup fullscreen
        setupFullscreen(canvas);
        
        // Game loop με requestAnimationFrame
        function gameLoop() {
            game.update();
            game.draw();
            requestAnimationFrame(gameLoop);
        }
        
        // Start loop
        requestAnimationFrame(gameLoop);
        
        console.log('Game started!');
    }
    
    // Image loading handlers
    images.duckRed.onload = () => {
        imagesLoaded++;
        console.log('Duck Red loaded');
        if (imagesLoaded === totalImages) startGame();
    };
    
    images.duckBlue.onload = () => {
        imagesLoaded++;
        console.log('Duck Blue loaded');
        if (imagesLoaded === totalImages) startGame();
    };
    
    images.duckRed.onerror = () => {
        console.error('Failed to load duck_red.png');
    };
    
    images.duckBlue.onerror = () => {
        console.error('Failed to load duck_blue.png');
    };
}

/**
 * Setup fullscreen functionality
 */
function setupFullscreen(canvas) {
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (!fullscreenBtn) return;
    
    function toggleFullscreen() {
        const elem = document.documentElement;
        
        if (!document.fullscreenElement && 
            !document.webkitFullscreenElement && 
            !document.mozFullScreenElement) {
            // Enter fullscreen
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen();
            } else if (elem.mozRequestFullScreen) {
                elem.mozRequestFullScreen();
            } else if (elem.msRequestFullscreen) {
                elem.msRequestFullscreen();
            }
            fullscreenBtn.textContent = '✕ Exit';
        } else {
            // Exit fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
            fullscreenBtn.textContent = '⛶ Full';
        }
    }
    
    fullscreenBtn.addEventListener('click', toggleFullscreen);
    fullscreenBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        toggleFullscreen();
    });
    
    // Update button on fullscreen change
    document.addEventListener('fullscreenchange', () => {
        fullscreenBtn.textContent = document.fullscreenElement ? '✕ Exit' : '⛶ Full';
    });
    
    document.addEventListener('webkitfullscreenchange', () => {
        fullscreenBtn.textContent = document.webkitFullscreenElement ? '✕ Exit' : '⛶ Full';
    });
    
    document.addEventListener('mozfullscreenchange', () => {
        fullscreenBtn.textContent = document.mozFullScreenElement ? '✕ Exit' : '⛶ Full';
    });
}

// ============================================
// START GAME WHEN DOM IS READY
// ============================================

// Περιμένουμε το DOM να φορτώσει πλήρως
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    // DOM ήδη loaded
    initGame();
}

