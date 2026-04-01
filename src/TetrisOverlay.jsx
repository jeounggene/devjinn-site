import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

const COLS = 10;
const ROWS = 20;
const DROP_MS_START = 700;

/** Hold-to-repeat: delay before stream, then interval (ms). */
const KEY_REPEAT_DELAY_MS = 280;
const KEY_REPEAT_INTERVAL_MS = 48;
const KEY_REPEAT_SOFT_DROP_MS = 36;

/** 7 tetrominoes × 4 rotations (4×4 grids, SRS-style). */
const SHAPES = [
  [
    [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0],
    ],
    [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
    ],
    [
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
    ],
  ],
  [
    [
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  ],
  [
    [
      [0, 1, 0, 0],
      [1, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 1, 0, 0],
      [0, 1, 1, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 0, 0, 0],
      [1, 1, 1, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 1, 0, 0],
      [1, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 0],
    ],
  ],
  [
    [
      [0, 1, 1, 0],
      [1, 1, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 1, 0, 0],
      [0, 1, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 0, 0, 0],
      [0, 1, 1, 0],
      [1, 1, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [1, 0, 0, 0],
      [1, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 0],
    ],
  ],
  [
    [
      [1, 1, 0, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 0, 1, 0],
      [0, 1, 1, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 0, 0, 0],
      [1, 1, 0, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 1, 0, 0],
      [1, 1, 0, 0],
      [1, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  ],
  [
    [
      [1, 0, 0, 0],
      [1, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 0, 0, 0],
      [1, 1, 1, 0],
      [1, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [1, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 0],
    ],
  ],
  [
    [
      [0, 0, 1, 0],
      [1, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 0, 0, 0],
      [1, 1, 1, 0],
      [1, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [1, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 0],
    ],
  ],
];

function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function randomPiece() {
  const id = Math.floor(Math.random() * 7) + 1;
  const shape = SHAPES[id - 1][0];
  return { id, rot: 0, x: 3, y: -1, shape };
}

function collide(board, px, py, shape) {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!shape[r][c]) continue;
      const ny = py + r;
      const nx = px + c;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

/**
 * Guideline SRS wall kicks (clockwise): if rotation at (x,y) collides, try offsets in order.
 * pieceId 1 = I, 2 = O; J,L,S,T,Z use JLSTZ table indexed by rotation *before* the spin.
 * @see https://harddrop.com/wiki/SRS
 */
const SRS_KICKS_JLSTZ_CW = [
  [
    [0, 0],
    [-1, 0],
    [-1, 1],
    [0, -2],
    [-1, -2],
  ],
  [
    [0, 0],
    [1, 0],
    [1, -1],
    [0, 2],
    [1, 2],
  ],
  [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
  [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
];

const SRS_KICKS_I_CW = [
  [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, -1],
    [1, 2],
  ],
  [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, 2],
    [2, -1],
  ],
  [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, 1],
    [-1, -2],
  ],
  [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, -2],
    [2, 1],
  ],
];

/** Returns next piece state after clockwise SRS rotation, or null if no kick fits. */
function tryRotateClockwiseSrs(board, p) {
  const nextRot = (p.rot + 1) % 4;
  const shape = SHAPES[p.id - 1][nextRot];
  let kicks;
  if (p.id === 2) {
    kicks = [[0, 0]];
  } else if (p.id === 1) {
    kicks = SRS_KICKS_I_CW[p.rot];
  } else {
    kicks = SRS_KICKS_JLSTZ_CW[p.rot];
  }
  for (let i = 0; i < kicks.length; i++) {
    const [dx, dy] = kicks[i];
    const nx = p.x + dx;
    const ny = p.y + dy;
    if (!collide(board, nx, ny, shape)) {
      return { ...p, rot: nextRot, shape, x: nx, y: ny };
    }
  }
  return null;
}

/** Lowest valid y where the piece would come to rest (ghost / hard-drop preview). */
function landingY(board, p) {
  if (!p) return -1;
  let y = p.y;
  while (!collide(board, p.x, y + 1, p.shape)) y += 1;
  return y;
}

function covers(p, x, y) {
  if (!p) return false;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!p.shape[r][c]) continue;
      if (p.x + c === x && p.y + r === y) return true;
    }
  }
  return false;
}

