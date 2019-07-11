import * as vscode from 'vscode';

export class TFSSourceControl implements vscode.Disposable {
    
    private _scm: vscode.SourceControl;

    constructor(context: vscode.ExtensionContext, private readonly workspaceFolder: vscode.WorkspaceFolder) {
        this._scm = vscode.scm.createSourceControl("tfs", "tfs", workspaceFolder.uri);

        context.subscriptions.push(this._scm);

        let fileSystemWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(workspaceFolder, "**/*"));
        fileSystemWatcher.onDidChange(uri => this.onResourceChange(uri), context.subscriptions);
		fileSystemWatcher.onDidCreate(uri => this.onResourceCreate(uri), context.subscriptions);
		fileSystemWatcher.onDidDelete(uri => this.onResourceDelete(uri), context.subscriptions);
    }

    onResourceCreate(_uri: vscode.Uri): void {
        console.log(`TFS-SCM: Resource created ${_uri.toString()}`);
    }

    onResourceChange(_uri: vscode.Uri): void {
		console.log(`TFS-SCM: Resource changed ${_uri.toString()}`);
    }
    
    onResourceDelete(_uri: vscode.Uri): void {
        console.log(`TFS-SCM: Resource deleted ${_uri.toString()}`);
    }

    dispose() {
        
    }
}
