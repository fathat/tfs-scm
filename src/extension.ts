import * as vscode from 'vscode';
import * as commands from './tfsCommands';
import * as tfsUtil from './tfsUtil';
import { TFSSourceControlManager } from './tfsSourceControlManager';
import * as tfsWorkspaceTree from './tfsWorkspaceTree';
import { workspaces } from './tfsWorkspaceInfo';

let scm: TFSSourceControlManager;
let statusBarItem: vscode.StatusBarItem;

export async function activate(context: vscode.ExtensionContext) {
	const tfPath = vscode.workspace.getConfiguration("tfsSCM", null).get<string>("tfsPath");
    if (!tfPath) {
		vscode.window.showErrorMessage(`tfs-scm path is not configured. Set path and restart vscode to use TFS.`);
		return;
	}
	else {
		const tfsWorkspaces = await workspaces();
		scm = new TFSSourceControlManager(context, tfsWorkspaces);
		scm.out.appendLine('TFS SCM is now active');

		const workspaceTreeProvider = new tfsWorkspaceTree.TFSWorkspaceTreeProvider();
		vscode.window.registerTreeDataProvider('tfs-workspaces', workspaceTreeProvider);
	
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
	
		context.subscriptions.push(vscode.commands.registerCommand('tfs-scm.discard', (...args: any) => commands.executeAction(scm, commands.discard, ...args)));

		context.subscriptions.push(vscode.commands.registerCommand('tfs-scm.include', (...args: any) => commands.executeAction(scm, commands.include, ...args)));
		context.subscriptions.push(vscode.commands.registerCommand('tfs-scm.exclude', (...args: any) => commands.executeAction(scm, commands.exclude, ...args)));
		
		context.subscriptions.push(vscode.commands.registerCommand('tfs-scm.include-all', (...args: any) => commands.executeAction(scm, commands.includeAll, ...args)));
		context.subscriptions.push(vscode.commands.registerCommand('tfs-scm.exclude-all', (...args: any) => commands.executeAction(scm, commands.excludeAll, ...args)));
	
		//setup status bar to show a link to the TFS workspace
		statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
		statusBarItem.text = "TFS Workspace";
		context.subscriptions.push(statusBarItem);
		statusBarItem.show();
	}
}

// this method is called when your extension is deactivated
export function deactivate() {
	scm.out.appendLine("TFS scm deactivated");
}
