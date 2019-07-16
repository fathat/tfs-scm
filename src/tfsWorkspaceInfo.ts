import * as vscode from 'vscode';
import { tfcmd } from "./tfsCmd";
import { labelToKey } from './tfsCmdParser';


export interface ITFSWorkspaceMappingInfo {
    serverPath: string;
    localPath: string;
}

export interface ITFSWorkspaceInfo {
    workspace: string;
    owner?: string;
    computer?: string;
    comment?: string;
    collection?: string;
    permissions?: string;
    location?: string;
    fileTime?: string;
    
    mappings: ITFSWorkspaceMappingInfo[];
}

const reCollection = /\s*Collection\s*\:\s*(.*)/;
async function collections() {
    const result = await tfcmd(['vc', 'workspaces']);
    const lines = result.stdout.split('\n');
    const rval = [];
    for(const line of lines) {
        const [_, collection] = reCollection.exec(line) || [undefined, undefined];

        if(collection) {
            rval.push(collection);
        }
    }
    return rval;
}

async function workingFolders() {
    const tfsCollections = await collections();

    const workingFolders = [];
    for(const collectionUrl of tfsCollections) {
        const workspacesResult = await tfcmd(['vc', 'workspaces', '/format:detailed', '/collection:' + collectionUrl]);

        const lines = workspacesResult.stdout.split('\n');
        for(const line of lines) {
            if(line.startsWith(' $')) {
                const sepIndex = line.indexOf(':');
                const workingFolder = line.slice(sepIndex + 1).trim();
                workingFolders.push(workingFolder);
            }
        }
    }
    return workingFolders;
}


const reKeyValue = /(.*): (.*)/;
export async function workspaces() {
    const tfsCollections = await collections();

    const workspaces: ITFSWorkspaceInfo[] = [];
    for(const collectionUrl of tfsCollections) {
        const workspacesResult = await tfcmd(['vc', 'workspaces', '/format:detailed', '/collection:' + collectionUrl]);

        let workspace: ITFSWorkspaceInfo | null = null;
        const lines = workspacesResult.stdout.split('\n');
        for(const line of lines) {
            if(line.startsWith(' $') && workspace) {
                const sepIndex = line.indexOf(':');
                const serverPath = line.slice(0, sepIndex).trim();
                const localPath = line.slice(sepIndex + 1).trim();
                workspace.mappings.push({
                    serverPath,
                    localPath
                });
            }
            let [, label, val] = reKeyValue.exec(line) || ["", "", ""];

            
            label = label.trim();
            val = val.trim();
            
            if(label === 'Workspace') {
                workspace = {
                    workspace: val,
                    mappings: []
                } as ITFSWorkspaceInfo;
                workspaces.push(workspace);
            }
            else if(label) {
                try {
                    (workspace as any)[labelToKey(label)] = val;
                } catch (err) {
                    console.error(err);
                }
            }
        }
    }
    return workspaces;
}

export async function inTFS(folder: string) {
    const tfsFolders = await workingFolders();
    for(const workingFolder of tfsFolders) {
        if(folder.toLowerCase().startsWith(workingFolder.toLowerCase())) {
            return true;
        }
    }
    return false;
}