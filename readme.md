# Ayr.js

![Alt text](image.png)

Ayr.js is a reactivity model designed for simplicity.  No build tools.  No templating engines. Just HTML and Javascript.

## Installation

Install my-project with npm

```bash
  npm install my-project
  cd my-project
```

## Usage/Examples

The core of `Ayr.js` is the 'Ayr Component' (`AC`).  Ayr components are functions that take an Ayr config and translate that config object to reactive state.  The three core pieces of an Ayr component are: `root`, `state`, and `effects`. (Full API below)

| option | Description                |
| :-------- | :------------------------- |
| `root` | **Required**. Where the Ayr component should mount in the DOM |
| `state` | Reactive state variables |
| `effects` | Function that returns an functions that mutate `state` variables |


An example Ayr component:

```javascript
AC({
    root: '#my_component',
    state: {
        counter: 1,
    },
    effects: function() {
        return {
            incrementCounter: () => {
                this.state.counter  = this.state.counter + 1;
            }
        }
    }
})
```

This Ayr component will be mounted at the HTML element with `id="my_component"`, and has one reactive `state` value ('counter'), with one `effect` ('incrementCounter').

Ayr components also have a HTML counterparts - attributes on your HTML elements telling `Ayr.js` where to render.  Using the above Ayr component as an example, the corresponding HTML could look like this:

```html
<div id='my_component'>
    <button y-click="{incrementCounter}">Increment Value</button>
    <p>
        Counter value:
        <span y-data="{counter}"></span>
    </p>
</div>
```

Here you can see the `id="my_component"` (mirroring the `root` value of the `AC`), as well as two Ayr directives: `y-click` and `y-data`.
Whichever tag the `y-data` directive is attached to will render the value of the state variable passed.  In this case, the `counter` state variable will render its current value in the `span` tag.  The `y-click` directive is passed the 'incrementCounter' effect.  When the `button` element is clicked, the 'incrementCounter' effect is called.

The full example:

![Alt text](image-1.png)

```javascript
<!Doctype html>
<head>
    <script>
        AC({
            root: '#my_component',
            state: {
                counter: 1,
            },
            effects: function() {
                return {
                    incrementCounter: () => {
                        this.state.counter  = this.state.counter + 1;
                    }
                }
            }
        })
    </script>
</head>
<body>
    <div id='my_component'>
        <button y-click="{incrementCounter}">Increment Value</button>
        <p>
            Counter value:
            <span y-data="{counter}"></span>
        </p>
    </div>
</body>
```