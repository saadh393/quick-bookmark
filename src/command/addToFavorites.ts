import * as vscode from 'vscode'
import { isMultiRoots, getSingleRootPath, getCurrentResources, createFavoriteId } from '../helper/util'
import configMgr from '../helper/configMgr'
import { DEFAULT_GROUP } from '../enum'
import { FavoriteFolderInSettings, ItemInSettingsJson } from '../model'

export function addToFavorites() {
  return vscode.commands.registerCommand('favorites.addToFavorites', async (fileUri?: vscode.Uri) => {
    if (!fileUri) {
      if (!vscode.window.activeTextEditor) {
        return vscode.window.showWarningMessage('You have to choose a resource first')
      }
      fileUri = vscode.window.activeTextEditor.document.uri
    }

    const fileName = fileUri.fsPath

    const previousResources = getCurrentResources()

    // Store the stringified uri for any resource that isn't a file
    const newResource =
      fileUri.scheme !== 'file'
        ? fileUri.toString()
        : isMultiRoots()
        ? fileName
        : fileName.substr(getSingleRootPath().length + 1)

    const currentGroup = (configMgr.get('currentGroup') as string) || DEFAULT_GROUP

    const folders = (previousResources as ItemInSettingsJson[]).filter(
      (r) => r.type === 'folder' && r.group === currentGroup
    ) as FavoriteFolderInSettings[]

    let targetFolderId: string | undefined
    if (folders.length) {
      const pick = await vscode.window.showQuickPick(
        [{ label: 'Add to root', id: '' }].concat(folders.map((folder) => ({ label: folder.name, id: folder.id }))),
        {
          placeHolder: 'Select a favorites folder (or choose Add to root)',
        }
      )

      if (!pick) {
        return
      }
      targetFolderId = pick.id || undefined
    }

    if (
      previousResources.some(
        (r) =>
          r.type === 'resource' &&
          r.filePath === newResource &&
          r.group === currentGroup &&
          r.parentId === targetFolderId
      )
    ) {
      return
    }

    await configMgr
      .save(
        'resources',
        previousResources.concat([
          {
            id: createFavoriteId(),
            filePath: newResource,
            group: currentGroup,
            type: 'resource',
            parentId: targetFolderId,
          },
        ] as Array<ItemInSettingsJson>)
      )
      .catch(console.warn)

    if (configMgr.get('groups') == undefined || configMgr.get('groups').length == 0) {
      configMgr.save('groups', [DEFAULT_GROUP]).catch(console.warn)
    }
  })
}
