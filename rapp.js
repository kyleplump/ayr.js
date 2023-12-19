import { parse } from 'node-html-parser';

const pairing = new Map();
const pairing2 = new Map();

export function RApp(mount) {
  const t = document.querySelector(mount)
  const root = parse(t.innerHTML);

  _parse(root)
  // document.body.innerHTML = mount
}

export function sig(prim) {

  let _val = prim;
  const id = Math.random();
  console.log('in signal: ', this)

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
  pairing2.set(id, val)
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

    if(child.childNodes.length === 0) {
      const content = child._rawText;
      console.log('child: ', child)
      console.log('parnet: ', child.parentNode.rawAttrs)
      if(child._rawText.includes('{{')) {
        const center = child._rawText.split('{{')[1].split('}}')[0]
        console.log('center: ', center)
        eval(center)
        
      }
      // if(child.parentNode.rawAttrs?.includes("r-dep")) {
      //   const key = child.parentNode.rawAttrs.split("=")[1].replaceAll('"', '')
      //   console.log('key: ', Number(key))
      //   if(pairing.has(Number(key))) {
      //     console.log('has paring')
      //     const updator = () => {
      //       const parent = document.querySelector(`[r-dep="${Number(key)}"]`);
      //       const c = pairing2.get(Number(key))
      //       parent.innerHTML = c();
      //     }
      //     const currList = pairing.get(Number(key));
      //     pairing.set(Number(key), [ ...currList, updator ])
      //   }
      // }
    }
    else {
      _parse(child)
    }
  }
}
