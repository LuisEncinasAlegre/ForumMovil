// Android y web no tienen selector de color nativo en @expo/ui: ahí usamos nuestro campo de color.
// En iOS se usa CustomColorControl.ios.tsx con el selector del sistema.
export { ColorField as CustomColorControl } from './ColorField';
