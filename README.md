# zoll

A lightweight custom-element-like hook for use with existing frameworks.

zoll strives to be spec compatible where possible. For the implementation details please refer to [custom elements spec](https://w3c.github.io/webcomponents/spec/custom/)

## Installation

```sh
# NPM
npm install zoll

# Bower
bower install zoll
```

You can also include it directly on the webpage

```html
<script type="text/javascript" src="./dist/zoll.min.js"></script>
```

## Usage

### Creating a custom element with lifecycle callbacks

Let's assume we want to create a custom element <profile-picture>. The end goal is to use them directly on the page like this

```html
<profile-picture url="./image.png"> </profile-picture>
```
To do this, we need to define the element

```js
// since `custom-element-hook` doesn't actually alter any prototypes it's 
// necessary to specify utility functions as free-standing and pass the node  
// to them
function updateBg(node, url) {
    node.style.cssText = `background: url(${zoll.getAttribute(node, 'url')}); width: 200px; height: 200px;`;
}

// Defining the element in the custom element registry
zoll.define('profile-picture', {
    observedAttributes: ['url'],
    connectedCallback: function() {
        if (this.hasAttribute('url')) {
            updateBg(this, this.getAttribute('url'));
        }
    },
    disconnectedCallback: function() {
        console.log('disconnected');
    },
    attributeChangedCallback: function(attrName, oldValue, newValue) {
        if (attrName === 'url') {
            updateBg(this, newValue);
        }
    }
});

// creating and adding it to the DOM
const pic = zoll.create('profile-picture', {
    url: 'image.png'
});
zoll.appendChild(document.body, pic);
zoll.setAttribute(pic, 'url', 'image2.png');

zoll.remove(pic);
//output - disconnected
```

### Creating custom element using extends

Lets create a custom button element `<custom-button>` by extending it from default `<button>`.

```html
<custom-button>Click Me!</custom-button>
```

```js
zoll.define('custom-button', {
    extends: 'button',
    connectedCallback: function() {
        this.onclick = function(){
            console.log('Button Clicked');
        };
    },
    disconnectedCallback: function() {
        console.log('Button Removed');
    }
});

const btn = zoll.create('button', {
    is : 'custom-button',
    value: 'Click Me'
});
zoll.appendChild(document.body, btn);
```

### Upgrade

This allows progressive enhancement of the content in the custom element.

*index.html*
```html
<!DOCTYPE html>
<html lang="en">
<script type="text/javascript" src="dist/zoll.min.js"></script>
<body>
    <profile-picture url="image.png"></profile-picture>

    <script src= "main.js"></script>
</body>
```

*main.js*
```js
zoll.define('profile-picture', {
    // same as first example
});
// upgrade all the elements
zoll.connect(document.body);
```

once the *main.js* loads, it will define the `<profile-picture>` element and the existing `<profile-picture>` element will be upgraded, applying the custom element's definition (which will set the background image in our case).

**Note: The upgrade only apply to the elements in the document tree.**

## API

The library exposes a Zoll class where the below methods are defined.

#### define(tagName, options)
Defines a new custom element with the specified tag name and options. 

##### Options
+ `extends` extending a built in element or other custom Element.
+ `observedAttributes` array of attributes that triggers the attributeChangedCallback on modifications.
+ `attributeChangedCallback(attrName, oldValue, newValue)` gets called for all the `observedAttributes` of an element.
+ `connectedCallback` gets called when the element is inserted in to the document.
+ `disconnectedCallback`  gets called when the element is removed from the document.

---
#### create(tagName, attributes)
Simple wrapper around document.createElement, that can also set attributes in a batch without notifying the possible observers.

---
#### connect(root)
Simulates the connect process for custom elements in the given subtree calling defined lifecycle callbacks.

---
#### forceConnectNode(element)
Allows to manually notify when the element is inserted in document.

---
#### forceConnectChildren(element)
Allows to manually notify when the element's children is inserted in document.

---
#### forceDisconnectNode(element)
Allows to manually notify when the element is removed in document.

---
#### forceDisconnectChildren(element)
Allows to manually notify when the element's children is inserted in document.

---
#### forceNotifyAttributeChange(descriptor, el, attributeName, oldValue, attributeValue)
Allows to manually notify an element about the attribute change.

*This is useful for some libraries that manipulate DOM under you, like React.*

---
#### getDescriptor(node)
Retrives the element from the CustomElementRegistry if defined.

---
#### setAttribute(node, attributeName, attributeValue)
A proxy for native `setAttribute` that takes care of the observed attribute notifications.

---
#### removeAttribute(node, attributeName)
A proxy for native `removeAttribute` that takes care of the observed attribute notifications.

---
#### hasAttribute(node, attributeName)
A proxy for native `hasAttribute`.

---
#### getAttribute(node, attributeName)
A proxy for native `getAttribute`.

---
#### appendChild(parent, child)
A proxy for native `appendChild` that will notify about nodes connected to the document.

---
#### insertBefore(parent, child, reference)
A proxy for native `insertBefore` that will notify about nodes connected to the document.

---
#### remove(element)
Removes the node from it's parent if one exists.
