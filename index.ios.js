import 'react-native-gesture-handler';

import { AppRegistry } from 'react-native';
import BuildConfig from 'react-native-build-config';
import VersionNumber from 'react-native-version-number';

import AppWrappedInCodePush from './src/AppWrappedInCodePush';
import { LogBox } from 'react-native';
import {version} from './package.json';
import { Configs } from './src/Utils/env';

import { Client, Configuration } from 'bugsnag-react-native';
export const configuration = new Configuration();
configuration.apiKey = 'XXXXXXXXXXXXXXXXXXXXXX';
const bundleVersion = version.split('.').join('');
configuration.codeBundleId = bundleVersion;
configuration.appVersion = VersionNumber.appVersion + '.' + bundleVersion;
if (!__DEV__) {
  configuration.releaseStage = Configs.BUNDLE_ENV;
}
export const bugsnag = new Client(configuration);

LogBox.ignoreLogs([
  'Warning: isMounted(...) is deprecated',
  'Warning: componentWill',
  'Module RCTImageLoader',
  'Remote debugger',
  'RCTRootView cancelTouches',
  'Item does not exist.',
  "consumePurchase Error"
]);

AppRegistry.registerComponent(BuildConfig.app_name, () => AppWrappedInCodePush);
