import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smartevscheduler.app',
  appName: 'Smart EV Scheduler',
  webDir: 'out',
  server: {
    url: 'http://192.168.29.165:3000',
    cleartext: true
  }
};

export default config;
