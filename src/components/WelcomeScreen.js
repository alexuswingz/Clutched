import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const WelcomeScreen = ({ onProfileCreate }) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: '',
    location: '',
    favoriteAgent: 'Jett',
    bio: '',
    rank: 'Gold'
  });
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newUserId = `user_${Date.now()}`; // Generate unique ID
    const userData = {
      id: newUserId,
      username: formData.name,
      email: `${formData.name.toLowerCase()}@clutched.app`,
      avatar: `/images/${formData.favoriteAgent.toLowerCase()}.jpg`,
      rank: formData.rank,
      level: Math.floor(Math.random() * 200) + 1,
      favoriteAgent: formData.favoriteAgent,
      bio: formData.bio,
      location: formData.location,
      age: parseInt(formData.age),
      gender: formData.gender
    };
    
    onProfileCreate(userData);
    navigate('/home');
  };

  if (!showForm) {
  return (
    <div className="min-h-screen bg-valorant-dark flex flex-col relative overflow-hidden animate-fade-in" style={{ minHeight: '100vh', minHeight: '100dvh' }}>
      {/* Background Video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover blur-sm"
      >
        <source src="/video/background-vid.mp4" type="video/mp4" />
      </video>
      
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/60"></div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-center p-4 pt-8 pb-4">
        <img 
          src="/images/header.png" 
          alt="Clutched" 
          className="h-8 w-auto"
        />
      </div>

       {/* Welcome Content - Empty for video background */}
       <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12">
         {/* Empty space to showcase video background */}
       </div>

       {/* Bottom Section - Aesthetic Design */}
       <div className="relative z-10 px-6 pb-8">
         <div className="w-full max-w-sm mx-auto">
           {/* Logo and Text Group */}
           <div className="mb-8 text-center">
             <img 
               src="/images/logo.png" 
               alt="Clutched" 
               className="w-20 h-20 drop-shadow-2xl mx-auto mb-3"
             />
             <p className="text-gray-400 text-sm font-medium tracking-wide uppercase mb-2">Valorant Dating App</p>
             <p className="text-valorant-red text-lg font-semibold italic tracking-wide">
               "The only clutch that hits diff."
             </p>
           </div>
           
           {/* Continue Button with Enhanced Design */}
           <button
             onClick={() => setShowForm(true)}
             className="group relative w-full bg-gradient-to-r from-valorant-red to-red-600 hover:from-red-600 hover:to-valorant-red text-white font-bold py-4 px-8 rounded-2xl transition-all duration-500 transform hover:scale-105 shadow-2xl hover:shadow-valorant-red/50 overflow-hidden"
           >
             <span className="relative z-10 flex items-center justify-center">
               Get Started
             </span>
             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
           </button>
         </div>
       </div>
    </div>
  );
  }

  return (
    <div className="min-h-screen bg-valorant-dark flex flex-col animate-fade-in" style={{ minHeight: '100vh', minHeight: '100dvh' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 pt-8 pb-4 flex-shrink-0">
        <button
          onClick={() => setShowForm(false)}
          className="text-valorant-red hover:text-red-400 transition-colors text-xl"
        >
          ←
        </button>
        <div className="flex-1 flex justify-center">
          <img 
            src="/images/header.png" 
            alt="Clutched" 
            className="h-8 w-auto"
          />
        </div>
        <div className="w-8"></div>
      </div>

      {/* Form Content - Scrollable */}
      <div className="flex-1 px-4 sm:px-6 py-4 overflow-y-auto">
        {/* Form Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create Your Profile</h1>
          <p className="text-gray-400 text-lg">Tell us about yourself to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 pb-8">
          {/* Row 1: Name and Age */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-300">
                Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-3 sm:py-4 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-valorant-red focus:border-valorant-red transition-all duration-300 backdrop-blur-sm text-base"
                placeholder="Your name"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-300">
                Age
              </label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleInputChange}
                className="w-full px-4 py-3 sm:py-4 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-valorant-red focus:border-valorant-red transition-all duration-300 backdrop-blur-sm text-base"
                placeholder="Age"
                min="18"
                max="100"
                required
              />
            </div>
          </div>

          {/* Row 2: Gender */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-300">
              Gender
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({...formData, gender: 'Male'})}
                className={`px-4 sm:px-6 py-3 sm:py-4 rounded-xl border-2 transition-all duration-300 flex items-center justify-center space-x-2 ${
                  formData.gender === 'Male' 
                    ? 'border-blue-400 bg-blue-400/20 text-blue-400 shadow-lg shadow-blue-400/20' 
                    : 'border-gray-700 bg-gray-900/50 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                }`}
              >
                <span className="text-xl">♂</span>
                <span className="font-semibold">Male</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({...formData, gender: 'Female'})}
                className={`px-4 sm:px-6 py-3 sm:py-4 rounded-xl border-2 transition-all duration-300 flex items-center justify-center space-x-2 ${
                  formData.gender === 'Female' 
                    ? 'border-pink-400 bg-pink-400/20 text-pink-400 shadow-lg shadow-pink-400/20' 
                    : 'border-gray-700 bg-gray-900/50 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                }`}
              >
                <span className="text-xl">♀</span>
                <span className="font-semibold">Female</span>
              </button>
            </div>
          </div>

          {/* Row 3: Location */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-300">
              Location
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              className="w-full px-4 py-4 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-valorant-red focus:border-valorant-red transition-all duration-300 backdrop-blur-sm"
              placeholder="City, State"
              required
            />
          </div>

          {/* Row 4: Agent and Rank */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-300">
                Favorite Agent
              </label>
              <select
                name="favoriteAgent"
                value={formData.favoriteAgent}
                onChange={handleInputChange}
                className="w-full px-4 py-4 bg-gray-900/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-valorant-red focus:border-valorant-red transition-all duration-300 backdrop-blur-sm"
                required
              >
                <option value="Jett">⚡ Jett</option>
                <option value="Sage">💚 Sage</option>
                <option value="Phoenix">🔥 Phoenix</option>
                <option value="Raze">💥 Raze</option>
                <option value="Omen">🌑 Omen</option>
                <option value="Viper">☠️ Viper</option>
                <option value="Cypher">👁️ Cypher</option>
                <option value="Sova">🏹 Sova</option>
                <option value="Brimstone">💣 Brimstone</option>
                <option value="Breach">💥 Breach</option>
                <option value="Reyna">👁️ Reyna</option>
                <option value="Clove">💀 Clove</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-300">
                Rank
              </label>
              <select
                name="rank"
                value={formData.rank}
                onChange={handleInputChange}
                className="w-full px-4 py-4 bg-gray-900/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-valorant-red focus:border-valorant-red transition-all duration-300 backdrop-blur-sm"
                required
              >
                <option value="Iron">⚫ Iron</option>
                <option value="Bronze">🟤 Bronze</option>
                <option value="Silver">⚪ Silver</option>
                <option value="Gold">🟡 Gold</option>
                <option value="Platinum">🔵 Platinum</option>
                <option value="Diamond">💎 Diamond</option>
                <option value="Ascendant">🟣 Ascendant</option>
                <option value="Immortal">🔴 Immortal</option>
                <option value="Radiant">✨ Radiant</option>
              </select>
            </div>
          </div>

          {/* Row 5: Bio */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-300">
              Bio
            </label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              className="w-full px-4 py-4 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-valorant-red focus:border-valorant-red transition-all duration-300 backdrop-blur-sm resize-none"
              placeholder="Tell us about yourself, your gaming style, what you're looking for..."
              rows="4"
              required
            />
          </div>

          {/* Submit Button */}
          <div className="pt-6">
            <button
              type="submit"
              className="group relative w-full bg-gradient-to-r from-valorant-red to-red-600 hover:from-red-600 hover:to-valorant-red text-white font-bold py-4 sm:py-5 px-6 sm:px-8 rounded-2xl transition-all duration-500 transform hover:scale-105 shadow-2xl hover:shadow-valorant-red/50 overflow-hidden text-base"
            >
              <span className="relative z-10 flex items-center justify-center">
                <span className="mr-2">🚀</span>
                Create Profile & Start Dating
                <span className="ml-2">→</span>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WelcomeScreen;
