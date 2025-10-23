// Profanity filter for chat messages
// Includes English and Filipino/Tagalog curse words

const profanityWords = [
  // English profanity
  'fuck', 'shit', 'bitch', 'ass', 'damn', 'hell', 'crap', 'piss', 'dick', 'cock',
  'pussy', 'whore', 'slut', 'bastard', 'faggot', 'nigger', 'retard', 'idiot',
  'stupid', 'dumb', 'moron', 'fucking', 'shitty', 'bullshit', 'asshole',
  
  // Filipino/Tagalog profanity
  'putang', 'putangina', 'tangina', 'gago', 'bobo', 'tanga', 'ulol', 'tarantado',
  'hayop', 'walanghiya', 'bastos', 'kupal', 'pakyu', 'pakyaw', 'pakshet',
  'leche', 'lintik', 'suso', 'titi', 'pepe', 'kiki', 'puke', 'burat',
  'tamod', 'tamodan', 'jakol', 'jakulin', 'kantot', 'kantutan', 'libog',
  'malibog', 'manyak', 'bastos', 'walanghiya', 'kupal', 'tarantado',
  
  // Common variations and misspellings
  'f*ck', 'f**k', 'f***', 'sh*t', 's**t', 'b*tch', 'b**ch', 'a**', 'a*s',
  'd*mn', 'h*ll', 'cr*p', 'p*ss', 'd*ck', 'c*ck', 'p*ssy', 'wh*re',
  'sl*t', 'b*stard', 'f*ggot', 'n*gger', 'r*tard', 'a*shole',
  
  // Filipino variations
  'p*tang', 'p*tangina', 't*ngina', 'g*go', 'b*bo', 't*nga', 'u*ol',
  't*rantado', 'h*yop', 'w*langhiya', 'b*stos', 'k*pal', 'p*kyu',
  'p*kyaw', 'p*kshet', 'l*che', 'l*ntik', 's*so', 't*ti', 'p*pe',
  'k*ki', 'p*ke', 'b*rat', 't*mod', 't*modan', 'j*kol', 'j*kulin',
  'k*ntot', 'k*ntutan', 'l*bog', 'm*libog', 'm*nyak', 'b*stos',
  'w*langhiya', 'k*pal', 't*rantado'
];

// Function to check if message contains profanity
export const containsProfanity = (message) => {
  if (!message || typeof message !== 'string') return false;
  
  const lowerMessage = message.toLowerCase();
  
  // Check for exact matches
  for (const word of profanityWords) {
    if (lowerMessage.includes(word.toLowerCase())) {
      return true;
    }
  }
  
  // Check for words separated by spaces or punctuation
  const words = lowerMessage.split(/[\s\W]+/);
  for (const word of words) {
    if (profanityWords.includes(word)) {
      return true;
    }
  }
  
  return false;
};

// Function to filter profanity from message
export const filterProfanity = (message) => {
  if (!message || typeof message !== 'string') return message;
  
  let filteredMessage = message;
  
  // Replace profanity with asterisks
  for (const word of profanityWords) {
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    filteredMessage = filteredMessage.replace(regex, '*'.repeat(word.length));
  }
  
  return filteredMessage;
};

// Function to get a clean alternative message
export const getCleanMessage = () => {
  const cleanMessages = [
    "Let's keep the conversation friendly! 😊",
    "Please use appropriate language.",
    "Let's chat respectfully! 💬",
    "Keep it clean, please! ✨",
    "Let's maintain a positive vibe! 🌟"
  ];
  
  return cleanMessages[Math.floor(Math.random() * cleanMessages.length)];
};
