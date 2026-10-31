import React from 'react';
import { HunterProvider } from './context/HunterContext';
import { Layout } from './components/layout/Layout';

export function App() {
  return (
    <HunterProvider>
      <Layout />
    </HunterProvider>
  );
}

export default App;

