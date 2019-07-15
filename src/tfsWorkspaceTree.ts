import * as vscode from 'vscode';
import * as path from 'path';

enum WorkspaceTreeItemKind {
    Collection,
    Workspace,
    Mapping
}

interface ITFSWorkspaceItem {
    toString(): string;
}

export interface ITFSCollection extends ITFSWorkspaceItem {
    url: string;
}

export interface ITFSWorkspace extends ITFSWorkspaceItem  {
    workspace: string;
    computer: string;
    owner: string;
}

export interface ITFSWorkspaceMapping extends ITFSWorkspaceItem  {
    serverPath: string;
    localPath: string;
}

export interface ITFSWorkspaceTreeItem extends ITFSWorkspaceItem  {
    readonly kind: WorkspaceTreeItemKind;
    data: ITFSWorkspaceItem;
    children: ITFSWorkspaceTreeItem[];
}

export const sampleRoots =  [{
    kind: WorkspaceTreeItemKind.Collection,
    data: { url: 'http://someserver/' },
    children: [
    {
        kind: WorkspaceTreeItemKind.Workspace,
        data: {
            workspace: "TestWorkspace",
            computer: "CMPY100",
            owner: "Ian",
            toString() { return this.workspace; }
        },
        children: []
    },
    {
        kind: WorkspaceTreeItemKind.Workspace,
        data: {
            workspace: "Wark",
            computer: "CMPY200",
            owner: "Ian",
            toString() { return this.workspace; }
        },
        children: [
            {
                kind: WorkspaceTreeItemKind.Mapping,
                data: {
                    serverPath: "$/MyProject",
                    localPath: "C:\\Projects\\MyProject"
                },
                children: []
            }
        ]
    }]
}];


export class TFSWorkspaceTreeProvider implements vscode.TreeDataProvider<ITFSWorkspaceTreeItem> {

    private _onDidChangeTreeData: vscode.EventEmitter<ITFSWorkspaceTreeItem | null | undefined> = new vscode.EventEmitter<ITFSWorkspaceTreeItem | null | undefined>();
    readonly onDidChangeTreeData: vscode.Event<ITFSWorkspaceTreeItem | null | undefined> = this._onDidChangeTreeData.event;
    
    roots: ITFSWorkspaceTreeItem[];

    constructor() { 
        this.roots = sampleRoots as ITFSWorkspaceTreeItem[];
    }
    
    getTreeItem(element: ITFSWorkspaceTreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        const collapsibleState = element.children.length > 0 ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None;
        switch(element.kind) {
            case WorkspaceTreeItemKind.Collection: {
                const data = (element.data as ITFSCollection);
                let item = new vscode.TreeItem(data.url, collapsibleState);
                item.iconPath = {
                    light: path.join(__filename, '..', '..', 'icons', 'light', 'collection.svg'),
                    dark: path.join(__filename, '..', '..', 'icons', 'dark', 'collection.svg')
                };
                return item;
            }
            case WorkspaceTreeItemKind.Workspace: {
                let item = new vscode.TreeItem(
                    (element.data as ITFSWorkspace).workspace, 
                    collapsibleState);
                item.iconPath = {
                    light: path.join(__filename, '..', '..', 'icons', 'light', 'workspace.svg'),
                    dark: path.join(__filename, '..', '..', 'icons', 'dark', 'workspace.svg')
                };
                return item;
            }
                
            case WorkspaceTreeItemKind.Mapping:{
                const lp = (element.data as ITFSWorkspaceMapping).localPath;
                const sp = (element.data as ITFSWorkspaceMapping).serverPath;
                let item = new vscode.TreeItem(
                    `${lp} ⇔ ${sp}`);
                
                item.iconPath = {
                    light: path.join(__filename, '..', '..', 'icons', 'light', 'map.svg'),
                    dark: path.join(__filename, '..', '..', 'icons', 'dark', 'map.svg')
                };
                return item;
            }
        }
        return new vscode.TreeItem(element.data.toString(), element.children.length ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None);
    }

    getChildren(element?: ITFSWorkspaceTreeItem | undefined): vscode.ProviderResult<ITFSWorkspaceTreeItem[]> {
        return element ? element.children : this.roots;
    }
}
