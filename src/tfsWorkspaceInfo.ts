import * as vscode from 'vscode';
import { tfcmd } from "./tfsCmd";

const reCollection = /\s*Collection\s*\:\s*(.*)/;
export async function collections() {
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

export interface IWorkspaceMapping {
    serverPath: string;
    localPath: string;
}

export interface IWorkspace {
    workspace: string;
    workingFolders: IWorkspaceMapping[];
}

export async function tfsWorkingFolders() {
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

export async function inTFS(workspaceFolder: vscode.WorkspaceFolder) {
    const workingFolders = await tfsWorkingFolders();
    for(const workingFolder of workingFolders) {
        if(workspaceFolder.uri.fsPath.toLowerCase().startsWith(workingFolder.toLowerCase())) {
            return true;
        }
    }
    return false;
}