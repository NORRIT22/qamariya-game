import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.norrit22.readdy3',
  appName: 'Readdy 3',
  webDir: 'www',
  bundledWebRuntime: false,
  android: {
    backgroundColor: '#0B0B0C',
    allowMixedContent: false
  }
};

export default config;
