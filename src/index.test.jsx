/* global require */
import { act } from 'react';

test('the entry renders App into #app as soon as the module runs', () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  document.body.innerHTML = '<div id="app"></div>';

  // A synchronous act flushes the render but gives the window no chance to
  // fire load, so this fails if the entry waits for it.
  act(() => {
    require('./index.jsx');
  });

  expect(document.querySelector('#app h2').textContent).toBe('Hello Electrate');
});
