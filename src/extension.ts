import * as vscode from 'vscode';
import * as commands from './tfsCommands';
import * as tfsUtil from './tfsUtil';
import { TFSSourceControlManager } from './tfsSourceControlManager';
import * as tfsWorkspaceTree from './tfsWorkspaceTreeProvider';
import { workspaces } from './tfsWorkspaceInfo';
import * as fs from 'fs';

let scm: TFSSourceControlManager;
let statusBarItem: vscode.StatusBarItem;

export async function activate(context: vscode.ExtensionContext) {
	
	const tfPath = vscode.workspace.getConfiguration("tfsSCM", null).get<string>("tfsPath");
    if (!tfPath) {
		vscode.window.showErrorMessage(`tfs-scm path is not configured. Set path and restart vscode to use TFS.`);
		return;
	}
	else {
		let shouldAskForCheckout: any = {};

		const tfsWorkspaces = await workspaces();
		scm = new TFSSourceControlManager(context, tfsWorkspaces);
		scm.out.appendLine('TFS SCM is now active');

		const workspaceTreeProvider = new tfsWorkspaceTree.TFSWorkspaceTreeProvider();
		vscode.window.registerTreeDataProvider('tfs-workspaces', workspaceTreeProvider);
	
		vscode.workspace.textDocuments.forEach(doc => {
			if(!tfsUtil.isWritable(doc.uri.fsPath)) {
				let isinscm = scm.isInSCM(doc.uri.fsPath).then(isinscm => {
					shouldAskForCheckout[doc.uri.fsPath] = true;
				});
			}
		});

		vscode.workspace.onDidOpenTextDocument(async (e) => {
			if(!e.isUntitled) {
				//check if it's checked out
				if(!tfsUtil.isWritable(e.uri.fsPath)) {
					let isinscm = await scm.isInSCM(e.uri.fsPath);
					if(isinscm) {
						shouldAskForCheckout[e.uri.fsPath] = true;
					}
				}
			}
		});
		
		vscode.workspace.onDidChangeTextDocument(async (e) => {
			if(e.document.isDirty && !e.document.isUntitled) {
				if(shouldAskForCheckout[e.document.uri.fsPath]){
					//prompt for check out
					delete shouldAskForCheckout[e.document.uri.fsPath];
					const checkoutOnModify = vscode.workspace.getConfiguration("tfsSCM", null).get<boolean>("checkoutOnModify");
					if(checkoutOnModify) {
						commands
							.executeAction(scm, (scm: TFSSourceControlManager) => commands.checkout(scm, e.document.uri))
							.then(() => {
								vscode.window.showInformationMessage(`${e.document.uri.fsPath} checked out for write.`);
							});
					} else {
						let action = await vscode.window.showInformationMessage(`${e.document.fileName} is read-only, checkout?`, "Checkout", "Ignore");
						if(action === "Checkout") {
							commands.executeAction(scm, (scm: TFSSourceControlManager) => commands.checkout(scm, e.document.uri))
								.then(() => {
									vscode.window.showInformationMessage(`${e.document.uri.fsPath} checked out for write.`);
								})
								.catch((err) => {
									vscode.window.showErrorMessage(`${e.document.uri.fsPath} could not be checked out.`);
								});
						}
					}
					
				}
			}
		});

		// Auto checkout files if they're not writeable on save
		vscode.workspace.onWillSaveTextDocument((e: vscode.TextDocumentWillSaveEvent) => {
			if(e.document.isDirty && !e.document.isUntitled) {
				e.waitUntil(new Promise((resolve, reject) => {
					if(!tfsUtil.isWritable(e.document.uri.fsPath)) {
						scm.isInSCM(e.document.uri.fsPath).then((isInSCM) => {
							/* This is gross, but neccessary. Mark the file as writeable, then
							save, THEN checkout. The reason: checkout might take longer than
							1.5 seconds, and if it does, vscode will disable this event
							for future saves.
							*/
							fs.chmod(e.document.uri.fsPath, 0o755, (err) => {
								if(err) {
									reject(err);
								} else {
									resolve();
								}

								commands.executeAction(scm, (scm: TFSSourceControlManager) => commands.checkout(scm, e.document.uri))
									.then(() => {
										vscode.window.showInformationMessage(`${e.document.uri.fsPath} checked out for write.`);
									})
									.catch((err) => {
										vscode.window.showErrorMessage(`${e.document.uri.fsPath} could not be checked out.`);
									});
							});	
						});
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
		context.subscriptions.push(vscode.commands.registerCommand('tfs-scm.commit', (...args: any) => commands.executeAction(scm, commands.checkin, ...args)));
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
