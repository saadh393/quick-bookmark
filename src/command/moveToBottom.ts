import * as vscode from 'vscode'

import { Resource, FavoritesProvider } from '../provider/FavoritesProvider'
import configMgr from '../helper/configMgr'
import { getCurrentResources } from '../helper/util'

export function moveToBottom(favoritesProvider: FavoritesProvider) {
  return vscode.commands.registerCommand('favorites.moveToBottom', async function (value: Resource) {
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
    if (!target || !filteredArray.length) {
      return
    }

    const currentIndex = target.previousIndex

    if (currentIndex === filteredArray[filteredArray.length - 1].previousIndex) {
      return
    }

    const bottomIndex = filteredArray[filteredArray.length - 1].previousIndex
    const [itemToMove] = items.splice(currentIndex, 1)
    items.splice(bottomIndex, 0, itemToMove)

    config.update('sortOrder', 'MANUAL', false)
    configMgr.save('resources', items).catch(console.warn)
  })
}
