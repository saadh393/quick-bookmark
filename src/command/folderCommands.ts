import * as vscode from 'vscode'

import { FavoritesProvider, Resource } from '../provider/FavoritesProvider'
import configMgr from '../helper/configMgr'
import { DEFAULT_GROUP } from '../enum'
import { createFavoriteId, getCurrentResources } from '../helper/util'
import { FavoriteFolderInSettings, ItemInSettingsJson } from '../model'

export function createFolder(favoritesProvider: FavoritesProvider) {
  return vscode.commands.registerCommand('favorites.folder.create', async () => {
    const currentGroup = (configMgr.get('currentGroup') as string) || DEFAULT_GROUP
    const resources = getCurrentResources()
    const folders = resources.filter(
      (item) => item.type === 'folder' && item.group === currentGroup
    ) as FavoriteFolderInSettings[]

    const name = await vscode.window.showInputBox({
      prompt: 'Enter a folder name',
      placeHolder: 'Folder name',
    })

    if (!name) {
      return
    }

    if (folders.some((folder) => folder.name === name)) {
      vscode.window.showWarningMessage(`A folder named "${name}" already exists in this group.`)
      return
    }

    const nextResources: ItemInSettingsJson[] = resources.concat([
      {
        id: createFavoriteId(),
        name,
        group: currentGroup,
        type: 'folder',
      } as FavoriteFolderInSettings,
    ])

    await configMgr.save('resources', nextResources).catch(console.warn)
    favoritesProvider.refresh()
  })
}

export function renameFolder(favoritesProvider: FavoritesProvider) {
  return vscode.commands.registerCommand('favorites.folder.rename', async (value: Resource) => {
    if (value?.type !== 'folder') {
      return
    }

    const currentGroup = (configMgr.get('currentGroup') as string) || DEFAULT_GROUP
    const resources = getCurrentResources()
    const folders = resources.filter(
      (item) => item.type === 'folder' && item.group === currentGroup
    ) as FavoriteFolderInSettings[]

    const target = folders.find((folder) => folder.id === value.id)
    if (!target) {
      return
    }

    const name = await vscode.window.showInputBox({
      prompt: 'Rename folder',
      value: target.name,
    })

    if (!name || name === target.name) {
      return
    }

    if (folders.some((folder) => folder.name === name)) {
      vscode.window.showWarningMessage(`A folder named "${name}" already exists in this group.`)
      return
    }

    const nextResources = resources.map((item) => {
      if (item.type === 'folder' && item.id === target.id) {
        return { ...(item as FavoriteFolderInSettings), name }
      }
      return item
    })

    await configMgr.save('resources', nextResources).catch(console.warn)
    favoritesProvider.refresh()
  })
}

export function deleteFolder(favoritesProvider: FavoritesProvider) {
  return vscode.commands.registerCommand('favorites.folder.delete', async (value: Resource) => {
    if (value?.type !== 'folder') {
      return
    }

    const confirm = await vscode.window.showWarningMessage(
      `Delete folder "${value.label}" and its items?`,
      { modal: true },
      'Delete'
    )

    if (confirm !== 'Delete') {
      return
    }

    if (!value.id) {
      return
    }

    const currentGroup = (configMgr.get('currentGroup') as string) || DEFAULT_GROUP
    const resources = getCurrentResources()

    const collectDescendants = (folderId: string, items: ItemInSettingsJson[], bucket: Set<string>) => {
      bucket.add(folderId)
      items.forEach((item) => {
        if (item.group === currentGroup && item.parentId === folderId && item.type === 'folder' && item.id) {
          collectDescendants(item.id, items, bucket)
        }
      })
    }

    const idsToRemove = new Set<string>()
    collectDescendants(value.id, resources, idsToRemove)

    const nextResources = resources.filter((item) => {
      if (item.group !== currentGroup) {
        return true
      }

      if (item.type === 'folder' && item.id && idsToRemove.has(item.id)) {
        return false
      }

      if ((item as any).parentId && idsToRemove.has((item as any).parentId)) {
        return false
      }

      return true
    })

    await configMgr.save('resources', nextResources).catch(console.warn)
    favoritesProvider.refresh()
  })
}
