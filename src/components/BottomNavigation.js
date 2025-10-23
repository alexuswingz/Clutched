import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      path: '/home',
      icon: '🏠',
      label: 'Home',
      activeIcon: '🏠'
    },
    {
      path: '/chat',
      icon: '💬',
      label: 'Chat',
      activeIcon: '💬'
    },
    {
      path: '/profile',
      icon: '👤',
      label: 'Profile',
      activeIcon: '👤'
    }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-valorant-dark/95 backdrop-blur-lg border-t border-gray-700">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center py-2 px-4 transition-all duration-300 ${
              isActive(item.path)
                ? 'text-valorant-red'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span className="text-xl mb-1">
              {isActive(item.path) ? item.activeIcon : item.icon}
            </span>
            <span className="text-xs font-medium">{item.label}</span>
            {isActive(item.path) && (
              <div className="w-1 h-1 bg-valorant-red rounded-full mt-1"></div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default BottomNavigation;

