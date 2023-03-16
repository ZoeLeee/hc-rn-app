/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  Alert,
  Button,
  Linking,
  Platform,
  Image,
} from 'react-native';

import {
  Colors
} from 'react-native/Libraries/NewAppScreen';

import RNFS from 'react-native-fs';

import Server, {
  STATES,
  extractBundledAssets,
} from '@dr.pogodin/react-native-static-server';

import { WebView } from 'react-native-webview';

export const formUrl = 'https://static.runoob.com/images/demo/demo1.jpg';
export const downloadDest = `${RNFS.DocumentDirectoryPath}/webroot/demo.jpg`;

/*下载文件*/
export function downloadFile(downloadDest: string, formUrl: string) {
  // On Android, use "RNFS.DocumentDirectoryPath" (MainBundlePath is not defined)

  // 图片
  // const downloadDest = `${RNFS.MainBundlePath}/${((Math.random() * 1000) | 0)}.jpg`;
  // const formUrl = 'http://img.kaiyanapp.com/c7b46c492261a7c19fa880802afe93b3.png?imageMogr2/quality/60/format/jpg';

  // 文件
  // const downloadDest = `${RNFS.MainBundlePath}/${((Math.random() * 1000) | 0)}.zip`;
  // const formUrl = 'http://files.cnblogs.com/zhuqil/UIWebViewDemo.zip';

  // 视频
  // const downloadDest = `${RNFS.MainBundlePath}/${((Math.random() * 1000) | 0)}.mp4`;
  // http://gslb.miaopai.com/stream/SnY~bbkqbi2uLEBMXHxGqnNKqyiG9ub8.mp4?vend=miaopai&
  // https://gslb.miaopai.com/stream/BNaEYOL-tEwSrAiYBnPDR03dDlFavoWD.mp4?vend=miaopai&
  // const formUrl = 'https://gslb.miaopai.com/stream/9Q5ADAp2v5NHtQIeQT7t461VkNPxvC2T.mp4?vend=miaopai&';

  // http://wvoice.spriteapp.cn/voice/2015/0902/55e6fc6e4f7b9.mp3
  // const formUrl = 'http://wvoice.spriteapp.cn/voice/2015/0818/55d2248309b09.mp3';

  const options = {
    fromUrl: formUrl,
    toFile: downloadDest,
    background: true,
    begin: res => {
      console.log('begin', res);
      console.log('contentLength:', res.contentLength / 1024 / 1024, 'M');
    },
    progress: res => {
      let pro = res.bytesWritten / res.contentLength;
      console.log('pro: ', pro);
    },
  };
  try {
    const ret = RNFS.downloadFile(options);
    ret.promise
      .then(res => {
        console.log('success', res);

        console.log('file://' + downloadDest);
      })
      .catch(err => {
        console.log('err', err);
      });
  } catch (e) {
    console.log(e);
  }
}

function App(): JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  // Once the server is ready, the origin will be set and opened by WebView.
  const [origin, setOrigin] = useState<string>('');

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  useEffect(() => {
    const fileDir: string = Platform.select({
      android: `${RNFS.DocumentDirectoryPath}/webroot`,
      ios: `${RNFS.MainBundlePath}/webroot`,
      windows: `${RNFS.MainBundlePath}\\webroot`,
      default: '',
    });

    // In our example, `server` is reset to null when the component is unmount,
    // thus signalling that server init sequence below should be aborted, if it
    // is still underway.
    let server: null | Server = new Server({ fileDir, stopInBackground: true });

    (async () => {
      // On Android we should extract web server assets from the application
      // package, and in many cases it is enough to do it only on the first app
      // installation and subsequent updates. In our example we'll compare
      // the content of "version" asset file with its extracted version,
      // if it exist, to deside whether we need to re-extract these assets.
      if (Platform.OS === 'android') {
        let extract = true;
        try {
          const versionD = await RNFS.readFile(`${fileDir}/version`, 'utf8');
          const versionA = await RNFS.readFileAssets('webroot/version', 'utf8');
          if (versionA === versionD) {
            extract = false;
          } else {
            await RNFS.unlink(fileDir);
          }
        } catch {
          // A legit error happens here if assets have not been extracted
          // before, no need to react on such error, just extract assets.
        }
        if (extract) {
          console.log('Extracting web server assets...');
          // await extractBundledAssets(fileDir, 'webroot');
        }
      }

      server?.addStateListener((newState) => {
        // Depending on your use case, you may want to use such callback
        // to implement a logic which prevents other pieces of your app from
        // sending any requests to the server when it is inactive.

        // Here `newState` equals to a numeric state constant,
        // and `STATES[newState]` equals to its human-readable name,
        // because `STATES` contains both forward and backward mapping
        // between state names and corresponding numeric values.
        console.log(`New server state is "${STATES[newState]}"`);
      });
      const res = await server?.start();

      if (res && server) {
        setOrigin(res);
      }
    })();
    return () => {
      (async () => {
        // In our example, here is no need to wait until the shutdown completes.
        server?.stop();

        server = null;
        setOrigin('');
      })();
    };
  }, []);

  const webView = useRef<WebView>(null);

  console.log(origin);

  return (
    <View style={styles.webview}>
      <View style={{ height: 50, display: "flex" }}>
        <Button title='下载文件' onPress={() => downloadFile(downloadDest, formUrl)}></Button>
        {
          origin && <Image
            style={styles.tinyLogo}
            source={{ uri: origin + "/demo.jpg" }}
          />
        }
      </View>
      <WebView
        style={{ flex: 1 }}
        cacheMode="LOAD_NO_CACHE"
        // This way we can receive messages sent by the WebView content.
        onMessage={(event) => {
          const message = event.nativeEvent.data;
          Alert.alert('Got a message from the WebView content', message);
        }}
        // This way selected links displayed inside this WebView can be opened
        // in a separate system browser, instead of the WebView itself.
        // BEWARE: Currently, it does not seem working on Windows,
        // the onShouldStartLoadWithRequest() method just is not triggered
        // there when links inside WebView are pressed. However, it is worth
        // to re-test, troubleshoot, and probably fix. It works fine both
        // Android and iOS.
        onShouldStartLoadWithRequest={(request) => {
          const load = request.url.startsWith(origin);
          if (!load) {
            Linking.openURL(request.url);
          }
          return load;
        }}
        ref={webView}
        source={{ uri: origin }}
      />
    </View >
  );
}

const styles = StyleSheet.create({
  webview: {
    borderColor: 'black',
    borderWidth: 1,
    flex: 1,
    marginTop: 12,
  },
  tinyLogo: {
    width: 50,
    height: 50,
  },
});

export default App;

