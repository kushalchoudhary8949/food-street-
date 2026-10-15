import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import App from './App';
import './index.css';
createRoot(document.getElementById('root')).render(_jsxs(StrictMode, { children: [_jsx(App, {}), _jsx(Analytics, {})] }));
