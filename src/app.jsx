import { useState } from 'react';

export default function App() {
    const [clicks, setClicks] = useState(0);

    return (
        <div className={'hello'}>
            <h2>Hello Electrate</h2>
            <img src="./assets/logo.png" alt="Electrate logo" />
            <h4>A basic Electron + React.js template</h4>
            <h4>Have Fun!</h4>
            <button onClick={() => setClicks(clicks + 1)}>
                Count: {clicks}
            </button>
        </div>
    );
}
