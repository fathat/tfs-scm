import * as vscode from 'vscode';
import { TFSRepository, TFSStatusItem } from './tfsRepository';
import { Uri } from 'vscode';

export class TFSSourceControl implements vscode.Disposable {
    
    private _scm: vscode.SourceControl;
    private includedChanges: vscode.SourceControlResourceGroup;
    private excludedChanges: vscode.SourceControlResourceGroup;
    private repo: TFSRepository;

    constructor(context: vscode.ExtensionContext, private readonly workspaceFolder: vscode.WorkspaceFolder) {
        this._scm = vscode.scm.createSourceControl("tfs", "tfs", workspaceFolder.uri);
        this.includedChanges = this._scm.createResourceGroup('tfs-included-changes', 'Included Changes');
        this.excludedChanges = this._scm.createResourceGroup('tfs-excluded-changes', 'Excluded Changes');
        this.repo = new TFSRepository(workspaceFolder, '1234');
        this._scm.quickDiffProvider = this.repo;
        this._scm.inputBox.placeholder = 'Commit message goes here';

        context.subscriptions.push(this._scm);

        let fileSystemWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(workspaceFolder, "**/*"));
        fileSystemWatcher.onDidChange(uri => this.onResourceChange(uri), context.subscriptions);
		fileSystemWatcher.onDidCreate(uri => this.onResourceCreate(uri), context.subscriptions);
        fileSystemWatcher.onDidDelete(uri => this.onResourceDelete(uri), context.subscriptions);
        
        this.repo.provideStatus().then((items: TFSStatusItem[]) => {
            this.updateChanges(items);
        });
    }

    updateChanges(items: TFSStatusItem[]) {
        let incChanges: vscode.SourceControlResourceState[] = [];
        let excChanges: vscode.SourceControlResourceState[] = [];

        for(const item of items) {
            const docUri = Uri.file(item.localpath);
            let resourceState: vscode.SourceControlResourceState = {
                resourceUri: docUri,
                decorations: {
                    strikeThrough: false,
                    tooltip: item.serverpath
                }
            };
            if(item.changeset) {
                incChanges.push(resourceState);
            } else {
                excChanges.push(resourceState);
            }
        }

        this.includedChanges.resourceStates = incChanges;
        this.excludedChanges.resourceStates = excChanges;
    }

    onResourceCreate(_uri: vscode.Uri): void {
        console.log(`TFS-SCM: Resource created ${_uri.toString()}`);
        this.repo.provideStatus().then((items: TFSStatusItem[]) => {
            this.updateChanges(items);
        });
    }

    onResourceChange(_uri: vscode.Uri): void {
        console.log(`TFS-SCM: Resource changed ${_uri.toString()}`);
        this.repo.provideStatus().then((items: TFSStatusItem[]) => {
            this.updateChanges(items);
        });
    }
    
    onResourceDelete(_uri: vscode.Uri): void {
        console.log(`TFS-SCM: Resource deleted ${_uri.toString()}`);
        this.repo.provideStatus().then((items: TFSStatusItem[]) => {
            this.updateChanges(items);
        });
    }

    dispose() {
        
    }
}
