import * as fs from 'fs';
import * as vscode from 'vscode';


export function findWorkspaceRoot(uri: vscode.Uri) {
    if(vscode.workspace.workspaceFolders) {
        for(const workspaceFolder of vscode.workspace.workspaceFolders) {
            if(uri.path.toLowerCase().startsWith(workspaceFolder.uri.path.toLowerCase())) {
                return workspaceFolder;
            }
        }
    }
    throw new Error("Could not find root!");
}

export const getActiveDocument = () => {
    const { document } = vscode.window.activeTextEditor || { document: undefined };
    return document && !document.isUntitled ? document : undefined;
};

export const isWritable = (fileName: fs.PathLike) => {
  try {
    fs.accessSync(fileName, fs.constants.W_OK);
    return true;
  } catch(err) {
    return false;
  }
};
