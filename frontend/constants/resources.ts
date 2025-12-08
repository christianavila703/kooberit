import Constants from 'expo-constants';
import { Dimensions } from 'react-native';

const statusBarHeight = Constants.statusBarHeight;

// Get screen dimensions
const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

// Also available: screen dimensions (includes status bar)
const fullScreenWidth = Dimensions.get('screen').width;
const fullScreenHeight = Dimensions.get('screen').height;

export {
    statusBarHeight,
    screenWidth,
    screenHeight,
    fullScreenWidth,
    fullScreenHeight
}

export const images = {
    splash: require('@/assets/images/splash.png')
}