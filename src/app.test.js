import React from 'react';
import App from './app';
import renderer from 'react-test-renderer';

test('App renders the welcome screen', () => {
    const root = renderer.create(<App />).root;

    const container = root.findByType('div');
    expect(container.props.className).toBe('hello');

    expect(root.findByType('h2').props.children).toBe('Hello Electrate');
    expect(root.findByType('img').props.src).toBe('./assets/logo.png');
    expect(root.findAllByType('h4').map(h4 => h4.props.children)).toEqual([
        'A basic Electron + React.js template',
        'Have Fun!',
    ]);
});
