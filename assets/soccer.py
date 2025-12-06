import pygame
import sys
import math
import random

# Αρχικοποίηση Pygame
pygame.init()

# Σταθερές οθόνης
SCREEN_WIDTH = 720
SCREEN_HEIGHT = 1520
FPS = 60

# Χρώματα
GREEN = (76, 175, 80)
DARK_GREEN = (56, 142, 60)
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
RED = (244, 67, 54)
BLUE = (33, 150, 243)
LIGHT_BLUE = (100, 181, 246)
ORANGE = (255, 167, 151)
DARK_GREY = (66, 66, 66)
LIGHT_RED = (255, 138, 128)
CYAN = (0, 229, 255)

# Ρύθμιση οθόνης
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption("Soccer Pool - YOU vs BOT")
clock = pygame.time.Clock()

class Ball:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.radius = 15
        self.vx = 0
        self.vy = 0
        self.friction = 0.98
        
    def update(self):
        # Ενημέρωση θέσης
        self.x += self.vx
        self.y += self.vy
        
        # Τριβή
        self.vx *= self.friction
        self.vy *= self.friction
        
        # Σταμάτημα αν η ταχύτητα είναι πολύ μικρή
        if abs(self.vx) < 0.1:
            self.vx = 0
        if abs(self.vy) < 0.1:
            self.vy = 0
        
        # Σύνορα πλευρών
        if self.x - self.radius < 55:
            self.x = 55 + self.radius
            self.vx *= -0.8
        elif self.x + self.radius > SCREEN_WIDTH - 55:
            self.x = SCREEN_WIDTH - 55 - self.radius
            self.vx *= -0.8
            
        # Σύνορα πάνω (με έλεγχο για τέρμα)
        if self.y - self.radius < 25:
            if 190 < self.x < 530:  # Εντός τέρματος
                return "bot_goal"
            self.y = 25 + self.radius
            self.vy *= -0.8
            
        # Σύνορα κάτω (με έλεγχο για τέρμα)
        if self.y + self.radius > SCREEN_HEIGHT - 25:
            if 190 < self.x < 530:  # Εντός τέρματος
                return "player_goal"
            self.y = SCREEN_HEIGHT - 25 - self.radius
            self.vy *= -0.8
            
        return None
        
    def draw(self, surface):
        pygame.draw.circle(surface, BLACK, (int(self.x), int(self.y)), self.radius)
        pygame.draw.circle(surface, WHITE, (int(self.x), int(self.y)), self.radius - 3)
        
    def reset(self):
        self.x = SCREEN_WIDTH // 2
        self.y = SCREEN_HEIGHT // 2
        self.vx = 0
        self.vy = 0

class Player:
    def __init__(self, x, y, color, is_bot=False):
        self.x = x
        self.y = y
        self.radius = 30
        self.color = color
        self.is_bot = is_bot
        self.selected = False
        
    def draw(self, surface):
        # Σκιά/Δακτύλιος αν είναι επιλεγμένος
        if self.selected:
            pygame.draw.circle(surface, BLACK, (int(self.x), int(self.y)), self.radius + 8, 4)
            
        # Κύριος κύκλος
        pygame.draw.circle(surface, BLACK, (int(self.x), int(self.y)), self.radius + 2)
        pygame.draw.circle(surface, self.color, (int(self.x), int(self.y)), self.radius)
        
        # Αστέρι
        pygame.draw.circle(surface, CYAN if not self.is_bot else WHITE, 
                         (int(self.x), int(self.y)), self.radius - 10)
        
        # Μικρό αστέρι σχήμα
        star_points = []
        for i in range(5):
            angle = math.radians(i * 144 - 90)
            px = self.x + (self.radius - 10) * 0.6 * math.cos(angle)
            py = self.y + (self.radius - 10) * 0.6 * math.sin(angle)
            star_points.append((px, py))
        if len(star_points) >= 3:
            pygame.draw.polygon(surface, self.color, star_points)
    
    def check_collision_with_ball(self, ball):
        dx = ball.x - self.x
        dy = ball.y - self.y
        distance = math.sqrt(dx**2 + dy**2)
        
        if distance < self.radius + ball.radius:
            # Υπολογισμός κατεύθυνσης σύγκρουσης
            angle = math.atan2(dy, dx)
            
            # Απώθηση μπάλας
            force = 15
            ball.vx = math.cos(angle) * force
            ball.vy = math.sin(angle) * force
            
            # Αποφυγή επικάλυψης
            overlap = (self.radius + ball.radius) - distance
            ball.x += math.cos(angle) * overlap
            ball.y += math.sin(angle) * overlap
            
    def is_clicked(self, pos):
        dx = pos[0] - self.x
        dy = pos[1] - self.y
        return math.sqrt(dx**2 + dy**2) <= self.radius

