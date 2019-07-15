import * as vscode from 'vscode';
import { TFSRepository, TFSStatusItem } from './tfsRepository';
import { Uri } from 'vscode';
import { TFSLocalDatabase } from './tfsLocalDatabase';

enum UpdateMode {
    Normal,
    IncludeAll,
    ExcludeAll
}

export class TFSWorkspace implements vscode.Disposable {
    
    private _scm: vscode.SourceControl;
    private includedChanges: vscode.SourceControlResourceGroup;
    private excludedChanges: vscode.SourceControlResourceGroup;
    private repo: TFSRepository;

    constructor(context: vscode.ExtensionContext, private readonly workspaceFolder: vscode.WorkspaceFolder, private database: TFSLocalDatabase) {
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
        
        this.update();
    }

    update() {
        this.repo.provideStatus().then((items: TFSStatusItem[]) => {
            this.updateChanges(items, UpdateMode.Normal);
        });
    }

    includeAll() {
        this.repo.provideStatus().then((items: TFSStatusItem[]) => {
            this.database.includeAll(items.map(item => item.resourceUri.fsPath));
            this.updateChanges(items, UpdateMode.IncludeAll);
        });
    }

    excludeAll() {
        this.repo.provideStatus().then((items: TFSStatusItem[]) => {
            this.updateChanges(items, UpdateMode.ExcludeAll);
        });
    }

    updateChanges(items: TFSStatusItem[], updateMode: UpdateMode) {
        if(updateMode === UpdateMode.Normal) {
            let incChanges: vscode.SourceControlResourceState[] = [];
            let excChanges: vscode.SourceControlResourceState[] = [];

            for(const item of items) {
                if(this.database.included(item.resourceUri.fsPath)) {
                    incChanges.push(item);
                } else {
                    excChanges.push(item);
                }
            }

            this.includedChanges.resourceStates = incChanges;
            this.excludedChanges.resourceStates = excChanges;
        } else if(updateMode === UpdateMode.ExcludeAll) {
            this.includedChanges.resourceStates = [];
            let excChanges: vscode.SourceControlResourceState[] = [];
            for(const item of items) {
                excChanges.push(item);
            }
            this.excludedChanges.resourceStates = excChanges;
        } else if(updateMode === UpdateMode.IncludeAll) {
            this.excludedChanges.resourceStates = [];
            let incChanges: vscode.SourceControlResourceState[] = [];
            for(const item of items) {
                incChanges.push(item);
            }
            this.includedChanges.resourceStates = incChanges;
        }
    }

    onResourceCreate(_uri: vscode.Uri): void {
        console.log(`TFS-SCM: Resource created ${_uri.toString()}`);
        this.update();
    }

    onResourceChange(_uri: vscode.Uri): void {
        console.log(`TFS-SCM: Resource changed ${_uri.toString()}`);
        this.update();
    }
    
    onResourceDelete(_uri: vscode.Uri): void {
        console.log(`TFS-SCM: Resource deleted ${_uri.toString()}`);
        this.update();
    }

    dispose() {
        
    }
}
