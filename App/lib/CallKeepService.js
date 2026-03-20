import RNCallKeep from 'react-native-callkeep';
import { Platform } from 'react-native';

class CallKeepService {
  constructor() {
    this.isSetup = false;
  }

  setup(appName = 'Diundun') {
    if (this.isSetup) return;

    if (Platform.OS === 'web') return;

    const options = {
      ios: {
        appName,
        imageName: 'sim_icon',
        supportsVideo: true,
        maximumCallGroups: 1,
        maximumCallsPerCallGroup: 1,
        includesCallsInRecents: true,
      },
      android: {
        alertTitle: 'Permissions Required',
        alertDescription: 'This application needs to access your phone accounts to receive calls',
        cancelButton: 'Cancel',
        okButton: 'Ok',
        imageName: 'sim_icon',
        additionalPermissions: [],
        foregroundService: {
          channelId: 'com.diudun.callkeep',
          channelName: 'Diundun Background Service',
          notificationTitle: 'Ongoing call in background',
        }, 
      }
    };

    try {
      RNCallKeep.setup(options).then(accepted => {
        this.isSetup = true;
        console.log('CallKeep setup successful:', accepted);
      });
    } catch (err) {
      console.error('CallKeep setup error:', err);
    }
  }

  displayIncomingCall(uuid, callerHandle, localizedCallerName, handleType = 'generic', hasVideo = true) {
    if (Platform.OS === 'web') return;
    try {
      RNCallKeep.displayIncomingCall(uuid, callerHandle, localizedCallerName, handleType, hasVideo);
    } catch(err) {
      console.error('displayIncomingCall error', err);
    }
  }

  endCall(uuid) {
    if (Platform.OS === 'web') return;
    RNCallKeep.endCall(uuid);
  }

  answerIncomingCall(uuid) {
    if (Platform.OS === 'web') return;
    RNCallKeep.answerIncomingCall(uuid);
  }

  rejectCall(uuid) {
    if (Platform.OS === 'web') return;
    RNCallKeep.rejectCall(uuid);
  }

  endAllCalls() {
    if (Platform.OS === 'web') return;
    RNCallKeep.endAllCalls();
  }
}

export default new CallKeepService();
