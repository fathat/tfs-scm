import * as vscode from 'vscode';
import * as tfsUtil from './tfsUtil';
import * as tfsCmd from './tfsCmd';
import { POINT_CONVERSION_COMPRESSED } from 'constants';
import { Uri } from 'vscode';
import * as path from 'path';
import { lstatSync, fstat } from 'fs';

function getActionTargetUri(arg: any) : vscode.Uri {
    if(typeof arg === 'object') {
        //TODO: more type checking
        return arg as vscode.Uri;
    } else if(typeof arg === 'undefined') {
        const doc = tfsUtil.getActiveDocument();
        if(doc) {
            return doc.uri;
        }
    }
    throw new Error("Unrecognized target " + arg);
}

function findWorkspaceRoot(uri: Uri) {
    if(vscode.workspace.workspaceFolders) {
        for(const workspaceFolder of vscode.workspace.workspaceFolders) {
            if(uri.path.startsWith(workspaceFolder.uri.path)) {
                return workspaceFolder;
            }
        }
    }
    throw new Error("Could not find root!");
}

export async function add(arg: any) {
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

        const result = await tfsCmd.tfcmd(cmdArgs, workspaceFolder.uri.fsPath);
        vscode.window.setStatusBarMessage(`TFS: ${uri.fsPath} successfully added to version control.`);
    } catch (err) {
        vscode.window.showErrorMessage(err.message);
    }
}

export async function get(arg: any) {
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
        const result = await tfsCmd.tfcmd(cmdArgs, workspaceFolder.uri.fsPath);
        vscode.window.setStatusBarMessage(`TFS: ${uri.fsPath} successfully retrieved.`);
    } catch (err) {
        vscode.window.showErrorMessage(err.message);
    }
}

export async function checkout(arg: any) {
    try {
        const uri = getActionTargetUri(arg);    
        const result = await tfsCmd.tfcmd(['checkout', uri.fsPath, '/recursive']);
        vscode.window.setStatusBarMessage(`TFS: ${uri.fsPath} successfully checked out for editing.`);
    } catch (err) {
        vscode.window.showErrorMessage(err.message);
    }
}

export async function rm(arg: any) {
    try {
        const uri = getActionTargetUri(arg);    
        const result = await tfsCmd.tfcmd(['checkout', uri.fsPath, '/recursive']);
        vscode.window.setStatusBarMessage(`TFS: ${uri.fsPath} successfully deleted from version control.`);
    } catch (err) {
        vscode.window.showErrorMessage(err.message);
    }
}

export async function undo(arg: any) {
    try {
        const uri = getActionTargetUri(arg);    
        const result = await tfsCmd.tfcmd(['undo', uri.fsPath, '/recursive']);
        vscode.window.setStatusBarMessage(`TFS: ${uri.fsPath} changes undone.`);
    } catch (err) {
        vscode.window.showErrorMessage(err.message);
    }
}

export async function openInBrowser(arg: any) {
    console.log("openInBrowser");
    console.log(arg);
}
