import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent llama a AppRegistry.registerComponent('main', () => App);
// También asegura que si el entorno soporta módulos, tu app se exporta correctamente
registerRootComponent(App);

