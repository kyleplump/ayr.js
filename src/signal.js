export function createSignal(initialValue) {

    let _val = initialValue;
    const id = Math.random();
  
    function val() {
      return _val;
    }
  
    // currently need to take in dependencies at update
    // to read local variables from calling RComponent - change
    // if ever publically available
    function setVal(newValue, dependencies) {
      _val = newValue;
      // eval deps
      for(let i = 0, len = dependencies.length; i < len; i ++) {
        const currdep = dependencies[i]
        currdep();
      }
    }
  
    val.prototype.sigd = id;
    return [ val, setVal ];
  }