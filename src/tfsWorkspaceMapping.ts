import * as vscode from 'vscode';
import { TFSRepositoryView, TFS_SCHEME } from './tfsRepositoryView';
import { TFSStatusItem } from "./TFSStatusItem";
import { Uri, ProviderResult, QuickDiffProvider, Disposable } from 'vscode';
import { TFSPendingChangesDatabase } from './tfsLocalDatabase';
import { ITFSWorkspaceInfo, ITFSWorkspaceMappingInfo } from './tfsWorkspaceInfo';


export class TFSWorkspaceMapping implements Disposable, QuickDiffProvider {

    private scm: vscode.SourceControl;
    private includedChanges: vscode.SourceControlResourceGroup;
    private excludedChanges: vscode.SourceControlResourceGroup;
    private mappings: TFSRepositoryView[] = [];

    private fileSystemWatcher: vscode.FileSystemWatcher;
    
    private isUpdating: boolean = false;

    provideOriginalResource?(uri: Uri, token: vscode.CancellationToken): ProviderResult<Uri> {
		let path = uri.fsPath;
		return Uri.parse(`${TFS_SCHEME}:${path}`);
    }
    
    constructor(context: vscode.ExtensionContext, private workspace: ITFSWorkspaceInfo,  private mapping: ITFSWorkspaceMappingInfo, private database: TFSPendingChangesDatabase) {
        this.scm = vscode.scm.createSourceControl("tfs", `TFS ${workspace.workspace} :: ${mapping.localPath}`, Uri.file(mapping.localPath));
        this.includedChanges = this.scm.createResourceGroup('tfs-included-changes', 'Included Changes');
        this.excludedChanges = this.scm.createResourceGroup('tfs-excluded-changes', 'Excluded Changes');
        this.scm.inputBox.placeholder = 'Commit message goes here';
        context.subscriptions.push(this.scm);
        
        this.fileSystemWatcher = vscode.workspace.createFileSystemWatcher("**/*");
        this.mappings.push(new TFSRepositoryView(mapping.localPath));
        this.fileSystemWatcher.onDidChange(uri =>{ 
            this.onResourceChange(uri);
        }, context.subscriptions);
        this.fileSystemWatcher.onDidCreate(uri => this.onResourceCreate(uri), context.subscriptions);
        this.fileSystemWatcher.onDidDelete(uri => this.onResourceDelete(uri), context.subscriptions);
                
        this.update();
    }

    getSCMHandle() {
        return (this.scm as any).handle;
    }

    getMappingInfo() {
        return this.mapping;
    }

    getIncludedChanges() {
        return this.includedChanges;
    }

    async status() {
        if(this.mappings.length === 0) {
            return [];
        }
        else if(this.mappings.length === 1) {
            return this.mappings[0].provideStatus();
        }

        const all = await Promise.all(this.mappings.map(r => r.provideStatus()));
        return all.reduce((a, b) => a.concat(b));
    }

    update() {
        if(this.isUpdating) {
            return;
        }
        this.isUpdating = true;
        this.status().then((items: TFSStatusItem[]) => {
            this.updateChanges(items);
            this.isUpdating = false;
        });         
    }
    

    updateChanges(items: TFSStatusItem[]) {
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
