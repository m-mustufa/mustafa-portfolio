import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const siteScript = document.createElement('script');
siteScript.src = '/assets/js/style.js';
siteScript.defer = true;
document.head.appendChild(siteScript);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
