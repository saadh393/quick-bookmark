import * as vscode from 'vscode'

import { Resource } from '../provider/FavoritesProvider'
import configMgr from '../helper/configMgr'
import { getCurrentResources, pathResolve } from '../helper/util'

export function deleteFavorite() {
  return vscode.commands.registerCommand('favorites.deleteFavorite', (value?: Resource | vscode.Uri) => {
    if (!value) {
      if (!vscode.window.activeTextEditor) {
        return vscode.window.showWarningMessage('You have to choose a resource first')
      }
      value = vscode.window.activeTextEditor.document.uri
    }

    const previousResources = getCurrentResources()
    const currentGroup = configMgr.get('currentGroup')

    const uri = (<Resource>value).resourceUri || <vscode.Uri>value

    if ((<Resource>value)?.type === 'folder') {
      return
    }

    if (uri.scheme === 'file') {
      const fsPath = (<Resource>value).value || (<vscode.Uri>value).fsPath

      const targetId = (<Resource>value)?.id
      const targetParentId = (<Resource>value)?.parentId

      configMgr
        .save(
          'resources',
          previousResources.filter((r) => {
            if (r.type === 'folder') {
              return true
            }

            if (r.group !== currentGroup) {
              return true
            }

            if (targetId && r.id) {
              return r.id !== targetId
            }

            const isSamePath = r.filePath === fsPath || pathResolve(r.filePath) === fsPath
            const isSameParent = (r as any).parentId === targetParentId

            return !(isSamePath && isSameParent)
          })
        )
        .catch(console.warn)
    } else {
      // Not a file, so remove the stringified uri
      configMgr
        .save(
          'resources',
          previousResources.filter((r) => {
            if (r.type === 'folder') {
              return true
            }

            if (r.group !== currentGroup) {
              return true
            }

            if ((<Resource>value)?.id && r.id) {
              return r.id !== (<Resource>value).id
            }

            const isSamePath = r.filePath === uri.toString()
            const isSameParent = (r as any).parentId === (<Resource>value)?.parentId

            return !(isSamePath && isSameParent)
          })
        )
        .catch(console.warn)
    }
  })
}
