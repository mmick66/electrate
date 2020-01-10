import React from 'react';

export default class App extends React.Component {
    dummy = () => {
        // Just to test arrow functions
    }

    render() {
        return (
            <div className={'hello'}>
                <h2>Hello Electrate</h2>
                <img src="./assets/logo.png" />
                <h4>A basic Electron + React.js template</h4>
                <h4>Have Fun!</h4>
            </div>
        );
    }
}
