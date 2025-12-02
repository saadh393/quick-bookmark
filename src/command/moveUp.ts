import * as vscode from 'vscode'

import { Resource, FavoritesProvider } from '../provider/FavoritesProvider'
import configMgr from '../helper/configMgr'
import { getCurrentResources, replaceArrayElements } from '../helper/util'

export function moveUp(favoritesProvider: FavoritesProvider) {
  return vscode.commands.registerCommand('favorites.moveUp', async function(value: Resource) {
    const config = vscode.workspace.getConfiguration('favorites')
    const currentGroup = configMgr.get('currentGroup') as string
    const targetParentId = value?.parentId || undefined

    const items = await getCurrentResources()
    const filteredArray: {
      filePath: string
      group: string
      previousIndex: number
      id?: string
    }[] = []

    items.forEach((item, index) => {
      const isFolder = (item as any).type === 'folder'
      if (!isFolder && item.group === currentGroup) {
        const parentId = (item as any).parentId || undefined
        if (parentId === targetParentId) {
          filteredArray.push({
            filePath: (item as any).filePath,
            group: item.group,
            previousIndex: index,
            id: (item as any).id,
          })
        }
      }
    })

    const target = filteredArray.find((i) => (value.id && i.id ? i.id === value.id : i.filePath === value.value))
    if (!target) {
      return
    }

    const currentIndex = target.previousIndex
    const targetIndexOfFiltered = filteredArray.findIndex((i) =>
      value.id && i.id ? i.id === value.id : i.filePath === value.value
    )

    if (!filteredArray.length) {
      return
    }

    if (currentIndex === filteredArray[0].previousIndex) {
      return
    }

    const previousIndex = filteredArray[targetIndexOfFiltered - 1].previousIndex

    let resources = replaceArrayElements(items, currentIndex, previousIndex)

    config.update('sortOrder', 'MANUAL', false)
    configMgr.save('resources', resources).catch(console.warn)
  })
}
