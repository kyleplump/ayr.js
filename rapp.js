import { parse } from 'node-html-parser';

const pairing = new Map();
const pairing2 = new Map();

export function RApp(mount) {
  const root = parse(mount);
  console.log('root: ', root)
  console.log('pariing: ', pairing)
  _parse(root)
  document.body.innerHTML = mount
}

export function sig(prim) {

  let _val = prim;
  const id = Math.random();

  function val() {
    console.log('called')
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
      if(pairing.has(Number(content))) {
        const updator = () => {
          const parent = document.getElementById(child.parentNode.id);
          const c = pairing2.get(Number(content))
          parent.innerHTML = c();
        }
        const currList = pairing.get(Number(content));
        pairing.set(Number(content), [ ...currList, updator ])
      }
    }
    else {
      _parse(child)
    }
  }
}
