import * as vscode from 'vscode';
import * as path from 'path';

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

class TFSDiffWithServerCommand implements vscode.Command {
	public title: string = "Open remote diff";
	public command: string = "tfs-scm.openRemoteDiff";
	public tooltip?: string = "Open remote diff";
	public arguments?: any[] | undefined;

	constructor(args: any[]) {
		this.arguments = args;
	}
}

export class TFSStatusItem implements vscode.SourceControlResourceState {
	public command?: vscode.Command | undefined;
	public decorations?: vscode.SourceControlResourceDecorations | undefined;
	constructor(public resourceUri: vscode.Uri, public serverpath: string, public changetype: string, public workspace: string, public changeset: string) {
		this.command = new TFSDiffWithServerCommand([resourceUri]);
		let icon = iconForChangeType(this.changetype);
		this.decorations = {
			strikeThrough: changetype === 'delete',
			tooltip: changetype
		};
		if (icon) {
			Object.assign(this.decorations, icon);
		}
	}
}