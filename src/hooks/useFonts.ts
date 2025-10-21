import { useFonts as useExpoFonts } from 'expo-font';

export const useFonts = () => {
  const [fontsLoaded] = useExpoFonts({
    'Hug Me Tight': require('../../assets/Hug Me Tight - TTF.ttf'),
  });

  return fontsLoaded;
};
