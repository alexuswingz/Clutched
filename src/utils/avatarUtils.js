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
         user.avatar === '/images/admin.jpg' || 
         user.username === 'Alexus Karl' || 
         user.id === 'dev_1761178419119' ||
         user.id?.startsWith('dev_');
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
  
  return {
    ...user,
    avatar: isDev ? '/images/admin.jpg' : (user.avatar || '/images/default.jpg'),
    agentImage: isDev ? '/images/admin.jpg' : getUserAgentImage(user),
    // Ensure agentAvatar is also set correctly for chat display
    agentAvatar: isDev ? '/images/admin.jpg' : (user.agentImage || user.avatar || `/images/${user.favoriteAgent?.toLowerCase() || 'jett'}.jpg`),
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
