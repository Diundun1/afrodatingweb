import { registerRootComponent } from 'expo';
import messaging from '@react-native-firebase/messaging';
import CallKeepService from './App/lib/CallKeepService';
import uuid from 'react-native-uuid';
import App from './App';

// Setup CallKeep immediately upon engine boot
CallKeepService.setup('Diundun');

// Register background handler for Android/iOS native push
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Background Firebase Message!', remoteMessage);
  
  const type = remoteMessage.data?.type?.toLowerCase();
  if (type === 'incoming_call' || type === 'call') {
      const callerName = remoteMessage.data?.sender?.name || remoteMessage.data?.callerName || 'Someone';
      const callUUID = uuid.v4();
      
      // We trigger the native OS incoming call UI
      CallKeepService.displayIncomingCall(callUUID, callerName, callerName, 'generic', true);
  }
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
registerRootComponent(App);
