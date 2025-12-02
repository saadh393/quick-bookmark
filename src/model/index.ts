import { Uri } from 'vscode'

import { FileStat } from '../enum'

export type FavoriteType = 'resource' | 'folder'

export interface Item {
  filePath?: string
  stat: FileStat
  group: string
  uri?: Uri
  type: FavoriteType
  name?: string
  id?: string
  parentId?: string
}

export interface FavoriteResourceInSettings {
  id?: string
  filePath: string
  group: string
  parentId?: string
  type?: 'resource'
}

export interface FavoriteFolderInSettings {
  id: string
  name: string
  group: string
  parentId?: string
  type: 'folder'
}

export type ItemInSettingsJson = FavoriteResourceInSettings | FavoriteFolderInSettings
