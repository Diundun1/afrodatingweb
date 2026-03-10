# Diundun Mobile (Web)

Diundun is a feature-rich React Native (Expo) dating application tailored for the web using Progressive Web App (PWA) technologies. It focuses on connecting users through dynamic matching, real-time messaging, and high-quality voice/video calls.

## Key Strengths & Features

- **Progressive Web App (PWA):** Installs directly to users' devices from the browser, offering a native-app-like experience including homescreen icons and offline caching via Service Workers.
- **Real-Time Communication:** Integrated with Socket.io for instantaneous chat messaging and WebRTC for seamless peer-to-peer video and voice calls.
- **Robust Push Notifications:** Utilizes the web Push API to deliver custom, vibrating notifications for incoming messages and calls, even when the user is not actively on the website.
- **Deep Linking:** Clicking on a call notification intelligently routes the user directly to the Incoming Call screen via React Navigation.
- **Cross-Platform Readiness:** Built with Expo and React Native Web, meaning the codebase is primed for straightforward compilation into iOS and Android applications.

##  Tech Stack

- **Framework:** React Native / Expo (compiling to `react-native-web`)
- **Navigation:** React Navigation v6
- **Real-Time:** Socket.io-client, WebRTC
- **State Management:** React Context API
- **Styling:** React Native Stylesheets
- **Notifications:** Service Workers + Web Push API
- **Storage:** AsyncStorage & IndexedDB

##  Installation & Setup

### Prerequisites
- Node.js (v18+ recommended)
- `npm` or `yarn`


### 1. Configure Environment Variables
Create a `.env` file in the root directory (if needed by your specific build configuration) and configure the base API URLs.
Ensure that the `App/lib/RegisterForPushNotificationsAsync.js` points to your active backend URL (e.g., `http://localhost:5000` for local testing).

### 2. Run the Development Server
Start the Expo development server targeted for the web.
```bash
npm run web
# or 
npx expo start --web
```

### 3. Testing Push Notifications (Localhost)
To test the PWA installation and Push Notifications locally, your browser must be accessing the application via `localhost` or a secure `HTTPS` tunnel (like ngrok).
1. Open the app in Chrome.
2. Accept the notification permission prompt.
3. Open DevTools `> Application > Service Workers` to verify `/service-worker.js` is active.

##  Contributing
Please ensure all new navigation routes are added to the `linking` object in `App.js` to sustain proper deep linking from push notifications.

---
*Powered by Diundun*
