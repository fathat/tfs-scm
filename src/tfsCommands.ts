import * as vscode from 'vscode';
import * as tfsUtil from './tfsUtil';
import { Uri, commands } from 'vscode';
import * as path from 'path';
import { lstatSync, existsSync } from 'fs';
import { findWorkspaceRoot } from './tfsUtil';
import { TFSSourceControlManager } from './tfsSourceControlManager';
import * as tfsOpenInBrowser from './tfsOpenInBrowser';
import { TFSStatusItem } from "./TFSStatusItem";

export enum ActionModifiedWorkspace {
    Unmodified,
    Modified
}

export async function executeAction(scm: TFSSourceControlManager, fn: (scm: TFSSourceControlManager, ...args: any[]) => Promise<ActionModifiedWorkspace>, ...args: any[]) {
    const modifiedResult: ActionModifiedWorkspace = await fn(scm, ...args);

    if (modifiedResult === ActionModifiedWorkspace.Modified) {
        scm.refresh();
    }
}

class WorkspaceUriInfo {
    constructor(
        public uri: Uri,
        public relativePath: string,
        public workspaceFolder: vscode.WorkspaceFolder,
        public exists: boolean,
        public isDirectory: boolean) { }
}

function getWorkspaceUriInfo(uri: Uri) {
    const workspaceFolder = findWorkspaceRoot(uri);
    const relative = path.relative(workspaceFolder.uri.fsPath, uri.fsPath);

    //check if path is directory
    let exists = existsSync(uri.fsPath);
    let isDir = false;

    if (exists) {
        const stats = lstatSync(uri.fsPath);
        isDir = stats.isDirectory();
    }

    return new WorkspaceUriInfo(
        uri, relative, workspaceFolder, exists, isDir
    );
}

export function getActionTargetUri(arg: any): vscode.Uri {
    if (typeof arg === 'object') {
        if (arg.resourceUri) {
            return arg.resourceUri as vscode.Uri;
        }

        return arg as vscode.Uri;
    } else if (typeof arg === 'undefined') {
        const doc = tfsUtil.getActiveDocument();
        if (doc) {
            return doc.uri;
        }
    }
    throw new Error("Unrecognized target " + arg);
}

export async function add(scm: TFSSourceControlManager, arg: any) {
    try {
        const uri = getActionTargetUri(arg);
        const workspacePathInfo = getWorkspaceUriInfo(uri);
        let cmdArgs = ['add', workspacePathInfo.relativePath];
        if (workspacePathInfo.isDirectory) {
            cmdArgs.push('/recursive');
        }
        const result = await scm.cmd(cmdArgs, workspacePathInfo.workspaceFolder.uri.fsPath);
        return ActionModifiedWorkspace.Modified;
    } catch (err) {
        vscode.window.showErrorMessage(err.message);
        return ActionModifiedWorkspace.Unmodified;
    }
}

export async function get(scm: TFSSourceControlManager, arg: any) {
    let statusBarMessage = vscode.window.setStatusBarMessage("TFS: Retrieving...");
    try {
        const uri = getActionTargetUri(arg);
        const workspacePathInfo = getWorkspaceUriInfo(uri);
        const relativePath = workspacePathInfo.relativePath || '.';
        let cmdArgs = ['get', relativePath];
        if (workspacePathInfo.isDirectory) {
            cmdArgs.push('/recursive');
        }

        const result = await scm.cmd(cmdArgs, workspacePathInfo.workspaceFolder.uri.fsPath);
        return ActionModifiedWorkspace.Modified;
    } catch (err) {
        vscode.window.showErrorMessage(err.message);
        return ActionModifiedWorkspace.Unmodified;
    } finally {
        statusBarMessage.dispose();
    }
}


export async function open(scm: TFSSourceControlManager, arg: any) {
    try {
        const local = getActionTargetUri(arg);
        const remote = Uri.parse(`tfs:${local.fsPath.replace('\\', '/')}`);
        try {
            vscode.window.showTextDocument(await vscode.workspace.openTextDocument(remote));
        } catch (err) {
            vscode.window.showTextDocument(await vscode.workspace.openTextDocument(local));
        }
    } catch (err) {
        vscode.window.showErrorMessage(err.message);

    }
    return ActionModifiedWorkspace.Unmodified;
}

export async function openRemoteDiff(scm: TFSSourceControlManager, arg: any) {
    try {
        let local = getActionTargetUri(arg);
        const name = path.basename(local.fsPath);
        const remote = Uri.parse(`tfs:${local.fsPath.replace('\\', '/')}`);
        const opts: vscode.TextDocumentShowOptions = {
            preserveFocus: false,
            preview: false,
            viewColumn: vscode.ViewColumn.Active
        };

        try {
            if (!existsSync(local.fsPath)) {
                local = Uri.parse(`tfs:null`);
            }
            
            await vscode.workspace.openTextDocument(remote);
            await commands.executeCommand<void>('vscode.diff', remote, local, `Diff: ${name}`, opts);
        } catch (err) {
            await commands.executeCommand<void>('vscode.open', local, opts);
        }

    } catch (err) {
        vscode.window.showErrorMessage(err.message);

    }
    return ActionModifiedWorkspace.Unmodified;
}

