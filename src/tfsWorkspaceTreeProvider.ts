import * as vscode from 'vscode';
import * as path from 'path';
import { tfcmd } from './tfsCmd';
import { promises } from 'dns';
import { stringify } from 'querystring';
import { extPath } from './tfsUtil';

enum WorkspaceTreeItemKind {
    Collection,
    Workspace,
    Mapping
}

interface ITFSTreeItem {
    toString(): string;
}

interface ITFSTreeCollection extends ITFSTreeItem {
    url: string;
}

interface ITFSTreeWorkspace extends ITFSTreeItem  {
    workspace: string;
    computer: string;
    owner: string;
}

interface ITFSTreeMapping extends ITFSTreeItem  {
    serverPath: string;
    localPath: string;
}

interface ITFSItem extends ITFSTreeItem  {
    kind: WorkspaceTreeItemKind;
    data: ITFSTreeItem;
    children: ITFSItem[];
}

const sampleRoots =  [{
    kind: WorkspaceTreeItemKind.Collection,
    data: { url: 'http://tfsserver/' },
    children: [
    {
        kind: WorkspaceTreeItemKind.Workspace,
        data: {
            workspace: "MyWorkspace",
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

const reWorkspaceLine = /\=*\s*Workspace\s*:\s*(.*)\s\((.*)\)/;
const reCollectionLine = /\s*Collection\s*:\s*(.*)/;

interface IWorkfoldWorkspaceMapping {
    serverPath: string;
    localPath: string;
}

interface IWorkfoldWorkspace {
    name?: string;
    owner?: string;
    collection?: string;
    mappings: IWorkfoldWorkspaceMapping[];
}

/* parse a "tf vc workfold" command. Output is like:
============================================================================================================ 
Workspace : SOMEWORKSPACE (Owner Name)
Collection: http://server/stuff
 $/ServerFolders: C:\LocalFolders

Note that the ============= thing isn't seperated by a newline neccessarily. But sometimes? It's 
based on the terminal width. So yeah. Gross. This is why we can't have nice things.
*/
async function workfold() {
    if(!vscode.workspace.workspaceFolders) {
        throw new Error("Workspace folders not defined!");
    }

    let resultPromises = vscode.workspace.workspaceFolders.map(
        (wf) => tfcmd(['vc', 'workfold'], wf.uri.fsPath));    
    let results = await Promise.all(resultPromises);

    let workspace: IWorkfoldWorkspace | null = null;
    let workspaces = [];

    for(const workFoldResult of results) {
        const lines = workFoldResult.stdout.split('\n');
        workspace = null;

        for(const line of lines) {
            const [, workspaceName, owner] = reWorkspaceLine.exec(line) || [undefined, undefined, undefined];

            if(workspaceName) {
                workspace = {} as IWorkfoldWorkspace;
                workspaces.push(workspace);
                workspace.name = workspaceName;
                workspace.owner = owner;
                workspace.mappings = [];
                continue;
            }

            const [, collection] = reCollectionLine.exec(line) || [undefined, undefined];
            if(workspace && collection) {
                workspace.collection = collection;
                continue;
            }

            const lt = line.trim();
            if(workspace && lt.startsWith('$')) {

                const sepIndex = lt.indexOf(':');
                const serverPath = lt.slice(0, sepIndex);
                const localPath = lt.slice(sepIndex+1).trim();
                workspace.mappings.push({serverPath, localPath});
            }
        }
    }
    return workspaces;
}

async function workfoldOutputToTree(workspaces: IWorkfoldWorkspace[]) {
    const collections: Map<string, ITFSItem> = new Map<string, ITFSItem>();

    for(const workspace of workspaces) {
        if(!workspace.collection) { continue; }
        
        let tfsCollectionTreeItem;
        if(!collections.has(workspace.collection)) {
            tfsCollectionTreeItem = {
                kind: WorkspaceTreeItemKind.Collection,
                children: [],
                data: {
                    url: workspace.collection
                }
            } as ITFSItem;
            collections.set(workspace.collection, tfsCollectionTreeItem);
        } else {
            tfsCollectionTreeItem = collections.get(workspace.collection);
        }

        if(!tfsCollectionTreeItem) {
            continue;
        }

        let tfsWorkspaceTreeItem = {
            kind: WorkspaceTreeItemKind.Workspace,
            data: {
                workspace: workspace.name,
                owner: workspace.owner
            },
            children: []
        } as ITFSItem;
        tfsCollectionTreeItem.children.push(tfsWorkspaceTreeItem);
        
        for(const mapping of workspace.mappings) {
            let tfsMappingTreeItem = {
                kind: WorkspaceTreeItemKind.Mapping,
                data: {
                    serverPath: mapping.serverPath,
                    localPath: mapping.localPath
                },
                children: []
            } as ITFSItem;
            tfsWorkspaceTreeItem.children.push(tfsMappingTreeItem);
        }
    }

    let rval = [];
    for(const c of collections.values()) {
        rval.push(c);
    }
    return rval;
}

export class TFSWorkspaceTreeProvider implements vscode.TreeDataProvider<ITFSItem> {

    private _onDidChangeTreeData: vscode.EventEmitter<ITFSItem | null | undefined> = new vscode.EventEmitter<ITFSItem | null | undefined>();
    readonly onDidChangeTreeData: vscode.Event<ITFSItem | null | undefined> = this._onDidChangeTreeData.event;
    
    roots: ITFSItem[];

    constructor() { 
        this.roots = []; //set to sampleRoots for screenshots
        this.refresh();
    }

    refresh() {
        return workfold()
            .then((workspaces: IWorkfoldWorkspace[]) => workfoldOutputToTree(workspaces))
            .then((roots) => {
                this.roots = roots;
                this._onDidChangeTreeData.fire(null);
            });
    }
    
    getTreeItem(element: ITFSItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        const collapsibleState = element.children.length > 0 
            ? vscode.TreeItemCollapsibleState.Expanded 
            : vscode.TreeItemCollapsibleState.None;
        
        switch(element.kind) {
            case WorkspaceTreeItemKind.Collection: {
                const data = (element.data as ITFSTreeCollection);
                let item = new vscode.TreeItem(data.url, collapsibleState);
                item.iconPath = {
                    light: path.join(extPath(), 'icons', 'light', 'collection.svg'),
                    dark: path.join(extPath(), 'icons', 'dark', 'collection.svg')
                };
                return item;
            }
            case WorkspaceTreeItemKind.Workspace: {
                let item = new vscode.TreeItem(
                    (element.data as ITFSTreeWorkspace).workspace, 
                    collapsibleState);
                item.iconPath = {
                    light: path.join(extPath(), 'icons', 'light', 'workspace.svg'),
                    dark: path.join(extPath(), 'icons', 'dark', 'workspace.svg')
                };
                return item;
            }
                
            case WorkspaceTreeItemKind.Mapping:{
                const mapping = element.data as ITFSTreeMapping;
                const lp = mapping.localPath;
                const sp = mapping.serverPath;
                let item = new vscode.TreeItem(
                    `${lp} ⇔ ${sp}`);
                
                item.iconPath = {
                    light: path.join(extPath(), 'icons', 'light', 'map.svg'),
                    dark: path.join(extPath(), 'icons', 'dark', 'map.svg')
                };
                return item;
            }
        }
        return new vscode.TreeItem(element.data.toString(), element.children.length ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None);
    }

    getChildren(element?: ITFSItem | undefined): vscode.ProviderResult<ITFSItem[]> {
        return element ? element.children : this.roots;
    }
}
