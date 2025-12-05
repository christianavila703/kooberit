import SplashScreen from './splash';

/**
 * Index route - Always redirects to splash screen first
 * This ensures the splash screen is shown before any other route,
 * especially in production builds where unstable_settings might not work
 */
export default function Index() {
  return <SplashScreen />;
}

