import React, {Component} from 'react';
import App from './App';
import codePush from 'react-native-code-push';
import { Configs } from './Utils/env';
class AppWrappedInCodePush extends Component {
  render() {
    return <App />;
  }
}

const codePushOptions = { 
  checkFrequency: codePush.CheckFrequency.ON_APP_RESUME,
  installMode: codePush.InstallMode.ON_NEXT_SUSPEND,
  minimumBackgroundDuration: 1*60, // 1 minutes
  deploymentKey: Configs.CODEPUSH_KEY[Platform.OS]
 };

let wrapped = AppWrappedInCodePush;
if (!__DEV__) {
  wrapped = codePush(codePushOptions)(AppWrappedInCodePush)
}
export default wrapped;
