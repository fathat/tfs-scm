import * as vscode from 'vscode';

class TFSLocalData {
    pendingChanges: string[] = [];
}

export enum StateChange {
    Unmodified,
    Modified
}

export interface ITFSLocalDatabase {
    excludeFileFromChangeset(path: string): void;
    includeFileInChangeset(path: string): void;
    write(): void;
    included(path: string) : boolean;
}

export class TFSLocalDatabase implements ITFSLocalDatabase {
    data: TFSLocalData;

    constructor(private context: vscode.ExtensionContext) {
        this.data = context.workspaceState.get<TFSLocalData>("tfsdata") || new TFSLocalData();
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

    write(): void {
        this.context.workspaceState.update("tfsdata", this.data);
    }


}
