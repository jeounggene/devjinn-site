import { useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react';
import './App.css';
import { getSudoProjectsLines } from './projectBackends.js';
import { getAdminPassword, isSudoPasswordConfigured } from './adminConfig.js';
import TetrisOverlay from './TetrisOverlay.jsx';

const TETRIS_DIRECTIONS =
  'TETRIS loaded — ←→ move · ↓ soft · ↑ rotate · space hard drop · Esc close';

const PROMPT = 'guest@devjinn:~$';
const SUDO_PASSWORD_PROMPT = '[sudo] password for guest:';
const PROJECTS = [
  { name: 'seechords.fly.dev', url: 'https://seechords.fly.dev/' }
];

function illegibleChars() {
  const pool =
    '█▓▒░■□▲▼◆◇○●◎◉◍◌◙◘◦☠☢☣☤☥☦☧☨☩☪☫☬☭☮☯☸☹☺☻☼☽☾☿♀♂♁♠♣♥♦♪♫♬♭♯⚡⚠⚫⚪⚰⚱⛧⛨⛩⛪⛲⛳⛴⛵⛶⛷⛸⛹⛺⛻⛼⛽⛾⛿' +
    String.fromCharCode(...Array(128).fill(0).map((_, i) => i + 33));
  let out = '';
  for (let i = 0; i < 32; i++) {
    out += pool[Math.floor(Math.random() * pool.length)];
    if ((i + 1) % 8 === 0 && i !== 31) out += ' ';
  }
  return out;
}

const COMMANDS = [
  'help', 'ls', 'cd', 'projects', 'clear', 'echo', 'whoami', 'pwd', 'date', 'sudo', 'exit', 'matrix', 'donate', 'tetris', 'switch'
];

const MATRIX_RAIN_ACCENT = { green: '#00ff41', red: '#d9a06a' };

const TERMINAL_THEME_KEY = 'devjinn-terminal-theme';

function readStoredTerminalTheme() {
  try {
    const v = localStorage.getItem(TERMINAL_THEME_KEY);
    if (v === 'red' || v === 'green') return v;
  } catch {
    /* private mode / quota */
  }
  return 'green';
}

const EASTER_EGGS = {
  donate: [
    `<a href="https://buymeacoffee.com/devjinn" target="_blank" rel="noopener noreferrer">☕ Buy me a coffee</a>`
  ],
  sudo: [
    'guest is not in the sudoers file. This incident will be reported.'
  ]
};


function App() {
  const [lines, setLines] = useState([
    { type: 'prompt', text: '', cwd: '~' }
  ]);
  const [input, setInput] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [cwd, setCwd] = useState('~');
  const [autocomplete, setAutocomplete] = useState('');
  const [showMatrix, setShowMatrix] = useState(false);
  /** Increment to mount a fresh NYC flash; reset to 0 on clear/exit. */
  const [nyFlashNonce, setNyFlashNonce] = useState(0);
  const [showCRTOff, setShowCRTOff] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [sudoPasswordMode, setSudoPasswordMode] = useState(false);
  const [showTetris, setShowTetris] = useState(false);
  const [terminalTheme, setTerminalTheme] = useState(readStoredTerminalTheme);
  const tetrisGameOverOnceRef = useRef(false);
  const sudoFailedAttemptsRef = useRef(0);
  const matrixSeqRef = useRef(0);
  const matrixTimeoutsRef = useRef([]);
  const inputRef = useRef(null);

  const clearMatrixTimeouts = useCallback(() => {
    matrixTimeoutsRef.current.forEach((id) => clearTimeout(id));
    matrixTimeoutsRef.current = [];
  }, []);
  /** After ArrowUp/Down recall, keep caret at end so typing appends instead of prepending. */
  const moveCaretToEndAfterHistory = useRef(false);

  useLayoutEffect(() => {
    if (!moveCaretToEndAfterHistory.current) return;
    moveCaretToEndAfterHistory.current = false;
    const el = inputRef.current;
    if (el) {
      const len = el.value.length;
      el.setSelectionRange(len, len);
    }
  }, [input]);

  useEffect(() => {
    inputRef.current?.focus();
    const blink = setInterval(() => setShowCursor(c => !c), 530);
    return () => clearInterval(blink);
  }, []);

  useEffect(() => {
    if (!showTetris) inputRef.current?.focus();
  }, [showTetris]);

  useLayoutEffect(() => {
    const c = terminalTheme === 'red' ? '#d9a06a' : '#00ff41';
    document.body.style.color = c;
    document.documentElement.style.color = c;
  }, [terminalTheme]);

  useEffect(() => {
    try {
      localStorage.setItem(TERMINAL_THEME_KEY, terminalTheme);
    } catch {
      /* ignore */
    }
  }, [terminalTheme]);

  const handleTetrisClose = useCallback(() => {
    setShowTetris(false);
  }, []);

  const handleNyFlashEnd = useCallback(() => {
    setNyFlashNonce(0);
  }, []);

  const handleTetrisGameOver = useCallback(({ score, lines: lineCount, level: lv }) => {
    if (tetrisGameOverOnceRef.current) return;
    tetrisGameOverOnceRef.current = true;
    setShowTetris(false);
    setLines((prev) => {
      const last = prev[prev.length - 1];
      if (!last || last.type !== 'prompt') return prev;
      return [
        ...prev.slice(0, -1),
        {
          type: 'output',
          text: `game over — score ${score} · lines ${lineCount} · lv ${lv}`,
        },
        last,
      ];
    });
  }, []);

  useEffect(() => {
    if (showTetris) tetrisGameOverOnceRef.current = false;
  }, [showTetris]);

  // Autocomplete logic
  useEffect(() => {
    if (sudoPasswordMode) {
      setAutocomplete('');
      return;
    }
    if (!input) {
      setAutocomplete('');
      return;
    }
    const [cmd, ...rest] = input.split(' ');
    let options = [];
    if (cmd === 'cd' || (cmd === 'ls' && rest.length > 0)) {
      // Autocomplete directories for cd and ls
      options = ['~', 'projects', '/projects'];
    } else if (cmd === 'projects') {
      options = PROJECTS.map(p => p.name);
    } else if (cmd === 'sudo') {
      options = ['projects'];
    } else if (cmd === 'switch') {
      options = ['green', 'red'];
    } else {
      options = COMMANDS.filter(c => c.startsWith(cmd));
    }
    const last = rest.length ? rest[rest.length-1] : cmd;
    const match = options.find(opt => opt.startsWith(last));
    if (match && match !== last) {
      setAutocomplete(match.slice(last.length));
    } else {
      setAutocomplete('');
    }
  }, [input, sudoPasswordMode]);

  function handleInput(e) {
    setInput(e.target.value);
    setHistoryIdx(-1);
  }

  function handleKeyDown(e) {
    if (showTetris) return;
    if (sudoPasswordMode && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Tab')) {
      if (e.key === 'Tab') e.preventDefault();
      return;
    }
    if (e.key === 'ArrowUp') {
      if (history.length === 0) return;
      e.preventDefault();
      const idx = historyIdx === -1 ? history.length - 1 : Math.max(0, historyIdx - 1);
      const next = history[idx];
      moveCaretToEndAfterHistory.current = true;
      setInput(next);
      setHistoryIdx(idx);
      return;
    }
    if (e.key === 'ArrowDown') {
      if (history.length === 0) return;
      e.preventDefault();
      const idx = historyIdx === -1 ? history.length - 1 : Math.min(history.length - 1, historyIdx + 1);
      if (idx === history.length - 1) {
        setInput('');
        setHistoryIdx(-1);
      } else {
        const next = history[idx];
        moveCaretToEndAfterHistory.current = true;
        setInput(next);
        setHistoryIdx(idx);
      }
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      if (autocomplete) {
        setInput(input + autocomplete);
        setAutocomplete('');
      }
      return;
    }
    if (e.key === 'Enter') {
      if (sudoPasswordMode) {
        const newLines = [...lines];
        const password = input;
        if (password === getAdminPassword()) {
          sudoFailedAttemptsRef.current = 0;
          newLines[newLines.length - 1] = { type: 'sudoPasswordEcho', cwd };
          getSudoProjectsLines().forEach((line) =>
            newLines.push({ type: 'output', text: line })
          );
          newLines.push({ type: 'prompt', text: '', cwd });
          setLines(newLines);
          setInput('');
          setSudoPasswordMode(false);
          setAutocomplete('');
          setHistoryIdx(-1);
          return;
        }
        sudoFailedAttemptsRef.current += 1;
        const failed = sudoFailedAttemptsRef.current;
        newLines[newLines.length - 1] = { type: 'sudoPasswordEcho', cwd };
        if (failed >= 3) {
          newLines.push({
            type: 'output',
            text: 'sudo: 3 incorrect password attempts',
          });
          newLines.push({ type: 'prompt', text: '', cwd });
          setLines(newLines);
          setInput('');
          setSudoPasswordMode(false);
          sudoFailedAttemptsRef.current = 0;
          setAutocomplete('');
          setHistoryIdx(-1);
          return;
        }
        newLines.push({
          type: 'output',
          text: 'Password is wrong, please try again.',
        });
        newLines.push({ type: 'prompt', text: '', cwd });
        setLines(newLines);
        setInput('');
        setSudoPasswordMode(true);
        setAutocomplete('');
        setHistoryIdx(-1);
        return;
      }

      let newLines = [...lines];
      // Save cwd for this prompt
      newLines[newLines.length - 1] = { type: 'prompt', text: input, cwd };
      const trimmed = input.trim();
      const [cmd, ...args] = trimmed.split(' ');
      let output = [];
      let nextCwd = cwd;
      // Save to history
      if (input.trim()) setHistory(h => [...h, input]);
      setHistoryIdx(-1);
      if (cmd === 'tetris') {
        setShowTetris(true);
        setLines([
          { type: 'tetrisEcho', cwd: nextCwd, command: 'tetris' },
          { type: 'output', text: TETRIS_DIRECTIONS },
          { type: 'prompt', text: '', cwd: nextCwd },
        ]);
        setCwd(nextCwd);
        setInput('');
        setAutocomplete('');
        return;
      }
      switch (cmd) {
        case 'matrix': {
          clearMatrixTimeouts();
          matrixSeqRef.current += 1;
          const seq = matrixSeqRef.current;
          setShowMatrix(true);
          output = ['Welcome to the Matrix...'];
          const ids = [];
          matrixTimeoutsRef.current = ids;
          ids.push(
            setTimeout(() => {
              if (seq !== matrixSeqRef.current) return;
              setShowMatrix(false);
              setNyFlashNonce((n) => n + 1);
              ids.push(
                setTimeout(() => {
                  if (seq !== matrixSeqRef.current) return;
                  setLines((l) => [
                    ...l,
                    {
                      type: 'error',
                      text: `FATAL ERROR: SYSTEM BREACH DETECTED AT [${illegibleChars()}]`,
                      cwd: nextCwd,
                    },
                    { type: 'prompt', text: '', cwd: nextCwd },
                  ]);
                  setShowCRTOff(true);
                  ids.push(
                    setTimeout(() => {
                      if (seq !== matrixSeqRef.current) return;
                      setShowCRTOff(false);
                      setLines([{ type: 'prompt', text: '', cwd: nextCwd }]);
                      setInput('');
                    }, 700 + 400)
                  );
                }, 120)
              );
            }, 900)
          );
          break;
        }
        case 'exit':
          clearMatrixTimeouts();
          setNyFlashNonce(0);
          setShowMatrix(false);
          matrixSeqRef.current += 1;
          output = [];
          setTimeout(() => {
            setLines((l) => [
              ...l,
              {
                type: 'error',
                text: `exit: cannot detach session: host refuses termination [${illegibleChars()}]`,
                cwd: nextCwd,
              },
              { type: 'prompt', text: '', cwd: nextCwd },
            ]);
            setShowCRTOff(true);
            setTimeout(() => {
              setShowCRTOff(false);
              setLines([{ type: 'prompt', text: '', cwd: nextCwd }]);
              setInput('');
            }, 700 + 400);
          }, 0);
          break;
        case 'help':
          output = [
            'Available commands:',
            COMMANDS.join('  ')
          ]; break;
        case 'ls':
          if (cwd === '~') {
            output = ['projects'];
          } else if (cwd === '/projects') {
            output = PROJECTS.map(p => `<a href="${p.url}" target="_blank" rel="noopener noreferrer">${p.name}</a>`);
          } else {
            output = ['. ..'];
          }
          break;
        case 'cd':
          if (!args[0] || args[0] === '~') {
            nextCwd = '~';
            output = [''];
          } else if (args[0] === 'projects' || args[0] === '/projects') {
            nextCwd = '/projects';
            output = [''];
          } else {
            output = [`cd: no such file or directory: ${args[0]}`];
          }
          break;
        case 'pwd':
          output = [cwd]; break;
        case 'whoami':
          output = ['guest']; break;
        case 'echo':
          output = [args.join(' ')]; break;
        case 'clear':
          clearMatrixTimeouts();
          setShowTetris(false);
          setNyFlashNonce(0);
          setShowMatrix(false);
          matrixSeqRef.current += 1;
          setLines([{ type: 'prompt', text: '', cwd: nextCwd }]);
          setInput('');
          return;
        case 'projects':
          output = ['Projects:', ...PROJECTS.map(p => `<a href="${p.url}" target="_blank" rel="noopener noreferrer">${p.name}</a>`)];
          break;
        case 'date':
          output = [new Date().toString()]; break;
        case 'sudo':
          if (!args[0]) {
            output = [];
          } else if (args[0] === 'projects') {
            if (!isSudoPasswordConfigured()) {
              output = ['sudo: set VITE_ADMIN_PASSWORD in .env.local'];
            } else {
              sudoFailedAttemptsRef.current = 0;
              setSudoPasswordMode(true);
              output = [];
            }
          } else {
            output = EASTER_EGGS.sudo;
          }
          break;
        case 'donate':
          output = EASTER_EGGS.donate; break;
        case 'switch': {
          const pal = (args[0] || '').toLowerCase();
          if (pal === 'green') {
            setTerminalTheme('green');
            output = ['switched to green phosphor'];
          } else if (pal === 'red') {
            setTerminalTheme('red');
            output = ['switched to amber (orange-brown)'];
          } else {
            output = ['switch: usage: switch green | switch red'];
          }
          break;
        }
        case '':
          output = ['']; break;
        default:
          output = [`command not found: ${cmd}`];
      }
      output.forEach(line => newLines.push({ type: 'output', text: line }));
      setCwd(nextCwd);
      newLines.push({ type: 'prompt', text: '', cwd: nextCwd });
      setLines(newLines);
      setInput('');
      setAutocomplete('');
    }
  }

  return (
    <div
      className="matrix-terminal"
      data-terminal-theme={terminalTheme}
      onClick={() => inputRef.current?.focus()}
    >
      <div className="terminal-screen" id="terminal-screen">
        {showMatrix && (
          <MatrixRain targetId="terminal-screen" accent={MATRIX_RAIN_ACCENT[terminalTheme]} />
        )}
        {nyFlashNonce > 0 && (
          <NYFlashShell key={nyFlashNonce} onEnd={handleNyFlashEnd} />
        )}
        {showCRTOff && <CRTStaticOverlay />}
        {lines.slice(0, -1).map((line, idx) =>
          line.type === 'tetrisEcho' ? (
            <div className="terminal-line output" key={idx}>
              <span className="prompt">{PROMPT.replace('~', line.cwd || '~')} </span>
              {line.command}
            </div>
          ) : line.type === 'sudoPasswordEcho' ? (
            <div className="terminal-line" key={idx}>
              <span className="prompt">{SUDO_PASSWORD_PROMPT} </span>
            </div>
          ) : line.type === 'prompt' ? (
            <div className="terminal-line" key={idx}>
              <span className="prompt">{PROMPT.replace('~', line.cwd || '~')} </span>
              <span>{line.text}</span>
            </div>
          ) : line.type === 'error' ? (
            <div className="terminal-line error-output" key={idx}>{line.text}</div>
          ) : (
            <div className="terminal-line output" key={idx} dangerouslySetInnerHTML={{__html: line.text}}></div>
          )
        )}
        {showTetris && (
          <div className="terminal-line tetris-embed-row">
            <TetrisOverlay onClose={handleTetrisClose} onGameOver={handleTetrisGameOver} />
          </div>
        )}
        {lines.length > 0 &&
          (() => {
            const idx = lines.length - 1;
            const line = lines[idx];
            const hidePromptWhileTetris = showTetris && !sudoPasswordMode;
            return (
              <div
                className={`terminal-line${hidePromptWhileTetris ? ' terminal-line--tetris-offscreen' : ''}`}
                key={idx}
                aria-hidden={hidePromptWhileTetris ? true : undefined}
              >
                <span className="prompt">
                  {idx === lines.length - 1 && sudoPasswordMode
                    ? `${SUDO_PASSWORD_PROMPT} `
                    : `${PROMPT.replace('~', line.cwd || '~')} `}
                </span>
                {idx === lines.length - 1 ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', position: 'relative' }}>
                    <input
                      ref={inputRef}
                      className="terminal-input"
                      type={sudoPasswordMode ? 'password' : 'text'}
                      value={input}
                      onChange={handleInput}
                      onKeyDown={handleKeyDown}
                      autoFocus
                      autoComplete="off"
                      spellCheck={false}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'inherit',
                        font: 'inherit',
                        outline: 'none',
                        zIndex: 2,
                        width: input.length === 0 ? '1ch' : `${input.length}ch`,
                      }}
                    />
                    {autocomplete && <span className="autocomplete">{autocomplete}</span>}
                    <span className={showCursor ? 'rect-cursor' : 'rect-cursor hidden'}></span>
                  </span>
                ) : (
                  <span>{line.text}</span>
                )}
              </div>
            );
          })()}
      </div>
    </div>
  );
