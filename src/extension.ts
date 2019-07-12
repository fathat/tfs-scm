import * as vscode from 'vscode';
import * as srcControl from './tfsSourceControl';
import * as commands from './tfsCommands';
import { TFSSourceControl } from './tfsSourceControl';
import { TFSDocumentContentProvider } from './tfsDocumentContentProvider';
import { WorkspaceFolder } from 'vscode';
import { pathToFileURL } from 'url';
import { emitKeypressEvents } from 'readline';
import * as tfsUtil from './tfsUtil';
import * as fs from 'fs';

const SOURCE_CONTROL_OPEN_COMMAND = 'extension.source-control.open';

let scmMap : Map<vscode.Uri, TFSSourceControl> = new Map<vscode.Uri, TFSSourceControl>();

export function activate(context: vscode.ExtensionContext) {

	console.log('TFS SCM is now active');

	vscode.workspace.onWillSaveTextDocument((e: vscode.TextDocumentWillSaveEvent) => {
		if(e.document.isDirty && !e.document.isUntitled) {
			e.waitUntil(new Promise((resolve, reject) => {
				if(!tfsUtil.isWritable(e.document.uri.fsPath)) {
					commands.checkout(e.document.uri)
							.then(() => resolve())
							.catch((err) => reject(err));
				}
			}));
		}
	});

	if(vscode.workspace.workspaceFolders) {
		for(let folder of vscode.workspace.workspaceFolders) {
			console.log(folder.uri);

			vscode.workspace.openTextDocument(folder.uri.path + '/tfsconf.json').then((confDoc : vscode.TextDocument) => {
				scmMap.set(folder.uri, new TFSSourceControl(context, folder));
			}, 
			(reason) => console.error(reason));
		}
	}

	let documentContentProvider = new TFSDocumentContentProvider();
	context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('tfs', documentContentProvider));
	
	context.subscriptions.push(vscode.commands.registerCommand('tfs-scm.info', () => {
		vscode.window.showInformationMessage('TFS-SCM Running!');
		
		for(let [key, scm] of scmMap) {
			
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('tfs-scm.get', commands.get));
	context.subscriptions.push(vscode.commands.registerCommand('tfs-scm.add', commands.add));
	context.subscriptions.push(vscode.commands.registerCommand('tfs-scm.rm', commands.rm));
	context.subscriptions.push(vscode.commands.registerCommand('tfs-scm.checkout', commands.checkout));
	context.subscriptions.push(vscode.commands.registerCommand('tfs-scm.undo', commands.undo));
	context.subscriptions.push(vscode.commands.registerCommand('tfs-scm.openInBrowser', commands.openInBrowser));
	context.subscriptions.push(vscode.commands.registerCommand('tfs-scm.refresh', () => {
		for(let [key, scm] of scmMap) {
			scm.update();
		}
	}));
	
}

// this method is called when your extension is deactivated
export function deactivate() {
	console.log("tfs scm deactivated");
}
