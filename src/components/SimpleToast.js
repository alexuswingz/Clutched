import React, { useState, useEffect } from 'react';

const SimpleToast = ({ message, show, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  console.log('SimpleToast render - show:', show, 'message:', message);

  useEffect(() => {
    if (show) {
      console.log('SimpleToast: Showing toast with message:', message);
      setIsVisible(true);
      
      // Play notification sound
      playNotificationSound();
      
      // Auto-hide after 4 seconds
      const timer = setTimeout(() => {
        console.log('SimpleToast: Auto-hiding toast');
        setIsVisible(false);
        setTimeout(() => {
          onClose();
        }, 500);
      }, 4000);

      return () => {
        clearTimeout(timer);
      };
    } else {
      setIsVisible(false);
    }
  }, [show, message, onClose]);

  // Simple notification sound function
  const playNotificationSound = () => {
    try {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  };

  // Always render the component for debugging
  console.log('SimpleToast: About to render - show:', show, 'isVisible:', isVisible);

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm transition-all duration-400 ease-out ${
      isVisible 
        ? 'transform translate-x-0 opacity-100 scale-100 animate-valorant-slide-in' 
        : 'transform translate-x-full opacity-0 scale-95'
    }`}>
      <div className="relative group">
        {/* Valorant-themed background */}
        <div className="bg-gradient-to-br from-valorant-dark/95 to-gray-900/95 backdrop-blur-xl border border-valorant-red/30 rounded-lg shadow-xl overflow-hidden group-hover:shadow-valorant-red/20 group-hover:border-valorant-red/50 transition-all duration-300">
          {/* Valorant red accent border */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-valorant-red to-red-500"></div>
          
          {/* Main content */}
          <div className="relative p-3">
            <div className="flex items-center space-x-3">
              {/* Valorant-themed icon */}
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gradient-to-br from-valorant-red to-red-600 rounded-lg flex items-center justify-center shadow-md border border-valorant-red/30">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-white font-semibold text-sm tracking-wide uppercase">New Message</h3>
                    <div className="w-1.5 h-1.5 bg-valorant-red rounded-full animate-pulse shadow-md shadow-valorant-red/50"></div>
                  </div>
                  <span className="text-xs text-gray-400 font-mono bg-gray-800/40 px-1.5 py-0.5 rounded text-[10px]">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                <p className="text-gray-200 text-xs leading-tight line-clamp-2 break-words font-normal">
                  {message}
                </p>
              </div>
              
              {/* Valorant-themed close button */}
              <button
                onClick={() => {
                  setIsVisible(false);
                  setTimeout(() => {
                    onClose();
                  }, 300);
                }}
                className="flex-shrink-0 text-gray-400 hover:text-valorant-red hover:bg-valorant-red/10 rounded-md p-1.5 transition-all duration-200 group border border-transparent hover:border-valorant-red/30"
              >
                <svg className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        {/* Valorant red glow effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-valorant-red/15 to-red-500/15 rounded-lg blur opacity-50 -z-10"></div>
      </div>
    </div>
  );
};

export default SimpleToast;
