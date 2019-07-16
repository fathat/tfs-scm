import { QuickDiffProvider, WorkspaceFolder, CancellationToken, ProviderResult, Uri, workspace, SourceControlResourceState } from "vscode";
import * as path from 'path';
import { tfcmd } from "./tfsCmd";
import * as vscode from 'vscode';

export const TFS_SCHEME = 'tfs';

const reServerPathWithChangeset = /^\$(.*)/;
const reServerPath = /^\$(.*);(\S+)?/;
const reLocalFilePath = /^  Local item : \[.*\] (.*)/;
const reChangeType = /^  Change\s+: (.*)/;
const reWorkspace = /^  Workspace\s+: (.*)/;

export class TFSStatusItemDecoration implements vscode.SourceControlResourceDecorations { }

export class TFSDiffWithServerCommand implements vscode.Command {
	public title: string = "Open remote diff";
	public command: string = "tfs-scm.openRemoteDiff";
	public tooltip?: string = "Open remote diff";
	public arguments?: any[] | undefined;

	constructor(args: any[]) {
		this.arguments = args;
	}
}

function iconForChangeType(changetype: string) {
	let iconType = null;
	switch (changetype) {
		case "add":
			iconType = "status-add";
			break;
		case "delete":
			iconType = "status-delete";
			break;
		case "edit":
			iconType = "status-modified";
			break;
	}

	return iconType === null ? null : {
		dark: {
			iconPath: path.join(__filename, '..', '..', 'icons', `${iconType}.svg`)
		},
		light: {
			iconPath: path.join(__filename, '..', '..', 'icons', `${iconType}.svg`)
		}
	};
}

export class TFSStatusItem implements SourceControlResourceState {

	public command?: vscode.Command | undefined;
	public decorations?: vscode.SourceControlResourceDecorations | undefined;

	constructor(
		public resourceUri: Uri,
		public serverpath: string,
		public changetype: string,
		public workspace: string,
		public changeset: string) {

		this.command = new TFSDiffWithServerCommand([resourceUri]);
		let icon = iconForChangeType(this.changetype);

		this.decorations = {
			strikeThrough: changetype === 'delete',
			tooltip: changetype
		};

		if(icon) {
			Object.assign(this.decorations, icon);
		}

	}
}

export class TFSRepository {

	constructor(private workspaceFolder: WorkspaceFolder) { }
	
	public async provideStatus() {
		const result = await tfcmd(["stat", "/format:detailed"], this.workspaceFolder.uri.fsPath);
		const lines = result.stdout.split('\r\n');

		let statusItems: TFSStatusItem[] = [];

		let currentStatusItem: any = null;

		for (const line of lines) {

			if (line.startsWith("$")) {

				let serverpath;
				let changeset = null;
				[serverpath, changeset] = line.split(';');

				if (serverpath) {
					if (currentStatusItem !== null && currentStatusItem.inworkspace) {
						statusItems.push(new TFSStatusItem(
							currentStatusItem.resourceUri,
							currentStatusItem.serverpath,
							currentStatusItem.changetype,
							currentStatusItem.workspace,
							currentStatusItem.changeset
						));
					}
					currentStatusItem = { serverpath, changeset, inworkspace: false };
				}
			}

			if (line.startsWith('  Local item :')) {
				let [, path] = reLocalFilePath.exec(line) || [null, null];

				if (path) {
					let uri = Uri.file(path);
					let relative = workspace.asRelativePath(uri).replace('\\', '/');
					currentStatusItem.resourceUri = uri;

					// if the path is like "C:\something" we know it's not in the workspace
					if (relative.match(/^\w\:/)) {
						currentStatusItem.inworkspace = false;
					} else {
						currentStatusItem.inworkspace = true;
					}
				}
			}

			if (line.startsWith('  Change')) {
				let [, changetype] = reChangeType.exec(line) || [null, null];

				if (changetype) {
					currentStatusItem.changetype = changetype;
				}
			}

			if (line.startsWith('  Workspace')) {
				let [, workspace] = reWorkspace.exec(line) || [null, null];

				if (workspace) {
					currentStatusItem.workspace = workspace;
				}
			}
		}

		if (currentStatusItem !== null && currentStatusItem.inworkspace) {
			statusItems.push(new TFSStatusItem(
				currentStatusItem.resourceUri,
				currentStatusItem.serverpath,
				currentStatusItem.changetype,
				currentStatusItem.workspace,
				currentStatusItem.changeset
			));
		}

		return statusItems;
	}
}