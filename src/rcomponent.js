import { parse } from 'node-html-parser';
import { createSignal } from './signal';

// TODO
// can probably just use queryselector for this and not html parser
// somehow mirror gc.state whenever a signal is updated - avoid manually updating gc state

export function RComponent(config) {
  // TODO: bidirectional map ?
  const signals = new Map(); // { signalID: { dependencies: array, signal: signal Itself }}
  const signalNameToSignalIDMap = new Map(); // { signalTextName: signalID }
  const stateWithDependants = new Map(); // { stateTextName: array of dependant text names }
  let gc = config;
  const effects = gc.effects();
  let geffects = effects;

  // check for component dependants
  if(gc.dependants) {
    // array of properties listed in component state that are affected by the execution of 
    // a dependant
    let modifiedStates = [];

    // create proxy state w/ get accessor to determine which state vars
    // the dependants depend on
    const proxyState = new Proxy({  ...gc.state }, {
      get: function(target, p) {
        modifiedStates.push(p)
        return Reflect.get(...arguments)
      }
    });

    // bind proxy to dependants function
    const derived = gc.dependants.bind({ state: proxyState })();

    Object.keys(derived).forEach((dTextVal) => {      
      const derivedValue = derived[dTextVal]()
      // initialize the derived state as 'normal state' -> each subsequent update of state this dTextVal is derived from
      // will update gc.state with value from executed derived[dTextVal] function
      gc.state = { ...gc.state, [dTextVal]: derivedValue }

      modifiedStates.forEach((stateKey) => {
        const stateDependants = stateWithDependants.get(stateKey) || [];
        stateWithDependants.set(stateKey, [ ...stateDependants, dTextVal ])
      });
      // reset for subsequent dependant run
      modifiedStates = [];
    })
  }

  // read component declared state and create reactive state
  Object.keys(gc.state).forEach((stateEntry) => {
    // signals can get created in dependancy logic, and dependancy names appear in gc.state
    if(signalNameToSignalIDMap.get(stateEntry)) { return; }

    const signal = createSignal(config.state[stateEntry]); // create signal w/ provided default
    const signalID = signal[0].prototype.sigd; // get signal id off object proto
    signalNameToSignalIDMap.set(stateEntry, signalID);
    let signalDeps = [];

    // if this state key has dependancies associated with it
    if(stateWithDependants.get(stateEntry)) {

      const dependants = stateWithDependants.get(stateEntry);

      dependants.forEach((dependantName) => {
        const dependantSIGD = signalNameToSignalIDMap.get(dependantName);
        let dependantSignal;
        // create the reactive signal if not created on previous loop
        if(!dependantSIGD) {
          dependantSignal = createSignal(gc.state[dependantName]);
          // set in local map
          signals.set(dependantSignal[0].prototype.sigd, { dependencies: [], dependantSignal });
        }
        else {
          dependantSignal = signals.get(dependantSIGD);
        }
        
        // function to update dependant when state key value changes
        const dependantUpdator = () => {
          // TODO: update just a specific dependancy
          // re-run all dependants
          const derived = gc.dependants.bind({ state: {...gc.state} })();
          const v = derived[dependantName]();

          // update reactive data 
          dependantSignal[1](v, [])
          // update local state
          gc.state = { ...gc.state, [dependantName]: v }
        }
        signalDeps.push(dependantUpdator)
      });
    }

    signals.set(signalID, { dependencies: signalDeps, signal });
  })

  // parse html and hydrate with anchors for reactivity
  const documentMountPoint = document.querySelector(config.root)
  const parsedRoot = parse(documentMountPoint.innerHTML);
  const processedRoot = _parse(parsedRoot, geffects, gc.state)
  // re-write dom as dom w/ anchors
  documentMountPoint.innerHTML = processedRoot.toString();

  // initial run of all effects
  signals.forEach((signalData) => {
    for(let i = 0, len = signalData.dependencies.length; i < len; i ++) {
      const currdep = signalData.dependencies[i]
      currdep();
    }
  });
  
  function createUpdator(child) {
    // console.log("creating updator: ", child)
    const data = child.rawAttrs.split('r-data')[1].split("{")[1].split("}")[0].trim();
    const id = Math.random();
    if(child.rawAttrs.includes('data-rid')) {
      //update id (nested component roots?)
      const i = child.rawAttrs.split('data-rid="')[1].split('"')[0];
      child.rawAttrs = child.rawAttrs.replaceAll(i, id)
    }
    else {
      child.rawAttrs += ` data-rid="${id}"`;
    }

    // get sigd
    const sigd = signalNameToSignalIDMap.get(data);
    if(!sigd) return; // skip iteration for nested r-data possibilities

    const { signal, dependencies } = signals.get(sigd);
    // add manual updator
    const updator = () => {
      const element = document.querySelector(`[data-rid="${id}"]`)
      element.innerHTML = signal[0]();
    }

    if(!dependencies) return;
    dependencies.push(updator);
    signals.set(sigd, { signal, dependencies })

  }
  
  function _parse(root) {
    for(let i = 0; i < root.childNodes.length; i ++) {
      const child = root.childNodes[i]

      if(child.rawAttrs && child.rawAttrs.includes('r-data')) {
        createUpdator(child)
      }
      else if(child.rawAttrs && child.rawAttrs.includes('r-click')) {
        const handlerName = child.rawAttrs.split('r-click')[1].split("{")[1].split("}")[0].trim();
  
        if(Object.keys(geffects).includes(handlerName)) {

          const c = () => {
            // mutates the local gc.state closure variable, 'internal function state'
            geffects[handlerName].bind(gc.state)();
            console.log('calling c for: ', handlerName)
            // gc.state is updated here
            // TODO: only update the state that this effect mutates
            Object.keys(gc.state).forEach((s) => {
                const signalTextName = s; // create signal w/ provided default
                const f = signalNameToSignalIDMap.get(signalTextName);
                const { dependencies, signal } = signals.get(f);
                signal[1](gc.state[s], dependencies)
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
