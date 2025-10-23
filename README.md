# Clutched - The only clutch that hits diff.

A responsive mobile web dating app with a Valorant theme, built with React and Tailwind CSS 3.4.0.

## Features

- 🎮 **Valorant-themed Design**: Dark theme with Valorant colors and styling
- 📱 **Mobile-First**: Responsive design optimized for mobile devices
- 💬 **Real-time Chat**: Messaging system with online status
- 👤 **User Profiles**: Customizable profiles with gaming stats
- ❤️ **Swipe Interface**: Tinder-like card swiping for matches
- 🔐 **Authentication**: Login/signup system
- 🎯 **Gaming Focus**: Rank, level, and agent preferences

## Screens

1. **Login Screen**: User authentication with signup/login toggle
2. **Home Screen**: User discovery with swipe cards and stats
3. **Profile Screen**: User profile management and settings
4. **Chat Screen**: Messaging interface with chat list and conversations

## Tech Stack

- React 18.2.0
- React Router DOM 6.3.0
- Tailwind CSS 3.4.0
- Responsive Design
- Mobile-First Approach

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Features Overview

### Login Screen
- Valorant-themed branding
- Toggle between login and signup
- Form validation
- Responsive design

### Home Screen
- User card swiping interface
- Gaming stats display (rank, level, agent)
- Action buttons (pass, chat, like)
- User statistics

### Profile Screen
- Editable user profile
- Gaming preferences
- Settings toggles
- Statistics display

### Chat Screen
- Chat list with online status
- Real-time messaging interface
- Message timestamps
- Online/offline indicators

## Design Features

- **Valorant Color Scheme**: Red (#FF4655), dark backgrounds
- **Glass Morphism**: Backdrop blur effects
- **Smooth Animations**: Hover effects and transitions
- **Mobile Optimized**: Touch-friendly interface
- **Responsive Layout**: Adapts to different screen sizes

## Customization

The app uses Tailwind CSS with custom Valorant-themed colors and components. You can modify the styling in:

- `tailwind.config.js` - Custom colors and animations
- `src/index.css` - Global styles and component classes
- Individual component files for specific styling

## Deployment

This app is configured for automatic deployment to AWS S3 on every push to the master branch.

### Automatic Deployment Setup

1. **AWS S3 Bucket**: Create an S3 bucket configured for static website hosting
2. **IAM User**: Create an IAM user with S3 deployment permissions
3. **GitHub Secrets**: Add AWS credentials as repository secrets
4. **GitHub Actions**: The workflow will automatically deploy on master branch pushes

See `s3-bucket-setup.md` for detailed setup instructions.

### Manual Deployment

```bash
# Set environment variables
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export S3_BUCKET_NAME="your-bucket-name"
export AWS_REGION="us-east-1"

# Run deployment script
./deploy-s3.sh
```

### Required GitHub Secrets

| Secret Name | Description |
|-------------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS access key for deployment |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key for deployment |
| `AWS_REGION` | S3 bucket region (e.g., us-east-1) |
| `S3_BUCKET_NAME` | S3 bucket name |
| `CLOUDFRONT_DISTRIBUTION_ID` | (Optional) CloudFront distribution ID |

## Future Enhancements

- Real-time messaging with WebSocket
- Image upload functionality
- Push notifications
- Advanced matching algorithms
- Video chat integration
- Tournament integration
