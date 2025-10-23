import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { resetDatabase, findDeveloperAccount, createDeveloperAccount, updateAlexusKarlAvatar } from '../firebase/services/resetService';
import { testNotification } from '../firebase/services/messageSyncManager';

const LoginScreen = () => {
  const navigate = useNavigate();
  const [isResetting, setIsResetting] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [resetResult, setResetResult] = useState(null);

  const handleResetDatabase = async () => {
    setIsResetting(true);
    setResetResult(null);
    
    try {
      console.log('Starting database reset...');
      const result = await resetDatabase();
      
      if (result.success) {
        setResetResult({
          success: true,
          message: 'Database reset successfully! You are now logged in as Alexus Karl.',
          details: result.results,
          developerData: result.results.developer.developerData
        });
        console.log('Database reset completed:', result);
        
        // Auto-login as developer account
        setTimeout(() => {
          handleLoginAsDeveloper(result.results.developer.developerData);
        }, 2000); // Wait 2 seconds to show the success message
      } else {
        setResetResult({
          success: false,
          message: 'Database reset failed: ' + result.error?.message,
          details: null
        });
      }
    } catch (error) {
      console.error('Error during database reset:', error);
      setResetResult({
        success: false,
        message: 'Database reset failed: ' + error.message,
        details: null
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleLoginAsDeveloper = (developerData) => {
    console.log('Auto-logging in as developer:', developerData);
    
    // Clear any existing cache first
    localStorage.removeItem('clutched_user');
    localStorage.removeItem('clutched_hasProfile');
    
    // Clear swiped users data
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('clutched_swiped_')) {
        localStorage.removeItem(key);
      }
    });
    
    // Save developer account to localStorage
    localStorage.setItem('clutched_user', JSON.stringify(developerData));
    localStorage.setItem('clutched_hasProfile', 'true');
    
    // Force page reload to bypass cache validation
    window.location.href = '/home';
  };

  const handleLoginToDeveloper = async () => {
    setIsLoggingIn(true);
    setResetResult(null);
    
    try {
      console.log('Looking for existing developer account...');
      const result = await findDeveloperAccount();
      
      if (result.success) {
        setResetResult({
          success: true,
          message: 'Found existing developer account! Logging in as Alexus Karl.',
          details: null,
          developerData: result.developerData
        });
        
        // Auto-login as developer account
        setTimeout(() => {
          handleLoginAsDeveloper(result.developerData);
        }, 2000);
      } else {
        setResetResult({
          success: false,
          message: 'No existing developer account found. Please create one or reset the database.',
          details: null
        });
      }
    } catch (error) {
      console.error('Error during login:', error);
      setResetResult({
        success: false,
        message: 'Login failed: ' + error.message,
        details: null
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleCreateDeveloper = async () => {
    setIsLoggingIn(true);
    setResetResult(null);
    
    try {
      console.log('Creating developer account...');
      const result = await createDeveloperAccount();
      
      if (result.success) {
        setResetResult({
          success: true,
          message: 'Developer account created successfully! Logging in as Alexus Karl.',
          details: null,
          developerData: result.developerData
        });
        
        // Auto-login as developer account
        setTimeout(() => {
          handleLoginAsDeveloper(result.developerData);
        }, 2000);
      } else {
        setResetResult({
          success: false,
          message: 'Failed to create developer account: ' + result.error?.message,
          details: null
        });
      }
    } catch (error) {
      console.error('Error creating developer account:', error);
      setResetResult({
        success: false,
        message: 'Failed to create developer account: ' + error.message,
        details: null
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDirectLogin = () => {
    console.log('Direct login as developer (bypassing Firebase check)...');
    
    // Create developer data locally
    const developerData = {
      id: 'dev_1761178419119',
      username: 'Alexus Karl',
      email: 'alexus@clutched.app',
      avatar: '/images/jett.jpg',
      agentImage: '/images/jett.jpg',
      rank: 'Radiant',
      level: 420,
      favoriteAgent: 'Jett',
      bio: 'Looking for my duo partner in crime! 🔥',
      location: 'Los Angeles, CA',
      age: 25,
      gender: 'Female',
      isDeveloper: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setResetResult({
      success: true,
      message: 'Direct login successful! Accessing developer account from any device.',
      details: null,
      developerData: developerData
    });
    
    // Auto-login as developer account
    setTimeout(() => {
      handleLoginAsDeveloper(developerData);
    }, 2000);
  };

  const handleUpdateAvatar = async () => {
    setIsLoggingIn(true);
    setResetResult(null);
    
    try {
      console.log('Updating Alexus Karl avatar...');
      const result = await updateAlexusKarlAvatar();
      
      if (result.success) {
        setResetResult({
          success: true,
          message: 'Alexus Karl avatar updated successfully! Now using Jett profile picture.',
          details: null
        });
      } else {
        setResetResult({
          success: false,
          message: 'Failed to update avatar: ' + result.error?.message,
          details: null
        });
      }
    } catch (error) {
      console.error('Error updating avatar:', error);
      setResetResult({
        success: false,
        message: 'Failed to update avatar: ' + error.message,
        details: null
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoToApp = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-valorant-dark flex items-center justify-center animate-fade-in" style={{ height: '100vh', height: '100dvh' }}>
      <div className="max-w-md w-full mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <img 
            src="/images/header.png" 
            alt="Clutched" 
            className="h-12 w-auto mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-white mb-2">Developer Panel</h1>
          <p className="text-gray-400">Database Management & Reset</p>
        </div>

        {/* Login to Developer Account Card */}
        <div className="valorant-card rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Login to Developer Account</h2>
          <p className="text-gray-400 mb-6">
            Login to an existing developer account (Alexus Karl) without resetting the database.
          </p>
          
          <button
            onClick={handleLoginToDeveloper}
            disabled={isLoggingIn}
            className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 ${
              isLoggingIn
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 hover:scale-105'
            }`}
          >
            {isLoggingIn ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Logging In...
              </div>
            ) : (
              'Login as Alexus Karl'
            )}
          </button>
          
          <button
            onClick={handleCreateDeveloper}
            disabled={isLoggingIn}
            className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 mt-3 ${
              isLoggingIn
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 hover:scale-105'
            }`}
          >
            {isLoggingIn ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Creating...
              </div>
            ) : (
              'Create Developer Account'
            )}
          </button>
          
          <button
            onClick={handleDirectLogin}
            disabled={isLoggingIn}
            className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 mt-3 ${
              isLoggingIn
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700 hover:scale-105'
            }`}
          >
            {isLoggingIn ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Logging in...
              </div>
            ) : (
              '🚀 Direct Login (Any Device)'
            )}
          </button>
          
          <button
            onClick={handleUpdateAvatar}
            disabled={isLoggingIn}
            className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 mt-3 ${
              isLoggingIn
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-orange-600 hover:bg-orange-700 hover:scale-105'
            }`}
          >
            {isLoggingIn ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Updating...
              </div>
            ) : (
              '🖼️ Update Avatar to Jett'
            )}
          </button>
          
          <button
            onClick={testNotification}
            className="w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 mt-3 bg-cyan-600 hover:bg-cyan-700 hover:scale-105"
          >
            🔔 Test Notification
          </button>
        </div>

        {/* Advanced Options - Collapsible */}
        <details className="valorant-card rounded-2xl p-6 mb-6">
          <summary className="text-xl font-bold text-white mb-4 cursor-pointer hover:text-valorant-red transition-colors">
            ⚙️ Advanced Options
          </summary>
          
          <div className="mt-4 space-y-4">
            {/* Reset Database Card */}
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4">
              <h3 className="text-lg font-bold text-red-400 mb-2">⚠️ Database Reset</h3>
              <p className="text-gray-400 mb-4 text-sm">
                This will completely reset the database, clearing all users, messages, and matches. 
                A new developer account (Alexus Karl) will be created automatically.
              </p>
              <button
                onClick={handleResetDatabase}
                disabled={isResetting}
                className={`w-full py-2 px-4 rounded-lg font-semibold transition-all duration-300 text-sm ${
                  isResetting
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-valorant-red hover:bg-red-600 hover:scale-105'
                }`}
              >
                {isResetting ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Resetting Database...
                  </div>
                ) : (
                  'Reset Database'
                )}
              </button>
            </div>
          </div>
        </details>

        {/* Reset Result */}
        {resetResult && (
          <div className={`valorant-card rounded-2xl p-6 mb-6 ${
            resetResult.success ? 'border-green-500' : 'border-red-500'
          }`}>
            <div className="flex items-center mb-4">
              <span className="text-2xl mr-3">
                {resetResult.success ? '✅' : '❌'}
              </span>
              <h3 className={`text-lg font-bold ${
                resetResult.success ? 'text-green-400' : 'text-red-400'
              }`}>
                {resetResult.success ? 'Success!' : 'Error'}
              </h3>
            </div>
            <p className="text-white mb-4">{resetResult.message}</p>
            
            {resetResult.success && (
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin mr-3"></div>
                  <p className="text-green-300 font-semibold">
                    Auto-logging in as Developer account...
                  </p>
                </div>
              </div>
            )}
            
            {resetResult.details && (
              <div className="bg-gray-800 rounded-lg p-4 text-sm">
                <h4 className="text-gray-300 font-semibold mb-2">Reset Details:</h4>
                <div className="space-y-1 text-gray-400">
                  <p>• Messages cleared: {resetResult.details.messages?.deletedCount || 0}</p>
                  <p>• Users cleared: {resetResult.details.users?.deletedCount || 0}</p>
                  <p>• Matches cleared: {resetResult.details.matches?.deletedCount || 0}</p>
                  <p>• Developer account: {resetResult.details.developer?.success ? 'Created & Auto-login' : 'Failed'}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex space-x-4">
          <button
            onClick={handleGoToApp}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            Go to App
          </button>
        </div>

        {/* Developer Info */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            Hidden Developer Route - /login
          </p>
          <p className="text-gray-600 text-xs mt-1">
            Use this route to reset the database and create developer accounts
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;