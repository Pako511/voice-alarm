import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, Dimensions, TouchableOpacity, PanResponder } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');
const CENTER_X = width / 2;
const CENTER_Y = height / 2 - 100;
const ORBIT_RADIUS = 60;
const OBSTACLE_SIZE = 50;
const PLAYER_SIZE = 20;

// Color palettes for different themes
const COLOR_THEMES = [
  { background: '#0a0a0a', primary: '#00ffff', secondary: '#ff00ff', obstacle: '#ff3333', text: '#ffffff' },
  { background: '#0f0f23', primary: '#00ff88', secondary: '#ffaa00', obstacle: '#ff4444', text: '#e0e0e0' },
  { background: '#1a0a2e', primary: '#bd00ff', secondary: '#00d4ff', obstacle: '#ff6b6b', text: '#f0f0f0' },
  { background: '#001a1a', primary: '#00ffcc', secondary: '#ff99ff', obstacle: '#ff5555', text: '#ffffff' },
];

export default function App() {
  const [gameState, setGameState] = useState('menu'); // menu, playing, gameover
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [angle, setAngle] = useState(-Math.PI / 2); // Start at top
  const [obstacles, setObstacles] = useState([]);
  const [themeIndex, setThemeIndex] = useState(0);
  const [speed, setSpeed] = useState(0.08);
  const animationRef = useRef(null);
  const lastTimeRef = useRef(0);

  const currentTheme = COLOR_THEMES[themeIndex % COLOR_THEMES.length];

  // Generate a new obstacle
  const generateObstacle = useCallback(() => {
    const gapSize = Math.max(0.8, 1.5 - score * 0.05); // Gap gets smaller as score increases
    const gapCenter = Math.random() * Math.PI * 2;
    
    return {
      y: -OBSTACLE_SIZE,
      gapStart: gapCenter - gapSize / 2,
      gapEnd: gapCenter + gapSize / 2,
      passed: false,
    };
  }, [score]);

  // Start game
  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setAngle(-Math.PI / 2);
    setObstacles([generateObstacle()]);
    setSpeed(0.08);
    setThemeIndex(Math.floor(Math.random() * COLOR_THEMES.length));
    lastTimeRef.current = Date.now();
  };

  // Handle tap to rotate
  const handleTap = useCallback(() => {
    if (gameState === 'playing') {
      setAngle(prev => prev + Math.PI); // Rotate 180 degrees
    }
  }, [gameState]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const gameLoop = () => {
      const now = Date.now();
      const deltaTime = now - lastTimeRef.current;
      
      if (deltaTime >= 16) { // ~60 FPS
        lastTimeRef.current = now;

        setObstacles(prevObstacles => {
          let newObstacles = prevObstacles.map(obs => ({
            ...obs,
            y: obs.y + speed * 8, // Move obstacles down
          }));

          // Remove obstacles that are off screen
          newObstacles = newObstacles.filter(obs => obs.y < height + OBSTACLE_SIZE);

          // Add new obstacle if needed
          if (newObstacles.length > 0 && newObstacles[newObstacles.length - 1].y > 150) {
            newObstacles.push(generateObstacle());
          }

          // Check collisions and update score
          const playerX = CENTER_X + Math.cos(angle) * ORBIT_RADIUS;
          const playerY = CENTER_Y + Math.sin(angle) * ORBIT_RADIUS;

          newObstacles.forEach(obs => {
            // Check if obstacle is at player's Y level
            if (obs.y < playerY + PLAYER_SIZE && obs.y + OBSTACLE_SIZE > playerY - PLAYER_SIZE && !obs.passed) {
              // Normalize angle to 0-2PI
              let normalizedAngle = angle;
              while (normalizedAngle < 0) normalizedAngle += Math.PI * 2;
              while (normalizedAngle >= Math.PI * 2) normalizedAngle -= Math.PI * 2;
              
              // Normalize gap angles
              let gapStart = obs.gapStart;
              let gapEnd = obs.gapEnd;
              while (gapStart < 0) gapStart += Math.PI * 2;
              while (gapEnd < 0) gapEnd += Math.PI * 2;
              while (gapStart >= Math.PI * 2) gapStart -= Math.PI * 2;
              while (gapEnd >= Math.PI * 2) gapEnd -= Math.PI * 2;

              // Check if player is in the safe zone
              const inSafeZone = (normalizedAngle >= gapStart && normalizedAngle <= gapEnd) ||
                                (normalizedAngle + Math.PI * 2 >= gapStart && normalizedAngle + Math.PI * 2 <= gapEnd);

              if (!inSafeZone) {
                setGameState('gameover');
                if (score > highScore) {
                  setHighScore(score);
                }
              } else if (!obs.passed) {
                obs.passed = true;
                setScore(prev => prev + 1);
                // Increase speed slightly every 5 points
                if ((score + 1) % 5 === 0) {
                  setSpeed(prev => Math.min(prev + 0.01, 0.3));
                }
              }
            }
          });

          return newObstacles;
        });
      }

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, angle, speed, score, highScore, generateObstacle]);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => false,
    onPanResponderRelease: handleTap,
  });

  return (
    <View 
      style={[styles.container, { backgroundColor: currentTheme.background }]} 
      {...panResponder.panHandlers}
    >
      <StatusBar style="light" />
      
      {/* Menu Screen */}
      {gameState === 'menu' && (
        <View style={styles.menuContainer}>
          <Text style={[styles.title, { color: currentTheme.primary }]}>NEON ORBIT</Text>
          <Text style={[styles.subtitle, { color: currentTheme.text }]}>Tap to rotate • Avoid the red zones</Text>
          
          {highScore > 0 && (
            <Text style={[styles.highScore, { color: currentTheme.secondary }]}>
              Best: {highScore}
            </Text>
          )}
          
          <TouchableOpacity style={styles.startButton} onPress={startGame}>
            <Text style={styles.startButtonText}>PLAY</Text>
          </TouchableOpacity>
          
          <Text style={[styles.hint, { color: currentTheme.text }]}>
            Tap anywhere to rotate 180°
          </Text>
        </View>
      )}

      {/* Game Screen */}
      {gameState === 'playing' && (
        <>
          {/* Score */}
          <View style={styles.scoreContainer}>
            <Text style={[styles.score, { color: currentTheme.text }]}>{score}</Text>
          </View>

          {/* Center Orbit Circle */}
          <View style={[styles.orbitCircle, { borderColor: currentTheme.primary + '40' }]} />
          
          {/* Center Point */}
          <View style={[styles.centerPoint, { backgroundColor: currentTheme.primary }]} />

          {/* Player */}
          <View
            style={[
              styles.player,
              {
                left: CENTER_X + Math.cos(angle) * ORBIT_RADIUS - PLAYER_SIZE / 2,
                top: CENTER_Y + Math.sin(angle) * ORBIT_RADIUS - PLAYER_SIZE / 2,
                backgroundColor: currentTheme.secondary,
              },
            ]}
          />

          {/* Obstacles */}
          {obstacles.map((obs, index) => (
            <View key={index}>
              {/* Left obstacle segment */}
              <View
                style={[
                  styles.obstacle,
                  {
                    left: CENTER_X - OBSTACLE_SIZE,
                    top: obs.y,
                    width: OBSTACLE_SIZE,
                    backgroundColor: currentTheme.obstacle,
                  },
                ]}
              />
              
              {/* Right obstacle segment */}
              <View
                style={[
                  styles.obstacle,
                  {
                    left: CENTER_X + OBSTACLE_SIZE,
                    top: obs.y,
                    width: OBSTACLE_SIZE,
                    backgroundColor: currentTheme.obstacle,
                  },
                ]}
              />
              
              {/* Gap indicator lines (optional visual aid) */}
              <View
                style={[
                  styles.gapLine,
                  {
                    left: CENTER_X + Math.cos(obs.gapStart) * ORBIT_RADIUS,
                    top: obs.y,
                    backgroundColor: currentTheme.primary + '30',
                  },
                ]}
              />
              <View
                style={[
                  styles.gapLine,
                  {
                    left: CENTER_X + Math.cos(obs.gapEnd) * ORBIT_RADIUS,
                    top: obs.y,
                    backgroundColor: currentTheme.primary + '30',
                  },
                ]}
              />
            </View>
          ))}
        </>
      )}

      {/* Game Over Screen */}
      {gameState === 'gameover' && (
        <View style={styles.menuContainer}>
          <Text style={[styles.gameOverTitle, { color: currentTheme.obstacle }]}>GAME OVER</Text>
          <Text style={[styles.finalScore, { color: currentTheme.text }]}>Score: {score}</Text>
          
          {score >= highScore && score > 0 && (
            <Text style={[styles.newRecord, { color: currentTheme.secondary }]}>🏆 NEW RECORD! 🏆</Text>
          )}
          
          <TouchableOpacity style={styles.startButton} onPress={startGame}>
            <Text style={styles.startButtonText}>PLAY AGAIN</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuButton} onPress={() => setGameState('menu')}>
            <Text style={[styles.menuButtonText, { color: currentTheme.text }]}>MENU</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 10,
    letterSpacing: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
    opacity: 0.8,
  },
  highScore: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 30,
  },
  startButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 60,
    paddingVertical: 20,
    borderRadius: 30,
    marginBottom: 20,
  },
  startButtonText: {
    color: '#000000',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  hint: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: 20,
  },
  scoreContainer: {
    position: 'absolute',
    top: 60,
    zIndex: 10,
  },
  score: {
    fontSize: 72,
    fontWeight: 'bold',
    opacity: 0.3,
  },
  orbitCircle: {
    width: ORBIT_RADIUS * 2,
    height: ORBIT_RADIUS * 2,
    borderRadius: ORBIT_RADIUS,
    borderWidth: 2,
    position: 'absolute',
  },
  centerPoint: {
    width: 12,
    height: 12,
    borderRadius: 6,
    position: 'absolute',
  },
  player: {
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    borderRadius: PLAYER_SIZE / 2,
    position: 'absolute',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  obstacle: {
    height: OBSTACLE_SIZE,
    position: 'absolute',
    borderRadius: 8,
    shadowColor: '#ff0000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  gapLine: {
    width: 2,
    height: OBSTACLE_SIZE,
    position: 'absolute',
  },
  gameOverTitle: {
    fontSize: 42,
    fontWeight: 'bold',
    marginBottom: 20,
    letterSpacing: 3,
  },
  finalScore: {
    fontSize: 32,
    fontWeight: '600',
    marginBottom: 10,
  },
  newRecord: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  menuButton: {
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  menuButtonText: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 1,
  },
});