// CRT static overlay effect
function CRTStaticOverlay() {
  const canvasRef = useRef(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    let frame = 0;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const drawStatic = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      if (w < 1 || h < 1) {
        requestAnimationFrame(drawStatic);
        return;
      }
      canvas.width = w;
      canvas.height = h;
      const imgData = ctx.createImageData(w, h);
      for (let i = 0; i < imgData.data.length; i += 4) {
        const shade = Math.random() * 255;
        imgData.data[i] = shade;
        imgData.data[i+1] = shade;
        imgData.data[i+2] = shade;
        imgData.data[i+3] = 255;
      }
      ctx.putImageData(imgData, 0, 0);
      frame++;
      if (frame < 18) {
        requestAnimationFrame(drawStatic);
      } else {
        setTimeout(() => setVisible(false), 200);
      }
    };
    drawStatic();
    return () => setVisible(false);
  }, []);
  if (!visible) return null;
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        zIndex: 4000,
        pointerEvents: 'none',
        opacity: 0.92,
        filter: 'contrast(2) brightness(1.2)',
        transition: 'opacity 0.2s',
      }}
    />
  );
}
/**
 * NYC image — solid overlay (no ny-flicker opacity keyframes; those caused terminal↔image strobing).
 * Unmounts after a short beat; parent clears nonce via onEnd.
 */
function NYFlashShell({ onEnd }) {
  useEffect(() => {
    const id = setTimeout(() => onEnd(), 220);
    return () => clearTimeout(id);
  }, [onEnd]);
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        zIndex: 2000,
        pointerEvents: 'none',
        background: '#000',
        opacity: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <img
        src="https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=800&q=80"
        alt=""
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: 1,
          filter: 'contrast(1.5) grayscale(0.7) blur(1.5px)',
        }}
      />
    </div>
  );
}

}

// Matrix rain animation overlay (restricted to terminal window)
function MatrixRain({ targetId, accent }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    const w = rect.width;
    const h = rect.height;
    canvas.width = w;
    canvas.height = h;
    const fontSize = 22;
    const columns = Math.floor(w / fontSize);
    const drops = Array(columns).fill(1);
    const chars = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズヅブプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');
    function draw() {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(0, 0, w, h);
      ctx.font = fontSize + 'px monospace';
      ctx.fillStyle = accent || '#00ff41';
      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > h && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
      animationFrameId = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(animationFrameId);
  }, [targetId, accent]);
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        zIndex: 1000,
        pointerEvents: 'none',
        opacity: 0.85,
        filter: 'blur(0.5px)'
      }}
    />
  );
}

export default App;
