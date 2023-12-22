import { parse } from 'node-html-parser';

const pairing = new Map(); // dependencies { signalID: dependencyArray }
const signalToSigIDMap = new Map(); // { signalTextName: signalID }
const signalList = new Map()// {signalID: signal itself}

let state = {};


export function RApp(config) {
  console.log('config: ', config)
  state = config.state;

  Object.keys(state).forEach((s) => {
    console.log('state name: ', s)
    const signal = sig(state[s]); // create signal w/ provided default
    signalToSigIDMap.set(s, signal[0].prototype.sigd);
    signalList.set(signal[0].prototype.sigd, signal)
  })

  const t = document.querySelector(config.root)
  const root = parse(t.innerHTML);
  const p = _parse(root)
  t.innerHTML = p.toString();
  console.log('p: ', p.toString())
  // run all dependencies
  pairing.forEach((c, b) => {
    for(let i = 0, len = c.length; i < len; i ++) {
      const currdep = c[i]
      currdep();
    }
  })

}

export function sig(prim) {

  let _val = prim;
  const id = Math.random();

  function val() {
    console.log('called', id)
    return _val;
  }

  function setVal(newprim) {
    _val = newprim;
    console.log('setting called: ', pairing.get(id))
    // eval deps
    const currdeps = pairing.get(id)
    for(let i = 0, len = currdeps.length; i < len; i ++) {
      const currdep = currdeps[i]
      currdep();
      // window.document.body.innerHTML = window.document.body.innerHTML.replace(/{{(.*?)}}/g, _val)
    }
  }

  val.prototype.sigd = id;
  pairing.set(id, [])
  window.tester = val
  return [ val, setVal ]
}

export function eff(callback, dependencies) {
  for(let i = 0, len = dependencies.length; i < len; i ++) {
    const currdep = dependencies[i]
    const currList = pairing.get(currdep.prototype.sigd);
    pairing.set(currdep.prototype.sigd, [ ...currList, callback ])
  }
}

function _parse(root) {
  for(let i = 0; i < root.childNodes.length; i ++) {
    const child = root.childNodes[i]
    // console.log('checking child: ', child)
    if(child.rawAttrs && child.rawAttrs.includes('r-data')) {

      const data = child.rawAttrs.split('r-data')[1].split("{")[1].split("}")[0].trim();
      console.log('state is: ', data)
      const id = Math.random();
      child.rawAttrs += ` data-rid="${id}"`;

      // get sigd
      const sigd = signalToSigIDMap.get(data);
      const signalItself = signalList.get(sigd);

      // add manual updator
      const updator = () => {
        const element = document.querySelector(`[data-rid="${id}"]`)
        console.log('selector: ', `[data-rid="${id}"]`)
        element.innerHTML = signalItself[0]();
      }

      let signaldeps = pairing.get(sigd);
      signaldeps.push(updator);
      pairing.set(sigd, signaldeps)
    }
    else {
      _parse(child)
    }
  }

  return root
}
