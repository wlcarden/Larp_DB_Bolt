import type { ModuleColor } from './types';

export interface ColorOption {
  id: ModuleColor;
  name: string;
  bgClass: string;
  textClass: string;
  hoverClass: string;
}

export const MODULE_COLORS: ColorOption[] = [
  {
    id: 'blue',
    name: 'Blue',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-800',
    hoverClass: 'hover:bg-blue-200'
  },
  {
    id: 'green',
    name: 'Green',
    bgClass: 'bg-green-100',
    textClass: 'text-green-800',
    hoverClass: 'hover:bg-green-200'
  },
  {
    id: 'purple',
    name: 'Purple',
    bgClass: 'bg-purple-100',
    textClass: 'text-purple-800',
    hoverClass: 'hover:bg-purple-200'
  },
  {
    id: 'orange',
    name: 'Orange',
    bgClass: 'bg-orange-100',
    textClass: 'text-orange-800',
    hoverClass: 'hover:bg-orange-200'
  },
  {
    id: 'pink',
    name: 'Pink',
    bgClass: 'bg-pink-100',
    textClass: 'text-pink-800',
    hoverClass: 'hover:bg-pink-200'
  },
  {
    id: 'cyan',
    name: 'Cyan',
    bgClass: 'bg-cyan-100',
    textClass: 'text-cyan-800',
    hoverClass: 'hover:bg-cyan-200'
  }
];