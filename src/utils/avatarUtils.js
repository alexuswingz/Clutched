// Avatar utility functions to ensure consistent avatar handling
// This ensures developer accounts always use admin.jpg

/**
 * Get the correct avatar for a user, ensuring developer accounts use admin.jpg
 * @param {Object} user - User object
 * @returns {string} - Correct avatar path
 */
export const getUserAvatar = (user) => {
  if (!user) return '/images/default.jpg';
  
  // Check if this is a developer account
  const isDeveloper = user.isDeveloper || 
                      user.avatar === '/images/admin.jpg' || 
                      user.username === 'Alexus Karl' || 
                      user.id === 'dev_1761178419119' ||
                      user.id?.startsWith('dev_');
  
  if (isDeveloper) {
    return '/images/admin.jpg';
  }
  
  // Check for base64 custom images first (for moderators and testers)
  if (user.customImages?.avatar_current) {
    return user.customImages.avatar_current;
  }
  
  // Check for Firebase Storage custom images
  if (user.avatar && user.avatar.startsWith('https://firebasestorage.googleapis.com/')) {
    return user.avatar;
  }
  
  // For regular users, use their avatar or fallback to default
  return user.avatar || '/images/default.jpg';
};

/**
 * Get the correct agent image for a user, ensuring developer accounts use admin.jpg
 * @param {Object} user - User object
 * @returns {string} - Correct agent image path
 */
export const getUserAgentImage = (user) => {
  if (!user) return '/images/default.jpg';
  
  // Check if this is a developer account
  const isDeveloper = user.isDeveloper || 
                      user.avatar === '/images/admin.jpg' || 
                      user.username === 'Alexus Karl' || 
                      user.id === 'dev_1761178419119' ||
                      user.id?.startsWith('dev_');
  
  if (isDeveloper) {
    return '/images/admin.jpg';
  }
  
  // Check for base64 custom images first (for moderators and testers)
  if (user.customImages?.avatar_current) {
    return user.customImages.avatar_current;
  }
  
  // Check for Firebase Storage custom images
  if (user.avatar && user.avatar.startsWith('https://firebasestorage.googleapis.com/')) {
    return user.avatar;
  }
  
  // For regular users, use their agent image, avatar, or fallback to agent-based image
  if (user.agentImage) {
    return user.agentImage;
  }
  
  if (user.avatar) {
    return user.avatar;
  }
  
  // Fallback to agent-based image
  const agent = user.favoriteAgent?.toLowerCase() || 'jett';
  return `/images/${agent}.jpg`;
};

/**
 * Check if a user is a developer account
 * @param {Object} user - User object
 * @returns {boolean} - True if developer account
 */
export const isDeveloperAccount = (user) => {
  if (!user) return false;
  
  return user.isDeveloper || 
         user.role === 'developer' ||
         user.avatar === '/images/admin.jpg' || 
         user.username === 'Alexus Karl' || 
         user.id === 'dev_1761178419119' ||
         user.id?.startsWith('dev_');
};

/**
 * Check if a user is a moderator
 * @param {Object} user - User object
 * @returns {boolean} - True if moderator
 */
export const isModeratorAccount = (user) => {
  if (!user) return false;
  
  return user.role === 'moderator';
};

/**
 * Check if a user is a tester
 * @param {Object} user - User object
 * @returns {boolean} - True if tester
 */
export const isTesterAccount = (user) => {
  if (!user) return false;
  
  return user.role === 'tester';
};

/**
 * Get user role badge info
 * @param {Object} user - User object
 * @returns {Object} - Role badge info with text, color, and bgColor
 */
export const getUserRoleBadge = (user) => {
  if (!user) return null;
  
  if (isDeveloperAccount(user)) {
    return {
      text: 'DEVELOPER',
      color: 'text-red-300',
      bgColor: 'bg-red-900/20',
      borderColor: 'border-red-500/30',
      icon: null
    };
  }
  
  if (isModeratorAccount(user)) {
    return {
      text: 'MODERATOR',
      color: 'text-blue-300',
      bgColor: 'bg-blue-900/20',
      borderColor: 'border-blue-500/30',
      icon: null
    };
  }
  
  if (isTesterAccount(user)) {
    return {
      text: 'TESTER',
      color: 'text-green-300',
      bgColor: 'bg-green-900/20',
      borderColor: 'border-green-500/30',
      icon: null
    };
  }
  
  return null;
};

/**
 * Get display name for a user, with special handling for developers
 * @param {Object} user - User object
 * @returns {string} - Display name
 */
export const getUserDisplayName = (user) => {
  if (!user) return 'Unknown User';
  
  // For developer accounts, always show as "Alexus Karl"
  if (isDeveloperAccount(user)) {
    return 'Alexus Karl';
  }
  
  return user.username || user.name || 'Unknown User';
};

/**
 * Get the correct avatar for chat display, ensuring developer accounts use admin.jpg
 * @param {Object} chat - Chat object
 * @returns {string} - Correct avatar path
 */
export const getChatAvatar = (chat) => {
  if (!chat) return '/images/default.jpg';
  
  // Check if this is a developer account chat
  const isDeveloper = chat.agentAvatar === '/images/admin.jpg' || 
                      chat.name === 'Alexus Karl' ||
                      chat.agentAvatar?.includes('admin.jpg');
  
  if (isDeveloper) {
    return '/images/admin.jpg';
  }
  
  // Check for base64 custom images first (for moderators and testers)
  if (chat.agentAvatar && chat.agentAvatar.startsWith('data:image/')) {
    return chat.agentAvatar;
  }
  
  // Check for Firebase Storage custom images
  if (chat.agentAvatar && chat.agentAvatar.startsWith('https://firebasestorage.googleapis.com/')) {
    return chat.agentAvatar;
  }
  
  // For regular chats, use agentAvatar, agentImage, or fallback
  return chat.agentAvatar || chat.agentImage || '/images/default.jpg';
};

/**
 * Process a user object to ensure correct avatar and agent image
 * @param {Object} user - User object
 * @returns {Object} - User object with corrected avatar and agentImage
 */
export const processUserAvatar = (user) => {
  if (!user) return user;
  
  const isDev = isDeveloperAccount(user);
  
  // Get the correct avatar for this user
  const correctAvatar = getUserAvatar(user);
  const correctAgentImage = getUserAgentImage(user);
  
  return {
    ...user,
    avatar: correctAvatar,
    agentImage: correctAgentImage,
    // Ensure agentAvatar is also set correctly for chat display
    agentAvatar: correctAvatar,
    // Ensure developer accounts are always considered online when active
    isCurrentlyActive: isDev ? (user.isActive !== false) : user.isCurrentlyActive
  };
};

/**
 * Process an array of users to ensure correct avatars
 * @param {Array} users - Array of user objects
 * @returns {Array} - Array of user objects with corrected avatars
 */
export const processUsersAvatars = (users) => {
  if (!Array.isArray(users)) return users;
  
  return users.map(user => processUserAvatar(user));
};
