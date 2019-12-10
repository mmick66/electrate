import React from 'react';
import ReactDOM from 'react-dom';
import App from './app.js';
import 'babel-polyfill';

async function asyncTest () {
    let test = await myAsyncfunc();
    console.log(test);
}

async function myAsyncfunc () {
    return new Promise(resolve => {
        setTimeout(resolve("async/await now runs"), 1000);
    })
}

window.onload = () => {
    ReactDOM.render(<App />, document.getElementById('app'));
    asyncTest();
};
