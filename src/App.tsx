import * as React from "react";
import { Dimensions, Linking, Platform, StatusBar, AppState, AppStateStatus, View } from "react-native";
import Orientation from "react-native-orientation-locker";
import { createAppContainer } from "react-navigation";
import { Provider } from "react-redux";
import NavigationService, { isMountedRef, navigationRef } from "./services/navigation/navigation.service";
import {
  setScreenDimensions, fetchTheme, showToast, verifyRestart, showSpinner, hideSpinner, changeTheme
} from "./Redux/Actions";
import store from "./Redux/Stores";
import { ExtendsStack } from "./Navigation/root.stack";
import { AnyAction } from "redux";

import Connection from "./Utils/connection.util";
import { Palette } from "./enums/pallete.enum";

import NativeLinking from 'react-native/Libraries/Linking/NativeLinking'

import SplashScreen from 'react-native-splash-screen';

import DeeplinkService from "./services/navigation/deelink.service";
import { Configs } from "./Utils/env";

import OneSignal from 'react-native-onesignal';

import dynamicLinks from '@react-native-firebase/dynamic-links';

import {
  purchaseUpdatedListener,
  ProductPurchase,
  InAppPurchase,
  SubscriptionPurchase
} from 'react-native-iap';
import GatewayService from './services/gateway/gateway.service';
import OverlaySpinner from './Components/UI/OverlaySpinner';
import { ISLButtonTypesEnum } from './Components/UI/ISLButton';
import { ISLIconsEnum } from './enums/icons.enum';
import { SafeAreaProvider } from "react-native-safe-area-context";
import NavBarService from "./services/navigation/navbar.service";

const ExtendsContainer = createAppContainer(ExtendsStack);

const prefix = Configs.ID+'://';

import TabBarService from "./services/navigation/tabbar.service";
import AnalyticsService from "./services/analytics/analytics.service";
import { fetchEnv, fetchNotification } from "./Redux/Actions/userActions";
import { AppearanceProvider, Appearance } from "react-native-appearance";

export default class App extends React.Component {
  private refreshMetaInterval: any = null;
  private refreshNotifcationInterval: any = null;
  private _darkModeUnsubscribe: any = null;
  purchaseUpdateSubscription = null
  purchaseErrorSubscription = null
  private _unsubscribe = null;
  private subscription: any = null;
  state: {darkModeOn: boolean | null, appState: AppStateStatus};

  constructor(props) {
    super(props);
    this.state = {
      darkModeOn: null,
      appState: AppState.currentState,
    };

    OneSignal.init(Configs.ONESIGNAL.APP_ID, {kOSSettingsKeyAutoPrompt: false});
    OneSignal.inFocusDisplaying(0);
    OneSignal.addEventListener('received', this.onReceived);
  }
  
  onReceived(notification) {
    if(notification.isAppInFocus){
      let toastParams = {
        id: notification.payload.id ? notification.payload.id : Math.floor(Math.random() * 1000),
        title: notification.payload.title,
        message: notification.payload.body,
        icon: notification.payload.additionalData ? ISLIconsEnum[notification.payload.additionalData.icon] : undefined,
        timeout: 10000,
        avatar: notification.payload.additionalData ? notification.payload.additionalData.avatar : undefined,
        link: notification.payload.launchURL,
        type: ISLButtonTypesEnum.outline,
        options: []
      };
      store.dispatch(showToast(toastParams))
    }
  }

  _fetchNotifications() {
      store.dispatch(fetchNotification());
  }
    
  _startMethods(mounting?) {
    SplashScreen.hide();
    if(Platform.OS === 'android') {
      StatusBar.setTranslucent(true);
    }
    store.dispatch(verifyRestart(60000)).then(() => {
      this._fetchNotifications();
      const mobileConfigs = store.getState().root.mobileConfigs;
      if(this.refreshNotifcationInterval) {
        clearInterval(this.refreshNotifcationInterval);
      }
      this.refreshNotifcationInterval = setInterval(
        this._fetchNotifications
      ,
        mobileConfigs && 
        mobileConfigs.cron && 
        mobileConfigs.cron.GetBadges ? mobileConfigs.cron.GetBadges : 60000);
      if (mounting) {
        Promise.all([dynamicLinks().getInitialLink(), NativeLinking.getInitialURL()]).then((urls) => {
          let url = urls[1];
          if(urls[0] !== null) {
            url = urls[0].url;
          }
          if (url !== null) {
            store.dispatch(showSpinner());
            return DeeplinkService.handleUrl({url});
          }
          return;
        })
        .then(() => {
          AnalyticsService.sendInstallUpdateTracking(store);
        })
        .catch(() => {
          AnalyticsService.sendInstallUpdateTracking(store);
        });
      }
    });
  }

