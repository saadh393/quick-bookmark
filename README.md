# Quick Bookmark

Quickly bookmark files and folders (local or remote), organize them into folders and groups, and open them from a dedicated view.

This project is a fork of [howardzuo/vscode-favorites](https://github.com/leftstick/vscode-favorites). Thanks to Howard Zuo and the contributors to the original extension.

![Quick Bookmark preview](images/preview.gif)

## Features

- Bookmark files or folders from the Explorer or editor context menu.
- Organize bookmarks into custom folders inside each group; pick the target folder when adding.
- Dedicated Favorites view with commands to open, reveal in OS/side bar, reorder, and manage folders.
- Works in single- and multi-root workspaces and supports remote resources.

## Install

- From the Marketplace (once published): `ext install <your-publisher>.quick-bookmark`
- Or install a packaged VSIX locally:
  1) `npm install && npm run package`
  2) In VS Code, run “Extensions: Install from VSIX...” and choose the generated `.vsix`.

## Usage

- Right-click any file or folder and choose **Add to Favorites**.
- Choose a destination folder (or root) inside the current group; the bookmark is stored in your workspace settings or `.code-workspace`.
- Open the **Favorites** view to access bookmarks quickly; use context menus to open, reveal, reorder, or remove items.
- Create, rename, or delete favorites folders from the view title actions; switch groups via command palette commands.

## Configuration

```json
{
  "favorites.resources": [],          // Resources you have bookmarked
  "favorites.sortOrder": "ASC",       // ASC, DESC, MANUAL
  "favorites.saveSeparated": false,   // Store config in an extra .vscfavoriterc file
  "favorites.groups": ["Default"],    // All groups in the workspace
  "favorites.currentGroup": "Default" // The group currently in use
}
```

> These settings are normally managed through the UI; you rarely need to edit them manually.

## Credits

Built on top of the original **vscode-favorites** by Howard Zuo and contributors.

## License

[GPL v3 License](LICENSE)
