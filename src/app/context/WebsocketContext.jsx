import React, { createContext, useContext, useEffect, useState } from 'react';
import { connectWS, api } from './api';

const WebSocketContext = createContext(null);

export function WebSocketProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Replace with your node's URL
    const wsUrl = 'wss://your-blockchain-node.com'; 
    
    // Pass a callback or modify your connectWS to tell the UI it's ready
    connectWS(wsUrl); 
    setIsConnected(true); 

    // Optional: Setup live event listener for global UI notifications
    const unsubscribe = api.subscribe((event, data) => {
      console.log(`Live Event: ${event}`, data);
      // You could update a global state or dispatch a toast here
    });

    return () => unsubscribe();
  }, []);

  return (
    <WebSocketContext.Provider value={{ isConnected, api }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export const useApi = () => useContext(WebSocketContext);