  componentDidMount() {
    NavBarService.init();
    TabBarService.init();
    isMountedRef.current = true;
    store.dispatch(fetchEnv() as unknown as AnyAction);
    AppState.addEventListener('change', this._handleAppStateChange);
    this.purchaseUpdateSubscription = purchaseUpdatedListener(async (purchase: InAppPurchase | SubscriptionPurchase | ProductPurchase ) => {
      Connection.refreshMeta().then(() => {
        new GatewayService(store).consumePurchase(purchase);
      });
    });
    Orientation.addOrientationListener(this._setScreenDimension)
    Orientation.lockToPortrait();

    this.refreshMetaInterval = setInterval(() => {
      Connection.refreshMeta();
    }, 15000);
    this.subscription = Appearance.addChangeListener(({ colorScheme }) => {
      const attemptDarkThemeOn = colorScheme == 'dark';
      if(store.getState().root.usingSystemTheme && attemptDarkThemeOn !== store.getState().root.darkThemeOn){
        store.dispatch(changeTheme("system") as unknown as AnyAction);
      }
    });
    store.dispatch(fetchTheme() as unknown as AnyAction);
    const d = Dimensions.get("screen");
    store.dispatch(setScreenDimensions(d.height, d.width));
    
    Linking.addEventListener('url', this.handleUniversalUrl);
    dynamicLinks().onLink(this.handleUniversalUrl);
    this._darkModeUnsubscribe = store.subscribe(() => {
      const { root } = store.getState();
      if (root.darkThemeOn !== this.state.darkModeOn) {
        NavigationService.setNavigationBarColor(root.darkThemeOn ? root.colors.placeholderBg : root.colors.darkBg, !root.darkThemeOn);
        Connection.refreshMeta();
        this.setState({
          darkModeOn: root.darkThemeOn
        });
      }
    });

    this._startMethods(true);
  }

  handleUniversalUrl(event) {
    if(event.url.match("google/link") === null && event.url.match(/(go)+?\.?\w*\.(app)+/i) === null) {
      store.dispatch(showSpinner());
      DeeplinkService.handleUrl({url: event.url});
      setTimeout(() => {
        store.dispatch(hideSpinner());
      }, 6000);
    }
  }

  componentWillUnmount() {
    Linking.removeEventListener('url', this.handleUniversalUrl);
    if(this._unsubscribe !== null) {
      this._unsubscribe();
    }
    if(this.subscription !== null) {
      this.subscription.remove();
    }
    AppState.removeEventListener('change', this._handleAppStateChange);
    Orientation.removeOrientationListener(this._setScreenDimension)
    clearInterval(this.refreshMetaInterval);
    clearInterval(this.refreshNotifcationInterval);
    this._darkModeUnsubscribe();
    OneSignal.removeEventListener('received', this.onReceived);
    OneSignal.removeEventListener('opened', this.onOpened);
    OneSignal.removeEventListener('ids', this.onIds);
    if (this.purchaseUpdateSubscription) {
      this.purchaseUpdateSubscription.remove();
      this.purchaseUpdateSubscription = null;
    }
    if (this.purchaseErrorSubscription) {
      this.purchaseErrorSubscription.remove();
      this.purchaseErrorSubscription = null;
    }
    isMountedRef.current = false;
  }

  _handleAppStateChange = (nextAppState) => {
    if (
      this.state.appState.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      this._startMethods();
    }
    this.setState({appState: nextAppState});
  };

  _setScreenDimension() {
    const d = Dimensions.get("screen");
    store.dispatch(setScreenDimensions(d.height, d.width));
  }

  public render() {
    return (
      <AppearanceProvider>
      <View style={{flex: 1, width: '100%', height: '110%', backgroundColor: Palette.darkBg}}>
        <SafeAreaProvider>
            <StatusBar
              backgroundColor={Palette.transparent} 
              barStyle={this.state.darkModeOn ? "light-content" : 'dark-content'} translucent/>
            <Provider store={store}>
              <React.Fragment>
                <ExtendsContainer
                  uriPrefix={prefix}
                  enableURLHandling={false}
                  ref={navigationRef}
                  />
                <ISLToastPool/>
                <OverlaySpinner/>
              </React.Fragment>
            </Provider>
        </SafeAreaProvider>
      </View>
      </AppearanceProvider>
    );
  }
}
