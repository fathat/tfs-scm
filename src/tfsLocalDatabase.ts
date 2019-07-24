import * as vscode from 'vscode';

class TFSLocalData {
    pendingChanges: string[] = [];
}

export enum StateChange {
    Unmodified,
    Modified
}

export class TFSPendingChangesDatabase {
    data: TFSLocalData;

    constructor(private context: vscode.ExtensionContext) {
        this.data = context.workspaceState.get<TFSLocalData>("tfsdata") || new TFSLocalData();
    }

    excludeList(changes: string[]): void {
        this.data.pendingChanges = this.data.pendingChanges.filter(c => !changes.includes(c));
        this.write();
    }

    includeList(changes: string[]): void {
        for(const path of changes) {
            if(!this.data.pendingChanges.includes(path)) {
                this.data.pendingChanges.push(path);
            }
        }
        this.write();
    }

    excludeFileFromChangeset(path: string): StateChange {
        if(this.data.pendingChanges.includes(path)) {
            this.data.pendingChanges = this.data.pendingChanges.filter(val => val !== path);
            this.write();
            return StateChange.Modified;
        }
        return StateChange.Unmodified;
    }    
    
    includeFileInChangeset(path: string): StateChange {
        if(!this.data.pendingChanges.includes(path)) {
            this.data.pendingChanges.push(path);
            this.data.pendingChanges = this.data.pendingChanges.sort();
            this.write();
            return StateChange.Modified;
        }
        return StateChange.Unmodified;
    }

    included(path: string) : boolean {
        return this.data.pendingChanges.includes(path);
    }

    getIncludedChanges() : string[] {
        return this.data.pendingChanges.slice(0);
    }

    write() {
        return this.context.workspaceState.update("tfsdata", this.data);
    }


}
