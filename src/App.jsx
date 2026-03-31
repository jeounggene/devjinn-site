
import './App.css'

function App() {
  return (
    <div className="terminal-container">
      <div className="terminal-bar">
        <span className="dot red"></span>
        <span className="dot yellow"></span>
        <span className="dot green"></span>
      </div>
      <div className="terminal-content">
        <pre className="terminal-line">$ Hi im jinn and I like to make apps<span className="blinking-cursor">|</span></pre>
        <pre className="terminal-line">$ Projects</pre>
        <ul className="terminal-list">
          <li>
            <a href="https://seechords.fly.dev/" target="_blank" rel="noopener noreferrer">seechords.fly.dev</a>
          </li>
        </ul>
      </div>
    </div>
  )
}

export default App
