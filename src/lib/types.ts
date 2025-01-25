export interface Game {
  id: string;
  name: string;
  description: string;
  system_id: string;
  module_properties: ModuleProperty[];
}

export interface Event {
  id: string;
  game_id: string;
  name: string;
  description: string;
  start_time: string;
  end_time: string;
}

export type ModuleColor = 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'cyan';

export interface Module {
  id: string;
  event_id: string;
  author_id: string;
  name: string;
  summary: string;
  start_time: string;
  duration: number;
  color: ModuleColor;
  properties: Record<string, any>;
}

export interface System {
  id: string;
  name: string;
  description: string;
  authors: string;
  url: string;
}

export interface ModuleProperty {
  name: string;
  displayName: string;
  variableType: 'shortString' | 'longString' | 'number' | 'dateTime';
}

export interface GameUser {
  id: string;
  game_id: string;
  user_id: string;
  role: 'admin' | 'writer';
}