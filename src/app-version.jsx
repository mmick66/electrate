import { useEffect, useState } from 'react';

// The app version, asked of the main process over IPC through the narrow
// window.electrate.getVersion() that preload.js exposes.
export default function AppVersion() {
  const [version, setVersion] = useState(null);

  useEffect(() => {
    let current = true;
    window.electrate.getVersion().then((answer) => {
      if (current) {
        setVersion(answer);
      }
    });
    return () => {
      current = false;
    };
  }, []);

  return version && <p className={'version'}>Version {version}</p>;
}
