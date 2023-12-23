import { parse } from 'node-html-parser';


export function RComponent(config) {
  const pairing = new Map(); // dependencies { signalID: dependencyArray }
  const signalToSigIDMap = new Map(); // { signalTextName: signalID }
  const signalList = new Map()// {signalID: signal itself}
  let gc = config;
  let state = {};
  const effects = gc.effects();

  let geffects = effects;

  state = config.state;

  console.log("config: ", config)
  // console.log('hello: ', config.effects().updateCounter())
  console.log('gc.state: ', gc.state)

  // REFLECTION STUFF --------------
  // for(let [key, value] of Object.entries(geffects)) {
  //   if(typeof value === 'function') {
  //     let fn =geffects[key];
  //     Object.assign(geffects, {
  //       [key]: function(...args) {
  //         // check 'this' value as deps
  //         console.log('this: ', this)
  //         Object.keys(this).forEach((k) => {
  //           console.log('foud state dep: ', k, signalToSigIDMap.get(k))
  //           const sigd = signalToSigIDMap.get(k)
  //           const actualSignal = signalList.get(sigd);
  //           console.log('actual signal: ', actualSignal)
  //         })
  //         console.log("in reflection!: ")
  //         return Reflect.apply(fn,geffects, args)
  //       }
  //     })
  //   }
  // }

  Object.keys(state).forEach((s) => {
    const signal = sig(state[s]); // create signal w/ provided default
    signalToSigIDMap.set(s, signal[0].prototype.sigd);
    signalList.set(signal[0].prototype.sigd, signal)
  })

  const t = document.querySelector(config.root)
  const root = parse(t.innerHTML);
  const p = _parse(root)
  t.innerHTML = p.toString();

  // run all dependencies
  pairing.forEach((c, b) => {
    for(let i = 0, len = c.length; i < len; i ++) {
      console.log('curr dep: ', c[i])
      const currdep = c[i]
      currdep();
    }
  })

  function sig(prim) {

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
      }
    }
  
    val.prototype.sigd = id;
    pairing.set(id, [])
    window.tester = val
    return [ val, setVal ]
  }
  
  function eff(callback, dependencies) {
    for(let i = 0, len = dependencies.length; i < len; i ++) {
      const currdep = dependencies[i]
      const currList = pairing.get(currdep.prototype.sigd);
      pairing.set(currdep.prototype.sigd, [ ...currList, callback ])
    }
  }
  
  function createUpdator(child) {
    console.log("create updator called for: ",child)
    const data = child.rawAttrs.split('r-data')[1].split("{")[1].split("}")[0].trim();
    const id = Math.random();
    if(child.rawAttrs.includes('data-rid')) {
      //update id (nested component roots?)
      const i = child.rawAttrs.split('data-rid="')[1].split('"')[0];
      child.rawAttrs = child.rawAttrs.replaceAll(i, id)
      console.log('new: ', child.rawAttrs)
    }
    else {
      child.rawAttrs += ` data-rid="${id}"`;
    }
    console.log("id: ", id)
    // get sigd
    const sigd = signalToSigIDMap.get(data);
    const signalItself = signalList.get(sigd);
  
    // add manual updator
    const updator = () => {
      // console.log("updater called")
      const element = document.querySelector(`[data-rid="${id}"]`)
  
      console.log('updator called', signalItself[0]() )
      console.log('e;lemetn: ', element, id)
      element.innerHTML = signalItself[0]();
    }
  
    let signaldeps = pairing.get(sigd);
    if(!signaldeps) return;
    signaldeps.push(updator);
    pairing.set(sigd, signaldeps)
  }
  
  function _parse(root) {
    for(let i = 0; i < root.childNodes.length; i ++) {
      const child = root.childNodes[i]
      // console.log('checking child: ', child)
      if(child.rawAttrs && child.rawAttrs.includes('r-data')) {
        createUpdator(child)
      }
      else if(child.rawAttrs && child.rawAttrs.includes('r-click')) {
        const data = child.rawAttrs.split('r-click')[1].split("{")[1].split("}")[0].trim();
        console.log('clickEvent: ', data, geffects)
  
        if(Object.keys(geffects).includes(data)) {
          console.log('child: ', geffects[data])
          const c = function() {
            console.log("ge: ", geffects)
            console.log('gc: ', gc.state)
  
            geffects[data].bind(gc.state)();
            // gc.state is updated here
  
            Object.keys(gc.state).forEach((s) => {
                const signalTextName = s; // create signal w/ provided default
                const f = signalToSigIDMap.get(signalTextName);
                const deps = pairing.get(f);
                const signalItself = signalList.get(f)
                signalItself[1](gc.state[s])
                console.log('f: ', deps)
                for(let i = 0; i < deps.length; i ++) {
                  deps[i]()
                }
            })
          }
          const fid = (Math.random() + 1).toString(36).substring(7);
  
          window[`${fid}`] = c;
          child.rawAttrs += ` onclick="${fid}()"`
        }
      }
      else {
        _parse(child)
      }
    }
  
    return root
  }
  
}
