import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.devashish.weathergpt',
  appName: 'WeatherGPT',
  webDir: 'public',
  server: {
    url: 'https://temp-gpt-ten.vercel.app/',
    cleartext: false,
  }
};

