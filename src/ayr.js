import { parse } from "node-html-parser";
import { createSignal } from "./signal";

export function AC(config) {
  const signals = new Map(); // { signalID: { dependencies: array, signal: signal Itself }}
  const signalNameToSignalIDMap = new Map(); // { signalTextName: signalID }
  const stateWithDependants = new Map(); // { stateTextName: array of dependant text names }
  let gc = config;
  const effects = gc.effects();
  let geffects = effects;

  // check for component dependants
  if (gc.dependants) {
    // array of properties listed in component state that are affected by the execution of
    // a dependant
    let modifiedStates = [];

    // create proxy state w/ get accessor to determine which state vars
    // the dependants depend on
    const proxyState = new Proxy(
      { ...gc.state },
      {
        get: function (target, p) {
          modifiedStates.push(p);
          return Reflect.get(...arguments);
        },
      },
    );

    // bind proxy to dependants function
    const derived = gc.dependants.bind({ state: proxyState })();

    Object.keys(derived).forEach((dTextVal) => {
      const derivedValue = derived[dTextVal]();
      // initialize the derived state as 'normal state' -> each subsequent update of state this dTextVal is derived from
      // will update gc.state with value from executed derived[dTextVal] function
      gc.state = { ...gc.state, [dTextVal]: derivedValue };

      modifiedStates.forEach((stateKey) => {
        const stateDependants = stateWithDependants.get(stateKey) || [];
        stateWithDependants.set(stateKey, [...stateDependants, dTextVal]);
      });
      // reset for subsequent dependant run
      modifiedStates = [];
    });
  }

  // read component declared state and create reactive state
  Object.keys(gc.state).forEach((stateEntry) => {
    // signals can get created in dependancy logic, and dependancy names appear in gc.state
    if (signalNameToSignalIDMap.get(stateEntry)) {
      return;
    }

    const signal = createSignal(config.state[stateEntry]); // create signal w/ provided default
    const signalID = signal[0].prototype.sigd; // get signal id off object proto
    signalNameToSignalIDMap.set(stateEntry, signalID);
    let signalDeps = [];

    // if this state key has dependancies associated with it
    if (stateWithDependants.get(stateEntry)) {
      const dependants = stateWithDependants.get(stateEntry);

      dependants.forEach((dependantName) => {
        const dependantSIGD = signalNameToSignalIDMap.get(dependantName);
        let dependantSignal;
        // create the reactive signal if not created on previous loop
        if (!dependantSIGD) {
          dependantSignal = createSignal(gc.state[dependantName]);
          // set in local map
          signals.set(dependantSignal[0].prototype.sigd, {
            dependencies: [],
            dependantSignal,
          });
        } else {
          dependantSignal = signals.get(dependantSIGD);
        }

        // function to update dependant when state key value changes
        const dependantUpdator = () => {
          // re-run all dependants
          const derived = gc.dependants.bind({ state: { ...gc.state } })();
          const v = derived[dependantName]();

          // update reactive data
          dependantSignal[1](v, []);
          // update local state
          gc.state = { ...gc.state, [dependantName]: v };
        };
        signalDeps.push(dependantUpdator);
      });
    }

    signals.set(signalID, { dependencies: signalDeps, signal });
  });

  // parse html and hydrate with anchors for reactivity
  const documentMountPoint = document.querySelector(config.root);
  const parsedRoot = parse(documentMountPoint.innerHTML);

  const processedRoot = _parse(parsedRoot, geffects, gc.state);
  // re-write dom as dom w/ anchors
  documentMountPoint.innerHTML = processedRoot.removeWhitespace().toString();

  // initial run of all effects
  signals.forEach((signalData) => {
    for (let i = 0, len = signalData.dependencies.length; i < len; i++) {
      const currdep = signalData.dependencies[i];
      currdep();
    }
  });

  console.log("-- Ayr Mount --");

  function createUpdator(child) {
    const data = child.rawAttrs
      .split("y-data")[1]
      .split("{")[1]
      .split("}")[0]
      .trim();
    const id = generateUID();
    if (child.rawAttrs.includes("data-yid")) {
      //update id (nested component roots?)
      const i = child.rawAttrs.split('data-yid="')[1].split('"')[0];
      child.rawAttrs = child.rawAttrs.replaceAll(i, id);
    } else {
      child.rawAttrs += ` data-yid="${id}"`;
    }

    // get sigd
    const sigd = signalNameToSignalIDMap.get(data);
    if (!sigd) return; // skip iteration for nested y-data possibilities

    const { signal, dependencies } = signals.get(sigd);
    // add manual updator
    const updator = () => {
      const element = document.querySelector(`[data-yid="${id}"]`);
      element.innerHTML = signal[0]();
    };
    if (!dependencies) return;
    dependencies.push(updator);
    signals.set(sigd, { signal, dependencies });
  }

  function _parse(root) {
    for (let i = 0; i < root.childNodes.length; i++) {
      let child = root.childNodes[i];
      if (child.rawAttrs) {
        // data binding
        if (child.rawAttrs.includes("y-data")) {
          createUpdator(child);
        }
        // conditional rendering
        if (child.rawAttrs.includes("y-if")) {
          const data = child.rawAttrs
            .split("y-if")[1]
            .split("{")[1]
            .split("}")[0]
            .trim();
          const id = generateUID();
          child.rawAttrs += ` data-yif="${id}"`;

          const sigd = signalNameToSignalIDMap.get(data);
          const { signal, dependencies } = signals.get(sigd);

          const visibleDependency = () => {
            const signalValue = signal[0]();
            const element = document.querySelector(`[data-yif="${id}"]`);
            if (element) {
              if (signalValue) {
                element.style.removeProperty("display");
              } else {
                element.style.display = "none";
              }
            }
          };

          dependencies.push(visibleDependency);
          signals.set(sigd, { signal, dependencies });
        }
        // loops
        if (child.rawAttrs.includes("y-for")) {
          const data = child.rawAttrs
            .split("y-for")[1]
            .split("{")[1]
            .split("}")[0]
            .trim();
          const stateName = data.split("in")[1].trim();
          const loopvar = data.split("in")[0].trim();
          const id = Math.random();
          child.rawAttrs += ` data-yf="${id}"`;

          const sigd = signalNameToSignalIDMap.get(stateName);
          const { signal, dependencies } = signals.get(sigd);

          const looperDependency = () => {
            const data = child.rawAttrs.split("data-yf=")[1].split('"')[1];
            const element = document.querySelector(`[data-yf="${data}"]`);
            const values = signal[0]();
            let modifiedChildNodes = [];

            child.childNodes.forEach((c) => {
              if (c.rawAttrs && c.rawAttrs.includes(`y-data="{${loopvar}}"`)) {
                values.forEach((val) => {
                  if (!c.rawAttrs.includes(`data-yfp="${val}"`)) {
                    const n = c.clone();
                    n.set_content(val);
                    modifiedChildNodes.push(n);
                  }
                });
              } else {
                modifiedChildNodes.push(c);
              }
            });
            child.childNodes = modifiedChildNodes;

            element.innerHTML = child.removeWhitespace().toString();
          };

          dependencies.push(looperDependency);
          signals.set(sigd, { signal, dependencies });
        }

        const events = [
          "click",
          "change",
          "keydown",
          "keyup",
          "mouseover",
          "mouseout",
        ];

        for (let i = 0, len = events.length; i < len; i++) {
          const ev = events[i];

          if (child.rawAttrs.includes(`y-${ev}`)) {
            child = bindEvent(child, ev);
          }
        }
        _parse(child);
      } else {
        _parse(child);
      }
    }

    return root;
  }

  function bindEvent(node, eventName) {
    const handlerName = node.rawAttrs
      .split(`y-${eventName}`)[1]
      .split("{")[1]
      .split("}")[0]
      .trim();

    if (!Object.keys(geffects).includes(handlerName)) {
      return;
    }
    const fid = generateUID();

    const c = (e) => {
      // mutates the local gc.state closure variable, 'internal function state'
      geffects[handlerName].bind(gc.state)(e);

      Object.keys(gc.state).forEach((s) => {
        const signalTextName = s; // create signal w/ provided default
        const f = signalNameToSignalIDMap.get(signalTextName);
        const { dependencies, signal } = signals.get(f);
        signal[1](gc.state[s], dependencies);
      });
    };

    window[`${fid}`] = c;
    node.rawAttrs += ` on${eventName}="${fid}(event)"`;
    return node;
  }

  function generateUID() {
    const unique = (Math.random() + 1).toString(36).substring(7);
    return `y${unique}`;
  }
}