function merge(board, px, py, shape, id) {
  const next = board.map((row) => row.slice());
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!shape[r][c]) continue;
      const ny = py + r;
      const nx = px + c;
      if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) next[ny][nx] = id;
    }
  }
  return next;
}

function clearLines(board) {
  const full = [];
  for (let y = 0; y < ROWS; y++) {
    if (board[y].every((c) => c !== 0)) full.push(y);
  }
  if (full.length === 0) return { board, cleared: 0 };
  let b = board.filter((_, y) => !full.includes(y));
  while (b.length < ROWS) {
    b.unshift(Array(COLS).fill(0));
  }
  return { board: b, cleared: full.length };
}

export default function TetrisOverlay({ onClose, onGameOver }) {
  const wrapRef = useRef(null);
  const [board, setBoard] = useState(() => emptyBoard());
  const [piece, setPiece] = useState(() => randomPiece());
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const pieceRef = useRef(null);
  const boardRef = useRef(emptyBoard());
  const gameOverRef = useRef(false);
  const gameOverReportedRef = useRef(false);
  const keyRepeatRef = useRef({});

  useEffect(() => {
    if (!gameOver || !onGameOver || gameOverReportedRef.current) return;
    gameOverReportedRef.current = true;
    onGameOver({ score, lines, level });
  }, [gameOver, score, lines, level, onGameOver]);

  useLayoutEffect(() => {
    pieceRef.current = piece;
  }, [piece]);

  const spawn = useCallback(() => {
    const id = Math.floor(Math.random() * 7) + 1;
    const rot = 0;
    const shape = SHAPES[id - 1][rot];
    const px = 3;
    const py = -1;
    const p = { id, rot, x: px, y: py, shape };
    pieceRef.current = p;
    setPiece(p);
    if (collide(boardRef.current, px, py, shape)) {
      gameOverRef.current = true;
      setGameOver(true);
    }
  }, []);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  useEffect(() => {
    wrapRef.current?.focus();
  }, []);

  const tickDrop = useCallback(() => {
    if (gameOverRef.current || !pieceRef.current) return;
    const p = pieceRef.current;
    const nextY = p.y + 1;
    if (!collide(boardRef.current, p.x, nextY, p.shape)) {
      const np = { ...p, y: nextY };
      pieceRef.current = np;
      setPiece(np);
    } else {
      const merged = merge(boardRef.current, p.x, p.y, p.shape, p.id);
      const { board: nb, cleared } = clearLines(merged);
      boardRef.current = nb;
      setBoard(nb);
      if (cleared > 0) {
        setLines((ln) => {
          const n = ln + cleared;
          const lvl = Math.floor(n / 10) + 1;
          setLevel(lvl);
          setScore((s) => s + cleared * 100 * lvl);
          return n;
        });
      }
      spawn();
    }
  }, [spawn]);

  useEffect(() => {
    const ms = Math.max(120, DROP_MS_START - (level - 1) * 55);
    const id = setInterval(() => tickDrop(), ms);
    return () => clearInterval(id);
  }, [tickDrop, level]);

  const tryMove = useCallback((dx, dy) => {
    if (gameOverRef.current || !pieceRef.current) return;
    const p = pieceRef.current;
    const nx = p.x + dx;
    const ny = p.y + dy;
    if (!collide(boardRef.current, nx, ny, p.shape)) {
      const np = { ...p, x: nx, y: ny };
      pieceRef.current = np;
      setPiece(np);
    }
  }, []);

  const tryRotate = useCallback(() => {
    if (gameOverRef.current || !pieceRef.current) return;
    const p = pieceRef.current;
    const np = tryRotateClockwiseSrs(boardRef.current, p);
    if (np) {
      pieceRef.current = np;
      setPiece(np);
    }
  }, []);

  const hardDrop = useCallback(() => {
    if (gameOverRef.current || !pieceRef.current) return;
    let p = pieceRef.current;
    while (!collide(boardRef.current, p.x, p.y + 1, p.shape)) {
      p = { ...p, y: p.y + 1 };
    }
    pieceRef.current = p;
    setPiece(p);
    const merged = merge(boardRef.current, p.x, p.y, p.shape, p.id);
    const { board: nb, cleared } = clearLines(merged);
    boardRef.current = nb;
    setBoard(nb);
    if (cleared > 0) {
      setLines((ln) => {
        const n = ln + cleared;
        const lvl = Math.floor(n / 10) + 1;
        setLevel(lvl);
        setScore((s) => s + cleared * 100 * lvl);
        return n;
      });
    }
    spawn();
  }, [spawn]);

  useEffect(() => {
    const clearKeyRepeat = (key) => {
      const t = keyRepeatRef.current[key];
      if (!t) return;
      if (t.delayId != null) clearTimeout(t.delayId);
      if (t.intervalId != null) clearInterval(t.intervalId);
      delete keyRepeatRef.current[key];
    };

    const clearAllKeyRepeat = () => {
      Object.keys(keyRepeatRef.current).forEach(clearKeyRepeat);
    };

    const startKeyRepeat = (key, action, intervalMs) => {
      clearKeyRepeat(key);
      action();
      const delayId = setTimeout(() => {
        const intervalId = setInterval(() => {
          if (gameOverRef.current) return;
          action();
        }, intervalMs);
        keyRepeatRef.current[key] = { delayId: null, intervalId };
      }, KEY_REPEAT_DELAY_MS);
      keyRepeatRef.current[key] = { delayId, intervalId: null };
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        clearAllKeyRepeat();
        onClose();
        return;
      }
      if (gameOverRef.current) return;
      if (e.key === ' ' && e.repeat) return;

      if (
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowUp'
      ) {
        if (e.repeat) return;
        e.preventDefault();
        e.stopPropagation();
        switch (e.key) {
          case 'ArrowLeft':
            startKeyRepeat('ArrowLeft', () => tryMove(-1, 0), KEY_REPEAT_INTERVAL_MS);
            break;
          case 'ArrowRight':
            startKeyRepeat('ArrowRight', () => tryMove(1, 0), KEY_REPEAT_INTERVAL_MS);
            break;
          case 'ArrowDown':
            startKeyRepeat('ArrowDown', () => tryMove(0, 1), KEY_REPEAT_SOFT_DROP_MS);
            break;
          case 'ArrowUp':
            startKeyRepeat('ArrowUp', () => tryRotate(), KEY_REPEAT_INTERVAL_MS);
            break;
          default:
            break;
        }
        return;
      }

      if (e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        hardDrop();
      }
    };

    const onKeyUp = (e) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowRight':
        case 'ArrowDown':
        case 'ArrowUp':
          e.preventDefault();
          clearKeyRepeat(e.key);
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('keyup', onKeyUp, true);
    return () => {
      clearAllKeyRepeat();
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('keyup', onKeyUp, true);
    };
  }, [onClose, tryMove, tryRotate, hardDrop]);

  const ghostPiece =
    piece && !gameOver
      ? { ...piece, y: landingY(board, piece) }
      : null;

  const cells = [];
  for (let y = 0; y < ROWS; y++) {
    const row = [];
    for (let x = 0; x < COLS; x++) {
      let ch = board[y][x] ? '█' : '·';
      let ghost = false;
      if (ghostPiece && covers(ghostPiece, x, y) && !covers(piece, x, y)) {
        ch = '□';
        ghost = true;
      }
      if (piece && covers(piece, x, y)) {
        ch = '█';
        ghost = false;
      }
      row.push(
        <span key={`${y}-${x}`} className={ghost ? 'tetris-cell tetris-cell--ghost' : 'tetris-cell'}>
          {ch}
        </span>
      );
    }
    cells.push(
      <div key={y} className="tetris-row">
        {row}
      </div>
    );
  }

  return (
    <div
      className="tetris-inline"
      ref={wrapRef}
      tabIndex={-1}
      role="application"
      aria-label="Tetris"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="tetris-panel">
        <div className="tetris-field-wrap">
          <div className="tetris-field">{cells}</div>
        </div>
        <aside className="tetris-sidebar">
          <div className="tetris-stat">score {score}</div>
          <div className="tetris-stat">lines {lines}</div>
          <div className="tetris-stat">lv {level}</div>
        </aside>
      </div>
    </div>
  );
}
