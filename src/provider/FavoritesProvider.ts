import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

import { getCurrentResources, pathResolve } from '../helper/util'
import configMgr from '../helper/configMgr'
import { DEFAULT_GROUP, FileStat } from '../enum'
import { FavoriteFolderInSettings, FavoriteResourceInSettings, Item } from '../model'

export class FavoritesProvider implements vscode.TreeDataProvider<Resource> {
  private _onDidChangeTreeData = new vscode.EventEmitter<Resource | void>()
  readonly onDidChangeTreeData: vscode.Event<Resource | void> = this._onDidChangeTreeData.event

  // Use for detecting doubleclick
  public lastOpened: { uri: vscode.Uri; date: Date }

  refresh(): void {
    this._onDidChangeTreeData.fire()
  }

  getTreeItem(element: Resource): vscode.TreeItem {
    return element
  }

  async getChildren(element?: Resource): Promise<Resource[]> {
    const currentGroup = (configMgr.get('currentGroup') as string) || DEFAULT_GROUP
    const favorites = await this.getFavoriteItems(currentGroup)
    const sort = <string>vscode.workspace.getConfiguration('favorites').get('sortOrder')

    if (!favorites || !favorites.length) {
      return []
    }

    if (!element) {
      const folderIds = new Set(favorites.filter((item) => item.type === 'folder' && item.id).map((item) => item.id))
      const roots = favorites.filter((item) => !item.parentId || (item.parentId && !folderIds.has(item.parentId)))
      return this.data2Resource(this.sortItems(roots, sort), 'resource')
    }

    if (element.type === 'folder' && element.id) {
      const children = favorites.filter((item) => item.parentId === element.id)
      return this.data2Resource(this.sortItems(children, sort), 'resource')
    }

    if (element.uri && element.collapsibleState === vscode.TreeItemCollapsibleState.Collapsed) {
      return this.getChildrenResources({ filePath: element.value, group: currentGroup, type: 'resource' })
    }

    return []
  }

  private async getFavoriteItems(currentGroup: string): Promise<Array<Item>> {
    const resources = getCurrentResources().filter((item) => item.group === currentGroup)

    const stats = await Promise.all(
      resources.map((item) => {
        if (item.type === 'folder') {
          const folderItem: Item = {
            stat: FileStat.DIRECTORY,
            group: currentGroup,
            type: 'folder',
            name: (item as FavoriteFolderInSettings).name,
            id: item.id,
            parentId: item.parentId,
          }
          return Promise.resolve(folderItem)
        }

        return this.getResourceStat(item as FavoriteResourceInSettings).then((res) => ({
          ...res,
          type: 'resource' as const,
          id: item.id,
          parentId: item.parentId,
        }))
      })
    )

    return stats.filter((i) => i.type === 'folder' || i.stat !== FileStat.NEITHER)
  }

  private sortItems(resources: Array<Item>, sort: string): Array<Item> {
    if (sort === 'MANUAL') {
      return resources
    }

    const isAsc = sort === 'ASC'

    return resources.slice().sort((a, b) => {
      const aName = this.getItemLabel(a)
      const bName = this.getItemLabel(b)
      const aIsDir = a.type === 'folder' || a.stat === FileStat.DIRECTORY
      const bIsDir = b.type === 'folder' || b.stat === FileStat.DIRECTORY

      if (aIsDir && !bIsDir) {
        return -1
      }
      if (!aIsDir && bIsDir) {
        return 1
      }

      if (aName < bName) {
        return isAsc ? -1 : 1
      }
      if (aName > bName) {
        return isAsc ? 1 : -1
      }
      return 0
    })
  }

  private getItemLabel(item: Item): string {
    if (item.type === 'folder') {
      return item.name
    }
    return path.basename(item.filePath)
  }

