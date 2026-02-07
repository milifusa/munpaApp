import React from 'react';
import { Text, Linking, Alert, StyleSheet, TextStyle } from 'react-native';

interface LinkableTextProps {
  children: string;
  style?: TextStyle | TextStyle[];
  linkStyle?: TextStyle;
}

const LinkableText: React.FC<LinkableTextProps> = ({ children, style, linkStyle }) => {
  // Regex mejorada para detectar URLs - captura http://, https://, www. y dominios sin www
  const urlRegex = /(?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/gi;

  const handlePress = async (url: string) => {
    try {
      // Agregar https:// si no tiene protocolo
      let fullUrl = url.trim();
      if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
        fullUrl = `https://${fullUrl}`;
      }

      const supported = await Linking.canOpenURL(fullUrl);
      
      if (supported) {
        await Linking.openURL(fullUrl);
      } else {
        Alert.alert('Error', 'No se puede abrir este enlace');
      }
    } catch (error) {
      console.error('Error abriendo URL:', error);
      Alert.alert('Error', 'No se pudo abrir el enlace');
    }
  };

  const renderText = () => {
    if (!children) return null;
    
    // Encontrar todas las URLs en el texto
    const matches = Array.from(children.matchAll(urlRegex));
    
    if (matches.length === 0) {
      // Si no hay URLs, devolver el texto normal
      return children;
    }

    const parts = [];
    let lastIndex = 0;

    matches.forEach((match, index) => {
      const url = match[0];
      const startIndex = match.index!;
      const endIndex = startIndex + url.length;

      // Agregar texto antes de la URL
      if (startIndex > lastIndex) {
        parts.push(
          <Text key={`text-${index}`} style={style}>
            {children.substring(lastIndex, startIndex)}
          </Text>
        );
      }

      // Agregar la URL como enlace clickeable
      parts.push(
        <Text
          key={`link-${index}`}
          style={[styles.link, linkStyle]}
          onPress={() => handlePress(url)}
        >
          {url}
        </Text>
      );

      lastIndex = endIndex;
    });

    // Agregar texto restante después de la última URL
    if (lastIndex < children.length) {
      parts.push(
        <Text key="text-end" style={style}>
          {children.substring(lastIndex)}
        </Text>
      );
    }

    return parts;
  };

  return <Text style={style}>{renderText()}</Text>;
};

const styles = StyleSheet.create({
  link: {
    color: '#3B82F6',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
});

export default LinkableText;
