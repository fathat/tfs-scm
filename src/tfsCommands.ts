import * as vscode from 'vscode';
import * as tfsUtil from './tfsUtil';
import { Uri, commands } from 'vscode';
import * as path from 'path';
import { lstatSync, existsSync } from 'fs';
import { findWorkspaceRoot } from './tfsUtil';
import { TFSSourceControlManager } from './tfsSourceControlManager';
import * as tfsOpenInBrowser from './tfsOpenInBrowser';

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
        vscode.window.setStatusBarMessage(`TFS: ${uri.fsPath} successfully added to version control.`);
        return ActionModifiedWorkspace.Modified;
    } catch (err) {
        vscode.window.showErrorMessage(err.message);
        return ActionModifiedWorkspace.Unmodified;
    }
}

export async function get(scm: TFSSourceControlManager, arg: any) {
    try {

        const uri = getActionTargetUri(arg);
        const workspacePathInfo = getWorkspaceUriInfo(uri);
        let cmdArgs = ['get', workspacePathInfo.relativePath];
        if (workspacePathInfo.isDirectory) {
            cmdArgs.push('/recursive');
        }

        vscode.window.setStatusBarMessage("TFS: Retrieving...");
        const result = await scm.cmd(cmdArgs, workspacePathInfo.workspaceFolder.uri.fsPath);
        vscode.window.setStatusBarMessage(`TFS: ${uri.fsPath} successfully retrieved.`);
        return ActionModifiedWorkspace.Modified;
    } catch (err) {
        vscode.window.showErrorMessage(err.message);
        return ActionModifiedWorkspace.Unmodified;
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
        const remote = Uri.parse(`tfs:${local.fsPath.replace('\\', '/')}`);
        //vscode.window.showTextDocument();
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
            await commands.executeCommand<void>('vscode.diff', remote, local, undefined, opts);
        } catch (err) {
            await commands.executeCommand<void>('vscode.open', local, undefined, opts);
        }

    } catch (err) {
        vscode.window.showErrorMessage(err.message);

    }
    return ActionModifiedWorkspace.Unmodified;
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
        vscode.window.setStatusBarMessage(`TFS: ${uri.fsPath} successfully checked out for editing.`);
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

        vscode.window.setStatusBarMessage("TFS: Retrieving...");
        const result = await scm.cmd(cmdArgs, workspacePathInfo.workspaceFolder.uri.fsPath);
        vscode.window.setStatusBarMessage(`TFS: ${uri.fsPath} successfully deleted from version control.`);
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

        vscode.window.setStatusBarMessage("TFS: Retrieving...");
        const result = await scm.cmd(cmdArgs, workspacePathInfo.workspaceFolder.uri.fsPath);
        vscode.window.setStatusBarMessage(`TFS: ${uri.fsPath} changes undone.`);
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