  private getChildrenResources(item: FavoriteResourceInSettings): Thenable<Array<Resource>> {
    const sort = <string>vscode.workspace.getConfiguration('favorites').get('sortOrder')

    if (item.filePath.match(/^[A-Za-z][A-Za-z0-9+-.]*:\/\//)) {
      // filePath is a uri string
      const uri = vscode.Uri.parse(item.filePath)
      return vscode.workspace.fs
        .readDirectory(uri)
        .then((entries) =>
          Promise.all(
            entries.map((e) =>
              this.getResourceStat({
                filePath: vscode.Uri.joinPath(uri, e[0]).toString(),
                group: item.group,
                type: 'resource',
              })
            )
          )
        )
        .then((items) => this.data2Resource(this.sortItems(items, sort === 'MANUAL' ? 'ASC' : sort), 'resourceChild'))
    }

    // Not a uri string
    return new Promise<Array<Resource>>((resolve) => {
      fs.readdir(pathResolve(item.filePath), (err, files) => {
        if (err) {
          return resolve([])
        }

        Promise.all(
          files.map((f) =>
            this.getResourceStat({
              filePath: path.join(item.filePath, f),
              group: item.group,
              type: 'resource',
            })
          )
        )
          .then((data) => this.data2Resource(this.sortItems(data, sort === 'MANUAL' ? 'ASC' : sort), 'resourceChild'))
          .then(resolve)
      })
    })
  }

  private getResourceStat(item: FavoriteResourceInSettings): Thenable<Item> {
    return new Promise((resolve) => {
      if (item.filePath.match(/^[A-Za-z][A-Za-z0-9+-.]*:\/\//)) {
        // filePath is a uri string
        const uri = vscode.Uri.parse(item.filePath)
        resolve(
          vscode.workspace.fs.stat(uri).then((fileStat) => {
            if (fileStat.type === vscode.FileType.File) {
              return {
                filePath: item.filePath,
                stat: FileStat.FILE,
                uri,
                group: item.group,
                type: 'resource',
              }
            }
            if (fileStat.type === vscode.FileType.Directory) {
              return {
                filePath: item.filePath,
                stat: FileStat.DIRECTORY,
                uri,
                group: item.group,
                type: 'resource',
              }
            }
            return {
              filePath: item.filePath,
              stat: FileStat.NEITHER,
              uri,
              group: item.group,
              type: 'resource',
            }
          })
        )
      } else {
        // filePath is a file path
        fs.stat(pathResolve(item.filePath), (err, stat: fs.Stats) => {
          if (err) {
              return resolve({
                filePath: item.filePath,
                stat: FileStat.NEITHER,
                group: item.group,
                type: 'resource',
              })
            }
            if (stat.isDirectory()) {
              return resolve({
                filePath: item.filePath,
                stat: FileStat.DIRECTORY,
                group: item.group,
                type: 'resource',
              })
            }
            if (stat.isFile()) {
              return resolve({
                filePath: item.filePath,
                stat: FileStat.FILE,
                group: item.group,
                type: 'resource',
              })
            }
            return resolve({
              filePath: item.filePath,
              stat: FileStat.NEITHER,
              group: item.group,
              type: 'resource',
            })
          })
        }
      })
  }

  private data2Resource(data: Array<Item>, contextValue: string): Array<Resource> {
    // contextValue set on Resource gets a 'uri.' prefix if the favorite is specified as a uri,
    //   and a '.dir' suffix if it represents a directory rather than a file.
    // The when-clauses on our contributions to the 'view/item/context' menu use these modifiers
    //   to be smarter about which commands to offer.

    return data.map((i) => {
      if (i.type === 'folder') {
        const folder = new Resource(
          i.name,
          vscode.TreeItemCollapsibleState.Collapsed,
          i.id || i.name,
          'favorite.folder',
          undefined,
          undefined,
          'folder',
          i.id,
          i.parentId
        )
        folder.tooltip = i.name
        folder.id = i.id || i.name
        return folder
      }

      if (!i.uri) {
        let uri = vscode.Uri.parse(`file://${pathResolve(i.filePath)}`)
        if (os.platform().startsWith('win')) {
          uri = vscode.Uri.parse(`file:///${pathResolve(i.filePath)}`.replace(/\\/g, '/'))
        }
        if (i.stat === FileStat.DIRECTORY) {
          const resource = new Resource(
            path.basename(i.filePath),
            vscode.TreeItemCollapsibleState.Collapsed,
            i.filePath,
            contextValue + '.dir',
            undefined,
            uri,
            'resource',
            i.id,
            i.parentId
          )
          resource.id = i.id || i.filePath
          return resource
        }

        const resource = new Resource(
          path.basename(i.filePath),
          vscode.TreeItemCollapsibleState.None,
          i.filePath,
          contextValue,
          {
            command: 'favorites.open',
            title: '',
            arguments: [uri],
          },
          uri,
          'resource',
          i.id,
          i.parentId
        )
        resource.id = i.id || i.filePath
        return resource
      } else {
        if (i.stat === FileStat.DIRECTORY) {
          const resource = new Resource(
            path.basename(i.filePath),
            vscode.TreeItemCollapsibleState.Collapsed,
            i.filePath,
            'uri.' + contextValue + '.dir',
            undefined,
            i.uri,
            'resource',
            i.id,
            i.parentId
          )
          resource.id = i.id || i.filePath
          return resource
        }
        const resource = new Resource(
          path.basename(i.filePath),
          vscode.TreeItemCollapsibleState.None,
          i.filePath,
          'uri.' + contextValue,
          {
            command: 'favorites.open',
            title: '',
            arguments: [i.uri],
          },
          i.uri,
          'resource',
          i.id,
          i.parentId
        )
        resource.id = i.id || i.filePath
        return resource
      }
    })
  }
}

export class Resource extends vscode.TreeItem {
  public resourceUri?: vscode.Uri

  constructor(
    public label: string,
    public collapsibleState: vscode.TreeItemCollapsibleState,
    public value: string,
    public contextValue: string,
    public command?: vscode.Command,
    public uri?: vscode.Uri,
    public type: 'resource' | 'folder' = 'resource',
    public id?: string,
    public parentId?: string
  ) {
    super(label, collapsibleState)

    this.resourceUri = uri ? uri : this.type !== 'folder' ? vscode.Uri.file(value) : undefined
    this.tooltip = this.type === 'folder' ? label : value
  }
}
