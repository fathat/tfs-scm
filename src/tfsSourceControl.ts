import * as vscode from 'vscode';
import { TFSRepository, TFSStatusItem, TFS_SCHEME } from './tfsRepository';
import { Uri, ProviderResult, QuickDiffProvider, Disposable } from 'vscode';
import { TFSLocalDatabase } from './tfsLocalDatabase';

enum UpdateMode {
    Normal,
    IncludeAll,
    ExcludeAll
}

export class TFSWorkspace implements Disposable, QuickDiffProvider {

    private scm: vscode.SourceControl;
    private includedChanges: vscode.SourceControlResourceGroup;
    private excludedChanges: vscode.SourceControlResourceGroup;
    private repo: TFSRepository[] = [];

    provideOriginalResource?(uri: Uri, token: vscode.CancellationToken): ProviderResult<Uri> {
		let path = uri.fsPath;
		return Uri.parse(`${TFS_SCHEME}:${path}`);
    }
    
    constructor(context: vscode.ExtensionContext, private database: TFSLocalDatabase) {
        this.scm = vscode.scm.createSourceControl("tfs", "tfs");
        this.includedChanges = this.scm.createResourceGroup('tfs-included-changes', 'Included Changes');
        this.excludedChanges = this.scm.createResourceGroup('tfs-excluded-changes', 'Excluded Changes');
        this.scm.inputBox.placeholder = 'Commit message goes here';
        
        context.subscriptions.push(this.scm);

        if(vscode.workspace.workspaceFolders) {
            for(const wf of vscode.workspace.workspaceFolders) {
                let fileSystemWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(wf, "**/*"));
                this.repo.push(new TFSRepository(wf));
                fileSystemWatcher.onDidChange(uri => this.onResourceChange(uri), context.subscriptions);
                fileSystemWatcher.onDidCreate(uri => this.onResourceCreate(uri), context.subscriptions);
                fileSystemWatcher.onDidDelete(uri => this.onResourceDelete(uri), context.subscriptions);
            }
        }
        
        this.update();
    }

    async status() {
        if(this.repo.length === 0) {
            return [];
        }
        else if(this.repo.length === 1) {
            return this.repo[0].provideStatus();
        }

        const all = await Promise.all(this.repo.map(r => r.provideStatus()));
        return all.reduce((a, b) => a.concat(b));
    }

    update() {
        this.status().then((items: TFSStatusItem[]) => {
            this.updateChanges(items, UpdateMode.Normal);
        });
    }

    includeAll() {
        this.status().then((items: TFSStatusItem[]) => {
            this.database.includeAll(items.map(item => item.resourceUri.fsPath));
            this.updateChanges(items, UpdateMode.IncludeAll);
        });
    }

    excludeAll() {
        this.status().then((items: TFSStatusItem[]) => {
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
