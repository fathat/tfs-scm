import * as vscode from 'vscode';

export const getActiveDocument = () => {
    const { document } = vscode.window.activeTextEditor || { document: undefined };
    return document && !document.isUntitled ? document : undefined;
};