export async function checkin(scm: TFSSourceControlManager, arg: any) {
    try {
        if(typeof arg === 'undefined') {
            await scm.checkinAll();
            vscode.window.showInformationMessage('Checkin complete!');
        }
        else {
            const scmHandle = arg.handle;
            const workspaceMapping = scm.getWorkspaceMappingBySCMHandle(scmHandle);       
            await scm.checkin(workspaceMapping, arg.inputBox.value);
            arg.inputBox.value = '';
            vscode.window.showInformationMessage('Checkin complete!');
        }
        
        return ActionModifiedWorkspace.Modified;
    } catch (err) {
        vscode.window.showErrorMessage(err.message);
        return ActionModifiedWorkspace.Unmodified;
    }
}

export async function checkout(scm: TFSSourceControlManager, arg: any) {
    try {
        const uri = getActionTargetUri(arg);
        const workspacePathInfo = getWorkspaceUriInfo(uri);
        let cmdArgs = ['checkout', workspacePathInfo.relativePath];
        if (workspacePathInfo.isDirectory) {
            cmdArgs.push('/recursive');
        }

        const result = await scm.cmd(cmdArgs, workspacePathInfo.workspaceFolder.uri.fsPath);
        return ActionModifiedWorkspace.Modified;
    } catch (err) {
        vscode.window.showErrorMessage(err.message);
        return ActionModifiedWorkspace.Unmodified;
    }
}


export async function rm(scm: TFSSourceControlManager, arg: any) {
    try {
        const uri = getActionTargetUri(arg);
        const workspacePathInfo = getWorkspaceUriInfo(uri);
        let cmdArgs = ['delete', workspacePathInfo.relativePath];
        if (workspacePathInfo.isDirectory) {
            cmdArgs.push('/recursive');
        }

        const result = await scm.cmd(cmdArgs, workspacePathInfo.workspaceFolder.uri.fsPath);
        return ActionModifiedWorkspace.Modified;
    } catch (err) {
        vscode.window.showErrorMessage(err.message);
        return ActionModifiedWorkspace.Unmodified;
    }
}

export async function undo(scm: TFSSourceControlManager, arg: any) {
    try {
        const uri = getActionTargetUri(arg);
        const workspacePathInfo = getWorkspaceUriInfo(uri);
        let cmdArgs = ['undo', workspacePathInfo.relativePath];
        if (workspacePathInfo.isDirectory) {
            cmdArgs.push('/recursive');
        }
        
        const result = await scm.cmd(cmdArgs, workspacePathInfo.workspaceFolder.uri.fsPath);
        return ActionModifiedWorkspace.Modified;
    } catch (err) {
        vscode.window.showErrorMessage(err.message);
        return ActionModifiedWorkspace.Unmodified;
    }
}


export async function discard(scm: TFSSourceControlManager, arg: any) {
    try {
        const pick = await vscode.window.showWarningMessage(
            "Are you sure you want to undo all pending changes?",
            // { modal: true },
            { title: "Undo All" },
            { title: "Cancel", isCloseAffordance: true }
          );
        
        console.log(arg);
        console.log(scm);
        if (pick && pick.title === "Undo All") {
            let cmdArgs = ['undo', '.', '/noprompt', '/recursive'];
            const result = await scm.cmd(cmdArgs, arg.rootUri.fsPath);
            return ActionModifiedWorkspace.Modified;
        }
        
        return ActionModifiedWorkspace.Unmodified;

    } catch (err) {
        vscode.window.showErrorMessage(err.message);
        return ActionModifiedWorkspace.Unmodified;
    }
}


export async function include(scm: TFSSourceControlManager, arg: any) {
    try {
        const uri = getActionTargetUri(arg);
        scm.includeOne(uri.fsPath);        
        return ActionModifiedWorkspace.Unmodified;
    } catch (err) {
        vscode.window.showErrorMessage(err.message);
        return ActionModifiedWorkspace.Unmodified;
    }
}

export async function exclude(scm: TFSSourceControlManager, arg: any) {
    try {
        const uri = getActionTargetUri(arg);
        scm.excludeOne(uri.fsPath);
        return ActionModifiedWorkspace.Unmodified;
    } catch (err) {
        vscode.window.showErrorMessage(err.message);
        return ActionModifiedWorkspace.Unmodified;
    }
}

export async function includeAll(scm: TFSSourceControlManager, arg: any) {
    try {
        console.log(scm);
        console.log(arg);
        const resourceStates = (arg.resourceStates as TFSStatusItem[]);
        scm.includeList(resourceStates);
        return ActionModifiedWorkspace.Modified;
    } catch (err) {
        vscode.window.showErrorMessage(err.message);
        return ActionModifiedWorkspace.Unmodified;
    }
}

export async function excludeAll(scm: TFSSourceControlManager, arg: any) {
    try {
        console.log(scm);
        console.log(arg);
        const resourceStates = (arg.resourceStates as TFSStatusItem[]);
        scm.excludeList(resourceStates);
        return ActionModifiedWorkspace.Modified;
    } catch (err) {
        vscode.window.showErrorMessage(err.message);
        return ActionModifiedWorkspace.Unmodified;
    }
}

export async function openInBrowser(scm: TFSSourceControlManager, arg: any) {
    console.log("openInBrowser");
    tfsOpenInBrowser.openInBrowser(scm, arg);
    return ActionModifiedWorkspace.Unmodified;
}
