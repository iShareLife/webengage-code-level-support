/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "AppDelegate.h"

#import <React/RCTBridge.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTRootView.h>

#import <React/RCTLinkingManager.h>

#import "Intercom/intercom.h"
#import "RNSplashScreen.h"
#import <Firebase.h>

#import <CodePush/CodePush.h>
#import <WebEngage/WebEngage.h>

#if RCT_DEV
#import <React/RCTDevLoadingView.h>
#endif
@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  if ([FIRApp defaultApp] == nil) {
    [FIRApp configure];
  }

  self.bridge = [WEGWebEngageBridge new];
  
  RCTBridge *bridge = [[RCTBridge alloc] initWithDelegate:self.bridge launchOptions:launchOptions];

  #if RCT_DEV
    [bridge moduleForClass:[RCTDevLoadingView class]];
  #endif

  RCTRootView *rootView = [[RCTRootView alloc] initWithBridge:bridge
                                                   moduleName:[[NSBundle mainBundle] objectForInfoDictionaryKey:@"app_name"]
                                            initialProperties:nil];
  rootView.backgroundColor = [[UIColor alloc] initWithRed:1.0f green:1.0f blue:1.0f alpha:1];

  self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
  UIViewController *rootViewController = [UIViewController new];
  rootViewController.view = rootView;
  self.window.rootViewController = rootViewController;
  [self.window makeKeyAndVisible];
  [RNSplashScreen showSplash:@"LaunchScreen" inRootView:rootView];

  NSString *id = [[NSBundle mainBundle] objectForInfoDictionaryKey:@"ID"];
  
  if ([id isEqualToString:@"ident"]) {
    [Intercom setApiKey:@"ios_sdk-XXXXXXXXXXXXXXX" forAppId:@"XXXXXXX"];
  } else if([id isEqualToString:@"medstream"]){
    [Intercom setApiKey:@"ios_sdk-XXXXXXXXXXXXXXX" forAppId:@"XXXXXXX"];
  }
  
  [application setStatusBarHidden:NO withAnimation:UIStatusBarAnimationNone];

  [[WebEngage sharedInstance] application:application
              didFinishLaunchingWithOptions:launchOptions notificationDelegate:self.bridge.wegBridge];
  [WebEngage sharedInstance].pushNotificationDelegate = self.bridge.wegBridge;
  return YES;
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index.ios" fallbackResource:nil];
#else
  return [CodePush bundleURL];
#endif
}


// - (BOOL)application:(UIApplication *)application openURL:(NSURL *)url 
//   options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options 
// {
//   BOOL handled = [RCTLinkingManager application:application openURL:url options:options];
  

//   return handled;
// }

- (BOOL)application:(UIApplication *)application continueUserActivity:(NSUserActivity *)userActivity
restorationHandler:(void (^)(NSArray<id<UIUserActivityRestoring>> * _Nullable))restorationHandler
{
  [[WebEngage sharedInstance].deeplinkManager getAndTrackDeeplink:userActivity.webpageURL callbackBlock:^(NSString * location) {
    //send location to react
    if (!self.bridge) {
      self.bridge = [WEGWebEngageBridge new];
    }
    [self.bridge sendUniversalLinkLocation:location];
  }];
  return YES;
  
}

//- (void)WEGHandleDeeplink:(NSString *)deeplink userData:(NSDictionary *)data {
//  NSLog(@"log: %@", deeplink);
//}


@end