class Game:
    def __init__(self):
        self.ball = Ball(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2)
        
        # Παίκτες (κάτω - κόκκινοι)
        self.player_team = [
            Player(200, SCREEN_HEIGHT - 200, RED),
            Player(520, SCREEN_HEIGHT - 200, RED),
            Player(280, SCREEN_HEIGHT - 350, RED),
            Player(360, SCREEN_HEIGHT - 120, RED),
            Player(440, SCREEN_HEIGHT - 350, RED),
        ]
        
        # Bot παίκτες (πάνω - μπλε)
        self.bot_team = [
            Player(280, 350, BLUE, is_bot=True),
            Player(360, 200, BLUE, is_bot=True),
            Player(440, 350, BLUE, is_bot=True),
            Player(200, 500, BLUE, is_bot=True),
            Player(520, 500, BLUE, is_bot=True),
        ]
        
        self.player_score = 0
        self.bot_score = 0
        self.selected_player = None
        self.drag_start = None
        self.font_large = pygame.font.Font(None, 72)
        self.font_medium = pygame.font.Font(None, 48)
        self.font_small = pygame.font.Font(None, 36)
        self.difficulty = "HARD"
        
    def draw_field(self):
        # Φόντο
        screen.fill(ORANGE)
        
        # Γήπεδο
        field_rect = pygame.Rect(27, 233, SCREEN_WIDTH - 54, SCREEN_HEIGHT - 466)
        pygame.draw.rect(screen, GREEN, field_rect)
        pygame.draw.rect(screen, WHITE, field_rect, 3)
        
        # Γραμμές γηπέδου
        # Μεσαία γραμμή
        pygame.draw.line(screen, WHITE, (55, SCREEN_HEIGHT // 2), 
                        (SCREEN_WIDTH - 55, SCREEN_HEIGHT // 2), 3)
        
        # Κεντρικός κύκλος
        pygame.draw.circle(screen, WHITE, (SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2), 80, 3)
        pygame.draw.circle(screen, BLACK, (SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2), 8)
        
        # Περιοχές (πάνω)
        pygame.draw.rect(screen, WHITE, (200, 233, 330, 120), 3)
        pygame.draw.rect(screen, WHITE, (250, 233, 230, 60), 3)
        
        # Περιοχές (κάτω)
        pygame.draw.rect(screen, WHITE, (200, SCREEN_HEIGHT - 353, 330, 120), 3)
        pygame.draw.rect(screen, WHITE, (250, SCREEN_HEIGHT - 293, 230, 60), 3)
        
        # Τέρμα πάνω (Bot)
        goal_top = pygame.Rect(190, 95, 340, 138)
        pygame.draw.rect(screen, CYAN, goal_top)
        # Δίχτυ τέρματος
        for i in range(0, 340, 20):
            pygame.draw.line(screen, LIGHT_BLUE, (190 + i, 95), (190 + i, 233), 2)
        for i in range(0, 138, 20):
            pygame.draw.line(screen, LIGHT_BLUE, (190, 95 + i), (530, 95 + i), 2)
        pygame.draw.rect(screen, WHITE, goal_top, 4)
        
        # Τέρμα κάτω (Player)
        goal_bottom = pygame.Rect(190, SCREEN_HEIGHT - 233, 340, 138)
        pygame.draw.rect(screen, LIGHT_RED, goal_bottom)
        # Δίχτυ τέρματος
        for i in range(0, 340, 20):
            pygame.draw.line(screen, RED, (190 + i, SCREEN_HEIGHT - 233), 
                           (190 + i, SCREEN_HEIGHT - 95), 2)
        for i in range(0, 138, 20):
            pygame.draw.line(screen, RED, (190, SCREEN_HEIGHT - 233 + i), 
                           (530, SCREEN_HEIGHT - 233 + i), 2)
        pygame.draw.rect(screen, WHITE, goal_bottom, 4)
        
    def draw_scoreboard(self):
        # Πίνακας σκορ
        board_rect = pygame.Rect(168, 95, 384, 90)
        pygame.draw.rect(screen, DARK_GREY, board_rect, border_radius=10)
        
        # Κείμενο "YOU"
        you_text = self.font_medium.render("YOU", True, RED)
        screen.blit(you_text, (235, 108))
        
        # Κείμενο "VS"
        vs_text = self.font_medium.render("VS", True, WHITE)
        screen.blit(vs_text, (318, 108))
        
        # Κείμενο "BOT"
        bot_text = self.font_medium.render("BOT", True, CYAN)
        screen.blit(bot_text, (446, 108))
        
        # Difficulty
        diff_text = self.font_small.render(self.difficulty, True, WHITE)
        screen.blit(diff_text, (310, 100))
        
        # Σκορ
        player_score_text = self.font_large.render(str(self.player_score), True, RED)
        screen.blit(player_score_text, (245, 135))
        
        bot_score_text = self.font_large.render(str(self.bot_score), True, CYAN)
        screen.blit(bot_score_text, (465, 135))
        
    def draw_back_button(self):
        # Κουμπί πίσω
        pygame.draw.circle(screen, WHITE, (65, 140), 40)
        pygame.draw.polygon(screen, (195, 140, 169), 
                          [(45, 140), (75, 120), (75, 160)])
        
    def handle_goal(self, goal_type):
        if goal_type == "player_goal":
            self.bot_score += 1
        elif goal_type == "bot_goal":
            self.player_score += 1
            
        # Reset θέσεων
        self.ball.reset()
        pygame.time.wait(1000)
        
    def bot_move(self):
        # Απλή AI: Ο πλησιέστερος bot παίκτης κινείται προς τη μπάλα
        if random.random() < 0.02:  # 2% πιθανότητα ανά frame
            closest_bot = min(self.bot_team, 
                            key=lambda p: math.sqrt((p.x - self.ball.x)**2 + 
                                                   (p.y - self.ball.y)**2))
            
            # Κίνηση προς τη μπάλα
            dx = self.ball.x - closest_bot.x
            dy = self.ball.y - closest_bot.y
            dist = math.sqrt(dx**2 + dy**2)
            
            if dist > 50:
                move_speed = 3
                closest_bot.x += (dx / dist) * move_speed
                closest_bot.y += (dy / dist) * move_speed
                
                # Περιορισμοί στο πεδίο
                closest_bot.x = max(85, min(SCREEN_WIDTH - 85, closest_bot.x))
                closest_bot.y = max(260, min(SCREEN_HEIGHT // 2 - 50, closest_bot.y))
    
    def run(self):
        running = True
        
        while running:
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    running = False
                    
                elif event.type == pygame.MOUSEBUTTONDOWN:
                    mouse_pos = pygame.mouse.get_pos()
                    
                    # Έλεγχος για επιλογή παίκτη
                    for player in self.player_team:
                        if player.is_clicked(mouse_pos):
                            self.selected_player = player
                            player.selected = True
                            self.drag_start = mouse_pos
                            break
                            
                elif event.type == pygame.MOUSEBUTTONUP:
                    if self.selected_player and self.drag_start:
                        mouse_pos = pygame.mouse.get_pos()
                        
                        # Υπολογισμός δύναμης
                        dx = self.drag_start[0] - mouse_pos[0]
                        dy = self.drag_start[1] - mouse_pos[1]
                        
                        # Κίνηση παίκτη
                        self.selected_player.x -= dx * 0.5
                        self.selected_player.y -= dy * 0.5
                        
                        # Περιορισμοί στο πεδίο (κάτω μισό)
                        self.selected_player.x = max(85, min(SCREEN_WIDTH - 85, 
                                                            self.selected_player.x))
                        self.selected_player.y = max(SCREEN_HEIGHT // 2 + 50, 
                                                    min(SCREEN_HEIGHT - 260, 
                                                        self.selected_player.y))
                        
                        self.selected_player.selected = False
                        self.selected_player = None
                        self.drag_start = None
            
            # Ενημέρωση
            goal_result = self.ball.update()
            if goal_result:
                self.handle_goal(goal_result)
            
            # Bot AI
            self.bot_move()
            
            # Έλεγχος συγκρούσεων
            for player in self.player_team + self.bot_team:
                player.check_collision_with_ball(self.ball)
            
            # Σχεδίαση
            self.draw_field()
            
            # Σχεδίαση παικτών
            for player in self.bot_team:
                player.draw(screen)
            for player in self.player_team:
                player.draw(screen)
                
            # Σχεδίαση μπάλας
            self.ball.draw(screen)
            
            # UI
            self.draw_scoreboard()
            self.draw_back_button()
            
            # Ενημέρωση οθόνης
            pygame.display.flip()
            clock.tick(FPS)
        
        pygame.quit()
        sys.exit()

# Εκκίνηση παιχνιδιού
if __name__ == "__main__":
    game = Game()
    game.run()
