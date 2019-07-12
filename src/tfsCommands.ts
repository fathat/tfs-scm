import * as vscode from 'vscode';
import * as tfsUtil from './tfsUtil';
import * as tfsCmd from './tfsCmd';
import { POINT_CONVERSION_COMPRESSED } from 'constants';
import { Uri, commands } from 'vscode';
import * as path from 'path';
import { lstatSync, fstat } from 'fs';
import { findWorkspaceRoot } from './tfsUtil';
import { TFSSourceControlManager } from './tfsSourceControlManager';

export enum ActionModifiedWorkspace {
    Unmodified,
    Modified
}

export async function executeAction(scm: TFSSourceControlManager, fn: (scm: TFSSourceControlManager, ...args: any[]) => Promise<ActionModifiedWorkspace>, ...args: any[]) {
    const modifiedResult : ActionModifiedWorkspace = await fn(scm, ...args);

    if(modifiedResult === ActionModifiedWorkspace.Modified) {
        scm.refresh();
    }
}

export function getActionTargetUri(arg: any) : vscode.Uri {
    if(typeof arg === 'object') {
        if(arg.resourceUri) {
            return arg.resourceUri as vscode.Uri;
        }

        return arg as vscode.Uri;
    } else if(typeof arg === 'undefined') {
        const doc = tfsUtil.getActiveDocument();
        if(doc) {
            return doc.uri;
        }
    }
    throw new Error("Unrecognized target " + arg);
}

export async function add(scm: TFSSourceControlManager, arg: any) {
    try {
        const uri = getActionTargetUri(arg);
        const workspaceFolder = findWorkspaceRoot(uri);
        const relative = path.relative(workspaceFolder.uri.fsPath, uri.fsPath);

        //check if path exists
        const stats = lstatSync(uri.fsPath);
        let cmdArgs = ['add', relative];

        if (stats.isDirectory()) {
            cmdArgs.push('/recursive');
        }

        const result = await scm.cmd(cmdArgs, workspaceFolder.uri.fsPath);
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
        const workspaceFolder = findWorkspaceRoot(uri);
        const relative = path.relative(workspaceFolder.uri.fsPath, uri.fsPath);

        //check if path exists
        const stats = lstatSync(uri.fsPath);
        let cmdArgs = ['get', relative];

        if (stats.isDirectory()) {
            cmdArgs.push('/recursive');
        }

        vscode.window.setStatusBarMessage("TFS: Retrieving...");
        const result = await scm.cmd(cmdArgs, workspaceFolder.uri.fsPath);
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
        const local = getActionTargetUri(arg);
        const remote = Uri.parse(`tfs:${local.fsPath.replace('\\', '/')}`);       
        //vscode.window.showTextDocument();
        const opts: vscode.TextDocumentShowOptions = {
			preserveFocus: false,
			preview: false,
			viewColumn: vscode.ViewColumn.Active
        };

        try {
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
        const result = await scm.cmd(['checkout', uri.fsPath, '/recursive']);
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
        const result = await scm.cmd(['checkout', uri.fsPath, '/recursive']);
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
        const workspaceFolder = findWorkspaceRoot(uri);
        const relative = path.relative(workspaceFolder.uri.fsPath, uri.fsPath);

        //check if path exists
        const stats = lstatSync(uri.fsPath);
        let cmdArgs = ['undo', relative];

        if (stats.isDirectory()) {
            cmdArgs.push('/recursive');
        }

        vscode.window.setStatusBarMessage("TFS: Retrieving...");
        const result = await scm.cmd(cmdArgs, workspaceFolder.uri.fsPath);
        vscode.window.setStatusBarMessage(`TFS: ${uri.fsPath} changes undone.`);
        return ActionModifiedWorkspace.Modified;
    } catch (err) {
        vscode.window.showErrorMessage(err.message);
        return ActionModifiedWorkspace.Unmodified;
    }
}

export async function openInBrowser(scm: TFSSourceControlManager, arg: any) {
    console.log("openInBrowser");
    console.log(arg);
    return ActionModifiedWorkspace.Unmodified;
}
