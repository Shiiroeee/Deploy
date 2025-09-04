import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import Result from './tabs/Result'; 
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Information from './tabs/Information';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/result" element={<Result />} />
        <Route path="/information" element={<Information />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
