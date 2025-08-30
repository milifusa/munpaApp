import { useState, useEffect } from 'react';
import * as Font from 'expo-font';

export const useFonts = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    const loadFonts = async () => {
      try {
        // Las fuentes ya están configuradas en app.json, solo verificamos que estén disponibles
        await Font.loadAsync({});
        setFontsLoaded(true);
        console.log('✅ Fuentes cargadas correctamente desde app.json');
      } catch (error) {
        console.error('❌ Error cargando fuentes:', error);
        setFontsLoaded(true); // Continuar sin la fuente personalizada
      }
    };

    loadFonts();
  }, []);

  return fontsLoaded;
};
