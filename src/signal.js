export function signal(defaultValue) {

    let _val = defaultValue;

    function value() {
        return _val; 
    }

    function setValue() {
        
    }

    return [ value, setValue ]
}