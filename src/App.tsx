/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Trophy, Gamepad2, Disc3 } from 'lucide-react';

const TRACKS = [
  { id: 1, title: 'Neon Pulse (AI Gen)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3' },
  { id: 2, title: 'Cybernetic Dreams (AI Gen)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3' },
  { id: 3, title: 'Synthwave Override (AI Gen)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3' },
];

const GRID_SIZE = 20;
const INITIAL_SNAKE = [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }];
const INITIAL_DIRECTION = 'UP';
const BASE_SPEED = 150;

type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

function getRandomFood(snake: Point[]): Point {
  let newFood: Point;
  while (true) {
    newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE)
    };
    if (!snake.some(segment => segment.x === newFood.x && segment.y === newFood.y)) {
      break;
    }
  }
  return newFood;
}

export default function App() {
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [direction, setDirection] = useState<Direction>(INITIAL_DIRECTION);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isGamePaused, setIsGamePaused] = useState(false);

  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const directionRef = useRef<Direction>(INITIAL_DIRECTION);

  // Initialize food properly once component mounts
  useEffect(() => {
    setFood(getRandomFood(INITIAL_SNAKE));
  }, []);

  // Audio setup
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (audioRef.current && isPlaying) {
      audioRef.current.play().catch(console.error);
    }
  }, [currentTrackIndex, isPlaying]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
    setIsPlaying(!isPlaying);
  };

  const skipForward = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
  };

  const skipBack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
  };

  const handleTrackEnded = () => {
    skipForward();
  };

  // Keyboard controls for snake
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling for arrow keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === ' ' && gameOver) {
        resetGame();
        return;
      }
      
      if (e.key === ' ' && !gameOver) {
        setIsGamePaused(prev => !prev);
        return;
      }

      if (isGamePaused || gameOver) return;

      const currentDir = directionRef.current;
      
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (currentDir !== 'DOWN') setDirection('UP');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (currentDir !== 'UP') setDirection('DOWN');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (currentDir !== 'RIGHT') setDirection('LEFT');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (currentDir !== 'LEFT') setDirection('RIGHT');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOver, isGamePaused]);

  // Update ref to avoid stale closure in interval
  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  // Game loop
  useEffect(() => {
    if (gameOver || isGamePaused) return;

    const moveSnake = () => {
      setSnake((prevSnake) => {
        const head = prevSnake[0];
        const currentDir = directionRef.current;
        const newHead = { ...head };

        switch (currentDir) {
          case 'UP':
            newHead.y -= 1;
            break;
          case 'DOWN':
            newHead.y += 1;
            break;
          case 'LEFT':
            newHead.x -= 1;
            break;
          case 'RIGHT':
            newHead.x += 1;
            break;
        }

        // Wall collision check
        if (
          newHead.x < 0 ||
          newHead.x >= GRID_SIZE ||
          newHead.y < 0 ||
          newHead.y >= GRID_SIZE
        ) {
          handleGameOver();
          return prevSnake;
        }

        // Self collision check
        if (prevSnake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
          handleGameOver();
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        // Food collision check
        if (newHead.x === food.x && newHead.y === food.y) {
          setScore((s) => s + 10);
          setFood(getRandomFood(newSnake));
          // Keep tail
        } else {
          newSnake.pop(); // Remove tail
        }

        return newSnake;
      });
    };

    // Increase speed slightly as score goes up
    const currentSpeed = Math.max(50, BASE_SPEED - Math.floor(score / 50) * 10);
    const interval = setInterval(moveSnake, currentSpeed);

    return () => clearInterval(interval);
  }, [direction, food, gameOver, isGamePaused, score]);

  const handleGameOver = () => {
    setGameOver(true);
    if (score > highScore) {
      setHighScore(score);
    }
  };

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setScore(0);
    setGameOver(false);
    setIsGamePaused(false);
    setFood(getRandomFood(INITIAL_SNAKE));
    directionRef.current = INITIAL_DIRECTION;
  };

  return (
    <div className="bg-[#000] text-white w-full h-screen overflow-hidden font-mono p-4 md:p-8 flex flex-col gap-4 md:gap-6 relative">
      <div className="static-noise"></div>
      
      <audio
        ref={audioRef}
        src={TRACKS[currentTrackIndex].url}
        onEnded={handleTrackEnded}
      />

      {/* Header Section */}
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b-4 border-[#0ff] pb-4 gap-4 flex-shrink-0 z-10 relative">
        <div className="flex items-center justify-center sm:justify-start gap-4">
          <div className="w-10 h-10 bg-[#f0f] border-4 border-[#0ff] flex items-center justify-center shrink-0">
            <div className="w-4 h-4 bg-[#0ff] animate-pulse"></div>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tighter text-white uppercase glitch" data-text="SYNTH_SNAKE_ERR::0x09F">SYNTH_SNAKE_ERR::0x09F</h1>
        </div>
        <div className="flex items-center justify-center sm:justify-end gap-4 sm:gap-6 text-[10px] sm:text-xs font-mono uppercase tracking-widest text-[#0ff] flex-wrap">
          <span className="animate-pulse">STATUS: CRITICAL</span>
          <span className="text-[#f0f]">BUFFER: 13%</span>
          <span className="text-white bg-[#f0f] px-1">LATENCY: 999ms</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-6 gap-6 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden pb-4 lg:pb-0 z-10 relative">
        
        {/* LEFT COLUMN: Music Playlist */}
        <div className="col-span-1 lg:col-span-3 lg:row-span-4 bg-black pixel-border p-5 flex flex-col">
          <h2 className="text-xs font-mono text-[#0ff] mb-6 flex items-center gap-2 uppercase tracking-widest bg-[#f0f] text-white p-1 inline-block w-max">
            {'>'} AUDIO_CORRUPTION_DB
          </h2>
          <div className="space-y-4 overflow-y-auto flex-1 pr-2 customize-scrollbar">
            {TRACKS.map((track, idx) => {
              const isActive = idx === currentTrackIndex;
              return (
                <div 
                  key={track.id}
                  onClick={() => {
                    setCurrentTrackIndex(idx);
                    if (!isPlaying) togglePlayPause();
                  }}
                  className={`p-3 transition-all cursor-pointer border-2 ${
                    isActive 
                    ? 'border-[#0ff] bg-[#0ff]/20' 
                    : 'border-[#333] hover:border-[#f0f] hover:bg-[#f0f]/10'
                  }`}
                >
                  <p className={`text-[10px] mb-2 font-mono tracking-widest ${isActive ? 'text-[#0ff]' : 'text-[#666]'}`}>
                    [{String(idx + 1).padStart(2, '0')}] {isActive ? 'ERR_ACTIVE' : 'IDLE'}
                  </p>
                  <p className={`text-xs md:text-sm ${isActive ? 'text-white font-bold' : 'text-[#aaa]'}`}>
                    {track.title.split(' (AI Gen)')[0].toUpperCase()}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t-2 border-[#333]">
            <div className="h-2 w-full bg-[#222] overflow-hidden border border-[#0ff]">
              <div className="h-full bg-[#f0f]" style={{width: '65%'}}></div>
            </div>
            <div className="flex justify-between text-[9px] font-mono mt-3 text-[#0ff] tracking-widest">
              <span>02:14</span>
              <span>-01:31</span>
            </div>
          </div>
        </div>

        {/* CENTER: Snake Game Console */}
        <div className="col-span-1 lg:col-span-6 lg:row-span-6 bg-[#111] pixel-border-alt relative flex items-center justify-center overflow-hidden min-h-[400px] screen-tear">
          <div className="absolute inset-0 opacity-20" style={{ backgroundSize: '4px 4px', backgroundImage: 'radial-gradient(#0ff 1px, transparent 1px)' }}></div>
          
          {/* Snake Representation */}
          <div className="relative w-full max-w-[400px] aspect-square mx-auto border-4 border-[#0ff]">
            {/* Grid Cells */}
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
              const x = i % GRID_SIZE;
              const y = Math.floor(i / GRID_SIZE);
              
              const isHead = snake[0].x === x && snake[0].y === y;
              const isSnake = snake.some(segment => segment.x === x && segment.y === y);
              const isFood = food.x === x && food.y === y;

              let cellClasses = "absolute w-[5%] h-[5%] box-border transition-none";
              
              if (isHead) {
                cellClasses += " bg-[#fff] z-10 border border-[#f0f]";
              } else if (isSnake) {
                cellClasses += " bg-[#f0f] border border-[#000]";
              } else if (isFood) {
                cellClasses += " bg-[#0ff] z-10";
                if (!isGamePaused && !gameOver) cellClasses += " animate-ping";
              }

              if (isHead || isSnake || isFood) {
                return (
                  <div
                    key={i}
                    className={cellClasses}
                    style={{
                      left: `${(x / GRID_SIZE) * 100}%`,
                      top: `${(y / GRID_SIZE) * 100}%`,
                    }}
                  />
                );
              }
              return null;
            })}

            {/* Overlays */}
            {gameOver && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/80">
                <h2 className="text-3xl md:text-5xl font-black text-[#f0f] mb-6 text-center glitch" data-text="FATAL_ERROR">FATAL_ERROR</h2>
                <button
                  onClick={resetGame}
                  className="px-6 py-4 border-4 border-[#0ff] text-white hover:bg-[#0ff] hover:text-black transition-none uppercase font-mono text-sm tracking-widest bg-black"
                >
                  {'>'} REBOOT_SYS
                </button>
              </div>
            )}
            
            {!gameOver && isGamePaused && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/80">
                <h2 className="text-3xl font-black text-[#0ff] tracking-widest glitch" data-text="HALTED">HALTED</h2>
              </div>
            )}
          </div>

          <div className="absolute top-4 lg:bottom-6 lg:top-auto lg:left-6 flex flex-wrap justify-center gap-3 w-full lg:w-auto px-4 z-30 pointer-events-none">
            <div className="text-[10px] sm:text-xs font-mono py-1 px-3 border-2 border-[#f0f] bg-black text-[#f0f] uppercase">WASD: OVERRIDE</div>
            <div className="text-[10px] sm:text-xs font-mono py-1 px-3 border-2 border-[#0ff] bg-black text-[#0ff] uppercase">SPACE: HALT</div>
          </div>
        </div>

        {/* RIGHT TOP: Game Stats */}
        <div className="col-span-1 lg:col-span-3 lg:row-span-2 bg-black pixel-border p-5 flex flex-col justify-between">
          <h2 className="text-xs font-mono text-black bg-[#0ff] mb-2 p-1 uppercase tracking-widest w-max">{'>'} MEMORY_DUMP</h2>
          <div className="mt-2">
            <p className="text-[10px] font-mono text-[#f0f] uppercase tracking-wider mb-1">SCORE</p>
            <p className="text-3xl md:text-4xl font-black text-white tracking-widest">{String(score).padStart(4, '0')}</p>
          </div>
          <div className="flex justify-between border-t-2 border-[#333] pt-4 mt-2">
            <div>
              <p className="text-[8px] font-mono text-[#666] uppercase tracking-wider mb-1">MAX_SCORE</p>
              <p className="text-sm font-mono text-[#0ff]">{String(highScore).padStart(4, '0')}</p>
            </div>
            <div className="text-right">
              <p className="text-[8px] font-mono text-[#666] uppercase tracking-wider mb-1">LVL</p>
              <p className="text-sm font-mono text-[#f0f]">0x{String(Math.floor(score / 50) + 1).padStart(2, '0')}</p>
            </div>
          </div>
        </div>

        {/* RIGHT BOTTOM: Music Controls */}
        <div className="col-span-1 lg:col-span-3 lg:row-span-4 bg-black pixel-border-alt p-5 flex flex-col">
          <h2 className="text-xs font-mono text-white bg-[#f0f] mb-6 p-1 uppercase tracking-widest w-max">{'>'} FREQ_MODULATOR</h2>
          
          <div className="flex-1 flex flex-col items-center justify-center gap-8">
            {/* Visualizer Bars (Blocky) */}
            <div className={`flex items-end justify-center gap-2 h-16 w-full px-2 ${isPlaying ? '' : 'opacity-30'} transition-opacity duration-75`}>
              <div className={`w-full max-w-4 bg-[#0ff] ${isPlaying ? 'animate-[pulse_0.2s_infinite]' : 'h-1/2'}`} style={isPlaying ? {height: '40%'} : {}}></div>
              <div className={`w-full max-w-4 bg-[#f0f] ${isPlaying ? 'animate-[pulse_0.3s_infinite]' : 'h-3/4'}`} style={isPlaying ? {height: '80%'} : {}}></div>
              <div className={`w-full max-w-4 bg-white ${isPlaying ? 'animate-[pulse_0.1s_infinite]' : 'h-full'}`} style={isPlaying ? {height: '100%'} : {}}></div>
              <div className={`w-full max-w-4 bg-[#0ff] ${isPlaying ? 'animate-[pulse_0.4s_infinite]' : 'h-2/3'}`} style={isPlaying ? {height: '60%'} : {}}></div>
              <div className={`w-full max-w-4 bg-[#f0f] ${isPlaying ? 'animate-[pulse_0.25s_infinite]' : 'h-1/3'}`} style={isPlaying ? {height: '30%'} : {}}></div>
              <div className={`w-full max-w-4 bg-[#0ff] ${isPlaying ? 'animate-[pulse_0.15s_infinite]' : 'h-5/6'}`} style={isPlaying ? {height: '90%'} : {}}></div>
            </div>

            {/* Control Cluster */}
            <div className="flex items-center gap-6">
              <button onClick={skipBack} className="w-10 h-10 border-2 border-[#0ff] bg-black hover:bg-[#0ff] hover:text-black transition-none flex items-center justify-center text-[#0ff]">
                <SkipBack className="w-5 h-5" />
              </button>
              <button 
                onClick={togglePlayPause}
                className="w-16 h-16 border-4 border-[#f0f] flex items-center justify-center bg-black hover:bg-[#f0f] hover:text-black transition-none text-[#f0f]"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8" />
                ) : (
                  <Play className="w-8 h-8 ml-1" />
                )}
              </button>
              <button onClick={skipForward} className="w-10 h-10 border-2 border-[#0ff] bg-black hover:bg-[#0ff] hover:text-black transition-none flex items-center justify-center text-[#0ff]">
                <SkipForward className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="mt-auto pt-6 border-t-2 border-[#333]">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-mono text-[#666] uppercase tracking-widest flex items-center gap-2">
                {isMuted || volume === 0 ? <VolumeX className="w-3 h-3 text-[#f0f]" /> : <Volume2 className="w-3 h-3 text-[#0ff]" />}
                VOL_ATTN
              </span>
              <span className="text-[10px] font-mono text-white">{Math.round((isMuted ? 0 : volume) * 100)}%</span>
            </div>
            <div className="relative w-full h-3 bg-[#222] border border-[#0ff] cursor-pointer flex items-center">
              <input
                type="range"
                min="0" max="1" step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  if (parseFloat(e.target.value) > 0 && isMuted) {
                    setIsMuted(false);
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div 
                className="h-full bg-[#f0f] border-r-2 border-white pointer-events-none" 
                style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* LEFT BOTTOM: Secondary Metric */}
        <div className="col-span-1 lg:col-span-3 lg:row-span-2 bg-black pixel-border p-5 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-mono text-[#0ff] uppercase tracking-widest bg-[#0ff]/20 px-1">OVERRIDE_VLV</span>
            <span className="text-[10px] font-mono text-[#f0f] tracking-widest animate-pulse">ACTIVE</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 8 }).map((_, i) => {
              const activeCount = Math.min(8, Math.floor(score / 50) + 3);
              const isActive = i < activeCount;
              return (
                <div 
                  key={i} 
                  className={`w-6 h-3 border-2 ${isActive ? 'bg-[#f0f] border-white' : 'border-[#333] bg-transparent'}`}
                ></div>
              );
            })}
          </div>
          <p className="mt-4 text-[8px] text-[#666] leading-relaxed font-mono uppercase tracking-widest">
            WARN: Clock cycle increases periodically. Next cycle shift in {50 - (score % 50)} cycles.
          </p>
        </div>

      </div>

      {/* Footer Bar */}
      <footer className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-[8px] font-mono text-[#666] uppercase tracking-[0.2em] pt-4 gap-2 text-center sm:text-left flex-shrink-0 border-t-4 border-[#f0f] z-10 relative mt-4">
        <div>{'>'} CONNECTION: UNSTABLE</div>
        <div>{'>'} GLITCH_PROTOCOL_V1.9</div>
        <div className="text-white bg-[#f0f] px-1">ERR_CODE: CYBER_SNAKE</div>
      </footer>

    </div>
  );
}
