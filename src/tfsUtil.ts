import * as fs from 'fs';
import * as vscode from 'vscode';

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
