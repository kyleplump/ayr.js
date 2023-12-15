import './style.css'
import javascriptLogo from './javascript.svg'
import viteLogo from '/vite.svg'
import { setupCounter } from './counter.js'
import { RApp, sig, eff } from './rapp.js';
import { parse } from 'node-html-parser';


console.log('starting -----')
const [ counter, setCounter ] = sig(0);
eff(() => console.log('counter changed: ', counter()), [ counter ])

function increment() {
  console.log('calling increment', counter.prototype)
  const curr = counter()
  setCounter(curr + 1);
}

const template = `<button id="btn">increment</button>
<p>
  Counter value:
  <span r-dep="${counter.prototype.sigd}">
    ${counter()}
  </span>
</p>`


const app = RApp(template);

document.getElementById('btn').onclick = increment

