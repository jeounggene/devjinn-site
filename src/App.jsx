

import { useRef, useState, useEffect } from 'react';
import './App.css';



const PROMPT = 'guest@devjinn:~$';
const PROJECTS = [
  { name: 'seechords.fly.dev', url: 'https://seechords.fly.dev/' }
];


const COMMANDS = [
  'help', 'ls', 'cd', 'projects', 'clear', 'echo', 'whoami', 'pwd', 'date', 'fortune', 'cowsay', 'neofetch', 'sudo', 'exit', 'matrix'
];

const EASTER_EGGS = {
  fortune: [
    'You will deploy a bug-free app today.',
    'The Matrix has you.',
    'All bugs are features in disguise.',
    '42 is the answer.',
    'Try turning it off and on again.'
  ],
  cowsay: [
    `<pre>  ________\n< mooo! >\n  --------\n         \   ^__^\n          \  (oo)\\_______\n             (__)\\       )\/\\\n                 ||----w |\n                 ||     ||</pre>`
  ],
  neofetch: [
    `<pre>      .---.        guest@devjinn\n     /     \\      -----------\n     | o_o |      OS: Matrix CRT\n     |:_/  |      Shell: /bin/bash\n    //   \\ \\     Uptime: ∞\n   (|     | )     Projects: 1\n  /'\\_   _/\\'\\    Terminal: CRT.js\n  \___)=(___/     Theme: Green/Black</pre>`
  ],
  sudo: [
    'Nice try. You have no power here.'
  ],
  exit: [
    'We can never leave the Matrix.'
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
  const [showNY, setShowNY] = useState(false);
  const [showCRTOff, setShowCRTOff] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const blink = setInterval(() => setShowCursor(c => !c), 900);
    return () => clearInterval(blink);
  }, []);

  // Autocomplete logic
  useEffect(() => {
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
  }, [input]);

  function handleInput(e) {
    setInput(e.target.value);
    setHistoryIdx(-1);
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowUp') {
      if (history.length === 0) return;
      let idx = historyIdx === -1 ? history.length - 1 : Math.max(0, historyIdx - 1);
      setInput(history[idx]);
      setHistoryIdx(idx);
      return;
    }
    if (e.key === 'ArrowDown') {
      if (history.length === 0) return;
      let idx = historyIdx === -1 ? history.length - 1 : Math.min(history.length - 1, historyIdx + 1);
      if (idx === history.length - 1) {
        setInput('');
        setHistoryIdx(-1);
      } else {
        setInput(history[idx]);
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
      switch (cmd) {
        case 'matrix':
          setShowMatrix(true);
          output = ['Welcome to the Matrix...'];
          setTimeout(() => {
            setShowMatrix(false);
            setShowNY(true);
            setTimeout(() => {
              setShowNY(false);
              // Generate a string of illegible machine code-like characters
              const illegibleChars = () => {
                const pool =
                  '█▓▒░■□▲▼◆◇○●◎◉◍◌◙◘◦☠☢☣☤☥☦☧☨☩☪☫☬☭☮☯☸☹☺☻☼☽☾☿♀♂♁♠♣♥♦♪♫♬♭♯⚡⚠⚫⚪⚰⚱⛧⛨⛩⛪⛲⛳⛴⛵⛶⛷⛸⛹⛺⛻⛼⛽⛾⛿' +
                  String.fromCharCode(...Array(128).fill(0).map((_,i)=>i+33));
                let out = '';
                for (let i = 0; i < 32; i++) {
                  out += pool[Math.floor(Math.random() * pool.length)];
                  if ((i+1) % 8 === 0 && i !== 31) out += ' ';
                }
                return out;
              };
              setLines(l => ([...l, { type: 'error', text: `FATAL ERROR: SYSTEM BREACH DETECTED AT [${illegibleChars()}]`, cwd: nextCwd }]));
              setShowCRTOff(true);
              setTimeout(() => {
                setShowCRTOff(false);
                setLines([{ type: 'prompt', text: '', cwd: nextCwd }]);
                setInput('');
              }, 700 + 400); // 0.7s static + 0.4s pause
            }, 120);
          }, 900);
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
          setLines([{ type: 'prompt', text: '', cwd: nextCwd }]);
          setInput('');
          return;
        case 'projects':
          output = ['Projects:', ...PROJECTS.map(p => `<a href="${p.url}" target="_blank" rel="noopener noreferrer">${p.name}</a>`)];
          break;
        case 'date':
          output = [new Date().toString()]; break;
        case 'fortune':
          output = [EASTER_EGGS.fortune[Math.floor(Math.random()*EASTER_EGGS.fortune.length)]]; break;
        case 'cowsay':
          output = EASTER_EGGS.cowsay; break;
        case 'neofetch':
          output = EASTER_EGGS.neofetch; break;
        case 'sudo':
          output = EASTER_EGGS.sudo; break;
        case 'exit':
          output = EASTER_EGGS.exit; break;
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

  // Use a unique key for NYFlicker to force remount
  const [nyKey, setNyKey] = useState(0);
  useEffect(() => {
    if (showNY) setNyKey(k => k + 1);
  }, [showNY]);

  return (
    <div className="matrix-terminal" onClick={() => inputRef.current?.focus()}>
      <div className="terminal-screen" id="terminal-screen">
        {showMatrix && <MatrixRain targetId="terminal-screen" />}
        {showNY && <NYFlicker key={nyKey} />}
        {showCRTOff && <CRTStaticOverlay />}
        {lines.map((line, idx) => (
          line.type === 'prompt' ? (
            <div className="terminal-line" key={idx}>
              <span className="prompt">{PROMPT.replace('~', line.cwd || '~')} </span>
              {idx === lines.length - 1 ? (
                <span style={{display:'inline-flex',alignItems:'center',position:'relative'}}>
                  <input
                    ref={inputRef}
                    className="terminal-input"
                    value={input}
                    onChange={handleInput}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    spellCheck={false}
                    style={{background:'transparent',border:'none',color:'inherit',font:'inherit',outline:'none',zIndex:2,width: input.length === 0 ? '1ch' : `${input.length}ch`}}
                  />
                  {autocomplete && <span className="autocomplete">{autocomplete}</span>}
                  <span className={showCursor ? 'rect-cursor' : 'rect-cursor hidden'}></span>
                </span>
              ) : (
                <span>{line.text}</span>
              )}
            </div>
          ) : line.type === 'error' ? (
            <div className="terminal-line error-output" key={idx}>{line.text}</div>
          ) : (
            <div className="terminal-line output" key={idx} dangerouslySetInnerHTML={{__html: line.text}}></div>
          )
        ))}
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
      const w = canvas.width = canvas.offsetWidth;
      const h = canvas.height = canvas.offsetHeight;
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
function NYFlicker() {
  return (
    <div style={{
      position: 'absolute',
      left: 0,
      top: 0,
      width: '100%',
      height: '100%',
      zIndex: 2000,
      pointerEvents: 'none',
      background: '#000',
      animation: 'ny-flicker 0.35s',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <img src="https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=800&q=80" alt="NYC" style={{width:'100%',height:'100%',objectFit:'cover',opacity:0.7,filter:'contrast(1.5) grayscale(0.7) blur(1.5px)'}} />
    </div>
  );
}

}

// Matrix rain animation overlay (restricted to terminal window)
function MatrixRain({ targetId }) {
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
      ctx.fillStyle = '#00ff41';
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
  }, [targetId]);
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
