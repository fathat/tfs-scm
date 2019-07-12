import * as vscode from 'vscode';
import * as commands from './tfsCommands';
import * as tfsUtil from './tfsUtil';
import { TFSSourceControlManager } from './tfsSourceControlManager';

let scm: TFSSourceControlManager;

export function activate(context: vscode.ExtensionContext) {

	scm = new TFSSourceControlManager(context);
	scm.out.appendLine('TFS SCM is now active');

	// Auto checkout files if they're not writeable on save
	vscode.workspace.onWillSaveTextDocument((e: vscode.TextDocumentWillSaveEvent) => {
		if(e.document.isDirty && !e.document.isUntitled) {
			e.waitUntil(new Promise((resolve, reject) => {
				if(!tfsUtil.isWritable(e.document.uri.fsPath)) {
					commands.executeAction(scm, (scm: TFSSourceControlManager) => commands.checkout(scm, e.document.uri))
							.then(() => resolve())
							.catch((err) => reject(err));
				}
			}));
		}
	});
	
	context.subscriptions.push(vscode.commands.registerCommand('tfs-scm.info', () => {
		vscode.window.showInformationMessage('TFS-SCM Running!');
	}));

	context.subscriptions.push(vscode.commands.registerCommand('tfs-scm.open', (...args: any) => commands.executeAction(scm, commands.open, ...args)));
	context.subscriptions.push(vscode.commands.registerCommand('tfs-scm.openRemoteDiff', (...args: any) => commands.executeAction(scm, commands.openRemoteDiff, ...args)));
	context.subscriptions.push(vscode.commands.registerCommand('tfs-scm.get', (...args: any) => commands.executeAction(scm, commands.get, ...args)));
	context.subscriptions.push(vscode.commands.registerCommand('tfs-scm.add', (...args: any) => commands.executeAction(scm, commands.add, ...args)));
	context.subscriptions.push(vscode.commands.registerCommand('tfs-scm.rm', (...args: any) => commands.executeAction(scm, commands.rm, ...args)));
	context.subscriptions.push(vscode.commands.registerCommand('tfs-scm.checkout', (...args: any) => commands.executeAction(scm, commands.checkout, ...args)));
	context.subscriptions.push(vscode.commands.registerCommand('tfs-scm.undo', (...args: any) => commands.executeAction(scm, commands.undo, ...args)));
	context.subscriptions.push(vscode.commands.registerCommand('tfs-scm.openInBrowser', (...args: any) => commands.executeAction(scm, commands.openInBrowser, ...args)));
	context.subscriptions.push(vscode.commands.registerCommand('tfs-scm.refresh', (...args: any) => {scm.refresh();}));
	
}

// this method is called when your extension is deactivated
export function deactivate() {
	scm.out.appendLine("TFS scm deactivated");
}
